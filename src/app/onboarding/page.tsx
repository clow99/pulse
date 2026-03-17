'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Input,
  Button,
  Card,
  Alert,
  Title,
  Stepper,
} from '@velocityuikit/velocityui';
import { FadeIn } from '@/components/motion';
import { createOrgSchema, createSiteSchema } from '@/lib/validation';
import { generateSlug } from '@/lib/slugify';

const STEPS = [
  { label: 'Create Organization' },
  { label: 'Add Your First Site' },
  { label: 'Install Tracker' },
  { label: 'Verify Installation' },
];

const PARTICLE_COUNT = 40;

function CelebrationBurst() {
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 120;
    const size = 4 + Math.random() * 6;
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    return (
      <motion.div
        key={i}
        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        animate={{
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          scale: 0,
          opacity: 0,
        }}
        transition={{
          duration: 0.8 + Math.random() * 0.4,
          ease: 'easeOut',
          delay: Math.random() * 0.15,
        }}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
    );
  });

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {particles}
    </div>
  );
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgId, setOrgId] = useState('');

  const [siteName, setSiteName] = useState('');
  const [siteDomain, setSiteDomain] = useState('');
  const [siteId, setSiteId] = useState('');
  const [siteToken, setSiteToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setOrgSlug(generateSlug(orgName));
  }, [orgName]);

  const goForward = useCallback(() => {
    setDirection(1);
    setCurrentStep((s) => s + 1);
    setError(null);
    setFieldErrors({});
  }, []);

  const goBack = () => {
    setDirection(-1);
    setCurrentStep((s) => s - 1);
    setError(null);
    setFieldErrors({});
  };

  async function handleCreateOrg() {
    setError(null);
    setFieldErrors({});

    const parsed = createOrgSchema.safeParse({ name: orgName, slug: orgSlug });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = String(issue.path[0]);
        if (!errs[path]) errs[path] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, slug: orgSlug }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create organization');
        return;
      }

      setOrgId(data.id);
      goForward();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSite() {
    setError(null);
    setFieldErrors({});

    const parsed = createSiteSchema.safeParse({ name: siteName, domain: siteDomain });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = String(issue.path[0]);
        if (!errs[path]) errs[path] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siteName, domain: siteDomain, orgId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create site');
        return;
      }

      setSiteId(data.id);
      setSiteToken(data.token);
      goForward();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleCopySnippet() {
    const snippet = `<script defer data-token="${siteToken}" src="https://your-pulse-instance.com/t.js"></script>`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (currentStep !== 3 || !siteId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sites/check?siteId=${siteId}`);
        const data = await res.json();
        if (data.hasData) {
          setVerified(true);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // continue polling
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentStep, siteId]);

  useEffect(() => {
    if (!verified) return;
    const timeout = setTimeout(() => {
      router.push('/overview');
      router.refresh();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [verified, router]);

  const snippet = `<script defer data-token="${siteToken}" src="https://your-pulse-instance.com/t.js"></script>`;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Title level="h1" size="lg" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
          {session?.user?.name ? `Welcome, ${session.user.name}` : 'Welcome to Pulse'}
        </Title>
        <p style={{ textAlign: 'center', color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
          Let&apos;s get your analytics up and running
        </p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Stepper steps={STEPS} currentStep={currentStep} orientation="horizontal" variant="default" />
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {currentStep === 0 && (
            <Card variant="shadow">
              <Card.Header>
                <Title level="h2" size="md">Create Organization</Title>
                <p style={{ marginTop: '0.5rem', color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                  Organizations group your sites and team members
                </p>
              </Card.Header>
              <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {error && <Alert variant="danger">{error}</Alert>}
                  <FadeIn delay={0.05}>
                    <Input
                      label="Organization Name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      fullWidth
                      error={fieldErrors.name}
                    />
                  </FadeIn>
                  <FadeIn delay={0.1}>
                    <Input
                      label="Slug"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value)}
                      fullWidth
                      error={fieldErrors.slug}
                    />
                  </FadeIn>
                </div>
              </Card.Body>
              <Card.Footer>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" onClick={handleCreateOrg} loading={loading}>
                    Continue
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          )}

          {currentStep === 1 && (
            <Card variant="shadow">
              <Card.Header>
                <Title level="h2" size="md">Add Your First Site</Title>
                <p style={{ marginTop: '0.5rem', color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                  Enter the website you want to track
                </p>
              </Card.Header>
              <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {error && <Alert variant="danger">{error}</Alert>}
                  <FadeIn delay={0.05}>
                    <Input
                      label="Site Name"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      fullWidth
                      error={fieldErrors.name}
                    />
                  </FadeIn>
                  <FadeIn delay={0.1}>
                    <Input
                      label="Domain"
                      placeholder="example.com"
                      value={siteDomain}
                      onChange={(e) => setSiteDomain(e.target.value)}
                      fullWidth
                      error={fieldErrors.domain}
                    />
                  </FadeIn>
                </div>
              </Card.Body>
              <Card.Footer>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="ghost" onClick={goBack}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={handleCreateSite} loading={loading}>
                    Continue
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          )}

          {currentStep === 2 && (
            <Card variant="shadow">
              <Card.Header>
                <Title level="h2" size="md">Install Tracker</Title>
                <p style={{ marginTop: '0.5rem', color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                  Add this snippet to your website&apos;s {`<head>`} tag
                </p>
              </Card.Header>
              <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <FadeIn delay={0.05}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--pulse-text-secondary)' }}>
                        Your site token
                      </span>
                      <div
                        style={{
                          marginTop: '0.25rem',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: 'var(--pulse-bg-primary)',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '0.8125rem',
                          color: 'var(--pulse-accent)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {siteToken}
                      </div>
                    </div>
                  </FadeIn>
                  <FadeIn delay={0.1}>
                    <div className="pulse-code-block" style={{ position: 'relative' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8125rem' }}>
                        <code>{snippet}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySnippet}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </FadeIn>
                </div>
              </Card.Body>
              <Card.Footer>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="ghost" onClick={goBack}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={goForward}>
                    Continue
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          )}

          {currentStep === 3 && (
            <Card variant="shadow">
              <Card.Header>
                <Title level="h2" size="md">Verify Installation</Title>
                <p style={{ marginTop: '0.5rem', color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                  {verified
                    ? 'Your tracker is working. Redirecting to your dashboard...'
                    : 'Visit your website to send a test pageview'}
                </p>
              </Card.Header>
              <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 0' }}>
                  {!verified ? (
                    <FadeIn delay={0.05}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.6, 1, 0.6],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            backgroundColor: 'var(--pulse-accent)',
                          }}
                        />
                        <p style={{ color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
                          Waiting for first pageview...
                        </p>
                      </div>
                    </FadeIn>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                      }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
                    >
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CelebrationBurst />
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                          style={{
                            position: 'absolute',
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '2rem',
                            fontWeight: 'bold',
                          }}
                        >
                          &#10003;
                        </motion.div>
                      </div>
                      <Title level="h3" size="sm">Tracking Confirmed</Title>
                    </motion.div>
                  )}
                </div>
              </Card.Body>
              {!verified && (
                <Card.Footer>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button variant="ghost" onClick={goBack}>
                      Back
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        router.push('/overview');
                        router.refresh();
                      }}
                    >
                      Skip for now
                    </Button>
                  </div>
                </Card.Footer>
              )}
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
