/**
 * 用户反馈服务
 * 提供全面的反馈收集、分析、处理和跟进机制
 */

const mongoose = require('mongoose')
const EventEmitter = require('events')
const logger = require('../utils/logger');

// 反馈 Schema
const feedbackSchema = new mongoose.Schema({
  // 基本信息
  feedbackId: { type: String, unique: true, required: true },
  userId: { type: String, ref: 'User', required: true },
  userType: {
    type: String,
    enum: ['villager', 'admin', 'staff', 'guest'],
    required: true
  },

  // 反馈内容
  category: {
    type: String,
    enum: [
      'bug_report',      // Bug报告
      'feature_request', // 功能需求
      'improvement',     // 改进建议
      'complaint',       // 投诉
      'compliment',      // 表扬
      'question',        // 咨询
      'usage_difficulty' // 使用困难
    ],
    required: true
  },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },

  // 附件信息
  attachments: [{
    type: { type: String, enum: ['image', 'video', 'file', 'screenshot'] },
    url: { type: String },
    filename: { type: String },
    size: { type: Number },
    description: { type: String }
  }],

  // 上下文信息
  context: {
    page: { type: String },
    action: { type: String },
    userAgent: { type: String },
    deviceInfo: { type: mongoose.Schema.Types.Mixed },
    browserInfo: { type: mongoose.Schema.Types.Mixed },
    location: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date },
    sessionId: { type: String }
  },

  // 严重程度和优先级
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // 处理状态
  status: {
    type: String,
    enum: ['pending', 'in_review', 'in_progress', 'resolved', 'closed', 'rejected'],
    default: 'pending'
  },

  // 处理信息
  assignedTo: { type: String, ref: 'User' },
  assignedTeam: { type: String, enum: ['dev', 'product', 'support', 'ui', 'security'] },

  // 处理记录
  responses: [{
    responderId: { type: String, ref: 'User' },
    response: { type: String, required: true },
    attachments: [{ url: String, filename: String }],
    timestamp: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: false }
  }],

  // 满意度评价
  satisfaction: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    timestamp: { type: Date }
  },

  // 标签
  tags: [{ type: String }],

  // 自动分类
  aiCategory: {
    mainCategory: { type: String },
    subCategory: { type: String },
    confidence: { type: Number },
    keywords: [{ type: String }]
  },

  // 元数据
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  responseTime: { type: Number }, // 响应时间（分钟）
  resolutionTime: { type: Number } // 解决时间（分钟）
}, {
  timestamps: true
})

// 索引
feedbackSchema.index({ userId: 1, createdAt: -1 })
feedbackSchema.index({ category: 1, status: 1 })
feedbackSchema.index({ priority: 1, status: 1 })
feedbackSchema.index({ tags: 1 })
feedbackSchema.index({ 'aiCategory.mainCategory': 1 })

class UserFeedbackService extends EventEmitter {
  constructor() {
    super()
    this.Feedback = mongoose.model('Feedback', feedbackSchema)
    this.aiCategorizer = null // AI分类器
    this.notificationService = null // 通知服务
    this.analyticsService = null // 分析服务
  }

  /**
   * 提交反馈
   * @param {Object} feedbackData - 反馈数据
   * @returns {Promise<Object>} 反馈结果
   */
  async submitFeedback(feedbackData) {
    try {
      // 生成反馈ID
      const feedbackId = this.generateFeedbackId()

      // 添加上下文信息
      const context = await this.captureContext(feedbackData.context || {})

      // AI自动分类
      const aiCategory = await this.categorizeFeedback(feedbackData)

      // 创建反馈记录
      const feedback = new this.Feedback({
        ...feedbackData,
        feedbackId,
        context: { ...context, ...feedbackData.context },
        aiCategory
      })

      await feedback.save()

      // 自动分配处理人
      const assignment = await this.autoAssignFeedback(feedback)
      if (assignment.assignedTo) {
        feedback.assignedTo = assignment.assignedTo
        feedback.assignedTeam = assignment.team
        await feedback.save()
      }

      // 发送通知
      await this.sendFeedbackNotifications(feedback)

      // 触发事件
      this.emit('feedback:submitted', feedback)

      return {
        success: true,
        data: {
          feedbackId: feedback.feedbackId,
          status: feedback.status,
          estimatedResponseTime: this.calculateResponseTime(feedback)
        }
      }

    } catch (error) {
      logger.error('提交反馈失败:', error);
      throw error
    }
  }

