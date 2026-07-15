import Link from 'next/link';

const plans = [
  {
    name: 'Self-managed preview',
    availability: 'Private preview',
    audience: 'For invited operators evaluating Pulse on infrastructure they control.',
    features: ['Docker + Postgres deployment', 'Cookie-free web analytics', 'Goals, funnels, revenue, uptime', 'Private-preview evaluation access'],
  },
  {
    name: 'Managed preview',
    availability: 'Private preview',
    audience: 'For invited operators evaluating a hosted Pulse environment.',
    features: ['Hosted tracker and database', 'Conversion recipes', 'Uptime monitoring', 'Agent-ready reports'],
  },
];

export default function PricingPage() {
  return (
    <main className="pulse-public-page">
      <section className="pulse-public-hero">
        <p className="pulse-eyebrow">Private preview</p>
        <h1 className="pulse-public-title">Evaluate self-managed or hosted Pulse privately.</h1>
        <p className="pulse-page-subtitle">
          Public purchasing is not available. Preview scope, capacity, support, and any future pricing are reviewed directly with invited participants.
        </p>
      </section>

      <section className="pulse-pricing-grid">
        {plans.map((plan) => (
          <article key={plan.name} className="pulse-pricing-card">
            <div>
              <h2>{plan.name}</h2>
              <strong>{plan.availability}</strong>
              <p>{plan.audience}</p>
            </div>
            <ul>
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <p>Already invited? <Link href="/login">Sign in to continue.</Link></p>
          </article>
        ))}
      </section>
    </main>
  );
}
