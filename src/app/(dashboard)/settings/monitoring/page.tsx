'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button, Card, Input, Title, Badge } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import type { SessionUser, SiteWithStats } from '@/types';

interface Channel {
  id: string;
  type: 'email' | 'webhook';
  name: string;
  target: string;
  enabled: boolean;
}

interface AlertRule {
  id: string;
  enabled: boolean;
  consecutiveFailures: number;
  recoveryChecks: number;
  notificationChannel: Channel;
}

interface StatusPageRecord {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  components: { id: string; name: string; site: { domain: string } }[];
}

export default function MonitoringSettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const orgId = user?.activeOrgId ?? '';

  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [statusPages, setStatusPages] = useState<StatusPageRecord[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [channelType, setChannelType] = useState<'email' | 'webhook'>('email');
  const [channelName, setChannelName] = useState('');
  const [channelTarget, setChannelTarget] = useState('');
  const [statusName, setStatusName] = useState('');
  const [statusSlug, setStatusSlug] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0],
    [selectedSiteId, sites]
  );

  const loadData = useCallback(async () => {
    if (!orgId) return;
    const [sitesRes, channelsRes, statusPagesRes] = await Promise.all([
      fetch('/api/sites'),
      fetch(`/api/notification-channels?orgId=${orgId}`),
      fetch(`/api/status-pages?orgId=${orgId}`),
    ]);
    if (sitesRes.ok) {
      const nextSites = await sitesRes.json();
      setSites(nextSites);
      setSelectedSiteId((current) => current || nextSites[0]?.id || '');
    }
    if (channelsRes.ok) setChannels(await channelsRes.json());
    if (statusPagesRes.ok) setStatusPages(await statusPagesRes.json());
  }, [orgId]);

  const loadRules = useCallback(async () => {
    if (!selectedSite?.id) return;
    const res = await fetch(`/api/alert-rules?siteId=${selectedSite.id}`);
    if (res.ok) setRules(await res.json());
  }, [selectedSite?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  async function createChannel() {
    if (!orgId || !channelName || !channelTarget) return;
    setSaving(true);
    try {
      const res = await fetch('/api/notification-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, type: channelType, name: channelName, target: channelTarget }),
      });
      if (res.ok) {
        setChannelName('');
        setChannelTarget('');
        loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  async function createRule(channelId: string) {
    if (!selectedSite?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSite.id,
          notificationChannelId: channelId,
          consecutiveFailures: 2,
          recoveryChecks: 1,
        }),
      });
      if (res.ok) loadRules();
    } finally {
      setSaving(false);
    }
  }

  async function createStatusPage() {
    if (!orgId || !statusName || !statusSlug || sites.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/status-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          name: statusName,
          slug: statusSlug,
          components: sites.map((site) => ({ siteId: site.id, name: site.name || site.domain })),
        }),
      });
      if (res.ok) {
        setStatusName('');
        setStatusSlug('');
        loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">Monitoring Settings</Title>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <Card variant="shadow">
            <Card.Header>
              <Title level="h3" size="sm">Notification Channels</Title>
            </Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <select value={channelType} onChange={(e) => setChannelType(e.target.value as 'email' | 'webhook')} style={{ padding: '0.5rem', borderRadius: 6 }}>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
                <Input placeholder="Name" value={channelName} onChange={(e) => setChannelName(e.target.value)} size="sm" />
                <Input placeholder={channelType === 'email' ? 'alerts@example.com' : 'https://example.com/webhook'} value={channelTarget} onChange={(e) => setChannelTarget(e.target.value)} size="sm" style={{ minWidth: 280 }} />
                <Button variant="primary" size="sm" onClick={createChannel} loading={saving}>Add Channel</Button>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {channels.map((channel) => (
                  <div key={channel.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem', border: '1px solid var(--pulse-border)', borderRadius: 8 }}>
                    <span>{channel.name} <Badge size="sm" variant="info">{channel.type}</Badge></span>
                    <span style={{ color: 'var(--pulse-text-secondary)' }}>{channel.target}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card variant="shadow">
            <Card.Header>
              <Title level="h3" size="sm">Uptime Alert Rules</Title>
            </Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>Site</span>
                <select value={selectedSite?.id || ''} onChange={(e) => setSelectedSiteId(e.target.value)} style={{ padding: '0.5rem', borderRadius: 6 }}>
                  {sites.map((site) => <option key={site.id} value={site.id}>{site.name || site.domain}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                {rules.map((rule) => (
                  <div key={rule.id} style={{ padding: '0.75rem', border: '1px solid var(--pulse-border)', borderRadius: 8 }}>
                    Notify {rule.notificationChannel.name} after {rule.consecutiveFailures} failures; recover after {rule.recoveryChecks} success.
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {channels.map((channel) => (
                  <Button key={channel.id} variant="secondary" size="sm" onClick={() => createRule(channel.id)} disabled={saving}>
                    Add rule for {channel.name}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card variant="shadow">
            <Card.Header>
              <Title level="h3" size="sm">Public Status Pages</Title>
            </Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <Input placeholder="Status page name" value={statusName} onChange={(e) => setStatusName(e.target.value)} size="sm" />
                <Input placeholder="status-slug" value={statusSlug} onChange={(e) => setStatusSlug(e.target.value)} size="sm" />
                <Button variant="primary" size="sm" onClick={createStatusPage} loading={saving}>Create Status Page</Button>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {statusPages.map((page) => (
                  <div key={page.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem', border: '1px solid var(--pulse-border)', borderRadius: 8 }}>
                    <span>{page.name} <Badge size="sm" variant={page.enabled ? 'success' : 'default'}>{page.enabled ? 'Public' : 'Disabled'}</Badge></span>
                    <a href={`/status/${page.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pulse-accent)' }}>
                      /status/{page.slug}
                    </a>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
