# 智慧乡村综合服务平台前端架构设计

## 📋 项目概述

智慧乡村综合服务平台是一个面向农村用户的综合性管理系统，采用Vue.js 3 + Vite构建系统，支持多角色用户（村民、村干部、乡镇官员）的差异化需求。

## 🏗️ 技术栈

### 核心技术
- **框架**: Vue.js 3.3.8 (Composition API)
- **构建工具**: Vite 5.0.0
- **UI组件库**: Element Plus 2.4.4
- **状态管理**: Pinia 2.1.7
- **路由管理**: Vue Router 4.2.5
- **HTTP客户端**: Axios 1.6.2
- **实时通信**: Socket.IO Client 4.8.1

### 样式与UI
- **CSS框架**: Tailwind CSS 3.4.0
- **预处理器**: Sass 1.69.5
- **图标库**: Element Plus Icons Vue 2.1.0
- **响应式设计**: 移动优先原则

### 开发工具
- **代码检查**: ESLint 8.56.0 + Vue Plugin
- **代码格式化**: Prettier 3.1.0
- **自动导入**: Unplugin Auto Import 0.17.2
- **组件自动注册**: Unplugin Vue Components 0.25.2

## 🎯 架构设计原则

### 1. 用户友好设计
- **大字模式**: 适配老年用户，支持字体缩放
- **方言语音交互**: 支持22种方言识别
- **无障碍访问**: WCAG 2.1 AA标准
- **移动端优化**: 响应式设计，触控友好

### 2. 模块化架构
- **组件化开发**: 可复用的Vue组件
- **路由懒加载**: 按需加载页面组件
- **状态分层**: 全局状态与页面状态分离
- **API模块化**: 按业务域组织API接口

### 3. 性能优化
- **代码分割**: 路由级别和组件级别分割
- **资源优化**: 图片懒加载、压缩
- **缓存策略**: HTTP缓存、本地存储
- **Bundle优化**: Tree-shaking、压缩

## 📁 目录结构设计

