import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { analyzeFunnel, type Activity, type FunnelDefinition } from '@/lib/funnel-analysis';
import { percentile } from '@/lib/tracking';

function verifySecret(request: Request) {
  const secret = process.env.INSIGHTS_CRON_SECRET;
  if (!secret) return false;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return token === secret;
}

interface InsightCandidate {
  siteId: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  evidence: Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  try {
    if (!verifySecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sites = await prisma.site.findMany({ where: { active: true }, select: { id: true, name: true, domain: true } });
    const candidates: InsightCandidate[] = [];

    for (const site of sites) {
      candidates.push(...await trafficInsights(site.id));
      candidates.push(...await revenueInsights(site.id));
      candidates.push(...await uptimeInsights(site.id));
      candidates.push(...await performanceInsights(site.id));
      candidates.push(...await funnelInsights(site.id));
      candidates.push(...await campaignInsights(site.id));
    }

    let created = 0;
    for (const candidate of candidates) {
      const recentDuplicate = await prisma.insight.findFirst({
        where: {
          siteId: candidate.siteId,
          type: candidate.type,
          title: candidate.title,
          dismissedAt: null,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (recentDuplicate) continue;

      await prisma.insight.create({ data: candidate });
      created++;
    }

    return NextResponse.json({ evaluatedSites: sites.length, created });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function trafficInsights(siteId: string): Promise<InsightCandidate[]> {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - 7 * 86400000);
  const previousFrom = new Date(now.getTime() - 14 * 86400000);
  const [current, previous] = await Promise.all([
    prisma.pageview.count({ where: { siteId, timestamp: { gte: currentFrom, lte: now } } }),
    prisma.pageview.count({ where: { siteId, timestamp: { gte: previousFrom, lt: currentFrom } } }),
  ]);
  if (previous < 20) return [];
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 30) return [];
  return [{
    siteId,
    type: 'traffic_change',
    severity: change < 0 ? 'warning' : 'info',
    title: change < 0 ? 'Traffic dropped this week' : 'Traffic spiked this week',
    body: `Pageviews changed ${change.toFixed(1)}% compared with the previous 7 days.`,
    evidence: { current, previous, change },
  }];
}

async function revenueInsights(siteId: string): Promise<InsightCandidate[]> {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - 7 * 86400000);
  const previousFrom = new Date(now.getTime() - 14 * 86400000);
  const [currentEvents, previousEvents] = await Promise.all([
    prisma.event.findMany({ where: { siteId, revenueValue: { not: null }, timestamp: { gte: currentFrom, lte: now } }, select: { revenueValue: true } }),
    prisma.event.findMany({ where: { siteId, revenueValue: { not: null }, timestamp: { gte: previousFrom, lt: currentFrom } }, select: { revenueValue: true } }),
  ]);
  const current = sumRevenue(currentEvents);
  const previous = sumRevenue(previousEvents);
  if (previous <= 0) return [];
  const change = ((current - previous) / previous) * 100;
  if (change > -30) return [];
  return [{
    siteId,
    type: 'revenue_drop',
    severity: 'critical',
    title: 'Revenue dropped this week',
    body: `Tracked revenue is down ${Math.abs(change).toFixed(1)}% compared with the previous 7 days.`,
    evidence: { current, previous, change },
  }];
}

async function uptimeInsights(siteId: string): Promise<InsightCandidate[]> {
  const openIncident = await prisma.incident.findFirst({
    where: { siteId, status: 'open' },
    orderBy: { startedAt: 'desc' },
  });
  if (!openIncident) return [];
  return [{
    siteId,
    type: 'uptime_incident',
    severity: 'critical',
    title: 'Open uptime incident',
    body: openIncident.description || 'This site currently has an open uptime incident.',
    evidence: { incidentId: openIncident.id, startedAt: openIncident.startedAt.toISOString() },
  }];
}

async function performanceInsights(siteId: string): Promise<InsightCandidate[]> {
  const since = new Date(Date.now() - 7 * 86400000);
  const vitals = await prisma.webVital.findMany({
    where: { siteId, timestamp: { gte: since } },
    select: { name: true, value: true, rating: true, pathname: true },
  });
  if (vitals.length < 10) return [];

  const poorRate = vitals.filter((vital) => vital.rating === 'poor').length / vitals.length;
  if (poorRate < 0.25) return [];

  const lcpValues = vitals.filter((vital) => vital.name === 'LCP').map((vital) => vital.value);
  return [{
    siteId,
    type: 'web_vitals_poor',
    severity: 'warning',
    title: 'Poor web vitals detected',
    body: `${(poorRate * 100).toFixed(1)}% of recent web vital samples are rated poor.`,
    evidence: { samples: vitals.length, poorRate, lcpP75: lcpValues.length ? percentile(lcpValues, 75) : null },
  }];
}

async function funnelInsights(siteId: string): Promise<InsightCandidate[]> {
  const since = new Date(Date.now() - 30 * 86400000);
  const [funnels, pageviews, events] = await Promise.all([
    prisma.funnel.findMany({ where: { siteId }, include: { steps: { include: { goal: true }, orderBy: { position: 'asc' } } } }),
    prisma.pageview.findMany({ where: { siteId, visitId: { not: null }, timestamp: { gte: since } }, select: { visitId: true, pathname: true, timestamp: true } }),
    prisma.event.findMany({ where: { siteId, visitId: { not: null }, timestamp: { gte: since } }, select: { visitId: true, name: true, pathname: true, properties: true, timestamp: true } }),
  ]);
  const activities: Activity[] = [
    ...pageviews.map((item) => ({ visitId: item.visitId!, type: 'pageview' as const, pathname: item.pathname, timestamp: item.timestamp })),
    ...events.map((item) => ({
      visitId: item.visitId!,
      type: 'event' as const,
      eventName: item.name,
      pathname: item.pathname,
      properties: item.properties as Record<string, unknown>,
      timestamp: item.timestamp,
    })),
  ];

  return funnels.flatMap((funnel): InsightCandidate[] => {
    const result = analyzeFunnel({
      id: funnel.id,
      name: funnel.name,
      mode: funnel.mode,
      steps: funnel.steps.map((step) => ({ position: step.position, goal: step.goal })),
    } satisfies FunnelDefinition, activities);
    const worstStep = result.steps.slice(1).sort((a, b) => b.dropoffRate - a.dropoffRate)[0];
    if (result.entrants >= 5 && result.completions === 0) {
      return [{
        siteId,
        type: 'broken_funnel',
        severity: 'warning' as const,
        title: `${funnel.name} has no completions`,
        body: `${result.entrants} visits entered this funnel in the last 30 days, but none completed it.`,
        evidence: { funnelId: funnel.id, entrants: result.entrants },
      }];
    }
    if (worstStep && worstStep.dropoffRate >= 70 && result.entrants >= 10) {
      return [{
        siteId,
        type: 'funnel_dropoff',
        severity: 'info' as const,
        title: `${funnel.name} has a large drop-off`,
        body: `${worstStep.dropoffRate.toFixed(1)}% of visits drop before ${worstStep.name}.`,
        evidence: { funnelId: funnel.id, step: worstStep },
      }];
    }
    return [];
  });
}

async function campaignInsights(siteId: string): Promise<InsightCandidate[]> {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - 7 * 86400000);
  const previousFrom = new Date(now.getTime() - 14 * 86400000);
  const [current, previous] = await Promise.all([
    prisma.pageview.groupBy({
      by: ['utmSource'],
      where: { siteId, timestamp: { gte: currentFrom, lte: now }, utmSource: { not: '' } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
    prisma.pageview.groupBy({
      by: ['utmSource'],
      where: { siteId, timestamp: { gte: previousFrom, lt: currentFrom }, utmSource: { not: '' } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
  ]);
  const currentTop = current[0];
  const previousTop = previous[0];
  if (!currentTop || !previousTop || currentTop.utmSource === previousTop.utmSource) return [];
  return [{
    siteId,
    type: 'campaign_change',
    severity: 'info',
    title: 'Top campaign source changed',
    body: `${currentTop.utmSource} replaced ${previousTop.utmSource} as the leading UTM source this week.`,
    evidence: { currentTop, previousTop },
  }];
}

function sumRevenue(events: { revenueValue: unknown }[]) {
  return events.reduce((sum, event) => sum + Number(event.revenueValue ?? 0), 0);
}
