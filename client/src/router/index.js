/**
 * 智慧乡村平台路由配置
 * 模块化、权限控制、无障碍支持
 */

import { createRouter, createWebHistory } from 'vue-router';
import { setupGuards } from './guards';

// 布局组件
const DefaultLayout = () => import('@/layouts/SmartVillageLayout.vue');
const AuthLayout = () => import('@/layouts/AuthLayout.vue');
const MobileLayout = () => import('@/layouts/MobileLayout.vue');
const ErrorLayout = () => import('@/layouts/ErrorLayout.vue');
const PcLayout = () => import('@/layouts/PcLayout.vue');

// 懒加载页面组件
const Home = () => import('@/views/Home.vue');
const MinimalApp = () => import('@/MinimalApp.vue');
const TestRegister = () => import('@/views/test/TestRegister.vue');
const SimpleRegister = () => import('@/views/auth/SimpleRegister.vue');
const Login = () => import('@/views/auth/ModernLogin.vue');
const UnifiedRegister = () => import('@/views/auth/UnifiedRegister.vue');
const ResidentRegister = () => import('@/views/auth/ResidentRegister.vue');
const OfficialApply = () => import('@/views/auth/OfficialApply.vue');
const FaceRecognition = () => import('@/views/auth/FaceRecognition.vue');
const Register = () => import('@/views/auth/Register.vue');
const EnhancedRegister = () => import('@/views/auth/EnhancedRegister.vue');
const OfficialRegister = () => import('@/views/auth/OfficialRegister.vue');
const PurchaserRegister = () => import('@/views/auth/PurchaserRegister.vue');
const MultiStepRegister = () => import('@/views/auth/MultiStepRegister.vue');
const OfficialAudit = () => import('@/views/admin/OfficialAudit.vue');
const PermissionAssign = () => import('@/views/admin/PermissionAssign.vue');
const VillageOfficialRegister = () => import('@/views/auth/VillageOfficialRegister.vue');
const AdminRegister = () => import('@/views/auth/AdminRegister.vue');

// AI服务模块
const AIAssistant = () => import('@/views/ai/AIAssistant.vue');

// PC端页面
const PcDashboard = () => import('@/views/pc/PcDashboard.vue');
const PcResidentManagement = () => import('@/views/pc/PcResidentManagement.vue');
const PcVillageAffairs = () => import('@/views/pc/PcVillageAffairs.vue');
const PcFinance = () => import('@/views/pc/PcFinance.vue');
const PcServices = () => import('@/views/pc/PcServices.vue');
const PcStatistics = () => import('@/views/pc/PcStatistics.vue');
const PcUsers = () => import('@/views/pc/PcUsers.vue');
const PcSettings = () => import('@/views/pc/PcSettings.vue');

// 村务管理
const VillageDashboard = () => import('@/views/villageCommittee/Dashboard.vue');
const VillageAffairs = () => import('@/views/village/VillageAffairs.vue');
const VillageAffairsEnhanced = () => import('@/views/village/VillageAffairsEnhanced.vue');
const CommitteeManagement = () => import('@/views/village/CommitteeManagement.vue');
const PopulationManagement = () => import('@/views/village/PopulationManagement.vue');
const EmergencyManagement = () => import('@/views/village/EmergencyManagement.vue');
const VillageMap = () => import('@/views/villageCommittee/VillageMap.vue');

// 村民管理
const ResidentList = () => import('@/views/village/ResidentManagement.vue');
const ResidentDetail = () => import('@/views/residents/ResidentDetailView.vue');
const ResidentForm = () => import('@/views/residents/ResidentAddView.vue');
const HouseholdQR = () => import('@/views/village/HouseholdQR.vue');

// 财务管理
const FinanceOverview = () => import('@/views/finance/FinanceOverviewView.vue');
const BudgetManagement = () => import('@/views/finance/FinanceBudgetView.vue');
const ExpenseManagement = () => import('@/views/finance/FinanceExpensesView.vue');
const FinancialReports = () => import('@/views/finance/FinanceReportsView.vue');

