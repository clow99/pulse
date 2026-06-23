import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { goalSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const siteId = new URL(request.url).searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    const access = await verifySiteAccess(session.user.id, siteId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const goals = await prisma.goal.findMany({ where: { siteId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(goals);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = goalSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid goal' }, { status: 400 });
    }
    const access = await verifySiteAccess(session.user.id, parsed.data.siteId, ['owner', 'admin']);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const goal = await prisma.goal.create({ data: parsed.data });
    return NextResponse.json(goal, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
