<template>
  <div class="chat-detail-page">
    <!-- 视频通话组件 -->
    <VideoCall
      v-if="showVideoCall"
      :show="showVideoCall"
      :remote-user="remoteUser"
      :is-initiator="isCallInitiator"
      @close="showVideoCall = false"
      @ended="onVideoCallEnded"
      @accepted="onVideoCallAccepted"
    />

    <!-- 红包弹窗 -->
    <RedPacketModal
      v-if="showRedPacketModal"
      :show="showRedPacketModal"
      :mode="redPacketMode"
      :red-packet-id="selectedRedPacketId"
      @close="showRedPacketModal = false"
      @sent="onRedPacketSent"
      @opened="onRedPacketOpened"
    />

    <!-- 礼物弹窗 -->
    <GiftModal
      v-if="showGiftModal"
      :show="showGiftModal"
      @close="showGiftModal = false"
      @sent="onGiftSent"
    />

    <!-- 转账弹窗 -->
    <TransferModal
      v-if="showTransferModal"
      :show="showTransferModal"
      :recipient="recipientInfo"
      @close="showTransferModal = false"
      @sent="onTransferSent"
    />

    <!-- 卡券弹窗 -->
    <CouponModal
      v-if="showCouponModal"
      :show="showCouponModal"
      :recipient="recipientInfo"
      @close="showCouponModal = false"
      @sent="onCouponSent"
    />
    <!-- 顶部导航栏 -->
    <div class="chat-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <div class="header-info">
        <span class="name">{{ activeConversation?.name }}</span>
        <span v-if="activeConversation?.memberCount" class="member-count">
          {{ activeConversation.memberCount }}人
        </span>
      </div>
      <button class="more-btn" @click="showMoreMenu">
        <span class="icon">⋯</span>
      </button>
    </div>

    <!-- 消息列表 -->
    <div ref="messageListRef" class="message-list" :class="{ 'large-text': isElderlyMode }">
      <div
        v-for="message in activeMessages"
        :key="message.id"
        class="message-item"
        :class="{ 'is-self': message.isSelf }"
      >
          <!-- 对方消息 -->
          <div v-if="!message.isSelf" class="message-left">
            <div class="avatar">{{ message.senderAvatar }}</div>
            <div class="message-content">
              <div class="sender-name">{{ message.senderName }}</div>
              <div class="bubble">
                <!-- 文本消息 -->
                <span v-if="message.type === 'text'">{{ message.content }}</span>
                <!-- 图片消息 -->
                <img
                  v-else-if="message.type === 'image'"
                  :src="message.content"
                  class="message-image"
                  @click="previewImage(message.content)"
                />
                <!-- 语音消息 -->
                <div v-else-if="message.type === 'voice'" class="voice-message" @click="playVoice(message)">
                  <span class="voice-icon">🗣️</span>
                  <span class="voice-duration">{{ message.duration }}''</span>
                </div>
              <!-- 位置消息 -->
              <div v-else-if="message.type === 'location'" class="location-message" @click="openLocation(message.content)">
                <span class="location-icon">📍</span>
                <div class="location-info">
                  <div class="location-title">{{ message.content.name }}</div>
                  <div class="location-address">{{ message.content.address }}</div>
                </div>
              </div>
              <!-- 红包消息 -->
              <div v-else-if="message.type === 'redpacket'" class="redpacket-message" @click="openRedPacket(message)">
                <div class="redpacket-icon">🧧</div>
                <div class="redpacket-info">
                  <div class="redpacket-text">{{ message.content.greeting || '恭喜发财，大吉大利' }}</div>
                  <div class="redpacket-status">
                    {{ message.content.status === 'received' ? '已领取' : message.content.status === 'expired' ? '已过期' : '点击领取' }}
                  </div>
                </div>
              </div>
              <!-- 礼物消息 -->
              <div v-else-if="message.type === 'gift'" class="gift-message">
                <div class="gift-icon">{{ message.content.icon || '🎁' }}</div>
                <div class="gift-info">
                  <div class="gift-name">{{ message.content.name }}</div>
                  <div class="gift-amount">{{ message.content.amount }}个</div>
                </div>
              </div>
              <!-- 转账消息 -->
              <div v-else-if="message.type === 'transfer'" class="transfer-message">
                <div class="transfer-icon">💰</div>
                <div class="transfer-info">
                  <div class="transfer-amount">¥{{ message.content.amount }}</div>
                  <div class="transfer-status">{{ message.content.status === 'received' ? '已收款' : '转账消息' }}</div>
                </div>
              </div>
              <!-- 卡券消息 -->
              <div v-else-if="message.type === 'coupon'" class="coupon-message" @click="openCoupon(message)">
                <div class="coupon-icon">🎫</div>
                <div class="coupon-info">
                  <div class="coupon-name">{{ message.content.name }}</div>
                  <div class="coupon-desc">{{ message.content.description }}</div>
                </div>
              </div>
              <!-- 撤回消息 -->
              <span v-else-if="message.type === 'recall'" class="recall-text">
                {{ message.content }}
              </span>
            </div>
            <div class="message-time">
              {{ formatMessageTime(message.timestamp) }}
              <span v-if="message.status === 'sent'" class="status-icon">✓</span>
              <span v-else-if="message.status === 'sending'" class="status-icon sending">⏳</span>
            </div>
          </div>
        </div>

        <!-- 自己消息 -->
        <div v-else class="message-right">
          <div class="message-content">
            <div class="bubble self">
              <!-- 文本消息 -->
              <span v-if="message.type === 'text'">{{ message.content }}</span>
                <!-- 图片消息 -->
                <img
                  v-else-if="message.type === 'image'"
                  :src="message.content"
                  class="message-image"
                  @click="previewImage(message.content)"
                />
                <!-- 语音消息 -->
                <div v-else-if="message.type === 'voice'" class="voice-message" @click="playVoice(message)">
                  <span class="voice-icon">🗣️</span>
                  <span class="voice-duration">{{ message.duration }}''</span>
                </div>
              <!-- 位置消息 -->
              <div v-else-if="message.type === 'location'" class="location-message" @click="openLocation(message.content)">
                <span class="location-icon">📍</span>
                <div class="location-info">
                  <div class="location-title">{{ message.content.name }}</div>
                  <div class="location-address">{{ message.content.address }}</div>
                </div>
              </div>
              <!-- 红包消息 -->
              <div v-else-if="message.type === 'redpacket'" class="redpacket-message" @click="openRedPacket(message)">
                <div class="redpacket-icon">🧧</div>
                <div class="redpacket-info">
                  <div class="redpacket-text">{{ message.content.greeting || '恭喜发财，大吉大利' }}</div>
                  <div class="redpacket-status">
                    {{ message.content.status === 'received' ? '已领取' : message.content.status === 'expired' ? '已过期' : '点击领取' }}
                  </div>
                </div>
              </div>
              <!-- 礼物消息 -->
              <div v-else-if="message.type === 'gift'" class="gift-message">
                <div class="gift-icon">{{ message.content.icon || '🎁' }}</div>
                <div class="gift-info">
                  <div class="gift-name">{{ message.content.name }}</div>
                  <div class="gift-amount">{{ message.content.amount }}个</div>
                </div>
              </div>
              <!-- 转账消息 -->
              <div v-else-if="message.type === 'transfer'" class="transfer-message">
                <div class="transfer-icon">💰</div>
                <div class="transfer-info">
                  <div class="transfer-amount">¥{{ message.content.amount }}</div>
                  <div class="transfer-status">{{ message.content.status === 'received' ? '已收款' : '转账消息' }}</div>
                </div>
              </div>
              <!-- 卡券消息 -->
              <div v-else-if="message.type === 'coupon'" class="coupon-message" @click="openCoupon(message)">
                <div class="coupon-icon">🎫</div>
                <div class="coupon-info">
                  <div class="coupon-name">{{ message.content.name }}</div>
                  <div class="coupon-desc">{{ message.content.description }}</div>
                </div>
              </div>
            </div>
            <div class="message-time">
              <span v-if="message.status === 'sent'" class="status-icon">✓</span>
              <span v-else-if="message.status === 'sending'" class="status-icon sending">⏳</span>
              {{ formatMessageTime(message.timestamp) }}
            </div>
          </div>
          <div class="avatar">{{ message.senderAvatar }}</div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="loadingMore" class="loading-more">
        <span class="loading-text">加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-if="activeMessages.length === 0 && !loadingMore" class="empty-state">
        <div class="empty-text">暂无消息，打个招呼吧～</div>
      </div>
    </div>
 
    <!-- 输入区域 -->
    <div class="input-area">
      <!-- 工具栏 -->
      <div class="toolbar">
        <button class="tool-btn" @click="toggleVoiceInput">
          <span class="tool-icon">{{ showVoiceInput ? '⌨️' : '🗣️' }}</span>
        </button>

        <!-- 文本输入框 -->
        <div v-if="!showVoiceInput" class="input-wrapper">
          <textarea
            ref="messageInputRef"
            v-model="inputText"
            class="message-input"
            :class="{ 'large-text': isElderlyMode }"
            placeholder="输入消息..."
            rows="1"
            @input="adjustTextareaHeight"
            @keydown.enter.exact.prevent="sendMessage"
          />
        </div>

        <!-- 语音输入按钮 -->
        <div v-else class="voice-input-wrapper">
          <button
            v-if="!isRecording"
            class="voice-record-btn"
            @touchstart.prevent="startRecord"
            @touchend.prevent="stopRecord"
            @mousedown.prevent="startRecord"
            @mouseup.prevent="stopRecord"
            @touchcancel.prevent="cancelRecord"
            @mouseleave.prevent="cancelRecord"
          >
            <span class="record-text">按住说话</span>
          </button>

          <!-- 录音中状态 -->
          <div v-else class="voice-recording">
            <div class="recording-info">
              <span class="recording-icon">🗣️</span>
              <span class="recording-time">{{ formatRecordTime(recordTimer) }}</span>
              <span v-if="useSimulatedRecording" class="recording-badge">模拟</span>
            </div>
            <button class="cancel-btn" @click="cancelRecord">取消</button>
          </div>
        </div>

        <button class="tool-btn" @click="showEmojiPicker">
          <span class="tool-icon">😊</span>
        </button>

        <!-- 更多功能入口 - 放在发送按钮左侧 -->
        <button class="tool-btn more-actions-btn" @click="showMoreActions">
          <span class="tool-icon">➕</span>
        </button>

        <!-- 发送按钮 -->
        <button
          class="send-btn"
          :disabled="sending || !inputText.trim()"
          @click="sendMessage"
        >
          <span class="send-text">发送</span>
        </button>
      </div>

      <!-- 更多功能面板 -->
      <transition name="slide-up">
        <div v-if="showMorePanel" class="more-actions-panel">
          <div class="panel-header">
            <span class="panel-title">更多功能</span>
            <button class="close-btn" @click="showMorePanel = false">✕</button>
          </div>
          <div class="action-grid">
            <button class="action-item" @click="takePhoto">
              <div class="action-icon">📸</div>
              <span class="action-text">拍照</span>
            </button>
            <button class="action-item" @click="openAlbum">
              <div class="action-icon">🖼️</div>
              <span class="action-text">相册</span>
            </button>
            <button class="action-item" @click="sendLocation">
              <div class="action-icon">📍</div>
              <span class="action-text">位置</span>
            </button>
            <button class="action-item" @click="startVideoCall">
              <div class="action-icon">📹</div>
              <span class="action-text">视频通话</span>
            </button>
            <button class="action-item" @click="sendRedPacket">
              <div class="action-icon">🧧</div>
              <span class="action-text">红包</span>
            </button>
            <button class="action-item" @click="sendGift">
              <div class="action-icon">🎁</div>
              <span class="action-text">礼物</span>
            </button>
            <button class="action-item" @click="sendTransfer">
              <div class="action-icon">💰</div>
              <span class="action-text">转账</span>
            </button>
            <button class="action-item" @click="sendCoupon">
              <div class="action-icon">🎫</div>
              <span class="action-text">卡券</span>
            </button>
          </div>
        </div>
      </transition>
    </div>
 
    <!-- 图片预览 -->
    <div v-if="previewImageUrl" class="image-preview" @click="previewImageUrl = ''">
      <img :src="previewImageUrl" class="preview-image" />
    </div>
 
    <!-- 更多操作菜单 -->
    <div v-if="previewImageUrl" class="image-preview" @click="previewImageUrl = ''">
      <img :src="previewImageUrl" class="preview-image" />
    </div>

    <!-- 更多操作菜单 -->
    <div v-if="showMore" class="menu-overlay" @click="showMore = false">
      <div class="menu-content" @click.stop>
        <div class="menu-item" @click="viewConversationInfo">
          <span class="menu-icon">ℹ️</span>
          <span class="menu-text">聊天信息</span>
        </div>
        <div class="menu-item" @click="clearHistory">
          <span class="menu-icon">🗑️</span>
          <span class="menu-text">清空聊天记录</span>
        </div>
        <div v-if="!activeConversation?.memberCount" class="menu-item" @click="markAllRead">
          <span class="menu-icon">✓</span>
          <span class="menu-text">全部已读</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/store/chat'
