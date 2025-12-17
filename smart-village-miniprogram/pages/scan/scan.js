/**
 * 扫码办事页面
 * 支持二维码扫描、历史记录、快速操作
 */

const app = getApp();
const qrCodeService = require('../../utils/qrcode');
const voiceService = require('../../utils/voice');

Page({
  data: {
    scanHistory: [],
    result: null,
    loading: false,
    showResult: false,
    hasCameraPermission: true,
    largeMode: false,
    quickActions: [
      {
        name: '我的户码',
        icon: '🏠',
        action: 'myHousehold'
      },
      {
        name: '设备管理',
        icon: '🔧',
        action: 'equipment'
      },
      {
        name: '应急联系',
        icon: '🚑',
        action: 'emergency'
      },
      {
        name: '办事指南',
        icon: '📋',
        action: 'guide'
      }
    ]
  },

  onLoad: function (options) {
    console.log('扫码页面加载', options);

    // 检查大字模式
    this.checkLargeMode();

    // 加载扫码历史
    this.loadScanHistory();

    // 检查相机权限
    this.checkCameraPermission();
  },

  onShow: function () {
    console.log('扫码页面显示');
  },

  onPullDownRefresh: function () {
    console.log('下拉刷新扫码历史');
    this.loadScanHistory();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage: function () {
    return {
      title: '智慧村庄 - 扫码办事',
      path: '/pages/scan/scan',
      imageUrl: '/images/scan-share.png'
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
   * 加载扫码历史
   */
  loadScanHistory: function () {
    try {
      const history = qrCodeService.loadScanHistory();
      this.setData({ scanHistory: history });
    } catch (error) {
      console.error('加载扫码历史失败:', error);
      wx.showToast({
        title: '加载历史失败',
        icon: 'none'
      });
    }
  },

  /**
   * 检查相机权限
   */
  checkCameraPermission: function () {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.camera']) {
          this.setData({ hasCameraPermission: false });
        }
      }
    });
  },

  /**
   * 请求相机权限
   */
  requestCameraPermission: function () {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        this.setData({ hasCameraPermission: true });
        this.startScan();
      },
      fail: () => {
        wx.showModal({
          title: '需要相机权限',
          content: '扫码功能需要相机权限，请在设置中开启',
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
   * 开始扫码
   */
  startScan: function () {
    if (!this.data.hasCameraPermission) {
      this.requestCameraPermission();
      return;
    }

    this.setData({ loading: true });

    qrCodeService.scanQRCode({
      onlyFromCamera: true
    })
      .then((result) => {
        console.log('扫码成功:', result);
        this.setData({
          result: result,
          showResult: true,
          loading: false
        });

        // 语音播报结果
        this.announceResult(result);
      })
      .catch((error) => {
        console.error('扫码失败:', error);
        this.setData({ loading: false });

        if (error.message !== '用户取消扫码') {
          wx.showToast({
            title: error.message || '扫码失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
  },

  /**
   * 语音播报结果
   */
  announceResult: function (result) {
    const voiceEnabled = wx.getStorageSync('voice_enabled') !== false;

    if (voiceEnabled) {
      let message = '';
      switch (result.type) {
        case 'household':
          message = '已识别一户一码';
          break;
        case 'service':
          message = '已识别办事服务';
          break;
        case 'announcement':
          message = '已识别公告通知';
          break;
        case 'finance':
          message = '已识别财务信息';
          break;
        case 'emergency':
          message = '已识别应急联系';
          break;
        case 'guide':
          message = '已识别办事指南';
          break;
        case 'contact':
          message = '已识别联系方式';
          break;
        case 'equipment':
          message = '已识别设备管理';
          break;
        default:
          message = '已识别二维码';
      }

      voiceService.synthesizeSpeech(message)
        .catch((error) => {
          console.error('语音播报失败:', error);
        });
    }
  },

  /**
   * 重新扫码
   */
  rescan: function () {
    this.setData({
      result: null,
      showResult: false
    });
    this.startScan();
  },

  /**
   * 执行操作
   */
  executeAction: function (e) {
    const action = e.currentTarget.dataset.action;
    const result = this.data.result;

    if (!result) {
      return;
    }

    this.setData({ loading: true });

    qrCodeService.executeAction(action, result.data)
      .then(() => {
        this.setData({ loading: false });
      })
      .catch((error) => {
        console.error('执行操作失败:', error);
        this.setData({ loading: false });

        wx.showToast({
          title: error.message || '操作失败',
          icon: 'none'
        });
      });
  },

  /**
   * 点击历史记录
   */
  onHistoryTap: function (e) {
    const item = e.currentTarget.dataset.item;

    wx.showModal({
      title: '历史记录',
      content: `${item.typeName}\n扫码时间: ${new Date(item.timestamp).toLocaleString()}`,
      confirmText: '删除',
      cancelText: '确定',
      success: (res) => {
        if (res.confirm) {
          this.deleteHistoryItem(item);
        }
      }
    });
  },

  /**
   * 删除历史记录项
   */
  deleteHistoryItem: function (item) {
    try {
      // 从历史记录中移除
      const history = this.data.scanHistory.filter(h => h.id !== item.id);
      this.setData({ scanHistory: history });

      // 更新存储
      wx.setStorageSync('scan_history', history);

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('删除历史记录失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 清空历史记录
   */
  clearHistory: function () {
    wx.showModal({
      title: '清空历史',
      content: '确定要清空所有扫码历史吗？',
      confirmText: '清空',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          try {
            qrCodeService.clearScanHistory();
            this.setData({ scanHistory: [] });

            wx.showToast({
              title: '清空成功',
              icon: 'success'
            });
          } catch (error) {
            console.error('清空历史失败:', error);
            wx.showToast({
              title: '清空失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 快速操作
   */
  onQuickAction: function (e) {
    const action = e.currentTarget.dataset.action;

    switch (action) {
      case 'myHousehold':
        this.goToMyHousehold();
        break;
      case 'equipment':
        this.goToEquipmentList();
        break;
      case 'emergency':
        this.goToEmergencyContacts();
        break;
      case 'guide':
        this.goToGuides();
        break;
    }
  },

  /**
   * 我的户码
   */
  goToMyHousehold: function () {
    const userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.householdId) {
      wx.showModal({
        title: '提示',
        content: '您还没有绑定户信息',
        showCancel: false
      });
      return;
    }

    // 生成户码二维码
    this.generateHouseholdQR(userInfo.householdId);
  },

  /**
   * 生成户码二维码
   */
  generateHouseholdQR: function (householdId) {
    wx.showLoading({ title: '生成户码...' });

    const qrData = {
      type: 'household',
      id: householdId,
      data: {
        generateTime: Date.now()
      }
    };

    qrCodeService.generateQRCode(qrData, {
      size: 300
    })
      .then((qrUrl) => {
        wx.hideLoading();

        wx.previewImage({
          urls: [qrUrl],
          current: qrUrl
        });

        wx.showToast({
          title: '户码生成成功',
          icon: 'success'
        });
      })
      .catch((error) => {
        wx.hideLoading();
        console.error('生成户码失败:', error);

        wx.showToast({
          title: '生成户码失败',
          icon: 'none'
        });
      });
  },

  /**
   * 设备列表
   */
  goToEquipmentList: function () {
    wx.navigateTo({
      url: '/pages/equipment/list'
    });
  },

  /**
   * 应急联系
   */
  goToEmergencyContacts: function () {
    wx.navigateTo({
      url: '/pages/emergency/contacts'
    });
  },

  /**
   * 办事指南
   */
  goToGuides: function () {
    wx.navigateTo({
      url: '/pages/guide/list'
    });
  },

  /**
   * 关闭结果页面
   */
  closeResult: function () {
    this.setData({
      result: null,
      showResult: false
    });
  },

  /**
   * 语音播报结果详情
   */
  voiceResultDetail: function () {
    const result = this.data.result;

    if (!result) {
      return;
    }

    let content = '';
    switch (result.type) {
      case 'household':
        content = result.title || '户信息';
        if (result.data && result.data.address) {
          content += '，地址：' + result.data.address;
        }
        break;
      case 'service':
        content = result.title || '办事服务';
        if (result.data && result.data.description) {
          content += '，' + result.data.description;
        }
        break;
      case 'announcement':
        content = result.title || '公告通知';
        if (result.data && result.data.content) {
          content += '，' + result.data.content;
        }
        break;
      default:
        content = result.title || '扫码结果';
    }

    voiceService.synthesizeSpeech(content)
      .catch((error) => {
        console.error('语音播报失败:', error);
        wx.showToast({
          title: '语音播报失败',
          icon: 'none'
        });
      });
  },

  /**
   * 分享结果
   */
  shareResult: function () {
    const result = this.data.result;

    if (!result) {
      return;
    }

    return {
      title: result.title || '扫码结果',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    };
  }
});