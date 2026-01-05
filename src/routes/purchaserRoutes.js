/**
 * 采购商路由
 * 支持个人采购商和商家采购商的注册、登录和信息管理
 */

const express = require('express');
const router = express.Router();
const purchaserController = require('../controllers/purchaserController');
const multer = require('multer');
const path = require('path');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'purchaser-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片和PDF文件'));
    }
  }
});

/**
 * 采购商路由
 */

/**
 * @route   POST /api/v1/purchaser/register
 * @desc    采购商注册（个人或商家）
 * @access  Public
 * @body    purchaserType - individual 或 business
 * @body    basicInfo.name - 姓名
 * @body    basicInfo.phone - 手机号
 * @body    basicInfo.idCard - 身份证号
 * @files   idCardFront - 身份证正面照片
 * @files   idCardBack - 身份证反面照片
 * @files   businessLicense - 营业执照（商家必填）
 */
router.post('/register',
  upload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'businessLicense', maxCount: 1 }
  ]),
  purchaserController.register
);

/**
 * @route   POST /api/v1/purchaser/login
 * @desc    采购商登录
 * @access  Public
 * @body    phone - 手机号
 * @body    idCard - 身份证号
 */
router.post('/login', purchaserController.login);

/**
 * @route   GET /api/v1/purchaser/me
 * @desc    获取采购商个人信息
 * @access  Private (需要认证)
 */
router.get('/me', purchaserController.getProfile);

/**
 * @route   PUT /api/v1/purchaser/me
 * @desc    更新采购商个人信息
 * @access  Private (需要认证)
 */
router.put('/me', purchaserController.updateProfile);

/**
 * @route   GET /api/v1/purchaser/recommendations
 * @desc    获取智能推荐信息
 * @access  Private (需要认证)
 * @query   limit - 返回数量限制
 */
router.get('/recommendations', purchaserController.getRecommendations);

/**
 * @route   GET /api/v1/purchaser/nearby-suppliers
 * @desc    获取附近推荐商家
 * @access  Private (需要认证)
 * @query   latitude - 纬度
 * @query   longitude - 经度
 * @query   radius - 搜索半径（公里）
 * @query   category - 商品类目筛选
 * @query   sortBy - 排序方式（distance/rating/sales）
 */
router.get('/nearby-suppliers', purchaserController.getNearbySuppliers);

/**
 * @route   GET /api/v1/purchaser/stats
 * @desc    获取采购商统计数据
 * @access  Private (需要认证)
 */
router.get('/stats', purchaserController.getStats);

/**
 * @route   GET /api/v1/purchaser/orders
 * @desc    获取订单列表
 * @access  Private (需要认证)
 * @query   page - 页码
 * @query   limit - 每页数量
 * @query   status - 订单状态筛选
 */
router.get('/orders', purchaserController.getOrders);

/**
 * @route   PUT /api/v1/purchaser/orders/:id/confirm
 * @desc    确认收货
 * @access  Private (需要认证)
 */
router.put('/orders/:id/confirm', purchaserController.confirmOrder);

/**
 * @route   PUT /api/v1/purchaser/orders/:id/cancel
 * @desc    取消订单
 * @access  Private (需要认证)
 */
router.put('/orders/:id/cancel', purchaserController.cancelOrder);

/**
 * @route   GET /api/v1/purchaser/requirements
 * @desc    获取采购需求列表
 * @access  Private (需要认证)
 */
router.get('/requirements', purchaserController.getRequirements);

/**
 * @route   POST /api/v1/purchaser/requirements
 * @desc    创建采购需求
 * @access  Private (需要认证)
 */
router.post('/requirements', purchaserController.createRequirement);

/**
 * @route   DELETE /api/v1/purchaser/requirements/:id
 * @desc    删除采购需求
 * @access  Private (需要认证)
 */
router.delete('/requirements/:id', purchaserController.deleteRequirement);

/**
 * @route   GET /api/v1/purchaser/suppliers
 * @desc    获取关注的供应商列表
 * @access  Private (需要认证)
 */
router.get('/suppliers', purchaserController.getSuppliers);

/**
 * @route   DELETE /api/v1/purchaser/suppliers/:id
 * @desc    取消关注供应商
 * @access  Private (需要认证)
 */
router.delete('/suppliers/:id', purchaserController.unfollowSupplier);

/**
 * @route   POST /api/v1/purchaser/suppliers/:id/follow
 * @desc    关注供应商
 * @access  Private (需要认证)
 */
router.post('/suppliers/:id/follow', purchaserController.followSupplier);

/**
 * @route   GET /api/v1/purchaser/favorites
 * @desc    获取收藏列表
 * @access  Private (需要认证)
 */
router.get('/favorites', purchaserController.getFavorites);

/**
 * @route   DELETE /api/v1/purchaser/favorites/:id
 * @desc    删除收藏
 * @access  Private (需要认证)
 */
router.delete('/favorites/:id', purchaserController.removeFavorite);

/**
 * @route   GET /api/v1/purchaser/messages
 * @desc    获取消息列表
 * @access  Private (需要认证)
 */
router.get('/messages', purchaserController.getMessages);

/**
 * @route   PUT /api/v1/purchaser/messages/:id/read
 * @desc    标记消息已读
 * @access  Private (需要认证)
 */
router.put('/messages/:id/read', purchaserController.markMessageRead);

/**
 * @route   PUT /api/v1/purchaser/messages/read-all
 * @desc    标记所有消息已读
 * @access  Private (需要认证)
 */
router.put('/messages/read-all', purchaserController.markAllMessagesRead);

/**
 * @route   GET /api/v1/purchaser/activities
 * @desc    获取最近动态
 * @access  Private (需要认证)
 * @query   limit - 返回数量限制
 */
router.get('/activities', purchaserController.getActivities);

/**
 * @route   PUT /api/v1/purchaser/preferences
 * @desc    更新偏好设置
 * @access  Private (需要认证)
 */
router.put('/preferences', purchaserController.updatePreferences);

/**
 * @route   PUT /api/v1/purchaser/change-password
 * @desc    修改密码
 * @access  Private (需要认证)
 */
router.put('/change-password', purchaserController.changePassword);

/**
 * @route   GET /api/v1/purchaser/lifestyle-services
 * @desc    获取附近生活服务（吃喝玩乐）
 * @access  Private (需要认证)
 * @query   category - 类别（dining/entertainment/hotel/shopping/tourism）
 * @query   subCategory - 子类别
 * @query   distance - 距离范围（公里）
 * @query   sortBy - 排序方式（distance/rating/price）
 * @query   priceLevel - 价格等级（1/2/3/4）
 * @query   keyword - 搜索关键词
 */
router.get('/lifestyle-services', purchaserController.getLifestyleServices);

/**
 * @route   POST /api/v1/purchaser/lifestyle-services/:id/collect
 * @desc    收藏生活服务
 * @access  Private (需要认证)
 */
router.post('/lifestyle-services/:id/collect', purchaserController.collectLifestyleService);

module.exports = router;
