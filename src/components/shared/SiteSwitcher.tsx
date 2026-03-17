'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@velocityuikit/velocityui';

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface SiteSwitcherProps {
  sites: Site[];
  currentSiteId: string;
}

export function SiteSwitcher({ sites, currentSiteId }: SiteSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSiteId = e.target.value;
    if (!newSiteId) return;

    const pathname = window.location.pathname;
    const params = new URLSearchParams(searchParams.toString());
    params.set('siteId', newSiteId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      value={currentSiteId}
      onChange={handleChange}
      options={sites.map((site) => ({
        value: site.id,
        label: site.name || site.domain,
      }))}
      size="sm"
      fullWidth
      style={{
        backgroundColor: 'var(--pulse-bg-card)',
        border: '1px solid var(--pulse-border)',
        color: 'var(--pulse-text-primary)',
      }}
    />
  );
}
