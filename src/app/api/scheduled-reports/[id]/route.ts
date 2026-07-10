import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getReportForWrite(userId: string, id: string) {
  const report = await prisma.scheduledReport.findUnique({ where: { id } });
  if (!report) return null;
  const access = await verifyOrgAccess(userId, report.orgId, ['owner', 'admin']);
  return access ? report : null;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const report = await getReportForWrite(session.user.id, id);
    if (!report) {
      return NextResponse.json({ error: 'Scheduled report not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await prisma.scheduledReport.update({
      where: { id },
      data: {
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      enabled: updated.enabled,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const report = await getReportForWrite(session.user.id, id);
    if (!report) {
      return NextResponse.json({ error: 'Scheduled report not found' }, { status: 404 });
    }

    await prisma.scheduledReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
