import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';

export const metadata = {
  title: 'TaskMgr — Plan, track and finish your work',
  description:
    'TaskMgr keeps your projects, priorities and due dates in one calm place so you always know what to work on next.',
};

const features = [
  {
    title: 'Projects that stay tidy',
    subtitle: 'Group work the way you think',
    body: 'Give every client, side project or study plan its own colour-coded space. Tasks keep their history even if a project is retired.',
  },
  {
    title: 'Priorities you can trust',
    subtitle: 'Low, medium, high — and overdue',
    body: 'Sort by due date or priority and see instantly which tasks have slipped. Overdue work is flagged in red so nothing quietly disappears.',
  },
  {
    title: 'Private by default',
    subtitle: 'Session-based accounts',
    body: 'Your tasks are scoped to your account on every single query. Sign in with an email and password — no third-party trackers, no data sharing.',
  },
];

export default function HomePage() {
  return (
    <div className="stack home">
      <section className="hero">
        <div className="hero__copy stack">
          <p className="eyebrow">Task management, without the clutter</p>
          <h1>Plan your week, finish what matters</h1>
          <p>
            TaskMgr turns a scattered to-do list into a clear plan. Capture tasks in
            seconds, sort them into projects, set a due date and watch the board move
            from &ldquo;To do&rdquo; to &ldquo;Done&rdquo;.
          </p>
          <div className="cluster hero__actions">
            <Button href="/signup" variant="primary" size="lg">
              Create free account
            </Button>
            <Button href="/login" variant="secondary" size="lg">
              Log in
            </Button>
          </div>
          <p className="text-muted">
            Free to use. Your first project takes about a minute to set up.
          </p>
        </div>

        <div className="hero__art" aria-hidden="true">
          <svg
            className="hero__art-svg"
            viewBox="0 0 480 320"
            role="presentation"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="taskmgr-hero-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="480" height="320" rx="20" fill="url(#taskmgr-hero-bg)" />
            <rect x="34" y="40" width="180" height="14" rx="7" fill="currentColor" opacity="0.35" />
            <rect x="34" y="68" width="110" height="10" rx="5" fill="currentColor" opacity="0.18" />

            <rect x="34" y="104" width="412" height="60" rx="12" fill="currentColor" opacity="0.08" />
            <circle cx="64" cy="134" r="12" fill="currentColor" opacity="0.55" />
            <path
              d="M58 134l4 4 8-8"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="90" y="122" width="180" height="11" rx="5.5" fill="currentColor" opacity="0.4" />
            <rect x="90" y="142" width="120" height="9" rx="4.5" fill="currentColor" opacity="0.2" />
            <rect x="372" y="124" width="56" height="20" rx="10" fill="currentColor" opacity="0.28" />

            <rect x="34" y="178" width="412" height="60" rx="12" fill="currentColor" opacity="0.08" />
            <circle cx="64" cy="208" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.45" />
            <rect x="90" y="196" width="150" height="11" rx="5.5" fill="currentColor" opacity="0.4" />
            <rect x="90" y="216" width="200" height="9" rx="4.5" fill="currentColor" opacity="0.2" />
            <rect x="372" y="198" width="56" height="20" rx="10" fill="currentColor" opacity="0.28" />

            <rect x="34" y="252" width="412" height="36" rx="12" fill="currentColor" opacity="0.06" />
            <rect x="90" y="264" width="130" height="11" rx="5.5" fill="currentColor" opacity="0.28" />
            <circle cx="64" cy="270" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
          </svg>
        </div>
      </section>

      <section className="home-section">
        <h2>Everything a personal task list should do</h2>
        <p>
          No sprawling settings screens or permission matrices — just the handful of
          things that actually help you ship work on time.
        </p>

        <div className="grid grid--3 feature-deck">
          {features.map((feature) => (
            <Card key={feature.title} padding="md" raised>
              <CardHeader title={feature.title} subtitle={feature.subtitle} />
              <CardBody>
                <p>{feature.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>How it works</h2>
        <ol className="steps">
          <li>
            <strong>Create an account.</strong> An email address and a password of at
            least eight characters is all it takes.
          </li>
          <li>
            <strong>Add a project.</strong> Name it, pick a colour, and it becomes a
            filter across your whole task list.
          </li>
          <li>
            <strong>Work the board.</strong> Move tasks between To do, In progress and
            Done, and keep an eye on the overdue counter on your dashboard.
          </li>
        </ol>
        <div className="cluster">
          <Button href="/signup" variant="primary" size="md">
            Start organising today
          </Button>
        </div>
      </section>
    </div>
  );
}