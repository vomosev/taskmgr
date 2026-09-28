'use strict';

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool } = require('./db');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

const isProduction = process.env.NODE_ENV === 'production';
const sslEnabled = process.env.SSL_ENABLED === 'true';

let store;

try {
  store = new MySQLStore(
    {
      createDatabaseTable: false,
      clearExpired: true,
      checkExpirationInterval: 15 * 60 * 1000,
      expiration: SEVEN_DAYS_MS,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data',
        },
      },
    },
    pool
  );

  store.on('error', (err) => {
    console.error('[session] MySQL session store error:', err && err.message ? err.message : err);
  });
} catch (err) {
  console.error(
    '[session] Failed to initialise MySQL session store, falling back to in-memory sessions:',
    err && err.message ? err.message : err
  );
  store = undefined;
}

const cookie = {
  httpOnly: true,
  secure: sslEnabled,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: SEVEN_DAYS_MS,
  path: '/',
};

if (process.env.COOKIE_DOMAIN) {
  cookie.domain = process.env.COOKIE_DOMAIN;
}

const sessionMiddleware = session({
  name: 'taskmgr.sid',
  secret: process.env.SESSION_SECRET || 'taskmgr-development-secret-change-me',
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie,
});

module.exports = sessionMiddleware;
module.exports.sessionMiddleware = sessionMiddleware;
module.exports.sessionStore = store;
module.exports.SESSION_COOKIE_NAME = 'taskmgr.sid';
module.exports.sessionCookieOptions = cookie;