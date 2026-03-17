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

      router.push('/overview');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <Alert variant="danger">{error}</Alert>
            )}
            <motion.div custom={0} variants={containerVariants} initial="hidden" animate="visible">
              <Input
                type="text"
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
