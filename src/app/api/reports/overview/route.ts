import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reportQuerySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
});

async function verifySiteAccess(userId: string, siteId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { orgId: true },
  });
  if (!site) return null;

  const membership = await prisma.orgMembership.findUnique({
    where: {
      userId_orgId: { userId, orgId: site.orgId },
    },
  });
  return membership ? site : null;
}

function parseDateRange(from: string, to: string) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  if (fromDate >= toDate) return null;
  return { fromDate, toDate };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = reportQuerySchema.safeParse(
      Object.fromEntries(url.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const { siteId, from, to } = parsed.data;
    const range = parseDateRange(from, to);
    if (!range) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    const siteAccess = await verifySiteAccess(session.user.id, siteId);
    if (!siteAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

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
          SELECT COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language)) as count
          FROM "Pageview"
          WHERE "siteId" = ${siteId}
            AND "timestamp" >= ${fromDate}
            AND "timestamp" <= ${toDate}
        `,
        prisma.pageview.count({ where: baseWhere }),
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language)) as count
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
          COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language))::bigint as visitors,
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
          COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language))::bigint as visitors,
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
          SELECT COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language)) as count
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
          SELECT COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language)) as count
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

    return NextResponse.json({
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
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
