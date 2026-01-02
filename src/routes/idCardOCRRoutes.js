/**
 * 身份证OCR识别路由
 *
 * 处理OCR识别相关请求：
 * - 身份证正面识别
 * - 身份证背面识别
 * - 身份证正反面同时识别
 * - 身份证号验证
 * - 从身份证号提取信息
 */

const express = require('express');
const router = express.Router();
const identityCardOCRService = require('../services/identityCardOCRService');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;

// 配置内存存储（用于Base64编码）
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * @route   POST /api/v1/ocr/id-card/front
 * @desc    身份证正面识别
 * @access  Public
 */
router.post('/id-card/front',
  uploadMemory.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传身份证正面图片'
        });
      }

      const result = await identityCardOCRService.recognizeIdCardFront(req.file.buffer);

      res.json({
        success: result.success,
        message: result.success ? '身份证正面识别成功' : '识别失败',
        data: result.data,
        confidence: result.confidence,
        processTime: result.processTime
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '识别失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/ocr/id-card/back
 * @desc    身份证背面识别
 * @access  Public
 */
router.post('/id-card/back',
  uploadMemory.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传身份证背面图片'
        });
      }

      const result = await identityCardOCRService.recognizeIdCardBack(req.file.buffer);

      res.json({
        success: result.success,
        message: result.success ? '身份证背面识别成功' : '识别失败',
        data: result.data,
        processTime: result.processTime
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '识别失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/ocr/id-card/both
 * @desc    身份证正反面同时识别
 * @access  Public
 */
router.post('/id-card/both',
  uploadMemory.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files?.front || !req.files?.back) {
        return res.status(400).json({
          success: false,
          message: '请同时上传身份证正反面图片'
        });
      }

      const images = {
        front: req.files.front[0].buffer,
        back: req.files.back[0].buffer
      };

      const result = await identityCardOCRService.recognizeIdCard(images);

      res.json({
        success: result.success,
        message: result.success ? '身份证识别成功' : '识别失败',
        data: {
          front: result.front,
          back: result.back,
          verified: result.verified
        },
        confidence: result.confidence,
        processTime: result.processTime
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '识别失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/ocr/id-card/validate
 * @desc    验证身份证号码
 * @access  Public
 */
router.post('/id-card/validate',
  [
    body('idCard').notEmpty().withMessage('请提供身份证号码')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }
    next();
  },
  (req, res) => {
    const { idCard } = req.body;
    const isValid = identityCardOCRService.validateIdCard(idCard);

    res.json({
      success: true,
      data: {
        valid: isValid,
        idCard: idCard
      },
      message: isValid ? '身份证号格式正确' : '身份证号格式不正确'
    });
  }
);

/**
 * @route   POST /api/v1/ocr/id-card/extract
 * @desc    从身份证号提取信息
 * @access  Public
 */
router.post('/id-card/extract',
  [
    body('idCard').notEmpty().withMessage('请提供身份证号码')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }
    next();
  },
  (req, res) => {
    try {
      const { idCard } = req.body;

      // 先验证
      const isValid = identityCardOCRService.validateIdCard(idCard);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: '身份证号格式不正确'
        });
      }

      // 提取信息
      const info = identityCardOCRService.extractFromIdCard(idCard);

      res.json({
        success: true,
        data: info,
        message: '信息提取成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '提取失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/v1/ocr/id-card/base64
 * @desc    Base64图片识别
 * @access  Public
 */
router.post('/id-card/base64',
  async (req, res) => {
    try {
      const { front, back } = req.body;

      if (!front && !back) {
        return res.status(400).json({
          success: false,
          message: '请提供至少一面的图片数据'
        });
      }

      let result;

      if (front && back) {
        result = await identityCardOCRService.recognizeIdCard({ front, back });
      } else if (front) {
        const frontResult = await identityCardOCRService.recognizeIdCardFront(front);
        result = {
          success: frontResult.success,
          front: frontResult.data,
          back: null,
          confidence: frontResult.confidence
        };
      } else {
        const backResult = await identityCardOCRService.recognizeIdCardBack(back);
        result = {
          success: backResult.success,
          front: null,
          back: backResult.data
        };
      }

      res.json({
        success: result.success,
        message: result.success ? '识别成功' : '识别失败',
        data: {
          front: result.front,
          back: result.back
        },
        confidence: result.confidence
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '识别失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
