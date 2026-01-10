/**
 * 文件上传安全中间件
 * 提供安全的文件上传配置，防止DoS攻击和恶意文件上传
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// 安全的文件类型配置
const ALLOWED_MIME_TYPES = {
  // 图片
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  
  // 文档
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  
  // 压缩文件
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar']
};

// 危险文件类型黑名单
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.php', '.asp', '.aspx', '.jsp', '.pl', '.py', '.rb', '.sh',
  '.msi', '.deb', '.rpm', '.dmg', '.app'
];

/**
 * 生成安全的文件名
 * @param {string} originalName - 原始文件名
 * @returns {string} 安全的文件名
 */
function generateSafeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  
  // 移除特殊字符，只保留字母、数字、下划线和连字符
  const baseName = originalName
    .replace(path.extname(originalName), '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 50); // 限制基础文件名长度
  
  return `${baseName}_${timestamp}_${random}${ext}`;
}

/**
 * 验证文件类型
 * @param {object} file - 文件对象
 * @returns {boolean} 是否为安全文件类型
 */
function validateFileType(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // 检查是否为危险文件类型
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return false;
  }
  
  // 检查MIME类型是否在允许列表中
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    return false;
  }
  
  // 检查扩展名是否与MIME类型匹配
  const allowedExts = ALLOWED_MIME_TYPES[file.mimetype];
  if (!allowedExts.includes(ext)) {
    return false;
  }
  
  return true;
}

/**
 * 文件大小验证
 * @param {number} fileSize - 文件大小（字节）
 * @param {number} maxSize - 最大允许大小（字节）
 * @returns {boolean} 是否符合大小限制
 */
function validateFileSize(fileSize, maxSize) {
  return fileSize <= maxSize;
}

/**
 * 创建安全的multer配置
 * @param {object} options - 配置选项
 * @returns {object} multer配置对象
 */
function createSecureUpload(options = {}) {
  const {
    uploadPath = './uploads',
    maxFileSize = 5 * 1024 * 1024, // 默认5MB
    maxFiles = 5, // 默认最多5个文件
    allowedTypes = Object.keys(ALLOWED_MIME_TYPES)
  } = options;

  // Multer存储配置
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const safeFilename = generateSafeFilename(file.originalname);
      cb(null, safeFilename);
    }
  });

  // 文件过滤器
  const fileFilter = (req, file, cb) => {
    // 基础验证
    if (!validateFileType(file)) {
      const error = new Error('不允许的文件类型');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // 大小验证
    if (!validateFileSize(file.size, maxFileSize)) {
      const error = new Error('文件大小超过限制');
      error.code = 'FILE_TOO_LARGE';
      return cb(error, false);
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fields: 20, // 最多20个字段
      fieldNameSize: 100, // 字段名最大100字符
      fieldSize: 1024 * 1024 // 字段值最大1MB
    }
  });
}

/**
 * 文件上传错误处理中间件
 */
function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          error: '文件大小超过限制',
          maxSize: error.limit
        });
      
      case 'LIMIT_FILE_COUNT':
        return res.status(413).json({
          success: false,
          error: '文件数量超过限制',
          maxFiles: error.limit
        });
      
      case 'LIMIT_FIELD_COUNT':
        return res.status(413).json({
          success: false,
          error: '表单字段数量超过限制'
        });
      
      case 'LIMIT_FIELD_KEY':
        return res.status(413).json({
          success: false,
          error: '字段名过长'
        });
      
      case 'LIMIT_FIELD_VALUE':
        return res.status(413).json({
          success: false,
          error: '字段值过大'
        });
      
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: '意外的文件字段'
        });
      
      default:
        return res.status(400).json({
          success: false,
          error: '文件上传失败',
          details: error.message
        });
    }
  }
  
  // 自定义验证错误
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: '不允许的文件类型',
      allowedTypes: Object.keys(ALLOWED_MIME_TYPES)
    });
  }
  
  if (error.code === 'FILE_TOO_LARGE') {
    return res.status(413).json({
      success: false,
      error: '文件大小超过限制',
      maxSize: options.maxFileSize
    });
  }
  
  next(error);
}

/**
 * 文件清理中间件 - 清理上传失败时的临时文件
 */
function cleanupFiles(req, res, next) {
  const files = req.files || [];
  const cleanupPromises = [];

  // 如果请求出错，清理已上传的文件
  if (Array.isArray(files)) {
    files.forEach(file => {
      cleanupPromises.push(
        new Promise(resolve => {
          const fs = require('fs');
          fs.unlink(file.path, resolve);
        })
      );
    });
  }

  // 响应结束后清理（仅在出错时）
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      Promise.all(cleanupPromises);
    }
  });

  next();
}

/**
 * 获取文件上传统计信息
 */
function getUploadStats() {
  return {
    allowedMimeTypes: Object.keys(ALLOWED_MIME_TYPES),
    dangerousExtensions: DANGEROUS_EXTENSIONS,
    maxFileSize: process.env.MAX_FILE_SIZE || '5MB',
    uploadPath: process.env.UPLOAD_PATH || './uploads'
  };
}

module.exports = {
  createSecureUpload,
  handleUploadError,
  cleanupFiles,
  validateFileType,
  validateFileSize,
  generateSafeFilename,
  getUploadStats,
  ALLOWED_MIME_TYPES,
  DANGEROUS_EXTENSIONS
};