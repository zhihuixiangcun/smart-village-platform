/**
 * 语音识别服务
 * 集成讯飞语音识别API，支持22种方言识别
 * 提供语音转文字输入功能，具备完善的错误重试机制
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class VoiceRecognitionService {
  constructor() {
    // 讯飞API配置
    this.config = {
      appId: process.env.IFLYTEK_APP_ID,
      apiKey: process.env.IFLYTEK_API_KEY,
      apiSecret: process.env.IFLYTEK_API_SECRET,
      wsUrl: 'wss://iat-api.xfyun.cn/v2/iat',
      host: 'iat-api.xfyun.cn',
      path: '/v2/iat'
    };

    // 22种方言配置
    this.dialects = {
      'mandarin': { code: 'zh_cn', name: '普通话', accent: 'mandarin' },
      'cantonese': { code: 'zh_cn', name: '粤语', accent: 'cantonese' },
      'min-nan': { code: 'zh_cn', name: '闽南语', accent: 'lmz' },
      'hakka': { code: 'zh_cn', name: '客家话', accent: 'hx' },
      'shanghainese': { code: 'zh_cn', name: '上海话', accent: 'shanghai' },
      'sichuanese': { code: 'zh_cn', name: '四川话', accent: 'sichuan' },
      'northeastern': { code: 'zh_cn', name: '东北话', accent: 'dongbei' },
      'tianjin': { code: 'zh_cn', name: '天津话', accent: 'tianjin' },
      'henan': { code: 'zh_cn', name: '河南话', accent: 'henan' },
      'shaanxi': { code: 'zh_cn', name: '陕西话', accent: 'shaanxi' },
      'shandong': { code: 'zh_cn', name: '山东话', accent: 'shandong' },
      'jiangsu': { code: 'zh_cn', name: '江苏话', accent: 'jiangsu' },
      'anhui': { code: 'zh_cn', name: '安徽话', accent: 'anhui' },
      'hubei': { code: 'zh_cn', name: '湖北话', accent: 'hubei' },
      'hunan': { code: 'zh_cn', name: '湖南话', accent: 'hunan' },
      'jiangxi': { code: 'zh_cn', name: '江西话', accent: 'jiangxi' },
      'zhejiang': { code: 'zh_cn', name: '浙江话', accent: 'zhejiang' },
      'fujian': { code: 'zh_cn', name: '福建话', accent: 'fujian' },
      'guangdong': { code: 'zh_cn', name: '广东话', accent: 'guangdong' },
      'guangxi': { code: 'zh_cn', name: '广西话', accent: 'guangxi' },
      'yunnan': { code: 'zh_cn', name: '云南话', accent: 'yunnan' },
      'guizhou': { code: 'zh_cn', name: '贵州话', accent: 'guizhou' }
    };

    // 错误重试配置
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'network']
    };

    // 音频配置
    this.audioConfig = {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      frameSize: 1280
    };

    // 临时音频文件目录
    this.tempDir = path.join(process.cwd(), 'temp', 'audio');
    this.ensureTempDir();

    // 统计信息
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retryCount: 0,
      dialectUsage: {}
    };
  }

  /**
   * 确保临时目录存在
   */
  ensureTempDir() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      logger.error('创建临时音频目录失败:', error);
    }
  }

  /**
   * 语音转文字 - 主入口
   * @param {Buffer|string} audioData - 音频数据或文件路径
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async speechToText(audioData, options = {}) {
    const {
      dialect = 'mandarin',
      userId = 'unknown',
      enableRetry = true
    } = options;

    // 记录请求
    this.stats.totalRequests++;
    this.updateDialectUsage(dialect);

    try {
      // 如果传入的是文件路径，读取音频数据
      let bufferData = audioData;
      if (typeof audioData === 'string') {
        bufferData = await fs.promises.readFile(audioData);
      }

      // 验证音频数据
      if (!bufferData || bufferData.length === 0) {
        throw new Error('音频数据为空');
      }

      // 执行识别（带重试）
      const result = await this.recognizeWithRetry(bufferData, dialect, userId, enableRetry);

      if (result.success) {
        this.stats.successfulRequests++;
        logger.info('语音识别成功', {
          userId,
          dialect,
          text: result.text.substring(0, 50)
        });
      }

      return result;

    } catch (error) {
      this.stats.failedRequests++;
      logger.error('语音识别失败:', error);
      return {
        success: false,
        error: error.message,
        dialect
      };
    }
  }

  /**
   * 带重试机制的语音识别
   * @param {Buffer} audioData - 音频数据
   * @param {string} dialect - 方言类型
   * @param {string} userId - 用户ID
   * @param {boolean} enableRetry - 是否启用重试
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeWithRetry(audioData, dialect, userId, enableRetry) {
    let lastError = null;
    let attempt = 0;
    let retryDelay = this.retryConfig.retryDelay;

    while (attempt <= this.retryConfig.maxRetries) {
      attempt++;

      try {
        const result = await this.recognizeOnce(audioData, dialect, userId);

        if (result.success) {
          return result;
        }

        // 如果识别不成功但不是可重试的错误，直接返回
        if (!this.isRetryableError(result.error)) {
          return result;
        }

        lastError = result.error;

      } catch (error) {
        lastError = error.message;

        // 检查是否可重试
        if (!enableRetry || !this.isRetryableError(error.message)) {
          throw error;
        }
      }

      // 如果不是最后一次尝试，则等待后重试
      if (attempt <= this.retryConfig.maxRetries) {
        this.stats.retryCount++;
        logger.warn(`语音识别失败，${retryDelay}ms后进行第${attempt + 1}次重试`, {
          attempt,
          maxRetries: this.retryConfig.maxRetries,
          error: lastError
        });

        await this.delay(retryDelay);
        retryDelay *= this.retryConfig.backoffMultiplier;
      }
    }

    // 所有重试都失败
    return {
      success: false,
      error: `识别失败，已重试${this.retryConfig.maxRetries}次: ${lastError}`,
      dialect,
      attempts: attempt - 1
    };
  }

  /**
   * 单次语音识别
   * @param {Buffer} audioData - 音频数据
   * @param {string} dialect - 方言类型
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeOnce(audioData, dialect, userId) {
    return new Promise((resolve, reject) => {
      const dialectConfig = this.dialects[dialect] || this.dialects.mandarin;

      // 生成鉴权URL
      const authUrl = this.generateAuthUrl();

      // 创建WebSocket连接
      const ws = new WebSocket(authUrl);
      let recognizedText = '';
      let isComplete = false;
      let timeoutTimer = null;

      // 设置超时（30秒）
      timeoutTimer = setTimeout(() => {
        if (!isComplete) {
          ws.close();
          reject(new Error('语音识别超时'));
        }
      }, 30000);

      ws.on('open', () => {
        try {
          // 发送识别参数
          const params = {
            common: {
              app_id: this.config.appId
            },
            business: {
              language: dialectConfig.code,
              accent: dialectConfig.accent,
              domain: 'iat',
              vad_eos: 5000,
              dwa: 'wpgs',
              punc: 1,
              speex_size: 60
            },
            data: {
              status: 2, // 0: 第一帧，1: 中间帧，2: 最后一帧
              format: 'audio/L16;rate=16000',
              encoding: 'raw',
              sample_rate: this.audioConfig.sampleRate,
              audio: audioData.toString('base64'),
              audio_size: audioData.length
            }
          };

          ws.send(JSON.stringify(params));
        } catch (error) {
          clearTimeout(timeoutTimer);
          reject(error);
        }
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());

          if (response.code !== 0) {
            clearTimeout(timeoutTimer);
            reject(new Error(`讯飞API错误: ${response.message} (code: ${response.code})`));
            return;
          }

          // 提取识别文本
          if (response.data && response.data.result && response.data.result.ws) {
            const ws = response.data.result.ws;
            let segmentText = '';

            for (const item of ws) {
              if (item.cw && item.cw.length > 0) {
                segmentText += item.cw[0].w;
              }
            }

            recognizedText += segmentText;
          }

          // 检查是否完成
          if (response.data && response.data.status === 2) {
            isComplete = true;
            clearTimeout(timeoutTimer);
            ws.close();

            if (recognizedText.trim()) {
              resolve({
                success: true,
                text: recognizedText.trim(),
                dialect: dialectConfig.name,
                confidence: 0.9,
                processingTime: Date.now()
              });
            } else {
              reject(new Error('未识别到有效文本'));
            }
          }
        } catch (error) {
          clearTimeout(timeoutTimer);
          reject(error);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeoutTimer);
        reject(error);
      });

      ws.on('close', () => {
        if (!isComplete) {
          clearTimeout(timeoutTimer);
          // 如果关闭但没有完成，可能是连接问题
          if (!recognizedText) {
            reject(new Error('连接意外关闭'));
          } else {
            // 已有部分结果，返回部分结果
            isComplete = true;
            resolve({
              success: true,
              text: recognizedText.trim(),
              dialect: dialectConfig.name,
              confidence: 0.5, // 部分结果，置信度降低
              isPartial: true
            });
          }
        }
      });
    });
  }

  /**
   * 生成讯飞API鉴权URL
   * @returns {string} 带鉴权的WebSocket URL
   */
  generateAuthUrl() {
    const date = new Date().toUTCString();

    // 生成签名字符串
    const signatureOrigin = `host: ${this.config.host}\ndate: ${date}\nGET ${this.config.path} HTTP/1.1`;

    // HMAC-SHA256签名
    const signatureSha = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(signatureOrigin)
      .digest('base64');

    // 生成authorization
    const authorizationOrigin = `api_key="${this.config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');

    // 组装最终URL
    return `${this.config.wsUrl}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${this.config.host}`;
  }

  /**
   * 判断错误是否可重试
   * @param {string} errorMessage - 错误消息
   * @returns {boolean} 是否可重试
   */
  isRetryableError(errorMessage) {
    if (!errorMessage) return false;

    const errorLower = errorMessage.toLowerCase();

    // 检查是否在可重试错误列表中
    for (const retryable of this.retryConfig.retryableErrors) {
      if (errorLower.includes(retryable.toLowerCase())) {
        return true;
      }
    }

    // 检查特定的讯飞错误码
    const retryableCodes = [101, 102, 103, 104, 105]; // 讯飞API的可重试错误码
    const codeMatch = errorMessage.match(/code[:\s]+(\d+)/);
    if (codeMatch && retryableCodes.includes(parseInt(codeMatch[1]))) {
      return true;
    }

    return false;
  }

  /**
   * 更新方言使用统计
   * @param {string} dialect - 方言类型
   */
  updateDialectUsage(dialect) {
    this.stats.dialectUsage[dialect] = (this.stats.dialectUsage[dialect] || 0) + 1;
  }

  /**
   * 获取支持的方言列表
   * @returns {Array} 方言列表
   */
  getSupportedDialects() {
    return Object.entries(this.dialects).map(([key, value]) => ({
      key,
      name: value.name,
      accent: value.accent
    }));
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计数据
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0
        ? `${(this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2)}%`
        : '0%',
      averageRetries: this.stats.totalRequests > 0
        ? (this.stats.retryCount / this.stats.totalRequests).toFixed(2)
        : '0'
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retryCount: 0,
      dialectUsage: {}
    };
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} Promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理临时音频文件
   */
  async cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        // 删除超过1小时的临时文件
        if (Date.now() - stats.mtime.getTime() > 3600000) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`清理了${deletedCount}个临时音频文件`);
      }

      return { success: true, deletedCount };

    } catch (error) {
      logger.error('清理临时文件失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 健康检查
   * @returns {Promise<Object>} 健康状态
   */
  async healthCheck() {
    try {
      // 检查配置
      if (!this.config.appId || !this.config.apiKey || !this.config.apiSecret) {
        return {
          status: 'error',
          message: '讯飞API配置缺失'
        };
      }

      // 生成鉴权URL测试
      const authUrl = this.generateAuthUrl();
      if (!authUrl || !authUrl.startsWith('wss://')) {
        return {
          status: 'error',
          message: '鉴权URL生成失败'
        };
      }

      return {
        status: 'healthy',
        message: '语音识别服务正常',
        config: {
          hasAppId: !!this.config.appId,
          hasApiKey: !!this.config.apiKey,
          hasApiSecret: !!this.config.apiSecret,
          supportedDialects: Object.keys(this.dialects).length
        }
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

module.exports = VoiceRecognitionService;
