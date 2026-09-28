'use strict';

/**
 * Lightweight hand-written validation helpers for the TaskMgr API.
 * Each validator returns { valid, errors, value } where:
 *  - valid  : boolean
 *  - errors : object mapping field name -> human readable message
 *  - value  : normalised / trimmed values safe to pass to SQL
 *
 * No external dependencies.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const TASK_STATUSES = ['todo', 'in_progress', 'done'];
const TASK_PRIORITIES = ['low', 'medium', 'high'];

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 190;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_PROJECT_NAME_LENGTH = 120;
const MAX_COLOR_LENGTH = 20;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function trimmed(value) {
  return asString(value).trim();
}

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(email);
}

/**
 * Accepts 'YYYY-MM-DD' or a full ISO timestamp and returns 'YYYY-MM-DD'.
 * Returns null when the input is not a real calendar date.
 */
function normaliseDate(input) {
  const raw = trimmed(input);
  if (!raw) return null;

  let datePart = raw;
  if (raw.includes('T')) {
    datePart = raw.split('T')[0];
  } else if (raw.includes(' ')) {
    datePart = raw.split(' ')[0];
  }

  if (!ISO_DATE_RE.test(datePart)) return null;

  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || year < 1900 || year > 2999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return datePart;
}

function normaliseId(input) {
  if (input === undefined || input === null || input === '' || input === 'null') return null;
  const num = Number(input);
  if (!Number.isInteger(num) || num <= 0) return undefined; // undefined => invalid
  return num;
}

function result(errors, value) {
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value,
  };
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

function validateSignup(body) {
  const errors = {};
  const src = isPlainObject(body) ? body : {};

  const name = trimmed(src.name);
  const email = trimmed(src.email).toLowerCase();
  const password = asString(src.password);

  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }

  return result(errors, { name, email, password });
}

function validateLogin(body) {
  const errors = {};
  const src = isPlainObject(body) ? body : {};

  const email = trimmed(src.email).toLowerCase();
  const password = asString(src.password);

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  return result(errors, { email, password });
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * validateTask(body, { partial })
 * When partial is true (PATCH) only the provided keys are validated and
 * returned in `value`, so callers can build a dynamic UPDATE statement.
 */
function validateTask(body, options) {
  const opts = isPlainObject(options) ? options : {};
  const partial = opts.partial === true;
  const errors = {};
  const value = {};
  const src = isPlainObject(body) ? body : {};

  const has = (key) => Object.prototype.hasOwnProperty.call(src, key);

  /* title ---------------------------------------------------------------- */
  if (!partial || has('title')) {
    const title = trimmed(src.title);
    if (!title) {
      errors.title = 'Title is required.';
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
    } else {
      value.title = title;
    }
  }

  /* description ---------------------------------------------------------- */
  if (!partial || has('description')) {
    if (src.description === null || src.description === undefined || trimmed(src.description) === '') {
      value.description = null;
    } else {
      const description = trimmed(src.description);
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
      } else {
        value.description = description;
      }
    }
  }

  /* status --------------------------------------------------------------- */
  if (!partial || has('status')) {
    const raw = trimmed(src.status).toLowerCase();
    if (!raw) {
      if (partial) {
        errors.status = `Status must be one of: ${TASK_STATUSES.join(', ')}.`;
      } else {
        value.status = 'todo';
      }
    } else if (!TASK_STATUSES.includes(raw)) {
      errors.status = `Status must be one of: ${TASK_STATUSES.join(', ')}.`;
    } else {
      value.status = raw;
    }
  }

  /* priority ------------------------------------------------------------- */
  if (!partial || has('priority')) {
    const raw = trimmed(src.priority).toLowerCase();
    if (!raw) {
      if (partial) {
        errors.priority = `Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`;
      } else {
        value.priority = 'medium';
      }
    } else if (!TASK_PRIORITIES.includes(raw)) {
      errors.priority = `Priority must be one of: ${TASK_PRIORITIES.join(', ')}.`;
    } else {
      value.priority = raw;
    }
  }

  /* due_date ------------------------------------------------------------- */
  const dueKey = has('due_date') ? 'due_date' : has('dueDate') ? 'dueDate' : null;
  if (!partial || dueKey) {
    const rawDue = dueKey ? src[dueKey] : null;
    if (rawDue === null || rawDue === undefined || trimmed(rawDue) === '') {
      value.due_date = null;
    } else {
      const normalised = normaliseDate(rawDue);
      if (!normalised) {
        errors.due_date = 'Due date must be a valid date (YYYY-MM-DD).';
      } else {
        value.due_date = normalised;
      }
    }
  }

  /* project_id ----------------------------------------------------------- */
  const projectKey = has('project_id') ? 'project_id' : has('projectId') ? 'projectId' : null;
  if (!partial || projectKey) {
    const rawProject = projectKey ? src[projectKey] : null;
    const normalised = normaliseId(rawProject);
    if (normalised === undefined) {
      errors.project_id = 'Project is not valid.';
    } else {
      value.project_id = normalised;
    }
  }

  if (partial && Object.keys(value).length === 0 && Object.keys(errors).length === 0) {
    errors.fields = 'Provide at least one field to update.';
  }

  return result(errors, value);
}

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

function validateProject(body) {
  const errors = {};
  const src = isPlainObject(body) ? body : {};

  const name = trimmed(src.name);
  let color = trimmed(src.color).toLowerCase();

  if (!name) {
    errors.name = 'Project name is required.';
  } else if (name.length > MAX_PROJECT_NAME_LENGTH) {
    errors.name = `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer.`;
  }

  if (!color) {
    color = 'accent';
  } else if (color.length > MAX_COLOR_LENGTH || !/^[a-z0-9_-]+$/.test(color)) {
    errors.color = 'Colour must be a short token such as accent, success or danger.';
  }

  return result(errors, { name, color });
}

module.exports = {
  validateSignup,
  validateLogin,
  validateTask,
  validateProject,
  // exported for reuse / tests
  TASK_STATUSES,
  TASK_PRIORITIES,
  isValidEmail,
  normaliseDate,
};