import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import type { SessionUser } from '@/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as SessionUser;
  const memberships = await prisma.orgMembership.findMany({
    where: { userId: user.id },
    include: {
      org: {
        include: { sites: { where: { active: true } } },
      },
    },
  });

  if (memberships.length === 0) {
    redirect('/onboarding');
  }

  const activeOrgId = user.activeOrgId ?? memberships[0].orgId;
  const membership = memberships.find((m) => m.orgId === activeOrgId) ?? memberships[0];
  const org = membership.org;
  const sites = org.sites;
  return (
    <DashboardShell
      orgName={org.name}
      orgId={org.id}
      sites={sites.map((s) => ({ id: s.id, name: s.name, domain: s.domain }))}
    >
      {children}
    </DashboardShell>
  );
}
