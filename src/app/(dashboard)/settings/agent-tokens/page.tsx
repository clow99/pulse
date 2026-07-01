'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Input,
  Table,
  Title,
} from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import type { AgentTokenView, SessionUser, SiteWithStats } from '@/types';

const SCOPES = [
  'analytics:read',
  'events:read',
  'uptime:read',
  'reports:generate',
];

export default function AgentTokensPage() {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const orgId = user?.activeOrgId;

  const [tokens, setTokens] = useState<AgentTokenView[]>([]);
  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [scopes, setScopes] = useState<string[]>(SCOPES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [tokensRes, sitesRes] = await Promise.all([
        fetch(`/api/agent-tokens?orgId=${orgId}`),
        fetch('/api/sites'),
      ]);
      if (tokensRes.ok) setTokens(await tokensRes.json());
      if (sitesRes.ok) setSites(await sitesRes.json());
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetCreateForm() {
    setName('');
    setSiteId('');
    setExpiresAt('');
    setScopes(SCOPES);
    setError(null);
  }

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope]
    );
  }

  async function createToken() {
    if (!orgId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          siteId: siteId || null,
          name,
          scopes,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create token');
        return;
      }
      setSecret(data.token);
      setCreateOpen(false);
      resetCreateForm();
      await loadData();
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeToken(token: AgentTokenView) {
    await fetch(`/api/agent-tokens/${token.id}`, { method: 'DELETE' });
    await loadData();
  }

  async function rotateToken(token: AgentTokenView) {
    const res = await fetch(`/api/agent-tokens/${token.id}/rotate`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      setSecret(data.token);
      await loadData();
    }
  }

  function copySecret() {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(value: string | null) {
    if (!value) return 'Never';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const columns = [
    { key: 'name' as const, header: 'Name' },
    {
      key: 'site' as const,
      header: 'Scope',
      render: (_value: unknown, row: AgentTokenView) =>
        row.site ? `${row.site.name} (${row.site.domain})` : 'Organization',
    },
    {
      key: 'tokenPrefix' as const,
      header: 'Prefix',
      render: (value: unknown) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
          {String(value)}
        </span>
      ),
    },
    {
      key: 'scopes' as const,
      header: 'Scopes',
      render: (value: unknown) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {(value as string[]).map((scope) => (
            <Badge key={scope} variant="default">
              {scope}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'expiresAt' as const,
      header: 'Expires',
      render: (value: unknown) => formatDate(value as string | null),
    },
    {
      key: 'revokedAt' as const,
      header: 'Status',
      render: (value: unknown) => (
        <Badge variant={value ? 'danger' : 'success'}>
          {value ? 'Revoked' : 'Active'}
        </Badge>
      ),
    },
    {
      key: 'id' as const,
      header: '',
      render: (_value: unknown, row: AgentTokenView) => (
        <div className="pulse-table-actions">
          <Button variant="ghost" size="sm" onClick={() => rotateToken(row)}>
            Rotate
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={!!row.revokedAt}
            onClick={() => revokeToken(row)}
          >
            Revoke
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">Agent Tokens</Title>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            New Token
          </Button>
        </div>

        {secret && (
          <Alert variant="success" style={{ marginBottom: '1rem' }}>
            <div className="pulse-token-alert">
              <code>{secret}</code>
              <Button variant="secondary" size="sm" onClick={copySecret}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSecret(null)}>
                Dismiss
              </Button>
            </div>
          </Alert>
        )}

        <Card variant="shadow">
          <Card.Body>
            {loading ? (
              <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                Loading agent tokens...
              </p>
            ) : tokens.length === 0 ? (
              <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                No agent tokens yet.
              </p>
            ) : (
              <Table className="pulse-report-table" size="sm" columns={columns} data={tokens} />
            )}
          </Card.Body>
        </Card>

        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} className="pulse-dialog" size="lg">
          <Dialog.Header>
            <Title level="h3" size="sm">New Agent Token</Title>
          </Dialog.Header>
          <Dialog.Body className="pulse-dialog-body">
            <div className="pulse-form-stack">
              {error && <Alert variant="danger">{error}</Alert>}
              <Input
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                fullWidth
              />
              <label className="pulse-label">
                <span>Site</span>
                <select
                  className="pulse-select"
                  value={siteId}
                  onChange={(event) => setSiteId(event.target.value)}
                >
                  <option value="">All organization sites</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.domain})
                    </option>
                  ))}
                </select>
              </label>
              <label className="pulse-label">
                <span>Expires</span>
                <input
                  className="pulse-input-native"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--pulse-text-secondary)' }}>
                  Scopes
                </span>
                {SCOPES.map((scope) => (
                  <label key={scope} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                    />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      {scope}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </Dialog.Body>
          <Dialog.Footer className="pulse-dialog-footer">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={createToken}
              loading={submitting}
              disabled={scopes.length === 0}
            >
              Create Token
            </Button>
          </Dialog.Footer>
        </Dialog>
      </div>
    </PageTransition>
  );
}
