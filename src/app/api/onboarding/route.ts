import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createOrgSchema, createSiteSchema } from '@/lib/validation';
import { generateSiteToken } from '@/lib/tokens';
import { generateSlug } from '@/lib/slugify';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const org = createOrgSchema.safeParse(body.org);
  const site = createSiteSchema.safeParse(body.site);
  if (!org.success) return NextResponse.json({ error: org.error.issues[0]?.message }, { status: 400 });
  if (!site.success) return NextResponse.json({ error: site.error.issues[0]?.message }, { status: 400 });
  const userId = session.user.id;
  const existingMembership = await prisma.orgMembership.findFirst({ where: { userId: session.user.id }, select: { id: true } });
  if (existingMembership) return NextResponse.json({ error: 'Onboarding is already complete' }, { status: 409 });
  if (await prisma.organization.findUnique({ where: { slug: org.data.slug }, select: { id: true } })) {
    return NextResponse.json({ error: 'An organization with this slug already exists' }, { status: 409 });
  }
  const token = generateSiteToken();
  const created = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: org.data.name, slug: org.data.slug, members: { create: { userId, role: 'owner' } } },
    });
    const project = await tx.project.create({
      data: { orgId: organization.id, name: site.data.name, slug: generateSlug(site.data.name) || 'project', description: `Project intelligence for ${site.data.domain}` },
    });
    const environment = await tx.environment.create({ data: { projectId: project.id, name: 'Production', slug: 'production', kind: 'production' } });
    const service = await tx.service.create({ data: { environmentId: environment.id, name: 'Web', slug: 'web', kind: 'web' } });
    const analyticsSite = await tx.site.create({
      data: { orgId: organization.id, serviceId: service.id, name: site.data.name, domain: site.data.domain, token, collectWebVitals: site.data.collectWebVitals ?? false },
    });
    await tx.monitor.create({ data: { serviceId: service.id, name: `${site.data.name} HTTP`, type: 'http', config: { url: `https://${site.data.domain}`, method: 'HEAD', expectedStatusMin: 200, expectedStatusMax: 399 }, nextRunAt: new Date() } });
    return { organization, project, environment, service, site: analyticsSite };
  });
  return NextResponse.json(created, { status: 201 });
}
