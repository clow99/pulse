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
    };

    const [browsersRaw, osRaw, devicesRaw, languagesRaw] = await Promise.all([
      prisma.pageview.groupBy({
        by: ['browser'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.pageview.groupBy({
        by: ['os'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.pageview.groupBy({
        by: ['device'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.pageview.groupBy({
        by: ['language'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const total = browsersRaw.reduce((s, r) => s + r._count.id, 0);

    const browsers = withPercentage(
      browsersRaw.map((r) => ({ browser: r.browser, count: r._count.id })),
      total
    );

    const operatingSystems = withPercentage(
      osRaw.map((r) => ({ os: r.os, count: r._count.id })),
      total
    );

    const devices = withPercentage(
      devicesRaw.map((r) => ({ device: r.device, count: r._count.id })),
      total
    );

    const languages = withPercentage(
      languagesRaw.map((r) => ({ language: r.language, count: r._count.id })),
      total
    );

    return NextResponse.json({
      browsers,
      operatingSystems,
      devices,
      languages,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
