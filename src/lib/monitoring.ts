import { createHash, randomBytes } from 'crypto';
import tls from 'tls';
import type { Monitor, Prisma, UptimeCheck } from '@prisma/client';
import { prisma } from './prisma';
import { assertSafeHttpUrl, safeFetch } from './safe-fetch';
import { sendNotification, type NotificationPayload } from './notifications';

export interface MonitorConfig {
  url?: string;
  method?: 'GET' | 'HEAD';
  expectedStatusMin?: number;
  expectedStatusMax?: number;
  bodyContains?: string | null;
  warningDays?: number;
}

interface MonitorResult {
  isUp: boolean;
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
  metadata: Prisma.InputJsonValue;
}

const HEARTBEAT_PREFIX = 'pulse_hb_';

export function createHeartbeatSecret() {
  const secret = `${HEARTBEAT_PREFIX}${randomBytes(32).toString('base64url')}`;
  return {
    secret,
    hash: createHash('sha256').update(secret).digest('hex'),
    prefix: secret.slice(0, 18),
  };
}

export function hashHeartbeatSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

function monitorConfig(monitor: Pick<Monitor, 'config'>): MonitorConfig {
  return (monitor.config ?? {}) as MonitorConfig;
}

async function runHttpMonitor(monitor: Monitor): Promise<MonitorResult> {
  const config = monitorConfig(monitor);
  if (!config.url) throw new Error('HTTP monitor URL is missing');
  const started = Date.now();
  const method = config.bodyContains ? 'GET' : (config.method ?? 'HEAD');
  const response = await safeFetch(config.url, {
    method,
    signal: AbortSignal.timeout(monitor.timeoutMs),
    headers: { 'User-Agent': 'Pulse-Monitor/1.0' },
  });
  const responseTime = Date.now() - started;
  const min = config.expectedStatusMin ?? 200;
  const max = config.expectedStatusMax ?? 399;
  let isUp = response.status >= min && response.status <= max;
  let error = isUp ? null : `Expected HTTP ${min}-${max}, received ${response.status}`;
  if (isUp && config.bodyContains) {
    const body = (await response.text()).slice(0, 65_536);
    isUp = body.includes(config.bodyContains);
    if (!isUp) error = 'Expected response text was not found';
  }
  return {
    isUp,
    statusCode: response.status,
    responseTime,
    error,
    metadata: { type: 'http', method, url: config.url },
  };
}

async function runSslMonitor(monitor: Monitor): Promise<MonitorResult> {
  const config = monitorConfig(monitor);
  if (!config.url) throw new Error('SSL monitor URL is missing');
  const url = await assertSafeHttpUrl(config.url);
  const started = Date.now();
  const certificate = await new Promise<tls.PeerCertificate>((resolve, reject) => {
    const socket = tls.connect({
      host: url.hostname,
      port: Number(url.port || 443),
      servername: url.hostname,
      rejectUnauthorized: false,
    });
    socket.setTimeout(monitor.timeoutMs);
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(cert);
    });
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('TLS connection timed out'));
    });
    socket.once('error', reject);
  });
  const expiresAt = new Date(certificate.valid_to);
  const daysRemaining = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);
  const warningDays = config.warningDays ?? 30;
  const isUp = Number.isFinite(daysRemaining) && daysRemaining > warningDays;
  return {
    isUp,
    statusCode: null,
    responseTime: Date.now() - started,
    error: isUp ? null : `TLS certificate expires in ${daysRemaining} day(s)`,
    metadata: { type: 'ssl_expiry', expiresAt: expiresAt.toISOString(), daysRemaining, warningDays },
  };
}

