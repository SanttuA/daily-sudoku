import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@daily-sudoku/contracts', '@daily-sudoku/puzzles'],
};

export default nextConfig;
