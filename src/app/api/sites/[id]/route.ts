import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSiteSchema } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

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

    const updateData: {
      active?: boolean;
      collectWebVitals?: boolean;
      name?: string;
      domain?: string;
    } = {};
    if (typeof body.active === 'boolean') updateData.active = body.active;
    if (typeof body.collectWebVitals === 'boolean') updateData.collectWebVitals = body.collectWebVitals;
    if (typeof body.name === 'string') {
      const parsedName = createSiteSchema.shape.name.safeParse(body.name.trim());
      if (!parsedName.success) {
        return NextResponse.json(
          { error: parsedName.error.issues[0]?.message || 'Name is invalid' },
          { status: 400 }
        );
      }
      updateData.name = parsedName.data;
    }
    if (typeof body.domain === 'string') {
      const parsedDomain = createSiteSchema.shape.domain.safeParse(body.domain.trim());
      if (!parsedDomain.success) {
        return NextResponse.json(
          { error: parsedDomain.error.issues[0]?.message || 'Domain is invalid' },
          { status: 400 }
        );
      }
      updateData.domain = parsedDomain.data;
    }

    const updated = await prisma.site.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
        role: 'owner',
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.site.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
