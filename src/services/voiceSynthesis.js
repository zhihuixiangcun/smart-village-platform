/**
 * 语音合成服务
 * 集成科大讯飞语音合成API，实现文字转方言语音播报
 * 支持语速、音调、音量调节，提供播放队列管理
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class VoiceSynthesisService extends EventEmitter {
  constructor() {
    super();

    // 讯飞API配置
    this.config = {
      appId: process.env.IFLYTEK_APP_ID,
      apiKey: process.env.IFLYTEK_API_KEY,
      apiSecret: process.env.IFLYTEK_API_SECRET,
      wsUrl: 'wss://tts-api.xfyun.cn/v2/tts',
      host: 'tts-api.xfyun.cn',
      path: '/v2/tts'
    };

    // 音色配置
    this.voices = {
      // 普通话
      mandarin: {
        male: { name: 'xiaoyan', gender: 'male', accent: 'mandarin' },
        female: { name: 'xiaofeng', gender: 'female', accent: 'mandarin' },
        elderly: { name: 'xiaoqi', gender: 'female', accent: 'mandarin' },
        child: { name: 'xiaoqi', gender: 'male', accent: 'mandarin' }
      },
      // 粤语
      cantonese: {
        male: { name: 'xiaowei', gender: 'male', accent: 'cantonese' },
        female: { name: 'xiaomei', gender: 'female', accent: 'cantonese' }
      },
      // 东北话
      northeastern: {
        male: { name: 'xiaohai', gender: 'male', accent: 'dongbei' },
        female: { name: 'xiaoxin', gender: 'female', accent: 'dongbei' }
      },
      // 四川话
      sichuanese: {
        male: { name: 'xiaolong', gender: 'male', accent: 'sichuan' },
        female: { name: 'xiaoyu', gender: 'female', accent: 'sichuan' }
      }
    };

    // 音频格式配置
    this.audioFormats = {
      mp3: { encoding: 'mp3', aue: 3 },
      wav: { encoding: 'wav', aue: 6 },
      pcm: { encoding: 'raw', aue: 1 }
    };

    // 播放队列管理
    this.queue = {
      items: [],
      isPlaying: false,
      currentItem: null,
      currentIndex: 0,
      paused: false
    };

    // 缓存配置
    this.cache = new Map();
    this.cacheConfig = {
      maxSize: 1000,
      ttl: 3600000 // 1小时
    };

    // 统计信息
    this.stats = {
      totalSyntheses: 0,
      successfulSyntheses: 0,
      failedSyntheses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      queueProcessed: 0,
      totalSynthesisTime: 0,
      voiceUsage: {}
    };

    // 临时音频文件目录
    this.tempDir = path.join(process.cwd(), 'temp', 'synthesis');
    this.ensureTempDir();

    // 缓存定时清理
    this.startCacheCleanup();
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
   * 生成API鉴权URL
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
   * 文字转语音 - 主入口
   * @param {string} text - 待合成文本
   * @param {Object} options - 合成选项
   * @returns {Promise<Object>} 合成结果
   */
  async synthesize(text, options = {}) {
    const {
      voice = 'mandarin',
      gender = 'female',
      speed = 50,
      pitch = 50,
      volume = 50,
      emotion = 'neutral',
      format = 'mp3',
      sampleRate = 16000,
      enableCache = true
    } = options;

    // 参数验证
    if (!text || text.trim().length === 0) {
      throw new Error('合成文本不能为空');
    }

    if (text.length > 10000) {
      throw new Error('合成文本长度不能超过10000个字符');
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(text, { voice, gender, speed, pitch, volume, emotion, format });

    // 检查缓存
    if (enableCache && this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      logger.info('语音合成缓存命中', { text: text.substring(0, 50) });
      return {
        success: true,
        audioData: this.cache.get(cacheKey),
        fromCache: true,
        text
      };
    }

    this.stats.cacheMisses++;
    this.stats.totalSyntheses++;

    // 记录音色使用
    const voiceKey = `${voice}_${gender}`;
    this.stats.voiceUsage[voiceKey] = (this.stats.voiceUsage[voiceKey] || 0) + 1;

    try {
      const startTime = Date.now();

      // 执行语音合成
      const audioBuffer = await this.synthesizeOnce(text, {
        voice,
        gender,
        speed,
        pitch,
        volume,
        emotion,
        format,
        sampleRate
      });

      const synthesisTime = Date.now() - startTime;
      this.stats.totalSynthesisTime += synthesisTime;

      // 缓存结果
      if (enableCache) {
        this.cache.set(cacheKey, audioBuffer);
        this.manageCacheSize();
      }

      this.stats.successfulSyntheses++;

      // 发出事件
      this.emit('synthesis-complete', {
        text,
        voice,
        gender,
        duration: synthesisTime,
        audioLength: audioBuffer.length
      });

      logger.info('语音合成成功', {
        text: text.substring(0, 50),
        voice,
        gender,
        duration: synthesisTime
      });

      return {
        success: true,
        audioData: audioBuffer,
        text,
        format,
        duration: synthesisTime,
        audioSize: audioBuffer.length
      };

    } catch (error) {
      this.stats.failedSyntheses++;

      logger.error('语音合成失败:', {
        text: text.substring(0, 50),
        error: error.message
      });

      this.emit('synthesis-error', {
        text,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 单次语音合成
   * @param {string} text - 待合成文本
   * @param {Object} options - 合成选项
   * @returns {Promise<Buffer>} 音频数据
   */
  async synthesizeOnce(text, options) {
    return new Promise((resolve, reject) => {
      const {
        voice = 'mandarin',
        gender = 'female',
        speed = 50,
        pitch = 50,
        volume = 50,
        emotion = 'neutral',
        format = 'mp3',
        sampleRate = 16000
      } = options;

      // 获取音色配置
      const voiceConfig = this.voices[voice]?.[gender] || this.voices.mandarin.female;
      const formatConfig = this.audioFormats[format] || this.audioFormats.mp3;

      // 生成鉴权URL
      const authUrl = this.generateAuthUrl();

      // 创建WebSocket连接
      const ws = new WebSocket(authUrl);
      let audioData = Buffer.alloc(0);
      let timeoutTimer = null;

      // 设置超时（30秒）
      timeoutTimer = setTimeout(() => {
        ws.close();
        reject(new Error('语音合成超时'));
      }, 30000);

      ws.on('open', () => {
        try {
          // 构建合成参数
          const params = {
            common: {
              app_id: this.config.appId
            },
            business: {
              aue: formatConfig.aue,
              auf: `audio/L16;rate=${sampleRate}`,
              vcn: voiceConfig.name,
              speed,
              pitch,
              volume,
              tte: 'UTF8',
              ent: emotion
            },
            data: {
              status: 2, // 一次性合成
              text: Buffer.from(text, 'utf8').toString('base64')
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

          // 接收音频数据
          if (response.data && response.data.audio) {
            const audioChunk = Buffer.from(response.data.audio, 'base64');
            audioData = Buffer.concat([audioData, audioChunk]);
          }

          // 检查是否完成
          if (response.data && response.data.status === 2) {
            clearTimeout(timeoutTimer);
            ws.close();

            if (audioData.length > 0) {
              resolve(audioData);
            } else {
              reject(new Error('语音合成为空'));
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
        clearTimeout(timeoutTimer);
      });
    });
  }

  /**
   * 生成缓存键
   * @param {string} text - 合成文本
   * @param {Object} options - 合成选项
   * @returns {string} 缓存键
   */
  generateCacheKey(text, options) {
    const textHash = crypto
      .createHash('md5')
      .update(text)
      .digest('hex');

    const optionsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(options))
      .digest('hex');

    return `${textHash}_${optionsHash}`;
  }

  /**
   * 管理缓存大小
   */
  manageCacheSize() {
    if (this.cache.size > this.cacheConfig.maxSize) {
      // 删除最旧的缓存项（FIFO）
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        logger.debug('删除缓存项:', firstKey);
      }
    }
  }

  /**
   * 定期清理过期缓存
   */
  startCacheCleanup() {
    // 每小时清理一次
    setInterval(() => {
      this.clearExpiredCache();
    }, this.cacheConfig.ttl);
  }

  /**
   * 清理过期缓存
   */
  clearExpiredCache() {
    const beforeSize = this.cache.size;
    this.cache.clear();
    const afterSize = this.cache.size;

    if (beforeSize > 0) {
      logger.info('清理语音合成缓存', {
        before: beforeSize,
        after: afterSize
      });
    }
  }

  /**
   * ============ 播放队列管理 ============
   */

  /**
   * 添加合成任务到队列
   * @param {string} text - 待合成文本
   * @param {Object} options - 合成选项
   * @param {number} priority - 优先级（数字越大优先级越高）
   * @returns {Promise<Object>} 队列任务ID
   */
  async addToQueue(text, options = {}, priority = 0) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task = {
      id: taskId,
      text,
      options,
      priority,
      status: 'pending',
      createdAt: new Date(),
      result: null,
      error: null
    };

    // 按优先级插入队列
    const insertIndex = this.queue.items.findIndex(
      item => item.priority < priority
    );

    if (insertIndex === -1) {
      this.queue.items.push(task);
    } else {
      this.queue.items.splice(insertIndex, 0, task);
    }

    this.emit('queue-item-added', { taskId, queueLength: this.queue.items.length });

    logger.info('添加合成任务到队列', {
      taskId,
      text: text.substring(0, 50),
      priority,
      queueLength: this.queue.items.length
    });

    // 如果队列未播放，开始处理
    if (!this.queue.isPlaying && !this.queue.paused) {
      this.processQueue();
    }

    return taskId;
  }

  /**
   * 处理播放队列
   */
  async processQueue() {
    if (this.queue.isPlaying || this.queue.paused) {
      return;
    }

    if (this.queue.items.length === 0) {
      this.emit('queue-empty');
      return;
    }

    this.queue.isPlaying = true;
    this.queue.currentItem = this.queue.items[this.queue.currentIndex];

    while (this.queue.currentIndex < this.queue.items.length) {
      const task = this.queue.items[this.queue.currentIndex];

      try {
        task.status = 'processing';
        this.emit('queue-item-start', { taskId: task.id });

        logger.info('开始处理队列任务', {
          taskId: task.id,
          text: task.text.substring(0, 50)
        });

        // 执行合成
        const result = await this.synthesize(task.text, task.options);

        task.status = 'completed';
        task.result = result;
        this.queue.queueProcessed++;

        this.emit('queue-item-complete', {
          taskId: task.id,
          result
        });

        logger.info('队列任务完成', {
          taskId: task.id,
          duration: result.duration
        });

        // 短暂延迟（避免API速率限制）
        await this.delay(100);

      } catch (error) {
        task.status = 'failed';
        task.error = error.message;

        this.emit('queue-item-error', {
          taskId: task.id,
          error: error.message
        });

        logger.error('队列任务失败', {
          taskId: task.id,
          error: error.message
        });
      }

      this.queue.currentIndex++;

      // 检查是否暂停
      if (this.queue.paused) {
        this.queue.isPlaying = false;
        this.emit('queue-paused', { currentIndex: this.queue.currentIndex });
        return;
      }
    }

    // 队列处理完成
    this.queue.isPlaying = false;
    this.queue.currentItem = null;
    this.emit('queue-complete', { processedCount: this.queue.queueProcessed });

    logger.info('播放队列处理完成', {
      totalProcessed: this.queue.queueProcessed
    });
  }

  /**
   * 暂停队列
   */
  pauseQueue() {
    if (!this.queue.isPlaying) {
      throw new Error('队列未在播放');
    }

    this.queue.paused = true;
    this.emit('queue-paused', { currentIndex: this.queue.currentIndex });

    logger.info('暂停播放队列', {
      currentIndex: this.queue.currentIndex,
      remainingItems: this.queue.items.length - this.queue.currentIndex
    });
  }

  /**
   * 恢复队列
   */
  resumeQueue() {
    if (!this.queue.paused) {
      throw new Error('队列未暂停');
    }

    this.queue.paused = false;
    this.emit('queue-resumed', { currentIndex: this.queue.currentIndex });

    logger.info('恢复播放队列', {
      currentIndex: this.queue.currentIndex
    });

    this.processQueue();
  }

  /**
   * 跳过当前任务
   */
  skipCurrent() {
    if (!this.queue.isPlaying) {
      throw new Error('队列未在播放');
    }

    this.queue.currentIndex++;
    this.emit('queue-item-skipped', { currentIndex: this.queue.currentIndex });

    logger.info('跳过当前任务', {
      currentIndex: this.queue.currentIndex
    });
  }

  /**
   * 清空队列
   */
  clearQueue() {
    const itemCount = this.queue.items.length;

    this.queue.items = [];
    this.queue.currentIndex = 0;
    this.queue.paused = false;
    this.queue.isPlaying = false;
    this.queue.currentItem = null;

    this.emit('queue-cleared', { itemCount });

    logger.info('清空播放队列', { itemCount });
  }

  /**
   * 获取队列状态
   * @returns {Object} 队列状态
   */
  getQueueStatus() {
    return {
      totalItems: this.queue.items.length,
      currentIndex: this.queue.currentIndex,
      remainingItems: this.queue.items.length - this.queue.currentIndex,
      isPlaying: this.queue.isPlaying,
      isPaused: this.queue.paused,
      currentItem: this.queue.currentItem ? {
        id: this.queue.currentItem.id,
        text: this.queue.currentItem.text.substring(0, 100),
        status: this.queue.currentItem.status
      } : null,
      queueStats: {
        pending: this.queue.items.filter(i => i.status === 'pending').length,
        processing: this.queue.items.filter(i => i.status === 'processing').length,
        completed: this.queue.items.filter(i => i.status === 'completed').length,
        failed: this.queue.items.filter(i => i.status === 'failed').length
      }
    };
  }

  /**
   * 批量合成（添加到队列）
   * @param {Array} texts - 待合成文本列表
   * @param {Object} options - 合成选项
   * @param {number} priority - 优先级
   * @returns {Promise<Array>} 任务ID列表
   */
  async batchSynthesize(texts, options = {}, priority = 0) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('批量合成的文本列表不能为空');
    }

    if (texts.length > 100) {
      throw new Error('批量合成最多支持100个文本');
    }

    const taskIds = [];

    for (const text of texts) {
      const taskId = await this.addToQueue(text, options, priority);
      taskIds.push(taskId);
    }

    logger.info('批量合成任务已添加', {
      count: texts.length,
      priority,
      firstTaskId: taskIds[0]
    });

    return taskIds;
  }

  /**
   * 获取支持的音色列表
   * @returns {Array} 音色列表
   */
  getSupportedVoices() {
    const voices = [];

    Object.entries(this.voices).forEach(([language, genders]) => {
      Object.entries(genders).forEach(([gender, config]) => {
        voices.push({
          language,
          gender,
          name: config.name,
          displayName: `${language}_${gender}`,
          accent: config.accent
        });
      });
    });

    return voices;
  }

  /**
   * 获取支持的音频格式
   * @returns {Array} 格式列表
   */
  getSupportedFormats() {
    return Object.entries(this.audioFormats).map(([format, config]) => ({
      format,
      encoding: config.encoding,
      aue: config.aue
    }));
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计数据
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalSyntheses > 0
        ? `${(this.stats.successfulSyntheses / this.stats.totalSyntheses * 100).toFixed(2)}%`
        : '0%',
      averageSynthesisTime: this.stats.successfulSyntheses > 0
        ? `${(this.stats.totalSynthesisTime / this.stats.successfulSyntheses / 1000).toFixed(2)}s`
        : '0s',
      cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
        ? `${(this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2)}%`
        : '0%',
      cacheSize: this.cache.size,
      cacheMaxSize: this.cacheConfig.maxSize,
      queueStatus: this.getQueueStatus()
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalSyntheses: 0,
      successfulSyntheses: 0,
      failedSyntheses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      queueProcessed: 0,
      totalSynthesisTime: 0,
      voiceUsage: {}
    };
  }

  /**
   * 保存音频到文件
   * @param {Buffer} audioData - 音频数据
   * @param {string} filename - 文件名
   * @param {string} format - 音频格式
   * @returns {Promise<string>} 文件路径
   */
  async saveToFile(audioData, filename, format = 'mp3') {
    try {
      const filepath = path.join(this.tempDir, `${filename}.${format}`);
      await fs.promises.writeFile(filepath, audioData);

      logger.info('音频文件已保存', { filepath, size: audioData.length });

      return filepath;
    } catch (error) {
      logger.error('保存音频文件失败:', error);
      throw error;
    }
  }

  /**
   * 清理临时音频文件
   */
  async cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      let deletedCount = 0;
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        // 删除超过1小时的临时文件
        if (now - stats.mtime.getTime() > 3600000) {
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

      // 检查临时目录
      if (!fs.existsSync(this.tempDir)) {
        return {
          status: 'warning',
          message: '临时音频目录不存在'
        };
      }

      return {
        status: 'healthy',
        message: '语音合成服务正常',
        config: {
          hasAppId: !!this.config.appId,
          hasApiKey: !!this.config.apiKey,
          hasApiSecret: !!this.config.apiSecret,
          supportedVoices: Object.keys(this.voices).length,
          supportedFormats: Object.keys(this.audioFormats).length,
          cacheEnabled: true,
          cacheSize: this.cache.size,
          queueEnabled: true,
          queueStatus: this.getQueueStatus()
        }
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
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
   * 销毁服务
   */
  destroy() {
    this.cache.clear();
    this.queue.items = [];
    this.queue.isPlaying = false;
    this.removeAllListeners();

    logger.info('语音合成服务已销毁');
  }
}

module.exports = VoiceSynthesisService;
