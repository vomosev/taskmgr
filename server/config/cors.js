'use strict';

const cors = require('cors');

const extraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function isLocalhost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  );
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (extraOrigins.includes(origin)) return true;

  let parsed;
  try {
    parsed = new URL(origin);
  } catch (err) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'arx-app.com' || hostname.endsWith('.arx-app.com')) {
    return true;
  }

  if (process.env.NODE_ENV !== 'production' && isLocalhost(hostname)) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    const error = new Error(`Origin not allowed by CORS: ${origin}`);
    error.status = 403;
    callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204,
  maxAge: 600,
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;
module.exports.corsOptions = corsOptions;
module.exports.isAllowedOrigin = isAllowedOrigin;