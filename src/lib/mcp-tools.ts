import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { z } from 'zod';
import {
  getAgentContextFromAuthInfo,
  hasAgentScopes,
  requireAgentProjectAccess,
  requireAgentSiteAccess,
  writeAgentAuditLog,
} from './agent-auth';
import { prisma } from './prisma';
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
    'get_ai_sources_report',
    {
      title: 'Get AI Sources Report',
      description:
        'Read AI assistant traffic attribution, including AI source visitors, landing pages, events, goals, and revenue.',
      inputSchema: dateRangeShape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('ai_sources', extra.authInfo, args)
  );

  server.registerTool(
    'get_revenue_report',
    {
      title: 'Get Revenue Report',
      description:
        'Read revenue attribution by source, campaign, referrer, landing page, device, country, and source group.',
      inputSchema: dateRangeShape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('revenue', extra.authInfo, args)
  );

  server.registerTool(
    'get_funnels_report',
    {
      title: 'Get Funnels Report',
      description:
        'Read configured funnel conversion and step drop-off reports for a site.',
      inputSchema: dateRangeShape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('funnels', extra.authInfo, args)
  );

  server.registerTool(
    'get_performance_report',
    {
      title: 'Get Performance Report',
      description:
        'Read Core Web Vitals summaries, slowest pages, and quality breakdowns.',
      inputSchema: dateRangeShape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('performance', extra.authInfo, args)
  );

  server.registerTool(
    'get_insights_report',
    {
      title: 'Get Insights Report',
      description:
        'Read active Pulse action-center insights for a site.',
      inputSchema: dateRangeShape,
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => runReportTool('insights', extra.authInfo, args)
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
        'ai_sources',
        'revenue',
        'insights',
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

  server.registerTool(
    'get_daily_brief',
    {
      title: 'Get Daily Portfolio Brief',
      description: 'Read the latest persisted Pulse project-intelligence brief for the authenticated organization.',
      inputSchema: {
        projectId: z.string().uuid().optional().describe('Optional project filter.'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Optional local date in YYYY-MM-DD format.'),
      },
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const context = authContext(extra.authInfo);
      if (!hasAgentScopes(context.scopes, ['portfolio:read'])) throw new Error('Insufficient agent token scope');
      const projectId = args.projectId ?? context.projectId ?? undefined;
      if (projectId) await requireAgentProjectAccess(context, projectId, ['portfolio:read']);
      const brief = await prisma.dailyBrief.findFirst({
        where: {
          orgId: context.orgId,
          ...(args.date ? { localDate: new Date(`${args.date}T00:00:00.000Z`) } : {}),
        },
        orderBy: { localDate: 'desc' },
      });
      if (!brief) return jsonToolResult({ brief: null });
      const evidence = brief.evidence as { projects?: Array<{ projectId?: string }> };
      const filteredEvidence = projectId && evidence.projects
        ? { ...evidence, projects: evidence.projects.filter((project) => project.projectId === projectId) }
        : evidence;
      await writeAgentAuditLog({ context, projectId: projectId ?? null, action: 'mcp.tool', outcome: 'success', toolName: 'get_daily_brief', scopes: ['portfolio:read'], metadata: { briefId: brief.id } });
      return jsonToolResult({ ...brief, evidence: filteredEvidence });
    }
  );

  server.registerTool(
    'get_project_status',
    {
      title: 'Get Project Status',
      description: 'Read environments, services, latest monitor checks, open incidents, and recent deployments for one project.',
      inputSchema: { projectId: z.string().uuid() },
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      const context = authContext(extra.authInfo);
      await requireAgentProjectAccess(context, args.projectId, ['portfolio:read']);
      const project = await prisma.project.findUnique({
        where: { id: args.projectId },
        include: {
          environments: { include: { services: { include: { sites: { select: { id: true, name: true, domain: true } }, monitors: { include: { checks: { orderBy: { checkedAt: 'desc' }, take: 1 }, incidents: { where: { status: 'open' } } } } } } } },
          deployments: { orderBy: { deployedAt: 'desc' }, take: 10 },
        },
      });
      await writeAgentAuditLog({ context, projectId: args.projectId, action: 'mcp.tool', outcome: 'success', toolName: 'get_project_status', scopes: ['portfolio:read'] });
      return jsonToolResult(project);
    }
  );
}
