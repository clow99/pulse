'use client';

import Link from 'next/link';
import { Button, Title } from '@velocityuikit/velocityui';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--pulse-bg-primary)',
        gap: '1.5rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '5rem',
          fontWeight: 800,
          color: 'var(--pulse-accent)',
          opacity: 0.3,
          lineHeight: 1,
        }}
      >
        404
      </div>
      <Title level="h1" size="lg">
        Page not found
      </Title>
      <p style={{ color: 'var(--pulse-text-secondary)', maxWidth: 400 }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/">
        <Button variant="primary">Go Home</Button>
      </Link>
    </div>
  );
}
