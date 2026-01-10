# 智慧乡村移动端设计与技术实现方案

> Vue3 + Vite + TailwindCSS 移动端适老化与离线功能完整解决方案
>
> 面向老年用户的乡村综合服务平台 - 设计规范与技术实现指南

---

## 项目概述

### 设计目标

本方案为智慧乡村项目提供一套完整的移动端适老化设计和技术实现方案，特别针对以下用户特征：

| 用户特征            | 设计应对                   | 技术实现                   |
| ------------------- | -------------------------- | -------------------------- |
| **55-75岁老年用户** | 大字体、高对比度、简化操作 | 适老化组件库、大字模式     |
| **视力下降**        | 清晰图标、放大触控区域     | 48-64dp 最小点击区域       |
| **听力障碍**        | 语音播报、视觉反馈         | TTS语音合成、触觉反馈      |
| **学习困难**        | 容错设计、引导提示         | 二次确认、操作撤销         |
| **网络不稳定**      | 离线优先、自动同步         | Service Worker + IndexedDB |

### 核心特性

#### 1. 适老化设计

- **大字模式**: 基础字号 18-20px，最大支持 32px
- **高对比度**: 文字与背景对比度 ≥ 4.5:1
- **大触控区**: 最小 48x48dp，关键操作 64x64dp
- **简化流程**: 核心功能不超过 3 步完成

#### 2. 语音交互

- **语音识别**: 支持普通话和 22 种方言
- **语音播报**: 老年人友好语音（慢速、响亮）
- **实时反馈**: 识别进度和结果实时显示

#### 3. 离线功能

- **离线缓存**: 核心数据本地缓存
- **离线操作**: 支持离线填写表单、提交建议
- **自动同步**: 联网后自动同步离线操作

#### 4. 性能优化

- **代码分割**: 路由级和组件级懒加载
- **虚拟列表**: 大数据量列表优化
- **图片优化**: 懒加载、响应式图片、WebP格式
- **请求优化**: 缓存、去重、节流

---

## 文档结构

```
client/src/design/
├── README.md                                    # 本文档
├── ELDERLY_FRIENDLY_DESIGN_SYSTEM.md            # 适老化设计系统规范
├── MOBILE_IMPLEMENTATION_GUIDE.md               # 移动端实施指南
└── ../components/elderly/                       # 适老化组件库
    ├── ElderlyButton.vue                        # 适老化按钮
    ├── ElderlyCard.vue                          # 适老化卡片
    └── ElderlyForm.vue                          # 适老化表单
```

---

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd smart-village-platform/client

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问: `http://localhost:3006`

### 2. 启用大字模式

在 `main.js` 中添加：

```javascript
// 检测用户偏好
const prefersLargeText = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersLargeText || localStorage.getItem('elderly-mode') === 'true') {
  document.body.classList.add('elderly-mode');
}
```

### 3. 使用适老化组件

```vue
<template>
  <!-- 适老化按钮 -->
  <ElderlyButton type="primary" size="large" @click="handleSubmit"> 提交申请 </ElderlyButton>

  <!-- 适老化卡片 -->
  <ElderlyCard title="公告" icon="el-icon-bell" type="primary"> 公告内容... </ElderlyCard>
</template>

<script setup>
import ElderlyButton from '@/components/elderly/ElderlyButton.vue';
import ElderlyCard from '@/components/elderly/ElderlyCard.vue';
</script>
```

### 4. 配置离线功能

```javascript
// main.js
import { register } from '@/services/serviceWorkerRegister';

register({
  onUpdate: registration => {
    console.log('新版本可用');
  },
  onSuccess: registration => {
    console.log('内容已缓存，可离线使用');
  },
});
```

---

## 核心组件

### ElderlyButton - 适老化按钮

**特性**:

- 超大点击区域（56-64px 高度）
- 触觉反馈支持
- 长按确认（危险操作）
- 加载状态显示
- 渐变色彩、清晰阴影

**示例**:

```vue
<ElderlyButton type="primary" size="large" icon="el-icon-check">
  确认提交
</ElderlyButton>

<ElderlyButton type="danger" :long-press-confirm="true" @long-press="handleDelete">
  删除
</ElderlyButton>
```

### ElderlyCard - 适老化卡片

**特性**:

- 清晰的视觉层次
- 状态标签显示
- 点击反馈
- 多种主题色彩

**示例**:

```vue
<ElderlyCard
  title="我的申请"
  subtitle="3 条记录"
  icon="el-icon-document"
  type="primary"
  :clickable="true"
  @click="navigateTo('/applications')"
>
  申请内容...
</ElderlyCard>
```

