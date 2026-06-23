import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getChannelForWrite(userId: string, id: string) {
  const channel = await prisma.notificationChannel.findUnique({ where: { id } });
  if (!channel) return null;
  const access = await verifyOrgAccess(userId, channel.orgId, ['owner', 'admin']);
  return access ? channel : null;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const channel = await getChannelForWrite(session.user.id, id);
    if (!channel) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const updated = await prisma.notificationChannel.update({
      where: { id },
      data: {
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined,
        target: typeof body.target === 'string' && body.target.trim() ? body.target.trim() : undefined,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const channel = await getChannelForWrite(session.user.id, id);
    if (!channel) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.notificationChannel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
