/**
 * 用户反馈控制器
 * 提供反馈管理的HTTP API接口
 */

const UserFeedbackService = require('../services/userFeedbackService')
const multer = require('multer')
const path = require('path')

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/feedback')
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|pdf|doc|docx/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'))
    }
  }
})

class UserFeedbackController {
  constructor() {
    this.feedbackService = new UserFeedbackService()

    // 事件监听
    this.feedbackService.on('feedback:submitted', (feedback) => {
      console.log(`新反馈提交: ${feedback.feedbackId}`)
    })

    this.feedbackService.on('feedback:processed', (feedback) => {
      console.log(`反馈已处理: ${feedback.feedbackId}`)
    })
  }

  /**
   * 提交反馈
   */
  submitFeedback = async (req, res) => {
    try {
      const { category, title, description, severity, priority, tags, context } = req.body

      // 验证必需字段
      if (!category || !title || !description) {
        return res.status(400).json({
          success: false,
          message: '缺少必需字段：category, title, description'
        })
      }

      // 处理上传的附件
      let attachments = []
      if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => ({
          type: this.getFileType(file.mimetype),
          url: `/uploads/feedback/${file.filename}`,
          filename: file.originalname,
          size: file.size
        }))
      }

      // 添加附件信息到请求体
      req.body.attachments = attachments

      // 添加用户信息
      req.body.userId = req.user?.id || 'anonymous'
      req.body.userType = req.user?.userType || 'guest'

      const result = await this.feedbackService.submitFeedback(req.body)

