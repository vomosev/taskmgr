const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStats,
} = require('../controllers/taskController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listTasks);
router.get('/stats', getStats);
router.post('/', createTask);
router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;