import { useElderlyStore } from '@/store/elderly'
import VideoCall from '@/components/chat/VideoCall.vue'
import RedPacketModal from '@/components/chat/RedPacketModal.vue'
import GiftModal from '@/components/chat/GiftModal.vue'
import TransferModal from '@/components/chat/TransferModal.vue'
import CouponModal from '@/components/chat/CouponModal.vue'
import toast from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const elderlyStore = useElderlyStore()

// Toast 辅助函数
const showToast = (message, type = 'info') => {
  toast[type](message)
}

// 消息列表引用
const messageListRef = ref(null)

// 输入框引用
const messageInputRef = ref(null)

// 输入文本
const inputText = ref('')

// 是否显示语音输入
const showVoiceInput = ref(false)

// 是否正在录音
const isRecording = ref(false)

// 录音计时器
const recordTimer = ref(0)
let recordTimerInterval = null

// 录音器实例
let mediaRecorder = null
let audioChunks = []

// 是否使用模拟录音（开发环境降级）
const useSimulatedRecording = ref(false)

// 图片预览URL
const previewImageUrl = ref('')

// 是否显示更多菜单
const showMore = ref(false)

// 是否显示更多功能面板
const showMorePanel = ref(false)

// 视频通话相关
const showVideoCall = ref(false)
const isCallInitiator = ref(false)
const remoteUser = ref(null)

