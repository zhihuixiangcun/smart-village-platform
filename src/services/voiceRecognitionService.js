/**
 * 智慧乡村综合服务平台 - 语音识别服务
 * 支持多种方言识别：普通话、粤语、闽南语、客家话、四川话
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

class VoiceRecognitionService {
  constructor() {
    // 配置选项
    this.config = {
      // 百度语音识别API配置
      baidu: {
        endpoint: 'https://vop.baidu.com/server_api',
        apiKey: process.env.BAIDU_VOICE_API_KEY,
        secretKey: process.env.BAIDU_VOICE_SECRET_KEY,
        // 支持的语言模型
        languages: {
          'zh-CN': 1737, // 普通话
          'yue': 1637,   // 粤语
          'sichuan': 2235 // 四川话
        }
      },

      // 讯飞语音识别API配置
      xunfei: {
        endpoint: 'wss://iat-api.xfyun.cn/v2/iat',
        appId: process.env.XUNFEI_APP_ID,
        apiKey: process.env.XUNFEI_API_KEY,
        // 支持的方言
        languages: {
          'zh-CN': 'mandarin',
          'yue': 'cantonese',
          'nan': 'south_mandarin',
          'hakka': 'hakka'
        }
      },

      // 腾讯语音识别API配置
      tencent: {
        endpoint: 'https://asr.tencentcloudapi.com/',
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
        region: process.env.TENCENT_REGION || 'ap-beijing'
      },

      // 本地语音识别服务配置
      local: {
        endpoint: process.env.LOCAL_VOICE_ENDPOINT || 'http://localhost:5003',
        languages: ['zh-CN', 'yue', 'nan', 'hakka', 'sichuan']
      }
    };

    // 缓存Token
    this.accessToken = null;
    this.tokenExpiry = null;

    // 语音分析正则表达式
    this.phonePatterns = [
      /1[3-9]\d{9}/g,  // 中国手机号
      /0\d{2,3}-?\d{7,8}/g  // 固定电话
    ];

    // 姓名模式（简化版）
    this.namePatterns = [
      /我叫[\s\u4e00-\u9fff]+/g,
      /我是[\s\u4e00-\u9fff]+/g,
      /我叫([\u4e00-\u9fff]{2,4})/,
      /我是([\u4e00-\u9fff]{2,4})/,
      /[\u4e00-\u9fff]{2,4}（是|叫）/
    ];

    // 方言词汇映射
    this.dialectMappings = {
      'yue': {
        '我': '我', '你': '你', '佢': '他',
        '係': '是', '冇': '没有', '嘅': '的',
        '咗': '了', '喺': '在', '邊度': '哪里',
        '點解': '为什么', '做咩': '干什么'
      },
      'nan': {
        '我': '我', '汝': '你', '伊': '他',
        '是': '是', '無': '没有', '的': '的',
        '矣': '了', '佇': '在', '叨位': '哪里',
        '按怎': '为什么', '创啥': '干什么'
      },
      'hakka': {
        '我': '我', '你': '你', '佢': '他',
        '係': '是', '冇': '没有', '嘅': '的',
        '咧': '了', '喺': '在', '哪片': '哪里',
        '做脉个': '为什么', '做脉介': '干什么'
      },
      'sichuan': {
        '我': '我', '你': '你', '他': '他',
        '是': '是', '没得': '没有', '的': '的',
        '咯': '了', '在': '在', '哪儿': '哪里',
        '为啥子': '为什么', '搞啥子': '干什么'
      }
    };
  }

  /**
   * 语音识别主入口
   * @param {Buffer|string} audioData - 音频数据或文件路径
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeVoice(audioData, options = {}) {
    const {
      language = 'zh-CN',
      provider = 'baidu', // baidu, xunfei, tencent, local
      format = 'wav',
      sampleRate = 16000,
      extractInfo = true // 是否提取个人信息
    } = options;

    try {
      let result;

      // 根据提供商调用不同的识别服务
      switch (provider) {
        case 'baidu':
          result = await this.recognizeWithBaidu(audioData, language, format, sampleRate);
          break;
        case 'xunfei':
          result = await this.recognizeWithXunfei(audioData, language, format, sampleRate);
          break;
        case 'tencent':
          result = await this.recognizeWithTencent(audioData, language, format, sampleRate);
          break;
        case 'local':
          result = await this.recognizeWithLocal(audioData, language, format, sampleRate);
          break;
        default:
          throw new Error(`不支持的语音识别提供商: ${provider}`);
      }

      // 如果需要提取个人信息
      if (extractInfo && result.text) {
        const extractedInfo = this.extractPersonalInfo(result.text, language);
        result.extractedInfo = extractedInfo;
      }

      // 添加方言处理
      if (language !== 'zh-CN') {
        result.processedText = this.processDialectText(result.text, language);
      }

      return {
        success: true,
        text: result.text,
        processedText: result.processedText || result.text,
        confidence: result.confidence,
        language,
        provider,
        extractedInfo: result.extractedInfo,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('语音识别错误:', error);
      return {
        success: false,
        error: error.message,
        language,
        provider
      };
    }
  }

  /**
   * 使用百度语音识别
   */
  async recognizeWithBaidu(audioData, language, format, sampleRate) {
    await this.ensureAccessToken();

    const languageCode = this.config.baidu.languages[language] || this.config.baidu.languages['zh-CN'];

    const formData = new FormData();
    formData.append('format', format);
    formData.append('rate', sampleRate);
    formData.append('channel', 1);
    formData.append('cuid', 'smart_village_user');
    formData.append('token', this.accessToken);
    formData.append('speech', audioData, {
      filename: `audio.${format}`,
      contentType: `audio/${format}`
    });

    const devPid = languageCode;
    formData.append('dev_pid', devPid);

    const response = await axios.post(this.config.baidu.endpoint, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    if (response.data.err_no !== 0) {
      throw new Error(`百度语音识别错误: ${response.data.err_msg}`);
    }

    return {
      text: response.data.result[0],
      confidence: response.data.err_no === 0 ? 0.9 : 0.5
    };
  }

  /**
   * 使用讯飞语音识别
   */
  async recognizeWithXunfei(audioData, language, format, sampleRate) {
    // 实现讯飞WebSocket语音识别
    // 这里需要使用WebSocket连接
    return new Promise((resolve, reject) => {
      const WebSocket = require('ws');
      const crypto = require('crypto');

      const url = this.buildXunfeiUrl();
      const ws = new WebSocket(url);

      let resultText = '';

      ws.on('open', () => {
        // 发送开始参数
        const startParams = {
          common: {
            app_id: this.config.xunfei.appId
          },
          business: {
            language: this.config.xunfei.languages[language] || 'zh_cn',
            domain: 'iat',
            accent: 'mandarin',
            vad_eos: 5000,
            dwa: 'wpgs'
          },
          data: {
            status: 2, // 0:第一帧，1:中间帧，2:最后一帧
            encoding: 'raw',
            sample_rate: sampleRate,
            audio: audioData.toString('base64'),
            audio_size: audioData.length
          }
        };

        ws.send(JSON.stringify(startParams));
      });

      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());

        if (response.code !== 0) {
          reject(new Error(`讯飞语音识别错误: ${response.message}`));
          return;
        }

        if (response.data && response.data.result) {
          const ws = response.data.result.ws;
          let segmentText = '';

          for (const item of ws) {
            segmentText += item.cw[0].w;
          }

          resultText += segmentText;
        }

        // 如果是最后一帧
        if (response.data && response.data.status === 2) {
          ws.close();
          resolve({
            text: resultText,
            confidence: 0.9
          });
        }
      });

      ws.on('error', (error) => {
        reject(error);
      });

      ws.on('close', () => {
        if (!resultText) {
          reject(new Error('讯飞语音识别未返回结果'));
        }
      });
    });
  }

  /**
   * 使用腾讯语音识别
   */
  async recognizeWithTencent(audioData, language, format, sampleRate) {
    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const AsrClient = tencentcloud.asr.v20190614.Client;

    const clientConfig = {
      credential: {
        secretId: this.config.tencent.secretId,
        secretKey: this.config.tencent.secretKey
      },
      region: this.config.tencent.region,
      profile: {
        httpProfile: {
          endpoint: 'asr.tencentcloudapi.com'
        }
      }
    };

    const client = new AsrClient(clientConfig);

    const params = {
      EngineModelType: '16k_zh', // 16k 中文
      ChannelNum: 1,
      ResTextFormat: 1,
      Data: audioData.toString('base64'),
      DataLen: audioData.length
    };

    const result = await client.CreateRecTask(params);

    if (result.Data && result.Data.Result) {
      return {
        text: result.Data.Result,
        confidence: 0.9
      };
    } else {
      throw new Error('腾讯语音识别未返回有效结果');
    }
  }

  /**
   * 使用本地语音识别服务
   */
  async recognizeWithLocal(audioData, language, format, sampleRate) {
    const formData = new FormData();
    formData.append('audio', audioData, {
      filename: `audio.${format}`,
      contentType: `audio/${format}`
    });
    formData.append('language', language);
    formData.append('sample_rate', sampleRate);

    const response = await axios.post(
      `${this.config.local.endpoint}/recognize`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000
      }
    );

    return response.data;
  }

  /**
   * 从语音文本中提取个人信息
   * @param {string} text - 语音识别文本
   * @param {string} language - 语言
   * @returns {Object} 提取的信息
   */
  extractPersonalInfo(text, language = 'zh-CN') {
    const info = {
      phone: null,
      name: null,
      confidence: 0
    };

    // 提取手机号
    const phoneMatches = text.match(this.phonePatterns);
    if (phoneMatches && phoneMatches.length > 0) {
      info.phone = phoneMatches[0].replace(/\D/g, ''); // 只保留数字
      info.confidence += 0.4;
    }

    // 提取姓名
    for (const pattern of this.namePatterns) {
      const match = text.match(pattern);
      if (match) {
        let name = match[1] || match[0];

        // 清理姓名
        name = name.replace(/^(我叫|我是)/, '').trim();

        // 姓名长度验证（2-4个中文字符）
        if (/^[\u4e00-\u9fff]{2,4}$/.test(name)) {
          info.name = name;
          info.confidence += 0.4;
          break;
        }
      }
    }

    // 根据语言特征进行额外验证
    const languageBonus = this.validateWithLanguageFeatures(text, language);
    info.confidence += languageBonus;

    // 确保置信度不超过1.0
    info.confidence = Math.min(info.confidence, 1.0);

    return info;
  }

  /**
   * 根据语言特征验证提取的信息
   */
  validateWithLanguageFeatures(text, language) {
    let bonus = 0;

    if (language === 'yue' && (text.includes('我係') || text.includes('我叫'))) {
      bonus += 0.1;
    } else if (language === 'nan' && (text.includes('我是') || text.includes('阮'))) {
      bonus += 0.1;
    } else if (language === 'hakka' && (text.includes('我係') || text.includes('崖'))) {
      bonus += 0.1;
    } else if (language === 'sichuan' && (text.includes('我是') || text.includes('我'))) {
      bonus += 0.1;
    } else if (language === 'zh-CN' && (text.includes('我是') || text.includes('我叫'))) {
      bonus += 0.1;
    }

    return bonus;
  }

  /**
   * 处理方言文本，转换为标准普通话
   */
  processDialectText(text, language) {
    if (language === 'zh-CN' || !this.dialectMappings[language]) {
      return text;
    }

    const mappings = this.dialectMappings[language];
    let processedText = text;

    // 替换方言词汇
    for (const [dialect, standard] of Object.entries(mappings)) {
      const regex = new RegExp(dialect, 'g');
      processedText = processedText.replace(regex, standard);
    }

    return processedText;
  }

  /**
   * 构建讯飞WebSocket URL
   */
  buildXunfeiUrl() {
    const crypto = require('crypto');
const logger = require('../utils/logger');
    const url = new URL(this.config.xunfei.endpoint);

    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${url.host}\ndate: ${date}\nGET ${url.pathname} HTTP/1.1`;

    const signatureSha = crypto
      .createHmac('sha256', this.config.xunfei.apiKey)
      .update(signatureOrigin)
      .digest('base64');

    const authorizationOrigin = `api_key="${this.config.xunfei.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    return `${url.href}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${url.host}`;
  }

  /**
   * 确保百度API访问Token有效
   */
  async ensureAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return;
    }

    const url = 'https://aip.baidubce.com/oauth/2.0/token';
    const params = {
      grant_type: 'client_credentials',
      client_id: this.config.baidu.apiKey,
      client_secret: this.config.baidu.secretKey
    };

    const response = await axios.post(url, null, { params });

    if (response.data.access_token) {
      this.accessToken = response.data.access_token;
      // Token有效期减去5分钟缓冲
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
    } else {
      throw new Error('获取百度API访问Token失败');
    }
  }

  /**
   * 语音合成（文字转语音）
   * @param {string} text - 要合成的文字
   * @param {Object} options - 合成选项
   * @returns {Promise<Buffer>} 音频数据
   */
  async synthesizeVoice(text, options = {}) {
    const {
      language = 'zh-CN',
      voice = 'female', // male, female
      speed = 1.0,
      volume = 1.0,
      format = 'mp3'
    } = options;

    try {
      // 这里可以调用不同的TTS服务
      // 示例：使用百度TTS
      await this.ensureAccessToken();

      const params = {
        tex: text,
        tok: this.accessToken,
        cuid: 'smart_village_user',
        ctp: 1,
        lan: 'zh', // 中英文混合
        per: voice === 'male' ? 3 : 4, // 发音人
        spd: Math.floor(speed * 5), // 语速
        pit: 5, // 音调
        vol: Math.floor(volume * 15), // 音量
        aue: format === 'mp3' ? 3 : 6 // 音频格式
      };

      const response = await axios.get('https://tsn.baidu.com/text2audio', {
        params,
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);

    } catch (error) {
      logger.error('语音合成错误:', error);
      throw error;
    }
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages() {
    return Object.keys(this.config.baidu.languages).map(code => ({
      code,
      name: this.getLanguageName(code)
    }));
  }

  /**
   * 获取语言名称
   */
  getLanguageName(code) {
    const names = {
      'zh-CN': '普通话',
      'yue': '粤语',
      'nan': '闽南语',
      'hakka': '客家话',
      'sichuan': '四川话'
    };
    return names[code] || code;
  }

  /**
   * 检测语言类型
   * @param {string} text - 文本
   * @returns {string} 检测到的语言代码
   */
  detectLanguage(text) {
    // 简单的语言检测逻辑
    if (text.includes('係') || text.includes('冇') || text.includes('嘅')) {
      return 'yue';
    } else if (text.includes('是') && text.includes('无') && text.includes('的')) {
      return 'nan';
    } else if (text.includes('咯') || text.includes('啥子') || text.includes('嘛')) {
      return 'sichuan';
    } else if (text.includes('佢') || text.includes('佢哋')) {
      return 'hakka';
    } else {
      return 'zh-CN';
    }
  }
}

module.exports = VoiceRecognitionService;