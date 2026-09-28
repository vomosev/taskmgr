'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getMe,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
} from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getMe();
      const nextUser = data && data.user ? data.user : data;
      if (!mountedRef.current) return null;
      if (nextUser && nextUser.id) {
        setUser(nextUser);
        setStatus('authenticated');
        setError(null);
        return nextUser;
      }
      setUser(null);
      setStatus('anonymous');
      setError(null);
      return null;
    } catch (err) {
      if (!mountedRef.current) return null;
      setUser(null);
      setStatus('anonymous');
      // A 401 is expected when signed out; anything else is worth surfacing.
      setError(err && err.status && err.status !== 401 ? err.message : null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Runtime-only: never runs during the Next.js build/SSR pass.
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await apiLogin({ email, password });
      const nextUser = data && data.user ? data.user : data;
      if (mountedRef.current) {
        setUser(nextUser || null);
        setStatus(nextUser ? 'authenticated' : 'anonymous');
      }
      return nextUser;
    } catch (err) {
      if (mountedRef.current) {
        setUser(null);
        setStatus('anonymous');
        setError(err && err.message ? err.message : 'Unable to log in.');
      }
      throw err;
    }
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setError(null);
    try {
      const data = await apiSignup({ name, email, password });
      const nextUser = data && data.user ? data.user : data;
      if (mountedRef.current) {
        setUser(nextUser || null);
        setStatus(nextUser ? 'authenticated' : 'anonymous');
      }
      return nextUser;
    } catch (err) {
      if (mountedRef.current) {
        setUser(null);
        setStatus('anonymous');
        setError(
          err && err.message ? err.message : 'Unable to create your account.'
        );
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      // Even if the API call fails we clear local state so the UI reflects sign-out.
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setStatus('anonymous');
        setError(null);
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      isAuthenticated: status === 'authenticated',
      login,
      signup,
      logout,
      refresh,
      clearError: () => setError(null),
    }),
    [user, status, error, login, signup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return ctx;
}

export default AuthContext;