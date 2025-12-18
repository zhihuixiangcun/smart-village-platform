/**
 * AI智能问答服务
 * 集成OpenAI GPT和百度文心一言API，提供智能问答、政策解读、生活指导等服务
 * 支持多轮对话、上下文记忆、专业化回答等功能
 */

const axios = require('axios')
const crypto = require('crypto')
const EventEmitter = require('events')
const logger = require('../config/logger')

class AIQuestionAnswerService extends EventEmitter {
  constructor() {
    super()

    // OpenAI配置
    this.openaiConfig = {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000
    }

    // 百度文心一言配置
    this.wenxinConfig = {
      apiKey: process.env.WENXIN_API_KEY,
      apiSecret: process.env.WENXIN_API_SECRET,
      baseUrl: process.env.WENXIN_BASE_URL || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
      accessToken: '',
      tokenExpiry: 0,
      model: process.env.WENXIN_MODEL || 'completions',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000
    }

    // 默认使用的AI服务
    this.defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'openai'

    // 对话配置
    this.conversationConfig = {
      maxContextLength: 10, // 最大上下文轮数
      maxMessageLength: 4000, // 最大消息长度
      defaultSystemPrompt: '你是一个智慧乡村平台的智能助手，专门为村民和村干部提供咨询服务。请用通俗易懂的语言回答问题，提供实用的建议和信息。',
      contexts: {
        policy: '你是一个政策解读专家，专门解答国家和地方政策，特别是涉农政策、乡村振兴政策等。请准确解读政策内容，提供相关的申请流程和注意事项。',
        agriculture: '你是一个农业技术专家，专门提供农作物种植、病虫害防治、农业技术指导等服务。请根据当地气候和土壤条件给出专业建议。',
        finance: '你是一个农村金融专家，专门解答惠农贷款、补贴申请、财务管理等问题。请提供详细的申请条件和流程。',
        health: '你是一个健康咨询专家，专门提供农村医疗、健康保健、疾病预防等建议。请注意不能替代专业医生诊断。',
        law: '你是一个法律咨询专家，专门解答农村法律问题，如土地承包、婚姻家庭、邻里纠纷等。请提供法律条款和解决建议。'
      }
    }

    // 智能提示词库
    this.promptTemplates = {
      policyAnalysis: `请分析以下政策：{policy}

要求：
1. 政策要点梳理
2. 受益人群分析
3. 申请条件说明
4. 办理流程指导
5. 常见问题解答`,

      agricultureAdvice: `关于{crop}的种植问题：{question}

请提供：
1. 适合的种植时间和地点
2. 栽培技术要点
3. 病虫害防治方法
4. 产量和经济效益分析
5. 相关技术支持资源`,

      financialGuidance: `关于{financeType}的咨询：{question}

请解答：
1. 具体政策内容
2. 申请资格条件
3. 申请材料和流程
4. 审批时间
5. 注意事项和常见问题`
    }

    // 会话管理
    this.sessions = new Map()

    // 缓存和统计
    this.cache = new Map()
    this.stats = {
      totalQuestions: 0,
      successfulAnswers: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      providerUsage: {
        openai: 0,
        wenxin: 0
      },
      categoryUsage: {},
      sessionCount: 0
    }

    // 初始化文心一言access token
    this.initWenxinToken()
  }

  /**
   * 初始化文心一言access token
   */
  async initWenxinToken() {
    try {
      const response = await axios.post(
        `https://aip.baidubce.com/oauth/2.0/token`,
        null,
        {
          params: {
            grant_type: 'client_credentials',
            client_id: this.wenxinConfig.apiKey,
            client_secret: this.wenxinConfig.apiSecret
          }
        }
      )

      this.wenxinConfig.accessToken = response.data.access_token
      this.wenxinConfig.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000

      logger.info('文心一言access token初始化成功')

      // 设置自动刷新
      setTimeout(() => {
        this.initWenxinToken()
      }, (response.data.expires_in - 120) * 1000)

    } catch (error) {
      logger.error('文心一言access token初始化失败:', error)
    }
  }

