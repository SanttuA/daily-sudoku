'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import type { HistoryResponse } from '@daily-sudoku/contracts';

import { ApiError, getHistory } from '../../lib/api';
import { HistoryPanel } from '../../components/history-panel';
import { useAuth } from '../../components/auth-provider';

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const response = await getHistory();
        setHistory(response);
      } catch (historyError) {
        if (historyError instanceof ApiError) {
          setError(historyError.message);
        } else {
          setError('Could not load your history.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user]);

  if (!authLoading && !user) {
    return (
      <div className="single-column">
        <section className="panel">
          <p className="eyebrow">Personal history</p>
          <h1>Sign in to see your official solves</h1>
          <p className="supporting-copy">
            Anonymous progress stays on this device, but official completion history belongs to your
            account.
          </p>
          <Link className="accent-button" href="/auth/login">
            Log in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="single-column">
      <HistoryPanel error={error} history={history} loading={loading} />
    </div>
  );
}
