import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/village'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/auth/login.vue'),
    meta: { title: '登录' }
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router
