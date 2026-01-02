<template>
  <div class="emergency-call-panel">
    <!-- Header -->
    <div class="panel-header">
      <h2 class="panel-title">
        <el-icon><Warning /></el-icon>
        紧急呼叫系统
      </h2>
      <div class="current-time">{{ currentTime }}</div>
    </div>

    <!-- Current Duty Personnel -->
    <div class="duty-personnel-section" v-if="currentDutyPersonnel">
      <h3>当前值班人员</h3>
      <div class="personnel-card">
        <div class="personnel-info">
          <el-avatar :size="60" :src="currentDutyPersonnel.avatar">
            {{ currentDutyPersonnel.name?.charAt(0) }}
          </el-avatar>
          <div class="info-details">
            <h4>{{ currentDutyPersonnel.name }}</h4>
            <p>{{ currentDutyPersonnel.position }}</p>
            <p class="contact-info">
              <el-icon><Phone /></el-icon>
              {{ maskPhone(currentDutyPersonnel.phone) }}
            </p>
          </div>
        </div>
        <div class="personnel-status" :class="currentDutyPersonnel.status">
          {{ getStatusText(currentDutyPersonnel.status) }}
        </div>
      </div>
    </div>

    <!-- Quick Call Buttons -->
    <div class="quick-call-section">
      <h3>快速呼叫</h3>
      <div class="call-buttons">
        <el-button
          type="danger"
          size="large"
          class="emergency-btn"
          :loading="calling"
          @click="handleEmergencyCall('emergency')"
        >
          <el-icon><WarningFilled /></el-icon>
          紧急呼叫
        </el-button>

        <el-button
          type="warning"
          size="large"
          :loading="calling"
          @click="handleEmergencyCall('urgent')"
        >
          <el-icon><Bell /></el-icon>
          紧急通知
        </el-button>

        <el-button
          type="primary"
          size="large"
          :loading="calling"
          @click="handleEmergencyCall('normal')"
        >
          <el-icon><Message /></el-icon>
          普通呼叫
        </el-button>
      </div>
    </div>

    <!-- Location Info -->
    <div class="location-section">
      <h3>当前位置</h3>
      <div class="location-info" v-if="userLocation">
        <p>
          <el-icon><Location /></el-icon>
          {{ userLocation.address || '获取位置中...' }}
        </p>
        <el-button type="text" @click="refreshLocation">
          <el-icon><Refresh /></el-icon>
          刷新位置
        </el-button>
      </div>
      <div v-else class="location-loading">
        <el-skeleton :rows="2" animated />
      </div>
    </div>

    <!-- Recent Calls -->
    <div class="recent-calls-section">
      <h3>最近呼叫记录</h3>
      <el-timeline>
        <el-timeline-item
          v-for="call in recentCalls"
          :key="call.id"
          :timestamp="formatTime(call.timestamp)"
          :type="getCallType(call.priority)"
        >
          <div class="call-item">
            <span class="call-type">{{ getPriorityText(call.priority) }}</span>
            <span class="call-target">{{ call.target }}</span>
            <span class="call-status" :class="call.status">
              {{ getCallStatusText(call.status) }}
            </span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>

    <!-- QR Code Scan -->
    <div class="qr-section">
      <el-button type="success" @click="showQRScanner = true">
        <el-icon><QrCode /></el-icon>
        扫码呼叫
      </el-button>
    </div>

    <!-- Call Status Dialog -->
    <CallStatusDialog
      v-model="showCallDialog"
      :call-data="currentCall"
      @close="handleCallDialogClose"
    />

    <!-- QR Scanner Dialog -->
    <el-dialog v-model="showQRScanner" title="扫码呼叫" width="400px">
      <div class="qr-scanner">
        <qrcode-stream
          @decode="onQRDecode"
          @init="onQRInit"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Warning,
  WarningFilled,
  Bell,
  Message,
  Phone,
  Location,
  Refresh,
  QrCode
} from '@element-plus/icons-vue'
import { QrcodeStream } from 'qrcode-reader-vue3'
import CallStatusDialog from './CallStatusDialog.vue'
import emergencyNotifier from '@/utils/emergencyNotifier'
import { useDutyStore } from '@/stores/dutyStore'
import { getEmergencyAPI } from '@/api/duty'

const dutyStore = useDutyStore()
const emergencyAPI = getEmergencyAPI()

