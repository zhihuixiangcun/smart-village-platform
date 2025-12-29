/**
 * 产品发布管理路由
 */

const express = require('express');
const router = express.Router();
const productPublicationController = require('../controllers/productPublicationController');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('只支持上传图片格式（jpeg、jpg、png、gif、webp）'));
  }
});

// 验证规则
const createPublicationValidation = [
  body('productName').trim().notEmpty().withMessage('产品名称不能为空').isLength({ max: 100 }).withMessage('产品名称不能超过100字'),
  body('productCategory').isIn(['vegetables', 'fruits', 'grains', 'livestock', 'aquatic', 'specialty', 'daily_necessities', 'appliances', 'furniture', 'building_materials', 'housekeeping', 'repair', 'moving', 'technical', 'secondhand', 'rental', 'wanted']).withMessage('产品分类无效'),
  body('description').trim().notEmpty().withMessage('产品描述不能为空').isLength({ max: 2000 }).withMessage('产品描述不能超过2000字'),
  body('price').isFloat({ min: 0 }).withMessage('价格必须大于等于0'),
  body('priceType').isIn(['fixed', 'negotiable', 'range']).withMessage('价格类型无效'),
  body('validDays').isInt({ min: 1, max: 365 }).withMessage('有效期必须在1-365天之间'),
  body('contactPhone').trim().notEmpty().withMessage('联系电话不能为空').isMobilePhone().withMessage('手机号格式不正确'),
  body('contactAddress').trim().notEmpty().withMessage('交易地点不能为空')
];

// ==================== 基础 CRUD ====================

/**
 * @route   POST /api/v1/products
 * @desc    创建产品发布
 * @access  Private
 */
router.post('/', createPublicationValidation, productPublicationController.createPublication);

/**
 * @route   GET /api/v1/products/categories
 * @desc    获取产品分类
 * @access  Public
 */
router.get('/categories', productPublicationController.getCategories);

/**
 * @route   GET /api/v1/products/village/:villageId/overview
 * @desc    获取村庄产品概览
 * @access  Private
 */
router.get('/village/:villageId/overview', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误')
], productPublicationController.getVillageOverview);

/**
 * @route   GET /api/v1/products/village/:villageId/list
 * @desc    获取产品列表
 * @access  Public
 */
router.get('/village/:villageId/list', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须在1-100之间'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip不能为负数')
], productPublicationController.getProductList);

/**
 * @route   GET /api/v1/products/village/:villageId/pending
 * @desc    获取待审核产品列表
 * @access  Private (需要村干部权限)
 */
router.get('/village/:villageId/pending', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须在1-100之间'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip不能为负数')
], productPublicationController.getPendingList);

/**
 * @route   GET /api/v1/products/village/:villageId/search
 * @desc    搜索产品
 * @access  Public
 */
router.get('/village/:villageId/search', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须在1-100之间')
], productPublicationController.searchProducts);

/**
 * @route   GET /api/v1/products/village/:villageId/statistics
 * @desc    获取产品统计
 * @access  Private
 */
router.get('/village/:villageId/statistics', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误')
], productPublicationController.getStatistics);

/**
 * @route   GET /api/v1/products/village/:villageId/popular-categories
 * @desc    获取热门分类
 * @access  Public
 */
router.get('/village/:villageId/popular-categories', [
  param('villageId').isMongoId().withMessage('村庄ID格式错误'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('limit必须在1-20之间')
], productPublicationController.getPopularCategories);

/**
 * @route   GET /api/v1/products/nearby
 * @desc    获取附近的产品
 * @access  Public
 */
router.get('/nearby', [
  query('longitude').isFloat().withMessage('经度格式错误'),
  query('latitude').isFloat().withMessage('纬度格式错误')
], productPublicationController.getNearbyProducts);

// ==================== 用户操作 ====================

/**
 * @route   GET /api/v1/products/my
 * @desc    获取我发布的产品
 * @access  Private
 */
router.get('/my', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
], productPublicationController.getMyProducts);

/**
 * @route   GET /api/v1/products/favorites
 * @desc    获取我的收藏
 * @access  Private
 */
router.get('/favorites', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skip').optional().isInt({ min: 0 })
], productPublicationController.getFavorites);

// ==================== 产品操作 ====================

/**
 * @route   GET /api/v1/products/:id
 * @desc    获取产品详情
 * @access  Public
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('产品ID格式错误')
], productPublicationController.getProductDetail);

/**
 * @route   PUT /api/v1/products/:id/review
 * @desc    审核产品
 * @access  Private (需要村干部权限)
 */
router.put('/:id/review', [
  param('id').isMongoId().withMessage('产品ID格式错误'),
  body('approved').isBoolean().withMessage('approved必须是布尔值')
], productPublicationController.reviewProduct);

/**
 * @route   PUT /api/v1/products/:id/offline
 * @desc    下架产品
 * @access  Private
 */
router.put('/:id/offline', [
  param('id').isMongoId().withMessage('产品ID格式错误')
], productPublicationController.offlineProduct);

/**
 * @route   PUT /api/v1/products/:id/refresh
 * @desc    刷新产品
 * @access  Private
 */
router.put('/:id/refresh', [
  param('id').isMongoId().withMessage('产品ID格式错误')
], productPublicationController.refreshProduct);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    删除产品
 * @access  Private
 */
router.delete('/:id', [
  param('id').isMongoId().withMessage('产品ID格式错误')
], productPublicationController.deleteProduct);

/**
 * @route   POST /api/v1/products/:id/favorite
 * @desc    收藏/取消收藏产品
 * @access  Private
 */
router.post('/:id/favorite', [
  param('id').isMongoId().withMessage('产品ID格式错误'),
  body('favorite').optional().isBoolean().withMessage('favorite必须是布尔值')
], productPublicationController.toggleFavorite);

/**
 * @route   POST /api/v1/products/:id/report
 * @desc    举报产品
 * @access  Private
 */
router.post('/:id/report', [
  param('id').isMongoId().withMessage('产品ID格式错误'),
  body('reason').isIn(['虚假信息', '价格不符', '图片不符', '联系方式无效', '欺诈', '违规内容', '其他']).withMessage('请选择举报原因')
], productPublicationController.reportProduct);

// ==================== 批量操作 ====================

/**
 * @route   POST /api/v1/products/batch/review
 * @desc    批量审核产品
 * @access  Private (需要村干部权限)
 */
router.post('/batch/review', [
  body('ids').isArray({ min: 1 }).withMessage('请选择要审核的产品'),
  body('ids.*').isMongoId().withMessage('ID格式错误'),
  body('approved').optional().isBoolean().withMessage('approved必须是布尔值')
], productPublicationController.batchReview);

// ==================== 文件上传 ====================

/**
 * @route   POST /api/v1/products/upload-image
 * @desc    上传产品图片
 * @access  Private
 */
router.post('/upload-image', upload.single('image'), productPublicationController.uploadImage);

/**
 * @route   POST /api/v1/products/upload-images
 * @desc    批量上传产品图片
 * @access  Private
 */
router.post('/upload-images', upload.array('images', 9), productPublicationController.uploadImages);

// ==================== 错误处理 ====================

// 验证错误处理中间件
router.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: err.errors
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '文件大小超过限制（最大5MB）'
    });
  }

  if (err.message === '只支持上传图片格式（jpeg、jpg、png、gif、webp）') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next(err);
});

module.exports = router;
