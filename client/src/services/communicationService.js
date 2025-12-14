/**
 * 云通信服务API接口
 */

import axios from 'axios'

const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || '/api/v1'

class CommunicationService {
  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/cloudCommunication`,
      timeout: 30000
    })

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response.data
      },
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
        return Promise.reject(error.response?.data || error)
      }
    )
  }

  /**
   * 发送短信
   */
  async sendSMS(config) {
    try {
      return await this.client.post('/sms/send', config)
    } catch (error) {
      throw new Error(`短信发送失败: ${error.message}`)
    }
  }

  /**
   * 发送语音通知
   */
  async sendVoice(config) {
    try {
      return await this.client.post('/voice/send', config)
    } catch (error) {
      throw new Error(`语音通知发送失败: ${error.message}`)
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(config) {
    try {
      return await this.client.post('/email/send', config)
    } catch (error) {
      throw new Error(`邮件发送失败: ${error.message}`)
    }
  }

  /**
   * 发送推送通知
   */
  async sendPush(config) {
    try {
      return await this.client.post('/push/send', config)
    } catch (error) {
      throw new Error(`推送通知发送失败: ${error.message}`)
    }
  }

  /**
   * 统一发送消息接口
   */
  async sendMessage(config) {
    try {
      return await this.client.post('/send', config)
    } catch (error) {
      throw new Error(`消息发送失败: ${error.message}`)
    }
  }

  /**
   * 批量发送消息
   */
  async sendBatchMessages(messages) {
    try {
      return await this.client.post('/batch/send', { messages })
    } catch (error) {
      throw new Error(`批量消息发送失败: ${error.message}`)
    }
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(phone, type = 'sms') {
    try {
      return await this.client.post('/verification-code/send', { phone, type })
    } catch (error) {
      throw new Error(`验证码发送失败: ${error.message}`)
    }
  }

  /**
   * 验证验证码
   */
  async verifyCode(phone, code) {
    try {
      return await this.client.post('/verification-code/verify', { phone, code })
    } catch (error) {
      throw new Error(`验证码验证失败: ${error.message}`)
    }
  }

  /**
   * 发送应急广播
   */
  async sendEmergencyBroadcast(villageId, message, channels) {
    try {
      return await this.client.post('/emergency/broadcast', {
        villageId,
        message,
        channels
      })
    } catch (error) {
      throw new Error(`应急广播发送失败: ${error.message}`)
    }
  }

  /**
   * 发送村务通知
   */
  async sendVillageNotification(config) {
    try {
      return await this.client.post('/village/notification', config)
    } catch (error) {
      throw new Error(`村务通知发送失败: ${error.message}`)
    }
  }

  /**
   * 发送生日祝福
   */
  async sendBirthdayGreetings(auto = false) {
    try {
      const params = auto ? '?auto=true' : ''
      return await this.client.post(`/birthday/greetings${params}`)
    } catch (error) {
      throw new Error(`生日祝福发送失败: ${error.message}`)
    }
  }

  /**
   * 发送节日祝福
   */
  async sendHolidayGreetings(config) {
    try {
      return await this.client.post('/holiday/greetings', config)
    } catch (error) {
      throw new Error(`节日祝福发送失败: ${error.message}`)
    }
  }

  /**
   * 获取消息历史
   */
  async getMessageHistory(params = {}) {
    try {
      return await this.client.get('/history', { params })
    } catch (error) {
      throw new Error(`获取消息历史失败: ${error.message}`)
    }
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus() {
    try {
      return await this.client.get('/service/status')
    } catch (error) {
      throw new Error(`获取服务状态失败: ${error.message}`)
    }
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    try {
      return await this.client.delete('/cache/clear')
    } catch (error) {
      throw new Error(`清理缓存失败: ${error.message}`)
    }
  }

  /**
   * 智能短信发送 - 支持模板选择和参数验证
   */
  async smartSMSSend(config) {
    const {
      recipients,
      templateType = 'notification',
      templateId,
      customContent,
      params = {},
      priority = 1,
      scheduleTime = null
    } = config

    // 验证接收者
    if (!recipients || recipients.length === 0) {
      throw new Error('接收者不能为空')
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    const invalidPhones = recipients.filter(phone => !phoneRegex.test(phone))
    if (invalidPhones.length > 0) {
      throw new Error(`以下手机号格式不正确: ${invalidPhones.join(', ')}`)
    }

    // 构建发送配置
    const sendConfig = {
      type: 'sms',
      provider: 'aliyun', // 默认使用阿里云
      recipients,
      options: {
        priority,
        scheduleTime
      }
    }

    if (templateType === 'custom' && customContent) {
      sendConfig.content = { text: customContent }
    } else {
      sendConfig.template = {
        code: templateId,
        params
      }
    }

    return await this.sendMessage(sendConfig)
  }

  /**
   * 批量发送个性化消息
   */
  async sendPersonalizedMessages(messages) {
    try {
      const results = {
        total: messages.length,
        success: 0,
        failed: 0,
        details: []
      }

      // 分批处理，避免并发过多
      const batchSize = 10
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize)

        const batchPromises = batch.map(async (messageConfig) => {
          try {
            const result = await this.sendMessage(messageConfig)
            results.success++
            results.details.push({
              config: messageConfig,
              success: true,
              result
            })
            return { success: true, result }
          } catch (error) {
            results.failed++
            results.details.push({
              config: messageConfig,
              success: false,
              error: error.message
            })
            return { success: false, error: error.message }
          }
        })

        await Promise.all(batchPromises)
      }

      return {
        success: true,
        data: results
      }
    } catch (error) {
      throw new Error(`批量个性化消息发送失败: ${error.message}`)
    }
  }

  /**
   * 定时消息发送
   */
  async scheduleMessage(config, scheduleTime) {
    try {
      const scheduledConfig = {
        ...config,
        scheduleTime: scheduleTime.toISOString(),
        isScheduled: true
      }

      return await this.sendMessage(scheduledConfig)
    } catch (error) {
      throw new Error(`定时消息设置失败: ${error.message}`)
    }
  }

  /**
   * 获取消息发送统计
   */
  async getMessageStatistics(filters = {}) {
    try {
      const params = {
        ...filters,
        statistics: true
      }

      const historyResult = await this.getMessageHistory(params)

      // 计算统计数据
      const statistics = {
        total: historyResult.data.pagination.total,
        success: 0,
        failed: 0,
        pending: 0,
        byType: {},
        byProvider: {},
        successRate: 0
      }

      historyResult.data.messages.forEach(message => {
        // 按状态统计
        statistics[message.status] = (statistics[message.status] || 0) + 1

        // 按类型统计
        if (!statistics.byType[message.type]) {
          statistics.byType[message.type] = { total: 0, success: 0, failed: 0 }
        }
        statistics.byType[message.type].total++
        statistics.byType[message.type][message.status]++

        // 按提供商统计
        if (!statistics.byProvider[message.provider]) {
          statistics.byProvider[message.provider] = { total: 0, success: 0, failed: 0 }
        }
        statistics.byProvider[message.provider].total++
        statistics.byProvider[message.provider][message.status]++
      })

      // 计算成功率
      if (statistics.total > 0) {
        statistics.successRate = ((statistics.success / statistics.total) * 100).toFixed(2)
      }

      return {
        success: true,
        data: statistics
      }
    } catch (error) {
      throw new Error(`获取消息统计失败: ${error.message}`)
    }
  }

  /**
   * 获取消息模板列表
   */
  async getMessageTemplates(type = 'sms') {
    try {
      // 这里调用获取模板列表的API
      // 实际项目中需要根据具体平台实现
      const templates = {
        sms: [
          { id: 'SMS_VERIFICATION', name: '验证码模板', description: '用于发送验证码' },
          { id: 'SMS_NOTIFICATION', name: '通知模板', description: '用于发送各类通知' },
          { id: 'SMS_BIRTHDAY', name: '生日祝福', description: '生日祝福消息' },
          { id: 'SMS_HOLIDAY', name: '节日祝福', description: '节日祝福消息' }
        ],
        voice: [
          { id: 'VOICE_EMERGENCY', name: '紧急通知', description: '紧急情况语音通知' },
          { id: 'VOICE_REMINDER', name: '提醒通知', description: '事项提醒语音' }
        ]
      }

      return {
        success: true,
        data: templates[type] || []
      }
    } catch (error) {
      throw new Error(`获取消息模板失败: ${error.message}`)
    }
  }

  /**
   * 验证消息内容
   */
  validateMessageContent(content, type = 'sms') {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    }

    switch (type) {
      case 'sms':
        // 短信长度验证
        if (content.length > 500) {
          validation.valid = false
          validation.errors.push('短信内容不能超过500个字符')
        }

        // 敏感词检查
        const sensitiveWords = ['诈骗', '赌博', '色情']
        const foundSensitiveWords = sensitiveWords.filter(word => content.includes(word))
        if (foundSensitiveWords.length > 0) {
          validation.warnings.push(`内容包含敏感词: ${foundSensitiveWords.join(', ')}`)
        }
        break

      case 'email':
        // 邮件主题验证
        if (!content.subject || content.subject.length > 200) {
          validation.valid = false
          validation.errors.push('邮件主题不能为空且不能超过200个字符')
        }

        // 邮件内容验证
        if (!content.body) {
          validation.valid = false
          validation.errors.push('邮件内容不能为空')
        }
        break

      case 'push':
        // 推送标题验证
        if (!content.title || content.title.length > 50) {
          validation.valid = false
          validation.errors.push('推送标题不能为空且不能超过50个字符')
        }

        // 推送内容验证
        if (!content.alert || content.alert.length > 200) {
          validation.valid = false
          validation.errors.push('推送内容不能为空且不能超过200个字符')
        }
        break
    }

    return validation
  }

  /**
   * 消息重发
   */
  async resendMessage(messageId, options = {}) {
    try {
      // 首先获取原消息信息
      const history = await this.getMessageHistory({ messageId })
      if (history.data.messages.length === 0) {
        throw new Error('原消息不存在')
      }

      const originalMessage = history.data.messages[0]

      // 构建重发配置
      const resendConfig = {
        type: originalMessage.type,
        provider: originalMessage.provider,
        recipients: originalMessage.recipients,
        content: originalMessage.content,
        template: originalMessage.template,
        options: {
          ...options,
          isResend: true,
          originalMessageId: messageId
        }
      }

      return await this.sendMessage(resendConfig)
    } catch (error) {
      throw new Error(`消息重发失败: ${error.message}`)
    }
  }

  /**
   * 消息预览
   */
  async previewMessage(config) {
    try {
      const validation = this.validateMessageContent(config.content, config.type)

      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        }
      }

      // 生成预览数据
      const preview = {
        type: config.type,
        recipients: config.recipients,
        content: config.content,
        estimatedCost: this.calculateCost(config),
        estimatedTime: this.estimateDeliveryTime(config),
        warnings: validation.warnings
      }

      return {
        success: true,
        data: preview
      }
    } catch (error) {
      throw new Error(`消息预览失败: ${error.message}`)
    }
  }

  /**
   * 计算消息成本
   */
  calculateCost(config) {
    const rates = {
      sms: 0.045, // 每条短信费用（元）
      voice: 0.15, // 每分钟语音费用（元）
      email: 0.01, // 每封邮件费用（元）
      push: 0.001 // 每条推送费用（元）
    }

    const recipientCount = Array.isArray(config.recipients)
      ? config.recipients.length
      : 1

    const rate = rates[config.type] || 0
    return (recipientCount * rate).toFixed(4)
  }

  /**
   * 估算送达时间
   */
  estimateDeliveryTime(config) {
    const baseTime = {
      sms: 1, // 1分钟内
      voice: 2, // 2分钟内
      email: 5, // 5分钟内
      push: 0.5 // 30秒内
    }

    const recipientCount = Array.isArray(config.recipients)
      ? config.recipients.length
      : 1

    // 接收者越多，时间越长
    const time = baseTime[config.type] || 1
    const estimatedTime = time + Math.log(recipientCount) * 0.5

    return Math.ceil(estimatedTime)
  }
}

// 创建单例实例
const communicationService = new CommunicationService()

export default communicationService