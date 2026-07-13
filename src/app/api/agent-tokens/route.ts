import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  DEFAULT_AGENT_SCOPES,
  agentScopesSchema,
  generateAgentTokenSecret,
  getAgentTokenPrefix,
  hashAgentToken,
  writeAgentAuditLog,
} from '@/lib/agent-auth';
import { prisma } from '@/lib/prisma';
import { verifyOrgAccess } from '@/lib/site-access';
import { z } from 'zod';

const createAgentTokenSchema = z.object({
  orgId: z.string().uuid(),
  siteId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(120),
  scopes: agentScopesSchema.optional().default([...DEFAULT_AGENT_SCOPES]),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const orgId =
      url.searchParams.get('orgId') ??
      ((session as unknown as { user?: { activeOrgId?: string } }).user?.activeOrgId || null);
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const membership = await verifyOrgAccess(session.user.id, orgId, ['owner', 'admin']);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tokens = await prisma.agentToken.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        site: { select: { id: true, name: true, domain: true } },
        project: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      tokens.map((token) => ({
        id: token.id,
        orgId: token.orgId,
        site: token.site,
        project: token.project,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        scopes: token.scopes,
        role: token.role,
        expiresAt: token.expiresAt?.toISOString() ?? null,
        revokedAt: token.revokedAt?.toISOString() ?? null,
        lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
        createdAt: token.createdAt.toISOString(),
        createdBy: token.createdBy,
      }))
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createAgentTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { orgId, siteId, projectId, name, scopes, expiresAt } = parsed.data;
    const membership = await verifyOrgAccess(session.user.id, orgId, ['owner', 'admin']);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (siteId) {
      const site = await prisma.site.findUnique({
        where: { id: siteId },
        select: { orgId: true },
      });
      if (!site || site.orgId !== orgId) {
        return NextResponse.json(
          { error: 'Site does not belong to this organization' },
          { status: 400 }
        );
      }
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { orgId: true } });
      if (!project || project.orgId !== orgId) {
        return NextResponse.json({ error: 'Project does not belong to this organization' }, { status: 400 });
      }
    }

    if (siteId && projectId) {
      const site = await prisma.site.findUnique({ where: { id: siteId }, select: { service: { select: { environment: { select: { projectId: true } } } } } });
      if (site?.service?.environment.projectId !== projectId) {
        return NextResponse.json({ error: 'Site does not belong to this project' }, { status: 400 });
      }
    }

    const rawToken = generateAgentTokenSecret();
    const token = await prisma.agentToken.create({
      data: {
        orgId,
        siteId: siteId ?? null,
        projectId: projectId ?? null,
        name,
        tokenHash: hashAgentToken(rawToken),
        tokenPrefix: getAgentTokenPrefix(rawToken),
        scopes,
        role: 'viewer',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: session.user.id,
      },
      include: {
        site: { select: { id: true, name: true, domain: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
    });

    await writeAgentAuditLog({
      orgId,
      action: 'agent_token.create',
      outcome: 'success',
      siteId: siteId ?? null,
      projectId: projectId ?? null,
      scopes,
      metadata: { tokenId: token.id, tokenPrefix: token.tokenPrefix },
      request,
    });

    return NextResponse.json(
      {
        id: token.id,
        orgId: token.orgId,
        site: token.site,
        project: token.project,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        scopes: token.scopes,
        role: token.role,
        expiresAt: token.expiresAt?.toISOString() ?? null,
        revokedAt: null,
        lastUsedAt: null,
        createdAt: token.createdAt.toISOString(),
        token: rawToken,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
