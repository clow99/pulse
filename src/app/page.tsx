'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { Button, Title } from '@velocityuikit/velocityui';
import {
  FadeIn,
  AnimatedCounter,
  StaggerContainer,
  StaggerItem,
} from '@/components/motion';

const features = [
  {
    title: 'Privacy-First',
    description:
      'No cookies, no IP tracking, no personal data collection. Fully GDPR, CCPA, and PECR compliant by design.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    color: '#0ea5e9',
  },
  {
    title: 'Real-Time Dashboard',
    description:
      'Watch traffic flow in as it happens. Pageviews, events, referrers, and geography update within seconds.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    color: '#22c55e',
  },
  {
    title: 'Multi-Site Tracking',
    description:
      'Manage unlimited websites under one organization. Each site gets a unique token with isolated data.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    color: '#f59e0b',
  },
  {
    title: 'Self-Hosted & Yours',
    description:
      'Deploy on your own infrastructure with Docker in under 5 minutes. Your data never leaves your servers.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
    color: '#ec4899',
  },
  {
    title: 'Featherweight Script',
    description:
      'Under 2KB tracking script that loads asynchronously. Zero impact on your Core Web Vitals scores.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    color: '#06b6d4',
  },
  {
    title: 'Custom Events',
    description:
      'Track clicks, form submissions, purchases, and any custom interaction with flexible event properties.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    color: '#1d4ed8',
  },
];

const steps = [
  {
    number: '1',
    title: 'Deploy with Docker',
    description: 'One command to spin up your entire analytics stack.',
  },
  {
    number: '2',
    title: 'Add the script',
    description: 'Drop a single line of code into your site.',
  },
  {
    number: '3',
    title: 'See your data',
    description: 'Traffic appears in your dashboard within seconds.',
  },
];

const barHeights = [35, 55, 42, 70, 58, 85, 65, 92, 78, 60, 88, 95, 72, 80, 68, 90, 75, 82];

const repositoryUrl = 'https://git.cameronlow.com/cam/pulse';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Why Pulse', href: '#why-pulse' },
  { label: 'How it works', href: '#how-it-works' },
];

const heroHighlights = [
  {
    title: 'Own the stack',
    description: 'Run analytics on infrastructure your team already trusts with a simple Docker setup.',
  },
  {
    title: 'Skip the cookie banner',
    description: 'Privacy-first tracking keeps compliance simpler without sacrificing useful reporting.',
  },
  {
    title: 'See the full picture',
    description: 'Pages, acquisition, technology, custom events, and uptime live in one focused dashboard.',
  },
];

const trustSignals = [
  { label: 'Deployment', value: 'Docker + Postgres' },
  { label: 'Privacy model', value: 'No cookies by default' },
  { label: 'Coverage', value: 'Analytics + events + uptime' },
];

const whyPulseCards = [
  {
    kicker: 'Own your data',
    title: 'Keep visitor analytics on infrastructure you control',
    description:
      'No third-party black box, no rerouting sensitive traffic through another vendor, and no tradeoff between privacy and visibility.',
  },
  {
    kicker: 'Useful on day one',
    title: 'Start with clean defaults, then layer on custom events',
    description:
      'Pulse gives you pages, referrers, technology, and real-time reporting out of the box, then grows with your product instrumentation.',
  },
  {
    kicker: 'Built for product teams',
    title: 'Understand growth, reliability, and behavior from one workspace',
    description:
      'Use one dashboard to answer what people saw, how they found you, what they clicked, and whether your site stayed up.',
  },
];

