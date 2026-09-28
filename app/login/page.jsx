'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthForm from '../../components/auth/AuthForm';
import Card, { CardBody } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../lib/AuthContext';

export default function LoginPage() {
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
          <Spinner size="lg" label="Checking your session" />
        </div>
      </section>
    );
  }

  if (status === 'authenticated') {
    return (
      <section className="auth-page">
        <div className="auth-page__loading">
          <Spinner size="lg" label="Redirecting to your dashboard" />
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <Card className="auth-card" padding="lg" raised>
        <CardBody>
          <h1 className="auth-card__title">Welcome back</h1>
          <p className="auth-card__lede">
            Log in to pick up where you left off — your projects, due dates and
            task board are exactly as you left them.
          </p>

          <AuthForm mode="login" />

          <p className="auth-card__alt">
            New to TaskMgr? <Link href="/signup">Create a free account</Link>
          </p>
        </CardBody>
      </Card>
    </section>
  );
}