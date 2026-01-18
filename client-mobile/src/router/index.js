import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/auth/multi-login'
  },
  {
    path: '/auth/login',
    redirect: '/auth/multi-login'
  },
  // {
  //   path: '/auth/login-enhanced',
  //   name: 'LoginEnhanced',
  //   component: () => import('../pages/auth/login-enhanced.vue'),
  //   meta: { title: '登录' }
  // },
  // {
  //   path: '/auth/login-optimized',
  //   name: 'LoginOptimized',
  //   component: () => import('../pages/auth/login-optimized.vue'),
  //   meta: { title: '登录' }
  // },
  // {
  //   path: '/auth/role-login',
  //   name: 'RoleLogin',
  //   component: () => import('../pages/auth/role-login-optimized.vue'),
  //   meta: { title: '登录' }
  // },
  {
    path: '/auth/login',
    redirect: '/auth/multi-login'
  },
  {
    path: '/auth/multi-login',
    name: 'MultiLogin',
    component: () => import('../pages/auth/multi-login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: () => import('../pages/auth/register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/auth/agreement/:type',
    name: 'Agreement',
    component: () => import('../pages/auth/agreement.vue'),
    meta: { title: '用户协议' }
  },
  {
    path: '/village',
    name: 'Village',
    component: () => import('../pages/village/index.vue'),
    meta: { title: '村务' }
  },
  {
    path: '/village/announcement',
    name: 'Announcement',
    component: () => import('../pages/village/announcement.vue'),
    meta: { title: '村务公告' }
  },
  {
    path: '/village/announcement/:id',
    name: 'AnnouncementDetail',
    component: () => import('../pages/village/announcement-detail.vue'),
    meta: { title: '公告详情' }
  },
  {
    path: '/village/vote',
    name: 'Vote',
    component: () => import('../pages/village/vote.vue'),
    meta: { title: '村民投票' }
  },
  {
    path: '/village/finance',
    name: 'Finance',
    component: () => import('../pages/village/finance.vue'),
    meta: { title: '村务财务' }
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import('../pages/services/index.vue'),
    meta: { title: '服务' }
  },
  {
    path: '/services/household-qr',
    name: 'HouseholdQR',
    component: () => import('../pages/services/household-qr.vue'),
    meta: { title: '一户一码' }
  },
  {
    path: '/services/documents',
    name: 'Documents',
    component: () => import('../pages/services/documents.vue'),
    meta: { title: '我的证件' }
  },
  {
    path: '/services/data-collection',
    name: 'DataCollection',
    component: () => import('../pages/services/data-collection.vue'),
    meta: { title: '资料收集' }
  },
  {
    path: '/services/publish',
    name: 'Publish',
    component: () => import('../pages/services/publish.vue'),
    meta: { title: '发布公告' }
  },
  {
    path: '/life',
    name: 'Life',
    component: () => import('../pages/life/index.vue'),
    meta: { title: '生活' }
  },
  {
    path: '/agriculture',
    name: 'Agriculture',
    component: () => import('../pages/agriculture/index.vue'),
    meta: { title: '三农圈' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../pages/profile/index.vue'),
    meta: { title: '我的' }
  },
  {
    path: '/profile/edit',
    name: 'ProfileEdit',
    component: () => import('../pages/profile/edit.vue'),
    meta: { title: '个人资料' }
  },
  {
    path: '/profile/quadrant',
    name: 'QuadrantWork',
    component: () => import('../pages/profile/quadrant.vue'),
    meta: { title: '四象限工作台' }
  },
  {
    path: '/profile/approvals',
    name: 'Approvals',
    component: () => import('../pages/profile/approvals.vue'),
    meta: { title: '村干部审核' }
  },
  // 聊天相关路由
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../pages/chat/index.vue'),
    meta: { title: '消息' }
  },
  {
    path: '/chat/detail/:id',
    name: 'ChatDetail',
    component: () => import('../pages/chat/detail.vue'),
    meta: { title: '聊天详情' }
  },
  {
    path: '/chat/contacts',
    name: 'Contacts',
    component: () => import('../pages/chat/contacts.vue'),
    meta: { title: '通讯录' }
  },
  {
    path: '/chat/groups',
    name: 'Groups',
    component: () => import('../pages/chat/groups.vue'),
    meta: { title: '群聊' }
  },
  {
    path: '/chat/new',
    name: 'NewChat',
    component: () => import('../pages/chat/new.vue'),
    meta: { title: '发起聊天' }
  },
  {
    path: '/chat/add-friend',
    name: 'AddFriend',
    component: () => import('../pages/chat/add-friend.vue'),
    meta: { title: '添加朋友' }
  },
  {
    path: '/chat/friend-requests',
    name: 'FriendRequests',
    component: () => import('../pages/chat/friend-requests.vue'),
    meta: { title: '好友申请' }
  },
  {
    path: '/chat/import-contacts',
    name: 'ImportContacts',
    component: () => import('../pages/chat/import-contacts.vue'),
    meta: { title: '导入通讯录' }
  },
  {
    path: '/chat/group-info/:id',
    name: 'GroupInfo',
    component: () => import('../pages/chat/group-info.vue'),
    meta: { title: '群聊信息' }
  },
  {
    path: '/chat/invite-members/:id',
    name: 'InviteMembers',
    component: () => import('../pages/chat/invite-members.vue'),
    meta: { title: '邀请成员' }
  },
  // AI问答
  {
    path: '/ai-assistant',
    name: 'AIAssistant',
    component: () => import('../pages/ai/index.vue'),
    meta: { title: 'AI助手' }
  },
  // 采购商首页
  {
    path: '/purchaser',
    name: 'PurchaserHome',
    component: () => import('../pages/purchaser/index.vue'),
    meta: { title: '采购商' }
  },
  // 角色首页
  {
    path: '/home/villager',
    name: 'VillagerHome',
    component: () => import('../pages/home/villager.vue'),
    meta: { title: '村民首页' }
  },
  {
    path: '/home/cadre',
    name: 'CadreHome',
    component: () => import('../pages/home/cadre.vue'),
    meta: { title: '村干部首页' }
  },
  {
    path: '/home/official',
    name: 'OfficialHome',
    component: () => import('../pages/home/official.vue'),
    meta: { title: '乡镇干部首页' }
  },
  {
    path: '/home/admin',
    name: 'AdminHome',
    component: () => import('../pages/home/admin.vue'),
    meta: { title: '管理员首页' }
  },
  {
    path: '/permission-management',
    name: 'PermissionManagement',
    component: () => import('../pages/home/permission-management.vue'),
    meta: { title: '权限管理' }
  },
  {
    path: '/user-management',
    name: 'UserManagement',
    component: () => import('../pages/home/user-management.vue'),
    meta: { title: '用户管理' }
  },
  {
    path: '/data-analytics',
    name: 'DataAnalytics',
    component: () => import('../pages/home/data-analytics.vue'),
    meta: { title: '数据分析' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title;
  }
  next();
});

export default router;
