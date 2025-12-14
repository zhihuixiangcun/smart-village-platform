/**
 * 支付路由
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// 创建支付订单
router.post('/create', paymentController.createOrder);

// 查询支付状态
router.get('/query', paymentController.queryPaymentStatus);

// 申请退款
router.post('/refund', paymentController.refundPayment);

// 支付回调
router.post('/callback/wechat', paymentController.handlePaymentCallback);
router.post('/callback/alipay', paymentController.handlePaymentCallback);

// 获取支付记录
router.get('/record/:orderId', paymentController.getPaymentRecord);

// 获取用户支付记录
router.get('/user', paymentController.getUserPayments);

// 获取村庄支付记录
router.get('/village/:villageId', paymentController.getVillagePayments);

// 统计接口
router.get('/stats', paymentController.getPaymentStats);
router.get('/stats/daily', paymentController.getDailyPaymentStats);
router.get('/stats/business-type', paymentController.getBusinessTypeStats);

// 管理接口
router.get('/pending', paymentController.getPendingPayments);
router.get('/failed', paymentController.getFailedPayments);
router.get('/refunded', paymentController.getRefundedPayments);

// 工具接口
router.post('/retry-query', paymentController.retryPaymentQuery);
router.get('/config', paymentController.getPaymentConfig);

module.exports = router;