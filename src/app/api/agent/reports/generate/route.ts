import { NextResponse } from 'next/server';
import {
  authenticateAgentRequest,
  writeAgentAuditLog,
} from '@/lib/agent-auth';
import {
  AGENT_REPORTS,
  normalizeReportKind,
  runGeneratedReports,
  scopesForGeneratedReports,
} from '@/lib/agent-reports';
import { resolveOptionalDateRange, type ReportKind } from '@/lib/reports';
import { z } from 'zod';

const generateSchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  reports: z.array(z.string()).min(1).max(AGENT_REPORTS.length).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().max(200).optional(),
  eventName: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const {
      siteId,
      from,
      to,
      page,
      limit,
      search,
      eventName,
    } = parsed.data;
    const range = resolveOptionalDateRange(from, to);
    if (!range) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const reports = (parsed.data.reports?.map(normalizeReportKind).filter(Boolean) ??
      ['overview', 'pages', 'events', 'acquisition', 'uptime_summary']) as ReportKind[];

    if (reports.length === 0) {
      return NextResponse.json({ error: 'No valid reports requested' }, { status: 400 });
    }

    const requiredScopes = scopesForGeneratedReports(reports);
    const authResult = await authenticateAgentRequest(request, requiredScopes, siteId);
    if (authResult.response) return authResult.response;

    const data = await runGeneratedReports(reports, siteId, range, {
      page,
      limit,
      search,
      eventName,
    });

    await writeAgentAuditLog({
      context: authResult.context,
      siteId,
      action: 'agent.report.generate',
      outcome: 'success',
      toolName: 'generate_report_data',
      scopes: requiredScopes,
      metadata: {
        reports,
        from: range.fromDate.toISOString(),
        to: range.toDate.toISOString(),
      },
      request,
    });

    return NextResponse.json({ siteId, range, reports, data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