  /**
   * 创建对话会话
   * @param {string} userId - 用户ID
   * @param {Object} config - 会话配置
   * @returns {string} 会话ID
   */
  createSession(userId, config = {}) {
    const sessionId = crypto.randomBytes(16).toString('hex')

    const session = {
      id: sessionId,
      userId,
      context: config.context || 'general',
      systemPrompt: this.getSystemPrompt(config.context),
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      config: {
        temperature: config.temperature || this.conversationConfig.temperature,
        maxTokens: config.maxTokens || this.conversationConfig.maxTokens,
        provider: config.provider || this.defaultProvider,
        enableContext: config.enableContext !== false,
        ...config
      }
    }

    // 添加系统消息
    session.messages.push({
      role: 'system',
      content: session.systemPrompt
    })

    this.sessions.set(sessionId, session)
    this.stats.sessionCount++

    logger.info(`创建AI对话会话: ${sessionId} (用户: ${userId})`)
    return sessionId
  }

  /**
   * 发送消息到AI
   * @param {string} sessionId - 会话ID
   * @param {string} message - 用户消息
   * @param {Object} options - 选项
   * @returns {Promise<Object>} AI回答
   */
  async sendMessage(sessionId, message, options = {}) {
    try {
      const startTime = Date.now()
      this.stats.totalQuestions++

      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error('会话不存在或已过期')
      }

      // 验证消息长度
      if (message.length > this.conversationConfig.maxMessageLength) {
        throw new Error('消息长度超过限制')
      }

      // 上下文管理
      if (session.config.enableContext) {
        // 限制上下文长度
        const maxMessages = this.conversationConfig.maxContextLength * 2 + 1 // system + user/assistant pairs
        if (session.messages.length > maxMessages) {
          // 保留系统消息和最近的对话
          const systemMessage = session.messages[0]
          const recentMessages = session.messages.slice(-maxMessages + 1)
          session.messages = [systemMessage, ...recentMessages]
        }
      }

      // 添加用户消息
      session.messages.push({
        role: 'user',
        content: message
      })

      // 选择AI提供商
      const provider = options.provider || session.config.provider || this.defaultProvider

      // 生成回答
      const response = provider === 'wenxin'
        ? await this.askWenxin(session.messages, session.config)
        : await this.askOpenAI(session.messages, session.config)

      if (response.success) {
        // 添加助手回答到上下文
        session.messages.push({
          role: 'assistant',
          content: response.answer
        })

        // 更新统计
        const responseTime = Date.now() - startTime
        this.stats.successfulAnswers++
        this.stats.totalTokens += response.tokens || 0
        this.stats.providerUsage[provider]++

        // 更新平均响应时间
        this.stats.averageResponseTime = (
          (this.stats.averageResponseTime * (this.stats.successfulAnswers - 1) + responseTime) /
          this.stats.successfulAnswers
        ).toFixed(2)

        // 更新分类统计
        this.stats.categoryUsage[session.context] = (this.stats.categoryUsage[session.context] || 0) + 1

        // 更新会话活动时间
        session.lastActivity = new Date()

        // 发出事件
        this.emit('message-answered', {
          sessionId,
          userId: session.userId,
          question: message,
          answer: response.answer,
          responseTime,
          provider,
          tokens: response.tokens
        })

        return {
          success: true,
          answer: response.answer,
          sessionId,
          context: session.context,
          responseTime,
          tokens: response.tokens,
          provider
        }
      } else {
        throw new Error(response.error || 'AI服务响应异常')
      }

    } catch (error) {
      logger.error('AI问答失败:', error)
      this.emit('answer-error', {
        sessionId,
        error: error.message
      })

      return {
        success: false,
        error: error.message,
        sessionId
      }
    }
  }

  /**
   * OpenAI API调用
   * @param {Array} messages - 对话消息
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 回答
   */
  async askOpenAI(messages, config) {
    try {
      const response = await axios.post(
        `${this.openaiConfig.baseUrl}/chat/completions`,
        {
          model: config.model || this.openaiConfig.model,
          messages: messages,
          temperature: config.temperature || this.openaiConfig.temperature,
          max_tokens: config.maxTokens || this.openaiConfig.maxTokens,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: config.timeout || this.openaiConfig.timeout
        }
      )

      const data = response.data
      const answer = data.choices[0]?.message?.content || ''
      const tokens = data.usage?.total_tokens || 0

      return {
        success: true,
        answer: answer.trim(),
        tokens,
        usage: data.usage
      }

    } catch (error) {
      logger.error('OpenAI API调用失败:', error)
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      }
    }
  }

  /**
   * 百度文心一言API调用
   * @param {Array} messages - 对话消息
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 回答
   */
  async askWenxin(messages, config) {
    try {
      // 检查token是否有效
      if (Date.now() > this.wenxinConfig.tokenExpiry) {
        await this.initWenxinToken()
      }

      // 转换消息格式
      const wenxinMessages = this.convertMessagesToWenxin(messages)

      const response = await axios.post(
        `${this.wenxinConfig.baseUrl}/${config.model || this.wenxinConfig.model}`,
        {
          messages: wenxinMessages,
          temperature: config.temperature || this.wenxinConfig.temperature,
          top_p: 0.8,
          penalty_score: 1.0,
          max_output_tokens: config.maxTokens || this.wenxinConfig.maxTokens,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            access_token: this.wenxinConfig.accessToken
          },
          timeout: config.timeout || this.wenxinConfig.timeout
        }
      )

      const data = response.data
      if (data.error_code !== 0) {
        throw new Error(data.error_msg || '文心一言API错误')
      }

      const answer = data.result || ''
      const tokens = data.usage?.total_tokens || 0

      return {
        success: true,
        answer: answer.trim(),
        tokens,
        usage: data.usage
      }

    } catch (error) {
      logger.error('文心一言API调用失败:', error)
      return {
        success: false,
        error: error.response?.data?.error_msg || error.message
      }
    }
  }

  /**
   * 转换消息格式为文心一言格式
   * @param {Array} messages - 原始消息
   * @returns {Array} 文心一言格式消息
   */
  convertMessagesToWenxin(messages) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }))
  }

  /**
   * 智能问答 - 使用模板
   * @param {string} category - 问答类别
   * @param {Object} params - 参数
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 回答
   */
  async smartQuestion(category, params, options = {}) {
    try {
      const template = this.promptTemplates[category]
      if (!template) {
        throw new Error(`不支持的问答类别: ${category}`)
      }

      // 构建提示词
      let prompt = template
      Object.keys(params).forEach(key => {
        prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), params[key])
      })

      // 临时会话
      const sessionId = this.createSession('smart_question', {
        context: category,
        enableContext: false,
        provider: options.provider || this.defaultProvider
      })

      // 添加构建好的提示词
      const session = this.sessions.get(sessionId)
      session.messages = [{
        role: 'system',
        content: this.getSystemPrompt(category)
      }, {
        role: 'user',
        content: prompt
      }]

      // 发送消息
      const response = await this.sendMessage(sessionId, prompt, options)

      // 清理会话
      this.sessions.delete(sessionId)

      return response

    } catch (error) {
      logger.error('智能问答失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取系统提示词
   * @param {string} context - 上下文
   * @returns {string} 系统提示词
   */
  getSystemPrompt(context) {
    return this.conversationConfig.contexts[context] || this.conversationConfig.defaultSystemPrompt
  }

  /**
   * 获取会话信息
   * @param {string} sessionId - 会话ID
   * @returns {Object} 会话信息
   */
  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    return {
      id: session.id,
      userId: session.userId,
      context: session.context,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      messageCount: session.messages.length,
      config: session.config
    }
  }

  /**
   * 结束会话
   * @param {string} sessionId - 会话ID
   * @returns {boolean} 是否成功
   */
  endSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    this.sessions.delete(sessionId)
    logger.info(`结束AI对话会话: ${sessionId}`)
    this.emit('session-ended', sessionId)
    return true
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions() {
    const now = new Date()
    const expiredThreshold = 24 * 60 * 60 * 1000 // 24小时

    const expiredSessions = []
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > expiredThreshold) {
        expiredSessions.push(sessionId)
      }
    }

    expiredSessions.forEach(sessionId => {
      this.endSession(sessionId)
    })

    logger.info(`清理了 ${expiredSessions.length} 个过期的AI对话会话`)
  }

  /**
   * 获取使用统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalQuestions > 0
        ? (this.stats.successfulAnswers / this.stats.totalQuestions * 100).toFixed(2) + '%'
        : '0%',
      averageTokensPerAnswer: this.stats.successfulAnswers > 0
        ? Math.round(this.stats.totalTokens / this.stats.successfulAnswers)
        : 0,
      activeSessions: this.sessions.size,
      cacheSize: this.cache.size,
      topCategories: Object.entries(this.stats.categoryUsage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    }
  }

  /**
   * 获取支持的问答类别
   * @returns {Array} 类别列表
   */
  getSupportedCategories() {
    return Object.keys(this.conversationConfig.contexts).map(key => ({
      key,
      name: this.getContextName(key),
      description: this.getContextDescription(key)
    }))
  }

  /**
   * 获取上下文名称
   * @param {string} context - 上下文键
   * @returns {string} 上下文名称
   */
  getContextName(context) {
    const names = {
      general: '通用咨询',
      policy: '政策解读',
      agriculture: '农业技术',
      finance: '金融服务',
      health: '健康咨询',
      law: '法律咨询'
    }
    return names[context] || context
  }

  /**
   * 获取上下文描述
   * @param {string} context - 上下文键
   * @returns {string} 上下文描述
   */
  getContextDescription(context) {
    const descriptions = {
      general: '提供日常生活、办事流程等通用咨询服务',
      policy: '解答国家政策、地方政策、涉农政策等',
      agriculture: '提供农作物种植、病虫害防治等技术指导',
      finance: '解答惠农贷款、补贴申请、财务管理等',
      health: '提供健康保健、疾病预防、医疗咨询等',
      law: '解答土地承包、婚姻家庭、邻里纠纷等法律问题'
    }
    return descriptions[context] || '提供相关领域专业咨询服务'
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalQuestions: 0,
      successfulAnswers: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      providerUsage: {
        openai: 0,
        wenxin: 0
      },
      categoryUsage: {},
      sessionCount: 0
    }
    logger.info('AI问答服务统计已重置')
  }

  /**
   * 生成对话摘要
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 摘要
   */
  async generateSummary(sessionId) {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error('会话不存在')
      }

      // 构建摘要请求
      const messages = [
        { role: 'system', content: '请为以下对话生成一个简洁的摘要，包括主要讨论的问题和关键信息点。' },
        { role: 'user', content: session.messages.map(m => `${m.role}: ${m.content}`).join('\n\n') }
      ]

      // 生成摘要
      const response = await this.askOpenAI(messages, {
        temperature: 0.3,
        maxTokens: 500
      })

      if (response.success) {
        return {
          success: true,
          summary: response.answer,
          sessionId,
          messageCount: session.messages.length,
          duration: Date.now() - session.createdAt
        }
      } else {
        throw new Error(response.error)
      }

    } catch (error) {
      logger.error('生成对话摘要失败:', error)
      return {
        success: false,
        error: error.message,
        sessionId
      }
    }
  }
}

module.exports = AIQuestionAnswerService