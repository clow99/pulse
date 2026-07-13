'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Input,
  Button,
  Card,
  Alert,
  Title,
} from '@velocityuikit/velocityui';
import { registerSchema } from '@/lib/validation';

type FieldKey = 'name' | 'email' | 'password' | 'confirmPassword';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const errors: Partial<Record<FieldKey, string>> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0] as FieldKey;
        if (path && !errors[path]) {
          errors[path] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (result?.error) {
        router.push('/login');
        router.refresh();
        return;
      }

      router.push('/portfolio');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    await signIn('google', { callbackUrl: '/portfolio' });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card variant="shadow">
        <Card.Header>
          <Title level="h2" size="md">
            Create your account
          </Title>
          <p style={{ marginTop: '0.5rem', color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
            Get started with Pulse analytics
          </p>
        </Card.Header>
        <Card.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <Alert variant="danger">{error}</Alert>
            )}
            <Button
              variant="secondary"
              fullWidth
              loading={googleLoading}
              onClick={handleGoogleSignIn}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--pulse-text-secondary)',
              fontSize: '0.8125rem',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--pulse-border)' }} />
              or
              <div style={{ flex: 1, height: '1px', background: 'var(--pulse-border)' }} />
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <motion.div custom={0} variants={containerVariants} initial="hidden" animate="visible">
                <Input
                  type="text"
                  autoComplete="name"
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  required
                  error={fieldErrors.name}
                />
              </motion.div>
              <motion.div custom={1} variants={containerVariants} initial="hidden" animate="visible">
                <Input
                  type="email"
                  autoComplete="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                  error={fieldErrors.email}
                />
              </motion.div>
              <motion.div custom={2} variants={containerVariants} initial="hidden" animate="visible">
                <Input
                  type="password"
                  autoComplete="new-password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  error={fieldErrors.password}
                />
              </motion.div>
              <motion.div custom={3} variants={containerVariants} initial="hidden" animate="visible">
                <Input
                  type="password"
                  autoComplete="new-password"
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  required
                  error={fieldErrors.confirmPassword}
                />
              </motion.div>
              <motion.div custom={4} variants={containerVariants} initial="hidden" animate="visible">
                <Button type="submit" variant="primary" fullWidth loading={loading}>
                  Create account
                </Button>
              </motion.div>
            </form>
          </div>
        </Card.Body>
        <Card.Footer>
          <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--pulse-accent)', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </motion.div>
  );
}
