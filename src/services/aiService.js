/**
 * AI智能服务
 * 集成智谱AI、Anthropic Claude、百度语音识别、TTS等功能
 */

const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');

// 缓存配置 (TTL: 1小时)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// 加载AI提供商配置
let aiProvidersConfig = null;
try {
  const configPath = path.join(__dirname, '../config/ai-providers.config.json');
  aiProvidersConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  logger.warn('AI提供商配置文件未找到，使用默认配置:', error.message);
  aiProvidersConfig = {
    providers: {},
    defaultProvider: 'anthropic',
    fallbackProvider: 'anthropic'
  };
}

/**
 * 方言代码映射表
 * 支持中国22种主要方言/语言
 */
const DIALECT_CODE_MAP = {
  // 标准普通话
  'zh-CN': '1737',        // 普通话
  'pcc': '1737',          // 普通话（简体）

  // 主要方言
  'yue': '1737',          // 粤语（广东话）
  'minnan': '1738',       // 闽南语（福建话、台湾话）
  'hakka': '1739',        // 客家话
  'xiang': '1747',        // 湘南话
  'gan': '1748',          // 赣语
  'wu': '1749',           // 吴语（上海话、苏州话）

  // 西南官话
  'sichuan': '1741',      // 四川话
  'chongqing': '1741',    // 重庆话
  'guizhou': '1742',      // 贵州话
  'yunnan': '1743',       // 云南话
  'hubei': '1744',        // 湖北话

  // 北方方言
  'shaanxi': '1745',      // 陕西话
  'gansu': '1746',        // 甘肃话
  'henan': '1740',        // 河南话
  'dongbei': '1747',      // 东北话
  'tianjin': '1748',      // 天津话
  'nanjing': '1749',      // 南京话
  'jin': '1750',          // 晋语（山西话）

  // 其他地区方言
  'jiangxi': '1751',      // 江西话
  'anhui': '1752',        // 安徽话
  'shandong': '1753',     // 山东话
  'pcc-qn': '1737'        // 普通话（台湾/海外）
};

/**
 * 支持的方言列表（供前端使用）
 */
const SUPPORTED_DIALECTS = [
  { code: 'zh-CN', name: '普通话', region: '全国通用' },
  { code: 'yue', name: '粤语', region: '广东、广西、香港、澳门' },
  { code: 'minnan', name: '闽南语', region: '福建南部、台湾、东南亚' },
  { code: 'hakka', name: '客家话', region: '江西、福建、广东、台湾' },
  { code: 'wu', name: '吴语', region: '上海、江苏、浙江' },
  { code: 'xiang', name: '湘语', region: '湖南' },
  { code: 'gan', name: '赣语', region: '江西' },
  { code: 'sichuan', name: '四川话', region: '四川、重庆' },
  { code: 'dongbei', name: '东北话', region: '黑龙江、吉林、辽宁' },
  { code: 'henan', name: '河南话', region: '河南' },
  { code: 'shaanxi', name: '陕西话', region: '陕西' },
  { code: 'shandong', name: '山东话', region: '山东' },
  { code: 'tianjin', name: '天津话', region: '天津' },
  { code: 'nanjing', name: '南京话', region: '江苏南京' },
  { code: 'jin', name: '晋语', region: '山西' }
];

/**
 * 意图检测类型
 */
const INTENT_TYPES = {
  SUBSIDY_APPLICATION: 'subsidy_application',      // 补贴申请
  POLICY_INQUIRY: 'policy_inquiry',                // 政策咨询
  TECHNICAL_QUESTION: 'technical_question',        // 技术问题
  MARKET_PRICE: 'market_price',                    // 市场价格
  APPOINTMENT: 'appointment',                      // 预约办事
  COMPLAINT: 'complaint',                          // 投诉建议
  GREETING: 'greeting',                            // 问候
  UNKNOWN: 'unknown'                               // 未知
};

/**
 * AI服务类
 */
class AIService {
  constructor() {
    // Anthropic配置
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
    this.anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    
    // 百度配置
    this.baiduAppId = process.env.BAIDU_APP_ID || '';
    this.baiduApiKey = process.env.BAIDU_API_KEY || '';
    this.baiduSecretKey = process.env.BAIDU_SECRET_KEY || '';
    this.baiduAccessToken = null;
    this.tokenExpireTime = null;
    
    // 智谱AI配置
    this.zhipuaiConfig = aiProvidersConfig.providers.zhipuai || null;
    this.currentProvider = aiProvidersConfig.defaultProvider || 'anthropic';
    this.fallbackProvider = aiProvidersConfig.fallbackProvider || 'anthropic';
  }

