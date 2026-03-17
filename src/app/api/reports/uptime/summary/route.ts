import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  siteId: z.string().uuid(),
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

    const { siteId } = parsed.data;

    const siteAccess = await verifySiteAccess(session.user.id, siteId);
    if (!siteAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [checks, lastCheck] = await Promise.all([
      prisma.uptimeCheck.aggregate({
        where: { siteId, checkedAt: { gte: since } },
        _count: { id: true },
        _avg: { responseTime: true },
      }),
      prisma.uptimeCheck.findFirst({
        where: { siteId },
        orderBy: { checkedAt: 'desc' },
      }),
    ]);

    const totalChecks = checks._count.id;

    let upCount = 0;
    if (totalChecks > 0) {
      upCount = await prisma.uptimeCheck.count({
        where: { siteId, checkedAt: { gte: since }, isUp: true },
      });
    }

    const uptimePercentage = totalChecks > 0
      ? Math.round((upCount / totalChecks) * 10000) / 100
      : 0;

    const avgResponseTime = Math.round(checks._avg.responseTime ?? 0);

    const currentStatus: 'up' | 'down' | 'unknown' = lastCheck
      ? lastCheck.isUp ? 'up' : 'down'
      : 'unknown';

    return NextResponse.json({
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
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