// 红包相关
const showRedPacketModal = ref(false)
const redPacketMode = ref('send') // send | open
const selectedRedPacketId = ref('')

// 礼物相关
const showGiftModal = ref(false)

// 转账相关
const showTransferModal = ref(false)
const recipientInfo = ref({})

// 卡券相关
const showCouponModal = ref(false)

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 当前会话
const activeConversation = computed(() => chatStore.activeConversation)

// 当前消息列表
const activeMessages = computed(() => chatStore.activeMessages)

// 是否正在加载更多
const loadingMore = computed(() => chatStore.loadingMore)

// 是否正在发送
const sending = computed(() => chatStore.sending)

// 格式化消息时间
const formatMessageTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text) return

  const conversationId = route.params.id
  await chatStore.sendMessage(conversationId, text)

  inputText.value = ''
  resetTextareaHeight()
  scrollToBottom()

  // 震动反馈
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 切换语音输入
const toggleVoiceInput = () => {
  showVoiceInput.value = !showVoiceInput.value
}

// 开始录音
const startRecord = async () => {
  try {
    console.log('开始录音，检查浏览器支持...')

    // 检查浏览器是否支持录音
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      console.warn('浏览器不完全支持录音，使用模拟模式')
      useSimulatedRecording.value = true
      simulateRecording()
      return
    }

    console.log('浏览器支持录音，请求麦克风权限...')

    // 检查当前协议（需要 HTTPS 或 localhost）
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    console.log('当前环境:', protocol, hostname)

    // 在开发环境下，如果不是 localhost，使用模拟模式
    const isDevelopment = import.meta.env.DEV
    if (isDevelopment && !hostname.startsWith('localhost') && protocol !== 'https:') {
      console.warn('开发环境非localhost，使用模拟录音')
      useSimulatedRecording.value = true
      simulateRecording()
      return
    }

    // 请求麦克风权限
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      console.log('麦克风权限获取成功')
      useSimulatedRecording.value = false
    } catch (micError) {
      console.error('获取麦克风权限失败:', micError)

      // 降级到模拟录音
      console.log('降级到模拟录音')
      useSimulatedRecording.value = true

      if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
        showToast('麦克风权限被拒绝，使用模拟录音', 'warning')
      } else if (micError.name === 'NotFoundError') {
        showToast('未找到麦克风设备，使用模拟录音', 'warning')
      } else if (micError.name === 'NotReadableError') {
        showToast('麦克风被占用，使用模拟录音', 'warning')
      } else {
        showToast('无法访问麦克风，使用模拟录音', 'warning')
      }

      simulateRecording()
      return
    }

    try {
      // 初始化录音器
      const options = { mimeType: 'audio/webm;codecs=opus' }

      // 检查支持的 MIME 类型
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.log('不支持 audio/webm，尝试其他格式')
        options.mimeType = ''
      }

      mediaRecorder = new MediaRecorder(stream, options)
      console.log('MediaRecorder 创建成功:', mediaRecorder)

      audioChunks = []

      // 收集音频数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
          console.log('收到音频数据:', event.data.size, 'bytes')
        }
      }

      // 录音完成
      mediaRecorder.onstop = async () => {
        console.log('录音停止，处理音频数据...')

        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop())

        // 创建音频 Blob
        let audioBlob
        if (audioChunks.length > 0) {
          audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          console.log('音频 Blob 创建成功:', audioBlob.size, 'bytes')
        } else {
          showToast('录音数据为空，请重试', 'error')
          isRecording.value = false
          recordTimer.value = 0
          return
        }

        // 将 Blob 转换为 base64 URL，避免 blob URL 失效问题
        const audioUrl = await blobToBase64(audioBlob)
        const duration = Math.ceil(recordTimer.value)
        console.log('录音时长:', duration, '秒')
        console.log('音频 base64 长度:', audioUrl.length)

        // 发送语音消息
        if (duration >= 1) {
          await chatStore.sendVoiceMessage(route.params.id, audioUrl, duration)
          scrollToBottom()
          showToast('语音发送成功', 'success')
        } else {
          showToast('录音时间太短，至少需要1秒', 'info')
        }

        // 清理
        audioChunks = []
        recordTimer.value = 0
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder 错误:', event.error)
        isRecording.value = false
        if (recordTimerInterval) {
          clearInterval(recordTimerInterval)
          recordTimerInterval = null
        }
        showToast('录音器错误: ' + event.error?.message || '未知错误', 'error')
      }

      // 开始录音
      mediaRecorder.start(100) // 每100ms收集一次数据
      isRecording.value = true

      // 触觉反馈
      if (elderlyStore.hapticFeedback) {
        elderlyStore.vibrate('short')
      }

      // 开始计时
      recordTimerInterval = setInterval(() => {
        recordTimer.value++
      }, 1000)

      showToast('开始录音，松开发送', 'info')
      console.log('录音已开始')

    } catch (recorderError) {
      console.error('创建 MediaRecorder 失败:', recorderError)
      stream.getTracks().forEach(track => track.stop())

      // 降级到模拟录音
      console.log('降级到模拟录音')
      useSimulatedRecording.value = true
      simulateRecording()
      return
    }

  } catch (error) {
    console.error('录音失败:', error)
    isRecording.value = false

    // 最后的降级方案
    console.log('最后降级到模拟录音')
    useSimulatedRecording.value = true
    simulateRecording()
  }
}

