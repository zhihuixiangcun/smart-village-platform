# 智慧乡村平台 UI 组件库

## 概述

本文档描述了智慧乡村综合服务平台使用的 UI 组件库，包括组件的使用方法、属性和示例。组件库基于现代 Web 技术构建，支持响应式设计和无障碍访问。

## 安装与使用

### CSS 引入
```html
<link rel="stylesheet" href="styles.css">
```

### JavaScript 引入
```html
<script src="app.js"></script>
```

## 组件列表

### 1. 按钮组件 (Button)

#### 基础按钮
```html
<button class="btn btn-primary">主要按钮</button>
<button class="btn btn-outline">边框按钮</button>
```

#### 大字模式按钮
```html
<button class="btn btn-primary large-mode">大字模式按钮</button>
```

#### 属性
- `primary`: 主要按钮样式（绿色）
- `outline`: 边框按钮样式
- `large-mode`: 大字模式样式

### 2. 输入组件 (Input)

#### 基础输入框
```html
<div class="input-group">
    <label>输入标签</label>
    <input type="text" class="input" placeholder="请输入内容">
</div>
```

#### 带语音输入
```html
<div class="input-group">
    <label>语音输入</label>
    <input type="text" class="input" id="voiceInput" placeholder="点击语音按钮输入">
    <button class="voice-btn" onclick="startVoiceInput('voiceInput')">
        <i class="fas fa-microphone"></i>
    </button>
</div>
```

#### 文本域
```html
<div class="input-group">
    <label>文本内容</label>
    <textarea class="textarea" placeholder="请输入多行文本" rows="4"></textarea>
</div>
```

### 3. 卡片组件 (Card)

#### 基础卡片
```html
<div class="card">
    <h3>卡片标题</h3>
    <p>卡片内容</p>
</div>
```

#### 统计卡片
```html
<div class="stat-card">
    <div class="stat-number">126</div>
    <div class="stat-label">总户数</div>
</div>
```

### 4. 导航组件

#### 底部导航
```html
<nav class="bottom-nav">
    <div class="nav-item active" onclick="navigateTo('home')">
        <i class="fas fa-home"></i>
        <span>首页</span>
    </div>
    <div class="nav-item" onclick="navigateTo('services')">
        <i class="fas fa-concierge-bell"></i>
        <span>服务</span>
    </div>
</nav>
```

#### 标签导航
```html
<div class="tab-nav">
    <div class="tab-item active" onclick="switchTab('tab1')">
        <span>标签一</span>
    </div>
    <div class="tab-item" onclick="switchTab('tab2')">
        <span>标签二</span>
    </div>
</div>
```

### 5. 功能网格 (Function Grid)

```html
<div class="function-grid">
    <div class="function-item" onclick="handleClick()">
        <div class="function-icon bg-green">
            <i class="fas fa-home"></i>
        </div>
        <div class="function-text">功能名称</div>
    </div>
</div>
```

#### 图标颜色类
- `bg-green`: 绿色渐变
- `bg-blue`: 蓝色渐变
- `bg-purple`: 紫色渐变
- `bg-red`: 红色渐变
- `bg-orange`: 橙色渐变
- `bg-teal`: 青色渐变
- `bg-yellow`: 黄色渐变
- `bg-gray`: 灰色渐变

### 6. 通知组件

#### 紧急通知
```html
<div class="emergency-notice">
    <div class="notice-icon">
        <i class="fas fa-bullhorn"></i>
    </div>
    <div class="notice-content">
        <div class="notice-title">重要通知</div>
        <div class="notice-text">通知内容</div>
    </div>
</div>
```

#### Toast 提示
```javascript
// 显示提示信息
showToast('操作成功', 'success');
showToast('操作失败', 'error');
showToast('警告信息', 'warning');
showToast('提示信息', 'info');
```

### 7. 列表组件

#### 更新列表
```html
<div class="update-list">
    <div class="update-item">
        <div class="update-icon">
            <i class="fas fa-file-alt"></i>
        </div>
        <div class="update-content">
            <div class="update-title">更新标题</div>
            <div class="update-time">10分钟前</div>
        </div>
    </div>
</div>
```

#### 家庭列表
```html
<div class="family-list">
    <div class="family-item" onclick="showDetail()">
        <div class="family-avatar">
            <img src="avatar.jpg" alt="头像">
        </div>
        <div class="family-info">
            <h4>家庭名称</h4>
            <p class="family-id">户号：001</p>
            <div class="family-tags">
                <span class="tag tag-primary">党员户</span>
            </div>
        </div>
    </div>
</div>
```

### 8. 语音组件

#### 语音助手按钮
```html
<button class="voice-assistant-btn" onclick="openVoicePage()">
    <i class="fas fa-microphone"></i>
</button>
```

#### 语音波形
```html
<div class="voice-wave" id="voiceWave">
    <div class="wave-bar"></div>
    <div class="wave-bar"></div>
    <div class="wave-bar"></div>
    <div class="wave-bar"></div>
    <div class="wave-bar"></div>
</div>
```

#### 语音控制按钮
```html
<button class="voice-control-btn primary" onclick="toggleVoiceRecording()">
    <i class="fas fa-microphone"></i>
    <span>开始说话</span>
</button>
```

