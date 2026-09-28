'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { Field, Input } from '../ui/Input';
import Button from '../ui/Button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode = 'login' }) {
  const isSignup = mode === 'signup';
  const router = useRouter();
  const { login, signup } = useAuth();

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function validate() {
    const next = {};
    const email = values.email.trim().toLowerCase();
    const name = values.name.trim();

    if (isSignup) {
      if (name.length < 2) {
        next.name = 'Please enter your name (at least 2 characters).';
      } else if (name.length > 120) {
        next.name = 'Name must be 120 characters or fewer.';
      }
    }

    if (!email) {
      next.email = 'Email is required.';
    } else if (!EMAIL_RE.test(email)) {
      next.email = 'Enter a valid email address, e.g. you@example.com.';
    }

    if (!values.password) {
      next.password = 'Password is required.';
    } else if (isSignup && values.password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }

    if (isSignup && values.confirm !== values.password) {
      next.confirm = 'Passwords do not match.';
    }

    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const email = values.email.trim().toLowerCase();
      if (isSignup) {
        await signup(values.name.trim(), email, values.password);
      } else {
        await login(email, values.password);
      }
      router.push('/dashboard');
    } catch (err) {
      const status = err && typeof err.status === 'number' ? err.status : 0;
      if (status === 0) {
        setFormError("We couldn't reach the server. Please try again.");
      } else if (status === 401) {
        setFormError('Invalid email or password.');
      } else if (status === 409) {
        setFormError('An account with that email already exists.');
      } else if (status === 429) {
        setFormError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setFormError((err && err.message) || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form stack" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <p className="form-alert" role="alert">
          {formError}
        </p>
      ) : null}

      {isSignup ? (
        <Field
          label="Full name"
          htmlFor="auth-name"
          error={errors.name}
          required
          hint="This is how your name appears across TaskMgr."
        >
          <Input
            id="auth-name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={handleChange}
            placeholder="Ada Lovelace"
            invalid={Boolean(errors.name)}
            disabled={submitting}
            required
          />
        </Field>
      ) : null}

      <Field label="Email address" htmlFor="auth-email" error={errors.email} required>
        <Input
          id="auth-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          placeholder="you@example.com"
          invalid={Boolean(errors.email)}
          disabled={submitting}
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="auth-password"
        error={errors.password}
        required
        hint={isSignup ? 'Use at least 8 characters.' : undefined}
      >
        <Input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={values.password}
          onChange={handleChange}
          placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
          invalid={Boolean(errors.password)}
          disabled={submitting}
          required
        />
      </Field>

      {isSignup ? (
        <Field label="Confirm password" htmlFor="auth-confirm" error={errors.confirm} required>
          <Input
            id="auth-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={handleChange}
            placeholder="Re-enter your password"
            invalid={Boolean(errors.confirm)}
            disabled={submitting}
            required
          />
        </Field>
      ) : null}

      <Button type="submit" variant="primary" size="lg" loading={submitting} disabled={submitting}>
        {isSignup ? 'Create free account' : 'Log in'}
      </Button>
    </form>
  );
}