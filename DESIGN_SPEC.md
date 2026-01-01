# 智慧乡村综合服务平台详细设计规范 (DESIGN_SPEC)

## 文档信息

| 项目名称 | 智慧乡村综合服务平台 |
|---------|------------------|
| 版本号 | V2.0 |
| 创建日期 | 2025-12-20 |
| 最后更新 | 2025-12-20 |
| 文档状态 | 详细设计 |
| 负责人 | 设计团队 |

---

## 一、UI/UX详细设计规范

### 1.1 设计原则

#### 核心设计理念
1. **包容性设计 (Inclusive Design)**
   - 支持不同年龄层用户，特别是老年用户
   - 适配不同数字技能水平
   - 考虑农村用户使用习惯

2. **可及性优先 (Accessibility First)**
   - 符合WCAG 2.1 AA级标准
   - 支持屏幕阅读器
   - 提供大字模式和语音导航

3. **简洁直观 (Simple & Intuitive)**
   - 操作步骤不超过3步
   - 清晰的视觉层次
   - 一致的交互模式

4. **文化适应 (Cultural Adaptation)**
   - 融入乡村文化元素
   - 方言语音交互支持
   - 本地化视觉风格

### 1.2 设计系统规范

#### 1.2.1 色彩系统

**主色调 (Primary Colors)**
```scss
// 主品牌色 - 绿色系，象征生机与乡村
$primary-50: #f0f9ff;
$primary-100: #e0f2fe;
$primary-200: #bae6fd;
$primary-300: #7dd3fc;
$primary-400: #38bdf8;
$primary-500: #22c55e;  // 主色
$primary-600: #16a34a;
$primary-700: #15803d;
$primary-800: #166534;
$primary-900: #14532d;

// 辅助色 - 橙色系，象征温暖与活力
$secondary-500: #f97316;
$accent-500: #8b5cf6;
```

**中性色 (Neutral Colors)**
```scss
// 适应老年人视力的高对比度配色
$neutral-50: #ffffff;
$neutral-100: #f8fafc;
$neutral-200: #f1f5f9;
$neutral-300: #e2e8f0;
$neutral-400: #94a3b8;
$neutral-500: #64748b;
$neutral-600: #475569;
$neutral-700: #334155;
$neutral-800: #1e293b;
$neutral-900: #0f172a;

// 状态色
$success: #22c55e;
$warning: #f59e0b;
$error: #ef4444;
$info: #3b82f6;
```

#### 1.2.2 字体系统

**字体族 (Font Family)**
```scss
// 主字体 - 系统默认，确保兼容性
$font-family-base: -apple-system, BlinkMacSystemFont,
                   "Segoe UI", Roboto, "Helvetica Neue",
                   "PingFang SC", "Hiragino Sans GB",
                   "Microsoft YaHei", sans-serif;

// 中文衬线字体 - 用于标题
$font-family-serif: "Songti SC", "SimSun", serif;

// 等宽字体 - 用于代码和数据
$font-family-mono: "SF Mono", "Monaco", "Inconsolata",
                   "Roboto Mono", "Source Code Pro", monospace;
```

**字体大小 (Font Sizes)**
```scss
// 基础字号 - 支持大字模式
$font-xs: 0.75rem;   // 12px
$font-sm: 0.875rem;  // 14px
$font-base: 1rem;    // 16px - 基准
$font-lg: 1.125rem;  // 18px
$font-xl: 1.25rem;   // 20px
$font-2xl: 1.5rem;   // 24px
$font-3xl: 1.875rem; // 30px
$font-4xl: 2.25rem;  // 36px

// 大字模式 - 放大1.5倍
@if $large-text-mode {
  $font-xs: 1.125rem;
  $font-sm: 1.3125rem;
  $font-base: 1.5rem;
  $font-lg: 1.6875rem;
  $font-xl: 1.875rem;
  $font-2xl: 2.25rem;
  $font-3xl: 2.8125rem;
  $font-4xl: 3.375rem;
}
```

**行高 (Line Heights)**
```scss
$leading-none: 1;
$leading-tight: 1.25;
$leading-snug: 1.375;
$leading-normal: 1.5;
$leading-relaxed: 1.625;
$leading-loose: 2;
```

#### 1.2.3 间距系统

**基础间距 (Spacing)**
```scss
// 8px基础网格系统
$space-1: 0.25rem;   // 4px
$space-2: 0.5rem;    // 8px
$space-3: 0.75rem;   // 12px
$space-4: 1rem;      // 16px - 基准
$space-5: 1.25rem;   // 20px
$space-6: 1.5rem;    // 24px
$space-8: 2rem;      // 32px
$space-10: 2.5rem;   // 40px
$space-12: 3rem;     // 48px
$space-16: 4rem;     // 64px
$space-20: 5rem;     // 80px
$space-24: 6rem;     // 96px

// 大字模式下的间距调整
@if $large-text-mode {
  $space-4: 1.5rem;  // 24px
  $space-6: 2.25rem; // 36px
  $space-8: 3rem;    // 48px
}
```

#### 1.2.4 圆角系统

```scss
$rounded-none: 0;
$rounded-sm: 0.125rem;   // 2px
$rounded-base: 0.25rem;  // 4px
$rounded-md: 0.375rem;   // 6px
$rounded-lg: 0.5rem;     // 8px
$rounded-xl: 0.75rem;    // 12px
$rounded-2xl: 1rem;      // 16px
$rounded-full: 9999px;

// 卡片和按钮圆角
$card-radius: $rounded-lg;
$button-radius: $rounded-md;
$input-radius: $rounded-base;
```

#### 1.2.5 阴影系统

```scss
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
              0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### 1.3 响应式设计规范

#### 1.3.1 断点系统

```scss
// 移动优先的响应式断点
$breakpoints: (
  xs: 0px,        // 手机竖屏
  sm: 576px,      // 手机横屏
  md: 768px,      // 平板竖屏
  lg: 992px,      // 平板横屏/小型笔记本
  xl: 1200px,     // 桌面
  xxl: 1400px     // 大屏显示器
);
```

#### 1.3.2 容器系统

```scss
// 最大宽度限制
$container-max-widths: (
  sm: 540px,
  md: 720px,
  lg: 960px,
  xl: 1140px,
  xxl: 1320px
);

