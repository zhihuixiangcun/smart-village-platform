# 智慧乡村综合服务平台 UI/UX 设计规范

## 一、项目概述与用户特征

### 1.1 项目定位
智慧乡村综合服务平台是一个面向农村用户的多功能服务平台，涵盖村务管理、村民服务、信息发布、应急响应等核心功能。

### 1.2 目标用户特征

#### 主要用户群体
- **村干部（30-55岁）**：负责村务管理，需要高效的办公工具
- **普通村民（18-75岁）**：数字素养差异大，需要极简易用的界面
- **老年群体（60-75岁）**：视力下降、操作不灵活，需要专门的适老化设计
- **特殊群体**：残疾人、文盲用户，需要语音和图像辅助

#### 使用环境
- **网络环境**：农村地区网络不稳定，需要支持离线使用
- **设备环境**：主要为智能手机，部分使用平板或公共大屏
- **文化背景**：地方方言多样，习惯语音交流

## 二、设计系统

### 2.1 色彩规范

#### 主色调
```css
/* 品牌主色 - 大地绿 */
--primary-color: #2E7D32;
--primary-light: #4CAF50;
--primary-dark: #1B5E20;

/* 辅助色 - 丰收金 */
--secondary-color: #FFA000;
--secondary-light: #FFB300;
--secondary-dark: #F57C00;

/* 功能色 */
--success-color: #4CAF50;
--warning-color: #FF9800;
--error-color: #F44336;
--info-color: #2196F3;

/* 中性色 */
--text-primary: #212121;
--text-secondary: #757575;
--text-disabled: #BDBDBD;
--background: #FAFAFA;
--surface: #FFFFFF;
--border: #E0E0E0;
```

#### 适老化高对比度配色
```css
/* 高对比度模式 */
--hc-primary: #006600;
--hc-background: #FFFFFF;
--hc-text: #000000;
--hc-border: #333333;
```

### 2.2 字体规范

#### 基础字体
```css
/* 系统字体栈 */
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;

/* 字号层级 */
--font-xs: 12px;   /* 辅助信息 */
--font-sm: 14px;   /* 正文小字 */
--font-base: 16px; /* 基础字号 */
--font-lg: 18px;   /* 重要文本 */
--font-xl: 20px;   /* 小标题 */
--font-2xl: 24px;  /* 标题 */
--font-3xl: 30px;  /* 大标题 */
--font-4xl: 36px;  /* 特大标题 */
```

#### 适老化字体
```css
/* 大字模式 */
--large-font-xs: 16px;
--large-font-sm: 18px;
--large-font-base: 20px;
--large-font-lg: 22px;
--large-font-xl: 24px;
--large-font-2xl: 28px;
--large-font-3xl: 34px;
--large-font-4xl: 40px;

/* 字重加粗 */
--font-weight-base: 500; /* 默认加粗 */
--font-weight-medium: 600;
--font-weight-bold: 700;
```

### 2.3 间距系统

```css
/* 基础间距单位 */
--space-xs: 4px;
--space-sm: 8px;
--space-base: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;

/* 适老化间距 */
--large-space-xs: 8px;
--large-space-sm: 12px;
--large-space-base: 24px;
--large-space-lg: 32px;
--large-space-xl: 40px;
--large-space-2xl: 64px;
```

### 2.4 圆角与阴影

```css
/* 圆角 */
--radius-sm: 4px;
--radius-base: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 50%;

/* 阴影 */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
--shadow-base: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

/* 适老化 */
--large-radius-base: 12px;
--large-radius-lg: 16px;
```

## 三、适老化设计规范

### 3.1 视觉设计

#### 可读性增强
- **最小字号**：正文不小于16px，重要信息不小于18px
- **行高**：正文行高1.6-1.8，增加阅读舒适度
- **对比度**：文字与背景对比度不低于4.5:1，重要信息7:1
- **色彩使用**：不仅依赖颜色传达信息，配合文字和图标

#### 大字模式切换
```css
/* 大字模式样式 */
.large-text-mode {
  --font-base: 20px;
  --space-base: 24px;
  --radius-base: 12px;
  --min-touch-target: 60px;
}
```

### 3.2 交互设计

#### 触控目标
- **最小点击区域**：44×44px（标准模式）
- **大字模式**：60×60px
- **间距**：点击区域间距不少于8px

#### 手势简化
- 避免复杂手势（如长按、双指缩放）
- 使用明确的按钮代替滑动操作
- 提供一键操作选项

### 3.3 语音辅助

#### 语音播报
- 重要信息自动语音播报
- 支持调节语速（0.5x - 2x）
- 方言语音包选择（粤语、闽南语等）

