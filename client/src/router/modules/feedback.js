/**
 * 用户反馈模块路由配置
 */

export default {
  path: '/feedback',
  name: 'feedback',
  redirect: '/feedback/management',
  meta: {
    requiresAuth: true,
    title: '反馈管理',
    icon: 'ChatDotRound',
    permissions: ['feedback:read']
  },
  children: [
    {
      path: 'management',
      name: 'feedback-management',
      component: () => import('@/views/userFeedback/FeedbackManagement.vue'),
      meta: {
        requiresAuth: true,
        title: '反馈管理',
        permissions: ['feedback:read'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '反馈管理', path: '/feedback' },
          { title: '反馈列表', path: '/feedback/management' }
        ]
      }
    },
    {
      path: 'submit',
      name: 'feedback-submit',
      component: () => import('@/views/userFeedback/FeedbackSubmissionView.vue'),
      meta: {
        requiresAuth: true,
        title: '提交反馈',
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '反馈管理', path: '/feedback' },
          { title: '提交反馈', path: '/feedback/submit' }
        ]
      }
    },
    {
      path: 'history',
      name: 'feedback-history',
      component: () => import('@/views/userFeedback/FeedbackHistoryView.vue'),
      meta: {
        requiresAuth: true,
        title: '反馈历史',
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '反馈管理', path: '/feedback' },
          { title: '我的反馈', path: '/feedback/history' }
        ]
      }
    },
    {
      path: 'statistics',
      name: 'feedback-statistics',
      component: () => import('@/views/userFeedback/FeedbackStatisticsView.vue'),
      meta: {
        requiresAuth: true,
        title: '反馈统计',
        permissions: ['feedback:stats'],
        breadcrumb: [
          { title: '首页', path: '/dashboard' },
          { title: '反馈管理', path: '/feedback' },
          { title: '数据统计', path: '/feedback/statistics' }
        ]
      }
    }
  ]
};