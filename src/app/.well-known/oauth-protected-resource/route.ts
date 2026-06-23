import {
  generateProtectedResourceMetadata,
  getPublicOrigin,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';
import { AGENT_SCOPES } from '@/lib/agent-auth';

export function GET(request: Request) {
  const origin = getPublicOrigin(request);
  const resourceUrl = process.env.PULSE_MCP_RESOURCE_URL || `${origin}/api/mcp`;
  const authServerUrl = process.env.PULSE_AUTH_SERVER_URL || origin;

  return Response.json(
    generateProtectedResourceMetadata({
      authServerUrls: [authServerUrl],
      resourceUrl,
      additionalMetadata: {
        scopes_supported: [...AGENT_SCOPES],
        bearer_methods_supported: ['header'],
        resource_documentation: `${origin}/settings`,
      },
    }),
    {
      headers: {
        'Cache-Control': 'max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
