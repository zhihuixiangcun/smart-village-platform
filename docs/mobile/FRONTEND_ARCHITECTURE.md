# 智慧乡村 Uni-app 移动端前端架构设计文档

## 文档版本

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| 1.0.0 | 2025-12-30 | Claude Code | 初始版本 |

---

## 一、项目概述

### 1.1 项目背景

智慧乡村移动端是基于 Uni-app 框架开发的跨平台应用，支持微信小程序、支付宝小程序、APP (iOS/Android) 和 H5 多端部署。项目聚焦于为村民提供便捷的村务服务、生活服务和农技社区功能，特别注重适老化设计和离线能力。

### 1.2 技术选型

| 技术 | 版本 | 说明 |
|------|------|------|
| Uni-app | 3.0+ | 跨平台开发框架 |
| Vue.js | 3.3+ | 渐进式 JavaScript 框架 |
| Pinia | 2.1+ | Vue 官方状态管理库 |
| uView UI | 2.0+ | Uni-app 专用 UI 组件库 |
| TypeScript | 5.0+ | 类型安全 (可选) |
| Vite | 5.0+ | 构建工具 |

### 1.3 支持平台

- 微信小程序 (主要平台)
- 支付宝小程序
- H5 网页
- APP (iOS/Android)

---

## 二、项目结构设计

### 2.1 整体目录结构

```
client-mobile/
├── pages/                      # 页面目录
│   ├── index/                  # 首页模块
│   │   ├── index.vue           # 首页
│   │   └── components/         # 首页私有组件
│   ├── village/                # 村务模块
│   │   ├── announcements.vue   # 公告列表
│   │   ├── announcement-detail.vue
│   │   ├── voting.vue          # 投票列表
│   │   └── meeting.vue         # 会议列表
│   ├── services/               # 服务模块
│   │   ├── applications.vue    # 在线办事
│   │   ├── household-qrcode.vue # 一户一码
│   │   └── voice-assistant.vue  # 语音助手
│   ├── agriculture/            # 农技社区
│   │   ├── posts.vue           # 帖子列表
│   │   ├── post-detail.vue     # 帖子详情
│   │   ├── post-publish.vue    # 发布帖子
│   │   └── knowledge.vue       # 知识库
│   ├── user/                   # 用户中心
│   │   ├── profile.vue         # 个人中心
│   │   ├── settings.vue        # 设置
│   │   └── household.vue       # 家庭档案
│   ├── emergency/              # 应急模块
│   │   ├── report.vue          # 应急上报
│   │   └── contacts.vue        # 紧急联系人
│   ├── auth/                   # 认证模块
│   │   ├── login.vue           # 登录
│   │   ├── register.vue        # 注册
│   │   └── face-login.vue      # 人脸识别登录
│   └── finance/                # 财务公开
│       ├── overview.vue        # 财务概览
│       └── transactions.vue    # 收支明细
│
├── components/                 # 公共组件
│   ├── elderly/                # 适老化组件
│   │   ├── ElderlyButton.vue   # 大字按钮
│   │   ├── ElderlyCard.vue     # 大字卡片
│   │   ├── ElderlyForm.vue     # 大字表单
│   │   └── ElderlyLayout.vue   # 大字布局
│   ├── voice/                  # 语音组件
│   │   ├── VoiceInput.vue      # 语音输入
│   │   ├── VoiceOutput.vue     # 语音播报
│   │   └── VoiceAssistant.vue  # 语音助手
│   ├── offline/                # 离线组件
│   │   ├── OfflineIndicator.vue # 离线指示器
│   │   ├── OfflineQueue.vue     # 离线队列
│   │   └── SyncManager.vue      # 同步管理器
│   ├── qr/                     # 二维码组件
│   │   ├── HouseholdQR.vue     # 一户一码
│   │   └── QRScanner.vue       # 扫码器
│   ├── common/                 # 通用组件
│   │   ├── NavBar.vue          # 导航栏
│   │   ├── TabBar.vue          # 底部导航
│   │   ├── RefreshList.vue     # 下拉刷新列表
│   │   ├── ImageUploader.vue   # 图片上传
│   │   ├── VideoPlayer.vue     # 视频播放器
│   │   └── Empty.vue           # 空状态
│   └── business/               # 业务组件
│       ├── AnnouncementCard.vue
│       ├── VoteCard.vue
│       ├── ProjectCard.vue
│       └── ProductCard.vue
│
├── stores/                     # Pinia 状态管理
│   ├── user.js                 # 用户状态
│   ├── village.js              # 村务状态
│   ├── offline.js              # 离线状态
│   ├── voice.js                # 语音状态
│   ├── elderly.js              # 适老化配置
│   └── index.js                # Store 入口
│
├── api/                        # API 接口
│   ├── request.js              # 请求封装
│   ├── auth.js                 # 认证接口
│   ├── village.js              # 村务接口
│   ├── resident.js             # 村民接口
│   ├── finance.js              # 财务接口
│   ├── agriculture.js          # 农技接口
│   ├── emergency.js            # 应急接口
│   ├── voice.js                # 语音接口
│   └── offline.js              # 离线同步接口
│
├── utils/                      # 工具函数
│   ├── common.js               # 通用工具
│   ├── date.js                 # 日期处理
│   ├── format.js               # 格式化
│   ├── validation.js           # 表单验证
│   ├── storage.js              # 本地存储
│   ├── permission.js           # 权限管理
│   ├── offline.js              # 离线处理
│   ├── voice.js                # 语音工具
│   ├── qr.js                   # 二维码工具
│   └── adaptive.js             # 适老化工具
│
├── composables/                # 组合式函数
│   useUser.js                  # 用户相关
│   useElderly.js               # 适老化相关
│   useOffline.js               # 离线相关
│   useVoice.js                 # 语音相关
│   useUpload.js                # 上传相关
│   useAuth.js                  # 认证相关
│   useRequest.js               # 请求相关
│   └── useShare.js             # 分享相关
│
├── styles/                     # 样式文件
│   ├── index.scss              # 样式入口
│   ├── variables.scss          # 变量定义
│   ├── mixins.scss             # 混入
│   ├── themes/                 # 主题
│   │   ├── standard.scss       # 标准主题
│   │   ├── large.scss          # 大字主题
│   │   └── extra-large.scss    # 超大字主题
│   └── elderly.scss            # 适老化样式
│
├── static/                     # 静态资源
│   ├── images/                 # 图片
│   ├── icons/                  # 图标
│   └── voices/                 # 语音文件
│
├── uni_modules/                # Uni-app 插件模块
│   └── uview-ui/               # uView UI 组件库
│
├── config/                     # 配置文件
│   ├── env.js                  # 环境配置
│   ├── const.js                # 常量定义
│   └── elderly.config.js       # 适老化配置
│
├── types/                      # TypeScript 类型定义 (可选)
│   ├── index.d.ts
│   ├── api.d.ts
│   ├── components.d.ts
│   └── stores.d.ts
│
├── App.vue                     # 应用入口
├── main.js                     # 主入口文件
├── manifest.json               # 应用配置清单
├── pages.json                  # 页面路由配置
├── uni.scss                    # 全局样式变量
├── package.json                # 依赖配置
└── vite.config.js              # Vite 配置
```

