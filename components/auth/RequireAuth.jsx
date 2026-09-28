'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import Spinner from '../ui/Spinner';

export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="auth-gate" aria-live="polite">
        <Spinner size="lg" label="Checking your session" />
        <p className="auth-gate__text">Checking your session…</p>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="auth-gate" aria-live="polite">
        <Spinner size="lg" label="Redirecting to sign in" />
        <p className="auth-gate__text">Redirecting you to the sign-in page…</p>
      </div>
    );
  }

  return <>{children}</>;
}