<template>
  <div class="voice-interaction">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="方言语音交互"
      left-arrow
      @click-left="$router.go(-1)"
    >
      <template #right>
        <van-icon name="ellipsis" size="20" @click="showSettings = true" />
      </template>
    </van-nav-bar>

    <!-- 方言选择器 -->
    <div class="dialect-selector">
      <van-dropdown-menu>
        <van-dropdown-item v-model="selectedDialect" :options="dialectOptions" @change="handleDialectChange" />
      </van-dropdown-menu>
    </div>

    <!-- 主交互区域 -->
    <div class="interaction-area">
      <!-- 实时转录显示 -->
      <div class="transcription-display">
        <div class="interim-text" v-if="interimText">
          {{ interimText }}
        </div>
        <div class="final-text" v-if="finalText && !interimText">
          {{ finalText }}
        </div>
        <div class="placeholder" v-if="!finalText && !interimText">
          <van-icon name="mic" size="48" color="#ddd" />
          <p>点击下方按钮开始说话</p>
        </div>
      </div>

      <!-- 音频波形可视化 -->
      <div class="audio-visualizer" v-if="isRecording || isPlaying">
        <canvas ref="visualizerCanvas" width="300" height="100"></canvas>
      </div>

      <!-- 操作按钮组 -->
      <div class="action-buttons">
        <van-button
          round
          :type="isRecording ? 'danger' : 'primary'"
          :icon="isRecording ? 'stop' : 'mic'"
          size="large"
          @click="toggleRecording"
          :loading="processing"
        >
          {{ isRecording ? '停止录音' : '开始录音' }}
        </van-button>

        <van-button
          round
          type="success"
          icon="play"
          size="large"
          @click="playText"
          :disabled="!finalText"
          v-if="!isRecording"
        >
          语音播报
        </van-button>

        <van-button
          round
          type="warning"
          icon="clear"
          size="large"
          @click="clearText"
          :disabled="!finalText && !interimText"
          v-if="!isRecording"
        >
          清空
        </van-button>
      </div>
    </div>

    <!-- 语音播报设置 -->
    <div class="voice-settings" v-if="finalText">
      <van-cell-group inset title="播报设置">
        <van-cell title="语音类型" is-link @click="showVoicePicker = true">
          <template #value>{{ currentVoiceLabel }}</template>
        </van-cell>
        <van-cell title="语速">
          <template #right-icon>
            <van-slider v-model="ttsSettings.speed" :min="0" :max="100" bar-height="4" />
          </template>
        </van-cell>
        <van-cell title="音调">
          <template #right-icon>
            <van-slider v-model="ttsSettings.pitch" :min="0" :max="100" bar-height="4" />
          </template>
        </van-cell>
        <van-cell title="音量">
          <template #right-icon>
            <van-slider v-model="ttsSettings.volume" :min="0" :max="100" bar-height="4" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 识别结果操作 -->
    <div class="result-actions" v-if="finalText">
      <van-cell-group inset title="快捷操作">
        <van-cell
          title="复制文本"
          is-link
          @click="copyText"
        >
          <template #icon><van-icon name="copy" class="cell-icon" /></template>
        </van-cell>
        <van-cell
          title="转为普通话"
          is-link
          @click="translateToMandarin"
        >
          <template #icon><van-icon name="exchange" class="cell-icon" /></template>
        </van-cell>
        <van-cell
          title="语音播报"
          is-link
          @click="playText"
        >
          <template #icon><van-icon name="play" class="cell-icon" /></template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 历史记录 -->
    <div class="history-section">
      <van-cell-group inset title="最近识别">
        <van-empty v-if="history.length === 0" description="暂无识别记录" />
        <van-cell
          v-for="(item, index) in history"
          :key="index"
          :title="item.text.substring(0, 30) + (item.text.length > 30 ? '...' : '')"
          :label="formatTime(item.timestamp)"
          is-link
          @click="selectHistoryItem(item)"
        >
          <template #right-icon>
            <van-tag :type="item.dialect === 'mandarin' ? 'primary' : 'success'">
              {{ item.dialectName }}
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 语音类型选择器 -->
    <van-popup v-model:show="showVoicePicker" position="bottom" round>
      <van-picker
        :columns="voiceOptions"
        @confirm="onVoiceConfirm"
        @cancel="showVoicePicker = false"
      />
    </van-popup>

    <!-- 设置弹窗 -->
    <van-popup v-model:show="showSettings" position="center" :style="{ width: '85%' }">
      <div class="settings-dialog">
        <div class="dialog-header">
          <h3>语音设置</h3>
          <van-icon name="cross" @click="showSettings = false" />
        </div>
        <div class="settings-content">
          <van-form @submit="saveSettings">
            <van-cell-group inset>
              <van-field name="autoDetect" label="自动检测方言">
                <template #input>
                  <van-switch v-model="settings.autoDetect" />
                </template>
              </van-field>
              <van-field
                name="silenceTimeout"
                v-model="settings.silenceTimeout"
                type="number"
                label="静音超时(秒)"
                placeholder="静音多久后停止"
              />
              <van-field name="saveHistory" label="保存历史">
                <template #input>
                  <van-switch v-model="settings.saveHistory" />
                </template>
              </van-field>
            </van-cell-group>
            <div class="dialog-actions">
              <van-button round block type="primary" native-type="submit">
                保存设置
              </van-button>
            </div>
          </van-form>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import speechApi from '@/api/speech'