// 停止录音
const stopRecord = async () => {
  if (!isRecording.value) return

  try {
    if (useSimulatedRecording.value) {
      // 停止模拟录音
      await stopSimulatedRecording()
    } else {
      // 停止真实录音
      if (mediaRecorder) {
        mediaRecorder.stop()
      }

      // 注意：不要在这里清除计时器！
      // 计时器会在 onstop 事件处理器中清除
      // 计时器会在 onstop 事件处理器中清除

      // 不要立即显示"录音结束"提示
      // 提示会在 onstop 事件处理器中显示
    }

  } catch (error) {
    console.error('停止录音失败:', error)
    isRecording.value = false
    showToast('录音失败', 'error')
  }
}

// 播放语音
const playVoice = (message) => {
  try {
    console.log('播放语音消息:', {
      id: message.id,
      type: message.type,
      content: message.content,
      contentLength: message.content?.length,
      duration: message.duration
    })

    if (!message.content) {
      showToast('语音文件不存在', 'error')
      return
    }

    // 检查是否是无效的音频（模拟录音或空音频）
    if (message.content.includes('UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==')) {
      console.warn('检测到无效的模拟音频URL')
      showToast('该语音文件无效，请重新录制', 'error')
      return
    }

    // 创建音频播放器
    const audio = new Audio(message.content)

    audio.onplay = () => {
      console.log('开始播放语音')
    }

    audio.onended = () => {
      console.log('语音播放完成')
    }

    audio.onerror = (error) => {
      console.error('语音播放错误:', error)
      console.error('音频错误代码:', audio.error?.code)
      console.error('音频错误消息:', audio.error?.message)
      console.error('音频URL长度:', message.content?.length)

      let errorMessage = '语音播放失败'
      if (audio.error?.code === 1) {
        errorMessage = '音频格式不支持'
      } else if (audio.error?.code === 2) {
        errorMessage = '音频文件损坏'
      } else if (audio.error?.code === 3) {
        errorMessage = '音频解码失败'
      } else if (audio.error?.code === 4) {
        errorMessage = '音频源不支持'
      }

      // 添加调试信息
      const debugInfo = audio.error?.message ? ': ' + audio.error.message : ''
      showToast(errorMessage + debugInfo, 'error')

      // 如果是模拟录音,提示用户
      if (message.content?.includes('data:audio/wav;base64')) {
        console.warn('这是模拟录音模式,音频可能不完整')
        showToast('模拟录音模式,请使用真实录音功能', 'warning')
      }
    }

    audio.onloadeddata = () => {
      console.log('音频数据已加载，时长:', audio.duration, '秒')
    }

    // 播放音频
    const playPromise = audio.play()

    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('播放 Promise 被拒绝:', error)
        if (error.name === 'NotAllowedError') {
          showToast('请允许音频自动播放', 'error')
        } else if (error.name === 'NotSupportedError') {
          showToast('音频格式不支持', 'error')
        } else {
          showToast('语音播放失败: ' + error.message, 'error')
        }
      })
    }

  } catch (error) {
    console.error('播放语音失败:', error)
    showToast('语音播放失败: ' + error.message, 'error')
  }
}

