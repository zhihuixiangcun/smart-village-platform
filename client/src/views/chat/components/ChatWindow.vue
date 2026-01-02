<template>
  <div class="chat-window">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <div class="header-left">
        <el-button
          v-if="isMobile"
          class="back-btn"
          :icon="ArrowLeft"
          circle
          @click="$emit('back')"
        />
        <div class="chat-info">
          <h3 class="chat-name">{{ chatName }}</h3>
          <span v-if="isTyping" class="typing-indicator">对方正在输入...</span>
        </div>
      </div>
      <div class="header-actions">
        <el-dropdown trigger="click">
          <el-button circle>
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="togglePin">
                <el-icon><Top /></el-icon>
                {{ isPinned ? '取消置顶' : '置顶聊天' }}
              </el-dropdown-item>
              <el-dropdown-item @click="toggleMute">
                <el-icon><Bell /></el-icon>
                {{ isMuted ? '取消静音' : '静音通知' }}
              </el-dropdown-item>
              <el-dropdown-item v-if="isGroup" @click="showGroupInfo">
                <el-icon><User /></el-icon>
                群聊信息
              </el-dropdown-item>
              <el-dropdown-item divided @click="clearHistory">
                <el-icon><Delete /></el-icon>
                清空聊天记录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <template v-else>
        <div v-if="messages.length === 0" class="empty-messages">
          <el-empty description="暂无消息，开始聊天吧" />
        </div>
        <MessageBubble
          v-for="message in messages"
          :key="message._id"
          :message="message"
          :is-self="message.sender?._id === currentUserId"
          :is-group="isGroup"
          @reply="handleReply"
          @recall="handleRecall"
        />
      </template>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <MessageInput
        v-model="inputText"
        :loading="sending"
        :reply-to="replyToMessage"
        @send="sendMessage"
        @cancel-reply="replyToMessage = null"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { ArrowLeft, MoreFilled, Top, Bell, User, Delete, Loading } from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'
import MessageBubble from './MessageBubble.vue'
import MessageInput from './MessageInput.vue'

const props = defineProps({
  conversationId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'back'])

const chatStore = useChatStore()
const userStore = useUserStore()

// 当前用户ID
const currentUserId = computed(() => userStore.user?.id)

// 是否是移动端
const isMobile = ref(window.innerWidth < 768)

// 消息列表引用
const messageListRef = ref(null)

// 输入文本
const inputText = ref('')

// 发送中
const sending = ref(false)

// 回复消息
const replyToMessage = ref(null)

// 加载状态
const loading = ref(false)

// 当前会话
const conversation = computed(() => {
  return chatStore.conversations.find(c => c._id === props.conversationId)
})

// 消息列表
const messages = computed(() => {
  return chatStore.getMessages(props.conversationId) || []
})

// 是否是群聊
const isGroup = computed(() => {
  return conversation.value?.type === 'group'
})

// 聊天名称
const chatName = computed(() => {
  if (!conversation.value) return ''

  if (conversation.value.type === 'group') {
    return conversation.value.groupInfo?.name || '群聊'
  } else {
    const otherUser = conversation.value.participants?.find(
      p => p._id !== currentUserId.value
    )
    return otherUser?.profile?.nickName || otherUser?.username || '未知用户'
  }
})

// 是否置顶
const isPinned = computed(() => {
  return conversation.value?.pinnedBy?.some(p => p.user === currentUserId.value)
})

// 是否静音
const isMuted = computed(() => {
  return conversation.value?.mutedBy?.includes(currentUserId.value)
})

// 是否正在输入
const isTyping = ref(false)

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 加载消息
const loadMessages = async () => {
  loading.value = true
  try {
    await chatStore.loadMessages(props.conversationId)
    scrollToBottom()
  } catch (error) {
    ElMessage.error('加载消息失败')
  } finally {
    loading.value = false
  }
}

// 发送消息
const sendMessage = async (content) => {
  if (sending.value) return

  sending.value = true
  try {
    await chatStore.sendMessage({
      conversationId: props.conversationId,
      type: 'text',
      content: { text: content },
      replyTo: replyToMessage.value?._id
    })

    inputText.value = ''
    replyToMessage.value = null
    scrollToBottom()
  } catch (error) {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

// 回复消息
const handleReply = (message) => {
  replyToMessage.value = message
}

// 撤回消息
const handleRecall = async (message) => {
  try {
    await ElMessageBox.confirm('确认撤回这条消息吗？', '撤回消息', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await chatStore.recallMessage(props.conversationId, message._id)
    ElMessage.success('消息已撤回')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('撤回失败')
    }
  }
}

// 置顶/取消置顶
const togglePin = async () => {
  try {
    await chatStore.togglePin(props.conversationId)
    ElMessage.success(isPinned.value ? '已取消置顶' : '已置顶')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 静音/取消静音
const toggleMute = async () => {
  try {
    await chatStore.toggleMute(props.conversationId)
    ElMessage.success(isMuted.value ? '已取消静音' : '已静音')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 显示群聊信息
const showGroupInfo = () => {
  // TODO: 实现群聊信息弹窗
  ElMessage.info('群聊信息功能开发中')
}

// 清空聊天记录
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确认清空聊天记录吗？此操作不可恢复。', '清空记录', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // TODO: 实现清空聊天记录
    ElMessage.info('清空记录功能开发中')
  } catch (error) {
    // 用户取消
  }
}

// 监听消息变化，滚动到底部
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  loadMessages()
})
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  margin-right: 8px;
}

.chat-info {
  display: flex;
  flex-direction: column;
}

.chat-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.typing-indicator {
  font-size: 12px;
  color: #07c160;
  margin-top: 2px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: #999;
}

.empty-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.input-area {
  flex-shrink: 0;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-header {
    padding: 8px 12px;
  }

  .message-list {
    padding: 12px;
  }
}
</style>
