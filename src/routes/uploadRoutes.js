/**
 * 文件上传路由
 * 提供通用的文件上传接口
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');

// 安全改进：请求速率限制
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 最多20次上传请求
  message: {
    success: false,
    error: '上传请求过于频繁，请稍后再试'
  }
});

// 安全改进：文件类型白名单（更严格的验证）
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', 
  '.pdf', '.doc', '.docx'
];

// 文件大小限制（按类型）
const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5MB - 图片
  document: 10 * 1024 * 1024,   // 10MB - 文档
  default: 5 * 1024 * 1024      // 5MB - 默认
};

// 安全改进：文件名清理函数
const sanitizeFilename = (filename) => {
  // 移除路径遍历字符
  const sanitized = filename.replace(/[\/\\]/g, '');
  
  // 移除危险字符
  const safeName = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // 限制长度
  const ext = path.extname(safeName);
  const baseName = path.basename(safeName, ext).substring(0, 100);
  
  return `${baseName}${ext}`;
};

// 安全改进：验证文件类型
const validateFileType = (file) => {
  // 检查MIME类型
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return false;
  }
  
  // 检查文件扩展名
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }
  
  // 检查MIME类型和扩展名是否匹配
  const mimeToExtMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
  };
  
  const expectedExt = mimeToExtMap[file.mimetype];
  if (expectedExt && ext !== expectedExt) {
    return false;
  }
  
  return true;
};

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(sanitizedOriginalName)}`);
  }
});

// 安全改进：增强的multer配置
const secureUpload = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.default,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // 验证文件类型
    if (!validateFileType(file)) {
      return cb(new Error('不支持的文件类型，仅支持: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX'), false);
    }
    
    // 验证文件名
    const sanitized = sanitizeFilename(file.originalname);
    if (sanitized !== file.originalname) {
      return cb(new Error('文件名包含非法字符'), false);
    }
    
    cb(null, true);
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
router.post('/', uploadRateLimiter, secureUpload.single('file'), async (req, res) => {
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
router.post('/idcard', uploadRateLimiter, secureUpload.fields([
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
router.post('/multiple', uploadRateLimiter, secureUpload.array('files', 10), async (req, res) => {
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
router.post('/ocr/idcard', uploadRateLimiter, secureUpload.fields([
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
