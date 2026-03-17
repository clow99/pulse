import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['three'],
  serverExternalPackages: ['bcryptjs'],
};

export default nextConfig;
