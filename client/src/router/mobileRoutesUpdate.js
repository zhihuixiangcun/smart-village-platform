// 移动端路由更新配置
// 请将以下内容添加到 client/src/router/index.js 的对应位置

// 1. 村民首页 children 数组中添加:
/*
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
*/

// 2. 村干部首页 children 数组中添加:
/*
  {
    path: 'residents',
    name: 'village-cadre-residents',
    component: () => import('@/views/mobile/villageCadre/Residents.vue'),
    meta: { title: '村民管理' },
  },
*/

// 3. 采购商首页 children 数组中添加:
/*
  {
    path: 'suppliers',
    name: 'purchaser-suppliers',
    component: () => import('@/views/mobile/purchaser/Suppliers.vue'),
    meta: { title: '供应商管理' },
  },
*/

// 4. 乡镇干部首页 children 数组中添加:
/*
  {
    path: 'audit',
    name: 'township-audit',
    component: () => import('@/views/mobile/township/Audit.vue'),
    meta: { title: '审核管理' },
  },
*/

// 5. 管理员首页 children 数组中添加:
/*
  {
    path: 'users',
    name: 'mobile-admin-users',
    component: () => import('@/views/mobile/admin/Users.vue'),
    meta: { title: '用户管理' },
  },
*/
