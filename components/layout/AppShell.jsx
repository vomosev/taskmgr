'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import Button from '../ui/Button';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/projects', label: 'Projects' },
];

export default function AppShell({ children }) {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAuthenticated = status === 'authenticated' && Boolean(user);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      // Logging out client-side is still the right outcome if the API failed.
      if (typeof console !== 'undefined') {
        console.error('Logout failed:', err && err.message ? err.message : err);
      }
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
      router.push('/login');
    }
  }

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container site-header__inner">
          <Link href={isAuthenticated ? '/dashboard' : '/'} className="wordmark">
            <span className="wordmark__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
                <path
                  d="M4 12.5l5 5L20 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="wordmark__text">TaskMgr</span>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            {isAuthenticated ? (
              <ul className="site-nav__list cluster">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={
                        isActive(link.href) ? 'site-nav__link is-active' : 'site-nav__link'
                      }
                      aria-current={isActive(link.href) ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </nav>

          <div className="site-header__actions cluster">
            {status === 'loading' ? (
              <span className="site-header__pending" aria-live="polite">
                Checking session…
              </span>
            ) : isAuthenticated ? (
              <>
                <span className="site-header__user" title={user.email}>
                  {user.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  loading={loggingOut}
                  type="button"
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button as="link" href="/login" variant="ghost" size="sm">
                  Log in
                </Button>
                <Button as="link" href="/signup" variant="primary" size="sm">
                  Sign up
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="site-header__toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              {menuOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <div className="mobile-menu" id="mobile-menu">
            <nav className="container mobile-menu__inner stack" aria-label="Mobile">
              {isAuthenticated ? (
                <>
                  <span className="mobile-menu__user">Signed in as {user.name}</span>
                  <Button
                    variant="secondary"
                    size="md"
                    type="button"
                    onClick={handleLogout}
                    loading={loggingOut}
                  >
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/"
                    className="mobile-menu__link"
                    onClick={() => setMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Button as="link" href="/login" variant="secondary" size="md">
                    Log in
                  </Button>
                  <Button as="link" href="/signup" variant="primary" size="md">
                    Create free account
                  </Button>
                </>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="container site-main" id="main-content">
        {children}
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <p className="site-footer__copy">
            TaskMgr - plan, track and finish your work. Built for small teams and focused
            individuals.
          </p>
          <ul className="site-footer__links cluster">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/tasks">Tasks</Link>
            </li>
            <li>
              <Link href="/projects">Projects</Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}