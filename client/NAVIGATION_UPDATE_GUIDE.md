# 导航配置更新指南

## 需要更新的导航配置

请在 `client/src/config/navigation.config.js` 中更新 NAVIGATION_CONFIG，为每个角色添加新的导航项：

---

### 1. 村民导航 - 添加 profile 和 feedback

找到 `NAVIGATION_CONFIG[USER_ROLES.RESIDENT].items` 数组，更新为：

```javascript
items: [
  { id: 'home', label: '首页', icon: Home, route: '/mobile/resident' },
  { id: 'services', label: '服务', icon: Plus, route: '/mobile/resident/services' },
  { id: 'life', label: '生活', icon: ChatDotSquare, route: '/mobile/resident/life' },
  { id: 'messages', label: '消息', icon: Message, route: '/mobile/resident/messages', badgeKey: 'messages' },
  { id: 'profile', label: '我的', icon: User, route: '/mobile/resident/profile' },
  { id: 'feedback', label: '反馈', icon: Message, route: '/mobile/resident/feedback' },
],
```

---

### 2. 村干部导航 - 添加 residents

找到 `NAVIGATION_CONFIG[USER_ROLES.VILLAGE_CADRE].items` 数组，更新为：

```javascript
items: [
  { id: 'home', label: '首页', icon: Home, route: '/mobile/village-cadre' },
  { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/mobile/village-cadre/affairs' },
  { id: 'residents', label: '村民', icon: User, route: '/mobile/village-cadre/residents' },
  { id: 'messages', label: '消息', icon: Message, route: '/mobile/village-cadre/messages', badgeKey: 'messages' },
  { id: 'profile', label: '我的', icon: User, route: '/profile' },
],
```

---

### 3. 采购商导航 - 添加 suppliers

找到 `NAVIGATION_CONFIG[USER_ROLES.PURCHASER].items` 数组，更新为：

```javascript
items: [
  { id: 'home', label: '首页', icon: Home, route: '/mobile/purchaser' },
  { id: 'market', label: '市场', icon: Shop, route: '/mobile/purchaser/market' },
  { id: 'suppliers', label: '供应商', icon: Management, route: '/mobile/purchaser/suppliers' },
  { id: 'orders', label: '订单', icon: ShoppingBag, route: '/mobile/purchaser/orders', badgeKey: 'orders' },
  { id: 'profile', label: '我的', icon: User, route: '/profile' },
],
```

---

### 4. 乡镇干部导航 - 添加 audit

找到 `NAVIGATION_CONFIG[USER_ROLES.TOWNSHIP_OFFICIAL].items` 数组，更新为：

```javascript
items: [
  { id: 'home', label: '首页', icon: Home, route: '/mobile/township' },
  { id: 'audit', label: '审核', icon: DocumentChecked, route: '/mobile/township/audit' },
  { id: 'villages', label: '村庄', icon: Management, route: '/mobile/township/villages' },
  { id: 'statistics', label: '统计', icon: DataAnalysis, route: '/mobile/township/statistics' },
  { id: 'profile', label: '我的', icon: User, route: '/profile' },
],
```

---

### 5. 管理员导航 - 添加 users

找到 `NAVIGATION_CONFIG[USER_ROLES.ADMIN].items` 数组，更新为：

```javascript
items: [
  { id: 'home', label: '首页', icon: Home, route: '/mobile/admin' },
  { id: 'users', label: '用户', icon: User, route: '/mobile/admin/users' },
  { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/mobile/admin/affairs' },
  { id: 'messages', label: '消息', icon: Message, route: '/mobile/admin/messages', badgeKey: 'messages' },
  { id: 'profile', label: '我的', icon: User, route: '/profile' },
],
```

---

## 需要添加的新图标导入

在 `client/src/config/navigation.config.js` 顶部的 import 语句中添加：

```javascript
import {
  Home,
  Plus,
  ChatDotSquare,
  User,
  OfficeBuilding,
  Message,
  Shop,
  ShoppingBag,
  Management,
  DataAnalysis,
  DocumentChecked,  // 新增
} from '@element-plus/icons-vue';
```

---

## 更新后效果

更新后，底部导航栏将显示新的导航项，用户可以点击访问对应的功能页面。
