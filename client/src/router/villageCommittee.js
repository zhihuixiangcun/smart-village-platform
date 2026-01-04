// 村委管理模块路由配置
export default {
  path: '/village-committee',
  name: 'VillageCommittee',
  meta: {
    title: '村委管理',
    requiresAuth: true,
    roles: ['admin', 'villageCommittee']
  },
  component: () => import('@/views/villageCommittee/index.vue'),
  children: [
    {
      path: '',
      name: 'VillageCommitteeHome',
      component: () => import('@/views/villageCommittee/Dashboard.vue'),
      meta: { title: '村委管理首页' }
    },
    {
      path: 'members',
      name: 'CommitteeMembers',
      component: () => import('@/views/villageCommittee/Members.vue'),
      meta: { title: '村委人员管理' }
    },
    {
      path: 'party-members',
      name: 'PartyMembers',
      component: () => import('@/views/villageCommittee/PartyMembers.vue'),
      meta: { title: '党员信息管理' }
    },
    {
      path: 'duty-schedule',
      name: 'DutySchedule',
      component: () => import('@/views/villageCommittee/DutySchedule.vue'),
      meta: { title: '智能值班表' }
    },
    {
      path: 'village-map',
      name: 'VillageMap',
      component: () => import('@/views/villageCommittee/VillageMap.vue'),
      meta: { title: '村情地图' }
    },
    {
      path: 'household-code',
      name: 'HouseholdCode',
      component: () => import('@/views/villageCommittee/HouseholdCode.vue'),
      meta: { title: '一户一码管理' }
    },
    {
      path: 'transfer',
      name: 'PersonnelTransfer',
      component: () => import('@/views/villageCommittee/Transfer.vue'),
      meta: { title: '人员调任管理' }
    },
    {
      path: 'data-collection',
      name: 'DataCollection',
      component: () => import('@/views/villageCommittee/DataCollection.vue'),
      meta: { title: '资料收集管理' }
    },
    {
      path: 'data-submission',
      name: 'DataSubmission',
      component: () => import('@/views/villageCommittee/DataSubmission.vue'),
      meta: { title: '资料上交管理' }
    },
    {
      path: 'product-management',
      name: 'CadreProductManagement',
      component: () => import('@/views/villageCommittee/CadreProductManagement.vue'),
      meta: { title: '产品发布管理' }
    }
  ]
}