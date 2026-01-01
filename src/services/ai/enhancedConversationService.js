/**
 * Smart Village Platform - Enhanced Conversation Service
 * 智慧乡村综合服务平台 - 增强型对话服务
 *
 * Features:
 * - Multi-turn conversation management
 * - Context memory and user preferences
 * - Emotion analysis
 * - Intelligent response generation
 */

const EventEmitter = require('events');

/**
 * Conversation Manager - Manages multi-turn conversations
 */
class ConversationManager {
  constructor() {
    this.conversations = new Map(); // sessionId -> conversation
    this.contextWindow = 10; // Keep last 10 turns
  }

  /**
   * Add message to conversation context
   */
  addContext(sessionId, message) {
    const conversation = this.conversations.get(sessionId) || [];
    conversation.push({
      role: message.role, // 'user' or 'assistant'
      content: message.content,
      timestamp: Date.now(),
      metadata: message.metadata || {}
    });

    // Maintain context window size
    if (conversation.length > this.contextWindow) {
      conversation.shift();
    }

    this.conversations.set(sessionId, conversation);
  }

  /**
   * Get conversation context
   */
  getContext(sessionId) {
    return this.conversations.get(sessionId) || [];
  }

  /**
   * Clear expired sessions
   */
  clearExpired(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    let cleared = 0;

    for (const [sessionId, conversation] of this.conversations) {
      if (conversation.length === 0) continue;

      const lastMessage = conversation[conversation.length - 1];
      if (lastMessage && (now - lastMessage.timestamp) > maxAge) {
        this.conversations.delete(sessionId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear specific session
   */
  clearSession(sessionId) {
    this.conversations.delete(sessionId);
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    return {
      totalSessions: this.conversations.size,
      totalMessages: Array.from(this.conversations.values())
        .reduce((sum, conv) => sum + conv.length, 0)
    };
  }
}

/**
 * Context Memory - Stores user preferences and conversation history
 */
class ContextMemory {
  constructor() {
    this.userPreferences = new Map(); // userId -> preferences
    this.conversationHistory = new Map(); // userId -> history
  }

  /**
   * Save user preference
   */
  savePreference(userId, key, value) {
    const prefs = this.userPreferences.get(userId) || {};
    prefs[key] = value;
    this.userPreferences.set(userId, prefs);
  }

  /**
   * Get user preference
   */
  getPreference(userId, key) {
    const prefs = this.userPreferences.get(userId);
    return prefs ? prefs[key] : null;
  }

  /**
   * Get all user preferences
   */
  getAllPreferences(userId) {
    return this.userPreferences.get(userId) || {};
  }

  /**
   * Record conversation history
   */
  recordHistory(userId, query, response) {
    const history = this.conversationHistory.get(userId) || [];
    history.push({
      query,
      response,
      timestamp: Date.now()
    });

    // Keep last 100 conversations
    if (history.length > 100) {
      history.shift();
    }

    this.conversationHistory.set(userId, history);
  }

  /**
   * Get conversation history
   */
  getHistory(userId, limit = 10) {
    const history = this.conversationHistory.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * Clear user data
   */
  clearUserData(userId) {
    this.userPreferences.delete(userId);
    this.conversationHistory.delete(userId);
  }
}

/**
 * Emotion Analyzer - Analyzes user emotions from text
 */
class EmotionAnalyzer {
  constructor() {
    this.emotionKeywords = {
      positive: ['满意', '高兴', '谢谢', '好的', '可以', '不错', '很棒', '太好了', '成功', '完成了'],
      negative: ['不满', '生气', '糟糕', '不行', '错误', '失败', '失望', '难过', '问题', '麻烦'],
      urgent: ['紧急', '马上', '立即', '急', '快点', '现在就要', '急需'],
      confused: ['不明白', '什么', '怎么', '为什么', '如何', '不懂', '不清楚', '不确定'],
      greeting: ['你好', '您好', '早上好', '晚上好', '在吗', 'hello', 'hi']
    };

    this.intensityMap = {
      high: ['非常', '特别', '超级', '很', '十分'],
      low: ['有点', '稍微', '些许']
    };
  }

  /**
   * Analyze emotion from text
   */
  analyze(text) {
    const scores = {
      positive: 0,
      negative: 0,
      urgent: 0,
      confused: 0,
      greeting: 0
    };

    let intensity = 1.0;

    // Check intensity modifiers
    for (const [level, keywords] of Object.entries(this.intensityMap)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          intensity = level === 'high' ? 1.5 : 0.7;
          break;
        }
      }
    }

    // Count emotion keywords
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          scores[emotion] += intensity;
        }
      }
    }

    // Find dominant emotion
    let dominant = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = emotion;
      }
    }

    return {
      emotion: dominant,
      confidence: maxScore > 0 ? Math.min(maxScore / 10, 1) : 0,
      scores,
      keywords: this.extractEmotionKeywords(text)
    };
  }

  /**
   * Extract emotion keywords from text
   */
  extractEmotionKeywords(text) {
    const found = [];

    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          found.push({ keyword, emotion });
        }
      }
    }

    return found;
  }

  /**
   * Get response tone based on emotion
   */
  getResponseTone(emotion) {
    const tones = {
      positive: 'friendly',    // 友好、热情
      negative: 'empathetic',   // 同理、安慰
      urgent: 'efficient',     // 高效、直接
      confused: 'patient',     // 耐心、详细
      greeting: 'welcoming',   // 欢迎、热情
      neutral: 'professional'  // 专业、礼貌
    };

    return tones[emotion] || tones.neutral;
  }
}

