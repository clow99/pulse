import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reportQuerySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
  name: z.string().optional(),
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

function aggregatePropertyBreakdown(events: { properties: unknown }[]) {
  const keyCounts: Record<string, Record<string, number>> = {};
  for (const e of events) {
    const props = e.properties as Record<string, string> | null;
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

    const { siteId, from, to, name } = parsed.data;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (
      isNaN(fromDate.getTime()) ||
      isNaN(toDate.getTime()) ||
      fromDate >= toDate
    ) {
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
      ...(name ? { name } : {}),
    };

    if (name) {
      const [events, uniqueResult] = await Promise.all([
        prisma.event.findMany({
          where: baseWhere,
          select: { properties: true },
        }),
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language)) as count
          FROM "Event"
          WHERE "siteId" = ${siteId}
            AND "name" = ${name}
            AND "timestamp" >= ${fromDate}
            AND "timestamp" <= ${toDate}
        `,
      ]);

      const totalCount = events.length;
      const uniqueTriggers = Number(uniqueResult[0]?.count ?? 0);
      const propertyBreakdown = aggregatePropertyBreakdown(events);

      return NextResponse.json({
        name,
        count: totalCount,
        uniqueTriggers,
        propertyBreakdown,
      });
    }

    const grouped = await prisma.event.groupBy({
      by: ['name'],
      where: baseWhere,
      _count: { id: true },
    });

    const result = await Promise.all(
      grouped.map(async (row) => {
        const uniqueResult = await prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(DISTINCT CONCAT(browser, '|', os, '|', device, '|', country, '|', language)) as count
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

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
