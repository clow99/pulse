import type { OrgRole } from '@prisma/client';
import { prisma } from './prisma';

export async function verifySiteAccess(
  userId: string,
  siteId: string,
  roles?: OrgRole[]
) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { org: { select: { id: true, name: true, slug: true } } },
  });
  if (!site) return null;

  const membership = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId: site.orgId } },
  });
  if (!membership) return null;
  if (roles && !roles.includes(membership.role)) return null;

  return { site, membership };
}

export async function verifyOrgAccess(
  userId: string,
  orgId: string,
  roles?: OrgRole[]
) {
  const membership = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    include: { org: true },
  });
  if (!membership) return null;
  if (roles && !roles.includes(membership.role)) return null;
  return membership;
}