      res.status(201).json(result)

    } catch (error) {
      console.error('提交反馈失败:', error)
      res.status(500).json({
        success: false,
        message: '提交反馈失败',
        error: error.message
      })
    }
  }

  /**
   * 获取反馈列表
   */
  getFeedbackList = async (req, res) => {
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
      } = req.query

      const filters = {
        userId: userId || (req.user?.role !== 'admin' ? req.user.id : undefined),
        category,
        status,
        priority,
        assignedTeam,
        tags: tags ? tags.split(',') : undefined,
        dateRange: dateRange ? JSON.parse(dateRange) : undefined,
        page: parseInt(page),
        limit: parseInt(limit)
      }

      const result = await this.feedbackService.getFeedbackList(filters)

      res.json(result)

    } catch (error) {
      console.error('获取反馈列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取反馈列表失败',
        error: error.message
      })
    }
  }

  /**
   * 获取反馈详情
   */
  getFeedbackDetail = async (req, res) => {
    try {
      const { feedbackId } = req.params
      const User = require('../models/User')
      const feedback = await require('mongoose').model('Feedback')
        .findOne({ feedbackId })
        .populate('userId', 'username profile.displayName profile.userType')
        .populate('assignedTo', 'username profile.displayName')
        .populate('responses.responderId', 'username profile.displayName')

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: '反馈不存在'
        })
      }

      // 权限检查：只能查看自己的反馈或管理员可以查看所有
      if (req.user?.role !== 'admin' && feedback.userId._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '没有权限查看此反馈'
        })
      }

      res.json({
        success: true,
        data: feedback
      })

    } catch (error) {
      console.error('获取反馈详情失败:', error)
      res.status(500).json({
        success: false,
        message: '获取反馈详情失败',
        error: error.message
      })
    }
  }

  /**
   * 处理反馈
   */
  processFeedback = async (req, res) => {
    try {
      const { feedbackId } = req.params
      const {
        status,
        assignedTo,
        assignedTeam,
        response,
        isInternal = false,
        tags
      } = req.body

      // 验证处理权限
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '没有权限处理反馈'
        })
      }

      const processData = {
        status,
        assignedTo,
        assignedTeam,
        response,
        isInternal,
        tags,
        responderId: req.user.id
      }

      const result = await this.feedbackService.processFeedback(feedbackId, processData)

      res.json(result)

    } catch (error) {
      console.error('处理反馈失败:', error)
      res.status(500).json({
        success: false,
        message: '处理反馈失败',
        error: error.message
      })
    }
  }

  /**
   * 添加满意度评价
   */
  addSatisfactionRating = async (req, res) => {
    try {
      const { feedbackId } = req.params
      const { rating, comment } = req.body

      // 验证评分
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: '评分必须在1-5之间'
        })
      }

      const result = await this.feedbackService.addSatisfactionRating(
        feedbackId,
        { rating, comment }
      )

      res.json(result)

    } catch (error) {
      console.error('添加满意度评价失败:', error)
      res.status(500).json({
        success: false,
        message: '添加满意度评价失败',
        error: error.message
      })
    }
  }

  /**
   * 获取反馈统计
   */
  getFeedbackStats = async (req, res) => {
    try {
      const { dateRange, team } = req.query

      const filters = {
        dateRange: dateRange ? JSON.parse(dateRange) : undefined,
        team
      }

      const result = await this.feedbackService.getFeedbackStats(filters)

      res.json(result)

    } catch (error) {
      console.error('获取反馈统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取反馈统计失败',
        error: error.message
      })
    }
  }

  /**
   * AI分析反馈趋势
   */
  analyzeFeedbackTrends = async (req, res) => {
    try {
      const result = await this.feedbackService.analyzeFeedbackTrends()

      res.json(result)

    } catch (error) {
      console.error('AI分析反馈趋势失败:', error)
      res.status(500).json({
        success: false,
        message: 'AI分析反馈趋势失败',
        error: error.message
      })
    }
  }

  /**
   * 推荐改进方案
   */
  recommendImprovements = async (req, res) => {
    try {
      const { problemArea } = req.body

      if (!problemArea) {
        return res.status(400).json({
          success: false,
          message: '缺少问题领域参数'
        })
      }

      const result = await this.feedbackService.recommendImprovements(problemArea)

      res.json(result)

    } catch (error) {
      console.error('推荐改进方案失败:', error)
      res.status(500).json({
        success: false,
        message: '推荐改进方案失败',
        error: error.message
      })
    }
  }

  /**
   * 导出反馈数据
   */
  exportFeedbackData = async (req, res) => {
    try {
      const {
        format = 'json',
        dateRange,
        categories,
        status,
        includeAttachments = false
      } = req.query

      // 验证导出权限
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '没有权限导出数据'
        })
      }

      const options = {
        format,
        dateRange: dateRange ? JSON.parse(dateRange) : undefined,
        categories: categories ? categories.split(',') : undefined,
        status: status ? status.split(',') : undefined,
        includeAttachments: includeAttachments === 'true',
        exportedBy: req.user.id
      }

      const result = await this.feedbackService.exportFeedbackData(options)

      // 设置响应头
      res.setHeader('Content-Type', result.data.mimeType)
      res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`)

      res.send(result.data.content)

    } catch (error) {
      console.error('导出反馈数据失败:', error)
      res.status(500).json({
        success: false,
        message: '导出反馈数据失败',
        error: error.message
      })
    }
  }

  /**
   * 获取反馈分类统计
   */
  getCategoryStats = async (req, res) => {
    try {
      const Feedback = require('mongoose').model('Feedback')

      const categoryStats = await Feedback.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgResolutionTime: { $avg: '$resolutionTime' },
            avgSatisfaction: { $avg: '$satisfaction.rating' }
          }
        },
        { $sort: { count: -1 } }
      ])

      res.json({
        success: true,
        data: categoryStats
      })

    } catch (error) {
      console.error('获取分类统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取分类统计失败',
        error: error.message
      })
    }
  }

  /**
   * 获取用户反馈历史
   */
  getUserFeedbackHistory = async (req, res) => {
    try {
      const userId = req.params.userId || req.user.id
      const { page = 1, limit = 10 } = req.query

      // 验证权限：只能查看自己的历史或管理员可以查看所有
      if (req.user?.role !== 'admin' && userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '没有权限查看此用户的反馈历史'
        })
      }

      const result = await this.feedbackService.getFeedbackList({
        userId,
        page: parseInt(page),
        limit: parseInt(limit)
      })

      res.json(result)

    } catch (error) {
      console.error('获取用户反馈历史失败:', error)
      res.status(500).json({
        success: false,
        message: '获取用户反馈历史失败',
        error: error.message
      })
    }
  }

  /**
   * 批量处理反馈
   */
  batchProcessFeedback = async (req, res) => {
    try {
      const { feedbackIds, processAction, processData } = req.body

      // 验证处理权限
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '没有权限批量处理反馈'
        })
      }

      const results = []
      for (const feedbackId of feedbackIds) {
        try {
          let result
          switch (processAction) {
            case 'assign':
              result = await this.feedbackService.processFeedback(feedbackId, {
                ...processData,
                responderId: req.user.id
              })
              break
            case 'update_status':
              result = await this.feedbackService.processFeedback(feedbackId, {
                status: processData.status,
                response: processData.response,
                responderId: req.user.id
              })
              break
            default:
              throw new Error('不支持的处理动作')
          }
          results.push({ feedbackId, success: true, data: result })
        } catch (error) {
          results.push({ feedbackId, success: false, error: error.message })
        }
      }

      res.json({
        success: true,
        data: {
          processed: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        }
      })

    } catch (error) {
      console.error('批量处理反馈失败:', error)
      res.status(500).json({
        success: false,
        message: '批量处理反馈失败',
        error: error.message
      })
    }
  }

  // ========== 私有方法 ==========

  /**
   * 获取文件类型
   * @param {String} mimetype - MIME类型
   * @returns {String} 文件类型
   */
  getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image'
    if (mimetype.startsWith('video/')) return 'video'
    if (mimetype.includes('pdf') || mimetype.includes('document')) return 'file'
    return 'file'
  }

  // 中间件：文件上传处理
  static uploadMiddleware() {
    return upload.array('attachments', 5) // 最多5个附件
  }

  // 中间件：权限验证
  static requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '需要登录'
        })
      }

      if (req.user.role !== 'admin' && !req.user.permissions?.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        })
      }

      next()
    }
  }

  // 中间件：参数验证
  static validateFeedbackSubmission(req, res, next) {
    const { category, title, description } = req.body

    if (!category || !title || !description) {
      return res.status(400).json({
        success: false,
        message: '缺少必需字段：category, title, description'
      })
    }

    if (title.length > 100) {
      return res.status(400).json({
        success: false,
        message: '标题长度不能超过100个字符'
      })
    }

    if (description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: '描述长度不能超过2000个字符'
      })
    }

    next()
  }

  // 中间件：处理权限验证
  static validateProcessPermission(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '没有权限处理反馈'
      })
    }

    next()
  }

  // 中间件：导出权限验证
  static validateExportPermission(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '没有权限导出数据'
      })
    }

    next()
  }
}

module.exports = UserFeedbackController