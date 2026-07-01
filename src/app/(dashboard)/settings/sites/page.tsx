'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Title,
  Button,
  Dialog,
  Input,
  Table,
  Badge,
  Switch,
  Alert,
} from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import { createSiteSchema } from '@/lib/validation';
import { buildTrackingSnippet } from '@/lib/tracking';
import type { SessionUser, SiteWithStats } from '@/types';

interface SetupCheck {
  snippet: string;
  hasData: boolean;
  recentData: boolean;
  domainMatch: boolean | null;
  tokenStatus: string;
  lastSeen: {
    type: string;
    at: string;
    hostname: string;
    pathname: string;
    name: string | null;
  } | null;
  troubleshooting: string[];
}

function ChecklistItem({ label, done, muted = false }: { label: string; done: boolean; muted?: boolean }) {
  const color = muted
    ? 'var(--pulse-text-secondary)'
    : done
      ? 'var(--pulse-success)'
      : 'var(--pulse-warning)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color }}>
      <span>{muted ? '-' : done ? 'OK' : '!'}</span>
      <span>{label}</span>
    </div>
  );
}

export default function SitesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user as SessionUser | undefined;

  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SiteWithStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteWithStats | null>(null);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [setupChecks, setSetupChecks] = useState<Record<string, SetupCheck>>({});
  const [setupLoadingId, setSetupLoadingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [editName, setEditName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editNameError, setEditNameError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const orgId = user?.activeOrgId;

  const closeAddDialog = useCallback(() => setAddDialogOpen(false), []);
  const closeEditDialog = useCallback(() => {
    setEditTarget(null);
    setEditName('');
    setEditError(null);
    setEditNameError(undefined);
  }, []);
  const closeDeleteDialog = useCallback(() => setDeleteTarget(null), []);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) {
        setSites(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  async function handleAddSite() {
    setError(null);
    setFieldErrors({});

    const parsed = createSiteSchema.safeParse({ name: newName, domain: newDomain });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = String(issue.path[0]);
        if (!errs[path]) errs[path] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, domain: newDomain, orgId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create site');
        return;
      }

      setAddDialogOpen(false);
      setNewName('');
      setNewDomain('');
      fetchSites();
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function openEditDialog(site: SiteWithStats) {
    setEditTarget(site);
    setEditName(site.name);
    setEditError(null);
    setEditNameError(undefined);
  }

  async function handleEditSite() {
    if (!editTarget) return;

    setEditError(null);
    setEditNameError(undefined);

    const parsedName = createSiteSchema.shape.name.safeParse(editName.trim());
    if (!parsedName.success) {
      setEditNameError(parsedName.error.issues[0]?.message || 'Name is invalid');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sites/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: parsedName.data }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || 'Failed to update site');
        return;
      }

      setSites((prev) =>
        prev.map((site) =>
          site.id === editTarget.id ? { ...site, name: data.name } : site
        )
      );
      closeEditDialog();
      router.refresh();
    } catch {
      setEditError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(site: SiteWithStats) {
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !site.active }),
      });

      if (res.ok) {
        setSites((prev) =>
          prev.map((s) => (s.id === site.id ? { ...s, active: !s.active } : s))
        );
        router.refresh();
      }
    } catch {
      // silently fail
    }
  }

  async function handleToggleWebVitals(site: SiteWithStats) {
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectWebVitals: !site.collectWebVitals }),
      });

      if (res.ok) {
        setSites((prev) =>
          prev.map((s) => (s.id === site.id ? { ...s, collectWebVitals: !s.collectWebVitals } : s))
        );
        setSetupChecks((prev) => {
          const next = { ...prev };
          delete next[site.id];
          return next;
        });
      }
    } catch {
      // silently fail
    }
  }

  async function fetchSetupCheck(siteId: string) {
    setSetupLoadingId(siteId);
    try {
      const res = await fetch(`/api/sites/${siteId}/setup-check`);
      if (res.ok) {
        const data = await res.json();
        setSetupChecks((prev) => ({ ...prev, [siteId]: data }));
      }
    } catch {
      // silently fail
    } finally {
      setSetupLoadingId(null);
    }
  }

  function toggleSetup(siteId: string) {
    const next = expandedSiteId === siteId ? null : siteId;
    setExpandedSiteId(next);
    if (next && !setupChecks[siteId]) {
      fetchSetupCheck(siteId);
    }
  }

  async function handleRegenerateToken(siteId: string) {
    try {
      const res = await fetch(`/api/sites/${siteId}/regenerate-token`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        setSites((prev) =>
          prev.map((s) => (s.id === siteId ? { ...s, token: data.token } : s))
        );
      }
    } catch {
      // silently fail
    }
  }

  async function handleDeleteSite() {
    if (!deleteTarget) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/sites/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSites((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopySnippet(site: SiteWithStats) {
    const snippet = setupChecks[site.id]?.snippet || buildTrackingSnippet(site.token, site.collectWebVitals);
    navigator.clipboard.writeText(snippet);
    setCopiedTokenId(site.id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  }

  function truncateToken(token: string) {
    if (token.length <= 16) return token;
    return `${token.slice(0, 8)}...${token.slice(-8)}`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const columns = [
    { key: 'name' as const, header: 'Name' },
    { key: 'domain' as const, header: 'Domain' },
    {
      key: 'active' as const,
      header: 'Status',
      render: (_val: unknown, row: SiteWithStats) => (
        <Badge variant={row.active ? 'success' : 'default'}>
          {row.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'token' as const,
      header: 'Token',
      render: (val: unknown) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
          {truncateToken(String(val))}
        </span>
      ),
    },
    {
      key: 'createdAt' as const,
      header: 'Created',
      render: (val: unknown) => formatDate(String(val)),
    },
    {
      key: 'collectWebVitals' as const,
      header: 'Vitals',
      render: (_val: unknown, row: SiteWithStats) => (
        <Switch
          checked={row.collectWebVitals}
          onChange={() => handleToggleWebVitals(row)}
          size="sm"
        />
      ),
    },
    {
      key: 'id' as const,
      header: '',
      render: (_val: unknown, row: SiteWithStats) => (
        <div className="pulse-table-actions">
          <Switch
            checked={row.active}
            onChange={() => handleToggleActive(row)}
            size="sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSetup(row.id)}
          >
            Setup
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRegenerateToken(row.id)}
          >
            Regenerate
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteTarget(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">Sites</Title>
          <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
            Add Site
          </Button>
        </div>

        <div className="pulse-section">
          <Card variant="shadow">
            <Card.Body>
              {loading ? (
                <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                  Loading sites...
                </p>
              ) : sites.length === 0 ? (
                <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                  No sites yet. Add your first site to start tracking.
                </p>
              ) : (
                <div>
                  <Table className="pulse-report-table" size="sm" columns={columns} data={sites} />

                  {expandedSiteId && (() => {
                    const site = sites.find((s) => s.id === expandedSiteId);
                    if (!site) return null;
                    const setup = setupChecks[site.id];
                    const snippet = setup?.snippet || buildTrackingSnippet(site.token, site.collectWebVitals);

                    return (
                      <div className="pulse-setup-panel">
                        <div className="pulse-setup-header" style={{ marginBottom: '0.5rem' }}>
                          <Title level="h4" size="xs">
                            Setup for {site.name}
                          </Title>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopySnippet(site)}
                          >
                            {copiedTokenId === site.id ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                        <div className="pulse-code-block">
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8125rem' }}>
                            <code>{snippet}</code>
                          </pre>
                        </div>
                        {setupLoadingId === site.id ? (
                          <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.8125rem', marginTop: '0.75rem' }}>
                            Checking setup...
                          </p>
                        ) : setup && (
                          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem', fontSize: '0.8125rem' }}>
                            <ChecklistItem label="Site token active" done={setup.tokenStatus === 'active'} />
                            <ChecklistItem label="Tracking data received" done={setup.hasData} />
                            <ChecklistItem label="Data received in the last 24 hours" done={setup.recentData} />
                            <ChecklistItem
                              label="Observed hostname matches configured domain"
                              done={setup.domainMatch !== false}
                              muted={setup.domainMatch === null}
                            />
                            {setup.lastSeen && (
                              <p style={{ color: 'var(--pulse-text-secondary)', margin: '0.25rem 0 0' }}>
                                Last seen {new Date(setup.lastSeen.at).toLocaleString()} from {setup.lastSeen.hostname || 'unknown host'}{setup.lastSeen.pathname}
                              </p>
                            )}
                            <div style={{ marginTop: '0.5rem' }}>
                              <strong style={{ fontSize: '0.75rem' }}>Troubleshooting</strong>
                              <ul style={{ margin: '0.375rem 0 0', paddingLeft: '1rem', color: 'var(--pulse-text-secondary)' }}>
                                {setup.troubleshooting.map((item) => <li key={item}>{item}</li>)}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

        <Dialog open={addDialogOpen} onClose={closeAddDialog} className="pulse-dialog">
          <Dialog.Header>
            <Title level="h3" size="sm">Add Site</Title>
          </Dialog.Header>
          <Dialog.Body className="pulse-dialog-body">
            <div className="pulse-form-stack">
              {error && <Alert variant="danger">{error}</Alert>}
              <Input
                label="Site Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                fullWidth
                error={fieldErrors.name}
              />
              <Input
                label="Domain"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                fullWidth
                error={fieldErrors.domain}
              />
            </div>
          </Dialog.Body>
          <Dialog.Footer className="pulse-dialog-footer">
            <Button variant="ghost" onClick={closeAddDialog}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSite} loading={submitting}>
              Add Site
            </Button>
          </Dialog.Footer>
        </Dialog>

        <Dialog open={!!editTarget} onClose={closeEditDialog} className="pulse-dialog">
          <Dialog.Header>
            <Title level="h3" size="sm">Edit Site</Title>
          </Dialog.Header>
          <Dialog.Body className="pulse-dialog-body">
            <div className="pulse-form-stack">
              {editError && <Alert variant="danger">{editError}</Alert>}
              <Input
                label="Site Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                fullWidth
                error={editNameError}
              />
            </div>
          </Dialog.Body>
          <Dialog.Footer className="pulse-dialog-footer">
            <Button variant="ghost" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSite} loading={submitting}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog>

        <Dialog open={!!deleteTarget} onClose={closeDeleteDialog} className="pulse-dialog">
          <Dialog.Header>
            <Title level="h3" size="sm">Delete Site</Title>
          </Dialog.Header>
          <Dialog.Body className="pulse-dialog-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)' }}>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              All tracking data for this site will be permanently removed.
            </p>
          </Dialog.Body>
          <Dialog.Footer className="pulse-dialog-footer">
            <Button variant="ghost" onClick={closeDeleteDialog}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteSite} loading={submitting}>
              Delete
            </Button>
          </Dialog.Footer>
        </Dialog>
      </div>
    </PageTransition>
  );
}
