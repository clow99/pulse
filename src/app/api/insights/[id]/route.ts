import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const insight = await prisma.insight.findUnique({ where: { id } });
    if (!insight) return NextResponse.json({ error: 'Insight not found' }, { status: 404 });

    const access = await verifySiteAccess(session.user.id, insight.siteId, ['owner', 'admin']);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'dismiss';
    const data =
      action === 'complete'
        ? { completedAt: new Date(), dismissedAt: null, snoozedUntil: null }
        : action === 'snooze'
          ? { snoozedUntil: new Date(Date.now() + 7 * 86400000), dismissedAt: null, completedAt: null }
          : { dismissedAt: new Date(), snoozedUntil: null, completedAt: null };

    const updated = await prisma.insight.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
