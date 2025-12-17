/**
 * 二维码扫描和处理工具
 * 支持一户一码、办事指南、信息查询等功能
 */

const app = getApp();

class QRCodeService {
  constructor() {
    this.scanResult = null;
    this.scanHistory = [];
    this.qrCodeTypes = {
      'household': '一户一码',
      'service': '办事服务',
      'announcement': '公告通知',
      'finance': '财务信息',
      'emergency': '应急联系',
      'guide': '办事指南',
      'contact': '联系方式',
      'equipment': '设备管理'
    };
  }

  /**
   * 扫描二维码
   */
  scanQRCode(options = {}) {
    return new Promise((resolve, reject) => {
      // 检查相机权限
      this.checkCameraPermission()
        .then(() => {
          wx.scanCode({
            onlyFromCamera: options.onlyFromCamera || false,
            scanType: ['qrCode', 'barCode'],
            success: (res) => {
              console.log('扫码结果:', res);

              // 处理扫码结果
              this.processScanResult(res)
                .then(resolve)
                .catch(reject);
            },
            fail: (error) => {
              console.error('扫码失败:', error);

              if (error.errMsg.includes('permission')) {
                wx.showModal({
                  title: '需要相机权限',
                  content: '扫码功能需要相机权限，请在设置中开启',
                  showCancel: false,
                  confirmText: '去设置',
                  success: () => {
                    wx.openSetting();
                  }
                });
              } else if (error.errMsg.includes('cancel')) {
                reject(new Error('用户取消扫码'));
              } else {
                reject(new Error('扫码失败: ' + error.errMsg));
              }
            }
          });
        })
        .catch(reject);
    });
  }

  /**
   * 处理扫码结果
   */
  async processScanResult(result) {
    try {
      const { result: qrText, scanType } = result;

      // 解析二维码内容
      const qrData = this.parseQRCode(qrText);

      if (!qrData) {
        throw new Error('无效的二维码');
      }

      // 记录扫码历史
      this.recordScanHistory(qrData);

      // 根据类型处理
      switch (qrData.type) {
        case 'household':
          return await this.handleHouseholdQR(qrData);
        case 'service':
          return await this.handleServiceQR(qrData);
        case 'announcement':
          return await this.handleAnnouncementQR(qrData);
        case 'finance':
          return await this.handleFinanceQR(qrData);
        case 'emergency':
          return await this.handleEmergencyQR(qrData);
        case 'guide':
          return await this.handleGuideQR(qrData);
        case 'contact':
          return await this.handleContactQR(qrData);
        case 'equipment':
          return await this.handleEquipmentQR(qrData);
        default:
          throw new Error('不支持的二维码类型');
      }
    } catch (error) {
      console.error('处理扫码结果失败:', error);
      throw error;
    }
  }

  /**
   * 解析二维码
   */
  parseQRCode(qrText) {
    try {
      // 尝试解析JSON格式
      if (qrText.startsWith('{') && qrText.endsWith('}')) {
        const data = JSON.parse(qrText);
        if (data.type && this.qrCodeTypes[data.type]) {
          return data;
        }
      }

      // 尝试解析URL格式
      if (qrText.startsWith('http')) {
        const url = new URL(qrText);
        const params = new URLSearchParams(url.search);
        const type = params.get('type');

        if (type && this.qrCodeTypes[type]) {
          return {
            type: type,
            id: params.get('id'),
            data: Object.fromEntries(params)
          };
        }
      }

      // 尝试解析智慧村庄专用格式
      if (qrText.startsWith('SV://')) {
        const parts = qrText.substring(5).split('/');
        if (parts.length >= 2) {
          return {
            type: parts[0],
            id: parts[1],
            data: parts.length > 2 ? JSON.parse(parts[2]) : {}
          };
        }
      }

      // 尝试解析一户一码格式
      if (qrText.match(/^HH\d{10}$/)) {
        return {
          type: 'household',
          id: qrText,
          data: {}
        };
      }

      // 尝试解析设备编码格式
      if (qrText.match(/^EQ\d{8}$/)) {
        return {
          type: 'equipment',
          id: qrText,
          data: {}
        };
      }

      return null;
    } catch (error) {
      console.error('解析二维码失败:', error);
      return null;
    }
  }

