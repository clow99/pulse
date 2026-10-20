import { PulseLogo } from '@/components/brand/PulseLogo';
import Link from 'next/link';
import { MobileMenu } from './MobileMenu';
import styles from './landing.module.css';

const navLinks = [
  { label: 'Product', href: '#product' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Agent access', href: '#agents' },
  { label: 'Self-hosting', href: '#self-hosting' },
];

export function LandingHeader() {
  return (
    <header id="landing-site-header" className={styles.siteHeader}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logoLink} aria-label="Pulse home">
          <PulseLogo width={116} className={styles.logoImage} priority />
        </Link>

        <nav className={styles.desktopNav} aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Link href="/login" className={styles.signInLink}>
            Sign in
          </Link>
          <Link href="/demo" className={styles.headerCta}>
            Access details
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
