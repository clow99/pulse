import type { Metadata } from 'next';
import { PolicyDocument } from '@/components/PolicyDocument';
export const metadata: Metadata = { title: 'Accessibility', description: 'Accessibility target, limitations and support for Pulse.', alternates: { canonical: '/accessibility' } };

export default function AccessibilityPage() {
  return <PolicyDocument title="Accessibility">
    <p>Cameron Low is responsible for accessibility of this website and hosted preview. WCAG 2.2 Level AA is the engineering target, not a claim of complete certification.</p>
    <section><h2>Public information</h2><p>Policies are available as HTML without signing in. They use semantic headings, visible links and focus, a keyboard skip link, reflow and print styles. Public pages support reduced motion. The preview contains complex dashboards and charts; their assistive-technology coverage remains under review. Independent installations may differ.</p></section>
    <section><h2>Help with a barrier</h2><p>Email the affected page, what you were trying to do and your preferred alternative format. Browser or assistive-technology details can help; medical information is not needed. Cameron will investigate and discuss an alternative way to access the information. A fixed response time is not promised.</p></section>
  </PolicyDocument>;
}
