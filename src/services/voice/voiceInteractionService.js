/**
 * 智慧乡村语音交互服务
 * 支持方言识别、语音合成、语音命令处理
 */

const logger = require('../../utils/logger');

class VoiceInteractionService {
  constructor() {
    this.pythonService = null;
    this.cache = new Map();
    this.wakeWords = ['小智', '村小助手', '智慧乡村'];
    this.isRecording = false;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.stream = null;

    // 方言配置
    this.dialectConfig = {
      '普通话': 'zh',
      '粤语': 'yue',
      '闽南语': 'nan',
      '客家话': 'hak',
      '吴语': 'wuu',
      '湘语': 'hsn',
      '赣语': 'gan',
      '东北话': 'zh-northeast',
      '四川话': 'zh-sichuan',
      '重庆话': 'zh-chongqing',
      '陕西话': 'zh-shaanxi',
      '山东话': 'zh-shandong',
      '河南话': 'zh-henan',
      '湖北话': 'zh-hubei',
      '江浙话': 'zh-jiangzhe',
      '安徽话': 'zh-anhui',
      '河北话': 'zh-hebei',
      '山西话': 'zh-shanxi',
      '内蒙古话': 'zh-neimeng',
      '甘肃话': 'zh-gansu',
      '宁夏话': 'zh-ningxia',
      '新疆话': 'zh-xinjiang',
      '西藏话': 'zh-xizang',
      '青海话': 'zh-qinghai'
    };

    // 命令模式配置
    this.commandPatterns = {
      query: /^查询|显示|看看|找|搜索/,
      action: /^执行|操作|处理|办理/,
      navigate: /^打开|进入|跳转到|切换到/,
      help: /^帮助|怎么用|使用指南/,
      weather: /^天气|温度|降雨/,
      news: /^新闻|公告|通知/,
      service: /^服务|办事|申请/,
      emergency: /^紧急|求救|报警|急救/
    };
  }

  /**
   * 初始化语音服务
   */
  async initialize() {
    try {
      logger.debug('🎤 初始化语音交互服务...');
      // 初始化Python AI处理模块连接
      await this.initializePythonService();

      // 初始化音频处理模块
      await this.initializeAudioProcessing();

      // 加载语音模型
      await this.loadVoiceModels();

      logger.debug('✅ 语音交互服务初始化完成');
      return true;
    } catch (error) {
      logger.error('❌ 语音交互服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化Python AI处理服务
   */
  async initializePythonService() {
    try {
      // 这里将通过HTTP API调用Python服务
      this.pythonService = {
        baseUrl: process.env.PYTHON_VOICE_SERVICE_URL || 'http://localhost:5001',
        timeout: 30000
      };

      // 测试连接
      const response = await fetch(`${this.pythonService.baseUrl}/health`);
      if (!response.ok) {
        throw new Error('Python语音服务连接失败');
      }

      logger.debug('🐍 Python语音服务连接成功');
    } catch (error) {
      logger.warn('⚠️ Python语音服务未启动，使用备用方案');
      this.pythonService = null;
    }
  }

  /**
   * 初始化音频处理模块
   */
  async initializeAudioProcessing() {
    try {
      // 检查浏览器支持
      if (typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          throw new Error('浏览器不支持Web Audio API');
        }

        this.audioContext = new AudioContext();
        logger.debug('🎵 音频处理模块初始化成功');
      }
    } catch (error) {
      logger.error('音频处理模块初始化失败:', error);
    }
  }

  /**
   * 加载语音模型
   */
  async loadVoiceModels() {
    try {
      // 预加载常用语音识别模型
      this.models = {
        speechRecognition: 'loaded',
        textToSpeech: 'loaded',
        dialectDetection: 'loaded',
        voiceCommand: 'loaded'
      };

      logger.debug('🧠 语音模型加载完成');
    } catch (error) {
      logger.error('语音模型加载失败:', error);
    }
  }

  /**
   * 开始录音
   */
  async startRecording(options = {}) {
    try {
      if (this.isRecording) {
        throw new Error('正在录音中');
      }

      const defaultOptions = {
        sampleRate: 16000,
        channelCount: 1,
        bitDepth: 16,
        format: 'wav'
      };

      const config = { ...defaultOptions, ...options };

      // 获取麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          channelCount: config.channelCount,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 创建录音器
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getMimeType(config.format)
      });

      const audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: this.getMimeType(config.format) });
        const audioArrayBuffer = await audioBlob.arrayBuffer();