// 格式化录音时间
const formatRecordTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 将 Blob 转换为 base64 URL
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 模拟录音（开发环境降级方案）
const simulateRecording = () => {
  console.log('使用模拟录音功能')

  isRecording.value = true
  recordTimer.value = 0

  // 触觉反馈
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }

  // 开始计时
  recordTimerInterval = setInterval(() => {
    recordTimer.value++
  }, 1000)

  showToast('模拟录音中...', 'info')
}

// 停止模拟录音
const stopSimulatedRecording = async () => {
  if (!isRecording.value) return

  console.log('停止模拟录音，当前时长:', recordTimer.value, '秒')

  // 清除计时器
  if (recordTimerInterval) {
    clearInterval(recordTimerInterval)
    recordTimerInterval = null
  }

  isRecording.value = false

  const duration = recordTimer.value
  console.log('录音时长:', duration, '秒')

  // 创建一个模拟的语音 URL
  if (duration >= 1) {
    // 使用一个有效的短音频作为模拟语音（1秒的beep音）
    // 这是一个有效的WAV文件，包含真实的音频数据
    const simulatedVoiceUrl = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

    console.log('准备发送模拟语音消息:', {
      conversationId: route.params.id,
      voiceUrl: simulatedVoiceUrl,
      duration
    })

    try {
      const message = await chatStore.sendVoiceMessage(route.params.id, simulatedVoiceUrl, duration)
      console.log('模拟语音发送成功:', message)
      scrollToBottom()
      showToast('模拟语音发送成功', 'success')
    } catch (error) {
      console.error('发送模拟语音失败:', error)
      showToast('发送语音失败: ' + error.message, 'error')
    }
  } else {
    showToast('录音时间太短', 'info')
  }

  recordTimer.value = 0
}

// 取消录音
const cancelRecord = () => {
  if (mediaRecorder && isRecording.value && !useSimulatedRecording.value) {
    mediaRecorder.stop()
  } else if (isRecording.value) {
    // 取消模拟录音
    if (recordTimerInterval) {
      clearInterval(recordTimerInterval)
      recordTimerInterval = null
    }
  }

  isRecording.value = false
  audioChunks = []
  recordTimer.value = 0

  showToast('已取消录音', 'info')
}

