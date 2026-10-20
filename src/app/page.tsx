import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { ProductTour } from '@/components/landing/ProductTour';
import { AgentExample } from '@/components/landing/AgentExample';
import { DashboardIcon } from '@/components/dashboard/DashboardIcon';
import styles from '@/components/landing/landing.module.css';

export const metadata: Metadata = {
  title: 'Pulse — Know your traffic. See the whole picture.',
  description:
    'Privacy-first web analytics, uptime monitoring, and AI-source attribution. Explore Pulse and its private-preview availability.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Pulse',
    title: 'Pulse — Know your traffic. See the whole picture.',
    description:
      'Analytics, reliability, and scoped agent reports in one focused workspace.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Pulse privacy-first analytics dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pulse — Know your traffic. See the whole picture.',
    description: 'Privacy-first analytics, uptime, and AI-source attribution.',
    images: ['/opengraph-image'],
  },
};

const features = [
  {
    icon: 'acquisition',
    number: '01',
    title: 'Understand the journey.',
    description:
      'Follow visitors from their first referral to the pages, events, and goals that matter.',
    details: [
      'Referrers, campaigns, and AI sources',
      'Custom events, goals, and funnels',
      'Revenue attribution by channel',
    ],
  },
  {
    icon: 'uptime',
    number: '02',
    title: 'Keep an eye on the experience.',
    description:
      'Bring availability and performance into the same workspace as your audience.',
    details: [
      'Uptime and response-time history',
      'Incidents and notification channels',
      'Optional Core Web Vitals collection',
    ],
  },
  {
    icon: 'insights',
    number: '03',
    title: 'Put your reports to work.',
    description:
      'Share the right context with your team, your tools, and the agents you choose.',
    details: [
      'CSV and JSON report exports',
      'Read-only, shareable reports',
      'Scoped REST and MCP access',
    ],
  },
];

