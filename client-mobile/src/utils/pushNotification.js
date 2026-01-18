/**
 * 推送通知工具
 * 支持 uni-push 和本地通知
 * 用于公告推送、评论提醒等场景
 */

/**
 * 通知类型枚举
 */
export const NotificationType = {
  ANNOUNCEMENT: 'announcement', // 公告通知
  COMMENT: 'comment',           // 评论通知
  SYSTEM: 'system',             // 系统通知
  REMINDER: 'reminder'           // 提醒通知
}

/**
 * 通知权限状态
 */
export const PermissionStatus = {
  GRANTED: 'granted',       // 已授权
  DENIED: 'denied',         // 已拒绝
  NOT_DETERMINED: 'not_determined' // 未确定
}

/**
 * 推送通知管理类
 */
class PushNotificationManager {
  constructor() {
    this.permissionStatus = PermissionStatus.NOT_DETERMINED
    this.localNotifications = []
    this.listeners = new Map()
    this.initialized = false
  }

  /**
   * 初始化推送通知
   * @param {Object} options - 配置选项
   * @param {boolean} options.autoRequestPermission - 是否自动请求权限
   */
  async init(options = {}) {
    if (this.initialized) return

    try {
      // 检查是否支持推送
      if (!this.isPushSupported()) {
        console.warn('当前平台不支持推送通知')
        return
      }

      // 检查权限状态
      await this.checkPermission()

      // 自动请求权限
      if (options.autoRequestPermission && this.permissionStatus === PermissionStatus.NOT_DETERMINED) {
        await this.requestPermission()
      }

      // 注册推送监听
      this.registerListeners()

      this.initialized = true
      console.log('推送通知初始化成功')
    } catch (error) {
      console.error('推送通知初始化失败:', error)
    }
  }

  /**
   * 检查是否支持推送
   * @returns {boolean}
   */
  isPushSupported() {
    // #ifdef APP-PLUS
    return true
    // #endif

    // #ifdef H5
    return 'Notification' in window && 'serviceWorker' in navigator
    // #endif

    // #ifdef MP
    return true // 小程序支持
    // #endif

    return false
  }

