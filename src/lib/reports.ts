import { subDays } from 'date-fns';
import { prisma } from './prisma';
import { calculateBounceRate } from './tracking';
import { analyzeFunnel, activityMatchesGoal, type Activity, type FunnelDefinition, type GoalDefinition } from './funnel-analysis';
import { classifyTrafficSource } from './source-attribution';
import { percentile } from './tracking';

export interface ReportRange {
  fromDate: Date;
  toDate: Date;
}

export type ReportKind =
  | 'overview'
  | 'pages'
  | 'events'
  | 'acquisition'
  | 'ai_sources'
  | 'revenue'
  | 'funnels'
  | 'performance'
  | 'insights'
  | 'uptime'
  | 'uptime_summary';

export function parseDateRange(from: string, to: string): ReportRange | null {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }
  if (fromDate >= toDate) return null;
  return { fromDate, toDate };
}

export function defaultDateRange(days = 30): ReportRange {
  const toDate = new Date();
  return { fromDate: subDays(toDate, days), toDate };
}

export function resolveOptionalDateRange(from?: string, to?: string): ReportRange | null {
  if (!from && !to) return defaultDateRange();
  if (!from || !to) return null;
  return parseDateRange(from, to);
}

export async function countUniquePageviewVisitors(
  siteId: string,
  fromDate: Date,
  toDate: Date,
) {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT "visitId") as count
    FROM "Pageview"
    WHERE "siteId" = ${siteId}
      AND "timestamp" >= ${fromDate}
      AND "timestamp" <= ${toDate}
  `;
  return Number(result[0]?.count ?? 0);
}

export async function getOverviewReport(siteId: string, range: ReportRange) {
  const { fromDate, toDate } = range;
  const durationMs = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime() - 1);
  const prevFromDate = new Date(prevToDate.getTime() - durationMs);

  const baseWhere = {
    siteId,
    timestamp: { gte: fromDate, lte: toDate },
  };

  const [visitorsResult, pageviewsCount, prevVisitorsResult, prevPageviewsCount, sessionMetrics] =
    await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "visitId") as count
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
      `,
      prisma.pageview.count({ where: baseWhere }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "visitId") as count
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "timestamp" >= ${prevFromDate}
          AND "timestamp" <= ${prevToDate}
      `,
      prisma.pageview.count({
        where: {
          siteId,
          timestamp: { gte: prevFromDate, lte: prevToDate },
        },
      }),
      prisma.$queryRaw<Array<{ sessions: bigint; bounces: bigint; avg_duration: number | null }>>`
        SELECT
          COUNT(*)::bigint AS sessions,
          COUNT(*) FILTER (WHERE pageviews = 1)::bigint AS bounces,
          AVG(duration_seconds)::float AS avg_duration
        FROM (
          SELECT
            "visitId",
            COUNT(*)::int AS pageviews,
            EXTRACT(EPOCH FROM (MAX("timestamp") - MIN("timestamp")))::float AS duration_seconds
          FROM "Pageview"
          WHERE "siteId" = ${siteId}
            AND "visitId" IS NOT NULL
            AND "timestamp" >= ${fromDate}
            AND "timestamp" <= ${toDate}
          GROUP BY "visitId"
        ) sessions
      `,
    ]);

  const visitors = Number(visitorsResult[0]?.count ?? 0);
  const pageviews = pageviewsCount;
  const prevVisitors = Number(prevVisitorsResult[0]?.count ?? 0);
  const prevPageviews = prevPageviewsCount;

  const visitorsChange =
    prevVisitors > 0 ? ((visitors - prevVisitors) / prevVisitors) * 100 : 0;
  const pageviewsChange =
    prevPageviews > 0
      ? ((pageviews - prevPageviews) / prevPageviews) * 100
      : 0;

  const avgPagesPerVisit = visitors > 0 ? pageviews / visitors : 0;
  const sessions = Number(sessionMetrics[0]?.sessions ?? 0);
  const bounces = Number(sessionMetrics[0]?.bounces ?? 0);
  const bounceRate = calculateBounceRate(sessions, bounces);
  const avgSessionDuration = Number(sessionMetrics[0]?.avg_duration ?? 0);
  const groupByHour = durationMs <= 2 * 24 * 60 * 60 * 1000;

  const timeseriesData = groupByHour
    ? await prisma.$queryRaw<
        { date_trunc: Date; visitors: bigint; pageviews: bigint }[]
      >`
        SELECT
          date_trunc('hour', "timestamp") as date_trunc,
          COUNT(DISTINCT "visitId")::bigint as visitors,
          COUNT(*)::bigint as pageviews
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
        GROUP BY date_trunc('hour', "timestamp")
        ORDER BY date_trunc ASC
      `
    : await prisma.$queryRaw<
        { date_trunc: Date; visitors: bigint; pageviews: bigint }[]
      >`
        SELECT
          date_trunc('day', "timestamp") as date_trunc,
          COUNT(DISTINCT "visitId")::bigint as visitors,
          COUNT(*)::bigint as pageviews
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
        GROUP BY date_trunc('day', "timestamp")
        ORDER BY date_trunc ASC
      `;

  const timeseries = timeseriesData.map((row) => {
    const d = new Date(row.date_trunc);
    const dateStr = groupByHour
      ? `${d.toISOString().slice(0, 10)} ${String(d.getUTCHours()).padStart(2, '0')}:00`
      : d.toISOString().slice(0, 10);
    return {
      date: dateStr,
      visitors: Number(row.visitors),
      pageviews: Number(row.pageviews),
    };
  });

  const topPagesRaw = await prisma.pageview.groupBy({
    by: ['pathname'],
    where: baseWhere,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const topPages = await Promise.all(
    topPagesRaw.map(async (row) => {
      const visitorCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "visitId") as count
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "pathname" = ${row.pathname}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
      `;
      return {
        pathname: row.pathname,
        views: row._count.id,
        visitors: Number(visitorCount[0]?.count ?? 0),
      };
    })
  );

  const topReferrersRaw = await prisma.pageview.groupBy({
    by: ['referrer'],
    where: {
      ...baseWhere,
      referrer: { not: '' },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const totalWithReferrer = topReferrersRaw.reduce(
    (sum, r) => sum + r._count.id,
    0
  );
  const topReferrers = await Promise.all(
    topReferrersRaw.map(async (row) => {
      const visitorCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "visitId") as count
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "referrer" = ${row.referrer}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
      `;
      const pct =
        totalWithReferrer > 0 ? (row._count.id / totalWithReferrer) * 100 : 0;
      return {
        referrer: row.referrer,
        visitors: Number(visitorCount[0]?.count ?? 0),
        percentage: Math.round(pct * 100) / 100,
      };
    })
  );

  return {
    stats: {
      visitors,
      pageviews,
      avgPagesPerVisit: Math.round(avgPagesPerVisit * 100) / 100,
      bounceRate,
      avgSessionDuration: Math.round(avgSessionDuration),
      visitorsChange: Math.round(visitorsChange * 100) / 100,
      pageviewsChange: Math.round(pageviewsChange * 100) / 100,
    },
    timeseries,
    topPages,
    topReferrers,
  };
}

export async function getPagesReport(
  siteId: string,
  range: ReportRange,
  options: { page?: number; limit?: number; search?: string } = {}
) {
  const { fromDate, toDate } = range;
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const search = options.search;

  const baseWhere = {
    siteId,
    timestamp: { gte: fromDate, lte: toDate },
    ...(search
      ? { pathname: { contains: search, mode: 'insensitive' as const } }
      : {}),
  };

  const [grouped, totalResult] = await Promise.all([
    prisma.pageview.groupBy({
      by: ['pathname'],
      where: baseWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    search
      ? prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(DISTINCT "pathname") as count FROM "Pageview"
          WHERE "siteId" = ${siteId}
            AND "timestamp" >= ${fromDate}
            AND "timestamp" <= ${toDate}
            AND "pathname" ILIKE ${'%' + search + '%'}
        `
      : prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(DISTINCT "pathname") as count FROM "Pageview"
          WHERE "siteId" = ${siteId}
            AND "timestamp" >= ${fromDate}
            AND "timestamp" <= ${toDate}
        `,
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  const data = await Promise.all(
    grouped.map(async (row) => {
      const visitorCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "visitId") as count
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "pathname" = ${row.pathname}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
      `;
      return {
        pathname: row.pathname,
        views: row._count.id,
        visitors: Number(visitorCount[0]?.count ?? 0),
      };
    })
  );

  return { data, total, page, limit };
}

function aggregatePropertyBreakdown(events: { properties: unknown }[]) {
  const keyCounts: Record<string, Record<string, number>> = {};
  for (const event of events) {
    const props = event.properties as Record<string, unknown> | null;
    if (!props || typeof props !== 'object') continue;
    for (const [key, value] of Object.entries(props)) {
      if (!keyCounts[key]) keyCounts[key] = {};
      const strVal = String(value ?? '');
      keyCounts[key][strVal] = (keyCounts[key][strVal] ?? 0) + 1;
    }
  }
  return Object.entries(keyCounts).map(([key, valueCounts]) => ({
    key,
    values: Object.entries(valueCounts).map(([value, count]) => ({
      value,
      count,
    })),
  }));
}

export async function getEventsReport(
  siteId: string,
  range: ReportRange,
  name?: string
) {
  const { fromDate, toDate } = range;
  const baseWhere = {
    siteId,
    timestamp: { gte: fromDate, lte: toDate },
    ...(name ? { name } : {}),
  };

  if (name) {
    const [events, uniqueResult] = await Promise.all([
      prisma.event.findMany({
        where: baseWhere,
        select: { properties: true },
      }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "visitId") as count
        FROM "Event"
        WHERE "siteId" = ${siteId}
          AND "name" = ${name}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
      `,
    ]);

    return {
      name,
      count: events.length,
      uniqueTriggers: Number(uniqueResult[0]?.count ?? 0),
      propertyBreakdown: aggregatePropertyBreakdown(events),
    };
  }

  const grouped = await prisma.event.groupBy({
    by: ['name'],
    where: baseWhere,
    _count: { id: true },
  });

  return Promise.all(
    grouped.map(async (row) => {
      const uniqueResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "visitId") as count
        FROM "Event"
        WHERE "siteId" = ${siteId}
          AND "name" = ${row.name}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
      `;
      return {
        name: row.name,
        count: row._count.id,
        uniqueTriggers: Number(uniqueResult[0]?.count ?? 0),
      };
    })
  );
}

function withPercentage<T extends { count: number }>(
  items: T[],
  total: number
): (T & { percentage: number })[] {
  return items.map((item) => ({
    ...item,
    percentage:
      total > 0 ? Math.round((item.count / total) * 10000) / 100 : 0,
  }));
}

export async function getAcquisitionReport(siteId: string, range: ReportRange) {
  const { fromDate, toDate } = range;
  const baseWhere = {
    siteId,
    timestamp: { gte: fromDate, lte: toDate },
  };

  const [referrersRaw, utmSourceRaw, utmMediumRaw, utmCampaignRaw, sourceRows] =
    await Promise.all([
      prisma.pageview.groupBy({
        by: ['referrer'],
        where: { ...baseWhere, referrer: { not: '' } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.pageview.groupBy({
        by: ['utmSource'],
        where: { ...baseWhere, utmSource: { not: '' } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.pageview.groupBy({
        by: ['utmMedium'],
        where: { ...baseWhere, utmMedium: { not: '' } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.pageview.groupBy({
        by: ['utmCampaign'],
        where: { ...baseWhere, utmCampaign: { not: '' } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.pageview.findMany({
        where: baseWhere,
        select: {
          referrer: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      }),
    ]);

  const referrersTotal = referrersRaw.reduce((s, r) => s + r._count.id, 0);
  const utmSourceTotal = utmSourceRaw.reduce((s, r) => s + r._count.id, 0);
  const utmMediumTotal = utmMediumRaw.reduce((s, r) => s + r._count.id, 0);
  const utmCampaignTotal = utmCampaignRaw.reduce((s, r) => s + r._count.id, 0);
  const groupedSources = groupSourceRows(sourceRows);

  return {
    referrers: withPercentage(
      referrersRaw.map((r) => ({ referrer: r.referrer, count: r._count.id })),
      referrersTotal
    ),
    utmSources: withPercentage(
      utmSourceRaw.map((r) => ({ utmSource: r.utmSource, count: r._count.id })),
      utmSourceTotal
    ),
    utmMediums: withPercentage(
      utmMediumRaw.map((r) => ({
        utmMedium: r.utmMedium,
        count: r._count.id,
      })),
      utmMediumTotal
    ),
    utmCampaigns: withPercentage(
      utmCampaignRaw.map((r) => ({
        utmCampaign: r.utmCampaign,
        count: r._count.id,
      })),
      utmCampaignTotal
    ),
    sourceGroups: groupedSources.sourceGroups,
    aiSources: groupedSources.aiSources,
  };
}

export async function getAiSourcesReport(siteId: string, range: ReportRange) {
  const { fromDate, toDate } = range;
  const [pageviews, events, goals] = await Promise.all([
    prisma.pageview.findMany({
      where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        visitId: true,
        pathname: true,
        referrer: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        timestamp: true,
      },
    }),
    prisma.event.findMany({
      where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        visitId: true,
        name: true,
        pathname: true,
        properties: true,
        referrer: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        revenueValue: true,
        revenueCurrency: true,
        orderId: true,
        timestamp: true,
      },
    }),
    prisma.goal.findMany({ where: { siteId } }),
  ]);

  const sourceBuckets = new Map<string, AiSourceBucket>();
  const visitSource = new Map<string, string>();
  const firstActivityByVisit = new Map<string, Date>();

  for (const pageview of pageviews) {
    const attribution = classifyTrafficSource(pageview);
    if (attribution.group !== 'ai_assistant') continue;

    const key = pageview.visitId || `pageview:${pageview.id}`;
    const bucket = ensureAiBucket(sourceBuckets, attribution.source, attribution.label);
    bucket.pageviews++;
    bucket.visitKeys.add(key);
    increment(bucket.landingPages, pageview.pathname || '/');

    const first = firstActivityByVisit.get(key);
    if (!first || pageview.timestamp < first) {
      firstActivityByVisit.set(key, pageview.timestamp);
      visitSource.set(key, attribution.source);
    } else if (!visitSource.has(key)) {
      visitSource.set(key, attribution.source);
    }
  }

  for (const event of events) {
    const key = event.visitId || `event:${event.id}`;
    let source = visitSource.get(key);
    if (!source) {
      const attribution = classifyTrafficSource(event);
      if (attribution.group !== 'ai_assistant') continue;
      source = attribution.source;
      ensureAiBucket(sourceBuckets, attribution.source, attribution.label).visitKeys.add(key);
    }

    const bucket = sourceBuckets.get(source);
    if (!bucket) continue;
    bucket.events++;
    increment(bucket.eventNames, event.name);
    const value = Number(event.revenueValue ?? 0);
    if (value > 0) {
      bucket.revenue += value;
      bucket.orderKeys.add(event.orderId || event.id);
      if (event.revenueCurrency) bucket.currencies.add(event.revenueCurrency);
    }
  }

  const activities: Activity[] = [
    ...pageviews.map((pageview) => ({
      visitId: pageview.visitId || `pageview:${pageview.id}`,
      type: 'pageview' as const,
      pathname: pageview.pathname,
      timestamp: pageview.timestamp,
    })),
    ...events.map((event) => ({
      visitId: event.visitId || `event:${event.id}`,
      type: 'event' as const,
      eventName: event.name,
      pathname: event.pathname,
      properties: event.properties as Record<string, unknown>,
      timestamp: event.timestamp,
    })),
  ];

  const goalVisitKeys = new Set<string>();
  for (const goal of goals) {
    const matchedBySource = new Map<string, Set<string>>();
    for (const activity of activities) {
      const source = visitSource.get(activity.visitId);
      if (!source || !activityMatchesGoal(activity, goal as GoalDefinition)) continue;
      const visits = matchedBySource.get(source) ?? new Set<string>();
      visits.add(activity.visitId);
      matchedBySource.set(source, visits);
      goalVisitKeys.add(`${source}:${goal.id}:${activity.visitId}`);
    }

    for (const [source, visits] of matchedBySource.entries()) {
      const bucket = sourceBuckets.get(source);
      if (!bucket) continue;
      bucket.goals.set(goal.name, (bucket.goals.get(goal.name) ?? 0) + visits.size);
    }
  }

  const sources = Array.from(sourceBuckets.values())
    .map((bucket) => ({
      source: bucket.source,
      label: bucket.label,
      visitors: bucket.visitKeys.size,
      pageviews: bucket.pageviews,
      events: bucket.events,
      conversions: Array.from(bucket.goals.values()).reduce((sum, count) => sum + count, 0),
      revenue: Math.round(bucket.revenue * 100) / 100,
      orders: bucket.orderKeys.size,
      currency: bucket.currencies.size === 1 ? Array.from(bucket.currencies)[0] : bucket.currencies.size > 1 ? 'MIXED' : 'USD',
      landingPages: topMap(bucket.landingPages, 'pathname'),
      eventNames: topMap(bucket.eventNames, 'name'),
      goals: topMap(bucket.goals, 'name'),
    }))
    .sort((a, b) => b.visitors - a.visitors || b.pageviews - a.pageviews);

  return {
    summary: {
      sources: sources.length,
      visitors: sources.reduce((sum, item) => sum + item.visitors, 0),
      pageviews: sources.reduce((sum, item) => sum + item.pageviews, 0),
      events: sources.reduce((sum, item) => sum + item.events, 0),
      conversions: goalVisitKeys.size,
      revenue: Math.round(sources.reduce((sum, item) => sum + item.revenue, 0) * 100) / 100,
    },
    sources,
  };
}

export async function getRevenueReport(siteId: string, range: ReportRange) {
  const { fromDate, toDate } = range;
  const events = await prisma.event.findMany({
    where: {
      siteId,
      revenueValue: { not: null },
      timestamp: { gte: fromDate, lte: toDate },
    },
    select: {
      id: true,
      visitId: true,
      pathname: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      device: true,
      country: true,
      revenueValue: true,
      revenueCurrency: true,
      orderId: true,
    },
  });

  const visitIds = Array.from(new Set(events.map((event) => event.visitId).filter(Boolean))) as string[];
  const landingPages = new Map<string, string>();
  if (visitIds.length > 0) {
    const pageviews = await prisma.pageview.findMany({
      where: { siteId, visitId: { in: visitIds } },
      orderBy: { timestamp: 'asc' },
      select: { visitId: true, pathname: true },
    });
    for (const pageview of pageviews) {
      if (pageview.visitId && !landingPages.has(pageview.visitId)) {
        landingPages.set(pageview.visitId, pageview.pathname);
      }
    }
  }

  const normalized = events.map((event) => ({
    ...event,
    value: Number(event.revenueValue ?? 0),
    landingPage: event.visitId ? landingPages.get(event.visitId) || event.pathname : event.pathname,
    sourceGroup: classifyTrafficSource(event).group,
  }));
  const totalRevenue = normalized.reduce((sum, event) => sum + event.value, 0);
  const orderKeys = new Set(normalized.map((event) => event.orderId || event.id));
  const orders = orderKeys.size;
  const currencies = Array.from(new Set(normalized.map((event) => event.revenueCurrency || 'USD')));

  return {
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      orders,
      averageOrderValue: orders > 0 ? Math.round((totalRevenue / orders) * 100) / 100 : 0,
      currency: currencies.length === 1 ? currencies[0] : 'MIXED',
    },
    breakdowns: {
      sources: groupRevenue(normalized, (event) => event.utmSource || 'Direct / unknown'),
      sourceGroups: groupRevenue(normalized, (event) => event.sourceGroup),
      campaigns: groupRevenue(normalized, (event) => event.utmCampaign || 'Unassigned'),
      referrers: groupRevenue(normalized, (event) => event.referrer || 'Direct / unknown'),
      landingPages: groupRevenue(normalized, (event) => event.landingPage || '/'),
      devices: groupRevenue(normalized, (event) => event.device || 'unknown'),
      countries: groupRevenue(normalized, (event) => event.country || 'unknown'),
    },
  };
}

export async function getFunnelsReport(siteId: string, range: ReportRange) {
  const { fromDate, toDate } = range;
  const [funnels, pageviews, events] = await Promise.all([
    prisma.funnel.findMany({
      where: { siteId },
      include: { steps: { include: { goal: true }, orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pageview.findMany({
      where: {
        siteId,
        visitId: { not: null },
        timestamp: { gte: fromDate, lte: toDate },
      },
      select: { visitId: true, pathname: true, timestamp: true },
    }),
    prisma.event.findMany({
      where: {
        siteId,
        visitId: { not: null },
        timestamp: { gte: fromDate, lte: toDate },
      },
      select: { visitId: true, name: true, pathname: true, properties: true, timestamp: true },
    }),
  ]);

  const activities: Activity[] = [
    ...pageviews.map((item) => ({
      visitId: item.visitId!,
      type: 'pageview' as const,
      pathname: item.pathname,
      timestamp: item.timestamp,
    })),
    ...events.map((item) => ({
      visitId: item.visitId!,
      type: 'event' as const,
      eventName: item.name,
      pathname: item.pathname,
      properties: item.properties as Record<string, unknown>,
      timestamp: item.timestamp,
    })),
  ];

  return funnels.map((funnel) => {
    const definition: FunnelDefinition = {
      id: funnel.id,
      name: funnel.name,
      mode: funnel.mode,
      steps: funnel.steps.map((step) => ({
        position: step.position,
        goal: step.goal,
      })),
    };
    return {
      id: funnel.id,
      name: funnel.name,
      mode: funnel.mode,
      ...analyzeFunnel(definition, activities),
    };
  });
}

export async function getPerformanceReport(siteId: string, range: ReportRange) {
  const { fromDate, toDate } = range;
  const vitals = await prisma.webVital.findMany({
    where: { siteId, timestamp: { gte: fromDate, lte: toDate } },
    orderBy: { timestamp: 'asc' },
  });

  const metrics = Array.from(groupBy(vitals, (vital) => vital.name).entries()).map(([name, rows]) => {
    const values = rows.map((row) => row.value);
    return {
      name,
      count: rows.length,
      average: values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100 : 0,
      p75: Math.round(percentile(values, 75) * 100) / 100,
      ratings: {
        good: rows.filter((row) => row.rating === 'good').length,
        needsImprovement: rows.filter((row) => row.rating === 'needs-improvement').length,
        poor: rows.filter((row) => row.rating === 'poor').length,
      },
    };
  });

  const slowestPages = Array.from(groupBy(vitals, (vital) => vital.pathname || '/').entries())
    .map(([pathname, rows]) => ({
      pathname,
      samples: rows.length,
      poorSamples: rows.filter((row) => row.rating === 'poor').length,
      lcpP75: metricP75(rows, 'LCP'),
      inpP75: metricP75(rows, 'INP'),
      clsP75: metricP75(rows, 'CLS'),
    }))
    .sort((a, b) => b.poorSamples - a.poorSamples || b.samples - a.samples)
    .slice(0, 20);

  return {
    metrics,
    slowestPages,
    devices: qualityBreakdown(vitals, (vital) => vital.device || 'unknown'),
    browsers: qualityBreakdown(vitals, (vital) => vital.browser || 'unknown'),
  };
}

export async function getInsightsReport(siteId: string) {
  const now = new Date();
  return prisma.insight.findMany({
    where: {
      siteId,
      dismissedAt: null,
      completedAt: null,
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });
}

export async function getUptimeSummary(siteId: string, since?: Date) {
  const fromDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [checks, lastCheck] = await Promise.all([
    prisma.uptimeCheck.aggregate({
      where: { siteId, checkedAt: { gte: fromDate } },
      _count: { id: true },
      _avg: { responseTime: true },
    }),
    prisma.uptimeCheck.findFirst({
      where: { siteId },
      orderBy: { checkedAt: 'desc' },
    }),
  ]);

  const totalChecks = checks._count.id;
  const upCount =
    totalChecks > 0
      ? await prisma.uptimeCheck.count({
          where: { siteId, checkedAt: { gte: fromDate }, isUp: true },
        })
      : 0;

  const uptimePercentage =
    totalChecks > 0 ? Math.round((upCount / totalChecks) * 10000) / 100 : 0;
  const avgResponseTime = Math.round(checks._avg.responseTime ?? 0);
  const currentStatus: 'up' | 'down' | 'unknown' = lastCheck
    ? lastCheck.isUp
      ? 'up'
      : 'down'
    : 'unknown';

  return {
    uptimePercentage,
    avgResponseTime,
    totalChecks,
    currentStatus,
    lastCheck: lastCheck
      ? {
          id: lastCheck.id,
          statusCode: lastCheck.statusCode,
          responseTime: lastCheck.responseTime,
          isUp: lastCheck.isUp,
          error: lastCheck.error,
          checkedAt: lastCheck.checkedAt.toISOString(),
        }
      : null,
  };
}

export async function getUptimeReport(siteId: string, range: ReportRange) {
  const { fromDate, toDate } = range;
  const checks = await prisma.uptimeCheck.findMany({
    where: { siteId, checkedAt: { gte: fromDate, lte: toDate } },
    orderBy: { checkedAt: 'desc' },
  });

  const totalChecks = checks.length;
  const upChecks = checks.filter((c) => c.isUp).length;
  const uptimePercentage =
    totalChecks > 0 ? Math.round((upChecks / totalChecks) * 10000) / 100 : 0;
  const responseChecks = checks.filter((check) => check.responseTime !== null);
  const avgResponseTime =
    responseChecks.length > 0
      ? Math.round(responseChecks.reduce((sum, c) => sum + (c.responseTime ?? 0), 0) / responseChecks.length)
      : 0;

  const lastCheck = checks[0] ?? null;
  const currentStatus: 'up' | 'down' | 'unknown' = lastCheck
    ? lastCheck.isUp
      ? 'up'
      : 'down'
    : 'unknown';

  const summary = {
    uptimePercentage,
    avgResponseTime,
    totalChecks,
    currentStatus,
    lastCheck: lastCheck
      ? {
          id: lastCheck.id,
          statusCode: lastCheck.statusCode,
          responseTime: lastCheck.responseTime,
          isUp: lastCheck.isUp,
          error: lastCheck.error,
          checkedAt: lastCheck.checkedAt.toISOString(),
        }
      : null,
  };

  const durationMs = toDate.getTime() - fromDate.getTime();
  const groupByHour = durationMs <= 2 * 24 * 60 * 60 * 1000;

  const buckets = new Map<string, { up: number; total: number; totalResponseTime: number }>();
  for (const check of checks) {
    const d = new Date(check.checkedAt);
    const key = groupByHour
      ? `${d.toISOString().slice(0, 10)} ${String(d.getUTCHours()).padStart(2, '0')}:00`
      : d.toISOString().slice(0, 10);

    const bucket = buckets.get(key) ?? { up: 0, total: 0, totalResponseTime: 0 };
    bucket.total++;
    bucket.totalResponseTime += check.responseTime ?? 0;
    if (check.isUp) bucket.up++;
    buckets.set(key, bucket);
  }

  const timeseries = Array.from(buckets.entries())
    .map(([date, b]) => ({
      date,
      uptimePercentage: Math.round((b.up / b.total) * 10000) / 100,
      avgResponseTime: Math.round(b.totalResponseTime / b.total),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const recentChecks = checks.slice(0, 20).map((c) => ({
    id: c.id,
    statusCode: c.statusCode,
    responseTime: c.responseTime,
    isUp: c.isUp,
    error: c.error,
    checkedAt: c.checkedAt.toISOString(),
  }));

  return { summary, timeseries, recentChecks };
}

interface AiSourceBucket {
  source: string;
  label: string;
  pageviews: number;
  events: number;
  revenue: number;
  visitKeys: Set<string>;
  orderKeys: Set<string>;
  currencies: Set<string>;
  landingPages: Map<string, number>;
  eventNames: Map<string, number>;
  goals: Map<string, number>;
}

function ensureAiBucket(
  buckets: Map<string, AiSourceBucket>,
  source: string,
  label: string
) {
  const current = buckets.get(source);
  if (current) return current;
  const next: AiSourceBucket = {
    source,
    label,
    pageviews: 0,
    events: 0,
    revenue: 0,
    visitKeys: new Set<string>(),
    orderKeys: new Set<string>(),
    currencies: new Set<string>(),
    landingPages: new Map<string, number>(),
    eventNames: new Map<string, number>(),
    goals: new Map<string, number>(),
  };
  buckets.set(source, next);
  return next;
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function topMap(map: Map<string, number>, key: string) {
  return Array.from(map.entries())
    .map(([value, count]) => ({ [key]: value, count }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 10);
}

function groupSourceRows(rows: SourceRow[]) {
  const total = rows.length;
  const sourceGroups = new Map<string, number>();
  const aiSources = new Map<string, { label: string; count: number }>();

  for (const row of rows) {
    const attribution = classifyTrafficSource(row);
    increment(sourceGroups, attribution.group);
    if (attribution.group === 'ai_assistant') {
      const current = aiSources.get(attribution.source) ?? { label: attribution.label, count: 0 };
      current.count++;
      aiSources.set(attribution.source, current);
    }
  }

  return {
    sourceGroups: withPercentage(
      Array.from(sourceGroups.entries()).map(([group, count]) => ({
        group,
        count,
      })),
      total
    ),
    aiSources: withPercentage(
      Array.from(aiSources.entries()).map(([source, value]) => ({
        source,
        label: value.label,
        count: value.count,
      })),
      total
    ),
  };
}

type SourceRow = {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

function groupRevenue<T extends { value: number }>(
  events: T[],
  getKey: (event: T) => string
) {
  const groups = new Map<string, { revenue: number; orders: number }>();
  for (const event of events) {
    const key = getKey(event);
    const current = groups.get(key) ?? { revenue: 0, orders: 0 };
    current.revenue += event.value;
    current.orders++;
    groups.set(key, current);
  }
  return Array.from(groups.entries())
    .map(([name, value]) => ({
      name,
      revenue: Math.round(value.revenue * 100) / 100,
      orders: value.orders,
      averageOrderValue: value.orders > 0 ? Math.round((value.revenue / value.orders) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function metricP75(rows: { name: string; value: number }[], metric: string) {
  const values = rows.filter((row) => row.name === metric).map((row) => row.value);
  return values.length > 0 ? Math.round(percentile(values, 75) * 100) / 100 : null;
}

function qualityBreakdown<T extends { rating: string }>(items: T[], getKey: (item: T) => string) {
  return Array.from(groupBy(items, getKey).entries())
    .map(([name, rows]) => ({
      name,
      samples: rows.length,
      poorSamples: rows.filter((row) => row.rating === 'poor').length,
      poorRate: rows.length > 0
        ? Math.round((rows.filter((row) => row.rating === 'poor').length / rows.length) * 10000) / 100
        : 0,
    }))
    .sort((a, b) => b.poorRate - a.poorRate || b.samples - a.samples)
    .slice(0, 20);
}

export async function getReportData(
  report: ReportKind,
  siteId: string,
  range: ReportRange,
  options: { page?: number; limit?: number; search?: string; eventName?: string } = {}
) {
  switch (report) {
    case 'overview':
      return getOverviewReport(siteId, range);
    case 'pages':
      return getPagesReport(siteId, range, options);
    case 'events':
      return getEventsReport(siteId, range, options.eventName);
    case 'acquisition':
      return getAcquisitionReport(siteId, range);
    case 'ai_sources':
      return getAiSourcesReport(siteId, range);
    case 'revenue':
      return getRevenueReport(siteId, range);
    case 'funnels':
      return getFunnelsReport(siteId, range);
    case 'performance':
      return getPerformanceReport(siteId, range);
    case 'insights':
      return getInsightsReport(siteId);
    case 'uptime':
      return getUptimeReport(siteId, range);
    case 'uptime_summary':
      return getUptimeSummary(siteId, range.fromDate);
  }
}
