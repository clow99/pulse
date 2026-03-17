import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AIChatPanel } from '@/components/dashboard/AIChatPanel';
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
  const defaultSite = sites[0];

  return (
    <div className="pulse-dashboard-layout">
      <Sidebar
        orgName={org.name}
        siteName={defaultSite?.name ?? defaultSite?.domain ?? ''}
        orgId={org.id}
        sites={sites.map((s) => ({ id: s.id, name: s.name, domain: s.domain }))}
      />
      <main className="dashboard-main">
        {children}
      </main>
      <AIChatPanel siteId={defaultSite?.id ?? ''} />
    </div>
  );
}
