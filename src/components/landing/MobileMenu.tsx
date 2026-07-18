'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

const mobileLinks = [
  { label: 'Product', href: '#product' },
  { label: 'Agent access', href: '#agents' },
  { label: 'Self-hosting', href: '#self-hosting' },
  { label: 'Pricing', href: '/pricing' },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function closeMenu(restoreFocus = false) {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  return (
    <div className={styles.mobileMenuRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuTrigger}
        aria-expanded={isOpen}
        aria-controls="landing-mobile-menu"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span />
        <span />
      </button>

      {isOpen ? (
        <div className={styles.mobileMenuLayer}>
          <button
            type="button"
            className={styles.mobileMenuBackdrop}
            aria-label="Close navigation menu"
            onClick={() => closeMenu(true)}
          />
          <div
            ref={panelRef}
            id="landing-mobile-menu"
            className={styles.mobileMenuPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
          >
            <div className={styles.mobileMenuHeader}>
              <span className={styles.mobileMenuLabel}>Navigate</span>
              <button
                type="button"
                className={styles.mobileMenuClose}
                aria-label="Close navigation menu"
                onClick={() => closeMenu(true)}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <nav className={styles.mobileMenuNav} aria-label="Mobile navigation">
              {mobileLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => closeMenu()}>
                  {link.label}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </nav>
            <div className={styles.mobileMenuActions}>
              <Link href="/demo" className={styles.secondaryButton} onClick={() => closeMenu()}>
                Private preview
              </Link>
              <Link href="/self-host" className={styles.primaryButton} onClick={() => closeMenu()}>
                Explore self-hosting
              </Link>
              <Link href="/login" className={styles.mobileSignIn} onClick={() => closeMenu()}>
                Already use Pulse? Sign in
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
