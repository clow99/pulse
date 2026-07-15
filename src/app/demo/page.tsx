import type { Metadata } from 'next';
import { DemoDashboard } from '@/components/demo/DemoDashboard';
import { parseDemoView } from '@/lib/demo-data';

export const metadata: Metadata = {
  title: 'Product Demo',
  description:
    'Explore Pulse analytics, acquisition, and uptime reports in a safe read-only sandbox with synthetic data.',
  alternates: {
    canonical: '/demo',
  },
  openGraph: {
    type: 'website',
    url: '/demo',
    siteName: 'Pulse',
    title: 'Explore the Pulse product demo',
    description:
      'Inspect analytics, acquisition, and uptime reports in a safe read-only sandbox with synthetic data.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Pulse analytics overview on a dark telemetry background',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore the Pulse product demo',
    description:
      'Inspect analytics, acquisition, and uptime reports in a safe read-only sandbox with synthetic data.',
    images: ['/opengraph-image'],
  },
};

interface DemoPageProps {
  searchParams: Promise<{
    view?: string | string[];
  }>;
}

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const { view } = await searchParams;

  return <DemoDashboard activeView={parseDemoView(view)} />;
}
