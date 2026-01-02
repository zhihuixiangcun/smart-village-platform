/**
 * 语音服务 - Speech Service
 *
 * 功能：
 * 1. 对接百度语音识别API
 * 2. 对接百度语音合成API
 * 3. 支持22种方言识别
 * 4. 音频格式转换
 * 5. 语音命令解析
 */

const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * 支持的方言列表
 * 参考：百度语音识别API支持的方言
 */
const SUPPORTED_DIALECTS = {
  // 主要方言
  mandarin: { code: 1537, name: '普通话', desc: '标准普通话' },
  cantonese: { code: 1637, name: '粤语', desc: '广东话、香港话' },
  sichuan: { code: 1737, name: '四川话', desc: '西南官话' },
  hubei: { code: 1837, name: '湖北话', desc: '江淮官话' },
  hunan: { code: 1937, name: '湖南话', desc: '湘语' },
  jiangxi: { code: 2037, name: '江西话', desc: '赣语' },
  henan: { code: 2137, name: '河南话', desc: '中原官话' },
  anhui: { code: 2237, name: '安徽话', desc: '江淮官话' },
  shandong: { code: 2337, name: '山东话', desc: '胶辽官话' },
  shanxi: { code: 2437, name: '山西话', desc: '晋语' },
  hebei: { code: 2537, name: '河北话', desc: '北方官话' },
  northeast: { code: 2637, name: '东北话', desc: '东北官话' },
  tianjin: { code: 2737, name: '天津话', desc: '北方官话' },
  nanjing: { code: 2837, name: '南京话', desc: '江淮官话' },
  xi'an: { code: 2937, name: '西安话', desc: '中原官话' },
  lanzhou: { code: 3037, name: '兰州话', desc: '中原官话' },
  chongqing: { code: 3137, name: '重庆话', desc: '西南官话' },
  guiyang: { code: 3237, name: '贵阳话', desc: '西南官话' },
  kunming: { code: 3337, name: '昆明话', desc: '西南官话' },
  guangxi: { code: 3437, name: '广西话', desc: '西南官话' },
  fuzhou: { code: 3537, name: '福州话', desc: '闽东语' },
  xiamen: { code: 3637, name: '厦门话', desc: '闽南语' }
};

/**
 * 语音识别结果格式
 */