// 生活服务
const ServiceHall = () => import('@/views/services/ServiceHall.vue');
const Applications = () => import('@/views/services/ApplicationsView.vue');
const VoiceInteraction = () => import('@/views/village/VoiceInteraction.vue');
const MutualAid = () => import('@/views/villageCommittee/Transfer.vue');

// 个人中心
const ProfileView = () => import('@/views/profile/ProfileView.vue');
const SettingsView = () => import('@/views/village/SmartVillageHome.vue');
const AccessibilitySettings = () => import('@/views/village/HomePage.vue');

// 错误页面
const NotFound = () => import('@/views/error/404View.vue');
const Forbidden = () => import('@/views/error/403View.vue');
const ServerError = () => import('@/views/error/500View.vue');

// 🔧 路由元信息定义
export const routeMeta = {
  // 权限级别
  permissions: {
    public: [], // 公开访问
    user: ['user:read'], // 普通用户
    resident: ['resident:read'], // 村民
    village_admin: ['village:admin'], // 村干部
    admin: ['admin:access'], // 系统管理员
  },

  // 布局类型
  layouts: {
    default: DefaultLayout,
    auth: AuthLayout,
    mobile: MobileLayout,
    error: ErrorLayout,
    pc: PcLayout,
  },

  // 无障碍级别
  accessibility: {
    basic: 'basic', // 基础无障碍
    enhanced: 'enhanced', // 增强无障碍
    full: 'full', // 完整无障碍支持
  },

  // 设备支持
  deviceSupport: {
    desktop: true,
    mobile: true,
    tablet: true,
  },
};

