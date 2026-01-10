/**
 * 文件上传路由
 * 提供通用的文件上传接口
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()  }-${  Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname  }-${  uniqueSuffix  }${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
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
 * 单文件上传
 * POST /api/v1/upload
 */
router.post('/', upload.single('file'), async (req, res) => {
  console.log('[UploadRoutes] ===== FILE UPLOAD START =====');
  console.log('[UploadRoutes] File:', req.file);

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      });
    }

    // 返回文件信息
    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: `/uploads/temp/${req.file.filename}`,
        url: `/uploads/temp/${req.file.filename}`
      }
    });

    console.log('[UploadRoutes] ===== FILE UPLOAD SUCCESS =====');
  } catch (error) {
    console.error('[UploadRoutes] Upload error:', error);
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      details: error.message
    });
  }
});

/**
 * 身份证批量上传
 * POST /api/v1/upload/idcard
 */
router.post('/idcard', upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]), async (req, res) => {
  console.log('[UploadRoutes] ===== ID CARD UPLOAD START =====');
  console.log('[UploadRoutes] Files:', req.files);

  try {
    if (!req.files || (!req.files.idCardFront && !req.files.idCardBack)) {
      return res.status(400).json({
        success: false,
        error: '请上传身份证照片'
      });
    }

    const result = {
      success: true,
      message: '身份证上传成功',
      data: {}
    };

    if (req.files.idCardFront) {
      result.data.idCardFront = {
        filename: req.files.idCardFront[0].filename,
        originalname: req.files.idCardFront[0].originalname,
        path: `/uploads/temp/${req.files.idCardFront[0].filename}`,
        url: `/uploads/temp/${req.files.idCardFront[0].filename}`
      };
    }

    if (req.files.idCardBack) {
      result.data.idCardBack = {
        filename: req.files.idCardBack[0].filename,
        originalname: req.files.idCardBack[0].originalname,
        path: `/uploads/temp/${req.files.idCardBack[0].filename}`,
        url: `/uploads/temp/${req.files.idCardBack[0].filename}`
      };
    }

    console.log('[UploadRoutes] ===== ID CARD UPLOAD SUCCESS =====');
    res.json(result);
  } catch (error) {
    console.error('[UploadRoutes] ID card upload error:', error);
    res.status(500).json({
      success: false,
      error: '身份证上传失败',
      details: error.message
    });
  }
});

/**
 * 多文件上传
 * POST /api/v1/upload/multiple
 */
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  console.log('[UploadRoutes] ===== MULTIPLE FILE UPLOAD START =====');
  console.log('[UploadRoutes] Files:', req.files);

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/temp/${file.filename}`,
      url: `/uploads/temp/${file.filename}`
    }));

    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        files,
        count: files.length
      }
    });

    console.log('[UploadRoutes] ===== MULTIPLE FILE UPLOAD SUCCESS =====');
  } catch (error) {
    console.error('[UploadRoutes] Multiple upload error:', error);
    res.status(500).json({
      success: false,
      error: '文件上传失败',
      details: error.message
    });
  }
});

/**
 * 身份证 OCR 识别（简化版）
 * POST /api/v1/upload/ocr/idcard
 */
router.post('/ocr/idcard', upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 }
]), async (req, res) => {
  console.log('[UploadRoutes] ===== ID CARD OCR START =====');
  console.log('[UploadRoutes] Files:', req.files);

  try {
    if (!req.files || (!req.files.front && !req.files.back)) {
      return res.status(400).json({
        success: false,
        error: '请上传身份证照片'
      });
    }

    // 简化版OCR响应（实际应用中应调用真实的OCR服务）
    const result = {
      success: true,
      message: '身份证OCR识别成功（模拟）',
      data: {
        front: req.files.front ? {
          filename: req.files.front[0].filename,
          path: `/uploads/temp/${req.files.front[0].filename}`,
          url: `/uploads/temp/${req.files.front[0].filename}`,
          // 模拟OCR识别结果
          ocr: {
            name: '张三',
            idCard: '110101199001011234',
            gender: '男',
            nation: '汉',
            birth: '1990-01-01',
            address: '北京市东城区某某街道123号'
          }
        } : null,
        back: req.files.back ? {
          filename: req.files.back[0].filename,
          path: `/uploads/temp/${req.files.back[0].filename}`,
          url: `/uploads/temp/${req.files.back[0].filename}`,
          // 模拟OCR识别结果
          ocr: {
            issue: '北京市公安局东城分局',
            validDate: '2020.01.01-2030.01.01'
          }
        } : null
      }
    };

    console.log('[UploadRoutes] ===== ID CARD OCR SUCCESS =====');
    res.json(result);
  } catch (error) {
    console.error('[UploadRoutes] ID card OCR error:', error);
    res.status(500).json({
      success: false,
      error: '身份证OCR识别失败',
      details: error.message
    });
  }
});

module.exports = router;
