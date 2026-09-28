const express = require('express');
const { checkDatabaseConnection } = require('../config/db');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'taskmgr-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/health/db', async (req, res) => {
  try {
    await checkDatabaseConnection();
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('[health] database check failed:', err && err.message ? err.message : err);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

module.exports = router;