const questions = [
  {
    question: 'Can I use Pulse today?',
    answer: (
      <>
        Pulse is currently in private preview. Evaluation access is
        invitation-only, with no public signup or checkout.{' '}
        <Link href="/demo">Read the access details</Link>, or{' '}
        <Link href="/login">sign in</Link> if you already have an account.
      </>
    ),
  },
  {
    question: 'Does Pulse use tracking cookies?',
    answer: (
      <>
        The first-party tracker does not set visitor cookies by default and
        respects Do Not Track. It uses a temporary visit identifier in session
        storage to connect pageviews within a visit. Dashboard authentication is
        separate from visitor tracking.
      </>
    ),
  },
  {
    question: 'Can I host Pulse on my own infrastructure?',
    answer: (
      <>
        A self-managed release is being prepared around Docker and PostgreSQL.
        You operate the database, backups, reverse proxy, and scheduler. The
        release is coming soon;{' '}
        <Link href="/self-host">review the expected setup</Link> before planning
        an installation.
      </>
    ),
  },
  {
    question: 'What can an external AI agent access?',
    answer: (
      <>
        Agents use revocable tokens with explicit report scopes and can be
        limited to a single site. REST and MCP report access does not give an
        agent direct database access. Supported report requests are recorded in
        the agent audit log.
      </>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className={styles.landingShell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <LandingHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.heroBadge}>
              <span />
              Privacy-first web analytics
              <span className={styles.badgeDivider}>/</span>Private preview
            </p>
            <h1 id="hero-title">
              Know your traffic.
              <br />
              <span>See the whole picture.</span>
            </h1>
            <p className={styles.heroDescription}>
              Understand who finds you, what they do, and how your site
              performs. Analytics, uptime, and AI-source attribution in one
              focused workspace.
            </p>
            <div className={styles.heroActions}>
              <a href="#product" className={styles.primaryButton}>
                Explore the product
                <DashboardIcon name="arrow" />
              </a>
              <Link href="/demo" className={styles.secondaryButton}>
                Private-preview details
              </Link>
            </div>
            <p className={styles.heroNote}>
              Cookie-free tracking. Your infrastructure. A clearer view.
            </p>
          </div>
          <div id="product" className={styles.tourAnchor}>
            <ProductTour />
          </div>
        </section>

        <section
          className={styles.foundationStrip}
          aria-label="Pulse foundations"
        >
          <span>
            <DashboardIcon name="overview" />
            Cookie-free by default
          </span>
          <span>
            <DashboardIcon name="settings" />
            Built for your infrastructure
          </span>
          <span>
            <DashboardIcon name="events" />
            Analytics + reliability
          </span>
          <span>
            <DashboardIcon name="insights" />
            Ready for your agents
          </span>
        </section>

        <section
          className={styles.featuresSection}
          aria-labelledby="features-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>
              Less switching. More understanding.
            </p>
            <h2 id="features-title">
              From the first visit
              <br />
              to the next decision.
            </h2>
            <p>
              Bring the reports you check every day into one place, with the
              context to connect them.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {features.map((feature) => (
              <article key={feature.number} className={styles.feature}>
                <div className={styles.featureTop}>
                  <span className={styles.featureIcon}>
                    <DashboardIcon name={feature.icon} width={23} height={23} />
                  </span>
                  <span>{feature.number}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul>
                  {feature.details.map((detail) => (
                    <li key={detail}>
                      <span aria-hidden="true">✓</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          id="privacy"
          className={styles.privacySection}
          aria-labelledby="privacy-title"
        >
          <div className={styles.privacyIntro}>
            <p className={styles.eyebrow}>Privacy is part of the foundation</p>
            <h2 id="privacy-title">
              Your analytics.
              <br />
              <span>Your ground rules.</span>
            </h2>
            <p>
              Useful product data should come with clear boundaries. Pulse keeps
              collection deliberate and access under your control.
            </p>
            <Link href="/self-host" className={styles.textLink}>
              Explore the self-managed approach
              <DashboardIcon name="arrow" />
            </Link>
          </div>
          <div className={styles.privacyPrinciples}>
            <article>
              <span>01</span>
              <div>
                <h3>No visitor tracking cookies by default.</h3>
                <p>
                  The first-party tracker uses a temporary visit identifier in
                  session storage, rather than setting visitor cookies.
                </p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Respect a visitor’s choice.</h3>
                <p>
                  The tracker respects Do Not Track. Core Web Vitals collection
                  is optional.
                </p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Control where your data lives.</h3>
                <p>
                  The self-managed architecture uses your PostgreSQL database
                  and infrastructure. The public release is coming soon.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section
          id="agents"
          className={styles.agentSection}
          aria-labelledby="agents-title"
        >
          <div className={styles.agentCopy}>
            <p className={styles.eyebrow}>
              A better starting point for your agents
            </p>
            <h2 id="agents-title">
              Give them context.
              <br />
              <span>Keep control.</span>
            </h2>
            <p>
              Let your agent work with analytics and uptime reports through REST
              or MCP. Choose the site, grant the report scopes it needs, and
              revoke access when you’re done.
            </p>
            <div className={styles.agentTags}>
              <span>Site-scoped tokens</span>
              <span>Read-only reports</span>
              <span>Audited requests</span>
            </div>
            <a className={styles.textLink} href="#questions">
              How agent access works
              <DashboardIcon name="arrow" />
            </a>
          </div>
          <AgentExample />
        </section>

        <section
          id="self-hosting"
          className={styles.accessSection}
          aria-labelledby="access-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Where Pulse is today</p>
            <h2 id="access-title">
              A focused product.
              <br />A considered rollout.
            </h2>
            <p>
              Pulse is in private preview. Here’s what that means for access and
              self-hosting.
            </p>
          </div>
          <div className={styles.accessGrid}>
            <article className={styles.accessCard}>
              <span className={styles.accessLabel}>
                <i />
                Invitation-only
              </span>
              <h3>Private preview</h3>
              <p>
                Evaluation access is coordinated privately with invited
                participants. Public signup, fixed-price plans, and checkout are
                not available.
              </p>
              <Link href="/demo" className={styles.secondaryButton}>
                Read access details
                <DashboardIcon name="arrow" />
              </Link>
              <Link href="/login" className={styles.subtleLink}>
                Already invited? Sign in ↗
              </Link>
            </article>
            <article className={styles.accessCard}>
              <span className={`${styles.accessLabel} ${styles.comingSoon}`}>
                Coming soon
              </span>
              <h3>Self-managed release</h3>
              <p>
                A deployment model built around Docker, PostgreSQL, and your own
                domain. Review the expected architecture and operational
                requirements.
              </p>
              <Link href="/self-host" className={styles.secondaryButton}>
                Explore self-hosting
                <DashboardIcon name="arrow" />
              </Link>
              <Link href="/pricing" className={styles.subtleLink}>
                Review evaluation options ↗
              </Link>
            </article>
          </div>
        </section>

        <section
          id="questions"
          className={styles.faqSection}
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.eyebrow}>A few useful answers</p>
            <h2 id="faq-title">
              Before you
              <br />
              take a closer look.
            </h2>
          </div>
          <div className={styles.faqList}>
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <div className={styles.faqAnswer}>{answer}</div>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.closingCta} aria-labelledby="closing-title">
          <div>
            <p className={styles.eyebrow}>The signal is all here</p>
            <h2 id="closing-title">Make room for a clearer view.</h2>
            <p>
              Explore the reports. Understand the approach. See where Pulse
              fits.
            </p>
          </div>
          <a className={styles.primaryButton} href="#product">
            Take another look
            <DashboardIcon name="arrow" />
          </a>
        </section>
      </main>
      <footer id="landing-footer" className={styles.footer}>
        <div className={styles.footerTop}>
          <Link href="/" className={styles.footerBrand}>
            Pulse<span>Web analytics with perspective.</span>
          </Link>
          <nav aria-label="Footer navigation">
            <a href="#product">Product</a>
            <a href="#privacy">Privacy</a>
            <Link href="/self-host">Self-hosting</Link>
            <Link href="/pricing">Evaluation options</Link>
            <Link href="/login">Sign in</Link>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>Analytics, reliability, and agent reports.</span>
          <Link href="/demo">
            <span className={styles.footerDot} />
            Currently in private preview
          </Link>
        </div>
      </footer>
    </div>
  );
}
