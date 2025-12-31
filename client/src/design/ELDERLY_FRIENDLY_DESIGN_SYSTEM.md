# 智慧乡村适老化设计系统规范

> 面向老年用户的智慧乡村平台 UI/UX 设计规范
> 版本: 1.0.0
> 更新时间: 2025-12-28

## 目录

1. [设计原则](#设计原则)
2. [颜色系统](#颜色系统)
3. [字体排版](#字体排版)
4. [间距系统](#间距系统)
5. [组件规范](#组件规范)
6. [交互设计](#交互设计)
7. [响应式设计](#响应式设计)
8. [无障碍设计](#无障碍设计)
9. [动画规范](#动画规范)

---

## 设计原则

### 核心理念：简单、清晰、易用

#### 1. 可读性优先
- **大字体**：默认使用 18px-20px 基础字号
- **高对比度**：文字与背景对比度至少 4.5:1
- **简洁语言**：使用通俗易懂的词汇，避免专业术语

#### 2. 易操作
- **大触控区域**：最小触摸目标 48x48dp
- **简化流程**：核心功能不超过 3 步完成
- **明确反馈**：每次操作都有清晰的视觉和听觉反馈

#### 3. 容错性
- **可撤销**：重要操作提供撤销功能
- **确认机制**：破坏性操作需要二次确认
- **容错输入**：表单输入提供实时校验和提示

#### 4. 一致性
- **统一布局**：页面结构保持一致
- **统一交互**：相同功能使用相同的交互方式
- **统一视觉**：颜色、图标、字体使用保持一致

---

## 颜色系统

### 主色调

```scss
// 品牌色 - 温暖的红色，代表乡村活力
$primary: #E85D4C;
$primary-light: #FF8A7A;
$primary-dark: #C73E2F;

// 辅助色 - 稳重的绿色，代表农业与希望
$secondary: #52A885;
$secondary-light: #7BC4A3;
$secondary-dark: #3D8A68;

// 强调色 - 明亮的橙色，用于重要提示
$accent: #FF9F43;
$accent-light: #FFB873;
$accent-dark: #E88A2A;
```

### 功能色

```scss
// 成功 - 柔和的绿色
$success: #67C23A;
$success-bg: #F0F9FF;
$success-border: #B3E19D;

// 警告 - 温暖的橙色
$warning: #E6A23C;
$warning-bg: #FDF6EC;
$warning-border: #F5DAB1;

// 危险 - 清晰的红色
$danger: #F56C6C;
$danger-bg: #FEF0F0;
$danger-border: #FBC4C4;

// 信息 - 平静的蓝色
$info: #909399;
$info-bg: #F4F4F5;
$info-border: #D3D4D6;
```

### 中性色（高对比度版本）

```scss
// 文字颜色 - 确保高对比度
$text-primary: #1A1A1A;     // 主要文字，对比度 > 7:1
$text-secondary: #4A4A4A;   // 次要文字，对比度 > 4.5:1
$text-tertiary: #757575;    // 辅助文字
$text-disabled: #BDBDBD;    // 禁用文字

// 背景颜色
$bg-primary: #FFFFFF;       // 主背景
$bg-secondary: #F5F5F5;     // 次背景
$bg-tertiary: #FAFAFA;      // 三级背景
$bg-disabled: #F0F0F0;      // 禁用背景

// 边框颜色
$border-base: #DCDFE6;      // 基础边框
$border-light: #E4E7ED;     // 浅色边框
$border-lighter: #EBEEF5;   // 更浅边框
$border-extra-light: #F2F6FC; // 极浅边框
```

### 适老化配色方案

```scss
// 大字模式专用配色
.elderly-mode {
  // 提高对比度
  --text-primary: #000000;
  --text-secondary: #333333;
  --bg-primary: #FFFFFF;
  --bg-secondary: #F0F0F0;

  // 去除装饰性颜色
  --decoration-color: transparent;

  // 强调边框
  --border-width: 2px;
  --border-color: #333333;
}
```

### 颜色使用规则

#### 文字与背景对比度要求
- **正常文字**（< 18pt）：对比度 ≥ 4.5:1
- **大文字**（≥ 18pt 或 ≥ 14pt 粗体）：对比度 ≥ 3:1
- **图标/图形**：对比度 ≥ 3:1

#### 颜色禁忌
- 避免使用蓝黑、蓝紫等难以区分的颜色
- 避免红绿并用（红绿色盲友好）
- 避免过浅的颜色（如 #FAFAFA）作为背景

---

## 字体排版

### 字体族

```scss
// 中文字体栈 - 优先使用易读字体
$font-family-base: "PingFang SC", "Microsoft YaHei", "Heiti SC",
                   "STHeiti", "SimHei", sans-serif;

// 数字字体 - 使用等宽字体便于阅读
$font-family-number: "SF Mono", "Monaco", "Inconsolata",
                     "Fira Mono", "Droid Sans Mono", monospace;

// 英文字体
$font-family-en: -apple-system, BlinkMacSystemFont, "Segoe UI",
                  Roboto, "Helvetica Neue", Arial, sans-serif;
```

### 字号系统

```scss
// 适老化字号体系（比常规大 20%）
$font-size-xs: 14px;      // 极小文字 - 辅助说明
$font-size-sm: 16px;      // 小文字 - 次要信息
$font-size-base: 18px;    // 基础文字 - 正文
$font-size-md: 20px;      // 中等文字 - 小标题
$font-size-lg: 24px;      // 大文字 - 标题
$font-size-xl: 32px;      // 超大文字 - 重要标题
$font-size-xxl: 40px;     // 特大文字 - 关键信息

// 行高系统（宽松行高，提高可读性）
$line-height-loose: 1.8;  // 18px: 32.4px
$line-height-normal: 1.6; // 18px: 28.8px
$line-height-tight: 1.4;  // 18px: 25.2px

// 字重（使用清晰字重）
$font-weight-normal: 400;   // 常规
$font-weight-medium: 500;   // 中等 - 用于标题
$font-weight-bold: 600;     // 粗体 - 用于强调
```

### 字体应用示例

```scss
// 标题
.page-title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  line-height: $line-height-normal;
  color: $text-primary;
  margin-bottom: 24px;
}

// 副标题
.section-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-medium;
  line-height: $line-height-normal;
  color: $text-primary;
  margin-bottom: 16px;
}

// 正文
.body-text {
  font-size: $font-size-base;
  font-weight: $font-weight-normal;
  line-height: $line-height-loose;
  color: $text-secondary;
}

// 辅助文字
.helper-text {
  font-size: $font-size-sm;
  font-weight: $font-weight-normal;
  line-height: $line-height-normal;
  color: $text-tertiary;
}
```

### 特殊场景字体

```scss
// 大字模式
.elderly-mode-large {
  font-size: 24px;  // 基础字号提升到 24px
  line-height: 1.8;
  letter-spacing: 0.05em;  // 增加字间距
}

// 超大字模式（视力障碍用户）
.elderly-mode-extra-large {
  font-size: 32px;  // 基础字号提升到 32px
  line-height: 2.0;
  letter-spacing: 0.1em;
  font-weight: 600;  // 加粗字重
}

// 按钮文字
.button-text {
  font-size: 20px;  // 最小 20px
  font-weight: 600;  // 中粗体
  letter-spacing: 0.02em;
}
```

---

## 间距系统

### 基础间距单位

```scss
// 使用 8px 基础单位，确保一致性
$spacing-unit: 8px;

$spacing-xs: $spacing-unit * 1;    // 8px
$spacing-sm: $spacing-unit * 2;    // 16px
$spacing-md: $spacing-unit * 3;    // 24px
$spacing-lg: $spacing-unit * 4;    // 32px
$spacing-xl: $spacing-unit * 5;    // 40px
$spacing-xxl: $spacing-unit * 6;   // 48px
```

### 适老化间距（增大版本）

```scss
// 适老化间距系统（比常规大 50%）
$elderly-spacing-xs: 12px;   // 原 8px
$elderly-spacing-sm: 24px;   // 原 16px
$elderly-spacing-md: 36px;   // 原 24px
$elderly-spacing-lg: 48px;   // 原 32px
$elderly-spacing-xl: 60px;   // 原 40px
```

### 组件内边距

```scss
// 卡片内边距
$card-padding-vertical: 24px;
$card-padding-horizontal: 20px;

// 按钮内边距（确保足够点击区域）
$button-padding-large: 16px 32px;   // 高度 56px
$button-padding-default: 14px 28px; // 高度 48px
$button-padding-small: 12px 24px;   // 高度 40px

// 表单控件内边距
$input-padding-vertical: 14px;
$input-padding-horizontal: 16px;

// 对话框内边距
$dialog-padding: 32px;
$dialog-header-padding: 24px 32px;
$dialog-footer-padding: 16px 32px;
```

### 组件间距

```scss
// 页面级间距
$page-padding: 20px;
$page-margin-bottom: 32px;

// 卡片间距
$card-gap: 20px;

// 表单项间距
$form-item-gap: 24px;

// 列表项间距
$list-item-gap: 16px;
```

---

## 组件规范

### 1. 按钮（Button）

#### 尺寸规范

```scss
// 主要操作按钮
.btn-primary-large {
  height: 56px;          // 最小点击高度
  padding: 16px 32px;
  font-size: 20px;
  border-radius: 8px;
}

// 次要操作按钮
.btn-secondary-large {
  height: 56px;
  padding: 16px 32px;
  font-size: 20px;
  border-radius: 8px;
  border-width: 2px;     // 加粗边框，提高可见性
}

// 小按钮
.btn-small {
  height: 48px;          // 仍保持足够点击区域
  padding: 12px 24px;
  font-size: 18px;
  border-radius: 8px;
}
```

#### 样式规范

```scss
// 主按钮 - 实心填充
.el-button--primary {
  background-color: $primary;
  border-color: $primary;
  color: #FFFFFF;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(232, 93, 76, 0.3);

  &:hover {
    background-color: $primary-light;
    border-color: $primary-light;
  }

  &:active {
    background-color: $primary-dark;
    border-color: $primary-dark;
    transform: scale(0.98);
  }
}

// 次要按钮 - 描边样式
.el-button--secondary {
  background-color: transparent;
  border: 2px solid $primary;
  color: $primary;
  font-weight: 600;

  &:hover {
    background-color: rgba(232, 93, 76, 0.1);
  }

  &:active {
    background-color: rgba(232, 93, 76, 0.2);
  }
}

// 危险按钮
.el-button--danger {
  background-color: $danger;
  border-color: $danger;
  color: #FFFFFF;
  font-weight: 600;

  // 双重确认样式
  &.confirm-required {
    background-color: lighten($danger, 10%);
    &::after {
      content: '长按确认';
      position: absolute;
      font-size: 12px;
      bottom: 4px;
    }
  }
}
```

### 2. 卡片（Card）

```scss
.elderly-card {
  background: $bg-primary;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: $card-padding-vertical $card-padding-horizontal;
  margin-bottom: $card-gap;

  // 清晰的边框
  border: 1px solid $border-base;

  // 标题区
  .card-header {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    color: $text-primary;
    margin-bottom: $spacing-sm;
    padding-bottom: $spacing-sm;
    border-bottom: 2px solid $border-light;
  }

  // 内容区
  .card-body {
    font-size: $font-size-base;
    line-height: $line-height-loose;
    color: $text-secondary;
  }

  // 操作区
  .card-footer {
    margin-top: $spacing-md;
    padding-top: $spacing-sm;
    border-top: 1px solid $border-light;
    display: flex;
    gap: $spacing-sm;
  }
}
```

### 3. 表单（Form）

```scss
.elderly-form {
  // 表单项
  .form-item {
    margin-bottom: $form-item-gap;

    // 标签
    .form-label {
      font-size: $font-size-base;
      font-weight: $font-weight-medium;
      color: $text-primary;
      margin-bottom: $spacing-xs;
      display: block;

      // 必填标记
      .required-mark {
        color: $danger;
        font-size: 20px;
        margin-left: 4px;
      }
    }

    // 帮助文本
    .form-helper {
      font-size: $font-size-sm;
      color: $text-tertiary;
      margin-top: $spacing-xs;
    }
  }

  // 输入框
  .form-input {
    height: 56px;          // 足够大的点击区域
    padding: $input-padding-vertical $input-padding-horizontal;
    font-size: $font-size-base;
    border: 2px solid $border-base;  // 加粗边框
    border-radius: 8px;

    &:focus {
      border-color: $primary;
      box-shadow: 0 0 0 3px rgba(232, 93, 76, 0.1);
      outline: none;
    }

    // 错误状态
    &.is-error {
      border-color: $danger;
      background-color: $danger-bg;
    }

    // 成功状态
    &.is-success {
      border-color: $success;
    }
  }

  // 选择器（下拉菜单）
  .form-select {
    @extend .form-input;

    // 增大下拉箭头
    .select-arrow {
      font-size: 24px;
    }
  }
}
```

### 4. 列表（List）

```scss
.elderly-list {
  // 列表项
  .list-item {
    display: flex;
    align-items: center;
    padding: $spacing-md;
    border-bottom: 1px solid $border-light;
    min-height: 80px;  // 确保足够的点击区域

    &:active {
      background-color: $bg-secondary;
    }

    // 图标/头像
    .item-icon {
      width: 56px;
      height: 56px;
      margin-right: $spacing-md;
      flex-shrink: 0;
    }

    // 内容
    .item-content {
      flex: 1;
      min-width: 0;  // 防止溢出

      .item-title {
        font-size: $font-size-base;
        font-weight: $font-weight-medium;
        color: $text-primary;
        margin-bottom: 4px;
      }

      .item-desc {
        font-size: $font-size-sm;
        color: $text-tertiary;
      }
    }

    // 右侧操作
    .item-action {
      margin-left: $spacing-md;
      flex-shrink: 0;
    }
  }
}
```

### 5. 导航（Navigation）

```scss
// 底部导航栏
.bottom-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;  // 足够大的点击区域
  background: $bg-primary;
  border-top: 1px solid $border-base;
  display: flex;
  padding-bottom: env(safe-area-inset-bottom);

  // 导航项
  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: $text-tertiary;
    position: relative;

    // 图标
    .nav-icon {
      font-size: 28px;
      margin-bottom: 4px;
    }

    // 文字
    .nav-label {
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
    }

    // 激活状态
    &.active {
      color: $primary;

      .nav-label {
        font-weight: $font-weight-bold;
      }

      // 激活指示器
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 48px;
        height: 4px;
        background: $primary;
        border-radius: 0 0 4px 4px;
      }
    }
  }
}

// 顶部导航
.top-navigation {
  height: 64px;
  background: $bg-primary;
  border-bottom: 1px solid $border-base;
  display: flex;
  align-items: center;
  padding: 0 $spacing-md;

  // 返回按钮
  .nav-back {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: $spacing-sm;

    .back-icon {
      font-size: 28px;
    }
  }

  // 标题
  .nav-title {
    flex: 1;
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    color: $text-primary;
    text-align: center;
  }

  // 操作按钮
  .nav-action {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```

### 6. 对话框（Dialog）

```scss
.elderly-dialog {
  // 全屏对话框（移动端）
  &.fullscreen {
    .el-dialog {
      width: 100% !important;
      height: 100%;
      margin: 0 !important;
      border-radius: 0;

      .el-dialog__header {
        padding: $spacing-md;
        border-bottom: 1px solid $border-light;
      }

      .el-dialog__body {
        height: calc(100% - 120px);
        overflow-y: auto;
        padding: $spacing-md;
      }

      .el-dialog__footer {
        padding: $spacing-md;
        border-top: 1px solid $border-light;
      }
    }
  }

  // 标题
  .dialog-title {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    color: $text-primary;
  }

  // 内容
  .dialog-content {
    font-size: $font-size-base;
    line-height: $line-height-loose;
    color: $text-secondary;
  }

  // 按钮
  .dialog-actions {
    display: flex;
    gap: $spacing-sm;

    .el-button {
      flex: 1;
      height: 56px;
      font-size: $font-size-md;
    }
  }
}
```

### 7. 消息提示（Message）

```scss
.elderly-message {
  min-width: 320px;
  padding: $spacing-md $spacing-lg;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);

  // 图标
  .message-icon {
    font-size: 28px;
    margin-right: $spacing-sm;
  }

  // 内容
  .message-content {
    font-size: $font-size-base;
    font-weight: $font-weight-medium;
    line-height: $line-height-normal;
  }

  // 成功
  &.success {
    background: $success-bg;
    border: 2px solid $success-border;
    color: darken($success, 20%);
  }

  // 警告
  &.warning {
    background: $warning-bg;
    border: 2px solid $warning-border;
    color: darken($warning, 20%);
  }

  // 错误
  &.error {
    background: $danger-bg;
    border: 2px solid $danger-border;
    color: darken($danger, 20%);
  }

  // 信息
  &.info {
    background: $info-bg;
    border: 2px solid $info-border;
    color: darken($info, 20%);
  }
}
```

---

## 交互设计

### 1. 触摸交互

#### 点击区域规范

```scss
// 最小触摸目标：48x48dp (WCAG 2.1 AAA 标准)
.clickable {
  min-width: 48px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

// 推荐触摸目标：56x56dp（更易点击）
.touchable-large {
  min-width: 56px;
  min-height: 56px;
}

// 关键操作：64x64dp（最重要按钮）
.critical-action {
  min-width: 64px;
  min-height: 64px;
}
```

#### 触觉反馈

```javascript
// 触觉反馈配置
const hapticPatterns = {
  light: [10],           // 轻触反馈
  medium: [20],          // 中等反馈
  heavy: [30],           // 强力反馈
  success: [10, 50, 10], // 成功反馈
  error: [50, 50, 50],   // 错误反馈
  warning: [20, 20, 20]  // 警告反馈
}

// 使用示例
function triggerHaptic(type) {
  if ('vibrate' in navigator) {
    navigator.vibrate(hapticPatterns[type] || hapticPatterns.light)
  }
}
```

### 2. 手势交互

#### 支持的手势

```javascript
// 手势配置
const gestureConfig = {
  // 点击
  tap: {
    duration: 300,
    threshold: 10
  },

  // 长按
  longPress: {
    duration: 500,
    feedback: true
  },

  // 滑动
  swipe: {
    threshold: 50,      // 最小滑动距离
    velocity: 0.3       // 最小滑动速度
  },

  // 缩放
  pinch: {
    minScale: 0.5,      // 最小缩放
    maxScale: 3.0       // 最大缩放
  }
}
```

#### 手势应用场景

| 手势类型 | 应用场景 | 说明 |
|---------|---------|------|
| 点击 | 所有按钮、链接 | 基础交互 |
| 长按 | 显示菜单、删除确认 | 500ms 触发 |
| 左滑 | 删除、归档 | 列表项操作 |
| 右滑 | 撤销、恢复 | 列表项操作 |
| 下拉 | 刷新 | 页面刷新 |
| 上滑 | 加载更多 | 列表分页 |
| 双击 | 放大/缩小 | 图片查看 |
| 捏合 | 缩放 | 地图、图片 |

### 3. 反馈设计

#### 视觉反馈

```scss
// 点击反馈
.touch-feedback {
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.95);
    opacity: 0.8;
  }
}

// 焦点反馈（键盘导航）
.focus-visible {
  outline: 3px solid $primary;
  outline-offset: 2px;
}

// 加载反馈
.loading-indicator {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid $border-light;
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

#### 听觉反馈

```javascript
// 音效配置
const soundEffects = {
  click: '/sounds/click.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  warning: '/sounds/warning.mp3',
  notification: '/sounds/notification.mp3'
}

// 播放音效
function playSound(type) {
  const audio = new Audio(soundEffects[type])
  audio.volume = 0.5  // 降低音量，避免刺耳
  audio.play().catch(err => {
    console.warn('音效播放失败:', err)
  })
}
```

### 4. 动画规范

#### 动画时长

```scss
// 适老化动画（减慢速度，更易理解）
$duration-instant: 100ms;   // 即时反馈
$duration-fast: 200ms;      // 快速动画
$duration-normal: 300ms;    // 正常动画
$duration-slow: 500ms;      // 慢速动画

// 缓动函数
$ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
$ease-out: cubic-bezier(0, 0, 0.2, 1);
$ease-in: cubic-bezier(0.4, 0, 1, 1);
```

#### 动画类型

```scss
// 淡入淡出
.fade-enter-active,
.fade-leave-active {
  transition: opacity $duration-normal $ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 滑动
.slide-enter-active,
.slide-leave-active {
  transition: transform $duration-normal $ease-out;
}
.slide-enter-from {
  transform: translateX(100%);
}
.slide-leave-to {
  transform: translateX(-100%);
}

// 缩放
.scale-enter-active,
.scale-leave-active {
  transition: transform $duration-normal $ease-out;
}
.scale-enter-from,
.scale-leave-to {
  transform: scale(0.8);
  opacity: 0;
}
```

---

## 响应式设计

### 断点系统

```scss
// 移动端优先的断点
$breakpoint-xs: 375px;   // 小屏手机
$breakpoint-sm: 480px;   // 大屏手机
$breakpoint-md: 768px;   // 平板竖屏
$breakpoint-lg: 1024px;  // 平板横屏
$breakpoint-xl: 1280px;  // 桌面
$breakpoint-xxl: 1536px; // 大桌面

// Mixin
@mixin respond-to($breakpoint) {
  @if $breakpoint == xs {
    @media (max-width: $breakpoint-xs) { @content; }
  }
  @else if $breakpoint == sm {
    @media (max-width: $breakpoint-sm) { @content; }
  }
  @else if $breakpoint == md {
    @media (max-width: $breakpoint-md) { @content; }
  }
  @else if $breakpoint == lg {
    @media (max-width: $breakpoint-lg) { @content; }
  }
  @else if $breakpoint == xl {
    @media (max-width: $breakpoint-xl) { @content; }
  }
}
```

### 响应式组件示例

```scss
// 响应式卡片
.responsive-card {
  padding: $spacing-md;

  @include respond-to(xs) {
    padding: $spacing-sm;
  }

  @include respond-to(sm) {
    padding: $spacing-md;
  }

  @include respond-to(md) {
    padding: $spacing-lg;
  }
}

// 响应式按钮组
.responsive-button-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  @include respond-to(md) {
    flex-direction: row;
    gap: $spacing-md;
  }
}
```

---

## 无障碍设计

### 1. 语义化 HTML

```html
<!-- 正确的语义化结构 -->
<header role="banner">
  <h1>智慧乡村平台</h1>
</header>

<nav role="navigation" aria-label="主导航">
  <ul>
    <li><a href="/home" aria-current="page">首页</a></li>
    <li><a href="/services">服务</a></li>
    <li><a href="/profile">我的</a></li>
  </ul>
</nav>

<main role="main">
  <article>
    <h2>公告标题</h2>
    <p>公告内容...</p>
  </article>
</main>

<footer role="contentinfo">
  <p>&copy; 2025 智慧乡村</p>
</footer>
```

### 2. ARIA 属性

```html
<!-- 按钮状态 -->
<button
  aria-pressed="false"
  aria-label="收藏此公告"
>
  <i class="icon-star" aria-hidden="true"></i>
  收藏
</button>

<!-- 表单关联 -->
<label for="username">用户名</label>
<input
  id="username"
  type="text"
  aria-required="true"
  aria-invalid="false"
  aria-describedby="username-help"
>
<span id="username-help" class="helper-text">
  请输入您的用户名
</span>

<!-- 加载状态 -->
<div
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <span class="loader"></span>
  正在加载...
</div>

<!-- 对话框 -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-content"
>
  <h2 id="dialog-title">确认操作</h2>
  <p id="dialog-content">您确定要删除吗？</p>
</div>
```

### 3. 键盘导航

```javascript
// 键盘快捷键配置
const keyboardShortcuts = {
  'Alt+H': '跳转到首页',
  'Alt+S': '跳转到搜索',
  'Alt+N': '跳转到下一项',
  'Alt+P': '跳转到上一项',
  'Escape': '关闭对话框',
  'Enter': '确认操作',
  'Space': '切换状态'
}

// 键盘导航实现
document.addEventListener('keydown', (e) => {
  // Tab 键：焦点可见
  if (e.key === 'Tab') {
    document.body.classList.add('keyboard-navigation')
  }

  // 快捷键处理
  if (e.altKey) {
    switch (e.key) {
      case 'h':
        e.preventDefault()
        navigateTo('/home')
        break
      case 's':
        e.preventDefault()
        focusSearch()
        break
    }
  }
})

// 鼠标点击：移除键盘导航样式
document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-navigation')
})
```

### 4. 屏幕阅读器支持

```html
<!-- 跳过导航链接（隐藏但可访问） -->
<a
  href="#main-content"
  class="sr-only"
>
  跳转到主内容
</a>

<!-- 隐藏视觉元素但保留给屏幕阅读器 -->
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

<!-- 实时区域 -->
<div
  role="region"
  aria-live="assertive"
  aria-atomic="true"
>
  操作成功！
</div>
```

### 5. 焦点管理

```javascript
// 焦点陷阱（对话框中）
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable.focus()
        }
      }
    }
  })
}

// 焦点恢复（关闭对话框后）
let previousFocusedElement = null

function openDialog() {
  previousFocusedElement = document.activeElement
  // 打开对话框...
}

function closeDialog() {
  // 关闭对话框...
  if (previousFocusedElement) {
    previousFocusedElement.focus()
  }
}
```

---

## 设计资源

### 设计文件

- **Figma 设计稿**: [链接]
- **图标库**: [链接]
- **图片资源**: [链接]

### 组件库

- **Element Plus**: https://element-plus.org/zh-CN/
- **Vant**: https://vant-ui.github.io/vant/

### 参考文档

- [WCAG 2.1 标准](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design 无障碍指南](https://material.io/design/usability/accessibility.html)
- [Apple 人机界面指南 - 无障碍](https://developer.apple.com/design/human-interface-guidelines/accessibility)

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 1.0.0 | 2025-12-28 | 初始版本，建立适老化设计系统 |

---

**设计团队**: 智慧乡村项目组
**最后更新**: 2025-12-28
