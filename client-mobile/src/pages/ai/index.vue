<template>
  <div class="ai-assistant-page">
    <!-- 顶部导航栏 -->
    <div class="chat-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <div class="header-info">
        <span class="name">AI助手</span>
        <span class="status">{{ typing ? '输入中...' : '在线' }}</span>
      </div>
      <button class="more-btn" @click="showSettings">
        <span class="icon">⚙️</span>
      </button>
    </div>

    <!-- 消息列表 -->
    <div ref="messageListRef" class="message-list" :class="{ 'large-text': isElderlyMode }">
      <!-- 欢迎消息 -->
      <div v-if="messages.length === 0" class="welcome-section">
        <div class="welcome-avatar">🤖</div>
        <div class="welcome-title">我是智慧乡村AI助手</div>
        <div class="welcome-desc">我可以帮您解答以下问题：</div>

        <!-- 快捷问题 -->
        <div class="quick-questions">
          <div
            v-for="(question, index) in quickQuestions"
            :key="index"
            class="question-card"
            @click="sendQuickQuestion(question)"
          >
            <span class="question-icon">{{ question.icon }}</span>
            <span class="question-text">{{ question.title }}</span>
          </div>
        </div>

        <!-- 功能入口 -->
        <div class="feature-entries">
          <div class="entry-item" @click="handleFeature('policy')">
            <span class="entry-icon">📋</span>
            <span class="entry-text">政策查询</span>
          </div>
          <div class="entry-item" @click="handleFeature('subsidy')">
            <span class="entry-icon">💰</span>
            <span class="entry-text">补贴计算</span>
          </div>
          <div class="entry-item" @click="handleFeature('agriculture')">
            <span class="entry-icon">🌾</span>
            <span class="entry-text">农业技术</span>
          </div>
          <div class="entry-item" @click="handleFeature('weather')">
            <span class="entry-icon">🌤️</span>
            <span class="entry-text">天气查询</span>
          </div>
        </div>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-item"
        :class="{ 'is-self': message.isSelf }"
      >
        <!-- AI消息 -->
        <div v-if="!message.isSelf" class="message-left">
          <div class="avatar">🤖</div>
          <div class="message-content">
            <div class="bubble">
              <!-- 文本消息 -->
              <div v-if="message.type === 'text'" class="text-content" v-html="formatMessage(message.content)"></div>

              <!-- 富文本消息（带操作） -->
              <div v-else-if="message.type === 'rich'" class="rich-content">
                <div class="rich-text" v-html="formatMessage(message.content)"></div>
                <!-- 操作按钮 -->
                <div v-if="message.actions" class="message-actions">
                  <button
                    v-for="(action, idx) in message.actions"
                    :key="idx"
                    class="action-btn"
                    @click="handleMessageAction(action)"
                  >
                    {{ action.label }}
                  </button>
                </div>
              </div>

              <!-- 打字效果 -->
              <div v-if="message.typing" class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div class="message-time">{{ formatMessageTime(message.timestamp) }}</div>

            <!-- 有用/无用反馈 -->
            <div v-if="!message.typing && message.isSelf === false" class="feedback-actions">
              <button class="feedback-btn" :class="{ active: message.feedback === 'good' }" @click="feedback(message, 'good')">
                <span>👍</span>
              </button>
              <button class="feedback-btn" :class="{ active: message.feedback === 'bad' }" @click="feedback(message, 'bad')">
                <span>👎</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 用户消息 -->
        <div v-else class="message-right">
          <div class="message-content">
            <div class="bubble self">
              <span class="text-content">{{ message.content }}</span>
            </div>
            <div class="message-time">{{ formatMessageTime(message.timestamp) }}</div>
          </div>
          <div class="avatar">👤</div>
        </div>
      </div>

      <!-- 加载更多历史消息 -->
      <div v-if="loadingMore" class="loading-more">
        <span class="loading-text">加载中...</span>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="toolbar">
        <!-- 语音按钮 -->
        <button class="tool-btn" @click="toggleVoiceInput">
          <span class="tool-icon">{{ showVoiceInput ? '⌨️' : '🎤' }}</span>
        </button>

        <!-- 文本输入框 -->
        <div v-if="!showVoiceInput" class="input-wrapper">
          <textarea
            v-model="inputText"
            class="message-input"
            :class="{ 'large-text': isElderlyMode }"
            placeholder="有问题尽管问我..."
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

        <!-- 快捷功能 -->
        <button class="tool-btn" @click="showQuickMenu">
          <span class="tool-icon">➕</span>
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

    <!-- 快捷菜单 -->
    <div v-if="showQuickMenuPanel" class="quick-menu-overlay" @click="showQuickMenuPanel = false">
      <div class="quick-menu-content" @click.stop>
        <div class="menu-grid">
          <div class="menu-item" @click="handleQuickAction('image')">
            <span class="menu-icon">🖼️</span>
            <span class="menu-text">图片识别</span>
          </div>
          <div class="menu-item" @click="handleQuickAction('document')">
            <span class="menu-icon">📄</span>
            <span class="menu-text">文档分析</span>
          </div>
          <div class="menu-item" @click="handleQuickAction('calculator')">
            <span class="menu-icon">🧮</span>
            <span class="menu-text">补贴计算</span>
          </div>
          <div class="menu-item" @click="handleQuickAction('weather')">
            <span class="menu-icon">🌤️</span>
            <span class="menu-text">天气查询</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置弹窗 -->
    <div v-if="showSettingsPanel" class="settings-overlay" @click="showSettingsPanel = false">
      <div class="settings-content" @click.stop>
        <div class="settings-header">
          <span class="settings-title">AI助手设置</span>
          <button class="settings-close" @click="showSettingsPanel = false">×</button>
        </div>

        <div class="settings-body">
          <!-- 对话模式 -->
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">对话模式</span>
              <span class="label-desc">选择AI回复的风格</span>
            </div>
            <div class="mode-selector">
              <div
                v-for="mode in chatModes"
                :key="mode.value"
                :class="['mode-item', { 'mode-item--active': aiSettings.mode === mode.value }]"
                @click="aiSettings.mode = mode.value"
              >
                {{ mode.label }}
              </div>
            </div>
          </div>

          <!-- 语音播报 -->
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">语音播报</span>
              <span class="label-desc">自动朗读AI回复</span>
            </div>
            <label class="switch">
              <input v-model="aiSettings.voiceReply" type="checkbox" class="switch-input" />
              <span class="switch-slider"></span>
            </label>
          </div>

          <!-- 方言选择 -->
          <div v-if="aiSettings.voiceReply" class="setting-item">
            <div class="setting-label">
              <span class="label-text">播报方言</span>
            </div>
            <select v-model="aiSettings.dialect" class="dialect-select">
              <option value="mandarin">普通话</option>
              <option value="cantonese">粤语</option>
              <option value="hokkien">闽南语</option>
              <option value="wu">吴语</option>
              <option value="xiang">湘语</option>
            </select>
          </div>

          <!-- 清空对话 -->
          <div class="setting-item">
            <button class="clear-btn" @click="clearHistory">
              <span class="clear-icon">🗑️</span>
              <span class="clear-text">清空对话历史</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const elderlyStore = useElderlyStore()