  /**
   * 检查权限状态
   * @returns {Promise<string>}
   */
  async checkPermission() {
    // #ifdef APP-PLUS
    const result = await uni.getProvider({ service: 'push' })
    if (result && result.success) {
      this.permissionStatus = PermissionStatus.GRANTED
    } else {
      this.permissionStatus = PermissionStatus.NOT_DETERMINED
    }
    return this.permissionStatus
    // #endif

    // #ifdef H5
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.permissionStatus = PermissionStatus.GRANTED
      } else if (Notification.permission === 'denied') {
        this.permissionStatus = PermissionStatus.DENIED
      } else {
        this.permissionStatus = PermissionStatus.NOT_DETERMINED
      }
    }
    return this.permissionStatus
    // #endif

    // #ifdef MP
    // 小程序默认有权限
    this.permissionStatus = PermissionStatus.GRANTED
    return this.permissionStatus
    // #endif

    return PermissionStatus.NOT_DETERMINED
  }

  /**
   * 请求推送权限
   * @returns {Promise<boolean>}
   */
  async requestPermission() {
    // #ifdef APP-PLUS
    try {
      // 使用 uni-push 2.0
      const result = await uni.push.subscribe({
        scene: 1 // 订阅场景
      })
      if (result && result.success) {
        this.permissionStatus = PermissionStatus.GRANTED
        return true
      }
    } catch (error) {
      console.error('请求推送权限失败:', error)
    }
    return false
    // #endif

    // #ifdef H5
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        this.permissionStatus = PermissionStatus.GRANTED
        return true
      } else {
        this.permissionStatus = PermissionStatus.DENIED
      }
    }
    return false
    // #endif

    // #ifdef MP
    // 小程序不需要请求权限
    this.permissionStatus = PermissionStatus.GRANTED
    return true
    // #endif

    return false
  }

  /**
   * 注册推送监听
   */
  registerListeners() {
    // #ifdef APP-PLUS
    // uni-push 2.0 监听推送消息
    uni.onPushMessage((message) => {
      console.log('收到推送消息:', message)
      this.handlePushMessage(message)
    })
    // #endif

    // #ifdef H5
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
          this.handlePushMessage(event.data.payload)
        }
      })
    }
    // #endif
  }

  /**
   * 处理推送消息
   * @param {Object} message - 推送消息
   */
  handlePushMessage(message) {
    const { type, payload } = message

    // 触发对应类型的监听器
    const listeners = this.listeners.get(type) || []
    listeners.forEach(callback => {
      try {
        callback(payload)
      } catch (error) {
        console.error('推送监听器执行失败:', error)
      }
    })

    // 显示本地通知
    if (payload.title) {
      this.showLocalNotification(payload)
    }
  }

  /**
   * 添加推送监听器
   * @param {string} type - 通知类型
   * @param {Function} callback - 回调函数
   */
  addListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type).push(callback)
  }

  /**
   * 移除推送监听器
   * @param {string} type - 通知类型
   * @param {Function} callback - 回调函数
   */
  removeListener(type, callback) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 显示本地通知
   * @param {Object} options - 通知选项
   * @param {string} options.title - 标题
   * @param {string} options.content - 内容
   * @param {string} [options.type] - 通知类型
   * @param {Object} [options.payload] - 附加数据
   * @param {Object} [options.data] - 点击数据
   */
  showLocalNotification(options) {
    const { title, content, type = NotificationType.SYSTEM, payload, data } = options

    // #ifdef APP-PLUS
    // 使用 uni.createLocalNotification 创建本地通知
    plus.push.createMessage(content, payload || '', options)
    // #endif

    // #ifdef H5
    if ('Notification' in window && this.permissionStatus === PermissionStatus.GRANTED) {
      const notification = new Notification(title, {
        body: content,
        icon: '/static/logo.png',
        badge: '/static/badge.png',
        tag: payload?.id || Date.now().toString(),
        data: data || payload
      })

      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        this.handleNotificationClick(type, payload || {})
      }

      this.localNotifications.push(notification)
    }
    // #endif

    // #ifdef MP
    // 小程序使用消息提示
    uni.showModal({
      title: title,
      content: content,
      showCancel: true,
      confirmText: '查看',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          this.handleNotificationClick(type, payload || {})
        }
      }
    })
    // #endif

    console.log('显示本地通知:', title, content)
  }

  /**
   * 处理通知点击
   * @param {string} type - 通知类型
   * @param {Object} payload - 附加数据
   */
  handleNotificationClick(type, payload) {
    switch (type) {
      case NotificationType.ANNOUNCEMENT:
        // 跳转到公告详情
        if (payload.id) {
          uni.navigateTo({
            url: `/pages/village/announcement-detail?id=${payload.id}`
          })
        }
        break

      case NotificationType.COMMENT:
        // 跳转到公告详情并定位到评论区
        if (payload.announcementId) {
          uni.navigateTo({
            url: `/pages/village/announcement-detail?id=${payload.announcementId}&focus=comment`
          })
        }
        break

      case NotificationType.SYSTEM:
      case NotificationType.REMINDER:
        // 默认处理，可自定义
        break

      default:
        break
    }
  }

  /**
   * 发送公告推送
   * @param {Object} announcement - 公告数据
   */
  async sendAnnouncementNotification(announcement) {
    const { id, title, summary, type } = announcement

    this.showLocalNotification({
      title: '新公告',
      content: summary || title,
      type: NotificationType.ANNOUNCEMENT,
      payload: {
        id,
        type,
        title
      }
    })
  }

  /**
   * 发送评论推送
   * @param {Object} comment - 评论数据
   */
  async sendCommentNotification(comment) {
    const { announcementId, user, content } = comment

    this.showLocalNotification({
      title: `新评论`,
      content: `${user?.name || '有人'}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      type: NotificationType.COMMENT,
      payload: {
        announcementId,
        commentId: comment.id
      }
    })
  }

  /**
   * 清除所有本地通知
   */
  clearAllNotifications() {
    // #ifdef APP-PLUS
    plus.push.clear()
    // #endif

    this.localNotifications.forEach(notification => {
      notification.close()
    })
    this.localNotifications = []
  }

  /**
   * 设置应用角标
   * @param {number} count - 角标数量
   */
  async setBadgeCount(count) {
    // #ifdef APP-PLUS
    if (plus.runtime && plus.runtime.setBadgeNumber) {
      plus.runtime.setBadgeNumber(count)
    }
    // #endif

    // #ifdef H5
    if (navigator.setAppBadge) {
      await navigator.setAppBadge(count)
    }
    // #endif

    console.log('设置应用角标:', count)
  }

  /**
   * 销毁推送管理器
   */
  destroy() {
    this.clearAllNotifications()
    this.listeners.clear()
    this.initialized = false
  }
}

/**
 * 创建单例实例
 */
const pushNotification = new PushNotificationManager()

export default pushNotification
export { PushNotificationManager }