async function runDomainMonitor(monitor: Monitor): Promise<MonitorResult> {
  const config = monitorConfig(monitor);
  if (!config.url) throw new Error('Domain monitor URL is missing');
  const target = await assertSafeHttpUrl(config.url);
  const started = Date.now();
  const response = await safeFetch(`https://rdap.org/domain/${encodeURIComponent(target.hostname)}`, {
    signal: AbortSignal.timeout(monitor.timeoutMs),
    headers: { Accept: 'application/rdap+json, application/json' },
  });
  if (!response.ok) {
    return {
      isUp: true,
      statusCode: response.status,
      responseTime: Date.now() - started,
      error: null,
      metadata: { type: 'domain_expiry', status: 'unknown', reason: `RDAP HTTP ${response.status}` },
    };
  }
  const data = await response.json() as { events?: Array<{ eventAction?: string; eventDate?: string }> };
  const expiry = data.events?.find((event) => ['expiration', 'expiry'].includes(event.eventAction ?? ''))?.eventDate;
  if (!expiry) {
    return {
      isUp: true,
      statusCode: response.status,
      responseTime: Date.now() - started,
      error: null,
      metadata: { type: 'domain_expiry', status: 'unknown', reason: 'RDAP response has no expiration event' },
    };
  }
  const expiresAt = new Date(expiry);
  const daysRemaining = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);
  const warningDays = config.warningDays ?? 30;
  const isUp = Number.isFinite(daysRemaining) && daysRemaining > warningDays;
  return {
    isUp,
    statusCode: response.status,
    responseTime: Date.now() - started,
    error: isUp ? null : `Domain registration expires in ${daysRemaining} day(s)`,
    metadata: { type: 'domain_expiry', status: isUp ? 'ok' : 'expiring', expiresAt: expiresAt.toISOString(), daysRemaining, warningDays },
  };
}

function runHeartbeatMonitor(monitor: Monitor): MonitorResult {
  const overdueAt = monitor.lastSeenAt
    ? monitor.lastSeenAt.getTime() + (monitor.intervalSeconds + monitor.graceSeconds) * 1000
    : monitor.createdAt.getTime() + (monitor.intervalSeconds + monitor.graceSeconds) * 1000;
  const isUp = Date.now() <= overdueAt;
  return {
    isUp,
    statusCode: null,
    responseTime: null,
    error: isUp ? null : 'Expected heartbeat was not received within its grace period',
    metadata: { type: 'heartbeat', lastSeenAt: monitor.lastSeenAt?.toISOString() ?? null, overdueAt: new Date(overdueAt).toISOString() },
  };
}

export async function executeMonitor(monitorId: string) {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: {
      service: {
        include: {
          sites: { take: 1 },
          environment: { include: { project: true } },
        },
      },
    },
  });
  if (!monitor || !monitor.enabled) return null;

  let result: MonitorResult;
  try {
    if (monitor.type === 'http') result = await runHttpMonitor(monitor);
    else if (monitor.type === 'ssl_expiry') result = await runSslMonitor(monitor);
    else if (monitor.type === 'domain_expiry') result = await runDomainMonitor(monitor);
    else result = runHeartbeatMonitor(monitor);
  } catch (error) {
    result = {
      isUp: false,
      statusCode: null,
      responseTime: null,
      error: error instanceof Error ? error.message : 'Monitor check failed',
      metadata: { type: monitor.type },
    };
  }

  const site = monitor.service.sites[0] ?? null;
  const check = await prisma.uptimeCheck.create({
    data: {
      siteId: site?.id ?? null,
      monitorId: monitor.id,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      isUp: result.isUp,
      error: result.error,
      metadata: result.metadata,
    },
  });
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { nextRunAt: new Date(Date.now() + monitor.intervalSeconds * 1000) },
  });
  await handleMonitorAlert(monitor, check, {
    id: site?.id ?? monitor.service.id,
    name: site?.name ?? monitor.service.name,
    domain: site?.domain ?? monitor.service.environment.project.name,
  });
  return { monitorId: monitor.id, ...result, checkedAt: check.checkedAt };
}

