'use client';

import { useState, useEffect, useRef } from 'react';
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

interface NavSection {
  label: string;
  items: { href: string; label: string; icon: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'ANALYTICS',
    items: [
      { href: '/overview', label: 'Overview', icon: '\u25C9' },
      { href: '/pages', label: 'Pages', icon: '\u25A4' },
      { href: '/events', label: 'Events', icon: '\u25C6' },
    ],
  },
  {
    label: 'ACQUISITION',
    items: [
      { href: '/acquisition', label: 'Acquisition', icon: '\u2197' },
      { href: '/technology', label: 'Technology', icon: '\u2699' },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { href: '/settings', label: 'Settings', icon: '\u2699' },
    ],
  },
];

export function Sidebar({ orgName, siteName, orgId, sites }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const siteId = searchParams.get('siteId') || sites[0]?.id;

  const handleSiteSelect = (newSiteId: string) => {
    if (!newSiteId || newSiteId === siteId) {
      setDropdownOpen(false);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('siteId', newSiteId);
    router.push(`${pathname}?${params.toString()}`);
    setDropdownOpen(false);
    setIsMobileOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sidebarContent = (
    <>
      {/* Branding */}
      <div
        style={{
          padding: '1.25rem 1rem 0.75rem',
          borderBottom: '1px solid var(--pulse-border)',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <img
            src="/logo.png"
            alt="Pulse"
            style={{
              height: 40,
              objectFit: 'contain',
            }}
          />
        </div>
        <div
          style={{
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--pulse-text-secondary)',
            marginBottom: '0.5rem',
          }}
        >
          {orgName}
        </div>
        {sites.length > 0 ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
                backgroundColor: 'var(--pulse-bg-card)',
                border: `1px solid ${dropdownOpen ? 'var(--pulse-accent)' : 'var(--pulse-border)'}`,
                borderRadius: '6px',
                color: 'var(--pulse-text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sites.find((s) => s.id === siteId)?.name || sites.find((s) => s.id === siteId)?.domain || 'Select site'}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  flexShrink: 0,
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                }}
              >
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    listStyle: 'none',
                    margin: 0,
                    padding: '4px',
                    backgroundColor: 'var(--pulse-bg-card)',
                    border: '1px solid var(--pulse-border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {sites.map((site) => {
                    const isSelected = site.id === siteId;
                    return (
                      <li key={site.id}>
                        <button
                          type="button"
                          onClick={() => handleSiteSelect(site.id)}
                          style={{
                            width: '100%',
                            padding: '0.4375rem 0.625rem',
                            fontSize: '0.8125rem',
                            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                            color: isSelected ? 'var(--pulse-accent)' : 'var(--pulse-text-primary)',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'block',
                            transition: 'background-color 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent';
                          }}
                        >
                          {site.name || site.domain}
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: 'var(--pulse-text-secondary)' }}>
            {siteName || 'No sites'}
          </div>
        )}
      </div>

      {/* Nav sections */}
      <nav
        style={{
          flex: 1,
          padding: '0.5rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.125rem',
          overflowY: 'auto',
        }}
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: '0.25rem' }}>
            <div
              style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--pulse-text-secondary)',
                padding: '0.75rem 0.875rem 0.375rem',
              }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const href = `${item.href}${siteId ? `?siteId=${siteId}` : ''}`;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

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
                      padding: '0.5rem 0.875rem',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
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
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '0.75rem',
          borderTop: '1px solid var(--pulse-border)',
        }}
      >
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0.875rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: 'var(--pulse-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1rem' }}>{'\u21B6'}</span>
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  const sidebarWrapperStyles: React.CSSProperties = {
    width: 240,
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
            left: '1rem',
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
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
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
