import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { activityMatchesGoal, type Activity, type GoalDefinition } from '@/lib/funnel-analysis';
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

    const [goals, pageviews, events] = await Promise.all([
      prisma.goal.findMany({ where: { siteId: parsed.data.siteId }, orderBy: { createdAt: 'desc' } }),
      prisma.pageview.findMany({
        where: { siteId: parsed.data.siteId, timestamp: { gte: fromDate, lte: toDate } },
        select: { visitId: true, pathname: true, timestamp: true },
      }),
      prisma.event.findMany({
        where: { siteId: parsed.data.siteId, timestamp: { gte: fromDate, lte: toDate } },
        select: { visitId: true, name: true, pathname: true, properties: true, timestamp: true },
      }),
    ]);

    const activities: Activity[] = [
      ...pageviews.map((item) => ({
        visitId: item.visitId || '',
        type: 'pageview' as const,
        pathname: item.pathname,
        timestamp: item.timestamp,
      })),
      ...events.map((item) => ({
        visitId: item.visitId || '',
        type: 'event' as const,
        eventName: item.name,
        pathname: item.pathname,
        properties: item.properties as Record<string, unknown>,
        timestamp: item.timestamp,
      })),
    ];

    const data = goals.map((goal) => {
      const definition = goal as GoalDefinition;
      const matches = activities.filter((activity) => activityMatchesGoal(activity, definition));
      const visitIds = new Set(matches.map((match) => match.visitId).filter(Boolean));
      return {
        id: goal.id,
        name: goal.name,
        type: goal.type,
        matchType: goal.matchType,
        path: goal.path,
        eventName: goal.eventName,
        propertyKey: goal.propertyKey,
        propertyValue: goal.propertyValue,
        count: matches.length,
        uniqueVisits: visitIds.size,
        legacyCount: matches.filter((match) => !match.visitId).length,
      };
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
