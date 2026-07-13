'use client';

import { useSearchParams } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AIChatPanel } from './AIChatPanel';

interface DashboardSite { id: string; name: string; domain: string }

export function DashboardShell({
  children,
  orgName,
  orgId,
  sites,
}: {
  children: React.ReactNode;
  orgName: string;
  orgId: string;
  sites: DashboardSite[];
}) {
  const searchParams = useSearchParams();
  const requestedSiteId = searchParams.get('siteId');
  const selectedSite = sites.find((site) => site.id === requestedSiteId) ?? sites[0];
  return (
    <div className="pulse-dashboard-layout">
      <Sidebar
        orgName={orgName}
        siteName={selectedSite?.name ?? selectedSite?.domain ?? ''}
        orgId={orgId}
        sites={sites}
      />
      <main className="dashboard-main">{children}</main>
      <AIChatPanel siteId={selectedSite?.id ?? ''} />
    </div>
  );
}