  // ==================== 语音识别 (ASR) ====================

  /**
   * 获取百度访问令牌
   */
  async getBaiduAccessToken() {
    // 如果token有效，直接返回
    if (this.baiduAccessToken && this.tokenExpireTime > Date.now()) {
      return this.baiduAccessToken;
    }

    try {
      const url = 'https://aip.baidubce.com/oauth/2.0/token';
      const params = {
        grant_type: 'client_credentials',
        client_id: this.baiduApiKey,
        client_secret: this.baiduSecretKey
      };

      const response = await axios.get(url, { params });
      this.baiduAccessToken = response.data.access_token;
      // token有效期30天，提前1天刷新
      this.tokenExpireTime = Date.now() + (response.data.expires_in - 86400) * 1000;

      return this.baiduAccessToken;
    } catch (error) {
      logger.error('获取百度访问令牌失败:', error);
      throw new Error('语音服务暂时不可用');
    }
  }

  /**
   * 语音转文字 (支持方言识别)
   * @param {Buffer} audioData - 音频数据
   * @param {string} dialect - 方言代码
   * @returns {Promise<{text: string, confidence: number}>}
   */
  async speechToText(audioData, dialect = 'zh-CN') {
    try {
      const accessToken = await this.getBaiduAccessToken();
      const dialectCode = DIALECT_CODE_MAP[dialect] || '1737';

      // 百度语音识别API
      const url = `https://vop.baidu.com/server_api?dev_pid=${dialectCode}`;

      // 准备请求体 (支持PCM、WAV、AMR、M4A格式)
      const audioBase64 = audioData.toString('base64');
      const requestBody = {
        format: 'm4a',  // 可根据实际音频格式调整
        rate: 16000,    // 采样率
        channel: 1,     // 声道数
        cuid: crypto.randomUUID(),
        token: accessToken,
        speech: audioBase64,
        len: audioData.length
      };

      const response = await axios.post(url, requestBody, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.err_no !== 0) {
        throw new Error(`语音识别失败: ${response.data.err_msg}`);
      }

      const result = response.data.result;
      const text = result && result.length > 0 ? result[0] : '';

      // 意图检测
      const detectedIntent = this.detectIntent(text);

      return {
        text,
        confidence: response.data.err_no === 0 ? 0.95 : 0,
        detectedIntent,
        dialect
      };
    } catch (error) {
      logger.error('语音识别失败:', error);
      // 降级：返回空结果而不是抛出错误
      return {
        text: '',
        confidence: 0,
        detectedIntent: INTENT_TYPES.UNKNOWN,
        error: error.message
      };
    }
  }

  /**
   * 意图检测（基于关键词）
   * @param {string} text - 识别的文本
   * @returns {string} - 意图类型
   */
  detectIntent(text) {
    if (!text || text.length === 0) return INTENT_TYPES.UNKNOWN;

    const lowerText = text.toLowerCase();

    // 补贴相关关键词
    if (/补贴|补助|申请|领钱|领补贴/.test(lowerText)) {
      return INTENT_TYPES.SUBSIDY_APPLICATION;
    }

    // 政策咨询
    if (/政策|规定|办法|通知|文件|怎么申请|条件/.test(lowerText)) {
      return INTENT_TYPES.POLICY_INQUIRY;
    }

    // 技术问题
    if (/怎么种|如何防治|什么病|施肥|打药|种植技术/.test(lowerText)) {
      return INTENT_TYPES.TECHNICAL_QUESTION;
    }

    // 价格查询
    if (/价格|多少钱|行情|收购价|卖价/.test(lowerText)) {
      return INTENT_TYPES.MARKET_PRICE;
    }

    // 预约办事
    if (/预约|挂号|办事|办理|什么时候开/.test(lowerText)) {
      return INTENT_TYPES.APPOINTMENT;
    }

    // 投诉建议
    if (/投诉|举报|建议|意见|问题/.test(lowerText)) {
      return INTENT_TYPES.COMPLAINT;
    }

    // 问候
    if (/你好|您好|早上好|晚上好|在吗/.test(lowerText)) {
      return INTENT_TYPES.GREETING;
    }

    return INTENT_TYPES.UNKNOWN;
  }

