/**
 * 前端用户反馈服务
 * 提供反馈提交、查询、处理等功能
 */

import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/userStore'

class UserFeedbackService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
    this.cache = new Map()
    this.uploadProgress = new Map()
  }

  /**
   * 提交反馈
   * @param {Object} feedbackData - 反馈数据
   * @param {Array} files - 附件文件
   * @returns {Promise<Object>} 提交结果
   */
  async submitFeedback(feedbackData, files = []) {
    try {
      const formData = new FormData()

      // 添加文本数据
      Object.keys(feedbackData).forEach(key => {
        if (typeof feedbackData[key] === 'object' && key !== 'context') {
          formData.append(key, JSON.stringify(feedbackData[key]))
        } else {
          formData.append(key, feedbackData[key])
        }
      })

      // 添加文件
      files.forEach((file, index) => {
        formData.append(`attachments`, file)
      })

      // 添加上下文信息
      const context = this.captureContext()
      formData.append('context', JSON.stringify(context))

      const response = await axios.post(
        `${this.baseURL}/api/v1/feedback`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${this.getToken()}`
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            this.updateUploadProgress('submit', progress)
          }
        }
      )

      ElMessage.success('反馈提交成功！我们会尽快处理')
      return response.data

    } catch (error) {
      this.handleError(error, '提交反馈失败')
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
      const params = new URLSearchParams()

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          if (typeof filters[key] === 'object') {
            params.append(key, JSON.stringify(filters[key]))
          } else {
            params.append(key, filters[key])
          }
        }
      })

      const response = await axios.get(
        `${this.baseURL}/api/v1/feedback?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      return response.data

    } catch (error) {
      this.handleError(error, '获取反馈列表失败')
      throw error
    }
  }

  /**
   * 获取反馈详情
   * @param {String} feedbackId - 反馈ID
   * @returns {Promise<Object>} 反馈详情
   */
  async getFeedbackDetail(feedbackId) {
    try {
      // 检查缓存
      const cacheKey = `feedback_detail_${feedbackId}`
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5分钟缓存
          return cached.data
        }
      }

      const response = await axios.get(
        `${this.baseURL}/api/v1/feedback/${feedbackId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      // 缓存结果
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      })

      return response.data

    } catch (error) {
      this.handleError(error, '获取反馈详情失败')
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
      const response = await axios.put(
        `${this.baseURL}/api/v1/feedback/${feedbackId}`,
        processData,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      ElMessage.success('反馈处理成功')

      // 清除相关缓存
      this.clearFeedbackCache(feedbackId)

      return response.data

    } catch (error) {
      this.handleError(error, '处理反馈失败')
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
      const response = await axios.post(
        `${this.baseURL}/api/v1/feedback/${feedbackId}/satisfaction`,
        satisfactionData,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      ElMessage.success('感谢您的评价！')
      return response.data

    } catch (error) {
      this.handleError(error, '添加满意度评价失败')
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
      const params = new URLSearchParams()
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key])
        }
      })

      const response = await axios.get(
        `${this.baseURL}/api/v1/feedback/stats?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      return response.data

    } catch (error) {
      this.handleError(error, '获取反馈统计失败')
      throw error
    }
  }

  /**
   * AI分析反馈趋势
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeFeedbackTrends() {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/feedback/analyze/trends`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      return response.data

    } catch (error) {
      this.handleError(error, 'AI分析反馈趋势失败')
      throw error
    }
  }

  /**
   * 推荐改进方案
   * @param {String} problemArea - 问题领域
   * @returns {Promise<Object>} 改进建议
   */
  async recommendImprovements(problemArea) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/feedback/recommend/improvements`,
        { problemArea },
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      return response.data

    } catch (error) {
      this.handleError(error, '推荐改进方案失败')
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
      // 确认导出操作
      await ElMessageBox.confirm(
        '确定要导出反馈数据吗？这可能需要一些时间。',
        '确认导出',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info'
        }
      )

      const params = new URLSearchParams()
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined) {
          if (typeof options[key] === 'object') {
            params.append(key, JSON.stringify(options[key]))
          } else {
            params.append(key, options[key])
          }
        }
      })

      const response = await axios.get(
        `${this.baseURL}/api/v1/feedback/export?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          },
          responseType: 'blob'
        }
      )

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', options.filename || `feedback_export_${Date.now()}.json`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      ElMessage.success('数据导出成功')

      return { success: true }

    } catch (error) {
      if (error !== 'cancel') {
        this.handleError(error, '导出反馈数据失败')
      }
      throw error
    }
  }

  /**
   * 获取分类统计
   * @returns {Promise<Object>} 分类统计
   */
  async getCategoryStats() {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/feedback/categories/stats`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      return response.data

    } catch (error) {
      this.handleError(error, '获取分类统计失败')
      throw error
    }
  }

  /**
   * 获取用户反馈历史
   * @param {String} userId - 用户ID
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 反馈历史
   */
  async getUserFeedbackHistory(userId, pagination = {}) {
    try {
      const params = new URLSearchParams()
      Object.keys(pagination).forEach(key => {
        if (pagination[key] !== undefined) {
          params.append(key, pagination[key])
        }
      })

      const response = await axios.get(
        `${this.baseURL}/api/v1/feedback/user/${userId}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      return response.data

    } catch (error) {
      this.handleError(error, '获取用户反馈历史失败')
      throw error
    }
  }

  /**
   * 批量处理反馈
   * @param {Array} feedbackIds - 反馈ID列表
   * @param {String} processAction - 处理动作
   * @param {Object} processData - 处理数据
   * @returns {Promise<Object>} 处理结果
   */
  async batchProcessFeedback(feedbackIds, processAction, processData = {}) {
    try {
      // 确认批量操作
      await ElMessageBox.confirm(
        `确定要对 ${feedbackIds.length} 条反馈执行批量操作吗？`,
        '确认批量操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      const response = await axios.post(
        `${this.baseURL}/api/v1/feedback/batch`,
        {
          feedbackIds,
          processAction,
          processData
        },
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`
          }
        }
      )

      ElMessage.success(`批量处理完成，成功处理 ${response.data.data.processed} 条反馈`)

      // 清除相关缓存
      feedbackIds.forEach(id => this.clearFeedbackCache(id))

      return response.data

    } catch (error) {
      if (error !== 'cancel') {
        this.handleError(error, '批量处理反馈失败')
      }
      throw error
    }
  }

  /**
   * 智能反馈分类
   * @param {String} title - 反馈标题
   * @param {String} description - 反馈描述
   * @returns {Object} 分类建议
   */
  suggestCategory(title, description) {
    const text = `${title} ${description}`.toLowerCase()

    // 关键词匹配规则
    const categoryRules = {
      bug_report: [
        '错误', '异常', '崩溃', '失败', '无法', '不能', '问题',
        'bug', 'error', 'crash', 'issue'
      ],
      feature_request: [
        '建议', '希望', '添加', '新增', '功能', '改进',
        'suggest', 'recommend', 'add', 'feature', 'improve'
      ],
      improvement: [
        '优化', '改善', '提升', '体验', '效率', '速度',
        'optimize', 'improve', 'enhance', 'better'
      ],
      complaint: [
        '投诉', '不满', '差', '糟糕', '失望', '愤怒',
        'complaint', 'dissatisfied', 'angry', 'disappointed'
      ],
      compliment: [
        '表扬', '赞', '好', '棒', '优秀', '满意', '喜欢',
        'praise', 'good', 'excellent', 'love', 'great'
      ],
      question: [
        '如何', '怎么', '什么', '为什么', '请问', '咨询',
        'how', 'what', 'why', 'question', 'help'
      ],
      usage_difficulty: [
        '困难', '复杂', '不会', '不懂', '困惑', '难用',
        'difficult', 'confused', 'hard to use', 'complicated'
      ]
    }

    // 计算匹配分数
    const scores = {}
    Object.entries(categoryRules).forEach(([category, keywords]) => {
      scores[category] = keywords.reduce((score, keyword) => {
        return score + (text.includes(keyword) ? 1 : 0)
      }, 0)
    })

    // 找出最高分数的分类
    const maxScore = Math.max(...Object.values(scores))
    if (maxScore === 0) {
      return { category: 'general', confidence: 0 }
    }

    const suggestedCategory = Object.keys(scores).find(key => scores[key] === maxScore)
    const confidence = Math.min(maxScore / 3, 1) // 最多3个关键词匹配

    return {
      category: suggestedCategory,
      confidence,
      alternatives: Object.entries(scores)
        .filter(([_, score]) => score > 0 && score < maxScore)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 2)
        .map(([category, _]) => category)
    }
  }

  /**
   * 生成反馈摘要
   * @param {String} description - 反馈描述
   * @param {Number} maxLength - 最大长度
   * @returns {String} 反馈摘要
   */
  generateSummary(description, maxLength = 100) {
    if (description.length <= maxLength) {
      return description
    }

    // 简单的文本截断，保持句子完整
    const sentences = description.split(/[。！？.!?]/)
    let summary = ''

    for (const sentence of sentences) {
      if (summary.length + sentence.length > maxLength) {
        break
      }
      summary += sentence + '。'
    }

    return summary || description.substring(0, maxLength) + '...'
  }

  /**
   * 验证反馈数据
   * @param {Object} feedbackData - 反馈数据
   * @returns {Object} 验证结果
   */
  validateFeedbackData(feedbackData) {
    const errors = []

    // 必填字段验证
    if (!feedbackData.category) {
      errors.push('请选择反馈分类')
    }
    if (!feedbackData.title) {
      errors.push('请填写反馈标题')
    } else if (feedbackData.title.length > 100) {
      errors.push('标题长度不能超过100个字符')
    }
    if (!feedbackData.description) {
      errors.push('请填写反馈描述')
    } else if (feedbackData.description.length > 2000) {
      errors.push('描述长度不能超过2000个字符')
    }

    // 附件验证
    if (feedbackData.attachments) {
      const totalSize = feedbackData.attachments.reduce((sum, file) => sum + file.size, 0)
      if (totalSize > 50 * 1024 * 1024) { // 50MB
        errors.push('附件总大小不能超过50MB')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ========== 私有方法 ==========

  /**
   * 捕获上下文信息
   * @returns {Object} 上下文信息
   */
  captureContext() {
    return {
      page: window.location.pathname,
      action: this.getCurrentAction(),
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo(),
      browserInfo: this.getBrowserInfo(),
      location: this.getLocationInfo(),
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    }
  }

  /**
   * 获取当前操作
   * @returns {String} 当前操作
   */
  getCurrentAction() {
    const path = window.location.pathname

    if (path.includes('/feedback')) return 'feedback_submission'
    if (path.includes('/profile')) return 'profile_management'
    if (path.includes('/village')) return 'village_services'
    if (path.includes('/announcement')) return 'announcement_view'

    return 'unknown'
  }

  /**
   * 获取设备信息
   * @returns {Object} 设备信息
   */
  getDeviceInfo() {
    return {
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    }
  }

  /**
   * 获取浏览器信息
   * @returns {Object} 浏览器信息
   */
  getBrowserInfo() {
    const ua = navigator.userAgent
    let browserName = 'Unknown'
    let browserVersion = ''

    if (ua.includes('Firefox')) {
      browserName = 'Firefox'
      browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || ''
    } else if (ua.includes('Chrome')) {
      browserName = 'Chrome'
      browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || ''
    } else if (ua.includes('Safari')) {
      browserName = 'Safari'
      browserVersion = ua.match(/Version\/(\d+)/)?.[1] || ''
    } else if (ua.includes('Edge')) {
      browserName = 'Edge'
      browserVersion = ua.match(/Edge\/(\d+)/)?.[1] || ''
    }

    return {
      name: browserName,
      version: browserVersion,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    }
  }

  /**
   * 获取位置信息
   * @returns {Promise<Object|null>} 位置信息
   */
  async getLocationInfo() {
    try {
      if (!navigator.geolocation) {
        return null
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        })
      })

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }
    } catch (error) {
      return null
    }
  }

  /**
   * 获取会话ID
   * @returns {String} 会话ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('feedback_session_id')
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('feedback_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * 获取token
   * @returns {String} JWT token
   */
  getToken() {
    return localStorage.getItem('token') || ''
  }

  /**
   * 更新上传进度
   * @param {String} type - 上传类型
   * @param {Number} progress - 进度百分比
   */
  updateUploadProgress(type, progress) {
    this.uploadProgress.set(type, progress)

    // 触发进度更新事件
    if (this.onProgressUpdate) {
      this.onProgressUpdate(type, progress)
    }
  }

  /**
   * 获取上传进度
   * @param {String} type - 上传类型
   * @returns {Number} 进度百分比
   */
  getUploadProgress(type) {
    return this.uploadProgress.get(type) || 0
  }

  /**
   * 清除反馈缓存
   * @param {String} feedbackId - 反馈ID
   */
  clearFeedbackCache(feedbackId) {
    const cacheKey = `feedback_detail_${feedbackId}`
    this.cache.delete(cacheKey)
  }

  /**
   * 清除所有缓存
   */
  clearAllCache() {
    this.cache.clear()
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {String} defaultMessage - 默认错误消息
   */
  handleError(error, defaultMessage) {
    let message = defaultMessage

    if (error.response) {
      const { data, status } = error.response
      message = data?.message || defaultMessage

      if (status === 401) {
        // 清除认证信息并跳转到登录页
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else if (status === 403) {
        message = '权限不足'
      } else if (status === 413) {
        message = '上传文件过大'
      }
    } else if (error.request) {
      message = '网络连接失败，请检查网络设置'
    } else {
      message = error.message || defaultMessage
    }

    ElMessage.error(message)
  }

  /**
   * 设置进度更新回调
   * @param {Function} callback - 回调函数
   */
  setProgressCallback(callback) {
    this.onProgressUpdate = callback
  }
}

export default new UserFeedbackService()