// 响应式容器
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: $space-4;
  padding-right: $space-4;

  @each $breakpoint, $max-width in $container-max-widths {
    @media (min-width: map-get($breakpoints, $breakpoint)) {
      max-width: $max-width;
    }
  }
}
```

### 1.4 组件设计规范

#### 1.4.1 按钮组件 (Button)

**主要按钮类型**

```scss
// 基础按钮
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $space-3 $space-6;
  font-size: $font-base;
  font-weight: 500;
  line-height: $leading-none;
  border-radius: $button-radius;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-height: 44px; // 触摸友好最小高度

  // 大字模式
  @if $large-text-mode {
    padding: $space-4 $space-8;
    font-size: $font-lg;
    min-height: 60px;
  }

  // 按钮变体
  &--primary {
    background-color: $primary-500;
    color: white;

    &:hover {
      background-color: $primary-600;
    }
  }

  &--secondary {
    background-color: transparent;
    color: $primary-500;
    border-color: $primary-500;

    &:hover {
      background-color: $primary-50;
    }
  }

  &--ghost {
    background-color: transparent;
    color: $neutral-700;

    &:hover {
      background-color: $neutral-100;
    }
  }

  // 按钮尺寸
  &--sm {
    padding: $space-2 $space-4;
    font-size: $font-sm;
    min-height: 36px;
  }

  &--lg {
    padding: $space-4 $space-8;
    font-size: $font-lg;
    min-height: 52px;
  }

  // 特殊状态
  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  &--loading {
    position: relative;
    color: transparent;

    &::after {
      content: "";
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

#### 1.4.2 输入框组件 (Input)

```scss
.form-input {
  display: block;
  width: 100%;
  padding: $space-3 $space-4;
  font-size: $font-base;
  line-height: $leading-normal;
  color: $neutral-900;
  background-color: white;
  border: 1px solid $neutral-300;
  border-radius: $input-radius;
  transition: all 0.2s ease-in-out;
  min-height: 44px; // 触摸友好

  // 大字模式
  @if $large-text-mode {
    padding: $space-4 $space-6;
    font-size: $font-lg;
    min-height: 60px;
  }

  // 状态
  &:focus {
    outline: none;
    border-color: $primary-500;
    box-shadow: 0 0 0 3px rgba($primary-500, 0.1);
  }

  &:disabled {
    background-color: $neutral-100;
    color: $neutral-500;
    cursor: not-allowed;
  }

  // 错误状态
  &--error {
    border-color: $error;

    &:focus {
      border-color: $error;
      box-shadow: 0 0 0 3px rgba($error, 0.1);
    }
  }

  // 输入框组
  &-group {
    position: relative;
    margin-bottom: $space-4;

    label {
      display: block;
      margin-bottom: $space-2;
      font-size: $font-sm;
      font-weight: 500;
      color: $neutral-700;
    }

    .error-message {
      margin-top: $space-1;
      font-size: $font-xs;
      color: $error;
    }
  }
}
```

#### 1.4.3 卡片组件 (Card)

```scss
.card {
  background: white;
  border-radius: $card-radius;
  box-shadow: $shadow-sm;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-2px);
  }

  // 卡片头部
  &__header {
    padding: $space-6;
    border-bottom: 1px solid $neutral-200;

    @if $large-text-mode {
      padding: $space-8;
    }
  }

  // 卡片主体
  &__body {
    padding: $space-6;

    @if $large-text-mode {
      padding: $space-8;
    }
  }

  // 卡片底部
  &__footer {
    padding: $space-4 $space-6;
    background-color: $neutral-50;
    border-top: 1px solid $neutral-200;

    @if $large-text-mode {
      padding: $space-6 $space-8;
    }
  }

  // 卡片变体
  &--elevated {
    box-shadow: $shadow-lg;
  }

  &--bordered {
    border: 1px solid $neutral-200;
    box-shadow: none;
  }

  &--interactive {
    cursor: pointer;

    &:hover {
      box-shadow: $shadow-lg;
      transform: translateY(-4px);
    }
  }
}
```

### 1.5 页面布局设计

#### 1.5.1 基础布局结构

```vue
<template>
  <div class="app-layout">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <img src="/logo.svg" alt="智慧乡村" class="logo" />
          <h1 class="site-title">智慧乡村</h1>
        </div>

        <nav class="main-nav">
          <router-link to="/home" class="nav-item">首页</router-link>
          <router-link to="/services" class="nav-item">服务</router-link>
          <router-link to="/government" class="nav-item">村务</router-link>
          <router-link to="/life" class="nav-item">生活</router-link>
        </nav>

        <div class="header-actions">
          <!-- 语音助手按钮 -->
          <button class="voice-assistant" @click="toggleVoice">
            <i class="icon-microphone"></i>
          </button>

          <!-- 大字模式切换 -->
          <button class="text-mode-toggle" @click="toggleTextMode">
            <i class="icon-text-size"></i>
          </button>

          <!-- 用户信息 -->
          <div class="user-info">
            <el-dropdown>
              <img :src="user.avatar" :alt="user.name" class="user-avatar" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>个人中心</el-dropdown-item>
                  <el-dropdown-item>设置</el-dropdown-item>
                  <el-dropdown-item divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <div class="main-container">
        <router-view />
      </div>
    </main>

    <!-- 底部导航（移动端） -->
    <nav class="mobile-nav">
      <router-link to="/home" class="mobile-nav-item">
        <i class="icon-home"></i>
        <span>首页</span>
      </router-link>
      <router-link to="/services" class="mobile-nav-item">
        <i class="icon-services"></i>
        <span>服务</span>
      </router-link>
      <router-link to="/government" class="mobile-nav-item">
        <i class="icon-government"></i>
        <span>村务</span>
      </router-link>
      <router-link to="/life" class="mobile-nav-item">
        <i class="icon-life"></i>
        <span>生活</span>
      </router-link>
      <router-link to="/profile" class="mobile-nav-item">
        <i class="icon-profile"></i>
        <span>我的</span>
      </router-link>
    </nav>

    <!-- 语音助手浮窗 -->
    <div v-if="voiceActive" class="voice-assistant-modal">
      <div class="voice-waves">
        <div class="wave"></div>
        <div class="wave"></div>
        <div class="wave"></div>
      </div>
      <p class="voice-hint">请说出您的需求...</p>
      <button class="close-voice" @click="voiceActive = false">
        <i class="icon-close"></i>
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: white;
  border-bottom: 1px solid $neutral-200;
  position: sticky;
  top: 0;
  z-index: 100;

  @media (max-width: map-get($breakpoints, md)) {
    padding: 0;
  }
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-6;
  height: 64px;

  @if $large-text-mode {
    height: 80px;
  }
}

.logo-section {
  display: flex;
  align-items: center;
  gap: $space-3;

  .logo {
    width: 32px;
    height: 32px;

    @if $large-text-mode {
      width: 40px;
      height: 40px;
    }
  }

  .site-title {
    font-size: $font-xl;
    font-weight: 600;
    color: $neutral-900;

    @if $large-text-mode {
      font-size: $font-2xl;
    }
  }
}

.main-nav {
  display: flex;
  gap: $space-8;

  @media (max-width: map-get($breakpoints, lg)) {
    display: none;
  }

  .nav-item {
    font-size: $font-base;
    color: $neutral-600;
    text-decoration: none;
    padding: $space-2 $space-4;
    border-radius: $button-radius;
    transition: all 0.2s;

    &:hover,
    &.router-link-active {
      color: $primary-500;
      background-color: $primary-50;
    }

    @if $large-text-mode {
      font-size: $font-lg;
      padding: $space-3 $space-6;
    }
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.voice-assistant,
.text-mode-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: $primary-50;
  color: $primary-500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: $primary-100;
  }

  @if $large-text-mode {
    width: 48px;
    height: 48px;
  }
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;

  @if $large-text-mode {
    width: 44px;
    height: 44px;
  }
}

.app-main {
  flex: 1;
  padding: $space-6 0;

  @if $large-text-mode {
    padding: $space-8 0;
  }
}

.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 $space-6;

  @if $large-text-mode {
    padding: 0 $space-8;
  }
}

// 移动端底部导航
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid $neutral-200;
  padding: $space-2 0;
  z-index: 100;

  @media (max-width: map-get($breakpoints, md)) {
    display: flex;
    justify-content: space-around;
  }

  .mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-1;
    color: $neutral-600;
    text-decoration: none;
    padding: $space-2;
    transition: all 0.2s;

    &:hover,
    &.router-link-active {
      color: $primary-500;
    }

    i {
      font-size: 20px;

      @if $large-text-mode {
        font-size: 24px;
      }
    }

    span {
      font-size: $font-xs;

      @if $large-text-mode {
        font-size: $font-sm;
      }
    }
  }
}

// 语音助手浮窗
.voice-assistant-modal {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: $rounded-2xl;
  padding: $space-6;
  box-shadow: $shadow-xl;
  z-index: 1000;
  min-width: 300px;

  @if $large-text-mode {
    min-width: 400px;
    padding: $space-8;
  }
}

.voice-waves {
  display: flex;
  justify-content: center;
  gap: $space-2;
  margin-bottom: $space-4;

  .wave {
    width: 4px;
    height: 40px;
    background: $primary-500;
    border-radius: 2px;
    animation: wave 1s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.1s;
    }

    &:nth-child(3) {
      animation-delay: 0.2s;
    }

    @if $large-text-mode {
      height: 50px;
      width: 6px;
    }
  }
}

@keyframes wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

.voice-hint {
  text-align: center;
  color: $neutral-600;
  font-size: $font-sm;

  @if $large-text-mode {
    font-size: $font-base;
  }
}

.close-voice {
  position: absolute;
  top: $space-2;
  right: $space-2;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: $neutral-100;
  color: $neutral-600;
  cursor: pointer;

  &:hover {
    background: $neutral-200;
  }
}
</style>
```

### 1.6 核心页面设计

#### 1.6.1 首页设计

```vue
<template>
  <div class="home-page">
    <!-- 轮播banner -->
    <section class="hero-banner">
      <el-carousel height="300px" indicator-position="outside">
        <el-carousel-item v-for="item in banners" :key="item.id">
          <div class="banner-content" :style="{ backgroundImage: `url(${item.image})` }">
            <div class="banner-text">
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
              <el-button type="primary" size="large">{{ item.action }}</el-button>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
    </section>

    <!-- 快捷入口 -->
    <section class="quick-actions">
      <h3 class="section-title">快捷服务</h3>
      <div class="actions-grid">
        <div v-for="action in quickActions" :key="action.id"
             class="action-card" @click="handleAction(action)">
          <div class="action-icon">
            <i :class="action.icon"></i>
          </div>
          <h4>{{ action.title }}</h4>
          <p>{{ action.description }}</p>
        </div>
      </div>
    </section>

    <!-- 村务动态 -->
    <section class="village-news">
      <div class="section-header">
        <h3 class="section-title">村务动态</h3>
        <router-link to="/news" class="view-more">查看更多</router-link>
      </div>
      <div class="news-list">
        <article v-for="news in newsList" :key="news.id" class="news-item">
          <div class="news-content">
            <h4>{{ news.title }}</h4>
            <p>{{ news.summary }}</p>
            <div class="news-meta">
              <span class="date">{{ formatDate(news.publishDate) }}</span>
              <span class="category">{{ news.category }}</span>
            </div>
          </div>
          <img v-if="news.image" :src="news.image" :alt="news.title" class="news-image" />
        </article>
      </div>
    </section>

    <!-- 服务提示 -->
    <section class="service-tips">
      <h3 class="section-title">服务提示</h3>
      <div class="tips-carousel">
        <el-carousel height="120px" direction="vertical" :autoplay="true">
          <el-carousel-item v-for="tip in tips" :key="tip.id">
            <div class="tip-content">
              <i class="icon-tip"></i>
              <p>{{ tip.content }}</p>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
    </section>
  </div>
</template>

<style lang="scss">
.home-page {
  .hero-banner {
    margin-bottom: $space-8;

    .banner-content {
      height: 300px;
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      align-items: center;

      &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
      }

      .banner-text {
        position: relative;
        color: white;
        padding: 0 $space-8;
        max-width: 600px;

        h2 {
          font-size: $font-3xl;
          margin-bottom: $space-2;

          @if $large-text-mode {
            font-size: $font-4xl;
          }
        }

        p {
          font-size: $font-lg;
          margin-bottom: $space-4;
          opacity: 0.9;

          @if $large-text-mode {
            font-size: $font-xl;
          }
        }
      }
    }
  }

  .quick-actions {
    margin-bottom: $space-8;

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: $space-4;

      @media (max-width: map-get($breakpoints, sm)) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .action-card {
      background: white;
      padding: $space-6;
      border-radius: $rounded-lg;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: $shadow-sm;

      &:hover {
        transform: translateY(-4px);
        box-shadow: $shadow-lg;
      }

      .action-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto $space-4;
        background: $primary-50;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        i {
          font-size: 24px;
          color: $primary-500;

          @if $large-text-mode {
            font-size: 30px;
          }
        }

        @if $large-text-mode {
          width: 80px;
          height: 80px;
        }
      }

      h4 {
        font-size: $font-lg;
        margin-bottom: $space-2;
        color: $neutral-900;

        @if $large-text-mode {
          font-size: $font-xl;
        }
      }

      p {
        font-size: $font-sm;
        color: $neutral-600;

        @if $large-text-mode {
          font-size: $font-base;
        }
      }
    }
  }

  .village-news {
    margin-bottom: $space-8;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $space-6;

      .view-more {
        color: $primary-500;
        text-decoration: none;
        font-size: $font-sm;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .news-list {
      display: flex;
      flex-direction: column;
      gap: $space-4;
    }

    .news-item {
      background: white;
      border-radius: $rounded-lg;
      padding: $space-6;
      display: flex;
      gap: $space-4;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        box-shadow: $shadow-md;
      }

      @media (max-width: map-get($breakpoints, sm)) {
        flex-direction: column;
      }

      .news-content {
        flex: 1;

        h4 {
          font-size: $font-lg;
          margin-bottom: $space-2;
          color: $neutral-900;

          @if $large-text-mode {
            font-size: $font-xl;
          }
        }

        p {
          font-size: $font-base;
          color: $neutral-600;
          margin-bottom: $space-4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;

          @if $large-text-mode {
            font-size: $font-lg;
          }
        }

        .news-meta {
          display: flex;
          gap: $space-4;
          font-size: $font-xs;
          color: $neutral-500;

          @if $large-text-mode {
            font-size: $font-sm;
          }
        }
      }

      .news-image {
        width: 120px;
        height: 80px;
        object-fit: cover;
        border-radius: $rounded-md;
        flex-shrink: 0;

        @if $large-text-mode {
          width: 150px;
          height: 100px;
        }
      }
    }
  }

  .service-tips {
    .tips-carousel {
      background: linear-gradient(135deg, $primary-50 0%, $secondary-50 100%);
      border-radius: $rounded-lg;
      padding: $space-6;

      .tip-content {
        display: flex;
        align-items: center;
        gap: $space-4;

        i {
          font-size: 24px;
          color: $primary-500;

          @if $large-text-mode {
            font-size: 30px;
          }
        }

        p {
          font-size: $font-base;
          color: $neutral-700;

          @if $large-text-mode {
            font-size: $font-lg;
          }
        }
      }
    }
  }
}

.section-title {
  font-size: $font-2xl;
  font-weight: 600;
  margin-bottom: $space-6;
  color: $neutral-900;

  @if $large-text-mode {
    font-size: $font-3xl;
  }
}
</style>
```

#### 1.6.2 村务管理页面

```vue
<template>
  <div class="government-page">
    <!-- 功能导航 -->
    <section class="function-nav">
      <div class="nav-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['nav-tab', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.name }}</span>
        </button>
      </div>
    </section>

    <!-- 内容区域 -->
    <section class="content-section">
      <!-- 公告管理 -->
      <div v-if="activeTab === 'announcements'" class="tab-content">
        <div class="content-header">
          <h2>公告管理</h2>
          <el-button type="primary" @click="showAnnouncementDialog = true">
            发布新公告
          </el-button>
        </div>

        <div class="announcements-list">
          <article v-for="announcement in announcements"
                   :key="announcement.id"
                   class="announcement-card">
            <div class="announcement-header">
              <span class="priority-tag" :class="announcement.priority">
                {{ getPriorityText(announcement.priority) }}
              </span>
              <span class="publish-date">
                {{ formatDate(announcement.publishDate) }}
              </span>
            </div>

            <h3 class="announcement-title">{{ announcement.title }}</h3>
            <p class="announcement-content">{{ announcement.content }}</p>

            <div class="announcement-footer">
              <div class="stats">
                <span><i class="icon-eye"></i> {{ announcement.views }} 阅读</span>
                <span><i class="icon-message"></i> {{ announcement.comments }} 评论</span>
              </div>

              <div class="actions">
                <el-button size="small" text @click="editAnnouncement(announcement)">
                  编辑
                </el-button>
                <el-button size="small" text type="danger" @click="deleteAnnouncement(announcement)">
                  删除
                </el-button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- 会议管理 -->
      <div v-if="activeTab === 'meetings'" class="tab-content">
        <div class="content-header">
          <h2>会议管理</h2>
          <el-button type="primary" @click="showMeetingDialog = true">
            发起会议
          </el-button>
        </div>

        <div class="meetings-calendar">
          <el-calendar v-model="calendarDate">
            <template #date-cell="{ data }">
              <div class="calendar-day">
                <span class="day-number">{{ data.day.split('-').slice(2).join('-') }}</span>
                <div v-if="getMeetingsByDate(data.day).length > 0"
                     class="meeting-indicator">
                  {{ getMeetingsByDate(data.day).length }}个会议
                </div>
              </div>
            </template>
          </el-calendar>
        </div>

        <div class="meetings-list">
          <h3>即将进行的会议</h3>
          <div v-for="meeting in upcomingMeetings" :key="meeting.id"
               class="meeting-card">
            <div class="meeting-time">
              <div class="date">{{ formatDate(meeting.date, 'MM-DD') }}</div>
              <div class="time">{{ meeting.time }}</div>
            </div>

            <div class="meeting-info">
              <h4>{{ meeting.title }}</h4>
              <p>{{ meeting.location }}</p>
              <div class="attendees">
                <span>参会人数: {{ meeting.attendees }}人</span>
              </div>
            </div>

            <div class="meeting-status">
              <el-tag :type="getMeetingStatusType(meeting.status)">
                {{ meeting.status }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 任务调度 -->
      <div v-if="activeTab === 'tasks'" class="tab-content">
        <div class="content-header">
          <h2>任务调度</h2>
          <div class="header-actions">
            <el-button @click="showTaskDialog = true">分配任务</el-button>
            <el-button @click="showScheduleDialog = true">智能排班</el-button>
          </div>
        </div>

        <!-- 任务看板 -->
        <div class="task-board">
          <div v-for="column in taskColumns" :key="column.status"
               class="task-column">
            <h4 class="column-title">
              <span>{{ column.title }}</span>
              <span class="task-count">{{ getTasksByStatus(column.status).length }}</span>
            </h4>

            <div class="tasks-container">
              <div v-for="task in getTasksByStatus(column.status)"
                   :key="task.id"
                   class="task-card"
                   :class="{ urgent: task.priority === 'urgent' }">
                <div class="task-header">
                  <span class="task-type">{{ task.type }}</span>
                  <el-dropdown>
                    <el-button text size="small">
                      <i class="icon-more"></i>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="editTask(task)">编辑</el-dropdown-item>
                        <el-dropdown-item @click="deleteTask(task)">删除</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>

                <h5 class="task-title">{{ task.title }}</h5>
                <p class="task-description">{{ task.description }}</p>

                <div class="task-footer">
                  <div class="assignee">
                    <img :src="task.assignee.avatar" :alt="task.assignee.name" />
                    <span>{{ task.assignee.name }}</span>
                  </div>

                  <div class="task-deadline">
                    <i class="icon-clock"></i>
                    <span>{{ formatDate(task.deadline) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 财务管理 -->
      <div v-if="activeTab === 'finance'" class="tab-content">
        <div class="content-header">
          <h2>财务管理</h2>
          <div class="header-actions">
            <el-button @click="showRecordDialog = true">录入收支</el-button>
            <el-button @click="exportFinanceReport">导出报表</el-button>
          </div>
        </div>

        <!-- 财务概览 -->
        <div class="finance-overview">
          <div class="overview-cards">
            <div class="card income">
              <div class="card-icon">
                <i class="icon-income"></i>
              </div>
              <div class="card-content">
                <h4>本月收入</h4>
                <p class="amount">¥{{ formatAmount(financeData.monthlyIncome) }}</p>
                <span class="trend up">+12.5%</span>
              </div>
            </div>

            <div class="card expense">
              <div class="card-icon">
                <i class="icon-expense"></i>
              </div>
              <div class="card-content">
                <h4>本月支出</h4>
                <p class="amount">¥{{ formatAmount(financeData.monthlyExpense) }}</p>
                <span class="trend down">-8.3%</span>
              </div>
            </div>

            <div class="card balance">
              <div class="card-icon">
                <i class="icon-balance"></i>
              </div>
              <div class="card-content">
                <h4>当前余额</h4>
                <p class="amount">¥{{ formatAmount(financeData.currentBalance) }}</p>
                <span class="trend stable">0%</span>
              </div>
            </div>
          </div>

          <!-- 收支趋势图 -->
          <div class="chart-container">
            <h3>收支趋势</h3>
            <div ref="financeChart" class="finance-chart"></div>
          </div>
        </div>

        <!-- 收支记录 -->
        <div class="finance-records">
          <h3>最近收支记录</h3>
          <el-table :data="financeRecords" stripe>
            <el-table-column prop="date" label="日期" width="120">
              <template #default="{ row }">
                {{ formatDate(row.date, 'MM-DD') }}
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="row.type === 'income' ? 'success' : 'danger'">
                  {{ row.type === 'income' ? '收入' : '支出' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="分类" width="120" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">
                <span :class="{ 'text-red-600': row.type === 'expense' }">
                  ¥{{ formatAmount(row.amount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button size="small" text @click="viewReceipt(row)">
                  查看凭证
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss">
.government-page {
  .function-nav {
    background: white;
    border-radius: $rounded-lg;
    padding: $space-4;
    margin-bottom: $space-6;
    box-shadow: $shadow-sm;

    .nav-tabs {
      display: flex;
      gap: $space-2;
      overflow-x: auto;

      @media (max-width: map-get($breakpoints, md)) {
        &::-webkit-scrollbar {
          display: none;
        }
      }
    }

    .nav-tab {
      display: flex;
      align-items: center;
      gap: $space-2;
      padding: $space-3 $space-6;
      border: none;
      background: transparent;
      border-radius: $button-radius;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;

      i {
        font-size: 18px;
        color: $neutral-600;
      }

      span {
        font-size: $font-base;
        color: $neutral-700;

        @if $large-text-mode {
          font-size: $font-lg;
        }
      }

      &:hover {
        background: $neutral-100;
      }

      &.active {
        background: $primary-500;

        i,
        span {
          color: white;
        }
      }

      @if $large-text-mode {
        padding: $space-4 $space-8;
        gap: $space-3;

        i {
          font-size: 22px;
        }
      }
    }
  }

  .content-section {
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $space-6;

      h2 {
        font-size: $font-2xl;
        color: $neutral-900;

        @if $large-text-mode {
          font-size: $font-3xl;
        }
      }

      .header-actions {
        display: flex;
        gap: $space-3;
      }
    }

    .tab-content {
      background: white;
      border-radius: $rounded-lg;
      padding: $space-6;
      box-shadow: $shadow-sm;

      @if $large-text-mode {
        padding: $space-8;
      }
    }
  }

  // 公告样式
  .announcements-list {
    display: flex;
    flex-direction: column;
    gap: $space-4;
  }

  .announcement-card {
    border: 1px solid $neutral-200;
    border-radius: $rounded-lg;
    padding: $space-6;

    .announcement-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $space-4;

      .priority-tag {
        padding: $space-1 $space-3;
        border-radius: $rounded-full;
        font-size: $font-xs;
        font-weight: 500;

        &.urgent {
          background: $error;
          color: white;
        }

        &.important {
          background: $warning;
          color: white;
        }

        &.normal {
          background: $info;
          color: white;
        }
      }

      .publish-date {
        font-size: $font-sm;
        color: $neutral-500;
      }
    }

    .announcement-title {
      font-size: $font-xl;
      margin-bottom: $space-3;
      color: $neutral-900;

      @if $large-text-mode {
        font-size: $font-2xl;
      }
    }

    .announcement-content {
      font-size: $font-base;
      color: $neutral-600;
      margin-bottom: $space-4;

      @if $large-text-mode {
        font-size: $font-lg;
      }
    }

    .announcement-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: $space-4;
      border-top: 1px solid $neutral-200;

      .stats {
        display: flex;
        gap: $space-6;
        font-size: $font-sm;
        color: $neutral-500;

        i {
          margin-right: $space-1;
        }
      }

      .actions {
        display: flex;
        gap: $space-2;
      }
    }
  }

  // 会议样式
  .meetings-calendar {
    margin-bottom: $space-8;

    .calendar-day {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $space-1;

      .day-number {
        font-weight: 500;
      }

      .meeting-indicator {
        font-size: $font-xs;
        color: $primary-500;
        background: $primary-50;
        padding: $space-1 $space-2;
        border-radius: $rounded-full;
      }
    }
  }

  .meetings-list {
    h3 {
      margin-bottom: $space-4;
      font-size: $font-lg;
      color: $neutral-900;
    }

    .meeting-card {
      display: flex;
      align-items: center;
      gap: $space-4;
      padding: $space-4;
      border: 1px solid $neutral-200;
      border-radius: $rounded-lg;
      margin-bottom: $space-3;

      .meeting-time {
        text-align: center;
        min-width: 80px;

        .date {
          font-size: $font-lg;
          font-weight: 600;
          color: $primary-500;
        }

        .time {
          font-size: $font-sm;
          color: $neutral-600;
        }
      }

      .meeting-info {
        flex: 1;

        h4 {
          margin-bottom: $space-1;
          color: $neutral-900;
        }

        p {
          font-size: $font-sm;
          color: $neutral-600;
          margin-bottom: $space-1;
        }

        .attendees {
          font-size: $font-xs;
          color: $neutral-500;
        }
      }
    }
  }

  // 任务看板样式
  .task-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $space-4;

    @media (max-width: map-get($breakpoints, xl)) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: map-get($breakpoints, md)) {
      grid-template-columns: 1fr;
    }

    .task-column {
      background: $neutral-50;
      border-radius: $rounded-lg;
      padding: $space-4;

      .column-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $space-4;
        font-size: $font-base;
        font-weight: 500;
        color: $neutral-700;

        .task-count {
          background: white;
          padding: $space-1 $space-2;
          border-radius: $rounded-full;
          font-size: $font-xs;
        }
      }

      .tasks-container {
        display: flex;
        flex-direction: column;
        gap: $space-3;
        min-height: 300px;
      }

      .task-card {
        background: white;
        border-radius: $rounded-lg;
        padding: $space-4;
        cursor: pointer;
        transition: all 0.3s;
        border: 1px solid transparent;

        &:hover {
          box-shadow: $shadow-md;
        }

        &.urgent {
          border-left: 4px solid $error;
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: $space-3;

          .task-type {
            font-size: $font-xs;
            padding: $space-1 $space-2;
            background: $primary-50;
            color: $primary-500;
            border-radius: $rounded-full;
          }
        }

        .task-title {
          font-size: $font-base;
          margin-bottom: $space-2;
          color: $neutral-900;
        }

        .task-description {
          font-size: $font-sm;
          color: $neutral-600;
          margin-bottom: $space-4;
        }

        .task-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .assignee {
            display: flex;
            align-items: center;
            gap: $space-2;
            font-size: $font-sm;
            color: $neutral-700;

            img {
              width: 24px;
              height: 24px;
              border-radius: 50%;
            }
          }

          .task-deadline {
            display: flex;
            align-items: center;
            gap: $space-1;
            font-size: $font-xs;
            color: $neutral-500;
          }
        }
      }
    }
  }

  // 财务管理样式
  .finance-overview {
    margin-bottom: $space-8;

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: $space-4;
      margin-bottom: $space-6;

      @media (max-width: map-get($breakpoints, md)) {
        grid-template-columns: 1fr;
      }

      .card {
        display: flex;
        align-items: center;
        gap: $space-4;
        padding: $space-6;
        border-radius: $rounded-lg;

        &.income {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        &.expense {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        &.balance {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .card-icon {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;

          i {
            font-size: 24px;
          }
        }

        .card-content {
          h4 {
            font-size: $font-sm;
            opacity: 0.9;
            margin-bottom: $space-1;
          }

          .amount {
            font-size: $font-2xl;
            font-weight: 600;
            margin-bottom: $space-1;
          }

          .trend {
            font-size: $font-xs;

            &.up {
              color: #10b981;
            }

            &.down {
              color: #ef4444;
            }

            &.stable {
              color: #6b7280;
            }
          }
        }
      }
    }

    .chart-container {
      background: white;
      border-radius: $rounded-lg;
      padding: $space-6;

      h3 {
        margin-bottom: $space-4;
        color: $neutral-900;
      }

      .finance-chart {
        height: 300px;
      }
    }
  }
}
</style>
```

### 1.7 适老化设计规范

#### 1.7.1 大字模式实现

```scss
// 大字模式变量
$large-text-mode: false;

// 混合器 - 条件应用大字模式样式
@mixin large-text($property, $normal-value, $large-value) {
  #{$property}: $normal-value;

  @if $large-text-mode {
    #{$property}: $large-value;
  }
}

// 大字模式切换类
.large-text-mode {
  // 全局字体大小调整
  font-size: 125%;

  // 触摸目标增大
  .btn,
  .form-input,
  .nav-item,
  .action-card {
    min-height: 60px;
    min-width: 60px;
  }

  // 间距增大
  .card,
  .section {
    padding: $space-8;
    margin-bottom: $space-8;
  }

  // 图标增大
  .icon {
    font-size: 1.5em;
  }
}
```

#### 1.7.2 高对比度模式

```scss
.high-contrast-mode {
  // 背景色对比
  background: white;
  color: black;

  // 文字对比
  * {
    color: inherit !important;
  }

  // 边框加强
  .btn,
  .form-input,
  .card {
    border-width: 2px;
  }

  // 链接高亮
  a {
    text-decoration: underline;
    color: #0000ee;
  }

  // 状态色替换为更明显的标记
  .text-primary {
    color: #0000ee !important;
  }

  .text-success {
    color: #008000 !important;
  }

  .text-warning {
    color: #ff8c00 !important;
  }

  .text-error {
    color: #ff0000 !important;
  }
}
```

### 1.8 语音交互设计

#### 1.8.1 语音输入组件

```vue
<template>
  <div class="voice-input-container">
    <button
      :class="['voice-input-btn', { active: isListening }]"
      @click="toggleListening"
      :disabled="!speechSupported"
    >
      <div v-if="isListening" class="voice-wave">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <i v-else class="icon-microphone"></i>
    </button>

    <div v-if="transcript" class="voice-transcript">
      <p>{{ transcript }}</p>
      <button @click="clearTranscript" class="clear-btn">
        <i class="icon-close"></i>
      </button>
    </div>

    <div v-if="suggestions.length > 0" class="voice-suggestions">
      <div v-for="(suggestion, index) in suggestions"
           :key="index"
           class="suggestion-item"
           @click="selectSuggestion(suggestion)">
        {{ suggestion.text }}
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.voice-input-container {
  position: relative;
  display: inline-block;

  .voice-input-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: none;
    background: $primary-500;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;

    &:hover {
      background: $primary-600;
    }

    &.active {
      background: $error;
      animation: pulse 1.5s infinite;
    }

    &:disabled {
      background: $neutral-300;
      cursor: not-allowed;
    }

    @if $large-text-mode {
      width: 60px;
      height: 60px;
    }
  }

  .voice-wave {
    display: flex;
    align-items: center;
    gap: 2px;

    span {
      width: 4px;
      height: 20px;
      background: white;
      border-radius: 2px;
      animation: wave-animation 1.5s ease-in-out infinite;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.1s; }
      &:nth-child(3) { animation-delay: 0.2s; }
      &:nth-child(4) { animation-delay: 0.3s; }
      &:nth-child(5) { animation-delay: 0.4s; }
    }
  }

  @keyframes wave-animation {
    0%, 100% { transform: scaleY(0.5); }
    50% { transform: scaleY(1); }
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba($error, 0.7); }
    70% { box-shadow: 0 0 0 20px rgba($error, 0); }
    100% { box-shadow: 0 0 0 0 rgba($error, 0); }
  }

  .voice-transcript {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid $neutral-300;
    border-radius: $rounded-lg;
    padding: $space-3;
    box-shadow: $shadow-lg;
    z-index: 100;

    p {
      font-size: $font-sm;
      color: $neutral-700;
      margin: 0;

      @if $large-text-mode {
        font-size: $font-base;
      }
    }

    .clear-btn {
      position: absolute;
      top: $space-1;
      right: $space-1;
      width: 24px;
      height: 24px;
      border: none;
      background: $neutral-100;
      border-radius: 50%;
      cursor: pointer;

      &:hover {
        background: $neutral-200;
      }
    }
  }

  .voice-suggestions {
    position: absolute;
    top: 120px;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid $neutral-300;
    border-radius: $rounded-lg;
    box-shadow: $shadow-lg;
    z-index: 100;
    max-height: 200px;
    overflow-y: auto;

    .suggestion-item {
      padding: $space-3 $space-4;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: $neutral-50;
      }

      &:not(:last-child) {
        border-bottom: 1px solid $neutral-200;
      }
    }
  }
}
</style>
```

### 1.9 方言交互设计

#### 1.9.1 方言选择组件

```vue
<template>
  <div class="dialect-selector">
    <el-select v-model="selectedDialect" placeholder="选择方言" @change="handleDialectChange">
      <el-option
        v-for="dialect in dialects"
        :key="dialect.code"
        :label="dialect.name"
        :value="dialect.code"
      >
        <div class="dialect-option">
          <span class="dialect-name">{{ dialect.name }}</span>
          <span class="dialect-region">{{ dialect.region }}</span>
        </div>
      </el-option>
    </el-select>

    <div v-if="selectedDialect" class="dialect-status">
      <el-tag type="success" size="small">
        <i class="icon-language"></i>
        当前方言: {{ getCurrentDialectName() }}
      </el-tag>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const selectedDialect = ref('')

const dialects = [
  { code: 'pcc', name: '普通话', region: '全国通用' },
  { code: 'pcc-qn', name: '闽南语', region: '福建、台湾' },
  { code: 'yue', name: '粤语', region: '广东、广西' },
  { code: 'hakka', name: '客家话', region: '广东、江西' },
  { code: 'wu', name: '吴语', region: '江苏、浙江' },
  { code: 'xiang', name: '湘语', region: '湖南' },
  { code: 'gan', name: '赣语', region: '江西' },
  { code: 'minbei', name: '闽北语', region: '福建北部' },
  { code: 'mindong', name: '闽东语', region: '福建东部' },
  // 更多方言...
]

const handleDialectChange = (value) => {
  // 保存方言偏好
  localStorage.setItem('preferredDialect', value)
  // 切换语音识别引擎
  switchSpeechEngine(value)
}

const getCurrentDialectName = () => {
  const dialect = dialects.find(d => d.code === selectedDialect.value)
  return dialect ? dialect.name : ''
}

const switchSpeechEngine = (dialectCode) => {
  // 根据方言切换语音识别引擎
  // 这里会调用后端API进行配置
}
</script>

<style lang="scss">
.dialect-selector {
  display: flex;
  align-items: center;
  gap: $space-4;

  .dialect-option {
    display: flex;
    flex-direction: column;

    .dialect-name {
      font-weight: 500;
    }

    .dialect-region {
      font-size: $font-xs;
      color: $neutral-500;
    }
  }

  .dialect-status {
    display: flex;
    align-items: center;
    gap: $space-2;
  }
}
</style>
```

---

## 二、API设计规范

### 2.1 API设计原则

#### RESTful API设计规范
1. **资源导向**：URL表示资源，HTTP方法表示操作
2. **状态码规范**：使用标准HTTP状态码
3. **版本控制**：通过URL路径或Header进行版本管理
4. **统一响应格式**：标准化的JSON响应结构
5. **错误处理**：统一的错误响应格式

### 2.2 API基础规范

#### 2.2.1 URL规范

```
基础URL: https://api.smartvillage.com/v1

格式: /{version}/{resource}/{id?}/{sub-resource?}

示例:
GET    /v1/villages              # 获取村庄列表
POST   /v1/villages              # 创建新村庄
GET    /v1/villages/{id}         # 获取特定村庄
PUT    /v1/villages/{id}         # 更新村庄信息
DELETE /v1/villages/{id}         # 删除村庄
GET    /v1/villages/{id}/residents # 获取村庄村民列表
```

#### 2.2.2 HTTP方法使用

| 方法 | 用途 | 幂等性 | 安全性 |
|------|------|--------|--------|
| GET | 查询资源 | 是 | 是 |
| POST | 创建资源 | 否 | 否 |
| PUT | 完整更新资源 | 是 | 否 |
| PATCH | 部分更新资源 | 否 | 否 |
| DELETE | 删除资源 | 是 | 否 |

#### 2.2.3 状态码规范

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功，无返回内容 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable Entity | 请求格式正确但语义错误 |
| 500 | Internal Server Error | 服务器内部错误 |

#### 2.2.4 统一响应格式

```json
// 成功响应
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    // 具体数据
  },
  "meta": {
    "timestamp": "2025-12-20T10:00:00Z",
    "requestId": "req_123456789",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}

// 错误响应
{
  "success": false,
  "code": 400,
  "message": "请求参数错误",
  "error": {
    "type": "ValidationError",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-12-20T10:00:00Z",
    "requestId": "req_123456789"
  }
}
```

### 2.3 核心API设计

#### 2.3.1 认证授权API

```yaml
# 用户登录
POST /v1/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "captcha": "string",
  "loginType": "password|face|voice"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 3600,
    "user": {
      "id": "user_id",
      "name": "用户姓名",
      "role": "villager|admin|committee",
      "villageId": "village_id",
      "avatar": "avatar_url",
      "permissions": ["read", "write"]
    }
  }
}

# 人脸识别登录
POST /v1/auth/face-login
Content-Type: multipart/form-data

faceImage: File
villageId: string

# 刷新Token
POST /v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "string"
}

# 用户登出
POST /v1/auth/logout
Authorization: Bearer {token}

# 语音认证
POST /v1/auth/voice-auth
Content-Type: multipart/form-data

voiceFile: File
text: string
dialect: string
```

#### 2.3.2 村民管理API

```yaml
# 获取村民列表
GET /v1/villages/{villageId}/residents?page=1&limit=20&search=keyword&familyType=lows

Parameters:
- page: 页码
- limit: 每页数量
- search: 搜索关键词
- familyType: 家庭类型(low_income|one_child|elderly|disabled)
- ageGroup: 年龄组(children|youth|middle_aged|elderly)

Response:
{
  "success": true,
  "data": [
    {
      "id": "resident_id",
      "name": "姓名",
      "idNumber": "身份证号(脱敏)",
      "gender": "male|female",
      "birthDate": "1950-01-01",
      "age": 75,
      "phone": "138****1234",
      "address": "详细地址",
      "familyId": "family_id",
      "familyRole": "holder|spouse|child|parent",
      "education": "education_level",
      "occupation": "occupation",
      "healthStatus": "healthy|chronic_disease|disability",
      "specialTags": ["low_income", "elderly"],
      "avatar": "avatar_url",
      "createdAt": "2025-01-01",
      "updatedAt": "2025-12-20"
    }
  ]
}

# 创建村民档案
POST /v1/villages/{villageId}/residents
Content-Type: application/json

{
  "name": "string",
  "idNumber": "string",
  "gender": "male|female",
  "birthDate": "date",
  "phone": "string",
  "address": "string",
  "familyId": "string",
  "familyRole": "holder|spouse|child|parent",
  "education": "string",
  "occupation": "string",
  "healthStatus": "healthy|chronic_disease|disability",
  "specialTags": ["string"]
}

# 更新村民信息
PUT /v1/villages/{villageId}/residents/{residentId}
Content-Type: application/json

# OCR识别身份证
POST /v1/residents/ocr-scan
Content-Type: multipart/form-data

idCardImage: File
faceImage: File

Response:
{
  "success": true,
  "data": {
    "extractedInfo": {
      "name": "识别的姓名",
      "idNumber": "识别的身份证号",
      "gender": "识别的性别",
      "birthDate": "识别的出生日期",
      "address": "识别的地址"
    },
    "confidence": 0.95
  }
}
```

#### 2.3.3 村务管理API

```yaml
# 公告管理
GET /v1/villages/{villageId}/announcements
POST /v1/villages/{villageId}/announcements
PUT /v1/villages/{villageId}/announcements/{id}
DELETE /v1/villages/{villageId}/announcements/{id}

# 公告结构
{
  "id": "announcement_id",
  "title": "公告标题",
  "content": "公告内容",
  "type": "notice|policy|emergency|activity",
  "priority": "normal|important|urgent",
  "attachments": ["file_url"],
  "publishDate": "datetime",
  "expiryDate": "datetime",
  "publisher": {
    "id": "user_id",
    "name": "发布者姓名"
  },
  "stats": {
    "views": 100,
    "likes": 20,
    "comments": 5
  }
}

# 会议管理
GET /v1/villages/{villageId}/meetings
POST /v1/villages/{villageId}/meetings

# 会议结构
{
  "id": "meeting_id",
  "title": "会议标题",
  "description": "会议描述",
  "date": "datetime",
  "duration": 120,
  "location": "会议地点",
  "type": "regular|emergency|special",
  "attendees": ["user_id"],
  "agenda": ["议程项"],
  "materials": ["file_url"],
  "status": "scheduled|ongoing|completed|cancelled"
}

# 任务调度
GET /v1/villages/{villageId}/tasks
POST /v1/villages/{villageId}/tasks
PUT /v1/villages/{villageId}/tasks/{id}/status

# 任务结构
{
  "id": "task_id",
  "title": "任务标题",
  "description": "任务描述",
  "type": "patrol|emergency|maintenance|event",
  "priority": "low|medium|high|urgent",
  "assignee": {
    "id": "user_id",
    "name": "负责人姓名"
  },
  "dueDate": "datetime",
  "status": "pending|in_progress|completed|cancelled",
  "location": {
    "latitude": 0,
    "longitude": 0,
    "address": "任务地址"
  },
  "requirements": ["任务要求"],
  "report": {
    "content": "执行报告",
    "photos": ["photo_url"],
    "submittedAt": "datetime"
  }
}
```

#### 2.3.4 财务管理API

```yaml
# 收支记录
GET /v1/villages/{villageId}/finance/records
POST /v1/villages/{villageId}/finance/records

# 财务记录结构
{
  "id": "record_id",
  "type": "income|expense",
  "category": "农业补贴|办公经费|项目建设|其他",
  "amount": 1000.00,
  "description": "收支说明",
  "date": "datetime",
  "receipt": {
    "url": "receipt_image_url",
    "ocrData": {
      "vendor": "供应商",
      "amount": 1000.00,
      "date": "2025-12-20"
    }
  },
  "approval": {
    "status": "pending|approved|rejected",
    "approver": "审批人",
    "approvedAt": "datetime",
    "comment": "审批意见"
  },
  "createdBy": {
    "id": "user_id",
    "name": "录入人"
  }
}

# 财务报表
GET /v1/villages/{villageId}/finance/reports?startDate=2025-01-01&endDate=2025-12-31&type=monthly|yearly

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalIncome": 100000.00,
      "totalExpense": 80000.00,
      "balance": 20000.00,
      "period": "2025年度"
    },
    "categories": [
      {
        "category": "农业补贴",
        "income": 50000.00,
        "expense": 0,
        "percentage": 50.0
      }
    ],
    "monthlyTrend": [
      {
        "month": "2025-01",
        "income": 8000.00,
        "expense": 6500.00
      }
    ]
  }
}

# OCR票据识别
POST /v1/finance/ocr-receipt
Content-Type: multipart/form-data

receiptImage: File

Response:
{
  "success": true,
  "data": {
    "vendor": "供应商名称",
    "amount": 1000.00,
    "date": "2025-12-20",
    "items": [
      {
        "name": "商品名称",
        "quantity": 2,
        "unitPrice": 500.00,
        "total": 1000.00
      }
    ],
    "confidence": 0.92
  }
}
```

#### 2.3.5 应急响应API

```yaml
# 应急事件上报
POST /v1/villages/{villageId}/emergency/reports
Content-Type: application/json

{
  "type": "fire|flood|accident|medical|security",
  "severity": "low|medium|high|critical",
  "location": {
    "latitude": 0,
    "longitude": 0,
    "address": "事件地址"
  },
  "description": "事件描述",
  "photos": ["photo_url"],
  "contacts": [
    {
      "name": "联系人姓名",
      "phone": "联系电话"
    }
  ],
  "reporter": {
    "id": "user_id",
    "name": "上报人姓名"
  }
}

# 应急预案启动
POST /v1/villages/{villageId}/emergency/plans/{planId}/activate
Content-Type: application/json

{
  "severity": "high",
  "affectedArea": "影响区域描述",
  "resources": ["需要的资源"],
  "commands": ["具体指令"]
}

# 救援资源调度
GET /v1/villages/{villageId}/emergency/resources?type=pump|fire_extinguisher|ambulance
POST /v1/villages/{villageId}/emergency/resources/dispatch

# 资源结构
{
  "id": "resource_id",
  "type": "pump|fire_extinguisher|medical_kit",
  "name": "资源名称",
  "location": {
    "latitude": 0,
    "longitude": 0,
    "address": "存放地址"
  },
  "status": "available|in_use|maintenance",
  "quantity": 10,
  "responsible": {
    "id": "user_id",
    "name": "负责人"
  },
  "lastChecked": "datetime"
}
```

#### 2.3.6 电子商务API

```yaml
# 农产品管理
GET /v1/villages/{villageId}/products
POST /v1/villages/{villageId}/products

# 产品结构
{
  "id": "product_id",
  "name": "产品名称",
  "category": "蔬菜|水果|粮食|特产",
  "description": "产品描述",
  "price": 10.50,
  "unit": "斤|公斤|箱",
  "stock": 100,
  "images": ["image_url"],
  "origin": {
    "village": "产地村庄",
    "producer": "生产者",
    "certification": ["有机认证", "绿色食品"]
  },
  "harvestDate": "datetime",
  "shelfLife": 7,
  "status": "available|sold_out|offline",
  "seller": {
    "id": "user_id",
    "name": "销售者",
    "phone": "联系电话"
  }
}

# 订单管理
GET /v1/orders
POST /v1/orders
PUT /v1/orders/{orderId}/status

# 订单结构
{
  "id": "order_id",
  "orderNumber": "订单编号",
  "buyer": {
    "id": "user_id",
    "name": "购买者",
    "phone": "联系电话",
    "address": "收货地址"
  },
  "items": [
    {
      "product": "product_id",
      "productName": "产品名称",
      "quantity": 5,
      "unitPrice": 10.50,
      "total": 52.50
    }
  ],
  "totalAmount": 52.50,
  "status": "pending|confirmed|shipped|delivered|cancelled",
  "payment": {
    "method": "wechat|alipay|cash",
    "status": "paid|unpaid|refunded",
    "paidAt": "datetime"
  },
  "delivery": {
    "method": "pickup|delivery",
    "trackingNumber": "快递单号",
    "estimatedDate": "datetime",
    "deliveredAt": "datetime"
  },
  "createdAt": "datetime",
  "updatedAt": "datetime"
}

# 支付接口
POST /v1/payments
Content-Type: application/json

{
  "orderId": "order_id",
  "amount": 52.50,
  "method": "wechat|alipay",
  "returnUrl": "支付成功返回URL",
  "notifyUrl": "支付通知URL"
}

Response:
{
  "success": true,
  "data": {
    "paymentId": "payment_id",
    "paymentUrl": "支付链接",
    "qrCode": "二维码base64",
    "expiresIn": 900
  }
}
```

#### 2.3.7 AI智能服务API

```yaml
# 语音识别
POST /v1/ai/speech/recognize
Content-Type: multipart/form-data

audio: File
dialect: string  # 方言代码
context: string  # 上下文提示

Response:
{
  "success": true,
  "data": {
    "text": "识别的文本",
    "confidence": 0.95,
    "alternatives": ["备选文本"],
    "language": "zh-CN",
    "dialect": "pcc"
  }
}

# 语音合成
POST /v1/ai/speech/synthesize
Content-Type: application/json

{
  "text": "要合成的文本",
  "dialect": "string",
  "voice": "male|female|elderly",
  "speed": 1.0,
  "pitch": 1.0
}

Response: 音频文件流

# 人脸识别
POST /v1/ai/face/recognize
Content-Type: multipart/form-data

faceImage: File
villageId: string

Response:
{
  "success": true,
  "data": {
    "matched": true,
    "userId": "user_id",
    "confidence": 0.98,
    "features": {
      "age": 45,
      "gender": "male",
      "emotion": "neutral"
    }
  }
}

# 智能问答
POST /v1/ai/chat
Content-Type: application/json

{
  "message": "用户问题",
  "context": "对话上下文",
  "dialect": "string",
  "userId": "user_id"
}

Response:
{
  "success": true,
  "data": {
    "reply": "回复内容",
    "intent": "查询天气|办事咨询|政策解读",
    "entities": {
      "location": "北京",
      "date": "明天"
    },
    "actions": [
      {
        "type": "weather_query",
        "parameters": {}
      }
    ],
    "suggestions": ["相关建议"]
  }
}

# OCR识别
POST /v1/ai/ocr/recognize
Content-Type: multipart/form-data

image: File
type: "id_card|receipt|form|document"

Response:
{
  "success": true,
  "data": {
    "text": "识别的完整文本",
    "fields": {
      "name": "字段值",
      "idNumber": "身份证号"
    },
    "confidence": 0.95,
    "layout": {
      "bbox": [x, y, width, height]
    }
  }
}
```

### 2.4 安全和权限规范

#### 2.4.1 认证机制

```yaml
# JWT Token结构
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "iss": "smartvillage",
    "aud": "smartvillage-app",
    "exp": 1734782400,
    "iat": 1734778800,
    "scope": ["read", "write"],
    "role": "admin|committee|villager",
    "villageId": "village_id",
    "permissions": ["user.read", "user.write", "finance.read"]
  }
}
```

#### 2.4.2 权限控制

```yaml
# 角色权限矩阵
roles:
  villager:
    - profile.read
    - profile.write
    - announcement.read
    - service.apply
    - order.create

  committee:
    - villager.*
    - resident.read
    - resident.write
    - announcement.*
    - meeting.*
    - task.*

  admin:
    - committee.*
    - village.manage
    - system.config
    - data.export
```

#### 2.4.3 API限流

```yaml
# 限流规则
rate_limits:
  default:
    window: 1m
    max_requests: 100

  auth:
    window: 1m
    max_requests: 10

  upload:
    window: 1m
    max_requests: 5
    max_size: 10MB

  ai:
    window: 1m
    max_requests: 20
```

---

## 三、数据库设计规范

### 3.1 数据库选型说明

采用 **MongoDB** 作为主数据库，原因如下：
1. **灵活的文档结构**：适合农村多样化的数据需求
2. **水平扩展能力强**：支持未来大规模部署
3. **JSON原生支持**：与前端JavaScript无缝对接
4. **地理位置支持**：原生支持地理空间查询
5. **丰富的查询能力**：支持复杂的聚合查询

### 3.2 数据库设计原则

1. **嵌入 vs 引用**：根据数据访问频率决定
2. **索引优化**：为常用查询建立合适的索引
3. **数据一致性**：通过应用层保证
4. **分片策略**：按村庄ID进行分片
5. **数据归档**：历史数据定期归档

### 3.3 核心数据模型

#### 3.3.1 村庄模型 (Villages)

```javascript
{
  _id: ObjectId("..."),

  // 基本信息
  code: "330106001",  // 行政村编码
  name: "余杭街道XX村",
  province: "浙江省",
  city: "杭州市",
  district: "余杭区",
  address: "详细地址",

  // 地理信息
  location: {
    type: "Point",
    coordinates: [120.123456, 30.123456]  // [longitude, latitude]
  },
  boundary: {
    type: "Polygon",
    coordinates: [[[...]]]  // 村庄边界坐标
  },
  area: 12.5,  // 平方公里

  // 联系信息
  contact: {
    phone: "0571-12345678",
    email: "village@example.com",
    address: "村委会地址"
  },

  // 负责人信息
  administrator: {
    userId: ObjectId("..."),
    name: "村支书姓名",
    phone: "13812345678"
  },

  // 统计信息
  statistics: {
    totalPopulation: 2500,
    households: 800,
    elderly: 350,
    children: 400,
    lowIncome: 50
  },

  // 配置信息
  settings: {
    defaultDialect: "pcc",  // 默认方言
    timezone: "Asia/Shanghai",
    features: {
      faceAuth: true,
      voiceAssistant: true,
      onlinePayment: true
    }
  },

  // 状态信息
  status: "active",  // active, inactive, archived
  createdAt: ISODate("2025-01-01T00:00:00Z"),
  updatedAt: ISODate("2025-12-20T10:00:00Z")
}

// 索引
db.villages.createIndex({ "code": 1 }, { unique: true })
db.villages.createIndex({ "location": "2dsphere" })
db.villages.createIndex({ "status": 1 })
db.villages.createIndex({ "administrator.userId": 1 })
```

#### 3.3.2 用户模型 (Users)

```javascript
{
  _id: ObjectId("..."),

  // 基本信息
  username: "user123",
  password: "$2b$10$...",  // bcrypt加密
  phone: "13812345678",
  email: "user@example.com",

  // 个人信息
  profile: {
    name: "张三",
    gender: "male",  // male, female
    birthDate: ISODate("1960-01-01"),
    age: 65,
    idNumber: "330106196001011234",  // 加密存储
    avatar: "https://cdn.example.com/avatar.jpg"
  },

  // 认证信息
  authentication: {
    faceFeatures: [...],  // 人脸特征向量
    voicePrint: "...",    // 声纹特征
    lastLoginAt: ISODate("2025-12-20T09:00:00Z"),
    loginAttempts: 0,
    lockedUntil: null
  },

  // 权限角色
  role: "villager",  // admin, committee, villager
  villageId: ObjectId("..."),
  permissions: [
    "profile.read",
    "profile.write",
    "announcement.read"
  ],

  // 村民信息（仅村民角色）
  residentInfo: {
    familyId: ObjectId("..."),
    familyRole: "holder",  // holder, spouse, child, parent
    address: "具体地址",
    householdType: "普通户",  // 低保户, 独生户, 等
    specialTags: ["elderly", "low_income"],
    skills: ["种植", "养殖"]
  },

  // 偏好设置
  preferences: {
    dialect: "pcc-qn",  // 方言偏好
    largeTextMode: false,
    voiceNotification: true,
    language: "zh-CN"
  },

  // 状态
  status: "active",  // active, inactive, suspended
  createdAt: ISODate("2025-01-01T00:00:00Z"),
  updatedAt: ISODate("2025-12-20T10:00:00Z")
}

// 索引
db.users.createIndex({ "username": 1 }, { unique: true })
db.users.createIndex({ "phone": 1 }, { unique: true })
db.users.createIndex({ "villageId": 1 })
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "status": 1 })
db.users.createIndex({ "residentInfo.familyId": 1 })
```

#### 3.3.3 家庭模型 (Families)

```javascript
{
  _id: ObjectId("..."),

  // 基本信息
  familyCode: "F202501001",  // 家庭编码
  villageId: ObjectId("..."),

  // 户主信息
  holder: {
    userId: ObjectId("..."),
    name: "户主姓名",
    idNumber: "330106...",
    phone: "13812345678"
  },

  // 家庭成员
  members: [
    {
      userId: ObjectId("..."),
      name: "成员姓名",
      relation: "holder",  // holder, spouse, son, daughter, parent
      idNumber: "330106...",
      birthDate: ISODate("..."),
      gender: "male",
      phone: "13912345678",
      education: "高中",
      occupation: "农民",
      healthStatus: "healthy",
      specialTags: ["elderly"]
    }
  ],

  // 住房信息
  housing: {
    type: "自建房",  // 自建房, 公租房, 等
    area: 120,  // 平方米
    rooms: 4,
    address: "具体地址",
    hasInternet: true,
    hasElderlyFacilities: true
  },

  // 经济状况
  economy: {
    annualIncome: 50000,
    mainSource: "种植业",  // 种植业, 养殖业, 外出务工, 等
    povertyStatus: "non_poor",  // non_poor, low_income, poor
    subsidies: ["养老保险", "医疗保险"]
  },

  // 土地信息
  land: {
    farmland: 5.2,  // 耕地(亩)
    forest: 2.1,    // 林地(亩)
    construction: 0.3  // 宅基地(亩)
  },

  // 二维码
  qrCode: "https://smartvillage.com/family/F202501001",

  createdAt: ISODate("2025-01-01T00:00:00Z"),
  updatedAt: ISODate("2025-12-20T10:00:00Z")
}

// 索引
db.families.createIndex({ "familyCode": 1 }, { unique: true })
db.families.createIndex({ "villageId": 1 })
db.families.createIndex({ "holder.userId": 1 })
db.families.createIndex({ "members.userId": 1 })
db.families.createIndex({ "members.relation": 1 })
db.families.createIndex({ "economy.povertyStatus": 1 })
```

#### 3.3.4 公告模型 (Announcements)

```javascript
{
  _id: ObjectId("..."),

  villageId: ObjectId("..."),

  // 基本信息
  title: "关于2025年春节放假的通知",
  content: "根据上级通知...",
  summary: "春节放假安排",

  // 分类
  type: "notice",  // notice, policy, emergency, activity
  priority: "normal",  // normal, important, urgent

  // 发布信息
  publisher: {
    userId: ObjectId("..."),
    name: "发布者姓名",
    role: "committee"
  },
  publishDate: ISODate("2025-12-20T10:00:00Z"),
  expiryDate: ISODate("2025-02-28T23:59:59Z"),

  // 附件
  attachments: [
    {
      filename: "春节放假通知.pdf",
      url: "https://cdn.example.com/file.pdf",
      size: 1024000,
      type: "application/pdf"
    }
  ],

  // 目标群体
  targetAudience: {
    roles: ["all"],  // all, committee, villagers
    ageGroups: [],   // children, youth, middle_aged, elderly
    families: [],    // 特定家庭ID列表
    tags: []         // 特殊标签
  },

  // 语音版本
  voiceVersion: {
    url: "https://cdn.example.com/voice.mp3",
    dialects: {
      "pcc": "https://cdn.example.com/voice_pcc.mp3",
      "pcc-qn": "https://cdn.example.com/voice_min.mp3",
      "yue": "https://cdn.example.com/voice_cantonese.mp3"
    }
  },

  // 统计信息
  stats: {
    views: 580,
    uniqueViews: 320,
    likes: 45,
    shares: 12,
    comments: 8
  },

  // 互动记录
  interactions: [
    {
      userId: ObjectId("..."),
      type: "view",  // view, like, share, comment
      timestamp: ISODate("2025-12-20T10:30:00Z")
    }
  ],

  status: "published",  // draft, published, expired, archived
  createdAt: ISODate("2025-12-20T09:00:00Z"),
  updatedAt: ISODate("2025-12-20T10:00:00Z")
}

// 索引
db.announcements.createIndex({ "villageId": 1, "publishDate": -1 })
db.announcements.createIndex({ "villageId": 1, "type": 1 })
db.announcements.createIndex({ "villageId": 1, "priority": 1 })
db.announcements.createIndex({ "publisher.userId": 1 })
db.announcements.createIndex({ "status": 1 })
db.announcements.createIndex({ "expiryDate": 1 }, { expireAfterSeconds: 0 })
```

#### 3.3.5 财务记录模型 (FinanceRecords)

```javascript
{
  _id: ObjectId("..."),

  villageId: ObjectId("..."),

  // 基本信息
  type: "income",  // income, expense
  category: "农业补贴",  // 分类
  subcategory: "粮食直补",

  // 金额
  amount: NumberDecimal("5000.00"),
  currency: "CNY",

  // 描述
  description: "2025年粮食直补资金",
  details: "按实际种植面积发放",

  // 日期
  date: ISODate("2025-12-20T00:00:00Z"),
  accountingPeriod: "2025-12",  // 会计期间

  // 相关方
  counterparty: {
    name: "杭州市农业局",
    type: "government",  // government, company, individual
    accountNumber: "123456789"
  },

  // 凭证
  receipt: {
    number: "20251220001",
    type: "发票",  // 发票, 收据, 银行流水
    images: [
      {
        url: "https://cdn.example.com/receipt.jpg",
        thumbnail: "https://cdn.example.com/thumb_receipt.jpg"
      }
    ],
    ocrData: {
      vendor: "杭州市农业局",
      amount: "5000.00",
      date: "2025年12月20日",
      confidence: 0.98
    }
  },

  // 审批流程
  approval: {
    status: "approved",  // pending, approved, rejected
    workflow: [
      {
        step: 1,
        role: "accountant",
        userId: ObjectId("..."),
        name: "会计",
        action: "approve",
        comment: "审核通过",
        timestamp: ISODate("2025-12-20T10:00:00Z")
      }
    ],
    approvedBy: {
      userId: ObjectId("..."),
      name: "村主任"
    },
    approvedAt: ISODate("2025-12-20T11:00:00Z")
  },

  // 预算关联
  budget: {
    categoryId: ObjectId("..."),
    categoryName: "农业补贴预算",
    plannedAmount: NumberDecimal("100000.00"),
    usedAmount: NumberDecimal("5000.00"),
    remainingAmount: NumberDecimal("95000.00")
  },

  // 标签
  tags: ["惠农政策", "2025年", "农业"],

  // 录入信息
  createdBy: {
    userId: ObjectId("..."),
    name: "录入员"
  },

  status: "confirmed",  // draft, confirmed, archived
  createdAt: ISODate("2025-12-20T09:00:00Z"),
  updatedAt: ISODate("2025-12-20T11:00:00Z")
}

// 索引
db.financeRecords.createIndex({ "villageId": 1, "date": -1 })
db.financeRecords.createIndex({ "villageId": 1, "type": 1, "date": -1 })
db.financeRecords.createIndex({ "villageId": 1, "category": 1 })
db.financeRecords.createIndex({ "approval.status": 1 })
db.financeRecords.createIndex({ "budget.categoryId": 1 })
db.financeRecords.createIndex({ "tags": 1 })
```

#### 3.3.6 任务模型 (Tasks)

```javascript
{
  _id: ObjectId("..."),

  villageId: ObjectId("..."),

  // 基本信息
  title: "巡查村内消防安全设施",
  description: "检查各户消防器材是否齐全有效",
  type: "patrol",  // patrol, emergency, maintenance, event

  // 优先级
  priority: "medium",  // low, medium, high, urgent

  // 分配信息
  assignee: {
    userId: ObjectId("..."),
    name: "网格员张三",
    role: "grid_worker",
    phone: "13812345678"
  },

  // 时间信息
  createdAt: ISODate("2025-12-20T09:00:00Z"),
  scheduledAt: ISODate("2025-12-21T08:00:00Z"),
  dueDate: ISODate("2025-12-21T18:00:00Z"),
  estimatedDuration: 120,  // 分钟

  // 位置信息
  location: {
    type: "Point",
    coordinates: [120.123456, 30.123456],
    address: "XX村文化活动中心",
    radius: 500  // 巡查范围(米)
  },

  // 任务要求
  requirements: [
    "检查灭火器压力",
    "查看消防通道是否通畅",
    "记录发现的问题"
  ],

  // 检查清单
  checklist: [
    {
      item: "灭火器检查",
      required: true,
      completed: false
    },
    {
      item: "消防通道检查",
      required: true,
      completed: false
    }
  ],

  // 执行报告
  report: {
    status: "in_progress",  // pending, in_progress, completed, cancelled
    progress: 60,  // 百分比
    startTime: ISODate("2025-12-21T08:30:00Z"),
    notes: "已检查东片区域",
    photos: [
      {
        url: "https://cdn.example.com/photo1.jpg",
        location: {
          type: "Point",
          coordinates: [120.123456, 30.123456]
        },
        timestamp: ISODate("2025-12-21T09:00:00Z"),
        description: "消防通道照片"
      }
    ],
    issues: [
      {
        description: "3号楼灭火器过期",
        severity: "high",
        photos: ["photo_url"],
        reportedAt: ISODate("2025-12-21T10:00:00Z")
      }
    ]
  },

  // 评价
  evaluation: {
    rating: 5,  // 1-5星
    feedback: "任务完成及时",
    evaluatedBy: ObjectId("..."),
    evaluatedAt: ISODate("2025-12-21T18:30:00Z")
  },

  // 相关资源
  resources: [
    {
      type: "fire_extinguisher",
      name: "灭火器",
      quantity: 2,
      assignedAt: ISODate("2025-12-21T08:00:00Z")
    }
  ],

  // 工作流
  workflow: {
    currentStep: "execution",
    steps: [
      {
        name: "assignment",
        status: "completed",
        completedAt: ISODate("2025-12-20T09:30:00Z")
      },
      {
        name: "execution",
        status: "in_progress"
      },
      {
        name: "review",
        status: "pending"
      }
    ]
  },

  // 状态
  status: "in_progress",  // pending, assigned, in_progress, completed, cancelled

  updatedAt: ISODate("2025-12-21T10:00:00Z")
}

// 索引
db.tasks.createIndex({ "villageId": 1, "status": 1 })
db.tasks.createIndex({ "villageId": 1, "assignee.userId": 1 })
db.tasks.createIndex({ "villageId": 1, "type": 1 })
db.tasks.createIndex({ "villageId": 1, "priority": 1 })
db.tasks.createIndex({ "villageId": 1, "dueDate": 1 })
db.tasks.createIndex({ "location": "2dsphere" })
```

#### 3.3.7 产品模型 (Products)

```javascript
{
  _id: ObjectId("..."),

  // 基本信息
  name: "有机大米",
  description: "本地种植的优质有机大米",
  category: "grain",  // vegetable, fruit, grain, specialty, livestock

  // 产地信息
  origin: {
    villageId: ObjectId("..."),
    villageName: "XX村",
    producer: {
      userId: ObjectId("..."),
      name: "农户李四",
      phone: "13812345678",
      certification: ["有机认证", "绿色食品认证"]
    },
    location: {
      type: "Point",
      coordinates: [120.123456, 30.123456]
    }
  },

  // 价格和库存
  price: NumberDecimal("12.50"),
  originalPrice: NumberDecimal("15.00"),
  unit: "斤",  // 斤, 公斤, 箱, 个
  stock: 500,  // 库存数量
  minOrder: 1,  // 最小订购量
  maxOrder: 100,  // 最大订购量

  // 质量信息
  quality: {
    grade: "特级",
    certification: ["有机认证", "无公害认证"],
    testDate: ISODate("2025-10-01"),
    expiryDate: ISODate("2026-10-01"),
    shelfLife: 365,  // 天
    storageConditions: "阴凉干燥处"
  },

  // 生产信息
  production: {
    plantDate: ISODate("2025-05-01"),
    harvestDate: ISODate("2025-10-01"),
    harvestSeason: "秋季",
    farmingMethod: "有机种植",
    pesticides: "无",
    fertilizers: "有机肥"
  },

  // 媒体资源
  images: [
    {
      url: "https://cdn.example.com/product1.jpg",
      thumbnail: "https://cdn.example.com/thumb_product1.jpg",
      alt: "有机大米产品图",
      order: 1
    },
    {
      url: "https://cdn.example.com/product2.jpg",
      alt: "有机大米包装图",
      order: 2
    }
  ],

  video: {
    url: "https://cdn.example.com/product_video.mp4",
    thumbnail: "https://cdn.example.com/video_thumb.jpg",
    duration: 60
  },

  // 物流信息
  logistics: {
    packaging: "真空包装",
    weight: 2.5,  // kg
    dimensions: {
      length: 30,
      width: 20,
      height: 10
    },
    shipping: {
      free: true,
      minAmountForFree: NumberDecimal("100.00"),
      methods: ["快递", "自提"]
    }
  },

  // 评价统计
  rating: {
    average: 4.8,
    count: 156,
    distribution: {
      5: 120,
      4: 25,
      3: 8,
      2: 2,
      1: 1
    }
  },

  // 销售信息
  sales: {
    totalSold: 1250,
    monthlySold: 150,
    revenue: NumberDecimal("15625.00"),
    lastSoldAt: ISODate("2025-12-19T15:00:00Z")
  },

  // SEO信息
  seo: {
    keywords: ["有机大米", "优质大米", "本地农产品"],
    description: "XX村生产的优质有机大米，无农药无化肥",
    title: "有机大米 - XX村直供"
  },

  // 标签
  tags: ["有机", "当季", "直供", "无农药"],

  // 状态
  status: "available",  // available, sold_out, offline, deleted

  createdAt: ISODate("2025-10-01T00:00:00Z"),
  updatedAt: ISODate("2025-12-20T10:00:00Z")
}

// 索引
db.products.createIndex({ "origin.villageId": 1, "status": 1 })
db.products.createIndex({ "origin.producer.userId": 1 })
db.products.createIndex({ "category": 1 })
db.products.createIndex({ "price": 1 })
db.products.createIndex({ "rating.average": -1 })
db.products.createIndex({ "sales.monthlySold": -1 })
db.products.createIndex({ "tags": 1 })
db.products.createIndex({ "name": "text", "description": "text" })
```

### 3.4 数据库索引策略

#### 3.4.1 复合索引

```javascript
// 村民查询优化
db.residents.createIndex({
  "villageId": 1,
  "status": 1,
  "specialTags": 1
})

// 财务查询优化
db.financeRecords.createIndex({
  "villageId": 1,
  "type": 1,
  "date": -1,
  "approval.status": 1
})

// 任务查询优化
db.tasks.createIndex({
  "villageId": 1,
  "assignee.userId": 1,
  "status": 1,
  "dueDate": 1
})

// 产品搜索优化
db.products.createIndex({
  "origin.villageId": 1,
  "category": 1,
  "status": 1,
  "price": 1
})
```

#### 3.4.2 地理空间索引

```javascript
// 村庄边界查询
db.villages.createIndex({ "boundary": "2dsphere" })

// 位置附近查询
db.residents.createIndex({ "location": "2dsphere" })
db.tasks.createIndex({ "location": "2dsphere" })
db.resources.createIndex({ "location": "2dsphere" })
```

#### 3.4.3 文本搜索索引

```javascript
// 全文搜索
db.announcements.createIndex({
  "title": "text",
  "content": "text",
  "tags": "text"
}, {
  weights: {
    "title": 10,
    "content": 5,
    "tags": 8
  }
})

db.products.createIndex({
  "name": "text",
  "description": "text",
  "tags": "text"
})
```

### 3.5 数据分片策略

#### 3.5.1 分片键选择

```javascript
// 按村庄ID分片
sh.shardCollection("smartvillage.residents", { "villageId": 1 })
sh.shardCollection("smartvillage.announcements", { "villageId": 1 })
sh.shardCollection("smartvillage.tasks", { "villageId": 1 })
sh.shardCollection("smartvillage.financeRecords", { "villageId": 1 })

// 时间序列数据分片
sh.shardCollection("smartvillage.auditLogs", { "villageId": 1, "timestamp": 1 })
sh.shardCollection("smartvillage.statistics", { "villageId": 1, "date": 1 })
```

### 3.6 数据归档策略

#### 3.6.1 归档规则

```javascript
// 1年前的公告归档
db.announcements.updateMany(
  {
    "publishDate": { $lt: new Date(Date.now() - 365*24*60*60*1000) },
    "status": "published"
  },
  { $set: { "status": "archived" } }
)

// 2年前的财务记录归档
db.financeRecords.updateMany(
  {
    "date": { $lt: new Date(Date.now() - 2*365*24*60*60*1000) },
    "status": "confirmed"
  },
  { $set: { "status": "archived" } }
)

// 已完成的任务保留1年
db.tasks.deleteMany({
  "status": "completed",
  "updatedAt": { $lt: new Date(Date.now() - 365*24*60*60*1000) }
})
```

---

## 四、设计总结

### 4.1 技术栈总结

**前端技术栈**
- Vue 3 + Composition API
- Element Plus UI框架
- Tailwind CSS 4
- Pinia状态管理
- Vue Router 4
- Axios HTTP客户端
- Socket.IO客户端

**后端技术栈**
- Node.js + Express.js
- MongoDB + Mongoose
- Redis缓存
- Socket.IO实时通信
- JWT认证
- Multer文件上传
- Sharp图片处理

**AI/智能服务**
- 讯飞语音识别
- 百度AI人脸识别
- 腾讯OCR识别
- 自然大语言模型

### 4.2 设计亮点

1. **适老化设计**
   - 大字模式切换
   - 高对比度配色
   - 语音交互支持
   - 简化操作流程

2. **方言适配**
   - 22种方言支持
   - 本地化语音交互
   - 文化元素融入

3. **离线能力**
   - PWA技术支持
   - 本地数据缓存
   - 离线操作队列

4. **实时性**
   - WebSocket通信
   - 实时消息推送
   - 实时数据同步

5. **安全性**
   - 数据加密存储
   - 细粒度权限控制
   - 操作审计追踪
   - 人脸识别认证

### 4.3 下一步工作

1. **开发实施**
   - 按模块并行开发
   - 定期代码评审
   - 持续集成测试

2. **用户测试**
   - 老年用户可用性测试
   - 方言识别准确率测试
   - 性能压力测试

3. **部署上线**
   - 分阶段灰度发布
   - 监控报警配置
   - 数据备份策略

4. **运营维护**
   - 用户培训计划
   - 运营数据监控
   - 持续优化迭代

---

## 五、审批确认

本文档设计规范需要经过以下角色确认：

- [x] UI/UX设计师
- [ ] 前端开发负责人
- [ ] 后端架构师
- [ ] 数据库管理员
- [ ] 产品经理
- [ ] 技术总监

**确认日期**：2025年12月20日