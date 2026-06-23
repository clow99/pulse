import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { funnelSchema } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getFunnelForWrite(userId: string, id: string) {
  const funnel = await prisma.funnel.findUnique({ where: { id } });
  if (!funnel) return null;
  const access = await verifySiteAccess(userId, funnel.siteId, ['owner', 'admin']);
  return access ? funnel : null;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const existing = await getFunnelForWrite(session.user.id, id);
    if (!existing) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsed = funnelSchema.safeParse({ ...(await request.json()), siteId: existing.siteId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid funnel' }, { status: 400 });
    }

    const goals = await prisma.goal.findMany({
      where: { siteId: existing.siteId, id: { in: parsed.data.goalIds } },
      select: { id: true },
    });
    if (goals.length !== parsed.data.goalIds.length) {
      return NextResponse.json({ error: 'Every funnel step must use a goal from this site' }, { status: 400 });
    }

    const funnel = await prisma.$transaction(async (tx) => {
      await tx.funnelStep.deleteMany({ where: { funnelId: id } });
      return tx.funnel.update({
        where: { id },
        data: {
          name: parsed.data.name,
          mode: parsed.data.mode,
          steps: {
            create: parsed.data.goalIds.map((goalId, index) => ({
              goalId,
              position: index + 1,
            })),
          },
        },
        include: { steps: { include: { goal: true }, orderBy: { position: 'asc' } } },
      });
    });
    return NextResponse.json(funnel);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const existing = await getFunnelForWrite(session.user.id, id);
    if (!existing) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await prisma.funnel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
