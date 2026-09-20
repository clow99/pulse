import Link from 'next/link';
import type { ReactNode } from 'react';

export function PolicyDocument({ title, children }: { title: string; children: ReactNode }) {
  return <>
    <a href="#policy-content" className="pulse-policy-skip">Skip to document</a>
    <header className="pulse-policy-header"><Link href="/" aria-label="Pulse home">Pulse</Link><span>Website information</span></header>
    <main id="policy-content" tabIndex={-1} className="pulse-policy-document">
      <h1>{title}</h1><p className="pulse-policy-date">Effective 19 September 2026</p>
      {children}
      <section><h2>Contact and requests</h2><p>Cameron Low, Ontario, Canada: <a href="mailto:hello@cameronlow.com">hello@cameronlow.com</a>. Include the affected page or service and only the information needed to explain your question.</p></section>
    </main>
  </>;
}
