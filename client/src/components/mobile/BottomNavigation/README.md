# BottomNavigation 组件使用指南

移动端底部导航栏组件,支持多种模式、动画效果和响应式适配。

## 组件文件

- `BottomNavigation/index.vue` - 底部导航栏主组件
- `BottomNavigation/NavItem.vue` - 导航项子组件

## 功能特性

### ✨ 核心功能
- 🎨 **多种主题模式** - 支持普通模式、深色模式、适老化模式
- 📱 **响应式适配** - 自动适配横竖屏、不同屏幕尺寸
- 🎬 **流畅动画** - 点击波纹、激活指示器、徽章动画
- 🔔 **徽章支持** - 多种类型徽章(danger/warning/success/info)
- ♿ **无障碍访问** - 键盘导航、焦点管理、ARIA 标签
- 🌓 **深色模式** - 完整的深色模式支持
- 👴 **适老化** - 大字体、大按钮、高对比度

### 🎯 尺寸规格

| 模式 | 高度 | 标签字号 | 图标尺寸 |
|------|------|----------|----------|
| 普通模式 | 60px | 11px | 24px |
| 适老化模式 | 70px | 14px | 28px |
| 横屏迷你模式 | 50px | 10px | 20px |

## 使用示例

### 基础用法

```vue
<template>
  <BottomNavigation
    :items="navItems"
    :current-route="currentRoute"
    :is-elderly-mode="isElderlyMode"
    :is-landscape="isLandscape"
    @item-click="handleNavClick"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import BottomNavigation from '@/components/mobile/BottomNavigation/index.vue';
import {
  Home,
  Plus,
  ChatDotSquare,
  User,
} from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();
const isElderlyMode = ref(false);
const isLandscape = ref(false);

// 当前路由
const currentRoute = computed(() => route.path);

// 导航项配置
const navItems = [
  {
    id: 'home',
    label: '首页',
    icon: Home,
    route: '/home/villager',
  },
  {
    id: 'services',
    label: '服务',
    icon: Plus,
    route: '/home/villager/services',
  },
  {
    id: 'messages',
    label: '消息',
    icon: ChatDotSquare,
    route: '/home/villager/messages',
    badge: 3,
    badgeType: 'danger',
  },
  {
    id: 'profile',
    label: '我的',
    icon: User,
    route: '/profile',
  },
];

// 处理导航点击
const handleNavClick = (item) => {
  router.push(item.route);
};

// 监听屏幕方向
const handleOrientationChange = () => {
  isLandscape.value = window.innerHeight < window.innerWidth;
};

onMounted(() => {
  handleOrientationChange();
  window.addEventListener('resize', handleOrientationChange);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleOrientationChange);
});
</script>
```

### 带徽章的导航项

```vue
<script setup>
const navItems = [
  {
    id: 'messages',
    label: '消息',
    icon: Message,
    route: '/messages',
    badge: 5, // 徽章数量
    badgeType: 'danger', // danger | warning | success | info
  },
  {
    id: 'notifications',
    label: '通知',
    icon: Bell,
    route: '/notifications',
    badge: 99, // 超过99显示 "99+"
    badgeType: 'warning',
  },
];
</script>
```

### 适老化模式

```vue
<template>
  <BottomNavigation
    :items="navItems"
    :current-route="currentRoute"
    :is-elderly-mode="true"
  />
</template>
```

### 深色模式

组件自动支持深色模式,只需在父组件或根元素上添加 `.dark` 类:

```vue
<template>
  <div class="dark">
    <BottomNavigation
      :items="navItems"
      :current-route="currentRoute"
    />
  </div>
</template>
```

## API

### BottomNavigation Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| items | 导航项数组 | `NavItemData[]` | `[]` (必填) |
| currentRoute | 当前激活的路由路径 | `string` | `''` |
| isElderlyMode | 是否为适老化模式 | `boolean` | `false` |
| isLandscape | 是否为横屏模式 | `boolean` | `false` |

### BottomNavigation Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| itemClick | 导航项点击事件 | `(item: NavItemData) => void` |

### NavItemData 接口

```javascript
{
  id: string;           // 导航项唯一标识
  label: string;        // 导航项标签
  icon: Component;      // 图标组件
  route: string;        // 路由路径
  badge?: number;       // 徽章数量 (可选)
  badgeType?: string;   // 徽章类型: 'danger' | 'warning' | 'success' | 'info' (可选)
}
```

## 样式定制

### CSS 变量

组件使用 CSS 变量定义样式,可以通过覆盖变量来自定义外观:

