import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyProjectAccess } from '@/lib/project-access';
import { projectUpdateSchema } from '@/lib/validation';

interface Context { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await context.params;
  if (!await verifyProjectAccess(session.user.id, projectId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      environments: { include: { services: { include: { sites: true, monitors: { include: { checks: { orderBy: { checkedAt: 'desc' }, take: 20 }, incidents: { orderBy: { startedAt: 'desc' }, take: 10 } } } } } } },
      deployments: { orderBy: { deployedAt: 'desc' }, take: 25 },
    },
  });
  return NextResponse.json(project);
}

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await context.params;
  if (!await verifyProjectAccess(session.user.id, projectId, ['owner', 'admin'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = projectUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid project' }, { status: 400 });
  return NextResponse.json(await prisma.project.update({ where: { id: projectId }, data: parsed.data }));
}

export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await context.params;
  if (!await verifyProjectAccess(session.user.id, projectId, ['owner'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.project.delete({ where: { id: projectId } });
  return NextResponse.json({ success: true });
}
