<template>
  <div class="welcome-section">
    <div class="welcome-content">
      <div class="greeting">
        <h1 class="greeting-text">{{ greetingText }}，{{ profile?.personalInfo?.name || '村民' }}！</h1>
        <p class="date-info">{{ formattedDate }} {{ weatherIcon }}</p>
      </div>

      <div class="control-buttons">
        <!-- 字体大小控制 -->
        <el-dropdown trigger="click" @command="handleFontSizeCommand">
          <el-button class="control-btn" :aria-label="`当前字体: ${currentLevelLabel}`">
            <el-icon><Edit /></el-icon>
            <span class="btn-label">{{ currentLevelLabel }}</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="level in fontSizeLevels"
                :key="level.value"
                :command="level.value"
                :class="{ 'is-active': config.level === level.value && !isCustomMode }"
              >
                <el-icon v-if="config.level === level.value && !isCustomMode"><Check /></el-icon>
                {{ level.label }}
              </el-dropdown-item>
              <el-dropdown-item divided />
              <el-dropdown-item command="increase">
                <el-icon><Plus /></el-icon>
                增大字体
              </el-dropdown-item>
              <el-dropdown-item command="decrease">
                <el-icon><Minus /></el-icon>
                减小字体
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 语音助手 -->
        <el-button
          class="control-btn voice-btn"
          :class="{ 'is-active': isListening }"
          @click="handleVoiceClick"
          aria-label="语音助手"
        >
          <el-icon><Microphone /></el-icon>
        </el-button>

        <!-- 设置 -->
        <el-button class="control-btn" @click="showSettings = true" aria-label="设置">
          <el-icon><Setting /></el-icon>
        </el-button>

        <!-- 通知 -->
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
          <el-button class="control-btn" @click="showNotifications = true" aria-label="通知">
            <el-icon><Bell /></el-icon>
          </el-button>
        </el-badge>
      </div>
    </div>

    <!-- 语音助手对话框 -->
    <el-dialog
      v-model="isListening"
      title="语音助手"
      width="400px"
      :close-on-click-modal="false"
      custom-class="voice-dialog"
    >
      <div class="voice-assistant">
        <div class="listening-animation">
          <div class="wave" v-for="i in 3" :key="i"></div>
        </div>
        <p class="listening-tip">请说出您要办理的业务</p>
        <p v-if="recognizedText" class="recognized-text">"{{ recognizedText }}"</p>
        <div class="voice-examples">
          <p class="examples-title">您可以尝试说：</p>
          <div class="example-tags">
            <el-tag
              v-for="example in voiceExamples"
              :key="example"
              size="small"
              @click="handleExampleClick(example)"
              class="example-tag"
            >
              {{ example }}
            </el-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="stopListening" type="danger">
          <el-icon><Close /></el-icon>
          取消
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Edit,
  Microphone,
  Setting,
  Bell,
  Check,
  Plus,
  Minus,
  Close
} from '@element-plus/icons-vue'
import { useFontSize, type FontSizeLevel } from '@/composables/useFontSize'
import { useRouter } from 'vue-router'

interface Props {
  profile?: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'settings-click': []
  'notifications-click': []
}>()

const router = useRouter()

// Composables
const { config, isCustomMode, currentLevelLabel, setFontSizeLevel, increaseFontSize, decreaseFontSize } = useFontSize()

// 语音功能占位符（待实现）
const isListening = ref(false)
const recognizedText = ref('')
const startListening = () => {
  ElMessage.info('语音识别功能开发中...')
}
const stopVoiceListening = () => {
  isListening.value = false
}
const parseVoiceIntent = (text: string) => {
  console.log('解析语音指令:', text)
}

// 响应式数据
const showSettings = ref(false)
const showNotifications = ref(false)
const unreadCount = ref(3)

// 字体大小级别选项
const fontSizeLevels = [
  { label: '小字 (85%)', value: 'small' as FontSizeLevel },
  { label: '正常 (100%)', value: 'normal' as FontSizeLevel },
  { label: '大字 (125%)', value: 'large' as FontSizeLevel },
  { label: '超大 (150%)', value: 'extra-large' as FontSizeLevel },
  { label: '巨大 (175%)', value: 'huge' as FontSizeLevel }
]

// 语音示例
const voiceExamples = [
  '打开一户一码',
  '我要办证件',
  '查询补贴',
  '我要紧急求助',
  '打开办事大厅'
]

// 天气图标（根据实际情况）
const weatherIcon = ref('🌤️')

/**
 * 获取问候语
 */
const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 17) return '下午好'
  if (hour < 19) return '傍晚好'
  return '晚上好'
})

/**
 * 格式化日期
 */
const formattedDate = computed(() => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekDay = weekDays[date.getDay()]
  return `${year}年${month}月${day}日 ${weekDay}`
})

/**
 * 处理字体大小命令
 */
