<template>
  <div class="chat-detail-page">
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
                <span class="voice-icon">🎤</span>
                <span class="voice-duration">{{ message.duration }}''</span>
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
                <span class="voice-icon">🎤</span>
                <span class="voice-duration">{{ message.duration }}''</span>
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
          <span class="tool-icon">{{ showVoiceInput ? '⌨️' : '🎤' }}</span>
        </button>

        <!-- 文本输入框 -->
        <div v-if="!showVoiceInput" class="input-wrapper">
          <textarea
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
        <button
          v-else
          class="voice-record-btn"
          :class="{ recording: isRecording }"
          @touchstart.prevent="startRecord"
          @touchend.prevent="stopRecord"
          @mousedown.prevent="startRecord"
          @mouseup.prevent="stopRecord"
        >
          <span class="record-text">{{ isRecording ? '松开发送' : '按住说话' }}</span>
        </button>

        <button class="tool-btn" @click="showEmojiPicker">
          <span class="tool-icon">😊</span>
        </button>

        <button class="tool-btn" @click="chooseImage">
          <span class="tool-icon">📷</span>
        </button>

        <!-- 发送按钮 -->
        <button
          v-if="inputText.trim()"
          class="send-btn"
          :disabled="sending"
          @click="sendMessage"
        >
          <span class="send-text">发送</span>
        </button>
      </div>
    </div>

    <!-- 图片预览 -->
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

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const elderlyStore = useElderlyStore()

// 消息列表引用
const messageListRef = ref(null)

// 输入文本
const inputText = ref('')

// 是否显示语音输入
const showVoiceInput = ref(false)

// 是否正在录音
const isRecording = ref(false)

// 图片预览URL
const previewImageUrl = ref('')

// 是否显示更多菜单
const showMore = ref(false)

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
    isRecording.value = true
    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('short')
    }
    // TODO: 实现录音功能
  } catch (error) {
    console.error('录音失败:', error)
  }
}

// 停止录音
const stopRecord = async () => {
  isRecording.value = false
  // TODO: 停止录音并发送语音消息
}

// 播放语音
const playVoice = (message) => {
  console.log('播放语音:', message)
  // TODO: 实现语音播放
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
  const textarea = document.querySelector('.message-input')
  if (textarea) {
    textarea.style.height = 'auto'
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

  .toolbar {
    display: flex;
    align-items: flex-end;
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
    }

    .input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;

      .message-input {
        width: 100%;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 14px;
        resize: none;
        outline: none;
        max-height: 120px;
        font-family: inherit;

        &.large-text {
          font-size: 18px;
        }

        &:focus {
          border-color: #1890ff;
        }
      }
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

      &.recording {
        background: #1890ff;
        color: #fff;
      }

      .record-text {
        pointer-events: none;
      }
    }

    .send-btn {
      padding: 0 20px;
      height: 40px;
      border: none;
      background: #1890ff;
      color: #fff;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      flex-shrink: 0;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
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