/**
 * LLM Client - Integration with AI providers
 */
class LLMClient {
  constructor() {
    this.providers = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
      },
      baidu: {
        apiKey: process.env.BAIDU_API_KEY,
        secretKey: process.env.BAIDU_SECRET_KEY,
        model: 'ernie-bot-turbo'
      }
    };

    this.defaultProvider = 'openai';
  }

  /**
   * Call LLM API
   */
  async call(provider, messages, options = {}) {
    const config = this.providers[provider] || this.providers[this.defaultProvider];

    try {
      if (provider === 'openai') {
        return await this.callOpenAI(messages, config, options);
      } else if (provider === 'baidu') {
        return await this.callBaidu(messages, config, options);
      }

      throw new Error(`Unknown provider: ${provider}`);
    } catch (error) {
      logger.error(`[LLMClient] ${provider} error:`, error.message);
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(messages, config, options) {
    const fetch = require('node-fetch');

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      model: data.model
    };
  }

  /**
   * Call Baidu API
   */
  async callBaidu(messages, config, options) {
    const fetch = require('node-fetch');
    const crypto = require('crypto');
    const logger = require('../../utils/logger');

    // Get access token
    const tokenResponse = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.BAIDU_API_KEY,
        client_secret: process.env.BAIDU_SECRET_KEY
      })
    });

    const tokenData = await tokenResponse.json();

    const response = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${config.model}?access_token=${tokenData.access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.8,
          penalty_score: 1.0
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Baidu API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.result,
      usage: data.usage,
      model: config.model
    };
  }
}

/**
 * Intelligent Responder - Generates contextual responses
 */
class IntelligentResponder extends EventEmitter {
  constructor(conversationManager, contextMemory, emotionAnalyzer) {
    super();
    this.conversationManager = conversationManager;
    this.contextMemory = contextMemory;
    this.emotionAnalyzer = emotionAnalyzer;
    this.llmClient = new LLMClient();
  }

  /**
   * Generate intelligent response
   */
  async generateResponse(userId, message, sessionId, options = {}) {
    try {
      // Analyze emotion
      const emotion = this.emotionAnalyzer.analyze(message);

      // Get conversation context
      const context = this.conversationManager.getContext(sessionId);

      // Get user preferences
      const preferences = this.contextMemory.getAllPreferences(userId);

      // Get response tone
      const tone = this.emotionAnalyzer.getResponseTone(emotion.emotion);

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(tone, preferences);

      // Build messages for LLM
      const messages = this.buildMessages(message, context, systemPrompt);

      // Call LLM
      const llmResponse = await this.llmClient.call(
        options.provider || 'openai',
        messages,
        {
          temperature: 0.7,
          maxTokens: 500
        }
      );

      const response = {
        content: llmResponse.content,
        emotion,
        tone,
        suggestions: this.generateSuggestions(message, emotion.emotion)
      };

      // Save conversation
      this.conversationManager.addContext(sessionId, {
        role: 'user',
        content: message
      });
      this.conversationManager.addContext(sessionId, {
        role: 'assistant',
        content: response.content
      });

      // Record history
      this.contextMemory.recordHistory(userId, message, response.content);

      // Emit event
      this.emit('response', {
        userId,
        sessionId,
        message,
        response
      });

      return response;
    } catch (error) {
      logger.error('[IntelligentResponder] Error:', error);
      return this.getFallbackResponse(message, error);
    }
  }

  /**
   * Build system prompt based on tone and preferences
   */
  buildSystemPrompt(tone, preferences) {
    const basePrompt = `你是智慧乡村平台的智能助手，专门帮助村民解决各种问题。

【角色定位】
- 语气：${this.getToneDescription(tone)}
- 使用简单易懂的语言，避免专业术语
- 对老年人要有更多耐心和重复说明

【功能范围】
- 村务咨询（办事流程、政策解读）
- 生活服务（证件办理、补贴申请）
- 农业技术（种植、养殖、病虫害）
- 应急求助（紧急情况处理）

【回复原则】
1. 保持简洁明了，一般不超过200字
2. 对重要信息可以适当重复
3. 必要时提供操作步骤说明
4. 遇到不确定的问题，建议联系村委会
`;

    // Add user-specific preferences
    let customizedPrompt = basePrompt;

    if (preferences.language) {
      customizedPrompt += `\n\n【语言偏好】\n用户偏好使用：${preferences.language}`;
    }

    if (preferences.village) {
      customizedPrompt += `\n\n【所属村庄】\n用户来自：${preferences.village}`;
    }

    return customizedPrompt;
  }