```
client/
├── public/                     # 静态资源
│   ├── favicon.ico
│   └── locales/               # 国际化文件
│       ├── zh-CN/
│       ├── pcc/
│       └── pcc-qn/
├── src/
│   ├── api/                   # API接口模块
│   │   ├── authApi.js         # 认证相关
│   │   ├── residentApi.js     # 村民管理
│   │   ├── villageApi.js      # 村务管理
│   │   ├── financeApi.js      # 财务管理
│   │   └── index.js           # API统一导出
│   ├── assets/                # 静态资源
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── components/            # 公共组件
│   │   ├── common/            # 通用组件
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppSidebar.vue
│   │   │   ├── AppFooter.vue
│   │   │   ├── LoadingSpinner.vue
│   │   │   └── ErrorBoundary.vue
│   │   ├── forms/             # 表单组件
│   │   │   ├── ResidentForm.vue
│   │   │   ├── FinanceForm.vue
│   │   │   └── VillageForm.vue
│   │   ├── charts/            # 图表组件
│   │   │   ├── DashboardChart.vue
│   │   │   └── StatisticsChart.vue
│   │   └── business/          # 业务组件
│   │       ├── HouseholdQR.vue
│   │       ├── VoiceAssistant.vue
│   │       └── EmergencyCall.vue
│   ├── composables/           # 组合式函数
│   │   ├── useAuth.js         # 认证逻辑
│   │   ├── usePermission.js   # 权限控制
│   │   ├── useVoice.js        # 语音交互
│   │   ├── useTheme.js        # 主题切换
│   │   └── useI18n.js         # 国际化
│   ├── directives/            # 自定义指令
│   │   ├── permission.js      # 权限指令
│   │   ├── loading.js         # 加载指令
│   │   └── accessibility.js   # 无障碍指令
│   ├── layouts/               # 布局组件
│   │   ├── DefaultLayout.vue  # 默认布局
│   │   ├── AuthLayout.vue     # 认证页面布局
│   │   ├── MobileLayout.vue   # 移动端布局
│   │   └── LargeFontLayout.vue # 大字模式布局
│   ├── plugins/               # 插件
│   │   ├── mobileAdaptation.js
│   │   ├── voiceRecognition.js
│   │   └── accessibility.js
│   ├── router/                # 路由配置
│   │   ├── index.js           # 主路由
│   │   ├── guards.js          # 路由守卫
│   │   ├── modules/           # 路由模块
│   │   │   ├── auth.js
│   │   │   ├── village.js
│   │   │   ├── finance.js
│   │   │   └── resident.js
│   │   └── meta.js            # 路由元信息
│   ├── services/              # 服务层
│   │   ├── socket.js          # Socket.IO服务
│   │   ├── voice.js           # 语音识别服务
│   │   ├── storage.js         # 本地存储服务
│   │   ├── notification.js    # 通知服务
│   │   └── geolocation.js     # 地理位置服务
│   ├── stores/                # 状态管理
│   │   ├── userStore.js       # 用户状态
│   │   ├── villageStore.js    # 村务状态
│   │   ├── financeStore.js    # 财务状态
│   │   ├── themeStore.js      # 主题状态
│   │   ├── voiceStore.js      # 语音状态
│   │   └── index.js           # Store统一导出
│   ├── style/                 # 样式文件
│   │   ├── tailwind.css       # Tailwind基础样式
│   │   ├── element-plus.css   # Element Plus样式
│   │   ├── variables.scss     # SCSS变量
│   │   ├── mixins.scss        # SCSS混入
│   │   ├── main.scss          # 主样式文件
│   │   └── themes/            # 主题样式
│   │       ├── default.scss
│   │       ├── large-font.scss
│   │       └── high-contrast.scss
│   ├── utils/                 # 工具函数
│   │   ├── request.js         # HTTP请求封装
│   │   ├── auth.js            # 认证工具
│   │   ├── format.js          # 格式化工具
│   │   ├── validation.js      # 表单验证
│   │   ├── storage.js         # 存储工具
│   │   ├── permission.js      # 权限工具
│   │   └── constants.js       # 常量定义
│   ├── views/                 # 页面组件
│   │   ├── auth/              # 认证页面
│   │   │   ├── Login.vue
│   │   │   ├── Register.vue
│   │   │   └── FaceRecognition.vue
│   │   ├── dashboard/         # 仪表盘
│   │   │   ├── AdminDashboard.vue
│   │   │   ├── VillageDashboard.vue
│   │   │   └── ResidentDashboard.vue
│   │   ├── village/          # 村务管理
│   │   │   ├── CommitteeManagement.vue
│   │   │   ├── VillageAffairs.vue
│   │   │   ├── PopulationManagement.vue
│   │   │   └── EmergencyManagement.vue
│   │   ├── residents/        # 村民管理
│   │   │   ├── ResidentList.vue
│   │   │   ├── ResidentDetail.vue
│   │   │   ├── ResidentForm.vue
│   │   │   └── HouseholdQR.vue
│   │   ├── finance/          # 财务管理
│   │   │   ├── FinanceOverview.vue
│   │   │   ├── BudgetManagement.vue
│   │   │   ├── ExpenseManagement.vue
│   │   │   └── FinancialReports.vue
│   │   ├── services/          # 生活服务
│   │   │   ├── ServiceHall.vue
│   │   │   ├── Applications.vue
│   │   │   ├── VoiceInteraction.vue
│   │   │   └── MutualAid.vue
│   │   ├── profile/           # 个人中心
│   │   │   ├── ProfileView.vue
│   │   │   ├── SettingsView.vue
│   │   │   └── PrivacySettings.vue
│   │   └── error/             # 错误页面
│   │       ├── 403.vue
│   │       ├── 404.vue
│   │       └── 500.vue
│   ├── App.vue                # 根组件
│   └── main.js                # 入口文件
├── tests/                     # 测试文件
│   ├── unit/                  # 单元测试
│   ├── integration/           # 集成测试
│   └── e2e/                   # 端到端测试
├── package.json               # 依赖配置
├── vite.config.js             # Vite配置
├── tailwind.config.js         # Tailwind配置
├── .eslintrc.js               # ESLint配置
└── .prettierrc                # Prettier配置
```

## 🧩 组件设计架构

### 1. 组件分层原则

