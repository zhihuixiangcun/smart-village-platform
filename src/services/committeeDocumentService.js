/**
 * 村委工作文档服务
 * 处理村委工作文档的上传、OCR识别、搜索、权限管理等功能
 */

const CommitteeDocument = require('../models/CommitteeDocument');
const CommitteeMember = require('../models/CommitteeMember');
const CommitteeAuditLog = require('../models/CommitteeAuditLog');
const Village = require('../models/Village');
const ocrService = require('./ocrService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class CommitteeDocumentService {
  /**
   * 上传文档
   * @param {Object} fileData - 文件数据
   * @param {Object} documentInfo - 文档信息
   * @param {Object} uploader - 上传者信息
   */
  static async uploadDocument(fileData, documentInfo, uploader) {
    try {
      // 验证村委成员存在
      const member = await CommitteeMember.findById(documentInfo.committeeMemberId);
      if (!member) {
        throw new Error('村委成员不存在');
      }

      // 验证村庄存在
      const village = await Village.findById(documentInfo.villageId);
      if (!village) {
        throw new Error('村庄不存在');
      }

      // 生成唯一文件名
      const fileExtension = path.extname(fileData.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const relativeFilePath = path.join('uploads', 'committee-documents', fileName);
      const filePath = path.join(process.cwd(), relativeFilePath);

      // 确保目录存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // 保存文件
      await fs.writeFile(filePath, fileData.buffer);

      // 计算文件哈希
      const fileHash = crypto.createHash('md5').update(fileData.buffer).digest('hex');

      // 生成关键词
      const keywords = this.generateKeywords(documentInfo);

      // 创建文档记录
      const document = new CommitteeDocument({
        villageId: documentInfo.villageId,
        committeeMemberId: documentInfo.committeeMemberId,
        documentCategory: documentInfo.documentCategory,
        documentInfo: {
          title: documentInfo.title,
          description: documentInfo.description || '',
          documentNumber: documentInfo.documentNumber || '',
          issueDate: documentInfo.issueDate ? new Date(documentInfo.issueDate) : null,
          priority: documentInfo.priority || 'normal'
        },
        fileInfo: {
          originalName: fileData.originalname,
          filePath: relativeFilePath,
          fileSize: fileData.size,
          mimeType: fileData.mimetype,
          fileHash
        },
        responsibility: {
          createdBy: documentInfo.committeeMemberId,
          uploadedBy: uploader.id
        },
        tags: documentInfo.tags || [],
        keywords,
        status: documentInfo.status || 'published',
        accessControl: documentInfo.accessControl || {
          isPublic: false,
          allowedRoles: [],
          allowedMembers: []
        },
        metadata: {
          source: documentInfo.source || 'upload',
          batchId: documentInfo.batchId || null,
          notes: documentInfo.notes || ''
        }
      });

      await document.save();

      // 异步执行OCR识别（不阻塞响应）
      if (this.needsOCR(fileData.mimetype)) {
        this.performOCRAfterUpload(document._id, filePath).catch(error => {
          logger.error('OCR识别失败:', error);
        });
      }

      // 记录审计日志
      await this.logDocumentAction({
        villageId: documentInfo.villageId,
        operatorId: uploader.id,
        operatorName: uploader.name || uploader.username,
        action: 'create',
        documentId: document._id,
        documentTitle: documentInfo.title,
        requestContext: {
          ipAddress: uploader.ipAddress || '0.0.0.0',
          userAgent: uploader.userAgent || ''
        }
      });

      logger.info('村委文档上传成功', {
        documentId: document._id,
        fileName: fileData.originalname,
        uploader: uploader.id
      });

      return document;
    } catch (error) {
      logger.error('上传村委文档失败:', error);

      // 如果文件已创建但保存失败，删除文件
      if (filePath && await fs.access(filePath).then(() => true).catch(() => false)) {
        await fs.unlink(filePath);
      }

      throw error;
    }
  }

  /**
   * 批量上传文档
   * @param {Array} files - 文件数组
   * @param {Array} documentsInfo - 文档信息数组
   * @param {Object} uploader - 上传者信息
   */
  static async batchUploadDocuments(files, documentsInfo, uploader) {
    try {
      const results = [];
      const errors = [];

      // 生成批次ID
      const batchId = uuidv4();

      for (let i = 0; i < files.length; i++) {
        try {
          // 添加批次ID到文档信息
          documentsInfo[i].batchId = batchId;

          const document = await this.uploadDocument(files[i], documentsInfo[i], uploader);
          results.push({
            index: i,
            success: true,
            documentId: document._id,
            title: document.documentInfo.title
          });
        } catch (error) {
          errors.push({
            index: i,
            fileName: files[i].originalname,
            error: error.message
          });
        }
      }

      logger.info('村委文档批量上传完成', {
        batchId,
        totalFiles: files.length,
        successCount: results.length,
        errorCount: errors.length,
        uploader: uploader.id
      });

      return {
        batchId,
        results,
        errors,
        summary: {
          total: files.length,
          success: results.length,
          failed: errors.length
        }
      };
    } catch (error) {
      logger.error('批量上传村委文档失败:', error);
      throw error;
    }
  }

  /**
   * 获取文档列表
   * @param {Object} filters - 过滤条件
   * @param {Object} options - 分页选项
   * @param {Object} requester - 请求者信息
   */
  static async getDocumentList(filters, options, requester) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // 构建基础查询
      const query = {
        villageId: filters.villageId
      };

      // 非管理员不能看到草稿
      if (requester.role !== 'secretary' && requester.role !== 'village_head') {
        query.status = { $ne: 'draft' };
      }

      // 应用过滤条件
      if (filters.documentCategory) {
        query.documentCategory = filters.documentCategory;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.priority) {
        query['documentInfo.priority'] = filters.priority;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.createdBy) {
        query['responsibility.createdBy'] = filters.createdBy;
      }

      // 日期范围筛选
      if (filters.startDate || filters.endDate) {
        query['documentInfo.issueDate'] = {};
        if (filters.startDate) {
          query['documentInfo.issueDate'].$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query['documentInfo.issueDate'].$lte = new Date(filters.endDate);
        }
      }

      // 关键词搜索（使用全文索引）
      if (filters.search && filters.search.trim()) {
        query.$text = { $search: filters.search.trim() };
      }

      // 排除归档文档（除非明确查询归档文档）
      if (!filters.includeArchived) {
        query.status = { $ne: 'archived' };
      }

      // 执行查询
      const [documents, total] = await Promise.all([
        CommitteeDocument.find(query)
          .populate('committeeMemberId', 'name position')
          .populate('responsibility.createdBy', 'name')
          .populate('responsibility.uploadedBy', 'username name')
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        CommitteeDocument.countDocuments(query)
      ]);

      return {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取村委文档列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取文档详情
   * @param {string} documentId - 文档ID
   * @param {Object} requester - 请求者信息
   */
  static async getDocumentById(documentId, requester) {
    try {
      const document = await CommitteeDocument.findById(documentId)
        .populate('committeeMemberId', 'name position phone')
        .populate('responsibility.createdBy', 'name position')
        .populate('responsibility.uploadedBy', 'username name')
        .populate('responsibility.lastModifiedBy', 'username name')
        .populate('accessControl.allowedMembers', 'name position')
        .lean();

      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkDocumentPermission(document, requester, 'view');
      if (!hasPermission.allowed) {
        throw new Error(hasPermission.reason || '无权访问该文档');
      }

      // 记录查看操作
      await document.recordView(requester.id);

      // 记录审计日志
      await this.logDocumentAction({
        villageId: document.villageId,
        operatorId: requester.id,
        operatorName: requester.name || requester.username,
        action: 'view',
        documentId: document._id,
        documentTitle: document.documentInfo.title,
        requestContext: {
          ipAddress: requester.ipAddress || '0.0.0.0',
          userAgent: requester.userAgent || ''
        }
      });

      return document;
    } catch (error) {
      logger.error('获取村委文档详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取文档操作历史
   * @param {string} documentId - 文档ID
   * @param {Object} requester - 请求者信息
   */
  static async getDocumentHistory(documentId, requester) {
    try {
      const document = await CommitteeDocument.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkDocumentPermission(document, requester, 'view');
      if (!hasPermission.allowed) {
        throw new Error('无权访问该文档');
      }

      // 从审计日志查询操作历史
      const history = await CommitteeAuditLog.find({
        resourceType: 'document',
        resourceId: documentId
      })
        .sort({ timestamp: -1 })
        .limit(100)
        .populate('operatorId', 'username name')
        .lean();

      // 格式化历史记录
      const formattedHistory = history.map(log => ({
        timestamp: log.timestamp,
        action: log.action,
        operator: {
          id: log.operatorId._id,
          name: log.operatorId.name || log.operatorName,
          username: log.operatorId.username
        },
        details: log.details,
        ipAddress: log.requestContext.ipAddress
      }));

      // 添加版本历史
      const versionHistory = document.versionHistory.map(version => ({
        timestamp: version.modifiedAt,
        action: 'version',
        operator: {
          id: version.modifiedBy
        },
        details: {
          version: version.version,
          changes: version.changes
        }
      }));

      // 合并并排序
      const allHistory = [...formattedHistory, ...versionHistory]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return allHistory;
    } catch (error) {
      logger.error('获取文档操作历史失败:', error);
      throw error;
    }
  }

  /**
   * 更新文档
   * @param {string} documentId - 文档ID
   * @param {Object} updateData - 更新数据
   * @param {Object} updater - 更新者信息
   */
  static async updateDocument(documentId, updateData, updater) {
    try {
      const document = await CommitteeDocument.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查修改权限
      const hasPermission = await this.checkDocumentPermission(document, updater, 'update');
      if (!hasPermission.allowed) {
        throw new Error('无权修改该文档');
      }

      // 记录变更前的值
      const beforeChanges = {
        title: document.documentInfo.title,
        description: document.documentInfo.description,
        category: document.documentCategory,
        tags: document.tags,
        status: document.status
      };

      // 更新文档信息
      if (updateData.title !== undefined) {
        document.documentInfo.title = updateData.title;
      }

      if (updateData.description !== undefined) {
        document.documentInfo.description = updateData.description;
      }

      if (updateData.documentNumber !== undefined) {
        document.documentInfo.documentNumber = updateData.documentNumber;
      }

      if (updateData.issueDate !== undefined) {
        document.documentInfo.issueDate = updateData.issueDate ? new Date(updateData.issueDate) : null;
      }

      if (updateData.priority !== undefined) {
        document.documentInfo.priority = updateData.priority;
      }

      if (updateData.tags !== undefined) {
        document.tags = updateData.tags;
      }

      if (updateData.status !== undefined) {
        document.status = updateData.status;
      }

      if (updateData.accessControl !== undefined) {
        document.accessControl = { ...document.accessControl, ...updateData.accessControl };
      }

      document.responsibility.lastModifiedBy = updater.id;

      await document.save();

      // 记录审计日志
      await this.logDocumentAction({
        villageId: document.villageId,
        operatorId: updater.id,
        operatorName: updater.name || updater.username,
        action: 'update',
        documentId: document._id,
        documentTitle: document.documentInfo.title,
        requestContext: {
          ipAddress: updater.ipAddress || '0.0.0.0',
          userAgent: updater.userAgent || ''
        },
        changes: {
          before: beforeChanges,
          after: {
            title: document.documentInfo.title,
            description: document.documentInfo.description,
            category: document.documentCategory,
            tags: document.tags,
            status: document.status
          }
        }
      });

      logger.info('村委文档更新成功', {
        documentId,
        updater: updater.id
      });

      return document;
    } catch (error) {
      logger.error('更新村委文档失败:', error);
      throw error;
    }
  }

  /**
   * 删除文档
   * @param {string} documentId - 文档ID
   * @param {Object} operator - 操作者信息
   */
  static async deleteDocument(documentId, operator) {
    try {
      const document = await CommitteeDocument.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查删除权限
      const hasPermission = await this.checkDocumentPermission(document, operator, 'delete');
      if (!hasPermission.allowed) {
        throw new Error('无权删除该文档');
      }

      // 删除物理文件
      const filePath = path.join(process.cwd(), document.fileInfo.filePath);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn('删除物理文件失败:', error);
      }

      // 删除附件文件
      for (const attachment of document.attachments) {
        const attachmentPath = path.join(process.cwd(), attachment.filePath);
        try {
          await fs.unlink(attachmentPath);
        } catch (error) {
          logger.warn('删除附件文件失败:', error);
        }
      }

      // 删除数据库记录
      await CommitteeDocument.findByIdAndDelete(documentId);

      // 记录审计日志
      await this.logDocumentAction({
        villageId: document.villageId,
        operatorId: operator.id,
        operatorName: operator.name || operator.username,
        action: 'delete',
        documentId: document._id,
        documentTitle: document.documentInfo.title,
        requestContext: {
          ipAddress: operator.ipAddress || '0.0.0.0',
          userAgent: operator.userAgent || ''
        }
      });

      logger.info('村委文档删除成功', {
        documentId,
        fileName: document.fileInfo.originalName,
        operator: operator.id
      });

      return { success: true, message: '文档删除成功' };
    } catch (error) {
      logger.error('删除村委文档失败:', error);
      throw error;
    }
  }

  /**
   * 下载文档
   * @param {string} documentId - 文档ID
   * @param {Object} requester - 请求者信息
   */
  static async downloadDocument(documentId, requester) {
    try {
      const document = await CommitteeDocument.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查下载权限
      const hasPermission = await this.checkDocumentPermission(document, requester, 'download');
      if (!hasPermission.allowed) {
        throw new Error('无权下载该文档');
      }

      // 检查文件是否存在
      const filePath = path.join(process.cwd(), document.fileInfo.filePath);
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error('文件不存在');
      }

      // 记录下载审计日志
      await this.logDocumentAction({
        villageId: document.villageId,
        operatorId: requester.id,
        operatorName: requester.name || requester.username,
        action: 'download',
        documentId: document._id,
        documentTitle: document.documentInfo.title,
        requestContext: {
          ipAddress: requester.ipAddress || '0.0.0.0',
          userAgent: requester.userAgent || ''
        }
      });

      return {
        filePath,
        fileName: document.fileInfo.originalName,
        mimeType: document.fileInfo.mimeType,
        fileSize: document.fileInfo.fileSize
      };
    } catch (error) {
      logger.error('下载村委文档失败:', error);
      throw error;
    }
  }

  /**
   * 归档文档
   * @param {string} documentId - 文档ID
   * @param {string} reason - 归档原因
   * @param {Object} operator - 操作者信息
   */
  static async archiveDocument(documentId, reason, operator) {
    try {
      const document = await CommitteeDocument.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查权限
      const hasPermission = await this.checkDocumentPermission(document, operator, 'archive');
      if (!hasPermission.allowed) {
        throw new Error('无权归档该文档');
      }

      await document.archive(operator.id, reason);

      // 记录审计日志
      await this.logDocumentAction({
        villageId: document.villageId,
        operatorId: operator.id,
        operatorName: operator.name || operator.username,
        action: 'archive',
        documentId: document._id,
        documentTitle: document.documentInfo.title,
        requestContext: {
          ipAddress: operator.ipAddress || '0.0.0.0',
          userAgent: operator.userAgent || ''
        }
      });

      logger.info('村委文档归档成功', { documentId, reason });

      return document;
    } catch (error) {
      logger.error('归档村委文档失败:', error);
      throw error;
    }
  }

  /**
   * 获取文档统计
   * @param {string} villageId - 村庄ID
   */
  static async getDocumentStatistics(villageId) {
    try {
      return await CommitteeDocument.getStatistics(villageId);
    } catch (error) {
      logger.error('获取村委文档统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门标签
   * @param {string} villageId - 村庄ID
   * @param {number} limit - 返回数量
   */
  static async getPopularTags(villageId, limit = 20) {
    try {
      return await CommitteeDocument.getPopularTags(villageId, limit);
    } catch (error) {
      logger.error('获取热门标签失败:', error);
      throw error;
    }
  }

  /**
   * 全文搜索
   * @param {string} villageId - 村庄ID
   * @param {string} searchText - 搜索文本
   * @param {Object} options - 搜索选项
   * @param {Object} requester - 请求者信息
   */
  static async fullTextSearch(villageId, searchText, options, requester) {
    try {
      return await CommitteeDocument.fullTextSearch(villageId, searchText, options);
    } catch (error) {
      logger.error('全文搜索失败:', error);
      throw error;
    }
  }

  /**
   * 高级搜索（多条件筛选）
   * @param {string} villageId - 村庄ID
   * @param {Object} filters - 筛选条件
   * @param {Object} options - 搜索选项
   * @param {Object} requester - 请求者信息
   */
  static async advancedSearch(villageId, filters, options, requester) {
    try {
      return await CommitteeDocument.advancedSearch(villageId, filters, options);
    } catch (error) {
      logger.error('高级搜索失败:', error);
      throw error;
    }
  }

  // ============= 私有辅助方法 =============

  /**
   * 执行OCR识别（上传后异步调用）
   * @param {string} documentId - 文档ID
   * @param {string} filePath - 文件路径
   */
  static async performOCRAfterUpload(documentId, filePath) {
    try {
      const document = await CommitteeDocument.findById(documentId);
      if (!document) return;

      const startTime = Date.now();

      // 调用OCR服务
      const ocrResult = await ocrService.recognize(filePath, {
        language: 'chi_sim+eng'
      });

      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'OCR识别失败');
      }

      const processTime = Date.now() - startTime;

      // 更新OCR结果
      document.ocrResult = {
        text: ocrResult.text || '',
        confidence: ocrResult.confidence || 0,
        processedAt: new Date(),
        language: 'zh-CN'
      };

      // 从OCR文本中提取关键词
      const extractedKeywords = this.extractKeywordsFromOCR(ocrResult.text);
      document.keywords.push(...extractedKeywords);
      document.keywords = [...new Set(document.keywords)]; // 去重

      await document.save();

      logger.info('村委文档OCR识别完成', {
        documentId,
        processTime,
        confidence: ocrResult.confidence
      });
    } catch (error) {
      logger.error('村委文档OCR识别失败:', error);

      // 更新文档为OCR失败状态
      try {
        const document = await CommitteeDocument.findById(documentId);
        if (document) {
          document.ocrResult = {
            text: '',
            confidence: 0,
            processedAt: new Date(),
            language: 'zh-CN',
            error: error.message
          };
          await document.save();
        }
      } catch (saveError) {
        logger.error('保存OCR失败状态时出错:', saveError);
      }
    }
  }

  /**
   * 从OCR文本中提取关键词
   * @param {string} ocrText - OCR识别的文本
   */
  static extractKeywordsFromOCR(ocrText) {
    const keywords = [];

    // 提取常见关键词
    const commonKeywords = [
      '会议', '通知', '报告', '决定', '决议',
      '财务', '预算', '审批', '申请', '批复',
      '项目', '工程', '建设', '管理', '监督',
      '村民', '村委', '村委会', '党员', '代表大会',
      '年度', '季度', '月份', '计划', '总结'
    ];

    for (const keyword of commonKeywords) {
      if (ocrText.includes(keyword)) {
        keywords.push(keyword);
      }
    }

    // 提取数字（年份、金额等）
    const numbers = ocrText.match(/\d{4}年|\d+万元|\d+千元/g);
    if (numbers) {
      keywords.push(...numbers);
    }

    return keywords;
  }

  /**
   * 生成关键词
   * @param {Object} documentInfo - 文档信息
   */
  static generateKeywords(documentInfo) {
    const keywords = [];

    // 添加标题关键词
    if (documentInfo.title) {
      keywords.push(...documentInfo.title.split(/[\s,，、;；]+/).filter(w => w.length > 1));
    }

    // 添加描述关键词
    if (documentInfo.description) {
      keywords.push(...documentInfo.description.split(/[\s,，、;；]+/).filter(w => w.length > 1));
    }

    // 添加文号
    if (documentInfo.documentNumber) {
      keywords.push(documentInfo.documentNumber);
    }

    // 添加标签
    if (documentInfo.tags && documentInfo.tags.length > 0) {
      keywords.push(...documentInfo.tags);
    }

    return [...new Set(keywords.map(k => k.toLowerCase()))]; // 去重并转小写
  }

  /**
   * 判断文件类型是否需要OCR
   * @param {string} mimeType - MIME类型
   */
  static needsOCR(mimeType) {
    const ocrMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/tiff',
      'image/bmp'
    ];

    return ocrMimeTypes.includes(mimeType);
  }

  /**
   * 检查文档权限
   * @param {Object} document - 文档对象
   * @param {Object} requester - 请求者信息
   * @param {string} action - 操作类型
   */
  static async checkDocumentPermission(document, requester, action = 'view') {
    try {
      // 村支书拥有所有权限
      if (requester.role === 'secretary') {
        return { allowed: true };
      }

      // 村主任拥有大部分权限
      if (requester.role === 'village_head' && ['view', 'update', 'download'].includes(action)) {
        return { allowed: true };
      }

      // 创建者拥有所有权限
      if (document.responsibility.createdBy &&
          document.responsibility.createdBy.toString() === requester.id) {
        return { allowed: true };
      }

      // 公开文档可以被所有人查看
      if (action === 'view' && document.accessControl.isPublic) {
        return { allowed: true };
      }

      // 检查角色权限
      if (document.accessControl.allowedRoles.includes(requester.role)) {
        return { allowed: action === 'view' };
      }

      // 检查成员权限
      if (document.accessControl.allowedMembers.some(
        id => id.toString() === requester.id
      )) {
        return { allowed: action === 'view' };
      }

      return { allowed: false, reason: '权限不足' };
    } catch (error) {
      logger.error('检查文档权限失败:', error);
      return { allowed: false, reason: '权限检查失败' };
    }
  }

  /**
   * 记录文档操作审计日志
   * @param {Object} logData - 日志数据
   */
  static async logDocumentAction(logData) {
    try {
      // 获取操作者信息
      const operator = await require('../models/User').findById(logData.operatorId);
      const operatorRole = operator ? operator.role : 'unknown';

      await CommitteeAuditLog.logAction({
        operatorId: logData.operatorId,
        operatorName: logData.operatorName,
        operatorRole,
        villageId: logData.villageId,
        action: logData.action,
        resourceType: 'document',
        resourceId: logData.documentId,
        resourceName: logData.documentTitle,
        details: {
          changes: logData.changes || {},
          result: { type: 'success' }
        },
        requestContext: {
          ipAddress: logData.requestContext.ipAddress,
          userAgent: logData.requestContext.userAgent,
          requestId: uuidv4()
        }
      });
    } catch (error) {
      logger.error('记录审计日志失败:', error);
      // 审计日志记录失败不应影响业务流程
    }
  }
}

module.exports = CommitteeDocumentService;
