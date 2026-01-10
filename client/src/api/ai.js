/**
 * AI智能助手API
 * @module api/ai
 */
import request from '@/utils/request';

const aiApi = {
  /**
   * AI对话接口
   * @param {Object} chatData - 对话数据
   * @param {string} chatData.message - 用户消息
   * @param {string} chatData.sessionId - 会话ID (可选)
   * @param {string} chatData.type - 消息类型
   * @returns {Promise} AI回复
   */
  chat(chatData) {
    return request.post('/api/v1/ai/chat', chatData);
  },

  /**
   * 语音问答接口
   * @param {FormData} audioData - 音频数据
   * @returns {Promise} AI回复
   */
  voiceChat(audioData) {
    return request.post('/api/v1/ai/voice', audioData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * 政策计算器
   * @param {Object} policyData - 政策计算数据
   * @returns {Promise} 计算结果
   */
  calculatePolicy(policyData) {
    return request.post('/api/v1/ai/policy/calculate', policyData);
  },

  /**
   * AI填表助手
   * @param {Object} formData - 表单数据
   * @returns {Promise} 填表结果
   */
  fillForm(formData) {
    return request.post('/api/v1/ai/form/fill', formData);
  },

  /**
   * 获取对话历史
   * @param {Object} params - 查询参数
   * @returns {Promise} 对话历史
   */
  getHistory(params = {}) {
    return request.get('/api/v1/ai/history', { params });
  },

  /**
   * 农业知识搜索
   * @param {Object} params - 搜索参数
   * @param {string} params.query - 搜索关键词
   * @returns {Promise} 搜索结果
   */
  searchAgriculture(params = {}) {
    return request.get('/api/v1/ai/search/agriculture', { params });
  },

  /**
   * 获取热门问答
   * @returns {Promise} 热门问答列表
   */
  getPopularQA() {
    return request.get('/api/v1/ai/popular');
  },

  /**
   * 提交反馈
   * @param {Object} feedbackData - 反馈数据
   * @returns {Promise} 反馈结果
   */
  submitFeedback(feedbackData) {
    return request.post('/api/v1/ai/feedback', feedbackData);
  },

  /**
   * 获取支持的方言列表
   * @returns {Promise} 方言列表
   */
  getDialects() {
    return request.get('/api/v1/ai/dialects');
  },

  /**
   * AI健康检查
   * @returns {Promise} 健康状态
   */
  health() {
    return request.get('/api/v1/ai/health');
  },

  /**
   * 获取AI统计信息
   * @returns {Promise} 统计信息
   */
  getStats() {
    return request.get('/api/v1/ai/stats');
  },

  // 便捷方法
  /**
   * 发送消息给AI
   * @param {string} message - 消息内容
   * @param {Object} options - 选项
   * @param {string} options.sessionId - 会话ID
   * @param {string} options.type - 消息类型
   * @returns {Promise} AI回复
   */
  sendMessage(message, options = {}) {
    return this.chat({
      message,
      sessionId: options.sessionId,
      type: options.type || 'text'
    });
  },

  /**
   * 获取智能问题建议
   * @param {string} category - 问题类别 (agriculture, policy, finance, emergency)
   * @returns {Promise} 问题建议
   */
  getSmartQuestions(category = 'general') {
    const questions = {
      agriculture: [
        '如何防治水稻病虫害？',
        '今年的种植政策有哪些变化？',
        '施肥的最佳时间是什么时候？',
        '农产品市场价格如何？'
      ],
      policy: [
        '最新的农村土地政策是什么？',
        '如何申请农业补贴？',
        '农村医保政策有哪些？',
        '宅基地政策最新规定？'
      ],
      finance: [
        '如何申请农村小额贷款？',
        '农业保险如何理赔？',
        '农村信用社贷款利率？',
        '如何理财更安全？'
      ],
      emergency: [
        '遇到自然灾害怎么办？',
        '如何申请救灾补助？',
        '紧急联系电话有哪些？',
        '防汛应急措施是什么？'
      ],
      general: [
        '今天天气怎么样？',
        '附近有哪些便民服务？',
        '如何办理身份证？',
        '村委会有哪些服务？'
      ]
    };

    return Promise.resolve({
      success: true,
      data: questions[category] || questions.general
    });
  },

  /**
   * 模拟会话管理 (基于对话历史)
   * @param {Object} sessionData - 会话数据
   * @returns {Promise} 会话ID
   */
  createSession(sessionData) {
    // 生成临时会话ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return Promise.resolve({
      success: true,
      data: {
        id: sessionId,
        ...sessionData,
        createdAt: new Date().toISOString()
      }
    });
  },

  /**
   * 获取会话列表 (基于对话历史)
   * @param {Object} params - 查询参数
   * @returns {Promise} 会话列表
   */
  getSessions(params = {}) {
    // 返回空列表，实际应用中可以从本地存储或服务器获取
    return Promise.resolve({
      success: true,
      data: {
        sessions: [],
        total: 0
      }
    });
  },

  /**
   * 获取会话详情
   * @param {string} sessionId - 会话ID
   * @returns {Promise} 会话详情
   */
  getSession(sessionId) {
    return Promise.resolve({
      success: true,
      data: {
        id: sessionId,
        messages: []
      }
    });
  },

  /**
   * 更新会话
   * @param {string} sessionId - 会话ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise} 更新结果
   */
  updateSession(sessionId, updateData) {
    return Promise.resolve({
      success: true,
      data: {
        id: sessionId,
        ...updateData,
        updatedAt: new Date().toISOString()
      }
    });
  },

  /**
   * 删除会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise} 删除结果
   */
  deleteSession(sessionId) {
    return Promise.resolve({
      success: true,
      message: '会话已删除'
    });
  }
};

export default aiApi;