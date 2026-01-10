/**
 * OCR 路由 - 最小化版本
 * 提供身份证 OCR 识别功能
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 配置文件上传（内存存储，用于OCR处理）
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// 配置文件上传（磁盘存储）
const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads/temp');
      await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()  }-${  Math.round(Math.random() * 1E9)}`;
      cb(null, `${file.fieldname  }-${  uniqueSuffix  }${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
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
 * 身份证 OCR 识别
 * POST /api/v1/ocr/id-card
 * 支持单文件上传或批量上传
 */
router.post('/id-card', uploadDisk.any(), async (req, res) => {
  console.log('[OCRMinimal] ===== ID CARD OCR START =====');
  console.log('[OCRMinimal] Files:', req.files);
  console.log('[OCRMinimal] Body:', req.body);

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请上传身份证照片'
      });
    }

    // 简化版OCR响应（开发环境使用模拟数据）
    const result = {
      success: true,
      message: '身份证识别成功',
      data: {
        fileUrl: '',  // 单文件上传时使用
        front: null,  // 批量上传时使用
        back: null    // 批量上传时使用
      }
    };

    // 处理上传的文件
    for (const file of req.files) {
      // 构建完整的文件URL（包含协议、主机和端口）
      const protocol = req.protocol;
      const host = req.get('host');
      const fileUrl = `${protocol}://${host}/uploads/temp/${file.filename}`;

      // 根据字段名判断是正面还是反面
      if (file.fieldname === 'idCardFront') {
        result.data.front = {
          url: fileUrl,
          filename: file.filename,
          // 模拟OCR识别结果
          name: '张三',
          idCard: '110101199001011234',
          gender: '男',
          nation: '汉',
          birth: '1990-01-01',
          address: '北京市东城区某某街道123号'
        };
      } else if (file.fieldname === 'idCardBack') {
        result.data.back = {
          url: fileUrl,
          filename: file.filename,
          // 模拟OCR识别结果
          issue: '北京市公安局东城分局',
          validDate: '2020.01.01-2030.01.01'
        };
      }

      // 单文件上传时，直接返回文件URL
      if (req.files.length === 1) {
        result.data.fileUrl = fileUrl;
        result.data.ocrData = file.fieldname === 'idCardFront' ? {
          name: '张三',
          idCard: '110101199001011234',
          gender: '男',
          nation: '汉',
          birth: '1990-01-01',
          address: '北京市东城区某某街道123号'
        } : {
          issue: '北京市公安局东城分局',
          validDate: '2020.01.01-2030.01.01'
        };
      }
    }

    console.log('[OCRMinimal] ===== ID CARD OCR SUCCESS =====');
    console.log('[OCRMinimal] Result:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('[OCRMinimal] ID card OCR error:', error);
    res.status(500).json({
      success: false,
      error: '身份证识别失败',
      details: error.message
    });
  }
});

/**
 * Base64 图片 OCR 识别
 * POST /api/v1/ocr/id-card/base64
 */
router.post('/id-card/base64', async (req, res) => {
  console.log('[OCRMinimal] ===== ID CARD OCR BASE64 START =====');

  try {
    const { front, back } = req.body;

    if (!front && !back) {
      return res.status(400).json({
        success: false,
        error: '请提供至少一面的图片数据'
      });
    }

    const result = {
      success: true,
      message: '身份证识别成功',
      data: {}
    };

    // 模拟OCR识别结果
    if (front) {
      result.data.front = {
        name: '张三',
        idCard: '110101199001011234',
        gender: '男',
        nation: '汉',
        birth: '1990-01-01',
        address: '北京市东城区某某街道123号'
      };
    }

    if (back) {
      result.data.back = {
        issue: '北京市公安局东城分局',
        validDate: '2020.01.01-2030.01.01'
      };
    }

    console.log('[OCRMinimal] ===== ID CARD OCR BASE64 SUCCESS =====');
    res.json(result);
  } catch (error) {
    console.error('[OCRMinimal] ID card OCR base64 error:', error);
    res.status(500).json({
      success: false,
      error: '身份证识别失败',
      details: error.message
    });
  }
});

module.exports = router;
