import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSiteSchema } from '@/lib/validation';
import { generateSiteToken } from '@/lib/tokens';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, ...siteData } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      );
    }

    const parsed = createSiteSchema.safeParse(siteData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const membership = await prisma.orgMembership.findFirst({
      where: {
        userId: session.user.id,
        orgId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = generateSiteToken();

    const site = await prisma.site.create({
      data: {
        name: parsed.data.name,
        domain: parsed.data.domain,
        token,
        orgId,
      },
    });

    return NextResponse.json(site, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
