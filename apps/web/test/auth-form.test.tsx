import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthSession } from '@daily-sudoku/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockApplySession, mockLogIn, mockPush, mockRefresh, mockSignUp } = vi.hoisted(() => ({
  mockApplySession: vi.fn(),
  mockLogIn: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('../components/auth-provider', () => ({
  useAuth: () => ({
    applySession: mockApplySession,
  }),
}));

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();

  return {
    ...actual,
    logIn: mockLogIn,
    signUp: mockSignUp,
  };
});

import { AuthForm } from '../components/auth-form';

describe('AuthForm', () => {
  beforeEach(() => {
    mockApplySession.mockReset();
    mockLogIn.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockSignUp.mockReset();
  });

  it('keeps tab-entered signup values intact and submits the full payload', async () => {
    const user = userEvent.setup();
    const session: AuthSession = {
      user: {
        createdAt: '2026-04-16T00:00:00.000Z',
        displayName: 'Playwright Ace',
        email: 'playwright@example.com',
        id: 'user-1',
      },
    };

    mockSignUp.mockResolvedValue(session);

    render(<AuthForm mode="signup" />);

    await user.tab();
    expect(screen.getByLabelText('Display name')).toHaveFocus();
    await user.keyboard('Playwright Ace');

    await user.tab();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    await user.keyboard('playwright@example.com');

    await user.tab();
    expect(screen.getByLabelText('Password')).toHaveFocus();
    await user.keyboard('super-secret');

    expect(screen.getByLabelText('Display name')).toHaveValue('Playwright Ace');
    expect(screen.getByLabelText('Email')).toHaveValue('playwright@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('super-secret');

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        displayName: 'Playwright Ace',
        email: 'playwright@example.com',
        password: 'super-secret',
      });
    });

    expect(mockLogIn).not.toHaveBeenCalled();
    expect(mockApplySession).toHaveBeenCalledWith(session);
    expect(mockPush).toHaveBeenCalledWith('/play');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