export async function recordHeartbeat(secret: string, failed = false) {
  const monitor = await prisma.monitor.findUnique({
    where: { secretHash: hashHeartbeatSecret(secret) },
    include: { service: { include: { sites: { take: 1 }, environment: { include: { project: true } } } } },
  });
  if (!monitor || monitor.type !== 'heartbeat' || !monitor.enabled) return null;
  const now = new Date();
  const site = monitor.service.sites[0] ?? null;
  const check = await prisma.uptimeCheck.create({
    data: {
      monitorId: monitor.id,
      siteId: site?.id ?? null,
      isUp: !failed,
      error: failed ? 'Heartbeat explicitly reported failure' : null,
      metadata: { type: 'heartbeat', reported: true },
    },
  });
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: { lastSeenAt: now, nextRunAt: new Date(now.getTime() + (monitor.intervalSeconds + monitor.graceSeconds) * 1000) },
  });
  await handleMonitorAlert(monitor, check, {
    id: site?.id ?? monitor.service.id,
    name: site?.name ?? monitor.service.name,
    domain: site?.domain ?? monitor.service.environment.project.name,
  });
  return { monitorId: monitor.id, status: failed ? 'failed' : 'ok', receivedAt: now.toISOString() };
}

export async function runDueMonitors(now = new Date()) {
  const monitors = await prisma.monitor.findMany({
    where: { enabled: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    orderBy: { nextRunAt: 'asc' },
    take: 100,
  });
  const results = [];
  for (const monitor of monitors) {
    results.push(await executeMonitor(monitor.id));
  }
  return results.filter(Boolean);
}

async function handleMonitorAlert(
  monitor: Monitor,
  check: UptimeCheck,
  site: NotificationPayload['site']
) {
  const rules = await prisma.alertRule.findMany({
    where: {
      enabled: true,
      OR: [{ monitorId: monitor.id }, ...(check.siteId ? [{ siteId: check.siteId }] : [])],
    },
    include: { notificationChannel: true },
  });
  const failureThreshold = Math.min(2, ...rules.map((rule) => rule.consecutiveFailures));
  const recoveryThreshold = Math.min(1, ...rules.map((rule) => rule.recoveryChecks));
  const openIncident = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, status: 'open' },
    orderBy: { startedAt: 'desc' },
  });
  const recentChecks = await prisma.uptimeCheck.findMany({
    where: { monitorId: monitor.id },
    orderBy: { checkedAt: 'desc' },
    take: check.isUp ? recoveryThreshold : failureThreshold,
  });

  if (!check.isUp && !openIncident && recentChecks.length >= failureThreshold && recentChecks.every((item) => !item.isUp)) {
    const incident = await prisma.incident.create({
      data: {
        monitorId: monitor.id,
        siteId: check.siteId,
        status: 'open',
        title: `${monitor.name} is failing`,
        description: check.error,
        lastNotifiedAt: new Date(),
      },
    });
    await notify(rules, {
      event: 'incident.opened',
      site,
      incident: {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        status: 'open',
        startedAt: incident.startedAt.toISOString(),
        resolvedAt: null,
      },
      check: { statusCode: check.statusCode, responseTime: check.responseTime, error: check.error },
    });
  }

  if (check.isUp && openIncident && recentChecks.length >= recoveryThreshold && recentChecks.every((item) => item.isUp)) {
    const incident = await prisma.incident.update({
      where: { id: openIncident.id },
      data: { status: 'resolved', resolvedAt: new Date(), lastNotifiedAt: new Date() },
    });
    await notify(rules, {
      event: 'incident.resolved',
      site,
      incident: {
        id: incident.id,
        title: `${monitor.name} recovered`,
        description: incident.description,
        status: 'resolved',
        startedAt: incident.startedAt.toISOString(),
        resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      },
      check: { statusCode: check.statusCode, responseTime: check.responseTime, error: check.error },
    });
  }
}

async function notify(
  rules: Array<{ notificationChannel: Parameters<typeof sendNotification>[0] }>,
  payload: NotificationPayload
) {
  await Promise.allSettled(rules.map((rule) => sendNotification(rule.notificationChannel, payload)));
}