// Reactive data
const currentTime = ref('')
const currentDutyPersonnel = ref(null)
const userLocation = ref(null)
const calling = ref(false)
const showCallDialog = ref(false)
const showQRScanner = ref(false)
const currentCall = ref(null)
const recentCalls = ref([])

// Location tracking
let locationWatcher = null

// Update current time
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// Get current duty personnel
const fetchCurrentDutyPersonnel = async () => {
  try {
    const response = await emergencyAPI.getCurrentDutyPersonnel()
    currentDutyPersonnel.value = response.data
  } catch (error) {
    console.error('Failed to fetch duty personnel:', error)
    ElMessage.error('获取值班人员信息失败')
  }
}

// Get user location
const getUserLocation = () => {
  if (!navigator.geolocation) {
    ElMessage.error('您的浏览器不支持地理定位')
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      userLocation.value = {
        latitude,
        longitude,
        timestamp: Date.now()
      }

      // Get address from coordinates
      try {
        const address = await reverseGeocode(latitude, longitude)
        userLocation.value.address = address
      } catch (error) {
        console.error('Failed to get address:', error)
      }
    },
    (error) => {
      console.error('Location error:', error)
      ElMessage.error('获取位置失败，请检查定位权限')
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

// Reverse geocoding
const reverseGeocode = async (lat, lng) => {
  // Using AMap API (you'll need to configure the API key)
  const response = await fetch(
    `https://restapi.amap.com/v3/geocode/regeo?key=YOUR_AMAP_KEY&location=${lng},${lat}`
  )
  const data = await response.json()
  return data.regeocode.formatted_address
}

// Refresh location
const refreshLocation = () => {
  getUserLocation()
}

// Handle emergency call
const handleEmergencyCall = async (priority) => {
  if (!currentDutyPersonnel.value) {
    ElMessage.warning('当前无值班人员')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要发起${getPriorityText(priority)}吗？`,
      '确认呼叫',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    calling.value = true

    // Create call record
    const callData = {
      id: Date.now().toString(),
      priority,
      target: currentDutyPersonnel.value.name,
      location: userLocation.value,
      timestamp: Date.now(),
      status: 'calling'
    }

    currentCall.value = callData
    showCallDialog.value = true

    // Send emergency call
    const response = await emergencyAPI.sendEmergencyCall({
      personnelId: currentDutyPersonnel.value.id,
      priority,
      location: userLocation.value,
      message: getCallMessage(priority)
    })

    if (response.success) {
      // Show notification
      emergencyNotifier.showNotification(
        `${getPriorityText(priority)}已发送`,
        {
          body: `正在呼叫${currentDutyPersonnel.value.name}，请等待响应`,
          icon: '/emergency-icon.png',
          tag: 'emergency-call',
          requireInteraction: true,
          vibrate: [200, 100, 200]
        }
      )

      // Play sound
      emergencyNotifier.playSound(priority)

      // Update call status
      currentCall.value.callId = response.data.callId
      currentCall.value.status = 'sent'

      // Add to recent calls
      recentCalls.value.unshift(callData)
      if (recentCalls.value.length > 10) {
        recentCalls.value = recentCalls.value.slice(0, 10)
      }
    }

    calling.value = false
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Emergency call failed:', error)
      ElMessage.error('呼叫失败，请重试')
    }
    calling.value = false
  }
}

// QR code decode
const onQRDecode = async (content) => {
  try {
    // Parse QR code content
    const qrData = JSON.parse(content)

    if (qrData.type === 'emergency_call' && qrData.personnelId) {
      showQRScanner.value = false
      await handleQRCall(qrData.personnelId)
    }
  } catch (error) {
    ElMessage.error('无效的二维码')
  }
}

// Handle QR code call
const handleQRCall = async (personnelId) => {
  try {
    calling.value = true

    const response = await emergencyAPI.sendEmergencyCall({
      personnelId,
      priority: 'emergency',
      location: userLocation.value,
      message: '扫码紧急呼叫'
    })

    if (response.success) {
      ElMessage.success('呼叫已发送')
      showCallDialog.value = true
      currentCall.value = {
        callId: response.data.callId,
        priority: 'emergency',
        status: 'sent'
      }
    }
  } catch (error) {
    ElMessage.error('呼叫失败')
  } finally {
    calling.value = false
  }
}

// QR scanner init
const onQRInit = (promise) => {
  promise.then(() => {
    console.log('QR scanner initialized')
  }).catch(error => {
    console.error('QR scanner init failed:', error)
    ElMessage.error('摄像头初始化失败')
  })
}

// Handle call dialog close
const handleCallDialogClose = () => {
  showCallDialog.value = false
  currentCall.value = null
}

// Utility functions
const maskPhone = (phone) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const getStatusText = (status) => {
  const statusMap = {
    online: '在线',
    busy: '忙碌',
    offline: '离线'
  }
  return statusMap[status] || '未知'
}

const getPriorityText = (priority) => {
  const priorityMap = {
    emergency: '紧急呼叫',
    urgent: '紧急通知',
    normal: '普通呼叫'
  }
  return priorityMap[priority] || '未知'
}

const getCallMessage = (priority) => {
  const messageMap = {
    emergency: '紧急情况，请立即响应！',
    urgent: '需要您的协助，请尽快回复！',
    normal: '有事需要联系您，请方便时回复。'
  }
  return messageMap[priority] || ''
}

const getCallType = (priority) => {
  const typeMap = {
    emergency: 'danger',
    urgent: 'warning',
    normal: 'primary'
  }
  return typeMap[priority] || 'info'
}

const getCallStatusText = (status) => {
  const statusMap = {
    calling: '呼叫中',
    sent: '已发送',
    received: '已接收',
    responded: '已响应',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || '未知'
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// Lifecycle hooks
onMounted(() => {
  // Update time every second
  updateTime()
  const timeInterval = setInterval(updateTime, 1000)

  // Fetch initial data
  fetchCurrentDutyPersonnel()
  getUserLocation()

  // Fetch recent calls
  emergencyAPI.getRecentCalls().then(response => {
    recentCalls.value = response.data || []
  })

  // Setup location watcher
  if ('geolocation' in navigator) {
    locationWatcher = navigator.geolocation.watchPosition(
      (position) => {
        userLocation.value = {
          ...userLocation.value,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now()
        }
      },
      null,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  onUnmounted(() => {
    clearInterval(timeInterval)
    if (locationWatcher) {
      navigator.geolocation.clearWatch(locationWatcher)
    }
  })
})
</script>

<style scoped>
.emergency-call-panel {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e4e7ed;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  color: #303133;
  margin: 0;
}

.current-time {
  font-size: 18px;
  color: #909399;
  font-weight: 500;
}

.duty-personnel-section {
  margin-bottom: 30px;
}

.personnel-card {
  background: #f5f7fa;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.personnel-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.info-details h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.info-details p {
  margin: 4px 0;
  color: #606266;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 5px;
}

.personnel-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.personnel-status.online {
  background: #f0f9ff;
  color: #67c23a;
}

.personnel-status.busy {
  background: #fdf6ec;
  color: #e6a23c;
}

.personnel-status.offline {
  background: #fef0f0;
  color: #f56c6c;
}

.quick-call-section {
  margin-bottom: 30px;
}

.call-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.emergency-btn {
  min-width: 150px;
  height: 60px;
  font-size: 18px;
  font-weight: 600;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(245, 108, 108, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0);
  }
}

.location-section {
  margin-bottom: 30px;
}

.location-info {
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location-info p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
}

.recent-calls-section {
  margin-bottom: 30px;
}

.call-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.call-type {
  font-weight: 500;
  min-width: 80px;
}

.call-target {
  color: #606266;
  flex: 1;
}

.call-status {
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 12px;
}

.call-status.calling {
  background: #ecf5ff;
  color: #409eff;
}

.call-status.sent {
  background: #f0f9ff;
  color: #67c23a;
}

.call-status.received {
  background: #fdf6ec;
  color: #e6a23c;
}

.call-status.responded {
  background: #f0f9ff;
  color: #67c23a;
}

.call-status.completed {
  background: #f0f9ff;
  color: #909399;
}

.call-status.cancelled {
  background: #fef0f0;
  color: #f56c6c;
}

.qr-section {
  text-align: center;
  padding: 20px 0;
}

.qr-scanner {
  height: 300px;
}

@media (max-width: 768px) {
  .emergency-call-panel {
    padding: 15px;
  }

  .call-buttons {
    flex-direction: column;
  }

  .emergency-btn {
    width: 100%;
  }

  .call-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>