import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Private Preview | Pulse',
  description: 'Pulse access is currently coordinated through a private preview.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function DemoPage() {
  return (
    <main className="pulse-public-page">
      <section className="pulse-public-hero">
        <p className="pulse-eyebrow">Private preview</p>
        <h1 className="pulse-public-title">Pulse does not publish a reusable demo account.</h1>
        <p className="pulse-page-subtitle">
          Dashboard previews on the public site use illustrative data. Self-managed and hosted evaluation access is coordinated privately with invited participants.
        </p>
        <div className="pulse-public-actions">
          <Link href="/">
            <span className="pulse-public-button primary">Return to Pulse</span>
          </Link>
          <Link href="/login">
            <span className="pulse-public-button secondary">Invited? Sign In</span>
          </Link>
        </div>
      </section>

      <section className="pulse-demo-panel">
        <div>
          <h2>Access remains invitation-only</h2>
          <p>
            Public registration, fixed hosted plans, and purchase flows are not available. No public preview-request contact is published.
          </p>
        </div>
      </section>
    </main>
  );
}
