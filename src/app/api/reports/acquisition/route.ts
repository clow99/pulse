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

    const referrers = withPercentage(
      referrersRaw.map((r) => ({ referrer: r.referrer, count: r._count.id })),
      referrersTotal
    );

    const utmSources = withPercentage(
      utmSourceRaw.map((r) => ({ utmSource: r.utmSource, count: r._count.id })),
      utmSourceTotal
    );

    const utmMediums = withPercentage(
      utmMediumRaw.map((r) => ({
        utmMedium: r.utmMedium,
        count: r._count.id,
      })),
      utmMediumTotal
    );

    const utmCampaigns = withPercentage(
      utmCampaignRaw.map((r) => ({
        utmCampaign: r.utmCampaign,
        count: r._count.id,
      })),
      utmCampaignTotal
    );

    return NextResponse.json({
      referrers,
      utmSources,
      utmMediums,
      utmCampaigns,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
