import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ElMessage } from 'element-plus'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: {
        requiresAuth: false,
        title: '智慧乡村首页'
      }
    },

    // 仪表板路由
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: {
        requiresAuth: false, // 暂时设为false便于测试
        title: '智慧乡村仪表板'
      }
    },

    // 认证相关路由
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: {
        requiresAuth: false,
        title: '用户登录',
        layout: 'auth'
      }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: {
        requiresAuth: false,
        title: '用户注册',
        layout: 'auth'
      }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
      meta: {
        requiresAuth: false,
        title: '找回密码',
        layout: 'auth'
      }
    },

    // 主要应用路由
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: {
        requiresAuth: true,
        title: '工作台',
        icon: 'Monitor',
        breadcrumb: [
          { title: '首页', path: '/dashboard' }
        ]
      }
    },

    // 村民管理模块
    {
      path: '/residents',
      name: 'residents',
      component: () => import('@/views/ResidentsView.vue'),
      meta: {
        requiresAuth: true,
        title: '村民管理',
        icon: 'User',
        permissions: ['resident:read'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '村民管理', path: '/residents' }
        ]
      }
    },
    {
      path: '/residents/:id',
      name: 'resident-detail',
      component: () => import('@/views/residents/ResidentDetailView.vue'),
      meta: {
        requiresAuth: true,
        title: '村民详情',
        permissions: ['resident:read'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '村民管理', path: '/residents' },
          { title: '村民详情', path: '' }
        ]
      }
    },
    {
      path: '/residents/add',
      name: 'resident-add',
      component: () => import('@/views/residents/ResidentAddView.vue'),
      meta: {
        requiresAuth: true,
        title: '添加村民',
        permissions: ['resident:write'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '村民管理', path: '/residents' },
          { title: '添加村民', path: '' }
        ]
      }
    },
    {
      path: '/residents/:id/edit',
      name: 'resident-edit',
      component: () => import('@/views/residents/ResidentEditView.vue'),
      meta: {
        requiresAuth: true,
        title: '编辑村民',
        permissions: ['resident:write'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '村民管理', path: '/residents' },
          { title: '编辑村民', path: '' }
        ]
      }
    },

    // 村委管理模块
    {
      path: '/committee',
      name: 'committee',
      component: () => import('@/views/CommitteeView.vue'),
      meta: {
        requiresAuth: true,
        title: '村委管理',
        icon: 'UserFilled',
        permissions: ['committee:read'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '村委管理', path: '/committee' }
        ]
      }
    },

    // 财务管理模块
    {
      path: '/finance',
      name: 'finance',
      redirect: '/finance/overview',
      meta: {
        requiresAuth: true,
        title: '财务管理',
        icon: 'Money',
        permissions: ['finance:read']
      },
      children: [
        {
          path: 'overview',
          name: 'finance-overview',
          component: () => import('@/views/finance/FinanceOverviewView.vue'),
          meta: {
            requiresAuth: true,
            title: '财务概览',
            permissions: ['finance:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '财务管理', path: '/finance' },
              { title: '财务概览', path: '/finance/overview' }
            ]
          }
        },
        {
          path: 'budget',
          name: 'finance-budget',
          component: () => import('@/views/finance/FinanceBudgetView.vue'),
          meta: {
            requiresAuth: true,
            title: '预算管理',
            permissions: ['finance:budget'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '财务管理', path: '/finance' },
              { title: '预算管理', path: '/finance/budget' }
            ]
          }
        },
        {
          path: 'expenses',
          name: 'finance-expenses',
          component: () => import('@/views/finance/FinanceExpensesView.vue'),
          meta: {
            requiresAuth: true,
            title: '支出管理',
            permissions: ['finance:write'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '财务管理', path: '/finance' },
              { title: '支出管理', path: '/finance/expenses' }
            ]
          }
        },
        {
          path: 'approval',
          name: 'finance-approval',
          component: () => import('@/views/finance/FinanceApprovalView.vue'),
          meta: {
            requiresAuth: true,
            title: '审批管理',
            permissions: ['finance:approve'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '财务管理', path: '/finance' },
              { title: '审批管理', path: '/finance/approval' }
            ]
          }
        },
        {
          path: 'reports',
          name: 'finance-reports',
          component: () => import('@/views/finance/FinanceReportsView.vue'),
          meta: {
            requiresAuth: true,
            title: '财务报表',
            permissions: ['finance:reports'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '财务管理', path: '/finance' },
              { title: '财务报表', path: '/finance/reports' }
            ]
          }
        }
      ]
    },

    // 村务治理模块
    {
      path: '/affairs',
      name: 'affairs',
      redirect: '/affairs/announcements',
      meta: {
        requiresAuth: true,
        title: '村务治理',
        icon: 'Bell',
        permissions: ['village:read']
      },
      children: [
        {
          path: 'announcements',
          name: 'affairs-announcements',
          component: () => import('@/views/affairs/AnnouncementsView.vue'),
          meta: {
            requiresAuth: true,
            title: '公告管理',
            permissions: ['village:announcement'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '村务治理', path: '/affairs' },
              { title: '公告管理', path: '/affairs/announcements' }
            ]
          }
        },
        {
          path: 'voting',
          name: 'affairs-voting',
          component: () => import('@/views/affairs/VotingView.vue'),
          meta: {
            requiresAuth: true,
            title: '投票管理',
            permissions: ['village:voting'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '村务治理', path: '/affairs' },
              { title: '投票管理', path: '/affairs/voting' }
            ]
          }
        },
        {
          path: 'meetings',
          name: 'affairs-meetings',
          component: () => import('@/views/affairs/MeetingsView.vue'),
          meta: {
            requiresAuth: true,
            title: '会议管理',
            permissions: ['village:meeting'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '村务治理', path: '/affairs' },
              { title: '会议管理', path: '/affairs/meetings' }
            ]
          }
        }
      ]
    },

    // 生活服务模块
    {
      path: '/services',
      name: 'services',
      redirect: '/services/applications',
      meta: {
        requiresAuth: true,
        title: '生活服务',
        icon: 'Service',
        permissions: ['service:read']
      },
      children: [
        {
          path: 'applications',
          name: 'services-applications',
          component: () => import('@/views/services/ApplicationsView.vue'),
          meta: {
            requiresAuth: true,
            title: '办事服务',
            permissions: ['service:application'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '生活服务', path: '/services' },
              { title: '办事服务', path: '/services/applications' }
            ]
          }
        },
        {
          path: 'household-codes',
          name: 'services-household-codes',
          component: () => import('@/views/services/HouseholdCodesView.vue'),
          meta: {
            requiresAuth: true,
            title: '一户一码',
            permissions: ['household:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '生活服务', path: '/services' },
              { title: '一户一码', path: '/services/household-codes' }
            ]
          }
        }
      ]
    },

    // 采购商管理模块
    {
      path: '/purchasers',
      name: 'purchasers',
      component: () => import('@/views/purchasers/PurchasersView.vue'),
      meta: {
        requiresAuth: true,
        title: '采购商管理',
        icon: 'ShoppingCart',
        permissions: ['purchaser:read'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '采购商管理', path: '/purchasers' }
        ]
      }
    },

    // 系统管理模块
    {
      path: '/system',
      name: 'system',
      redirect: '/system/users',
      meta: {
        requiresAuth: true,
        title: '系统管理',
        icon: 'Setting',
        permissions: ['system:read']
      },
      children: [
        {
          path: 'users',
          name: 'system-users',
          component: () => import('@/views/system/UsersView.vue'),
          meta: {
            requiresAuth: true,
            title: '用户管理',
            permissions: ['system:user'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '系统管理', path: '/system' },
              { title: '用户管理', path: '/system/users' }
            ]
          }
        },
        {
          path: 'roles',
          name: 'system-roles',
          component: () => import('@/views/system/RolesView.vue'),
          meta: {
            requiresAuth: true,
            title: '角色管理',
            permissions: ['system:role'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '系统管理', path: '/system' },
              { title: '角色管理', path: '/system/roles' }
            ]
          }
        },
        {
          path: 'logs',
          name: 'system-logs',
          component: () => import('@/views/system/LogsView.vue'),
          meta: {
            requiresAuth: true,
            title: '操作日志',
            permissions: ['system:log'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '系统管理', path: '/system' },
              { title: '操作日志', path: '/system/logs' }
            ]
          }
        }
      ]
    },

    // 个人中心
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/profile/ProfileView.vue'),
      meta: {
        requiresAuth: true,
        title: '个人中心',
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '个人中心', path: '/profile' }
        ]
      }
    },

    // 开发和测试相关路由
    {
      path: '/test',
      name: 'test',
      redirect: '/test/connection',
      meta: {
        requiresAuth: false,
        title: '系统测试',
        icon: 'Tools'
      },
      children: [
        {
          path: 'connection',
          name: 'test-connection',
          component: () => import('@/views/test/ConnectionTest.vue'),
          meta: {
            requiresAuth: false,
            title: '前后端连接测试',
            breadcrumb: [
              { title: '系统测试', path: '/test' },
              { title: '连接测试', path: '/test/connection' }
            ]
          }
        }
      ]
    },

    // 错误页面
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/error/403View.vue'),
      meta: {
        requiresAuth: false,
        title: '访问禁止',
        layout: 'error'
      }
    },
    {
      path: '/404',
      name: 'not-found',
      component: () => import('@/views/error/404View.vue'),
      meta: {
        requiresAuth: false,
        title: '页面未找到',
        layout: 'error'
      }
    },
    {
      path: '/500',
      name: 'server-error',
      component: () => import('@/views/error/500View.vue'),
      meta: {
        requiresAuth: false,
        title: '服务器错误',
        layout: 'error'
      }
    },

    // 捕获所有未匹配的路由
    {
      path: '/:pathMatch(.*)*',
      redirect: '/404'
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 智慧村庄管理平台` : '智慧村庄管理平台'

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    try {
      // 如果用户未登录，尝试恢复会话
      if (!userStore.isLoggedIn) {
        const restored = await userStore.restoreUserSession()
        if (!restored) {
          ElMessage.warning('请先登录')
          next({
            name: 'login',
            query: { redirect: to.fullPath }
          })
          return
        }
      }

      // 检查权限
      if (to.meta.permissions && to.meta.permissions.length > 0) {
        const hasPermission = userStore.hasAnyPermission(to.meta.permissions)
        if (!hasPermission) {
          ElMessage.error('没有访问权限')
          next({ name: 'forbidden' })
          return
        }
      }

      // 记录页面访问
      userStore.recordPageVisit({
        path: to.path,
        name: to.name,
        title: to.meta.title,
        timestamp: new Date()
      })

      next()
    } catch (error) {
      console.error('路由守卫错误:', error)
      ElMessage.error('身份验证失败，请重新登录')
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
    }
  } else {
    // 如果已登录用户访问登录页面，重定向到仪表板
    if (to.name === 'login' && userStore.isLoggedIn) {
      next({ name: 'dashboard' })
      return
    }

    next()
  }
})

// 路由后置守卫
router.afterEach((to, from) => {
  // 可以在这里添加页面加载完成后的逻辑
  // 比如页面埋点、性能监控等
})

export default router