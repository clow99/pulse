import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSiteToken } from '@/lib/tokens';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const site = await prisma.site.findUnique({
      where: { id },
      select: { orgId: true },
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId: session.user.id,
        orgId: site.orgId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newToken = generateSiteToken();

    const updated = await prisma.site.update({
      where: { id },
      data: { token: newToken },
    });

    return NextResponse.json({ token: updated.token });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
