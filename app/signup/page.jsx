'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthForm from '../../components/auth/AuthForm';
import Card, { CardBody } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../lib/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <section className="auth-page">
        <div className="auth-page__loading">
          <Spinner size="md" label="Checking your session" />
        </div>
      </section>
    );
  }

  if (status === 'authenticated') {
    return (
      <section className="auth-page">
        <div className="auth-page__loading">
          <Spinner size="md" label="Redirecting to your dashboard" />
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <Card className="auth-card" padding="lg" raised>
        <CardBody>
          <div className="stack">
            <h1>Create your TaskMgr account</h1>
            <p>
              Set up a free account to group your work into projects, track
              status and priority, and keep an eye on what is due next.
            </p>
          </div>

          <AuthForm mode="signup" />

          <p className="auth-card__alt">
            Already have an account? <Link href="/login">Log in instead</Link>
          </p>
        </CardBody>
      </Card>
    </section>
  );
}