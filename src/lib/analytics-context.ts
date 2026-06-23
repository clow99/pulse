import { subDays } from 'date-fns';
import { prisma } from './prisma';
import { verifySiteAccess } from './site-access';

export async function getAnalyticsContext(siteId: string, userId: string) {
  const access = await verifySiteAccess(userId, siteId);
  if (!access) return null;

  const { site } = access;
  const fromDate = subDays(new Date(), 30);
  const toDate = new Date();

  const [
    pageviewsCount,
    visitorsResult,
    topPagesRaw,
    topReferrersRaw,
    recentEvents,
    revenueEvents,
    goalsCount,
    funnelsCount,
    lastUptimeCheck,
    webVitalSamples,
    activeInsights,
  ] = await Promise.all([
    prisma.pageview.count({
      where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
    }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
      FROM "Pageview"
      WHERE "siteId" = ${siteId}
        AND "timestamp" >= ${fromDate}
        AND "timestamp" <= ${toDate}
    `,
    prisma.pageview.groupBy({
      by: ['pathname'],
      where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.pageview.groupBy({
      by: ['referrer'],
      where: {
        siteId,
        timestamp: { gte: fromDate, lte: toDate },
        referrer: { not: '' },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.event.groupBy({
      by: ['name'],
      where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.event.findMany({
      where: { siteId, revenueValue: { not: null }, timestamp: { gte: fromDate, lte: toDate } },
      select: { revenueValue: true, revenueCurrency: true, orderId: true },
    }),
    prisma.goal.count({ where: { siteId } }),
    prisma.funnel.count({ where: { siteId } }),
    prisma.uptimeCheck.findFirst({ where: { siteId }, orderBy: { checkedAt: 'desc' } }),
    prisma.webVital.findMany({
      where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
      select: { name: true, value: true, rating: true },
    }),
    prisma.insight.findMany({
      where: { siteId, dismissedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const revenueTotal = revenueEvents.reduce((sum, event) => sum + Number(event.revenueValue ?? 0), 0);
  const orderCount = new Set(revenueEvents.map((event, index) => event.orderId || `event-${index}`)).size;
  const poorVitals = webVitalSamples.filter((sample) => sample.rating === 'poor').length;

  return {
    siteName: site.name,
    domain: site.domain,
    visitors: Number(visitorsResult[0]?.count ?? 0),
    pageviews: pageviewsCount,
    topPages: topPagesRaw.map((p) => `${p.pathname} (${p._count.id} views)`).join(', ') || 'No data',
    topReferrers: topReferrersRaw.map((r) => `${r.referrer} (${r._count.id})`).join(', ') || 'No referrer data',
    events: recentEvents.map((e) => `${e.name} (${e._count.id}x)`).join(', ') || 'No events tracked',
    revenue: revenueEvents.length
      ? `${revenueTotal.toFixed(2)} across ${orderCount} order(s)`
      : 'No revenue events tracked',
    goals: goalsCount,
    funnels: funnelsCount,
    uptime: lastUptimeCheck
      ? `${lastUptimeCheck.isUp ? 'up' : 'down'} (${lastUptimeCheck.statusCode || 'N/A'}, ${lastUptimeCheck.responseTime}ms)`
      : 'No uptime checks yet',
    performance: webVitalSamples.length
      ? `${poorVitals}/${webVitalSamples.length} web vital samples rated poor`
      : 'No web vitals collected',
    insights: activeInsights.map((insight) => `${insight.severity}: ${insight.title}`).join('; ') || 'No active insights',
  };
}