### 2.2 页面配置 (pages.json)

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "智慧乡村",
        "enablePullDownRefresh": true,
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/village/announcements",
      "style": {
        "navigationBarTitleText": "村务公告",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/services/applications",
      "style": {
        "navigationBarTitleText": "在线办事"
      }
    },
    {
      "path": "pages/user/profile",
      "style": {
        "navigationBarTitleText": "我的"
      }
    }
  ],
  "subPackages": [
    {
      "root": "pages/agriculture",
      "pages": [
        {
          "path": "posts",
          "style": {
            "navigationBarTitleText": "农技社区"
          }
        }
      ]
    }
  ],
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#E85D4C",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/index/index",
        "iconPath": "static/icons/tab-home.png",
        "selectedIconPath": "static/icons/tab-home-active.png",
        "text": "首页"
      },
      {
        "pagePath": "pages/village/announcements",
        "iconPath": "static/icons/tab-village.png",
        "selectedIconPath": "static/icons/tab-village-active.png",
        "text": "村务"
      },
      {
        "pagePath": "pages/services/applications",
        "iconPath": "static/icons/tab-service.png",
        "selectedIconPath": "static/icons/tab-service-active.png",
        "text": "服务"
      },
      {
        "pagePath": "pages/agriculture/posts",
        "iconPath": "static/icons/tab-agri.png",
        "selectedIconPath": "static/icons/tab-agri-active.png",
        "text": "农技"
      },
      {
        "pagePath": "pages/user/profile",
        "iconPath": "static/icons/tab-user.png",
        "selectedIconPath": "static/icons/tab-user-active.png",
        "text": "我的"
      }
    ]
  },
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "智慧乡村",
    "navigationBarBackgroundColor": "#FFFFFF",
    "backgroundColor": "#F5F7FA"
  }
}
```

---

## 三、核心架构设计

### 3.1 适老化设计系统

#### 3.1.1 主题模式

```javascript
// config/elderly.config.js
export const ELDERLY_MODES = {
  STANDARD: 'standard',    // 标准模式
  LARGE: 'large',          // 大字模式
  EXTRA_LARGE: 'extra-large' // 超大字模式
}

export const ELDERLY_THEME = {
  [ELDERLY_MODES.STANDARD]: {
    fontSize: {
      xs: '24rpx',
      sm: '26rpx',
      base: '28rpx',
      lg: '30rpx',
      xl: '32rpx',
      '2xl': '36rpx',
      '3xl': '40rpx'
    },
    spacing: {
      xs: '8rpx',
      sm: '16rpx',
      md: '24rpx',
      lg: '32rpx',
      xl: '40rpx'
    },
    button: {
      height: {
        small: '72rpx',
        medium: '80rpx',
        large: '88rpx'
      },
      fontSize: {
        small: '28rpx',
        medium: '30rpx',
        large: '32rpx'
      }
    }
  },
  [ELDERLY_MODES.LARGE]: {
    fontSize: {
      xs: '28rpx',
      sm: '32rpx',
      base: '36rpx',
      lg: '40rpx',
      xl: '44rpx',
      '2xl': '48rpx',
      '3xl': '56rpx'
    },
    spacing: {
      xs: '12rpx',
      sm: '20rpx',
      md: '28rpx',
      lg: '36rpx',
      xl: '48rpx'
    },
    button: {
      height: {
        small: '80rpx',
        medium: '88rpx',
        large: '100rpx'
      },
      fontSize: {
        small: '32rpx',
        medium: '36rpx',
        large: '40rpx'
      }
    }
  },
  [ELDERLY_MODES.EXTRA_LARGE]: {
    fontSize: {
      xs: '32rpx',
      sm: '36rpx',
      base: '40rpx',
      lg: '48rpx',
      xl: '56rpx',
      '2xl': '64rpx',
      '3xl': '72rpx'
    },
    spacing: {
      xs: '16rpx',
      sm: '24rpx',
      md: '32rpx',
      lg: '48rpx',
      xl: '64rpx'
    },
    button: {
      height: {
        small: '96rpx',
        medium: '108rpx',
        large: '120rpx'
      },
      fontSize: {
        small: '36rpx',
        medium: '40rpx',
        large: '48rpx'
      }
    }
  }
}
```

#### 3.1.2 适老化 Composable

```javascript
// composables/useElderly.js
import { ref, computed, watch } from 'vue'
import { ELDERLY_MODES, ELDERLY_THEME } from '@/config/elderly.config'
import { storage } from '@/utils/storage'

const currentMode = ref(ELDERLY_MODES.STANDARD)
const isVoiceEnabled = ref(true)
const isHighContrast = ref(false)

export function useElderly() {
  // 初始化适老化设置
  const initElderlySettings = () => {
    const savedMode = storage.get('elderly-mode')
    if (savedMode) {
      currentMode.value = savedMode
    }

    isVoiceEnabled.value = storage.get('elderly-voice', true)
    isHighContrast.value = storage.get('elderly-contrast', false)
  }

  // 获取当前主题配置
  const currentTheme = computed(() => {
    return ELDERLY_THEME[currentMode.value]
  })

  // 切换适老化模式
  const setElderlyMode = (mode) => {
    currentMode.value = mode
    storage.set('elderly-mode', mode)

    // 设置页面根类名
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage && currentPage.$page) {
      currentPage.$page.meta.elderlyMode = mode
    }
  }

  // 切换语音播报
  const toggleVoice = () => {
    isVoiceEnabled.value = !isVoiceEnabled.value
    storage.set('elderly-voice', isVoiceEnabled.value)
  }

  // 切换高对比度
  const toggleHighContrast = () => {
    isHighContrast.value = !isHighContrast.value
    storage.set('elderly-contrast', isHighContrast.value)
  }

  // 检查是否为适老化模式
  const isElderlyMode = computed(() => {
    return currentMode.value !== ELDERLY_MODES.STANDARD
  })

  // 获取样式类
  const getElderlyClass = (baseClass) => {
    const mode = currentMode.value
    return mode === ELDERLY_MODES.STANDARD
      ? baseClass
      : `${baseClass}--${mode}`
  }

  return {
    currentMode,
    currentTheme,
    isElderlyMode,
    isVoiceEnabled,
    isHighContrast,
    initElderlySettings,
    setElderlyMode,
    toggleVoice,
    toggleHighContrast,
    getElderlyClass
  }
}
```

### 3.2 离线同步架构

#### 3.2.1 离线状态管理

```javascript
// stores/offline.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { offlineStorage } from '@/utils/offline'

