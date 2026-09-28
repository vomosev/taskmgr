'use client';

import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '../../components/auth/RequireAuth';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { statusBadgeProps, priorityBadgeProps } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { getTaskStats, getTasks } from '../../lib/api';
import { formatRelativeDue, isOverdue, formatDate } from '../../lib/format';
import { useAuth } from '../../lib/AuthContext';

const STAT_TILES = [
  { key: 'todo', label: 'To do', tone: 'neutral' },
  { key: 'in_progress', label: 'In progress', tone: 'accent' },
  { key: 'done', label: 'Done', tone: 'success' },
  { key: 'overdue', label: 'Overdue', tone: 'danger' }
];

function DashboardView() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [upNext, setUpNext] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async (signal) => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const [statsResult, tasksResult] = await Promise.all([
        getTaskStats({ signal }),
        getTasks({ sort: 'due_date', status: 'open' }, { signal })
      ]);

      if (signal && signal.aborted) return;

      const rawStats = statsResult && statsResult.stats ? statsResult.stats : statsResult;
      const normalised = {
        todo: Number(rawStats?.todo ?? 0),
        in_progress: Number(rawStats?.in_progress ?? 0),
        done: Number(rawStats?.done ?? 0),
        overdue: Number(rawStats?.overdue ?? 0),
        total: Number(
          rawStats?.total ??
            Number(rawStats?.todo ?? 0) + Number(rawStats?.in_progress ?? 0) + Number(rawStats?.done ?? 0)
        )
      };

      const list = Array.isArray(tasksResult)
        ? tasksResult
        : Array.isArray(tasksResult?.tasks)
          ? tasksResult.tasks
          : [];

      const soonest = list
        .filter((task) => task && task.status !== 'done' && task.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);

      setStats(normalised);
      setUpNext(soonest);
      setStatus('ready');
    } catch (err) {
      if (err && (err.name === 'AbortError' || (signal && signal.aborted))) return;
      setErrorMessage(
        err && err.message ? err.message : 'We could not load your dashboard. Please try again.'
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const firstName = user && user.name ? String(user.name).split(' ')[0] : 'there';

  return (
    <section className="stack">
      <header className="dashboard-intro">
        <h1>Welcome back, {firstName}</h1>
        <p>
          Here is where your work stands right now. Check what is overdue, pick up the next task in
          line, and keep your projects moving.
        </p>
        <div className="cluster">
          <Button href="/tasks" variant="primary" size="md">
            Go to tasks
          </Button>
          <Button href="/projects" variant="secondary" size="md">
            Manage projects
          </Button>
        </div>
      </header>

      {status === 'loading' && (
        <div className="stack" aria-busy="true">
          <div className="grid grid--stats">
            {STAT_TILES.map((tile) => (
              <div key={tile.key} className="stat-tile stat-tile--skeleton">
                <span className="skeleton skeleton--line" />
                <span className="skeleton skeleton--number" />
              </div>
            ))}
          </div>
          <Card>
            <CardHeader title="Up next" subtitle="Loading your five soonest deadlines" />
            <CardBody>
              <div className="stack">
                <span className="skeleton skeleton--row" />
                <span className="skeleton skeleton--row" />
                <span className="skeleton skeleton--row" />
              </div>
              <p className="visually-hidden">
                <Spinner size="sm" label="Loading dashboard" />
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {status === 'error' && (
        <Card>
          <CardHeader title="We could not load your dashboard" />
          <CardBody>
            <p>{errorMessage}</p>
            <div className="cluster">
              <Button variant="primary" size="md" onClick={() => load()}>
                Retry
              </Button>
              <Button href="/tasks" variant="ghost" size="md">
                Open tasks instead
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {status === 'ready' && stats && stats.total === 0 && (
        <EmptyState
          title="No tasks yet"
          description="Create your first task to start tracking deadlines, priorities and progress across your projects."
          action={
            <Button href="/tasks" variant="primary" size="md">
              Create your first task
            </Button>
          }
        />
      )}

      {status === 'ready' && stats && stats.total > 0 && (
        <div className="stack">
          <div className="grid grid--stats">
            {STAT_TILES.map((tile) => (
              <div key={tile.key} className="stat-tile">
                <span className="stat-tile__label">{tile.label}</span>
                <span className="stat-tile__value">{stats[tile.key] ?? 0}</span>
                <Badge tone={tile.tone} size="sm">
                  {tile.key === 'overdue' ? 'Needs attention' : 'Tasks'}
                </Badge>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader
              title="Up next"
              subtitle="Your five soonest deadlines"
              actions={
                <Button href="/tasks" variant="ghost" size="sm">
                  View all
                </Button>
              }
            />
            <CardBody>
              {upNext.length === 0 ? (
                <EmptyState
                  title="Nothing scheduled"
                  description="None of your open tasks have a due date. Add one so it shows up here."
                  action={
                    <Button href="/tasks" variant="secondary" size="md">
                      Add a due date
                    </Button>
                  }
                />
              ) : (
                <ul className="up-next-list">
                  {upNext.map((task) => {
                    const overdue = isOverdue(task.due_date, task.status);
                    return (
                      <li key={task.id} className="up-next-list__item">
                        <div className="up-next-list__main">
                          <span className="up-next-list__title">{task.title}</span>
                          <span
                            className={
                              overdue
                                ? 'up-next-list__due up-next-list__due--overdue'
                                : 'up-next-list__due'
                            }
                          >
                            {formatRelativeDue(task.due_date)} &middot; {formatDate(task.due_date)}
                          </span>
                        </div>
                        <div className="cluster">
                          <Badge {...statusBadgeProps(task.status)} size="sm" />
                          <Badge {...priorityBadgeProps(task.priority)} size="sm" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardView />
    </RequireAuth>
  );
}