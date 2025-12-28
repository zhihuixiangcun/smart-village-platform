/**
 * 村委工作文档数据模型
 * 用于管理工作报告、会议纪要、审批文件等工作文档
 * 支持文档分类、全文搜索、责任追溯和操作历史
 */

const mongoose = require('mongoose');

// 文档分类枚举
const DOCUMENT_CATEGORIES = {
  WORK_REPORT: 'work_report',           // 工作报告
  MEETING_MINUTES: 'meeting_minutes',   // 会议纪要
  APPROVAL_DOCUMENT: 'approval',        // 审批文件
  TASK_LIST: 'task_list',              // 任务清单
  POLICY_DOCUMENT: 'policy',           // 政策文件
  FINANCIAL_REPORT: 'financial',       // 财务报表
  PROJECT_DOCUMENT: 'project',         // 项目文档
  NOTICE: 'notice',                    // 通知公告
  CONTRACT: 'contract',                // 合同协议
  OTHER: 'other'                       // 其他
};

// 文档状态枚举
const DOCUMENT_STATUS = {
  DRAFT: 'draft',           // 草稿
  PUBLISHED: 'published',   // 已发布
  ARCHIVED: 'archived'      // 已归档
};

// 优先级枚举
const DOCUMENT_PRIORITY = {
  URGENT: 'urgent',         // 紧急
  IMPORTANT: 'important',   // 重要
  NORMAL: 'normal'          // 普通
};

