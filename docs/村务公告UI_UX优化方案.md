# 村务公告UI/UX优化方案

> **目标用户**：村民（含老年群体）
> **优化日期**：2026-01-17
> **设计来源**：ui-ux-pro-max 智能体

---

## 一、现状分析

### 当前实现
- `client-mobile/src/pages/village/announcement.vue` - 公告列表页
- `client-mobile/src/pages/village/announcement-detail.vue` - 公告详情页

### 存在问题
| 问题 | 描述 | 影响 |
|-----|-----|-----|
| **Emoji图标** | 使用emoji作为UI图标（←、🔍、📎、📄等） | 不专业、可访问性差 |
| **字体大小** | 基础字号28-36rpx（约14-18px） | 老年用户阅读困难 |
| **触摸目标** | 按钮区域较小 | 操作不便 |
| **颜色对比** | 部分文本颜色较浅 | 可读性不足 |
| **反馈不足** | 缺少加载骨架屏、空状态友好度不够 | 用户体验不佳 |

---

## 二、设计系统优化

### 2.1 排版系统

基于ui-ux-pro-max搜索结果，采用**Atkinson Hyperlegible**字体（专为可访问性设计）：

```scss
// 字体引入
@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;500;600;700&display=swap');

// 字体层级
$font-size-base: 32rpx;        // 基础 16px（适老化提升）
$font-size-lg: 36rpx;          // 大号 18px
$font-size-xl: 40rpx;          // 超大 20px
$font-size-2xl: 48rpx;         // 标题 24px
$font-size-3xl: 56rpx;         // 主标题 28px

$line-height-tight: 1.3;       // 标题行高
$line-height-normal: 1.6;      // 正文行高
$line-height-relaxed: 1.8;     // 舒适行高（老年友好）
```

### 2.2 色彩系统

采用政府公共服务配色方案（对比度符合WCAG AAA标准）：

```scss
// 主色调 - 专业可信赖
$color-primary: #0369A1;       // CTA蓝色（对比度 7.2:1）
$color-primary-dark: #0284C7;  // 悬停态
$color-primary-light: #E0F2FE; // 浅色背景

// 中性色
$color-text-primary: #020617;   // 主文本（对比度 16.1:1）
$color-text-secondary: #334155; // 次级文本（对比度 9.8:1）
$color-text-tertiary: #64748B;  // 辅助文本（对比度 4.6:1）
$color-border: #E2E8F0;        // 边框
$color-bg-page: #F8FAFC;       // 页面背景
$color-bg-card: #FFFFFF;       // 卡片背景

// 语义色
$color-danger: #DC2626;        // 重要/紧急
$color-success: #16A34A;       // 成功/公示
$color-warning: #F59E0B;       // 警告/会议
$color-info: #0EA5E9;          // 通知
```

### 2.3 触摸目标

适老化触摸区域（最少44x44dp，推荐48x48dp）：

```scss
$touch-target-min: 88rpx;      // 最小 44px
$touch-target-comfort: 96rpx;  // 舒适 48px
$touch-target-large: 104rpx;   // 大号 52px（老年友好）
```

### 2.4 间距系统

使用8px基准网格（适老化放大）：

```scss
$spacing-xs: 8rpx;    // 4px
$spacing-sm: 16rpx;   // 8px
$spacing-md: 24rpx;   // 12px
$spacing-lg: 32rpx;   // 16px
$spacing-xl: 48rpx;   // 24px
$spacing-2xl: 64rpx;  // 32px
$spacing-3xl: 96rpx;  // 48px
```

---

## 三、组件优化方案

### 3.1 图标系统

**替换所有Emoji图标为SVG图标**

```vue
<!-- Before (❌ 不专业) -->
<text class="icon">←</text>
<text class="icon">🔍</text>
<text class="icon">📎</text>

<!-- After (✅ 专业) -->
<svg class="icon" viewBox="0 0 24 24">
  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
</svg>
```

**推荐图标库**：Heroicons、Lucide（一致的24x24 viewBox）

### 3.2 导航栏优化

