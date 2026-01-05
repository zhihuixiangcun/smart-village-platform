/**
 * 语音识别API
 * @module api/speech
 */
import request from '@/utils/request';

const speechApi = {
  /**
   * 语音识别
   * @param {File} audioFile - 音频文件
   * @param {Object} options - 识别选项
   * @returns {Promise} 识别结果
   */
  recognize(audioFile, options = {}) {
    const formData = new FormData();
    formData.append('audio', audioFile);

    if (options.dialect) formData.append('dialect', options.dialect);
    if (options.accent) formData.append('accent', options.accent);
    if (options.domain) formData.append('domain', options.domain);

    return request.post('/api/v1/speech/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * 语音合成
   * @param {string} text - 待合成文本
   * @param {Object} options - 合成选项
   * @returns {Promise} 音频数据
   */
  synthesize(text, options = {}) {
    return request.post('/api/v1/speech/synthesize', {
      text,
      voice: options.voice || 'mandarin',
      speed: options.speed || 50,
      pitch: options.pitch || 50,
      volume: options.volume || 50,
      emotion: options.emotion || 'neutral',
      format: options.format || 'mp3'
    }, {
      responseType: 'blob'
    });
  },

  /**
   * 检测方言
   * @param {File} audioFile - 音频文件
   * @returns {Promise} 方言检测结果
   */
  detectDialect(audioFile) {
    const formData = new FormData();
    formData.append('audio', audioFile);

    return request.post('/api/v1/speech/detect-dialect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * 获取支持的方言列表
   * @returns {Promise} 方言列表
   */
  getSupportedDialects() {
    return request.get('/api/v1/speech/dialects');
  },

  /**
   * 获取音频配置
   * @returns {Promise} 音频配置
   */
  getAudioConfig() {
    return request.get('/api/v1/speech/audio-config');
  },

  /**
   * 获取语音服务统计
   * @returns {Promise} 统计信息
   */
  getStats() {
    return request.get('/api/v1/speech/stats');
  },

  /**
   * 批量语音识别
   * @param {FileList} files - 音频文件列表
   * @param {Object} options - 识别选项
   * @returns {Promise} 批量识别结果
   */
  batchRecognize(files, options = {}) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    if (options.dialect) formData.append('dialect', options.dialect);

    return request.post('/api/v1/speech/batch-recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // ==================== 实时语音识别 ====================

  /**
   * 创建实时语音识别WebSocket连接
   * @param {Object} options - 识别选项
   * @returns {WebSocket} WebSocket连接
   */
  createRealTimeRecognition(options = {}) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const queryParams = new URLSearchParams();

    if (options.dialect) queryParams.append('dialect', options.dialect);
    if (options.interimResults !== undefined) queryParams.append('interimResults', options.interimResults);
    if (options.silenceTimeout) queryParams.append('silenceTimeout', options.silenceTimeout);

    const wsUrl = `${protocol}//${host}/api/v1/speech/real-time-recognize?${queryParams.toString()}`;

    return new WebSocket(wsUrl);
  },

  // ==================== 便捷方法 ====================

  /**
   * 快速语音识别（自动检测方言）
   * @param {Blob} audioBlob - 音频数据
   * @returns {Promise} 识别结果
   */
  async quickRecognize(audioBlob) {
    const file = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
    return this.recognize(file, { dialect: 'auto' });
  },

  /**
   * 文本转语音（普通话）
   * @param {string} text - 待合成文本
   * @param {string} emotion - 情感类型
   * @returns {Promise} 音频URL
   */
  async textToSpeech(text, emotion = 'neutral') {
    const audioBlob = await this.synthesize(text, { voice: 'mandarin', emotion });

    // 创建临时URL
    const audioUrl = URL.createObjectURL(audioBlob);
    return audioUrl;
  },

  /**
   * 文本转方言语音
   * @param {string} text - 待合成文本
   * @param {string} dialect - 方言类型
   * @returns {Promise} 音频URL
   */
  async textToDialectSpeech(text, dialect) {
    const voiceMap = {
      cantonese: 'cantonese',
      shanghainese: 'shanghainese',
      sichuanese: 'sichuanese'
    };

    const voice = voiceMap[dialect] || 'mandarin';
    const audioBlob = await this.synthesize(text, { voice });

    return URL.createObjectURL(audioBlob);
  },

  /**
   * 获取老年人友好语音
   * @param {string} text - 待合成文本
   * @returns {Promise} 音频URL
   */
  async elderlyFriendlySpeech(text) {
    const audioBlob = await this.synthesize(text, {
      voice: 'elderly',
      speed: 40,
      volume: 60
    });

    return URL.createObjectURL(audioBlob);
  },

  /**
   * 获取儿童友好语音
   * @param {string} text - 待合成文本
   * @returns {Promise} 音频URL
   */
  async childFriendlySpeech(text) {
    const audioBlob = await this.synthesize(text, {
      voice: 'child',
      speed: 55,
      pitch: 60,
      emotion: 'happy'
    });

    return URL.createObjectURL(audioBlob);
  }
};

export default speechApi;
