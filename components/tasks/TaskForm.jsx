'use client';

import { useEffect, useMemo, useState } from 'react';
import { Field, Input, Textarea, Select } from '../ui/Input';
import Button from '../ui/Button';
import { STATUS_LABELS, PRIORITY_LABELS } from '../../lib/format';

function toDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
  project_id: '',
};

export default function TaskForm({
  initialTask = null,
  projects = [],
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const initialValues = useMemo(() => {
    if (!initialTask) return EMPTY_FORM;
    return {
      title: initialTask.title || '',
      description: initialTask.description || '',
      status: initialTask.status || 'todo',
      priority: initialTask.priority || 'medium',
      due_date: toDateInputValue(initialTask.due_date),
      project_id:
        initialTask.project_id === null || initialTask.project_id === undefined
          ? ''
          : String(initialTask.project_id),
    };
  }, [initialTask]);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setTouched(false);
  }, [initialValues]);

  function setField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function validate(current) {
    const nextErrors = {};
    const title = current.title.trim();

    if (!title) {
      nextErrors.title = 'Please give the task a title.';
    } else if (title.length > 200) {
      nextErrors.title = 'Titles must be 200 characters or fewer.';
    }

    if (current.description && current.description.length > 5000) {
      nextErrors.description = 'Descriptions must be 5000 characters or fewer.';
    }

    if (!['todo', 'in_progress', 'done'].includes(current.status)) {
      nextErrors.status = 'Choose a valid status.';
    }

    if (!['low', 'medium', 'high'].includes(current.priority)) {
      nextErrors.priority = 'Choose a valid priority.';
    }

    if (current.due_date) {
      const parsed = new Date(`${current.due_date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        nextErrors.due_date = 'Enter a valid date.';
      }
    }

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setTouched(true);
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      title: values.title.trim(),
      description: values.description.trim() ? values.description.trim() : null,
      status: values.status,
      priority: values.priority,
      due_date: values.due_date ? values.due_date : null,
      project_id: values.project_id ? Number(values.project_id) : null,
    };

    if (typeof onSubmit === 'function') {
      onSubmit(payload);
    }
  }

  const titleCount = values.title.length;

  return (
    <form className="form stack" onSubmit={handleSubmit} noValidate>
      <Field
        label="Title"
        htmlFor="task-title"
        required
        hint={`${titleCount}/200 characters`}
        error={errors.title}
      >
        <Input
          id="task-title"
          name="title"
          value={values.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="Write the Q3 launch checklist"
          maxLength={200}
          autoComplete="off"
          invalid={Boolean(errors.title)}
          required
        />
      </Field>

      <Field
        label="Description"
        htmlFor="task-description"
        hint="Optional context, links or acceptance criteria."
        error={errors.description}
      >
        <Textarea
          id="task-description"
          name="description"
          rows={4}
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Outline the steps needed to finish this task."
          invalid={Boolean(errors.description)}
        />
      </Field>

      <div className="form__row">
        <Field label="Status" htmlFor="task-status" error={errors.status}>
          <Select
            id="task-status"
            name="status"
            value={values.status}
            onChange={(e) => setField('status', e.target.value)}
            invalid={Boolean(errors.status)}
          >
            <option value="todo">{STATUS_LABELS.todo}</option>
            <option value="in_progress">{STATUS_LABELS.in_progress}</option>
            <option value="done">{STATUS_LABELS.done}</option>
          </Select>
        </Field>

        <Field label="Priority" htmlFor="task-priority" error={errors.priority}>
          <Select
            id="task-priority"
            name="priority"
            value={values.priority}
            onChange={(e) => setField('priority', e.target.value)}
            invalid={Boolean(errors.priority)}
          >
            <option value="low">{PRIORITY_LABELS.low}</option>
            <option value="medium">{PRIORITY_LABELS.medium}</option>
            <option value="high">{PRIORITY_LABELS.high}</option>
          </Select>
        </Field>
      </div>

      <div className="form__row">
        <Field
          label="Due date"
          htmlFor="task-due-date"
          hint="Leave empty if there is no deadline."
          error={errors.due_date}
        >
          <Input
            id="task-due-date"
            name="due_date"
            type="date"
            value={values.due_date}
            onChange={(e) => setField('due_date', e.target.value)}
            invalid={Boolean(errors.due_date)}
          />
        </Field>

        <Field label="Project" htmlFor="task-project" error={errors.project_id}>
          <Select
            id="task-project"
            name="project_id"
            value={values.project_id}
            onChange={(e) => setField('project_id', e.target.value)}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="form__actions cluster">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" loading={submitting} disabled={submitting}>
          {initialTask ? 'Save changes' : 'Create task'}
        </Button>
      </div>
    </form>
  );
}