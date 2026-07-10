'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Alert, Button, Card, Input, Title, Badge } from '@velocityuikit/velocityui';
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

interface NotificationStatus {
  emailConfigured: boolean;
  missingEmailEnv: string[];
  smtpAuthConfigured: boolean;
  uptimeCheckSecretConfigured: boolean;
  insightsCronSecretConfigured: boolean;
  scheduledReportSecretConfigured: boolean;
}

export default function MonitoringSettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const orgId = user?.activeOrgId ?? '';

  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [statusPages, setStatusPages] = useState<StatusPageRecord[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [channelType, setChannelType] = useState<'email' | 'webhook'>('email');
  const [channelName, setChannelName] = useState('');
  const [channelTarget, setChannelTarget] = useState('');
  const [statusName, setStatusName] = useState('');
  const [statusSlug, setStatusSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, string>>({});

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0],
    [selectedSiteId, sites]
  );

  const loadData = useCallback(async () => {
    if (!orgId) return;
    const [sitesRes, channelsRes, statusPagesRes, notificationStatusRes] = await Promise.all([
      fetch('/api/sites'),
      fetch(`/api/notification-channels?orgId=${orgId}`),
      fetch(`/api/status-pages?orgId=${orgId}`),
      fetch('/api/notifications/status'),
    ]);
    if (sitesRes.ok) {
      const nextSites = await sitesRes.json();
      setSites(nextSites);
      setSelectedSiteId((current) => current || nextSites[0]?.id || '');
    }
    if (channelsRes.ok) setChannels(await channelsRes.json());
    if (statusPagesRes.ok) setStatusPages(await statusPagesRes.json());
    if (notificationStatusRes.ok) setNotificationStatus(await notificationStatusRes.json());
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

  async function testChannel(channelId: string) {
    setTestStatus((current) => ({ ...current, [channelId]: 'Sending...' }));
    const res = await fetch(`/api/notification-channels/${channelId}/test`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setTestStatus((current) => ({
      ...current,
      [channelId]: res.ok ? 'Test sent' : data.error || 'Test failed',
    }));
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
              {notificationStatus && !notificationStatus.emailConfigured && (
                <Alert variant="warning" style={{ marginBottom: '1rem' }}>
                  Email delivery is not configured. Missing {notificationStatus.missingEmailEnv.join(', ')}.
                </Alert>
              )}
              <div className="pulse-form-grid" style={{ marginBottom: '1rem' }}>
                <select className="pulse-select" value={channelType} onChange={(e) => setChannelType(e.target.value as 'email' | 'webhook')}>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
                <Input placeholder="Name" value={channelName} onChange={(e) => setChannelName(e.target.value)} size="sm" />
                <Input placeholder={channelType === 'email' ? 'alerts@example.com' : 'https://example.com/webhook'} value={channelTarget} onChange={(e) => setChannelTarget(e.target.value)} size="sm" />
                <Button variant="primary" size="sm" onClick={createChannel} loading={saving}>Add Channel</Button>
              </div>
              {channels.length === 0 ? (
                <div className="pulse-empty-state">No notification channels yet.</div>
              ) : (
                <div className="pulse-card-list">
                  {channels.map((channel) => (
                    <div key={channel.id} className="pulse-list-row">
                      <span className="pulse-list-row-main">
                        <span className="pulse-list-row-title">{channel.name}</span>
                        <Badge size="sm" variant="info">{channel.type}</Badge>
                        {!channel.enabled && <Badge size="sm" variant="default">Disabled</Badge>}
                      </span>
                      <span className="pulse-list-row-meta">{channel.target}</span>
                      <Button variant="secondary" size="sm" onClick={() => testChannel(channel.id)}>
                        {testStatus[channel.id] || 'Send Test'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          <Card variant="shadow">
            <Card.Header>
              <Title level="h3" size="sm">Automation Readiness</Title>
            </Card.Header>
            <Card.Body>
              <p className="pulse-page-subtitle" style={{ marginBottom: '1rem' }}>
                Self-hosted installs can call the cron endpoints directly. Managed Pulse can use the same readiness checks to run hosted schedules.
              </p>
              <div className="pulse-card-list">
                <div className="pulse-list-row">
                  <span>Uptime check secret</span>
                  <Badge size="sm" variant={notificationStatus?.uptimeCheckSecretConfigured ? 'success' : 'warning'}>
                    {notificationStatus?.uptimeCheckSecretConfigured ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
                <div className="pulse-list-row">
                  <span>Insight cron secret</span>
                  <Badge size="sm" variant={notificationStatus?.insightsCronSecretConfigured ? 'success' : 'warning'}>
                    {notificationStatus?.insightsCronSecretConfigured ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
                <div className="pulse-list-row">
                  <span>Scheduled report secret</span>
                  <Badge size="sm" variant={notificationStatus?.scheduledReportSecretConfigured ? 'success' : 'warning'}>
                    {notificationStatus?.scheduledReportSecretConfigured ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
                <div className="pulse-list-row">
                  <span>SMTP transport</span>
                  <Badge size="sm" variant={notificationStatus?.emailConfigured ? 'success' : 'warning'}>
                    {notificationStatus?.emailConfigured ? 'Configured' : 'Missing'}
                  </Badge>
                </div>
                <div className="pulse-list-row">
                  <span>SMTP authentication</span>
                  <Badge size="sm" variant={notificationStatus?.smtpAuthConfigured ? 'success' : 'default'}>
                    {notificationStatus?.smtpAuthConfigured ? 'Configured' : 'Not set'}
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card variant="shadow">
            <Card.Header>
              <Title level="h3" size="sm">Uptime Alert Rules</Title>
            </Card.Header>
            <Card.Body>
              <div className="pulse-toolbar">
                <span style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>Site</span>
                <select className="pulse-select" value={selectedSite?.id || ''} onChange={(e) => setSelectedSiteId(e.target.value)} style={{ maxWidth: 320 }}>
                  {sites.map((site) => <option key={site.id} value={site.id}>{site.name || site.domain}</option>)}
                </select>
              </div>
              {rules.length === 0 ? (
                <div className="pulse-empty-state" style={{ marginBottom: '1rem' }}>
                  No alert rules for this site.
                </div>
              ) : (
                <div className="pulse-card-list" style={{ marginBottom: '1rem' }}>
                  {rules.map((rule) => (
                    <div key={rule.id} className="pulse-list-row">
                      <span>
                        Notify {rule.notificationChannel.name} after {rule.consecutiveFailures} failures; recover after {rule.recoveryChecks} success.
                      </span>
                      <Badge size="sm" variant={rule.enabled ? 'success' : 'default'}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="pulse-toolbar" style={{ marginBottom: 0 }}>
                {channels.map((channel) => (
                  <Button key={channel.id} variant="secondary" size="sm" onClick={() => createRule(channel.id)} disabled={saving}>
                    Add rule for {channel.name}
                  </Button>
                ))}
                {channels.length === 0 && (
                  <span className="pulse-list-row-meta">Create a notification channel before adding rules.</span>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card variant="shadow">
            <Card.Header>
              <Title level="h3" size="sm">Public Status Pages</Title>
            </Card.Header>
            <Card.Body>
              <div className="pulse-form-grid" style={{ marginBottom: '1rem' }}>
                <Input placeholder="Status page name" value={statusName} onChange={(e) => setStatusName(e.target.value)} size="sm" />
                <Input placeholder="status-slug" value={statusSlug} onChange={(e) => setStatusSlug(e.target.value)} size="sm" />
                <Button variant="primary" size="sm" onClick={createStatusPage} loading={saving}>Create Status Page</Button>
              </div>
              {statusPages.length === 0 ? (
                <div className="pulse-empty-state">No public status pages yet.</div>
              ) : (
                <div className="pulse-card-list">
                  {statusPages.map((page) => (
                    <div key={page.id} className="pulse-list-row">
                      <span className="pulse-list-row-main">
                        <span className="pulse-list-row-title">{page.name}</span>
                        <Badge size="sm" variant={page.enabled ? 'success' : 'default'}>{page.enabled ? 'Public' : 'Disabled'}</Badge>
                      </span>
                      <a href={`/status/${page.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pulse-accent)' }}>
                        /status/{page.slug}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
