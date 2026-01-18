# 移动端路由配置更新指南

## 需要添加的新路由

请在 `client/src/router/index.js` 中找到对应角色的路由配置，在 children 数组中添加以下路由：

---

### 1. 村民角色 - 在 messages 路由后添加

```javascript
// 位置：path: 'resident' 的 children 数组中，在 messages 后面
{
  path: 'profile',
  name: 'resident-profile',
  component: () => import('@/views/mobile/resident/Profile.vue'),
  meta: { title: '个人中心' },
},
{
  path: 'feedback',
  name: 'resident-feedback',
  component: () => import('@/views/mobile/resident/Feedback.vue'),
  meta: { title: '意见反馈' },
},
```

---

### 2. 村干部角色 - 在 messages 路由后添加

```javascript
// 位置：path: 'village-cadre' 的 children 数组中，在 messages 后面
{
  path: 'residents',
  name: 'village-cadre-residents',
  component: () => import('@/views/mobile/villageCadre/Residents.vue'),
  meta: { title: '村民管理' },
},
```

---

### 3. 采购商角色 - 在 orders 路由后添加

```javascript
// 位置：path: 'purchaser' 的 children 数组中，在 orders 后面
{
  path: 'suppliers',
  name: 'purchaser-suppliers',
  component: () => import('@/views/mobile/purchaser/Suppliers.vue'),
  meta: { title: '供应商管理' },
},
```

---

### 4. 乡镇干部角色 - 在 statistics 路由后添加

```javascript
// 位置：path: 'township' 的 children 数组中，在 statistics 后面
{
  path: 'audit',
  name: 'township-audit',
  component: () => import('@/views/mobile/township/Audit.vue'),
  meta: { title: '审核管理' },
},
```

---

### 5. 管理员角色 - 在 messages 路由后添加

```javascript
// 位置：path: 'admin' 的 children 数组中，在 messages 后面
{
  path: 'users',
  name: 'mobile-admin-users',
  component: () => import('@/views/mobile/admin/Users.vue'),
  meta: { title: '用户管理' },
},
```

---

## 更新步骤

1. 打开 `client/src/router/index.js`
2. 使用搜索功能找到对应的路由配置（例如搜索 `'messages'`）
3. 在找到的 messages 路由配置后，粘贴对应角色的新路由代码
4. 保存文件
5. Vite会自动重新编译

## 验证更新

更新后，您应该能够访问以下路由：

- `/mobile/resident/profile` - 村民个人中心
- `/mobile/resident/feedback` - 村民意见反馈
- `/mobile/village-cadre/residents` - 村干部村民管理
- `/mobile/purchaser/suppliers` - 采购商供应商管理
- `/mobile/township/audit` - 乡镇干部审核管理
- `/mobile/admin/users` - 管理员用户管理
