/**
 * 方言语音服务
 * 集成科大讯飞语音识别和合成，支持22种方言识别
 * 提供语音转文字、文字转语音、方言检测等功能
 */

const crypto = require('crypto');
const WebSocket = require('ws');
const EventEmitter = require('events');
const logger = require('../config/logger');

class DialectSpeechService extends EventEmitter {
  constructor() {
    super();

    // 科大讯飞API配置
    this.config = {
      appId: process.env.IFLYTEK_APP_ID,
      apiKey: process.env.IFLYTEK_API_KEY,
      apiSecret: process.env.IFLYTEK_API_SECRET,
      wsUrl: 'wss://iat-api.xfyun.cn/v2/iat',
      ttsUrl: 'wss://tts-api.xfyun.cn/v2/tts',
      hostUrl: 'iat-api.xfyun.cn'
    };

    // 支持的方言配置
    this.dialects = {
      // 中文方言
      mandarin: { code: 'zh_cn', name: '普通话', region: 'mainland' },
      cantonese: { code: 'zh_cn', name: '粤语', region: 'hongkong', accent: 'cantonese' },
      shanghainese: { code: 'zh_cn', name: '上海话', region: 'mainland', accent: 'shanghai' },
      sichuanese: { code: 'zh_cn', name: '四川话', region: 'mainland', accent: 'sichuan' },
      northeastern: { code: 'zh_cn', name: '东北话', region: 'mainland', accent: 'dongbei' },
      hunanese: { code: 'zh_cn', name: '湖南话', region: 'mainland', accent: 'hunan' },
      fujianese: { code: 'zh_cn', name: '福建话', region: 'mainland', accent: 'fujian' },
      shandongese: { code: 'zh_cn', name: '山东话', region: 'mainland', accent: 'shandong' },
      guangdongese: { code: 'zh_cn', name: '广东话', region: 'mainland', accent: 'guangdong' },
      jiangsuese: { code: 'zh_cn', name: '江苏话', region: 'mainland', accent: 'jiangsu' },
      zhejiangese: { code: 'zh_cn', name: '浙江话', region: 'mainland', accent: 'zhejiang' },
      hubeiese: { code: 'zh_cn', name: '湖北话', region: 'mainland', accent: 'hubei' },
      shaanxiese: { code: 'zh_cn', name: '陕西话', region: 'mainland', accent: 'shaanxi' },
      yunnanese: { code: 'zh_cn', name: '云南话', region: 'mainland', accent: 'yunnan' },
      guizhounese: { code: 'zh_cn', name: '贵州话', region: 'mainland', accent: 'guizhou' },
      anhui: { code: 'zh_cn', name: '安徽话', region: 'mainland', accent: 'anhui' },
      jiangxiese: { code: 'zh_cn', name: '江西话', region: 'mainland', accent: 'jiangxi' },
      henanese: { code: 'zh_cn', name: '河南话', region: 'mainland', accent: 'henan' },
      hebei: { code: 'zh_cn', name: '河北话', region: 'mainland', accent: 'hebei' },
      shanxi: { code: 'zh_cn', name: '山西话', region: 'mainland', accent: 'shanxi' },
      tianjin: { code: 'zh_cn', name: '天津话', region: 'mainland', accent: 'tianjin' },
      chongqing: { code: 'zh_cn', name: '重庆话', region: 'mainland', accent: 'chongqing' },

      // 少数民族语言
      tibetan: { code: 'bo_cn', name: '藏语', region: 'tibet' },
      mongolian: { code: 'mn_cn', name: '蒙古语', region: 'mongolia' },
      uyghur: { code: 'ug_cn', name: '维吾尔语', region: 'xinjiang' },
      kazakh: { code: 'kk_cn', name: '哈萨克语', region: 'xinjiang' }
    };

    // 语音合成配置
    this.ttsVoices = {
      mandarin: {
        speaker: 'xiaoyan',
        speed: 50,
        pitch: 50,
        volume: 50,
        emotion: 'neutral'
      },
      cantonese: {
        speaker: 'xiaoyan',
        speed: 45,
        pitch: 50,
        volume: 50,
        emotion: 'neutral',
        accent: 'cantonese'
      },
      elderly: {
        speaker: 'xiaoqi',
        speed: 40,
        pitch: 45,
        volume: 60,
        emotion: 'gentle'
      },
      child: {
        speaker: 'xiaofeng',
        speed: 55,
        pitch: 60,
        volume: 50,
        emotion: 'happy'
      }
    };

    // 当前会话状态
    this.currentSession = null;
    this.isRecording = false;
    this.isProcessing = false;

    // 音频处理配置
    this.audioConfig = {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      frameSize: 1280,
      silenceThreshold: 0.01,
      silenceTimeout: 2000
    };

    // 缓存和统计
    this.cache = new Map();
    this.stats = {
      totalRecognitions: 0,
      successfulRecognitions: 0,
      totalSyntheses: 0,
      successfulSyntheses: 0,
      dialectDistribution: {}
    };
  }

