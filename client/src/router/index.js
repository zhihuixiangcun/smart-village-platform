import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ElMessage } from 'element-plus'
import villageCommitteeRoutes from './villageCommittee.js'

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
    {
      path: '/face-login',
      name: 'face-login',
      component: () => import('@/views/auth/FaceLogin.vue'),
      meta: {
        requiresAuth: false,
        title: '人脸识别登录',
        layout: 'auth'
      }
    },
    {
      path: '/unified-login',
      name: 'unified-login',
      component: () => import('@/views/auth/UnifiedLogin.vue'),
      meta: {
        requiresAuth: false,
        title: '统一登录',
        layout: 'auth'
      }
    },
    {
      path: '/auth/registration-wizard',
      name: 'registration-wizard',
      component: () => import('@/views/auth/RegistrationWizard.vue'),
      meta: {
        requiresAuth: false,
        title: '采购商注册',
        layout: 'auth'
      }
    },
    {
      path: '/auth/common-registration',
      name: 'common-registration',
      component: () => import('@/views/auth/CommonRegistrationWizard.vue'),
      meta: {
        requiresAuth: false,
        title: '用户注册',
        layout: 'auth'
      }
    },
    {
      path: '/auth/registration-review',
      name: 'registration-review',
      component: () => import('@/views/admin/RegistrationReview.vue'),
      meta: {
        requiresAuth: true,
        title: '注册申请审批',
        permissions: ['admin:manage'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '注册申请审批', path: '/auth/registration-review' }
        ]
      }
    },

    // 采购商仪表盘
    {
      path: '/purchaser/dashboard',
      name: 'purchaser-dashboard',
      component: () => import('@/views/purchasers/PurchaserDashboard.vue'),
      meta: {
        requiresAuth: true,
        title: '采购商工作台',
        icon: 'ShoppingCart',
        permissions: ['purchaser:access'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '采购商工作台', path: '/purchaser/dashboard' }
        ]
      }
    },
    {
      path: '/purchaser/recommendations',
      name: 'purchaser-recommendations',
      component: () => import('@/views/purchasers/PurchaserRecommendations.vue'),
      meta: {
        requiresAuth: true,
        title: '智能推荐',
        permissions: ['purchaser:access'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '智能推荐', path: '/purchaser/recommendations' }
        ]
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

    // 村委管理模块（导入独立路由模块）
    villageCommitteeRoutes,

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

    // 村务公开（村民视角）
    {
      path: '/village-affairs',
      name: 'village-affairs',
      component: () => import('@/views/village/VillageAffairsView.vue'),
      meta: {
        requiresAuth: true,
        title: '村务公开',
        icon: 'View',
        permissions: ['village:read'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '村务公开', path: '/village-affairs' }
        ]
      }
    },

    // 生活服务模块
    {
      path: '/services',
      name: 'services',
      redirect: '/services/hall',
      meta: {
        requiresAuth: true,
        title: '生活服务',
        icon: 'Service',
        permissions: ['service:read']
      },
      children: [
        {
          path: 'hall',
          name: 'services-hall',
          component: () => import('@/views/services/ServiceHall.vue'),
          meta: {
            requiresAuth: true,
            title: '办事大厅',
            permissions: ['service:application'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '生活服务', path: '/services' },
              { title: '办事大厅', path: '/services/hall' }
            ]
          }
        },
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
        },
        {
          path: 'voice-interaction',
          name: 'services-voice-interaction',
          component: () => import('@/views/village/VoiceInteraction.vue'),
          meta: {
            requiresAuth: true,
            title: '方言语音交互',
            permissions: ['speech:recognize'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '生活服务', path: '/services' },
              { title: '方言语音交互', path: '/services/voice-interaction' }
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

    // 新增组件模块 - 基于我们开发的API组件
    {
      path: '/components',
      name: 'components',
      redirect: '/components/users',
      meta: {
        requiresAuth: true,
        title: '组件管理',
        icon: 'Grid',
        permissions: ['component:read']
      },
      children: [
        {
          path: 'users',
          name: 'component-users',
          component: () => import('@/components/user/UserManagement.vue'),
          meta: {
            requiresAuth: true,
            title: '用户管理',
            permissions: ['user:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '组件管理', path: '/components' },
              { title: '用户管理', path: '/components/users' }
            ]
          }
        },
        {
          path: 'announcements',
          name: 'component-announcements',
          component: () => import('@/components/village/VillageAnnouncement.vue'),
          meta: {
            requiresAuth: true,
            title: '村务公告',
            permissions: ['village:announcement'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '组件管理', path: '/components' },
              { title: '村务公告', path: '/components/announcements' }
            ]
          }
        },
        {
          path: 'transactions',
          name: 'component-transactions',
          component: () => import('@/components/finance/TransactionList.vue'),
          meta: {
            requiresAuth: true,
            title: '财务管理',
            permissions: ['finance:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '组件管理', path: '/components' },
              { title: '财务管理', path: '/components/transactions' }
            ]
          }
        },
        {
          path: 'emergency',
          name: 'component-emergency',
          component: () => import('@/components/emergency/EmergencyManagement.vue'),
          meta: {
            requiresAuth: true,
            title: '应急管理',
            permissions: ['emergency:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '组件管理', path: '/components' },
              { title: '应急管理', path: '/components/emergency' }
            ]
          }
        },
        {
          path: 'analytics',
          name: 'component-analytics',
          component: () => import('@/components/analytics/Dashboard.vue'),
          meta: {
            requiresAuth: true,
            title: '数据分析',
            permissions: ['analytics:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '组件管理', path: '/components' },
              { title: '数据分析', path: '/components/analytics' }
            ]
          }
        },
        {
          path: 'products',
          name: 'component-products',
          component: () => import('@/components/ecommerce/ProductManagement.vue'),
          meta: {
            requiresAuth: true,
            title: '商品管理',
            permissions: ['product:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '组件管理', path: '/components' },
              { title: '商品管理', path: '/components/products' }
            ]
          }
        }
      ]
    },

    // 项目管理模块
    {
      path: '/projects',
      name: 'projects',
      redirect: '/projects/list',
      meta: {
        requiresAuth: true,
        title: '项目管理',
        icon: 'OfficeBuilding',
        permissions: ['project:read']
      },
      children: [
        {
          path: 'list',
          name: 'projects-list',
          component: () => import('@/views/projects/ProjectsListView.vue'),
          meta: {
            requiresAuth: true,
            title: '项目列表',
            permissions: ['project:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '项目管理', path: '/projects' },
              { title: '项目列表', path: '/projects/list' }
            ]
          }
        },
        {
          path: ':id',
          name: 'project-detail',
          component: () => import('@/views/projects/ProjectDetailView.vue'),
          meta: {
            requiresAuth: true,
            title: '项目详情',
            permissions: ['project:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '项目管理', path: '/projects' },
              { title: '项目列表', path: '/projects/list' },
              { title: '项目详情', path: '' }
            ]
          }
        },
        {
          path: 'add',
          name: 'project-add',
          component: () => import('@/views/projects/ProjectAddView.vue'),
          meta: {
            requiresAuth: true,
            title: '新建项目',
            permissions: ['project:write'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '项目管理', path: '/projects' },
              { title: '新建项目', path: '/projects/add' }
            ]
          }
        }
      ]
    },

    // 农产品管理模块
    {
      path: '/agriculture',
      name: 'agriculture',
      redirect: '/agriculture/products',
      meta: {
        requiresAuth: true,
        title: '农产品管理',
        icon: 'Apple',
        permissions: ['agriculture:read']
      },
      children: [
        {
          path: 'products',
          name: 'agriculture-products',
          component: () => import('@/views/agriculture/ProductsListView.vue'),
          meta: {
            requiresAuth: true,
            title: '农产品列表',
            permissions: ['agriculture:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '农产品管理', path: '/agriculture' },
              { title: '农产品列表', path: '/agriculture/products' }
            ]
          }
        },
        {
          path: 'orders',
          name: 'agriculture-orders',
          component: () => import('@/views/agriculture/OrdersListView.vue'),
          meta: {
            requiresAuth: true,
            title: '订单管理',
            permissions: ['agriculture:order'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '农产品管理', path: '/agriculture' },
              { title: '订单管理', path: '/agriculture/orders' }
            ]
          }
        },
        {
          path: 'farmers',
          name: 'agriculture-farmers',
          component: () => import('@/views/agriculture/FarmersListView.vue'),
          meta: {
            requiresAuth: true,
            title: '农户管理',
            permissions: ['agriculture:farmer'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '农产品管理', path: '/agriculture' },
              { title: '农户管理', path: '/agriculture/farmers' }
            ]
          }
        }
      ]
    },

    // 应急管理模块
    {
      path: '/emergency',
      name: 'emergency',
      redirect: '/emergency/events',
      meta: {
        requiresAuth: true,
        title: '应急管理',
        icon: 'WarningFilled',
        permissions: ['emergency:read']
      },
      children: [
        {
          path: 'events',
          name: 'emergency-events',
          component: () => import('@/views/emergency/EventsListView.vue'),
          meta: {
            requiresAuth: true,
            title: '应急事件',
            permissions: ['emergency:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '应急管理', path: '/emergency' },
              { title: '应急事件', path: '/emergency/events' }
            ]
          }
        },
        {
          path: 'report',
          name: 'emergency-report',
          component: () => import('@/views/emergency/ReportView.vue'),
          meta: {
            requiresAuth: true,
            title: '事件上报',
            permissions: ['emergency:report'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '应急管理', path: '/emergency' },
              { title: '事件上报', path: '/emergency/report' }
            ]
          }
        },
        {
          path: 'contacts',
          name: 'emergency-contacts',
          component: () => import('@/views/emergency/ContactsView.vue'),
          meta: {
            requiresAuth: true,
            title: '应急联系人',
            permissions: ['emergency:contact'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '应急管理', path: '/emergency' },
              { title: '应急联系人', path: '/emergency/contacts' }
            ]
          }
        }
      ]
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
          path: 'permissions',
          name: 'system-permissions',
          component: () => import('@/views/system/EnhancedPermissionManagement.vue'),
          meta: {
            requiresAuth: true,
            title: '权限管理',
            permissions: ['system:permission'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '系统管理', path: '/system' },
              { title: '权限管理', path: '/system/permissions' }
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
        },
        {
          path: 'notifications',
          name: 'system-notifications',
          component: () => import('@/views/system/NotificationsView.vue'),
          meta: {
            requiresAuth: true,
            title: '通知管理',
            permissions: ['system:notification'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '系统管理', path: '/system' },
              { title: '通知管理', path: '/system/notifications' }
            ]
          }
        }
      ]
    },

    // 值班管理模块
    {
      path: '/duty',
      name: 'duty',
      redirect: '/duty/overview',
      meta: {
        requiresAuth: true,
        title: '值班管理',
        icon: 'Timer',
        permissions: ['duty:read']
      },
      children: [
        {
          path: 'overview',
          name: 'duty-overview',
          component: () => import('@/views/duty/DutyManagement.vue'),
          meta: {
            requiresAuth: true,
            title: '值班管理',
            permissions: ['duty:read'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '值班管理', path: '/duty' }
            ]
          }
        },
        {
          path: 'schedule',
          name: 'duty-schedule',
          component: () => import('@/views/villageCommittee/DutySchedule.vue'),
          meta: {
            requiresAuth: true,
            title: '值班安排',
            permissions: ['duty:schedule'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '值班管理', path: '/duty' },
              { title: '值班安排', path: '/duty/schedule' }
            ]
          }
        },
        {
          path: 'emergency',
          name: 'duty-emergency',
          component: () => import('@/components/emergency/EmergencyCall.vue'),
          meta: {
            requiresAuth: true,
            title: '紧急呼叫',
            permissions: ['duty:emergency'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '值班管理', path: '/duty' },
              { title: '紧急呼叫', path: '/duty/emergency' }
            ]
          }
        },
        {
          path: 'personnel',
          name: 'duty-personnel',
          component: () => import('@/views/villageCommittee/Members.vue'),
          meta: {
            requiresAuth: true,
            title: '人员管理',
            permissions: ['duty:personnel'],
            breadcrumb: [
              { title: '首页', path: '/dashboard' },
              { title: '值班管理', path: '/duty' },
              { title: '人员管理', path: '/duty/personnel' }
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

    // 证件包
    {
      path: '/documents',
      name: 'documents',
      component: () => import('@/views/DocumentWallet.vue'),
      meta: {
        requiresAuth: true,
        title: '我的证件包',
        icon: 'Document',
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '我的证件包', path: '/documents' }
        ]
      }
    },

    // 聊天
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/chat/ChatView.vue'),
      meta: {
        requiresAuth: true,
        title: '聊天',
        icon: 'ChatDotRound',
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '聊天', path: '/chat' }
        ]
      }
    },

    // 村干部任务管理（四象限任务管理）
    {
      path: '/cadre-tasks',
      name: 'cadre-tasks',
      component: () => import('@/views/tasks/CadreTaskManagement.vue'),
      meta: {
        requiresAuth: true,
        title: '任务管理',
        icon: 'List',
        permissions: ['task:read'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '任务管理', path: '/cadre-tasks' }
        ]
      }
    },

    // 发布管理（统一发布入口）
    {
      path: '/publish-management',
      name: 'publish-management',
      component: () => import('@/views/publish/PublishManagement.vue'),
      meta: {
        requiresAuth: true,
        title: '发布管理',
        icon: 'Promotion',
        permissions: ['publish:manage'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '发布管理', path: '/publish-management' }
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
        },
        {
          path: 'mobile-adaptation',
          name: 'test-mobile-adaptation',
          component: () => import('@/views/demo/MobileAdaptationDemo.vue'),
          meta: {
            requiresAuth: false,
            title: '移动端适配演示',
            breadcrumb: [
              { title: '系统测试', path: '/test' },
              { title: '移动端适配演示', path: '/test/mobile-adaptation' }
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
      // 【修复】直接从 localStorage 读取状态
      const token = localStorage.getItem('token')
      const userInfoStr = localStorage.getItem('userInfo')

      // 如果 store 中没有状态，但从 localStorage 中有，恢复 store 状态
      if (token && userInfoStr && !userStore.token) {
        console.log('🔄 恢复 store 状态...')
        userStore.initUserState()
      }

      // 检查用户是否已登录 - 同时检查 store 和 localStorage
      const hasValidAuth = userStore.isLoggedIn || (token && userInfoStr)

      if (!hasValidAuth) {
        console.log('路由守卫: 用户未登录，重定向到登录页')
        next({
          name: 'unified-login',
          query: { redirect: to.fullPath }
        })
        return
      }

      // 检查是否有权限访问（如果需要）
      if (to.meta.permissions && to.meta.permissions.length > 0) {
        const hasPermission = userStore.hasAnyPermission(to.meta.permissions)
        if (!hasPermission) {
          console.log('路由守卫: 用户权限不足')
          ElMessage.error('您没有权限访问此页面')
          next({ name: 'dashboard' })
          return
        }
      }

      console.log('路由守卫: 允许访问', to.path)
      next()
      return
    } catch (error) {
      console.error('路由守卫错误:', error)
      ElMessage.error('身份验证失败，请重新登录')
      next({
        name: 'unified-login',
        query: { redirect: to.fullPath }
      })
    }
  } else {
    // 如果已登录用户访问登录页面，根据角色重定向到对应主页
    if ((to.name === 'login' || to.name === 'unified-login') && userStore.isLoggedIn) {
      console.log('路由守卫: 用户已登录，根据角色重定向到对应主页')
      // 根据用户角色跳转到不同的主页
      const userRole = userStore.userInfo?.role || userStore.userRole
      const roleRedirectMap = {
        'resident': '/village-affairs',
        'village_admin': '/dashboard',  // 数据库中的村干部角色
        'village_official': '/dashboard',  // 数据库中的乡镇官员角色
        'admin': '/dashboard',
        'purchaser': '/purchaser/dashboard'
      }
      const redirectPath = roleRedirectMap[userRole] || '/dashboard'
      next(redirectPath)
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