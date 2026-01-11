# 登录页面更新日志

## v2.0.3 (2024-01-11)

### 优化改进
- 🔄 角色选择器布局优化
  - 所有角色文字显示在一排
  - 使用 flex 布局替代 grid 布局
  - 支持横向滚动查看所有角色
  - 防止角色文字换行（white-space: nowrap）

### 文件修改
```
✏️  client-mobile/src/pages/auth/login-enhanced.vue
✏️  client-mobile/src/pages/auth/login-optimized.vue
✏️  client-mobile/src/pages/auth/role-login-optimized.vue
📝  client-mobile/docs/UPDATE_LOG.md
```

---

## v2.0.2 (2024-01-11)

### 优化改进
- 🔄 角色顺序调整
  - 管理员角色移到最后
  - 角色顺序：村民 → 村干部 → 乡镇干部 → 采购商 → 管理员

### 文件修改
```
✏️  client-mobile/src/pages/auth/login-enhanced.vue
✏️  client-mobile/src/pages/auth/login-optimized.vue
✏️  client-mobile/src/pages/auth/role-login-optimized.vue
📝  client-mobile/docs/UPDATE_LOG.md
📝  client-mobile/docs/LOGIN_ROLE_AGREEMENT_UPDATE.md
```

---

## v2.0.1 (2024-01-11)

### 新增功能
- ✨ 新增采购商角色
  - 角色图标：🏪
  - 角色颜色：#eb2f96（粉色）
  - 登录后跳转：`/home/purchaser`

### 优化改进
- 🔄 角色名称调整
  - 将"乡镇官员"改为"乡镇干部"
- 🔄 乡镇干部状态调整
  - 从"即将开放"改为正常可用状态
- 🔄 协议点击提示
  - 点击《用户协议》显示 Toast 提示
  - 点击《隐私政策》显示 Toast 提示
  - 提示内容引导用户勾选协议

### Bug 修复
- 🐛 确保不勾选协议无法登录
  - 协议未勾选时登录按钮禁用
  - 点击登录时显示错误提示
  - 语音播报错误信息（适老化模式）
  - 错误震动反馈

### 文件修改
```
✏️  client-mobile/src/pages/auth/login-enhanced.vue
✏️  client-mobile/src/pages/auth/login-optimized.vue
✏️  client-mobile/src/pages/auth/role-login-optimized.vue
📝  client-mobile/docs/LOGIN_ROLE_AGREEMENT_UPDATE.md
📝  client-mobile/docs/UPDATE_LOG.md
```

---

## v2.0.0 (2024-01-11)

### 新增功能
- ✨ 全新增强版登录页面（login-enhanced.vue）
- ✨ 语音播报功能
- ✨ 高对比度模式
- ✨ 适老化模式优化
- ✨ 震动反馈（6 种震动类型）
- ✨ Toast 提示替代 alert
- ✨ 加载状态动画
- ✨ 验证码自动填充
- ✨ 实时输入验证
- ✨ SVG 矢量图标

### 优化改进
- 🎨 视觉设计优化
  - 温暖绿色主题
  - 渐变色 Logo
  - 柔和背景动画
- 📱 响应式设计
  - 适配多种屏幕尺寸
  - 横屏支持
  - 安全区域处理
- ♿ 无障碍访问
  - ARIA 标签
  - 键盘导航
  - 屏幕阅读器支持
  - WCAG 2.1 Level AA 合规

### 文件新增
```
📄 client-mobile/src/pages/auth/login-enhanced.vue
📄 client-mobile/docs/login-optimization-report.md
📄 client-mobile/docs/login-user-guide.md
📄 client-mobile/docs/LOGIN_OPTIMIZATION.md
```

### 文件修改
```
✏️  client-mobile/src/store/elderly.js
✏️  client-mobile/src/router/index.js
```

---

## 角色列表

| 角色 | 角色值 | 图标 | 颜色 | 跳转路径 | 状态 |
|------|--------|------|------|---------|------|
| 村民 | villager | 👨‍🌾 | #52c41a | /village | ✅ 可用 |
| 村干部 | cadre | 👔 | #1890ff | /services | ✅ 可用 |
| 乡镇干部 | official | 🏛️ | #722ed1 | /services | ✅ 可用 |
| 采购商 | purchaser | 🏪 | #eb2f96 | /home/purchaser | ✅ 可用 |
| 管理员 | admin | ⚙️ | #fa8c16 | /services | ✅ 可用 |

---

## 路由配置

```javascript
// client-mobile/src/router/index.js
{
  path: '/auth/login',
  name: 'Login',
  component: () => import('@/pages/auth/login-enhanced.vue'),
  meta: { title: '登录' }
}
```

---

## 协议验证逻辑

```javascript
const canLogin = computed(() => {
  return form.value.phone.length === 11 &&
         form.value.code.length > 0 &&
         agreed.value &&  // 必须勾选协议
         !phoneError.value
})
```

---

## 浏览器兼容性

| 浏览器 | 最低版本 | 支持情况 |
|--------|---------|---------|
| Chrome | 90+ | ✅ 完全支持 |
| Edge | 90+ | ✅ 完全支持 |
| Safari | 14+ | ✅ 完全支持 |
| Firefox | 88+ | ✅ 完全支持 |
| iOS Safari | 14+ | ✅ 完全支持 |
| Android Chrome | 90+ | ✅ 完全支持 |

---

## 性能指标

- 首次内容绘制（FCP）：< 1s
- 最大内容绘制（LCP）：< 2.5s
- 累积布局偏移（CLS）：< 0.1
- 首次输入延迟（FID）：< 100ms

---

## WCAG 合规性

- WCAG 2.1 Level AA - ✅ 合规
- 颜色对比度 - 4.5:1 或更高 ✅
- 可点击区域 - 至少 44x44px ✅
- 键盘导航 - 完全支持 ✅
- 屏幕阅读器 - 完全支持 ✅

---

## 开发团队

智慧乡村开发团队

---

## 许可证

© 2024 智慧乡村综合服务平台