```
┌─────────────────────────────────────┐
│           页面组件 (Views)            │  ← 业务页面，路由组件
├─────────────────────────────────────┤
│         布局组件 (Layouts)            │  ← 页面布局容器
├─────────────────────────────────────┤
│         业务组件 (Business)          │  ← 业务逻辑组件
├─────────────────────────────────────┤
│         通用组件 (Common)            │  ← 可复用UI组件
├─────────────────────────────────────┤
│         基础组件 (Base)               │  ← 原子级组件
└─────────────────────────────────────┘
```

### 2. 核心组件设计

#### 2.1 认证组件系列
```vue
<!-- 人脸识别登录组件 -->
<template>
  <div class="face-recognition-login">
    <video ref="videoElement" autoplay></video>
    <canvas ref="canvasElement" style="display: none;"></canvas>
    <div class="recognition-status">
      <el-icon v-if="isScanning"><Loading /></el-icon>
      <span>{{ statusText }}</span>
    </div>
    <div class="action-buttons">
      <el-button @click="startRecognition">开始识别</el-button>
      <el-button @click="switchToPassword">密码登录</el-button>
    </div>
  </div>
</template>
```

#### 2.2 语音交互组件
```vue
<!-- 方言语音助手组件 -->
<template>
  <div class="voice-assistant" :class="{ 'is-listening': isListening }">
    <div class="voice-button" @click="toggleVoiceRecognition">
      <el-icon><Microphone /></el-icon>
      <div class="voice-wave" v-if="isListening"></div>
    </div>
    <div class="voice-result" v-if="transcript">
      <p>{{ transcript }}</p>
      <el-button size="small" @click="executeCommand">执行</el-button>
    </div>
  </div>
</template>
```

#### 2.3 大字模式适配组件
```vue
<!-- 大字模式容器组件 -->
<template>
  <div class="large-font-container" :style="containerStyle">
    <slot></slot>
    <div class="font-size-controls">
      <el-button-group>
        <el-button size="large" @click="decreaseFontSize">A-</el-button>
        <el-button size="large" @click="resetFontSize">A</el-button>
        <el-button size="large" @click="increaseFontSize">A+</el-button>
      </el-button-group>
    </div>
  </div>
</template>
```

## 🛣️ 路由配置设计

### 1. 路由模块化结构

```javascript
// router/modules/auth.js - 认证路由模块
export const authRoutes = [
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/auth/Login.vue'),
        meta: {
          title: '用户登录',
          requiresAuth: false,
          layout: 'auth'
        }
      },
      {
        path: 'face-login',
        name: 'face-login',
        component: () => import('@/views/auth/FaceRecognition.vue'),
        meta: {
          title: '人脸识别登录',
          requiresAuth: false,
          layout: 'auth'
        }
      }
    ]
  }
]
```

### 2. 权限路由守卫

```javascript
// router/guards.js - 路由守卫
export const setupGuards = (router) => {
  router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()
    const themeStore = useThemeStore()
    
    // 设置页面标题
    document.title = to.meta.title ? `${to.meta.title} - 智慧乡村平台` : '智慧乡村平台'
    
    // 检查认证状态
    if (to.meta.requiresAuth && !userStore.isLoggedIn) {
      next('/auth/login')
      return
    }
    
    // 检查权限
    if (to.meta.permissions && !userStore.hasAnyPermission(to.meta.permissions)) {
      next('/403')
      return
    }
    
    // 角色重定向
    if (to.path === '/dashboard') {
      const roleRedirectMap = {
        'resident': '/village-affairs',
        'village_admin': '/admin-dashboard',
        'admin': '/admin-dashboard'
      }
      const redirectPath = roleRedirectMap[userStore.userRole] || '/village-affairs'
      next(redirectPath)
      return
    }
    
    next()
  })
}
```

## 📊 状态管理架构

### 1. Pinia Store设计