// 消息列表引用
const messageListRef = ref(null)

// 输入文本
const inputText = ref('')

// 消息列表
const messages = ref([])

// 是否显示语音输入
const showVoiceInput = ref(false)

// 是否正在录音
const isRecording = ref(false)

// 是否正在发送
const sending = ref(false)

// 是否正在输入
const typing = ref(false)

// 是否加载更多
const loadingMore = ref(false)

// 是否显示快捷菜单
const showQuickMenuPanel = ref(false)

// 是否显示设置面板
const showSettingsPanel = ref(false)

// AI设置
const aiSettings = ref({
  mode: 'professional', // professional, casual, elderly
  voiceReply: false,
  dialect: 'mandarin'
})

// 对话模式
const chatModes = [
  { value: 'professional', label: '专业模式' },
  { value: 'casual', label: '轻松模式' },
  { value: 'elderly', label: '适老模式' }
]

// 快捷问题
const quickQuestions = [
  { icon: '📋', title: '如何申请低保？', query: '如何申请低保' },
  { icon: '💰', title: '耕地补贴标准', query: '耕地补贴标准是多少' },
  { icon: '🏥', title: '医保报销比例', query: '医保报销比例是多少' },
  { icon: '🌾', title: '农业补贴政策', query: '有哪些农业补贴政策' },
  { icon: '🏘️', title: '宅基地申请', query: '如何申请宅基地' },
  { icon: '👴', title: '养老金领取', query: '如何领取养老金' }
]

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 格式化消息（处理换行等）
const formatMessage = (content) => {
  if (!content) return ''
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

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

// 发送快捷问题
const sendQuickQuestion = (question) => {
  inputText.value = question.query
  sendMessage()
}

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || sending.value) return

  // 添加用户消息
  const userMessage = {
    id: Date.now(),
    content: text,
    isSelf: true,
    type: 'text',
    timestamp: new Date().toISOString()
  }
  messages.value.push(userMessage)

  inputText.value = ''
  resetTextareaHeight()
  scrollToBottom()

  // 开始AI回复
  sending.value = true
  typing.value = true

  // 添加AI消息占位
  const aiMessageId = Date.now() + 1
  const aiMessage = {
    id: aiMessageId,
    content: '',
    isSelf: false,
    type: 'text',
    typing: true,
    timestamp: new Date().toISOString()
  }
  messages.value.push(aiMessage)
  scrollToBottom()

  try {
    // TODO: 调用AI API
    // 模拟AI回复
    await new Promise(resolve => setTimeout(resolve, 1000))

    const response = await generateAIResponse(text)

    // 模拟打字效果
    typing.value = false
    aiMessage.typing = false
    aiMessage.type = response.type || 'text'
    aiMessage.content = response.content
    aiMessage.actions = response.actions

    // 语音播报
    if (aiSettings.value.voiceReply && response.content) {
      speak(response.content)
    }

    scrollToBottom()
  } catch (error) {
    console.error('AI回复失败:', error)
    aiMessage.typing = false
    aiMessage.content = '抱歉，我暂时无法回答这个问题。请稍后再试。'
  } finally {
    sending.value = false
  }
}