const router = useRouter()

// ============ 响应式数据 ============
const selectedDialect = ref('mandarin')
const interimText = ref('')
const finalText = ref('')
const isRecording = ref(false)
const isPlaying = ref(false)
const processing = ref(false)
const history = ref([])

// WebSocket连接
let wsConnection = null
let mediaRecorder = null
let audioContext = null
let analyser = null

// Canvas引用
const visualizerCanvas = ref(null)

// 设置相关
const showSettings = ref(false)
const showVoicePicker = ref(false)
const settings = reactive({
  autoDetect: true,
  silenceTimeout: 5,
  saveHistory: true
})

// TTS设置
const ttsSettings = reactive({
  speed: 50,
  pitch: 50,
  volume: 50,
  emotion: 'neutral'
})

// ============ 方言选项 ============
const dialectOptions = [
  { text: '普通话', value: 'mandarin' },
  { text: '粤语', value: 'cantonese' },
  { text: '上海话', value: 'shanghainese' },
  { text: '四川话', value: 'sichuanese' },
  { text: '东北话', value: 'dongbei' },
  { text: '陕西话', value: 'shaanxi' },
  { text: '河南话', value: 'henan' },
  { text: '湖南话', value: 'hunan' },
  { text: '江西话', value: 'jiangxi' },
  { text: '客家话', value: 'hakka' },
  { text: '闽南语', value: 'minnan' },
  { text: '福州话', value: 'fuzhou' },
  { text: '温州话', value: 'wenzhou' },
  { text: '苏州话', value: 'suzhou' },
  { text: '武汉话', value: 'wuhan' },
  { text: '重庆话', value: 'chongqing' },
  { text: '贵阳话', value: 'guiyang' },
  { text: '昆明话', value: 'kunming' },
  { text: '兰州话', value: 'lanzhou' },
  { text: '太原话', value: 'taiyuan' },
  { text: '天津话', value: 'tianjin' },
  { text: '藏语', value: 'tibetan' },
  { text: '蒙古语', value: 'mongolian' },
  { text: '维吾尔语', value: 'uyghur' },
  { text: '自动检测', value: 'auto' }
]

// ============ 语音类型选项 ============
const voiceOptions = [
  { text: '标准普通话', value: 'mandarin' },
  { text: '粤语', value: 'cantonese' },
  { text: '上海话', value: 'shanghainese' },
  { text: '四川话', value: 'sichuanese' },
  { text: '老年人友好', value: 'elderly' },
  { text: '儿童友好', value: 'child' }
]

const currentVoiceLabel = computed(() => {
  const option = voiceOptions.find(v => v.value === ttsSettings.voice)
  return option ? option.text : '标准普通话'
})

// ============ 方法 ============

/**
 * 切换录音状态
 */
const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    await startRecording()
  }
}

/**
 * 开始录音
 */