```javascript
// stores/userStore.js - 用户状态管理
export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref('')
  const userInfo = ref(null)
  const permissions = ref([])
  const preferences = ref({
    language: 'zh-CN',
    fontSize: 'normal',
    theme: 'default',
    voiceEnabled: true
  })
  
  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)
  const userRole = computed(() => userInfo.value?.role || '')
  const isElderlyUser = computed(() => {
    return userInfo.value?.age >= 60 || preferences.value.fontSize === 'large'
  })
  
  // 方法
  const login = async (credentials) => {
    // 登录逻辑
  }
  
  const logout = async () => {
    // 登出逻辑
  }
  
  const updatePreferences = (newPreferences) => {
    preferences.value = { ...preferences.value, ...newPreferences }
    localStorage.setItem('userPreferences', JSON.stringify(preferences.value))
  }
  
  return {
    token, userInfo, permissions, preferences,
    isLoggedIn, userRole, isElderlyUser,
    login, logout, updatePreferences
  }
})
```

### 2. 主题状态管理

```javascript
// stores/themeStore.js - 主题状态管理
export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref('default')
  const fontSize = ref('normal')
  const highContrast = ref(false)
  const isLargeFontMode = ref(false)
  
  const themes = {
    default: {
      primary: '#409eff',
      background: '#f5f5f5',
      text: '#303133'
    },
    dark: {
      primary: '#409eff',
      background: '#1a1a1a',
      text: '#e4e7ed'
    },
    highContrast: {
      primary: '#000000',
      background: '#ffffff',
      text: '#000000'
    }
  }
  
  const setTheme = (themeName) => {
    currentTheme.value = themeName
    document.documentElement.setAttribute('data-theme', themeName)
  }
  
  const setFontSize = (size) => {
    fontSize.value = size
    const fontSizes = {
      small: '14px',
      normal: '16px',
      large: '20px',
      xlarge: '24px'
    }
    document.documentElement.style.fontSize = fontSizes[size]
  }
  
  const toggleLargeFontMode = () => {
    isLargeFontMode.value = !isLargeFontMode.value
    document.body.classList.toggle('large-font-mode', isLargeFontMode.value)
  }
  
  return {
    currentTheme, fontSize, highContrast, isLargeFontMode,
    themes, setTheme, setFontSize, toggleLargeFontMode
  }
})
```

## 🎨 UI组件库封装

### 1. Element Plus主题定制

```scss
// style/element-plus-custom.scss
// 智慧乡村主题定制
:root {
  --el-color-primary: #409eff;
  --el-color-success: #67c23a;
  --el-color-warning: #e6a23c;
  --el-color-danger: #f56c6c;
  --el-color-info: #909399;
  
  // 大字模式变量
  --large-font-scale: 1.25;
  --large-button-height: 56px;
  --large-input-height: 56px;
}

// 大字模式样式
.large-font-mode {
  --el-font-size-base: calc(16px * var(--large-font-scale));
  --el-component-size-large: calc(40px * var(--large-font-scale));
  
  .el-button {
    height: var(--large-button-height);
    font-size: calc(14px * var(--large-font-scale));
    padding: 0 calc(20px * var(--large-font-scale));
  }
  
  .el-input__inner {
    height: var(--large-input-height);
    font-size: calc(14px * var(--large-font-scale));
  }
  
  .el-menu-item {
    height: calc(56px * var(--large-font-scale));
    line-height: calc(56px * var(--large-font-scale));
    font-size: calc(14px * var(--large-font-scale));
  }
}
```

### 2. 自定义业务组件

```vue
<!-- components/business/HouseholdQRCode.vue -->
<template>
  <div class="household-qr-code">
    <div class="qr-header">
      <h3>一户一码</h3>
      <el-tag type="success">{{ householdInfo.status }}</el-tag>
    </div>
    <div class="qr-code-container">
      <qr-code 
        :value="qrData" 
        :size="200"
        :level="'M'"
        class="qr-code"
      />
      <div class="household-info">
        <p><strong>户主:</strong> {{ householdInfo.headName }}</p>
        <p><strong>户号:</strong> {{ householdInfo.householdId }}</p>
        <p><strong>地址:</strong> {{ householdInfo.address }}</p>
      </div>
    </div>
    <div class="qr-actions">
      <el-button @click="downloadQRCode">下载二维码</el-button>
      <el-button @click="shareQRCode">分享</el-button>
      <el-button @click="printQRCode">打印</el-button>
    </div>
  </div>
</template>
```

## 🚀 性能优化策略

### 1. 代码分割与懒加载