// 生成AI回复（模拟）
const generateAIResponse = async (query) => {
  const q = query.toLowerCase()

  // 低保申请
  if (q.includes('低保')) {
    return {
      type: 'rich',
      content: '**低保申请条件：**\n\n1. 家庭人均收入低于当地最低生活保障标准\n2. 家庭财产状况符合规定\n3. 当地户籍常住人口\n\n**申请材料：**\n• 身份证、户口本\n• 收入证明\n• 财产证明\n• 其他相关材料',
      actions: [
        { label: '查看申请流程', action: 'view_process' },
        { label: '在线申请', action: 'apply_online' }
      ]
    }
  }

  // 耕地补贴
  if (q.includes('耕地') && q.includes('补贴')) {
    return {
      type: 'rich',
      content: '**2024年耕地地力保护补贴标准：**\n\n• 普通农户：每亩约120元\n• 种粮大户：每亩约150元\n\n**补贴对象：**\n拥有耕地承包权的种地农民\n\n**发放时间：**\n每年6-8月通过"一卡通"发放',
      actions: [
        { label: '计算我的补贴', action: 'calculate_subsidy' },
        { label: '查看申报流程', action: 'view_declare' }
      ]
    }
  }

  // 医保报销
  if (q.includes('医保') && q.includes('报销')) {
    return {
      type: 'text',
      content: '**城乡居民医保报销比例：**\n\n• 村卫生室：65%\n• 乡镇卫生院：60%\n• 县级医院：55%\n• 市级医院：45%\n• 省级医院：35%\n\n**年度报销限额：**20万元'
    }
  }

  // 农业补贴
  if (q.includes('农业补贴') || q.includes('种粮')) {
    return {
      type: 'rich',
      content: '**主要农业补贴政策：**\n\n1. 耕地地力保护补贴\n2. 农机购置补贴\n3. 种粮直补\n4. 农业保险补贴\n5. 轮作休耕补贴\n\n需要了解哪项补贴的详细信息？',
      actions: [
        { label: '耕地补贴', action: 'subsidy_land' },
        { label: '农机补贴', action: 'subsidy_machine' },
        { label: '种粮直补', action: 'subsidy_grain' }
      ]
    }
  }

  // 宅基地
  if (q.includes('宅基地')) {
    return {
      type: 'text',
      content: '**宅基地申请流程：**\n\n1. 向村委会提出申请\n2. 村委会审核公示\n3. 乡镇政府审批\n4. 县级部门备案\n\n**申请条件：**\n• 本村集体经济组织成员\n• 符合"一户一宅"政策\n• 未将宅基地出售、出租、赠与'
    }
  }

  // 养老金
  if (q.includes('养老金')) {
    return {
      type: 'text',
      content: '**城乡居民养老金领取条件：**\n\n• 年满60周岁\n• 累计缴费满15年\n• 未领取国家规定的基本养老保障待遇\n\n**领取方式：**\n通过社保卡按月发放'
    }
  }

  // 默认回复
  return {
    type: 'rich',
    content: `您问的是："${query}"\n\n我可以帮您解答以下方面的问题：\n\n• 政策查询（低保、补贴、医保等）\n• 补贴计算\n• 农业技术指导\n• 天气查询\n• 办事流程`,
    actions: [
      { label: '政策查询', action: 'policy' },
      { label: '补贴计算', action: 'subsidy' },
      { label: '农业技术', action: 'agriculture' }
    ]
  }
}

