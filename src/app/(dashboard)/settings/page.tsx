'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Title, Button, Dialog, Alert } from '@velocityuikit/velocityui';
import { PageTransition } from '@/components/motion';
import type { SessionUser } from '@/types';
import { DashboardIcon } from '@/components/dashboard/DashboardIcon';

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
  const [saved, setSaved] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    async function loadOrg() {
      try {
        let orgId = user?.activeOrgId;
        if (!orgId) {
          const organizationsResponse = await fetch('/api/orgs', {
            signal: controller.signal,
          });
          if (!organizationsResponse.ok)
            throw new Error('Could not load organizations');
          const organizations =
            (await organizationsResponse.json()) as OrgData[];
          orgId = organizations[0]?.id;
        }
        if (!orgId) throw new Error('No organization found');
        const res = await fetch(`/api/orgs/${orgId}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (!controller.signal.aborted) setOrg(data);
        } else {
          throw new Error('Could not load organization settings');
        }
      } catch {
        if (!controller.signal.aborted)
          setError('Could not load organization settings. Please try again.');
      }
    }

    void loadOrg();
    return () => controller.abort();
  }, [user?.activeOrgId, retry]);

  async function saveBriefSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org) return;
    setSavingBrief(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch(`/api/orgs/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: org.timezone,
          dailyBriefEnabled: org.dailyBriefEnabled,
          dailyBriefHour: org.dailyBriefHour,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error || 'Could not save brief settings. Please try again.',
        );
      setOrg(body);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save brief settings. Please try again.',
      );
    } finally {
      setSavingBrief(false);
    }
  }

  function updateBrief(changes: Partial<OrgData>) {
    if (org) setOrg({ ...org, ...changes });
    setSaved(false);
  }

  async function handleDeleteOrg() {
    if (!org) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/orgs/${org.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete organization');
      }
      setDeleteDialogOpen(false);
      router.push('/onboarding');
      router.refresh();
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  }

  const timezones = Array.from(
    new Set([
      org?.timezone ?? 'UTC',
      'America/Toronto',
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
    ]),
  );
  const destinations = [
    {
      path: 'sites',
      icon: 'globe',
      title: 'Websites',
      description:
        'Manage websites, tracking scripts, and collection settings.',
    },
    {
      path: 'monitoring',
      icon: 'uptime',
      title: 'Monitoring',
      description:
        'Configure alert rules, notification channels, and status pages.',
    },
    {
      path: 'reports',
      icon: 'pages',
      title: 'Reports & sharing',
      description: 'Share read-only reports and schedule summaries.',
    },
    {
      path: 'agent-tokens',
      icon: 'insights',
      title: 'Agent access',
      description: 'Manage scoped tokens for AI agents and MCP clients.',
    },
  ];

  return (
    <PageTransition>
      <div className="pulse-page pulse-settings-page">
        <header className="pulse-page-header">
          <div className="pulse-page-title-group">
            <Title level="h1" size="lg">
              Settings
            </Title>
            <p className="pulse-page-subtitle">
              Your workspace, connected websites, and reporting preferences.
            </p>
          </div>
          {org && (
            <span className="pulse-settings-org">
              <DashboardIcon name="portfolio" />
              {org.name}
            </span>
          )}
        </header>

        {error && (
          <div className="pulse-settings-feedback">
            <Alert variant="danger">{error}</Alert>
            {!org && (
              <button
                type="button"
                className="pulse-action-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </button>
            )}
          </div>
        )}

        <nav
          className="pulse-settings-destinations"
          aria-label="Workspace settings"
        >
          {destinations.map((destination) => (
            <Link
              key={destination.path}
              href={`/settings/${destination.path}`}
              className="pulse-settings-destination"
            >
              <span className="pulse-settings-icon">
                <DashboardIcon name={destination.icon} width={21} height={21} />
              </span>
              <span>
                <strong>{destination.title}</strong>
                <span>{destination.description}</span>
              </span>
              <DashboardIcon name="arrow" />
            </Link>
          ))}
        </nav>

        <div className="pulse-settings-grid">
          <section
            className="pulse-panel pulse-settings-section"
            aria-labelledby="brief-heading"
          >
            <div className="pulse-settings-section-heading">
              <span className="pulse-settings-icon">
                <DashboardIcon name="calendar" width={21} height={21} />
              </span>
              <div>
                <h2 id="brief-heading">Daily project brief</h2>
                <p>A regular summary of what needs your attention.</p>
              </div>
            </div>
            <form onSubmit={saveBriefSettings}>
              <fieldset
                disabled={!org || savingBrief}
                className="pulse-brief-fields"
              >
                <label className="pulse-brief-toggle">
                  <span>
                    <strong>Generate a daily brief</strong>
                    <span>Summarize activity across your portfolio.</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={org?.dailyBriefEnabled ?? false}
                    onChange={(event) =>
                      updateBrief({ dailyBriefEnabled: event.target.checked })
                    }
                  />
                </label>
                <div className="pulse-brief-schedule">
                  <label>
                    Time zone
                    <select
                      value={org?.timezone ?? 'UTC'}
                      onChange={(event) =>
                        updateBrief({ timezone: event.target.value })
                      }
                    >
                      {timezones.map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Generate after (local hour)
                    <input
                      type="number"
                      required
                      min={0}
                      max={23}
                      value={org?.dailyBriefHour ?? 8}
                      onChange={(event) =>
                        updateBrief({
                          dailyBriefHour: Number(event.target.value),
                        })
                      }
                      aria-describedby="brief-hour-hint"
                    />
                  </label>
                </div>
                <p id="brief-hour-hint" className="pulse-settings-hint">
                  Use a 24-hour clock, from 0 to 23. Brief generation requires
                  your scheduled job to run.
                </p>
                <div className="pulse-settings-save">
                  <Button type="submit" variant="primary" loading={savingBrief}>
                    Save preferences
                  </Button>
                  <span role="status">
                    {saved ? (
                      <>
                        <DashboardIcon name="check" width={16} height={16} />
                        Preferences saved
                      </>
                    ) : savingBrief ? (
                      'Saving…'
                    ) : !org && !error ? (
                      'Loading preferences…'
                    ) : (
                      ''
                    )}
                  </span>
                </div>
              </fieldset>
            </form>
          </section>

          <section
            className="pulse-panel pulse-settings-section"
            aria-labelledby="organization-heading"
          >
            <div className="pulse-settings-section-heading">
              <span className="pulse-settings-icon">
                <DashboardIcon name="portfolio" width={21} height={21} />
              </span>
              <div>
                <h2 id="organization-heading">Organization</h2>
                <p>The workspace your websites belong to.</p>
              </div>
            </div>
            <dl className="pulse-org-details">
              <div>
                <dt>Name</dt>
                <dd>{org?.name ?? (error ? 'Unavailable' : 'Loading…')}</dd>
              </div>
              <div>
                <dt>Workspace slug</dt>
                <dd>
                  <code>{org?.slug ?? '—'}</code>
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section
          className="pulse-settings-danger"
          aria-labelledby="danger-heading"
        >
          <div>
            <h2 id="danger-heading">Delete organization</h2>
            <p>
              Permanently remove this organization, its websites, and all
              collected data. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            className="pulse-action-button"
            disabled={!org}
            onClick={() => {
              setDeleteError(null);
              setDeleteDialogOpen(true);
            }}
          >
            Delete organization
          </button>
        </section>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            if (!deleting) setDeleteDialogOpen(false);
          }}
          className="pulse-dialog"
        >
          <Dialog.Header>
            <Title level="h3" size="sm">
              Delete organization
            </Title>
          </Dialog.Header>
          <Dialog.Body className="pulse-dialog-body">
            {deleteError && <Alert variant="danger">{deleteError}</Alert>}
            <p className="pulse-page-subtitle">
              Are you sure you want to delete <strong>{org?.name}</strong>? All
              websites, tracking data, and team memberships will be permanently
              removed.
            </p>
          </Dialog.Body>
          <Dialog.Footer className="pulse-dialog-footer">
            <Button
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteOrg}
              loading={deleting}
            >
              Delete organization
            </Button>
          </Dialog.Footer>
        </Dialog>
      </div>
    </PageTransition>
  );
}