  /**
   * 获取反馈列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 反馈列表
   */
  async getFeedbackList(filters = {}) {
    try {
      const {
        userId,
        category,
        status,
        priority,
        assignedTeam,
        tags,
        dateRange,
        page = 1,
        limit = 20
      } = filters

      // 构建查询条件
      const query = {}

      if (userId) query.userId = userId
      if (category) query.category = category
      if (status) query.status = status
      if (priority) query.priority = priority
      if (assignedTeam) query.assignedTeam = assignedTeam
      if (tags && tags.length > 0) query.tags = { $in: tags }

      if (dateRange) {
        query.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        }
      }

      // 查询反馈
      const feedbacks = await this.Feedback
        .find(query)
        .populate('userId', 'username profile.displayName')
        .populate('assignedTo', 'username profile.displayName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)

      // 统计总数
      const total = await this.Feedback.countDocuments(query)

      return {
        success: true,
        data: {
          feedbacks,
          pagination: {
            current: page,
            pageSize: limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      }

    } catch (error) {
      logger.error('获取反馈列表失败:', error);
      throw error
    }
  }

  /**
   * 处理反馈
   * @param {String} feedbackId - 反馈ID
   * @param {Object} processData - 处理数据
   * @returns {Promise<Object>} 处理结果
   */
  async processFeedback(feedbackId, processData) {
    try {
      const feedback = await this.Feedback.findOne({ feedbackId })
      if (!feedback) {
        throw new Error('反馈不存在')
      }

      const {
        status,
        assignedTo,
        assignedTeam,
        response,
        isInternal = false,
        tags
      } = processData

      // 更新状态
      if (status) feedback.status = status
      if (assignedTo) feedback.assignedTo = assignedTo
      if (assignedTeam) feedback.assignedTeam = assignedTeam
      if (tags) feedback.tags = [...new Set([...feedback.tags, ...tags])]

      // 添加处理记录
      if (response) {
        feedback.responses.push({
          responderId: processData.responderId,
          response,
          attachments: processData.attachments || [],
          isInternal
        })
      }

      // 计算响应时间
      if (status === 'in_review' && !feedback.responseTime) {
        feedback.responseTime = this.calculateResponseTime(feedback)
      }

      // 计算解决时间
      if (status === 'resolved' && !feedback.resolutionTime) {
        feedback.resolutionTime = this.calculateResolutionTime(feedback)
        feedback.resolvedAt = new Date()
      }

      await feedback.save()

      // 发送通知
      await this.sendProcessNotifications(feedback, processData)

      // 触发事件
      this.emit('feedback:processed', feedback)

      return {
        success: true,
        data: feedback
      }

    } catch (error) {
      logger.error('处理反馈失败:', error);
      throw error
    }
  }

  /**
   * 添加满意度评价
   * @param {String} feedbackId - 反馈ID
   * @param {Object} satisfactionData - 满意度数据
   * @returns {Promise<Object>} 评价结果
   */
  async addSatisfactionRating(feedbackId, satisfactionData) {
    try {
      const feedback = await this.Feedback.findOne({ feedbackId })
      if (!feedback) {
        throw new Error('反馈不存在')
      }

      if (feedback.status !== 'resolved') {
        throw new Error('只能对已解决的反馈进行评价')
      }

      feedback.satisfaction = {
        rating: satisfactionData.rating,
        comment: satisfactionData.comment,
        timestamp: new Date()
      }

      await feedback.save()

      // 触发满意度分析
      this.emit('feedback:satisfaction_rated', feedback)

      return {
        success: true,
        data: feedback.satisfaction
      }

    } catch (error) {
      logger.error('添加满意度评价失败:', error);
      throw error
    }
  }

  /**
   * 获取反馈统计
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计数据
   */
  async getFeedbackStats(filters = {}) {
    try {
      const { dateRange, team } = filters

      // 构建时间过滤
      const dateFilter = dateRange ? {
        createdAt: {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        }
      } : {}

      const teamFilter = team ? { assignedTeam: team } : {}

      // 基础统计
      const [
        totalFeedbacks,
        pendingCount,
        inProgressCount,
        resolvedCount,
        avgResolutionTime,
        satisfactionStats
      ] = await Promise.all([
        this.Feedback.countDocuments({ ...dateFilter }),
        this.Feedback.countDocuments({ ...dateFilter, status: 'pending' }),
        this.Feedback.countDocuments({ ...dateFilter, status: 'in_progress' }),
        this.Feedback.countDocuments({ ...dateFilter, status: 'resolved' }),
        this.getAverageResolutionTime(dateFilter),
        this.getSatisfactionStats(dateFilter)
      ])

      // 分类统计
      const categoryStats = await this.Feedback.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgRating: { $avg: '$satisfaction.rating' }
          }
        },
        { $sort: { count: -1 } }
      ])

