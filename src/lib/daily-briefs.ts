import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getAIProviderConfig, resolveAIProvider, streamChatCompletion } from './ai-providers';
import { percentile } from './tracking';

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  date: string;
}

function partsInZone(date: Date, timeZone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const year = value('year');
  const month = value('month');
  const day = value('day');
  return { year, month, day, hour: value('hour'), date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

function shiftLocalDate(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function zonedMidnightUtc(localDate: string, timeZone: string) {
  const [year, month, day] = localDate.split('-').map(Number);
  const desired = Date.UTC(year, month - 1, day);
  let guess = desired;
  for (let attempt = 0; attempt < 3; attempt++) {
    const actual = partsInZone(new Date(guess), timeZone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour);
    guess += desired - represented;
  }
  return new Date(guess);
}

async function distinctVisits(siteId: string, from: Date, to: Date) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT "visitId")::bigint AS count
    FROM "Pageview"
    WHERE "siteId" = ${siteId}
      AND "visitId" IS NOT NULL
      AND "timestamp" >= ${from}
      AND "timestamp" < ${to}
  `;
  return Number(rows[0]?.count ?? 0);
}

async function projectEvidence(projectId: string, periodStart: Date, periodEnd: Date) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      environments: {
        include: {
          services: {
            include: {
              sites: { select: { id: true } },
              monitors: {
                include: {
                  checks: { orderBy: { checkedAt: 'desc' }, take: 1 },
                  incidents: { where: { status: 'open' }, select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!project) return null;
  const siteIds = project.environments.flatMap((environment) => environment.services.flatMap((service) => service.sites.map((site) => site.id)));
  const monitorRows = project.environments.flatMap((environment) => environment.services.flatMap((service) => service.monitors));
  const previousStart = new Date(periodStart.getTime() - (periodEnd.getTime() - periodStart.getTime()));

  const perSite = await Promise.all(siteIds.map(async (siteId) => {
    const [pageviews, previousPageviews, visitors, previousVisitors, events, revenue, vitals] = await Promise.all([
      prisma.pageview.count({ where: { siteId, timestamp: { gte: periodStart, lt: periodEnd } } }),
      prisma.pageview.count({ where: { siteId, timestamp: { gte: previousStart, lt: periodStart } } }),
      distinctVisits(siteId, periodStart, periodEnd),
      distinctVisits(siteId, previousStart, periodStart),
      prisma.event.count({ where: { siteId, timestamp: { gte: periodStart, lt: periodEnd } } }),
      prisma.event.aggregate({ where: { siteId, revenueValue: { not: null }, timestamp: { gte: periodStart, lt: periodEnd } }, _sum: { revenueValue: true } }),
      prisma.webVital.findMany({ where: { siteId, timestamp: { gte: periodStart, lt: periodEnd } }, select: { name: true, value: true, rating: true } }),
    ]);
    return { pageviews, previousPageviews, visitors, previousVisitors, events, revenue: Number(revenue._sum.revenueValue ?? 0), vitals };
  }));
  const deployments = await prisma.deployment.findMany({
    where: { projectId, deployedAt: { gte: periodStart, lt: periodEnd } },
    orderBy: { deployedAt: 'desc' },
    select: { id: true, status: true, version: true, commitSha: true, source: true, deployedAt: true },
  });
  const lcp = perSite.flatMap((site) => site.vitals.filter((vital) => vital.name === 'LCP').map((vital) => vital.value));
  const poorVitals = perSite.reduce((sum, site) => sum + site.vitals.filter((vital) => vital.rating === 'poor').length, 0);

  return {
    projectId: project.id,
    name: project.name,
    pageviews: perSite.reduce((sum, site) => sum + site.pageviews, 0),
    previousPageviews: perSite.reduce((sum, site) => sum + site.previousPageviews, 0),
    visitors: perSite.reduce((sum, site) => sum + site.visitors, 0),
    previousVisitors: perSite.reduce((sum, site) => sum + site.previousVisitors, 0),
    events: perSite.reduce((sum, site) => sum + site.events, 0),
    revenue: perSite.reduce((sum, site) => sum + site.revenue, 0),
    lcpP75: lcp.length ? percentile(lcp, 75) : null,
    poorVitals,
    monitorCount: monitorRows.length,
    failingMonitors: monitorRows.filter((monitor) => monitor.checks[0] && !monitor.checks[0].isUp).length,
    openIncidents: monitorRows.reduce((sum, monitor) => sum + monitor.incidents.length, 0),
    deployments: deployments.map((deployment) => ({ ...deployment, deployedAt: deployment.deployedAt.toISOString() })),
  };
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function templateSummary(localDate: string, projects: Array<NonNullable<Awaited<ReturnType<typeof projectEvidence>>>>) {
  const totals = projects.reduce((acc, project) => ({
    pageviews: acc.pageviews + project.pageviews,
    previousPageviews: acc.previousPageviews + project.previousPageviews,
    visitors: acc.visitors + project.visitors,
    previousVisitors: acc.previousVisitors + project.previousVisitors,
    events: acc.events + project.events,
    revenue: acc.revenue + project.revenue,
    incidents: acc.incidents + project.openIncidents,
    failing: acc.failing + project.failingMonitors,
    deployments: acc.deployments + project.deployments.length,
  }), { pageviews: 0, previousPageviews: 0, visitors: 0, previousVisitors: 0, events: 0, revenue: 0, incidents: 0, failing: 0, deployments: 0 });
  const actions = [];
  if (totals.incidents || totals.failing) actions.push('Investigate active monitor failures and open incidents.');
  if (percentChange(totals.pageviews, totals.previousPageviews) <= -20) actions.push('Review acquisition sources and recent deployments behind the traffic decline.');
  if (!actions.length) actions.push('No urgent action is required; continue watching traffic, conversions, and service health.');
  return [
    `# Daily brief — ${localDate}`,
    '',
    `- ${totals.visitors} visitors (${percentChange(totals.visitors, totals.previousVisitors)}% vs prior day)`,
    `- ${totals.pageviews} pageviews (${percentChange(totals.pageviews, totals.previousPageviews)}% vs prior day)`,
    `- ${totals.events} tracked events and ${totals.revenue.toFixed(2)} revenue`,
    `- ${totals.failing} failing monitors, ${totals.incidents} open incidents, ${totals.deployments} deployments`,
    '',
    '## Recommended next action',
    actions.map((action) => `- ${action}`).join('\n'),
  ].join('\n');
}

