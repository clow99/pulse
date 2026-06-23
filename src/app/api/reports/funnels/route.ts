import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { analyzeFunnel, type Activity, type FunnelDefinition } from '@/lib/funnel-analysis';
import { z } from 'zod';

const querySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
});

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

    const [funnels, pageviews, events] = await Promise.all([
      prisma.funnel.findMany({
        where: { siteId: parsed.data.siteId },
        include: { steps: { include: { goal: true }, orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pageview.findMany({
        where: {
          siteId: parsed.data.siteId,
          visitId: { not: null },
          timestamp: { gte: fromDate, lte: toDate },
        },
        select: { visitId: true, pathname: true, timestamp: true },
      }),
      prisma.event.findMany({
        where: {
          siteId: parsed.data.siteId,
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

    const data = funnels.map((funnel) => {
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

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
