import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
].join(' ');
const connectSources = [
  "'self'",
  ...(isDevelopment ? ['ws:', 'wss:'] : []),
].join(' ');

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: { root: process.cwd() },
  transpilePackages: ['three'],
  serverExternalPackages: ['bcryptjs'],
  async headers() {
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: `default-src 'self'; script-src ${scriptSources}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src ${connectSources}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
      },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ];
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/t.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=86400' }] },
    ];
  },
};

export default nextConfig;
