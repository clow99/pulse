export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--pulse-bg-primary)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid var(--pulse-border)',
          borderTopColor: 'var(--pulse-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}
