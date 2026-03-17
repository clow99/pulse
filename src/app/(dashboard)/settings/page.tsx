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
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;

  const [org, setOrg] = useState<OrgData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.activeOrgId) return;

    async function loadOrg() {
      try {
        const res = await fetch(`/api/orgs/${user!.activeOrgId}`);
        if (res.ok) {
          setOrg(await res.json());
        }
      } catch {
        // silently fail
      }
    }

    loadOrg();
  }, [user?.activeOrgId, user]);

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

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <Dialog.Header>
            <Title level="h3" size="sm">Delete Organization</Title>
          </Dialog.Header>
          <Dialog.Body>
            {error && (
              <Alert variant="danger" style={{ marginBottom: '1rem' }}>{error}</Alert>
            )}
            <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)' }}>
              Are you sure you want to delete <strong>{org?.name}</strong>? All sites, tracking data, and team
              memberships will be permanently removed.
            </p>
          </Dialog.Body>
          <Dialog.Footer>
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
