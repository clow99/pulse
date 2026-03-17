'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';

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

const NAV_ITEMS = [
  { href: '/overview', label: 'Overview', icon: '\u25C9' },
  { href: '/pages', label: 'Pages', icon: '\u25A4' },
  { href: '/events', label: 'Events', icon: '\u25C6' },
  { href: '/acquisition', label: 'Acquisition', icon: '\u2197' },
  { href: '/technology', label: 'Technology', icon: '\u2699' },
];

export function Sidebar({ orgName, siteName, orgId, sites }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const siteId = searchParams.get('siteId') || sites[0]?.id;

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSiteId = e.target.value;
    if (!newSiteId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('siteId', newSiteId);
    router.push(`${pathname}?${params.toString()}`);
    setIsMobileOpen(false);
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sidebarContent = (
    <>
      <div
        style={{
          padding: '1rem 1rem 1.25rem',
          borderBottom: '1px solid var(--pulse-border)',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--pulse-text-secondary)',
            marginBottom: '0.5rem',
          }}
        >
          {orgName}
        </div>
        {sites.length > 0 ? (
          <select
            value={siteId}
            onChange={handleSiteChange}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              backgroundColor: 'var(--pulse-bg-card)',
              border: '1px solid var(--pulse-border)',
              borderRadius: '6px',
              color: 'var(--pulse-text-primary)',
              cursor: 'pointer',
            }}
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name || site.domain}
              </option>
            ))}
          </select>
        ) : (
          <div
            style={{
              fontSize: '0.875rem',
              color: 'var(--pulse-text-secondary)',
            }}
          >
            {siteName || 'No sites'}
          </div>
        )}
      </div>

      <nav
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const href = `${item.href}${siteId ? `?siteId=${siteId}` : ''}`;
          const isActive = pathname === item.href;

          return (
            <motion.div
              key={item.href}
              whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.08)' }}
              style={{ borderRadius: '8px' }}
            >
              <Link
                href={href}
                onClick={() => isMobile && setIsMobileOpen(false)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  color: isActive ? 'var(--pulse-text-primary)' : 'var(--pulse-text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
              >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '100%',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--pulse-accent)',
                    zIndex: -1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 35,
                  }}
                />
              )}
                <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div
        style={{
          padding: '1rem 0.75rem',
          borderTop: '1px solid var(--pulse-border)',
        }}
      >
        <motion.div
          whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.08)' }}
          style={{ borderRadius: '8px' }}
        >
          <Link
            href={`/settings${siteId ? `?siteId=${siteId}` : ''}`}
            onClick={() => isMobile && setIsMobileOpen(false)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 0.875rem',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              color: pathname === '/settings' ? 'var(--pulse-text-primary)' : 'var(--pulse-text-secondary)',
              textDecoration: 'none',
            }}
          >
            {pathname === '/settings' && (
              <motion.div
                layoutId="activeNav"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '100%',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  borderRadius: '8px',
                  borderLeft: '3px solid var(--pulse-accent)',
                  zIndex: -1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 35,
                }}
              />
            )}
            <span style={{ fontSize: '1.125rem' }}>{'\u2699'}</span>
            <span>Settings</span>
          </Link>
        </motion.div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            width: '100%',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            color: 'var(--pulse-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.125rem' }}>{'\u21B6'}</span>
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  const sidebarWrapperStyles: React.CSSProperties = {
    width: 260,
    height: '100vh',
    backgroundColor: 'var(--pulse-bg-secondary)',
    borderRight: '1px solid var(--pulse-border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'fixed' as const,
    left: 0,
    top: 0,
    zIndex: 50,
  };

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 51,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--pulse-bg-card)',
            border: '1px solid var(--pulse-border)',
            borderRadius: '8px',
            color: 'var(--pulse-text-primary)',
            cursor: 'pointer',
          }}
          aria-label="Open menu"
        >
          <span style={{ fontSize: '1.25rem' }}>{'\u2630'}</span>
        </button>

        <AnimatePresence>
          {isMobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  zIndex: 49,
                }}
                onClick={() => setIsMobileOpen(false)}
              />
              <motion.div
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                style={{
                  ...sidebarWrapperStyles,
                  boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
                }}
              >
                {sidebarContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div style={{ width: 0, flexShrink: 0 }} />
      </>
    );
  }

  return (
    <div style={sidebarWrapperStyles}>
      {sidebarContent}
    </div>
  );
}
