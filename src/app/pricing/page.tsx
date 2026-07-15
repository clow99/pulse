import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './pricing.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Compare managed Pulse plans and preview the upcoming self-hosted deployment option.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    type: 'website',
    url: '/pricing',
    siteName: 'Pulse',
    title: 'Pulse pricing',
    description:
      'Compare managed Pulse plans and preview the upcoming self-hosted deployment option.',
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
      'Compare managed Pulse plans and preview the upcoming self-hosted deployment option.',
    images: ['/opengraph-image'],
  },
};

const plans = [
  {
    name: 'Self-hosted',
    price: 'Coming soon',
    audience: 'Developers and teams that want full control.',
    features: ['Docker + Postgres deployment', 'Cookie-free web analytics', 'Goals, funnels, revenue, uptime', 'Community updates'],
    cta: 'Explore self-hosting',
    href: '/self-host',
  },
  {
    name: 'Managed Starter',
    price: '$19/mo',
    audience: 'Small teams that want hosted analytics without setup.',
    features: ['1 site', 'Hosted tracker and database', 'Conversion recipes', 'Weekly email summaries'],
    cta: 'Start hosted',
    href: '/register',
  },
  {
    name: 'Managed Team',
    price: '$49/mo',
    audience: 'Teams running multiple sites and product workflows.',
    features: ['5 sites', 'Team access', 'Uptime alerts', 'Agent-ready MCP reports'],
    cta: 'Start team plan',
    href: '/register',
  },
  {
    name: 'Agency',
    price: 'Custom',
    audience: 'Freelancers and agencies managing client reporting.',
    features: ['Client spaces', 'Share links', 'Scheduled summaries', 'White-label reporting path'],
    cta: 'Build agency stack',
    href: '/register',
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
            <Link href="/demo">Live demo</Link>
            <Link href="/self-host">Self-hosting</Link>
            <Link className={styles.navAction} href="/register">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main id="pricing">
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Pulse offers</p>
          <h1>Infrastructure control or managed convenience.</h1>
          <p className={styles.subtitle}>
            Choose a managed plan today, or preview the deployment model for the
            upcoming self-hosted edition.
          </p>
        </section>

        <section className={styles.grid} aria-label="Pulse pricing plans">
          {plans.map((plan) => {
            const isFeatured = plan.name === 'Managed Team';
            const isComingSoon = plan.name === 'Self-hosted';

            return (
              <article
                key={plan.name}
                className={`${styles.card} ${isFeatured ? styles.featured : ''}`}
              >
                {isFeatured ? <p className={styles.planBadge}>Most capable</p> : null}
                {isComingSoon ? <p className={styles.planBadge}>In development</p> : null}
                <div>
                  <h2>{plan.name}</h2>
                  <strong>{plan.price}</strong>
                  <p className={styles.audience}>{plan.audience}</p>
                </div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link
                  className={`${styles.cta} ${isFeatured ? styles.primary : styles.secondary}`}
                  href={plan.href}
                >
                  {plan.cta}
                </Link>
              </article>
            );
          })}
        </section>

        <p className={styles.note}>
          Self-hosted release timing and distribution details will be published
          when the deployment path is ready.
        </p>
      </main>

      <footer className={styles.footer}>
        <Link href="/">Pulse</Link>
        <span>Privacy-first operational signals.</span>
      </footer>
    </div>
  );
}