// 语音播报
const speak = (text) => {
  if (!elderlyStore.isElderlyMode) return

  // 去除HTML标签
  const plainText = text.replace(/<[^>]*>/g, '')

  // 使用Web Speech API
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(plainText)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    speechSynthesis.speak(utterance)
  } else {
    elderlyStore.speak(plainText)
  }
}

// 处理消息操作
const handleMessageAction = (action) => {
  console.log('执行操作:', action)

  switch (action.action) {
    case 'calculate_subsidy':
      inputText.value = '帮我计算耕地补贴，我有5亩地'
      sendMessage()
      break
    case 'view_process':
      inputText.value = '查看低保申请流程'
      sendMessage()
      break
    case 'apply_online':
      router.push('/services')
      break
    default:
      inputText.value = action.label
      sendMessage()
  }
}

// 消息反馈
const feedback = (message, type) => {
  message.feedback = type
  // TODO: 发送反馈到服务器
  console.log('用户反馈:', type)
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
    // TODO: 实现语音识别
  } catch (error) {
    console.error('录音失败:', error)
  }
}

// 停止录音
const stopRecord = async () => {
  isRecording.value = false
  // TODO: 停止录音并将语音转为文字
  inputText.value = '这是识别的语音内容'
}

// 显示快捷菜单
const showQuickMenu = () => {
  showQuickMenuPanel.value = true
}

// 处理快捷操作
const handleQuickAction = (action) => {
  showQuickMenuPanel.value = false

  switch (action) {
    case 'image':
      // 图片识别
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (file) {
          inputText.value = `识别图片：${file.name}`
          sendMessage()
        }
      }
      input.click()
      break
    case 'document':
      inputText.value = '帮我分析这个文档'
      sendMessage()
      break
    case 'calculator':
      inputText.value = '帮我计算补贴'
      sendMessage()
      break
    case 'weather':
      inputText.value = '今天天气怎么样'
      sendMessage()
      break
  }
}

// 处理功能入口
const handleFeature = (feature) => {
  switch (feature) {
    case 'policy':
      inputText.value = '查询政策'
      sendMessage()
      break
    case 'subsidy':
      inputText.value = '计算补贴'
      sendMessage()
      break
    case 'agriculture':
      inputText.value = '农业技术指导'
      sendMessage()
      break
    case 'weather':
      inputText.value = '今天天气怎么样'
      sendMessage()
      break
  }
}

// 显示设置
const showSettings = () => {
  showSettingsPanel.value = true
}

// 清空历史
const clearHistory = () => {
  if (confirm('确定要清空对话历史吗？')) {
    messages.value = []
    showSettingsPanel.value = false
  }
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

// 返回
const goBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  console.log('AI助手页面加载')
})
</script>

