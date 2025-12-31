import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 适老化设置Store
 * 管理字体大小、语音、高对比度等适老化功能
 */
export const useElderlyStore = defineStore('elderly', () => {
  // ===== 状态 =====

  // 适老化模式: 'standard' | 'large' | 'xl'
  const mode = ref('standard')

  // 语音设置
  const voiceEnabled = ref(false)
  const voiceLanguage = ref('zh-CN') // 默认普通话
  const voiceRate = ref(1.0) // 语速
  const voicePitch = ref(1.0) // 音调

  // 高对比度模式
  const highContrast = ref(false)

  // 触觉反馈
  const hapticFeedback = ref(true)

  // 语音识别状态
  const recording = ref(false)
  const recordingResult = ref('')

  // ===== 计算属性 =====

  // 当前字体大小配置
  const fontSizeConfig = computed(() => {
    const configs = {
      standard: {
        base: 16,
        h1: 20,
        h2: 18,
        h3: 16,
        body: 16,
        caption: 14
      },
      large: {
        base: 18,
        h1: 24,
        h2: 22,
        h3: 20,
        body: 18,
        caption: 16
      },
      xl: {
        base: 24,
        h1: 32,
        h2: 28,
        h3: 26,
        body: 24,
        caption: 20
      }
    }
    return configs[mode.value]
  })

  // 是否为适老化模式
  const isElderlyMode = computed(() => {
    return mode.value !== 'standard'
  })

  // ===== 方法 =====

  /**
   * 从本地存储加载设置
   */
  const loadSettings = () => {
    return new Promise((resolve) => {
      uni.getStorage({
        key: 'elderly_settings',
        success: (res) => {
          const settings = res.data
          mode.value = settings.mode || 'standard'
          voiceEnabled.value = settings.voiceEnabled || false
          voiceLanguage.value = settings.voiceLanguage || 'zh-CN'
          voiceRate.value = settings.voiceRate || 1.0
          voicePitch.value = settings.voicePitch || 1.0
          highContrast.value = settings.highContrast || false
          hapticFeedback.value = settings.hapticFeedback !== false
          console.log('适老化设置加载成功:', settings)
          resolve(settings)
        },
        fail: () => {
          console.log('未找到本地适老化设置，使用默认值')
          resolve(null)
        }
      })
    })
  }

  /**
   * 保存设置到本地存储
   */
  const saveSettings = () => {
    const settings = {
      mode: mode.value,
      voiceEnabled: voiceEnabled.value,
      voiceLanguage: voiceLanguage.value,
      voiceRate: voiceRate.value,
      voicePitch: voicePitch.value,
      highContrast: highContrast.value,
      hapticFeedback: hapticFeedback.value
    }

    uni.setStorage({
      key: 'elderly_settings',
      data: settings,
      success: () => {
        console.log('适老化设置保存成功')
      },
      fail: (error) => {
        console.error('适老化设置保存失败:', error)
      }
    })
  }

  /**
   * 设置适老化模式
   */
  const setMode = (newMode) => {
    if (['standard', 'large', 'xl'].includes(newMode)) {
      mode.value = newMode
      saveSettings()

      // 应用CSS变量
      applyModeStyles()

      // 震动反馈
      if (hapticFeedback.value) {
        uni.vibrateShort()
      }

      console.log('适老化模式切换为:', newMode)
    }
  }

  /**
   * 应用模式样式
   */
  const applyModeStyles = () => {
    const page = getCurrentPages()[0]
    if (!page) return

    // 设置页面根元素class
    const rootElement = page.$el || page.$page
    if (rootElement) {
      rootElement.classList.remove('elderly-mode-large', 'elderly-mode-xl')
      if (mode.value === 'large') {
        rootElement.classList.add('elderly-mode-large')
      } else if (mode.value === 'xl') {
        rootElement.classList.add('elderly-mode-xl')
      }
    }
  }

  /**
   * 切换语音开关
   */
  const setVoiceEnabled = (enabled) => {
    voiceEnabled.value = enabled
    saveSettings()
    console.log('语音功能已', enabled ? '启用' : '禁用')
  }

  /**
   * 设置语音语言
   */
  const setVoiceLanguage = (language) => {
    voiceLanguage.value = language
    saveSettings()
  }

  /**
   * 设置语音速率
   */
  const setVoiceRate = (rate) => {
    voiceRate.value = Math.max(0.5, Math.min(2.0, rate))
    saveSettings()
  }

  /**
   * 设置语音音调
   */
  const setVoicePitch = (pitch) => {
    voicePitch.value = Math.max(0.5, Math.min(2.0, pitch))
    saveSettings()
  }

  /**
   * 切换高对比度模式
   */
  const setHighContrast = (enabled) => {
    highContrast.value = enabled
    saveSettings()

    // 应用高对比度样式
    const page = getCurrentPages()[0]
    if (page && page.$el) {
      page.$el.classList.toggle('high-contrast', enabled)
    }

    console.log('高对比度模式已', enabled ? '启用' : '禁用')
  }

  /**
   * 切换触觉反馈
   */
  const setHapticFeedback = (enabled) => {
    hapticFeedback.value = enabled
    saveSettings()
  }

  /**
   * 开始语音识别
   */
  const startRecording = () => {
    return new Promise((resolve, reject) => {
      // #ifdef MP-WEIXIN
      const recorderManager = uni.getRecorderManager()
      recorderManager.onStart(() => {
        recording.value = true
        console.log('开始录音')
        resolve()
      })

      recorderManager.onStop((res) => {
        recording.value = false
        recordingResult.value = res.tempFilePath
        console.log('录音结束:', res)
        resolve(res)
      })

      recorderManager.onError((error) => {
        recording.value = false
        console.error('录音失败:', error)
        reject(error)
      })

      recorderManager.start({
        format: 'mp3',
        sampleRate: 16000,
        numberOfChannels: 1
      })
      // #endif

      // #ifdef H5
      // H5环境使用Web Speech API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.lang = voiceLanguage.value
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onstart = () => {
          recording.value = true
          console.log('开始语音识别')
        }

        recognition.onresult = (event) => {
          const result = event.results[0][0].transcript
          recordingResult.value = result
          recording.value = false
          resolve({ transcript: result })
        }

        recognition.onerror = (event) => {
          recording.value = false
          console.error('语音识别失败:', event.error)
          reject(event.error)
        }

        recognition.onend = () => {
          recording.value = false
        }

        recognition.start()
      } else {
        reject(new Error('浏览器不支持语音识别'))
      }
      // #endif

      // #ifdef APP-PLUS
      // APP环境使用原生语音识别
      const main = plus.android.runtimeMainActivity()
      const speech = plus.speech.createSpeech(1, 'zh-CN')
      speech.startRecognize((result) => {
        recordingResult.value = result
        recording.value = false
        resolve({ transcript: result })
      }, (error) => {
        recording.value = false
        reject(error)
      })
      // #endif
    })
  }

  /**
   * 停止语音识别
   */
  const stopRecording = () => {
    return new Promise((resolve) => {
      // #ifdef MP-WEIXIN
      const recorderManager = uni.getRecorderManager()
      recorderManager.stop()
      // #endif

      // #ifdef H5
      // H5环境会自动停止
      // #endif

      // #ifdef APP-PLUS
      plus.speech.stopRecognize()
      // #endif

      recording.value = false
      resolve()
    })
  }

  /**
   * 语音播报（文字转语音）
   */
  const speak = (text, options = {}) => {
    const {
      rate = voiceRate.value,
      pitch = voicePitch.value,
      lang = voiceLanguage.value,
      volume = 1.0
    } = options

    // #ifdef MP-WEIXIN
    // 微信小程序使用createInnerAudioContext
    // 需要先调用语音合成API获取音频文件
    // #endif

    // #ifdef H5
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = rate
      utterance.pitch = pitch
      utterance.volume = volume
      window.speechSynthesis.speak(utterance)
      console.log('语音播报:', text)
    } else {
      console.warn('浏览器不支持语音播报')
    }
    // #endif

    // #ifdef APP-PLUS
    plus.speech.speak({
      content: text,
      speed: rate,
      pitch: pitch,
      volume: volume,
      lang: lang
    })
    // #endif
  }

  /**
   * 震动反馈
   */
  const vibrate = (type = 'short') => {
    if (!hapticFeedback.value) return

    if (type === 'short') {
      uni.vibrateShort({
        success: () => console.log('短震动')
      })
    } else if (type === 'long') {
      uni.vibrateLong({
        success: () => console.log('长震动')
      })
    }
  }

  /**
   * 重置所有设置为默认值
   */
  const resetSettings = () => {
    mode.value = 'standard'
    voiceEnabled.value = false
    voiceLanguage.value = 'zh-CN'
    voiceRate.value = 1.0
    voicePitch.value = 1.0
    highContrast.value = false
    hapticFeedback.value = true
    saveSettings()
    console.log('适老化设置已重置')
  }

  // 返回状态和方法
  return {
    // 状态
    mode,
    voiceEnabled,
    voiceLanguage,
    voiceRate,
    voicePitch,
    highContrast,
    hapticFeedback,
    recording,
    recordingResult,

    // 计算属性
    fontSizeConfig,
    isElderlyMode,

    // 方法
    loadSettings,
    saveSettings,
    setMode,
    setVoiceEnabled,
    setVoiceLanguage,
    setVoiceRate,
    setVoicePitch,
    setHighContrast,
    setHapticFeedback,
    startRecording,
    stopRecording,
    speak,
    vibrate,
    resetSettings
  }
})