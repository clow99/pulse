import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './self-host.module.css';

export const metadata: Metadata = {
  title: 'Self-hosting — Coming soon',
  description:
    'Preview the expected Pulse self-hosting architecture, operational requirements, and private-preview access status.',
  alternates: {
    canonical: '/self-host',
  },
  openGraph: {
    type: 'website',
    url: '/self-host',
    siteName: 'Pulse',
    title: 'Pulse self-hosting — Coming soon',
    description:
      'Preview the expected Pulse self-hosting architecture, operational requirements, and private-preview access status.',
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
    title: 'Pulse self-hosting — Coming soon',
    description:
      'Preview the expected Pulse self-hosting architecture, operational requirements, and private-preview access status.',
    images: ['/opengraph-image'],
  },
};

const requirements = [
  {
    label: 'Runtime',
    title: 'Docker-compatible host',
    detail: 'A Linux host capable of running the Pulse application container and exposing it through your edge.',
  },
  {
    label: 'Data',
    title: 'PostgreSQL',
    detail: 'A PostgreSQL instance you operate, back up, monitor, and make available to the application.',
  },
  {
    label: 'Network',
    title: 'Domain, TLS, and proxy',
    detail: 'A public HTTPS endpoint for the dashboard, tracker, health checks, and scoped agent access.',
  },
  {
    label: 'Operations',
    title: 'External scheduler',
    detail: 'Cron, systemd timers, or another scheduler to invoke uptime checks, insights, and report jobs.',
  },
];

const deploymentSteps = [
  {
    number: '01',
    title: 'Your edge',
    detail: 'Terminate TLS and route the dashboard, tracker, and API traffic on your domain.',
  },
  {
    number: '02',
    title: 'Pulse application',
    detail: 'Run the production app container with authentication, job secrets, and provider settings.',
  },
  {
    number: '03',
    title: 'Your PostgreSQL',
    detail: 'Keep analytics, uptime, organization, and audit data inside the database you control.',
  },
];

export default function SelfHostPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link className={styles.brand} href="/" aria-label="Pulse home">
            <Image src="/logo.png" alt="Pulse" width={144} height={56} priority />
          </Link>
          <div className={styles.navLinks}>
            <Link href="/pricing">Pricing</Link>
            <Link className={styles.navAction} href="/demo">
              Private preview
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroBackdrop} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.status}>
                <span aria-hidden="true" />
                Self-hosting · Coming soon
              </p>
              <h1>Run the signal stack on infrastructure you control.</h1>
              <p className={styles.lede}>
                Pulse is preparing a supported self-hosted distribution for
                analytics, uptime monitoring, and scoped agent reports. Explore
                the architecture now; installation packages and release
                instructions are not available yet.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} href="/demo">
                  Review private-preview access
                  <span aria-hidden="true">↗</span>
                </Link>
                <Link className={styles.secondaryAction} href="/">
                  Return to Pulse
                </Link>
              </div>
            </div>

            <figure className={styles.preview}>
              <div className={styles.previewHeader}>
                <span>Pulse overview</span>
                <span className={styles.previewStatus}>Synthetic demo data</span>
              </div>
              <div className={styles.previewImage}>
                <Image
                  src="/landing/pulse-overview.webp"
                  alt="Pulse overview showing privacy-first analytics and operational signals for the synthetic Demo Site"
                  fill
                  priority
                  sizes="(max-width: 900px) 94vw, 50vw"
                />
              </div>
              <figcaption>
                The public sandbox is isolated from production data and contains
                no settings, credentials, or write actions.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.proof} aria-label="Expected self-hosting characteristics">
          <div>
            <span className={styles.proofMark} aria-hidden="true">01</span>
            <p><strong>Cookie-free defaults</strong> for first-party measurement</p>
          </div>
          <div>
            <span className={styles.proofMark} aria-hidden="true">02</span>
            <p><strong>Docker + PostgreSQL</strong> as the deployment foundation</p>
          </div>
          <div>
            <span className={styles.proofMark} aria-hidden="true">03</span>
            <p><strong>Scoped agent access</strong> without direct database exposure</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="deployment-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Expected deployment model</p>
            <h2 id="deployment-title">A deliberately small operational footprint.</h2>
            <p>
              The planned path keeps the application boundary simple while
              leaving the database, network, backups, and job execution under
              your control.
            </p>
          </div>

          <ol className={styles.flow}>
            {deploymentSteps.map((step) => (
              <li key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </li>
            ))}
          </ol>

          <div className={styles.releaseNote}>
            <span className={styles.releaseIcon} aria-hidden="true">↻</span>
            <div>
              <h3>Controlled releases</h3>
              <p>
                The expected production flow runs database migrations through a
                dedicated tool image before replacing the application container.
                Pulse does not include a built-in scheduler.
              </p>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.requirementsSection}`} aria-labelledby="requirements-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>What to plan for</p>
            <h2 id="requirements-title">You own the infrastructure boundary.</h2>
            <p>
              Self-hosting trades managed convenience for direct control. These
              are the core services and responsibilities the supported path is
              being designed around.
            </p>
          </div>

          <div className={styles.requirementLayout}>
            <div className={styles.requirementGrid}>
              {requirements.map((requirement) => (
                <article key={requirement.title}>
                  <span>{requirement.label}</span>
                  <h3>{requirement.title}</h3>
                  <p>{requirement.detail}</p>
                </article>
              ))}
            </div>

            <aside className={styles.boundary} aria-labelledby="boundary-title">
              <p className={styles.boundaryLabel}>Operator boundary</p>
              <h3 id="boundary-title">Your team remains responsible for</h3>
              <ul>
                <li>Host and database availability</li>
                <li>Backups and restore testing</li>
                <li>TLS and reverse-proxy configuration</li>
                <li>Secret rotation and provider credentials</li>
                <li>Scheduled jobs and email delivery</li>
              </ul>
              <p className={styles.optionalNote}>
                SMTP and AI-provider integrations are optional and use credentials
                supplied by your organization.
              </p>
            </aside>
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.closingBackdrop} aria-hidden="true" />
          <div className={styles.closingContent}>
            <p className={styles.eyebrow}>See the product today</p>
            <h2>Explore Pulse without connecting a site.</h2>
            <p>
              Public evaluation is not available. The preview notice explains the
              current invitation-only access boundary.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/demo">
                Review private-preview access
                <span aria-hidden="true">↗</span>
              </Link>
              <Link className={styles.secondaryAction} href="/pricing">
                Compare plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/">Pulse</Link>
        <span>Analytics, uptime, and AI signals.</span>
      </footer>
    </div>
  );
}
