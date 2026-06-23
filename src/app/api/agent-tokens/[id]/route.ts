import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeAgentAuditLog } from '@/lib/agent-auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const token = await prisma.agentToken.findUnique({
      where: { id },
      select: { id: true, orgId: true, siteId: true, tokenPrefix: true },
    });

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const membership = await verifyOrgAccess(session.user.id, token.orgId, [
      'owner',
      'admin',
    ]);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.agentToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    await writeAgentAuditLog({
      orgId: token.orgId,
      siteId: token.siteId,
      action: 'agent_token.revoke',
      outcome: 'success',
      metadata: { tokenId: token.id, tokenPrefix: token.tokenPrefix },
      request,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
