import type { NextConfig } from 'next';

const config: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};

export default config;