### 9. 应急组件

#### 紧急按钮
```html
<button class="emergency-button" onclick="triggerEmergency()">
    <div class="emergency-icon">
        <i class="fas fa-phone-alt"></i>
    </div>
    <div class="emergency-text">一键求助</div>
</button>
```

#### 紧急类型选择
```html
<div class="type-grid">
    <div class="type-item" onclick="selectType('medical')">
        <div class="type-icon medical">
            <i class="fas fa-ambulance"></i>
        </div>
        <span>医疗急救</span>
    </div>
</div>
```

### 10. 表单组件

#### 选择器
```html
<div class="input-group">
    <label>选择选项</label>
    <select class="select">
        <option value="option1">选项一</option>
        <option value="option2">选项二</option>
    </select>
</div>
```

#### 开关组件
```html
<label class="switch">
    <input type="checkbox" checked>
    <span class="slider"></span>
</label>
```

### 11. 搜索组件

```html
<div class="search-bar">
    <input type="text" class="search-input" placeholder="搜索...">
    <button class="search-voice-btn" onclick="startVoiceSearch()">
        <i class="fas fa-microphone"></i>
    </button>
</div>
```

### 12. 统计组件

#### 档案统计
```html
<div class="archive-stats">
    <div class="stat-item">
        <div class="stat-number">1,245</div>
        <div class="stat-label">总户数</div>
    </div>
</div>
```

## 响应式断点

```css
/* 移动端 */
@media (max-width: 768px) {
    .grid { grid-template-columns: 1fr; }
}

/* 平板 */
@media (min-width: 769px) and (max-width: 1024px) {
    .grid { grid-template-columns: repeat(2, 1fr); }
}

/* 大屏 */
@media (min-width: 1025px) {
    .grid { grid-template-columns: repeat(3, 1fr); }
}
```

## 适老化样式类

### 大字模式
```html
<!-- 应用到大字模式 -->
<body class="large-text-mode">
```

### 高对比度模式
```html
<!-- 应用高对比度 -->
<body class="high-contrast">
```

## 主题色彩

### CSS 变量
```css
:root {
  --primary-color: #2E7D32;
  --primary-light: #4CAF50;
  --primary-dark: #1B5E20;
  --secondary-color: #FFA000;
  --success-color: #4CAF50;
  --warning-color: #FF9800;
  --error-color: #F44336;
  --info-color: #2196F3;
}
```

## JavaScript API

### 页面导航
```javascript
// 导航到指定页面
navigateTo('home');
navigateTo('villageAffairs');
navigateTo('services');
navigateTo('archives');
```

### 语音功能
```javascript
// 开始语音输入到指定元素
startVoiceInput('elementId');

// 开始语音搜索
startVoiceSearch();

// 切换语音录音
toggleVoiceRecording();

// 语音播报
speak('要播报的文本');
```

### Toast 提示
```javascript
showToast(message, type); // type: 'success', 'error', 'warning', 'info'
```

### 用户设置
```javascript
// 切换大字模式
toggleLargeText();

// 切换高对比度
toggleHighContrast();
```

## 图标库

组件库使用 Font Awesome 图标，常用图标：

### 功能图标
- `fa-home`: 首页
- `fa-landmark`: 村务
- `fa-concierge-bell`: 服务
- `fa-users`: 村民档案
- `fa-phone-alt`: 紧急求助
- `fa-bullhorn`: 公告通知
- `fa-video`: 视频会议
- `fa-coins`: 财务管理

### 操作图标
- `fa-plus`: 添加
- `fa-edit`: 编辑
- `fa-trash`: 删除
- `fa-search`: 搜索
- `fa-filter`: 筛选
- `fa-download`: 下载
- `fa-share`: 分享
- `fa-print`: 打印

### 状态图标
- `fa-check-circle`: 成功
- `fa-exclamation-circle`: 警告
- `fa-times-circle`: 错误
- `fa-info-circle`: 信息
- `fa-clock`: 时间
- `fa-map-marker-alt`: 位置

## 最佳实践

### 1. 可访问性
- 为所有交互元素提供键盘导航支持
- 确保足够的颜色对比度
- 为图片提供 alt 文本
- 使用语义化 HTML 标签

### 2. 性能优化
- 使用 CSS 动画替代 JavaScript 动画
- 优化图片大小和格式
- 使用防抖和节流优化频繁操作
- 懒加载非关键资源

### 3. 用户体验
- 提供加载状态反馈
- 优化表单验证体验
- 使用合适的触摸目标大小（最小44px）
- 提供撤销操作

### 4. 代码规范
- 使用语义化的类名
- 保持一致的命名规范
- 添加适当的注释
- 遵循移动优先的设计原则

## 自定义主题

### 修改主题色
```css
:root {
  --primary-color: #your-color;
  --primary-light: lighten(your-color, 20%);
  --primary-dark: darken(your-color, 20%);
}
```

### 自定义动画
```css
.custom-animation {
  animation: customName 300ms ease-out;
}

@keyframes customName {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Android Chrome 60+

## 更新日志

### v1.0.0 (2025-12-19)
- 初始版本发布
- 包含基础组件库
- 支持响应式设计
- 集成语音功能
- 适老化设计支持

---

*最后更新：2025年12月19日*