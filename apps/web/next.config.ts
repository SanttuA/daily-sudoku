import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@daily-sudoku/contracts', '@daily-sudoku/puzzles'],
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
