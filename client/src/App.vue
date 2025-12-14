<template>
  <div id="app">
    <!-- 服务状态指示器 -->
    <div class="service-status" v-if="showStatusBar">
      <div class="status-item">
        <el-tag :type="mainApiStatus.connected ? 'success' : 'danger'" size="small">
          主API服务: {{ mainApiStatus.connected ? '正常' : '离线' }}
        </el-tag>
      </div>
      <div class="status-item">
        <el-tag :type="villageApiStatus.connected ? 'success' : 'danger'" size="small">
          村务服务: {{ villageApiStatus.connected ? '正常' : '离线' }}
        </el-tag>
      </div>
      <div class="status-item">
        <el-tag :type="socketStatus.connected ? 'success' : 'warning'" size="small">
          实时通信: {{ socketStatus.connected ? '已连接' : '未连接' }}
        </el-tag>
      </div>
      <el-button size="small" text @click="showStatusBar = false">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <router-view />

    <!-- 浮动操作按钮 -->
    <div class="floating-actions">
      <el-button
        circle
        type="primary"
        @click="showStatusBar = true"
        title="查看服务状态"
        v-if="!showStatusBar"
      >
        <el-icon><Monitor /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import socketService from '@/services/socket'
import { ElMessage } from 'element-plus'
import { Close, Monitor } from '@element-plus/icons-vue'

// 响应式数据
const showStatusBar = ref(true)
const mainApiStatus = ref({ connected: false })
const villageApiStatus = ref({ connected: false })
const socketStatus = ref({ connected: false })

// 服务状态检查定时器
let statusCheckInterval = null

// 检查主API服务状态
const checkMainApiStatus = async () => {
  try {
    const response = await fetch('/health')
    mainApiStatus.value.connected = response.ok
  } catch (error) {
    mainApiStatus.value.connected = false
  }
}

// 检查村务API服务状态
const checkVillageApiStatus = async () => {
  try {
    const response = await fetch('/api/health')
    villageApiStatus.value.connected = response.ok
  } catch (error) {
    villageApiStatus.value.connected = false
  }
}

// 检查Socket.IO连接状态
const checkSocketStatus = () => {
  const status = socketService.getConnectionStatus()
  socketStatus.value = status
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
  socketService.connect()

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
  socketService.disconnect()
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
}

// 浮动操作按钮
.floating-actions {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;

  .el-button {
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
    }
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