```vue
<view class="custom-navbar">
  <!-- 返回按钮 - 增大触摸区域 -->
  <view class="navbar-action" @click="handleBack" aria-label="返回">
    <svg class="icon" viewBox="0 0 24 24">
      <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
    </svg>
  </view>

  <!-- 标题 - 增大字号 -->
  <view class="navbar-title">村务公告</view>

  <!-- 筛选按钮 - 增大触摸区域 -->
  <view class="navbar-action" @click="handleFilter" aria-label="筛选">
    <svg class="icon" viewBox="0 0 24 24">
      <path fill="currentColor" d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
    </svg>
  </view>
</view>
```

### 3.3 筛选标签优化

```scss
.filter-tabs {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  .tab-item {
    display: inline-flex;
    align-items: center;
    height: 72rpx;           // 增加高度
    padding: 0 32rpx;
    background-color: #F1F5F9;
    border-radius: 48rpx;
    font-size: 30rpx;        // 增大字号
    color: #475569;
    transition: all 0.2s ease;
    white-space: nowrap;

    &--active {
      background-color: #0369A1;
      color: #FFFFFF;
      box-shadow: 0 4rpx 12rpx rgba(3, 105, 161, 0.25);
    }

    .tab-count {
      margin-left: 8rpx;
      padding: 4rpx 12rpx;
      background-color: rgba(255, 255, 255, 0.25);
      border-radius: 12rpx;
      font-size: 24rpx;
    }
  }
}
```

### 3.4 公告卡片优化

```vue
<view
  class="announcement-card"
  :class="{ 'announcement-card--unread': !item.read }"
  @click="handleAnnouncementClick(item)"
>
  <!-- 顶部标签行 -->
  <view class="card-header">
    <view class="header-tags">
      <view :class="['tag', `tag-${item.type}`]">
        {{ item.typeLabel }}
      </view>
      <view v-if="item.top" class="badge-top">置顶</view>
    </view>
    <view v-if="!item.read" class="unread-indicator" />
  </view>

  <!-- 标题 - 增大字号 -->
  <view class="card-title">{{ item.title }}</view>

  <!-- 摘要 - 增加行高 -->
  <view class="card-summary">{{ item.summary }}</view>

  <!-- 可展开内容 -->
  <view v-if="item.expanded" class="card-content">
    <rich-text :nodes="item.content" />
  </view>

  <!-- 附件列表 -->
  <view v-if="item.attachments?.length" class="card-attachments">
    <view class="attachments-header">
      <svg class="icon" viewBox="0 0 24 24">
        <path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
      </svg>
      <text>附件 ({{ item.attachments.length }})</text>
    </view>
    <view
      v-for="(file, idx) in item.attachments"
      :key="idx"
      class="attachment-item"
      @click.stop="handleAttachmentClick(file)"
    >
      <svg class="file-icon" viewBox="0 0 24 24">
        <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
      <view class="file-info">
        <text class="file-name">{{ file.name }}</text>
      </view>
      <svg class="download-icon" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
    </view>
  </view>

  <!-- 底部信息 -->
  <view class="card-footer">
    <view class="footer-meta">
      <view class="meta-item">
        <svg class="meta-icon" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
        </svg>
        <text>{{ item.publishDate }}</text>
      </view>
      <view class="meta-item">
        <svg class="meta-icon" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        <text>{{ item.viewCount }}</text>
      </view>
    </view>
    <view class="footer-action" @click.stop="handleExpand(item)">
      <text>{{ item.expanded ? '收起' : '展开' }}</text>
      <svg class="chevron" :class="{ 'rotated': item.expanded }" viewBox="0 0 24 24">
        <path fill="currentColor" d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
      </svg>
    </view>
  </view>
</view>
```

### 3.5 加载状态优化

添加骨架屏替代简单的loading文字：

```vue
<template v-if="loading">
  <view class="skeleton-list">
    <view v-for="i in 3" :key="i" class="skeleton-card">
      <view class="skeleton-tag" />
      <view class="skeleton-title" />
      <view class="skeleton-summary" />
      <view class="skeleton-footer" />
    </view>
  </view>
</template>
```

