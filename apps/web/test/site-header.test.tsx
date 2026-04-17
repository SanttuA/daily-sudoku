import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installMatchMediaMock } from './match-media';

const { mockUseAuth, mockUsePathname } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUsePathname: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}));

vi.mock('../components/auth-provider', () => ({
  useAuth: mockUseAuth,
}));

import { SiteHeader } from '../components/site-header';
import { ThemeProvider } from '../components/theme-provider';
import { THEME_STORAGE_KEY } from '../lib/theme';

describe('SiteHeader theme switcher', () => {
  beforeEach(() => {
    installMatchMediaMock(false);
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';

    mockUseAuth.mockReset();
    mockUsePathname.mockReset();

    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    });
    mockUsePathname.mockReturnValue('/play');
  });

  it('renders the next-action label and toggles the persisted theme', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>,
    );

    expect(screen.getByText('Dark mode')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByText('Light mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('uses a stored preference on mount', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    expect(screen.getByText('Light mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('falls back without crashing when storage access throws during render', async () => {
    installMatchMediaMock(true);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';

    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    expect(() => {
      render(
        <ThemeProvider>
          <SiteHeader />
        </ThemeProvider>,
      );
    }).not.toThrow();

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    expect(screen.getByText('Light mode')).toBeInTheDocument();
    getItemSpy.mockRestore();
  });
});
