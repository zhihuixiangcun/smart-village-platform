/**
 * 统一的导航配置文件
 * Unified Navigation Configuration
 *
 * 合并原有的 roleNavigation.js 和 routeNavigation.js
 * 提供统一的角色导航配置和路由前缀映射
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
  DataAnalysis,
} from '@element-plus/icons-vue';

/**
 * 用户角色枚举
 * User Role Enum
 */
export const USER_ROLES = {
  RESIDENT: 'resident',                  // 村民
  VILLAGE_CADRE: 'village_cadre',         // 村干部
  TOWNSHIP_OFFICIAL: 'township_official', // 乡镇干部
  PURCHASER: 'purchaser',                // 采购商
  ADMIN: 'admin',                        // 管理员
};

/**
 * 角色中文名称映射
 * Role Name Mapping (Chinese)
 */
export const ROLE_NAMES = {
  [USER_ROLES.RESIDENT]: '普通村民',
  [USER_ROLES.VILLAGE_CADRE]: '村干部',
  [USER_ROLES.TOWNSHIP_OFFICIAL]: '乡镇干部',
  [USER_ROLES.PURCHASER]: '采购商',
  [USER_ROLES.ADMIN]: '管理员',
};

/**
 * 路由前缀映射
 * Route Prefix Mapping
 */
export const ROUTE_PREFIX_MAP = {
  [USER_ROLES.RESIDENT]: '/mobile/resident',
  [USER_ROLES.VILLAGE_CADRE]: '/mobile/village-cadre',
  [USER_ROLES.TOWNSHIP_OFFICIAL]: '/mobile/township',
  [USER_ROLES.PURCHASER]: '/mobile/purchaser',
  [USER_ROLES.ADMIN]: '/mobile/admin',
};

/**
 * 侧边菜单配置
 * Side Menu Configuration
 */
export const MENU_CONFIG = {
  [USER_ROLES.RESIDENT]: [
    { route: '/mobile/village', label: '村务管理', icon: OfficeBuilding },
    { route: '/mobile/residents', label: '村民信息', icon: User },
    { route: '/mobile/qrcode', label: '一户一码', icon: ChatDotSquare },
    { route: '/mobile/mutual-aid', label: '邻里互助', icon: ChatDotSquare },
    { route: '/mobile/settings', label: '系统设置', icon: Plus },
  ],
  [USER_ROLES.VILLAGE_CADRE]: [
    { route: '/village/affairs', label: '村务管理', icon: OfficeBuilding },
    { route: '/village/residents', label: '村民管理', icon: User },
    { route: '/village/finance', label: '财务管理', icon: ChatDotSquare },
    { route: '/village/settings', label: '系统设置', icon: Plus },
  ],
  [USER_ROLES.TOWNSHIP_OFFICIAL]: [
    { route: '/township', label: '首页', icon: Home },
    { route: '/township/villages', label: '村庄管理', icon: Management },
    { route: '/township/statistics', label: '统计分析', icon: DataAnalysis },
    { route: '/township/settings', label: '设置', icon: Plus },
  ],
  [USER_ROLES.PURCHASER]: [
    { route: '/purchaser', label: '首页', icon: Home },
    { route: '/purchaser/market', label: '农产品市场', icon: Shop },
    { route: '/purchaser/orders', label: '订单管理', icon: ShoppingBag },
    { route: '/purchaser/settings', label: '设置', icon: Plus },
  ],
  [USER_ROLES.ADMIN]: [
    { route: '/admin/affairs', label: '村务管理', icon: OfficeBuilding },
    { route: '/admin/messages', label: '消息管理', icon: Message },
    { route: '/admin/settings', label: '系统设置', icon: Plus },
  ],
};

/**
 * 徽章配置
 * Badge Configuration
 */
export const BADGE_CONFIG = {
  [USER_ROLES.RESIDENT]: {
    enabled: true,
    refreshInterval: 30, // 30秒刷新一次
    items: {
      messages: 'unreadCount', // 消息未读数量
    },
  },
  [USER_ROLES.VILLAGE_CADRE]: {
    enabled: true,
    refreshInterval: 30,
    items: {
      messages: 'unreadCount',
    },
  },
  [USER_ROLES.TOWNSHIP_OFFICIAL]: {
    enabled: false,
  },
  [USER_ROLES.PURCHASER]: {
    enabled: true,
    refreshInterval: 60, // 60秒刷新一次
    items: {
      orders: 'pendingOrders', // 待处理订单数
    },
  },
  [USER_ROLES.ADMIN]: {
    enabled: true,
    refreshInterval: 15, // 15秒刷新一次
    items: {
      messages: 'systemMessages', // 系统消息数
    },
  },
};

