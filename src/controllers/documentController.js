/**
 * 文档管理控制器
 * 处理文档相关的HTTP请求
 */

const DocumentService = require('../services/documentService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

class DocumentController {
  /**
   * 上传单个文档
   */
  static async uploadDocument(req, res) {
    try {
      // 使用multer中间件处理文件
      upload.single('file')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: '请选择要上传的文件'
          });
        }

        try {
          // 验证请求参数
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({
              success: false,
              message: '参数验证失败',
              errors: errors.array()
            });
          }

          const documentInfo = req.body;
          const uploader = {
            id: req.user.id,
            ipAddress: req.ip
          };

          const document = await DocumentService.uploadDocument(
            req.file,
            documentInfo,
            uploader
          );

          res.status(201).json({
            success: true,
            message: '文档上传成功',
            data: document
          });
        } catch (error) {
          logger.error('上传文档失败:', error);
          res.status(500).json({
            success: false,
            message: error.message || '上传文档失败'
          });
        }
      });
    } catch (error) {
      logger.error('上传文档失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '上传文档失败'
      });
    }
  }

  /**
   * 批量上传文档
   */
  static async batchUploadDocuments(req, res) {
    try {
      // 使用multer处理多文件上传
      upload.array('files', 10)(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: '请选择要上传的文件'
          });
        }

        try {
          const files = req.files;
          const documentsInfo = JSON.parse(req.body.documentsInfo || '[]');

          if (documentsInfo.length !== files.length) {
            return res.status(400).json({
              success: false,
              message: '文档信息数量与文件数量不匹配'
            });
          }

          const uploader = {
            id: req.user.id,
            ipAddress: req.ip
          };

          const result = await DocumentService.batchUploadDocuments(
            files,
            documentsInfo,
            uploader
          );

          res.status(201).json({
            success: true,
            message: '批量上传完成',
            data: result
          });
        } catch (error) {
          logger.error('批量上传失败:', error);
          res.status(500).json({
            success: false,
            message: error.message || '批量上传失败'
          });
        }
      });
    } catch (error) {
      logger.error('批量上传失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量上传失败'
      });
    }
  }

  /**
   * 获取文档列表
   */
  static async getDocumentList(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        userId,
        familyId,
        category,
        documentType,
        status,
        tags,
        search,
        expiringSoon
      } = req.query;

      const filters = {};
      if (userId) filters.userId = userId;
      if (familyId) filters.familyId = familyId;
      if (category) filters.category = category;
      if (documentType) filters.documentType = documentType;
      if (status) filters.status = status;
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }
      if (search) filters.search = search;
      if (expiringSoon === 'true') filters.expiringSoon = true;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const result = await DocumentService.getDocumentList(filters, options, requester);

      res.json({
        success: true,
        message: '获取文档列表成功',
        data: result
      });
    } catch (error) {
      logger.error('获取文档列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取文档列表失败'
      });
    }
  }

  /**
   * 获取文档详情
   */
  static async getDocumentById(req, res) {
    try {
      const { documentId } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village,
        ipAddress: req.ip
      };

      const document = await DocumentService.getDocumentById(documentId, requester);

      res.json({
        success: true,
        message: '获取文档详情成功',
        data: document
      });
    } catch (error) {
      logger.error('获取文档详情失败:', error);

      if (error.message === '文档不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权访问该文档') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '获取文档详情失败'
      });
    }
  }

  /**
   * 更新文档信息
   */
  static async updateDocument(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { documentId } = req.params;
      const updateData = req.body;
      const updater = {
        id: req.user.id,
        ipAddress: req.ip
      };

      const document = await DocumentService.updateDocument(
        documentId,
        updateData,
        updater
      );

      res.json({
        success: true,
        message: '文档更新成功',
        data: document
      });
    } catch (error) {
      logger.error('更新文档失败:', error);

      if (error.message === '文档不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权修改该文档') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '更新文档失败'
      });
    }
  }

  /**
   * 删除文档
   */
  static async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;
      const operator = {
        id: req.user.id,
        role: req.user.role,
        ipAddress: req.ip
      };

      const result = await DocumentService.deleteDocument(documentId, operator);

      res.json({
        success: true,
        message: '文档删除成功',
        data: result
      });
    } catch (error) {
      logger.error('删除文档失败:', error);

      if (error.message === '文档不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权删除该文档') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '删除文档失败'
      });
    }
  }

  /**
   * 分享文档
   */
  static async shareDocument(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { documentId } = req.params;
      const { sharedWith, permission } = req.body;
      const operator = {
        id: req.user.id,
        ipAddress: req.ip
      };

      if (!Array.isArray(sharedWith) || sharedWith.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择分享对象'
        });
      }

      const document = await DocumentService.shareDocument(
        documentId,
        sharedWith,
        permission,
        operator
      );

      res.json({
        success: true,
        message: '文档分享成功',
        data: document
      });
    } catch (error) {
      logger.error('分享文档失败:', error);

      if (error.message === '文档不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权分享该文档') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '分享文档失败'
      });
    }
  }

  /**
   * 下载文档
   */
  static async downloadDocument(req, res) {
    try {
      const { documentId } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village,
        serviceId: req.query.serviceId,
        serviceName: req.query.serviceName
      };

      const result = await DocumentService.downloadDocument(documentId, requester);

      // 设置响应头
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
      res.setHeader('Content-Length', result.fileSize);

      // 发送文件
      const fs = require('fs');
      const fileStream = fs.createReadStream(result.filePath);
      fileStream.pipe(res);
    } catch (error) {
      logger.error('下载文档失败:', error);

      if (error.message === '文档不存在' || error.message === '文件不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权下载该文档') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '下载文档失败'
      });
    }
  }

  /**
   * 获取文档统计
   */
  static async getDocumentStats(req, res) {
    try {
      const { userId, familyId } = req.query;

      const stats = await DocumentService.getDocumentStats(userId, familyId);

      res.json({
        success: true,
        message: '获取文档统计成功',
        data: stats
      });
    } catch (error) {
      logger.error('获取文档统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取文档统计失败'
      });
    }
  }

  /**
   * 语音读取文档内容
   */
  static async readDocumentContent(req, res) {
    try {
      const { documentId } = req.params;
      const { language = 'zh-CN' } = req.query;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        ipAddress: req.ip
      };

      const result = await DocumentService.readDocumentContent(
        documentId,
        requester,
        language
      );

      // 设置音频响应头
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(result.documentName)}.mp3"`);

      // 发送音频数据
      res.send(result.audioBuffer);
    } catch (error) {
      logger.error('语音读取文档失败:', error);

      if (error.message === '文档不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权访问该文档') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '语音读取失败'
      });
    }
  }

  /**
   * 获取我的文档
   */
  static async getMyDocuments(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        category,
        documentType,
        tags,
        search
      } = req.query;

      const filters = {
        userId: req.user.id
      };
      if (category) filters.category = category;
      if (documentType) filters.documentType = documentType;
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }
      if (search) filters.search = search;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const result = await DocumentService.getDocumentList(filters, options, requester);

      res.json({
        success: true,
        message: '获取我的文档成功',
        data: result
      });
    } catch (error) {
      logger.error('获取我的文档失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取我的文档失败'
      });
    }
  }

  /**
   * 预览文档（返回图片或PDF的可读内容）
   */
  static async previewDocument(req, res) {
    try {
      const { documentId } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role
      };

      const document = await DocumentService.getDocumentById(documentId, requester);

      // 如果是图片，直接返回
      if (document.fileInfo.mimeType.startsWith('image/')) {
        const fs = require('fs');
        const filePath = require('path').join(process.cwd(), document.fileInfo.filePath);

        res.setHeader('Content-Type', document.fileInfo.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      } else {
        // 其他类型返回OCR识别的文本
        res.json({
          success: true,
          message: '获取文档预览成功',
          data: {
            type: 'text',
            content: document.ocrResult?.text || '暂无预览内容',
            confidence: document.ocrResult?.confidence || 0
          }
        });
      }
    } catch (error) {
      logger.error('预览文档失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '预览文档失败'
      });
    }
  }
}

module.exports = DocumentController;