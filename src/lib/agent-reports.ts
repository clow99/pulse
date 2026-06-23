import type { AgentScope } from './agent-auth';
import {
  getAcquisitionReport,
  getEventsReport,
  getOverviewReport,
  getPagesReport,
  getReportData,
  getUptimeReport,
  getUptimeSummary,
  type ReportKind,
  type ReportRange,
} from './reports';

export const AGENT_REPORTS = [
  'overview',
  'pages',
  'events',
  'acquisition',
  'uptime',
  'uptime_summary',
] as const satisfies readonly ReportKind[];

export function normalizeReportKind(value: string): ReportKind | null {
  const normalized = value.replace(/-/g, '_');
  return (AGENT_REPORTS as readonly string[]).includes(normalized)
    ? (normalized as ReportKind)
    : null;
}

export function scopesForReport(report: ReportKind): AgentScope[] {
  switch (report) {
    case 'events':
      return ['events:read'];
    case 'uptime':
    case 'uptime_summary':
      return ['uptime:read'];
    case 'overview':
    case 'pages':
    case 'acquisition':
      return ['analytics:read'];
  }
}

export function scopesForGeneratedReports(reports: ReportKind[]) {
  return Array.from(
    new Set<AgentScope>([
      'reports:generate',
      ...reports.flatMap((report) => scopesForReport(report)),
    ])
  );
}

export async function runAgentReport(
  report: ReportKind,
  siteId: string,
  range: ReportRange,
  options: { page?: number; limit?: number; search?: string; eventName?: string } = {}
) {
  switch (report) {
    case 'overview':
      return getOverviewReport(siteId, range);
    case 'pages':
      return getPagesReport(siteId, range, options);
    case 'events':
      return getEventsReport(siteId, range, options.eventName);
    case 'acquisition':
      return getAcquisitionReport(siteId, range);
    case 'uptime':
      return getUptimeReport(siteId, range);
    case 'uptime_summary':
      return getUptimeSummary(siteId, range.fromDate);
  }
}

export async function runGeneratedReports(
  reports: ReportKind[],
  siteId: string,
  range: ReportRange,
  options: { page?: number; limit?: number; search?: string; eventName?: string } = {}
) {
  const entries = await Promise.all(
    reports.map(async (report) => [
      report,
      await getReportData(report, siteId, range, options),
    ] as const)
  );
  return Object.fromEntries(entries);
}
