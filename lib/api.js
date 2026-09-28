// lib/api.js
// Browser API client for the TaskMgr Express API.
// All functions here are intended to run in the browser at runtime only.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://taskmgr-api.arx-app.com:4116';

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const NETWORK_MESSAGE =
  "We couldn't reach the server. Please check your connection and try again.";

function buildUrl(path) {
  const base = String(API_BASE || '').replace(/\/+$/, '');
  const suffix = String(path || '');
  return `${base}${suffix.startsWith('/') ? '' : '/'}${suffix}`;
}

async function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_err) {
      return { message: text };
    }
  } catch (_err) {
    return null;
  }
}

/**
 * Core request helper. Always sends cookies (session based auth).
 * Throws ApiError on non-2xx responses or network failures.
 */
export async function request(path, options = {}) {
  const { method = 'GET', body, signal, headers = {} } = options;

  if (typeof fetch === 'undefined') {
    throw new ApiError('Fetch is not available in this environment.', 0);
  }

  const init = {
    method,
    credentials: 'include',
    mode: 'cors',
    cache: 'no-store',
    headers: { Accept: 'application/json', ...headers },
  };

  if (signal) init.signal = signal;

  if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path), init);
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      throw err;
    }
    throw new ApiError(NETWORK_MESSAGE, 0);
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.keys(params || {}).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null) return;
    const str = String(value).trim();
    if (str === '' || str === 'all') return;
    search.append(key, str);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ---------------------------------- auth --------------------------------- */

export function signup(name, email, password) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: { name, email, password },
  });
}

export function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getMe(signal) {
  return request('/api/auth/me', { method: 'GET', signal });
}

/* ---------------------------------- tasks -------------------------------- */

export function getTasks(filters = {}, signal) {
  const query = toQuery({
    status: filters.status,
    priority: filters.priority,
    projectId: filters.projectId,
    q: filters.q,
    sort: filters.sort,
    limit: filters.limit,
  });
  return request(`/api/tasks${query}`, { method: 'GET', signal });
}

export function getTask(id, signal) {
  return request(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal,
  });
}

export function createTask(payload) {
  return request('/api/tasks', { method: 'POST', body: payload });
}

export function updateTask(id, payload) {
  return request(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteTask(id) {
  return request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getTaskStats(signal) {
  return request('/api/tasks/stats', { method: 'GET', signal });
}

/* -------------------------------- projects ------------------------------- */

export function getProjects(signal) {
  return request('/api/projects', { method: 'GET', signal });
}

export function createProject(payload) {
  return request('/api/projects', { method: 'POST', body: payload });
}

export function deleteProject(id) {
  return request(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/* --------------------------------- health -------------------------------- */

export function getHealth(signal) {
  return request('/health', { method: 'GET', signal });
}

const api = {
  API_BASE,
  ApiError,
  request,
  signup,
  login,
  logout,
  getMe,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  getProjects,
  createProject,
  deleteProject,
  getHealth,
};

export default api;