/**
 * 导航项配置
 * Navigation Item Configuration
 */
export const NAVIGATION_CONFIG = {
  // 村民导航
  [USER_ROLES.RESIDENT]: {
    role: USER_ROLES.RESIDENT,
    routePrefix: ROUTE_PREFIX_MAP[USER_ROLES.RESIDENT],
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/mobile/resident' },
      { id: 'services', label: '服务', icon: Plus, route: '/mobile/resident/services' },
      { id: 'life', label: '生活', icon: ChatDotSquare, route: '/mobile/resident/life' },
      { id: 'messages', label: '消息', icon: Message, route: '/mobile/resident/messages', badgeKey: 'messages' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
  },

  // 村干部导航
  [USER_ROLES.VILLAGE_CADRE]: {
    role: USER_ROLES.VILLAGE_CADRE,
    routePrefix: ROUTE_PREFIX_MAP[USER_ROLES.VILLAGE_CADRE],
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/mobile/village-cadre' },
      { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/mobile/village-cadre/affairs' },
      { id: 'messages', label: '消息', icon: Message, route: '/mobile/village-cadre/messages', badgeKey: 'messages' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
  },

  // 乡镇干部导航
  [USER_ROLES.TOWNSHIP_OFFICIAL]: {
    role: USER_ROLES.TOWNSHIP_OFFICIAL,
    routePrefix: ROUTE_PREFIX_MAP[USER_ROLES.TOWNSHIP_OFFICIAL],
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/mobile/township' },
      { id: 'manage', label: '管理', icon: Management, route: '/mobile/township/villages' },
      { id: 'statistics', label: '统计', icon: DataAnalysis, route: '/mobile/township/statistics' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
  },

  // 采购商导航
  [USER_ROLES.PURCHASER]: {
    role: USER_ROLES.PURCHASER,
    routePrefix: ROUTE_PREFIX_MAP[USER_ROLES.PURCHASER],
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/mobile/purchaser' },
      { id: 'market', label: '市场', icon: Shop, route: '/mobile/purchaser/market' },
      { id: 'orders', label: '订单', icon: ShoppingBag, route: '/mobile/purchaser/orders', badgeKey: 'orders' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
  },

  // 管理员导航
  [USER_ROLES.ADMIN]: {
    role: USER_ROLES.ADMIN,
    routePrefix: ROUTE_PREFIX_MAP[USER_ROLES.ADMIN],
    items: [
      { id: 'home', label: '首页', icon: Home, route: '/mobile/admin' },
      { id: 'affairs', label: '村务', icon: OfficeBuilding, route: '/mobile/admin/affairs' },
      { id: 'messages', label: '消息', icon: Message, route: '/mobile/admin/messages', badgeKey: 'messages' },
      { id: 'profile', label: '我的', icon: User, route: '/profile' },
    ],
  },
};

/**
 * 根据用户角色获取导航配置
 * Get navigation configuration by user role
 *
 * @param {string} role - 用户角色
 * @returns {Object} 导航配置对象
 */
export function getNavigationByRole(role) {
  const normalizedRole = normalizeRole(role);

  if (NAVIGATION_CONFIG[normalizedRole]) {
    return NAVIGATION_CONFIG[normalizedRole];
  }

  // 默认返回村民配置
  return NAVIGATION_CONFIG[USER_ROLES.RESIDENT];
}

/**
 * 根据当前路由获取导航配置
 * Get navigation configuration by current route
 *
 * @param {string} currentPath - 当前路由路径
 * @returns {Object} 导航配置对象
 */
export function getNavigationByRoute(currentPath) {
  // 优先通过路由前缀匹配
  for (const [role, config] of Object.entries(NAVIGATION_CONFIG)) {
    if (currentPath.startsWith(config.routePrefix)) {
      return config;
    }
  }

  // 默认返回村民配置
  return NAVIGATION_CONFIG[USER_ROLES.RESIDENT];
}

/**
 * 根据用户角色获取菜单配置
 * Get menu configuration by user role
 *
 * @param {string} role - 用户角色
 * @returns {Array} 菜单项数组
 */
export function getMenuByRole(role) {
  const normalizedRole = normalizeRole(role);

  if (MENU_CONFIG[normalizedRole]) {
    return MENU_CONFIG[normalizedRole];
  }

  return MENU_CONFIG[USER_ROLES.RESIDENT];
}

/**
 * 根据当前路由获取菜单配置
 * Get menu configuration by current route
 *
 * @param {string} currentPath - 当前路由路径
 * @returns {Array} 菜单项数组
 */
export function getMenuByRoute(currentPath) {
  // 通过路由前缀匹配
  for (const [role, routePrefix] of Object.entries(ROUTE_PREFIX_MAP)) {
    if (currentPath.startsWith(routePrefix)) {
      return MENU_CONFIG[role];
    }
  }

  return MENU_CONFIG[USER_ROLES.RESIDENT];
}

/**
 * 根据用户角色获取角色名称
 * Get role name by user role
 *
 * @param {string} role - 用户角色
 * @returns {string} 角色中文名称
 */
export function getRoleName(role) {
  const normalizedRole = normalizeRole(role);
  return ROLE_NAMES[normalizedRole] || ROLE_NAMES[USER_ROLES.RESIDENT];
}

/**
 * 根据当前路由获取角色名称
 * Get role name by current route
 *
 * @param {string} currentPath - 当前路由路径
 * @returns {string} 角色中文名称
 */
export function getRoleNameByRoute(currentPath) {
  // 通过路由前缀匹配
  for (const [role, routePrefix] of Object.entries(ROUTE_PREFIX_MAP)) {
    if (currentPath.startsWith(routePrefix)) {
      return ROLE_NAMES[role];
    }
  }

  return ROLE_NAMES[USER_ROLES.RESIDENT];
}

/**
 * 根据用户角色获取徽章配置
 * Get badge configuration by user role
 *
 * @param {string} role - 用户角色
 * @returns {Object} 徽章配置对象
 */
export function getBadgeConfig(role) {
  const normalizedRole = normalizeRole(role);

  if (BADGE_CONFIG[normalizedRole]) {
    return BADGE_CONFIG[normalizedRole];
  }

  return { enabled: false };
}

/**
 * 规范化角色标识
 * Normalize role identifier
 * 用于兼容旧的角色标识
 *
 * @param {string} role - 角色标识
 * @returns {string} 规范化后的角色标识
 */
function normalizeRole(role) {
  if (!role) {
    return USER_ROLES.RESIDENT;
  }

  // 兼容旧的角色标识
  const roleMap = {
    'village_official': USER_ROLES.VILLAGE_CADRE,
    'official': USER_ROLES.VILLAGE_CADRE,
    'villager': USER_ROLES.RESIDENT,
    'cadre': USER_ROLES.VILLAGE_CADRE,
  };

  return roleMap[role] || role;
}

/**
 * 根据路由前缀获取用户角色
 * Get user role by route prefix
 *
 * @param {string} routePrefix - 路由前缀
 * @returns {string|null} 用户角色，未找到返回 null
 */
export function getRoleByRoutePrefix(routePrefix) {
  for (const [role, prefix] of Object.entries(ROUTE_PREFIX_MAP)) {
    if (prefix === routePrefix) {
      return role;
    }
  }
  return null;
}

/**
 * 检查路由是否属于指定角色
 * Check if route belongs to specified role
 *
 * @param {string} currentPath - 当前路由路径
 * @param {string} role - 用户角色
 * @returns {boolean} 是否属于该角色
 */
export function isRouteBelongsToRole(currentPath, role) {
  const config = NAVIGATION_CONFIG[role];
  if (!config) {
    return false;
  }

  return currentPath.startsWith(config.routePrefix);
}

/**
 * 导出默认配置
 * Export default configuration
 */
export default {
  USER_ROLES,
  ROLE_NAMES,
  ROUTE_PREFIX_MAP,
  NAVIGATION_CONFIG,
  MENU_CONFIG,
  BADGE_CONFIG,
  getNavigationByRole,
  getNavigationByRoute,
  getMenuByRole,
  getMenuByRoute,
  getRoleName,
  getRoleNameByRoute,
  getBadgeConfig,
  getRoleByRoutePrefix,
  isRouteBelongsToRole,
};
