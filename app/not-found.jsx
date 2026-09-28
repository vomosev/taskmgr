import Button from '../components/ui/Button';

export const metadata = {
  title: 'Page not found — TaskMgr',
  description: 'The page you were looking for does not exist.',
};

export default function NotFound() {
  return (
    <section className="empty-state">
      <h1>Page not found</h1>
      <p>
        We couldn&apos;t find the page you were looking for. It may have been moved, renamed,
        or the link you followed might be out of date.
      </p>
      <div className="cluster">
        <Button href="/" variant="primary" size="md">
          Back to home
        </Button>
        <Button href="/dashboard" variant="secondary" size="md">
          Go to dashboard
        </Button>
      </div>
    </section>
  );
}