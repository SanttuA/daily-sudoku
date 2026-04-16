'use client';

import type { AuthSession, User } from '@daily-sudoku/contracts';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { getSession, logOut } from '../lib/api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  applySession: (session: AuthSession) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refreshSession();
  }, []);

  async function refreshSession(): Promise<void> {
    try {
      const session = await getSession();
      setUser(session.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function applySession(session: AuthSession): void {
    setUser(session.user);
    setLoading(false);
  }

  async function signOut(): Promise<void> {
    await logOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshSession, applySession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
