'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from './auth-provider';
import { useTheme } from './theme-provider';

const links = [
  { href: '/play', label: 'Play' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/history', label: 'History' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="site-header">
      <div>
        <Link className="brand-mark" href="/">
          <span className="brand-kicker">UTC Daily</span>
          <strong>Grid Ritual</strong>
        </Link>
      </div>
      <nav className="site-nav" aria-label="Primary">
        {links.map((link) => (
          <Link
            key={link.href}
            className={pathname === link.href ? 'nav-link active' : 'nav-link'}
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <button
          aria-label={`Switch to ${nextTheme} mode`}
          aria-pressed={theme === 'dark'}
          className="ghost-button theme-toggle"
          data-testid="theme-toggle"
          type="button"
          onClick={toggleTheme}
        >
          {nextTheme === 'dark' ? 'Dark mode' : 'Light mode'}
        </button>
        {loading ? (
          <span className="muted-label">Checking session…</span>
        ) : user ? (
          <>
            <span className="pill">{user.displayName}</span>
            <button className="ghost-button" type="button" onClick={() => void signOut()}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="ghost-button" href="/auth/login">
              Log in
            </Link>
            <Link className="accent-button" href="/auth/signup">
              Create account
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
