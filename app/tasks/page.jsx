'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import RequireAuth from '../../components/auth/RequireAuth';
import TaskFilters from '../../components/tasks/TaskFilters';
import TaskList from '../../components/tasks/TaskList';
import TaskForm from '../../components/tasks/TaskForm';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import {
  getTasks,
  getProjects,
  createTask,
  updateTask,
  deleteTask,
} from '../../lib/api';

const DEFAULT_FILTERS = {
  status: '',
  priority: '',
  projectId: '',
  q: '',
  sort: 'due_date',
};

function TasksPageInner() {
  const { push } = useToast();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmTask, setConfirmTask] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const data = await getProjects();
      if (!mountedRef.current) return;
      setProjects(Array.isArray(data) ? data : data?.projects || []);
    } catch (err) {
      // Projects are supplementary — the task list still works without them.
      if (mountedRef.current) setProjects([]);
    }
  }, []);

  const loadTasks = useCallback(async (activeFilters) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const data = await getTasks(activeFilters, { signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted) return;
      setTasks(Array.isArray(data) ? data : data?.tasks || []);
    } catch (err) {
      if (controller.signal.aborted || err?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setTasks([]);
      setError(err?.message || 'We could not load your tasks. Please try again.');
    } finally {
      if (mountedRef.current && !controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadTasks(filters);
  }, [filters, loadTasks]);

  const handleFiltersChange = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const openCreate = useCallback(() => {
    setEditingTask(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((task) => {
    setEditingTask(task);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    if (submitting) return;
    setFormOpen(false);
    setEditingTask(null);
  }, [submitting]);

  const handleSubmit = useCallback(
    async (payload) => {
      setSubmitting(true);
      try {
        if (editingTask) {
          await updateTask(editingTask.id, payload);
          push({ message: 'Task updated.', tone: 'success' });
        } else {
          await createTask(payload);
          push({ message: 'Task created.', tone: 'success' });
        }
        if (!mountedRef.current) return;
        setFormOpen(false);
        setEditingTask(null);
        await loadTasks(filters);
      } catch (err) {
        push({
          message: err?.message || 'Saving the task failed. Please try again.',
          tone: 'danger',
        });
      } finally {
        if (mountedRef.current) setSubmitting(false);
      }
    },
    [editingTask, filters, loadTasks, push]
  );

  const handleToggleStatus = useCallback(
    async (task) => {
      const nextStatus = task.status === 'done' ? 'todo' : 'done';
      try {
        await updateTask(task.id, { status: nextStatus });
        push({
          message:
            nextStatus === 'done'
              ? 'Task marked as done.'
              : 'Task moved back to To do.',
          tone: 'success',
        });
        await loadTasks(filters);
      } catch (err) {
        push({
          message: err?.message || 'We could not update that task.',
          tone: 'danger',
        });
      }
    },
    [filters, loadTasks, push]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmTask) return;
    setDeleting(true);
    try {
      await deleteTask(confirmTask.id);
      push({ message: 'Task deleted.', tone: 'success' });
      if (!mountedRef.current) return;
      setConfirmTask(null);
      await loadTasks(filters);
    } catch (err) {
      push({
        message: err?.message || 'Deleting the task failed. Please try again.',
        tone: 'danger',
      });
    } finally {
      if (mountedRef.current) setDeleting(false);
    }
  }, [confirmTask, filters, loadTasks, push]);

  return (
    <section className="stack">
      <header className="page-header">
        <div className="page-header__text">
          <h1>Your tasks</h1>
          <p>
            Everything you are working on, in one place. Filter by status,
            priority or project to focus on what matters today.
          </p>
        </div>
      </header>

      <TaskFilters
        filters={filters}
        projects={projects}
        onChange={handleFiltersChange}
        onCreate={openCreate}
      />

      <TaskList
        tasks={tasks}
        projects={projects}
        loading={loading}
        error={error}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={(task) => setConfirmTask(task)}
        onRetry={() => loadTasks(filters)}
        onCreate={openCreate}
      />

      <Modal
        open={formOpen}
        title={editingTask ? 'Edit task' : 'New task'}
        onClose={closeForm}
      >
        <TaskForm
          initialTask={editingTask}
          projects={projects}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={Boolean(confirmTask)}
        title="Delete task"
        onClose={() => {
          if (!deleting) setConfirmTask(null);
        }}
        footer={
          <div className="cluster cluster--end">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirmTask(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleConfirmDelete}
              loading={deleting}
            >
              Delete task
            </Button>
          </div>
        }
      >
        <p>
          {confirmTask
            ? `"${confirmTask.title}" will be permanently removed. This cannot be undone.`
            : 'This task will be permanently removed.'}
        </p>
      </Modal>
    </section>
  );
}

export default function TasksPage() {
  return (
    <RequireAuth>
      <TasksPageInner />
    </RequireAuth>
  );
}