      // 严重程度统计
      const severityStats = await this.Feedback.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ])

      // 团队统计
      const teamStats = await this.Feedback.aggregate([
        { $match: { ...dateFilter, ...teamFilter } },
        {
          $group: {
            _id: '$assignedTeam',
            count: { $sum: 1 },
            avgResolutionTime: { $avg: '$resolutionTime' }
          }
        }
      ])

      // 趋势分析
      const trendData = await this.getFeedbackTrends(dateFilter)

      return {
        success: true,
        data: {
          overview: {
            total: totalFeedbacks,
            pending: pendingCount,
            inProgress: inProgressCount,
            resolved: resolvedCount,
            resolutionRate: totalFeedbacks > 0 ? (resolvedCount / totalFeedbacks * 100).toFixed(2) : 0,
            avgResolutionTime: avgResolutionTime
          },
          category: categoryStats,
          severity: severityStats,
          team: teamStats,
          satisfaction: satisfactionStats,
          trends: trendData
        }
      }

    } catch (error) {
      logger.error('获取反馈统计失败:', error);
      throw error
    }
  }

  /**
   * AI分析反馈趋势
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeFeedbackTrends() {
    try {
      // 获取最近的反馈数据
      const recentFeedbacks = await this.Feedback
        .find({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
        .populate('userId', 'profile.userType')

      // 问题类型分析
      const problemTypes = this.analyzeProblemTypes(recentFeedbacks)

      // 用户群体分析
      const userGroupAnalysis = this.analyzeUserGroups(recentFeedbacks)

      // 功能热点分析
      const featureHotspots = this.analyzeFeatureHotspots(recentFeedbacks)

      // 情感分析
      const sentimentAnalysis = await this.performSentimentAnalysis(recentFeedbacks)

      // 改进建议
      const improvementSuggestions = this.generateImprovementSuggestions(
        problemTypes,
        userGroupAnalysis,
        featureHotspots
      )

      return {
        success: true,
        data: {
          problemTypes,
          userGroupAnalysis,
          featureHotspots,
          sentimentAnalysis,
          improvementSuggestions,
          analyzedAt: new Date()
        }
      }

    } catch (error) {
      logger.error('AI分析反馈趋势失败:', error);
      throw error
    }
  }

  /**
   * 智能推荐改进方案
   * @param {Object} problemArea - 问题领域
   * @returns {Promise<Array>} 改进建议
   */
  async recommendImprovements(problemArea) {
    try {
      // 获取相关历史反馈
      const relatedFeedbacks = await this.Feedback.find({
        $or: [
          { category: problemArea },
          { tags: { $in: [problemArea] } },
          { 'aiCategory.subCategory': problemArea }
        ],
        status: 'resolved'
      }).sort({ resolvedAt: -1 }).limit(100)

      // 分析成功解决方案
      const successfulSolutions = this.analyzeSuccessfulSolutions(relatedFeedbacks)

      // 查找类似问题
      const similarIssues = await this.findSimilarIssues(problemArea)

      // 生成改进建议
      const suggestions = [
        {
          type: 'immediate_fix',
          priority: 'high',
          title: '紧急修复建议',
          description: '基于用户反馈的紧急问题修复',
          actions: this.generateFixActions(problemArea, relatedFeedbacks)
        },
        {
          type: 'feature_enhancement',
          priority: 'medium',
          title: '功能增强建议',
          description: '基于用户需求的功能改进',
          actions: this.generateEnhancementActions(problemArea, similarIssues)
        },
        {
          type: 'process_optimization',
          priority: 'medium',
          title: '流程优化建议',
          description: '改进用户体验流程',
          actions: this.generateProcessActions(problemArea, successfulSolutions)
        }
      ]

      return {
        success: true,
        data: suggestions
      }

    } catch (error) {
      logger.error('推荐改进方案失败:', error);
      throw error
    }
  }

  /**
   * 导出反馈数据
   * @param {Object} options - 导出选项
   * @returns {Promise<Object>} 导出结果
   */
  async exportFeedbackData(options = {}) {
    try {
      const {
        format = 'json',
        dateRange,
        categories,
        status,
        includeAttachments = false
      } = options

      // 构建查询条件
      const query = {}
      if (dateRange) {
        query.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        }
      }
      if (categories) query.category = { $in: categories }
      if (status) query.status = { $in: status }

      // 查询数据
      const feedbacks = await this.Feedback
        .find(query)
        .populate('userId', 'username profile.displayName profile.userType')
        .populate('assignedTo', 'username profile.displayName')
        .lean()

      // 数据脱敏
      const sanitizedData = feedbacks.map(feedback => ({
        feedbackId: feedback.feedbackId,
        category: feedback.category,
        title: feedback.title,
        description: feedback.description.substring(0, 500), // 限制描述长度
        severity: feedback.severity,
        priority: feedback.priority,
        status: feedback.status,
        createdAt: feedback.createdAt,
        resolvedAt: feedback.resolvedAt,
        responseTime: feedback.responseTime,
        resolutionTime: feedback.resolutionTime,
        satisfaction: feedback.satisfaction,
        tags: feedback.tags,
        userType: feedback.userId?.profile?.userType,
        assignedTo: feedback.assignedTo?.profile?.displayName,
        // 不包含敏感个人信息
        context: {
          page: feedback.context?.page,
          action: feedback.context?.action
        }
      }))

      // 格式化导出
      let exportData
      switch (format.toLowerCase()) {
        case 'csv':
          exportData = this.convertToCSV(sanitizedData)
          break
        case 'excel':
          exportData = await this.convertToExcel(sanitizedData)
          break
        default:
          exportData = JSON.stringify(sanitizedData, null, 2)
      }

      // 记录导出操作
      this.emit('feedback:exported', {
        count: sanitizedData.length,
        format,
        exportedBy: options.exportedBy
      })

      return {
        success: true,
        data: {
          content: exportData,
          filename: `feedback_export_${Date.now()}.${format}`,
          mimeType: this.getMimeType(format)
        }
      }

    } catch (error) {
      logger.error('导出反馈数据失败:', error);
      throw error
    }
  }

  // ========== 私有方法 ==========

  /**
   * 生成反馈ID
   * @returns {String} 反馈ID
   */
  generateFeedbackId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 6)
    return `FB${timestamp}${random}`.toUpperCase()
  }

  /**
   * 捕获上下文信息
   * @param {Object} context - 上下文数据
   * @returns {Promise<Object>} 完整上下文
   */
  async captureContext(context) {
    return {
      timestamp: new Date(),
      sessionId: context.sessionId || this.generateSessionId(),
      userAgent: context.userAgent || '',
      deviceInfo: context.deviceInfo || {},
      browserInfo: context.browserInfo || {},
      location: context.location || null,
      page: context.page || '',
      action: context.action || ''
    }
  }

  /**
   * AI自动分类
   * @param {Object} feedbackData - 反馈数据
   * @returns {Promise<Object>} 分类结果
   */
  async categorizeFeedback(feedbackData) {
    // 简化的AI分类逻辑
    const text = `${feedbackData.title} ${feedbackData.description}`.toLowerCase()
    const keywords = this.extractKeywords(text)

    // 基于关键词的分类规则
    const categoryRules = {
      'ui_issue': ['界面', '页面', '显示', '样式', '布局', '颜色', '字体', '按钮'],
      'performance': ['慢', '卡顿', '延迟', '加载', '响应', '速度'],
      'functionality': ['功能', '操作', '使用', '无法', '不能', '失败'],
      'security': ['安全', '权限', '登录', '密码', '验证'],
      'content': ['内容', '信息', '文字', '错误', '提示'],
      'compatibility': ['兼容', '浏览器', '手机', '电脑', '系统']
    }

    let mainCategory = 'general'
    let confidence = 0

    for (const [category, words] of Object.entries(categoryRules)) {
      const matchCount = words.filter(word => text.includes(word)).length
      if (matchCount > confidence) {
        confidence = matchCount
        mainCategory = category
      }
    }

    return {
      mainCategory,
      subCategory: feedbackData.category,
      confidence: Math.min(confidence / keywords.length, 1),
      keywords: keywords.slice(0, 5)
    }
  }

  /**
   * 提取关键词
   * @param {String} text - 文本
   * @returns {Array} 关键词列表
   */
  extractKeywords(text) {
    // 简化的关键词提取
    const words = text.split(/\s+/).filter(word => word.length > 1)
    return [...new Set(words)]
  }

  /**
   * 自动分配反馈
   * @param {Object} feedback - 反馈对象
   * @returns {Promise<Object>} 分配结果
   */
  async autoAssignFeedback(feedback) {
    // 基于分类和严重程度的自动分配规则
    const assignmentRules = {
      'bug_report': { team: 'dev', priority: 'high' },
      'security': { team: 'security', priority: 'urgent' },
      'ui_issue': { team: 'ui', priority: 'medium' },
      'feature_request': { team: 'product', priority: 'medium' },
      'complaint': { team: 'support', priority: 'high' }
    }

    const rule = assignmentRules[feedback.category] || { team: 'support', priority: 'medium' }

    // 根据严重程度调整
    if (feedback.severity === 'critical') {
      rule.priority = 'urgent'
      rule.team = 'dev'
    }

    return {
      team: rule.team,
      priority: rule.priority,
      assignedTo: await this.findAvailableAssignee(rule.team)
    }
  }

  /**
   * 查找可用的处理人
   * @param {String} team - 团队名称
   * @returns {Promise<String>} 处理人ID
   */
  async findAvailableAssignee(team) {
    // 这里应该实现根据团队查找可用人员的逻辑
    // 暂时返回null，需要实际的用户管理系统支持
    return null
  }

  /**
   * 发送反馈通知
   * @param {Object} feedback - 反馈对象
   */
  async sendFeedbackNotifications(feedback) {
    if (!this.notificationService) return

    const notifications = [
      {
        type: 'feedback_submitted',
        recipients: ['admin'],
        title: '新反馈提交',
        content: `用户提交了新的${feedback.category}反馈`,
        data: { feedbackId: feedback.feedbackId }
      }
    ]

    if (feedback.assignedTo) {
      notifications.push({
        type: 'feedback_assigned',
        recipients: [feedback.assignedTo],
        title: '反馈已分配',
        content: `您有新的反馈需要处理`,
        data: { feedbackId: feedback.feedbackId }
      })
    }

    await this.notificationService.sendBatchNotifications(notifications)
  }

  /**
   * 发送处理通知
   * @param {Object} feedback - 反馈对象
   * @param {Object} processData - 处理数据
   */
  async sendProcessNotifications(feedback, processData) {
    if (!this.notificationService) return

    // 通知用户
    await this.notificationService.sendNotification({
      type: 'feedback_processed',
      recipient: feedback.userId,
      title: '反馈处理更新',
      content: `您的反馈已更新状态为：${this.getStatusText(processData.status)}`,
      data: { feedbackId: feedback.feedbackId }
    })
  }

  /**
   * 计算响应时间
   * @param {Object} feedback - 反馈对象
   * @returns {Number} 响应时间（分钟）
   */
  calculateResponseTime(feedback) {
    const created = new Date(feedback.createdAt)
    const now = new Date()
    return Math.round((now - created) / (1000 * 60))
  }

  /**
   * 计算解决时间
   * @param {Object} feedback - 反馈对象
   * @returns {Number} 解决时间（分钟）
   */
  calculateResolutionTime(feedback) {
    const created = new Date(feedback.createdAt)
    const now = new Date()
    return Math.round((now - created) / (1000 * 60))
  }

  /**
   * 获取平均解决时间
   * @param {Object} dateFilter - 日期过滤
   * @returns {Promise<Number>} 平均解决时间
   */
  async getAverageResolutionTime(dateFilter) {
    const result = await this.Feedback.aggregate([
      { $match: { ...dateFilter, resolutionTime: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } }
    ])

    return result.length > 0 ? Math.round(result[0].avgTime) : 0
  }

  /**
   * 获取满意度统计
   * @param {Object} dateFilter - 日期过滤
   * @returns {Promise<Object>} 满意度统计
   */
  async getSatisfactionStats(dateFilter) {
    const result = await this.Feedback.aggregate([
      { $match: { ...dateFilter, 'satisfaction.rating': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$satisfaction.rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$satisfaction.rating'
          }
        }
      }
    ])

    if (result.length === 0) {
      return { avgRating: 0, totalRatings: 0, distribution: {} }
    }

    const data = result[0]
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    data.ratingDistribution.forEach(rating => {
      distribution[rating]++
    })

    return {
      avgRating: Math.round(data.avgRating * 100) / 100,
      totalRatings: data.totalRatings,
      distribution
    }
  }

  /**
   * 获取反馈趋势
   * @param {Object} dateFilter - 日期过滤
   * @returns {Promise<Array>} 趋势数据
   */
  async getFeedbackTrends(dateFilter) {
    // 按天统计反馈数量
    const dailyStats = await this.Feedback.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])

    return dailyStats.map(stat => ({
      date: `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}-${stat._id.day.toString().padStart(2, '0')}`,
      count: stat.count
    }))
  }

  /**
   * 分析问题类型
   * @param {Array} feedbacks - 反馈列表
   * @returns {Object} 分析结果
   */
  analyzeProblemTypes(feedbacks) {
    const problemTypes = {}

    feedbacks.forEach(feedback => {
      const category = feedback.aiCategory?.mainCategory || feedback.category
      if (!problemTypes[category]) {
        problemTypes[category] = { count: 0, severity: {} }
      }
      problemTypes[category].count++

      if (!problemTypes[category].severity[feedback.severity]) {
        problemTypes[category].severity[feedback.severity] = 0
      }
      problemTypes[category].severity[feedback.severity]++
    })

    return problemTypes
  }

  /**
   * 分析用户群体
   * @param {Array} feedbacks - 反馈列表
   * @returns {Object} 分析结果
   */
  analyzeUserGroups(feedbacks) {
    const userGroups = {}

    feedbacks.forEach(feedback => {
      const userType = feedback.userId?.profile?.userType || 'unknown'
      if (!userGroups[userType]) {
        userGroups[userType] = { count: 0, avgSatisfaction: 0, categories: {} }
      }
      userGroups[userType].count++

      // 分析类别偏好
      const category = feedback.category
      if (!userGroups[userType].categories[category]) {
        userGroups[userType].categories[category] = 0
      }
      userGroups[userType].categories[category]++
    })

    return userGroups
  }

  /**
   * 分析功能热点
   * @param {Array} feedbacks - 反馈列表
   * @returns {Object} 分析结果
   */
  analyzeFeatureHotspots(feedbacks) {
    const hotspots = {}

    feedbacks.forEach(feedback => {
      const page = feedback.context?.page || 'unknown'
      if (!hotspots[page]) {
        hotspots[page] = { count: 0, issues: {} }
      }
      hotspots[page].count++

      const issue = feedback.aiCategory?.subCategory || feedback.category
      if (!hotspots[page].issues[issue]) {
        hotspots[page].issues[issue] = 0
      }
      hotspots[page].issues[issue]++
    })

    return hotspots
  }

  /**
   * 执行情感分析
   * @param {Array} feedbacks - 反馈列表
   * @returns {Promise<Object>} 情感分析结果
   */
  async performSentimentAnalysis(feedbacks) {
    // 简化的情感分析
    const sentiments = { positive: 0, negative: 0, neutral: 0 }
    const sentimentKeywords = {
      positive: ['好', '满意', '喜欢', '方便', '快速', '棒', '优秀'],
      negative: ['差', '不满', '问题', '困难', '慢', '糟糕', '错误'],
      neutral: ['一般', '还行', '普通', '正常']
    }

    feedbacks.forEach(feedback => {
      const text = `${feedback.title} ${feedback.description}`.toLowerCase()
      let sentiment = 'neutral'

      const positiveCount = sentimentKeywords.positive.filter(word => text.includes(word)).length
      const negativeCount = sentimentKeywords.negative.filter(word => text.includes(word)).length

      if (positiveCount > negativeCount) {
        sentiment = 'positive'
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative'
      }

      sentiments[sentiment]++
    })

    return sentiments
  }

  /**
   * 生成改进建议
   * @param {Object} problemTypes - 问题类型
   * @param {Object} userGroupAnalysis - 用户群体分析
   * @param {Object} featureHotspots - 功能热点
   * @returns {Array} 改进建议
   */
  generateImprovementSuggestions(problemTypes, userGroupAnalysis, featureHotspots) {
    const suggestions = []

    // 基于问题类型的建议
    if (problemTypes.ui_issue && problemTypes.ui_issue.count > 10) {
      suggestions.push({
        priority: 'high',
        category: 'UI优化',
        description: 'UI相关问题较多，建议进行界面优化',
        actionItems: ['重新设计高频问题页面', '优化交互流程', '改善视觉设计']
      })
    }

    // 基于用户群体的建议
    if (userGroupAnalysis.villager && userGroupAnalysis.villager.count > 50) {
      suggestions.push({
        priority: 'medium',
        category: '用户体验优化',
        description: '村民用户反馈较多，建议优化用户体验',
        actionItems: ['简化操作流程', '增加语音指导', '优化移动端体验']
      })
    }

    // 基于功能热点的建议
    Object.entries(featureHotspots).forEach(([page, data]) => {
      if (data.count > 20) {
        suggestions.push({
          priority: 'medium',
          category: '功能优化',
          description: `${page}页面问题集中，建议重点优化`,
          actionItems: ['修复页面bug', '优化页面性能', '改进功能设计']
        })
      }
    })

    return suggestions
  }

  /**
   * 分析成功解决方案
   * @param {Array} feedbacks - 反馈列表
   * @returns {Array} 成功方案
   */
  analyzeSuccessfulSolutions(feedbacks) {
    const solutions = []

    feedbacks.forEach(feedback => {
      if (feedback.satisfaction && feedback.satisfaction.rating >= 4) {
        feedback.responses.forEach(response => {
          if (!response.isInternal) {
            solutions.push({
              problem: feedback.category,
              solution: response.response,
              rating: feedback.satisfaction.rating
            })
          }
        })
      }
    })

    return solutions
  }

  /**
   * 查找类似问题
   * @param {String} problemArea - 问题领域
   * @returns {Promise<Array>} 类似问题
   */
  async findSimilarIssues(problemArea) {
    return await this.Feedback.find({
      $or: [
        { category: problemArea },
        { tags: { $in: [problemArea] } },
        { 'aiCategory.mainCategory': problemArea }
      ],
      status: { $in: ['pending', 'in_progress'] }
    }).limit(10)
  }

  /**
   * 生成修复动作
   * @param {String} problemArea - 问题领域
   * @param {Array} relatedFeedbacks - 相关反馈
   * @returns {Array} 修复动作
   */
  generateFixActions(problemArea, relatedFeedbacks) {
    const actions = []

    const commonIssues = this.extractCommonIssues(relatedFeedbacks)
    commonIssues.forEach(issue => {
      actions.push({
        type: 'fix',
        description: `修复${issue.description}`,
        priority: issue.severity === 'high' ? 'urgent' : 'high',
        estimatedTime: issue.estimatedTime
      })
    })

    return actions
  }

  /**
   * 生成增强动作
   * @param {String} problemArea - 问题领域
   * @param {Array} similarIssues - 类似问题
   * @returns {Array} 增强动作
   */
  generateEnhancementActions(problemArea, similarIssues) {
    return [
      {
        type: 'enhancement',
        description: `增强${problemArea}相关功能`,
        priority: 'medium',
        estimatedTime: '2-3 days'
      }
    ]
  }

  /**
   * 生成流程动作
   * @param {String} problemArea - 问题领域
   * @param {Array} successfulSolutions - 成功方案
   * @returns {Array} 流程动作
   */
  generateProcessActions(problemArea, successfulSolutions) {
    return [
      {
        type: 'process',
        description: `优化${problemArea}处理流程`,
        priority: 'medium',
        estimatedTime: '1-2 days'
      }
    ]
  }

  /**
   * 提取常见问题
   * @param {Array} feedbacks - 反馈列表
   * @returns {Array} 常见问题
   */
  extractCommonIssues(feedbacks) {
    const issues = {}

    feedbacks.forEach(feedback => {
      const key = `${feedback.category}_${feedback.aiCategory?.mainCategory}`
      if (!issues[key]) {
        issues[key] = {
          description: feedback.title,
          count: 0,
          severity: feedback.severity,
          estimatedTime: '2-4 hours'
        }
      }
      issues[key].count++
    })

    return Object.values(issues)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  /**
   * 转换为CSV格式
   * @param {Array} data - 数据
   * @returns {String} CSV字符串
   */
  convertToCSV(data) {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * 转换为Excel格式
   * @param {Array} data - 数据
   * @returns {Promise<Buffer>} Excel文件
   */
  async convertToExcel(data) {
    // 这里需要实现Excel转换逻辑
    // 可以使用 xlsx 库
    throw new Error('Excel export not implemented yet')
  }

  /**
   * 获取MIME类型
   * @param {String} format - 格式
   * @returns {String} MIME类型
   */
  getMimeType(format) {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    return mimeTypes[format.toLowerCase()] || 'application/octet-stream'
  }

  /**
   * 获取状态文本
   * @param {String} status - 状态
   * @returns {String} 状态文本
   */
  getStatusText(status) {
    const statusTexts = {
      pending: '待处理',
      in_review: '审核中',
      in_progress: '处理中',
      resolved: '已解决',
      closed: '已关闭',
      rejected: '已拒绝'
    }
    return statusTexts[status] || status
  }

  /**
   * 生成会话ID
   * @returns {String} 会话ID
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}

module.exports = UserFeedbackService