export const useOfflineStore = defineStore('offline', () => {
  // 网络状态
  const isOnline = ref(true)
  const lastSyncTime = ref(null)

  // 离线队列
  const offlineQueue = ref([])
  const conflictQueue = ref([])

  // 同步状态
  const isSyncing = ref(false)
  const syncProgress = ref(0)

  // 计算属性
  const hasPendingOperations = computed(() => {
    return offlineQueue.value.length > 0
  })

  const hasConflicts = computed(() => {
    return conflictQueue.value.length > 0
  })

  // 监听网络状态
  const watchNetworkStatus = () => {
    uni.onNetworkStatusChange((res) => {
      isOnline.value = res.isConnected

      if (res.isConnected && hasPendingOperations.value) {
        // 网络恢复，自动同步
        syncOfflineData()
      }
    })
  }

  // 添加离线操作
  const addOfflineOperation = (operation) => {
    const op = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      ...operation
    }

    offlineQueue.value.push(op)
    offlineStorage.saveQueue(offlineQueue.value)

    return op.id
  }

  // 同步离线数据
  const syncOfflineData = async () => {
    if (!isOnline.value || isSyncing.value) return

    isSyncing.value = true
    syncProgress.value = 0

    try {
      const total = offlineQueue.value.length

      for (let i = 0; i < offlineQueue.value.length; i++) {
        const operation = offlineQueue.value[i]

        try {
          await executeOfflineOperation(operation)
          offlineQueue.value.splice(i, 1)
          i--
        } catch (error) {
          // 处理冲突
          if (error.status === 409) {
            conflictQueue.value.push({
              ...operation,
              error: error.data
            })
          }
        }

        syncProgress.value = Math.round(((i + 1) / total) * 100)
      }

      offlineStorage.saveQueue(offlineQueue.value)
      lastSyncTime.value = Date.now()

    } finally {
      isSyncing.value = false
    }
  }

  // 执行离线操作
  const executeOfflineOperation = async (operation) => {
    const { type, url, data } = operation

    switch (type) {
      case 'create':
        return await uni.request({ url, method: 'POST', data })
      case 'update':
        return await uni.request({ url, method: 'PUT', data })
      case 'delete':
        return await uni.request({ url, method: 'DELETE' })
    }
  }

  // 解决冲突
  const resolveConflict = (conflictId, resolution) => {
    const index = conflictQueue.value.findIndex(c => c.id === conflictId)
    if (index !== -1) {
      conflictQueue.value.splice(index, 1)
    }
  }

  return {
    isOnline,
    isSyncing,
    syncProgress,
    lastSyncTime,
    offlineQueue,
    conflictQueue,
    hasPendingOperations,
    hasConflicts,
    watchNetworkStatus,
    addOfflineOperation,
    syncOfflineData,
    resolveConflict
  }
})
```

#### 3.2.2 离线 Composable

```javascript
// composables/useOffline.js
import { ref, onMounted, onUnmounted } from 'vue'
import { useOfflineStore } from '@/stores/offline'

export function useOffline() {
  const offlineStore = useOfflineStore()

  // 本地数据缓存
  const localCache = ref({})

  // 获取本地数据
  const getLocalData = async (key) => {
    return uni.getStorageSync(`offline:${key}`)
  }

  // 保存本地数据
  const saveLocalData = async (key, data) => {
    uni.setStorageSync(`offline:${key}`, data)
    localCache.value[key] = data
  }

  // 离线请求
  const offlineRequest = async (config) => {
    const { url, method, data, localKey } = config

    if (offlineStore.isOnline) {
      try {
        const response = await uni.request({
          url,
          method,
          data
        })

        // 缓存响应数据
        if (localKey) {
          saveLocalData(localKey, response.data)
        }

        return response.data
      } catch (error) {
        // 网络请求失败，尝试使用本地缓存
        if (localKey) {
          const cachedData = await getLocalData(localKey)
          if (cachedData) {
            return cachedData
          }
        }
        throw error
      }
    } else {
      // 离线模式，从本地缓存读取
      if (localKey) {
        const cachedData = await getLocalData(localKey)
        if (cachedData) {
          return cachedData
        }
      }

      // 添加到离线队列
      offlineStore.addOfflineOperation({
        type: method.toLowerCase(),
        url,
        data
      })

      throw new Error('当前离线，操作已加入队列')
    }
  }

  // 初始化
  onMounted(() => {
    offlineStore.watchNetworkStatus()
  })

  return {
    isOnline: offlineStore.isOnline,
    isSyncing: offlineStore.isSyncing,
    offlineQueue: offlineStore.offlineQueue,
    getLocalData,
    saveLocalData,
    offlineRequest
  }
}
```

### 3.3 语音交互系统

#### 3.3.1 语音识别 Composable

```javascript
// composables/useVoice.js
import { ref, computed } from 'vue'

export function useVoice() {
  const isRecording = ref(false)
  const isPlaying = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')

  // 检查语音支持
  const isSpeechSupported = computed(() => {
    // #ifdef MP-WEIXIN
    return true // 微信小程序支持
    // #endif

    // #ifdef H5
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    // #endif

    // #ifdef APP-PLUS
    return true // APP 支持
    // #endif

    return false
  })

  // 开始录音
  const startRecording = async () => {
    if (!isSpeechSupported.value) {
      throw new Error('当前平台不支持语音识别')
    }

    isRecording.value = true

    // #ifdef MP-WEIXIN
    const recorderManager = uni.getRecorderManager()

    recorderManager.onFrameRecorded((res) => {
      // 处理录音数据
    })

    recorderManager.onStop((res) => {
      // 调用微信语音识别接口
      recognizeVoice(res.tempFilePath)
    })

    recorderManager.start({
      format: 'mp3',
      sampleRate: 16000
    })
    // #endif

    // #ifdef H5
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          transcript.value = result[0].transcript
        } else {
          interimTranscript.value = result[0].transcript
        }
      }
    }

    recognition.onend = () => {
      isRecording.value = false
    }

    recognition.start()
    // #endif
  }

  // 停止录音
  const stopRecording = () => {
    // #ifdef MP-WEIXIN
    const recorderManager = uni.getRecorderManager()
    recorderManager.stop()
    // #endif

    // #ifdef H5
    // SpeechRecognition 会自动停止
    // #endif

    isRecording.value = false
  }

  // 语音识别
  const recognizeVoice = async (audioPath) => {
    try {
      // #ifdef MP-WEIXIN
      const res = await uni.callFunction({
        name: 'voiceRecognition',
        data: { audioPath }
      })
      transcript.value = res.result.text
      // #endif
    } catch (error) {
      console.error('语音识别失败:', error)
    }
  }

  // 语音播报
  const speak = (text) => {
    // #ifdef MP-WEIXIN
    const innerAudioContext = uni.createInnerAudioContext()
    innerAudioContext.src = `/api/tts?text=${encodeURIComponent(text)}`
    innerAudioContext.play()
    // #endif

    // #ifdef H5
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      window.speechSynthesis.speak(utterance)
    }
    // #endif

    // #ifdef APP-PLUS
    plus.speech.startSpeaking({
      content: text,
      lang: 'zh-cn'
    })
    // #endif
  }

  return {
    isRecording,
    isPlaying,
    transcript,
    interimTranscript,
    isSpeechSupported,
    startRecording,
    stopRecording,
    speak
  }
}
```

### 3.4 API 请求封装

```javascript
// api/request.js
import { useUserStore } from '@/stores/user'
import { useOfflineStore } from '@/stores/offline'

