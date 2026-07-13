import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyEnvironmentAccess } from '@/lib/project-access';
import { environmentSchema } from '@/lib/validation';

interface Context { params: Promise<{ environmentId: string }> }

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { environmentId } = await context.params;
  const access = await verifyEnvironmentAccess(session.user.id, environmentId, ['owner', 'admin']);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = environmentSchema.omit({ projectId: true }).partial().safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid environment' }, { status: 400 });
  return NextResponse.json(await prisma.environment.update({ where: { id: environmentId }, data: parsed.data }));
}

export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { environmentId } = await context.params;
  if (!await verifyEnvironmentAccess(session.user.id, environmentId, ['owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.environment.delete({ where: { id: environmentId } });
  return NextResponse.json({ success: true });
}