const startRecording = async () => {
  try {
    processing.value = true

    // 请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }
    })

    // 设置音频可视化
    setupAudioVisualizer(stream)

    // 如果启用了自动检测或选择了实时识别，使用WebSocket
    if (settings.autoDetect || selectedDialect.value === 'auto') {
      startRealTimeRecognition(stream)
    } else {
      // 使用普通录音
      startSimpleRecording(stream)
    }

    isRecording.value = true
    processing.value = false
    interimText.value = ''
    showToast('开始录音...')
  } catch (error) {
    console.error('录音启动失败:', error)
    processing.value = false
    showToast(error.name === 'NotAllowedError' ? '请允许麦克风权限' : '录音启动失败')
  }
}

/**
 * 简单录音（非实时）
 */
const startSimpleRecording = (stream) => {
  const chunks = []
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(chunks, { type: 'audio/wav' })
    await processAudio(audioBlob)
    stream.getTracks().forEach(track => track.stop())
  }

  mediaRecorder.start()
}

/**
 * 实时语音识别
 */
const startRealTimeRecognition = (stream) => {
  wsConnection = speechApi.createRealTimeRecognition({
    dialect: selectedDialect.value === 'auto' ? undefined : selectedDialect.value,
    interimResults: true,
    silenceTimeout: settings.silenceTimeout * 1000
  })

  wsConnection.onopen = () => {
    console.log('WebSocket连接已建立')
    // 开始发送音频数据
    sendAudioData(stream)
  }

  wsConnection.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'interim') {
      interimText.value = data.text
    } else if (data.type === 'final') {
      finalText.value = data.text
      interimText.value = ''
      saveToHistory(data.text, data.dialect || selectedDialect.value)
      stopRecording()
    } else if (data.type === 'error') {
      showToast(data.message || '识别失败')
      stopRecording()
    }
  }

  wsConnection.onerror = (error) => {
    console.error('WebSocket错误:', error)
    showToast('连接中断，请重试')
    stopRecording()
  }

  wsConnection.onclose = () => {
    console.log('WebSocket连接已关闭')
  }
}

/**
 * 发送音频数据到WebSocket
 */
const sendAudioData = async (stream) => {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) return

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    source.connect(processor)
    processor.connect(audioContext.destination)

    processor.onaudioprocess = (e) => {
      if (wsConnection.readyState === WebSocket.OPEN) {
        const audioData = e.inputBuffer.getChannelData(0)
        const pcmData = new Int16Array(audioData.length)

        for (let i = 0; i < audioData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768))
        }

        wsConnection.send(pcmData.buffer)
      }
    }

    // 保存processor引用以便后续清理
    mediaRecorder = { processor, source, stream }
  } catch (error) {
    console.error('音频处理错误:', error)
  }
}

/**
 * 停止录音
 */
