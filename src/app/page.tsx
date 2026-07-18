import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { ProductScreenshot } from '@/components/landing/ProductScreenshot';
import styles from '@/components/landing/landing.module.css';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Pulse',
    title: 'Pulse — Analytics, uptime, and AI signals',
    description:
      'Understand acquisition, reliability, and agent-ready reports from one privacy-first signal stack.',
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
    title: 'Pulse — Analytics, uptime, and AI signals',
    description:
      'Understand acquisition, reliability, and agent-ready reports from one privacy-first signal stack.',
    images: ['/opengraph-image'],
  },
};

const proofPoints = [
  {
    index: '01',
    title: 'Cookie-free by default',
    description: 'Useful first-party analytics without placing tracking cookies on visitors.',
  },
  {
    index: '02',
    title: 'Docker + PostgreSQL',
    description: 'A familiar deployment model built around infrastructure your team can inspect.',
  },
  {
    index: '03',
    title: 'One operational view',
    description: 'Analytics, acquisition, uptime, and scoped agent reports in one focused product.',
  },
];

const acquisitionDetails = [
  'Referrers and campaign sources in one report',
  'AI-assistant traffic alongside traditional source groups',
  'Conversion and attributed-revenue context for each channel',
];

const uptimeDetails = [
  'Current availability and uptime history at a glance',
  'Response-time history beside analytics and Web Vitals',
  'Incidents, alert channels, and public status surfaces',
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4.5 10.2 3.3 3.3 7.7-7.7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className={styles.landingShell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <LandingHeader />

      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span aria-hidden="true">Pulse / 01</span>
                Private product telemetry
              </p>
              <h1 id="hero-title" className={styles.heroTitle}>
                Analytics, uptime, and AI signals—on infrastructure you control.
              </h1>
              <p className={styles.heroDescription}>
                See how people discover, use, and experience your product without
                sending the story of your business to another analytics black box.
              </p>
              <div className={styles.heroActions}>
                <Link href="/self-host" className={styles.primaryButton}>
                  Explore self-hosting
                  <ArrowIcon />
                </Link>
                <Link href="/demo" className={styles.secondaryButton}>
                  Review private preview
                </Link>
              </div>
              <div className={styles.heroFootnote}>
                <span className={styles.liveMark} aria-hidden="true" />
                Preview notice only. No public account or production connection is offered.
              </div>
            </div>

            <div className={styles.heroVisual}>
              <ProductScreenshot
                src="/landing/pulse-overview.webp"
                alt="Pulse Demo Site overview showing visitors, pageviews, tracked events, bounce rate, traffic trends, and an AI referral insight."
                view="Overview"
                variant="hero"
                priority
              />
              <div className={styles.heroAnnotation} aria-hidden="true">
                <span>Product signal</span>
                <i />
                <strong>Live + private</strong>
              </div>
            </div>
          </div>
          <div className={styles.heroIndex} aria-hidden="true">
            <span>WEB ANALYTICS</span>
            <span>RELIABILITY</span>
            <span>AGENT REPORTS</span>
          </div>
        </section>

        <section className={styles.proofSection} aria-label="Pulse foundations">
          <div className={styles.proofGrid}>
            {proofPoints.map((point) => (
              <article key={point.index} className={styles.proofItem}>
                <span className={styles.proofIndex}>{point.index}</span>
                <div>
                  <h2>{point.title}</h2>
                  <p>{point.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="product" className={styles.productSection} aria-labelledby="product-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true">Pulse / 02</span>
              The operating picture
            </p>
            <h2 id="product-title">Follow the signal from discovery to reliability.</h2>
            <p>
              Pulse connects the reports product teams check every day, so a spike in
              traffic, a change in acquisition, and a slow endpoint are part of the
              same investigation.
            </p>
          </div>

          <article className={styles.productStory}>
            <div className={styles.storyVisual}>
              <ProductScreenshot
                src="/landing/pulse-acquisition.webp"
                alt="Pulse Demo Site acquisition report showing source groups, AI-assistant traffic, conversions, revenue, and top referrers."
                view="Acquisition"
              />
            </div>
            <div className={styles.storyCopy}>
              <span className={styles.storyNumber}>01 / ACQUISITION</span>
              <h3>Know which routes bring people who actually engage.</h3>
              <p>
                Move past a list of pageviews. Read source quality across referrers,
                campaign traffic, AI assistants, conversions, and attributed revenue.
              </p>
              <ul className={styles.detailList}>
                {acquisitionDetails.map((detail) => (
                  <li key={detail}>
                    <CheckIcon />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              <Link href="/demo?view=acquisition" className={styles.textLink}>
                Review private-preview access
                <ArrowIcon />
              </Link>
            </div>
          </article>

          <article className={`${styles.productStory} ${styles.productStoryReversed}`}>
            <div className={styles.storyVisual}>
              <ProductScreenshot
                src="/landing/pulse-uptime.webp"
                alt="Pulse Demo Site uptime report showing current status, uptime history, and response-time monitoring."
                view="Uptime"
              />
            </div>
            <div className={styles.storyCopy}>
              <span className={styles.storyNumber}>02 / RELIABILITY</span>
              <h3>Put product performance beside product behavior.</h3>
              <p>
                See whether a conversion change is a traffic story, a product story,
                or an availability problem—without jumping between disconnected tools.
              </p>
              <ul className={styles.detailList}>
                {uptimeDetails.map((detail) => (
                  <li key={detail}>
                    <CheckIcon />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              <Link href="/demo?view=uptime" className={styles.textLink}>
                Review private-preview access
                <ArrowIcon />
              </Link>
            </div>
          </article>
        </section>

        <section id="agents" className={styles.agentSection} aria-labelledby="agents-title">
          <div className={styles.agentGrid}>
            <div className={styles.agentCopy}>
              <p className={styles.eyebrow}>
                <span aria-hidden="true">Pulse / 03</span>
                Scoped agent access
              </p>
              <h2 id="agents-title">Give agents the report, not the keys to the building.</h2>
              <p>
                Pulse exposes authenticated REST and MCP reporting surfaces. Limit an
                agent to a site and the exact analytics or uptime scopes it needs, then
                keep an audit trail of every report request.
              </p>
              <dl className={styles.agentFacts}>
                <div>
                  <dt>Transport</dt>
                  <dd>REST + MCP</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>Site-scoped</dd>
                </div>
                <div>
                  <dt>Operations</dt>
                  <dd>Report-only</dd>
                </div>
              </dl>
            </div>

            <div className={styles.codePanel} aria-label="Example scoped Pulse report request">
              <div className={styles.codePanelHeader}>
                <span>
                  <i aria-hidden="true" />
                  generate-report.ts
                </span>
                <span>REST</span>
              </div>
              <pre className={styles.codeBlock}>
                <code>{`const report = await fetch(
  '/api/agent/reports/generate',
  {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${PULSE_AGENT_TOKEN}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      siteId,
      reports: [
        'overview',
        'acquisition',
        'uptime_summary'
      ],
      from,
      to
    })
  }
);`}</code>
              </pre>
              <div className={styles.scopeBar}>
                <span>Required scopes</span>
                <ul aria-label="Required agent scopes">
                  <li>reports:generate</li>
                  <li>analytics:read</li>
                  <li>uptime:read</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="self-hosting" className={styles.selfHostSection} aria-labelledby="self-host-title">
          <div className={styles.selfHostGrid}>
            <div className={styles.selfHostCopy}>
              <p className={styles.eyebrow}>
                <span aria-hidden="true">Pulse / 04</span>
                Deployment preview
              </p>
              <span className={styles.comingSoon}>Self-hosting · Coming soon</span>
              <h2 id="self-host-title">Your data plane. Your operational standards.</h2>
              <p>
                The self-hosted release is being prepared around a straightforward
                Docker and PostgreSQL deployment, with your reverse proxy handling the
                public edge.
              </p>
              <Link href="/self-host" className={styles.primaryButton}>
                Explore self-hosting
                <ArrowIcon />
              </Link>
            </div>
            <div className={styles.deploymentPanel}>
              <div className={styles.deploymentHeader}>
                <span>Expected stack</span>
                <span>01—03</span>
              </div>
              <ol className={styles.deploymentList}>
                <li>
                  <span>01</span>
                  <div>
                    <strong>Pulse application</strong>
                    <p>Containerized web app and reporting surfaces.</p>
                  </div>
                  <i aria-hidden="true">APP</i>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>PostgreSQL</strong>
                    <p>Your analytics and operational data store.</p>
                  </div>
                  <i aria-hidden="true">DB</i>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Reverse proxy + TLS</strong>
                    <p>Your domain, certificates, and network controls.</p>
                  </div>
                  <i aria-hidden="true">EDGE</i>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className={styles.closingCta} aria-labelledby="closing-title">
          <div className={styles.closingContent}>
            <p className={styles.eyebrow}>The complete signal, without the black box</p>
            <h2 id="closing-title">See Pulse with a product story already in motion.</h2>
            <p>
              Review the private-preview status for analytics, acquisition, and uptime.
              No public signup, credentials, or live customer data.
            </p>
            <div className={styles.closingActions}>
              <Link href="/demo" className={styles.primaryButton}>
                Private preview
                <ArrowIcon />
              </Link>
              <Link href="/self-host" className={styles.secondaryButton}>
                Self-hosting details
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.footerBrand} aria-label="Pulse home">
            Pulse
            <span>Private product telemetry</span>
          </Link>
          <nav aria-label="Footer navigation">
            <Link href="/demo">Private preview</Link>
            <Link href="/self-host">Self-hosting</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
          </nav>
          <p>Analytics, uptime, and scoped reports on infrastructure you control.</p>
        </div>
      </footer>
    </div>
  );
}
