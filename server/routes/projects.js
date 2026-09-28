const express = require('express');

const { requireAuth } = require('../middleware/auth');
const {
  listProjects,
  createProject,
  deleteProject,
} = require('../controllers/projectController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listProjects);
router.post('/', createProject);
router.delete('/:id', deleteProject);

module.exports = router;