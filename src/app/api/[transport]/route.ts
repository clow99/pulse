import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import {
  agentContextToAuthInfo,
  validateAgentBearerToken,
} from '@/lib/agent-auth';
import { registerPulseMcpTools } from '@/lib/mcp-tools';

const handler = createMcpHandler(
  (server) => {
    registerPulseMcpTools(server);
  },
  {
    serverInfo: {
      name: 'pulse-analytics',
      version: '0.1.0',
    },
  },
  {
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: process.env.PULSE_MCP_VERBOSE_LOGS === 'true',
    disableSse: !process.env.REDIS_URL && !process.env.KV_URL,
  }
);

const authenticatedHandler = withMcpAuth(
  handler,
  async (request, bearerToken) => {
    const context = await validateAgentBearerToken(bearerToken, request);
    return context && bearerToken
      ? agentContextToAuthInfo(context, bearerToken)
      : undefined;
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource',
    resourceUrl: process.env.PULSE_MCP_RESOURCE_URL,
  }
);

export { authenticatedHandler as GET, authenticatedHandler as POST };
