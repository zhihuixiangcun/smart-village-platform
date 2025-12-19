/**
 * 智慧乡村语音交互Composable
 * 支持语音识别、语音合成、方言检测等功能
 */

import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import axios from 'axios'

export function useVoiceInteraction(options = {}) {
  // 配置选项
  const config = reactive({
    backendUrl: options.backendUrl || 'http://localhost:3001',
    pythonServiceUrl: options.pythonServiceUrl || 'http://localhost:5001',
    maxRecordingDuration: options.maxRecordingDuration || 60000, // 60秒
    silenceTimeout: options.silenceTimeout || 3000, // 3秒静音超时
    autoDetectDialect: options.autoDetectDialect !== false,
    enableWakeWord: options.enableWakeWord !== false,
    wakeWords: options.wakeWords || ['小智', '村小助手', '智慧乡村'],
    preferredDialect: options.preferredDialect || 'zh', // 普通话
    preferredVoice: options.preferredVoice || 'female',
    enableVisualFeedback: options.enableVisualFeedback !== false,
    ...options
  })

  // 状态管理
  const state = reactive({
    isSupported: false,
    isRecording: false,
    isProcessing: false,
    isSpeaking: false,
    isListening: false,
    hasPermission: false,
    audioLevel: 0,
    recordingTime: 0,
    lastTranscript: '',
    lastResponse: '',
    detectedDialect: null,
    wakeWordDetected: false,
    conversationHistory: [],
    serviceStatus: {
      backend: false,
      python: false,
      initialized: false
    }
  })

  // 音频相关
  const audioContext = ref(null)
  const mediaRecorder = ref(null)
  const audioStream = ref(null)
  const analyser = ref(null)
  const microphone = ref(null)
  const animationFrameId = ref(null)

  // 定时器
  const recordingTimer = ref(null)
  const silenceTimer = ref(null)
  const audioLevelTimer = ref(null)

  // 事件监听器
  const eventListeners = new Map()

  /**
   * 初始化语音服务
   */
  const initialize = async () => {
    try {
      console.log('🎤 初始化语音交互服务...')

      // 检查浏览器支持
      if (!checkBrowserSupport()) {
        ElMessage.error('您的浏览器不支持语音功能')
        return false
      }

      // 请求麦克风权限
      const permissionGranted = await requestMicrophonePermission()
      if (!permissionGranted) {
        ElMessage.error('请允许使用麦克风')
        return false
      }

      // 初始化音频上下文
      await initializeAudioContext()

      // 检查服务状态
      await checkServiceStatus()

      // 初始化服务
      await initializeServices()

      state.isSupported = true
      state.serviceStatus.initialized = true

      console.log('✅ 语音交互服务初始化完成')
      ElMessage.success('语音服务初始化成功')

      return true
    } catch (error) {
      console.error('❌ 语音交互服务初始化失败:', error)
      ElMessage.error('语音服务初始化失败: ' + error.message)
      return false
    }
  }

  /**
   * 检查浏览器支持
   */
  const checkBrowserSupport = () => {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined'
    const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext)
    const hasSpeechSynthesis = 'speechSynthesis' in window
    const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

    const supported = hasGetUserMedia && hasMediaRecorder && hasAudioContext
    console.log('浏览器语音功能支持检查:', {
      getUserMedia: hasGetUserMedia,
      MediaRecorder: hasMediaRecorder,
      AudioContext: hasAudioContext,
      SpeechSynthesis: hasSpeechSynthesis,
      SpeechRecognition: hasSpeechRecognition,
      fullySupported: supported
    })

    state.isSupported = supported
    return supported
  }

  /**
   * 请求麦克风权限
   */
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      })

      stream.getTracks().forEach(track => track.stop())
      state.hasPermission = true
      return true
    } catch (error) {
      console.error('麦克风权限请求失败:', error)
      state.hasPermission = false
      return false
    }
  }

  /**
   * 初始化音频上下文
   */
  const initializeAudioContext = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioContext.value = new AudioContext()

      // 创建分析器
      analyser.value = audioContext.value.createAnalyser()
      analyser.value.fftSize = 256
      analyser.value.smoothingTimeConstant = 0.8

      console.log('音频上下文初始化完成')
    } catch (error) {
      console.error('音频上下文初始化失败:', error)
      throw error
    }
  }

  /**
   * 检查服务状态
   */
  const checkServiceStatus = async () => {
    try {
      // 检查后端服务
      const backendResponse = await axios.get(`${config.backendUrl}/health`).catch(() => null)
      state.serviceStatus.backend = backendResponse?.data?.success || false

      // 检查Python服务
      const pythonResponse = await axios.get(`${config.pythonServiceUrl}/health`).catch(() => null)
      state.serviceStatus.python = pythonResponse?.data?.success || false

      console.log('服务状态:', state.serviceStatus)
    } catch (error) {
      console.warn('服务状态检查失败:', error)
    }
  }

  /**
   * 初始化语音服务
   */
  const initializeServices = async () => {
    try {
      // 初始化后端语音服务
      if (state.serviceStatus.backend) {
        await axios.post(`${config.backendUrl}/api/v1/voice/initialize`)
        console.log('后端语音服务初始化成功')
      }

      return true
    } catch (error) {
      console.error('语音服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 开始录音
   */
  const startRecording = async () => {
    try {
      if (state.isRecording) {
        console.warn('已经在录音中')
        return
      }

      if (!state.hasPermission) {
        const granted = await requestMicrophonePermission()
        if (!granted) {
          ElMessage.error('请先允许使用麦克风')
          return
        }
      }

      console.log('🎙️ 开始录音...')

      // 获取音频流
      audioStream.value = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      })

      // 创建录音器
      const options = {
        mimeType: getSupportedMimeType()
      }

      mediaRecorder.value = new MediaRecorder(audioStream.value, options)

      const audioChunks = []

      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.value.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: options.mimeType })
        await processAudioData(audioBlob)
      }

      // 连接音频分析器
      const source = audioContext.value.createMediaStreamSource(audioStream.value)
      source.connect(analyser.value)

      // 开始录音
      mediaRecorder.value.start(100) // 每100ms收集一次数据
      state.isRecording = true
      state.recordingTime = 0
      state.audioLevel = 0

      // 启动监听器
      startAudioLevelMonitoring()
      startRecordingTimer()
      startSilenceDetection()

      // 触发事件
      emit('recordingStarted')

      console.log('录音已开始')
    } catch (error) {
      console.error('开始录音失败:', error)
      ElMessage.error('开始录音失败: ' + error.message)
    }
  }

  /**
   * 停止录音
   */
  const stopRecording = () => {
    try {
      if (!state.isRecording || !mediaRecorder.value) {
        console.warn('当前没有在录音')
        return
      }

      console.log('⏹️ 停止录音...')

      mediaRecorder.value.stop()
      state.isRecording = false

      // 停止监听器
      stopAudioLevelMonitoring()
      stopRecordingTimer()
      stopSilenceDetection()

      // 停止音频流
      if (audioStream.value) {
        audioStream.value.getTracks().forEach(track => track.stop())
        audioStream.value = null
      }

      // 触发事件
      emit('recordingStopped')

      console.log('录音已停止')
    } catch (error) {
      console.error('停止录音失败:', error)
    }
  }

  /**
   * 处理音频数据
   */
  const processAudioData = async (audioBlob) => {
    try {
      console.log('🔄 处理音频数据...')
      state.isProcessing = true

      // 转换为ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()

      // 方言检测（如果启用）
      let detectedDialect = null
      if (config.autoDetectDialect && state.serviceStatus.python) {
        try {
          const dialectResult = await detectDialect(arrayBuffer)
          detectedDialect = dialectResult.dialect
          state.detectedDialect = detectedDialect
          console.log(`检测到方言: ${dialectResult.dialect_name} (${detectedDialect})`)
        } catch (error) {
          console.warn('方言检测失败:', error)
        }
      }

      // 语音识别
      const recognitionResult = await recognizeSpeech(arrayBuffer, detectedDialect)
      state.lastTranscript = recognitionResult.text

      // 添加到对话历史
      addToConversationHistory('user', recognitionResult.text)

      // 命令处理（如果启用唤醒词检测）
      if (config.enableWakeWord && recognitionResult.command) {
        const commandResult = await processVoiceCommand(recognitionResult)
        if (commandResult.success) {
          await executeCommand(commandResult.command)
        }
      }

      // 触发事件
      emit('speechRecognized', recognitionResult)

      state.isProcessing = false
      console.log('音频数据处理完成')

    } catch (error) {
      console.error('音频数据处理失败:', error)
      state.isProcessing = false
      ElMessage.error('语音处理失败: ' + error.message)
    }
  }

  /**
   * 方言检测
   */
  const detectDialect = async (audioData) => {
    try {
      const formData = new FormData()
      formData.append('audio', new Blob([audioData], { type: 'audio/wav' }))

      const response = await axios.post(
        `${config.pythonServiceUrl}/speech/detect-dialect`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      return response.data.data
    } catch (error) {
      console.error('方言检测失败:', error)
      throw error
    }
  }

  /**
   * 语音识别
   */
  const recognizeSpeech = async (audioData, dialect = null) => {
    try {
      const formData = new FormData()
      formData.append('audio', new Blob([audioData], { type: 'audio/wav' }))
      formData.append('language', 'zh-CN')
      formData.append('dialect', dialect || config.preferredDialect)
      formData.append('sampleRate', '16000')
      formData.append('format', 'wav')

      let recognitionResult

      // 优先使用Python服务
      if (state.serviceStatus.python) {
        const response = await axios.post(
          `${config.pythonServiceUrl}/speech/recognize`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        recognitionResult = response.data.data
      } else if (state.serviceStatus.backend) {
        // 使用后端服务
        const response = await axios.post(
          `${config.backendUrl}/api/v1/voice/recognize`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        )
        recognitionResult = response.data.data
      } else {
        // 使用Web Speech API
        recognitionResult = await fallbackSpeechRecognition()
      }

      // 命令解析
      if (recognitionResult.text) {
        recognitionResult.command = parseVoiceCommand(recognitionResult.text)
      }

      return recognitionResult
    } catch (error) {
      console.error('语音识别失败:', error)
      throw error
    }
  }

  /**
   * 备用语音识别（Web Speech API）
   */
  const fallbackSpeechRecognition = () => {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('浏览器不支持语音识别'))
        return
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.lang = 'zh-CN'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        resolve({
          text: transcript,
          confidence: event.results[0][0].confidence,
          language: recognition.lang,
          dialect: 'unknown'
        })
      }

      recognition.onerror = (event) => {
        reject(new Error(`语音识别错误: ${event.error}`))
      }

      recognition.start()
    })
  }

  /**
   * 语音命令解析
   */
  const parseVoiceCommand = (text) => {
    const cleanedText = text.trim().toLowerCase()

    // 检测唤醒词
    const hasWakeWord = config.wakeWords.some(word => cleanedText.includes(word))

    // 命令模式
    const commandPatterns = {
      query: /^查询|显示|看看|找|搜索/,
      action: /^执行|操作|处理|办理/,
      navigate: /^打开|进入|跳转到|切换到/,
      help: /^帮助|怎么用|使用指南/,
      emergency: /^紧急|求救|报警|急救/,
      weather: /^天气|温度|降雨/,
      service: /^服务|办事|申请/
    }

    let commandType = 'general'
    for (const [type, pattern] of Object.entries(commandPatterns)) {
      if (pattern.test(cleanedText)) {
        commandType = type
        break
      }
    }

    // 提取实体
    const entities = extractEntities(cleanedText, commandType)

    return {
      text,
      cleanedText,
      hasWakeWord,
      commandType,
      entities,
      confidence: calculateConfidence(text, hasWakeWord)
    }
  }

  /**
   * 提取实体
   */
  const extractEntities = (text, commandType) => {
    const entities = []

    // 时间实体
    const timePatterns = {
      '今天': 'today',
      '明天': 'tomorrow',
      '上午': 'morning',
      '下午': 'afternoon',
      '晚上': 'evening'
    }

    for (const [textPattern, value] of Object.entries(timePatterns)) {
      if (text.includes(textPattern)) {
        entities.push({ type: 'time', value, text: textPattern })
      }
    }

    // 数字实体
    const numbers = text.match(/\d+/g)
    if (numbers) {
      numbers.forEach(num => {
        entities.push({ type: 'number', value: parseInt(num), text: num })
      })
    }

    // 根据命令类型提取特定实体
    switch (commandType) {
      case 'query':
        const queryTargets = ['村民', '公告', '政策', '补贴', '费用']
        queryTargets.forEach(target => {
          if (text.includes(target)) {
            entities.push({ type: 'query_target', value: target, text: target })
          }
        })
        break
      case 'service':
        const services = ['医保', '社保', '身份证', '户口']
        services.forEach(service => {
          if (text.includes(service)) {
            entities.push({ type: 'service_type', value: service, text: service })
          }
        })
        break
    }

    return entities
  }

  /**
   * 计算置信度
   */
  const calculateConfidence = (text, hasWakeWord) => {
    let confidence = 0.5

    if (text.length > 5) confidence += 0.1
    if (hasWakeWord) confidence += 0.3

    return Math.min(confidence, 1.0)
  }

  /**
   * 处理语音命令
   */
  const processVoiceCommand = async (recognitionResult) => {
    try {
      if (!recognitionResult.command || !recognitionResult.command.hasWakeWord) {
        return { success: false, message: '未检测到唤醒词' }
      }

      const response = await axios.post(
        `${config.backendUrl}/api/v1/voice/command`,
        {
          text: recognitionResult.text
        }
      )

      return response.data.data
    } catch (error) {
      console.error('语音命令处理失败:', error)
      throw error
    }
  }

  /**
   * 执行命令
   */
  const executeCommand = async (command) => {
    try {
      console.log('执行命令:', command)

      // 生成语音响应
      const responseText = generateCommandResponse(command)
      await synthesizeSpeech(responseText)

      // 触发事件
      emit('commandExecuted', command)

    } catch (error) {
      console.error('命令执行失败:', error)
      ElMessage.error('命令执行失败: ' + error.message)
    }
  }

  /**
   * 生成命令响应
   */
  const generateCommandResponse = (command) => {
    const responses = {
      query_info: '正在为您查询相关信息...',
      handle_action: '正在为您处理相关业务...',
      navigate_page: '正在跳转到指定页面...',
      get_help: '为您提供使用帮助...',
      emergency_call: '紧急求助已发送，请保持冷静！',
      weather_query: '正在查询天气信息...',
      service_apply: '正在为您申请相关服务...'
    }

    return responses[command.intent] || '正在处理您的要求...'
  }

  /**
   * 文本转语音
   */
  const synthesizeSpeech = async (text, options = {}) => {
    try {
      console.log('🔊 合成语音:', text)

      const synthesisOptions = {
        voice: options.voice || config.preferredVoice,
        language: options.language || 'zh-CN',
        dialect: options.dialect || config.preferredDialect,
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 1.0,
        emotion: options.emotion || 'neutral'
      }

      let audioData

      // 优先使用Python服务
      if (state.serviceStatus.python) {
        const response = await axios.post(
          `${config.pythonServiceUrl}/speech/synthesize`,
          {
            text,
            config: synthesisOptions
          }
        )
        audioData = response.data.data.audio
      } else if (state.serviceStatus.backend) {
        // 使用后端服务
        const response = await axios.post(
          `${config.backendUrl}/api/v1/voice/synthesize`,
          {
            text,
            ...synthesisOptions
          }
        )
        audioData = response.data.data.audio
      } else {
        // 使用Web Speech API
        await fallbackTextToSpeech(text, synthesisOptions)
        return
      }

      // 播放音频
      if (audioData) {
        await playAudioFromData(audioData)
      }

      state.lastResponse = text
      addToConversationHistory('assistant', text)

    } catch (error) {
      console.error('语音合成失败:', error)
      // 使用Web Speech API作为备用
      await fallbackTextToSpeech(text, options)
    }
  }

  /**
   * 备用文本转语音（Web Speech API）
   */
  const fallbackTextToSpeech = (text, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('浏览器不支持语音合成'))
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = options.language || 'zh-CN'
      utterance.rate = options.speed || 1.0
      utterance.pitch = options.pitch || 1.0
      utterance.volume = options.volume || 1.0

      // 选择声音
      const voices = speechSynthesis.getVoices()
      const voice = voices.find(v => v.lang.includes('zh')) || voices[0]
      if (voice) {
        utterance.voice = voice
      }

      utterance.onstart = () => {
        state.isSpeaking = true
        emit('speechStarted', text)
      }

      utterance.onend = () => {
        state.isSpeaking = false
        emit('speechEnded', text)
        resolve()
      }

      utterance.onerror = (event) => {
        state.isSpeaking = false
        reject(new Error(`语音合成错误: ${event.error}`))
      }

      speechSynthesis.speak(utterance)
    })
  }

  /**
   * 从数据播放音频
   */
  const playAudioFromData = async (audioData) => {
    try {
      state.isSpeaking = true
      emit('speechStarted')

      // 转换ArrayBuffer为音频Blob
      const audioArray = new Uint8Array(audioData)
      const audioBlob = new Blob([audioArray], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)

      // 创建音频对象并播放
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        state.isSpeaking = false
        URL.revokeObjectURL(audioUrl)
        emit('speechEnded')
      }

      audio.onerror = () => {
        state.isSpeaking = false
        URL.revokeObjectURL(audioUrl)
        console.error('音频播放失败')
      }

      await audio.play()
    } catch (error) {
      console.error('音频播放失败:', error)
      state.isSpeaking = false
    }
  }

  /**
   * 开始音频级别监听
   */
  const startAudioLevelMonitoring = () => {
    const updateAudioLevel = () => {
      if (!state.isRecording || !analyser.value) return

      const dataArray = new Uint8Array(analyser.value.frequencyBinCount)
      analyser.value.getByteFrequencyData(dataArray)

      // 计算平均音量级别
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      state.audioLevel = average / 255 // 归一化到0-1

      // 触发音频级别更新事件
      emit('audioLevelUpdate', state.audioLevel)

      animationFrameId.value = requestAnimationFrame(updateAudioLevel)
    }

    updateAudioLevel()
  }

  /**
   * 停止音频级别监听
   */
  const stopAudioLevelMonitoring = () => {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
    state.audioLevel = 0
  }

  /**
   * 开始录音计时
   */
  const startRecordingTimer = () => {
    recordingTimer.value = setInterval(() => {
      state.recordingTime += 100

      // 检查最大录音时长
      if (state.recordingTime >= config.maxRecordingDuration) {
        ElMessage.warning('录音时间过长，自动停止')
        stopRecording()
      }

      emit('recordingTimeUpdate', state.recordingTime)
    }, 100)
  }

  /**
   * 停止录音计时
   */
  const stopRecordingTimer = () => {
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value)
      recordingTimer.value = null
    }
    state.recordingTime = 0
  }

  /**
   * 开始静音检测
   */
  const startSilenceDetection = () => {
    let silenceStartTime = null

    const checkSilence = () => {
      if (!state.isRecording) return

      if (state.audioLevel < 0.01) { // 静音阈值
        if (!silenceStartTime) {
          silenceStartTime = Date.now()
        } else if (Date.now() - silenceStartTime > config.silenceTimeout) {
          console.log('检测到静音，自动停止录音')
          stopRecording()
        }
      } else {
        silenceStartTime = null
      }

      audioLevelTimer.value = setTimeout(checkSilence, 100)
    }

    checkSilence()
  }

  /**
   * 停止静音检测
   */
  const stopSilenceDetection = () => {
    if (audioLevelTimer.value) {
      clearTimeout(audioLevelTimer.value)
      audioLevelTimer.value = null
    }
  }

  /**
   * 获取支持的MIME类型
   */
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'audio/webm'
  }

  /**
   * 添加到对话历史
   */
  const addToConversationHistory = (role, content) => {
    state.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    })

    // 限制历史记录长度
    if (state.conversationHistory.length > 50) {
      state.conversationHistory = state.conversationHistory.slice(-50)
    }

    emit('conversationUpdate', state.conversationHistory)
  }

  /**
   * 事件系统
   */
  const emit = (event, data = null) => {
    const listeners = eventListeners.get(event) || []
    listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error('事件监听器执行失败:', error)
      }
    })
  }

  const on = (event, listener) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, [])
    }
    eventListeners.get(event).push(listener)
  }

  const off = (event, listener) => {
    const listeners = eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    console.log('🧹 清理语音交互资源...')

    // 停止录音
    if (state.isRecording) {
      stopRecording()
    }

    // 停止所有监听器
    stopAudioLevelMonitoring()
    stopRecordingTimer()
    stopSilenceDetection()

    // 关闭音频流
    if (audioStream.value) {
      audioStream.value.getTracks().forEach(track => track.stop())
      audioStream.value = null
    }

    // 关闭音频上下文
    if (audioContext.value && audioContext.value.state !== 'closed') {
      audioContext.value.close()
      audioContext.value = null
    }

    // 清理事件监听器
    eventListeners.clear()

    // 重置状态
    Object.assign(state, {
      isSupported: false,
      isRecording: false,
      isProcessing: false,
      isSpeaking: false,
      isListening: false,
      audioLevel: 0,
      recordingTime: 0,
      serviceStatus: {
        backend: false,
        python: false,
        initialized: false
      }
    })

    console.log('语音交互资源清理完成')
  }

  // 生命周期
  onMounted(() => {
    // 在组件挂载时初始化
    // initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  // 返回API
  return {
    // 状态
    state,
    config,

    // 方法
    initialize,
    startRecording,
    stopRecording,
    synthesizeSpeech,
    detectDialect,
    recognizeSpeech,
    processAudioData,

    // 事件
    on,
    off,
    emit,

    // 工具
    cleanup
  }
}