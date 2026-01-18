/**
 * 角色底部导航配置
 * 根据不同用户角色显示不同的底部导航项
 */

import {
  Home,
  Plus,
  ChatDotSquare,
  User,
  OfficeBuilding,
  Calendar,
  TrendCharts,
  Shop,
  ShoppingBag,
  Management,
  Lock,
  DocumentCopy,
  DataAnalysis,
  Message,
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
 * 角色导航配置
 * @type {Object.<string, NavItem[]>}
 */
export const ROLE_NAVIGATION = {
  // 村民导航
  resident: [
    { id: 'home', label: '首页', icon: Home, route: '/mobile/home' },
    { id: 'services', label: '服务', icon: Plus, route: '/mobile/services' },
    { id: 'life', label: '生活', icon: ChatDotSquare, route: '/mobile/life' },
    { id: 'messages', label: '消息', icon: ChatDotSquare, route: '/mobile/messages' },
    { id: 'profile', label: '我的', icon: User, route: '/mobile/profile' },
  ],

  // 村干部导航
  village_official: [
    { id: 'home', label: '首页', icon: Home, route: '/village/home' },
    { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/village/affairs' },
    { id: 'messages', label: '消息', icon: ChatDotSquare, route: '/village/messages' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 村官导航
  official: [
    { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/home/official' },
    { id: 'messages', label: '消息', icon: Message, route: '/home/official/messages' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 采购商导航
  purchaser: [
    { id: 'home', label: '首页', icon: Home, route: '/purchaser/home' },
    { id: 'market', label: '市场', icon: Shop, route: '/purchaser/market' },
    { id: 'orders', label: '订单', icon: ShoppingBag, route: '/purchaser/orders' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 乡镇干部导航
  township_official: [
    { id: 'home', label: '首页', icon: Home, route: '/township/home' },
    { id: 'manage', label: '管理', icon: Management, route: '/township/villages' },
    { id: 'statistics', label: '统计', icon: DataAnalysis, route: '/township/statistics' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],

  // 管理员导航
  admin: [
    { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/home/admin' },
    { id: 'messages', label: '消息', icon: ChatDotSquare, route: '/home/admin/messages' },
    { id: 'profile', label: '我的', icon: User, route: '/profile' },
  ],
};

/**
 * 获取指定角色的导航配置
 * @param {string} role - 用户角色
 * @returns {NavItem[]} 导航项数组
 */
export function getRoleNavigation(role) {
  // 如果角色存在配置，返回对应的导航项
  if (role && ROLE_NAVIGATION[role]) {
    return ROLE_NAVIGATION[role];
  }

  // 默认返回村民导航
  return ROLE_NAVIGATION.resident;
}

/**
 * 检查角色是否有导航配置
 * @param {string} role - 用户角色
 * @returns {boolean} 是否有配置
 */
export function hasRoleNavigation(role) {
  return role && !!ROLE_NAVIGATION[role];
}
