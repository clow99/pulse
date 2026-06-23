import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { z } from 'zod';

const querySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
});

interface RevenueEvent {
  id: string;
  visitId: string | null;
  pathname: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  device: string;
  country: string;
  revenueValue: unknown;
  revenueCurrency: string | null;
  orderId: string | null;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    const fromDate = new Date(parsed.data.from);
    const toDate = new Date(parsed.data.to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate >= toDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const access = await verifySiteAccess(session.user.id, parsed.data.siteId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const events = await prisma.event.findMany({
      where: {
        siteId: parsed.data.siteId,
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
    }) as RevenueEvent[];

    const visitIds = Array.from(new Set(events.map((event) => event.visitId).filter(Boolean))) as string[];
    const landingPages = new Map<string, string>();
    if (visitIds.length > 0) {
      const pageviews = await prisma.pageview.findMany({
        where: { siteId: parsed.data.siteId, visitId: { in: visitIds } },
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
    }));
    const totalRevenue = normalized.reduce((sum, event) => sum + event.value, 0);
    const orderKeys = new Set(normalized.map((event) => event.orderId || event.id));
    const orders = orderKeys.size;
    const currencies = Array.from(new Set(normalized.map((event) => event.revenueCurrency || 'USD')));

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        orders,
        averageOrderValue: orders > 0 ? Math.round((totalRevenue / orders) * 100) / 100 : 0,
        currency: currencies.length === 1 ? currencies[0] : 'MIXED',
      },
      breakdowns: {
        sources: groupRevenue(normalized, (event) => event.utmSource || 'Direct / unknown'),
        campaigns: groupRevenue(normalized, (event) => event.utmCampaign || 'Unassigned'),
        referrers: groupRevenue(normalized, (event) => event.referrer || 'Direct / unknown'),
        landingPages: groupRevenue(normalized, (event) => event.landingPage || '/'),
        devices: groupRevenue(normalized, (event) => event.device || 'unknown'),
        countries: groupRevenue(normalized, (event) => event.country || 'unknown'),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
