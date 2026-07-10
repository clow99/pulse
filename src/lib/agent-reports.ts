import type { AgentScope } from './agent-auth';
import {
  getAcquisitionReport,
  getAiSourcesReport,
  getEventsReport,
  getFunnelsReport,
  getInsightsReport,
  getOverviewReport,
  getPagesReport,
  getPerformanceReport,
  getReportData,
  getRevenueReport,
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
  'ai_sources',
  'revenue',
  'funnels',
  'performance',
  'insights',
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
    case 'revenue':
    case 'funnels':
      return ['events:read'];
    case 'performance':
    case 'insights':
    case 'ai_sources':
    case 'acquisition':
    case 'overview':
    case 'pages':
      return ['analytics:read'];
    case 'uptime':
    case 'uptime_summary':
      return ['uptime:read'];
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
    case 'ai_sources':
      return getAiSourcesReport(siteId, range);
    case 'revenue':
      return getRevenueReport(siteId, range);
    case 'funnels':
      return getFunnelsReport(siteId, range);
    case 'performance':
      return getPerformanceReport(siteId, range);
    case 'insights':
      return getInsightsReport(siteId);
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
