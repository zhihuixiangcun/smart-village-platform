/**
 * 方言语音交互工具
 * 支持多种方言识别和语音合成
 */

const app = getApp();

class VoiceService {
  constructor() {
    this.recorderManager = null;
    this.innerAudioContext = null;
    this.isRecording = false;
    this.currentEngine = app.globalData.dialectConfig.recognitionEngine;
    this.synthesisEngine = app.globalData.dialectConfig.synthesisEngine;

    // 方言配置
    this.dialectMap = {
      'mandarin': {
        name: '普通话',
        code: 'zh-CN',
        recognitionEngine: 'baidu',
        synthesisEngine: 'baidu',
        baiduLang: 'zh',
        tencentLang: '1'
      },
      'cantonese': {
        name: '粤语',
        code: 'zh-HK',
        recognitionEngine: 'baidu',
        synthesisEngine: 'tencent',
        baiduLang: 'ct',
        tencentLang: '5'
      },
      'hokkien': {
        name: '闽南语',
        code: 'zh-MIN',
        recognitionEngine: 'xunfei',
        synthesisEngine: 'xunfei',
        baiduLang: 'sz',
        tencentLang: '7'
      },
      'hunanese': {
        name: '湖南话',
        code: 'zh-HN',
        recognitionEngine: 'baidu',
        synthesisEngine: 'baidu',
        baiduLang: 'hn',
        tencentLang: '8'
      },
      'sichuanese': {
        name: '四川话',
        code: 'zh-SC',
        recognitionEngine: 'baidu',
        synthesisEngine: 'tencent',
        baiduLang: 'lz',
        tencentLang: '9'
      },
      'shanghainese': {
        name: '上海话',
        code: 'zh-SH',
        recognitionEngine: 'xunfei',
        synthesisEngine: 'xunfei',
        baiduLang: 'sh',
        tencentLang: '10'
      }
    };

    // 初始化录音管理器
    this.initRecorderManager();

    // 初始化音频播放器
    this.initAudioContext();
  }

  /**
   * 初始化录音管理器
   */
  initRecorderManager() {
    this.recorderManager = wx.getRecorderManager();

    this.recorderManager.onStart(() => {
      console.log('录音开始');
      this.isRecording = true;
      this.onRecordingStart && this.onRecordingStart();
    });

    this.recorderManager.onStop((res) => {
      console.log('录音结束', res);
      this.isRecording = false;
      this.onRecordingStop && this.onRecordingStop(res);
    });

    this.recorderManager.onError((err) => {
      console.error('录音错误', err);
      this.isRecording = false;
      this.onRecordingError && this.onRecordingError(err);
    });
  }

  /**
   * 初始化音频播放器
   */
  initAudioContext() {
    this.innerAudioContext = wx.createInnerAudioContext();

    this.innerAudioContext.onPlay(() => {
      console.log('音频播放开始');
      this.onPlayStart && this.onPlayStart();
    });

    this.innerAudioContext.onEnded(() => {
      console.log('音频播放结束');
      this.onPlayEnd && this.onPlayEnd();
    });

    this.innerAudioContext.onError((err) => {
      console.error('音频播放错误', err);
      this.onPlayError && this.onPlayError(err);
    });
  }

