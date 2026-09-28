'use strict';

/**
 * 404 handler — mounted after all routes.
 */
function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

/**
 * Central error handler.
 * Maps err.status / err.statusCode to the HTTP response code (default 500)
 * and never leaks stack traces in production.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status =
    Number(err && (err.status || err.statusCode)) >= 400 &&
    Number(err && (err.status || err.statusCode)) <= 599
      ? Number(err.status || err.statusCode)
      : 500;

  const isProduction = process.env.NODE_ENV === 'production';

  // Log server-side. Include the stack for 5xx errors so operators can debug.
  const method = req && req.method ? req.method : 'UNKNOWN';
  const url = req && (req.originalUrl || req.url) ? req.originalUrl || req.url : '';
  if (status >= 500) {
    console.error(`[error] ${method} ${url} -> ${status}:`, (err && err.stack) || err);
  } else {
    console.warn(`[warn] ${method} ${url} -> ${status}: ${(err && err.message) || 'Request failed'}`);
  }

  let message = (err && err.message) || 'Something went wrong';

  // Never surface internal details in production for server errors.
  if (status >= 500 && isProduction) {
    message = 'Internal server error';
  }

  const payload = { error: message };

  if (err && err.details) {
    payload.details = err.details;
  }

  if (!isProduction && err && err.stack) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}

/**
 * Wraps an async route handler so rejected promises reach errorHandler.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
      return result;
    } catch (err) {
      next(err);
      return undefined;
    }
  };
}

/**
 * Small helper for creating errors with an HTTP status attached.
 */
function httpError(status, message, details) {
  const err = new Error(message || 'Request failed');
  err.status = status || 500;
  if (details) err.details = details;
  return err;
}

module.exports = { notFound, errorHandler, asyncHandler, httpError };