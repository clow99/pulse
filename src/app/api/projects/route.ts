import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';
import { projectSchema } from '@/lib/validation';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = new URL(request.url).searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  if (!await verifyOrgAccess(session.user.id, orgId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const projects = await prisma.project.findMany({
    where: { orgId },
    include: {
      environments: {
        orderBy: { createdAt: 'asc' },
        include: { services: { include: { sites: { select: { id: true, name: true, domain: true } }, monitors: { include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 } } } } } },
      },
      deployments: { orderBy: { deployedAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = projectSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid project' }, { status: 400 });
  if (!await verifyOrgAccess(session.user.id, parsed.data.orgId, ['owner', 'admin'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const project = await prisma.project.create({ data: parsed.data });
  return NextResponse.json(project, { status: 201 });
}