  // ==================== 语音合成 (TTS) ====================

  /**
   * 文字转语音 (方言播报)
   * @param {string} text - 要转换的文本
   * @param {string} dialect - 方言代码
   * @param {number} speed - 语速 (0-15, 默认5)
   * @returns {Promise<Buffer>} - 音频数据
   */
  async textToSpeech(text, dialect = 'pcc-qn', speed = 5) {
    try {
      const accessToken = await this.getBaiduAccessToken();
      const dialectCode = DIALECT_CODE_MAP[dialect] || '1737';

      const url = 'https://tsn.baidu.com/text2audio';

      const params = {
        tex: text,
        tok: accessToken,
        cuid: crypto.randomUUID(),
        ctp: '1',
        lan: 'zh',
        per: dialectCode,  // 发音人选择
        spd: Math.max(0, Math.min(15, speed)),  // 语速
        pit: '5',  // 音调
        vol: '15', // 音量
        aue: '3'   // 音频格式 (3=mp3)
      };

      const response = await axios.get(url, {
        params,
        responseType: 'arraybuffer'
      });

      // 检查是否返回错误
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const errorData = JSON.parse(response.data.toString());
        throw new Error(`语音合成失败: ${errorData.err_msg}`);
      }

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('语音合成失败:', error);
      throw new Error(`语音合成失败: ${error.message}`);
    }
  }

  // ==================== AI智能问答 ====================

  /**
   * 智谱AI聊天
   * @param {string} message - 用户消息
   * @param {object} context - 上下文信息
   * @returns {Promise<object>} - 回答结果
   */
  async chatWithZhipuai(message, context = {}) {
    try {
      if (!this.zhipuaiConfig) {
        throw new Error('智谱AI配置未找到');
      }

      const { userId, location, conversationHistory = [] } = context;

      // 构建系统提示词
      const systemPrompt = this.buildSystemPrompt(location);

      // 构建消息
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];

      // 如果有历史对话，添加到消息中
      if (conversationHistory.length > 0) {
        messages.splice(1, 0, ...conversationHistory.slice(-10));
      }

      const response = await axios.post(
        `${this.zhipuaiConfig.options.baseURL}chat/completions`,
        {
          model: 'glm-4.6',
          messages,
          max_tokens: 8192,
          temperature: 0.7,
          top_p: 0.9,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.zhipuaiConfig.options.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const answer = response.data.choices[0].message.content;

      return {
        answer,
        source: this.extractSources(answer),
        relatedTopics: this.extractRelatedTopics(message),
        provider: 'zhipuai',
        model: 'glm-4.6',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('智谱AI聊天失败:', error);
      throw error;
    }
  }

  /**
   * AI智能问答 (支持多提供商)
   * @param {string} message - 用户消息
   * @param {object} context - 上下文信息
   * @returns {Promise<object>} - 回答结果
   */
  async chat(message, context = {}) {
    try {
      // 检查缓存
      const cacheKey = `chat:${crypto.createHash('md5').update(message).digest('hex')}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let result = null;
      let lastError = null;

      // 优先使用默认提供商
      if (this.currentProvider === 'zhipuai' && this.zhipuaiConfig) {
        try {
          result = await this.chatWithZhipuai(message, context);
        } catch (error) {
          lastError = error;
          logger.warn('智谱AI调用失败，尝试备用方案:', error.message);
        }
      }

      // 如果智谱AI失败，尝试Anthropic
      if (!result && this.anthropicApiKey) {
        try {
          result = await this.chatWithAnthropic(message, context);
        } catch (error) {
          lastError = error;
          logger.warn('Anthropic调用失败，返回本地答案:', error.message);
        }
      }

      // 如果所有AI提供商都失败，返回本地知识库答案
      if (!result) {
        result = this.getFallbackResponse(message, context);
      }

      // 缓存结果
      cache.set(cacheKey, result);

      return result;
    } catch (error) {
      logger.error('AI问答失败:', error);
      return this.getFallbackResponse(message, context);
    }
  }

  /**
   * Anthropic聊天
   * @param {string} message - 用户消息
   * @param {object} context - 上下文信息
   * @returns {Promise<object>} - 回答结果
   */
  async chatWithAnthropic(message, context = {}) {
    const { userId, location, conversationHistory = [] } = context;

    // 构建系统提示词
    const systemPrompt = this.buildSystemPrompt(location);

    // 构建消息历史
    const messages = [
      { role: 'user', content: message }
    ];

    // 调用Claude API
    const response = await axios.post(
      `${this.anthropicBaseUrl}/v1/messages`,
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationHistory.length > 0
          ? [...conversationHistory.slice(-5), { role: 'user', content: message }]
          : messages
      },
      {
        headers: {
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );

    const answer = response.data.content[0].text;

    return {
      answer,
      source: this.extractSources(answer),
      relatedTopics: this.extractRelatedTopics(message),
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 构建系统提示词
   */
  buildSystemPrompt(location = '') {
    const basePrompt = `你是一个智慧乡村综合服务平台的AI助手，专门为农村村民提供咨询服务。

你的职责包括：
1. 解答农业技术问题（种植、养殖、病虫害防治）
2. 提供政策咨询（补贴政策、办事流程）
3. 提供市场价格信息（农产品收购价、农资价格）
4. 帮助村民在线办事（预约、申请）

回答要求：
- 使用简单易懂的语言，避免专业术语
- 对老年用户要有耐心，可以适当重复
- 可以使用方言词汇（如果检测到用户使用方言）
- 涉及政策时，要注明政策来源和有效期
- 不确定的信息要明确告知需要咨询相关部门
`;

    if (location) {
      return `${basePrompt}

当前服务区域：${location}

在回答时，优先考虑该地区的政策和规定。`;
    }

    return basePrompt;
  }

  /**
   * 获取降级响应（本地知识库）
   */
  getFallbackResponse(message, context) {
    const lowerMessage = message.toLowerCase();

    // 补贴申请相关
    if (/补贴|补助/.test(lowerMessage)) {
      return {
        answer: '目前支持的补贴类型包括：耕地地力保护补贴、实际种粮农民一次性补贴、农机购置补贴等。您可以通过"政务服务-补贴申请"模块在线申请。请问您想了解哪种补贴的具体政策？',
        source: ['农业农村部政策文件'],
        relatedTopics: ['耕地保护补贴申请流程', '补贴发放时间'],
        fallback: true
      };
    }

    // 农业技术相关
    if (/怎么种|如何防治|病虫害/.test(lowerMessage)) {
      return {
        answer: '关于农业技术问题，建议您：1) 查看平台的"农业知识库"板块；2) 在"朋友圈-农业技术"栏目发布具体问题；3) 联系当地农业技术推广站。您能具体说说是什么作物遇到了什么问题吗？',
        source: ['农业技术推广服务中心'],
        relatedTopics: ['常见病虫害识别', '施肥时间表'],
        fallback: true
      };
    }

    // 价格咨询
    if (/价格|多少钱/.test(lowerMessage)) {
      return {
        answer: '农产品价格会根据市场波动变化。建议您查看"电商-行情分析"板块获取最新价格信息。主要农产品包括：稻谷、小麦、玉米、大豆等。请问您关注的是哪种农产品？',
        source: ['农产品市场监测系统'],
        relatedTopics: ['今日粮价', '农资价格走势'],
        fallback: true
      };
    }

    // 默认回答
    return {
      answer: '您好！我是智慧乡村服务助手。我可以帮您：1) 查询补贴政策；2) 解答农业技术问题；3) 了解市场价格；4) 预约办事服务。请问有什么可以帮您？',
      source: [],
      relatedTopics: ['补贴申请', '农业技术', '市场价格'],
      fallback: true
    };
  }

  /**
   * 从回答中提取来源
   */
  extractSources(answer) {
    const sources = [];
    const patterns = [
      /根据(.+?文件)/g,
      /按照(.+?规定)/g,
      /参考(.+?通知)/g,
      /来源[:：](.+?)(?:，|$)/g
    ];

    patterns.forEach(pattern => {
      const matches = answer.match(pattern);
      if (matches) {
        matches.forEach(m => sources.push(m));
      }
    });

    return sources;
  }

  /**
   * 提取相关话题
   */
  extractRelatedTopics(message) {
    const topics = [];
    const lowerMessage = message.toLowerCase();

    // 基于关键词提取相关话题
    if (/补贴/.test(lowerMessage)) {
      topics.push('补贴申请流程', '补贴发放时间');
    }
    if (/水稻|稻谷|玉米|小麦/.test(lowerMessage)) {
      topics.push('种植技术', '病虫害防治');
    }
    if (/价格/.test(lowerMessage)) {
      topics.push('今日粮价', '价格走势分析');
    }

    return topics.length > 0 ? topics : ['热门问题', '办事指南'];
  }

  // ==================== AI填表助手 ====================

  /**
   * AI填表助手
   * 根据语音/文字输入自动填表
   * @param {string} input - 用户输入
   * @param {string} formType - 表单类型
   * @returns {Promise<object>} - 填表结果
   */
  async fillForm(input, formType = 'subsidy_application') {
    try {
      const formConfigs = {
        subsidy_application: {
          fields: ['name', 'idNumber', 'phone', 'bankAccount', 'landArea', 'address'],
          prompts: {
            name: '申请人姓名',
            idNumber: '身份证号码',
            phone: '联系电话',
            bankAccount: '银行账号',
            landArea: '耕地面积（亩）',
            address: '详细地址'
          }
        },
        welfare_application: {
          fields: ['name', 'idNumber', 'householdSize', 'annualIncome', 'reason'],
          prompts: {
            name: '申请人姓名',
            idNumber: '身份证号码',
            householdSize: '家庭人口数',
            annualIncome: '家庭年收入',
            reason: '申请原因'
          }
        }
      };

      const config = formConfigs[formType];
      if (!config) {
        throw new Error('不支持的表单类型');
      }

      // 使用AI解析用户输入
      const extractedData = await this.extractFormData(input, config);

      return {
        success: true,
        formType,
        extractedData,
        confidence: extractedData._confidence || 0.85,
        needsVerification: true
      };
    } catch (error) {
      logger.error('AI填表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 从用户输入中提取表单数据
   */
  async extractFormData(input, config) {
    // 简单实现：基于正则表达式提取
    // 实际项目中可以使用Claude API进行更智能的提取
    const data = {};
    const lowerInput = input.toLowerCase();

    // 提取姓名（中文姓名2-4个字）
    const nameMatch = input.match(/([张王李赵刘陈杨黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段漕钱汤尹黎易常武乔贺赖龚文][\u4e00-\u9fa5]{1,3})/);
    if (nameMatch) data.name = nameMatch[1];

    // 提取身份证号
    const idMatch = input.match(/(\d{17}[\dXx]|\d{15})/);
    if (idMatch) data.idNumber = idMatch[1];

    // 提取手机号
    const phoneMatch = input.match(/1[3-9]\d{9}/);
    if (phoneMatch) data.phone = phoneMatch[0];

    // 提取面积数字
    const areaMatch = input.match(/(\d+\.?\d*)\s*(亩|公顷|平方米)/);
    if (areaMatch) {
      data.landArea = parseFloat(areaMatch[1]);
      data.landUnit = areaMatch[2];
    }

    // 提取人口数
    const householdMatch = input.match(/(\d+)\s*(口人|人)/);
    if (householdMatch) data.householdSize = parseInt(householdMatch[1]);

    data._confidence = Object.keys(data).length / config.fields.length;

    return data;
  }

  // ==================== 支持的方法 ====================

  /**
   * 获取支持的方言列表
   */
  getSupportedDialects() {
    return SUPPORTED_DIALECTS;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const checks = {
      zhipuai: !!(this.zhipuaiConfig && this.zhipuaiConfig.options.apiKey),
      anthropic: !!this.anthropicApiKey,
      baidu: !!(this.baiduApiKey && this.baiduSecretKey),
      cache: cache.getStats().keys > 0,
      currentProvider: this.currentProvider,
      fallbackProvider: this.fallbackProvider
    };

    const healthy = checks.zhipuai || checks.anthropic || checks.baidu;

    return {
      status: healthy ? 'healthy' : 'degraded',
      services: checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    cache.flushAll();
    logger.info('AI服务缓存已清除');
  }
}

// 导出单例
module.exports = new AIService();