const committeeDocumentSchema = new mongoose.Schema({
  // 基础关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  committeeMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommitteeMember',
    required: true,
    index: true
  },

  // 文档分类（核心需求）
  documentCategory: {
    type: String,
    enum: Object.values(DOCUMENT_CATEGORIES),
    required: true,
    index: true
  },

  // 文档信息
  documentInfo: {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    documentNumber: {
      type: String,
      trim: true,
      index: true
    },
    issueDate: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: Object.values(DOCUMENT_PRIORITY),
      default: DOCUMENT_PRIORITY.NORMAL
    }
  },

  // 文件信息
  fileInfo: {
    originalName: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    fileHash: {
      type: String,
      index: true
    }
  },

  // OCR识别结果（用于搜索）
  ocrResult: {
    text: {
      type: String,
      default: ''
    },
    confidence: {
      type: Number,
      default: 0
    },
    processedAt: {
      type: Date,
      default: null
    },
    language: {
      type: String,
      default: 'zh-CN'
    }
  },

  // 责任人信息（核心需求）
  responsibility: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommitteeMember',
      required: true,
      index: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },

  // 标签和关键词（用于搜索）
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // 文档状态
  status: {
    type: String,
    enum: Object.values(DOCUMENT_STATUS),
    default: DOCUMENT_STATUS.PUBLISHED,
    index: true
  },

  // 访问控制
  accessControl: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowedRoles: [{
      type: String,
      enum: ['secretary', 'accountant', 'population_admin', 'member', 'guest']
    }],
    allowedMembers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommitteeMember'
    }]
  },

  // 查看统计
  viewStatistics: {
    totalViews: {
      type: Number,
      default: 0
    },
    uniqueViewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    lastViewedAt: {
      type: Date,
      default: null
    }
  },

  // 版本历史（可选，用于重要文档）
  versionHistory: [{
    version: {
      type: Number,
      required: true
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId
    },
    changes: String,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 附件列表
  attachments: [{
    fileName: String,
    filePath: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 归档信息
  archiveInfo: {
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date,
      default: null
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    archiveReason: String
  },

  // 元数据
  metadata: {
    source: {
      type: String,
      enum: ['upload', 'scan', 'import', 'system'],
      default: 'upload'
    },
    batchId: {
      type: String,
      index: true
    },
    externalReference: String,
    notes: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============= 索引配置 =============

// 复合索引
committeeDocumentSchema.index({ villageId: 1, documentCategory: 1, createdAt: -1 });
committeeDocumentSchema.index({ villageId: 1, status: 1, createdAt: -1 });
committeeDocumentSchema.index({ committeeMemberId: 1, createdAt: -1 });
committeeDocumentSchema.index({ 'responsibility.createdBy': 1, createdAt: -1 });
committeeDocumentSchema.index({ 'documentInfo.issueDate': -1 });

// 全文搜索索引（支持中文）
committeeDocumentSchema.index({
  'documentInfo.title': 'text',
  'documentInfo.description': 'text',
  'ocrResult.text': 'text',
  tags: 'text',
  keywords: 'text',
  'documentInfo.documentNumber': 'text'
}, {
  weights: {
    'documentInfo.title': 10,
    'documentInfo.description': 5,
    'documentInfo.documentNumber': 8,
    'ocrResult.text': 3,
    tags: 7,
    keywords: 6
  },
  name: 'committee_document_text_index'
});

// TTL索引 - 自动删除归档超过10年的文档
committeeDocumentSchema.index(
  { 'archiveInfo.archivedAt': 1 },
  { expireAfterSeconds: 10 * 365 * 24 * 60 * 60, partialFilterExpression: { 'archiveInfo.isArchived': true } }
);

// ============= 虚拟字段 =============

// 虚拟字段：当前版本号
committeeDocumentSchema.virtual('currentVersion').get(function() {
  return this.versionHistory.length > 0
    ? Math.max(...this.versionHistory.map(v => v.version))
    : 1;
});

// 虚拟字段：是否可编辑（草稿或已发布且是创建者）
committeeDocumentSchema.virtual('isEditable').get(function() {
  // 这里需要在查询时传入当前用户信息
  // 暂时返回状态判断
  return this.status === DOCUMENT_STATUS.DRAFT || this.status === DOCUMENT_STATUS.PUBLISHED;
});

// ============= 实例方法 =============

/**
 * 记录查看操作
 */
committeeDocumentSchema.methods.recordView = async function(userId) {
  if (!this.viewStatistics.uniqueViewers.includes(userId)) {
    this.viewStatistics.uniqueViewers.push(userId);
  }
  this.viewStatistics.totalViews += 1;
  this.viewStatistics.lastViewedAt = new Date();
  return this.save();
};

/**
 * 创建新版本
 */
committeeDocumentSchema.methods.createVersion = function(newFileId, changes, modifiedBy) {
  const newVersion = this.currentVersion + 1;
  this.versionHistory.push({
    version: newVersion,
    fileId: newFileId,
    changes,
    modifiedBy,
    modifiedAt: new Date()
  });
  return this.save();
};

/**
 * 归档文档
 */
committeeDocumentSchema.methods.archive = function(archivedBy, reason = '') {
  this.status = DOCUMENT_STATUS.ARCHIVED;
  this.archiveInfo.isArchived = true;
  this.archiveInfo.archivedAt = new Date();
  this.archiveInfo.archivedBy = archivedBy;
  this.archiveInfo.archiveReason = reason;
  return this.save();
};

/**
 * 取消归档
 */
committeeDocumentSchema.methods.unarchive = function() {
  this.status = DOCUMENT_STATUS.PUBLISHED;
  this.archiveInfo.isArchived = false;
  this.archiveInfo.archivedAt = null;
  this.archiveInfo.archivedBy = null;
  this.archiveInfo.archiveReason = null;
  return this.save();
};

/**
 * 添加标签
 */
committeeDocumentSchema.methods.addTags = function(newTags) {
  const uniqueTags = new Set([...this.tags, ...newTags]);
  this.tags = Array.from(uniqueTags);
  return this.save();
};

/**
 * 移除标签
 */
committeeDocumentSchema.methods.removeTags = function(tagsToRemove) {
  this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  return this.save();
};

/**
 * 添加附件
 */
committeeDocumentSchema.methods.addAttachment = function(attachment) {
  this.attachments.push({
    ...attachment,
    uploadedAt: new Date()
  });
  return this.save();
};

/**
 * 移除附件
 */
committeeDocumentSchema.methods.removeAttachment = function(attachmentIndex) {
  if (attachmentIndex >= 0 && attachmentIndex < this.attachments.length) {
    this.attachments.splice(attachmentIndex, 1);
    return this.save();
  }
  throw new Error('Invalid attachment index');
};

// ============= 静态方法 =============

/**
 * 全文搜索
 */
committeeDocumentSchema.statics.fullTextSearch = async function(villageId, searchText, options = {}) {
  const {
    categories = [],
    status = DOCUMENT_STATUS.PUBLISHED,
    limit = 20,
    skip = 0,
    sortBy = 'relevance'
  } = options;

  const query = {
    villageId,
    status
  };

  if (categories.length > 0) {
    query.documentCategory = { $in: categories };
  }

  // 使用全文搜索
  const pipeline = [];

  // 匹配阶段
  pipeline.push({ $match: query });

  // 文本搜索评分
  if (searchText && searchText.trim()) {
    pipeline.push({
      $match: {
        $text: { $search: searchText.trim() }
      }
    });

    // 添加相关性评分
    pipeline.push({
      $addFields: {
        score: { $meta: 'textScore' }
      }
    });

    // 按相关性排序
    if (sortBy === 'relevance') {
      pipeline.push({
        $sort: { score: { $meta: 'textScore' }, createdAt: -1 }
      });
    }
  } else {
    pipeline.push({
      $sort: { createdAt: -1 }
    });
  }

  // 分页
  pipeline.push(
    { $skip: skip },
    { $limit: limit }
  );

  // 关联查询
  pipeline.push({
    $lookup: {
      from: 'committeemembers',
      localField: 'committeeMemberId',
      foreignField: '_id',
      as: 'committeeMember'
    }
  });

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'responsibility.uploadedBy',
      foreignField: '_id',
      as: 'uploader'
    }
  });

  const results = await this.aggregate(pipeline);
  const total = await this.countDocuments(query);

  return {
    documents: results,
    total,
    page: Math.floor(skip / limit) + 1,
    pages: Math.ceil(total / limit)
  };
};

/**
 * 高级搜索（多条件筛选）
 */
committeeDocumentSchema.statics.advancedSearch = async function(villageId, filters = {}, options = {}) {
  const {
    documentCategory,
    status,
    tags,
    priority,
    startDate,
    endDate,
    createdBy,
    keyword
  } = filters;

  const {
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;

  const query = { villageId };

  // 应用筛选条件
  if (documentCategory) {
    query.documentCategory = documentCategory;
  }

  if (status) {
    query.status = status;
  }

  if (priority) {
    query['documentInfo.priority'] = priority;
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  if (createdBy) {
    query['responsibility.createdBy'] = createdBy;
  }

  // 日期范围筛选
  if (startDate || endDate) {
    query['documentInfo.issueDate'] = {};
    if (startDate) query['documentInfo.issueDate'].$gte = new Date(startDate);
    if (endDate) query['documentInfo.issueDate'].$lte = new Date(endDate);
  }

  // 关键词搜索
  if (keyword && keyword.trim()) {
    query.$text = { $search: keyword.trim() };
  }

  const [documents, total] = await Promise.all([
    this.find(query)
      .populate('committeeMemberId', 'name position')
      .populate('responsibility.createdBy', 'name')
      .populate('responsibility.uploadedBy', 'username name')
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    documents,
    total,
    page: Math.floor(skip / limit) + 1,
    pages: Math.ceil(total / limit)
  };
};

/**
 * 获取文档统计
 */
committeeDocumentSchema.statics.getStatistics = async function(villageId) {
  const stats = await this.aggregate([
    {
      $match: { villageId: new mongoose.Types.ObjectId(villageId) }
    },
    {
      $facet: {
        byCategory: [
          {
            $group: {
              _id: '$documentCategory',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          }
        ],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        byPriority: [
          {
            $group: {
              _id: '$documentInfo.priority',
              count: { $sum: 1 }
            }
          }
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalDocuments: { $sum: 1 },
              totalViews: { $sum: '$viewStatistics.totalViews' },
              totalSize: { $sum: '$fileInfo.fileSize' }
            }
          }
        ],
        recentActivity: [
          {
            $sort: { createdAt: -1 }
          },
          {
            $limit: 10
          },
          {
            $project: {
              title: '$documentInfo.title',
              category: '$documentCategory',
              createdAt: 1,
              createdBy: '$responsibility.createdBy'
            }
          }
        ]
      }
    }
  ]);

  return {
    byCategory: stats[0].byCategory,
    byStatus: stats[0].byStatus,
    byPriority: stats[0].byPriority,
    totals: stats[0].totals[0] || {},
    recentActivity: stats[0].recentActivity
  };
};

/**
 * 获取热门标签
 */
committeeDocumentSchema.statics.getPopularTags = async function(villageId, limit = 20) {
  const results = await this.aggregate([
    {
      $match: {
        villageId: new mongoose.Types.ObjectId(villageId),
        status: { $ne: DOCUMENT_STATUS.ARCHIVED }
      }
    },
    {
      $unwind: '$tags'
    },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);

  return results.map(tag => ({ tag: tag._id, count: tag.count }));
};

/**
 * 检查权限
 */
committeeDocumentSchema.statics.checkPermission = async function(documentId, userId, role, action = 'view') {
  const document = await this.findById(documentId).lean();

  if (!document) {
    return { allowed: false, reason: 'Document not found' };
  }

  // 超级管理员拥有所有权限
  if (role === 'super_admin' || role === 'admin') {
    return { allowed: true };
  }

  // 村支书拥有所有权限
  if (role === 'secretary') {
    return { allowed: true };
  }

  // 村主任拥有大部分权限
  if (role === 'village_head' && ['view', 'update', 'download'].includes(action)) {
    return { allowed: true };
  }

  // 村级管理员拥有查看权限
  if (role === 'village_admin' && action === 'view') {
    return { allowed: true };
  }

  // 创建者拥有所有权限
  if (document.responsibility.createdBy && document.responsibility.createdBy.toString() === userId.toString()) {
    return { allowed: true };
  }

  // 检查访问控制
  if (document.accessControl.isPublic) {
    return { allowed: action === 'view' };
  }

  // 检查角色权限
  if (document.accessControl.allowedRoles.includes(role)) {
    return { allowed: action === 'view' };
  }

  // 检查成员权限
  if (document.accessControl.allowedMembers.some(id => id.toString() === userId.toString())) {
    return { allowed: action === 'view' };
  }

  return { allowed: false, reason: 'Insufficient permissions' };
};

// ============= 中间件 =============

// 保存前记录审计日志
committeeDocumentSchema.pre('save', async function(next) {
  if (this.isNew) {
    // 创建新文档时记录审计日志
    try {
      const CommitteeAuditLog = mongoose.model('CommitteeAuditLog');
      await CommitteeAuditLog.logAction({
        operatorId: this.responsibility.uploadedBy,
        operatorName: 'Unknown', // 需要从User查询
        operatorRole: 'committee_member',
        villageId: this.villageId,
        action: 'create',
        resourceType: 'document',
        resourceId: this._id,
        resourceName: this.documentInfo.title,
        details: {
          changes: {
            after: {
              category: this.documentCategory,
              title: this.documentInfo.title
            }
          },
          result: { type: 'success' }
        },
        requestContext: {
          ipAddress: '0.0.0.0' // 需要从请求上下文获取
        }
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
  next();
});

// 导出枚举
committeeDocumentSchema.statics.DOCUMENT_CATEGORIES = DOCUMENT_CATEGORIES;
committeeDocumentSchema.statics.DOCUMENT_STATUS = DOCUMENT_STATUS;
committeeDocumentSchema.statics.DOCUMENT_PRIORITY = DOCUMENT_PRIORITY;

module.exports = mongoose.model('CommitteeDocument', committeeDocumentSchema);
