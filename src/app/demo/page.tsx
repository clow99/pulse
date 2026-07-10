import Link from 'next/link';

const demoSignals = [
  ['Visitors', '12,847'],
  ['AI-source visits', '436'],
  ['Tracked revenue', '$18,420'],
  ['Uptime', '99.98%'],
  ['Active insights', '6'],
  ['Funnels', '3'],
];

const demoWorkflows = [
  'Review traffic, acquisition, and AI assistant sources.',
  'Inspect conversion recipes, goals, funnels, and revenue attribution.',
  'Check uptime incidents, web vitals, alert channels, and status pages.',
  'Create an agent token and request multi-report MCP data.',
];

export default function DemoPage() {
  return (
    <main className="pulse-public-page">
      <section className="pulse-public-hero">
        <p className="pulse-eyebrow">Live product demo</p>
        <h1 className="pulse-public-title">Evaluate Pulse before installing it.</h1>
        <p className="pulse-page-subtitle">
          Seeded demo data is available locally with <code>npm run db:seed</code>. Use the demo account to inspect analytics, funnels, revenue, uptime, insights, and agent reports.
        </p>
        <div className="pulse-public-actions">
          <Link href="/login">
            <span className="pulse-public-button primary">Open Demo Login</span>
          </Link>
          <Link href="/pricing">
            <span className="pulse-public-button secondary">Compare Offers</span>
          </Link>
        </div>
      </section>

      <section className="pulse-demo-panel">
        <div>
          <h2>Demo credentials</h2>
          <p>Email: <code>demo@pulse.dev</code></p>
          <p>Password: <code>password123</code></p>
        </div>
        <div className="pulse-public-metric-grid">
          {demoSignals.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="pulse-demo-workflows">
        {demoWorkflows.map((workflow, index) => (
          <article key={workflow}>
            <span>{index + 1}</span>
            <p>{workflow}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
