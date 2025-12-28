/**
 * 村委工作文档控制器
 * 处理村委文档相关的HTTP请求
 *
 * 功能：
 * - 文档上传（单个/批量）
 * - 文档列表查询（支持搜索和筛选）
 * - 文档详情获取
 * - 文档更新
 * - 文档删除
 * - 文档下载
 * - 文档归档
 * - 操作历史查询
 * - 统计数据获取
 *
 * @author Smart Village Platform
 * @version 1.0.0
 */

const CommitteeDocumentService = require('../services/committeeDocumentService');
const { CommitteeMember, Village } = require('../models');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      // 图片
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/tiff',
      'image/bmp',
      // 文档
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。支持的类型：PDF、Word、Excel、PowerPoint、图片'), false);
    }
  }
});

class CommitteeDocumentController {
  /**
   * 上传单个文档
   * @route POST /api/v1/committee-documents/upload
   */
  static async uploadDocument(req, res) {
    try {
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
          const {
            villageId,
            committeeMemberId,
            documentCategory,
            title,
            description,
            documentNumber,
            issueDate,
            priority,
            tags,
            status,
            isPublic,
            allowedRoles,
            notes
          } = req.body;

          // 验证必填字段
          if (!villageId || !committeeMemberId || !documentCategory || !title) {
            return res.status(400).json({
              success: false,
              message: '缺少必填字段：villageId、committeeMemberId、documentCategory、title'
            });
          }

          const documentInfo = {
            villageId,
            committeeMemberId,
            documentCategory,
            title,
            description: description || '',
            documentNumber: documentNumber || '',
            issueDate: issueDate || null,
            priority: priority || 'normal',
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            status: status || 'published',
            accessControl: {
              isPublic: isPublic === 'true',
              allowedRoles: allowedRoles ? allowedRoles.split(',') : [],
              allowedMembers: []
            },
            notes: notes || ''
          };

          const uploader = {
            id: req.user.id,
            name: req.user.name,
            username: req.user.username,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          };

          const document = await CommitteeDocumentService.uploadDocument(
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
          logger.error('上传村委文档失败:', error);
          res.status(500).json({
            success: false,
            message: error.message || '上传文档失败'
          });
        }
      });
    } catch (error) {
      logger.error('上传村委文档失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '上传文档失败'
      });
    }
  }

  /**
   * 批量上传文档
   * @route POST /api/v1/committee-documents/upload/batch
   */
  static async batchUploadDocuments(req, res) {
    try {
      upload.array('files', 20)(req, res, async (err) => {
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
          const {
            villageId,
            committeeMemberId,
            documentCategory,
            priority,
            tags,
            isPublic
          } = req.body;

          // 验证必填字段
          if (!villageId || !committeeMemberId || !documentCategory) {
            return res.status(400).json({
              success: false,
              message: '缺少必填字段：villageId、committeeMemberId、documentCategory'
            });
          }

          // 为每个文件构建文档信息
          const documentsInfo = req.files.map(file => ({
            villageId,
            committeeMemberId,
            documentCategory,
            title: file.originalname,
            description: '',
            documentNumber: '',
            issueDate: null,
            priority: priority || 'normal',
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            status: 'published',
            accessControl: {
              isPublic: isPublic === 'true',
              allowedRoles: [],
              allowedMembers: []
            },
            notes: ''
          }));

          const uploader = {
            id: req.user.id,
            name: req.user.name,
            username: req.user.username,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          };

          const result = await CommitteeDocumentService.batchUploadDocuments(
            req.files,
            documentsInfo,
            uploader
          );

          res.status(201).json({
            success: true,
            message: `批量上传完成：成功 ${result.summary.success} 个，失败 ${result.summary.failed} 个`,
            data: result
          });
        } catch (error) {
          logger.error('批量上传村委文档失败:', error);
          res.status(500).json({
            success: false,
            message: error.message || '批量上传失败'
          });
        }
      });
    } catch (error) {
      logger.error('批量上传村委文档失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量上传失败'
      });
    }
  }

  /**
   * 获取文档列表
   * @route GET /api/v1/committee-documents
   */
  static async getDocumentList(req, res) {
    try {
      const {
        villageId,
        documentCategory,
        status,
        priority,
        tags,
        createdBy,
        startDate,
        endDate,
        search,
        includeArchived,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // 验证必填字段
      if (!villageId) {
        return res.status(400).json({
          success: false,
          message: '缺少必填参数：villageId'
        });
      }

      const filters = {
        villageId,
        documentCategory,
        status,
        priority,
        tags: tags ? tags.split(',') : [],
        createdBy,
        startDate,
        endDate,
        search,
        includeArchived: includeArchived === 'true'
      };

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const requester = {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role
      };

      const result = await CommitteeDocumentService.getDocumentList(filters, options, requester);

      res.status(200).json({
        success: true,
        data: result.documents,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('获取村委文档列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取文档列表失败'
      });
    }
  }

  /**
   * 获取文档详情
   * @route GET /api/v1/committee-documents/:id
   */
  static async getDocumentById(req, res) {
    try {
      const { id } = req.params;

      const requester = {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const document = await CommitteeDocumentService.getDocumentById(id, requester);

      res.status(200).json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('获取村委文档详情失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '文档不存在'
      });
    }
  }

  /**
   * 获取文档操作历史
   * @route GET /api/v1/committee-documents/:id/history
   */
  static async getDocumentHistory(req, res) {
    try {
      const { id } = req.params;

      const requester = {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      };

      const history = await CommitteeDocumentService.getDocumentHistory(id, requester);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('获取文档操作历史失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '获取操作历史失败'
      });
    }
  }

  /**
   * 更新文档
   * @route PUT /api/v1/committee-documents/:id
   */
  static async updateDocument(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        documentNumber,
        issueDate,
        priority,
        tags,
        status,
        isPublic,
        allowedRoles
      } = req.body;

      const updateData = {
        title,
        description,
        documentNumber,
        issueDate,
        priority,
        tags,
        status,
        accessControl: {
          isPublic,
          allowedRoles
        }
      };

      const updater = {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const document = await CommitteeDocumentService.updateDocument(id, updateData, updater);

      res.status(200).json({
        success: true,
        message: '文档更新成功',
        data: document
      });
    } catch (error) {
      logger.error('更新村委文档失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新文档失败'
      });
    }
  }

  /**
   * 删除文档
   * @route DELETE /api/v1/committee-documents/:id
   */
  static async deleteDocument(req, res) {
    try {
      const { id } = req.params;

      const operator = {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await CommitteeDocumentService.deleteDocument(id, operator);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('删除村委文档失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '删除文档失败'
      });
    }
  }

  /**
   * 下载文档
   * @route GET /api/v1/committee-documents/:id/download
   */
  static async downloadDocument(req, res) {
    try {
      const { id } = req.params;

      const requester = {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const { filePath, fileName, mimeType } = await CommitteeDocumentService.downloadDocument(id, requester);

      res.download(filePath, fileName);
    } catch (error) {
      logger.error('下载村委文档失败:', error);
      res.status(403).json({
        success: false,
        message: error.message || '下载文档失败'
      });
    }
  }

  /**
   * 归档文档
   * @route POST /api/v1/committee-documents/:id/archive
   */
  static async archiveDocument(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: '请提供归档原因'
        });
      }

      const operator = {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };

      const document = await CommitteeDocumentService.archiveDocument(id, reason, operator);

      res.status(200).json({
        success: true,
        message: '文档归档成功',
        data: document
      });
    } catch (error) {
      logger.error('归档村委文档失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '归档文档失败'
      });
    }
  }

  /**
   * 获取文档统计
   * @route GET /api/v1/committee-documents/stats/summary
   */
  static async getStatistics(req, res) {
    try {
      const { villageId } = req.query;

      if (!villageId) {
        return res.status(400).json({
          success: false,
          message: '缺少必填参数：villageId'
        });
      }

      const stats = await CommitteeDocumentService.getDocumentStatistics(villageId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('获取村委文档统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取统计失败'
      });
    }
  }

  /**
   * 获取热门标签
   * @route GET /api/v1/committee-documents/tags/popular
   */
  static async getPopularTags(req, res) {
    try {
      const { villageId, limit = 20 } = req.query;

      if (!villageId) {
        return res.status(400).json({
          success: false,
          message: '缺少必填参数：villageId'
        });
      }

      const tags = await CommitteeDocumentService.getPopularTags(villageId, parseInt(limit));

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      logger.error('获取热门标签失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取热门标签失败'
      });
    }
  }

  /**
   * 全文搜索
   * @route GET /api/v1/committee-documents/search/fulltext
   */
  static async fullTextSearch(req, res) {
    try {
      const {
        villageId,
        q: searchText,
        categories,
        status = 'published',
        page = 1,
        limit = 20
      } = req.query;

      if (!villageId) {
        return res.status(400).json({
          success: false,
          message: '缺少必填参数：villageId'
        });
      }

      if (!searchText) {
        return res.status(400).json({
          success: false,
          message: '缺少搜索关键词'
        });
      }

      const options = {
        categories: categories ? categories.split(',') : [],
        status,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'relevance'
      };

      const requester = {
        id: req.user.id,
        role: req.user.role
      };

      const result = await CommitteeDocumentService.fullTextSearch(villageId, searchText, options, requester);

      res.status(200).json({
        success: true,
        data: result.documents,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages
        }
      });
    } catch (error) {
      logger.error('全文搜索失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '搜索失败'
      });
    }
  }

  /**
   * 高级搜索
   * @route POST /api/v1/committee-documents/search/advanced
   */
  static async advancedSearch(req, res) {
    try {
      const {
        villageId,
        documentCategory,
        status,
        tags,
        priority,
        startDate,
        endDate,
        createdBy,
        keyword,
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc'
      } = req.body;

      if (!villageId) {
        return res.status(400).json({
          success: false,
          message: '缺少必填参数：villageId'
        });
      }

      const filters = {
        documentCategory,
        status,
        tags,
        priority,
        startDate,
        endDate,
        createdBy,
        keyword
      };

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sort]: order === 'desc' ? -1 : 1 }
      };

      const requester = {
        id: req.user.id,
        role: req.user.role
      };

      const result = await CommitteeDocumentService.advancedSearch(villageId, filters, options, requester);

      res.status(200).json({
        success: true,
        data: result.documents,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages
        }
      });
    } catch (error) {
      logger.error('高级搜索失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '搜索失败'
      });
    }
  }

  /**
   * 获取文档分类枚举
   * @route GET /api/v1/committee-documents/meta/categories
   */
  static async getDocumentCategories(req, res) {
    try {
      const { CommitteeDocument } = require('../models');

      res.status(200).json({
        success: true,
        data: CommitteeDocument.DOCUMENT_CATEGORIES
      });
    } catch (error) {
      logger.error('获取文档分类失败:', error);
      res.status(500).json({
        success: false,
        message: '获取文档分类失败'
      });
    }
  }

  /**
   * 获取文档状态枚举
   * @route GET /api/v1/committee-documents/meta/status
   */
  static async getDocumentStatus(req, res) {
    try {
      const { CommitteeDocument } = require('../models');

      res.status(200).json({
        success: true,
        data: CommitteeDocument.DOCUMENT_STATUS
      });
    } catch (error) {
      logger.error('获取文档状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取文档状态失败'
      });
    }
  }
}

module.exports = CommitteeDocumentController;
