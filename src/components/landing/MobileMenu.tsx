'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

const mobileLinks = [
  { label: 'Product', href: '#product' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Agent access', href: '#agents' },
  { label: 'Self-hosting', href: '#self-hosting' },
  { label: 'Questions', href: '#questions' },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    const background = ['main-content', 'landing-site-header', 'landing-footer']
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
      .map((element) => ({ element, inert: element.inert }));
    document.body.style.overflow = 'hidden';
    background.forEach(({ element }) => {
      element.inert = true;
    });
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
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
    const onResize = () => {
      if (window.innerWidth > 900) closeMenu();
    };
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, closeMenu]);

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

      {isOpen
        ? createPortal(
            <div className={styles.mobileMenuLayer}>
              <button
                type="button"
                className={styles.mobileMenuBackdrop}
                aria-label="Close navigation menu"
                tabIndex={-1}
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
                <nav
                  className={styles.mobileMenuNav}
                  aria-label="Mobile navigation"
                >
                  {mobileLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => closeMenu()}
                    >
                      {link.label}
                      <span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </nav>
                <div className={styles.mobileMenuActions}>
                  <Link
                    href="/demo"
                    className={styles.secondaryButton}
                    onClick={() => closeMenu()}
                  >
                    Private preview
                  </Link>
                  <Link
                    href="/self-host"
                    className={styles.primaryButton}
                    onClick={() => closeMenu()}
                  >
                    Explore self-hosting
                  </Link>
                  <Link
                    href="/login"
                    className={styles.mobileSignIn}
                    onClick={() => closeMenu()}
                  >
                    Already use Pulse? Sign in
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