class SpeechRecognitionResult {
  constructor(success, text = '', confidence = 0, dialect = 'mandarin', duration = 0) {
    this.success = success;
    this.text = text;
    this.confidence = confidence;
    this.dialect = dialect;
    this.duration = duration;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 语音合成结果格式
 */
class SpeechSynthesisResult {
  constructor(success, audioData = null, duration = 0, format = 'mp3') {
    this.success = success;
    this.audioData = audioData;
    this.duration = duration;
    this.format = format;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 语音命令类型
 */
const COMMAND_TYPES = {
  CALL: 'call', // 呼叫功能
  QUERY: 'query', // 查询功能
  NAVIGATION: 'navigation', // 导航功能
  EMERGENCY: 'emergency', // 紧急求助
  FORM_INPUT: 'form_input', // 表单输入
  SEARCH: 'search' // 搜索功能
};

/**
 * 语音命令模式
 */
const COMMAND_PATTERNS = {
  [COMMAND_TYPES.CALL]: [/呼叫(.*)/i, /打电话给(.*)/i, /联系(.*)/i],
  [COMMAND_TYPES.QUERY]: [/查询(.*)/i, /查一下(.*)/i, /查看(.*)/i, /(.*)的信息/i],
  [COMMAND_TYPES.NAVIGATION]: [/去(.*)/i, /导航到(.*)/i, /前往(.*)/i],
  [COMMAND_TYPES.EMERGENCY]: [/紧急求助/i, /救命/i, /报警/i, /呼叫村干部/i],
  [COMMAND_TYPES.FORM_INPUT]: [/填写(.*)/i, /输入(.*)/i],
  [COMMAND_TYPES.SEARCH]: [/搜索(.*)/i, /找(.*)/i]
};

class SpeechService {
  constructor() {
    // 百度AI API配置
    this.apiKey = process.env.BAIDU_SPEECH_API_KEY || '';
    this.secretKey = process.env.BAIDU_SPEECH_SECRET_KEY || '';
    this.accessToken = null;
    this.tokenExpireTime = 0;

    // API端点
    this.tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
    this.asrUrl = 'https://vop.baidu.com/server_api';
    this.ttsUrl = 'https://tsn.baidu.com/text2audio';

    // 音频配置
    this.defaultSampleRate = 16000;
    this.defaultFormat = 'pcm';
    this.supportedFormats = ['pcm', 'wav', 'opus', 'spx', 'mp3', 'amr'];
  }

  /**
   * 获取访问令牌
   * @returns {Promise<string>}
   */
  async getAccessToken() {
    // 如果令牌还有效，直接返回
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(this.tokenUrl, null, {
        params: {
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.secretKey
        }
      });

      this.accessToken = response.data.access_token;
      // 令牌有效期提前5分钟过期，确保不会使用过期令牌
      this.tokenExpireTime = Date.now() + (response.data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('获取百度语音API访问令牌失败:', error.message);
      throw new Error('语音服务认证失败');
    }
  }

  /**
   * 语音识别（Audio to Text）
   * @param {Buffer|string} audioData - 音频数据或文件路径
   * @param {Object} options - 识别选项
   * @returns {Promise<SpeechRecognitionResult>}
   */
  async recognize(audioData, options = {}) {
    const {
      dialect = 'mandarin',
      format = this.defaultFormat,
      rate = this.defaultSampleRate,
      pid = null // 显式指定PID（方言代码）
    } = options;

    try {
      // 获取访问令牌
      const token = await this.getAccessToken();

      // 读取音频数据
      let audioBuffer;
      if (Buffer.isBuffer(audioData)) {
        audioBuffer = audioData;
      } else if (typeof audioData === 'string') {
        audioBuffer = await fs.readFile(audioData);
      } else {
        throw new Error('无效的音频数据格式');
      }

      // 确定方言代码
      const dialectCode = pid || (SUPPORTED_DIALECTS[dialect]?.code || 1537);

      // 计算音频时长
      const audioDuration = this.calculateAudioDuration(audioBuffer, rate);

      // 准备请求参数
      const params = {
        cuid: this.generateCuid(),
        token,
        dev_pid: dialectCode
      };

      // 准备请求体（JSON格式）
      const requestBody = {
        format,
        rate,
        channel: 1,
        cuid: params.cuid,
        token,
        speech: audioBuffer.toString('base64'),
        len: audioBuffer.length
      };

      // 发送识别请求
      const response = await axios.post(this.asrUrl, requestBody, {
        params,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      });

      // 解析响应
      if (response.data.err_no === 0 && response.data.result) {
        const text = response.data.result[0] || '';
        return new SpeechRecognitionResult(
          true,
          text,
          response.data.err_no || 0,
          dialect,
          audioDuration
        );
      } else {
        // 识别失败
        console.error('语音识别失败:', response.data);
        return new SpeechRecognitionResult(
          false,
          '',
          0,
          dialect,
          audioDuration
        );
      }
    } catch (error) {
      console.error('语音识别异常:', error.message);
      return new SpeechRecognitionResult(
        false,
        '',
        0,
        dialect,
        0
      );
    }
  }

  /**
   * 语音合成（Text to Audio）
   * @param {string} text - 要合成的文本
   * @param {Object} options - 合成选项
   * @returns {Promise<SpeechSynthesisResult>}
   */
  async synthesize(text, options = {}) {
    const {
      person = 0, // 发音人：0-女声，1-男声
      speed = 5, // 语速：0-15
      pitch = 5, // 音调：0-15
      volume = 5, // 音量：0-15
      format = 'mp3' // 音频格式
    } = options;

    try {
      // 获取访问令牌
      const token = await this.getAccessToken();

      // 准备请求参数
      const params = {
        tex: text,
        tok: token,
        cuid: this.generateCuid(),
        ctp: '1',
        lan: 'zh',
        per: person,
        spd: speed,
        pit: pitch,
        vol: volume,
        aue: format === 'mp3' ? 3 : format === 'wav' ? 6 : 4
      };

      // 发送合成请求
      const response = await axios.get(this.ttsUrl, {
        params,
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // 检查响应是否为音频数据
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('audio')) {
        return new SpeechSynthesisResult(
          true,
          response.data,
          this.estimateAudioDuration(text, speed),
          format
        );
      } else {
        // 错误响应
        console.error('语音合成失败:', response.data.toString());
        return new SpeechSynthesisResult(false);
      }
    } catch (error) {
      console.error('语音合成异常:', error.message);
      return new SpeechSynthesisResult(false);
    }
  }

  /**
   * 识别语音命令
   * @param {string} text - 识别出的文本
   * @returns {Object|null} 命令对象
   */
  parseCommand(text) {
    if (!text || typeof text !== 'string') {
      return null;
    }

    for (const [commandType, patterns] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return {
            type: commandType,
            target: match[1] ? match[1].trim() : '',
            originalText: text,
            confidence: 0.9 // 简单的命令模式匹配置信度
          };
        }
      }
    }

    return null;
  }

  /**
   * 获取支持的方言列表
   * @returns {Array}
   */
  getSupportedDialects() {
    return Object.entries(SUPPORTED_DIALECTS).map(([key, value]) => ({
      code: key,
      ...value
    }));
  }

  /**
   * 获取方言信息
   * @param {string} dialectCode - 方言代码
   * @returns {Object|null}
   */
  getDialectInfo(dialectCode) {
    return SUPPORTED_DIALECTS[dialectCode] || null;
  }

  /**
   * 音频格式转换
   * @param {Buffer} audioBuffer - 音频数据
   * @param {string} fromFormat - 源格式
   * @param {string} toFormat - 目标格式
   * @returns {Promise<Buffer>}
   */
  async convertAudioFormat(audioBuffer, fromFormat, toFormat) {
    // 实际项目中可以使用 ffmpeg 或其他音频处理库
    // 这里仅作为占位符
    throw new Error('音频格式转换功能需要集成音频处理库');
  }

  /**
   * 计算音频时长（基于采样率和字节数）
   * @param {Buffer} audioBuffer - 音频数据
   * @param {number} sampleRate - 采样率
   * @returns {number} 时长（秒）
   */
  calculateAudioDuration(audioBuffer, sampleRate = 16000) {
    // 假设16位单声道音频
    const bytesPerSample = 2;
    const duration = audioBuffer.length / (sampleRate * bytesPerSample);
    return Math.round(duration * 100) / 100;
  }

  /**
   * 估算音频时长（基于文本长度）
   * @param {string} text - 文本
   * @param {number} speed - 语速
   * @returns {number} 估算时长（秒）
   */
  estimateAudioDuration(text, speed = 5) {
    const averageCharsPerSecond = 3 + (speed - 5) * 0.2;
    const duration = text.length / averageCharsPerSecond;
    return Math.max(1, Math.round(duration * 100) / 100);
  }

  /**
   * 生成唯一客户端ID
   * @returns {string}
   */
  generateCuid() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 验证音频格式
   * @param {string} format - 音频格式
   * @returns {boolean}
   */
  isValidFormat(format) {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  /**
   * 验证方言代码
   * @param {string} dialect - 方言代码
   * @returns {boolean}
   */
  isValidDialect(dialect) {
    return dialect in SUPPORTED_DIALECTS;
  }
}

// 导出单例实例
const speechService = new SpeechService();

// 导出类和常量
module.exports = {
  speechService,
  SpeechService,
  SpeechRecognitionResult,
  SpeechSynthesisResult,
  SUPPORTED_DIALECTS,
  COMMAND_TYPES,
  COMMAND_PATTERNS
};
