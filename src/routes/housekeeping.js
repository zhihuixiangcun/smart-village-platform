const express = require('express');
const router = express.Router();
const {
  getProviders,
  getProviderById,
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  evaluateOrder,
  getServiceTypes,
} = require('../controllers/housekeepingController');

const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/providers', getProviders);

router.get('/providers/:id', getProviderById);

router.get('/types', getServiceTypes);

router.post('/orders', createOrder);

router.get('/orders', getOrders);

router.get('/orders/:id', getOrderById);

router.put('/orders/:id', updateOrder);

router.post('/orders/:id/cancel', cancelOrder);

router.post('/orders/:id/evaluate', evaluateOrder);

module.exports = router;
