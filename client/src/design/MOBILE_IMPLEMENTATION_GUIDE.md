# 智慧乡村移动端开发实施指南

> Vue3 + Vite + TailwindCSS 移动端适老化与离线功能实现指南
> 版本: 1.0.0
> 更新时间: 2025-12-28

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [开发环境搭建](#开发环境搭建)
4. [核心功能实现](#核心功能实现)
5. [组件使用指南](#组件使用指南)
6. [离线功能配置](#离线功能配置)
7. [性能优化实践](#性能优化实践)
8. [测试与调试](#测试与调试)
9. [部署上线](#部署上线)
10. [常见问题](#常见问题)

---

## 项目概述

### 目标用户特征

| 特征         | 描述                     | 设计考虑                     |
| ------------ | ------------------------ | ---------------------------- |
| **年龄**     | 55-75岁为主              | 大字体、高对比度、简单操作   |
| **视力**     | 多数存在老花、视力下降   | 至少 20px 基础字号，清晰图标 |
| **听力**     | 部分存在听力下降         | 提供音量调节、视觉反馈       |
| **认知**     | 学习能力较弱、记忆力下降 | 简化流程、清晰提示、容错设计 |
| **网络环境** | 乡村网络不稳定、信号弱   | 离线优先、数据同步、弱网优化 |

### 核心设计原则

1. **可读性优先**: 字体大小、对比度、行高都经过适老化优化
2. **易操作性**: 触摸区域最小 48x48dp，关键操作 64x64dp
3. **容错性**: 重要操作二次确认，提供撤销功能
4. **一致性**: 统一的视觉风格和交互模式
5. **离线友好**: 核心功能支持离线使用，联网后自动同步

---

## 技术栈

### 前端框架

```json
{
  "vue": "^3.3.8",
  "vue-router": "^4.2.5",
  "pinia": "^2.1.7",
  "vite": "^5.0.0"
}
```

### UI 框架

```json
{
  "element-plus": "^2.4.4",
  "tailwindcss": "^3.4.0",
  "@element-plus/icons-vue": "^2.1.0"
}
```

### 移动端增强

```json
{
  "axios": "^1.6.2",
  "dayjs": "^1.11.10",
  "socket.io-client": "^4.8.1"
}
```

### 新增依赖（需安装）

```bash
npm install --save-dev workbox-webpack-plugin
npm install idb
```

---

## 开发环境搭建

### 1. 安装依赖

```bash
# 安装所有依赖
npm install

# 或使用 pnpm
pnpm install
```

### 2. 配置开发服务器

已配置 `vite.config.js`，支持以下功能：

- **热模块替换 (HMR)**: 开发时实时更新
- **代理配置**: 自动代理 API 请求到后端服务器
- **端口配置**: 客户端运行在 3006 端口

```javascript
// vite.config.js
export default defineConfig({
  server: {
    port: 3006,
    host: '0.0.0.0',
    proxy: {
      // API 代理配置...
    },
  },
});
```

### 3. 启动开发服务器

```bash
# 启动客户端开发服务器
npm run client

# 或同时启动主服务器和客户端
npm run dev && npm run client
```

访问: `http://localhost:3006`

---

## 核心功能实现

### 1. 适老化设计系统

#### 1.1 启用大字模式

在 `main.js` 中添加全局类：

```javascript
// 检测用户偏好
const prefersLargeText = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 应用大字模式
if (prefersLargeText || localStorage.getItem('elderly-mode') === 'true') {
  document.body.classList.add('elderly-mode');
}
```

#### 1.2 使用适老化组件

```vue
<template>
  <div class="elderly-page">
    <!-- 使用适老化按钮 -->
    <ElderlyButton type="primary" size="large" @click="handleSubmit"> 提交申请 </ElderlyButton>

    <!-- 使用适老化卡片 -->
    <ElderlyCard
      title="公告标题"
      subtitle="2025-12-28"
      icon="el-icon-bell"
      type="primary"
      :clickable="true"
      @click="viewAnnouncement"
    >
      这是公告内容...
    </ElderlyCard>
  </div>
</template>

<script setup>
import ElderlyButton from '@/components/elderly/ElderlyButton.vue';
import ElderlyCard from '@/components/elderly/ElderlyCard.vue';
</script>
```

### 2. 移动端响应式布局

#### 2.1 使用移动端适配插件

项目已内置移动端适配插件，自动处理：

- 触摸事件
- 安全区域（适配刘海屏）
- 屏幕方向变化
- 响应式断点

```javascript
// 在组件中使用
const deviceInfo = this.$getDeviceInfo();
const isMobile = this.$isMobile();
```

#### 2.2 响应式断点

```scss
// 使用 Tailwind CSS 响应式类
<div class="
  // 小屏幕: 12px 内边距
  p-3

  // 中等屏幕: 16px 内边距
  md:p-4

  // 大屏幕: 20px 内边距
  lg:p-5
">
  内容...
</div>
```

#### 2.3 安全区域适配

```scss
// 适配刘海屏
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 3. 语音交互

#### 3.1 语音识别

```javascript
import speechApi from '@/api/speech';

// 开始语音识别
async function startVoiceRecognition() {
  try {
    // 检查浏览器支持
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别');
      return;
    }

    // 创建识别实例
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // 配置识别选项
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    // 开始识别
    recognition.start();

    // 识别结果
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      console.log('识别结果:', transcript);
      // 处理识别结果...
    };

    // 识别错误
    recognition.onerror = event => {
      console.error('识别错误:', event.error);
    };

    // 识别结束
    recognition.onend = () => {
      console.log('识别结束');
    };
  } catch (error) {
    console.error('语音识别失败:', error);
  }
}
```

#### 3.2 语音合成（TTS）

```javascript
// 文本转语音
async function textToSpeech(text, options = {}) {
  try {
    const audioUrl = await speechApi.textToSpeech(text, options.emotion);

    // 播放音频
    const audio = new Audio(audioUrl);
    audio.play();

    // 音频播放结束
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl); // 释放内存
    };
  } catch (error) {
    console.error('语音合成失败:', error);
  }
}

// 老年人友好语音（更慢、更响亮）
await textToSpeech('欢迎使用智慧乡村平台', {
  speed: 40, // 语速（0-100）
  volume: 60, // 音量（0-100）
  emotion: 'friendly',
});
```

### 4. 离线功能

#### 4.1 注册 Service Worker

在 `main.js` 中注册：

```javascript
import { register } from '@/services/serviceWorkerRegister';

// 注册 Service Worker
register({
  onUpdate: registration => {
    // 新版本可用
    console.log('新版本可用，请刷新页面');

    // 显示更新提示
    if (confirm('发现新版本，是否立即更新？')) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  },
  onSuccess: registration => {
    // 内容已缓存
    console.log('应用已缓存，可离线使用');
  },
});
```

#### 4.2 使用离线存储

```javascript
import offlineService from '@/services/offlineService';

// 缓存数据
await offlineService.cacheData('announcements', announcementsData, 3600000);

// 获取缓存数据
const cachedData = await offlineService.getCachedData('announcements');

// 添加到离线队列
await offlineService.addToQueue(
  '/api/v1/suggestions',
  'POST',
  { content: '建议内容', category: '环境' },
  { headers: { Authorization: `Bearer ${token}` } }
);

// 获取离线队列
const queue = await offlineService.getQueue();

// 同步队列（网络恢复时自动执行）
await offlineService.syncQueue();
```

#### 4.3 请求拦截器

配置 Axios 拦截器，自动处理离线请求：

```javascript
import axios from 'axios';
import offlineService from '@/services/offlineService';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(async config => {
  // 检查网络状态
  if (!navigator.onLine) {
    // 离线状态，添加到队列
    await offlineService.addToQueue(config.url, config.method.toUpperCase(), config.data, {
      headers: config.headers,
    });

    // 返回 Promise.reject，触发错误处理
    return Promise.reject({ offline: true, config });
  }

  // 在线状态，正常请求
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.offline) {
      // 离线请求已加入队列，提示用户
      return Promise.reject({
        message: '当前离线，您的请求将在联网后自动发送',
        queued: true,
      });
    }

    // 其他错误
    return Promise.reject(error);
  }
);

export default api;
```

### 5. 性能优化

#### 5.1 图片懒加载

```vue
<template>
  <div>
    <!-- 使用 v-lazy 指令 -->
    <img v-lazy="imageUrl" alt="图片" />

    <!-- 或使用组件 -->
    <LazyImage :src="imageUrl" :placeholder="placeholderUrl" />
  </div>
</template>

<script setup>
import { lazyLoadDirective } from '@/utils/performanceOptimizer';

const imageUrl = '/path/to/image.jpg';
</script>
```

#### 5.2 虚拟列表

```vue
<template>
  <div
    ref="containerRef"
    class="virtual-list"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <div
      class="virtual-list-content"
      :style="{ height: totalHeight + 'px', transform: `translateY(${offset}px)` }"
    >
      <div
        v-for="item in visibleData"
        :key="item.id"
        class="list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        {{ item.content }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useVirtualList } from '@/utils/performanceOptimizer'

const items = ref([...]) // 所有数据项
const itemHeight = 80     // 每项高度
const containerHeight = 600 // 容器高度

const { containerRef, visibleData, handleScroll } = useVirtualList({
  items,
  itemHeight,
  containerHeight,
  overscan: 5
})

const totalHeight = computed(() => items.length * itemHeight)
const offset = computed(() => visibleData.value.offset)
</script>
```

#### 5.3 路由懒加载

```javascript
// router/index.js
const routes = [
  {
    path: '/announcements',
    name: 'Announcements',
    component: () => import('@/views/announcements/AnnouncementsView.vue'),
    meta: { title: '公告通知', keepAlive: true },
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import('@/views/services/ServicesView.vue'),
    meta: { title: '村务服务', keepAlive: true },
  },
];
```

#### 5.4 组件懒加载

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

// 懒加载组件
const HeavyComponent = defineAsyncComponent(() => import('@/components/HeavyComponent.vue'));
</script>
```

---

## 组件使用指南

### ElderlyButton 组件

#### Props

| 属性              | 类型    | 默认值    | 说明                                                    |
| ----------------- | ------- | --------- | ------------------------------------------------------- |
| type              | String  | 'primary' | 按钮类型：primary/secondary/success/warning/danger/text |
| size              | String  | 'large'   | 尺寸：small/medium/large/extra-large                    |
| icon              | String  | ''        | 图标类名                                                |
| disabled          | Boolean | false     | 是否禁用                                                |
| loading           | Boolean | false     | 是否加载中                                              |
| plain             | Boolean | false     | 是否显示轮廓                                            |
| round             | Boolean | false     | 是否圆角                                                |
| longPressConfirm  | Boolean | false     | 是否需要长按确认                                        |
| longPressDuration | Number  | 800       | 长按确认时长(ms)                                        |

#### Events

| 事件名     | 说明     | 参数  |
| ---------- | -------- | ----- |
| click      | 点击事件 | event |
| long-press | 长按事件 | event |

#### 示例

```vue
<template>
  <!-- 基础用法 -->
  <ElderlyButton type="primary" size="large"> 主要按钮 </ElderlyButton>

  <!-- 带图标 -->
  <ElderlyButton type="success" icon="el-icon-check"> 确认操作 </ElderlyButton>

  <!-- 加载状态 -->
  <ElderlyButton type="primary" :loading="true"> 提交中... </ElderlyButton>

  <!-- 长按确认（危险操作） -->
  <ElderlyButton type="danger" :long-press-confirm="true" @long-press="handleDelete">
    删除
  </ElderlyButton>
</template>
```

### ElderlyCard 组件

#### Props

| 属性       | 类型    | 默认值    | 说明                                         |
| ---------- | ------- | --------- | -------------------------------------------- |
| title      | String  | ''        | 卡片标题                                     |
| subtitle   | String  | ''        | 副标题                                       |
| icon       | String  | ''        | 图标类名                                     |
| type       | String  | 'default' | 类型：default/primary/success/warning/danger |
| clickable  | Boolean | false     | 是否可点击                                   |
| showArrow  | Boolean | false     | 是否显示箭头                                 |
| status     | String  | ''        | 状态文本                                     |
| statusType | String  | 'info'    | 状态类型：success/warning/danger/info        |
| shadow     | String  | 'medium'  | 阴影级别：none/light/medium/heavy            |

#### Events

| 事件名 | 说明     | 参数  |
| ------ | -------- | ----- |
| click  | 点击事件 | event |

#### 示例

```vue
<template>
  <!-- 基础卡片 -->
  <ElderlyCard title="公告标题" icon="el-icon-bell"> 这是卡片内容... </ElderlyCard>

  <!-- 可点击卡片 -->
  <ElderlyCard
    title="我的申请"
    subtitle="3 条记录"
    icon="el-icon-document"
    type="primary"
    :clickable="true"
    :show-arrow="true"
    @click="navigateTo('/my-applications')"
  />

  <!-- 带状态卡片 -->
  <ElderlyCard title="设施报修" status="处理中" status-type="warning"> 报修内容... </ElderlyCard>
</template>
```

### ElderlyForm 组件

#### Props

| 属性          | 类型    | 默认值  | 说明                     |
| ------------- | ------- | ------- | ------------------------ |
| items         | Array   | []      | 表单项配置               |
| modelValue    | Object  | {}      | 表单数据                 |
| rules         | Object  | {}      | 验证规则                 |
| labelPosition | String  | 'top'   | 标签位置：left/right/top |
| labelWidth    | String  | '120px' | 标签宽度                 |
| showActions   | Boolean | true    | 是否显示操作按钮         |
| showCancel    | Boolean | true    | 是否显示取消按钮         |
| submitText    | String  | '提交'  | 提交按钮文本             |
| cancelText    | String  | '取消'  | 取消按钮文本             |

#### Events

| 事件名 | 说明     | 参数        |
| ------ | -------- | ----------- |
| submit | 提交事件 | formData    |
| cancel | 取消事件 | -           |
| blur   | 失焦事件 | prop, value |
| focus  | 聚焦事件 | prop, value |

#### 表单项配置

```javascript
const formItems = [
  {
    prop: 'name',
    label: '姓名',
    type: 'input',
    required: true,
    placeholder: '请输入姓名',
    maxlength: 20,
    helper: '请填写真实姓名',
  },
  {
    prop: 'phone',
    label: '手机号',
    type: 'input',
    inputType: 'tel',
    required: true,
    placeholder: '请输入手机号',
    maxlength: 11,
  },
  {
    prop: 'category',
    label: '建议类别',
    type: 'select',
    required: true,
    options: [
      { label: '环境卫生', value: 'environment' },
      { label: '基础设施', value: 'infrastructure' },
      { label: '公共安全', value: 'security' },
    ],
  },
  {
    prop: 'content',
    label: '建议内容',
    type: 'textarea',
    required: true,
    rows: 6,
    maxlength: 500,
    showWordLimit: true,
  },
];
```

#### 示例

```vue
<template>
  <ElderlyForm
    :items="formItems"
    v-model="formData"
    :rules="formRules"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
</template>

<script setup>
import { ref } from 'vue';

const formData = ref({
  name: '',
  phone: '',
  category: '',
  content: '',
});

const formRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择建议类别', trigger: 'change' }],
  content: [
    { required: true, message: '请输入建议内容', trigger: 'blur' },
    { min: 10, message: '建议内容至少 10 个字', trigger: 'blur' },
  ],
};

const handleSubmit = data => {
  console.log('提交表单:', data);
  // 发送请求...
};

const handleCancel = () => {
  // 返回上一页
  router.back();
};
</script>
```

---

## 离线功能配置

### Service Worker 配置

#### 1. 缓存策略

已实现三种缓存策略：

| 策略              | 适用场景             | 说明                         |
| ----------------- | -------------------- | ---------------------------- |
| **Cache First**   | 静态资源、GET 请求   | 优先使用缓存，后台更新       |
| **Network First** | POST/PUT/DELETE 请求 | 优先网络请求，失败时使用缓存 |
| **Network Only**  | 实时数据、认证请求   | 仅使用网络，不缓存           |

#### 2. 缓存配置

```javascript
// service-worker.js

// 预缓存静态资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/js/main.js',
  '/assets/css/main.css',
];

// API 缓存模式
const CACHE_API_PATTERNS = [
  /\/api\/v1\/announcements/, // 公告列表
  /\/api\/v1\/notifications/, // 通知列表
  /\/api\/v1\/committees/, // 村委信息
];

// 不缓存的 API
const NO_CACHE_PATTERNS = [
  /\/api\/auth/, // 认证相关
  /\/api\/upload/, // 文件上传
  /\/socket\.io/, // WebSocket
];
```

#### 3. 自定义缓存规则

```javascript
// 在 service-worker.js 的 handleAPIRequest 函数中添加自定义规则

if (url.pathname.startsWith('/api/v1/custom')) {
  // 自定义 API 的缓存策略
  return customCacheStrategy(request);
}
```

### IndexedDB 配置

#### 数据存储结构

```javascript
// 数据库: SmartVillageOfflineDB
// 版本: 1

// 1. offline_queue (离线操作队列)
{
  id: 1,              // 自增主键
  endpoint: '/api/xxx',
  method: 'POST',
  data: {...},
  options: {...},
  timestamp: 1234567890,
  status: 'pending',
  retryCount: 0
}

// 2. offline_cache (离线缓存)
{
  key: 'announcements',
  data: [...],
  timestamp: 1234567890,
  ttl: 1234567890  // 过期时间
}

// 3. sync_log (同步日志)
{
  id: 1,
  type: 'queue',
  status: 'success',
  data: {...},
  timestamp: 1234567890
}

// 4. attachments (附件缓存)
{
  id: 'attachment-id',
  type: 'image',
  data: Blob,
  timestamp: 1234567890
}
```

#### 使用 IndexedDB

```javascript
import offlineService from '@/services/offlineService'

// 缓存数据（1小时过期）
await offlineService.cacheData('key', data, 3600000)

// 获取缓存
const data = await offlineService.getCachedData('key')

// 移除缓存
await offlineService.removeCachedData('key')

// 清理过期缓存
await offlineService.cleanExpiredCache()

// 添加到离线队列
await offlineService.addToQueue('/api/xxx', 'POST', {...})

// 获取队列
const queue = await offlineService.getQueue()

// 同步队列
await offlineService.syncQueue()

// 清空所有数据
await offlineService.clearAll()

// 获取存储使用情况
const usage = await offlineService.getStorageUsage()
console.log(`已使用: ${usage.usagePercent}%`)
```

---

## 性能优化实践

### 1. 代码分割

#### 路由级分割

```javascript
// router/index.js
const routes = [
  {
    path: '/home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/announcements',
    component: () => import('@/views/announcements/Index.vue'),
  },
];
```

#### 组件级分割

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent({
  loader: () => import('@/components/HeavyComponent.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200,
  timeout: 3000,
});
</script>
```

### 2. 资源优化

#### 图片优化

```javascript
import { getResponsiveImageUrl } from '@/utils/performanceOptimizer';

// 生成响应式图片 URL
const imageUrl = getResponsiveImageUrl('/api/images/123.jpg', 400, 300);

// 使用 WebP 格式
const supportsWebP = await supportsWebP();
if (supportsWebP) {
  imageUrl += '&format=webp';
}
```

#### 字体优化

```scss
// 使用系统字体栈，减少加载时间
font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;

// 或使用 font-display: swap
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; // 立即显示后备字体
}
```

### 3. 渲染优化

#### 虚拟列表

用于渲染大量数据（如村民列表、公告列表）：

```vue
<template>
  <VirtualList :items="items" :item-height="80" :container-height="600" :overscan="5">
    <template #default="{ item }">
      <div class="list-item">{{ item.name }}</div>
    </template>
  </VirtualList>
</template>
```

#### 防抖与节流

```javascript
import { debounce, throttle } from '@/utils/performanceOptimizer';

// 搜索输入防抖
const handleSearch = debounce(value => {
  console.log('搜索:', value);
}, 500);

// 滚动事件节流
const handleScroll = throttle(() => {
  console.log('滚动位置:', window.scrollY);
}, 200);
```

### 4. 网络优化

#### 请求缓存

```javascript
import { useRequestCache } from '@/utils/performanceOptimizer';

const { cachedFetch } = useRequestCache();

// 缓存请求结果（1分钟）
const data = await cachedFetch('announcements', fetchAnnouncements, {
  ttl: 60000,
});
```

#### 请求去重

```javascript
import { useRequestDeduplication } from '@/utils/performanceOptimizer';

const { deduplicatedFetch } = useRequestDeduplication();

// 相同请求只发送一次
const data = await deduplicatedFetch('user-info', fetchUserInfo);
```

---

## 测试与调试

### 1. Chrome DevTools

#### 移动端模拟

1. 打开 DevTools (F12)
2. 点击设备工具栏图标（Ctrl+Shift+M）
3. 选择设备或自定义尺寸

#### 网络节流

1. 打开 Network 面板
2. 选择 "Throttling" 下拉菜单
3. 选择 "Offline" 或 "Slow 3G"

#### Service Worker 调试

1. 打开 Application 面板
2. 左侧选择 "Service Workers"
3. 查看 Service Worker 状态
4. 勾选 "Update on reload" 强制更新

### 2. Lighthouse 性能测试

```bash
# 在 Chrome DevTools 中运行 Lighthouse
# 或使用 CLI

npm install -g lighthouse
lighthouse http://localhost:3006 --view
```

#### 性能指标目标

| 指标    | 目标值  | 说明         |
| ------- | ------- | ------------ |
| **FCP** | < 1.8s  | 首次内容绘制 |
| **LCP** | < 2.5s  | 最大内容绘制 |
| **FID** | < 100ms | 首次输入延迟 |
| **CLS** | < 0.1   | 累积布局偏移 |
| **TTI** | < 3.8s  | 可交互时间   |

### 3. 离线功能测试

#### 测试离线缓存

1. 打开应用
2. 访问几个页面
3. 在 DevTools 中选择 "Offline"
4. 刷新页面，验证功能是否正常

#### 测试离线队列

1. 离线状态下提交表单
2. 验证是否添加到队列
3. 恢复网络连接
4. 验证是否自动同步

---

## 部署上线

### 1. 构建生产版本

```bash
# 构建客户端
npm run build

# 构建结果在 dist/ 目录
```

### 2. 配置 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Service Worker
    location /service-worker.js {
        add_header Cache-Control 'no-cache';
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control 'public, immutable';
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### 3. HTTPS 配置

```bash
# 使用 Let's Encrypt 免费 SSL 证书
sudo certbot --nginx -d your-domain.com
```

### 4. 环境变量配置

```bash
# .env.production
NODE_ENV=production
VITE_API_BASE_URL=https://your-domain.com/api
VITE_WS_BASE_URL=wss://your-domain.com
```

---

## 常见问题

### Q1: Service Worker 不更新？

**A**: 强制刷新或跳过等待

```javascript
// 在 main.js 中
register({
  onUpdate: registration => {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  },
});
```

### Q2: 离线队列不同步？

**A**: 检查网络状态和 Service Worker

```javascript
// 监听网络状态
window.addEventListener('online', () => {
  console.log('网络已连接，开始同步');
  offlineService.syncQueue();
});
```

### Q3: 图片加载慢？

**A**: 使用懒加载和响应式图片

```vue
<img v-lazy="responsiveImageUrl" alt="图片" />
```

### Q4: 字体太小，老年人看不清？

**A**: 启用大字模式

```javascript
// 全局启用
document.body.classList.add('elderly-mode');

// 或在设置中切换
localStorage.setItem('elderly-mode', 'true');
```

### Q5: 语音识别不准确？

**A**: 调整识别参数或使用方言识别

```javascript
// 使用自动方言检测
const result = await speechApi.recognize(audioBlob, {
  dialect: 'auto',
  domain: 'village', // 乡村领域优化
});
```

### Q6: 虚拟列表不渲染？

**A**: 检查容器高度和数据项高度

```javascript
// 确保设置正确的容器高度
const containerHeight = ref(600);
const itemHeight = ref(80);
```

### Q7: IndexedDB 存储满了？

**A**: 清理过期缓存或增加存储配额

```javascript
// 清理过期缓存
await offlineService.cleanExpiredCache();

// 检查存储使用情况
const usage = await offlineService.getStorageUsage();
if (usage.usagePercent > 80) {
  alert('存储空间不足，请清理缓存');
}
```

---

## 附录

### A. 设计资源

- [适老化设计系统规范](./ELDERLY_FRIENDLY_DESIGN_SYSTEM.md)
- [Element Plus 组件库](https://element-plus.org/zh-CN/)
- [Vant 移动端组件库](https://vant-ui.github.io/vant/)

### B. 开发工具

- **Vue DevTools**: Vue.js 浏览器开发者工具
- **Lighthouse**: 网页性能测试工具
- **Workbox**: Service Worker 开发工具

### C. 参考资料

- [Web Accessibility Initiative (WAI)](https://www.w3.org/WAI/)
- [Progressive Web App (PWA)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [WCAG 2.1 标准](https://www.w3.org/WAI/WCAG21/quickref/)

---

**文档版本**: 1.0.0
**最后更新**: 2025-12-28
**维护团队**: 智慧乡村项目组
