import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { reportFiltersSchema } from '@/lib/validation';
import { z } from 'zod';

const reportQuerySchema = reportFiltersSchema
  .pick({ siteId: true, from: true, to: true, page: true, limit: true, search: true })
  .extend({
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

    const { siteId, from, to, page, limit, search } = parsed.data;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate >= toDate) {
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

    return NextResponse.json({
      data,
      total,
      page,
      limit,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
