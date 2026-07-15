import Image from 'next/image';
import Link from 'next/link';
import { MobileMenu } from './MobileMenu';
import styles from './landing.module.css';

const navLinks = [
  { label: 'Product', href: '#product' },
  { label: 'Agent access', href: '#agents' },
  { label: 'Self-hosting', href: '#self-hosting' },
  { label: 'Pricing', href: '/pricing' },
];

export function LandingHeader() {
  return (
    <header className={styles.siteHeader}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logoLink} aria-label="Pulse home">
          <Image
            src="/logo.png"
            alt="Pulse"
            width={900}
            height={350}
            className={styles.logoImage}
            priority
          />
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
            Live demo
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
