import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/project-access';
import { environmentSchema } from '@/lib/validation';

interface Context { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await context.params;
  if (!await verifyProjectAccess(session.user.id, projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await prisma.environment.findMany({ where: { projectId }, include: { services: true }, orderBy: { createdAt: 'asc' } }));
}

export async function POST(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await context.params;
  if (!await verifyProjectAccess(session.user.id, projectId, ['owner', 'admin'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = environmentSchema.safeParse({ ...(await request.json()), projectId });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid environment' }, { status: 400 });
  return NextResponse.json(await prisma.environment.create({ data: parsed.data }), { status: 201 });
}
