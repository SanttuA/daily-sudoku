import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AuthProvider } from '../components/auth-provider';
import { SiteHeader } from '../components/site-header';
import { ThemeProvider } from '../components/theme-provider';
import { getThemeInitScript } from '../lib/theme';

import './globals.css';

export const metadata: Metadata = {
  title: 'Daily Sudoku',
  description: 'One Sudoku per UTC day with anonymous play and signed-in leaderboards.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff8ec' },
    { media: '(prefers-color-scheme: dark)', color: '#18130f' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <div className="app-frame">
              <SiteHeader />
              <main className="main-content">{children}</main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
