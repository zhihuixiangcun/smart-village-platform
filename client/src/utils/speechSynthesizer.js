/**
 * 语音合成工具 - Speech Synthesizer Utility
 *
 * 功能：
 * 1. 浏览器原生语音合成
 * 2. 对接百度语音合成API
 * 3. 支持多种发音人
 * 4. 语速、音调、音量调节
 * 5. 方言播报
 */

import axios from 'axios';

/**
 * 发音人配置
 */
export const SPEAKERS = {
  female: { id: 0, name: '女声', desc: '温柔女声' },
  male: { id: 1, name: '男声', desc: '沉稳男声' },
  female_emotional: { id: 3, name: '情感女声', desc: '情感丰富的女声' },
  male_emotional: { id: 4, name: '情感男声', desc: '情感丰富的男声' },
  child: { id: 5, name: '童声', desc: '可爱童声' }
};

/**
 * 合成状态
 */
export const SYNTHESIS_STATUS = {
  IDLE: 'idle',
  SYNTHESIZING: 'synthesizing',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error'
};

class SpeechSynthesizer {
  constructor(options = {}) {
    this.config = {
      apiBaseUrl: options.apiBaseUrl || '/api/speech',
      speaker: options.speaker || 'female',
      speed: options.speed || 5, // 0-15
      pitch: options.pitch || 5, // 0-15
      volume: options.volume || 5, // 0-15
      useNative: options.useNative !== false, // 默认优先使用原生API
      lang: options.lang || 'zh-CN',
      autoPlay: options.autoPlay !== false
    };

    this.status = SYNTHESIS_STATUS.IDLE;
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.audioElement = null;
    this.listeners = new Map();
    this.audioQueue = [];

    this.init();
  }

  /**
   * 初始化语音合成
   */
  init() {
    if (!this.synthesis) {
      console.warn('浏览器不支持语音合成');
      this.config.useNative = false;
    }

    // 获取可用的语音列表
    if (this.synthesis) {
      this.loadVoices();
      this.synthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  /**
   * 加载可用的语音列表
   */
  loadVoices() {
    const voices = this.synthesis.getVoices();
    this.voices = voices.filter(voice => voice.lang.startsWith('zh'));
    this.emit('voicesLoaded', this.voices);
  }

  /**
   * 合成并播报文本
   * @param {string} text - 要播报的文本
   * @returns {Promise}
   */
  async speak(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('文本不能为空');
      }

      // 停止当前播放
      this.stop();

      this.status = SYNTHESIS_STATUS.SYNTHESIZING;
      this.emit('statusChange', this.status);

      // 如果支持原生合成且配置使用原生
      if (this.synthesis && this.config.useNative) {
        return this.speakWithNative(text);
      }

      // 否则使用API合成
      return this.speakWithAPI(text);
    } catch (error) {
      console.error('语音合成失败:', error);
      this.status = SYNTHESIS_STATUS.ERROR;
      this.emit('error', {
        code: 'synthesis_failed',
        message: error.message
      });
      throw error;
    }
  }

  /**
   * 使用原生API合成
   * @param {string} text - 文本
   */
  speakWithNative(text) {
    return new Promise((resolve, reject) => {
      this.currentUtterance = new SpeechSynthesisUtterance(text);

      // 设置语音参数
      this.currentUtterance.lang = this.config.lang;
      this.currentUtterance.rate = this.mapSpeedToRate(this.config.speed);
      this.currentUtterance.pitch = this.mapPitchToValue(this.config.pitch);
      this.currentUtterance.volume = this.mapVolumeToValue(this.config.volume);

      // 选择中文语音
      if (this.voices && this.voices.length > 0) {
        this.currentUtterance.voice = this.voices[0];
      }

      // 事件处理
      this.currentUtterance.onstart = () => {
        this.status = SYNTHESIS_STATUS.PLAYING;
        this.emit('statusChange', this.status);
        this.emit('start', { text });
      };

      this.currentUtterance.onend = () => {
        this.status = SYNTHESIS_STATUS.COMPLETED;
        this.emit('statusChange', this.status);
        this.emit('end', { text });
        this.currentUtterance = null;
        resolve();
      };

      this.currentUtterance.onpause = () => {
        this.status = SYNTHESIS_STATUS.PAUSED;
        this.emit('statusChange', this.status);
      };

      this.currentUtterance.onresume = () => {
        this.status = SYNTHESIS_STATUS.PLAYING;
        this.emit('statusChange', this.status);
      };

      this.currentUtterance.onerror = (event) => {
        console.error('原生合成错误:', event.error);
        this.status = SYNTHESIS_STATUS.ERROR;
        this.emit('error', {
          code: event.error,
          message: this.getErrorMessage(event.error)
        });
        this.currentUtterance = null;
        reject(new Error(event.error));
      };

      this.synthesis.speak(this.currentUtterance);
    });
  }

