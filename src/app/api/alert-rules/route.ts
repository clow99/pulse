import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess, verifySiteAccess } from '@/lib/site-access';
import { alertRuleSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const siteId = new URL(request.url).searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

    const access = await verifySiteAccess(session.user.id, siteId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rules = await prisma.alertRule.findMany({
      where: { siteId },
      include: { notificationChannel: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = alertRuleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid alert rule' }, { status: 400 });
    }

    const siteAccess = await verifySiteAccess(session.user.id, parsed.data.siteId, ['owner', 'admin']);
    if (!siteAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const channel = await prisma.notificationChannel.findUnique({
      where: { id: parsed.data.notificationChannelId },
    });
    if (!channel || channel.orgId !== siteAccess.site.orgId) {
      return NextResponse.json({ error: 'Notification channel not found' }, { status: 404 });
    }

    const orgAccess = await verifyOrgAccess(session.user.id, channel.orgId, ['owner', 'admin']);
    if (!orgAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rule = await prisma.alertRule.create({ data: parsed.data });
    return NextResponse.json(rule, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
