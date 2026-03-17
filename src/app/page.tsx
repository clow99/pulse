'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button, Title } from '@velocityuikit/velocityui';
import dynamic from 'next/dynamic';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';

const GlobeVisualization = dynamic(
  () => import('@/components/three/GlobeVisualization').then((m) => ({ default: m.GlobeScene })),
  { ssr: false }
);

const features = [
  {
    title: 'Privacy-First',
    description: 'No cookies, no IP tracking, no personal data. Fully GDPR compliant by design.',
  },
  {
    title: 'Real-Time Data',
    description: 'See your traffic as it happens. Pageviews, events, and referrers update instantly.',
  },
  {
    title: 'Multi-Site Support',
    description: 'Track unlimited websites under one organization with unique site tokens.',
  },
  {
    title: 'Self-Hosted',
    description: 'Own your data completely. Deploy with Docker in minutes on any infrastructure.',
  },
  {
    title: 'Lightweight Script',
    description: 'Under 2KB tracker script that won\'t slow down your site. No third-party requests.',
  },
  {
    title: 'Custom Events',
    description: 'Track button clicks, form submissions, and any custom interaction with properties.',
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        backdropFilter: 'blur(12px)',
        background: 'rgba(10, 10, 15, 0.8)',
        borderBottom: '1px solid var(--pulse-border)',
      }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Title level="h1" size="sm" color="primary">
            Pulse
          </Title>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', gap: '0.75rem' }}
        >
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">Get Started</Button>
          </Link>
        </motion.div>
      </nav>

      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6rem 2rem 4rem',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          pointerEvents: 'none',
        }}>
          <GlobeVisualization />
        </div>

        <div style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: 720,
        }}>
          <FadeIn direction="up" delay={0.1}>
            <div style={{
              display: 'inline-block',
              padding: '0.375rem 1rem',
              borderRadius: '9999px',
              border: '1px solid var(--pulse-border)',
              fontSize: '0.8125rem',
              color: 'var(--pulse-text-secondary)',
              marginBottom: '1.5rem',
              background: 'rgba(99, 102, 241, 0.08)',
            }}>
              Open Source &middot; Self-Hosted &middot; Privacy-First
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.2}>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, #f0f0f5 0%, #6366f1 50%, #22c55e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Analytics that respect your users
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={0.35}>
            <p style={{
              fontSize: '1.125rem',
              color: 'var(--pulse-text-secondary)',
              lineHeight: 1.7,
              maxWidth: 560,
              margin: '0 auto 2.5rem',
            }}>
              Pulse is a lightweight, self-hosted analytics platform that gives you
              the insights you need without compromising your visitors&apos; privacy.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={0.5}>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register">
                <Button variant="primary" size="lg">Start Tracking</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">View Demo</Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <section style={{
        padding: '4rem 2rem 6rem',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <FadeIn direction="up">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <Title level="h2" size="lg">
              Everything you need. Nothing you don&apos;t.
            </Title>
            <p style={{
              color: 'var(--pulse-text-secondary)',
              marginTop: '0.75rem',
              fontSize: '1rem',
            }}>
              Simple, powerful, and built for teams that care about privacy.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}>
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  style={{
                    background: 'var(--pulse-bg-card)',
                    border: '1px solid var(--pulse-border)',
                    borderRadius: 12,
                    padding: '1.5rem',
                    height: '100%',
                  }}
                >
                  <h3 style={{
                    fontSize: '1.0625rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: 'var(--pulse-text-primary)',
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    color: 'var(--pulse-text-secondary)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                  }}>
                    {feature.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </section>

      <section style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        borderTop: '1px solid var(--pulse-border)',
      }}>
        <FadeIn direction="up">
          <Title level="h2" size="md">
            Ready to take control of your analytics?
          </Title>
          <p style={{
            color: 'var(--pulse-text-secondary)',
            marginTop: '0.75rem',
            marginBottom: '2rem',
          }}>
            Deploy Pulse in minutes. No credit card required.
          </p>
          <Link href="/register">
            <Button variant="primary" size="lg">Get Started Free</Button>
          </Link>
        </FadeIn>
      </section>

      <footer style={{
        padding: '1.5rem 2rem',
        textAlign: 'center',
        borderTop: '1px solid var(--pulse-border)',
        color: 'var(--pulse-text-secondary)',
        fontSize: '0.8125rem',
      }}>
        Pulse Analytics &mdash; Open Source, Self-Hosted Web Analytics
      </footer>
    </div>
  );
}
