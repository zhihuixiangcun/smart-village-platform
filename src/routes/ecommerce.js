/**
 * 电商平台路由
 */

const express = require('express');
const router = express.Router();
const ecommerceController = require('../controllers/ecommerceController');
const auth = require('../middleware/auth');

// 农资产品管理
router.post('/agricultural/products', auth.authenticate, ecommerceController.createAgriculturalProduct);
router.get('/agricultural/products', ecommerceController.getAgriculturalProducts);
router.get('/agricultural/products/:productId', ecommerceController.getProductDetail);
router.put('/agricultural/products/:productId', auth.authenticate, ecommerceController.updateProduct);
router.delete('/agricultural/products/:productId', auth.authenticate, ecommerceController.deleteProduct);

// 订单管理
router.post('/orders', auth.authenticate, ecommerceController.createOrder);
router.get('/orders', auth.authenticate, ecommerceController.getOrders);
router.post('/orders/:orderId/payment', auth.authenticate, ecommerceController.processPayment);
router.post('/orders/:orderId/ship', auth.authenticate, ecommerceController.shipOrder);
router.post('/orders/:orderId/complete', auth.authenticate, ecommerceController.completeOrder);

// 农产品供应管理
router.post('/farm-supplies', auth.authenticate, ecommerceController.createFarmProductSupply);
router.get('/farm-supplies', ecommerceController.getFarmProductSupplies);
router.get('/farm-supplies/:productId', ecommerceController.getProductDetail);
router.put('/farm-supplies/:productId', auth.authenticate, ecommerceController.updateProduct);
router.delete('/farm-supplies/:productId', auth.authenticate, ecommerceController.deleteProduct);

// 第三方平台同步
router.post('/sync/platforms', auth.authenticate, auth.requireRole(['admin']), ecommerceController.syncPlatformProducts);

// 购物车管理
router.get('/cart', auth.authenticate, ecommerceController.getShoppingCart);
router.put('/cart', auth.authenticate, ecommerceController.updateShoppingCart);
router.delete('/cart', auth.authenticate, ecommerceController.clearShoppingCart);

// 服务状态
router.get('/service/status', ecommerceController.getServiceStatus);

module.exports = router;