// 环境配置
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 请求拦截器
const requestInterceptor = (config) => {
  const userStore = useUserStore()

  // 添加 Token
  if (userStore.token) {
    config.header = {
      ...config.header,
      'Authorization': `Bearer ${userStore.token}`
    }
  }

  // 添加时间戳
  if (config.method === 'GET') {
    config.data = {
      ...config.data,
      _t: Date.now()
    }
  }

  return config
}

// 响应拦截器
const responseInterceptor = (response) => {
  const { statusCode, data } = response

  if (statusCode === 200) {
    return data
  }

  // 错误处理
  switch (statusCode) {
    case 401:
      // Token 过期
      const userStore = useUserStore()
      userStore.logout()
      uni.navigateTo({ url: '/pages/auth/login' })
      break
    case 403:
      uni.showToast({ title: '没有权限', icon: 'none' })
      break
    default:
      uni.showToast({ title: data.message || '请求失败', icon: 'none' })
  }

  return Promise.reject(data)
}

// 创建请求实例
const request = (config) => {
  const offlineStore = useOfflineStore()

  // 离线处理
  if (!offlineStore.isOnline && config.method !== 'GET') {
    return Promise.reject(new Error('网络未连接'))
  }

  const defaultConfig = {
    url: BASE_URL + config.url,
    timeout: 15000,
    header: {
      'Content-Type': 'application/json'
    }
  }

  const finalConfig = requestInterceptor({
    ...defaultConfig,
    ...config
  })

  return uni.request(finalConfig).then(responseInterceptor)
}

