<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    :show-close="status === 'resolved' || status === 'cancelled'"
    class="call-status-dialog"
    center
  >
    <!-- 状态指示器 -->
    <div class="status-indicator">
      <div class="status-circle" :class="statusClass">
        <el-icon :size="48">
          <component :is="statusIcon" />
        </el-icon>
      </div>
      <h2 class="status-text">{{ statusText }}</h2>
      <p class="status-desc">{{ statusDesc }}</p>
    </div>

    <!-- 响应信息 -->
    <div v-if="responder" class="responder-info">
      <el-divider>
        <span class="divider-text">响应人员信息</span>
      </el-divider>
      <el-card class="responder-card" shadow="never">
        <div class="responder-details">
          <el-avatar :size="60" :src="responder.avatar">
            {{ responder.name.charAt(0) }}
          </el-avatar>
          <div class="responder-content">
            <h3>{{ responder.name }}</h3>
            <p class="position">{{ responder.position }}</p>
            <p class="contact">
              <el-icon><Phone /></el-icon>
              <span>{{ responder.phone }}</span>
              <el-button
                type="primary"
                size="small"
                link
                @click="makePhoneCall(responder.phone)"
              >
                拨打电话
              </el-button>
            </p>
          </div>
          <div class="responder-location" v-if="responderLocation">
            <el-tag type="success" size="small">
              距离您 {{ distance }} 米
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 位置信息 -->
    <div class="location-section">
      <el-divider>
        <span class="divider-text">位置信息</span>
      </el-divider>
      <el-card class="location-card" shadow="never">
        <div id="call-location-map" class="map-container"></div>
        <div class="location-info">
          <p class="address">{{ callData.location?.address || '未知位置' }}</p>
          <p class="coordinates">
            坐标：{{ callData.location?.lat }}, {{ callData.location?.lng }}
          </p>
        </div>
      </el-card>
    </div>

    <!-- 倒计时信息 -->
    <div class="timer-section" v-if="status === 'active'">
      <el-progress
        type="circle"
        :percentage="responseProgress"
        :status="progressStatus"
        :width="120"
      >
        <template #default>
          <div class="timer-content">
            <p class="timer-value">{{ formattedElapsedTime }}</p>
            <p class="timer-label">等待响应</p>
          </div>
        </template>
      </el-progress>
    </div>

    <!-- 通话时长 -->
    <div class="timer-section" v-if="status === 'responded' || status === 'processing'">
      <div class="call-timer">
        <el-icon :size="32" color="#67C23A">
          <Timer />
        </el-icon>
        <div class="timer-info">
          <p class="timer-value">{{ formattedCallDuration }}</p>
          <p class="timer-label">{{ status === 'processing' ? '处理中' : '通话时长' }}</p>
        </div>
      </div>
    </div>

    <!-- 应急指导 -->
    <div class="guidance-section" v-if="showGuidance">
      <el-divider>
        <span class="divider-text">应急指导</span>
      </el-divider>
      <el-alert
        :title="guidanceTitle"
        type="warning"
        :description="guidanceContent"
        show-icon
        :closable="false"
      />
    </div>

    <!-- 消息区域 -->
    <div class="message-section" v-if="status !== 'cancelled'">
      <el-divider>
        <span class="divider-text">实时沟通</span>
      </el-divider>
      <div class="message-container" ref="messageContainer">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="{ 'message-self': message.senderId === currentUserId }"
        >
          <div class="message-avatar">
            <el-avatar :size="36" :src="message.avatar">
              {{ message.senderName.charAt(0) }}
            </el-avatar>
          </div>
          <div class="message-content">
            <p class="message-sender">{{ message.senderName }}</p>
            <div class="message-bubble">
              <span v-if="message.type === 'text'">{{ message.content }}</span>
              <img
                v-else-if="message.type === 'image'"
                :src="message.content"
                class="message-image"
                @click="previewImage(message.content)"
              />
              <audio
                v-else-if="message.type === 'audio'"
                :src="message.content"
                controls
                class="message-audio"
              />
              <span class="message-time">{{ formatMessageTime(message.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="message-input">
        <el-input
          v-model="messageText"
          placeholder="输入消息..."
          @keyup.enter="sendMessage"
        >
          <template #append>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*,audio/*"
            :on-change="handleFileSelect"
          >
            <el-button icon="Plus" />
          </el-upload>
        </template>
      </el-input>
    </div>
  </div>

    <!-- 操作按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button
          v-if="status === 'active'"
          type="danger"
          @click="cancelCall"
        >
          取消呼叫
        </el-button>
        <el-button
          v-if="status === 'resolved' || status === 'cancelled'"
          type="primary"
          @click="closeDialog"
        >
          关闭
        </el-button>
        <el-button
          v-if="status === 'responded' || status === 'processing'"
          type="success"
          @click="resolveCall"
        >
          标记为已解决
        </el-button>
        <!-- 紧急升级按钮 -->
        <el-button
          v-if="status === 'active' && elapsedTime > 30000" // 30秒后显示升级按钮
          type="warning"
          @click="escalateCall"
        >
          升级通知
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  WarningFilled,
  Loading,
  SuccessFilled,
  Close,
  Phone,
  Timer,
  Plus
} from '@element-plus/icons-vue'
import api from '@/api'
import socket from '@/utils/socket'

export default {
  name: 'CallStatusDialog',

  components: {
    WarningFilled,
    Loading,
    SuccessFilled,
    Close,
    Phone,
    Timer,
    Plus
  },

  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    callId: {
      type: String,
      required: true
    },
    initialData: {
      type: Object,
      default: () => ({})
    }
  },

  emits: ['update:modelValue', 'resolved', 'cancelled'],

  setup(props, { emit }) {
    const store = useStore()
    const messageContainer = ref(null)
    const currentUserId = computed(() => store.state.user.id)

    // 响应式数据
    const visible = ref(false)
    const status = ref('active')
    const callData = reactive({})
    const responder = ref(null)
    const responderLocation = ref(null)
    const distance = ref(0)
    const messageText = ref('')
    const messages = ref([])
    const elapsedTime = ref(0)
    const startTime = ref(Date.now())
    const timer = ref(null)
    const locationTimer = ref(null)
    let map = null

    // 状态相关计算属性
    const statusClass = computed(() => {
      const classMap = {
        active: 'status-waiting',
        responded: 'status-responded',
        processing: 'status-processing',
        resolved: 'status-resolved',
        cancelled: 'status-cancelled'
      }
      return classMap[status.value] || ''
    })

    const statusIcon = computed(() => {
      const iconMap = {
        active: WarningFilled,
        responded: Loading,
        processing: Timer,
        resolved: SuccessFilled,
        cancelled: Close
      }
      return iconMap[status.value] || WarningFilled
    })

    const statusText = computed(() => {
      const textMap = {
        active: '等待响应',
        responded: '已响应',
        processing: '处理中',
        resolved: '已解决',
        cancelled: '已取消'
      }
      return textMap[status.value] || ''
    })

    const statusDesc = computed(() => {
      const descMap = {
        active: '正在呼叫值班人员，请稍候...',
        responded: '值班人员已响应，正在赶往现场',
        processing: '值班人员正在处理紧急情况',
        resolved: '紧急情况已处理完毕',
        cancelled: '您已取消此次呼叫'
      }
      return descMap[status.value] || ''
    })

    const dialogTitle = computed(() => {
      const emergencyType = callData.emergencyType
      const typeMap = {
        fire: '火灾',
        medical: '医疗急救',
        accident: '事故',
        security: '安全事件',
        disaster: '自然灾害',
        other: '其他紧急情况'
      }
      return `${typeMap[emergencyType] || '紧急'} - ${statusText.value}`
    })

    // 进度相关计算属性
    const responseProgress = computed(() => {
      const progress = Math.min((elapsedTime.value / 30000) * 100, 100)
      return status.value === 'active' ? progress : 100
    })

    const progressStatus = computed(() => {
      if (status.value !== 'active') return 'success'
      if (elapsedTime.value > 30000) return 'exception'
      return ''
    })

    const formattedElapsedTime = computed(() => {
      const seconds = Math.floor(elapsedTime.value / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    })

    const formattedCallDuration = computed(() => {
      if (!callData.responseTime) return '00:00'
      const duration = Date.now() - new Date(callData.responseTime).getTime()
      const seconds = Math.floor(duration / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    })

    // 应急指导相关
    const showGuidance = computed(() => {
      return status.value === 'active' && callData.emergencyType !== 'other'
    })

    const guidanceTitle = computed(() => {
      const titleMap = {
        fire: '火灾应急指导',
        medical: '医疗急救指导',
        accident: '事故应急指导',
        security: '安全事件指导',
        disaster: '自然灾害指导'
      }
      return titleMap[callData.emergencyType] || '应急指导'
    })

    const guidanceContent = computed(() => {
      const contentMap = {
        fire: '1. 立即拨打119火警电话\n2. 用湿毛巾捂住口鼻\n3. 弯腰低姿沿安全通道逃生\n4. 切勿乘坐电梯',
        medical: '1. 保持患者平静\n2. 如有外伤，进行简单止血\n3. 准备好患者身份证件\n4. 清空通道等待救援',
        accident: '1. 确保现场安全\n2. 检查伤员情况\n3. 拨打120急救电话\n4. 保护好现场',
        security: '1. 确保自身安全\n2. 寻找安全地方躲避\n3. 保存好证据\n4. 联系警方',
        disaster: '1. 远离危险区域\n2. 到达安全地点\n3. 听从救援指挥\n4. 互帮互助'
      }
      return contentMap[callData.emergencyType] || ''
    })

    // 方法
    const loadCallDetails = async () => {
      try {
        const response = await api.get(`/emergency/call/${props.callId}`)
        if (response.data.success) {
          Object.assign(callData, response.data.data)
          status.value = callData.status

          // 如果有响应者，加载响应者信息
          if (callData.responderId) {
            responder.value = callData.responderId
            // 开始计时通话时长
            if (!callData.responseTime) {
              callData.responseTime = new Date()
            }
          }

          // 加载消息记录
          await loadMessages()
        }
      } catch (error) {
        console.error('Load call details error:', error)
      }
    }

    const loadMessages = async () => {
      try {
        // TODO: 从API加载消息记录
        messages.value = []
      } catch (error) {
        console.error('Load messages error:', error)
      }
    }

    const sendMessage = async () => {
      if (!messageText.value.trim()) return

      const message = {
        id: Date.now().toString(),
        senderId: currentUserId.value,
        senderName: store.state.user.name,
        avatar: store.state.user.avatar,
        type: 'text',
        content: messageText.value.trim(),
        timestamp: new Date()
      }

      // 添加到消息列表
      messages.value.push(message)

      // 发送消息
      try {
        socket.emit('emergency_message', {
          callId: props.callId,
          message
        })
      } catch (error) {
        console.error('Send message error:', error)
      }

      // 清空输入框
      messageText.value = ''

      // 滚动到底部
      scrollToBottom()
    }

    const handleFileSelect = async (file) => {
      const formData = new FormData()
      formData.append('file', file.raw)
      formData.append('callId', props.callId)

      try {
        const response = await api.post('/emergency/upload-message-media', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        if (response.data.success) {
          const message = {
            id: Date.now().toString(),
            senderId: currentUserId.value,
            senderName: store.state.user.name,
            avatar: store.state.user.avatar,
            type: file.raw.type.startsWith('image/') ? 'image' : 'audio',
            content: response.data.data.url,
            timestamp: new Date()
          }

          messages.value.push(message)

          socket.emit('emergency_message', {
            callId: props.callId,
            message
          })

          scrollToBottom()
        }
      } catch (error) {
        console.error('Upload file error:', error)
        ElMessage.error('文件上传失败')
      }
    }

    const cancelCall = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要取消此次紧急呼叫吗？',
          '确认取消',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const response = await api.post(`/emergency/call/${props.callId}/terminate`, {
          reason: '用户主动取消',
          resolution: 'cancelled'
        })

        if (response.data.success) {
          status.value = 'cancelled'
          ElMessage.success('已取消紧急呼叫')
          emit('cancelled', props.callId)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Cancel call error:', error)
        }
      }
    }

    const resolveCall = async () => {
      try {
        await ElMessageBox.prompt(
          '请输入处理结果描述（可选）',
          '标记为已解决',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputType: 'textarea'
          }
        ).then(({ value }) => {
          return api.post(`/emergency/call/${props.callId}/terminate`, {
            reason: value || '问题已解决',
            resolution: 'resolved'
          })
        })

        status.value = 'resolved'
        ElMessage.success('已标记为解决')
        emit('resolved', props.callId)
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Resolve call error:', error)
        }
      }
    }

    const escalateCall = async () => {
      try {
        await ElMessageBox.confirm(
          '是否升级通知上级管理部门？',
          '升级通知',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const response = await api.post(`/emergency/call/${props.callId}/escalate`)
        if (response.data.success) {
          ElMessage.success('已升级通知')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Escalate call error:', error)
        }
      }
    }

    const makePhoneCall = (phone) => {
      window.location.href = `tel:${phone}`
    }

    const previewImage = (url) => {
      // TODO: 实现图片预览
      window.open(url, '_blank')
    }

    const scrollToBottom = () => {
      nextTick(() => {
        if (messageContainer.value) {
          messageContainer.value.scrollTop = messageContainer.value.scrollHeight
        }
      })
    }

    const formatMessageTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    const updateTimer = () => {
      elapsedTime.value = Date.now() - startTime.value
    }

    const initMap = () => {
      // TODO: 初始化地图（使用高德地图或其他地图服务）
      if (callData.location?.lat && callData.location?.lng) {
        // 初始化地图逻辑
        console.log('Init map with location:', callData.location)
      }
    }

    const updateResponderLocation = async () => {
      if (!responder.value) return

      try {
        // TODO: 获取响应者位置
        // const response = await api.get(`/emergency/responder-location/${responder.value._id}`)
        // if (response.data.success) {
        //   responderLocation.value = response.data.data.location
        //   // 计算距离
        //   distance.value = calculateDistance(currentLocation, responderLocation.value)
        // }
      } catch (error) {
        console.error('Update responder location error:', error)
      }
    }

    // Socket事件监听
    const setupSocketListeners = () => {
      socket.on('call_status_update', (data) => {
        if (data.callId === props.callId) {
          status.value = data.status
          if (data.responderId) {
            loadCallDetails()
          }
        }
      })

      socket.on('emergency_message', (data) => {
        if (data.callId === props.callId) {
          messages.value.push(data.message)
          scrollToBottom()
        }
      })
    }

    const closeDialog = () => {
      visible.value = false
      emit('update:modelValue', false)
    }

    // 监听器
    watch(() => props.modelValue, (newVal) => {
      visible.value = newVal
      if (newVal) {
        // 重置状态
        status.value = 'active'
        elapsedTime.value = 0
        startTime.value = Date.now()
        messages.value = []

        // 加载呼叫详情
        if (props.initialData && Object.keys(props.initialData).length > 0) {
          Object.assign(callData, props.initialData)
        } else {
          loadCallDetails()
        }

        // 启动定时器
        timer.value = setInterval(updateTimer, 1000)
        locationTimer.value = setInterval(updateResponderLocation, 5000)

        // 初始化地图
        nextTick(() => {
          initMap()
        })
      } else {
        // 清理定时器
        if (timer.value) {
          clearInterval(timer.value)
          timer.value = null
        }
        if (locationTimer.value) {
          clearInterval(locationTimer.value)
          locationTimer.value = null
        }
      }
    })

    // 生命周期
    onMounted(() => {
      setupSocketListeners()
    })

    onUnmounted(() => {
      // 清理定时器
      if (timer.value) {
        clearInterval(timer.value)
      }
      if (locationTimer.value) {
        clearInterval(locationTimer.value)
      }
    })

    return {
      // Refs
      messageContainer,

      // Reactive data
      visible,
      status,
      callData,
      responder,
      responderLocation,
      distance,
      messageText,
      messages,
      elapsedTime,
      currentUserId,

      // Computed
      statusClass,
      statusIcon,
      statusText,
      statusDesc,
      dialogTitle,
      responseProgress,
      progressStatus,
      formattedElapsedTime,
      formattedCallDuration,
      showGuidance,
      guidanceTitle,
      guidanceContent,

      // Methods
      sendMessage,
      handleFileSelect,
      cancelCall,
      resolveCall,
      escalateCall,
      makePhoneCall,
      previewImage,
      closeDialog
    }
  }
}
</script>

<style scoped>
.call-status-dialog {
  text-align: center;
}

.status-indicator {
  margin-bottom: 30px;
}

.status-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.status-waiting {
  background-color: #fef0f0;
  color: #f56c6c;
}

.status-responded {
  background-color: #ecf5ff;
  color: #409eff;
}

.status-processing {
  background-color: #f4f4f5;
  color: #909399;
}

.status-resolved {
  background-color: #f0f9ff;
  color: #67c23a;
}

.status-cancelled {
  background-color: #f4f4f5;
  color: #909399;
}

.status-text {
  font-size: 24px;
  color: #303133;
  margin: 0 0 10px 0;
}

.status-desc {
  font-size: 16px;
  color: #606266;
  margin: 0;
}

.responder-info {
  margin-bottom: 30px;
}

.responder-card {
  background-color: #f8f9fa;
}

.responder-details {
  display: flex;
  align-items: center;
  gap: 20px;
}

.responder-content {
  flex: 1;
  text-align: left;
}

.responder-content h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.position {
  color: #909399;
  margin: 0 0 10px 0;
}

.contact {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #606266;
}

.divider-text {
  color: #909399;
  font-size: 14px;
}

.location-section {
  margin-bottom: 30px;
}

.location-card {
  padding: 0;
}

.map-container {
  height: 300px;
  width: 100%;
}

.location-info {
  padding: 20px;
  text-align: left;
}

.address {
  font-size: 16px;
  color: #303133;
  margin: 0 0 5px 0;
}

.coordinates {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.timer-section {
  margin-bottom: 30px;
  display: flex;
  justify-content: center;
}

.timer-content {
  text-align: center;
}

.timer-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin: 0;
}

.timer-label {
  font-size: 14px;
  color: #909399;
  margin: 5px 0 0 0;
}

.call-timer {
  display: flex;
  align-items: center;
  gap: 20px;
}

.timer-info {
  text-align: left;
}

.guidance-section {
  margin-bottom: 30px;
  text-align: left;
}

.message-section {
  margin-bottom: 30px;
}

.message-container {
  height: 300px;
  overflow-y: auto;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 15px;
}

.message-item {
  display: flex;
  margin-bottom: 15px;
}

.message-self {
  flex-direction: row-reverse;
}

.message-self .message-content {
  align-items: flex-end;
}

.message-self .message-bubble {
  background-color: #409eff;
  color: white;
}

.message-avatar {
  margin: 0 10px;
}

.message-content {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message-sender {
  font-size: 12px;
  color: #909399;
  margin: 0 0 5px 0;
}

.message-bubble {
  background-color: white;
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  cursor: pointer;
}

.message-audio {
  max-width: 200px;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: block;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 15px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .responder-details {
    flex-direction: column;
    text-align: center;
  }

  .responder-content {
    text-align: center;
  }

  .contact {
    justify-content: center;
  }

  .map-container {
    height: 200px;
  }

  .message-container {
    height: 200px;
  }
}
</style>