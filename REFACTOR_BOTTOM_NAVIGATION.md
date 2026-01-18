# 移动端底部导航重构方案

## 📋 概述

重构移动端底部导航组件，实现基于角色的差异化导航，提升用户体验和可维护性。

## 🎯 目标

1. **统一角色定义** - 规范化5种角色的权限和职责
2. **优化配置结构** - 统一路由配置和导航配置
3. **增强用户体验** - 添加徽章、动画、适老化支持
4. **提高可维护性** - 组件化、配置化、可扩展

## 🏗️ 架构设计

### 1. 角色定义

```typescript
enum UserRole {
  RESIDENT = 'resident',           // 村民
  VILLAGE_CADRE = 'village_cadre',  // 村干部
  TOWNSHIP_OFFICIAL = 'township_official', // 乡镇干部
  PURCHASER = 'purchaser',         // 采购商
  ADMIN = 'admin',                 // 管理员
}
```

### 2. 路由前缀映射

```typescript
enum RoutePrefix {
  RESIDENT = '/mobile',
  VILLAGE_CADRE = '/village',
  TOWNSHIP_OFFICIAL = '/township',
  PURCHASER = '/purchaser',
  ADMIN = '/admin',
}
```

### 3. 文件结构

```
client/src/
├── components/
│   └── mobile/
│       └── BottomNavigation/
│           ├── index.vue                    # 主组件
│           ├── NavItem.vue                   # 导航项组件
│           ├── useBottomNavigation.ts        # 组合式API
│           └── types.ts                      # 类型定义
├── config/
│   ├── navigation/
│   │   ├── index.ts                          # 导出配置
│   │   ├── roles.ts                         # 角色导航配置
│   │   └── badges.ts                        # 徽章配置
│   └── navigation.config.ts                 # 统一导航配置（替换roleNavigation.js和routeNavigation.js）
└── composables/
    └── useNavigationState.ts                # 导航状态管理
```

## 📐 组件设计

### BottomNavigation 主组件

```vue
<template>
  <nav class="bottom-navigation" :class="classes">
    <nav-item
      v-for="item in navItems"
      :key="item.id"
      :item="item"
      :active="isActive(item)"
      :badge="getBadge(item)"
      @click="handleClick(item)"
    />
  </nav>
</template>
```

**特性**：
- ✅ 动态路由匹配
- ✅ 角色权限过滤
- ✅ 消息徽章支持
- ✅ 点击动画效果
- ✅ 适老化模式
- ✅ 深色模式
- ✅ 横竖屏适配

### NavItem 子组件

```vue
<template>
  <div class="nav-item" :class="classes" @click="$emit('click')">
    <el-badge :value="badge" :hidden="!badge">
      <el-icon :size="iconSize">
        <component :is="item.icon" />
      </el-icon>
    </el-badge>
    <span class="nav-label">{{ item.label }}</span>
    <div class="active-indicator" v-if="active" />
  </div>
</template>
```

## 🔧 配置结构

### navigation.config.ts