// 显示表情选择器
const showEmojiPicker = () => {
  // TODO: 实现表情选择器
  console.log('显示表情选择器')
}

// 选择图片
const chooseImage = () => {
  // 创建文件输入元素
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const conversationId = route.params.id
      // TODO: 上传图片并发送
      console.log('选择图片:', file)
    }
  }
  input.click()
}

// 预览图片
const previewImage = (url) => {
  previewImageUrl.value = url
}

// 显示更多菜单
const showMoreMenu = () => {
  showMore.value = true
}

// 显示更多功能面板
const showMoreActions = () => {
  showMorePanel.value = !showMorePanel.value
}

// 拍照功能
const takePhoto = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const imageUrl = event.target.result
        await chatStore.sendImageMessage(route.params.id, imageUrl)
        scrollToBottom()
        showToast('图片发送成功', 'success')
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
  showMorePanel.value = false
}

// 打开相册
const openAlbum = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      for (const file of files) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          const imageUrl = event.target.result
          await chatStore.sendImageMessage(route.params.id, imageUrl)
        }
        reader.readAsDataURL(file)
      }
      scrollToBottom()
      showToast(`已发送${files.length}张图片`, 'success')
    }
  }
  input.click()
  showMorePanel.value = false
}

// 发送位置
const sendLocation = async () => {
  try {
    if (!navigator.geolocation) {
      showToast('您的浏览器不支持定位', 'error')
      return
    }

    showToast('正在获取位置...', 'info')

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      })
    })

    const { latitude, longitude } = position.coords

    const locationData = {
      latitude,
      longitude,
      name: '我的位置',
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      timestamp: new Date().toISOString()
    }

    await chatStore.sendLocationMessage(route.params.id, locationData)
    scrollToBottom()
    showToast('位置发送成功', 'success')
  } catch (error) {
    console.error('获取位置失败:', error)
    showToast('获取位置失败，请检查定位权限', 'error')
  }
  showMorePanel.value = false
}

// 打开位置
const openLocation = (location) => {
  if (!location) return

  const { latitude, longitude, name, address } = location

  if (latitude && longitude) {
    window.open(
      `https://apis.map.qq.com/uri/v1/marker?marker=coord:${latitude},${longitude};title:${encodeURIComponent(name || '位置')};addr:${encodeURIComponent(address || '')}`,
      '_blank'
    )
  } else {
    showToast('位置信息不完整', 'error')
  }
}

// 视频通话
const startVideoCall = () => {
  isCallInitiator.value = true
  remoteUser.value = activeConversation.value
  showVideoCall.value = true
  showMorePanel.value = false
}

// 视频通话结束
const onVideoCallEnded = () => {
  showVideoCall.value = false
}

// 视频通话接听
const onVideoCallAccepted = () => {
  console.log('视频通话已接听')
}

// 发送红包
const sendRedPacket = () => {
  redPacketMode.value = 'send'
  showRedPacketModal.value = true
  showMorePanel.value = false
}

// 打开红包
const openRedPacket = (message) => {
  if (!message.content) return

  if (message.content.status === 'received') {
    showToast('该红包已领取', 'info')
  } else if (message.content.status === 'expired') {
    showToast('该红包已过期', 'info')
  } else if (message.isSelf) {
    showToast('这是你发出的红包', 'info')
  } else {
    redPacketMode.value = 'open'
    selectedRedPacketId.value = message.content.id
    showRedPacketModal.value = true
  }
}

// 红包发送成功
const onRedPacketSent = (redPacket) => {
  console.log('红包发送成功:', redPacket)
  scrollToBottom()
}

// 红包打开成功
const onRedPacketOpened = (result) => {
  console.log('红包打开成功:', result)
  showToast(`领取了 ¥${result.amount.toFixed(2)}`, 'success')
}

// 发送礼物
const sendGift = () => {
  showGiftModal.value = true
  showMorePanel.value = false
}

// 礼物发送成功
const onGiftSent = (gift) => {
  console.log('礼物发送成功:', gift)
  scrollToBottom()
}

// 转账
const sendTransfer = () => {
  recipientInfo.value = activeConversation.value
  showTransferModal.value = true
  showMorePanel.value = false
}

// 转账成功
const onTransferSent = (transfer) => {
  console.log('转账成功:', transfer)
  showToast(`转账 ¥${transfer.amount.toFixed(2)} 成功`, 'success')
  scrollToBottom()
}

// 发送卡券
const sendCoupon = () => {
  recipientInfo.value = activeConversation.value
  showCouponModal.value = true
  showMorePanel.value = false
}

// 卡券发送成功
const onCouponSent = (coupon) => {
  console.log('卡券发送成功:', coupon)
  showToast('卡券转赠成功', 'success')
  scrollToBottom()
}

// 打开卡券
const openCoupon = (message) => {
  if (!message.content) return
  showToast('查看卡券详情', 'info')
  // TODO: 实现卡券详情查看
}

// 查看聊天信息
const viewConversationInfo = () => {
  showMore.value = false
  router.push(`/chat/info/${route.params.id}`)
}

