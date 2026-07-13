import type { OrgRole } from '@prisma/client';
import { prisma } from './prisma';

async function membership(userId: string, orgId: string, roles?: OrgRole[]) {
  const result = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!result || (roles && !roles.includes(result.role))) return null;
  return result;
}

export async function verifyProjectAccess(userId: string, projectId: string, roles?: OrgRole[]) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  const access = await membership(userId, project.orgId, roles);
  return access ? { project, membership: access } : null;
}

export async function verifyEnvironmentAccess(userId: string, environmentId: string, roles?: OrgRole[]) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { project: true },
  });
  if (!environment) return null;
  const access = await membership(userId, environment.project.orgId, roles);
  return access ? { environment, project: environment.project, membership: access } : null;
}

export async function verifyServiceAccess(userId: string, serviceId: string, roles?: OrgRole[]) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { environment: { include: { project: true } } },
  });
  if (!service) return null;
  const access = await membership(userId, service.environment.project.orgId, roles);
  return access ? {
    service,
    environment: service.environment,
    project: service.environment.project,
    membership: access,
  } : null;
}

export async function verifyMonitorAccess(userId: string, monitorId: string, roles?: OrgRole[]) {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: { service: { include: { environment: { include: { project: true } } } } },
  });
  if (!monitor) return null;
  const project = monitor.service.environment.project;
  const access = await membership(userId, project.orgId, roles);
  return access ? { monitor, service: monitor.service, project, membership: access } : null;
}
