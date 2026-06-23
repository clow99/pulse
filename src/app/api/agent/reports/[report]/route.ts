import { NextResponse } from 'next/server';
import {
  authenticateAgentRequest,
  writeAgentAuditLog,
} from '@/lib/agent-auth';
import {
  normalizeReportKind,
  runAgentReport,
  scopesForReport,
} from '@/lib/agent-reports';
import { resolveOptionalDateRange } from '@/lib/reports';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ report: string }>;
}

const querySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().max(200).optional(),
  eventName: z.string().max(200).optional(),
  name: z.string().max(200).optional(),
});

export async function GET(request: Request, context: RouteContext) {
  try {
    const { report: reportParam } = await context.params;
    const report = normalizeReportKind(reportParam);
    if (!report) {
      return NextResponse.json({ error: 'Unknown report' }, { status: 404 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid params' },
        { status: 400 }
      );
    }

    const { siteId, from, to, page, limit, search, eventName, name } = parsed.data;
    const range = resolveOptionalDateRange(from, to);
    if (!range) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const authResult = await authenticateAgentRequest(
      request,
      scopesForReport(report),
      siteId
    );
    if (authResult.response) return authResult.response;

    const data = await runAgentReport(report, siteId, range, {
      page,
      limit,
      search,
      eventName: eventName ?? name,
    });

    await writeAgentAuditLog({
      context: authResult.context,
      siteId,
      action: 'agent.report',
      outcome: 'success',
      toolName: report,
      scopes: scopesForReport(report),
      metadata: { report, from: range.fromDate.toISOString(), to: range.toDate.toISOString() },
      request,
    });

    return NextResponse.json({ report, siteId, range, data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
