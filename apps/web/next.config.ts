import type { NextConfig } from 'next';

import { getWebSecurityHeaders } from './lib/security';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@daily-sudoku/contracts', '@daily-sudoku/puzzles'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: getWebSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
