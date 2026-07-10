import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const channel = await prisma.notificationChannel.findUnique({
      where: { id },
      include: { org: { include: { sites: { take: 1 } } } },
    });
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const access = await verifyOrgAccess(session.user.id, channel.orgId, ['owner', 'admin']);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const site = channel.org.sites[0] ?? {
      id: 'test',
      name: channel.org.name,
      domain: 'example.com',
    };

    await sendNotification(channel, {
      event: 'incident.resolved',
      site: { id: site.id, name: site.name, domain: site.domain },
      incident: {
        id: 'test',
        title: 'Pulse notification test',
        description: 'This is a test notification from Pulse.',
        status: 'resolved',
        startedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
      },
      check: { statusCode: 200, responseTime: 123, error: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Notification test failed',
    }, { status: 500 });
  }
}
