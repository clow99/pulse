'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Input,
  Button,
  Card,
  Alert,
  Title,
} from '@velocityuikit/velocityui';
import { loginSchema } from '@/lib/validation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/portfolio';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: { email?: string; password?: string } = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof typeof errors;
        if (path && !errors[path]) {
          errors[path] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    const result = await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    await signIn('google', { callbackUrl });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card variant="shadow">
        <Card.Header>
          <Title level="h2" size="md">
            Welcome back
          </Title>
          <p style={{ marginTop: '0.5rem', color: 'var(--pulse-text-secondary)', fontSize: '0.875rem' }}>
            Sign in to your account to continue
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
                <Input
                  type="password"
                  autoComplete="current-password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                error={fieldErrors.password}
              />
              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Sign in
              </Button>
            </form>
          </div>
        </Card.Body>
        <Card.Footer>
          <p style={{ fontSize: '0.875rem', color: 'var(--pulse-text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--pulse-accent)', fontWeight: 500 }}>
              Sign up
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </motion.div>
  );
}
