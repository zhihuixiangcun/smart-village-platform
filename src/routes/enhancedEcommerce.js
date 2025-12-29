/**
 * 增强电商API路由
 * 处理农产品销售、拼团团购、农资采购等RESTful接口
 */

const express = require('express');
const router = express.Router();
const enhancedEcommerceController = require('../controllers/enhancedEcommerceController');
const { authenticate } = require('../middleware/auth');
const { body, param } = require('express-validator');

// 验证中间件
const validate = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

// ==================== 农产品销售 ====================

/**
 * @route   GET /api/v1/villages/:villageId/products
 * @desc    获取村庄商品列表
 * @access  Public
 */
router.get(
  '/villages/:villageId/products',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  enhancedEcommerceController.getProducts
);

/**
 * @route   GET /api/v1/products/:productId
 * @desc    获取商品详情
 * @access  Public
 */
router.get(
  '/products/:productId',
  param('productId').isMongoId().withMessage('productId无效'),
  validate,
  enhancedEcommerceController.getProductDetail
);

// ==================== 拼团团购 ====================

/**
 * @route   POST /api/v1/group-buys
 * @desc    创建拼团活动
 * @access  Private
 */
router.post(
  '/group-buys',
  authenticate,
  body('productId').isMongoId().withMessage('productId无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('tiers').isArray().withMessage('tiers必须是数组'),
  body('targetQuantity').isInt({ min: 2 }).withMessage('targetQuantity必须大于等于2'),
  body('startTime').isISO8601().withMessage('startTime格式无效'),
  body('endTime').isISO8601().withMessage('endTime格式无效'),
  validate,
  enhancedEcommerceController.createGroupBuy
);

/**
 * @route   POST /api/v1/group-buys/:groupBuyId/join
 * @desc    加入拼团
 * @access  Private
 */
router.post(
  '/group-buys/:groupBuyId/join',
  authenticate,
  param('groupBuyId').isMongoId().withMessage('groupBuyId无效'),
  body('quantity').isInt({ min: 1 }).withMessage('quantity必须大于0'),
  validate,
  enhancedEcommerceController.joinGroupBuy
);

/**
 * @route   PUT /api/v1/group-buys/:groupBuyId/participants/:participantId/payment
 * @desc    确认参与者支付
 * @access  Private
 */
router.put(
  '/group-buys/:groupBuyId/participants/:participantId/payment',
  authenticate,
  param('groupBuyId').isMongoId().withMessage('groupBuyId无效'),
  param('participantId').isMongoId().withMessage('participantId无效'),
  body('paymentId').notEmpty().withMessage('paymentId不能为空'),
  validate,
  enhancedEcommerceController.confirmParticipantPayment
);

/**
 * @route   GET /api/v1/villages/:villageId/group-buys
 * @desc    获取拼团列表
 * @access  Public
 */
router.get(
  '/villages/:villageId/group-buys',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  enhancedEcommerceController.getGroupBuys
);

/**
 * @route   GET /api/v1/group-buys/:groupBuyId
 * @desc    获取拼团详情
 * @access  Public
 */
router.get(
  '/group-buys/:groupBuyId',
  param('groupBuyId').isMongoId().withMessage('groupBuyId无效'),
  validate,
  enhancedEcommerceController.getGroupBuyDetail
);

// ==================== 农资采购 ====================

/**
 * @route   GET /api/v1/villages/:villageId/agricultural-supplies
 * @desc    获取农资列表
 * @access  Public
 */
router.get(
  '/villages/:villageId/agricultural-supplies',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  enhancedEcommerceController.getAgriculturalSupplies
);

/**
 * @route   POST /api/v1/agricultural-supplies
 * @desc    创建农资商品
 * @access  Private
 */
router.post(
  '/agricultural-supplies',
  authenticate,
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('supplierId').isMongoId().withMessage('supplierId无效'),
  body('name').notEmpty().withMessage('name不能为空'),
  body('category').isIn(['seed', 'fertilizer', 'pesticide', 'feed', 'equipment', 'other']).withMessage('category无效'),
  body('price').isFloat({ min: 0 }).withMessage('price必须大于等于0'),
  body('stock').isInt({ min: 0 }).withMessage('stock必须大于等于0'),
  validate,
  enhancedEcommerceController.createAgriculturalSupply
);

/**
 * @route   PUT /api/v1/agricultural-supplies/:supplyId/stock
 * @desc    更新库存
 * @access  Private
 */
router.put(
  '/agricultural-supplies/:supplyId/stock',
  authenticate,
  param('supplyId').isMongoId().withMessage('supplyId无效'),
  body('quantityChange').isInt().withMessage('quantityChange必须是整数'),
  validate,
  enhancedEcommerceController.updateSupplyStock
);

// ==================== 集体采购 ====================

/**
 * @route   POST /api/v1/bulk-purchases
 * @desc    创建集体采购
 * @access  Private
 */
router.post(
  '/bulk-purchases',
  authenticate,
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('title').notEmpty().withMessage('title不能为空'),
  body('type').isIn(['seed', 'fertilizer', 'pesticide', 'equipment', 'mixed']).withMessage('type无效'),
  body('targetQuantity').isInt({ min: 1 }).withMessage('targetQuantity必须大于0'),
  body('estimatedBudget').isFloat({ min: 0 }).withMessage('estimatedBudget必须大于等于0'),
  body('registrationStart').isISO8601().withMessage('registrationStart格式无效'),
  body('registrationEnd').isISO8601().withMessage('registrationEnd格式无效'),
  validate,
  enhancedEcommerceController.createBulkPurchase
);

/**
 * @route   POST /api/v1/bulk-purchases/:purchaseId/join
 * @desc    加入集体采购
 * @access  Private
 */
router.post(
  '/bulk-purchases/:purchaseId/join',
  authenticate,
  param('purchaseId').isMongoId().withMessage('purchaseId无效'),
  body('farmArea').isFloat({ min: 0 }).withMessage('farmArea必须大于等于0'),
  body('requiredQuantity').isInt({ min: 1 }).withMessage('requiredQuantity必须大于0'),
  validate,
  enhancedEcommerceController.joinBulkPurchase
);

/**
 * @route   PUT /api/v1/bulk-purchases/:purchaseId/approve
 * @desc    审核集体采购
 * @access  Private
 */
router.put(
  '/bulk-purchases/:purchaseId/approve',
  authenticate,
  param('purchaseId').isMongoId().withMessage('purchaseId无效'),
  body('approved').isBoolean().withMessage('approved必须是布尔值'),
  validate,
  enhancedEcommerceController.approveBulkPurchase
);

/**
 * @route   POST /api/v1/bulk-purchases/:purchaseId/quotes
 * @desc    添加供应商报价
 * @access  Private
 */
router.post(
  '/bulk-purchases/:purchaseId/quotes',
  authenticate,
  param('purchaseId').isMongoId().withMessage('purchaseId无效'),
  body('supplierId').isMongoId().withMessage('supplierId无效'),
  body('quotedPrice').isFloat({ min: 0 }).withMessage('quotedPrice必须大于等于0'),
  validate,
  enhancedEcommerceController.addSupplierQuote
);

/**
 * @route   PUT /api/v1/bulk-purchases/:purchaseId/suppliers/:supplierId/select
 * @desc    选择供应商
 * @access  Private
 */
router.put(
  '/bulk-purchases/:purchaseId/suppliers/:supplierId/select',
  authenticate,
  param('purchaseId').isMongoId().withMessage('purchaseId无效'),
  param('supplierId').isMongoId().withMessage('supplierId无效'),
  validate,
  enhancedEcommerceController.selectSupplier
);

/**
 * @route   GET /api/v1/villages/:villageId/bulk-purchases
 * @desc    获取集体采购列表
 * @access  Public
 */
router.get(
  '/villages/:villageId/bulk-purchases',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  enhancedEcommerceController.getBulkPurchases
);

/**
 * @route   GET /api/v1/bulk-purchases/:purchaseId
 * @desc    获取集体采购详情
 * @access  Public
 */
router.get(
  '/bulk-purchases/:purchaseId',
  param('purchaseId').isMongoId().withMessage('purchaseId无效'),
  validate,
  enhancedEcommerceController.getBulkPurchaseDetail
);

// ==================== 购物车 ====================

/**
 * @route   POST /api/v1/cart
 * @desc    添加到购物车
 * @access  Private
 */
router.post(
  '/cart',
  authenticate,
  body('productId').isMongoId().withMessage('productId无效'),
  body('quantity').isInt({ min: 1 }).withMessage('quantity必须大于0'),
  validate,
  enhancedEcommerceController.addToCart
);

/**
 * @route   PUT /api/v1/cart/items/:itemId
 * @desc    更新购物车商品数量
 * @access  Private
 */
router.put(
  '/cart/items/:itemId',
  authenticate,
  param('itemId').isMongoId().withMessage('itemId无效'),
  body('quantity').isInt().withMessage('quantity必须是整数'),
  validate,
  enhancedEcommerceController.updateCartItem
);

/**
 * @route   DELETE /api/v1/cart/items/:itemId
 * @desc    删除购物车商品
 * @access  Private
 */
router.delete(
  '/cart/items/:itemId',
  authenticate,
  param('itemId').isMongoId().withMessage('itemId无效'),
  validate,
  enhancedEcommerceController.removeCartItem
);

/**
 * @route   GET /api/v1/cart
 * @desc    获取购物车
 * @access  Private
 */
router.get(
  '/cart',
  authenticate,
  enhancedEcommerceController.getCart
);

// ==================== 定时任务 ====================

/**
 * @route   POST /api/v1/admin/group-buys/check-status
 * @desc    检查拼团活动状态
 * @access  Admin
 */
router.post(
  '/admin/group-buys/check-status',
  authenticate,
  enhancedEcommerceController.checkGroupBuyStatus
);

module.exports = router;
