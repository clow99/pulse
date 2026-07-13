import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyEnvironmentAccess } from '@/lib/project-access';
import { serviceSchema } from '@/lib/validation';

interface Context { params: Promise<{ environmentId: string }> }

export async function GET(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { environmentId } = await context.params;
  if (!await verifyEnvironmentAccess(session.user.id, environmentId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await prisma.service.findMany({ where: { environmentId }, include: { sites: true, monitors: true }, orderBy: { createdAt: 'asc' } }));
}

export async function POST(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { environmentId } = await context.params;
  if (!await verifyEnvironmentAccess(session.user.id, environmentId, ['owner', 'admin'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = serviceSchema.safeParse({ ...(await request.json()), environmentId });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid service' }, { status: 400 });
  return NextResponse.json(await prisma.service.create({ data: parsed.data }), { status: 201 });
}
