const express = require('express');
const router = express.Router();
const {
  createService,
  getServices,
  getUserServices,
  getServiceById,
  updateService,
  deleteService,
  addLike,
  removeLike,
  addComment,
  contactService,
  getServiceTypes,
  getServiceStatistics,
} = require('../controllers/utilityController');

const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/types', getServiceTypes);

router.post('/services', createService);

router.get('/services', getServices);

router.get('/services/statistics', getServiceStatistics);

router.get('/services/my', getUserServices);

router.get('/services/:id', getServiceById);

router.put('/services/:id', updateService);

router.delete('/services/:id', deleteService);

router.post('/services/:id/like', addLike);

router.delete('/services/:id/like', removeLike);

router.post('/services/:id/comment', addComment);

router.post('/services/:id/contact', contactService);

module.exports = router;
