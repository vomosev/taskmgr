const { pool } = require('../config/db');
const { validateTask } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

const SORT_MAP = {
  due_date: 't.due_date IS NULL, t.due_date ASC, t.created_at DESC',
  created_at: 't.created_at DESC',
  priority: "FIELD(t.priority, 'high', 'medium', 'low'), t.created_at DESC",
  title: 't.title ASC',
};

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date
      ? (row.due_date instanceof Date
          ? row.due_date.toISOString().slice(0, 10)
          : String(row.due_date).slice(0, 10))
      : null,
    project_id: row.project_id,
    project_name: row.project_name || null,
    project_color: row.project_color || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
         t.project_id, t.created_at, t.updated_at,
         p.name AS project_name, p.color AS project_color
  FROM tasks t
  LEFT JOIN projects p ON p.id = t.project_id
`;

const listTasks = asyncHandler(async (req, res) => {
  const { status, priority, projectId, q, sort } = req.query;

  const where = ['t.user_id = ?'];
  const params = [req.userId];

  if (status && STATUSES.includes(String(status))) {
    where.push('t.status = ?');
    params.push(String(status));
  }

  if (priority && PRIORITIES.includes(String(priority))) {
    where.push('t.priority = ?');
    params.push(String(priority));
  }

  if (projectId !== undefined && projectId !== '' && projectId !== null) {
    if (String(projectId) === 'none') {
      where.push('t.project_id IS NULL');
    } else {
      const pid = Number.parseInt(String(projectId), 10);
      if (Number.isInteger(pid) && pid > 0) {
        where.push('t.project_id = ?');
        params.push(pid);
      }
    }
  }

  if (q && String(q).trim()) {
    const term = `%${String(q).trim().slice(0, 100)}%`;
    where.push('(t.title LIKE ? OR t.description LIKE ?)');
    params.push(term, term);
  }

  const orderBy = SORT_MAP[String(sort)] || SORT_MAP.created_at;

  const sql = `${BASE_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT 500`;

  const [rows] = await pool.query(sql, params);
  res.json({ tasks: rows.map(mapRow) });
});

const getTask = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE t.id = ? AND t.user_id = ? LIMIT 1`,
    [id, req.userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ task: mapRow(rows[0]) });
});

async function assertProjectOwned(projectId, userId) {
  if (projectId === null || projectId === undefined) return true;
  const [rows] = await pool.query(
    'SELECT id FROM projects WHERE id = ? AND user_id = ? LIMIT 1',
    [projectId, userId]
  );
  return rows.length > 0;
}

const createTask = asyncHandler(async (req, res) => {
  const { valid, errors, value } = validateTask(req.body || {}, { partial: false });
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  if (value.project_id !== null && value.project_id !== undefined) {
    const owned = await assertProjectOwned(value.project_id, req.userId);
    if (!owned) {
      return res.status(400).json({ error: 'Validation failed', errors: { project_id: 'Project not found' } });
    }
  }

  const [result] = await pool.query(
    `INSERT INTO tasks (user_id, project_id, title, description, status, priority, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      req.userId,
      value.project_id ?? null,
      value.title,
      value.description ?? null,
      value.status || 'todo',
      value.priority || 'medium',
      value.due_date ?? null,
    ]
  );

  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE t.id = ? AND t.user_id = ? LIMIT 1`,
    [result.insertId, req.userId]
  );

  res.status(201).json({ task: mapRow(rows[0]) });
});

const updateTask = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const [existing] = await pool.query(
    'SELECT id FROM tasks WHERE id = ? AND user_id = ? LIMIT 1',
    [id, req.userId]
  );
  if (!existing.length) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { valid, errors, value } = validateTask(req.body || {}, { partial: true });
  if (!valid) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  const fields = [];
  const params = [];

  if (Object.prototype.hasOwnProperty.call(value, 'title')) {
    fields.push('title = ?');
    params.push(value.title);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'description')) {
    fields.push('description = ?');
    params.push(value.description ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'status')) {
    fields.push('status = ?');
    params.push(value.status);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'priority')) {
    fields.push('priority = ?');
    params.push(value.priority);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'due_date')) {
    fields.push('due_date = ?');
    params.push(value.due_date ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'project_id')) {
    if (value.project_id !== null && value.project_id !== undefined) {
      const owned = await assertProjectOwned(value.project_id, req.userId);
      if (!owned) {
        return res
          .status(400)
          .json({ error: 'Validation failed', errors: { project_id: 'Project not found' } });
      }
    }
    fields.push('project_id = ?');
    params.push(value.project_id ?? null);
  }

  if (!fields.length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  params.push(id, req.userId);

  await pool.query(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );

  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE t.id = ? AND t.user_id = ? LIMIT 1`,
    [id, req.userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ task: mapRow(rows[0]) });
});

const deleteTask = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const [result] = await pool.query(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?',
    [id, req.userId]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ ok: true, id });
});

const getStats = asyncHandler(async (req, res) => {
  const [statusRows] = await pool.query(
    'SELECT status, COUNT(*) AS count FROM tasks WHERE user_id = ? GROUP BY status',
    [req.userId]
  );

  const stats = { todo: 0, in_progress: 0, done: 0, total: 0, overdue: 0 };
  for (const row of statusRows) {
    const count = Number(row.count) || 0;
    if (Object.prototype.hasOwnProperty.call(stats, row.status)) {
      stats[row.status] = count;
    }
    stats.total += count;
  }

  const [overdueRows] = await pool.query(
    `SELECT COUNT(*) AS count FROM tasks
     WHERE user_id = ? AND status <> 'done' AND due_date IS NOT NULL AND due_date < CURDATE()`,
    [req.userId]
  );
  stats.overdue = Number(overdueRows[0] ? overdueRows[0].count : 0) || 0;

  const [upcoming] = await pool.query(
    `${BASE_SELECT}
     WHERE t.user_id = ? AND t.status <> 'done'
     ORDER BY t.due_date IS NULL, t.due_date ASC, t.created_at DESC
     LIMIT 5`,
    [req.userId]
  );

  res.json({ stats, upcoming: upcoming.map(mapRow) });
});

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStats,
};