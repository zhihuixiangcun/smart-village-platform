/**
 * 移动端路由自动更新脚本
 *
 * 使用方法：
 * 1. 备份 src/router/index.js
 * 2. 运行此脚本: node scripts/updateMobileRoutes.js
 * 3. 检查更新结果
 */

const fs = require('fs');
const path = require('path');

const routerFilePath = path.join(__dirname, '../src/router/index.js');

// 新增的路由配置
const newRoutes = {
  // 村民路由
  resident: [
    `          {
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
          },`
  ],

  // 村干部路由
  villageCadre: [
    `          {
            path: 'residents',
            name: 'village-cadre-residents',
            component: () => import('@/views/mobile/villageCadre/Residents.vue'),
            meta: { title: '村民管理' },
          },`
  ],

  // 采购商路由
  purchaser: [
    `          {
            path: 'suppliers',
            name: 'purchaser-suppliers',
            component: () => import('@/views/mobile/purchaser/Suppliers.vue'),
            meta: { title: '供应商管理' },
          },`
  ],

  // 乡镇干部路由
  township: [
    `          {
            path: 'audit',
            name: 'township-audit',
            component: () => import('@/views/mobile/township/Audit.vue'),
            meta: { title: '审核管理' },
          },`
  ],

  // 管理员路由
  admin: [
    `          {
            path: 'users',
            name: 'mobile-admin-users',
            component: () => import('@/views/mobile/admin/Users.vue'),
            meta: { title: '用户管理' },
          },`
  ]
};

// 更新标记
const updateMarkers = {
  resident: '// 村民路由 children - 在 messages 后面添加',
  villageCadre: '// 村干部路由 children - 在 messages 后面添加',
  purchaser: '// 采购商路由 children - 在 orders 后面添加',
  township: '// 乡镇干部路由 children - 在 statistics 后面添加',
  admin: '// 管理员路由 children - 在 messages 后面添加'
};

console.log('=================================');
console.log('移动端路由更新指南');
console.log('=================================\n');

console.log('请手动在 src/router/index.js 中添加以下路由：\n');

Object.keys(newRoutes).forEach(role => {
  console.log(`${updateMarkers[role]}`);
  console.log(`// ${role.toUpperCase()} 角色新路由：`);
  newRoutes[role].forEach(route => {
    console.log(route);
  });
  console.log('');
});

console.log('=================================');
console.log('更新完成！');
console.log('=================================');
