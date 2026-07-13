import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyMonitorAccess } from '@/lib/project-access';
import { monitorUpdateSchema } from '@/lib/validation';
import type { Prisma } from '@prisma/client';

interface Context { params: Promise<{ monitorId: string }> }

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { monitorId } = await context.params;
  const access = await verifyMonitorAccess(session.user.id, monitorId, ['owner', 'admin']);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = monitorUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid monitor' }, { status: 400 });
  const { url, method, expectedStatusMin, expectedStatusMax, bodyContains, warningDays, ...fields } = parsed.data;
  const config = access.monitor.config as Record<string, unknown>;
  const updates = Object.fromEntries(Object.entries({ url, method, expectedStatusMin, expectedStatusMax, bodyContains, warningDays }).filter(([, value]) => value !== undefined));
  return NextResponse.json(await prisma.monitor.update({
    where: { id: monitorId },
    data: { ...fields, config: { ...config, ...updates } as Prisma.InputJsonValue, nextRunAt: new Date() },
  }));
}

export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { monitorId } = await context.params;
  if (!await verifyMonitorAccess(session.user.id, monitorId, ['owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.monitor.delete({ where: { id: monitorId } });
  return NextResponse.json({ success: true });
}
