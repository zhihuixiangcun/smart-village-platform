/**
 * 文档管理服务
 * 处理村民证件和办事文档的CRUD操作、OCR识别和文件管理
 */

const Document = require('../models/Document');
const User = require('../models/User');
const Family = require('../models/Family');
const ResidentProfile = require('../models/ResidentProfile');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const TencentOCR = require('../utils/tencentOCR');
const BaiduTTS = require('../utils/baiduTTS');

class DocumentService {
  /**
   * 上传文档
   * @param {Object} fileData - 文件数据
   * @param {Object} documentInfo - 文档信息
   * @param {Object} uploader - 上传者信息
   */
  static async uploadDocument(fileData, documentInfo, uploader) {
    try {
      // 检查用户是否存在
      const user = await User.findById(documentInfo.userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 如果指定了家庭ID，检查权限
      if (documentInfo.familyId) {
        const family = await Family.findById(documentInfo.familyId);
        if (!family) {
          throw new Error('家庭不存在');
        }

        // 检查是否是家庭成员或有权限
        const isMember = family.members.some(
          m => m.userId && m.userId.toString() === uploader.id
        );
        const hasAgentPermission = family.hasAgentPermission(uploader.id, '办理业务');

        if (!isMember && !hasAgentPermission && uploader.role !== 'admin') {
          throw new Error('无权为该家庭上传文档');
        }
      }

      // 生成唯一文件名
      const fileExtension = path.extname(fileData.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const relativeFilePath = path.join('uploads', 'documents', fileName);
      const filePath = path.join(process.cwd(), relativeFilePath);

      // 确保目录存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // 保存文件
      await fs.writeFile(filePath, fileData.buffer);

      // 创建文档记录
      const documentData = {
        userId: documentInfo.userId,
        familyId: documentInfo.familyId || null,
        documentInfo: {
          name: documentInfo.name || fileData.originalname,
          type: documentInfo.type,
          number: documentInfo.number || '',
          issuingAuthority: documentInfo.issuingAuthority || '',
          issueDate: documentInfo.issueDate ? new Date(documentInfo.issueDate) : null,
          expiryDate: documentInfo.expiryDate ? new Date(documentInfo.expiryDate) : null,
          status: '有效'
        },
        fileInfo: {
          originalName: fileData.originalname,
          fileName,
          filePath: relativeFilePath,
          fileSize: fileData.size,
          mimeType: fileData.mimetype,
          checksum: this.calculateChecksum(fileData.buffer)
        },
        category: this.getCategoryByType(documentInfo.type),
        tags: documentInfo.tags || [],
        keywords: this.generateKeywords(documentInfo),
        createdBy: uploader.id
      };

      const document = new Document(documentData);
      await document.save();

      // 如果需要OCR识别
      if (this.needsOCR(documentInfo.type)) {
        // 异步执行OCR，不阻塞响应
        this.performOCR(document._id, filePath).catch(error => {
          logger.error('OCR识别失败:', error);
        });
      }

      // 记录操作日志
      await document.addOperationLog(
        uploader.id,
        '上传',
        `上传文档：${document.documentInfo.name}`,
        uploader.ipAddress
      );

      logger.info('文档上传成功', {
        documentId: document._id,
        fileName: document.fileInfo.originalName,
        uploader: uploader.id
      });

      return document;
    } catch (error) {
      logger.error('上传文档失败:', error);

      // 如果文件已创建但保存失败，删除文件
      if (filePath && await fs.access(filePath).then(() => true).catch(() => false)) {
        await fs.unlink(filePath);
      }

      throw error;
    }
  }

  /**
   * 执行OCR识别
   * @param {string} documentId - 文档ID
   * @param {string} filePath - 文件路径
   */
  static async performOCR(documentId, filePath) {
    try {
      const document = await Document.findById(documentId);
      if (!document) return;

      const startTime = Date.now();

      // 调用腾讯云OCR
      const ocrResult = await TencentOCR.recognizeDocument(filePath);
      const processTime = Date.now() - startTime;

      // 更新OCR结果
      document.ocrResult = {
        text: ocrResult.text || '',
        confidence: ocrResult.confidence || 0,
        extractedFields: ocrResult.extractedFields || {},
        processTime,
        engineVersion: ocrResult.engineVersion || '1.0'
      };

      await document.save();

      logger.info('OCR识别完成', {
        documentId,
        processTime,
        confidence: ocrResult.confidence
      });

      // 如果识别到姓名和身份证号，自动更新关键词
      if (ocrResult.extractedFields.name) {
        document.keywords.push(ocrResult.extractedFields.name);
      }
      if (ocrResult.extractedFields.idCard) {
        document.keywords.push(ocrResult.extractedFields.idCard);
      }

      await document.save();
    } catch (error) {
      logger.error('OCR识别失败:', error);

      // 记录失败信息
      const document = await Document.findById(documentId);
      if (document) {
        document.ocrResult = {
          text: '',
          confidence: 0,
          processTime: Date.now() - startTime,
          engineVersion: '1.0',
          error: error.message
        };
        await document.save();
      }
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

      // 构建查询条件
      const query = { status: '正常' };

      // 根据用户角色过滤
      if (requester.role === 'resident') {
        // 普通村民只能查看自己的文档
        query.userId = requester.id;

        // 如果指定了家庭ID，检查权限
        if (filters.familyId) {
          const family = await Family.findById(filters.familyId);
          if (family) {
            const isMember = family.members.some(
              m => m.userId && m.userId.toString() === requester.id
            );
            const hasAgentPermission = family.hasAgentPermission(requester.id, '查看档案');

            if (isMember || hasAgentPermission) {
              query.$or = [
                { userId: requester.id },
                { familyId: filters.familyId }
              ];
            }
          }
        }
      } else if (requester.role === 'village_admin') {
        // 村管理员可以查看本村村民的文档
        if (requester.village) {
          const families = await Family.find({ 'address.village': requester.village });
          const familyIds = families.map(f => f._id);
          query.$or = [
            { familyId: { $in: familyIds } },
            { userId: requester.id }
          ];
        }
      }

      // 应用过滤条件
      if (filters.userId) query.userId = filters.userId;
      if (filters.familyId) query.familyId = filters.familyId;
      if (filters.category) query.category = filters.category;
      if (filters.documentType) query['documentInfo.type'] = filters.documentType;
      if (filters.status) query['documentInfo.status'] = filters.status;
      if (filters.tags) query.tags = { $in: filters.tags };
      if (filters.search) {
        query.$or = [
          { 'documentInfo.name': { $regex: filters.search, $options: 'i' } },
          { keywords: { $in: [new RegExp(filters.search, 'i')] } },
          { 'documentInfo.type': { $regex: filters.search, $options: 'i' } },
          { 'ocrResult.text': { $regex: filters.search, $options: 'i' } }
        ];
      }

      // 即将过期的文档
      if (filters.expiringSoon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query['documentInfo.expiryDate'] = {
          $lte: thirtyDaysFromNow,
          $gte: new Date()
        };
      }

      // 执行查询
      const documents = await Document.find(query)
        .populate('userId', 'name phone avatar')
        .populate('familyId', 'familyName familyCode')
        .populate('createdBy', 'name')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      // 获取总数
      const total = await Document.countDocuments(query);

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
      logger.error('获取文档列表失败:', error);
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
      const document = await Document.findById(documentId)
        .populate('userId', 'name phone avatar')
        .populate('familyId', 'familyName familyCode')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkDocumentAccess(document, requester);
      if (!hasPermission) {
        throw new Error('无权访问该文档');
      }

      // 记录查看日志
      await document.addOperationLog(
        requester.id,
        '查看',
        `查看文档：${document.documentInfo.name}`,
        requester.ipAddress
      );

      return document;
    } catch (error) {
      logger.error('获取文档详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新文档信息
   * @param {string} documentId - 文档ID
   * @param {Object} updateData - 更新数据
   * @param {Object} updater - 更新者信息
   */
  static async updateDocument(documentId, updateData, updater) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查修改权限
      const hasPermission = await this.checkDocumentEditAccess(document, updater);
      if (!hasPermission) {
        throw new Error('无权修改该文档');
      }

      // 更新允许的字段
      const allowedFields = [
        'documentInfo.name',
        'documentInfo.type',
        'documentInfo.number',
        'documentInfo.issuingAuthority',
        'documentInfo.issueDate',
        'documentInfo.expiryDate',
        'documentInfo.status',
        'category',
        'tags',
        'keywords',
        'privacy.isPublic',
        'privacy.accessLevel',
        'privacy.allowedViewers'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          const keys = field.split('.');
          let current = document;

          // 遍历到倒数第二级
          for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
          }

          // 设置最后一级的值
          current[keys[keys.length - 1]] = updateData[field];
        }
      });

      document.updatedBy = updater.id;
      await document.save();

      // 记录操作日志
      await document.addOperationLog(
        updater.id,
        '修改',
        `更新文档信息：${document.documentInfo.name}`,
        updater.ipAddress
      );

      logger.info('文档更新成功', {
        documentId: document._id,
        updater: updater.id
      });

      return document;
    } catch (error) {
      logger.error('更新文档失败:', error);
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
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查删除权限
      const hasPermission = await this.checkDocumentDeleteAccess(document, operator);
      if (!hasPermission) {
        throw new Error('无权删除该文档');
      }

      // 删除物理文件
      const filePath = path.join(process.cwd(), document.fileInfo.filePath);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn('删除物理文件失败:', error);
      }

      // 删除缩略图
      if (document.fileInfo.thumbnailPath) {
        const thumbnailPath = path.join(process.cwd(), document.fileInfo.thumbnailPath);
        try {
          await fs.unlink(thumbnailPath);
        } catch (error) {
          logger.warn('删除缩略图失败:', error);
        }
      }

      // 删除数据库记录
      await Document.findByIdAndDelete(documentId);

      logger.info('文档删除成功', {
        documentId,
        fileName: document.fileInfo.originalName,
        operator: operator.id
      });

      return { success: true, message: '文档删除成功' };
    } catch (error) {
      logger.error('删除文档失败:', error);
      throw error;
    }
  }

  /**
   * 分享文档
   * @param {string} documentId - 文档ID
   * @param {Array} sharedWith - 分享对象列表
   * @param {string} permission - 权限级别
   * @param {Object} operator - 操作者信息
   */
  static async shareDocument(documentId, sharedWith, permission = '查看', operator) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查分享权限
      const hasPermission = await this.checkDocumentShareAccess(document, operator);
      if (!hasPermission) {
        throw new Error('无权分享该文档');
      }

      // 添加分享记录
      document.sharing.isShared = true;
      document.sharing.shareType = '授权用户';

      sharedWith.forEach(userId => {
        // 检查是否已经分享给该用户
        const existingShare = document.sharing.sharedWith.find(
          s => s.user.toString() === userId.toString()
        );

        if (!existingShare) {
          document.sharing.sharedWith.push({
            user: userId,
            permission,
            sharedAt: new Date()
          });
        } else {
          // 更新现有分享的权限
          existingShare.permission = permission;
        }
      });

      await document.save();

      // 记录操作日志
      await document.addOperationLog(
        operator.id,
        '分享',
        `分享文档：${document.documentInfo.name}`,
        operator.ipAddress
      );

      logger.info('文档分享成功', {
        documentId,
        sharedWithCount: sharedWith.length,
        permission,
        operator: operator.id
      });

      return document;
    } catch (error) {
      logger.error('分享文档失败:', error);
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
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查访问权限和下载权限
      const hasPermission = await this.checkDocumentDownloadAccess(document, requester);
      if (!hasPermission) {
        throw new Error('无权下载该文档');
      }

      // 检查文件是否存在
      const filePath = path.join(process.cwd(), document.fileInfo.filePath);
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error('文件不存在');
      }

      // 记录下载日志
      await document.addOperationLog(
        requester.id,
        '下载',
        `下载文档：${document.documentInfo.name}`,
        requester.ipAddress
      );

      // 增加使用次数
      if (requester.serviceId) {
        await document.incrementUsage(
          requester.serviceId,
          requester.serviceName || '未知服务'
        );
      }

      return {
        filePath,
        fileName: document.fileInfo.originalName,
        mimeType: document.fileInfo.mimeType,
        fileSize: document.fileInfo.fileSize
      };
    } catch (error) {
      logger.error('下载文档失败:', error);
      throw error;
    }
  }

  /**
   * 获取文档统计
   * @param {string} userId - 用户ID（可选）
   * @param {string} familyId - 家庭ID（可选）
   */
  static async getDocumentStats(userId = null, familyId = null) {
    try {
      const matchStage = { status: '正常' };
      if (userId) matchStage.userId = mongoose.Types.ObjectId(userId);
      if (familyId) matchStage.familyId = mongoose.Types.ObjectId(familyId);

      const stats = await Document.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            typeDistribution: {
              $push: '$documentInfo.type'
            },
            categoryDistribution: {
              $push: '$category'
            },
            statusDistribution: {
              $push: '$documentInfo.status'
            },
            verifiedCount: {
              $sum: { $cond: ['$verification.isVerified', 1, 0] }
            },
            expiringSoonCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$documentInfo.expiryDate', null] },
                      { $lte: ['$documentInfo.expiryDate', { $add: [new Date(), 30 * 24 * 60 * 60 * 1000] }] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalFileSize: { $sum: '$fileInfo.fileSize' },
            sharedCount: {
              $sum: { $cond: ['$sharing.isShared', 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalDocuments: 1,
            typeStats: {
              $reduce: {
                input: '$typeDistribution',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            categoryStats: {
              $reduce: {
                input: '$categoryDistribution',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            statusStats: {
              $reduce: {
                input: '$statusDistribution',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            verifiedCount: 1,
            expiringSoonCount: 1,
            verificationRate: { $divide: ['$verifiedCount', '$totalDocuments'] },
            totalFileSize: 1,
            sharedCount: 1
          }
        }
      ]);

      return stats[0] || {};
    } catch (error) {
      logger.error('获取文档统计失败:', error);
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

      for (let i = 0; i < files.length; i++) {
        try {
          const document = await this.uploadDocument(files[i], documentsInfo[i], uploader);
          results.push({
            index: i,
            success: true,
            document
          });
        } catch (error) {
          errors.push({
            index: i,
            fileName: files[i].originalname,
            error: error.message
          });
        }
      }

      logger.info('批量上传完成', {
        totalFiles: files.length,
        successCount: results.length,
        errorCount: errors.length,
        uploader: uploader.id
      });

      return {
        results,
        errors,
        summary: {
          total: files.length,
          success: results.length,
          failed: errors.length
        }
      };
    } catch (error) {
      logger.error('批量上传失败:', error);
      throw error;
    }
  }

  /**
   * 语音读取文档内容
   * @param {string} documentId - 文档ID
   * @param {Object} requester - 请求者信息
   * @param {string} language - 语言偏好
   */
  static async readDocumentContent(documentId, requester, language = 'zh-CN') {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('文档不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkDocumentAccess(document, requester);
      if (!hasPermission) {
        throw new Error('无权访问该文档');
      }

      // 获取要朗读的文本
      let textToRead = '';
      if (document.ocrResult && document.ocrResult.text) {
        textToRead = document.ocrResult.text;
      } else {
        // 如果没有OCR结果，使用文档名称
        textToRead = `文档《${document.documentInfo.name}》`;
      }

      // 限制文本长度（TTS有长度限制）
      if (textToRead.length > 500) {
        textToRead = `${textToRead.substring(0, 500)  }...`;
      }

      // 调用语音合成
      const audioBuffer = await BaiduTTS.synthesize(textToRead, language);

      // 记录操作日志
      await document.addOperationLog(
        requester.id,
        '查看',
        `语音读取文档：${document.documentInfo.name}`,
        requester.ipAddress
      );

      return {
        audioBuffer,
        text: textToRead,
        documentName: document.documentInfo.name
      };
    } catch (error) {
      logger.error('语音读取文档失败:', error);
      throw error;
    }
  }

  // 辅助方法

  /**
   * 根据文档类型获取分类
   */
  static getCategoryByType(type) {
    const categoryMap = {
      '身份证': '身份证明',
      '户口本': '户籍证明',
      '结婚证': '婚姻证明',
      '离婚证': '婚姻证明',
      '出生证明': '户籍证明',
      '死亡证明': '户籍证明',
      '房产证': '财产证明',
      '土地证': '财产证明',
      '承包合同': '财产证明',
      '营业执照': '许可证明',
      '卫生许可证': '许可证明',
      '毕业证': '学历证明',
      '学位证': '学历证明',
      '职业资格证': '职业资格',
      '技能等级证': '职业资格',
      '培训证书': '职业资格',
      '残疾证': '社会保障',
      '低保证': '社会保障',
      '五保证': '社会保障',
      '优待证': '社会保障',
      '退役军人证': '社会保障',
      '医疗证': '社会保障',
      '社保卡': '社会保障',
      '医保卡': '社会保障',
      '公积金卡': '社会保障',
      '驾驶证': '其他',
      '行驶证': '其他',
      '车辆登记证': '其他',
      '申请表': '其他',
      '审批表': '其他',
      '证明材料': '其他',
      '合同协议': '其他',
      '其他': '其他'
    };

    return categoryMap[type] || '其他';
  }

  /**
   * 生成关键词
   */
  static generateKeywords(documentInfo) {
    const keywords = [];

    // 添加文档名称的关键词
    if (documentInfo.name) {
      keywords.push(...documentInfo.name.split(/[\s\u4e00-\u9fa5]+/).filter(w => w.length > 1));
    }

    // 添加文档类型
    if (documentInfo.type) {
      keywords.push(documentInfo.type);
    }

    // 添加发证机关
    if (documentInfo.issuingAuthority) {
      keywords.push(documentInfo.issuingAuthority);
    }

    return [...new Set(keywords)]; // 去重
  }

  /**
   * 判断是否需要OCR
   */
  static needsOCR(type) {
    const ocrTypes = [
      '身份证', '户口本', '结婚证', '离婚证', '出生证明', '死亡证明',
      '房产证', '土地证', '承包合同', '营业执照', '卫生许可证',
      '毕业证', '学位证', '职业资格证', '技能等级证', '培训证书',
      '残疾证', '低保证', '五保证', '优待证', '退役军人证',
      '医疗证', '社保卡', '医保卡', '驾驶证', '行驶证', '车辆登记证'
    ];

    return ocrTypes.includes(type);
  }

  /**
   * 计算文件校验和
   */
  static calculateChecksum(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * 检查文档访问权限
   */
  static async checkDocumentAccess(document, requester) {
    // 管理员可以访问所有文档
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 文档所有者可以访问
    if (document.userId.toString() === requester.id) {
      return true;
    }

    // 检查家庭权限
    if (document.familyId) {
      const family = await Family.findById(document.familyId);
      if (family) {
        const isMember = family.members.some(
          m => m.userId && m.userId.toString() === requester.id
        );
        if (isMember) return true;

        const hasAgentPermission = family.hasAgentPermission(requester.id, '查看档案');
        if (hasAgentPermission) return true;
      }
    }

    // 检查共享权限
    return document.hasAccess(requester.id, '查看');
  }

  /**
   * 检查文档编辑权限
   */
  static async checkDocumentEditAccess(document, requester) {
    // 管理员可以编辑所有文档
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 文档所有者可以编辑
    if (document.userId.toString() === requester.id) {
      return true;
    }

    // 检查家庭权限（户主或管理员）
    if (document.familyId) {
      const family = await Family.findById(document.familyId);
      if (family) {
        const isHead = family.members.some(
          m => m.isHead && m.userId && m.userId.toString() === requester.id
        );
        if (isHead) return true;

        const hasAgentPermission = family.hasAgentPermission(requester.id, '办理业务');
        if (hasAgentPermission) return true;
      }
    }

    // 检查共享权限
    return document.hasAccess(requester.id, '编辑');
  }

  /**
   * 检查文档删除权限
   */
  static async checkDocumentDeleteAccess(document, requester) {
    // 管理员可以删除所有文档
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 文档所有者可以删除
    if (document.userId.toString() === requester.id) {
      return true;
    }

    return false;
  }

  /**
   * 检查文档分享权限
   */
  static async checkDocumentShareAccess(document, requester) {
    // 管理员可以分享所有文档
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 文档所有者可以分享
    if (document.userId.toString() === requester.id) {
      return true;
    }

    return false;
  }

  /**
   * 检查文档下载权限
   */
  static async checkDocumentDownloadAccess(document, requester) {
    // 管理员可以下载所有文档
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 文档所有者可以下载
    if (document.userId.toString() === requester.id) {
      return true;
    }

    // 检查家庭权限
    if (document.familyId) {
      const family = await Family.findById(document.familyId);
      if (family) {
        const isMember = family.members.some(
          m => m.userId && m.userId.toString() === requester.id
        );
        if (isMember) return true;

        const hasAgentPermission = family.hasAgentPermission(requester.id, '查看档案');
        if (hasAgentPermission) return true;
      }
    }

    // 检查共享权限
    return document.hasAccess(requester.id, '下载');
  }
}

module.exports = DocumentService;