const { pool } = require('../config/db');
const { validateProject } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/projects
 * Lists the authenticated user's projects with open (not done) task counts.
 */
const listProjects = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
        p.id,
        p.name,
        p.color,
        p.created_at,
        COALESCE(SUM(CASE WHEN t.status <> 'done' THEN 1 ELSE 0 END), 0) AS open_task_count,
        COALESCE(COUNT(t.id), 0) AS task_count
       FROM projects p
       LEFT JOIN tasks t
         ON t.project_id = p.id
        AND t.user_id = p.user_id
      WHERE p.user_id = ?
      GROUP BY p.id, p.name, p.color, p.created_at
      ORDER BY p.created_at DESC, p.id DESC`,
    [req.userId]
  );

  const projects = rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    created_at: row.created_at,
    open_task_count: Number(row.open_task_count) || 0,
    task_count: Number(row.task_count) || 0,
  }));

  res.json({ projects });
});

/**
 * POST /api/projects
 * Creates a project for the authenticated user.
 */
const createProject = asyncHandler(async (req, res) => {
  const { valid, errors, value } = validateProject(req.body || {});

  if (!valid) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  const [existing] = await pool.query(
    'SELECT id FROM projects WHERE user_id = ? AND name = ? LIMIT 1',
    [req.userId, value.name]
  );

  if (existing.length > 0) {
    return res.status(409).json({ error: 'A project with that name already exists' });
  }

  const [result] = await pool.query(
    'INSERT INTO projects (user_id, name, color) VALUES (?, ?, ?)',
    [req.userId, value.name, value.color]
  );

  const [rows] = await pool.query(
    'SELECT id, name, color, created_at FROM projects WHERE id = ? AND user_id = ? LIMIT 1',
    [result.insertId, req.userId]
  );

  if (rows.length === 0) {
    return res.status(500).json({ error: 'Project could not be created' });
  }

  const project = {
    ...rows[0],
    open_task_count: 0,
    task_count: 0,
  };

  res.status(201).json({ project });
});

/**
 * DELETE /api/projects/:id
 * Deletes a project owned by the authenticated user.
 * Tasks remain (project_id is set to NULL by the FK ON DELETE SET NULL rule).
 */
const deleteProject = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid project id' });
  }

  const [result] = await pool.query(
    'DELETE FROM projects WHERE id = ? AND user_id = ?',
    [id, req.userId]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ success: true, id });
});

module.exports = {
  listProjects,
  createProject,
  deleteProject,
};