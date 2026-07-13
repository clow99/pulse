'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Card,
  Title,
  Button,
  Dialog,
  Alert,
  Divider,
} from '@velocityuikit/velocityui';
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from '@/components/motion';
import type { SessionUser } from '@/types';

interface OrgData {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  dailyBriefEnabled: boolean;
  dailyBriefHour: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;

  const [org, setOrg] = useState<OrgData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingBrief, setSavingBrief] = useState(false);

  useEffect(() => {
    async function loadOrg() {
      try {
        let orgId = user?.activeOrgId;
        if (!orgId) {
          const organizationsResponse = await fetch('/api/orgs');
          if (!organizationsResponse.ok) throw new Error('Could not load organizations');
          const organizations = await organizationsResponse.json() as OrgData[];
          orgId = organizations[0]?.id;
        }
        if (!orgId) return;
        const res = await fetch(`/api/orgs/${orgId}`);
        if (res.ok) {
          setOrg(await res.json());
        } else {
          throw new Error('Could not load organization settings');
        }
      } catch {
        setError('Could not load organization settings');
      }
    }

    loadOrg();
  }, [user?.activeOrgId]);

  async function handleDeleteOrg() {
    if (!org) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orgs/${org.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete organization');
        return;
      }
      setDeleteDialogOpen(false);
      router.push('/onboarding');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setDeleting(false);
    }
  }

  async function saveBriefSettings() {
    if (!org) return;
    setSavingBrief(true);
    setError(null);
    const response = await fetch(`/api/orgs/${org.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: org.timezone, dailyBriefEnabled: org.dailyBriefEnabled, dailyBriefHour: org.dailyBriefHour }),
    });
    const body = await response.json();
    if (response.ok) setOrg(body); else setError(body.error || 'Could not save brief settings');
    setSavingBrief(false);
  }

  return (
    <PageTransition>
      <div className="pulse-page">
        <div className="pulse-page-header">
          <Title level="h1" size="lg">Settings</Title>
        </div>

        <StaggerContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <StaggerItem>
              <Card variant="shadow">
                <Card.Header><Title level="h3" size="sm">Daily Project Brief</Title></Card.Header>
                <Card.Body>
                  <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
                    <label><input type="checkbox" checked={org?.dailyBriefEnabled ?? true} onChange={(event) => org && setOrg({ ...org, dailyBriefEnabled: event.target.checked })} /> Generate a daily portfolio brief</label>
                    <label>Time zone<select value={org?.timezone ?? 'UTC'} onChange={(event) => org && setOrg({ ...org, timezone: event.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}><option value="America/Toronto">America/Toronto</option><option value="UTC">UTC</option><option value="America/New_York">America/New_York</option><option value="America/Los_Angeles">America/Los_Angeles</option><option value="Europe/London">Europe/London</option></select></label>
                    <label>Generate after local hour<input type="number" min={0} max={23} value={org?.dailyBriefHour ?? 8} onChange={(event) => org && setOrg({ ...org, dailyBriefHour: Number(event.target.value) })} style={{ display: 'block', width: '100%', marginTop: 4 }} /></label>
                    <Button variant="secondary" onClick={saveBriefSettings} loading={savingBrief}>Save Brief Settings</Button>
                  </div>
                </Card.Body>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card variant="shadow">
                <Card.Header>
                  <Title level="h3" size="sm">Organization</Title>
                </Card.Header>
                <Card.Body>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--pulse-text-secondary)' }}>Name</span>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
                        {org?.name ?? '\u2014'}
                      </p>
                    </div>
                    <Divider />
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--pulse-text-secondary)' }}>Slug</span>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem', fontFamily: 'monospace' }}>
                        {org?.slug ?? '\u2014'}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card variant="shadow">
                <Card.Header>
                  <Title level="h3" size="sm">Sites</Title>
                </Card.Header>
                <Card.Body>
                  <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)', marginBottom: '1rem' }}>
                    Manage the websites tracked under this organization.
                  </p>
                  <Link href="/settings/sites">
                    <Button variant="secondary">Manage Sites</Button>
                  </Link>
                </Card.Body>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card variant="shadow">
                <Card.Header>
                  <Title level="h3" size="sm">Agent Access</Title>
                </Card.Header>
                <Card.Body>
                  <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)', marginBottom: '1rem' }}>
                    Create scoped tokens for AI agents, MCP clients, and report automations.
                  </p>
                  <Link href="/settings/agent-tokens">
                    <Button variant="secondary">Manage Agent Tokens</Button>
                  </Link>
                </Card.Body>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card variant="shadow">
                <Card.Header>
                  <Title level="h3" size="sm">Report Sharing</Title>
                </Card.Header>
                <Card.Body>
                  <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)', marginBottom: '1rem' }}>
                    Create read-only dashboard links, exports, and scheduled report summaries.
                  </p>
                  <Link href="/settings/reports">
                    <Button variant="secondary">Manage Reports</Button>
                  </Link>
                </Card.Body>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card variant="shadow">
                <Card.Header>
                  <Title level="h3" size="sm">Monitoring</Title>
                </Card.Header>
                <Card.Body>
                  <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)', marginBottom: '1rem' }}>
                    Configure uptime notifications, alert rules, and public status pages.
                  </p>
                  <Link href="/settings/monitoring">
                    <Button variant="secondary">Manage Monitoring</Button>
                  </Link>
                </Card.Body>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card variant="shadow">
                <Card.Header>
                  <Title level="h3" size="sm" style={{ color: 'var(--pulse-danger, #ef4444)' }}>
                    Danger Zone
                  </Title>
                </Card.Header>
                <Card.Body>
                  <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)', marginBottom: '1rem' }}>
                    Permanently delete this organization and all its sites and data. This action cannot be undone.
                  </p>
                  <Button variant="danger" onClick={() => setDeleteDialogOpen(true)}>
                    Delete Organization
                  </Button>
                </Card.Body>
              </Card>
            </StaggerItem>
          </div>
        </StaggerContainer>

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} className="pulse-dialog">
          <Dialog.Header>
            <Title level="h3" size="sm">Delete Organization</Title>
          </Dialog.Header>
          <Dialog.Body className="pulse-dialog-body">
            {error && (
              <Alert variant="danger" style={{ marginBottom: '1rem' }}>{error}</Alert>
            )}
            <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)' }}>
              Are you sure you want to delete <strong>{org?.name}</strong>? All sites, tracking data, and team
              memberships will be permanently removed.
            </p>
          </Dialog.Body>
          <Dialog.Footer className="pulse-dialog-footer">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteOrg} loading={deleting}>
              Delete
            </Button>
          </Dialog.Footer>
        </Dialog>
      </div>
    </PageTransition>
  );
}
