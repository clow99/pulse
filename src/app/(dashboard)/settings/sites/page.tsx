'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
import type { SessionUser, SiteWithStats } from '@/types';

export default function SitesPage() {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;

  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SiteWithStats | null>(null);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const orgId = user?.activeOrgId;

  const closeAddDialog = useCallback(() => setAddDialogOpen(false), []);
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
    } catch {
      setError('Something went wrong');
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
      }
    } catch {
      // silently fail
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
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopySnippet(site: SiteWithStats) {
    const snippet = `<script defer data-token="${site.token}" src="https://your-pulse-instance.com/t.js"></script>`;
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
      key: 'id' as const,
      header: '',
      render: (_val: unknown, row: SiteWithStats) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Switch
            checked={row.active}
            onChange={() => handleToggleActive(row)}
            size="sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setExpandedSiteId(expandedSiteId === row.id ? null : row.id)
            }
          >
            Tracking Code
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
                  <Table columns={columns} data={sites} />

                  {expandedSiteId && (() => {
                    const site = sites.find((s) => s.id === expandedSiteId);
                    if (!site) return null;
                    const snippet = `<script defer data-token="${site.token}" src="https://your-pulse-instance.com/t.js"></script>`;

                    return (
                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          backgroundColor: 'var(--pulse-bg-primary)',
                          borderRadius: '8px',
                          border: '1px solid var(--pulse-border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <Title level="h4" size="xs">
                            Tracking Code for {site.name}
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
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

        <Dialog open={addDialogOpen} onClose={closeAddDialog}>
          <Dialog.Header>
            <Title level="h3" size="sm">Add Site</Title>
          </Dialog.Header>
          <Dialog.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          <Dialog.Footer>
            <Button variant="ghost" onClick={closeAddDialog}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSite} loading={submitting}>
              Add Site
            </Button>
          </Dialog.Footer>
        </Dialog>

        <Dialog open={!!deleteTarget} onClose={closeDeleteDialog}>
          <Dialog.Header>
            <Title level="h3" size="sm">Delete Site</Title>
          </Dialog.Header>
          <Dialog.Body>
            <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)' }}>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              All tracking data for this site will be permanently removed.
            </p>
          </Dialog.Body>
          <Dialog.Footer>
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
