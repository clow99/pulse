import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';
import { statusPageSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = new URL(request.url).searchParams.get('orgId');
    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });

    const access = await verifyOrgAccess(session.user.id, orgId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const pages = await prisma.statusPage.findMany({
      where: { orgId },
      include: { components: { include: { site: true, service: true }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(pages);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = statusPageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid status page' }, { status: 400 });
    }

    const access = await verifyOrgAccess(session.user.id, parsed.data.orgId, ['owner', 'admin']);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const componentSiteIds = parsed.data.components.map((component) => component.siteId);
    const sites = await prisma.site.findMany({
      where: { orgId: parsed.data.orgId, id: { in: componentSiteIds } },
      select: { id: true, serviceId: true },
    });
    if (sites.length !== componentSiteIds.length) {
      return NextResponse.json({ error: 'One or more component sites are invalid' }, { status: 400 });
    }

    const page = await prisma.statusPage.create({
      data: {
        orgId: parsed.data.orgId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        enabled: parsed.data.enabled,
        components: {
          create: parsed.data.components.map((component, index) => ({
            siteId: component.siteId,
            serviceId: sites.find((site) => site.id === component.siteId)?.serviceId ?? null,
            name: component.name,
            sortOrder: index,
          })),
        },
      },
      include: { components: true },
    });

    return NextResponse.json(page, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
