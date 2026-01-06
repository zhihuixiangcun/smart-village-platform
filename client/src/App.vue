<template>
  <div id="app">
    <!-- 服务状态指示器 -->
    <div class="service-status" v-if="showStatusBar">
      <div class="status-item">
        <span class="status-badge" :class="{ 'status-success': mainApiConnected, 'status-offline': !mainApiConnected }">
          主API服务: {{ getMainApiStatusText() }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-badge" :class="{ 'status-success': villageApiConnected, 'status-offline': !villageApiConnected }">
          村务服务: {{ getVillageApiStatusText() }}
        </span>
      </div>
      <div class="status-item">
        <span class="status-badge" :class="{ 'status-success': socketConnected, 'status-pending': !socketConnected }">
          实时通信: {{ getSocketStatusText() }}
        </span>
      </div>
      <button class="close-btn" @click="showStatusBar = false">✕</button>
    </div>

    <router-view />

    <!-- 浮动操作按钮 -->
    <div class="floating-actions" v-if="!showStatusBar">
      <button class="fab-button" @click="showStatusBar = true" title="查看服务状态">
        📊
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import socketService from '@/services/socket'
import { ElMessage } from 'element-plus'

// 响应式数据
const showStatusBar = ref(true)
const mainApiConnected = ref(false)
const villageApiConnected = ref(false)
const socketConnected = ref(false)

// 服务状态检查定时器
let statusCheckInterval = null

// 主API状态方法
const getMainApiStatusType = () => {
  return mainApiConnected.value ? 'success' : 'info'
}

const getMainApiStatusText = () => {
  return mainApiConnected.value ? '正常' : '离线'
}

// 村务API状态方法
const getVillageApiStatusType = () => {
  return villageApiConnected.value ? 'success' : 'info'
}

const getVillageApiStatusText = () => {
  return villageApiConnected.value ? '正常' : '离线'
}

// Socket状态方法
const getSocketStatusType = () => {
  return socketConnected.value ? 'success' : 'info'
}

const getSocketStatusText = () => {
  return socketConnected.value ? '已连接' : '未连接'
}

// 检查主API服务状态
const checkMainApiStatus = async () => {
  try {
    const response = await fetch('http://localhost:3001/health')
    mainApiConnected.value = response.ok
  } catch (error) {
    mainApiConnected.value = false
  }
}

// 检查村务API服务状态
const checkVillageApiStatus = async () => {
  try {
    const response = await fetch('http://localhost:5000/health')
    villageApiConnected.value = response.ok
  } catch (error) {
    villageApiConnected.value = false
  }
}

// 检查Socket.IO连接状态
const checkSocketStatus = () => {
  try {
    const status = socketService.getConnectionStatus()
    socketConnected.value = status?.connected || false
  } catch (error) {
    socketConnected.value = false
  }
}

// 定期检查所有服务状态
const checkAllServices = async () => {
  await Promise.all([
    checkMainApiStatus(),
    checkVillageApiStatus(),
  ])
  checkSocketStatus()
}

onMounted(() => {
  // 连接Socket.IO
  try {
    socketService.connect()
  } catch (e) {
    console.log('Socket连接失败，将在后台重试')
  }

  // 立即检查一次服务状态
  checkAllServices()

  // 每30秒检查一次服务状态
  statusCheckInterval = setInterval(checkAllServices, 30000)

  // 显示欢迎消息
  setTimeout(() => {
    ElMessage({
      message: '欢迎使用智慧乡村综合服务平台！',
      type: 'success',
      duration: 3000
    })
  }, 1000)
})

onUnmounted(() => {
  // 清理定时器
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
  }

  // 断开Socket.IO连接
  try {
    socketService.disconnect()
  } catch (e) {
    console.log('Socket断开连接失败')
  }
})
</script>

<style lang="scss">
#app {
  width: 100%;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #f5f5f5;
}

// 服务状态栏
.service-status {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #e4e7ed;

  .status-item {
    display: flex;
    align-items: center;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .status-success {
    background-color: #f0f9ff;
    color: #67c23a;
    border: 1px solid #b3e19d;
  }

  .status-offline {
    background-color: #fef0f0;
    color: #f56c6c;
    border: 1px solid #fbc4c4;
  }

  .status-pending {
    background-color: #fdf6ec;
    color: #e6a23c;
    border: 1px solid #f5dab1;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
    color: #909399;
    margin-left: auto;
  }

  .close-btn:hover {
    color: #606266;
    background-color: #f5f7fa;
    border-radius: 4px;
  }
}

// 浮动操作按钮
.floating-actions {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;

  .fab-button {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    background-color: #409eff;
    color: white;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    transition: all 0.3s;
  }

  .fab-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
  }
}

// 全局过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 页面路由过渡
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>