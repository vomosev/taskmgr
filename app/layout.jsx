import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../lib/AuthContext';
import AppShell from '../components/layout/AppShell';
import { ToastProvider } from '../components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  fallback: [
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
});

export const metadata = {
  metadataBase: new URL('https://taskmgr.arx-app.com'),
  title: 'TaskMgr — Plan, track and finish your work',
  description:
    'TaskMgr is a focused task manager: group work into projects, set priorities and due dates, and always know what to do next.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'TaskMgr — Plan, track and finish your work',
    description:
      'Group work into projects, set priorities and due dates, and always know what to do next.',
    url: 'https://taskmgr.arx-app.com',
    siteName: 'TaskMgr',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f1420',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}