### ElderlyForm - 适老化表单

**特性**:

- 大字号输入框（56px 高度）
- 实时校验提示
- 清晰的错误反馈
- 支持多种输入类型

**示例**:

```vue
<ElderlyForm :items="formItems" v-model="formData" :rules="formRules" @submit="handleSubmit" />
```

---

## 技术架构

### 前端技术栈

```
├── Vue 3.3                    # 渐进式框架
├── Vue Router 4.2             # 路由管理
├── Pinia 2.1                  # 状态管理
├── Vite 5.0                   # 构建工具
├── Element Plus 2.4           # UI 组件库
├── TailwindCSS 3.4            # CSS 框架
└── Axios 1.6                  # HTTP 客户端
```

### 移动端增强

```
├── 移动端适配插件             # 响应式布局、触摸事件
├── 语音识别 API               # Web Speech API
├── 语音合成 API               # Baidu TTS
├── Service Worker             # 离线缓存
├── IndexedDB                  # 本地存储
└── Socket.IO                  # 实时通信
```

### 性能优化

```
├── 代码分割                   # 路由级、组件级懒加载
├── 虚拟列表                   # 大数据量优化
├── 图片懒加载                 # Intersection Observer
├── 请求缓存                   # HTTP 缓存策略
└── 防抖节流                   # 事件优化
```

---

## 设计规范

### 颜色系统

```scss
// 主色调 - 温暖的红色
$primary: #e85d4c;

// 辅助色 - 稳重的绿色
$secondary: #52a885;

// 功能色
$success: #67c23a;
$warning: #e6a23c;
$danger: #f56c6c;

// 中性色（高对比度）
$text-primary: #1a1a1a; // 对比度 > 7:1
$text-secondary: #4a4a4a; // 对比度 > 4.5:1
$bg-primary: #ffffff;
$bg-secondary: #f5f5f5;
```

### 字体系统

```scss
// 适老化字号（比常规大 20%）
$font-size-xs: 14px; // 辅助说明
$font-size-sm: 16px; // 次要信息
$font-size-base: 18px; // 正文
$font-size-md: 20px; // 小标题
$font-size-lg: 24px; // 标题
$font-size-xl: 32px; // 重要标题

// 行高（宽松行高，提高可读性）
$line-height-loose: 1.8;
$line-height-normal: 1.6;
```

### 间距系统

```scss
// 适老化间距（比常规大 50%）
$spacing-xs: 12px;
$spacing-sm: 24px;
$spacing-md: 36px;
$spacing-lg: 48px;
$spacing-xl: 60px;

// 组件内边距
$button-padding: 16px 32px; // 高度 56px
$input-padding: 14px 16px; // 高度 56px
$card-padding: 24px;
```

### 组件尺寸

| 组件       | 尺寸          | 说明           |
| ---------- | ------------- | -------------- |
| **按钮**   | 56px 高度     | 最小点击区域   |
| **输入框** | 56px 高度     | 防止 iOS 缩放  |
| **卡片**   | 24px 内边距   | 清晰的内容区域 |
| **列表项** | 80px 最小高度 | 足够的点击区域 |
| **导航栏** | 72px 高度     | 底部导航       |

---

## 离线功能

### Service Worker

**缓存策略**:

| 策略          | 适用场景           | 说明                 |
| ------------- | ------------------ | -------------------- |
| Cache First   | 静态资源、GET 请求 | 优先缓存，后台更新   |
| Network First | POST/PUT/DELETE    | 优先网络，失败用缓存 |
| Network Only  | 实时数据、认证     | 仅网络，不缓存       |

**配置文件**: `/public/service-worker.js`

### IndexedDB

**存储结构**:

```javascript
SmartVillageOfflineDB (v1.0.0)
├── offline_queue      // 离线操作队列
├── offline_cache      // 离线缓存数据
├── sync_log          // 同步日志
└── attachments       // 附件缓存
```

**使用示例**:

```javascript
import offlineService from '@/services/offlineService'

// 缓存数据（1小时过期）
await offlineService.cacheData('key', data, 3600000)

// 获取缓存
const data = await offlineService.getCachedData('key')

// 添加到离线队列
await offlineService.addToQueue('/api/xxx', 'POST', {...})

// 同步队列
await offlineService.syncQueue()
```

---

## 性能优化

### 代码分割

```javascript
// 路由懒加载
const routes = [
  {
    path: '/home',
    component: () => import('@/views/Home.vue'),
  },
];

// 组件懒加载
const HeavyComponent = defineAsyncComponent(() => import('@/components/HeavyComponent.vue'));
```

### 图片优化

