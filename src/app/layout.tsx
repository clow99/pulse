import type { Metadata } from 'next';
import Script from 'next/script';
import '@velocityuikit/velocityui/dist/style.css';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Pulse - Privacy-First Analytics',
  description: 'Privacy-first product analytics and reliability monitoring',
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
        <Providers>
          {children}
        </Providers>
        <Script src="/self-analytics.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