const stopRecording = () => {
  isRecording.value = false

  // 停止WebSocket
  if (wsConnection) {
    wsConnection.close()
    wsConnection = null
  }

  // 停止MediaRecorder
  if (mediaRecorder) {
    if (mediaRecorder instanceof MediaRecorder) {
      mediaRecorder.stop()
    } else if (mediaRecorder.processor) {
      mediaRecorder.processor.disconnect()
      mediaRecorder.source.disconnect()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
    mediaRecorder = null
  }

  // 关闭音频上下文
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  // 停止可视化
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

/**
 * 处理音频数据
 */
const processAudio = async (audioBlob) => {
  try {
    processing.value = true
    showLoadingToast({
      message: '识别中...',
      forbidClick: true,
      duration: 0
    })

    const result = await speechApi.recognize(audioBlob, {
      dialect: selectedDialect.value
    })

    closeToast()

    if (result.success) {
      finalText.value = result.data.text
      interimText.value = ''

      if (settings.saveHistory) {
        saveToHistory(result.data.text, result.data.dialect || selectedDialect.value)
      }

      showToast('识别成功')
    } else {
      showToast(result.message || '识别失败')
    }
  } catch (error) {
    console.error('识别失败:', error)
    showToast(error.message || '识别失败')
  } finally {
    processing.value = false
  }
}

/**
 * 播放文本
 */
const playText = async () => {
  if (!finalText.value) return

  try {
    isPlaying.value = true
    showToast('生成语音中...')

    const audioUrl = await speechApi.synthesize(finalText.value, {
      voice: ttsSettings.voice || 'mandarin',
      speed: ttsSettings.speed,
      pitch: ttsSettings.pitch,
      volume: ttsSettings.volume,
      emotion: ttsSettings.emotion
    })

    const audio = new Audio(audioUrl)
    audio.onended = () => {
      isPlaying.value = false
      URL.revokeObjectURL(audioUrl)
    }
    audio.play()
  } catch (error) {
    console.error('语音合成失败:', error)
    showToast('语音合成失败')
    isPlaying.value = false
  }
}

/**
 * 清空文本
 */
const clearText = () => {
  finalText.value = ''
  interimText.value = ''
}

/**
 * 复制文本
 */
const copyText = () => {
  navigator.clipboard.writeText(finalText.value).then(() => {
    showToast('已复制')
  })
}

/**
 * 转为普通话（模拟）
 */
const translateToMandarin = () => {
  showToast('翻译功能开发中')
}

/**
 * 保存到历史记录
 */
const saveToHistory = (text, dialect) => {
  if (!settings.saveHistory) return

  const dialectName = dialectOptions.find(d => d.value === dialect)?.text || '未知方言'

  history.value.unshift({
    text,
    dialect,
    dialectName,
    timestamp: Date.now()
  })

  // 限制历史记录数量
  if (history.value.length > 20) {
    history.value = history.value.slice(0, 20)
  }

  // 持久化存储
  localStorage.setItem('voiceHistory', JSON.stringify(history.value))
}

/**
 * 选择历史记录项
 */
const selectHistoryItem = (item) => {
  finalText.value = item.text
  selectedDialect.value = item.dialect
}

/**
 * 格式化时间
 */
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return date.toLocaleDateString('zh-CN')
}

/**
 * 方言变化处理
 */
const handleDialectChange = (value) => {
  console.log('切换方言:', value)
}

/**
 * 语音选择确认
 */
const onVoiceConfirm = ({ selectedOptions }) => {
  ttsSettings.voice = selectedOptions[0].value
  showVoicePicker.value = false
}

/**
 * 保存设置
 */
const saveSettings = () => {
  localStorage.setItem('voiceSettings', JSON.stringify(settings))
  showToast('设置已保存')
  showSettings.value = false
}

/**
 * 加载设置
 */
const loadSettings = () => {
  const saved = localStorage.getItem('voiceSettings')
  if (saved) {
    Object.assign(settings, JSON.parse(saved))
  }

  const savedHistory = localStorage.getItem('voiceHistory')
  if (savedHistory) {
    history.value = JSON.parse(savedHistory)
  }
}

/**
 * 设置音频可视化
 */
const setupAudioVisualizer = (stream) => {
  nextTick(() => {
    const canvas = visualizerCanvas.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)

    source.connect(analyser)
    analyser.fftSize = 256

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationId = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = '#f7f8fa'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height

        // 渐变色
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
        gradient.addColorStop(0, '#1989fa')
        gradient.addColorStop(1, '#7ec2ff')

        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    draw()
  })
}

let animationId = null

// ============ 生命周期 ============
onMounted(() => {
  loadSettings()
})

onUnmounted(() => {
  stopRecording()
})
</script>

<style scoped>
.voice-interaction {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.dialect-selector {
  background: white;
  margin-bottom: 16px;
}

.interaction-area {
  background: white;
  margin: 12px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.transcription-display {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  text-align: center;
}

.placeholder {
  color: #999;
}

.placeholder p {
  margin-top: 12px;
  font-size: 14px;
}

.interim-text {
  font-size: 18px;
  color: #1989fa;
  animation: pulse 1.5s infinite;
}

.final-text {
  font-size: 20px;
  color: #323233;
  line-height: 1.6;
  padding: 0 20px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.audio-visualizer {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

.audio-visualizer canvas {
  border-radius: 8px;
  background: #f7f8fa;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.action-buttons .van-button {
  min-width: 100px;
}

.voice-settings,
.result-actions,
.history-section {
  margin: 16px 12px;
}

.cell-icon {
  margin-right: 8px;
  color: #1989fa;
}

.settings-dialog {
  padding: 24px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
}

.settings-content {
  margin-bottom: 16px;
}

.dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 老年人友好模式样式（可通过类名切换） */
.voice-interaction.elderly-mode {
  font-size: 18px;
}

.voice-interaction.elderly-mode .final-text {
  font-size: 24px;
}

.voice-interaction.elderly-mode .van-button {
  min-height: 50px;
  font-size: 18px;
}
</style>
