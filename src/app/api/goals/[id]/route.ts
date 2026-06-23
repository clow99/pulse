import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { goalSchema } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getGoalForWrite(userId: string, id: string) {
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) return null;
  const access = await verifySiteAccess(userId, goal.siteId, ['owner', 'admin']);
  return access ? goal : null;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const existing = await getGoalForWrite(session.user.id, id);
    if (!existing) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const parsed = goalSchema.safeParse({ ...body, siteId: existing.siteId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid goal' }, { status: 400 });
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        matchType: parsed.data.matchType,
        path: parsed.data.path,
        eventName: parsed.data.eventName,
        propertyKey: parsed.data.propertyKey,
        propertyValue: parsed.data.propertyValue,
      },
    });
    return NextResponse.json(goal);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const existing = await getGoalForWrite(session.user.id, id);
    if (!existing) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