```typescript
import { UserRole } from '@/types/user';

export interface NavigationConfig {
  role: UserRole;
  routePrefix: string;
  items: NavigationItem[];
  badgeConfig?: BadgeConfig;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: Component;
  route: string;
  badge?: number | ((state: any) => number);
  hidden?: boolean;
}

export interface BadgeConfig {
  enabled: boolean;
  refreshInterval?: number; // 徽章刷新间隔（秒）
}

export const NAVIGATION_CONFIG: Record<UserRole, NavigationConfig> = {
  [UserRole.RESIDENT]: {
    role: UserRole.RESIDENT,
    routePrefix: '/mobile',
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/mobile/home' },
      { id: 'services', label: '服务', icon: Plus, route: '/mobile/services' },
      { id: 'life', label: '生活', icon: ChatDotSquare, route: '/mobile/life' },
      { id: 'messages', label: '消息', icon: Message, route: '/mobile/messages', badge: 'unreadCount' },
      { id: 'profile', label: '我的', icon: User, route: '/mobile/profile' },
    ],
    badgeConfig: { enabled: true, refreshInterval: 30 },
  },

  [UserRole.VILLAGE_CADRE]: {
    role: UserRole.VILLAGE_CADRE,
    routePrefix: '/village',
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/village/home' },
      { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/village/affairs' },
      { id: 'messages', label: '消息', icon: Message, route: '/village/messages', badge: 'unreadCount' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
    badgeConfig: { enabled: true, refreshInterval: 30 },
  },

  [UserRole.TOWNSHIP_OFFICIAL]: {
    role: UserRole.TOWNSHIP_OFFICIAL,
    routePrefix: '/township',
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/township/home' },
      { id: 'manage', label: '管理', icon: Management, route: '/township/villages' },
      { id: 'statistics', label: '统计', icon: DataAnalysis, route: '/township/statistics' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
    badgeConfig: { enabled: false },
  },

  [UserRole.PURCHASER]: {
    role: UserRole.PURCHASER,
    routePrefix: '/purchaser',
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/purchaser/home' },
      { id: 'market', label: '市场', icon: Shop, route: '/purchaser/market' },
      { id: 'orders', label: '订单', icon: ShoppingBag, route: '/purchaser/orders', badge: 'pendingOrders' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
    badgeConfig: { enabled: true, refreshInterval: 60 },
  },

  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    routePrefix: '/admin',
    items: [
      { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/admin/affairs' },
      { id: 'messages', label: '消息', icon: Message, route: '/admin/messages', badge: 'systemMessages' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
    badgeConfig: { enabled: true, refreshInterval: 15 },
  },
};
```

## 🎨 样式设计

### 主题色配置

```scss
// 颜色变量
$nav-height: 60px;
$nav-height-large: 70px;
$nav-height-mini: 50px;

$nav-bg: #ffffff;
$nav-bg-dark: #1f2937;

$nav-color: #9ca3af;
$nav-color-active: #409eff;
$nav-color-active-dark: #60a5fa;

$nav-label-size: 11px;
$nav-label-size-large: 14px;
$nav-label-size-mini: 10px;
```

### 响应式样式

```scss
// 默认竖屏
.bottom-navigation {
  height: $nav-height;
  .nav-label { font-size: $nav-label-size; }
}

// 大字模式
.bottom-navigation.large-text-mode {
  height: $nav-height-large;
  .nav-label { font-size: $nav-label-size-large; }
}

// 深色模式
.bottom-navigation.dark-mode {
  background: $nav-bg-dark;
  .nav-item.active { color: $nav-color-active-dark; }
}

// 横屏迷你模式
@media (orientation: landscape) and (max-height: 500px) {
  .bottom-navigation {
    height: $nav-height-mini;
    .nav-label { font-size: $nav-label-size-mini; }
  }
}
```

### 动画效果

```scss
// 点击波纹效果
.nav-item {
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(64, 158, 255, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.3s, height 0.3s;
  }

  &:active::after {
    width: 100px;
    height: 100px;
  }
}

// 激活指示器动画
.active-indicator {
  width: 0;
  transition: width 0.3s ease;

  .nav-item.active & {
    width: 20px;
  }
}
```

## ⚙️ 功能实现

### 1. 角色自动识别

```typescript
// useNavigationState.ts
export function useNavigationState() {
  const route = useRoute();
  const userStore = useUserStore();

  const currentUserRole = computed(() => {
    // 优先从用户store获取
    if (userStore.role) {
      return userStore.role;
    }

    // 从路由前缀推断
    const path = route.path;
    for (const [role, config] of Object.entries(NAVIGATION_CONFIG)) {
      if (path.startsWith(config.routePrefix)) {
        return role;
      }
    }

    return UserRole.RESIDENT; // 默认村民
  });

  const navigationConfig = computed(() => {
    return NAVIGATION_CONFIG[currentUserRole.value];
  });

  const filteredNavItems = computed(() => {
    return navigationConfig.value.items.filter(item => !item.hidden);
  });

  return {
    currentUserRole,
    navigationConfig,
    filteredNavItems,
  };
}
```

### 2. 消息徽章

