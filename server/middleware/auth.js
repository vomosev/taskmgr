'use strict';

const { pool } = require('../config/db');

/**
 * requireAuth
 * Blocks the request with 401 when there is no authenticated session.
 * On success attaches req.userId for downstream controllers.
 */
function requireAuth(req, res, next) {
  const userId = req.session && req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  req.userId = userId;
  return next();
}

/**
 * attachUser
 * Non-blocking middleware: when a session exists it loads the user's
 * id/name/email from the database and attaches it to req.user.
 * If the session points at a user that no longer exists, the session is
 * cleared so stale cookies do not linger.
 */
async function attachUser(req, res, next) {
  const userId = req.session && req.session.userId;

  if (!userId) {
    req.user = null;
    return next();
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!rows || rows.length === 0) {
      req.user = null;
      if (req.session) {
        req.session.userId = null;
        req.session.destroy(() => next());
        return;
      }
      return next();
    }

    req.user = rows[0];
    req.userId = rows[0].id;
    return next();
  } catch (err) {
    err.status = err.status || 500;
    return next(err);
  }
}

module.exports = { requireAuth, attachUser };