// 🛣️ 路由配置
const routes = [
  // 首页路由
  {
    path: '/',
    name: 'home',
    component: MinimalApp,
    meta: {
      title: '智慧乡村综合服务平台',
      requiresAuth: false,
      permissions: routeMeta.permissions.public,
      layout: 'default',
      accessibility: routeMeta.accessibility.full,
      keepAlive: false,
      showInMenu: true,
      menuIcon: 'House',
      menuOrder: 1,
      description: '智慧乡村平台首页，提供一站式乡村服务入口',
    },
  },
  // 测试路由
  {
    path: '/test-register',
    name: 'test-register',
    component: TestRegister,
    meta: {
      title: '注册页面测试',
      description: '测试注册页面功能',
      requiresAuth: false,
      layout: 'default',
      allowGuest: true,
    },
  },
  {
    path: '/simple-register',
    name: 'simple-register',
    component: SimpleRegister,
    meta: {
      title: '村民注册（简化版）',
      description: '简化版村民注册页面',
      requiresAuth: false,
      layout: 'default',
      allowGuest: true,
    },
  },

  // 认证路由模块
  {
    path: '/auth',
    component: routeMeta.layouts.auth,
    meta: {
      layout: 'auth',
      requiresAuth: false,
      permissions: routeMeta.permissions.public,
    },
  },

  // 兼容旧版注册路由 - 重定向到统一注册页面
  {
    path: '/register',
    redirect: '/auth/unified-register',
  },

  // 认证路由模块
  {
    path: '/auth',
    component: routeMeta.layouts.auth,
    meta: {
      layout: 'auth',
      requiresAuth: false,
      permissions: routeMeta.permissions.public,
    },
    children: [
      {
        path: 'login',
        name: 'login',
        component: Login,
        meta: {
          title: '用户登录',
          description: '左侧品牌宣传区，右侧角色登录区，现代化响应式布局',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'register',
        name: 'register',
        component: ResidentRegister,
        meta: {
          title: '村民注册',
          description: '村民账号注册',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'unified-register',
        name: 'unified-register',
        component: UnifiedRegister,
        meta: {
          title: '用户注册',
          description: '统一用户注册，支持多种角色',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'official-apply',
        name: 'official-apply',
        component: OfficialApply,
        meta: {
          title: '村干部申请',
          description: '申请村干部职务',
          accessibility: routeMeta.accessibility.full,
          requiresAuth: true,
        },
      },
      {
        path: 'enhanced-register',
        name: 'enhanced-register',
        component: EnhancedRegister,
        meta: {
          title: '用户注册（增强版）',
          description: '角色选择注册，分步表单，更好的用户体验',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'official-register',
        name: 'official-register',
        component: OfficialRegister,
        meta: {
          title: '乡镇干部注册',
          description: '乡镇干部专用注册页面',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'purchaser-register',
        name: 'purchaser-register',
        component: PurchaserRegister,
        meta: {
          title: '采购商注册',
          description: '采购商入驻注册页面',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'village-official-register',
        name: 'village-official-register',
        component: VillageOfficialRegister,
        meta: {
          title: '村干部注册',
          description: '村干部专用注册页面',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'admin-register',
        name: 'admin-register',
        component: AdminRegister,
        meta: {
          title: '管理员注册',
          description: '系统管理员注册页面',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'multi-step-register',
        name: 'multi-step-register',
        component: MultiStepRegister,
        meta: {
          title: '5步注册',
          description: '5步流程注册，清晰指引',
          accessibility: routeMeta.accessibility.full,
          allowGuest: true,
        },
      },
      {
        path: 'face-login',
        name: 'face-login',
        component: FaceRecognition,
        meta: {
          title: '人脸识别登录',
          description: '使用面部识别快速安全登录',
          accessibility: routeMeta.accessibility.enhanced,
          requiresCamera: true,
        },
      },
      {
        path: 'user-register',
        name: 'register',
        component: Register,
        meta: {
          title: '用户注册',
          description: '新用户注册账号',
          accessibility: routeMeta.accessibility.full,
        },
      },
    ],
  },

  // 村务管理模块
  {
    path: '/village',
    component: routeMeta.layouts.default,
    meta: {
      title: '村务管理',
      requiresAuth: true,
      permissions: ['village:read'],
      accessibility: routeMeta.accessibility.full,
      showInMenu: true,
      menuIcon: 'OfficeBuilding',
      menuOrder: 2,
    },
    children: [
      {
        path: 'dashboard',
        name: 'village-dashboard',
        component: VillageDashboard,
        meta: {
          title: '村务管理面板',
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村务管理', path: '/village' },
            { title: '管理面板' },
          ],
          description: '村务数据统计和快速操作入口',
        },
      },
      {
        path: 'affairs',
        name: 'village-affairs',
        component: VillageAffairs,
        meta: {
          title: '村务公开',
          permissions: ['village:read'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村务管理', path: '/village' },
            { title: '村务公开' },
          ],
          showInMenu: true,
          menuIcon: 'View',
          description: '村务信息、政策公告公开透明',
          accessibility: routeMeta.accessibility.full,
        },
      },
      {
        path: 'committee',
        name: 'committee-management',
        component: CommitteeManagement,
        meta: {
          title: '村委管理',
          permissions: ['village:manage'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村务管理', path: '/village' },
            { title: '村委管理' },
          ],
          description: '村委会成员信息和职责管理',
        },
      },
      {
        path: 'population',
        name: 'population-management',
        component: PopulationManagement,
        meta: {
          title: '人口管理',
          permissions: ['resident:read'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村务管理', path: '/village' },
            { title: '人口管理' },
          ],
          description: '村民信息统计和管理',
        },
      },
      {
        path: 'emergency',
        name: 'emergency-management',
        component: EmergencyManagement,
        meta: {
          title: '应急管理',
          permissions: ['emergency:read'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村务管理', path: '/village' },
            { title: '应急管理' },
          ],
          description: '突发事件应急响应和处理',
          critical: true,
        },
      },
      {
        path: 'map',
        name: 'village-map',
        component: VillageMap,
        meta: {
          title: '村情地图',
          permissions: ['village:read'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村务管理', path: '/village' },
            { title: '村情地图' },
          ],
          description: '村庄地理位置和资源分布',
          requiresGeolocation: true,
        },
      },
    ],
  },

  // 村民管理模块
  {
    path: '/residents',
    component: routeMeta.layouts.default,
    meta: {
      title: '村民管理',
      requiresAuth: true,
      permissions: ['resident:read'],
      accessibility: routeMeta.accessibility.full,
      showInMenu: true,
      menuIcon: 'Users',
      menuOrder: 3,
    },
    children: [
      {
        path: '',
        name: 'resident-list',
        component: ResidentList,
        meta: {
          title: '村民列表',
          breadcrumb: [{ title: '首页', path: '/' }, { title: '村民管理' }],
          description: '查看和管理村民基本信息',
          searchable: true,
          filterable: true,
        },
      },
      {
        path: ':id',
        name: 'resident-detail',
        component: ResidentDetail,
        meta: {
          title: '村民详情',
          permissions: ['resident:read'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村民管理', path: '/residents' },
            { title: '村民详情' },
          ],
          description: '查看村民详细信息和档案',
          dynamic: true,
        },
      },
      {
        path: 'add',
        name: 'resident-add',
        component: ResidentForm,
        meta: {
          title: '添加村民',
          permissions: ['resident:write'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村民管理', path: '/residents' },
            { title: '添加村民' },
          ],
          description: '录入新村民信息',
        },
      },
      {
        path: ':id/edit',
        name: 'resident-edit',
        component: ResidentForm,
        meta: {
          title: '编辑村民',
          permissions: ['resident:write'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村民管理', path: '/residents' },
            { title: '编辑村民' },
          ],
          description: '修改村民信息',
          dynamic: true,
        },
      },
      {
        path: 'household-qr',
        name: 'household-qr',
        component: HouseholdQR,
        meta: {
          title: '一户一码',
          permissions: ['household:read'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '村民管理', path: '/residents' },
            { title: '一户一码' },
          ],
          description: '生成和管理户二维码',
          accessibility: routeMeta.accessibility.full,
        },
      },
    ],
  },

  // 财务管理模块
  {
    path: '/finance',
    component: routeMeta.layouts.default,
    meta: {
      title: '财务管理',
      requiresAuth: true,
      permissions: ['finance:read'],
      accessibility: routeMeta.accessibility.enhanced,
      showInMenu: true,
      menuIcon: 'Money',
      menuOrder: 4,
    },
    children: [
      {
        path: 'overview',
        name: 'finance-overview',
        component: FinanceOverview,
        meta: {
          title: '财务概览',
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '财务概览' },
          ],
          description: '村集体财务状况总览',
        },
      },
      {
        path: 'budget',
        name: 'budget-management',
        component: BudgetManagement,
        meta: {
          title: '预算管理',
          permissions: ['finance:budget'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '预算管理' },
          ],
          description: '年度预算编制和执行监控',
        },
      },
      {
        path: 'expenses',
        name: 'expense-management',
        component: ExpenseManagement,
        meta: {
          title: '支出管理',
          permissions: ['finance:write'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '支出管理' },
          ],
          description: '村集体支出记录和审批',
        },
      },
      {
        path: 'reports',
        name: 'financial-reports',
        component: FinancialReports,
        meta: {
          title: '财务报表',
          permissions: ['finance:reports'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '财务管理', path: '/finance' },
            { title: '财务报表' },
          ],
          description: '财务统计报表和分析',
          exportable: true,
        },
      },
    ],
  },

  // 生活服务模块
  {
    path: '/services',
    component: routeMeta.layouts.default,
    meta: {
      title: '生活服务',
      requiresAuth: true,
      permissions: ['service:read'],
      accessibility: routeMeta.accessibility.full,
      showInMenu: true,
      menuIcon: 'Service',
      menuOrder: 5,
    },
    children: [
      {
        path: 'hall',
        name: 'service-hall',
        component: ServiceHall,
        meta: {
          title: '办事大厅',
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '生活服务', path: '/services' },
            { title: '办事大厅' },
          ],
          description: '各类证件、证明在线办理',
          accessibility: routeMeta.accessibility.full,
          voiceSupported: true,
        },
      },
      {
        path: 'applications',
        name: 'service-applications',
        component: Applications,
        meta: {
          title: '我的申请',
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '生活服务', path: '/services' },
            { title: '我的申请' },
          ],
          description: '查看办事申请进度和结果',
        },
      },
      {
        path: 'voice',
        name: 'voice-interaction',
        component: VoiceInteraction,
        meta: {
          title: '语音助手',
          permissions: ['speech:recognize'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '生活服务', path: '/services' },
            { title: '语音助手' },
          ],
          description: '方言语音智能交互服务',
          accessibility: routeMeta.accessibility.full,
          requiresMicrophone: true,
        },
      },
      {
        path: 'mutual-aid',
        name: 'mutual-aid',
        component: MutualAid,
        meta: {
          title: '邻里互助',
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '生活服务', path: '/services' },
            { title: '邻里互助' },
          ],
          description: '村民互助信息和资源共享',
          accessibility: routeMeta.accessibility.full,
        },
      },
    ],
  },

  // 个人中心模块
  {
    path: '/profile',
    component: routeMeta.layouts.default,
    meta: {
      title: '个人中心',
      requiresAuth: true,
      permissions: routeMeta.permissions.user,
      accessibility: routeMeta.accessibility.full,
      showInMenu: false,
    },
    children: [
      {
        path: '',
        name: 'profile',
        component: ProfileView,
        meta: {
          title: '个人信息',
          breadcrumb: [{ title: '首页', path: '/' }, { title: '个人中心' }],
          description: '个人信息查看和编辑',
        },
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsView,
        meta: {
          title: '系统设置',
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '个人中心', path: '/profile' },
            { title: '系统设置' },
          ],
          description: '应用偏好设置和配置',
        },
      },
      {
        path: 'accessibility',
        name: 'accessibility-settings',
        component: AccessibilitySettings,
        meta: {
          title: '无障碍设置',
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '个人中心', path: '/profile' },
            { title: '无障碍设置' },
          ],
          description: '无障碍功能配置和优化',
          accessibility: routeMeta.accessibility.full,
        },
      },
    ],
  },

  // 错误页面
  {
    path: '/error',
    component: routeMeta.layouts.error,
    children: [
      {
        path: '404',
        name: 'not-found',
        component: NotFound,
        meta: {
          title: '页面未找到',
          requiresAuth: false,
          layout: 'error',
        },
      },
      {
        path: '403',
        name: 'forbidden',
        component: Forbidden,
        meta: {
          title: '访问禁止',
          requiresAuth: false,
          layout: 'error',
        },
      },
      {
        path: '500',
        name: 'server-error',
        component: ServerError,
        meta: {
          title: '服务器错误',
          requiresAuth: false,
          layout: 'error',
        },
      },
    ],
  },

  // PC端管理模块
  {
    path: '/pc',
    component: routeMeta.layouts.pc,
    meta: {
      title: 'PC端管理',
      requiresAuth: true,
      permissions: ['village:read'],
      accessibility: routeMeta.accessibility.enhanced,
      deviceSupport: {
        desktop: true,
        mobile: false,
        tablet: false,
      },
    },
    children: [
      {
        path: 'dashboard',
        name: 'pc-dashboard',
        component: PcDashboard,
        meta: {
          title: '仪表板',
          permissions: ['dashboard:view'],
          breadcrumb: [
            { title: '首页', path: '/pc/dashboard' },
            { title: '仪表板' },
          ],
          description: 'PC端数据概览和快速操作',
        },
      },
      {
        path: 'residents',
        name: 'pc-residents',
        component: PcResidentManagement,
        meta: {
          title: '村民管理',
          permissions: ['resident:read'],
          breadcrumb: [
            { title: '首页', path: '/pc/dashboard' },
            { title: '村民管理' },
          ],
          description: '村民信息管理和档案维护',
        },
      },
      {
        path: 'affairs',
        name: 'pc-affairs',
        component: PcVillageAffairs,
        meta: {
          title: '村务管理',
          permissions: ['village:read'],
          breadcrumb: [
            { title: '首页', path: '/pc/dashboard' },
            { title: '村务管理' },
          ],
          description: '村务公开、公告发布、任务管理',
        },
      },
      {
        path: 'finance',
        name: 'pc-finance',
        component: PcFinance,
        meta: {
          title: '财务管理',
          permissions: ['finance:read'],
          breadcrumb: [
            { title: '首页', path: '/pc/dashboard' },
            { title: '财务管理' },
          ],
          description: '村集体资金管理、收支明细',
        },
      },
      {
        path: 'services',
        name: 'pc-services',
        component: PcServices,
        meta: {
          title: '生活服务',
          permissions: ['service:read'],
          breadcrumb: [
            { title: '首页', path: '/pc/dashboard' },
            { title: '生活服务' },
          ],
          description: '便民服务、办事指南、申请记录',
        },
      },
      {
        path: 'statistics',
        name: 'pc-statistics',
        component: PcStatistics,
        meta: {
          title: '数据统计',
          permissions: ['statistics:read'],
          breadcrumb: [
            { title: '首页', path: '/pc/dashboard' },
            { title: '数据统计' },
          ],
          description: '人口结构分析、家庭统计、数据报表',
        },
      },
      {
        path: 'users',
        name: 'pc-users',
        component: PcUsers,
        meta: {
          title: '用户管理',
          permissions: ['user:read'],
          breadcrumb: [
            { title: '首页', path: '/pc/dashboard' },
            { title: '用户管理' },
          ],
          description: '系统用户管理、角色分配、权限控制',
        },
      },
      {
        path: 'settings',
        name: 'pc-settings',
        component: PcSettings,
        meta: {
          title: '系统设置',
          permissions: ['settings:manage'],
          breadcrumb: [
            { title: '首页', path: '/pc/dashboard' },
            { title: '系统设置' },
          ],
          description: '基本设置、通知设置、安全设置、数据管理',
        },
      },
    ],
  },

  // AI服务模块
  {
    path: '/ai',
    component: routeMeta.layouts.default,
    meta: {
      title: 'AI智能助手',
      requiresAuth: true,
      permissions: ['ai:chat'],
      accessibility: routeMeta.accessibility.full,
      showInMenu: true,
      menuIcon: 'ChatDotRound',
      menuOrder: 6,
    },
    children: [
      {
        path: 'assistant',
        name: 'ai-assistant',
        component: AIAssistant,
        meta: {
          title: 'AI智能助手',
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: 'AI智能助手', path: '/ai' },
            { title: '智能助手' },
          ],
          description: 'AI智能对话、专业咨询、生活助手',
          accessibility: routeMeta.accessibility.full,
          requiresMicrophone: true,
        },
      },
    ],
  },

  // ==================== 社区互动模块 ====================
  // 注意：社区模块页面尚未创建，此模块暂时注释
  // 如需启用，请先创建 @/pages/community/ 目录下的相关组件
  /*
  {
    path: '/community',
    component: routeMeta.layouts.default,
    meta: {
      title: '社区互动',
      requiresAuth: true,
      permissions: routeMeta.permissions.user,
      accessibility: routeMeta.accessibility.full,
      showInMenu: true,
      menuIcon: 'ChatDotRound',
      menuOrder: 7,
    },
    children: [
      {
        path: '',
        name: 'community',
        component: () => import('@/pages/community/index.vue'),
        meta: {
          title: '社区互动',
          breadcrumb: [{ title: '首页', path: '/' }, { title: '社区互动' }],
          description: '社区互动聚合首页',
        },
      },
      // ... 其他社区路由
    ],
  },
  */

  // 管理员模块
  {
    path: '/admin',
    component: routeMeta.layouts.default,
    meta: {
      title: '系统管理',
      requiresAuth: true,
      permissions: ['admin:access'],
      accessibility: routeMeta.accessibility.enhanced,
    },
    children: [
      {
        path: 'official-audit',
        name: 'official-audit',
        component: OfficialAudit,
        meta: {
          title: '村干部审核',
          permissions: ['admin:access'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '系统管理', path: '/admin' },
            { title: '村干部审核' },
          ],
        },
      },
      {
        path: 'permission-assign',
        name: 'permission-assign',
        component: PermissionAssign,
        meta: {
          title: '权限分配',
          permissions: ['admin:access'],
          breadcrumb: [
            { title: '首页', path: '/' },
            { title: '系统管理', path: '/admin' },
            { title: '权限分配' },
          ],
        },
      },
    ],
  },

  // ==================== 移动端角色专属首页模块 ====================
  {
    path: '/mobile',
    component: routeMeta.layouts.mobile,
    meta: {
      title: '移动端首页',
      requiresAuth: true,
      layout: 'mobile',
      accessibility: routeMeta.accessibility.full,
    },
    children: [
      // 村民首页
      {
        path: '',
        name: 'mobile-home',
        redirect: '/mobile/resident',
      },
      {
        path: 'resident',
        name: 'resident-home',
        component: () => import('@/views/mobile/resident/Home.vue'),
        meta: {
          title: '村民首页',
          accessibility: routeMeta.accessibility.full,
        },
        children: [
          {
            path: 'services',
            name: 'resident-services',
            component: () => import('@/views/mobile/resident/Services.vue'),
            meta: { title: '便民服务' },
          },
          {
            path: 'life',
            name: 'resident-life',
            component: () => import('@/views/mobile/resident/Life.vue'),
            meta: { title: '生活服务' },
          },
          {
            path: 'messages',
            name: 'resident-messages',
            component: () => import('@/views/mobile/resident/Messages.vue'),
            meta: { title: '消息中心' },
          },
        ],
      },
      // 村干部首页
      {
        path: 'village-cadre',
        name: 'village-cadre-home',
        component: () => import('@/views/mobile/villageCadre/Home.vue'),
        meta: {
          title: '村干部首页',
          accessibility: routeMeta.accessibility.full,
        },
        children: [
          {
            path: 'affairs',
            name: 'village-cadre-affairs',
            component: () => import('@/views/mobile/villageCadre/Affairs.vue'),
            meta: { title: '村务管理' },
          },
          {
            path: 'messages',
            name: 'village-cadre-messages',
            component: () => import('@/views/mobile/villageCadre/Messages.vue'),
            meta: { title: '消息中心' },
          },
        ],
      },
      // 采购商首页
      {
        path: 'purchaser',
        name: 'purchaser-home',
        component: () => import('@/views/mobile/purchaser/Home.vue'),
        meta: {
          title: '采购商首页',
          accessibility: routeMeta.accessibility.full,
        },
        children: [
          {
            path: 'market',
            name: 'purchaser-market',
            component: () => import('@/views/mobile/purchaser/Market.vue'),
            meta: { title: '农产品市场' },
          },
          {
            path: 'orders',
            name: 'purchaser-orders',
            component: () => import('@/views/mobile/purchaser/Orders.vue'),
            meta: { title: '订单管理' },
          },
        ],
      },
      // 乡镇干部首页
      {
        path: 'township',
        name: 'township-home',
        component: () => import('@/views/mobile/township/Home.vue'),
        meta: {
          title: '乡镇干部首页',
          accessibility: routeMeta.accessibility.full,
        },
        children: [
          {
            path: 'villages',
            name: 'township-villages',
            component: () => import('@/views/mobile/township/Villages.vue'),
            meta: { title: '村庄管理' },
          },
          {
            path: 'statistics',
            name: 'township-statistics',
            component: () => import('@/views/mobile/township/Statistics.vue'),
            meta: { title: '统计分析' },
          },
        ],
      },
      // 管理员首页
      {
        path: 'admin',
        name: 'mobile-admin-home',
        component: () => import('@/views/mobile/admin/Home.vue'),
        meta: {
          title: '管理员首页',
          accessibility: routeMeta.accessibility.full,
        },
        children: [
          {
            path: 'affairs',
            name: 'mobile-admin-affairs',
            component: () => import('@/views/mobile/admin/Affairs.vue'),
            meta: { title: '村务管理' },
          },
          {
            path: 'messages',
            name: 'mobile-admin-messages',
            component: () => import('@/views/mobile/admin/Messages.vue'),
            meta: { title: '消息中心' },
          },
        ],
      },
    ],
  },

  // 兼容旧版角色首页路由（重定向到新路由）
  {
    path: '/home/villager',
    redirect: '/mobile/resident',
  },
  {
    path: '/home/cadre',
    redirect: '/mobile/village-cadre',
  },
  {
    path: '/home/purchaser',
    redirect: '/mobile/purchaser',
  },
  {
    path: '/home/township',
    redirect: '/mobile/township',
  },
  {
    path: '/home/admin',
    redirect: '/mobile/admin',
  },

  // 角色专用首页模块（保留兼容性）
  {
    path: '/home',
    component: routeMeta.layouts.mobile,
    meta: {
      title: '角色首页',
      requiresAuth: true,
      layout: 'mobile',
    },
    children: [
      {
        path: 'villager',
        name: 'villager-home',
        component: () => import('@/views/mobile/MobileHome.vue'),
        meta: {
          title: '村民首页',
          requiresAuth: true,
          accessibility: routeMeta.accessibility.full,
        },
      },
      {
        path: 'cadre',
        name: 'cadre-home',
        component: () => import('@/views/mobile/MobileHome.vue'),
        meta: {
          title: '村干部首页',
          requiresAuth: true,
          accessibility: routeMeta.accessibility.full,
        },
      },
      {
        path: 'official',
        name: 'official-home',
        component: () => import('@/views/mobile/MobileHome.vue'),
        meta: {
          title: '村官首页',
          requiresAuth: true,
          accessibility: routeMeta.accessibility.full,
        },
      },
      {
        path: 'admin',
        name: 'admin-home',
        component: () => import('@/views/mobile/MobileHome.vue'),
        meta: {
          title: '管理员首页',
          requiresAuth: true,
          accessibility: routeMeta.accessibility.full,
        },
      },
    ],
  },

  // 重定向路由
  {
    path: '/dashboard',
    redirect: to => {
      // 根据用户角色重定向到对应的首页
      const userRole = localStorage.getItem('userRole');
      const roleRedirects = {
        resident: '/village/affairs',
        village_admin: '/village/dashboard',
        admin: '/village/dashboard',
      };
      return roleRedirects[userRole] || '/village/affairs';
    },
    meta: {
      title: '工作台',
    },
  },

  // 捕获所有未匹配的路由
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404',
  },
];