```scss
// 覆盖默认颜色变量
:root {
  --bn-bg-color: #ffffff;
  --bn-text-color: #9ca3af;
  --bn-active-color: #409eff;
  --bn-indicator-color: #409eff;
}

// 深色模式变量
.dark {
  --bn-bg-color: #1f2937;
  --bn-text-color: #9ca3af;
  --bn-active-color: #60a5fa;
}
```

### 可用变量列表

#### 颜色变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `--bn-bg-color` | 背景色 | `#ffffff` |
| `--bn-text-color` | 文本颜色 | `#9ca3af` |
| `--bn-active-color` | 激活状态颜色 | `#409eff` |
| `--bn-indicator-color` | 指示器颜色 | `#409eff` |
| `--bn-ripple-color` | 波纹颜色 | `rgba(64, 158, 255, 0.2)` |

#### 尺寸变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `--bn-height-normal` | 普通模式高度 | `60px` |
| `--bn-height-elderly` | 适老化模式高度 | `70px` |
| `--bn-height-landscape` | 横屏模式高度 | `50px` |
| `--bn-icon-size-normal` | 普通模式图标 | `24px` |
| `--bn-icon-size-elderly` | 适老化图标 | `28px` |
| `--bn-icon-size-landscape` | 横屏图标 | `20px` |
| `--bn-label-font-size-normal` | 普通模式字号 | `11px` |
| `--bn-label-font-size-elderly` | 适老化字号 | `14px` |
| `--bn-label-font-size-landscape` | 横屏字号 | `10px` |

## 响应式断点

组件内置以下响应式断点:

- `< 360px`: 超小屏幕 (高度调整为 56px)
- `361px - 414px`: 小屏幕 (默认尺寸)
- `415px - 768px`: 中等屏幕 (默认尺寸)
- `> 768px`: 大屏幕 (默认尺寸)

横屏自动适配:
```scss
@media screen and (orientation: landscape) and (max-height: 500px) {
  // 自动切换到横屏迷你模式
}
```

## 无障碍特性

### 键盘导航
- 支持 Tab 键切换焦点
- 支持 Enter 键激活
- 可见焦点指示器 (`focus-visible`)

### ARIA 标签
- `role="button"` - 标识按钮角色
- `aria-label` - 标签文本
- `aria-current="page"` - 当前页面指示

### 屏幕阅读器
- 语义化 HTML 结构
- 描述性文本标签

## 浏览器兼容性

- ✅ Chrome/Edge (最新版本)
- ✅ Safari (最新版本)
- ✅ Firefox (最新版本)
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+

### CSS 特性支持
- CSS Variables
- CSS Transitions
- CSS Animations
- env(safe-area-inset-bottom) - 安全区域适配

## 注意事项

1. **徽章显示**: 徽章数量超过 99 时会显示 "99+"
2. **安全区域**: 组件自动适配刘海屏等安全区域
3. **触觉反馈**: 点击时会在支持的设备上触发震动
4. **性能优化**: 使用硬件加速 (`transform: translateZ(0)`)
5. **动画控制**: 支持减少动画偏好设置 (`prefers-reduced-motion`)

## 最佳实践

### 1. 动态导航项
根据用户角色动态显示不同的导航项:

```javascript
import { getNavigationByRoute } from '@/config/routeNavigation';

const navItems = computed(() => {
  return getNavigationByRoute(route.path);
});
```

### 2. 徽章管理
使用 Vuex/Pinia 集中管理徽章数量:

```javascript
import { useNotificationStore } from '@/stores/notification';

const notificationStore = useNotificationStore();
const navItems = computed(() => [
  {
    id: 'messages',
    label: '消息',
    icon: Message,
    route: '/messages',
    badge: notificationStore.unreadCount,
  },
]);
```

### 3. 屏幕方向监听
实时监听屏幕方向变化:

```javascript
const isLandscape = ref(false);

const updateOrientation = () => {
  isLandscape.value = window.innerWidth > window.innerHeight;
};

onMounted(() => {
  updateOrientation();
  window.addEventListener('resize', updateOrientation);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateOrientation);
});
```

## 相关组件

- [`MobileLayout.vue`](../../../layouts/MobileLayout.vue) - 移动端布局
- [`ElderlyMode.vue`](../ElderlyMode.vue) - 适老化模式组件
- [`routeNavigation.js`](../../../config/routeNavigation.js) - 路由导航配置

## 更新日志

### v1.0.0 (2025-01-15)
- ✨ 初始版本发布
- ✨ 支持普通、适老化、横屏、深色模式
- ✨ 完整的动画效果(波纹、指示器、徽章)
- ✨ 响应式适配和安全区域支持
- ✨ 无障碍访问支持

---

**维护者**: Smart Village Platform Team
**最后更新**: 2025-01-15