// 清空聊天记录
const clearHistory = () => {
  showMore.value = false
  // TODO: 实现清空聊天记录
  console.log('清空聊天记录')
}

// 全部已读
const markAllRead = () => {
  showMore.value = false
  chatStore.markAsRead(route.params.id)
}

// 返回
const goBack = () => {
  router.back()
}

// 调整文本框高度
const adjustTextareaHeight = (e) => {
  const textarea = e.target
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
}

// 重置文本框高度
const resetTextareaHeight = () => {
  if (messageInputRef.value) {
    messageInputRef.value.style.height = 'auto'
  }
}

// 初始化
onMounted(async () => {
  const conversationId = route.params.id
  await chatStore.setActiveConversation(conversationId)
  scrollToBottom()
})

// 监听消息变化，自动滚动到底部
watch(() => activeMessages.value.length, () => {
  scrollToBottom()
})
</script>

<style lang="scss" scoped>
.chat-detail-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn {
    background: none;
    border: none;
    font-size: 20px;
    padding: 8px;
    margin-right: 8px;
    cursor: pointer;

    .icon {
      display: block;
    }
  }

  .header-info {
    flex: 1;
    display: flex;
    flex-direction: column;

    .name {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .member-count {
      font-size: 12px;
      color: #999;
      margin-top: 2px;
    }
  }

  .more-btn {
    background: none;
    border: none;
    font-size: 24px;
    padding: 8px;
    cursor: pointer;

    .icon {
      display: block;
    }
  }
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  &.large-text {
    font-size: 18px;
  }

  .message-item {
    margin-bottom: 16px;

    .message-left,
    .message-right {
      display: flex;
      align-items: flex-start;
      gap: 8px;

      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        background: #f0f0f0;
        flex-shrink: 0;
      }

      .message-content {
        max-width: 70%;

        .sender-name {
          font-size: 12px;
          color: #999;
          margin-bottom: 4px;
        }

        .bubble {
          background: #fff;
          padding: 10px 14px;
          border-radius: 8px;
          word-break: break-word;

          &.self {
            background: #1890ff;
            color: #fff;
          }

          .message-image {
            max-width: 200px;
            max-height: 200px;
            border-radius: 4px;
            cursor: pointer;
          }

          .voice-message {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;

            .voice-icon {
              font-size: 18px;
            }

            .voice-duration {
              font-size: 12px;
              opacity: 0.7;
            }
          }

          .recall-text {
            color: #999;
            font-style: italic;
          }

          .location-message {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            min-width: 200px;

            .location-icon {
              font-size: 24px;
              flex-shrink: 0;
            }

            .location-info {
              flex: 1;

              .location-title {
                font-size: 14px;
                font-weight: 500;
                color: #333;
                margin-bottom: 4px;
              }

              .location-address {
                font-size: 12px;
                color: #999;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
          }

          .redpacket-message {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            min-width: 180px;
            padding: 12px;
            background: linear-gradient(135deg, #ff6b6b, #ff8e53);
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);

            .redpacket-icon {
              font-size: 36px;
              flex-shrink: 0;
            }

            .redpacket-info {
              flex: 1;

              .redpacket-text {
                font-size: 14px;
                color: #fff;
                margin-bottom: 4px;
                font-weight: 500;
              }

              .redpacket-status {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
              }
            }
          }

          .gift-message {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 150px;
            padding: 12px;
            background: linear-gradient(135deg, #ff9a9e, #fecfef);
            border-radius: 8px;

            .gift-icon {
              font-size: 32px;
              flex-shrink: 0;
            }

            .gift-info {
              flex: 1;

              .gift-name {
                font-size: 14px;
                font-weight: 500;
                color: #333;
                margin-bottom: 4px;
              }

              .gift-amount {
                font-size: 12px;
                color: #999;
              }
            }
          }

          .transfer-message {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 150px;
            padding: 12px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 8px;

            .transfer-icon {
              font-size: 32px;
              flex-shrink: 0;
            }

            .transfer-info {
              flex: 1;

              .transfer-amount {
                font-size: 18px;
                font-weight: 600;
                color: #fff;
                margin-bottom: 4px;
              }

              .transfer-status {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
              }
            }
          }

          .coupon-message {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            min-width: 150px;
            padding: 12px;
            background: linear-gradient(135deg, #f093fb, #f5576c);
            border-radius: 8px;

            .coupon-icon {
              font-size: 32px;
              flex-shrink: 0;
            }

            .coupon-info {
              flex: 1;

              .coupon-name {
                font-size: 14px;
                font-weight: 500;
                color: #fff;
                margin-bottom: 4px;
              }

              .coupon-desc {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
          }
        }

        .message-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #999;
          margin-top: 4px;

          .status-icon {
            font-size: 12px;

            &.sending {
              opacity: 0.5;
            }
          }
        }
      }
    }

    .message-right {
      flex-direction: row-reverse;

      .message-content {
        display: flex;
        flex-direction: column;
        align-items: flex-end;

        .message-time {
          flex-direction: row-reverse;
        }
      }
    }
  }

  .loading-more,
  .empty-state {
    display: flex;
    justify-content: center;
    padding: 20px;

    .loading-text,
    .empty-text {
      font-size: 14px;
      color: #999;
    }
  }
}

.input-area {
  background: #fff;
  border-top: 1px solid #eee;
  padding-bottom: max(12px, env(safe-area-inset-bottom, 0));

  .toolbar {
    display: flex;
    align-items: center;
    padding: 12px;
    gap: 8px;

    .tool-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: none;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;

      &:active {
        background: #f5f5f5;
      }

      .tool-icon {
        font-size: 20px;
      }

      &.more-actions-btn {
        background: #f0f0f0;

        &:active {
          background: #e0e0e0;
        }
      }
    }

    .input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      min-width: 0;

      .message-input {
        width: 100%;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 14px;
        resize: none;
        outline: none;
        max-height: 120px;
        min-height: 40px;
        font-family: inherit;
        overflow-y: auto;
        box-sizing: border-box;
        line-height: 1.5;

        &.large-text {
          font-size: 18px;
        }

        &:focus {
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }

        &:placeholder {
          color: #ccc;
        }
      }
    }

    .voice-input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .voice-record-btn {
      flex: 1;
      height: 40px;
      border: 1px solid #1890ff;
      background: #fff;
      color: #1890ff;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
      -webkit-user-select: none;

      &:active {
        background: #1890ff;
        color: #fff;
      }

      .record-text {
        pointer-events: none;
      }
    }

    .voice-recording {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      background: #fff5f5;
      border: 1px solid #ffccc7;
      border-radius: 8px;

      .recording-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;

        .recording-icon {
          font-size: 20px;
          animation: pulse 1s ease-in-out infinite;
        }

        .recording-time {
          font-size: 16px;
          font-weight: 600;
          color: #1890ff;
        }

        .recording-badge {
          padding: 2px 8px;
          background: #fff7e6;
          color: #fa8c16;
          font-size: 10px;
          border-radius: 4px;
          font-weight: 500;
        }
      }

      .cancel-btn {
        padding: 6px 12px;
        border: 1px solid #ffccc7;
        background: #fff;
        color: #ff4d4f;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;

        &:active {
          background: #fff1f0;
        }
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .send-btn {
      padding: 0 20px;
      height: 40px;
      min-width: 70px;
      border: none;
      background: #1890ff;
      color: #fff;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: #40a9ff;
      }

      &:active:not(:disabled) {
        background: #096dd9;
      }
    }
  }

  .more-actions-panel {
    background: #fff;
    border-top: 1px solid #eee;
    padding: 12px 16px 24px;

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;

      .panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }

      .close-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 18px;
        color: #999;

        &:active {
          background: #f5f5f5;
        }
      }
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px 12px;

      .action-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px 8px;
        border: none;
        background: none;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;

        &:active {
          background: #f5f5f5;
          transform: scale(0.95);
        }

        .action-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .action-text {
          font-size: 12px;
          color: #666;
        }

        &:nth-child(1) .action-icon {
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        &:nth-child(2) .action-icon {
          background: linear-gradient(135deg, #f093fb, #f5576c);
        }

        &:nth-child(3) .action-icon {
          background: linear-gradient(135deg, #4facfe, #00f2fe);
        }

        &:nth-child(4) .action-icon {
          background: linear-gradient(135deg, #43e97b, #38f9d7);
        }

        &:nth-child(5) .action-icon {
          background: linear-gradient(135deg, #fa709a, #fee140);
        }

        &:nth-child(6) .action-icon {
          background: linear-gradient(135deg, #a18cd1, #fbc2eb);
        }

        &:nth-child(7) .action-icon {
          background: linear-gradient(135deg, #ff9a9e, #fecfef);
        }

        &:nth-child(8) .action-icon {
          background: linear-gradient(135deg, #fbc2eb, #a6c1ee);
        }
      }
    }
  }

  // 面板滑入动画
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.3s ease;
  }

  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }
}

.image-preview {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;

  .preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;

  .menu-content {
    width: 100%;
    background: #fff;
    border-radius: 16px 16px 0 0;
    padding: 12px 0 24px;

    .menu-item {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      cursor: pointer;

      &:active {
        background: #f5f5f5;
      }

      .menu-icon {
        font-size: 24px;
        margin-right: 16px;
      }

      .menu-text {
        font-size: 16px;
        color: #333;
      }
    }
  }
}

// 适老化模式样式
:deep(.elderly-mode-large) {
  .chat-header .header-info .name {
    font-size: 20px;
  }

  .message-item .message-left .avatar,
  .message-item .message-right .avatar {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .toolbar .tool-btn {
    width: 48px;
    height: 48px;

    .tool-icon {
      font-size: 24px;
    }
  }
}

:deep(.elderly-mode-xl) {
  .chat-header .header-info .name {
    font-size: 24px;
  }

  .message-item .message-left .avatar,
  .message-item .message-right .avatar {
    width: 56px;
    height: 56px;
    font-size: 28px;
  }

  .toolbar .tool-btn {
    width: 56px;
    height: 56px;

    .tool-icon {
      font-size: 28px;
    }
  }
}
</style>
