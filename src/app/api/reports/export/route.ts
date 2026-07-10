import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { parseReportList } from '@/lib/report-catalog';
import { getReportData, parseDateRange } from '@/lib/reports';
import { verifySiteAccess } from '@/lib/site-access';
import { z } from 'zod';

const exportQuerySchema = z.object({
  siteId: z.string().uuid(),
  from: z.string().min(1),
  to: z.string().min(1),
  reports: z.string().optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = exportQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid params' }, { status: 400 });
    }

    const range = parseDateRange(parsed.data.from, parsed.data.to);
    if (!range) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const access = await verifySiteAccess(session.user.id, parsed.data.siteId);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reports = parseReportList(parsed.data.reports);
    const data = Object.fromEntries(
      await Promise.all(
        reports.map(async (report) => [
          report,
          await getReportData(report, parsed.data.siteId, range),
        ] as const)
      )
    );

    if (parsed.data.format === 'csv') {
      const csv = toCsv(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="pulse-export.csv"',
        },
      });
    }

    return NextResponse.json({
      siteId: parsed.data.siteId,
      range: {
        from: range.fromDate.toISOString(),
        to: range.toDate.toISOString(),
      },
      reports,
      data,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function toCsv(data: Record<string, unknown>) {
  const rows = [['report', 'section', 'metric', 'value']];
  for (const [report, value] of Object.entries(data)) {
    flattenCsv(report, '', value, rows);
  }
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

function flattenCsv(report: string, path: string, value: unknown, rows: string[][]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenCsv(report, `${path}[${index}]`, item, rows));
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, nextValue] of Object.entries(value)) {
      flattenCsv(report, path ? `${path}.${key}` : key, nextValue, rows);
    }
    return;
  }

  const parts = path.split('.');
  rows.push([report, parts.slice(0, -1).join('.') || 'root', parts[parts.length - 1] || 'value', String(value ?? '')]);
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