```typescript
// useBadgeCount.ts
export function useBadgeCount(item: NavigationItem) {
  const messageStore = useMessageStore();
  const orderStore = useOrderStore();
  const systemStore = useSystemStore();

  const badgeCount = computed(() => {
    if (typeof item.badge === 'function') {
      return item.badge({
        unreadCount: messageStore.unreadCount,
        pendingOrders: orderStore.pendingOrders,
        systemMessages: systemStore.unreadCount,
      });
    }

    if (typeof item.badge === 'string') {
      switch (item.badge) {
        case 'unreadCount':
          return messageStore.unreadCount;
        case 'pendingOrders':
          return orderStore.pendingOrders;
        case 'systemMessages':
          return systemStore.unreadCount;
        default:
          return 0;
      }
    }

    return 0;
  });

  return badgeCount;
}
```

### 3. 路由激活检测

```typescript
// useActiveRoute.ts
export function useActiveRoute() {
  const route = useRoute();

  function isActive(item: NavigationItem): boolean {
    const currentPath = route.path;
    const itemPath = item.route;

    // 精确匹配
    if (currentPath === itemPath) {
      return true;
    }

    // 前缀匹配（用于子页面）
    if (currentPath.startsWith(itemPath + '/')) {
      return true;
    }

    return false;
  }

  return { isActive };
}
```

### 4. 适老化适配

```typescript
// useAccessibility.ts
export function useAccessibility() {
  const accessibilityStore = useAccessibilityStore();

  const navHeight = computed(() => {
    if (accessibilityStore.largeTextMode) {
      return '70px';
    }
    return '60px';
  });

  const iconSize = computed(() => {
    if (accessibilityStore.largeTextMode) {
      return 28;
    }
    return 24;
  });

  const labelSize = computed(() => {
    if (accessibilityStore.largeTextMode) {
      return '14px';
    }
    return '11px';
  });

  return {
    navHeight,
    iconSize,
    labelSize,
  };
}
```

## 🔄 迁移计划

### Phase 1: 创建新组件（不影响现有功能）
1. 创建 `components/mobile/BottomNavigation/` 目录
2. 实现 `BottomNavigation.vue`、`NavItem.vue`
3. 创建组合式API：`useBottomNavigation.ts`
4. 添加配置文件：`config/navigation.config.ts`

### Phase 2: 配置迁移
1. 将 `roleNavigation.js` 和 `routeNavigation.js` 的配置合并到 `navigation.config.ts`
2. 统一路由前缀映射
3. 添加类型定义

### Phase 3: 逐步替换
1. 在测试页面使用新组件
2. 验证所有角色的导航显示
3. 确认徽章功能正常
4. 测试适老化模式

### Phase 4: 清理旧代码
1. 更新 `MobileLayout.vue` 使用新组件
2. 删除旧的 `roleNavigation.js` 和 `routeNavigation.js`
3. 清理未使用的导入和代码

## 📋 测试计划

### 功能测试
- [ ] 村民角色：5个tab正确显示
- [ ] 村干部角色：4个tab正确显示
- [ ] 乡镇干部角色：4个tab正确显示
- [ ] 采购商角色：4个tab正确显示
- [ ] 管理员角色：3个tab正确显示
- [ ] 消息徽章正确显示数字
- [ ] 点击切换正确跳转

### 样式测试
- [ ] 普通模式样式正常
- [ ] 深色模式样式正常
- [ ] 大字模式样式正常
- [ ] 横屏模式样式正常
- [ ] 激活状态指示器正常

### 适配性测试
- [ ] iPhone X安全区域适配
- [ ] 不同屏幕尺寸适配
- [ ] 不同DPI屏幕适配
- [ ] 高对比度模式

### 性能测试
- [ ] 导航项切换无延迟
- [ ] 徽章刷新不影响性能
- [ ] 横竖屏切换流畅

## ✅ 验收标准

1. ✅ 所有5种角色的导航正确显示
2. ✅ 消息徽章功能正常
3. ✅ 点击动画效果流畅
4. ✅ 适老化模式支持完善
5. ✅ 深色模式支持完善
6. ✅ 横竖屏适配正常
7. ✅ 代码通过TypeScript类型检查
8. ✅ 代码通过ESLint检查
9. ✅ 测试覆盖率 > 80%
10. ✅ 移动端性能良好（< 100ms响应）

## 📝 注意事项

1. **向后兼容**：确保现有功能不受影响
2. **渐进式迁移**：不要一次性删除旧代码
3. **充分测试**：每个角色都要测试
4. **性能优化**：避免不必要的重渲染
5. **可访问性**：确保键盘导航和屏幕阅读器支持
