const express = require('express');
const router = express.Router();
const {
  createIssue,
  getIssues,
  getPublicIssues,
  getIssueById,
  updateIssue,
  updateStatus,
  evaluateIssue,
  addLike,
  removeLike,
  getIssueTypes,
  getIssueStatistics,
  deleteIssue,
} = require('../controllers/propertyController');

const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/types', getIssueTypes);

router.post('/issues', createIssue);

router.get('/issues', getIssues);

router.get('/issues/public', getPublicIssues);

router.get('/issues/statistics', getIssueStatistics);

router.get('/issues/:id', getIssueById);

router.put('/issues/:id', updateIssue);

router.put('/issues/:id/status', updateStatus);

router.post('/issues/:id/evaluate', evaluateIssue);

router.post('/issues/:id/like', addLike);

router.delete('/issues/:id/like', removeLike);

router.delete('/issues/:id', deleteIssue);

module.exports = router;