  /**
   * 使用API合成
   * @param {string} text - 文本
   */
  async speakWithAPI(text) {
    try {
      const speakerConfig = SPEAKERS[this.config.speaker] || SPEAKERS.female;

      const response = await axios.post(`${this.config.apiBaseUrl}/synthesize`, {
        text,
        person: speakerConfig.id,
        speed: this.config.speed,
        pitch: this.config.pitch,
        volume: this.config.volume,
        format: 'mp3'
      }, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // 创建音频元素并播放
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      return this.playAudio(audioUrl, text);
    } catch (error) {
      console.error('API合成失败:', error);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  /**
   * 播放音频
   * @param {string} audioUrl - 音频URL
   * @param {string} text - 文本
   */
  playAudio(audioUrl, text) {
    return new Promise((resolve, reject) => {
      // 停止之前的音频
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
      }

      this.audioElement = new Audio(audioUrl);
      this.audioElement.volume = this.mapVolumeToValue(this.config.volume);

      this.audioElement.onloadedmetadata = () => {
        this.emit('duration', {
          duration: this.audioElement.duration,
          text
        });
      };

      this.audioElement.onplay = () => {
        this.status = SYNTHESIS_STATUS.PLAYING;
        this.emit('statusChange', this.status);
        this.emit('start', { text });
      };

      this.audioElement.onended = () => {
        this.status = SYNTHESIS_STATUS.COMPLETED;
        this.emit('statusChange', this.status);
        this.emit('end', { text });
        URL.revokeObjectURL(audioUrl);
        this.audioElement = null;
        resolve();
      };

      this.audioElement.onerror = (event) => {
        console.error('音频播放错误:', event);
        this.status = SYNTHESIS_STATUS.ERROR;
        this.emit('error', {
          code: 'playback_error',
          message: '音频播放失败'
        });
        URL.revokeObjectURL(audioUrl);
        this.audioElement = null;
        reject(new Error('音频播放失败'));
      };

      this.audioElement.onpause = () => {
        if (this.status === SYNTHESIS_STATUS.PLAYING) {
          this.status = SYNTHESIS_STATUS.PAUSED;
          this.emit('statusChange', this.status);
        }
      };

      if (this.config.autoPlay) {
        this.audioElement.play();
      }
    });
  }

  /**
   * 暂停播报
   */
  pause() {
    if (this.synthesis && this.currentUtterance) {
      this.synthesis.pause();
    } else if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * 恢复播报
   */
  resume() {
    if (this.synthesis && this.currentUtterance) {
      this.synthesis.resume();
    } else if (this.audioElement) {
      this.audioElement.play();
    }
  }

  /**
   * 停止播报
   */
  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this.status = SYNTHESIS_STATUS.IDLE;
    this.emit('statusChange', this.status);
  }

  /**
   * 批量播报
   * @param {Array<string>} texts - 文本数组
   */
  async speakBatch(texts) {
    this.audioQueue = [...texts];
    for (const text of this.audioQueue) {
      await this.speak(text);
    }
    this.audioQueue = [];
  }

  /**
   * 设置发音人
   * @param {string} speaker - 发音人代码
   */
  setSpeaker(speaker) {
    if (SPEAKERS[speaker]) {
      this.config.speaker = speaker;
    }
  }

  /**
   * 设置语速
   * @param {number} speed - 语速 (0-15)
   */
  setSpeed(speed) {
    this.config.speed = Math.max(0, Math.min(15, speed));
  }

  /**
   * 设置音调
   * @param {number} pitch - 音调 (0-15)
   */
  setPitch(pitch) {
    this.config.pitch = Math.max(0, Math.min(15, pitch));
  }

  /**
   * 设置音量
   * @param {number} volume - 音量 (0-15)
   */
  setVolume(volume) {
    this.config.volume = Math.max(0, Math.min(15, volume));
    if (this.audioElement) {
      this.audioElement.volume = this.mapVolumeToValue(volume);
    }
  }

  /**
   * 映射语速到原生API的rate值
   * @param {number} speed - 语速 (0-15)
   * @returns {number} - rate值 (0.1-10)
   */
  mapSpeedToRate(speed) {
    // 将0-15映射到0.5-2.0
    return 0.5 + (speed / 15) * 1.5;
  }

  /**
   * 映射音调到原生API的pitch值
   * @param {number} pitch - 音调 (0-15)
   * @returns {number} - pitch值 (0-2)
   */
  mapPitchToValue(pitch) {
    // 将0-15映射到0.5-1.5
    return 0.5 + (pitch / 15) * 1.0;
  }

  /**
   * 映射音量到原生API的volume值
   * @param {number} volume - 音量 (0-15)
   * @returns {number} - volume值 (0-1)
   */
  mapVolumeToValue(volume) {
    return volume / 15;
  }

  /**
   * 检查浏览器支持
   * @returns {boolean}
   */
  static isSupported() {
    return !!window.speechSynthesis;
  }

  /**
   * 获取支持的发音人列表
   * @returns {Array}
   */
  getSupportedSpeakers() {
    return Object.entries(SPEAKERS).map(([key, value]) => ({
      code: key,
      ...value
    }));
  }

  /**
   * 获取错误消息
   * @param {string} errorCode - 错误代码
   * @returns {string}
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      'canceled': '播报已取消',
      'interrupted': '播报被中断',
      'synthesis_failed': '语音合成失败',
      'playback_error': '音频播放失败',
      'network': '网络错误'
    };
    return errorMessages[errorCode] || '未知错误';
  }

  /**
   * 事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.stop();
    this.listeners.clear();
    this.audioQueue = [];
  }
}

export default SpeechSynthesizer;