// 便捷方法
export const http = {
  get(url, data = {}, config = {}) {
    return request({ url, method: 'GET', data, ...config })
  },

  post(url, data = {}, config = {}) {
    return request({ url, method: 'POST', data, ...config })
  },

  put(url, data = {}, config = {}) {
    return request({ url, method: 'PUT', data, ...config })
  },

  delete(url, data = {}, config = {}) {
    return request({ url, method: 'DELETE', data, ...config })
  },

  upload(url, filePath, formData = {}) {
    return new Promise((resolve, reject) => {
      const userStore = useUserStore()
      const offlineStore = useOfflineStore()

      if (!offlineStore.isOnline) {
        reject(new Error('网络未连接'))
        return
      }

      const uploadTask = uni.uploadFile({
        url: BASE_URL + url,
        filePath,
        name: 'file',
        formData,
        header: {
          'Authorization': `Bearer ${userStore.token}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(res.data))
          } else {
            reject(res)
          }
        },
        fail: reject
      })

      return uploadTask
    })
  }
}

export default request
```

---

## 四、组件设计规范

### 4.1 适老化按钮组件

```vue
<!-- components/elderly/ElderlyButton.vue -->
<template>
  <view
    :class="buttonClass"
    :style="buttonStyle"
    @tap="handleTap"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <view v-if="loading" class="elderly-button__loading">
      <uni-icons type="spinner-cycle" size="20" />
    </view>

    <view v-if="icon && !loading" class="elderly-button__icon">
      <uni-icons :type="icon" :size="iconSize" />
    </view>

    <view v-if="$slots.default" class="elderly-button__content">
      <slot></slot>
    </view>

    <view class="elderly-button__ripple" ref="ripple"></view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useElderly } from '@/composables/useElderly'

const props = defineProps({
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'warning', 'danger', 'text'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  icon: String,
  loading: Boolean,
  disabled: Boolean,
  plain: Boolean,
  round: Boolean,
  block: Boolean
})

const emit = defineEmits(['tap'])

const { currentTheme, getElderlyClass } = useElderly()
const ripple = ref(null)
const isPressed = ref(false)

const buttonClass = computed(() => {
  return [
    'elderly-button',
    `elderly-button--${props.type}`,
    getElderlyClass('elderly-button'),
    {
      'is-disabled': props.disabled || props.loading,
      'is-loading': props.loading,
      'is-plain': props.plain,
      'is-round': props.round,
      'is-block': props.block,
      'is-pressed': isPressed.value
    }
  ]
})

const buttonStyle = computed(() => {
  const theme = currentTheme.value
  const sizeConfig = theme.button.height[props.size]

  return {
    minHeight: sizeConfig,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    fontSize: theme.button.fontSize[props.size]
  }
})

const iconSize = computed(() => {
  const sizeMap = { small: 18, medium: 20, large: 24 }
  return sizeMap[props.size] || 20
})

const handleTap = (e) => {
  if (props.disabled || props.loading) return

  // 触觉反馈
  // #ifdef APP-PLUS
  plus.device.vibrate(10)
  // #endif

  emit('tap', e)
}

const handleTouchStart = () => {
  isPressed.value = true
}

const handleTouchEnd = () => {
  isPressed.value = false
}
</script>

<style lang="scss" scoped>
.elderly-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-weight: 600;
  text-align: center;
  border: none;
  border-radius: 16rpx;
  transition: all 0.3s ease;
  overflow: hidden;

  &.is-pressed {
    transform: scale(0.98);
  }

  &.is-block {
    width: 100%;
  }

  &.is-round {
    border-radius: 999rpx;
  }

  &--primary {
    background: linear-gradient(135deg, #E85D4C 0%, #FF6B6B 100%);
    color: #FFFFFF;

    &.is-plain {
      background: transparent;
      border: 4rpx solid #E85D4C;
      color: #E85D4C;
    }
  }

  &--secondary {
    background: linear-gradient(135deg, #52A885 0%, #5FB894 100%);
    color: #FFFFFF;
  }

  &--text {
    background: transparent;
    color: #E85D4C;
  }

  &__loading {
    margin-right: 16rpx;
    animation: rotate 1s linear infinite;
  }

  &__icon {
    margin-right: 12rpx;
  }

  &__ripple {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
```

### 4.2 语音输入组件

```vue
<!-- components/voice/VoiceInput.vue -->
<template>
  <view class="voice-input">
    <view
      v-if="!isActive"
      class="voice-input__button"
      :class="{ 'is-recording': isRecording }"
      @tap="toggleRecording"
    >
      <uni-icons
        :type="isRecording ? 'mic-filled' : 'mic'"
        :size="iconSize"
        :color="isRecording ? '#E85D4C' : '#333'"
      />
      <text class="voice-input__text">{{ buttonText }}</text>
    </view>

    <view v-else class="voice-input__panel">
      <!-- 波形动画 -->
      <view class="voice-wave">
        <view v-for="i in 5" :key="i" class="wave-bar" :style="{ animationDelay: `${i * 0.1}s` }" />
      </view>

      <!-- 实时转录 -->
      <view v-if="transcript || interimTranscript" class="voice-input__transcript">
        <text v-if="interimTranscript" class="interim">{{ interimTranscript }}</text>
        <text v-if="transcript" class="final">{{ transcript }}</text>
      </view>

      <!-- 操作按钮 -->
      <view class="voice-input__actions">
        <view class="action-btn" @tap="confirmInput">
          <uni-icons type="checkmarkempty" size="24" color="#52A885" />
          <text>确认</text>
        </view>
        <view class="action-btn" @tap="retryRecording">
          <uni-icons type="refreshempty" size="24" color="#E6A23C" />
          <text>重试</text>
        </view>
        <view class="action-btn" @tap="cancelInput">
          <uni-icons type="closeempty" size="24" color="#F56C6C" />
          <text>取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useVoice } from '@/composables/useVoice'
import { useElderly } from '@/composables/useElderly'

const props = defineProps({
  buttonText: {
    type: String,
    default: '语音输入'
  },
  autoStart: Boolean
})

const emit = defineEmits(['input', 'confirm', 'cancel'])

const { isRecording, transcript, interimTranscript, startRecording, stopRecording } = useVoice()
const { currentTheme } = useElderly()

const isActive = ref(false)

const iconSize = computed(() => {
  return parseInt(currentTheme.value.fontSize['2xl'])
})

const buttonText = computed(() => {
  return isRecording.value ? '正在录音...' : props.buttonText
})

const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    await startRecording()
  }
  isActive.value = !isActive.value
}

const confirmInput = () => {
  emit('confirm', transcript.value)
  emit('input', transcript.value)
  isActive.value = false
}

const retryRecording = () => {
  transcript.value = ''
  interimTranscript.value = ''
  isActive.value = false
}

const cancelInput = () => {
  emit('cancel')
  isActive.value = false
}

if (props.autoStart) {
  toggleRecording()
}
</script>

<style lang="scss" scoped>
.voice-input {
  &__button {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    padding: 24rpx 48rpx;
    background: #F5F7FA;
    border-radius: 24rpx;

    &.is-recording {
      background: #FEF0F0;
      animation: pulse 1.5s infinite;
    }
  }

  &__panel {
    padding: 32rpx;
    background: #FFFFFF;
    border-radius: 24rpx;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  }

  &__transcript {
    margin: 24rpx 0;
    padding: 20rpx;
    background: #F8F9FA;
    border-radius: 12rpx;
    min-height: 80rpx;

    .interim {
      color: #909399;
    }

    .final {
      color: #303133;
      font-weight: 500;
    }
  }

  &__actions {
    display: flex;
    justify-content: space-around;

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8rpx;
      padding: 16rpx 32rpx;
      border-radius: 12rpx;
      transition: background 0.3s;

      &:active {
        background: #F5F7FA;
      }
    }
  }
}

.voice-wave {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6rpx;
  height: 80rpx;
  margin-bottom: 16rpx;

  .wave-bar {
    width: 8rpx;
    height: 40rpx;
    background: linear-gradient(to top, #409eff, #67c23a);
    border-radius: 4rpx;
    animation: wave 1.5s infinite ease-in-out;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(232, 93, 76, 0.7);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 20rpx rgba(232, 93, 76, 0);
  }
}

@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}
</style>
```

### 4.3 离线状态指示器

```vue
<!-- components/offline/OfflineIndicator.vue -->
<template>
  <view v-if="!isOnline || hasPendingOperations" class="offline-indicator">
    <view v-if="!isOnline" class="offline-banner offline">
      <uni-icons type="info" size="20" color="#E6A23C" />
      <text>网络已断开，部分功能受限</text>
    </view>

    <view v-else-if="hasPendingOperations" class="offline-banner pending">
      <uni-icons type="cloud-upload" size="20" color="#409eff" />
      <text>您有 {{ queueLength }} 条内容待同步</text>
      <view class="sync-btn" @tap="syncNow">
        <text>立即同步</text>
      </view>
    </view>

    <view v-if="isSyncing" class="sync-progress">
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: syncProgress + '%' }" />
      </view>
      <text>正在同步... {{ syncProgress }}%</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useOfflineStore } from '@/stores/offline'

const offlineStore = useOfflineStore()

const isOnline = computed(() => offlineStore.isOnline)
const hasPendingOperations = computed(() => offlineStore.hasPendingOperations)
const isSyncing = computed(() => offlineStore.isSyncing)
const syncProgress = computed(() => offlineStore.syncProgress)
const queueLength = computed(() => offlineStore.offlineQueue.length)

const syncNow = () => {
  offlineStore.syncOfflineData()
}
</script>

<style lang="scss" scoped>
.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
}

.offline-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;

  &.offline {
    background: #FDF6EC;
    color: #E6A23C;
  }

  &.pending {
    background: #F0F9FF;
    color: #409eff;
  }

  .sync-btn {
    margin-left: 16rpx;
    padding: 8rpx 24rpx;
    background: #409eff;
    color: #FFFFFF;
    border-radius: 8rpx;
    font-size: 24rpx;
  }
}

.sync-progress {
  padding: 16rpx 32rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #EBEEF5;

  .progress-bar {
    height: 8rpx;
    background: #EBEEF5;
    border-radius: 4rpx;
    overflow: hidden;
    margin-bottom: 8rpx;

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #409eff, #67c23a);
      transition: width 0.3s ease;
    }
  }
}
</style>
```

### 4.4 一户一码组件

```vue
<!-- components/qr/HouseholdQR.vue -->
<template>
  <view class="household-qr">
    <view class="qr-header">
      <text class="qr-title">{{ householdInfo.name }}</text>
      <text class="qr-subtitle">一户一码</text>
    </view>

    <view class="qr-code">
      <tki-qrcode
        ref="qrcode"
        :val="qrData"
        :size="qrSize"
        :onval="true"
        :load-make="true"
        :show-loading="true"
        loading-text="生成中..."
      />
    </view>

    <view class="qr-info">
      <view class="info-row">
        <text class="label">户主：</text>
        <text class="value">{{ householdInfo.head }}</text>
      </view>
      <view class="info-row">
        <text class="label">人口：</text>
        <text class="value">{{ householdInfo.members }} 人</text>
      </view>
      <view class="info-row">
        <text class="label">地址：</text>
        <text class="value">{{ householdInfo.address }}</text>
      </view>
    </view>

    <view class="qr-actions">
      <view class="action-btn" @tap="saveQRCode">
        <uni-icons type="download" size="20" />
        <text>保存到相册</text>
      </view>
      <view class="action-btn" @tap="shareQRCode">
        <uni-icons type="redo" size="20" />
        <text>分享</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import tkiQrcode from '@/components/tki-qrcode/tki-qrcode.vue'

const props = defineProps({
  householdId: {
    type: String,
    required: true
  }
})

const qrcode = ref(null)
const householdInfo = ref({})

const qrData = computed(() => {
  return JSON.stringify({
    type: 'household',
    id: props.householdId,
    timestamp: Date.now()
  })
})

const qrSize = computed(() => {
  return uni.getSystemInfoSync().windowWidth * 0.6
})

onMounted(async () => {
  // 获取户信息
  const res = await uni.request({
    url: `/api/household/${props.householdId}`
  })
  householdInfo.value = res.data
})

const saveQRCode = () => {
  qrcode.value._makeCode()
  uni.showLoading({ title: '保存中...' })

  setTimeout(() => {
    uni.canvasToTempFilePath({
      canvasId: qrcode.value.canvasId,
      success: (res) => {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            uni.showToast({ title: '已保存到相册', icon: 'success' })
          }
        })
      },
      complete: () => {
        uni.hideLoading()
      }
    })
  }, 500)
}

const shareQRCode = () => {
  // 分享功能
  uni.share({
    provider: 'weixin',
    type: 0,
    title: '智慧乡村 - 一户一码',
    href: qrData.value
  })
}
</script>

<style lang="scss" scoped>
.household-qr {
  padding: 48rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
}

.qr-header {
  text-align: center;
  margin-bottom: 32rpx;

  .qr-title {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8rpx;
  }

  .qr-subtitle {
    font-size: 28rpx;
    color: #909399;
  }
}

.qr-code {
  display: flex;
  justify-content: center;
  padding: 32rpx;
  background: #F5F7FA;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}

.qr-info {
  margin-bottom: 32rpx;

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #EBEEF5;

    .label {
      color: #909399;
    }

    .value {
      color: #303133;
      font-weight: 500;
    }
  }
}

.qr-actions {
  display: flex;
  gap: 16rpx;

  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    padding: 20rpx;
    background: #F5F7FA;
    border-radius: 12rpx;
    color: #606266;
  }
}
</style>
```

---

## 五、状态管理设计

### 5.1 用户状态管理

```javascript
// stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref(null)
  const permissions = ref([])
  const roles = ref([])

  const isLoggedIn = computed(() => !!token.value)
  const userName = computed(() => userInfo.value?.name || '')
  const userAvatar = computed(() => userInfo.value?.avatar || '')

  // 设置 Token
  const setToken = (newToken) => {
    token.value = newToken
    uni.setStorageSync('token', newToken)
  }

  // 设置用户信息
  const setUserInfo = (info) => {
    userInfo.value = info
    uni.setStorageSync('userInfo', info)
  }

  // 登录
  const login = async (loginData) => {
    const res = await uni.request({
      url: '/api/auth/login',
      method: 'POST',
      data: loginData
    })

    setToken(res.token)
    setUserInfo(res.user)

    return res
  }

  // 登出
  const logout = () => {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
    uni.reLaunch({ url: '/pages/auth/login' })
  }

  // 获取用户信息
  const getUserInfo = async () => {
    const res = await uni.request({
      url: '/api/user/info',
      method: 'GET'
    })
    setUserInfo(res)
    return res
  }

  // 初始化（从本地恢复）
  const init = () => {
    const savedToken = uni.getStorageSync('token')
    const savedUserInfo = uni.getStorageSync('userInfo')

    if (savedToken) token.value = savedToken
    if (savedUserInfo) userInfo.value = savedUserInfo
  }

  return {
    token,
    userInfo,
    permissions,
    roles,
    isLoggedIn,
    userName,
    userAvatar,
    setToken,
    setUserInfo,
    login,
    logout,
    getUserInfo,
    init
  }
})
```

### 5.2 村务状态管理

```javascript
// stores/village.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '@/api/request'

export const useVillageStore = defineStore('village', () => {
  const announcements = ref([])
  const votes = ref([])
  const meetings = ref([])
  const loading = ref(false)

  // 获取公告列表
  const fetchAnnouncements = async () => {
    loading.value = true
    try {
      const res = await http.get('/announcements')
      announcements.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  // 获取投票列表
  const fetchVotes = async () => {
    loading.value = true
    try {
      const res = await http.get('/voting')
      votes.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  // 参与投票
  const participateVote = async (voteId, optionId) => {
    const res = await http.post(`/voting/${voteId}/vote`, { optionId })

    // 更新本地投票状态
    const vote = votes.value.find(v => v._id === voteId)
    if (vote) {
      vote.hasVoted = true
      vote.userOption = optionId
    }

    return res
  }

  return {
    announcements,
    votes,
    meetings,
    loading,
    fetchAnnouncements,
    fetchVotes,
    participateVote
  }
})
```

### 5.3 语音状态管理

```javascript
// stores/voice.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVoiceStore = defineStore('voice', () => {
  const isEnabled = ref(true)
  const language = ref('zh-CN')
  const rate = ref(1.0)
  const pitch = ref(1.0)
  const history = ref([])

  // 添加语音历史
  const addHistory = (text, type) => {
    history.value.unshift({
      id: Date.now(),
      text,
      type, // 'input' or 'output'
      timestamp: new Date().toISOString()
    })

    // 最多保留100条
    if (history.value.length > 100) {
      history.value = history.value.slice(0, 100)
    }

    uni.setStorageSync('voice-history', history.value)
  }

  // 清空历史
  const clearHistory = () => {
    history.value = []
    uni.removeStorageSync('voice-history')
  }

  // 从本地恢复
  const init = () => {
    const savedHistory = uni.getStorageSync('voice-history')
    if (savedHistory) {
      history.value = savedHistory
    }

    const savedEnabled = uni.getStorageSync('voice-enabled')
    if (savedEnabled !== null) {
      isEnabled.value = savedEnabled
    }
  }

  return {
    isEnabled,
    language,
    rate,
    pitch,
    history,
    addHistory,
    clearHistory,
    init
  }
})
```

---

## 六、工具函数库

### 6.1 通用工具函数

```javascript
// utils/common.js

/**
 * 防抖函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 */
export function throttle(fn, interval = 300) {
  let last = 0
  return function(...args) {
    const now = Date.now()
    if (now - last >= interval) {
      last = now
      fn.apply(this, args)
    }
  }
}

/**
 * 深拷贝
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))

  const cloneObj = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloneObj[key] = deepClone(obj[key])
    }
  }
  return cloneObj
}

/**
 * 生成唯一ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 获取图片扩展名
 */
export function getImageExt(url) {
  const ext = url.substring(url.lastIndexOf('.') + 1).toLowerCase()
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) ? ext : 'jpg'
}
```

### 6.2 日期工具函数

```javascript
// utils/date.js

/**
 * 格式化日期
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date)

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 相对时间
 */
export function relativeTime(date) {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`

  return formatDate(date, 'YYYY-MM-DD')
}

/**
 * 判断是否为今天
 */
export function isToday(date) {
  const d = new Date(date)
  const today = new Date()

  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
}
```

### 6.3 验证工具函数

```javascript
// utils/validation.js

/**
 * 手机号验证
 */
export function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 身份证验证
 */
export function validateIdCard(idCard) {
  return /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(idCard)
}

/**
 * 表单验证器
 */
export const validators = {
  required: (value) => {
    return !!value || '此项为必填'
  },

  phone: (value) => {
    return !value || validatePhone(value) || '请输入正确的手机号'
  },

  idCard: (value) => {
    return !value || validateIdCard(value) || '请输入正确的身份证号'
  },

  minLength: (min) => (value) => {
    return !value || value.length >= min || `至少输入${min}个字符`
  },

  maxLength: (max) => (value) => {
    return !value || value.length <= max || `最多输入${max}个字符`
  }
}
```

### 6.4 本地存储工具

```javascript
// utils/storage.js

class Storage {
  constructor(prefix = 'sv_') {
    this.prefix = prefix
  }

  // 生成完整键名
  getKey(key) {
    return this.prefix + key
  }

  // 设置数据
  set(key, value) {
    try {
      const data = JSON.stringify({
        value,
        timestamp: Date.now()
      })
      uni.setStorageSync(this.getKey(key), data)
      return true
    } catch (error) {
      console.error('Storage set error:', error)
      return false
    }
  }

  // 获取数据
  get(key, defaultValue = null) {
    try {
      const data = uni.getStorageSync(this.getKey(key))
      if (!data) return defaultValue

      const parsed = JSON.parse(data)

      // 检查是否过期
      if (this.isExpired(parsed)) {
        this.remove(key)
        return defaultValue
      }

      return parsed.value
    } catch (error) {
      console.error('Storage get error:', error)
      return defaultValue
    }
  }

  // 移除数据
  remove(key) {
    uni.removeStorageSync(this.getKey(key))
  }

  // 清空所有数据
  clear() {
    const res = uni.getStorageInfoSync()
    res.keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        uni.removeStorageSync(key)
      }
    })
  }

  // 检查是否过期
  isExpired(data, maxAge = 7 * 24 * 60 * 60 * 1000) {
    if (!data.timestamp) return false
    return Date.now() - data.timestamp > maxAge
  }
}

export const storage = new Storage()
export default storage
```

### 6.5 适老化工具函数

```javascript
// utils/adaptive.js

import { ELDERLY_MODES, ELDERLY_THEME } from '@/config/elderly.config'

/**
 * 获取适老化尺寸
 */
export function getAdaptiveSize(property, size, mode = ELDERLY_MODES.STANDARD) {
  const theme = ELDERLY_THEME[mode]
  if (!theme || !theme[property]) return size

  const sizes = theme[property]
  return sizes[size] || size
}

/**
 * 获取字体大小
 */
export function getFontSize(size, mode) {
  return getAdaptiveSize('fontSize', size, mode)
}

/**
 * 获取间距
 */
export function getSpacing(size, mode) {
  return getAdaptiveSize('spacing', size, mode)
}

/**
 * 判断是否需要语音播报
 */
export function shouldSpeak(value, threshold = 50) {
  // 数字小于阈值时播报
  if (typeof value === 'number') {
    return value < threshold
  }

  // 布尔值播报 true
  if (typeof value === 'boolean') {
    return value
  }

  return false
}

/**
 * 文本转语音播报文本
 */
export function textToSpeechText(text, mode = ELDERLY_MODES.STANDARD) {
  // 标准模式直接返回
  if (mode === ELDERLY_MODES.STANDARD) {
    return text
  }

  // 大字模式增加语气词
  const prefixes = ['好的，', '收到了，', '明白了，']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]

  return prefix + text
}
```

---

## 七、性能优化策略

### 7.1 分包加载配置

```json
// pages.json - subPackages 配置
{
  "subPackages": [
    {
      "root": "pages/village",
      "name": "village",
      "pages": [
        { "path": "announcements", "style": { "navigationBarTitleText": "村务公告" } },
        { "path": "voting", "style": { "navigationBarTitleText": "投票" } },
        { "path": "meeting", "style": { "navigationBarTitleText": "会议" } }
      ]
    },
    {
      "root": "pages/agriculture",
      "name": "agriculture",
      "pages": [
        { "path": "posts", "style": { "navigationBarTitleText": "农技社区" } },
        { "path": "post-detail", "style": { "navigationBarTitleText": "详情" } },
        { "path": "knowledge", "style": { "navigationBarTitleText": "知识库" } }
      ]
    },
    {
      "root": "pages/emergency",
      "name": "emergency",
      "pages": [
        { "path": "report", "style": { "navigationBarTitleText": "应急上报" } },
        { "path": "contacts", "style": { "navigationBarTitleText": "紧急联系人" } }
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["village"]
    }
  }
}
```

### 7.2 图片懒加载组件

```vue
<!-- components/common/LazyImage.vue -->
<template>
  <image
    :src="currentSrc"
    :mode="mode"
    :lazy-load="true"
    :class="imageClass"
    @load="handleLoad"
    @error="handleError"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  src: String,
  mode: {
    type: String,
    default: 'aspectFill'
  },
  defaultImage: {
    type: String,
    default: '/static/images/placeholder.png'
  }
})

const emit = defineEmits(['load', 'error'])

const isLoaded = ref(false)
const isError = ref(false)

const currentSrc = computed(() => {
  if (isError.value) return props.defaultImage
  return props.src
})

const imageClass = computed(() => {
  return {
    'lazy-image': true,
    'is-loaded': isLoaded.value,
    'is-error': isError.value
  }
})

const handleLoad = () => {
  isLoaded.value = true
  emit('load')
}

const handleError = () => {
  isError.value = true
  emit('error')
}
</script>

<style lang="scss" scoped>
.lazy-image {
  opacity: 0;
  transition: opacity 0.3s ease;
  background-color: #F5F7FA;

  &.is-loaded {
    opacity: 1;
  }
}
</style>
```

### 7.3 列表虚拟滚动

```vue
<!-- components/common/VirtualList.vue -->
<template>
  <scroll-view
    :scroll-y="true"
    :style="{ height: listHeight }"
    @scroll="handleScroll"
    @scrolltolower="loadMore"
  >
    <view :style="{ height: totalHeight + 'px', position: 'relative' }">
      <view
        v-for="item in visibleItems"
        :key="item.id"
        :style="getItemStyle(item.index)"
      >
        <slot :item="item.data" :index="item.index"></slot>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemHeight: {
    type: Number,
    default: 100
  },
  visibleCount: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['loadMore'])

