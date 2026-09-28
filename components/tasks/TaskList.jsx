'use client';

import Badge, { statusBadgeProps, priorityBadgeProps } from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { formatRelativeDue, isOverdue, truncate } from '../../lib/format';

function SkeletonCards({ count = 6 }) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <ul className="task-board" aria-hidden="true">
      {items.map((i) => (
        <li key={i} className="task-card task-card--skeleton">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="skeleton skeleton--chip" />
        </li>
      ))}
    </ul>
  );
}

export default function TaskList({
  tasks = [],
  projects = [],
  loading = false,
  error = null,
  onEdit,
  onToggleStatus,
  onDelete,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="task-list" role="status" aria-live="polite">
        <span className="visually-hidden">Loading your tasks</span>
        <SkeletonCards count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert--danger" role="alert">
        <h3>We couldn&apos;t load your tasks</h3>
        <p>{typeof error === 'string' ? error : error.message || 'Something went wrong while fetching your tasks.'}</p>
        {onRetry ? (
          <Button variant="secondary" size="md" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks match this view"
        description="Adjust your filters, or create a new task to start tracking the work you care about."
      />
    );
  }

  const projectById = new Map(
    (Array.isArray(projects) ? projects : []).map((p) => [String(p.id), p])
  );

  return (
    <ul className="task-board">
      {tasks.map((task) => {
        const status = task.status || 'todo';
        const priority = task.priority || 'medium';
        const statusInfo = statusBadgeProps(status);
        const priorityInfo = priorityBadgeProps(priority);
        const projectId = task.project_id ?? task.projectId;
        const project = projectId != null ? projectById.get(String(projectId)) : null;
        const overdue = isOverdue(task.due_date || task.dueDate, status);
        const done = status === 'done';

        return (
          <li key={task.id} className={`task-card${done ? ' task-card--done' : ''}`}>
            <div className="task-card__head">
              <div className="task-card__headings">
                <h3 className="task-card__title">{task.title}</h3>
                {task.description ? (
                  <p className="task-card__desc">{truncate(task.description, 160)}</p>
                ) : null}
              </div>
            </div>

            <div className="task-card__meta cluster">
              <Badge tone={statusInfo.tone} size="sm">
                {statusInfo.label}
              </Badge>
              <Badge tone={priorityInfo.tone} size="sm">
                {priorityInfo.label}
              </Badge>
              {project ? (
                <span className="task-card__project project-name" title={project.name}>
                  {project.name}
                </span>
              ) : null}
            </div>

            {task.due_date || task.dueDate ? (
              <p className={`task-card__due${overdue ? ' task-card__due--overdue' : ''}`}>
                {formatRelativeDue(task.due_date || task.dueDate)}
              </p>
            ) : (
              <p className="task-card__due task-card__due--none">No due date</p>
            )}

            <div className="task-card__actions cluster">
              {onToggleStatus ? (
                <Button
                  variant={done ? 'ghost' : 'secondary'}
                  size="sm"
                  onClick={() => onToggleStatus(task)}
                >
                  {done ? 'Reopen' : 'Mark done'}
                </Button>
              ) : null}
              {onEdit ? (
                <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
                  Edit
                </Button>
              ) : null}
              {onDelete ? (
                <Button variant="danger" size="sm" onClick={() => onDelete(task)}>
                  Delete
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}