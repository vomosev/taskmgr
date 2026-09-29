'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import RequireAuth from '../../components/auth/RequireAuth';
import Card, { CardBody, CardHeader } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { Field, Input, Select } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { getProjects, createProject, deleteProject } from '../../lib/api';
import { formatDate } from '../../lib/format';

const COLOR_OPTIONS = [
  { value: 'accent', label: 'Blue' },
  { value: 'success', label: 'Green' },
  { value: 'warning', label: 'Amber' },
  { value: 'danger', label: 'Red' },
  { value: 'neutral', label: 'Grey' }
];

const COLOR_TONES = {
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutral'
};

const COLUMNS = [
  { key: 'name', header: 'Project' },
  { key: 'color', header: 'Colour' },
  { key: 'open_tasks', header: 'Open tasks', align: 'right' },
  { key: 'created_at', header: 'Created' },
  { key: 'actions', header: '', align: 'right' }
];

function ProjectsView() {
  const { push } = useToast();

  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [color, setColor] = useState('accent');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const data = await getProjects();
      const list = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
      setProjects(list);
      setStatus('ready');
    } catch (err) {
      setError(err?.message || 'We could not load your projects. Please try again.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProjects();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
        setProjects(list);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'We could not load your projects. Please try again.');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalOpen = useMemo(
    () => projects.reduce((sum, p) => sum + Number(p.open_tasks || 0), 0),
    [projects]
  );

  async function handleCreate(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Give your project a name.');
      return;
    }
    if (trimmed.length > 120) {
      setFormError('Project names must be 120 characters or fewer.');
      return;
    }
    setFormError('');
    setCreating(true);
    try {
      await createProject({ name: trimmed, color });
      setName('');
      setColor('accent');
      push({ message: `Project “${trimmed}” created.`, tone: 'success' });
      await load();
    } catch (err) {
      const message = err?.message || 'We could not create that project.';
      setFormError(message);
      push({ message, tone: 'danger' });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProject(pendingDelete.id);
      push({ message: `Project “${pendingDelete.name}” deleted.`, tone: 'success' });
      setPendingDelete(null);
      await load();
    } catch (err) {
      push({ message: err?.message || 'We could not delete that project.', tone: 'danger' });
    } finally {
      setDeleting(false);
    }
  }

  function renderCell(row, column) {
    switch (column.key) {
      case 'name':
        return <span className="project-name">{row.name}</span>;
      case 'color':
        return (
          <Badge tone={COLOR_TONES[row.color] || 'neutral'} size="sm">
            {COLOR_OPTIONS.find((c) => c.value === row.color)?.label || 'Grey'}
          </Badge>
        );
      case 'open_tasks':
        return <span className="table__num">{Number(row.open_tasks || 0)}</span>;
      case 'created_at':
        return <span className="text-muted">{formatDate(row.created_at)}</span>;
      case 'actions':
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPendingDelete(row)}
            aria-label={`Delete project ${row.name}`}
          >
            Delete
          </Button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="stack stack--lg page-section">
      <header className="page-header">
        <h1>Projects</h1>
        <p>
          Group related work together so your task board stays readable. Deleting a project keeps its
          tasks — they simply move back to “No project”.
        </p>
      </header>

      <Card>
        <CardHeader
          title="Create a project"
          subtitle="Pick a short, recognisable name and a colour for its chip."
        />
        <CardBody>
          <form className="inline-form" onSubmit={handleCreate} noValidate>
            <div className="inline-form__main">
              <Field
                label="Project name"
                htmlFor="project-name"
                error={formError}
                required
              >
                <Input
                  id="project-name"
                  name="name"
                  value={name}
                  maxLength={120}
                  autoComplete="off"
                  placeholder="Website relaunch"
                  onChange={(event) => {
                    setName(event.target.value);
                    if (formError) setFormError('');
                  }}
                  error={Boolean(formError)}
                />
              </Field>
            </div>
            <div className="inline-form__aside">
              <Field label="Colour" htmlFor="project-color">
                <Select
                  id="project-color"
                  name="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                >
                  {COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="inline-form__action">
              <Button type="submit" variant="primary" size="md" loading={creating} disabled={creating}>
                Add project
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Your projects"
          subtitle={
            status === 'ready'
              ? `${projects.length} project${projects.length === 1 ? '' : 's'} · ${totalOpen} open task${
                  totalOpen === 1 ? '' : 's'
                }`
              : 'Loading your project list…'
          }
          actions={
            status === 'error' ? (
              <Button variant="secondary" size="sm" onClick={load}>
                Retry
              </Button>
            ) : null
          }
        />
        <CardBody>
          {status === 'error' ? (
            <div className="alert alert--danger" role="alert">
              <p>{error}</p>
              <Button variant="secondary" size="sm" onClick={load}>
                Try again
              </Button>
            </div>
          ) : status === 'ready' && projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Projects are optional, but they make long task lists much easier to scan. Create your first one above."
            />
          ) : (
            <Table
              columns={COLUMNS}
              rows={projects}
              renderCell={renderCell}
              loading={status === 'loading'}
              skeletonRows={4}
              emptyMessage="No projects to show."
            />
          )}
        </CardBody>
      </Card>

      <Modal
        open={Boolean(pendingDelete)}
        title="Delete this project?"
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        footer={
          <div className="cluster cluster--end">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDelete}
              loading={deleting}
              disabled={deleting}
            >
              Delete project
            </Button>
          </div>
        }
      >
        <p>
          “{pendingDelete?.name}” will be removed from your project list. Its{' '}
          {Number(pendingDelete?.open_tasks || 0)} open task
          {Number(pendingDelete?.open_tasks || 0) === 1 ? '' : 's'} will stay in your task list without
          a project.
        </p>
      </Modal>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <RequireAuth>
      <ProjectsView />
    </RequireAuth>
  );
}