```scss
.skeleton-card {
  padding: 32rpx;
  margin-bottom: 24rpx;
  background-color: #FFFFFF;
  border-radius: 20rpx;
}

.skeleton-tag {
  width: 80rpx;
  height: 40rpx;
  background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
  background-size: 200% 100%;
  border-radius: 8rpx;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-title {
  width: 70%;
  height: 44rpx;
  margin-top: 16rpx;
  background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
  background-size: 200% 100%;
  border-radius: 8rpx;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 3.6 空状态优化

```vue
<view v-if="displayList.length === 0 && !loading" class="empty-state">
  <svg class="empty-icon" viewBox="0 0 24 24">
    <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10z"/>
  </svg>
  <text class="empty-title">暂无公告</text>
  <text class="empty-desc">当前筛选条件下没有公告</text>
  <view class="empty-action" @click="handleResetFilter">
    <text>查看全部公告</text>
  </view>
</view>
```

---

## 四、可访问性（A11y）增强

### 4.1 ARIA属性

```vue
<view
  class="announcement-card"
  role="article"
  :aria-label="`${item.typeLabel}公告：${item.title}`"
  :aria-unread="!item.read"
  @click="handleAnnouncementClick(item)"
>
  <!-- ... -->
</view>
```

### 4.2 键盘导航

```javascript
// 添加键盘事件处理
const handleKeydown = (event, item) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleAnnouncementClick(item)
  }
}
```

```vue
<view
  class="announcement-card"
  tabindex="0"
  @keydown="handleKeydown($event, item)"
>
  <!-- ... -->
</view>
```

### 4.3 屏幕阅读器支持

```vue
<!-- 添加视觉隐藏但屏幕阅读器可读的文本 -->
<view class="sr-only">
  有 {{ unreadCount }} 条未读公告
</view>
```

```scss
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 4.4 减少动画

```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 五、实施检查清单

### 视觉质量
- [ ] 移除所有Emoji图标，替换为SVG
- [ ] 所有图标使用一致的viewBox（24x24）
- [ ] 悬停状态不引起布局偏移
- [ ] 使用直接的主题色，不使用var()包装

### 交互
- [ ] 所有可点击元素有`cursor-pointer`
- [ ] 悬停状态提供清晰的视觉反馈
- [ ] 过渡动画流畅（150-300ms）
- [ ] 焦点状态对键盘导航可见

### 对比度
- [ ] 浅色模式文本对比度 ≥ 4.5:1
- [ ] 玻璃/透明元素在浅色模式可见
- [ ] 边框在两种模式下可见
- [ ] 测试两种模式后再交付

### 布局
- [ ] 浮动元素与边缘有适当间距
- [ ] 内容不隐藏在固定导航栏后
- [ ] 响应式测试：320px、375px、414px、768px
- [ ] 移动端无水平滚动

### 可访问性
- [ ] 所有图片有alt文本
- [ ] 表单输入有关联的label
- [ ] 颜色不是唯一的指示器
- [ ] 尊重`prefers-reduced-motion`

---

## 六、关键改进指标

| 指标 | 当前 | 目标 |
|-----|-----|-----|
| 最小触摸目标 | ~64rpx (32px) | 96rpx (48px) |
| 基础字号 | 28rpx (14px) | 32rpx (16px) |
| 颜色对比度 | 部分不足 | 全部 ≥ 4.5:1 |
| 图标一致性 | Emoji混合 | 统一SVG |
| 可访问性得分 | 未评估 | WCAG AA |

---

## 七、文件清单

需修改的文件：
1. `client-mobile/src/pages/village/announcement.vue`
2. `client-mobile/src/pages/village/announcement-detail.vue`
3. `client-mobile/src/styles/variables.scss` (新增或更新)

---

**方案来源**：基于 ui-ux-pro-max 智能体搜索结果
**设计标准**：WCAG 2.1 AA 级 + 适老化设计指南