  /**
   * 生成API鉴权URL
   * @param {string} url - API URL
   * @param {string} method - HTTP方法
   * @returns {string} 带鉴权的URL
   */
  generateAuthUrl(url, method = 'GET') {
    const urlObj = new URL(url);
    const { host, pathname, search } = urlObj;

    // 生成日期
    const date = new Date().toUTCString();

    // 生成签名字符串
    const signatureOrigin = `${method}\n${pathname}${search}\nhost: ${host}\ndate: ${date}\n`;
    const signatureSha = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    // 生成authorization
    const authorizationOrigin = `api_key="${this.config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    // 组装最终URL
    return `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
  }

  /**
   * 检测方言类型
   * @param {Buffer} audioData - 音频数据
   * @returns {Promise<Object>} 方言检测结果
   */
  async detectDialect(audioData) {
    try {
      const url = this.generateAuthUrl(`${this.config.wsUrl}/detect`);

      const response = await new Promise((resolve, reject) => {
        const ws = new WebSocket(url);

        ws.on('open', () => {
          const params = {
            common: {
              app_id: this.config.appId
            },
            business: {
              language: 'zh_cn',
              dialect: 'auto',
              accent: 'auto',
              domain: 'iat',
              vad_eos: 5000
            },
            data: {
              status: 2,
              encoding: 'raw',
              data_type: 1,
              data: audioData.toString('base64')
            }
          };
          ws.send(JSON.stringify(params));
        });

        ws.on('message', (data) => {
          const result = JSON.parse(data.toString());
          if (result.code === 0) {
            resolve(result);
          } else {
            reject(new Error(result.message || '方言检测失败'));
          }
        });

        ws.on('error', reject);
        ws.on('close', () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      });

      const detectedDialect = this.mapDialectFromResponse(response);

      // 更新统计
      if (detectedDialect) {
        this.stats.dialectDistribution[detectedDialect] =
          (this.stats.dialectDistribution[detectedDialect] || 0) + 1;
      }

      return {
        success: true,
        dialect: detectedDialect,
        confidence: response.confidence || 0,
        alternatives: response.ws || []
      };

    } catch (error) {
      logger.error('方言检测失败:', error);
      return {
        success: false,
        error: error.message,
        dialect: 'mandarin', // 默认返回普通话
        confidence: 0
      };
    }
  }

  /**
   * 语音识别（支持方言）
   * @param {Buffer|Stream} audioData - 音频数据
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeSpeech(audioData, options = {}) {
    try {
      const {
        dialect = 'mandarin',
        accent = null,
        domain = 'iat',
        proficiency = 1,
        useCache = true
      } = options;

      // 缓存检查
      const cacheKey = this.generateCacheKey(audioData, { dialect, accent, domain });
      if (useCache && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      this.isProcessing = true;
      this.stats.totalRecognitions++;

      // 检测方言（如果指定为自动检测）
      let detectedDialect = dialect;
      if (dialect === 'auto') {
        const detection = await this.detectDialect(audioData);
        detectedDialect = detection.success ? detection.dialect : 'mandarin';
      }

      // 获取方言配置
      const dialectConfig = this.dialects[detectedDialect] || this.dialects.mandarian;

      // 进行语音识别
      const url = this.generateAuthUrl(this.config.wsUrl);

      const result = await new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        let recognizedText = '';
        let isEnd = false;

        ws.on('open', () => {
          // 发送识别参数
          const params = {
            common: {
              app_id: this.config.appId
            },
            business: {
              language: dialectConfig.code,
              dialect: dialectConfig.region || 'mainland',
              accent: accent || dialectConfig.accent,
              domain,
              proficiency,
              vad_eos: 3000,
              speech_timeout: 10000,
              punctuation: 1,
              result_type: 'plain'
            },
            data: {
              status: 2,
              encoding: 'raw',
              sample_rate: this.audioConfig.sampleRate,
              channels: this.audioConfig.channels,
              data_type: 1,
              data: audioData.toString('base64')
            }
          };
          ws.send(JSON.stringify(params));
        });

        ws.on('message', (data) => {
          const response = JSON.parse(data.toString());

          if (response.code === 0) {
            if (response.ws && response.ws.length > 0) {
              response.ws.forEach(wsItem => {
                if (wsItem.cw && wsItem.cw.length > 0) {
                  recognizedText += wsItem.cw.map(cw => cw.w).join('');
                }
              });
            }

            if (response.data && response.data.status === 2) {
              isEnd = true;
              ws.close();
            }
          } else {
            reject(new Error(response.message || '语音识别失败'));
          }
        });

        ws.on('error', reject);
        ws.on('close', () => {
          if (!isEnd) {
            reject(new Error('连接意外关闭'));
          }
        });
      });

      const response = {
        success: true,
        text: recognizedText,
        dialect: detectedDialect,
        confidence: this.calculateConfidence(result),
        processingTime: Date.now() - this.startTime,
        audioLength: audioData.length / (this.audioConfig.sampleRate * 2)
      };

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, response);

        // 限制缓存大小
        if (this.cache.size > 1000) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      this.stats.successfulRecognitions++;
      this.isProcessing = false;

      // 发出事件
      this.emit('recognition-complete', response);

      return response;

    } catch (error) {
      logger.error('语音识别失败:', error);
      this.isProcessing = false;

      const response = {
        success: false,
        error: error.message,
        text: '',
        dialect,
        confidence: 0
      };

      this.emit('recognition-error', response);
      return response;
    }
  }

  /**
   * 语音合成（支持方言）
   * @param {string} text - 待合成文本
   * @param {Object} options - 合成选项
   * @returns {Promise<Buffer>} 音频数据
   */
  async synthesizeSpeech(text, options = {}) {
    try {
      const {
        voice = 'mandarin',
        speed = 50,
        pitch = 50,
        volume = 50,
        emotion = 'neutral',
        format = 'mp3'
      } = options;

      this.stats.totalSyntheses++;

      // 获取语音配置
      const voiceConfig = { ...this.ttsVoices[voice], options };

      const url = this.generateAuthUrl(this.config.ttsUrl);

      const audioBuffer = await new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        let audioData = Buffer.alloc(0);

        ws.on('open', () => {
          const params = {
            common: {
              app_id: this.config.appId
            },
            business: {
              aue: format === 'mp3' ? 3 : 6, // 3:mp3, 6:wav
              auf: 'audio/L16;rate=16000',
              vcn: voiceConfig.speaker,
              speed: voiceConfig.speed || speed,
              pitch: voiceConfig.pitch || pitch,
              volume: voiceConfig.volume || volume,
              tte: 'UTF8',
              ent: voiceConfig.emotion || emotion,
              pitch_shift: voiceConfig.pitchShift || 0
            },
            data: {
              status: 2,
              text: Buffer.from(text, 'utf8').toString('base64')
            }
          };
          ws.send(JSON.stringify(params));
        });

        ws.on('message', (data) => {
          const response = JSON.parse(data.toString());

          if (response.code === 0) {
            if (response.data && response.data.audio) {
              const audioChunk = Buffer.from(response.data.audio, 'base64');
              audioData = Buffer.concat([audioData, audioChunk]);
            }

            if (response.data && response.data.status === 2) {
              ws.close();
            }
          } else {
            reject(new Error(response.message || '语音合成失败'));
          }
        });

        ws.on('error', reject);
        ws.on('close', () => {
          resolve(audioData);
        });
      });

      this.stats.successfulSyntheses++;

      // 发出事件
      this.emit('synthesis-complete', { text, audioData: audioBuffer, voice });

      return audioBuffer;

    } catch (error) {
      logger.error('语音合成失败:', error);
      this.emit('synthesis-error', { text, error: error.message });
      throw error;
    }
  }

  /**
   * 实时语音识别
   * @param {Object} options - 识别选项
   * @returns {EventEmitter} 实时识别事件
   */
  startRealTimeRecognition(options = {}) {
    if (this.currentSession) {
      throw new Error('已有进行中的识别会话');
    }

    const {
      dialect = 'mandarin',
      interimResults = true,
      silenceTimeout = 2000
    } = options;

    this.isRecording = true;
    this.currentSession = new EventEmitter();

    // 启动WebSocket连接
    const url = this.generateAuthUrl(this.config.wsUrl);
    const ws = new WebSocket(url);
    let silenceTimer = null;
    let partialText = '';

    ws.on('open', () => {
      const dialectConfig = this.dialects[dialect] || this.dialects.mandarin;

      const params = {
        common: {
          app_id: this.config.appId
        },
        business: {
          language: dialectConfig.code,
          dialect: dialectConfig.region || 'mainland',
          accent: dialectConfig.accent,
          domain: 'iat',
          vad_eos: silenceTimeout,
          punctuation: 1,
          result_type: 'plain'
        }
      };
      ws.send(JSON.stringify(params));

      this.currentSession.emit('start', { dialect, ws });
    });

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());

      if (response.code === 0) {
        if (response.ws && response.ws.length > 0) {
          let segmentText = '';
          response.ws.forEach(wsItem => {
            if (wsItem.cw && wsItem.cw.length > 0) {
              segmentText += wsItem.cw.map(cw => cw.w).join('');
            }
          });

          if (interimResults && response.snf !== undefined && response.snf !== 0) {
            // 临时结果
            this.currentSession.emit('interim-result', {
              text: partialText + segmentText,
              isFinal: false
            });
          } else {
            // 最终结果
            partialText += segmentText;
            this.currentSession.emit('final-result', {
              text: partialText,
              isFinal: true
            });
          }
        }

        // 重置静音检测
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        silenceTimer = setTimeout(() => {
          this.stopRealTimeRecognition();
        }, silenceTimeout);
      } else {
        this.currentSession.emit('error', new Error(response.message));
      }
    });

    ws.on('error', (error) => {
      this.currentSession.emit('error', error);
    });

    ws.on('close', () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      if (this.isRecording) {
        this.currentSession.emit('end');
      }
    });

    // 提供发送音频数据的方法
    this.currentSession.sendAudio = (audioData) => {
      if (ws.readyState === WebSocket.OPEN && this.isRecording) {
        const params = {
          data: {
            status: 0,
            encoding: 'raw',
            sample_rate: this.audioConfig.sampleRate,
            channels: this.audioConfig.channels,
            data_type: 1,
            data: audioData.toString('base64')
          }
        };
        ws.send(JSON.stringify(params));
      }
    };

    return this.currentSession;
  }

  /**
   * 停止实时识别
   */
  stopRealTimeRecognition() {
    if (this.currentSession && this.isRecording) {
      this.isRecording = false;

      // 发送结束标记
      const ws = this.currentSession.ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        const params = {
          data: {
            status: 2,
            encoding: 'raw',
            sample_rate: this.audioConfig.sampleRate,
            channels: this.audioConfig.channels,
            data_type: 1,
            data: ''
          }
        };
        ws.send(JSON.stringify(params));
      }

      this.currentSession.emit('end');
      this.currentSession = null;
    }
  }

  /**
   * 方言翻译
   * @param {string} text - 源文本
   * @param {string} fromDialect - 源方言
   * @param {string} toDialect - 目标方言
   * @returns {Promise<string>} 翻译结果
   */
  async translateDialect(text, fromDialect, toDialect) {
    try {
      // 这里可以集成翻译API或使用预定义的方言词典
      // 简化实现，返回原文
      logger.info(`方言翻译: ${fromDialect} -> ${toDialect}`, { text });

      // 实际实现中可以：
      // 1. 使用本地方言词典
      // 2. 调用翻译API
      // 3. 使用大语言模型进行方言转换

      return text;
    } catch (error) {
      logger.error('方言翻译失败:', error);
      return text;
    }
  }

  /**
   * 获取支持的方言列表
   * @returns {Array} 方言列表
   */
  getSupportedDialects() {
    return Object.entries(this.dialects).map(([key, value]) => ({
      key,
      name: value.name,
      code: value.code,
      region: value.region,
      accent: value.accent
    }));
  }

  /**
   * 获取使用统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRecognitions > 0
        ? `${(this.stats.successfulRecognitions / this.stats.totalRecognitions * 100).toFixed(2)  }%`
        : '0%',
      cacheSize: this.cache.size,
      isRecording: this.isRecording,
      isProcessing: this.isProcessing
    };
  }

  /**
   * 生成缓存键
   * @param {Buffer} audioData - 音频数据
   * @param {Object} options - 选项
   * @returns {string} 缓存键
   */
  generateCacheKey(audioData, options) {
    const audioHash = crypto
      .createHash('md5')
      .update(audioData)
      .digest('hex');

    const optionsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(options))
      .digest('hex');

    return `${audioHash}_${optionsHash}`;
  }

  /**
   * 映射方言响应
   * @param {Object} response - API响应
   * @returns {string} 方言键
   */
  mapDialectFromResponse(response) {
    // 根据API响应映射到方言键
    if (response.language === 'zh_cn') {
      if (response.dialect === 'cantonese') return 'cantonese';
      if (response.accent) {
        return Object.keys(this.dialects).find(key =>
          this.dialects[key].accent === response.accent
        ) || 'mandarin';
      }
    }

    return 'mandarin';
  }

  /**
   * 计算置信度
   * @param {Object} result - 识别结果
   * @returns {number} 置信度 (0-1)
   */
  calculateConfidence(result) {
    // 简化实现，返回默认置信度
    // 实际中可以根据API响应中的置信度字段计算
    return 0.85;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
    logger.info('语音服务缓存已清理');
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalRecognitions: 0,
      successfulRecognitions: 0,
      totalSyntheses: 0,
      successfulSyntheses: 0,
      dialectDistribution: {}
    };
  }
}

module.exports = DialectSpeechService;