import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DEFAULT_SHARED_REPORTS, normalizeProductReport } from '@/lib/report-catalog';
import { prisma } from '@/lib/prisma';
import type { ReportKind } from '@/lib/reports';
import { verifyOrgAccess } from '@/lib/site-access';
import { z } from 'zod';

const createShareLinkSchema = z.object({
  orgId: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string().min(2).max(120),
  reports: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = new URL(request.url).searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const access = await verifyOrgAccess(session.user.id, orgId);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const links = await prisma.shareLink.findMany({
      where: { orgId },
      include: { site: { select: { id: true, name: true, domain: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(links.map((link) => ({
      id: link.id,
      orgId: link.orgId,
      site: link.site,
      name: link.name,
      token: link.token,
      reports: link.reports,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      revokedAt: link.revokedAt?.toISOString() ?? null,
      createdAt: link.createdAt.toISOString(),
      url: `/share/${link.token}`,
    })));
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = createShareLinkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }

    const { orgId, siteId, name, expiresAt } = parsed.data;
    const access = await verifyOrgAccess(session.user.id, orgId, ['owner', 'admin']);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const site = await prisma.site.findUnique({ where: { id: siteId }, select: { orgId: true } });
    if (!site || site.orgId !== orgId) {
      return NextResponse.json({ error: 'Site does not belong to this organization' }, { status: 400 });
    }

    const reports = parsed.data.reports
      ?.map(normalizeProductReport)
      .filter((report): report is ReportKind => Boolean(report)) ?? [...DEFAULT_SHARED_REPORTS];

    const link = await prisma.shareLink.create({
      data: {
        orgId,
        siteId,
        name,
        token: randomBytes(18).toString('base64url'),
        reports,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: session.user.id,
      },
      include: { site: { select: { id: true, name: true, domain: true } } },
    });

    return NextResponse.json({
      id: link.id,
      orgId: link.orgId,
      site: link.site,
      name: link.name,
      token: link.token,
      reports: link.reports,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      revokedAt: null,
      createdAt: link.createdAt.toISOString(),
      url: `/share/${link.token}`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
