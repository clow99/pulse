import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deploymentSchema } from '@/lib/validation';
import { getBearerToken, requireAgentProjectAccess, validateAgentBearerToken, writeAgentAuditLog } from '@/lib/agent-auth';
import type { Prisma } from '@prisma/client';

interface Context { params: Promise<{ projectId: string }> }

export async function POST(request: Request, context: Context) {
  const { projectId } = await context.params;
  const agent = await validateAgentBearerToken(getBearerToken(request), request);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAgentProjectAccess(agent, projectId, ['deployments:write'], request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Forbidden' }, { status: 403 });
  }
  const parsed = deploymentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid deployment' }, { status: 400 });
  const environment = await prisma.environment.findUnique({ where: { id: parsed.data.environmentId }, select: { projectId: true } });
  if (!environment || environment.projectId !== projectId) return NextResponse.json({ error: 'Environment does not belong to this project' }, { status: 400 });
  if (parsed.data.serviceId) {
    const service = await prisma.service.findUnique({ where: { id: parsed.data.serviceId }, select: { environmentId: true } });
    if (!service || service.environmentId !== parsed.data.environmentId) return NextResponse.json({ error: 'Service does not belong to this environment' }, { status: 400 });
  }
  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      environmentId: parsed.data.environmentId,
      serviceId: parsed.data.serviceId ?? null,
      commitSha: parsed.data.commitSha ?? null,
      version: parsed.data.version ?? null,
      status: parsed.data.status,
      source: parsed.data.source,
      url: parsed.data.url ?? null,
      deployedAt: parsed.data.deployedAt ? new Date(parsed.data.deployedAt) : new Date(),
      metadata: parsed.data.metadata as Prisma.InputJsonValue,
    },
  });
  await writeAgentAuditLog({ context: agent, projectId, action: 'deployment.create', outcome: 'success', scopes: ['deployments:write'], metadata: { deploymentId: deployment.id }, request });
  return NextResponse.json(deployment, { status: 201 });
}
