'use strict';

require('dotenv').config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const corsMiddleware = require('./config/cors');
const sessionMiddleware = require('./config/session');
const { checkDatabaseConnection } = require('./config/db');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const projectRoutes = require('./routes/projects');

const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind a reverse proxy / TLS terminator we still want secure cookies to work.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sessionMiddleware);

// Guard against malformed JSON bodies before the routes run.
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  return next(err);
});

app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

let server;
try {
  server =
    process.env.SSL_ENABLED === 'true'
      ? https.createServer(
          {
            cert: fs.readFileSync(process.env.SSL_CERT_PATH),
            key: fs.readFileSync(process.env.SSL_KEY_PATH),
            ...(process.env.SSL_CA_PATH
              ? { ca: fs.readFileSync(process.env.SSL_CA_PATH) }
              : {})
          },
          app
        )
      : http.createServer(app);
} catch (err) {
  console.error('[taskmgr] Failed to create server (TLS configuration problem):', err.message);
  process.exit(1);
}

server.on('error', (err) => {
  console.error('[taskmgr] Server error:', err.message);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const protocol = process.env.SSL_ENABLED === 'true' ? 'https' : 'http';
  console.log(`[taskmgr] API listening on ${protocol}://0.0.0.0:${PORT}`);
  console.log(`[taskmgr] Health check: ${protocol}://0.0.0.0:${PORT}/health`);

  checkDatabaseConnection()
    .then(() => {
      console.log('[taskmgr] Database connection OK');
    })
    .catch((err) => {
      console.error('[taskmgr] Database connection FAILED:', err.message);
    });
});

function shutdown(signal) {
  console.log(`[taskmgr] Received ${signal}, shutting down...`);
  server.close(() => {
    console.log('[taskmgr] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[taskmgr] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[taskmgr] Uncaught exception:', err);
});

module.exports = app;