'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { DashboardIcon } from './DashboardIcon';

interface Site {
  id: string;
  name: string;
  domain: string;
}
interface SidebarProps {
  orgName: string;
  siteName: string;
  orgId: string;
  sites: Site[];
}

const sections = [
  { label: 'Workspace', items: [['portfolio', 'Portfolio']] },
  {
    label: 'Analytics',
    items: [
      ['overview', 'Overview'],
      ['pages', 'Pages'],
      ['events', 'Events'],
      ['funnels', 'Funnels'],
      ['acquisition', 'Acquisition'],
      ['technology', 'Technology'],
      ['revenue', 'Revenue'],
    ],
  },
  {
    label: 'Monitoring',
    items: [
      ['uptime', 'Uptime'],
      ['performance', 'Performance'],
      ['insights', 'Insights'],
    ],
  },
];

export function Sidebar({ orgName, sites }: SidebarProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const requestedSite = params.get('siteId');
  const siteId =
    sites.find((site) => site.id === requestedSite)?.id || sites[0]?.id || '';

  useEffect(() => {
    if (!siteId || requestedSite === siteId) return;
    const next = new URLSearchParams(params.toString());
    next.set('siteId', siteId);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [siteId, requestedSite, params, pathname, router]);

  useEffect(() => {
    if (!open) return;
    const panel = drawer.current!;
    const trigger = menuButton.current;
    const content = document.getElementById('dashboard-content');
    const oldOverflow = document.body.style.overflow;
    const oldInert = content?.inert ?? false;
    document.body.style.overflow = 'hidden';
    if (content) content.inert = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>('button, a, select'),
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = oldOverflow;
      if (content) content.inert = oldInert;
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
      trigger?.focus();
    };
  }, [open]);

  function reportHref(path: string) {
    const next = new URLSearchParams();
    if (path !== 'portfolio' && siteId) next.set('siteId', siteId);
    for (const key of ['from', 'to']) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
    return `/${path}${next.size ? `?${next}` : ''}`;
  }

  return (
    <>
      <div className="pulse-mobile-bar">
        <button
          ref={menuButton}
          type="button"
          className="pulse-icon-button"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="pulse-navigation"
          onClick={() => setOpen(true)}
        >
          <DashboardIcon name="menu" />
        </button>
        <span>
          Pulse{' '}
          <span className="pulse-muted">
            /{' '}
            {sections
              .flatMap((s) => s.items)
              .find(([path]) => pathname === `/${path}`)?.[1] || 'Workspace'}
          </span>
        </span>
      </div>
      {open && (
        <div
          className="pulse-sidebar-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={drawer}
        id="pulse-navigation"
        className={`pulse-sidebar ${open ? 'is-open' : ''}`}
        aria-label="Workspace navigation"
      >
        <div className="pulse-sidebar-brand">
          <Link
            href={reportHref('overview')}
            aria-label="Pulse overview"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/logo.png"
              alt="Pulse"
              width={113}
              height={44}
              priority
            />
          </Link>
          <button
            className="pulse-icon-button pulse-sidebar-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <DashboardIcon name="close" />
          </button>
        </div>
        <div className="pulse-workspace-picker">
          <span className="pulse-workspace-label">{orgName}</span>
          <label htmlFor="pulse-site-select">Website</label>
          <select
            id="pulse-site-select"
            value={siteId}
            disabled={!sites.length}
            onChange={(event) => {
              const next = new URLSearchParams(params.toString());
              next.set('siteId', event.target.value);
              router.push(`${pathname}?${next}`, { scroll: false });
              setOpen(false);
            }}
          >
            {!sites.length && <option value="">No websites yet</option>}
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name || site.domain}
              </option>
            ))}
          </select>
          <span className="pulse-site-domain">
            {sites.find((site) => site.id === siteId)?.domain ||
              'Add a site to start collecting data'}
          </span>
        </div>
        <nav className="pulse-sidebar-nav" aria-label="Main navigation">
          {sections.map((section) => (
            <div key={section.label} className="pulse-nav-section">
              <p>{section.label}</p>
              {section.items.map(([path, label]) => (
                <Link
                  key={path}
                  href={reportHref(path)}
                  aria-current={pathname === `/${path}` ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  <DashboardIcon name={path} />
                  <span>{label}</span>
                  {pathname === `/${path}` && (
                    <span className="pulse-nav-active-dot" />
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="pulse-sidebar-footer">
          <Link
            href={reportHref('settings')}
            aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            <DashboardIcon name="settings" />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <DashboardIcon name="logout" />
            Sign out
          </button>
          <div className="pulse-sidebar-note">
            <span />
            Privacy-first analytics
          </div>
        </div>
      </aside>
    </>
  );
}