  /**
   * 处理一户一码
   */
  async handleHouseholdQR(qrData) {
    try {
      wx.showLoading({ title: '获取户信息...' });

      const request = require('./request');
      const response = await request.get(`/household/${qrData.id}`, {}, {
        enableCache: true,
        cacheTime: 5 * 60 * 1000 // 5分钟缓存
      });

      wx.hideLoading();

      if (response.success) {
        // 检查权限
        const hasPermission = this.checkHouseholdPermission(response.data);

        return {
          type: 'household',
          title: '一户一码',
          data: response.data,
          hasPermission: hasPermission,
          actions: this.getHouseholdActions(response.data, hasPermission)
        };
      } else {
        throw new Error(response.message || '获取户信息失败');
      }
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  }

  /**
   * 处理办事服务
   */
  async handleServiceQR(qrData) {
    try {
      wx.showLoading({ title: '获取服务信息...' });

      const request = require('./request');
      const response = await request.get(`/service/${qrData.id}`, {}, {
        enableCache: true,
        cacheTime: 30 * 60 * 1000 // 30分钟缓存
      });

      wx.hideLoading();

      if (response.success) {
        return {
          type: 'service',
          title: '办事服务',
          data: response.data,
          actions: this.getServiceActions(response.data)
        };
      } else {
        throw new Error(response.message || '获取服务信息失败');
      }
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  }

  /**
   * 处理公告通知
   */
  async handleAnnouncementQR(qrData) {
    try {
      wx.showLoading({ title: '获取公告详情...' });

      const request = require('./request');
      const response = await request.get(`/announcement/${qrData.id}`, {}, {
        enableCache: true,
        cacheTime: 60 * 60 * 1000 // 1小时缓存
      });

      wx.hideLoading();

      if (response.success) {
        return {
          type: 'announcement',
          title: '公告通知',
          data: response.data,
          actions: this.getAnnouncementActions(response.data)
        };
      } else {
        throw new Error(response.message || '获取公告详情失败');
      }
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  }

  /**
   * 处理财务信息
   */
  async handleFinanceQR(qrData) {
    try {
      // 检查权限
      const hasPermission = this.checkFinancePermission();

      if (!hasPermission) {
        throw new Error('您没有查看财务信息的权限');
      }

      wx.showLoading({ title: '获取财务信息...' });

      const request = require('./request');
      const response = await request.get(`/finance/qr/${qrData.id}`, {}, {
        enableCache: true,
        cacheTime: 10 * 60 * 1000 // 10分钟缓存
      });

      wx.hideLoading();

      if (response.success) {
        return {
          type: 'finance',
          title: '财务信息',
          data: response.data,
          hasPermission: true,
          actions: this.getFinanceActions(response.data)
        };
      } else {
        throw new Error(response.message || '获取财务信息失败');
      }
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  }

  /**
   * 处理应急联系
   */
  async handleEmergencyQR(qrData) {
    try {
      const emergencyData = {
        id: qrData.id,
        phone: qrData.data.phone || '110',
        name: qrData.data.name || '应急指挥中心',
        location: qrData.data.location || '',
        instructions: qrData.data.instructions || ''
      };

      return {
        type: 'emergency',
        title: '应急联系',
        data: emergencyData,
        actions: this.getEmergencyActions(emergencyData)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 处理办事指南
   */
  async handleGuideQR(qrData) {
    try {
      wx.showLoading({ title: '获取指南内容...' });

      const request = require('./request');
      const response = await request.get(`/guide/${qrData.id}`, {}, {
        enableCache: true,
        cacheTime: 24 * 60 * 60 * 1000 // 24小时缓存
      });

      wx.hideLoading();

      if (response.success) {
        return {
          type: 'guide',
          title: '办事指南',
          data: response.data,
          actions: this.getGuideActions(response.data)
        };
      } else {
        throw new Error(response.message || '获取指南内容失败');
      }
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  }

  /**
   * 处理联系方式
   */
  async handleContactQR(qrData) {
    try {
      const contactData = {
        name: qrData.data.name || '',
        phone: qrData.data.phone || '',
        position: qrData.data.position || '',
        department: qrData.data.department || '',
        wechat: qrData.data.wechat || ''
      };

      return {
        type: 'contact',
        title: '联系方式',
        data: contactData,
        actions: this.getContactActions(contactData)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 处理设备管理
   */
  async handleEquipmentQR(qrData) {
    try {
      wx.showLoading({ title: '获取设备信息...' });

      const request = require('./request');
      const response = await request.get(`/equipment/${qrData.id}`, {}, {
        enableCache: true,
        cacheTime: 15 * 60 * 1000 // 15分钟缓存
      });

      wx.hideLoading();

      if (response.success) {
        return {
          type: 'equipment',
          title: '设备管理',
          data: response.data,
          actions: this.getEquipmentActions(response.data)
        };
      } else {
        throw new Error(response.message || '获取设备信息失败');
      }
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  }

  /**
   * 检查户信息权限
   */
  checkHouseholdPermission(householdData) {
    const userInfo = app.globalData.userInfo;

    if (!userInfo) {
      return false;
    }

    // 自己的家庭信息
    if (userInfo.householdId === householdData.id) {
      return { canView: true, canEdit: true, canViewSensitive: true };
    }

    // 村委干部权限
    if (['village_admin', 'village_secretary', 'accountant', 'population_director'].includes(userInfo.role)) {
      return { canView: true, canEdit: false, canViewSensitive: false };
    }

    // 管理员权限
    if (['super_admin', 'department_head', 'auditor'].includes(userInfo.role)) {
      return { canView: true, canEdit: false, canViewSensitive: false };
    }

    // 血缘关系检查
    if (this.isBloodRelation(userInfo, householdData)) {
      return { canView: true, canEdit: false, canViewSensitive: false };
    }

    return { canView: false, canEdit: false, canViewSensitive: false };
  }

  /**
   * 检查财务权限
   */
  checkFinancePermission() {
    const userInfo = app.globalData.userInfo;

    if (!userInfo) {
      return false;
    }

    return ['super_admin', 'department_head', 'auditor', 'village_admin', 'village_secretary', 'accountant'].includes(userInfo.role);
  }

  /**
   * 检查血缘关系
   */
  isBloodRelation(userInfo, householdData) {
    // 简化的血缘关系检查
    // 实际应该调用复杂的血缘关系验证系统
    return userInfo.villageId === householdData.villageId;
  }

  /**
   * 获取户信息操作
   */
  getHouseholdActions(householdData, permission) {
    const actions = [];

    if (permission.canView) {
      actions.push({
        text: '查看详情',
        type: 'view',
        action: 'viewHousehold'
      });
    }

    if (permission.canEdit) {
      actions.push({
        text: '编辑信息',
        type: 'edit',
        action: 'editHousehold'
      });
    }

    if (permission.canViewSensitive) {
      actions.push({
        text: '查看敏感信息',
        type: 'sensitive',
        action: 'viewSensitive'
      });
    }

    actions.push({
      text: '下载信息',
      type: 'download',
      action: 'downloadHousehold'
    });

    return actions;
  }

  /**
   * 获取服务操作
   */
  getServiceActions(serviceData) {
    return [
      {
        text: '在线办理',
        type: 'primary',
        action: 'applyService'
      },
      {
        text: '查看详情',
        type: 'view',
        action: 'viewService'
      },
      {
        text: '预约办理',
        type: 'secondary',
        action: 'bookService'
      }
    ];
  }

  /**
   * 获取公告操作
   */
  getAnnouncementActions(announcementData) {
    return [
      {
        text: '查看详情',
        type: 'view',
        action: 'viewAnnouncement'
      },
      {
        text: '分享',
        type: 'share',
        action: 'shareAnnouncement'
      },
      {
        text: '语音播报',
        type: 'voice',
        action: 'voiceAnnouncement'
      }
    ];
  }

  /**
   * 获取财务操作
   */
  getFinanceActions(financeData) {
    return [
      {
        text: '查看详情',
        type: 'view',
        action: 'viewFinance'
      },
      {
        text: '下载凭证',
        type: 'download',
        action: 'downloadFinance'
      }
    ];
  }

  /**
   * 获取应急操作
   */
  getEmergencyActions(emergencyData) {
    const actions = [];

    if (emergencyData.phone) {
      actions.push({
        text: '一键呼叫',
        type: 'emergency',
        action: 'callEmergency'
      });
    }

    actions.push({
      text: '查看位置',
      type: 'location',
      action: 'viewLocation'
    });

    if (emergencyData.instructions) {
      actions.push({
        text: '查看说明',
        type: 'view',
        action: 'viewInstructions'
      });
    }

    return actions;
  }

  /**
   * 获取指南操作
   */
  getGuideActions(guideData) {
    return [
      {
        text: '查看详情',
        type: 'view',
        action: 'viewGuide'
      },
      {
        text: '语音播报',
        type: 'voice',
        action: 'voiceGuide'
      },
      {
        text: '收藏',
        type: 'favorite',
        action: 'favoriteGuide'
      }
    ];
  }

  /**
   * 获取联系方式操作
   */
  getContactActions(contactData) {
    const actions = [];

    if (contactData.phone) {
      actions.push({
        text: '拨打电话',
        type: 'call',
        action: 'callContact'
      });
    }

    if (contactData.wechat) {
      actions.push({
        text: '复制微信号',
        type: 'copy',
        action: 'copyWechat'
      });
    }

    actions.push({
      text: '保存到通讯录',
      type: 'save',
      action: 'saveContact'
    });

    return actions;
  }

  /**
   * 获取设备操作
   */
  getEquipmentActions(equipmentData) {
    const actions = [
      {
        text: '查看详情',
        type: 'view',
        action: 'viewEquipment'
      },
      {
        text: '设备状态',
        type: 'status',
        action: 'equipmentStatus'
      }
    ];

    if (equipmentData.canControl) {
      actions.push({
        text: '远程控制',
        type: 'control',
        action: 'controlEquipment'
      });
    }

    if (equipmentData.needsMaintenance) {
      actions.push({
        text: '报修',
        type: 'repair',
        action: 'repairEquipment'
      });
    }

    return actions;
  }

  /**
   * 记录扫码历史
   */
  recordScanHistory(qrData) {
    try {
      const historyItem = {
        type: qrData.type,
        id: qrData.id,
        timestamp: Date.now(),
        typeName: this.qrCodeTypes[qrData.type]
      };

      this.scanHistory.unshift(historyItem);

      // 限制历史记录数量
      if (this.scanHistory.length > 50) {
        this.scanHistory = this.scanHistory.slice(0, 50);
      }

      // 保存到本地存储
      wx.setStorageSync('scan_history', this.scanHistory);
    } catch (error) {
      console.error('记录扫码历史失败:', error);
    }
  }

  /**
   * 加载扫码历史
   */
  loadScanHistory() {
    try {
      this.scanHistory = wx.getStorageSync('scan_history') || [];
      return this.scanHistory;
    } catch (error) {
      console.error('加载扫码历史失败:', error);
      return [];
    }
  }

  /**
   * 清空扫码历史
   */
  clearScanHistory() {
    this.scanHistory = [];
    wx.removeStorageSync('scan_history');
  }

  /**
   * 检查相机权限
   */
  checkCameraPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.camera']) {
            resolve();
          } else {
            // 请求相机权限
            wx.authorize({
              scope: 'scope.camera',
              success: resolve,
              fail: () => {
                // 用户拒绝，引导用户去设置页面
                wx.showModal({
                  title: '需要相机权限',
                  content: '扫码功能需要相机权限，请在设置中开启',
                  showCancel: false,
                  confirmText: '去设置',
                  success: () => {
                    wx.openSetting();
                  }
                });
                reject(new Error('相机权限被拒绝'));
              }
            });
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 生成二维码
   */
  generateQRCode(data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const qrText = typeof data === 'string' ? data : JSON.stringify(data);

        wx.request({
          url: `${app.globalData.apiConfig.baseURL}/qrcode/generate`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${wx.getStorageSync('auth_token')}`
          },
          data: {
            text: qrText,
            size: options.size || 200,
            margin: options.margin || 0,
            color: options.color || '#000000',
            backgroundColor: options.backgroundColor || '#FFFFFF'
          },
          success: (res) => {
            if (res.data.success) {
              resolve(res.data.qrCodeUrl);
            } else {
              reject(new Error(res.data.message || '生成二维码失败'));
            }
          },
          fail: reject
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 执行操作
   */
  async executeAction(action, data) {
    try {
      switch (action) {
        case 'callEmergency':
          wx.makePhoneCall({
            phoneNumber: data.phone
          });
          break;

        case 'copyWechat':
          wx.setClipboardData({
            data: data.wechat,
            success: () => {
              wx.showToast({
                title: '微信号已复制',
                icon: 'success'
              });
            }
          });
          break;

        case 'voiceAnnouncement':
        case 'voiceGuide':
          const voiceService = require('./voice');
          await voiceService.synthesizeSpeech(data.content || data.title);
          break;

        default:
          console.log('未知操作:', action);
      }
    } catch (error) {
      console.error('执行操作失败:', error);
      throw error;
    }
  }
}

// 创建实例
const qrCodeService = new QRCodeService();

module.exports = qrCodeService;