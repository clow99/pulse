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
  const callbackUrl = searchParams.get('callbackUrl') || '/overview';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <Alert variant="danger">{error}</Alert>
            )}
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              error={fieldErrors.email}
            />
            <Input
              type="password"
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
