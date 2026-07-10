import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DEFAULT_SHARED_REPORTS, normalizeProductReport } from '@/lib/report-catalog';
import { prisma } from '@/lib/prisma';
import type { ReportKind } from '@/lib/reports';
import { verifyOrgAccess } from '@/lib/site-access';
import { z } from 'zod';

const scheduledReportSchema = z.object({
  orgId: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string().min(2).max(120),
  reports: z.array(z.string()).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional().default('weekly'),
  channelType: z.enum(['email', 'webhook']),
  target: z.string().min(3).max(500),
  enabled: z.boolean().optional().default(true),
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

    const reports = await prisma.scheduledReport.findMany({
      where: { orgId },
      include: { site: { select: { id: true, name: true, domain: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reports.map((report) => ({
      id: report.id,
      orgId: report.orgId,
      site: report.site,
      name: report.name,
      reports: report.reports,
      frequency: report.frequency,
      channelType: report.channelType,
      target: report.target,
      enabled: report.enabled,
      nextRunAt: report.nextRunAt?.toISOString() ?? null,
      lastSentAt: report.lastSentAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
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

    const parsed = scheduledReportSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }

    const { orgId, siteId, name, frequency, channelType, target, enabled } = parsed.data;
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

    const report = await prisma.scheduledReport.create({
      data: {
        orgId,
        siteId,
        name,
        reports,
        frequency,
        channelType,
        target,
        enabled,
        nextRunAt: enabled ? nextRunDate(frequency) : null,
        createdById: session.user.id,
      },
      include: { site: { select: { id: true, name: true, domain: true } } },
    });

    return NextResponse.json({
      id: report.id,
      orgId: report.orgId,
      site: report.site,
      name: report.name,
      reports: report.reports,
      frequency: report.frequency,
      channelType: report.channelType,
      target: report.target,
      enabled: report.enabled,
      nextRunAt: report.nextRunAt?.toISOString() ?? null,
      lastSentAt: null,
      createdAt: report.createdAt.toISOString(),
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function nextRunDate(frequency: 'daily' | 'weekly' | 'monthly') {
  const date = new Date();
  if (frequency === 'daily') date.setDate(date.getDate() + 1);
  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
  return date;
}
