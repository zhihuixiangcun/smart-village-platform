export default {
  path: '/resident',
  name: 'Resident',
  component: () => import('@/layouts/DefaultLayout.vue'),
  meta: { title: '村民管理', icon: 'User', requiresAuth: true },
  redirect: '/resident/family',
  children: [
    {
      path: 'family',
      name: 'FamilyManagement',
      component: () => import('@/views/resident/FamilyManagement.vue'),
      meta: { title: '家庭管理', icon: 'House' }
    },
    {
      path: 'profile',
      name: 'ResidentProfile',
      component: () => import('@/views/resident/ResidentProfileManagement.vue'),
      meta: { title: '村民档案', icon: 'User' }
    },
    {
      path: 'documents',
      name: 'DocumentManagement',
      component: () => import('@/views/resident/DocumentManagement.vue'),
      meta: { title: '证件文档', icon: 'Document' }
    },
    {
      path: 'my-profile',
      name: 'MyProfile',
      component: () => import('@/views/resident/MyProfile.vue'),
      meta: { title: '我的档案', icon: 'UserFilled' }
    },
    {
      path: 'my-documents',
      name: 'MyDocuments',
      component: () => import('@/views/resident/MyDocuments.vue'),
      meta: { title: '我的文档', icon: 'Folder' }
    }
  ]
};