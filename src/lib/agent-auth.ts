import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './prisma';
import { checkRateLimit } from './rate-limit';

export const AGENT_SCOPES = [
  'analytics:read',
  'events:read',
  'uptime:read',
  'reports:generate',
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export const agentScopeSchema = z.enum(AGENT_SCOPES);
export const agentScopesSchema = z
  .array(agentScopeSchema)
  .min(1)
  .max(AGENT_SCOPES.length)
  .refine((scopes) => new Set(scopes).size === scopes.length, {
    message: 'Scopes must be unique',
  });

export interface AgentAuthContext {
  tokenId: string;
  orgId: string;
  siteId: string | null;
  role: 'owner' | 'admin' | 'viewer';
  scopes: AgentScope[];
}

export interface AgentAuditInput {
  context?: AgentAuthContext | null;
  orgId?: string | null;
  action: string;
  outcome: 'success' | 'failure';
  siteId?: string | null;
  toolName?: string | null;
  scopes?: string[];
  metadata?: Prisma.InputJsonValue;
  request?: Request;
}

const TOKEN_PREFIX = 'pulse_at_';
const DEFAULT_RATE_LIMIT = { limit: 120, windowMs: 60_000 };

export function generateAgentTokenSecret() {
  return `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export function hashAgentToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getAgentTokenPrefix(token: string) {
  return token.slice(0, 18);
}

export function hasAgentScopes(actual: string[], required: AgentScope[]) {
  return required.every((scope) => actual.includes(scope));
}

export function safeCompareTokenHash(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const [type, token] = authHeader.split(/\s+/, 2);
  return type?.toLowerCase() === 'bearer' && token ? token : null;
}

function requestIp(request?: Request) {
  if (!request) return null;
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip');
}

export async function writeAgentAuditLog(input: AgentAuditInput) {
  const context = input.context ?? null;
  await prisma.agentAuditLog.create({
    data: {
      orgId: input.orgId ?? context?.orgId ?? null,
      siteId: input.siteId ?? context?.siteId ?? null,
      tokenId: context?.tokenId ?? null,
      action: input.action,
      outcome: input.outcome,
      toolName: input.toolName ?? null,
      scopes: input.scopes ?? context?.scopes ?? [],
      ipAddress: requestIp(input.request),
      userAgent: input.request?.headers.get('user-agent') ?? null,
      metadata: input.metadata ?? {},
    },
  });
}

export async function validateAgentBearerToken(
  bearerToken: string | undefined | null,
  request?: Request
): Promise<AgentAuthContext | null> {
  if (!bearerToken) return null;

  const tokenHash = hashAgentToken(bearerToken);
  const token = await prisma.agentToken.findUnique({
    where: { tokenHash },
  });

  if (!token || !safeCompareTokenHash(token.tokenHash, tokenHash)) {
    await writeAgentAuditLog({
      action: 'agent.auth',
      outcome: 'failure',
      scopes: [],
      metadata: { reason: 'invalid_token' },
      request,
    });
    return null;
  }

  const context: AgentAuthContext = {
    tokenId: token.id,
    orgId: token.orgId,
    siteId: token.siteId,
    role: token.role,
    scopes: token.scopes as AgentScope[],
  };

  const now = new Date();
  if (token.revokedAt || (token.expiresAt && token.expiresAt <= now)) {
    await writeAgentAuditLog({
      context,
      action: 'agent.auth',
      outcome: 'failure',
      metadata: { reason: token.revokedAt ? 'revoked_token' : 'expired_token' },
      request,
    });
    return null;
  }

  const rateLimit = checkRateLimit(
    `agent:${context.tokenId}`,
    DEFAULT_RATE_LIMIT
  );
  if (!rateLimit.allowed) {
    await writeAgentAuditLog({
      context,
      action: 'agent.rate_limit',
      outcome: 'failure',
      metadata: { resetAt: new Date(rateLimit.resetAt).toISOString() },
      request,
    });
    return null;
  }

  await prisma.agentToken.update({
    where: { id: token.id },
    data: { lastUsedAt: now },
  });

  return context;
}

export function agentContextToAuthInfo(
  context: AgentAuthContext,
  bearerToken: string
): AuthInfo {
  return {
    token: bearerToken,
    clientId: context.tokenId,
    scopes: context.scopes,
    extra: { ...context },
  };
}

export function getAgentContextFromAuthInfo(
  authInfo?: AuthInfo
): AgentAuthContext | null {
  const extra = authInfo?.extra;
  if (
    !extra ||
    typeof extra.tokenId !== 'string' ||
    typeof extra.orgId !== 'string' ||
    !Array.isArray(extra.scopes)
  ) {
    return null;
  }
  const role: AgentAuthContext['role'] =
    extra.role === 'owner' || extra.role === 'admin' || extra.role === 'viewer'
      ? extra.role
      : 'viewer';

  return {
    tokenId: extra.tokenId,
    orgId: extra.orgId,
    siteId: typeof extra.siteId === 'string' ? extra.siteId : null,
    role,
    scopes: extra.scopes as AgentScope[],
  };
}

export async function requireAgentSiteAccess(
  context: AgentAuthContext,
  siteId: string,
  requiredScopes: AgentScope[],
  request?: Request
) {
  if (!hasAgentScopes(context.scopes, requiredScopes)) {
    await writeAgentAuditLog({
      context,
      action: 'agent.scope_denied',
      outcome: 'failure',
      siteId,
      scopes: requiredScopes,
      metadata: { tokenScopes: context.scopes },
      request,
    });
    throw new Error('Insufficient agent token scope');
  }

  if (context.siteId && context.siteId !== siteId) {
    await writeAgentAuditLog({
      context,
      action: 'agent.site_denied',
      outcome: 'failure',
      siteId,
      metadata: { allowedSiteId: context.siteId },
      request,
    });
    throw new Error('Agent token is not allowed to access this site');
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, orgId: true, name: true, domain: true },
  });

  if (!site || site.orgId !== context.orgId) {
    await writeAgentAuditLog({
      context,
      action: 'agent.site_denied',
      outcome: 'failure',
      siteId,
      metadata: { reason: 'site_not_in_org' },
      request,
    });
    throw new Error('Agent token is not allowed to access this site');
  }

  return site;
}

export async function authenticateAgentRequest(
  request: Request,
  requiredScopes: AgentScope[],
  siteId?: string
) {
  const bearerToken = getBearerToken(request);
  const context = await validateAgentBearerToken(bearerToken, request);
  if (!context) {
    return {
      response: NextJsonError('Unauthorized', 401),
      context: null,
    };
  }

  try {
    if (siteId) {
      await requireAgentSiteAccess(context, siteId, requiredScopes, request);
    } else if (!hasAgentScopes(context.scopes, requiredScopes)) {
      await writeAgentAuditLog({
        context,
        action: 'agent.scope_denied',
        outcome: 'failure',
        scopes: requiredScopes,
        request,
      });
      return {
        response: NextJsonError('Forbidden', 403),
        context: null,
      };
    }
  } catch (error) {
    return {
      response: NextJsonError(
        error instanceof Error ? error.message : 'Forbidden',
        403
      ),
      context: null,
    };
  }

  return { response: null, context };
}

function NextJsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate':
        status === 401
          ? 'Bearer realm="Pulse Agent API"'
          : 'Bearer error="insufficient_scope"',
    },
  });
}