<style lang="scss" scoped>
.ai-assistant-page {
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

    .status {
      font-size: 12px;
      color: #52c41a;
      margin-top: 2px;
    }
  }

  .more-btn {
    background: none;
    border: none;
    font-size: 20px;
    padding: 8px;
    cursor: pointer;
  }
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  &.large-text {
    font-size: 18px;
  }

  .welcome-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;

    .welcome-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin-bottom: 20px;
    }

    .welcome-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .welcome-desc {
      font-size: 14px;
      color: #999;
      margin-bottom: 32px;
    }

    .quick-questions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      width: 100%;
      margin-bottom: 32px;

      .question-card {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        transition: all 0.3s;

        &:active {
          transform: scale(0.98);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }

        .question-icon {
          font-size: 24px;
        }

        .question-text {
          font-size: 14px;
          color: #333;
        }
      }
    }

    .feature-entries {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      width: 100%;

      .entry-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;

        .entry-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .entry-text {
          font-size: 12px;
          color: #666;
        }

        &:active .entry-icon {
          background: #e6f7ff;
        }
      }
    }
  }

  .message-item {
    margin-bottom: 20px;

    .message-left,
    .message-right {
      display: flex;
      align-items: flex-start;
      gap: 8px;

      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        background: #f0f0f0;
        flex-shrink: 0;
      }

      .message-content {
        max-width: 75%;

        .bubble {
          background: #fff;
          padding: 12px 16px;
          border-radius: 12px;
          word-break: break-word;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);

          &.self {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
          }

          .text-content {
            line-height: 1.6;
          }

          .rich-content {
            .rich-text {
              margin-bottom: 12px;
              line-height: 1.8;
            }

            .message-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 12px;

              .action-btn {
                padding: 8px 16px;
                border: 1px solid #1890ff;
                background: #fff;
                color: #1890ff;
                border-radius: 20px;
                font-size: 13px;
                cursor: pointer;

                &:active {
                  background: #e6f7ff;
                }
              }
            }
          }

          .typing-indicator {
            display: flex;
            gap: 4px;

            span {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #ccc;
              animation: typing 1.4s infinite;

              &:nth-child(2) {
                animation-delay: 0.2s;
              }

              &:nth-child(3) {
                animation-delay: 0.4s;
              }
            }
          }
        }

        .message-time {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
          padding-left: 4px;
        }

        .feedback-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;

          .feedback-btn {
            background: none;
            border: none;
            font-size: 16px;
            opacity: 0.5;
            cursor: pointer;

            &.active {
              opacity: 1;
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
          text-align: right;
          padding-right: 4px;
        }
      }
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
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
        border-radius: 20px;
        padding: 10px 16px;
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
      border-radius: 20px;
      font-size: 14px;
      cursor: pointer;

      &.recording {
        background: #1890ff;
        color: #fff;
      }
    }

    .send-btn {
      padding: 0 20px;
      height: 40px;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border-radius: 20px;
      font-size: 14px;
      cursor: pointer;

      &:disabled {
        opacity: 0.5;
      }
    }
  }
}

.quick-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;

  .quick-menu-content {
    width: 100%;
    background: #fff;
    border-radius: 16px 16px 0 0;
    padding: 20px;

    .menu-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;

      .menu-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;

        .menu-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .menu-text {
          font-size: 12px;
          color: #666;
        }
      }
    }
  }
}

.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;

  .settings-content {
    width: 100%;
    max-height: 80vh;
    background: #fff;
    border-radius: 16px 16px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;

      .settings-title {
        font-size: 16px;
        font-weight: 600;
      }

      .settings-close {
        background: none;
        border: none;
        font-size: 24px;
        padding: 4px;
      }
    }

    .settings-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;

      .setting-item {
        padding: 16px 0;
        border-bottom: 1px solid #f5f5f5;

        &:last-child {
          border-bottom: none;
        }

        .setting-label {
          margin-bottom: 12px;

          .label-text {
            display: block;
            font-size: 14px;
            color: #333;
            margin-bottom: 4px;
          }

          .label-desc {
            font-size: 12px;
            color: #999;
          }
        }

        .mode-selector {
          display: flex;
          gap: 8px;

          .mode-item {
            flex: 1;
            padding: 10px;
            background: #f5f5f5;
            border: 1px solid transparent;
            border-radius: 8px;
            text-align: center;
            font-size: 13px;
            cursor: pointer;

            &--active {
              background: #e6f7ff;
              border-color: #1890ff;
              color: #1890ff;
            }
          }
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;

          .switch-input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .switch-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: 0.3s;
            border-radius: 24px;

            &::before {
              position: absolute;
              content: '';
              height: 18px;
              width: 18px;
              left: 3px;
              bottom: 3px;
              background-color: white;
              transition: 0.3s;
              border-radius: 50%;
            }
          }

          .switch-input:checked + .switch-slider {
            background-color: #1890ff;

            &::before {
              transform: translateX(20px);
            }
          }
        }
      }

      .dialect-select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        font-size: 14px;
      }

      .clear-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        border: 1px solid #ff4d4f;
        background: #fff;
        color: #ff4d4f;
        border-radius: 8px;
        cursor: pointer;
      }
    }
  }
}

// 适老化模式
:deep(.elderly-mode-large) {
  .message-list {
    font-size: 18px;
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
  .message-list {
    font-size: 20px;
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