  /**
   * Get tone description
   */
  getToneDescription(tone) {
    const descriptions = {
      friendly: '亲切友好，热情周到',
      empathetic: '感同身受，温柔体贴',
      efficient: '快速高效，直奔主题',
      patient: '耐心细致，不厌其烦',
      welcoming: '热情欢迎，主动询问',
      professional: '专业礼貌，周到细致'
    };

    return descriptions[tone] || descriptions.professional;
  }

  /**
   * Build messages array for LLM
   */
  buildMessages(userMessage, context, systemPrompt) {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation context (last 5 turns)
    const recentContext = context.slice(-10);
    for (const msg of recentContext) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * Generate follow-up suggestions
   */
  generateSuggestions(message, emotion) {
    const suggestions = [];

    // Based on emotion
    if (emotion.emotion === 'greeting') {
      suggestions.push('我想办理证件', '查询补贴政策', '农业技术咨询');
    } else if (emotion.emotion === 'confused') {
      suggestions.push('详细说明', '操作步骤', '联系人工客服');
    } else if (emotion.emotion === 'urgent') {
      suggestions.push('立即联系', '紧急求助电话', '前往村委会');
    }

    // Based on content keywords
    if (message.includes('证件') || message.includes('证明')) {
      suggestions.push('身份证办理', '居住证明', '户口本');
    } else if (message.includes('补贴') || message.includes('补助')) {
      suggestions.push('农业补贴', '低保申请', '养老金');
    } else if (message.includes('种植') || message.includes('养殖')) {
      suggestions.push('病虫害防治', '施肥技术', '销售渠道');
    }

    return suggestions.slice(0, 3); // Return top 3
  }

  /**
   * Get fallback response when LLM fails
   */
  getFallbackResponse(message, error) {
    return {
      content: `抱歉，我暂时无法处理您的问题。请稍后再试，或直接联系村委会获取帮助。

错误信息：${error.message}`,
      emotion: { emotion: 'neutral' },
      tone: 'professional',
      suggestions: ['联系村委会', '稍后重试', '查看常见问题']
    };
  }
}

/**
 * Enhanced Conversation Service - Main service class
 */
class EnhancedConversationService extends EventEmitter {
  constructor() {
    super();
    this.conversationManager = new ConversationManager();
    this.contextMemory = new ContextMemory();
    this.emotionAnalyzer = new EmotionAnalyzer();
    this.intelligentResponder = new IntelligentResponder(
      this.conversationManager,
      this.contextMemory,
      this.emotionAnalyzer
    );

    // Clean up expired sessions every hour
    setInterval(() => {
      const cleared = this.conversationManager.clearExpired();
      if (cleared > 0) {
        logger.debug(`[ConversationService] Cleared ${cleared} expired sessions`);
      }
    }, 3600000); // 1 hour
  }

  /**
   * Send message and get response
   */
  async sendMessage(userId, message, sessionId, options = {}) {
    try {
      const response = await this.intelligentResponder.generateResponse(
        userId,
        message,
        sessionId,
        options
      );

      return {
        success: true,
        data: response
      };
    } catch (error) {
      logger.error('[ConversationService] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get conversation history
   */
  async getHistory(userId, sessionId, limit = 10) {
    try {
      const context = this.conversationManager.getContext(sessionId);
      const history = this.contextMemory.getHistory(userId, limit);

      return {
        success: true,
        data: {
          context,
          history
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear session
   */
  async clearSession(sessionId) {
    try {
      this.conversationManager.clearSession(sessionId);
      return {
        success: true,
        message: '对话已清除'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save user preference
   */
  async savePreference(userId, key, value) {
    this.contextMemory.savePreference(userId, key, value);
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId) {
    return this.contextMemory.getAllPreferences(userId);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      sessions: this.conversationManager.getSessionSummary(),
      memory: {
        usersWithPreferences: this.contextMemory.userPreferences.size,
        usersWithHistory: this.contextMemory.conversationHistory.size
      }
    };
  }
}

// Export singleton instance
let conversationServiceInstance = null;

function getEnhancedConversationService() {
  if (!conversationServiceInstance) {
    conversationServiceInstance = new EnhancedConversationService();
  }
  return conversationServiceInstance;
}

module.exports = {
  EnhancedConversationService,
  ConversationManager,
  ContextMemory,
  EmotionAnalyzer,
  IntelligentResponder,
  getEnhancedConversationService
};
