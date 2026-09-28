'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { validateSignup, validateLogin } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

const COOKIE_NAME = 'taskmgr.sid';
const SALT_ROUNDS = 10;

function safeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at || null,
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.regenerate !== 'function') {
      return resolve();
    }
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.save !== 'function') {
      return resolve();
    }
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.destroy !== 'function') {
      return resolve();
    }
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

function clearSessionCookie(res) {
  const options = {
    httpOnly: true,
    secure: process.env.SSL_ENABLED === 'true',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };
  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }
  res.clearCookie(COOKIE_NAME, options);
}

const signup = asyncHandler(async (req, res) => {
  const { valid, errors, value } = validateSignup(req.body || {});
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [value.email]
  );
  if (Array.isArray(existing) && existing.length > 0) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = await bcrypt.hash(value.password, SALT_ROUNDS);

  let insertResult;
  try {
    const [result] = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)',
      [value.email, value.name, passwordHash]
    );
    insertResult = result;
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    throw err;
  }

  const userId = insertResult.insertId;

  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const user = safeUser(Array.isArray(rows) ? rows[0] : null) || {
    id: userId,
    name: value.name,
    email: value.email,
    createdAt: null,
  };

  await regenerateSession(req);
  req.session.userId = user.id;
  await saveSession(req);

  return res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  const { valid, errors, value } = validateLogin(req.body || {});
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ? LIMIT 1',
    [value.email]
  );
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const matches = await bcrypt.compare(value.password, row.password_hash || '');
  if (!matches) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  await regenerateSession(req);
  req.session.userId = row.id;
  await saveSession(req);

  return res.status(200).json({ user: safeUser(row) });
});

const logout = asyncHandler(async (req, res) => {
  await destroySession(req);
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  const userId = req.userId || (req.session && req.session.userId);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row) {
    await destroySession(req);
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Not authenticated' });
  }

  return res.status(200).json({ user: safeUser(row) });
});

module.exports = { signup, login, logout, me };