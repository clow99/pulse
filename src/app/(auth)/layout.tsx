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
      </div>
    </div>
  );
}