```vue
<!-- 图片懒加载 -->
<img v-lazy="imageUrl" alt="图片" />
```

### 虚拟列表

```vue
<VirtualList :items="items" :item-height="80" :container-height="600">
  <template #default="{ item }">
    <div>{{ item.name }}</div>
  </template>
</VirtualList>
```

### 请求优化

```javascript
import { useRequestCache } from '@/utils/performanceOptimizer';

const { cachedFetch } = useRequestCache();

// 缓存请求结果
const data = await cachedFetch('announcements', fetchAnnouncements, {
  ttl: 60000, // 缓存1分钟
});
```

---

## 测试与调试

### Chrome DevTools

**移动端模拟**:

1. 打开 DevTools (F12)
2. 点击设备工具栏图标 (Ctrl+Shift+M)
3. 选择设备或自定义尺寸

**网络节流**:

1. 打开 Network 面板
2. 选择 "Throttling" 下拉菜单
3. 选择 "Offline" 或 "Slow 3G"

**Service Worker 调试**:

1. 打开 Application 面板
2. 左侧选择 "Service Workers"
3. 查看状态、勾选 "Update on reload"

### Lighthouse 测试

```bash
# 安装 Lighthouse
npm install -g lighthouse

# 运行测试
lighthouse http://localhost:3006 --view
```

**性能指标目标**:

| 指标 | 目标值  | 说明         |
| ---- | ------- | ------------ |
| FCP  | < 1.8s  | 首次内容绘制 |
| LCP  | < 2.5s  | 最大内容绘制 |
| FID  | < 100ms | 首次输入延迟 |
| CLS  | < 0.1   | 累积布局偏移 |
| TTI  | < 3.8s  | 可交互时间   |

---

## 部署指南

### 1. 构建生产版本

```bash
npm run build
```

### 2. Nginx 配置

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
    gzip_types text/plain text/css application/json application/javascript;
}
```

### 3. HTTPS 配置

```bash
# 使用 Let's Encrypt 免费 SSL 证书
sudo certbot --nginx -d your-domain.com
```

---

## 常见问题

### Q: 如何启用大字模式？

```javascript
// 全局启用
document.body.classList.add('elderly-mode');

// 持久化保存
localStorage.setItem('elderly-mode', 'true');
```

### Q: Service Worker 不更新？

```javascript
// 强制更新
register({
  onUpdate: registration => {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  },
});
```

### Q: 离线队列不同步？

```javascript
// 监听网络状态
window.addEventListener('online', () => {
  offlineService.syncQueue();
});
```

---

## 文档索引

| 文档               | 路径                                      | 说明                         |
| ------------------ | ----------------------------------------- | ---------------------------- |
| **设计系统规范**   | `ELDERLY_FRIENDLY_DESIGN_SYSTEM.md`       | 颜色、字体、组件、交互规范   |
| **实施指南**       | `MOBILE_IMPLEMENTATION_GUIDE.md`          | 开发环境、功能实现、组件使用 |
| **适老化按钮**     | `../components/elderly/ElderlyButton.vue` | 按钮组件源码                 |
| **适老化卡片**     | `../components/elderly/ElderlyCard.vue`   | 卡片组件源码                 |
| **适老化表单**     | `../components/elderly/ElderlyForm.vue`   | 表单组件源码                 |
| **离线服务**       | `../services/offlineService.js`           | IndexedDB 封装               |
| **Service Worker** | `../../public/service-worker.js`          | 离线缓存策略                 |
| **性能优化**       | `../utils/performanceOptimizer.js`        | 优化工具函数                 |

---

## 参考资源

### 设计规范

- [WCAG 2.1 标准](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design 无障碍指南](https://material.io/design/usability/accessibility.html)
- [Apple 人机界面指南](https://developer.apple.com/design/human-interface-guidelines/)

### 技术文档

- [Vue 3 官方文档](https://cn.vuejs.org/)
- [Vite 官方文档](https://cn.vitejs.dev/)
- [Element Plus 组件库](https://element-plus.org/zh-CN/)
- [TailwindCSS 文档](https://tailwindcss.com/)

### PWA 相关

- [Progressive Web App](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## 版本历史

| 版本  | 日期       | 更新内容                           |
| ----- | ---------- | ---------------------------------- |
| 1.0.0 | 2025-12-28 | 初始版本，完整适老化与离线功能方案 |

---

## 联系方式

**项目团队**: 智慧乡村项目组
**技术支持**: tech@smartvillage.com
**问题反馈**: https://github.com/smartvillage/issues

---

**最后更新**: 2025-12-28
**文档版本**: 1.0.0
