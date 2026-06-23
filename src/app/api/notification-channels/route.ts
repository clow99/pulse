import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';
import { notificationChannelSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = new URL(request.url).searchParams.get('orgId');
    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });

    const access = await verifyOrgAccess(session.user.id, orgId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const channels = await prisma.notificationChannel.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(channels);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = notificationChannelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid channel' }, { status: 400 });
    }

    const access = await verifyOrgAccess(session.user.id, parsed.data.orgId, ['owner', 'admin']);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const channel = await prisma.notificationChannel.create({ data: parsed.data });
    return NextResponse.json(channel, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
