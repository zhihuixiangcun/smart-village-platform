/**
 * Socket.IO 客户端服务
 * 用于实时通信功能
 */
import { io } from 'socket.io-client'
import { useUserStore } from '@/stores/user'
import { ElNotification } from 'element-plus'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  // 连接Socket.IO服务器
  connect() {
    try {
      this.socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        autoConnect: true
      })

      this.setupEventListeners()

      console.log('🔌 正在连接Socket.IO服务器...')
    } catch (error) {
      console.error('❌ Socket.IO连接失败:', error)
    }
  }

  // 设置事件监听器
  setupEventListeners() {
    if (!this.socket) return

    // 连接成功
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO连接成功:', this.socket.id)
      this.isConnected = true
      this.reconnectAttempts = 0

      // 自动加入村庄房间
      this.joinVillage()
    })

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('📴 Socket.IO连接断开:', reason)
      this.isConnected = false

      if (reason === 'io server disconnect') {
        // 服务器主动断开，需要手动重连
        this.reconnect()
      }
    })

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('💥 Socket.IO连接错误:', error)
      this.isConnected = false
      this.reconnect()
    })

    // 重连失败
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO重连失败')
      ElNotification({
        title: '连接失败',
        message: '无法连接到实时通信服务器，某些功能可能不可用',
        type: 'error',
        duration: 5000
      })
    })

    // 紧急广播
    this.socket.on('emergency-alert', (data) => {
      ElNotification({
        title: '🚨 紧急广播',
        message: data.message || '收到紧急通知',
        type: 'error',
        duration: 0, // 不自动关闭
        dangerouslyUseHTMLString: true
      })
    })

    // 系统通知
    this.socket.on('system-notification', (data) => {
      ElNotification({
        title: data.title || '系统通知',
        message: data.message,
        type: data.type || 'info',
        duration: 4000
      })
    })

    // 村务更新通知
    this.socket.on('village-update', (data) => {
      ElNotification({
        title: '村务更新',
        message: data.message,
        type: 'success',
        duration: 3000
      })
    })
  }

  // 加入村庄房间
  joinVillage(villageId) {
    if (!this.socket || !this.isConnected) return

    const userStore = useUserStore()
    const targetVillageId = villageId || userStore.user?.villageId || 'default'

    this.socket.emit('join-village', targetVillageId)
    console.log(`👥 已加入村庄房间: ${targetVillageId}`)
  }

  // 发送紧急广播
  sendEmergencyBroadcast(message, villageId) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket未连接，无法发送紧急广播')
      return false
    }

    const userStore = useUserStore()
    const targetVillageId = villageId || userStore.user?.villageId

    this.socket.emit('emergency-broadcast', {
      villageId: targetVillageId,
      message,
      sender: userStore.user?.name || '系统',
      timestamp: new Date().toISOString()
    })

    return true
  }

  // 重连逻辑
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ 达到最大重连次数，停止重连')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)

    console.log(`🔄 ${delay}ms后尝试第${this.reconnectAttempts}次重连...`)

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect()
      }
    }, delay)
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      console.log('👋 Socket.IO连接已断开')
    }
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// 创建单例实例
const socketService = new SocketService()

export default socketService