// 🏗️ 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 保持滚动位置
    if (savedPosition) {
      return savedPosition;
    }

    // 锚点跳转
    if (to.hash) {
      return { el: to.hash };
    }

    // 默认滚动到顶部
    return { top: 0 };
  },
});

// 🔧 设置路由守卫
setupGuards(router);

// 📊 路由信息统计
const getRouteStats = () => {
  const stats = {
    totalRoutes: routes.length,
    authRequired: routes.filter(r => r.meta?.requiresAuth).length,
    publicRoutes: routes.filter(r => !r.meta?.requiresAuth).length,
    accessibleRoutes: routes.filter(r => r.meta?.accessibility === routeMeta.accessibility.full)
      .length,
  };

  return stats;
};

// 🔍 路由辅助函数
export const routeHelpers = {
  // 根据权限过滤菜单项
  filterRoutesByPermission: (routes, userPermissions) => {
    return routes.filter(route => {
      if (!route.meta?.permissions || route.meta.permissions.length === 0) {
        return true;
      }
      return route.meta.permissions.some(permission => userPermissions.includes(permission));
    });
  },

  // 根据设备支持过滤路由
  filterRoutesByDevice: (routes, deviceType) => {
    return routes.filter(route => {
      const deviceSupport = route.meta?.deviceSupport;
      return !deviceSupport || deviceSupport[deviceType] !== false;
    });
  },

  // 获取面包屑导航
  getBreadcrumb: route => {
    return route.meta?.breadcrumb || [];
  },

  // 检查路由是否需要特殊权限
  requiresSpecialPermission: route => {
    return (
      route.meta?.requiresCamera ||
      route.meta?.requiresMicrophone ||
      route.meta?.requiresGeolocation
    );
  },

  // 获取路由的描述信息
  getRouteDescription: route => {
    return route.meta?.description || '';
  },
};

// 🌐 导出路由实例
export default router;
export { getRouteStats };
