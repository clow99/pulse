import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { funnelSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const siteId = new URL(request.url).searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    const access = await verifySiteAccess(session.user.id, siteId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const funnels = await prisma.funnel.findMany({
      where: { siteId },
      include: { steps: { include: { goal: true }, orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(funnels);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = funnelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid funnel' }, { status: 400 });
    }

    const access = await verifySiteAccess(session.user.id, parsed.data.siteId, ['owner', 'admin']);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const goals = await prisma.goal.findMany({
      where: { siteId: parsed.data.siteId, id: { in: parsed.data.goalIds } },
      select: { id: true },
    });
    if (goals.length !== parsed.data.goalIds.length) {
      return NextResponse.json({ error: 'Every funnel step must use a goal from this site' }, { status: 400 });
    }

    const funnel = await prisma.funnel.create({
      data: {
        siteId: parsed.data.siteId,
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
    return NextResponse.json(funnel, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
