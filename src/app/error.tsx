'use client';

import { Button, Title, Alert } from '@velocityuikit/velocityui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <Title level="h1" size="lg">
        Something went wrong
      </Title>
      <Alert variant="danger" style={{ maxWidth: 500 }}>
        {error.message || 'An unexpected error occurred'}
      </Alert>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
