import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthProvider } from '../components/auth-provider';
import { SiteHeader } from '../components/site-header';

import './globals.css';

export const metadata: Metadata = {
  title: 'Daily Sudoku',
  description: 'One Sudoku per UTC day with anonymous play and signed-in leaderboards.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-frame">
            <SiteHeader />
            <main className="main-content">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
