import { io } from 'socket.io-client'
import { showToast, showNotify } from 'vant'
import { getToken } from '@/utils/auth'

class RealtimeNotification {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.eventListeners = new Map()
  }

  // 连接到WebSocket服务器
  connect() {
    const token = getToken()
    if (!token) {
      logger.warn('未找到认证令牌，无法连接WebSocket');
      return
    }

    const url = process.env.VUE_APP_WS_URL || 'http://localhost:5000'

    this.socket = io(url, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts
    })

    this.setupEventListeners()
  }

  // 设置事件监听器
  setupEventListeners() {
    // 连接成功
    this.socket.on('connect', () => {
      logger.debug('WebSocket连接成功');
      this.isConnected = true
      this.reconnectAttempts = 0
      this.emit('connection', { connected: true })
    })

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      logger.debug('WebSocket连接断开:', reason);
      this.isConnected = false
      this.emit('connection', { connected: false, reason })

      if (reason === 'io server disconnect') {
        // 服务器主动断开，需要重连
        this.reconnect()
      }
    })

    // 连接错误
    this.socket.on('connect_error', (error) => {
      logger.error('WebSocket连接错误:', error);
      this.isConnected = false
      this.reconnectAttempts++

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnect()
      } else {
        showToast('网络连接失败，请检查网络设置')
      }
    })

    // 重新连接
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket重连成功 (第${attemptNumber}次尝试)`)
      this.reconnectAttempts = 0
    })

    // 业务事件监听
    this.setupBusinessListeners()
  }

  // 设置业务事件监听器
  setupBusinessListeners() {
    // 文档收集相关事件
    this.socket.on('document_collection_created', (data) => {
      this.handleDocumentNotification({
        type: 'document_created',
        title: '新的资料收集任务',
        content: `${data.collector.name} 创建了资料收集任务: ${data.title}`,
        data
      })
    })

    this.socket.on('document_status_updated', (data) => {
      this.handleDocumentNotification({
        type: 'document_updated',
        title: '资料状态更新',
        content: `资料 "${data.title}" 状态已更新`,
        data
      })
    })

    // 值班相关事件
    this.socket.on('emergency_call', (data) => {
      this.handleEmergencyNotification({
        type: 'emergency_call',
        title: '🚨 紧急呼叫',
        content: `${data.caller} 发起紧急呼叫: ${data.message}`,
        data,
        priority: 'high'
      })
    })

    // 用户在线状态
    this.socket.on('user_online', (data) => {
      this.emit('user_status', { userId: data.userId, status: 'online', user: data })
    })

    this.socket.on('user_offline', (data) => {
      this.emit('user_status', { userId: data.userId, status: 'offline', user: data })
    })

    // 系统通知
    this.socket.on('system_notification', (data) => {
      this.handleSystemNotification(data)
    })

    // 权限变更
    this.socket.on('permissions_updated', (data) => {
      this.handlePermissionNotification(data)
    })
  }

  // 处理文档相关通知
  handleDocumentNotification(notification) {
    const options = {
      type: 'primary',
      duration: 4000,
      onClick: () => {
        this.navigateToDocument(notification.data.collectionId)
      }
    }

    showNotify({
      message: notification.title,
      description: notification.content,
      ...options
    })

    this.emit('notification', notification)
  }

  // 处理紧急呼叫通知
  handleEmergencyNotification(notification) {
    // 使用更明显的通知方式
    showNotify({
      type: 'danger',
      message: notification.title,
      description: notification.content,
      duration: 0, // 不自动关闭
      onClick: () => {
        this.handleEmergencyCall(notification.data)
      }
    })

    // 播放提示音（如果支持）
    this.playNotificationSound()

    // 触发震动（如果支持）
    this.vibrateDevice()

    this.emit('emergency', notification)
  }

  // 处理系统通知
  handleSystemNotification(data) {
    const options = {
      type: data.type || 'primary',
      duration: data.duration || 3000
    }

    showNotify({
      message: data.title,
      description: data.content,
      ...options
    })

    this.emit('system', data)
  }

  // 处理权限变更通知
  handlePermissionNotification(data) {
    showNotify({
      type: 'warning',
      message: '权限更新',
      description: '您的权限已被管理员更新，请重新登录',
      duration: 5000
    })

    this.emit('permission_update', data)
  }

  // 播放通知声音
  playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(error => {
        logger.debug('无法播放通知音:', error);
      })
    } catch (error) {
      logger.debug('不支持音频播放:', error);
    }
  }

  // 设备震动
  vibrateDevice() {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
  }

  // 导航到文档详情
  navigateToDocument(documentId) {
    const router = require('@/router').default
    router.push(`/village/documents/${documentId}`)
  }

  // 处理紧急呼叫
  handleEmergencyCall(data) {
    const router = require('@/router').default
const logger = require('../utils/logger');
    router.push({
      path: '/village/emergency',
      query: { callId: data.callId }
    })
  }

  // 发送消息到服务器
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      logger.warn('WebSocket未连接，无法发送消息');
    }
  }

  // 监听事件
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event).push(callback)
  }

  // 移除事件监听
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event)
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          logger.error('事件回调执行错误:', error);
        }
      })
    }
  }

  // 加入房间
  joinRoom(roomId) {
    this.emit('join_room', { roomId })
  }

  // 离开房间
  leaveRoom(roomId) {
    this.emit('leave_room', { roomId })
  }

  // 发送聊天消息
  sendMessage(roomId, message) {
    this.emit('chat_message', { roomId, message })
  }

  // 更新用户状态
  updateUserStatus(status) {
    this.emit('user_status_update', { status })
  }

  // 重新连接
  reconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    this.eventListeners.clear()
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// 创建单例实例
const realtimeNotification = new RealtimeNotification()

// 自动连接（如果已登录）
if (getToken()) {
  realtimeNotification.connect()
}

export default realtimeNotification