import type { Metadata } from 'next';
import '@velocityuikit/velocityui/dist/style.css';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Pulse - Self-Hosted Analytics',
  description: 'Privacy-first, self-hosted web analytics platform',
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
        <script defer src="/self-analytics.js" />
      </body>
    </html>
  );
}
