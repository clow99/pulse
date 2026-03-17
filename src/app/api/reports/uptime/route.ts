import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
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
    where: { userId_orgId: { userId, orgId: site.orgId } },
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
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const { siteId, from, to } = parsed.data;
    const range = parseDateRange(from, to);
    if (!range) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const siteAccess = await verifySiteAccess(session.user.id, siteId);
    if (!siteAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fromDate, toDate } = range;

    const checks = await prisma.uptimeCheck.findMany({
      where: { siteId, checkedAt: { gte: fromDate, lte: toDate } },
      orderBy: { checkedAt: 'desc' },
    });

    const totalChecks = checks.length;
    const upChecks = checks.filter((c) => c.isUp).length;
    const uptimePercentage = totalChecks > 0 ? Math.round((upChecks / totalChecks) * 10000) / 100 : 0;
    const avgResponseTime = totalChecks > 0
      ? Math.round(checks.reduce((sum, c) => sum + c.responseTime, 0) / totalChecks)
      : 0;

    const lastCheck = checks[0] ?? null;
    const currentStatus: 'up' | 'down' | 'unknown' = lastCheck
      ? lastCheck.isUp ? 'up' : 'down'
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

    return NextResponse.json({ summary, timeseries, recentChecks });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