const handleFontSizeCommand = async (command: FontSizeLevel | 'increase' | 'decrease') => {
  switch (command) {
    case 'increase':
      increaseFontSize()
      ElMessage.success(`字体已放大: ${currentLevelLabel.value}`)
      break
    case 'decrease':
      decreaseFontSize()
      ElMessage.success(`字体已缩小: ${currentLevelLabel.value}`)
      break
    default:
      setFontSizeLevel(command as FontSizeLevel)
      ElMessage.success(`已切换到${currentLevelLabel.value}模式`)
  }
}

/**
 * 处理语音点击
 */
const handleVoiceClick = async () => {
  if (isListening.value) {
    stopVoiceListening()
    return
  }

  try {
    const text = await startListening({ lang: 'zh-CN' })
    const intent = parseVoiceIntent(text)

    // 处理语音意图
    handleVoiceIntent(intent)
  } catch (error) {
    console.error('Voice recognition error:', error)
    ElMessage.error('语音识别失败，请重试')
  }
}

/**
 * 处理语音意图
 */
const handleVoiceIntent = (intent: any) => {
  if (!intent || intent.action === 'unknown') {
    ElMessage.warning('未识别到相关功能，请重试或使用文字输入')
    return
  }

  switch (intent.action) {
    case 'navigate':
      router.push(intent.route)
      ElMessage.success(`正在打开: ${intent.originalText}`)
      break
    case 'toggle':
      if (intent.feature === 'largeText') {
        increaseFontSize()
        ElMessage.success('已切换到大字模式')
      }
      break
  }
}

/**
 * 点击语音示例
 */
const handleExampleClick = async (example: string) => {
  try {
    const intent = parseVoiceIntent(example)
    handleVoiceIntent(intent)
  } catch (error) {
    console.error('Example click error:', error)
  }
}

/**
 * 停止语音监听
 */
const stopListening = () => {
  stopVoiceListening()
}

// 监听设置和通知事件
watch(showSettings, (val) => {
  if (val) emit('settings-click')
})

watch(showNotifications, (val) => {
  if (val) emit('notifications-click')
})

// 生命周期
onMounted(() => {
  // 获取天气信息（可选）
  // fetchWeather()
})
</script>

<style lang="scss" scoped>
.welcome-section {
  padding: 20px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 0 0 16px 16px;
  margin: -20px -16px 20px -16px;

  @media (min-width: 768px) {
    border-radius: 16px;
    margin-bottom: 20px;
  }

  .welcome-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
  }

  .greeting {
    flex: 1;
    min-width: 200px;

    .greeting-text {
      font-size: var(--font-size-h1, 24px);
      font-weight: 700;
      margin: 0 0 8px 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .date-info {
      font-size: var(--font-size-small, 14px);
      margin: 0;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .control-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .control-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      min-width: 44px;
      min-height: 44px;
      padding: 10px 16px;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }

      &:active {
        transform: translateY(0);
      }

      .btn-label {
        margin-left: 4px;
        font-size: var(--font-size-small, 14px);
      }

      &.voice-btn {
        &.is-active {
          background: rgba(255, 82, 82, 0.3);
          animation: pulse 1.5s infinite;
        }
      }
    }

    .notification-badge {
      :deep(.el-badge__content) {
        background-color: #ff5252;
        border: 2px solid white;
      }
    }
  }
}

// 语音助手对话框
.voice-dialog {
  .voice-assistant {
    text-align: center;
    padding: 20px 0;

    .listening-animation {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;

      .wave {
        width: 8px;
        height: 40px;
        background: linear-gradient(180deg, #409eff 0%, #67c23a 100%);
        border-radius: 4px;
        animation: wave 1s ease-in-out infinite;

        &:nth-child(2) {
          animation-delay: 0.2s;
        }

        &:nth-child(3) {
          animation-delay: 0.4s;
        }
      }
    }

    .listening-tip {
      font-size: var(--font-size-base, 16px);
      color: #606266;
      margin-bottom: 16px;
    }

    .recognized-text {
      font-size: var(--font-size-h3, 18px);
      color: #409eff;
      margin-bottom: 20px;
      font-weight: 500;
      padding: 12px;
      background: #ecf5ff;
      border-radius: 8px;
    }

    .voice-examples {
      text-align: left;

      .examples-title {
        color: #909399;
        font-size: var(--font-size-small, 14px);
        margin-bottom: 12px;
      }

      .example-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .example-tag {
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            background: #409eff;
            color: white;
          }
        }
      }
    }
  }
}

// 动画
@keyframes wave {
  0%, 100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(255, 82, 82, 0);
  }
}

// 下拉菜单激活状态
:deep(.el-dropdown-menu__item) {
  &.is-active {
    background-color: #ecf5ff;
    color: #409eff;
  }
}

// 大字模式适配
:deep(.large-text-mode) {
  .welcome-section {
    .greeting-text {
      font-size: var(--font-size-large-h1, 33px);
    }

    .date-info {
      font-size: var(--font-size-large-small, 19px);
    }

    .control-btn {
      .btn-label {
        font-size: var(--font-size-large-small, 19px);
      }
    }
  }
}
</style>
