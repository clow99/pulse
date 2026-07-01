import type { AlertRule, NotificationChannel, Site, UptimeCheck } from '@prisma/client';
import { prisma } from './prisma';
import { sendNotification, type NotificationPayload } from './notifications';

type SiteForAlert = Pick<Site, 'id' | 'name' | 'domain'>;
type AlertRuleWithChannel = AlertRule & { notificationChannel: NotificationChannel };

const DEFAULT_FAILURE_THRESHOLD = 2;
const DEFAULT_RECOVERY_THRESHOLD = 1;

export async function handleUptimeAlert(site: SiteForAlert, check: UptimeCheck) {
  const rules = await prisma.alertRule.findMany({
    where: { siteId: site.id, enabled: true },
    include: { notificationChannel: true },
  });

  const failureThreshold = Math.min(
    ...rules.map((rule) => rule.consecutiveFailures),
    DEFAULT_FAILURE_THRESHOLD
  );
  const recoveryThreshold = Math.min(
    ...rules.map((rule) => rule.recoveryChecks),
    DEFAULT_RECOVERY_THRESHOLD
  );

  const openIncident = await prisma.incident.findFirst({
    where: { siteId: site.id, status: 'open' },
    orderBy: { startedAt: 'desc' },
  });

  if (!check.isUp) {
    const recentChecks = await prisma.uptimeCheck.findMany({
      where: { siteId: site.id },
      orderBy: { checkedAt: 'desc' },
      take: failureThreshold,
    });
    const consecutiveFailures = recentChecks.filter((item) => !item.isUp).length;

    if (!openIncident && recentChecks.length >= failureThreshold && consecutiveFailures >= failureThreshold) {
      const incident = await prisma.incident.create({
        data: {
          siteId: site.id,
          title: `${site.name || site.domain} is down`,
          description: check.error || `Last status code: ${check.statusCode || 'N/A'}`,
          status: 'open',
          lastNotifiedAt: new Date(),
        },
      });
      await notifyRules(rules, {
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
        check: toCheckPayload(check),
      });
    }
    return;
  }

  if (!openIncident) return;

  const recentChecks = await prisma.uptimeCheck.findMany({
    where: { siteId: site.id },
    orderBy: { checkedAt: 'desc' },
    take: recoveryThreshold,
  });
  const recovered = recentChecks.length >= recoveryThreshold && recentChecks.every((item) => item.isUp);
  if (!recovered) return;

  const resolved = await prisma.incident.update({
    where: { id: openIncident.id },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      lastNotifiedAt: new Date(),
    },
  });

  await notifyRules(rules, {
    event: 'incident.resolved',
    site,
    incident: {
      id: resolved.id,
      title: `${site.name || site.domain} recovered`,
      description: resolved.description,
      status: 'resolved',
      startedAt: resolved.startedAt.toISOString(),
      resolvedAt: resolved.resolvedAt?.toISOString() ?? null,
    },
    check: toCheckPayload(check),
  });
}

function toCheckPayload(check: UptimeCheck) {
  return {
    statusCode: check.statusCode,
    responseTime: check.responseTime,
    error: check.error,
  };
}

async function notifyRules(
  rules: AlertRuleWithChannel[],
  payload: NotificationPayload
) {
  const results = await Promise.allSettled(
    rules.map(async (rule) => {
      await sendNotification(rule.notificationChannel, payload);
      return {
        channelId: rule.notificationChannel.id,
        channelType: rule.notificationChannel.type,
      };
    })
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') return;

    const channel = rules[index]?.notificationChannel;
    console.error('Pulse notification failed', {
      channelId: channel?.id,
      channelType: channel?.type,
      event: payload.event,
      error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
    });
  });
}
