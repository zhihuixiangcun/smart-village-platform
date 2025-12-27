/**
 * AI语音识别服务
 * 支持22种中文方言识别和语音合成
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class VoiceService {
  constructor() {
    // 百度语音识别配置
    this.baiduConfig = {
      appId: process.env.BAIDU_APP_ID,
      apiKey: process.env.BAIDU_API_KEY,
      secretKey: process.env.BAIDU_SECRET_KEY,
      asrUrl: process.env.BAIDU_ASR_URL || 'https://vop.baidu.com/server_api',
      ttsUrl: process.env.BAIDU_TTS_URL || 'https://tsn.baidu.com/text2audio'
    };

    // 支持的方言列表
    this.dialects = {
      'mandarin': { name: '普通话', code: 1537, lang: 'zh' },
      'yue': { name: '粤语', code: 1637, lang: 'zh' },
      'hakka': { name: '客家话', code: 1637, lang: 'zh' },
      'min-nan': { name: '闽南语', code: 1637, lang: 'zh' },
      'shanghainese': { name: '上海话', code: 1637, lang: 'zh' },
      'sichuanese': { name: '四川话', code: 1637, lang: 'zh' },
      'northeastern': { name: '东北话', code: 1637, lang: 'zh' },
      'tianjin': { name: '天津话', code: 1637, lang: 'zh' },
      'henan': { name: '河南话', code: 1637, lang: 'zh' },
      'shaanxi': { name: '陕西话', code: 1637, lang: 'zh' },
      'shandong': { name: '山东话', code: 1637, lang: 'zh' },
      'jiangsu': { name: '江苏话', code: 1637, lang: 'zh' },
      'anhui': { name: '安徽话', code: 1637, lang: 'zh' },
      'hubei': { name: '湖北话', code: 1637, lang: 'zh' },
      'hunan': { name: '湖南话', code: 1637, lang: 'zh' },
      'jiangxi': { name: '江西话', code: 1637, lang: 'zh' },
      'zhejiang': { name: '浙江话', code: 1637, lang: 'zh' },
      'fujian': { name: '福建话', code: 1637, lang: 'zh' },
      'guangdong': { name: '广东话', code: 1637, lang: 'zh' },
      'guangxi': { name: '广西话', code: 1637, lang: 'zh' },
      'yunnan': { name: '云南话', code: 1637, lang: 'zh' },
      'guizhou': { name: '贵州话', code: 1637, lang: 'zh' },
      'xinjiang': { name: '新疆话', code: 1637, lang: 'zh' }
    };

    // 创建音频文件存储目录
    this.audioDir = path.join(process.cwd(), 'uploads/audio');
    this.ensureAudioDir();
  }

  /**
   * 确保音频目录存在
   */
  async ensureAudioDir() {
    try {
      await fs.mkdir(this.audioDir, { recursive: true });
    } catch (error) {
      logger.error('创建音频目录失败:', error);
    }
  }

  /**
   * 语音识别
   * @param {Object} options - 识别选项
   * @param {string} options.audioPath - 音频文件路径
   * @param {string} options.dialect - 方言类型
   * @param {number} options.format - 音频格式
   * @param {number} options.rate - 采样率
   * @param {number} options.channel - 声道数
   * @param {string} options.userId - 用户ID
   * @returns {Object} 识别结果
   */
  async speechToText(options = {}) {
    try {
      const {
        audioPath,
        dialect = 'mandarin',
        format = 'wav',
        rate = 16000,
        channel = 1,
        userId
      } = options;

      if (!audioPath) {
        throw new Error('音频文件路径不能为空');
      }

      // 检查文件是否存在
      try {
        await fs.access(audioPath);
      } catch (error) {
        throw new Error('音频文件不存在');
      }

      // 获取方言配置
      const dialectConfig = this.dialects[dialect];
      if (!dialectConfig) {
        throw new Error(`不支持的方言类型: ${dialect}`);
      }

      // 生成token
      const token = await this.generateToken();

      // 准备请求参数
      const params = new URLSearchParams({
        'dev_pid': dialectConfig.code.toString(),
        'cuid': userId || 'unknown',
        token,
        'rate': rate.toString(),
        'channel': channel.toString(),
        format
      });

      // 读取音频文件
      const audioData = await fs.readFile(audioPath);

      // 发送请求到百度语音识别API
      const response = await this.sendRequest(`${this.baiduConfig.asrUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': `audio/${  format}`,
          'Content-Length': audioData.length
        },
        body: audioData,
        params
      });

      const result = await response.json();

      if (result.err_no !== 0) {
        throw new Error(`语音识别失败: ${result.err_msg}`);
      }

      // 处理识别结果
      const transcripts = result.result.map(item => item.onebest || item.word || '').join('');
      const finalText = transcripts.join('');

      // 记录识别日志
      logger.info('语音识别成功', {
        userId,
        dialect,
        duration: (result.snippet_end_time - result.snippet_start_time) / 1000,
        text: finalText.substring(0, 100)
      });

      return {
        success: true,
        text: finalText,
        confidence: result.confidence || 0,
        dialect: dialectConfig.name,
        duration: (result.snippet_end_time - result.snippet_start_time) / 1000,
        tokens: result.result
      };

    } catch (error) {
      logger.error('语音识别失败:', error);
      return {
        success: false,
        error: error.message,
        text: ''
      };
    }
  }

  /**
   * 语音合成
   * @param {Object} options - 合成选项
   * @param {string} options.text - 要合成的文本
   * @param {string} options.dialect - 方言类型
   * @param {string} options.voice - 说话人
   * @param {number} options.speed - 语速 0-15
   * @param {number} options.pitch - 音调 0-15
   @param {number} options.volume - 音量 0-15
   * @param {string} options.userId - 用户ID
   * @returns {Object} 合成结果
   */
  async textToSpeech(options = {}) {
    try {
      const {
        text,
        dialect = 'mandarin',
        voice = 'default',
        speed = 5,
        pitch = 5,
        volume = 5,
        userId
      } = options;

      if (!text) {
        throw new Error('要合成的文本不能为空');
      }

      // 检查文本长度
      if (text.length > 1024) {
        throw new Error('文本长度不能超过1024个字符');
      }

      // 获取方言配置
      const dialectConfig = this.dialects[dialect];
      if (!dialectConfig) {
        throw new Error(`不支持的方言类型: ${dialect}`);
      }

      // 生成token
      const token = await this.generateToken();

      // 准备请求参数
      const params = new URLSearchParams({
        'tex': text,
        'lan': dialectConfig.lang,
        'tok': token,
        'ctp': '1', // 合成引擎类型
        'spd': speed.toString(),
        'pit': pitch.toString(),
        'vol': volume.toString(),
        'per': voice,
        'aue': '3' // 音频格式编码
      });

      // 发送请求到百度语音合成API
      const response = await this.sendRequest(this.baiduConfig.ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`语音合成请求失败: ${response.status} ${errorText}`);
      }

      // 生成音频文件名
      const fileName = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
      const audioPath = path.join(this.audioDir, fileName);

      // 保存音频文件
      const buffer = await response.arrayBuffer();
      await fs.writeFile(audioPath, Buffer.from(buffer));

      // 记录合成日志
      logger.info('语音合成成功', {
        userId,
        dialect,
        voice,
        textLength: text.length,
        audioPath
      });

      return {
        success: true,
        audioPath,
        audioUrl: `/uploads/audio/${fileName}`,
        text,
        dialect: dialectConfig.name,
        duration: text.length * 0.1 // 估算时长
      };

    } catch (error) {
      logger.error('语音合成失败:', error);
      return {
        success: false,
        error: error.message,
        audioPath: null
      };
    }
  }

  /**
   * 批量语音识别
   * @param {Array} audioFiles - 音频文件列表
   * @param {string} dialect - 方言类型
   * @param {string} userId - 用户ID
   * @returns {Object} 批量识别结果
   */
  async batchSpeechToText(audioFiles, dialect = 'mandarin', userId) {
    try {
      const results = [];
      const total = audioFiles.length;

      for (let i = 0; i < total; i++) {
        const audioFile = audioFiles[i];

        const result = await this.speechToText({
          audioPath: audioFile.path,
          dialect,
          userId
        });

        results.push({
          file: audioFile,
          index: i + 1,
          ...result
        });

        // 添加延迟避免API限制
        if (i < total - 1) {
          await this.delay(100); // 100ms延迟
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: true,
        results,
        summary: {
          total,
          success: successCount,
          failed: total - successCount,
          successRate: ((successCount / total) * 100).toFixed(2)
        }
      };

    } catch (error) {
      logger.error('批量语音识别失败:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * 获取方言列表
   * @returns {Object} 方言列表
   */
  getDialects() {
    const dialectList = Object.entries(this.dialects).map(([code, info]) => ({
      code,
      name: info.name,
      lang: info.lang,
      baiduCode: info.code
    }));

    return {
      success: true,
      dialects: dialectList,
      total: dialectList.length
    };
  }

  /**
   * 语音命令识别（针对智慧乡村特定场景）
   * @param {string} audioPath - 音频文件路径
   * @param {string} userId - 用户ID
   * @returns {Object} 识别结果和命令
   */
  async recognizeVillageCommand(audioPath, userId) {
    try {
      // 先进行语音识别
      const speechResult = await this.speechToText({
        audioPath,
        dialect: 'mandarin',
        userId
      });

      if (!speechResult.success) {
        return speechResult;
      }

      // 分析识别的文本，识别特定命令
      const command = this.analyzeVillageCommand(speechResult.text);

      // 记录命令识别日志
      logger.info('语音命令识别', {
        userId,
        originalText: speechResult.text,
        command: command.type,
        confidence: command.confidence
      });

      return {
        success: true,
        text: speechResult.text,
        command,
        confidence: speechResult.confidence
      };

    } catch (error) {
      logger.error('语音命令识别失败:', error);
      return {
        success: false,
        error: error.message,
        text: '',
        command: null
      };
    }
  }

  /**
   * 分析智慧乡村特定命令
   * @param {string} text - 识别的文本
   * @returns {Object} 命令信息
   */
  analyzeVillageCommand(text) {
    const commandPatterns = {
      // 村务查询
      query: {
        patterns: ['查询', '查看', '搜索', '找一下', '帮我查'],
        keywords: ['村务', '公告', '通知', '信息', '政策', '补贴'],
        type: 'query'
      },
      // 财务相关
      finance: {
        patterns: ['报销', '财务', '发票', '补贴', '资金', '预算'],
        keywords: ['报销单', '费用', '开支', '收入'],
        type: 'finance'
      },
      // 应急相关
      emergency: {
        patterns: ['紧急', '应急', '求助', '报警', '出事了', '危险'],
        keywords: ['火警', '医疗', '救援', '故障'],
        type: 'emergency'
      },
      // 便民服务
      service: {
        patterns: ['办事', '服务', '证明', '申请', '证件'],
        keywords: ['身份证', '户口本', '结婚证', '准生证'],
        type: 'service'
      },
      // 购物相关
      ecommerce: {
        patterns: ['购买', '买', '下单', '支付', '购物'],
        keywords: ['商品', '产品', '订单', '支付'],
        type: 'ecommerce'
      }
    };

    const lowerText = text.toLowerCase();
    let bestMatch = { type: 'unknown', confidence: 0 };

    // 分析每种命令类型
    for (const [commandType, config] of Object.entries(commandPatterns)) {
      let confidence = 0;

      // 检查模式匹配
      for (const pattern of config.patterns) {
        if (lowerText.includes(pattern)) {
          confidence += 0.5;
        }
      }

      // 检查关键词匹配
      for (const keyword of config.keywords) {
        if (lowerText.includes(keyword)) {
          confidence += 0.5;
        }
      }

      // 更新最佳匹配
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type: commandType,
          confidence: Math.min(confidence, 1.0)
        };
      }
    }

    return {
      type: bestMatch.type,
      confidence: bestMatch.confidence,
      originalText: text
    };
  }

  /**
   * 生成百度API Token
   * @returns {string} Token
   */
  async generateToken() {
    try {
      const url = 'https://aip.baidubce.com/oauth/2.0/token';
      const params = new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': this.baiduConfig.apiKey,
        'client_secret': this.baiduConfig.secretKey
      });

      const response = await this.sendRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const result = await response.json();
      return result.access_token;

    } catch (error) {
      logger.error('生成百度Token失败:', error);
      throw new Error('生成API令牌失败');
    }
  }

  /**
   * 发送HTTP请求
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Response} HTTP响应
   */
  async sendRequest(url, options = {}) {
    try {
      // 在Node.js中使用node-fetch或axios
      const https = require('https');
      const http = require('http');
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const lib = isHttps ? https : http;

      return new Promise((resolve, reject) => {
        const req = lib.request(url, options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              headers: res.headers,
              arrayBuffer: async () => Buffer.from(data),
              text: async () => data,
              json: async () => JSON.parse(data)
            });
          });

          res.on('error', reject);
        });

        req.on('error', reject);

        if (options.body) {
          req.write(options.body);
        }

        req.end();
      });

    } catch (error) {
      logger.error('HTTP请求失败:', error);
      throw error;
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
   * 删除临时音频文件
   * @param {string} audioPath - 音频文件路径
   */
  async deleteAudioFile(audioPath) {
    try {
      await fs.unlink(audioPath);
      logger.info('删除临时音频文件:', audioPath);
    } catch (error) {
      logger.warn('删除音频文件失败:', error);
    }
  }

  /**
   * 清理过期音频文件
   * @param {number} maxAge - 最大保存时间（分钟）
   */
  async cleanupOldAudioFiles(maxAge = 60) {
    try {
      const files = await fs.readdir(this.audioDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.audioDir, file);
        const stats = await fs.stat(filePath);

        // 删除超过最大保存时间的文件
        if (now - stats.mtime.getTime() > maxAge * 60 * 1000) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`清理了${deletedCount}个过期的音频文件`);
      }

      return {
        success: true,
        deletedCount,
        totalFiles: files.length
      };

    } catch (error) {
      logger.error('清理音频文件失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new VoiceService();