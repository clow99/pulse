import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './pricing.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Review Pulse private-preview deployment options. No public purchase or fixed-price offer is available.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    type: 'website',
    url: '/pricing',
    siteName: 'Pulse',
    title: 'Pulse pricing',
    description:
      'Review Pulse private-preview deployment options. No public purchase or fixed-price offer is available.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Pulse analytics overview on a dark telemetry background',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pulse pricing',
    description:
      'Review Pulse private-preview deployment options. No public purchase or fixed-price offer is available.',
    images: ['/opengraph-image'],
  },
};

const plans = [
  {
    name: 'Self-managed preview',
    availability: 'Private preview',
    audience: 'For invited operators evaluating Pulse on infrastructure they control.',
    features: ['Docker + Postgres deployment', 'Cookie-free web analytics', 'Goals, funnels, revenue, uptime', 'Private-preview evaluation access'],
  },
  {
    name: 'Managed preview',
    availability: 'Private preview',
    audience: 'For invited operators evaluating a hosted Pulse environment.',
    features: ['Hosted tracker and database', 'Conversion recipes', 'Uptime monitoring', 'Agent-ready reports'],
  },
];

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#pricing">
        Skip to pricing
      </a>

      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link className={styles.brand} href="/" aria-label="Pulse home">
            <Image src="/logo.png" alt="Pulse" width={144} height={56} priority />
          </Link>
          <div className={styles.navLinks}>
            <Link href="/demo">Private preview</Link>
            <Link href="/self-host">Self-hosting</Link>
            <Link className={styles.navAction} href="/login">
              Invited sign in
            </Link>
          </div>
        </nav>
      </header>

      <main id="pricing">
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Private preview</p>
          <h1>Evaluate self-managed or hosted Pulse privately.</h1>
          <p className={styles.subtitle}>
            Public purchasing is not available. Preview scope, capacity, support,
            and any future pricing are reviewed directly with invited participants.
          </p>
        </section>

        <section className={styles.grid} aria-label="Pulse pricing plans">
          {plans.map((plan) => (
            <article key={plan.name} className={styles.card}>
              <p className={styles.planBadge}>Invitation only</p>
              <div>
                <h2>{plan.name}</h2>
                <strong>{plan.availability}</strong>
                <p className={styles.audience}>{plan.audience}</p>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p>
                Already invited? <Link href="/login">Sign in to continue.</Link>
              </p>
            </article>
          ))}
        </section>

        <p className={styles.note}>
          No public purchase, checkout, registration, or fixed-price offer is available.
        </p>
      </main>

      <footer className={styles.footer}>
        <Link href="/">Pulse</Link>
        <span>Privacy-first operational signals.</span>
      </footer>
    </div>
  );
}
