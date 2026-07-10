import Link from 'next/link';

const plans = [
  {
    name: 'Self-hosted OSS',
    price: 'Free',
    audience: 'Developers and teams that want full control.',
    features: ['Docker + Postgres deployment', 'Cookie-free web analytics', 'Goals, funnels, revenue, uptime', 'Community updates'],
    cta: 'Self-host Pulse',
    href: 'https://git.cameronlow.com/cam/pulse',
  },
  {
    name: 'Managed Starter',
    price: '$19/mo',
    audience: 'Small teams that want hosted analytics without setup.',
    features: ['1 site', 'Hosted tracker and database', 'Conversion recipes', 'Weekly email summaries'],
    cta: 'Start hosted',
    href: '/register',
  },
  {
    name: 'Managed Team',
    price: '$49/mo',
    audience: 'Teams running multiple sites and product workflows.',
    features: ['5 sites', 'Team access', 'Uptime alerts', 'Agent-ready MCP reports'],
    cta: 'Start team plan',
    href: '/register',
  },
  {
    name: 'Agency',
    price: 'Custom',
    audience: 'Freelancers and agencies managing client reporting.',
    features: ['Client spaces', 'Share links', 'Scheduled summaries', 'White-label reporting path'],
    cta: 'Build agency stack',
    href: '/register',
  },
];

export default function PricingPage() {
  return (
    <main className="pulse-public-page">
      <section className="pulse-public-hero">
        <p className="pulse-eyebrow">Pulse offers</p>
        <h1 className="pulse-public-title">Open-source control with hosted convenience.</h1>
        <p className="pulse-page-subtitle">
          Start self-hosted, move to managed when setup friction costs more than hosting, and keep the same privacy-first product model.
        </p>
      </section>

      <section className="pulse-pricing-grid">
        {plans.map((plan) => (
          <article key={plan.name} className="pulse-pricing-card">
            <div>
              <h2>{plan.name}</h2>
              <strong>{plan.price}</strong>
              <p>{plan.audience}</p>
            </div>
            <ul>
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <Link href={plan.href}>
              <span className={`pulse-public-button ${plan.name === 'Managed Team' ? 'primary' : 'secondary'}`}>{plan.cta}</span>
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