#### 语音输入
- 大图标语音按钮，易于点击
- 支持方言识别
- 实时语音反馈

## 四、农村用户交互模式

### 4.1 语音优先设计

#### 语音助手界面
- **常驻语音按钮**：固定在屏幕底部
- **语音反馈**：每次操作都有语音确认
- **方言支持**：识别22种方言
- **离线语音**：基础指令支持离线识别

#### 语音交互流程
```
用户说话 → 语音识别 → 意图理解 → 执行操作 → 语音反馈
```

### 4.2 简化操作流程

#### 任务流程优化
1. **减少步骤**：复杂任务拆分为简单步骤
2. **默认选项**：提供智能默认值
3. **快速操作**：常用功能一键直达
4. **批量处理**：支持批量操作减少重复

#### 容错设计
- **撤销功能**：重要操作提供撤销选项
- **确认机制**：删除等危险操作二次确认
- **错误提示**：明确的错误信息和解决建议

## 五、响应式设计规范

### 5.1 断点设置

```css
/* 移动端 */
@media (max-width: 768px) {
  /* 单列布局 */
  .grid { grid-template-columns: 1fr; }
  .text { font-size: var(--font-base); }
}

/* 平板 */
@media (min-width: 769px) and (max-width: 1024px) {
  /* 两列布局 */
  .grid { grid-template-columns: repeat(2, 1fr); }
  .sidebar { width: 280px; }
}

/* 大屏 */
@media (min-width: 1025px) {
  /* 多列布局 */
  .grid { grid-template-columns: repeat(3, 1fr); }
  .sidebar { width: 320px; }
}
```

### 5.2 布局适配

#### 移动端优先
- 垂直滚动为主
- 底部导航栏
- 卡片式布局
- 汉堡菜单

#### 平板适配
- 可侧边栏
- 双列内容
- 横向导航
- 更多信息展示

#### 大屏适配
- 多列网格
- 固定侧边栏
- 水平导航
- 数据可视化

## 六、核心界面设计

### 6.1 首页设计

#### 信息层级
```
顶部：天气+日期（大字号）
上部：紧急通知/重要公告（红色醒目）
中部：功能入口（大图标+文字）
下部：最新动态（信息流）
底部：导航栏（语音按钮突出）```

#### 功能入口
- 语音助手（最大图标，居中）
- 村务公开
- 生活服务
- 应急求助
- 我的家庭

### 6.2 村务管理界面

#### 导航结构
```
公告管理
├── 发布公告（语音输入）
├── 公告列表
└── 阅读统计

会议管理
├── 创建会议
├── 会议通知
└── 会议记录

任务调度
├── 任务分配
├── 进度跟踪
└── 完成确认
```

#### 交互特点
- 模板化输入，减少打字
- 语音识别优先
- 一键群发通知
- 可视化进度展示

### 6.3 村民档案界面

#### 一户一码展示
```
户主信息（头像+姓名）
├── 家庭关系图
├── 基础信息（户号、人口、地址）
├── 特殊标签（低保户、独居老人等）
└── 二维码（扫码查看详情）
```

#### 隐私保护
- 敏感信息脱敏显示
- 分级权限查看
- 查询记录追踪
- 人脸识别解锁

### 6.4 语音交互界面

#### 语音输入界面
```
波形动画（实时反馈）
识别结果（文字显示）
方言选择（下拉菜单）
语音播放（播报内容）
```

#### 支持功能
- 方言选择
- 语速调节
- 离线模式
- 语音记录

### 6.5 应急响应界面

#### 一键求助
```
大红色按钮（全屏1/3）
位置信息（自动获取）
紧急联系人（快速拨打）
求助类型（图文选择）
```

#### 实时定位
- 地图显示
- 位置共享
- 救援路线
- 进度更新

## 七、组件库

### 7.1 基础组件

#### 按钮组件
```css
/* 主要按钮 */
.btn-primary {
  background: var(--primary-color);
  color: white;
  padding: 12px 24px;
  border-radius: var(--radius-base);
  font-size: var(--font-base);
  min-height: 44px;
  min-width: 120px;
}

/* 大字模式按钮 */
.btn-primary.large-mode {
  padding: 16px 32px;
  font-size: var(--large-font-base);
  min-height: 60px;
  min-width: 160px;
}

/* 语音按钮 */
.btn-voice {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B6B, #FF8E53);
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
}
```

#### 卡片组件
```css
.card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--space-base);
  margin-bottom: var(--space-base);
  box-shadow: var(--shadow-sm);
}

.card.large-mode {
  padding: var(--large-space-base);
  margin-bottom: var(--large-space-base);
}
```

