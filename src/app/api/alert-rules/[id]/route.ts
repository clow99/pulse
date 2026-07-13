import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySiteAccess } from '@/lib/site-access';
import { verifyMonitorAccess } from '@/lib/project-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getRuleForWrite(userId: string, id: string) {
  const rule = await prisma.alertRule.findUnique({ where: { id } });
  if (!rule) return null;
  const access = rule.monitorId
    ? await verifyMonitorAccess(userId, rule.monitorId, ['owner', 'admin'])
    : rule.siteId
      ? await verifySiteAccess(userId, rule.siteId, ['owner', 'admin'])
      : null;
  return access ? rule : null;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const rule = await getRuleForWrite(session.user.id, id);
    if (!rule) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const updated = await prisma.alertRule.update({
      where: { id },
      data: {
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        consecutiveFailures: Number.isInteger(body.consecutiveFailures) ? body.consecutiveFailures : undefined,
        recoveryChecks: Number.isInteger(body.recoveryChecks) ? body.recoveryChecks : undefined,
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
    const rule = await getRuleForWrite(session.user.id, id);
    if (!rule) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.alertRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
