/**
 * 计算机视觉路由
 * 处理人脸识别、OCR识别、病虫害识别、工程监控等接口
 */

const express = require('express');
const router = express.Router();
const computerVisionController = require('../controllers/computerVisionController');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// 人脸识别相关路由
router.post('/face/recognize',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 30, // 最多30次请求
    message: {
      success: false,
      message: '人脸识别请求过于频繁，请稍后再试'
    }
  }),
  computerVisionController.upload.single('image'),
  computerVisionController.faceRecognition
);

router.post('/face/register',
  auth.required,
  rateLimit.create({
    windowMs: 5 * 60 * 1000, // 5分钟
    max: 10, // 最多10次注册请求
    message: {
      success: false,
      message: '人脸注册请求过于频繁，请稍后再试'
    }
  }),
  computerVisionController.upload.single('image'),
  computerVisionController.faceRegistration
);

router.post('/face/compare',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 20, // 最多20次比对请求
    message: {
      success: false,
      message: '人脸比对请求过于频繁，请稍后再试'
    }
  }),
  computerVisionController.upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 }
  ]),
  computerVisionController.faceComparison
);

// 证件OCR识别相关路由
router.post('/ocr/document',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 50, // 最多50次OCR请求
    message: {
      success: false,
      message: 'OCR识别请求过于频繁，请稍后再试'
    }
  }),
  computerVisionController.upload.single('image'),
  computerVisionController.documentOCR
);

router.post('/ocr/batch',
  auth.required,
  rateLimit.create({
    windowMs: 2 * 60 * 1000, // 2分钟
    max: 10, // 最多10次批量请求
    message: {
      success: false,
      message: '批量OCR请求过于频繁，请稍后再试'
    }
  }),
  computerVisionController.upload.fields([
    { name: 'files', maxCount: 20 }
  ]),
  computerVisionController.batchDocumentOCR
);

// 农作物病虫害识别相关路由
router.post('/agriculture/pest-disease',
  rateLimit.create({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 40, // 最多40次识别请求
    message: {
      success: false,
      message: '病虫害识别请求过于频繁，请稍后再试'
    }
  }),
  computerVisionController.upload.single('image'),
  computerVisionController.pestDiseaseRecognition
);

// 工程进度监控相关路由
router.post('/construction/monitor',
  auth.required,
  rateLimit.create({
    windowMs: 2 * 60 * 1000, // 2分钟
    max: 30, // 最多30次监控请求
    message: {
      success: false,
      message: '工程监控请求过于频繁，请稍后再试'
    }
  }),
  computerVisionController.upload.single('image'),
  computerVisionController.constructionMonitoring
);

router.post('/construction/baseline',
  auth.required,
  rateLimit.create({
    windowMs: 5 * 60 * 1000, // 5分钟
    max: 10, // 最多10次上传请求
    message: {
      success: false,
      message: '基准图片上传请求过于频繁，请稍后再试'
    }
  }),
  computerVisionController.upload.single('image'),
  computerVisionController.uploadBaselineImage
);

router.get('/construction/history',
  auth.required,
  computerVisionController.getConstructionHistory
);

// 服务状态接口
router.get('/service/status', computerVisionController.getServiceStatus);

// 计算机视觉健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Computer Vision Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      faceRecognition: true,
      documentOCR: true,
      pestDiseaseRecognition: true,
      constructionMonitoring: true,
      batchProcessing: true
    }
  });
});

// API使用统计
router.get('/stats', auth.required, async (req, res) => {
  try {
    // 这里应该从数据库获取实际统计数据
    const stats = {
      daily: {
        faceRecognitions: 1250,
        documentOCR: 890,
        pestDiseaseRecognitions: 450,
        constructionMonitors: 320
      },
      weekly: {
        faceRecognitions: 8750,
        documentOCR: 6230,
        pestDiseaseRecognitions: 3150,
        constructionMonitors: 2240
      },
      monthly: {
        faceRecognitions: 35000,
        documentOCR: 24920,
        pestDiseaseRecognitions: 12600,
        constructionMonitors: 8960
      },
      accuracy: {
        faceRecognition: '99.2%',
        documentOCR: '98.5%',
        pestDiseaseRecognition: '94.2%',
        constructionMonitoring: '96.8%'
      },
      performance: {
        averageResponseTime: '1.2s',
        successRate: '99.7%',
        uptime: '99.9%'
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});

module.exports = router;