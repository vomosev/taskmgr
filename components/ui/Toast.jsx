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
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef(new Map());

  useEffect(() => {
    setMounted(true);
    return () => {
      timers.current.forEach((id) => clearTimeout(id));
      timers.current.clear();
    };
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input) => {
      const payload =
        typeof input === 'string' ? { message: input } : input || {};
      const message = String(payload.message || '').trim();
      if (!message) return null;

      const tone = ['neutral', 'accent', 'success', 'warning', 'danger'].includes(
        payload.tone
      )
        ? payload.tone
        : 'neutral';

      const id =
        `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((current) => [...current, { id, message, tone }].slice(-4));

      const duration =
        typeof payload.duration === 'number' && payload.duration > 0
          ? payload.duration
          : AUTO_DISMISS_MS;

      const timer = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, duration);

      timers.current.set(id, timer);
      return id;
    },
    []
  );

  const value = useMemo(
    () => ({
      toasts,
      push,
      dismiss,
      success: (message) => push({ message, tone: 'success' }),
      error: (message) => push({ message, tone: 'danger' }),
      info: (message) => push({ message, tone: 'accent' }),
    }),
    [toasts, push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && typeof document !== 'undefined'
        ? createPortal(
            <div className="toast-stack" aria-live="polite" aria-atomic="false">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`toast toast--${toast.tone}`}
                  role="status"
                >
                  <p className="toast__message">{toast.message}</p>
                  <button
                    type="button"
                    className="toast__close"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Dismiss notification"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>');
  }
  return context;
}

export default ToastProvider;