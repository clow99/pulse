'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Alert, Badge, Button, Card, Input, Title } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import type { SessionUser, SiteWithStats } from '@/types';

const REPORT_OPTIONS = [
  'overview',
  'acquisition',
  'ai_sources',
  'revenue',
  'funnels',
  'performance',
  'insights',
  'uptime_summary',
];

interface ShareLinkItem {
  id: string;
  name: string;
  token: string;
  url: string;
  reports: string[];
  revokedAt: string | null;
  createdAt: string;
  site: { id: string; name: string; domain: string };
}

interface ScheduledReportItem {
  id: string;
  name: string;
  reports: string[];
  frequency: string;
  channelType: string;
  target: string;
  enabled: boolean;
  nextRunAt: string | null;
  site: { id: string; name: string; domain: string };
}

export default function ReportSettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const orgId = user?.activeOrgId ?? '';

  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLinkItem[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReportItem[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [shareName, setShareName] = useState('Client dashboard');
  const [scheduleName, setScheduleName] = useState('Weekly Pulse summary');
  const [scheduleTarget, setScheduleTarget] = useState('');
  const [scheduleChannelType, setScheduleChannelType] = useState<'email' | 'webhook'>('email');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedReports, setSelectedReports] = useState<string[]>(['overview', 'acquisition', 'ai_sources', 'revenue', 'uptime_summary']);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? sites[0],
    [selectedSiteId, sites]
  );

  const loadData = useCallback(async () => {
    if (!orgId) return;
    const [sitesRes, linksRes, scheduledRes] = await Promise.all([
      fetch('/api/sites'),
      fetch(`/api/share-links?orgId=${orgId}`),
      fetch(`/api/scheduled-reports?orgId=${orgId}`),
    ]);
    if (sitesRes.ok) {
      const data = await sitesRes.json();
      if (Array.isArray(data)) {
        setSites(data);
        setSelectedSiteId((current) => current || data[0]?.id || '');
      }
    }
    if (linksRes.ok) setShareLinks(await linksRes.json());
    if (scheduledRes.ok) setScheduledReports(await scheduledRes.json());
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleReport(report: string) {
    setSelectedReports((current) =>
      current.includes(report)
        ? current.filter((item) => item !== report)
        : [...current, report]
    );
  }

  async function createShareLink() {
    if (!orgId || !selectedSite?.id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, siteId: selectedSite.id, name: shareName, reports: selectedReports }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create share link');
        return;
      }
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function createScheduledReport() {
    if (!orgId || !selectedSite?.id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/scheduled-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          siteId: selectedSite.id,
          name: scheduleName,
          reports: selectedReports,
          frequency,
          channelType: scheduleChannelType,
          target: scheduleTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create scheduled report');
        return;
      }
      setScheduleTarget('');
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function revokeShareLink(id: string) {
    await fetch(`/api/share-links/${id}`, { method: 'DELETE' });
    await loadData();
  }

  async function toggleScheduledReport(report: ScheduledReportItem) {
    await fetch(`/api/scheduled-reports/${report.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !report.enabled }),
    });
    await loadData();
  }

  function copyUrl(url: string) {
    const absolute = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(absolute);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <div>
            <Title level="h1" size="lg">Report Sharing</Title>
            <p className="pulse-page-subtitle">
              Create read-only dashboard links, JSON/CSV exports, and scheduled report definitions.
            </p>
          </div>
        </div>

        {error && <Alert variant="danger" style={{ marginBottom: '1rem' }}>{error}</Alert>}

        <div className="pulse-settings-grid">
          <Card variant="shadow">
            <Card.Header><Title level="h3" size="sm">Report Bundle</Title></Card.Header>
            <Card.Body>
              <div className="pulse-form-stack">
                <label className="pulse-label">
                  Site
                  <select className="pulse-select" value={selectedSite?.id || ''} onChange={(e) => setSelectedSiteId(e.target.value)}>
                    {sites.map((site) => <option key={site.id} value={site.id}>{site.name || site.domain}</option>)}
                  </select>
                </label>
                <div className="pulse-report-toggle-grid">
                  {REPORT_OPTIONS.map((report) => (
                    <button
                      key={report}
                      type="button"
                      className={`pulse-report-toggle${selectedReports.includes(report) ? ' active' : ''}`}
                      onClick={() => toggleReport(report)}
                    >
                      {report.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card variant="shadow">
            <Card.Header><Title level="h3" size="sm">Create Share Link</Title></Card.Header>
            <Card.Body>
              <div className="pulse-form-stack">
                <Input label="Name" value={shareName} onChange={(event) => setShareName(event.target.value)} fullWidth />
                <Button variant="primary" onClick={createShareLink} loading={saving}>Create Share Link</Button>
              </div>
            </Card.Body>
          </Card>

          <Card variant="shadow">
            <Card.Header><Title level="h3" size="sm">Schedule Summary</Title></Card.Header>
            <Card.Body>
              <div className="pulse-form-stack">
                <Input label="Name" value={scheduleName} onChange={(event) => setScheduleName(event.target.value)} fullWidth />
                <select className="pulse-select" value={frequency} onChange={(event) => setFrequency(event.target.value as 'daily' | 'weekly' | 'monthly')}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <select className="pulse-select" value={scheduleChannelType} onChange={(event) => setScheduleChannelType(event.target.value as 'email' | 'webhook')}>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
                <Input
                  label={scheduleChannelType === 'email' ? 'Email address' : 'Webhook URL'}
                  value={scheduleTarget}
                  onChange={(event) => setScheduleTarget(event.target.value)}
                  fullWidth
                />
                <Button variant="primary" onClick={createScheduledReport} loading={saving}>Schedule Report</Button>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="pulse-section">
          <Title level="h3" size="sm">Share Links</Title>
          <div className="pulse-card-list" style={{ marginTop: '1rem' }}>
            {shareLinks.length === 0 ? <div className="pulse-empty-state">No share links yet.</div> : shareLinks.map((link) => (
              <div key={link.id} className="pulse-list-row">
                <span className="pulse-list-row-main">
                  <span className="pulse-list-row-title">{link.name}</span>
                  <Badge size="sm" variant={link.revokedAt ? 'default' : 'success'}>{link.revokedAt ? 'Revoked' : 'Active'}</Badge>
                </span>
                <span className="pulse-list-row-meta">{link.site.name || link.site.domain} · {link.reports.join(', ')}</span>
                <div className="pulse-table-actions">
                  <Button variant="secondary" size="sm" onClick={() => copyUrl(link.url)}>{copied === link.url ? 'Copied' : 'Copy URL'}</Button>
                  {!link.revokedAt && <Button variant="danger" size="sm" onClick={() => revokeShareLink(link.id)}>Revoke</Button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pulse-section">
          <Title level="h3" size="sm">Scheduled Reports</Title>
          <div className="pulse-card-list" style={{ marginTop: '1rem' }}>
            {scheduledReports.length === 0 ? <div className="pulse-empty-state">No scheduled reports yet.</div> : scheduledReports.map((report) => (
              <div key={report.id} className="pulse-list-row">
                <span className="pulse-list-row-main">
                  <span className="pulse-list-row-title">{report.name}</span>
                  <Badge size="sm" variant={report.enabled ? 'success' : 'default'}>{report.enabled ? 'Enabled' : 'Paused'}</Badge>
                </span>
                <span className="pulse-list-row-meta">
                  {report.frequency} {report.channelType} to {report.target} · next {report.nextRunAt ? new Date(report.nextRunAt).toLocaleDateString() : 'not scheduled'}
                </span>
                <Button variant="secondary" size="sm" onClick={() => toggleScheduledReport(report)}>
                  {report.enabled ? 'Pause' : 'Enable'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