const scrollTop = ref(0)
const listHeight = ref(0)

const startIndex = computed(() => {
  return Math.floor(scrollTop.value / props.itemHeight)
})

const endIndex = computed(() => {
  return Math.min(startIndex.value + props.visibleCount, props.items.length)
})

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value).map((data, i) => ({
    id: data.id || i,
    data,
    index: startIndex.value + i
  }))
})

const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

const offsetY = computed(() => {
  return startIndex.value * props.itemHeight
})

const getItemStyle = (index) => {
  return {
    position: 'absolute',
    top: `${index * props.itemHeight}px`,
    height: `${props.itemHeight}px`,
    width: '100%'
  }
}

const handleScroll = (e) => {
  scrollTop.value = e.detail.scrollTop
}

const loadMore = () => {
  if (endIndex.value >= props.items.length) {
    emit('loadMore')
  }
}

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  listHeight.value = systemInfo.windowHeight
})
</script>
```

---

## 八、构建与部署

### 8.1 环境配置

```javascript
// config/env.js
export const ENV_CONFIG = {
  development: {
    BASE_URL: 'http://localhost:5000/api',
    WS_URL: 'ws://localhost:5000',
    UPLOAD_URL: 'http://localhost:5000/upload'
  },
  production: {
    BASE_URL: 'https://api.smartvillage.com/api',
    WS_URL: 'wss://api.smartvillage.com',
    UPLOAD_URL: 'https://api.smartvillage.com/upload'
  }
}

