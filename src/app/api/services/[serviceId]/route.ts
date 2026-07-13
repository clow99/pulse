import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyServiceAccess } from '@/lib/project-access';
import { serviceSchema } from '@/lib/validation';

interface Context { params: Promise<{ serviceId: string }> }

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { serviceId } = await context.params;
  if (!await verifyServiceAccess(session.user.id, serviceId, ['owner', 'admin'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = serviceSchema.omit({ environmentId: true }).partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid service' }, { status: 400 });
  return NextResponse.json(await prisma.service.update({ where: { id: serviceId }, data: parsed.data }));
}

export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { serviceId } = await context.params;
  if (!await verifyServiceAccess(session.user.id, serviceId, ['owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.service.delete({ where: { id: serviceId } });
  return NextResponse.json({ success: true });
}