const comparisonRows = [
  {
    label: 'Data ownership',
    pulse: 'Stored on your infrastructure',
    typical: 'Shared with a hosted vendor',
  },
  {
    label: 'Consent complexity',
    pulse: 'Cookie-free defaults reduce friction',
    typical: 'Often requires a banner and extra setup',
  },
  {
    label: 'Time to first signal',
    pulse: 'Deploy and add one script',
    typical: 'Create account, configure project, wire exports',
  },
  {
    label: 'What you can monitor',
    pulse: 'Traffic, events, acquisition, uptime',
    typical: 'Often split across multiple tools',
  },
];

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Why Pulse', href: '#why-pulse' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Dashboard preview', href: '#dashboard-preview' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Create account', href: '/register' },
      { label: 'Sign in', href: '/login' },
      { label: 'Onboarding', href: '/onboarding' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Source code', href: repositoryUrl, external: true },
      { label: 'Deployment workflow', href: '#how-it-works' },
      { label: 'Overview section', href: '#features' },
    ],
  },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden', background: 'var(--pulse-bg-primary)' }}>
      {/* Navbar */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 2rem',
          backdropFilter: 'blur(16px)',
          background: 'rgba(10, 10, 15, 0.75)',
          borderBottom: '1px solid rgba(35, 35, 47, 0.6)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}
        >
          <Link href="/" aria-label="Pulse home" style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="/logo.png"
              alt="Pulse"
              width={120}
              height={32}
              priority
              style={{ height: 32, width: 'auto', objectFit: 'contain' }}
            />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="landing-nav-links"
        >
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="landing-nav-link">
              {item.label}
            </Link>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">Get Started</Button>
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="landing-hero">
        <div className="landing-hero-bg">
          <div className="landing-grid-bg" />
        </div>

        <motion.div className="landing-hero-content" style={{ y: heroY }}>
          <FadeIn direction="up" delay={0.1}>
            <div className="landing-badge">
              <span className="landing-badge-dot" />
              Analytics, events, and uptime for self-hosted teams
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.2}>
            <h1 className="landing-hero-title">
              Self-hosted analytics
              <br />
              <span className="landing-hero-title-accent">without the black box.</span>
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={0.35}>
            <p className="landing-hero-subtitle">
              Pulse gives your team real-time traffic, acquisition, technology,
              custom event, and uptime reporting from infrastructure you control.
              Keep the data, skip the cookies, and stay fast.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={0.5}>
            <div className="landing-hero-actions">
              <Link href="/register">
                <Button variant="primary" size="lg">Get Started Free</Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg">See setup</Button>
              </Link>
            </div>
            <p className="landing-hero-note">
              Free to self-host &middot; No credit card &middot; First data in minutes
            </p>
            <div className="landing-hero-highlights">
              {heroHighlights.map((highlight) => (
                <div key={highlight.title} className="landing-hero-highlight">
                  <div className="landing-hero-highlight-title">{highlight.title}</div>
                  <p className="landing-hero-highlight-description">{highlight.description}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </motion.div>

        <FadeIn direction="up" delay={0.65}>
          <div className="landing-hero-preview">
            <div className="landing-hero-preview-window">
              <div className="landing-mockup-titlebar">
                <div className="landing-mockup-dot" style={{ background: '#ff5f57' }} />
                <div className="landing-mockup-dot" style={{ background: '#febc2e' }} />
                <div className="landing-mockup-dot" style={{ background: '#28c840' }} />
                <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--pulse-text-secondary)' }}>
                  analytics.acme.io/overview
                </span>
              </div>
              <div className="landing-hero-dashboard">
                <div className="landing-hero-stats-row">
                  {[
                    { label: 'Visitors', value: '12,847', change: '+14.2%', positive: true },
                    { label: 'Pageviews', value: '38,291', change: '+8.7%', positive: true },
                    { label: 'Bounce Rate', value: '34.1%', change: '-2.3%', positive: true },
                    { label: 'Avg Duration', value: '2m 41s', change: '+6.1%', positive: true },
                  ].map((stat) => (
                    <div key={stat.label} className="landing-hero-stat">
                      <div className="landing-hero-stat-label">{stat.label}</div>
                      <div className="landing-hero-stat-value">{stat.value}</div>
                      <div
                        className="landing-hero-stat-change"
                        style={{ color: stat.positive ? 'var(--pulse-success)' : 'var(--pulse-danger)' }}
                      >
                        {stat.change}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="landing-hero-chart">
                  <div className="landing-hero-chart-header">
                    <span>Traffic Overview</span>
                    <span style={{ color: 'var(--pulse-text-secondary)' }}>Last 30 days</span>
                  </div>
                  <svg className="landing-hero-chart-svg" viewBox="0 0 800 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="heroChartFill1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="heroChartFill2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,160 C40,155 80,140 120,130 C160,120 200,100 240,95 C280,90 320,105 360,90 C400,75 440,55 480,50 C520,45 560,60 600,45 C640,30 680,25 720,30 C760,35 800,20 800,20 L800,200 L0,200 Z"
                      fill="url(#heroChartFill1)"
                    />
                    <path
                      d="M0,160 C40,155 80,140 120,130 C160,120 200,100 240,95 C280,90 320,105 360,90 C400,75 440,55 480,50 C520,45 560,60 600,45 C640,30 680,25 720,30 C760,35 800,20 800,20"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,175 C40,170 80,165 120,158 C160,150 200,140 240,135 C280,130 320,138 360,125 C400,112 440,100 480,95 C520,90 560,98 600,88 C640,78 680,72 720,75 C760,78 800,65 800,65 L800,200 L0,200 Z"
                      fill="url(#heroChartFill2)"
                    />
                    <path
                      d="M0,175 C40,170 80,165 120,158 C160,150 200,140 240,135 C280,130 320,138 360,125 C400,112 440,100 480,95 C520,90 560,98 600,88 C640,78 680,72 720,75 C760,78 800,65 800,65"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.9}>
          <div className="landing-hero-social">
            <div className="landing-hero-social-copy">
              <span style={{ fontSize: '0.75rem', color: 'var(--pulse-text-secondary)', opacity: 0.8 }}>
                Built for teams that want trustworthy product signals
              </span>
              <p className="landing-hero-social-text">
                Replace vague vendor promises with a setup you can inspect, host, and adapt.
              </p>
            </div>
            <div className="landing-trust-grid">
              {trustSignals.map((signal) => (
                <div key={signal.label} className="landing-trust-card">
                  <span className="landing-trust-card-label">{signal.label}</span>
                  <span className="landing-trust-card-value">{signal.value}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Stats Bar */}
      <section
        style={{
          padding: '4rem 2rem',
          borderTop: '1px solid var(--pulse-border)',
          borderBottom: '1px solid var(--pulse-border)',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <StaggerContainer>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {[
                { value: 0, label: 'Cookies Required', suffix: '' },
                { value: 5, label: 'Minutes to First Data', suffix: ' min' },
                { value: 100, label: 'Data Ownership', suffix: '%' },
                { value: 2, label: 'Script Size', suffix: 'KB', prefix: '<' },
              ].map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="landing-stat-card">
                    <div
                      style={{
                        fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        marginBottom: '0.25rem',
                        background: 'linear-gradient(135deg, var(--pulse-text-primary), var(--pulse-accent))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {stat.prefix ?? ''}
                      <AnimatedCounter
                        value={stat.value}
                        formatFn={(v) => Math.round(v).toLocaleString()}
                        duration={2}
                      />
                      {stat.suffix}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)' }}>
                      {stat.label}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '6rem 2rem', maxWidth: 1200, margin: '0 auto', scrollMarginTop: '6rem' }}>
        <FadeIn direction="up">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <Title level="h2" size="lg">
              Everything you need. Nothing you don&apos;t.
            </Title>
            <p
              style={{
                color: 'var(--pulse-text-secondary)',
                marginTop: '1rem',
                fontSize: '1.0625rem',
                maxWidth: 520,
                margin: '1rem auto 0',
                lineHeight: 1.6,
              }}
            >
              Built for teams that care about privacy and performance. Every feature designed with intention.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="landing-feature-card">
                  <div
                    className="landing-feature-icon"
                    style={{
                      background: `${feature.color}12`,
                      borderColor: `${feature.color}25`,
                    }}
                  >
                    <div style={{ color: feature.color, width: 24, height: 24, display: 'flex' }}>
                      {feature.icon}
                    </div>
                  </div>
                  <h3
                    style={{
                      fontSize: '1.0625rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: 'var(--pulse-text-primary)',
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    style={{
                      color: 'var(--pulse-text-secondary)',
                      fontSize: '0.875rem',
                      lineHeight: 1.65,
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard-preview" style={{ padding: '4rem 2rem 6rem', maxWidth: 1100, margin: '0 auto', scrollMarginTop: '6rem' }}>
        <FadeIn direction="up">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <Title level="h2" size="lg">
              A dashboard you&apos;ll actually enjoy using
            </Title>
            <p
              style={{
                color: 'var(--pulse-text-secondary)',
                marginTop: '1rem',
                fontSize: '1.0625rem',
                maxWidth: 500,
                margin: '1rem auto 0',
                lineHeight: 1.6,
              }}
            >
              Clean, fast, and focused. No clutter, no learning curve.
            </p>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.2}>
          <div className="landing-dashboard-mockup">
            <div className="landing-mockup-titlebar">
              <div className="landing-mockup-dot" style={{ background: '#ff5f57' }} />
              <div className="landing-mockup-dot" style={{ background: '#febc2e' }} />
              <div className="landing-mockup-dot" style={{ background: '#28c840' }} />
              <span
                style={{
                  marginLeft: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--pulse-text-secondary)',
                }}
              >
                analytics.acme.io/overview
              </span>
            </div>
            <div className="landing-mockup-content">
              <div className="landing-mockup-sidebar">
                <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--pulse-accent)' }}>
                    Pulse
                  </span>
                </div>
                {['Overview', 'Pages', 'Events', 'Acquisition', 'Technology'].map(
                  (item, i) => (
                    <div
                      key={item}
                      className={`landing-mockup-nav-item${i === 0 ? ' active' : ''}`}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: i === 0 ? 'var(--pulse-accent)' : 'var(--pulse-text-secondary)',
                          opacity: i === 0 ? 1 : 0.4,
                        }}
                      />
                      {item}
                    </div>
                  )
                )}
              </div>
              <div className="landing-mockup-main">
                <div className="landing-mockup-stats">
                  {[
                    { label: 'Visitors', value: '12,847', change: '+14.2%', positive: true },
                    { label: 'Pageviews', value: '38,291', change: '+8.7%', positive: true },
                    { label: 'Bounce Rate', value: '34.1%', change: '-2.3%', positive: true },
                  ].map((stat) => (
                    <div key={stat.label} className="landing-mockup-stat">
                      <div
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--pulse-text-secondary)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {stat.label}
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        {stat.value}
                      </div>
                      <div
                        style={{
                          fontSize: '0.6875rem',
                          color: stat.positive ? 'var(--pulse-success)' : 'var(--pulse-danger)',
                          marginTop: '0.125rem',
                        }}
                      >
                        {stat.change}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="landing-mockup-chart">
                  {barHeights.map((h, i) => (
                    <motion.div
                      key={i}
                      className="landing-mockup-bar"
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Why Pulse Section */}
      <section
        id="why-pulse"
        style={{
          padding: '0 2rem 6rem',
          maxWidth: 1100,
          margin: '0 auto',
          scrollMarginTop: '6rem',
        }}
      >
        <FadeIn direction="up">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <Title level="h2" size="lg">
              Built for teams that need signal, not surveillance
            </Title>
            <p
              style={{
                color: 'var(--pulse-text-secondary)',
                marginTop: '1rem',
                fontSize: '1.0625rem',
                maxWidth: 620,
                margin: '1rem auto 0',
                lineHeight: 1.6,
              }}
            >
              Pulse keeps your analytics stack simple: privacy-safe by default,
              self-hosted by design, and practical enough for engineers,
              marketers, and product teams to use together.
            </p>
          </div>
        </FadeIn>

        <div className="landing-why-grid">
          <FadeIn direction="up" delay={0.1}>
            <div className="landing-why-stack">
              {whyPulseCards.map((card) => (
                <div key={card.title} className="landing-why-card">
                  <span className="landing-why-card-kicker">{card.kicker}</span>
                  <h3 className="landing-why-card-title">{card.title}</h3>
                  <p className="landing-why-card-description">{card.description}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.2}>
            <div className="landing-comparison-card">
              <div className="landing-comparison-title">
                Pulse vs typical hosted analytics
              </div>
              <div className="landing-comparison-table">
                <div className="landing-comparison-row landing-comparison-row--head">
                  <span className="landing-comparison-cell">Category</span>
                  <span className="landing-comparison-cell">Pulse</span>
                  <span className="landing-comparison-cell">Typical hosted tool</span>
                </div>
                {comparisonRows.map((row) => (
                  <div key={row.label} className="landing-comparison-row">
                    <span className="landing-comparison-cell landing-comparison-cell-label">{row.label}</span>
                    <span className="landing-comparison-cell">{row.pulse}</span>
                    <span className="landing-comparison-cell">{row.typical}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        style={{
          padding: '6rem 2rem',
          borderTop: '1px solid var(--pulse-border)',
          scrollMarginTop: '6rem',
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn direction="up">
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <Title level="h2" size="lg">
                Up and running in minutes
              </Title>
              <p
                style={{
                  color: 'var(--pulse-text-secondary)',
                  marginTop: '1rem',
                  fontSize: '1.0625rem',
                  lineHeight: 1.6,
                }}
              >
                Three steps. No configuration headaches.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '3rem' }}>
            {steps.map((step, i) => (
              <FadeIn key={step.number} direction="up" delay={i * 0.1}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    background: 'var(--pulse-bg-card)',
                    border: '1px solid var(--pulse-border)',
                    borderRadius: 16,
                    padding: '1.5rem 2rem',
                  }}
                >
                  <div className="landing-step-number">{step.number}</div>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.0625rem',
                        fontWeight: 600,
                        marginBottom: '0.25rem',
                      }}
                    >
                      {step.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)', lineHeight: 1.5 }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn direction="up" delay={0.3}>
            <div className="landing-code-window">
              <div className="landing-code-header">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
                <span style={{ marginLeft: '0.5rem' }}>your-website.html</span>
              </div>
              <div className="landing-code-body">
                <div>
                  <span style={{ color: '#8888a0' }}>&lt;!-- Add this before &lt;/head&gt; --&gt;</span>
                </div>
                <div>
                  <span style={{ color: '#c792ea' }}>&lt;script</span>
                </div>
                <div style={{ paddingLeft: '1.5rem' }}>
                  <span style={{ color: '#82aaff' }}>defer</span>
                </div>
                <div style={{ paddingLeft: '1.5rem' }}>
                  <span style={{ color: '#82aaff' }}>data-domain</span>
                  <span style={{ color: '#89ddff' }}>=</span>
                  <span style={{ color: '#c3e88d' }}>&quot;yourdomain.com&quot;</span>
                </div>
                <div style={{ paddingLeft: '1.5rem' }}>
                  <span style={{ color: '#82aaff' }}>src</span>
                  <span style={{ color: '#89ddff' }}>=</span>
                  <span style={{ color: '#c3e88d' }}>&quot;https://pulse.yourdomain.com/js/script.js&quot;</span>
                </div>
                <div>
                  <span style={{ color: '#c792ea' }}>&gt;&lt;/script&gt;</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="landing-cta-section"
        style={{
          padding: '6rem 2rem',
          textAlign: 'center',
          borderTop: '1px solid var(--pulse-border)',
        }}
      >
        <FadeIn direction="up">
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                marginBottom: '1.25rem',
              }}
            >
              <span style={{ color: 'var(--pulse-text-primary)' }}>Ready to own </span>
              <span
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #22d3ee)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                your analytics?
              </span>
            </h2>
            <p
              style={{
                color: 'var(--pulse-text-secondary)',
                fontSize: '1.0625rem',
                lineHeight: 1.6,
                marginBottom: '2.5rem',
              }}
            >
              Launch a privacy-first analytics stack your team can inspect,
              control, and extend without adding another hosted dependency.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register">
                <Button variant="primary" size="lg">Get Started Free</Button>
              </Link>
              <Link
                href={repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg">View source</Button>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '3rem 2rem 2rem',
          borderTop: '1px solid var(--pulse-border)',
        }}
      >
        <div className="landing-footer-grid" style={{ padding: '0 0 2rem' }}>
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <Link href="/" aria-label="Pulse home" style={{ display: 'inline-flex' }}>
                <Image
                  src="/logo.png"
                  alt="Pulse"
                  width={104}
                  height={28}
                  style={{ height: 28, width: 'auto', objectFit: 'contain' }}
                />
              </Link>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--pulse-text-secondary)', lineHeight: 1.6, maxWidth: 280 }}>
              Open-source, self-hosted web analytics. Built for developers who value privacy.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--pulse-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {footerSections[0].title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {footerSections[0].links.map((item) => (
                <Link key={item.label} href={item.href} style={{ fontSize: '0.8125rem', color: 'var(--pulse-text-secondary)' }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--pulse-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {footerSections[1].title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {footerSections[1].links.map((item) => (
                <Link key={item.label} href={item.href} style={{ fontSize: '0.8125rem', color: 'var(--pulse-text-secondary)' }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--pulse-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {footerSections[2].title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {footerSections[2].links.map((item) => (
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8125rem', color: 'var(--pulse-text-secondary)' }}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.label} href={item.href} style={{ fontSize: '0.8125rem', color: 'var(--pulse-text-secondary)' }}>
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--pulse-border)',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--pulse-text-secondary)',
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          Pulse Analytics &mdash; Open Source, Self-Hosted Web Analytics
        </div>
      </footer>
    </div>
  );
}
