import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  generateAgentTokenSecret,
  getAgentTokenPrefix,
  hashAgentToken,
  writeAgentAuditLog,
} from '@/lib/agent-auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.agentToken.findUnique({
      where: { id },
      select: { id: true, orgId: true, siteId: true, tokenPrefix: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const membership = await verifyOrgAccess(session.user.id, existing.orgId, [
      'owner',
      'admin',
    ]);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawToken = generateAgentTokenSecret();
    const updated = await prisma.agentToken.update({
      where: { id },
      data: {
        tokenHash: hashAgentToken(rawToken),
        tokenPrefix: getAgentTokenPrefix(rawToken),
        revokedAt: null,
        lastUsedAt: null,
      },
    });

    await writeAgentAuditLog({
      orgId: existing.orgId,
      siteId: existing.siteId,
      action: 'agent_token.rotate',
      outcome: 'success',
      metadata: {
        tokenId: existing.id,
        previousTokenPrefix: existing.tokenPrefix,
        tokenPrefix: updated.tokenPrefix,
      },
      request,
    });

    return NextResponse.json({
      id: updated.id,
      tokenPrefix: updated.tokenPrefix,
      token: rawToken,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
