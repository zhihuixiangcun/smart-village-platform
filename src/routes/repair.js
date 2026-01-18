const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  quoteOrder,
  completeOrder,
  cancelOrder,
  evaluateOrder,
  getRepairTypes,
  getOrderStatistics,
} = require('../controllers/repairController');

const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/types', getRepairTypes);

router.post('/orders', createOrder);

router.get('/orders', getOrders);

router.get('/orders/statistics', getOrderStatistics);

router.get('/orders/:id', getOrderById);

router.put('/orders/:id', updateOrder);

router.put('/orders/:id/status', updateOrderStatus);

router.post('/orders/:id/quote', quoteOrder);

router.post('/orders/:id/complete', completeOrder);

router.post('/orders/:id/cancel', cancelOrder);

router.post('/orders/:id/evaluate', evaluateOrder);

module.exports = router;
