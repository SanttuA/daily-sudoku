'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiError, logIn, signUp } from '../lib/api';
import { useAuth } from './auth-provider';

type AuthFormProps = {
  mode: 'login' | 'signup';
};

function getFormValue(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === 'string' ? value : '';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { applySession } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = getFormValue(formData, 'email');
    const password = getFormValue(formData, 'password');
    const displayName = getFormValue(formData, 'displayName');

    setSubmitting(true);
    setError(null);

    try {
      const session =
        mode === 'signup'
          ? await signUp({ email, displayName, password })
          : await logIn({ email, password });

      applySession(session);
      router.push('/');
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">{mode === 'signup' ? 'Create account' : 'Welcome back'}</p>
      <h1>{mode === 'signup' ? 'Save scores and climb the board' : 'Log in for official times'}</h1>
      <p className="supporting-copy">
        Anonymous play stays instant. Accounts simply unlock leaderboard submissions and history.
      </p>
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        {mode === 'signup' ? (
          <label className="field">
            <span>Display name</span>
            <input required autoComplete="nickname" name="displayName" />
          </label>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input required autoComplete="email" name="email" type="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            name="password"
            type="password"
          />
        </label>
        {error ? <p className="error-banner">{error}</p> : null}
        <button className="accent-button wide" disabled={submitting} type="submit">
          {submitting ? 'Working…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
      </form>
    </section>
  );
}
