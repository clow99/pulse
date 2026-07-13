import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyServiceAccess } from '@/lib/project-access';
import { monitorSchema } from '@/lib/validation';
import { createHeartbeatSecret } from '@/lib/monitoring';

interface Context { params: Promise<{ serviceId: string }> }

export async function GET(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { serviceId } = await context.params;
  if (!await verifyServiceAccess(session.user.id, serviceId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await prisma.monitor.findMany({
    where: { serviceId },
    include: { checks: { orderBy: { checkedAt: 'desc' }, take: 20 }, incidents: { orderBy: { startedAt: 'desc' }, take: 20 } },
    orderBy: { createdAt: 'asc' },
  }));
}

export async function POST(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { serviceId } = await context.params;
  if (!await verifyServiceAccess(session.user.id, serviceId, ['owner', 'admin'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = monitorSchema.safeParse({ ...(await request.json()), serviceId });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid monitor' }, { status: 400 });
  const { url, method, expectedStatusMin, expectedStatusMax, bodyContains, warningDays, ...data } = parsed.data;
  const heartbeat = data.type === 'heartbeat' ? createHeartbeatSecret() : null;
  const monitor = await prisma.monitor.create({
    data: {
      ...data,
      config: { ...(url ? { url } : {}), method, expectedStatusMin, expectedStatusMax, bodyContains: bodyContains ?? null, warningDays },
      secretHash: heartbeat?.hash,
      secretPrefix: heartbeat?.prefix,
      nextRunAt: new Date(Date.now() + data.intervalSeconds * 1000),
    },
  });
  return NextResponse.json({ ...monitor, heartbeatSecret: heartbeat?.secret ?? null }, { status: 201 });
}
