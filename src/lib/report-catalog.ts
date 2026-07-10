import type { ReportKind } from './reports';

export const PRODUCT_REPORTS = [
  'overview',
  'pages',
  'events',
  'acquisition',
  'ai_sources',
  'revenue',
  'funnels',
  'performance',
  'insights',
  'uptime',
  'uptime_summary',
] as const satisfies readonly ReportKind[];

export const DEFAULT_SHARED_REPORTS = [
  'overview',
  'acquisition',
  'ai_sources',
  'revenue',
  'uptime_summary',
] as const satisfies readonly ReportKind[];

export function normalizeProductReport(value: string): ReportKind | null {
  const normalized = value.trim().replace(/-/g, '_');
  return (PRODUCT_REPORTS as readonly string[]).includes(normalized)
    ? (normalized as ReportKind)
    : null;
}

export function parseReportList(value?: string | null, fallback: readonly ReportKind[] = DEFAULT_SHARED_REPORTS) {
  if (!value) return [...fallback];
  const reports = value
    .split(',')
    .map(normalizeProductReport)
    .filter(Boolean) as ReportKind[];
  return reports.length > 0 ? Array.from(new Set(reports)) : [...fallback];
}
