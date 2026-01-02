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
 * @query   radius - 搜索半径（米，默认50000）
 */
router.get('/recommendations', purchaserController.getRecommendations);

module.exports = router;