export const getConfig = () => {
  // #ifdef MP-WEIXIN
  return ENV_CONFIG.production
  // #endif

  // #ifdef H5
  return ENV_CONFIG.development
  // #endif

  return ENV_CONFIG.development
}

export default getConfig()
```

### 8.2 Vite 配置

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true
      }
    }
  },
  build: {
    // 生产环境移除 console
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
```

### 8.3 manifest.json 配置

```json
{
  "name": "智慧乡村",
  "appid": "__UNI__XXXX",
  "description": "智慧乡村综合服务平台",
  "versionName": "1.0.0",
  "versionCode": "100",
  "transformPx": false,
  "app-plus": {
    "usingComponents": true,
    "nvueStyleCompiler": "uni-app",
    "compilerVersion": 3,
    "splashscreen": {
      "alwaysShowBeforeRender": true,
      "waiting": true,
      "autoclose": true,
      "delay": 0
    },
    "modules": {},
    "distribute": {
      "android": {
        "permissions": [
          "<uses-permission android:name=\"android.permission.CHANGE_NETWORK_STATE\"/>",
          "<uses-permission android:name=\"android.permission.MOUNT_UNMOUNT_FILESYSTEMS\"/>",
          "<uses-permission android:name=\"android.permission.VIBRATE\"/>",
          "<uses-permission android:name=\"android.permission.READ_LOGS\"/>",
          "<uses-permission android:name=\"android.permission.ACCESS_WIFI_STATE\"/>",
          "<uses-feature android:name=\"android.hardware.camera.autofocus\"/>",
          "<uses-permission android:name=\"android.permission.ACCESS_NETWORK_STATE\"/>",
          "<uses-permission android:name=\"android.permission.CAMERA\"/>",
          "<uses-permission android:name=\"android.permission.GET_ACCOUNTS\"/>",
          "<uses-permission android:name=\"android.permission.READ_PHONE_STATE\"/>",
          "<uses-permission android:name=\"android.permission.CHANGE_WIFI_STATE\"/>",
          "<uses-permission android:name=\"android.permission.WAKE_LOCK\"/>",
          "<uses-permission android:name=\"android.permission.FLASHLIGHT\"/>",
          "<uses-feature android:name=\"android.hardware.camera\"/>",
          "<uses-permission android:name=\"android.permission.WRITE_SETTINGS\"/>"
        ]
      },
      "ios": {},
      "sdkConfigs": {}
    }
  },
  "quickapp": {},
  "mp-weixin": {
    "appid": "",
    "setting": {
      "urlCheck": false,
      "es6": true,
      "postcss": true,
      "minified": true
    },
    "usingComponents": true,
    "permission": {
      "scope.userLocation": {
        "desc": "您的位置信息将用于获取周边服务"
      }
    },
    "requiredPrivateInfos": [
      "getLocation",
      "startRecord",
      "chooseImage"
    ]
  },
  "mp-alipay": {
    "usingComponents": true
  },
  "mp-baidu": {
    "usingComponents": true
  },
  "mp-toutiao": {
    "usingComponents": true
  },
  "h5": {
    "devServer": {
      "port": 3000,
      "disableHostCheck": true,
      "https": false
    },
    "router": {
      "mode": "hash",
      "base": "./"
    },
    "optimization": {
      "treeShaking": {
        "enable": true
      }
    }
  }
}
```