  /**
   * 开始录音
   */
  startRecording(options = {}) {
    return new Promise((resolve, reject) => {
      // 检查录音权限
      this.checkRecordPermission()
        .then(() => {
          const config = {
            duration: options.duration || 60000, // 最长60秒
            sampleRate: 16000,
            numberOfChannels: 1,
            encodeBitRate: 48000,
            format: 'mp3',
            frameSize: 50
          };

          this.recorderManager.start(config);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * 停止录音
   */
  stopRecording() {
    return new Promise((resolve) => {
      if (this.isRecording) {
        this.recorderManager.stop();
        // 等待录音结束事件
        this.onRecordingStop = resolve;
      } else {
        resolve(null);
      }
    });
  }

  /**
   * 语音识别
   */
  recognizeSpeech(audioPath, dialect = 'mandarin') {
    return new Promise((resolve, reject) => {
      const dialectConfig = this.dialectMap[dialect] || this.dialectMap['mandarin'];

      // 检查网络状态
      if (app.globalData.networkStatus === 'offline') {
        reject(new Error('网络连接不可用，无法进行语音识别'));
        return;
      }

      // 根据不同引擎进行识别
      switch (dialectConfig.recognitionEngine) {
        case 'baidu':
          this.baiduRecognize(audioPath, dialectConfig)
            .then(resolve)
            .catch(reject);
          break;
        case 'xunfei':
          this.xunfeiRecognize(audioPath, dialectConfig)
            .then(resolve)
            .catch(reject);
          break;
        case 'tencent':
          this.tencentRecognize(audioPath, dialectConfig)
            .then(resolve)
            .catch(reject);
          break;
        default:
          reject(new Error('不支持的语音识别引擎'));
      }
    });
  }

  /**
   * 百度语音识别
   */
  baiduRecognize(audioPath, dialectConfig) {
    return new Promise((resolve, reject) => {
      // 读取音频文件
      wx.getFileSystemManager().readFile({
        filePath: audioPath,
        success: (res) => {
          // 上传音频到服务器进行识别
          wx.request({
            url: `${app.globalData.apiConfig.baseURL}/voice/baidu/recognize`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${wx.getStorageSync('auth_token')}`
            },
            data: {
              audio: wx.arrayBufferToBase64(res.data),
              format: 'mp3',
              rate: 16000,
              channel: 1,
              cuid: this.getDeviceId(),
              token: this.getBaiduToken(),
              lan: dialectConfig.baiduLang
            },
            success: (res) => {
              if (res.data.success) {
                resolve({
                  text: res.data.result[0] || '',
                  confidence: res.data.confidence || 0,
                  engine: 'baidu'
                });
              } else {
                reject(new Error(res.data.message || '语音识别失败'));
              }
            },
            fail: reject
          });
        },
        fail: reject
      });
    });
  }

  /**
   * 讯飞语音识别
   */
  xunfeiRecognize(audioPath, dialectConfig) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiConfig.baseURL}/voice/xunfei/recognize`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('auth_token')}`
        },
        data: {
          audioPath: audioPath,
          dialect: dialectConfig.code
        },
        success: (res) => {
          if (res.data.success) {
            resolve({
              text: res.data.text || '',
              confidence: res.data.confidence || 0,
              engine: 'xunfei'
            });
          } else {
            reject(new Error(res.data.message || '语音识别失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 腾讯语音识别
   */
  tencentRecognize(audioPath, dialectConfig) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiConfig.baseURL}/voice/tencent/recognize`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('auth_token')}`
        },
        data: {
          audioPath: audioPath,
          language: dialectConfig.tencentLang
        },
        success: (res) => {
          if (res.data.success) {
            resolve({
              text: res.data.text || '',
              confidence: res.data.confidence || 0,
              engine: 'tencent'
            });
          } else {
            reject(new Error(res.data.message || '语音识别失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 语音合成
   */
  synthesizeSpeech(text, dialect = 'mandarin', options = {}) {
    return new Promise((resolve, reject) => {
      const dialectConfig = this.dialectMap[dialect] || this.dialectMap['mandarin'];

      // 检查网络状态
      if (app.globalData.networkStatus === 'offline') {
        // 尝试使用本地缓存
        const cachedAudio = this.getCachedAudio(text, dialect);
        if (cachedAudio) {
          this.playAudio(cachedAudio).then(resolve).catch(reject);
          return;
        } else {
          reject(new Error('网络连接不可用，无法进行语音合成'));
          return;
        }
      }

      // 根据不同引擎进行合成
      switch (dialectConfig.synthesisEngine) {
        case 'baidu':
          this.baiduSynthesize(text, dialectConfig, options)
            .then(resolve)
            .catch(reject);
          break;
        case 'xunfei':
          this.xunfeiSynthesize(text, dialectConfig, options)
            .then(resolve)
            .catch(reject);
          break;
        case 'tencent':
          this.tencentSynthesize(text, dialectConfig, options)
            .then(resolve)
            .catch(reject);
          break;
        default:
          reject(new Error('不支持的语音合成引擎'));
      }
    });
  }

  /**
   * 百度语音合成
   */
  baiduSynthesize(text, dialectConfig, options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiConfig.baseURL}/voice/baidu/synthesize`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('auth_token')}`
        },
        data: {
          text: text,
          lan: dialectConfig.baiduLang,
          spd: options.speed || 5,
          pit: options.pitch || 5,
          vol: options.volume || 8,
          per: options.person || 0
        },
        success: (res) => {
          if (res.data.success) {
            // 缓存音频
            this.cacheAudio(text, dialect, res.data.audioPath);

            // 播放音频
            this.playAudio(res.data.audioPath)
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error(res.data.message || '语音合成失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 讯飞语音合成
   */
  xunfeiSynthesize(text, dialectConfig, options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiConfig.baseURL}/voice/xunfei/synthesize`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('auth_token')}`
        },
        data: {
          text: text,
          dialect: dialectConfig.code,
          speed: options.speed || 50,
          pitch: options.pitch || 50,
          volume: options.volume || 80
        },
        success: (res) => {
          if (res.data.success) {
            // 缓存音频
            this.cacheAudio(text, dialect, res.data.audioPath);

            // 播放音频
            this.playAudio(res.data.audioPath)
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error(res.data.message || '语音合成失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 腾讯语音合成
   */
  tencentSynthesize(text, dialectConfig, options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiConfig.baseURL}/voice/tencent/synthesize`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('auth_token')}`
        },
        data: {
          text: text,
          language: dialectConfig.tencentLang,
          speed: options.speed || 1.0,
          pitch: options.pitch || 1.0,
          volume: options.volume || 1.0,
          voiceType: options.voiceType || 0
        },
        success: (res) => {
          if (res.data.success) {
            // 缓存音频
            this.cacheAudio(text, dialect, res.data.audioPath);

            // 播放音频
            this.playAudio(res.data.audioPath)
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error(res.data.message || '语音合成失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 播放音频
   */
  playAudio(audioPath) {
    return new Promise((resolve, reject) => {
      this.innerAudioContext.src = audioPath;

      this.onPlayEnd = resolve;
      this.onPlayError = reject;

      this.innerAudioContext.play();
    });
  }

  /**
   * 停止播放
   */
  stopPlaying() {
    if (this.innerAudioContext) {
      this.innerAudioContext.stop();
    }
  }

  /**
   * 检查录音权限
   */
  checkRecordPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record']) {
            resolve();
          } else {
            // 请求录音权限
            wx.authorize({
              scope: 'scope.record',
              success: resolve,
              fail: () => {
                // 用户拒绝，引导用户去设置页面
                wx.showModal({
                  title: '需要录音权限',
                  content: '语音功能需要录音权限，请在设置中开启',
                  showCancel: false,
                  confirmText: '去设置',
                  success: () => {
                    wx.openSetting();
                  }
                });
                reject(new Error('录音权限被拒绝'));
              }
            });
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 获取设备ID
   */
  getDeviceId() {
    let deviceId = wx.getStorageSync('device_id');
    if (!deviceId) {
      deviceId = `mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      wx.setStorageSync('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * 获取百度Token
   */
  getBaiduToken() {
    // 这里应该从服务器获取，简化示例
    return wx.getStorageSync('baidu_token') || '';
  }

  /**
   * 缓存音频
   */
  cacheAudio(text, dialect, audioPath) {
    try {
      const cacheKey = this.getAudioCacheKey(text, dialect);
      const cacheData = {
        text: text,
        dialect: dialect,
        audioPath: audioPath,
        timestamp: Date.now(),
        expireTime: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天
      };

      wx.setStorageSync(cacheKey, cacheData);

      // 清理过期音频缓存
      this.cleanExpiredAudioCache();
    } catch (error) {
      console.error('缓存音频失败:', error);
    }
  }

  /**
   * 获取缓存的音频
   */
  getCachedAudio(text, dialect) {
    try {
      const cacheKey = this.getAudioCacheKey(text, dialect);
      const cached = wx.getStorageSync(cacheKey);

      if (cached && cached.expireTime > Date.now()) {
        return cached.audioPath;
      } else if (cached) {
        // 缓存过期，删除
        wx.removeStorageSync(cacheKey);
      }
    } catch (error) {
      console.error('获取缓存音频失败:', error);
    }

    return null;
  }

  /**
   * 获取音频缓存键
   */
  getAudioCacheKey(text, dialect) {
    return `voice_cache_${dialect}_${this.hashString(text)}`;
  }

  /**
   * 字符串哈希
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 清理过期音频缓存
   */
  cleanExpiredAudioCache() {
    try {
      const now = Date.now();
      const keys = wx.getStorageInfoSync().keys;

      keys.forEach(key => {
        if (key.startsWith('voice_cache_')) {
          try {
            const cached = wx.getStorageSync(key);
            if (cached && cached.expireTime && now > cached.expireTime) {
              wx.removeStorageSync(key);
              console.log('清理过期音频缓存:', key);
            }
          } catch (error) {
            // 清理损坏的缓存
            wx.removeStorageSync(key);
          }
        }
      });
    } catch (error) {
      console.error('清理音频缓存失败:', error);
    }
  }

  /**
   * 获取支持的方言列表
   */
  getSupportedDialects() {
    return Object.keys(this.dialectMap).map(key => ({
      code: key,
      name: this.dialectMap[key].name
    }));
  }

  /**
   * 获取当前方言配置
   */
  getCurrentDialectConfig() {
    const currentDialect = app.getDialectType();
    return this.dialectMap[currentDialect] || this.dialectMap['mandarin'];
  }

  /**
   * 设置方言
   */
  setDialect(dialect) {
    if (this.dialectMap[dialect]) {
      app.setDialectType(dialect);
      return true;
    }
    return false;
  }

  /**
   * 智能语音交互
   */
  async voiceInteraction(options = {}) {
    try {
      // 开始录音
      await this.startRecording(options);

      // 显示录音提示
      wx.showToast({
        title: '正在录音...',
        icon: 'none',
        duration: 60000
      });

      // 等待录音结束
      const recordingResult = await new Promise((resolve) => {
        this.onRecordingStop = resolve;
      });

      if (!recordingResult) {
        throw new Error('录音失败');
      }

      // 隐藏录音提示
      wx.hideToast();

      // 语音识别
      wx.showLoading({ title: '正在识别...' });
      const recognitionResult = await this.recognizeSpeech(
        recordingResult.tempFilePath,
        app.getDialectType()
      );
      wx.hideLoading();

      if (!recognitionResult.text) {
        wx.showToast({
          title: '未识别到有效语音',
          icon: 'none'
        });
        return null;
      }

      return recognitionResult;

    } catch (error) {
      wx.hideToast();
      wx.hideLoading();

      wx.showToast({
        title: error.message || '语音交互失败',
        icon: 'none'
      });

      throw error;
    }
  }
}

// 创建实例
const voiceService = new VoiceService();

module.exports = voiceService;