/**
 * 智慧村庄小程序首页
 * 展示核心功能入口、重要公告、快捷服务
 */

const app = getApp();
const request = require('../../utils/request');
const offlineCache = require('../../utils/offline');
const voiceService = require('../../utils/voice');

Page({
  data: {
    userInfo: null,
    villageInfo: null,
    networkStatus: 'online',
    announcements: [],
    services: [],
    quickActions: [
      {
        icon: 'scan',
        name: '扫码办事',
        url: '/pages/scan/scan',
        color: '#4CAF50'
      },
      {
        icon: 'voice',
        name: '语音助手',
        url: '/pages/voice/voice',
        color: '#2196F3'
      },
      {
        icon: 'announcement',
        name: '公告通知',
        url: '/pages/announcements/announcements',
        color: '#FF9800'
      },
      {
        icon: 'service',
        name: '便民服务',
        url: '/pages/services/services',
        color: '#9C27B0'
      }
    ],
    loading: true,
    refreshing: false,
    hasNetwork: true,
    largeMode: false,
    dialectType: 'mandarin'
  },

  onLoad: function (options) {
    console.log('首页加载', options);

    // 检查分享场景
    if (options.scene) {
      this.handleShareScene(options.scene);
    }

    // 初始化页面
    this.initPage();
  },

  onShow: function () {
    console.log('首页显示');

    // 更新网络状态
    this.updateNetworkStatus();

    // 检查用户登录状态
    this.checkUserStatus();

    // 加载页面数据
    this.loadPageData();

    // 检查大字模式
    this.checkLargeMode();
  },

  onPullDownRefresh: function () {
    console.log('下拉刷新');
    this.refreshData();
  },

  onReachBottom: function () {
    console.log('触底加载');
    this.loadMoreData();
  },

  onShareAppMessage: function () {
    return {
      title: '智慧村庄 - 便民服务平台',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    };
  },

  /**
   * 初始化页面
   */
  initPage: function () {
    this.setData({
      networkStatus: app.globalData.networkStatus,
      dialectType: app.getDialectType()
    });

    // 监听网络状态变化
    wx.onNetworkStatusChange(this.handleNetworkChange);
  },

  /**
   * 加载页面数据
   */
  loadPageData: function () {
    this.setData({ loading: true });

    Promise.all([
      this.loadAnnouncements(),
      this.loadServices(),
      this.loadVillageInfo()
    ])
      .then(() => {
        this.setData({ loading: false });
      })
      .catch((error) => {
        console.error('加载页面数据失败:', error);
        this.setData({ loading: false });

        // 尝试加载离线数据
        this.loadOfflineData();
      });
  },

  /**
   * 加载公告列表
   */
  loadAnnouncements: function () {
    return new Promise((resolve, reject) => {
      // 先尝试从缓存获取
      const cached = offlineCache.getCache('announcements_list');
      if (cached) {
        this.setData({ announcements: cached });
      }

      // 网络可用时获取最新数据
      if (app.globalData.networkStatus === 'online') {
        request.get('/announcements', {
          limit: 5,
          villageId: app.globalData.userInfo?.villageId,
          type: 'important'
        })
          .then((response) => {
            if (response.success) {
              const announcements = response.data || [];
              this.setData({ announcements });

              // 缓存数据
              offlineCache.setCache('announcements_list', announcements, {
                expireTime: 30 * 60 * 1000, // 30分钟
                priority: 'high'
              });
            }
            resolve();
          })
          .catch(reject);
      } else {
        resolve();
      }
    });
  },

  /**
   * 加载服务列表
   */
  loadServices: function () {
    return new Promise((resolve, reject) => {
      // 先尝试从缓存获取
      const cached = offlineCache.getCache('services_list');
      if (cached) {
        this.setData({ services: cached.slice(0, 8) }); // 只显示前8个
      }

      // 网络可用时获取最新数据
      if (app.globalData.networkStatus === 'online') {
        request.get('/services', {
          limit: 8,
          category: 'common',
          villageId: app.globalData.userInfo?.villageId
        })
          .then((response) => {
            if (response.success) {
              const services = response.data || [];
              this.setData({ services });

              // 缓存数据
              offlineCache.setCache('services_list', services, {
                expireTime: 60 * 60 * 1000, // 1小时
                priority: 'normal'
              });
            }
            resolve();
          })
          .catch(reject);
      } else {
        resolve();
      }
    });
  },

  /**
   * 加载村庄信息
   */
  loadVillageInfo: function () {
    return new Promise((resolve, reject) => {
      const userInfo = app.globalData.userInfo;
      if (!userInfo || !userInfo.villageId) {
        resolve();
        return;
      }

      // 先尝试从缓存获取
      const cached = offlineCache.getCache('village_info');
      if (cached) {
        this.setData({ villageInfo: cached });
      }

      // 网络可用时获取最新数据
      if (app.globalData.networkStatus === 'online') {
        request.get(`/village/${userInfo.villageId}`)
          .then((response) => {
            if (response.success) {
              this.setData({ villageInfo: response.data });

              // 缓存数据
              offlineCache.setCache('village_info', response.data, {
                expireTime: 2 * 60 * 60 * 1000, // 2小时
                priority: 'high'
              });
            }
            resolve();
          })
          .catch(reject);
      } else {
        resolve();
      }
    });
  },

  /**
   * 加载离线数据
   */
  loadOfflineData: function () {
    console.log('加载离线数据');

    const announcements = offlineCache.getCache('announcements_list');
    const services = offlineCache.getCache('services_list');
    const villageInfo = offlineCache.getCache('village_info');

    if (announcements) {
      this.setData({ announcements });
    }

    if (services) {
      this.setData({ services: services.slice(0, 8) });
    }

    if (villageInfo) {
      this.setData({ villageInfo });
    }
  },

  /**
   * 刷新数据
   */
  refreshData: function () {
    this.setData({ refreshing: true });

    // 清除相关缓存
    offlineCache.removeCache('announcements_list');
    offlineCache.removeCache('services_list');
    offlineCache.removeCache('village_info');

    this.loadPageData()
      .then(() => {
        this.setData({ refreshing: false });
        wx.stopPullDownRefresh();
      })
      .catch(() => {
        this.setData({ refreshing: false });
        wx.stopPullDownRefresh();

        wx.showToast({
          title: '刷新失败',
          icon: 'none'
        });
      });
  },

  /**
   * 加载更多数据
   */
  loadMoreData: function () {
    // 实现加载更多逻辑
    console.log('加载更多数据');
  },

  /**
   * 检查用户状态
   */
  checkUserStatus: function () {
    const userInfo = app.globalData.userInfo;
    this.setData({ userInfo });

    if (!userInfo) {
      // 未登录，显示登录提示
      this.showLoginModal();
    }
  },

  /**
   * 更新网络状态
   */
  updateNetworkStatus: function () {
    const networkStatus = app.globalData.networkStatus;
    const hasNetwork = networkStatus !== 'unknown' && networkStatus !== 'none';

    this.setData({
      networkStatus,
      hasNetwork
    });

    if (!hasNetwork) {
      wx.showToast({
        title: '网络连接已断开',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 处理网络状态变化
   */
  handleNetworkChange: function (res) {
    console.log('网络状态变化:', res);

    this.setData({
      networkStatus: res.isConnected ? 'online' : 'offline',
      hasNetwork: res.isConnected
    });

    if (res.isConnected) {
      // 网络恢复时刷新数据
      this.loadPageData();
    }
  },

  /**
   * 检查大字模式
   */
  checkLargeMode: function () {
    const largeMode = wx.getStorageSync('large_mode') || false;
    this.setData({ largeMode });
  },

  /**
   * 处理分享场景
   */
  handleShareScene: function (scene) {
    console.log('分享场景:', scene);

    // 根据场景值进行特殊处理
    switch (scene) {
      case 1007: // 单聊会话中的小程序消息卡片
        wx.showToast({
          title: '欢迎来到智慧村庄',
          icon: 'none',
          duration: 2000
        });
        break;
      case 1008: // 群聊会话中的小程序消息卡片
        wx.showToast({
          title: '欢迎来到智慧村庄',
          icon: 'none',
          duration: 2000
        });
        break;
    }
  },

  /**
   * 显示登录提示
   */
  showLoginModal: function () {
    wx.showModal({
      title: '登录提示',
      content: '登录后可以享受更多便民服务',
      confirmText: '去登录',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  /**
   * 点击快捷操作
   */
  onQuickActionTap: function (e) {
    const action = e.currentTarget.dataset.action;

    if (action) {
      wx.navigateTo({
        url: action.url
      });
    }
  },

  /**
   * 点击公告
   */
  onAnnouncementTap: function (e) {
    const announcement = e.currentTarget.dataset.announcement;

    wx.navigateTo({
      url: `/pages/announcement/detail?id=${announcement.id}`
    });
  },

  /**
   * 点击服务
   */
  onServiceTap: function (e) {
    const service = e.currentTarget.dataset.service;

    wx.navigateTo({
      url: `/pages/service/detail?id=${service.id}`
    });
  },

  /**
   * 语音播报公告
   */
  onVoiceAnnouncement: function (e) {
    const announcement = e.currentTarget.dataset.announcement;

    wx.showLoading({ title: '正在生成语音...' });

    voiceService.synthesizeSpeech(announcement.title + '，' + announcement.content)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '语音播报开始',
          icon: 'success'
        });
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({
          title: error.message || '语音播报失败',
          icon: 'none'
        });
      });
  },

  /**
   * 切换大字模式
   */
  onToggleLargeMode: function () {
    const newMode = !this.data.largeMode;
    this.setData({ largeMode: newMode });

    wx.setStorageSync('large_mode', newMode);

    wx.showToast({
      title: newMode ? '已开启大字模式' : '已关闭大字模式',
      icon: 'success'
    });
  },

  /**
   * 切换方言
   */
  onDialectChange: function () {
    const dialects = voiceService.getSupportedDialects();
    const currentDialect = app.getDialectType();

    wx.showActionSheet({
      itemList: dialects.map(d => d.name),
      success: (res) => {
        const selectedDialect = dialects[res.tapIndex];
        voiceService.setDialect(selectedDialect.code);

        this.setData({ dialectType: selectedDialect.code });

        wx.showToast({
          title: `已切换为${selectedDialect.name}`,
          icon: 'success'
        });
      }
    });
  },

  /**
   * 网络设置
   */
  onNetworkSettings: function () {
    wx.showActionSheet({
      itemList: ['刷新数据', '离线缓存管理', '网络诊断'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.refreshData();
            break;
          case 1:
            this.showCacheManagement();
            break;
          case 2:
            this.diagnoseNetwork();
            break;
        }
      }
    });
  },

  /**
   * 显示缓存管理
   */
  showCacheManagement: function () {
    const cacheStats = offlineCache.getCacheStats();
    const queueStats = offlineCache.getQueueStats();

    wx.showModal({
      title: '离线缓存管理',
      content: `缓存项数: ${cacheStats.totalCount}\n缓存大小: ${Math.round(cacheStats.totalSize / 1024)}KB\n队列项数: ${queueStats.totalCount}`,
      confirmText: '清理缓存',
      cancelText: '确定',
      success: (res) => {
        if (res.confirm) {
          offlineCache.clearCache();
          wx.showToast({
            title: '缓存已清理',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 网络诊断
   */
  diagnoseNetwork: function () {
    wx.getNetworkType({
      success: (res) => {
        wx.showModal({
          title: '网络诊断',
          content: `网络类型: ${res.networkType}\n连接状态: ${res.isConnected ? '已连接' : '未连接'}`,
          showCancel: false
        });
      }
    });
  },

  /**
   * 查看更多公告
   */
  onViewMoreAnnouncements: function () {
    wx.navigateTo({
      url: '/pages/announcements/announcements'
    });
  },

  /**
   * 查看更多服务
   */
  onViewMoreServices: function () {
    wx.navigateTo({
      url: '/pages/services/services'
    });
  }
});