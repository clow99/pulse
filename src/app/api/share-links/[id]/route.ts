import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const link = await prisma.shareLink.findUnique({ where: { id } });
    if (!link) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const access = await verifyOrgAccess(session.user.id, link.orgId, ['owner', 'admin']);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.shareLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({
      id: updated.id,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
