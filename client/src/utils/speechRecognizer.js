/**
 * 语音识别工具 - Speech Recognizer Utility
 *
 * 功能：
 * 1. 浏览器原生语音识别
 * 2. 对接百度语音识别API
 * 3. 支持多种方言
 * 4. 实时语音转文字
 * 5. 语音命令解析
 */

import axios from 'axios';

/**
 * 支持的方言配置
 */
export const SUPPORTED_DIALECTS = {
  mandarin: { code: 1537, name: '普通话', desc: '标准普通话' },
  cantonese: { code: 1637, name: '粤语', desc: '广东话、香港话' },
  sichuan: { code: 1737, name: '四川话', desc: '西南官话' },
  henan: { code: 2137, name: '河南话', desc: '中原官话' },
  northeast: { code: 2637, name: '东北话', desc: '东北官话' },
};

/**
 * 识别状态
 */
export const RECOGNITION_STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * 语音命令类型
 */
export const COMMAND_TYPES = {
  CALL: 'call',
  QUERY: 'query',
  NAVIGATION: 'navigation',
  EMERGENCY: 'emergency',
  FORM_INPUT: 'form_input',
  SEARCH: 'search',
};

/**
 * 命令模式
 */
const COMMAND_PATTERNS = {
  [COMMAND_TYPES.CALL]: [/呼叫(.*)/i, /打电话给(.*)/i, /联系(.*)/i],
  [COMMAND_TYPES.QUERY]: [/查询(.*)/i, /查一下(.*)/i, /查看(.*)/i, /(.*)的信息/i],
  [COMMAND_TYPES.NAVIGATION]: [/去(.*)/i, /导航到(.*)/i, /前往(.*)/i],
  [COMMAND_TYPES.EMERGENCY]: [/紧急求助/i, /救命/i, /报警/i, /呼叫村干部/i],
  [COMMAND_TYPES.FORM_INPUT]: [/填写(.*)/i, /输入(.*)/i],
  [COMMAND_TYPES.SEARCH]: [/搜索(.*)/i, /找(.*)/i],
};

class SpeechRecognizer {
  constructor(options = {}) {
    this.config = {
      apiBaseUrl: options.apiBaseUrl || '/api/speech',
      dialect: options.dialect || 'mandarin',
      continuous: options.continuous || false,
      interimResults: options.interimResults || true,
      maxAlternatives: options.maxAlternatives || 1,
      lang: options.lang || 'zh-CN',
      useNative: options.useNative !== false, // 默认优先使用原生API
    };

    this.status = RECOGNITION_STATUS.IDLE;
    this.recognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.listeners = new Map();

    this.init();
  }

  /**
   * 初始化语音识别
   */
  init() {
    // 检查浏览器是否支持原生语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (this.config.useNative && SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } else {
      console.warn('浏览器不支持原生语音识别，将使用API识别');
    }
  }

  /**
   * 设置原生识别
   */
  setupRecognition() {
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    this.recognition.lang = this.config.lang;

    this.recognition.onstart = () => {
      this.status = RECOGNITION_STATUS.LISTENING;
      this.emit('statusChange', this.status);
    };

    this.recognition.onresult = event => {
      const results = event.results;
      const transcript = results[results.length - 1][0].transcript;
      const isFinal = results[results.length - 1].isFinal;

      if (isFinal) {
        this.status = RECOGNITION_STATUS.SUCCESS;
        this.emit('result', {
          text: transcript,
          isFinal: true,
          confidence: results[results.length - 1][0].confidence,
        });
      } else {
        this.emit('interim', transcript);
      }
    };

    this.recognition.onerror = event => {
      console.error('语音识别错误:', event.error);
      this.status = RECOGNITION_STATUS.ERROR;
      this.emit('error', {
        code: event.error,
        message: this.getErrorMessage(event.error),
      });
    };

    this.recognition.onend = () => {
      if (this.status === RECOGNITION_STATUS.LISTENING) {
        this.status = RECOGNITION_STATUS.IDLE;
        this.emit('statusChange', this.status);
      }
    };
  }

  /**
   * 开始语音识别
   * @returns {Promise}
   */
  async start() {
    try {
      if (this.status === RECOGNITION_STATUS.LISTENING) {
        console.warn('语音识别已在运行中');
        return;
      }

      // 如果支持原生识别，使用原生API
      if (this.recognition) {
        this.recognition.start();
        return;
      }

      // 否则使用录音+API识别
      await this.startRecording();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      this.status = RECOGNITION_STATUS.ERROR;
      this.emit('error', {
        code: 'start_failed',
        message: error.message,
      });
    }
  }

  /**
   * 停止语音识别
   */
  stop() {
    if (this.recognition) {
      this.recognition.stop();
    } else if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * 开始录音（用于API识别）
   */
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = event => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        this.status = RECOGNITION_STATUS.PROCESSING;
        this.emit('statusChange', this.status);

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.recognizeWithAPI(audioBlob);

        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.status = RECOGNITION_STATUS.LISTENING;
      this.emit('statusChange', this.status);
    } catch (error) {
      console.error('录音失败:', error);
      this.emit('error', {
        code: 'microphone_error',
        message: '无法访问麦克风',
      });
    }
  }

  /**
   * 使用API识别音频
   * @param {Blob} audioBlob - 音频数据
   */
  async recognizeWithAPI(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('dialect', this.config.dialect);
      formData.append('format', 'webm');
      formData.append('rate', '16000');

      const response = await axios.post(`${this.config.apiBaseUrl}/recognize`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (response.data.success) {
        this.status = RECOGNITION_STATUS.SUCCESS;
        this.emit('result', {
          text: response.data.data.text,
          isFinal: true,
          confidence: response.data.data.confidence,
          dialect: response.data.data.dialect,
          duration: response.data.data.duration,
        });
      } else {
        throw new Error(response.data.message || '识别失败');
      }
    } catch (error) {
      console.error('API识别失败:', error);
      this.status = RECOGNITION_STATUS.ERROR;
      this.emit('error', {
        code: 'api_error',
        message: error.response?.data?.message || error.message,
      });
    }
  }

  /**
   * 解析语音命令
   * @param {string} text - 识别的文本
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
            confidence: 0.9,
          };
        }
      }
    }

    return null;
  }

  /**
   * 检查浏览器支持
   * @returns {boolean}
   */
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * 检查麦克风权限
   * @returns {Promise<boolean>}
   */
  static async checkMicrophonePermission() {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state === 'granted';
    } catch (error) {
      // 如果无法查询权限，尝试请求麦克风访问
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  /**
   * 获取支持的方言列表
   * @returns {Array}
   */
  getSupportedDialects() {
    return Object.entries(SUPPORTED_DIALECTS).map(([key, value]) => ({
      code: key,
      ...value,
    }));
  }

  /**
   * 设置方言
   * @param {string} dialect - 方言代码
   */
  setDialect(dialect) {
    if (SUPPORTED_DIALECTS[dialect]) {
      this.config.dialect = dialect;
    }
  }

  /**
   * 获取错误消息
   * @param {string} errorCode - 错误代码
   * @returns {string}
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      'no-speech': '未检测到语音，请重试',
      'audio-capture': '无法捕获音频',
      'not-allowed': '麦克风权限被拒绝',
      network: '网络错误，请检查网络连接',
      aborted: '识别被中断',
      start_failed: '启动识别失败',
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
    this.recognition = null;
    this.mediaRecorder = null;
  }
}

export default SpeechRecognizer;
