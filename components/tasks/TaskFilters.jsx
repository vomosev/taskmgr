'use client';

import { useEffect, useState } from 'react';
import { Field, Input, Select } from '../ui/Input';
import Button from '../ui/Button';
import { STATUS_LABELS, PRIORITY_LABELS, SORT_OPTIONS } from '../../lib/format';

export default function TaskFilters({ filters = {}, projects = [], onChange, onCreate }) {
  const [query, setQuery] = useState(filters.q || '');

  // Keep the local search box in sync when filters are reset from outside.
  useEffect(() => {
    setQuery(filters.q || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  // Debounce the search input so we do not refetch on every keystroke.
  useEffect(() => {
    const current = filters.q || '';
    if (query === current) return undefined;
    const timer = setTimeout(() => {
      if (typeof onChange === 'function') {
        onChange({ ...filters, q: query });
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function update(patch) {
    if (typeof onChange === 'function') {
      onChange({ ...filters, ...patch });
    }
  }

  const statusOptions = Object.entries(STATUS_LABELS || {});
  const priorityOptions = Object.entries(PRIORITY_LABELS || {});
  const sortOptions =
    Array.isArray(SORT_OPTIONS) && SORT_OPTIONS.length
      ? SORT_OPTIONS
      : [
          { value: 'due_date', label: 'Due date' },
          { value: 'created_at', label: 'Newest first' },
          { value: 'priority', label: 'Priority' },
        ];

  const safeProjects = Array.isArray(projects) ? projects : [];

  return (
    <div className="task-filters" role="search">
      <div className="task-filters__search">
        <Field label="Search tasks" htmlFor="task-search">
          <Input
            id="task-search"
            type="search"
            name="q"
            value={query}
            placeholder="Search by title or description"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
      </div>

      <div className="task-filters__field">
        <Field label="Status" htmlFor="task-filter-status">
          <Select
            id="task-filter-status"
            name="status"
            value={filters.status || ''}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="task-filters__field">
        <Field label="Priority" htmlFor="task-filter-priority">
          <Select
            id="task-filter-priority"
            name="priority"
            value={filters.priority || ''}
            onChange={(event) => update({ priority: event.target.value })}
          >
            <option value="">All priorities</option>
            {priorityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="task-filters__field">
        <Field label="Project" htmlFor="task-filter-project">
          <Select
            id="task-filter-project"
            name="projectId"
            value={filters.projectId || ''}
            onChange={(event) => update({ projectId: event.target.value })}
          >
            <option value="">All projects</option>
            <option value="none">No project</option>
            {safeProjects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="task-filters__field">
        <Field label="Sort by" htmlFor="task-filter-sort">
          <Select
            id="task-filter-sort"
            name="sort"
            value={filters.sort || 'due_date'}
            onChange={(event) => update({ sort: event.target.value })}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="task-filters__actions">
        <Button type="button" variant="primary" size="md" onClick={onCreate}>
          New task
        </Button>
      </div>
    </div>
  );
}