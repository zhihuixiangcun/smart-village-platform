/**
 * 路由导航配置
 * 根据当前访问的路由页面显示对应的底部导航
 */

import {
  Home,
  Plus,
  ChatDotSquare,
  User,
  OfficeBuilding,
  Message,
  Shop,
  ShoppingBag,
  Management,
  TrendCharts,
  Document,
} from '@element-plus/icons-vue';

/**
 * 导航项定义
 * @typedef {Object} NavItem
 * @property {string} id - 导航项唯一标识
 * @property {string} label - 导航项标签
 * @property {Object} icon - 图标组件
 * @property {string} route - 路由路径
 */

/**
 * 路由导航配置
 * @type {Object.<string, NavItem[]>}
 */
export const ROUTE_NAVIGATION = {
  // 村民页面
  '/home/villager': [
    { id: 'services', label: '服务', icon: Plus, route: '/home/villager/services' },
    { id: 'life', label: '生活', icon: ChatDotSquare, route: '/home/villager/life' },
    { id: 'messages', label: '消息', icon: Message, route: '/home/villager/messages' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 村干部页面
  '/home/cadre': [
    { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/home/cadre/affairs' },
    { id: 'messages', label: '消息', icon: Message, route: '/home/cadre/messages' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 村官页面
  '/home/official': [
    { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/home/official/affairs' },
    { id: 'messages', label: '消息', icon: Message, route: '/home/official/messages' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 管理员页面
  '/home/admin': [
    { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/home/admin/affairs' },
    { id: 'messages', label: '消息', icon: Message, route: '/home/admin/messages' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 采购商页面
  '/home/purchaser': [
    { id: 'home', label: '首页', icon: Home, route: '/home/purchaser' },
    { id: 'market', label: '市场', icon: Shop, route: '/home/purchaser/market' },
    { id: 'orders', label: '订单', icon: ShoppingBag, route: '/home/purchaser/orders' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 乡镇干部页面
  '/home/township': [
    { id: 'home', label: '首页', icon: Home, route: '/home/township' },
    { id: 'manage', label: '管理', icon: Management, route: '/home/township/villages' },
    { id: 'statistics', label: '统计', icon: TrendCharts, route: '/home/township/statistics' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],
};

/**
 * 路由前缀匹配映射
 * 用于匹配同一角色的多个页面
 * @type {Object.<string, string>}
 */
export const ROUTE_PREFIX_MAP = {
  '/home/villager': '/home/villager',
  '/home/cadre': '/home/cadre',
  '/home/official': '/home/official',
  '/home/admin': '/home/admin',
  '/home/purchaser': '/home/purchaser',
  '/home/township': '/home/township',
};

/**
 * 根据当前路由获取导航配置
 * @param {string} currentPath - 当前路由路径
 * @returns {NavItem[]} 导航项数组
 */
export function getNavigationByRoute(currentPath) {
  // 先尝试精确匹配
  if (ROUTE_NAVIGATION[currentPath]) {
    return ROUTE_NAVIGATION[currentPath];
  }

  // 再尝试前缀匹配
  for (const [prefix, navRoute] of Object.entries(ROUTE_PREFIX_MAP)) {
    if (currentPath.startsWith(prefix)) {
      return ROUTE_NAVIGATION[navRoute];
    }
  }

  // 默认返回村民导航
  return ROUTE_NAVIGATION['/home/villager'];
}

/**
 * 根据当前路由获取侧边菜单配置
 * @param {string} currentPath - 当前路由路径
 * @returns {Array} 菜单项数组
 */
export function getMenuByRoute(currentPath) {
  const menus = {
    '/home/villager': [
      { route: '/home/villager/village', label: '村务管理', icon: OfficeBuilding },
      { route: '/home/villager/residents', label: '村民信息', icon: User },
      { route: '/home/villager/qrcode', label: '一户一码', icon: Document },
      { route: '/home/villager/mutual-aid', label: '邻里互助', icon: ChatDotSquare },
      { route: '/home/villager/settings', label: '系统设置', icon: Plus },
    ],
    '/home/cadre': [
      { route: '/home/cadre/affairs', label: '村务管理', icon: OfficeBuilding },
      { route: '/home/cadre/residents', label: '村民管理', icon: User },
      { route: '/home/cadre/finance', label: '财务管理', icon: Document },
      { route: '/home/cadre/settings', label: '系统设置', icon: Plus },
    ],
    '/home/official': [
      { route: '/home/official/affairs', label: '村务管理', icon: OfficeBuilding },
      { route: '/home/official/messages', label: '消息管理', icon: Message },
      { route: '/home/official/settings', label: '系统设置', icon: Plus },
    ],
    '/home/admin': [
      { route: '/home/admin/affairs', label: '村务管理', icon: OfficeBuilding },
      { route: '/home/admin/messages', label: '消息管理', icon: Message },
      { route: '/home/admin/settings', label: '系统设置', icon: Plus },
    ],
    '/home/purchaser': [
      { route: '/home/purchaser', label: '首页', icon: Home },
      { route: '/home/purchaser/market', label: '农产品市场', icon: Shop },
      { route: '/home/purchaser/orders', label: '订单管理', icon: ShoppingBag },
      { route: '/home/purchaser/settings', label: '设置', icon: Plus },
    ],
    '/home/township': [
      { route: '/home/township', label: '首页', icon: Home },
      { route: '/home/township/villages', label: '村庄管理', icon: Management },
      { route: '/home/township/statistics', label: '统计分析', icon: TrendCharts },
      { route: '/home/township/settings', label: '设置', icon: Plus },
    ],
  };

  // 先尝试精确匹配
  if (menus[currentPath]) {
    return menus[currentPath];
  }

  // 再尝试前缀匹配
  for (const [prefix, menuRoute] of Object.entries(ROUTE_PREFIX_MAP)) {
    if (currentPath.startsWith(prefix)) {
      return menus[menuRoute];
    }
  }

  // 默认返回村民菜单
  return menus['/home/villager'];
}

/**
 * 根据当前路由获取角色名称
 * @param {string} currentPath - 当前路由路径
 * @returns {string} 角色中文名称
 */
export function getRoleNameByRoute(currentPath) {
  const roleNames = {
    '/home/villager': '普通村民',
    '/home/cadre': '村干部',
    '/home/official': '村官',
    '/home/admin': '管理员',
    '/home/purchaser': '采购商',
    '/home/township': '乡镇干部',
  };

  // 先尝试精确匹配
  if (roleNames[currentPath]) {
    return roleNames[currentPath];
  }

  // 再尝试前缀匹配
  for (const [prefix, roleRoute] of Object.entries(ROUTE_PREFIX_MAP)) {
    if (currentPath.startsWith(prefix)) {
      return roleNames[roleRoute];
    }
  }

  // 默认返回普通村民
  return '普通村民';
}
