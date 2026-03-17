import type { Metadata } from 'next';
import '@velocityuikit/velocityui/dist/style.css';
import './globals.css';
import { ToastProvider } from '@velocityuikit/velocityui';

export const metadata: Metadata = {
  title: 'Pulse - Self-Hosted Analytics',
  description: 'Privacy-first, self-hosted web analytics platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="vui-theme-midnight">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
