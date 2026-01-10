/**
 * 智谱AI服务模块
 * 专门处理与智谱AI GLM模型的交互
 */

const axios = require('axios');
const logger = require('../utils/logger');
const crypto = require('crypto');
const NodeCache = require('node-cache');

// 智谱AI专用缓存
const zhipuCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

/**
 * 智谱AI服务类
 */
class ZhipuAIService {
  constructor(config = {}) {
    // 优先使用配置文件中的设置
    try {
      const configPath = require('path').join(__dirname, '../config/ai-providers.config.json');
      const aiConfig = require(configPath);
      const zhipuConfig = aiConfig.providers?.zhipuai;
      
      this.apiKey = config.apiKey || zhipuConfig?.options?.apiKey || process.env.ZHIPUAI_API_KEY || '';
      this.baseURL = config.baseURL || zhipuConfig?.options?.baseURL || process.env.ZHIPUAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/';
      this.model = config.model || zhipuConfig?.models?.['glm-4.6'] ? 'glm-4.6' : process.env.ZHIPUAI_MODEL || 'glm-4.6';
    } catch (error) {
      // 如果配置文件不存在，使用环境变量
      this.apiKey = config.apiKey || process.env.ZHIPUAI_API_KEY || '';
      this.baseURL = config.baseURL || process.env.ZHIPUAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/';
      this.model = config.model || process.env.ZHIPUAI_MODEL || 'glm-4.6';
    }
    
    this.timeout = config.timeout || 30000;
    
    if (!this.apiKey) {
      logger.warn('智谱AI API密钥未配置');
    }
  }

