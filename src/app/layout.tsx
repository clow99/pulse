import type { Metadata } from 'next';
import Script from 'next/script';
import '@velocityuikit/velocityui/dist/style.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://pulsewebanalytics.com'),
  title: {
    default: 'Pulse — Analytics, uptime, and AI signals',
    template: '%s | Pulse',
  },
  description:
    'Privacy-first analytics, uptime monitoring, and scoped AI reports for teams that want clear operational signals.',
  applicationName: 'Pulse',
  openGraph: {
    type: 'website',
    siteName: 'Pulse',
    title: 'Pulse — Analytics, uptime, and AI signals',
    description:
      'Understand acquisition, reliability, and agent-ready reports from one privacy-first signal stack.',
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
    title: 'Pulse — Analytics, uptime, and AI signals',
    description:
      'Understand acquisition, reliability, and agent-ready reports from one privacy-first signal stack.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="vui-theme-midnight">
      <body>
        {children}
        <Script src="/self-analytics.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
