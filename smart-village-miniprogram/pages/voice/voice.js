/**
 * 语音交互页面
 * 支持方言识别、语音合成、智能问答
 */

const app = getApp();
const voiceService = require('../../utils/voice');
const request = require('../../utils/request');

Page({
  data: {
    isRecording: false,
    recordingTime: 0,
    recognitionResult: '',
    conversationHistory: [],
    supportedDialects: [],
    currentDialect: 'mandarin',
    voiceEnabled: true,
    largeMode: false,
    quickCommands: [
      {
        command: '查看公告',
        icon: '📢',
        action: 'announcements'
      },
      {
        command: '办事服务',
        icon: '🛠️',
        action: 'services'
      },
      {
        command: '紧急求助',
        icon: '🚑',
        action: 'emergency'
      },
      {
        command: '财务查询',
        icon: '💰',
        action: 'finance'
      },
      {
        command: '联系方式',
        icon: '📞',
        action: 'contacts'
      },
      {
        command: '办事指南',
        icon: '📋',
        action: 'guides'
      }
    ],
    aiAnswer: '',
    loading: false
  },

  onLoad: function (options) {
    console.log('语音页面加载', options);

    // 检查大字模式
    this.checkLargeMode();

    // 加载支持的方言
    this.loadSupportedDialects();

    // 加载对话历史
    this.loadConversationHistory();

    // 检查语音权限
    this.checkVoicePermission();

    // 初始化录音计时器
    this.initRecordingTimer();
  },

  onShow: function () {
    console.log('语音页面显示');

    // 更新当前方言
    this.setData({
      currentDialect: app.getDialectType()
    });
  },

  onUnload: function () {
    console.log('语音页面卸载');

    // 清理录音计时器
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }

    // 停止录音
    if (this.data.isRecording) {
      voiceService.stopRecording();
    }

    // 停止语音播放
    voiceService.stopPlaying();
  },

  onShareAppMessage: function () {
    return {
      title: '智慧村庄 - 语音助手',
      path: '/pages/voice/voice',
      imageUrl: '/images/voice-share.png'
    };
  },

  /**
   * 检查大字模式
   */
  checkLargeMode: function () {
    const largeMode = wx.getStorageSync('large_mode') || false;
    this.setData({ largeMode });
  },

  /**
   * 加载支持的方言
   */
  loadSupportedDialects: function () {
    try {
      const dialects = voiceService.getSupportedDialects();
      this.setData({ supportedDialects: dialects });
    } catch (error) {
      console.error('加载支持的方言失败:', error);
    }
  },

  /**
   * 加载对话历史
   */
  loadConversationHistory: function () {
    try {
      const history = wx.getStorageSync('voice_conversation_history') || [];
      this.setData({ conversationHistory: history.slice(-10) }); // 只显示最近10条
    } catch (error) {
      console.error('加载对话历史失败:', error);
    }
  },

  /**
   * 保存对话历史
   */
  saveConversationHistory: function (userInput, aiResponse) {
    try {
      const history = this.data.conversationHistory;
      history.push({
        userInput: userInput,
        aiResponse: aiResponse,
        timestamp: Date.now(),
        dialect: this.data.currentDialect
      });

      // 限制历史记录数量
      if (history.length > 50) {
        history.shift();
      }

      this.setData({ conversationHistory: history });
      wx.setStorageSync('voice_conversation_history', history);
    } catch (error) {
      console.error('保存对话历史失败:', error);
    }
  },

  /**
   * 检查语音权限
   */
  checkVoicePermission: function () {
    wx.getSetting({
      success: (res) => {
        const voiceEnabled = res.authSetting['scope.record'] !== false;
        this.setData({ voiceEnabled });
      }
    });
  },

  /**
   * 请求语音权限
   */
  requestVoicePermission: function () {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({ voiceEnabled: true });
        wx.showToast({
          title: '语音权限已授权',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showModal({
          title: '需要语音权限',
          content: '语音功能需要录音权限，请在设置中开启',
          showCancel: false,
          confirmText: '去设置',
          success: () => {
            wx.openSetting();
          }
        });
      }
    });
  },

  /**
   * 初始化录音计时器
   */
  initRecordingTimer: function () {
    this.recordingTimer = null;
  },

  /**
   * 开始录音
   */
  startRecording: function () {
    if (!this.data.voiceEnabled) {
      this.requestVoicePermission();
      return;
    }

    if (this.data.isRecording) {
      this.stopRecording();
      return;
    }

    this.setData({
      isRecording: true,
      recordingTime: 0,
      recognitionResult: '',
      aiAnswer: ''
    });

    // 开始录音计时
    this.recordingTimer = setInterval(() => {
      const newTime = this.data.recordingTime + 1;
      this.setData({ recordingTime: newTime });

      // 最长录音60秒
      if (newTime >= 60) {
        this.stopRecording();
      }
    }, 1000);

    // 开始录音
    voiceService.startRecording({
      duration: 60000 // 60秒
    })
      .then(() => {
        console.log('录音开始');
      })
      .catch((error) => {
        console.error('开始录音失败:', error);
        this.setData({ isRecording: false });
        clearInterval(this.recordingTimer);

        wx.showToast({
          title: error.message || '开始录音失败',
          icon: 'none'
        });
      });
  },

  /**
   * 停止录音
   */
  stopRecording: function () {
    if (!this.data.isRecording) {
      return;
    }

    this.setData({ isRecording: false });
    clearInterval(this.recordingTimer);

    wx.showLoading({ title: '正在识别...' });

    voiceService.stopRecording()
      .then((recordingResult) => {
        console.log('录音结束', recordingResult);

        if (!recordingResult) {
          wx.hideLoading();
          wx.showToast({
            title: '录音失败',
            icon: 'none'
          });
          return;
        }

        // 进行语音识别
        return this.recognizeSpeech(recordingResult.tempFilePath);
      })
      .then((recognitionResult) => {
        wx.hideLoading();

        if (!recognitionResult || !recognitionResult.text) {
          wx.showToast({
            title: '未识别到有效语音',
            icon: 'none'
          });
          return;
        }

        this.setData({ recognitionResult: recognitionResult.text });

        // 处理语音命令
        this.processVoiceCommand(recognitionResult.text);
      })
      .catch((error) => {
        wx.hideLoading();
        console.error('语音识别失败:', error);

        wx.showToast({
          title: error.message || '语音识别失败',
          icon: 'none'
        });
      });
  },

  /**
   * 语音识别
   */
  recognizeSpeech: function (audioPath) {
    return voiceService.recognizeSpeech(audioPath, this.data.currentDialect);
  },

  /**
   * 处理语音命令
   */
  async processVoiceCommand(text) {
    try {
      this.setData({ loading: true });

      // 预处理文本
      const cleanedText = text.trim().toLowerCase();

      // 检查快捷命令
      const quickCommand = this.checkQuickCommand(cleanedText);
      if (quickCommand) {
        await this.executeQuickCommand(quickCommand);
        return;
      }

      // AI智能问答
      const aiResponse = await this.getAIResponse(cleanedText);

      this.setData({
        aiAnswer: aiResponse,
        loading: false
      });

      // 语音播报AI回答
      if (aiResponse) {
        await this.speakResponse(aiResponse);
      }

      // 保存对话历史
      this.saveConversationHistory(text, aiResponse);

    } catch (error) {
      console.error('处理语音命令失败:', error);
      this.setData({ loading: false });

      wx.showToast({
        title: error.message || '处理失败',
        icon: 'none'
      });
    }
  },

  /**
   * 检查快捷命令
   */
  checkQuickCommand: function (text) {
    const commands = {
      '查看公告': 'announcements',
      '公告': 'announcements',
      '通知': 'announcements',
      '办事服务': 'services',
      '服务': 'services',
      '业务': 'services',
      '紧急求助': 'emergency',
      '求助': 'emergency',
      '急救': 'emergency',
      '财务查询': 'finance',
      '财务': 'finance',
      '钱': 'finance',
      '联系方式': 'contacts',
      '电话': 'contacts',
      '联系': 'contacts',
      '办事指南': 'guides',
      '指南': 'guides',
      '帮助': 'guides'
    };

    return commands[text] || null;
  },

  /**
   * 执行快捷命令
   */
  async executeQuickCommand(command) {
    this.setData({ loading: false });

    switch (command) {
      case 'announcements':
        this.goToAnnouncements();
        break;
      case 'services':
        this.goToServices();
        break;
      case 'emergency':
        this.showEmergencyHelp();
        break;
      case 'finance':
        this.goToFinance();
        break;
      case 'contacts':
        this.goToContacts();
        break;
      case 'guides':
        this.goToGuides();
        break;
    }
  },

  /**
   * 获取AI回答
   */
  async getAIResponse(text) {
    try {
      // 检查网络状态
      if (app.globalData.networkStatus === 'offline') {
        return this.getOfflineResponse(text);
      }

      const response = await request.post('/voice/ai/chat', {
        message: text,
        dialect: this.data.currentDialect,
        context: this.getConversationContext()
      });

      if (response.success) {
        return response.data.answer;
      } else {
        throw new Error(response.message || 'AI响应失败');
      }
    } catch (error) {
      console.error('获取AI回答失败:', error);
      return this.getOfflineResponse(text);
    }
  },

  /**
   * 离线响应
   */
  getOfflineResponse(text) {
    const offlineResponses = {
      '你好': '您好！我是智慧村庄语音助手，很高兴为您服务。我可以帮您查询公告、办理业务、提供帮助等。',
      '再见': '再见！如有需要，随时可以找我。',
      '谢谢': '不客气！这是我应该做的。',
      '姓名': '请问您需要查询哪位村民的信息？',
      '身份证': '身份证号属于敏感信息，请到村委办公室咨询。',
      '补贴': '您可以查询各类补贴信息，如粮食补贴、医保补贴等。',
      '证明': '常用的证明有居住证明、收入证明等，可以在村委办理。',
      '户口': '户口相关业务请到镇派出所办理。',
      '医保': '医保缴费和报销可以到村委会咨询。',
      '养老': '养老保险缴费和领取待遇可以咨询村委。'
    };

    // 模糊匹配
    for (const [key, value] of Object.entries(offlineResponses)) {
      if (text.includes(key)) {
        return value;
      }
    }

    return '抱歉，我现在无法连接到智能服务系统。您可以尝试说"查看公告"、"办事服务"等快捷命令，或者稍后再试。';
  },

  /**
   * 获取对话上下文
   */
  getConversationContext: function () {
    // 获取最近3条对话作为上下文
    return this.data.conversationHistory.slice(-3);
  },

  /**
   * 语音播报回答
   */
  async speakResponse(text) {
    try {
      const voiceEnabled = wx.getStorageSync('voice_enabled') !== false;

      if (voiceEnabled) {
        await voiceService.synthesizeSpeech(text, this.data.currentDialect);
      }
    } catch (error) {
      console.error('语音播报失败:', error);
    }
  },

  /**
   * 切换方言
   */
  changeDialect: function () {
    wx.showActionSheet({
      itemList: this.data.supportedDialects.map(d => d.name),
      success: (res) => {
        const selectedDialect = this.data.supportedDialects[res.tapIndex];
        voiceService.setDialect(selectedDialect.code);

        this.setData({ currentDialect: selectedDialect.code });

        wx.showToast({
          title: `已切换为${selectedDialect.name}`,
          icon: 'success'
        });

        // 语音播报确认
        voiceService.synthesizeSpeech(`已切换为${selectedDialect.name}`)
          .catch(() => {});
      }
    });
  },

  /**
   * 语音播放控制
   */
  toggleVoicePlayback: function () {
    const currentEnabled = wx.getStorageSync('voice_enabled') !== false;
    const newEnabled = !currentEnabled;

    wx.setStorageSync('voice_enabled', newEnabled);
    this.setData({ voiceEnabled: newEnabled });

    wx.showToast({
      title: newEnabled ? '语音播报已开启' : '语音播报已关闭',
      icon: 'success'
    });
  },

  /**
   * 清空对话历史
   */
  clearHistory: function () {
    wx.showModal({
      title: '清空历史',
      content: '确定要清空对话历史吗？',
      confirmText: '清空',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            conversationHistory: [],
            recognitionResult: '',
            aiAnswer: ''
          });

          wx.removeStorageSync('voice_conversation_history');

          wx.showToast({
            title: '历史已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 点击快捷命令
   */
  onQuickCommandTap: function (e) {
    const action = e.currentTarget.dataset.action;
    this.executeQuickCommand(action);
  },

  /**
   * 重新播报
   */
  replayAnswer: function () {
    if (this.data.aiAnswer) {
      this.speakResponse(this.data.aiAnswer);
    }
  },

  /**
   * 复制回答
   */
  copyAnswer: function () {
    if (this.data.aiAnswer) {
      wx.setClipboardData({
        data: this.data.aiAnswer,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          });
        }
      });
    }
  },

  // 页面跳转方法
  goToAnnouncements: function () {
    wx.navigateTo({
      url: '/pages/announcements/announcements'
    });
  },

  goToServices: function () {
    wx.navigateTo({
      url: '/pages/services/services'
    });
  },

  showEmergencyHelp: function () {
    wx.makePhoneCall({
      phoneNumber: '110'
    });
  },

  goToFinance: function () {
    wx.navigateTo({
      url: '/pages/finance/overview'
    });
  },

  goToContacts: function () {
    wx.navigateTo({
      url: '/pages/contacts/list'
    });
  },

  goToGuides: function () {
    wx.navigateTo({
      url: '/pages/guide/list'
    });
  }
});