async function aiSummary(template: string, evidence: unknown) {
  const provider = resolveAIProvider();
  const config = getAIProviderConfig(provider);
  if (!config.apiKey) return null;
  let summary = '';
  try {
    for await (const chunk of streamChatCompletion({
      provider,
      systemPrompt: 'You write concise daily project intelligence briefs. Use only supplied evidence, keep every number exact, and end with no more than three prioritized actions.',
      messages: [{ role: 'user', content: `${template}\n\nStructured evidence:\n${JSON.stringify(evidence)}` }],
    })) summary += chunk;
    return summary.trim() || null;
  } catch {
    return null;
  }
}

export async function generateDailyBrief(orgId: string, requestedLocalDate?: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { projects: { where: { active: true }, select: { id: true } } },
  });
  if (!org) throw new Error('Organization not found');
  const today = partsInZone(new Date(), org.timezone).date;
  const localDate = requestedLocalDate ?? shiftLocalDate(today, -1);
  const periodStart = zonedMidnightUtc(localDate, org.timezone);
  const periodEnd = zonedMidnightUtc(shiftLocalDate(localDate, 1), org.timezone);
  const projects = (await Promise.all(org.projects.map((project) => projectEvidence(project.id, periodStart, periodEnd)))).filter(Boolean) as Array<NonNullable<Awaited<ReturnType<typeof projectEvidence>>>>;
  const evidence = { timezone: org.timezone, localDate, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString(), projects };
  const fallback = templateSummary(localDate, projects);
  const generated = await aiSummary(fallback, evidence);
  return prisma.dailyBrief.upsert({
    where: { orgId_localDate: { orgId, localDate: new Date(`${localDate}T00:00:00.000Z`) } },
    create: { orgId, localDate: new Date(`${localDate}T00:00:00.000Z`), periodStart, periodEnd, summary: generated ?? fallback, evidence: evidence as Prisma.InputJsonValue, generator: generated ? 'ai' : 'template' },
    update: { periodStart, periodEnd, summary: generated ?? fallback, evidence: evidence as Prisma.InputJsonValue, generator: generated ? 'ai' : 'template' },
  });
}

export async function runDueBriefs(now = new Date()) {
  const orgs = await prisma.organization.findMany({ where: { dailyBriefEnabled: true } });
  const generated = [];
  for (const org of orgs) {
    let local;
    try { local = partsInZone(now, org.timezone); } catch { continue; }
    if (local.hour < org.dailyBriefHour) continue;
    const targetDate = shiftLocalDate(local.date, -1);
    const exists = await prisma.dailyBrief.findUnique({
      where: { orgId_localDate: { orgId: org.id, localDate: new Date(`${targetDate}T00:00:00.000Z`) } },
      select: { id: true },
    });
    if (!exists) generated.push(await generateDailyBrief(org.id, targetDate));
  }
  return generated;
}

export const briefTime = { partsInZone, shiftLocalDate, zonedMidnightUtc };
