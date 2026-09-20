import Link from 'next/link';
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(180deg, var(--pulse-bg-primary) 0%, var(--pulse-bg-secondary) 100%)`,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '1.5rem',
          position: 'relative',
        }}
      >
        {children}
        <p className="pulse-auth-notice">Account and provider information is used to sign you in. Read the <Link href="/privacy">privacy notice</Link> and <Link href="/terms">terms</Link> before continuing. <Link href="/accessibility">Accessibility help</Link>.</p>
      </div>
    </div>
  );
}
