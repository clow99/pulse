import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSiteSchema } from '@/lib/validation';
import { generateSiteToken } from '@/lib/tokens';
import type { SessionUser } from '@/types';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const memberships = await prisma.orgMembership.findMany({
      where: { userId: user.id },
      select: { orgId: true },
    });

    if (memberships.length === 0) {
      return NextResponse.json([]);
    }

    const orgIds = memberships.map((m) => m.orgId);
    const sites = await prisma.site.findMany({
      where: { orgId: { in: orgIds } },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sitesWithStats = await Promise.all(
      sites.map(async (site) => {
        const pageviewCount = await prisma.pageview.count({
          where: {
            siteId: site.id,
            timestamp: { gte: thirtyDaysAgo, lte: now },
          },
        });
        return {
          id: site.id,
          name: site.name,
          domain: site.domain,
          token: site.token,
          active: site.active,
          collectWebVitals: site.collectWebVitals,
          createdAt: site.createdAt.toISOString(),
          pageviewCount,
        };
      })
    );

    return NextResponse.json(sitesWithStats);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
        collectWebVitals: parsed.data.collectWebVitals ?? false,
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