```javascript
// 路由级别懒加载
const routes = [
  {
    path: '/village-management',
    component: () => import(
      /* webpackChunkName: "village-management" */ 
      '@/views/village/VillageManagement.vue'
    )
  }
]

// 组件级别懒加载
export default {
  components: {
    HeavyChart: () => import('@/components/charts/HeavyChart.vue')
  }
}
```

### 2. 资源优化配置

```javascript
// vite.config.js - 性能优化配置
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'element-plus': ['element-plus'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'utils': ['lodash-es', 'dayjs'],
          'charts': ['echarts']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus']
  }
})
```

### 3. 缓存策略

```javascript
// utils/cache.js - 缓存工具
class CacheManager {
  constructor() {
    this.cache = new Map()
    this.maxSize = 100
  }
  
  set(key, value, ttl = 300000) { // 5分钟默认TTL
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })
  }
  
  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }
}

export const cacheManager = new CacheManager()
```

## 🌐 国际化设计

### 1. 多语言支持结构

```javascript
// i18n/index.js - 国际化配置
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import pcc from './locales/pcc.json'
import pccQn from './locales/pcc-qn.json'

const messages = {
  'zh-CN': zhCN,
  'pcc': pcc,
  'pcc-qn': pccQn
}

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('language') || 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages
})

export default i18n
```

### 2. 方言支持示例

```json
// i18n/locales/pcc.json - 赣语方言
{
  "common": {
    "login": "登入",
    "logout": "登出",
    "submit": "提交",
    "cancel": "取消"
  },
  "village": {
    "announcements": "村务通知",
    "meetings": "村委会议",
    "finance": "财务公开"
  },
  "voice": {
    "start_listening": "开始听讲",
    "stop_listening": "停止听讲",
    "recognition_success": "识别成功"
  }
}
```

## 🔒 安全性设计

### 1. 权限控制指令

```javascript
// directives/permission.js - 权限指令
export const permissionDirective = {
  mounted(el, binding) {
    const userStore = useUserStore()
    const { value } = binding
    
    if (value && !userStore.hasAnyPermission(value)) {
      el.parentNode?.removeChild(el)
    }
  },
  updated(el, binding) {
    const userStore = useUserStore()
    const { value, oldValue } = binding
    
    if (value !== oldValue) {
      if (value && !userStore.hasAnyPermission(value)) {
        el.parentNode?.removeChild(el)
      }
    }
  }
}
```

### 2. 数据脱敏工具

```javascript
// utils/masking.js - 数据脱敏
export const dataMasking = {
  // 身份证号脱敏
  maskIdCard(idCard) {
    if (!idCard || idCard.length < 8) return idCard
    return idCard.substring(0, 4) + '********' + idCard.substring(idCard.length - 4)
  },
  
  // 手机号脱敏
  maskPhone(phone) {
    if (!phone || phone.length < 7) return phone
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4)
  },
  
  // 姓名脱敏
  maskName(name) {
    if (!name || name.length <= 1) return name
    if (name.length === 2) return name[0] + '*'
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  }
}
```

## 📱 移动端适配

### 1. 响应式断点设计

```scss
// style/variables.scss - 响应式变量
$breakpoints: (
  'mobile': 320px,
  'tablet': 768px,
  'desktop': 1024px,
  'large': 1440px
);

@mixin mobile {
  @media (max-width: map-get($breakpoints, 'tablet') - 1px) {
    @content;
  }
}

@mixin tablet {
  @media (min-width: map-get($breakpoints, 'tablet')) and (max-width: map-get($breakpoints, 'desktop') - 1px) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: map-get($breakpoints, 'desktop')) {
    @content;
  }
}
```

### 2. 移动端手势支持

```vue
<!-- components/common/GestureHandler.vue -->
<template>
  <div 
    ref="gestureContainer"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    class="gesture-container"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const gestureContainer = ref(null)
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0

const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchStartTime = Date.now()
}

const handleTouchMove = (e) => {
  // 防止默认滚动行为
  if (Math.abs(e.touches[0].clientY - touchStartY) > Math.abs(e.touches[0].clientX - touchStartX)) {
    return
  }
  e.preventDefault()
}

const handleTouchEnd = (e) => {
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY
  const touchEndTime = Date.now()
  
  const deltaX = touchEndX - touchStartX
  const deltaY = touchEndY - touchStartY
  const deltaTime = touchEndTime - touchStartTime
  
  // 检测滑动手势
  if (Math.abs(deltaX) > 50 && deltaTime < 300) {
    if (deltaX > 0) {
      emit('swipe-right')
    } else {
      emit('swipe-left')
    }
  }
}

const emit = defineEmits(['swipe-left', 'swipe-right'])
</script>
```