  /**
   * 发送聊天请求
   * @param {Array} messages - 对话消息数组
   * @param {Object} options - 额外选项
   * @returns {Promise<Object>} - 响应结果
   */
  async chat(messages, options = {}) {
    try {
      const config = {
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 8192,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        stream: options.stream || false,
        ...options
      };

      const response = await axios.post(
        `${this.baseURL}chat/completions`,
        config,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      return {
        success: true,
        data: response.data,
        usage: response.data.usage || {},
        content: response.data.choices?.[0]?.message?.content || '',
        finishReason: response.data.choices?.[0]?.finish_reason || 'stop'
      };
    } catch (error) {
      logger.error('智谱AI请求失败:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        code: error.response?.status || 500
      };
    }
  }

  /**
   * 流式聊天
   * @param {Array} messages - 对话消息数组
   * @param {Function} onChunk - 流数据回调
   * @param {Object} options - 额外选项
   */
  async chatStream(messages, onChunk, options = {}) {
    try {
      const config = {
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 8192,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        stream: true,
        ...options
      };

      const response = await axios.post(
        `${this.baseURL}chat/completions`,
        config,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: this.timeout
        }
      );

      let buffer = '';
      
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onChunk({ done: true });
              return;
            }
            try {
              const parsed = JSON.parse(data);
              onChunk({ 
                done: false, 
                content: parsed.choices?.[0]?.delta?.content || '',
                usage: parsed.usage
              });
            } catch (e) {
              logger.warn('解析流数据失败:', e.message);
            }
          }
        }
      });

      response.data.on('end', () => {
        onChunk({ done: true });
      });

      response.data.on('error', (error) => {
        logger.error('流式请求错误:', error);
        onChunk({ done: true, error: error.message });
      });

    } catch (error) {
      logger.error('智谱AI流式请求失败:', error.message);
      onChunk({ done: true, error: error.message });
    }
  }

  /**
   * 智慧乡村专用AI问答
   * @param {string} message - 用户消息
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} - 回答结果
   */
  async villageChat(message, context = {}) {
    try {
      // 检查缓存
      const cacheKey = `zhipu:${crypto.createHash('md5').update(JSON.stringify({ message, context })).digest('hex')}`;
      const cached = zhipuCache.get(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }

      const { location, conversationHistory = [], userInfo } = context;

      // 构建系统提示词
      const systemPrompt = this.buildVillageSystemPrompt(location, userInfo);

      // 构建消息数组
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // 添加历史对话
      if (conversationHistory.length > 0) {
        messages.push(...conversationHistory.slice(-10));
      }

      // 添加当前消息
      messages.push({ role: 'user', content: message });

      // 发送请求
      const result = await this.chat(messages, {
        temperature: 0.7,
        maxTokens: 4096
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const response = {
        answer: result.content,
        source: this.extractSources(result.content),
        relatedTopics: this.extractRelatedTopics(message),
        provider: 'zhipuai',
        model: this.model,
        usage: result.usage,
        timestamp: new Date().toISOString(),
        cached: false
      };

      // 缓存结果
      zhipuCache.set(cacheKey, response);

      return response;
    } catch (error) {
      logger.error('智谱AI乡村问答失败:', error);
      throw error;
    }
  }

  /**
   * 构建智慧乡村系统提示词
   * @param {string} location - 地理位置
   * @param {Object} userInfo - 用户信息
   * @returns {string} - 系统提示词
   */
  buildVillageSystemPrompt(location = '', userInfo = {}) {
    const basePrompt = `你是一个智慧乡村综合服务平台的AI助手，专门为农村村民提供咨询服务。

你的主要职责包括：
1. 农业技术指导 - 种植养殖技术、病虫害防治、施肥用药指导
2. 政策咨询解读 - 惠农政策、补贴申请、办事流程说明
3. 市场信息服务 - 农产品价格、农资行情、销售渠道
4. 生产生活帮助 - 天气预报、农事提醒、生活常识

回答要求：
- 使用通俗易懂的语言，避免专业术语，适合农村用户理解
- 对老年用户要有耐心，表达清晰，可以适当重复重要信息
- 可以适当使用方言词汇和表达方式，让村民感到亲切
- 涉及政策信息时，要准确说明政策来源、适用范围和有效期
- 对于不确定的信息，要明确告知需要咨询相关部门或专业人士
- 回答要有实用性和可操作性，提供具体的解决方法

服务区域：${location || '全国'}

请始终保持耐心、专业、亲切的服务态度。`;

    if (userInfo && userInfo.age) {
      const agePrompt = userInfo.age > 60 ? 
        '考虑到用户年龄较大，请使用更简洁明了的语言，放慢表达节奏，重要内容可以适当重复。' :
        '用户为中年村民，可以使用相对专业的农业术语，但仍需保持清晰易懂。';
      
      return `${basePrompt}\n\n${agePrompt}`;
    }

    return basePrompt;
  }

  /**
   * 从回答中提取信息来源
   * @param {string} content - 回答内容
   * @returns {Array} - 来源列表
   */
  extractSources(content) {
    const sources = [];
    const patterns = [
      /根据(.+?文件|.+?政策|.+?通知)/g,
      /按照(.+?规定|.+?办法|.+?条例)/g,
      /参考(.+?指南|.+?手册|.+?标准)/g,
      /来源[:：](.+?)(?:，|。|$)/g
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const source = match.replace(/根据|按照|参考|来源[:：]/, '').trim();
          if (source && !sources.includes(source)) {
            sources.push(source);
          }
        });
      }
    });

    return sources;
  }

  /**
   * 提取相关话题
   * @param {string} message - 用户消息
   * @returns {Array} - 相关话题列表
   */
  extractRelatedTopics(message) {
    const topics = [];
    const lowerMessage = message.toLowerCase();

    // 补贴政策相关
    if (/补贴|补助|惠农资金/.test(lowerMessage)) {
      topics.push('补贴申请流程', '补贴发放时间', '惠农政策解读');
    }

    // 种植技术相关
    if (/怎么种|如何种|种植技术|播种|育苗/.test(lowerMessage)) {
      topics.push('种植技术指导', '最佳播种时间', '育苗方法');
    }

    // 病虫害相关
    if (/病虫害|防治|农药|除草/.test(lowerMessage)) {
      topics.push('病虫害识别', '农药使用方法', '绿色防控技术');
    }

    // 养殖相关
    if (/养殖|畜牧|禽畜|饲料/.test(lowerMessage)) {
      topics.push('养殖技术', '饲料配比', '疫病防控');
    }

    // 价格行情相关
    if (/价格|行情|卖价|收购/.test(lowerMessage)) {
      topics.push('今日农产品价格', '价格走势分析', '销售渠道推荐');
    }

    // 天气农事相关
    if (/天气|降雨|气温|农事/.test(lowerMessage)) {
      topics.push('天气预报', '农事安排', '防灾减灾');
    }

    return topics.length > 0 ? topics.slice(0, 5) : ['热门问题', '办事指南'];
  }

  /**
   * 健康检查
   * @returns {Promise<Object>} - 健康状态
   */
  async healthCheck() {
    try {
      const testMessage = '你好，请简要介绍一下你的功能。';
      const result = await this.chat([
        { role: 'user', content: testMessage }
      ], { maxTokens: 100 });

      return {
        status: result.success ? 'healthy' : 'unhealthy',
        responseTime: Date.now(),
        model: this.model,
        lastCheck: new Date().toISOString(),
        error: result.success ? null : result.error
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    zhipuCache.flushAll();
    logger.info('智谱AI缓存已清除');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return zhipuCache.getStats();
  }
}

module.exports = ZhipuAIService;