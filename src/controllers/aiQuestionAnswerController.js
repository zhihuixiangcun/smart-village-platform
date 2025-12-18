/**
 * AI智能问答控制器
 * 处理AI智能问答、政策解读、生活指导等请求
 */

const AIQuestionAnswerService = require('../services/aiQuestionAnswerService')
const logger = require('../config/logger')
const auditMiddleware = require('../middleware/auditMiddleware')

// 初始化AI服务
const aiService = new AIQuestionAnswerService()

class AIQuestionAnswerController {
  /**
   * 创建对话会话
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async createSession(req, res) {
    try {
      const { context = 'general', provider, temperature, maxTokens, enableContext } = req.body

      const sessionId = aiService.createSession(req.user.id, {
        context,
        provider,
        temperature,
        maxTokens,
        enableContext
      })

      res.json({
        success: true,
        data: {
          sessionId,
          context,
          provider: provider || aiService.defaultProvider
        },
        message: '对话会话创建成功'
      })

    } catch (error) {
      logger.error('创建AI会话失败:', error)
      res.status(500).json({
        success: false,
        message: '创建会话失败',
        error: error.message
      })
    }
  }

  /**
   * 发送消息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async sendMessage(req, res) {
    try {
      const { sessionId, message, provider } = req.body

      if (!sessionId || !message) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: sessionId 和 message'
        })
      }

      // 验证会话归属
      const sessionInfo = aiService.getSessionInfo(sessionId)
      if (!sessionInfo) {
        return res.status(404).json({
          success: false,
          message: '会话不存在或已过期'
        })
      }

      if (sessionInfo.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权限访问该会话'
        })
      }

      const response = await aiService.sendMessage(sessionId, message, { provider })

      res.json({
        success: response.success,
        data: response,
        message: response.success ? '消息发送成功' : '消息发送失败'
      })

    } catch (error) {
      logger.error('发送AI消息失败:', error)
      res.status(500).json({
        success: false,
        message: '消息发送失败',
        error: error.message
      })
    }
  }

  /**
   * 智能问答 - 使用模板
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async smartQuestion(req, res) {
    try {
      const { category, params, provider } = req.body

      if (!category || !params) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: category 和 params'
        })
      }

      const response = await aiService.smartQuestion(category, params, { provider })

      res.json({
        success: response.success,
        data: response,
        message: response.success ? '智能问答完成' : '智能问答失败'
      })

    } catch (error) {
      logger.error('智能问答失败:', error)
      res.status(500).json({
        success: false,
        message: '智能问答失败',
        error: error.message
      })
    }
  }

  /**
   * 获取会话信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getSessionInfo(req, res) {
    try {
      const { sessionId } = req.params

      const sessionInfo = aiService.getSessionInfo(sessionId)
      if (!sessionInfo) {
        return res.status(404).json({
          success: false,
          message: '会话不存在或已过期'
        })
      }

      // 验证会话归属
      if (sessionInfo.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权限访问该会话'
        })
      }

      res.json({
        success: true,
        data: sessionInfo,
        message: '获取会话信息成功'
      })

    } catch (error) {
      logger.error('获取AI会话信息失败:', error)
      res.status(500).json({
        success: false,
        message: '获取会话信息失败',
        error: error.message
      })
    }
  }

  /**
   * 结束会话
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async endSession(req, res) {
    try {
      const { sessionId } = req.params

      const sessionInfo = aiService.getSessionInfo(sessionId)
      if (!sessionInfo) {
        return res.status(404).json({
          success: false,
          message: '会话不存在或已过期'
        })
      }

      // 验证会话归属
      if (sessionInfo.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权限访问该会话'
        })
      }

      const success = aiService.endSession(sessionId)

      res.json({
        success,
        message: success ? '会话结束成功' : '会话结束失败'
      })

    } catch (error) {
      logger.error('结束AI会话失败:', error)
      res.status(500).json({
        success: false,
        message: '会话结束失败',
        error: error.message
      })
    }
  }

  /**
   * 生成对话摘要
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async generateSummary(req, res) {
    try {
      const { sessionId } = req.params

      const sessionInfo = aiService.getSessionInfo(sessionId)
      if (!sessionInfo) {
        return res.status(404).json({
          success: false,
          message: '会话不存在或已过期'
        })
      }

      // 验证会话归属
      if (sessionInfo.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: '无权限访问该会话'
        })
      }

      const summary = await aiService.generateSummary(sessionId)

      res.json({
        success: summary.success,
        data: summary,
        message: summary.success ? '摘要生成成功' : '摘要生成失败'
      })

    } catch (error) {
      logger.error('生成对话摘要失败:', error)
      res.status(500).json({
        success: false,
        message: '生成摘要失败',
        error: error.message
      })
    }
  }

  /**
   * 获取支持的问答类别
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getSupportedCategories(req, res) {
    try {
      const categories = aiService.getSupportedCategories()

      res.json({
        success: true,
        data: categories,
        message: '获取支持类别成功'
      })

    } catch (error) {
      logger.error('获取支持类别失败:', error)
      res.status(500).json({
        success: false,
        message: '获取支持类别失败',
        error: error.message
      })
    }
  }

  /**
   * 获取AI服务统计
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getStats(req, res) {
    try {
      // 检查权限 - 只有管理员可以查看统计
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        })
      }

      const stats = aiService.getStats()

      res.json({
        success: true,
        data: stats,
        message: '获取统计信息成功'
      })

    } catch (error) {
      logger.error('获取AI统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: error.message
      })
    }
  }

  /**
   * 重置统计信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async resetStats(req, res) {
    try {
      // 检查权限 - 只有管理员可以重置统计
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        })
      }

      aiService.resetStats()

      res.json({
        success: true,
        message: '统计信息重置成功'
      })

    } catch (error) {
      logger.error('重置AI统计失败:', error)
      res.status(500).json({
        success: false,
        message: '重置统计信息失败',
        error: error.message
      })
    }
  }

  /**
   * 清理过期会话
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async cleanupSessions(req, res) {
    try {
      // 检查权限 - 只有管理员可以清理会话
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        })
      }

      aiService.cleanupExpiredSessions()

      res.json({
        success: true,
        message: '过期会话清理完成'
      })

    } catch (error) {
      logger.error('清理AI会话失败:', error)
      res.status(500).json({
        success: false,
        message: '清理会话失败',
        error: error.message
      })
    }
  }

  /**
   * 批量智能问答
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async batchSmartQuestion(req, res) {
    try {
      const { questions, provider } = req.body

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供问题列表'
        })
      }

      if (questions.length > 10) {
        return res.status(400).json({
          success: false,
          message: '批量问答最多支持10个问题'
        })
      }

      const results = []

      for (const question of questions) {
        try {
          const response = await aiService.smartQuestion(
            question.category,
            question.params,
            { provider }
          )

          results.push({
            index: question.index || results.length,
            category: question.category,
            params: question.params,
            ...response
          })

        } catch (error) {
          results.push({
            index: question.index || results.length,
            category: question.category,
            params: question.params,
            success: false,
            error: error.message
          })
        }
      }

      res.json({
        success: true,
        data: {
          totalQuestions: questions.length,
          results
        },
        message: '批量智能问答完成'
      })

    } catch (error) {
      logger.error('批量智能问答失败:', error)
      res.status(500).json({
        success: false,
        message: '批量智能问答失败',
        error: error.message
      })
    }
  }

  /**
   * 政策分析
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async analyzePolicy(req, res) {
    try {
      const { policy, provider } = req.body

      if (!policy || policy.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供政策内容'
        })
      }

      const response = await aiService.smartQuestion('policyAnalysis', {
        policy: policy.trim()
      }, { provider })

      res.json({
        success: response.success,
        data: response,
        message: response.success ? '政策分析完成' : '政策分析失败'
      })

    } catch (error) {
      logger.error('政策分析失败:', error)
      res.status(500).json({
        success: false,
        message: '政策分析失败',
        error: error.message
      })
    }
  }

  /**
   * 农业技术咨询
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getAgricultureAdvice(req, res) {
    try {
      const { crop, question, provider } = req.body

      if (!crop || !question) {
        return res.status(400).json({
          success: false,
          message: '请提供作物名称和问题'
        })
      }

      const response = await aiService.smartQuestion('agricultureAdvice', {
        crop: crop.trim(),
        question: question.trim()
      }, { provider })

      res.json({
        success: response.success,
        data: response,
        message: response.success ? '农业建议生成成功' : '农业建议生成失败'
      })

    } catch (error) {
      logger.error('农业技术咨询失败:', error)
      res.status(500).json({
        success: false,
        message: '农业技术咨询失败',
        error: error.message
      })
    }
  }

  /**
   * 金融指导
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getFinancialGuidance(req, res) {
    try {
      const { financeType, question, provider } = req.body

      if (!financeType || !question) {
        return res.status(400).json({
          success: false,
          message: '请提供金融类型和问题'
        })
      }

      const response = await aiService.smartQuestion('financialGuidance', {
        financeType: financeType.trim(),
        question: question.trim()
      }, { provider })

      res.json({
        success: response.success,
        data: response,
        message: response.success ? '金融指导生成成功' : '金融指导生成失败'
      })

    } catch (error) {
      logger.error('金融指导失败:', error)
      res.status(500).json({
        success: false,
        message: '金融指导失败',
        error: error.message
      })
    }
  }
}

module.exports = new AIQuestionAnswerController()