---

## 九、测试规范

### 9.1 单元测试

```javascript
// tests/utils/date.test.js
import { describe, it, expect } from 'vitest'
import { formatDate, relativeTime, isToday } from '@/utils/date'

describe('Date Utils', () => {
  it('formatDate should format date correctly', () => {
    const date = new Date('2025-12-30 12:00:00')
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2025-12-30')
  })

  it('relativeTime should return correct relative time', () => {
    const now = Date.now()
    expect(relativeTime(now - 60000)).toContain('分钟前')
  })

  it('isToday should check if date is today', () => {
    expect(isToday(new Date())).toBe(true)
  })
})
```

### 9.2 组件测试

```vue
<!-- tests/components/ElderlyButton.spec.vue -->
<template>
  <ElderlyButton @tap="handleTap">点击</ElderlyButton>
</template>

<script setup>
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ElderlyButton from '@/components/elderly/ElderlyButton.vue'

describe('ElderlyButton', () => {
  it('renders correctly', () => {
    const wrapper = mount(ElderlyButton, {
      slots: { default: '点击' }
    })
    expect(wrapper.text()).toContain('点击')
  })

  it('emits tap event when clicked', async () => {
    const wrapper = mount(ElderlyButton)
    await wrapper.trigger('tap')
    expect(wrapper.emitted('tap')).toBeTruthy()
  })
})
</script>
```

---

## 十、开发规范

### 10.1 命名规范

- **文件命名**: 采用 PascalCase (如: `ElderlyButton.vue`)
- **组件命名**: 采用 PascalCase (如: `<ElderlyButton />`)
- **变量命名**: 采用 camelCase (如: `currentTheme`)
- **常量命名**: 采用 UPPER_SNAKE_CASE (如: `ELDERLY_MODES`)
- **文件夹命名**: 采用 kebab-case (如: `/pages/village/`)

### 10.2 代码风格

- 使用 Composition API (`<script setup>`)
- 优先使用 `const`，其次是 `let`
- 组件 props 必须定义类型和默认值
- 使用 TypeScript 类型定义（可选）
- 遵循 ESLint 规则

### 10.3 注释规范

```javascript
/**
 * 获取适老化主题配置
 * @param {string} mode - 适老化模式
 * @param {string} property - 属性名称
 * @returns {string|number} 返回对应的值
 */
export function getAdaptiveSize(mode, property) {
  // ...
}
```

---

## 附录

### A. 参考资料

- [Uni-app 官方文档](https://uniapp.dcloud.net.cn/)
- [uView UI 文档](https://www.uviewui.com/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vue 3 官方文档](https://cn.vuejs.org/)

### B. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2025-12-30 | 初始版本 |

---

**文档结束**