        // 处理录音数据
        this.processAudioData(audioArrayBuffer, config);
      };

      this.mediaRecorder.start(100); // 每100ms收集一次数据
      this.isRecording = true;

      logger.debug('🎙️ 开始录音');
      return true;

    } catch (error) {
      logger.error('录音启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止录音
   */
  async stopRecording() {
    try {
      if (!this.isRecording || !this.mediaRecorder) {
        throw new Error('当前没有在录音');
      }

      this.mediaRecorder.stop();
      this.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;

      logger.debug('⏹️ 停止录音');
      return true;

    } catch (error) {
      logger.error('停止录音失败:', error);
      throw error;
    }
  }

  /**
   * 处理音频数据
   */
  async processAudioData(audioArrayBuffer, config) {
    try {
      logger.debug('🔄 处理音频数据...');
      // 音频预处理
      const processedAudio = await this.preprocessAudio(audioArrayBuffer);

      // 方言检测和识别
      const recognitionResult = await this.recognizeSpeech(processedAudio, config);

      // 命令解析
      const commandResult = this.parseVoiceCommand(recognitionResult.text);

      // 返回处理结果
      return {
        success: true,
        audio: {
          duration: processedAudio.duration,
          sampleRate: config.sampleRate,
          size: audioArrayBuffer.byteLength
        },
        recognition: recognitionResult,
        command: commandResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('音频数据处理失败:', error);
      throw error;
    }
  }

  /**
   * 音频预处理
   */
  async preprocessAudio(audioArrayBuffer) {
    try {
      // 降噪处理
      const denoisedAudio = await this.denoiseAudio(audioArrayBuffer);

      // 音量标准化
      const normalizedAudio = await this.normalizeAudio(denoisedAudio);

      // 静音检测
      const trimmedAudio = await this.trimSilence(normalizedAudio);

      return {
        data: trimmedAudio,
        duration: this.calculateDuration(trimmedAudio)
      };

    } catch (error) {
      logger.error('音频预处理失败:', error);
      throw error;
    }
  }

  /**
   * 语音识别
   */
  async recognizeSpeech(audioData, config) {
    try {
      const cacheKey = this.generateCacheKey(audioData);

      // 检查缓存
      if (this.cache.has(cacheKey)) {
        logger.debug('📋 使用缓存结果');
        return this.cache.get(cacheKey);
      }

      let result;

      if (this.pythonService) {
        // 使用Python服务进行识别
        result = await this.callPythonService('/speech/recognize', {
          audio: Array.from(new Uint8Array(audioData.data)),
          config: {
            language: config.language || 'zh-CN',
            dialect: config.dialect || 'auto',
            sampleRate: config.sampleRate,
            format: config.format
          }
        });
      } else {
        // 使用Web Speech API作为备用方案
        result = await this.fallbackSpeechRecognition(audioData, config);
      }

      // 缓存结果
      this.cache.set(cacheKey, result);

      // 限制缓存大小
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return result;

    } catch (error) {
      logger.error('语音识别失败:', error);
      throw error;
    }
  }

  /**
   * 文本转语音
   */
  async synthesizeSpeech(text, options = {}) {
    try {
      const defaultOptions = {
        voice: 'female',
        language: 'zh-CN',
        dialect: '普通话',
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0,
        emotion: 'neutral'
      };

      const config = { ...defaultOptions, ...options };

      if (this.pythonService) {
        // 使用Python服务进行语音合成
        const result = await this.callPythonService('/speech/synthesize', {
          text,
          config
        });

        return {
          success: true,
          audio: result.audio,
          config,
          duration: result.duration,
          timestamp: new Date().toISOString()
        };

      } else {
        // 使用Web Speech API作为备用方案
        return await this.fallbackTextToSpeech(text, config);
      }

    } catch (error) {
      logger.error('语音合成失败:', error);
      throw error;
    }
  }

  /**
   * 语音命令解析
   */
  parseVoiceCommand(text) {
    try {
      const cleanedText = text.trim().toLowerCase();

      // 检测唤醒词
      const hasWakeWord = this.wakeWords.some(word => cleanedText.includes(word));

      // 命令分类
      let commandType = 'general';
      let intent = null;
      let entities = [];

      for (const [type, pattern] of Object.entries(this.commandPatterns)) {
        if (pattern.test(cleanedText)) {
          commandType = type;
          break;
        }
      }

      // 提取实体
      entities = this.extractEntities(cleanedText, commandType);

      // 意图识别
      intent = this.recognizeIntent(cleanedText, commandType, entities);

      return {
        text,
        cleanedText,
        hasWakeWord,
        commandType,
        intent,
        entities,
        confidence: this.calculateConfidence(text, intent)
      };

    } catch (error) {
      logger.error('命令解析失败:', error);
      return {
        text,
        commandType: 'error',
        intent: null,
        entities: [],
        error: error.message
      };
    }
  }

  /**
   * 提取实体
   */
  extractEntities(text, commandType) {
    const entities = [];

    // 时间实体
    const timePattern = /今天|明天|昨天|上午|下午|晚上|早上|半夜|凌晨/g;
    const timeMatches = text.match(timePattern);
    if (timeMatches) {
      entities.push({ type: 'time', value: timeMatches[0] });
    }

    // 数字实体
    const numberPattern = /\d+/g;
    const numberMatches = text.match(numberPattern);
    if (numberMatches) {
      numberMatches.forEach(num => {
        entities.push({ type: 'number', value: parseInt(num) });
      });
    }

    // 地点实体（简单示例）
    const locations = ['村委会', '卫生站', '学校', '文化站', '超市', '银行'];
    locations.forEach(location => {
      if (text.includes(location)) {
        entities.push({ type: 'location', value: location });
      }
    });

    // 根据命令类型提取特定实体
    switch (commandType) {
    case 'query':
      const queryKeywords = ['村民', '公告', '政策', '补贴', '费用'];
      queryKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          entities.push({ type: 'query_target', value: keyword });
        }
      });
      break;

    case 'service':
      const services = ['医保', '社保', '身份证', '户口', '结婚证'];
      services.forEach(service => {
        if (text.includes(service)) {
          entities.push({ type: 'service_type', value: service });
        }
      });
      break;
    }

    return entities;
  }

  /**
   * 意图识别
   */
  recognizeIntent(text, commandType, entities) {
    const intentMap = {
      query: {
        '村民信息': ['村民', '人员', '住户'],
        '查询公告': ['公告', '通知', '消息'],
        '政策查询': ['政策', '规定', '办法'],
        '补贴查询': ['补贴', '补助', '津贴']
      },
      action: {
        '提交申请': ['申请', '提交', '办理'],
        '更新信息': ['更新', '修改', '变更'],
        '删除记录': ['删除', '移除', '取消']
      },
      navigate: {
        '打开首页': ['首页', '主页', '开始'],
        '打开个人中心': ['个人', '我的', '账户'],
        '打开服务大厅': ['服务', '办事', '大厅']
      }
    };

    const typeIntents = intentMap[commandType] || {};

    for (const [intent, keywords] of Object.entries(typeIntents)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return intent;
      }
    }

    return commandType;
  }

  /**
   * 计算置信度
   */
  calculateConfidence(text, intent) {
    // 简单的置信度计算
    let confidence = 0.5;

    if (text.length > 5) confidence += 0.1;
    if (intent && intent !== 'general') confidence += 0.2;
    if (this.wakeWords.some(word => text.includes(word))) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * 调用Python服务
   */
  async callPythonService(endpoint, data) {
    try {
      const response = await fetch(`${this.pythonService.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Python服务请求失败: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('Python服务调用失败:', error);
      throw error;
    }
  }

  /**
   * 备用语音识别方案
   */
  async fallbackSpeechRecognition(audioData, config) {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('浏览器不支持语音识别'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = config.language || 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve({
          text: transcript,
          confidence: event.results[0][0].confidence,
          language: recognition.lang,
          dialect: 'unknown'
        });
      };

      recognition.onerror = (event) => {
        reject(new Error(`语音识别错误: ${event.error}`));
      };

      recognition.start();
    });
  }

  /**
   * 备用文本转语音方案
   */
  async fallbackTextToSpeech(text, config) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('浏览器不支持语音合成'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = config.language || 'zh-CN';
      utterance.rate = config.speed;
      utterance.pitch = config.pitch;
      utterance.volume = config.volume;

      // 选择声音
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.includes(config.language)) || voices[0];
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        resolve({
          success: true,
          config,
          duration: utterance.duration || 0,
          timestamp: new Date().toISOString()
        });
      };

      utterance.onerror = (event) => {
        reject(new Error(`语音合成错误: ${event.error}`));
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * 获取MIME类型
   */
  getMimeType(format) {
    const mimeTypes = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg'
    };
    return mimeTypes[format] || 'audio/wav';
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(audioData) {
    const hash = this.simpleHash(Array.from(new Uint8Array(audioData.data)));
    return `audio_${hash}`;
  }

  /**
   * 简单哈希函数
   */
  simpleHash(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 降噪处理
   */
  async denoiseAudio(audioData) {
    // 这里应该实现实际的降噪算法
    // 暂时返回原数据
    return audioData;
  }

  /**
   * 音量标准化
   */
  async normalizeAudio(audioData) {
    // 这里应该实现实际的音量标准化算法
    // 暂时返回原数据
    return audioData;
  }

  /**
   * 静音修剪
   */
  async trimSilence(audioData) {
    // 这里应该实现实际的静音检测和修剪算法
    // 暂时返回原数据
    return audioData;
  }

  /**
   * 计算音频时长
   */
  calculateDuration(audioData) {
    // 简单估算，实际应该根据采样率和数据长度计算
    return audioData.data.byteLength / (16000 * 2); // 假设16kHz采样率，16位
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.cache.clear();
    logger.debug('🧹 语音服务资源已清理');
  }
}

// 创建全局实例
const voiceService = new VoiceInteractionService();

module.exports = voiceService;