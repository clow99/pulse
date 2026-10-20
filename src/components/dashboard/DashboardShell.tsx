'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, useContext } from 'react';
import { Sidebar } from './Sidebar';
import { AIChatPanel } from './AIChatPanel';

interface DashboardSite {
  id: string;
  name: string;
  domain: string;
}

const DashboardContext = createContext<{
  sites: DashboardSite[];
  orgName: string;
}>({ sites: [], orgName: '' });
export const useDashboard = () => useContext(DashboardContext);

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
  const selectedSite =
    sites.find((site) => site.id === requestedSiteId) ?? sites[0];
  return (
    <DashboardContext.Provider value={{ sites, orgName }}>
      <div className="pulse-dashboard-layout">
        <a className="pulse-dashboard-skip" href="#dashboard-content">
          Skip to content
        </a>
        <Sidebar
          orgName={orgName}
          siteName={selectedSite?.name ?? selectedSite?.domain ?? ''}
          orgId={orgId}
          sites={sites}
        />
        <main id="dashboard-content" className="dashboard-main" tabIndex={-1}>
          {children}
        </main>
        <AIChatPanel siteId={selectedSite?.id ?? ''} />
      </div>
    </DashboardContext.Provider>
  );
}
