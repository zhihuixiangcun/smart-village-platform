<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="handleClose"
  >
    <!-- Call Status Timeline -->
    <div class="call-status-section">
      <h3>呼叫状态</h3>
      <el-steps :active="currentStep" direction="vertical" finish-status="success">
        <el-step
          v-for="step in statusSteps"
          :key="step.status"
          :title="step.title"
          :description="step.description"
          :status="getStepStatus(step.status)"
        />
      </el-steps>
    </div>

    <!-- Real-time Location -->
    <div class="location-section" v-if="callData?.location">
      <h3>位置信息</h3>
      <div class="map-container" ref="mapContainer">
        <div class="map-placeholder">
          <el-icon class="map-icon"><Location /></el-icon>
          <p>加载地图中...</p>
        </div>
      </div>
      <div class="location-details">
        <p><strong>地址：</strong>{{ callData.location.address || '获取中...' }}</p>
        <p><strong>坐标：</strong>{{ callData.location.latitude }}, {{ callData.location.longitude }}</p>
        <p><strong>时间：</strong>{{ formatTime(callData.location.timestamp) }}</p>
      </div>
    </div>

    <!-- Response Info -->
    <div class="response-section" v-if="callData?.response">
      <h3>响应信息</h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="响应人员">
          {{ callData.response.responder }}
        </el-descriptions-item>
        <el-descriptions-item label="响应时间">
          {{ formatTime(callData.response.respondTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="预计到达">
          {{ callData.response.eta || '计算中...' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ callData.response.phone }}
        </el-descriptions-item>
      </el-descriptions>
      <div class="response-message" v-if="callData.response.message">
        <p><strong>响应消息：</strong></p>
        <p>{{ callData.response.message }}</p>
      </div>
    </div>

    <!-- Call Actions -->
    <div class="actions-section">
      <el-button
        v-if="canRedial"
        type="primary"
        @click="handleRedial"
        :loading="redialing"
      >
        <el-icon><Phone /></el-icon>
        重新呼叫
      </el-button>

      <el-button
        v-if="canCancel"
        type="danger"
        @click="handleCancel"
        :loading="cancelling"
      >
        <el-icon><Close /></el-icon>
        取消呼叫
      </el-button>

      <el-button
        v-if="canEscalate"
        type="warning"
        @click="handleEscalate"
        :loading="escalating"
      >
        <el-icon><Top /></el-icon>
        上报处理
      </el-button>

      <el-button @click="handleViewHistory">
        <el-icon><Clock /></el-icon>
        查看记录
      </el-button>
    </div>

    <!-- Auto Redial Timer -->
    <div class="redial-timer" v-if="showRedialTimer">
      <el-progress
        :percentage="redialProgress"
        :status="redialStatus"
        :format="formatRedialProgress"
      />
      <p>{{ redialSeconds }}秒后自动重拨...</p>
    </div>
  </el-dialog>

  <!-- Call History Dialog -->
  <el-dialog
    v-model="showHistory"
    title="呼叫记录"
    width="800px"
  >
    <el-table :data="callHistory" stripe>
      <el-table-column prop="timestamp" label="时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="级别" width="100">
        <template #default="{ row }">
          <el-tag :type="getPriorityType(row.priority)">
            {{ getPriorityText(row.priority) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="target" label="呼叫对象" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <span :class="'status-' + row.status">
            {{ getStatusText(row.status) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="duration" label="响应时长" width="100">
        <template #default="{ row }">
          {{ formatDuration(row.duration) }}
        </template>
      </el-table-column>
      <el-table-column prop="result" label="处理结果" />
    </el-table>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Location,
  Phone,
  Close,
  Top,
  Clock
} from '@element-plus/icons-vue'
import { useDutyStore } from '@/stores/dutyStore'
import { getEmergencyAPI } from '@/api/duty'
import emergencyNotifier from '@/utils/emergencyNotifier'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  callData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const dutyStore = useDutyStore()
const emergencyAPI = getEmergencyAPI()

// Reactive data
const dialogVisible = ref(false)
const showHistory = ref(false)
const callHistory = ref([])
const mapContainer = ref(null)
const map = ref(null)
const marker = ref(null)

// Action states
const redialing = ref(false)
const cancelling = ref(false)
const escalating = ref(false)

// Auto redial
const showRedialTimer = ref(false)
const redialProgress = ref(0)
const redialStatus = ref('')
const redialSeconds = ref(30)
let redialTimer = null

// Socket connection
let socket = null

// Computed properties
const dialogTitle = computed(() => {
  if (!props.callData) return '呼叫状态'
  const priorityText = getPriorityText(props.callData.priority)
  return `${priorityText} - 实时状态`
})

const currentStep = computed(() => {
  if (!props.callData) return 0
  const statusMap = {
    calling: 0,
    sent: 1,
    received: 2,
    responded: 3,
    completed: 4
  }
  return statusMap[props.callData.status] || 0
})

const statusSteps = computed(() => [
  {
    status: 'calling',
    title: '发起呼叫',
    description: '正在连接值班人员...'
  },
  {
    status: 'sent',
    title: '呼叫已发送',
    description: '通知已发送至值班人员设备'
  },
  {
    status: 'received',
    title: '呼叫已接收',
    description: '值班人员已收到呼叫通知'
  },
  {
    status: 'responded',
    title: '已响应',
    description: '值班人员正在赶来'
  },
  {
    status: 'completed',
    title: '处理完成',
    description: '呼叫已处理完毕'
  }
])

const canRedial = computed(() => {
  if (!props.callData) return false
  return ['calling', 'sent', 'received'].includes(props.callData.status)
})

const canCancel = computed(() => {
  if (!props.callData) return false
  return ['calling', 'sent', 'received'].includes(props.callData.status)
})

const canEscalate = computed(() => {
  if (!props.callData) return false
  return props.callData.priority === 'normal'
})

// Watch for dialog visibility changes
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
  if (newVal) {
    initializeDialog()
  } else {
    cleanupDialog()
  }
})

watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

// Initialize dialog
const initializeDialog = async () => {
  if (props.callData) {
    // Connect to Socket.IO for real-time updates
    connectSocket()

    // Initialize map
    await nextTick()
    initializeMap()

    // Start auto redial timer if needed
    if (props.callData.status === 'sent' && props.callData.priority === 'emergency') {
      startRedialTimer()
    }

    // Fetch call history
    fetchCallHistory()
  }
}

// Cleanup dialog
const cleanupDialog = () => {
  disconnectSocket()
  stopRedialTimer()
  if (map.value) {
    map.value.destroy()
    map.value = null
  }
}

// Connect to Socket.IO
const connectSocket = () => {
  if (!socket) {
    socket = dutyStore.socket

    if (socket) {
      // Listen for call status updates
      socket.on('callStatusUpdate', handleCallStatusUpdate)
      socket.on('callResponse', handleCallResponse)
      socket.on('callLocationUpdate', handleLocationUpdate)
    }
  }
}

// Disconnect from Socket.IO
const disconnectSocket = () => {
  if (socket) {
    socket.off('callStatusUpdate', handleCallStatusUpdate)
    socket.off('callResponse', handleCallResponse)
    socket.off('callLocationUpdate', handleLocationUpdate)
  }
}

// Initialize map
const initializeMap = () => {
  if (!mapContainer.value || !props.callData?.location) return

  // Here you would initialize your map library (e.g., AMap, Baidu Map)
  // This is a placeholder implementation
  setTimeout(() => {
    const placeholder = mapContainer.value.querySelector('.map-placeholder')
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="mock-map">
          <p>地图加载成功</p>
          <p>位置：${props.callData.location.latitude}, ${props.callData.location.longitude}</p>
        </div>
      `
    }
  }, 1000)
}

// Handle call status updates
const handleCallStatusUpdate = (data) => {
  if (data.callId === props.callData?.callId) {
    // Update call data
    props.callData.status = data.status
    props.callData.timestamp = data.timestamp

    // Stop redial timer if call is responded
    if (data.status === 'responded' || data.status === 'completed') {
      stopRedialTimer()
    }

    // Show notification
    if (data.status === 'responded') {
      emergencyNotifier.showNotification('呼叫已响应', {
        body: '值班人员已响应，正在赶来',
        icon: '/response-icon.png',
        tag: 'call-response'
      })
    }
  }
}

// Handle call response
const handleCallResponse = (data) => {
  if (data.callId === props.callData?.callId) {
    props.callData.response = data
    stopRedialTimer()
  }
}

// Handle location updates
const handleLocationUpdate = (data) => {
  if (data.callId === props.callData?.callId && map.value) {
    // Update marker position on map
    updateMapMarker(data.location)
  }
}

// Start auto redial timer
const startRedialTimer = () => {
  showRedialTimer.value = true
  redialProgress.value = 0
  redialSeconds.value = 30

  redialTimer = setInterval(() => {
    redialSeconds.value--
    redialProgress.value = ((30 - redialSeconds.value) / 30) * 100

    if (redialSeconds.value <= 0) {
      stopRedialTimer()
      handleAutoRedial()
    }
  }, 1000)
}

// Stop auto redial timer
const stopRedialTimer = () => {
  if (redialTimer) {
    clearInterval(redialTimer)
    redialTimer = null
  }
  showRedialTimer.value = false
}

// Handle auto redial
const handleAutoRedial = async () => {
  if (props.callData?.status === 'sent') {
    ElMessageBox.confirm(
      '值班人员未响应，是否重新呼叫或上报处理？',
      '呼叫超时',
      {
        confirmButtonText: '重新呼叫',
        cancelButtonText: '上报处理',
        type: 'warning'
      }
    ).then(() => {
      handleRedial()
    }).catch(() => {
      handleEscalate()
    })
  }
}

// Handle redial
const handleRedial = async () => {
  if (!props.callData) return

  try {
    redialing.value = true

    const response = await emergencyAPI.redialCall(props.callData.callId)

    if (response.success) {
      ElMessage.success('重新呼叫成功')
      props.callData.status = 'calling'
      startRedialTimer()
    }
  } catch (error) {
    ElMessage.error('重新呼叫失败')
  } finally {
    redialing.value = false
  }
}

// Handle cancel
const handleCancel = async () => {
  if (!props.callData) return

  try {
    await ElMessageBox.confirm(
      '确定要取消当前呼叫吗？',
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    cancelling.value = true

    const response = await emergencyAPI.cancelCall(props.callData.callId)

    if (response.success) {
      ElMessage.success('呼叫已取消')
      props.callData.status = 'cancelled'
      handleClose()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败')
    }
  } finally {
    cancelling.value = false
  }
}

// Handle escalate
const handleEscalate = async () => {
  if (!props.callData) return

  try {
    escalating.value = true

    const response = await emergencyAPI.escalateCall(props.callData.callId)

    if (response.success) {
      ElMessage.success('已上报处理')
      props.callData.status = 'escalated'
    }
  } catch (error) {
    ElMessage.error('上报失败')
  } finally {
    escalating.value = false
  }
}

// Handle view history
const handleViewHistory = () => {
  showHistory.value = true
}

// Fetch call history
const fetchCallHistory = async () => {
  try {
    const response = await emergencyAPI.getCallHistory()
    callHistory.value = response.data || []
  } catch (error) {
    console.error('Failed to fetch call history:', error)
  }
}

// Handle dialog close
const handleClose = () => {
  emit('close')
}

// Update map marker
const updateMapMarker = (location) => {
  // Update marker position on map
  if (marker.value && map.value) {
    marker.value.setPosition([location.longitude, location.latitude])
  }
}

// Utility functions
const getStepStatus = (stepStatus) => {
  if (!props.callData) return 'wait'

  const currentStatus = props.callData.status
  const statusOrder = ['calling', 'sent', 'received', 'responded', 'completed']
  const currentIndex = statusOrder.indexOf(currentStatus)
  const stepIndex = statusOrder.indexOf(stepStatus)

  if (stepIndex < currentIndex) return 'finish'
  if (stepIndex === currentIndex) {
    if (stepStatus === 'completed') return 'success'
    return 'process'
  }
  return 'wait'
}

const getPriorityText = (priority) => {
  const priorityMap = {
    emergency: '紧急呼叫',
    urgent: '紧急通知',
    normal: '普通呼叫'
  }
  return priorityMap[priority] || '未知'
}

const getPriorityType = (priority) => {
  const typeMap = {
    emergency: 'danger',
    urgent: 'warning',
    normal: 'primary'
  }
  return typeMap[priority] || 'info'
}

const getStatusText = (status) => {
  const statusMap = {
    calling: '呼叫中',
    sent: '已发送',
    received: '已接收',
    responded: '已响应',
    completed: '已完成',
    cancelled: '已取消',
    escalated: '已上报'
  }
  return statusMap[status] || '未知'
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatDuration = (duration) => {
  if (!duration) return '-'
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

const formatRedialProgress = () => {
  return `${redialSeconds.value}s`
}

// Lifecycle hooks
onMounted(() => {
  dialogVisible.value = props.modelValue
})

onUnmounted(() => {
  cleanupDialog()
})
</script>

<style scoped>
.call-status-section {
  margin-bottom: 30px;
}

.call-status-section h3 {
  margin-bottom: 20px;
  color: #303133;
}

.location-section {
  margin-bottom: 30px;
}

.location-section h3 {
  margin-bottom: 15px;
  color: #303133;
}

.map-container {
  width: 100%;
  height: 300px;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 15px;
}

.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.map-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.mock-map {
  padding: 20px;
  text-align: center;
}

.location-details {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
}

.location-details p {
  margin: 8px 0;
  color: #606266;
}

.response-section {
  margin-bottom: 30px;
}

.response-section h3 {
  margin-bottom: 15px;
  color: #303133;
}

.response-message {
  margin-top: 15px;
  padding: 15px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 8px;
}

.response-message p {
  margin: 8px 0;
}

.actions-section {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.redial-timer {
  margin-top: 20px;
  padding: 15px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 8px;
  text-align: center;
}

.redial-timer p {
  margin: 10px 0 0 0;
  color: #f56c6c;
  font-weight: 500;
}

.status-calling {
  color: #409eff;
}

.status-sent {
  color: #67c23a;
}

.status-received {
  color: #e6a23c;
}

.status-responded {
  color: #67c23a;
}

.status-completed {
  color: #909399;
}

.status-cancelled {
  color: #f56c6c;
}

.status-escalated {
  color: #e6a23c;
}

@media (max-width: 768px) {
  .actions-section {
    flex-direction: column;
  }

  .actions-section .el-button {
    width: 100%;
  }
}
</style>