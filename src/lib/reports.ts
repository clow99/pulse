import { subDays } from 'date-fns';
import { prisma } from './prisma';

export interface ReportRange {
  fromDate: Date;
  toDate: Date;
}

export type ReportKind =
  | 'overview'
  | 'pages'
  | 'events'
  | 'acquisition'
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
    SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
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

  const [visitorsResult, pageviewsCount, prevVisitorsResult, prevPageviewsCount] =
    await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
        FROM "Pageview"
        WHERE "siteId" = ${siteId}
          AND "timestamp" >= ${fromDate}
          AND "timestamp" <= ${toDate}
      `,
      prisma.pageview.count({ where: baseWhere }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
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
  const groupByHour = durationMs <= 2 * 24 * 60 * 60 * 1000;

  const timeseriesData = groupByHour
    ? await prisma.$queryRaw<
        { date_trunc: Date; visitors: bigint; pageviews: bigint }[]
      >`
        SELECT
          date_trunc('hour', "timestamp") as date_trunc,
          COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language)))::bigint as visitors,
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
          COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language)))::bigint as visitors,
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
        SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
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
        SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
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
      bounceRate: 0,
      avgPagesPerVisit: Math.round(avgPagesPerVisit * 100) / 100,
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
        SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
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
        SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
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
        SELECT COUNT(DISTINCT COALESCE("visitId", CONCAT(browser, '|', os, '|', device, '|', country, '|', language))) as count
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

  const [referrersRaw, utmSourceRaw, utmMediumRaw, utmCampaignRaw] =
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
    ]);

  const referrersTotal = referrersRaw.reduce((s, r) => s + r._count.id, 0);
  const utmSourceTotal = utmSourceRaw.reduce((s, r) => s + r._count.id, 0);
  const utmMediumTotal = utmMediumRaw.reduce((s, r) => s + r._count.id, 0);
  const utmCampaignTotal = utmCampaignRaw.reduce((s, r) => s + r._count.id, 0);

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
  };
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
  const avgResponseTime =
    totalChecks > 0
      ? Math.round(checks.reduce((sum, c) => sum + c.responseTime, 0) / totalChecks)
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
    bucket.totalResponseTime += check.responseTime;
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
    case 'uptime':
      return getUptimeReport(siteId, range);
    case 'uptime_summary':
      return getUptimeSummary(siteId, range.fromDate);
  }
}
