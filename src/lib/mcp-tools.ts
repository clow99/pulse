import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { z } from 'zod';
import {
  getAgentContextFromAuthInfo,
  requireAgentSiteAccess,
  writeAgentAuditLog,
} from './agent-auth';
import {
  AGENT_REPORTS,
  runAgentReport,
  runGeneratedReports,
  scopesForGeneratedReports,
  scopesForReport,
} from './agent-reports';
import { resolveOptionalDateRange, type ReportKind } from './reports';

const dateRangeShape = {
  siteId: z.string().uuid().describe('Pulse site ID to read analytics for.'),
  from: z
    .string()
    .datetime()
    .optional()
    .describe('Optional ISO start timestamp. Defaults to 30 days ago.'),
  to: z
    .string()
    .datetime()
    .optional()
    .describe('Optional ISO end timestamp. Defaults to now.'),
};

function authContext(authInfo?: AuthInfo) {
  const context = getAgentContextFromAuthInfo(authInfo);
  if (!context) {
    throw new Error('Agent authentication context is missing');
  }
  return context;
}

function jsonToolResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function requireRange(from?: string, to?: string) {
  const range = resolveOptionalDateRange(from, to);
  if (!range) {
    throw new Error('Invalid date range. Provide both from and to, or neither.');
  }
  return range;
}

async function runReportTool(
  report: ReportKind,
  authInfo: AuthInfo | undefined,
  args: {
    siteId: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    search?: string;
    eventName?: string;
  }
) {
  const context = authContext(authInfo);
  const scopes = scopesForReport(report);
  await requireAgentSiteAccess(context, args.siteId, scopes);
  const range = requireRange(args.from, args.to);
  const data = await runAgentReport(report, args.siteId, range, args);

  await writeAgentAuditLog({
    context,
    siteId: args.siteId,
    action: 'mcp.tool',
    outcome: 'success',
    toolName: report,
    scopes,
    metadata: {
      report,
      from: range.fromDate.toISOString(),
      to: range.toDate.toISOString(),
    },
  });

  return jsonToolResult({ report, siteId: args.siteId, range, data });
}

export function registerPulseMcpTools(server: McpServer) {
  server.registerTool(
    'get_overview',
    {
      title: 'Get Overview Report',
      description:
        'Read Pulse overview analytics for a site, including visitors, pageviews, timeseries, top pages, and referrers.',
      inputSchema: dateRangeShape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('overview', extra.authInfo, args)
  );

  server.registerTool(
    'get_pages_report',
    {
      title: 'Get Pages Report',
      description:
        'Read page performance analytics for a site with optional search and pagination.',
      inputSchema: {
        ...dateRangeShape,
        page: z.number().int().positive().optional().default(1),
        limit: z.number().int().positive().max(100).optional().default(20),
        search: z.string().max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('pages', extra.authInfo, args)
  );

  server.registerTool(
    'get_events_report',
    {
      title: 'Get Events Report',
      description:
        'Read custom event counts and optional property breakdowns for one event name.',
      inputSchema: {
        ...dateRangeShape,
        eventName: z.string().max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('events', extra.authInfo, args)
  );

  server.registerTool(
    'get_acquisition_report',
    {
      title: 'Get Acquisition Report',
      description:
        'Read referrer and UTM acquisition analytics for a Pulse site.',
      inputSchema: dateRangeShape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('acquisition', extra.authInfo, args)
  );

  server.registerTool(
    'get_uptime_summary',
    {
      title: 'Get Uptime Summary',
      description:
        'Read the current uptime status and 30-day uptime summary for a Pulse site.',
      inputSchema: {
        siteId: dateRangeShape.siteId,
        from: dateRangeShape.from,
        to: dateRangeShape.to,
      },
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('uptime_summary', extra.authInfo, args)
  );

  server.registerTool(
    'generate_report_data',
    {
      title: 'Generate Report Data',
      description:
        'Read multiple Pulse analytics datasets in one call for custom reports, charts, and insights.',
      inputSchema: {
        ...dateRangeShape,
        reports: z
          .array(z.enum(AGENT_REPORTS))
          .min(1)
          .max(AGENT_REPORTS.length)
          .optional()
          .describe('Report datasets to include. Defaults to the common report set.'),
        page: z.number().int().positive().optional().default(1),
        limit: z.number().int().positive().max(100).optional().default(20),
        search: z.string().max(200).optional(),
        eventName: z.string().max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const context = authContext(extra.authInfo);
      const reports = (args.reports ?? [
        'overview',
        'pages',
        'events',
        'acquisition',
        'uptime_summary',
      ]) as ReportKind[];
      const requiredScopes = scopesForGeneratedReports(reports);
      await requireAgentSiteAccess(context, args.siteId, requiredScopes);
      const range = requireRange(args.from, args.to);
      const data = await runGeneratedReports(reports, args.siteId, range, args);

      await writeAgentAuditLog({
        context,
        siteId: args.siteId,
        action: 'mcp.tool',
        outcome: 'success',
        toolName: 'generate_report_data',
        scopes: requiredScopes,
        metadata: {
          reports,
          from: range.fromDate.toISOString(),
          to: range.toDate.toISOString(),
        },
      });

      return jsonToolResult({ reports, siteId: args.siteId, range, data });
    }
  );
}