#### 输入组件
```css
.input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: var(--radius-base);
  font-size: var(--font-base);
  min-height: 44px;
}

.input:focus {
  border-color: var(--primary-color);
  outline: none;
}

/* 语音输入按钮 */
.input-voice-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  background: var(--primary-color);
  border-radius: 50%;
  color: white;
}
```

### 7.2 导航组件

#### 底部导航
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  display: flex;
  justify-content: space-around;
  padding: var(--space-sm) 0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xs);
  min-width: 60px;
}

.nav-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
}

.nav-text {
  font-size: var(--font-xs);
  color: var(--text-secondary);
}
```

#### 顶部导航
```css
.top-nav {
  display: flex;
  align-items: center;
  padding: var(--space-base);
  background: var(--primary-color);
  color: white;
}

.nav-title {
  font-size: var(--font-lg);
  font-weight: var(--font-weight-medium);
}

.nav-back {
  width: 32px;
  height: 32px;
  margin-right: var(--space-base);
}
```

## 八、动效设计

### 8.1 动效原则

1. **功能性**：动效要有明确目的
2. **自然性**：模拟物理世界规律
3. **简洁性**：避免过度动画
4. **可控性**：允许用户关闭动效

### 8.2 动效参数

```css
/* 动画时长 */
--duration-fast: 150ms;
--duration-base: 300ms;
--duration-slow: 500ms;

/* 缓动函数 */
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### 8.3 常用动效

#### 淡入淡出
```css
.fade-in {
  animation: fadeIn var(--duration-base) var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

#### 滑动进入
```css
.slide-up {
  animation: slideUp var(--duration-base) var(--ease-out);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

## 九、无障碍设计

### 9.1 视觉无障碍

- 色盲友好配色
- 高对比度模式
- 文字放大支持
- 焦点状态明显

### 9.2 听觉无障碍

- 视觉提示替代声音
- 振动反馈选项
- 字幕和文字提示

### 9.3 操作无障碍

- 键盘导航支持
- 语音控制
- 手势简化
- 容错机制

## 十、多语言与方言支持

### 10.1 语言切换

- 顶部语言切换按钮
- 记忆用户选择
- 实时切换无需重启

### 10.2 方言支持

| 方言 | 地区 | 支持功能 |
|------|------|----------|
| 粤语 | 广东 | 全功能 |
| 闽南语 | 福建 | 全功能 |
| 四川话 | 四川 | 全功能 |
| 东北话 | 东北 | 基础功能 |
| 河南话 | 河南 | 基础功能 |

### 10.3 文字规范

- 简体中文为主
- 繁体中文支持
- 方言文字显示
- 拼音辅助

## 十一、离线使用设计

### 11.1 离线提示

```css
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--warning-color);
  color: white;
  padding: var(--space-sm);
  text-align: center;
  z-index: 1000;
}
```

### 11.2 离线功能

- 本地数据缓存
- 离线表单填写
- 离线语音识别
- 同步队列管理

### 11.3 数据同步

- 自动检测网络
- 后台静默同步
- 冲突解决机制
- 进度提示

## 十二、设计交付

### 12.1 设计资源

1. **UI Kit**：包含所有组件的Sketch/Figma文件
2. **图标库**：SVG格式，支持多尺寸
3. **插画资源**：乡村主题插画
4. **语音包**：方言语音文件

### 12.2 开发资源

1. **CSS框架**：预编译的CSS文件
2. **组件库**：Vue/React组件
3. **设计令牌**：设计变量导出
4. **交互原型**：可交互的HTML原型

### 12.3 测试清单

- [ ] 各设备分辨率适配
- [ ] 大字模式切换
- [ ] 语音功能测试
- [ ] 离线功能验证
- [ ] 无障碍测试
- [ ] 性能测试

## 十三、设计原则总结

1. **简单易用**：极简设计，降低学习成本
2. **语音优先**：符合农村用户习惯
3. **容错友好**：允许出错，提供帮助
4. **快速响应**：优化性能，减少等待
5. **稳定可靠**：保证基础功能可用
6. **安全可信**：保护用户隐私
7. **持续改进**：收集反馈，迭代优化

---

## 附录

### A. 设计工具推荐
- Figma：界面设计和原型
- Principle：交互动效
- XMind：信息架构
- Zeplin：设计交付

### B. 参考资源
- Material Design
- iOS Human Interface Guidelines
- Web Content Accessibility Guidelines
- 中国无障碍设计规范

### C. 用户测试建议
1. 邀请真实农村用户测试
2. 老年用户专项测试
3. 离线场景测试
4. 方言识别测试

---

*最后更新：2025年12月*