## 🎯 无障碍访问设计

### 1. ARIA标签配置

```vue
<!-- 具有无障碍访问的表单组件 -->
<template>
  <form 
    role="form" 
    aria-labelledby="form-title"
    @submit.prevent="handleSubmit"
  >
    <h2 id="form-title">{{ formTitle }}</h2>
    
    <div class="form-group">
      <label 
        for="username" 
        :class="{ 'required': required }"
        :aria-required="required"
      >
        用户名
      </label>
      <input 
        id="username"
        v-model="formData.username"
        type="text"
        :aria-describedby="usernameError ? 'username-error' : null"
        :aria-invalid="!!usernameError"
        @blur="validateField('username')"
      />
      <div 
        v-if="usernameError"
        id="username-error"
        role="alert"
        aria-live="polite"
        class="error-message"
      >
        {{ usernameError }}
      </div>
    </div>
  </form>
</template>
```

### 2. 键盘导航支持

```javascript
// utils/accessibility.js - 无障碍工具
export const accessibilityUtils = {
  // 焦点管理
  trapFocus(container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }
    
    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  },
  
  // 屏幕阅读器通知
  announceToScreenReader(message) {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', 'polite')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    setTimeout(() => document.body.removeChild(announcement), 1000)
  }
}
```

## 📊 架构性能指标

### 1. 性能目标
- **首次内容绘制 (FCP)**: < 1.5s
- **最大内容绘制 (LCP)**: < 2.5s
- **累积布局偏移 (CLS)**: < 0.1
- **首次输入延迟 (FID)**: < 100ms

### 2. Bundle大小目标
- **主Bundle**: < 200KB (gzipped)
- **Vendor Bundle**: < 300KB (gzipped)
- **总Bundle大小**: < 1MB (gzipped)

### 3. 兼容性目标
- **现代浏览器**: Chrome 90+, Firefox 88+, Safari 14+
- **移动端**: iOS 14+, Android 8+
- **屏幕分辨率**: 320px - 2560px

## 🔄 开发工作流

### 1. 组件开发规范
```bash
# 创建新组件
npm run create-component ComponentName

# 组件测试
npm run test:unit ComponentName

# 组件构建
npm run build:component ComponentName
```

### 2. 代码质量检查
```bash
# ESLint检查
npm run lint

# Prettier格式化
npm run format

# TypeScript检查
npm run type-check

# 可访问性检查
npm run test:a11y
```

## 📈 监控与分析

### 1. 性能监控
```javascript
// utils/performance.js - 性能监控
export const performanceMonitor = {
  // 页面加载性能
  measurePageLoad() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const metrics = {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        lcp: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime,
        loadTime: navigation.loadEventEnd - navigation.loadEventStart
      }
      
      // 发送到分析服务
      this.sendMetrics(metrics)
    })
  },
  
  // 用户交互性能
  measureInteraction(element, event) {
    const startTime = performance.now()
    
    element.addEventListener(event, () => {
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      this.sendMetrics({ interactionTime, element: element.tagName, event })
    })
  }
}
```

## 🎉 总结

本前端架构设计为智慧乡村综合服务平台提供了：

1. **完整的技术栈选型** - 基于Vue.js 3生态系统
2. **模块化的目录结构** - 清晰的代码组织
3. **组件化设计模式** - 可复用的UI组件
4. **响应式布局方案** - 移动端友好
5. **无障碍访问支持** - 符合WCAG标准
6. **性能优化策略** - 快速加载体验
7. **安全性设计** - 权限控制和数据保护
8. **国际化支持** - 多语言和方言
9. **开发工作流** - 规范的开发流程

该架构充分考虑了农村用户的特殊需求，包括大字模式、语音交互、移动端适配等，为构建一个用户友好、功能完善的智慧乡村平台奠定了坚实的技术基础。