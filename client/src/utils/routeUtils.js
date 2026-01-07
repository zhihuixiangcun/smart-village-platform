/**
 * 路由权限工具函数
 */
import { useUserStore } from '@/stores/user';

/**
 * 检查用户是否有访问指定路由的权限
 * @param {Object} route - 路由对象
 * @param {Object} userStore - 用户状态存储
 * @returns {boolean} 是否有权限
 */
export function hasRoutePermission(route, userStore = null) {
  const store = userStore || useUserStore();

  // 如果路由不需要权限，直接返回 true
  if (!route.meta || !route.meta.permissions || route.meta.permissions.length === 0) {
    return true;
  }

  // 检查用户是否有任一所需权限
  return store.hasAnyPermission(route.meta.permissions);
}

/**
 * 过滤用户可访问的路由列表
 * @param {Array} routes - 路由列表
 * @param {Object} userStore - 用户状态存储
 * @returns {Array} 过滤后的路由列表
 */
export function filterAccessibleRoutes(routes, userStore = null) {
  const store = userStore || useUserStore();

  return routes.filter(route => {
    // 检查当前路由权限
    if (!hasRoutePermission(route, store)) {
      return false;
    }

    // 递归检查子路由
    if (route.children && route.children.length > 0) {
      route.children = filterAccessibleRoutes(route.children, store);
      // 如果所有子路由都没有权限，则隐藏父路由
      return route.children.length > 0;
    }

    return true;
  });
}

/**
 * 生成菜单项列表
 * @param {Array} routes - 路由列表
 * @param {Object} userStore - 用户状态存储
 * @returns {Array} 菜单项列表
 */
export function generateMenuItems(routes, userStore = null) {
  const store = userStore || useUserStore();
  const menuItems = [];

  routes.forEach(route => {
    // 跳过隐藏的路由和不需要在菜单中显示的路由
    if (route.meta && (route.meta.hidden || route.meta.hideInMenu)) {
      return;
    }

    // 检查权限
    if (!hasRoutePermission(route, store)) {
      return;
    }

    const menuItem = {
      path: route.path,
      name: route.name,
      title: route.meta?.title || route.name,
      icon: route.meta?.icon,
      component: route.component,
      children: []
    };

    // 处理子路由
    if (route.children && route.children.length > 0) {
      menuItem.children = generateMenuItems(route.children, store);

      // 如果有子菜单但所有子菜单都没有权限，则不显示父菜单
      if (menuItem.children.length === 0 && route.meta?.requireChildren) {
        return;
      }
    }

    menuItems.push(menuItem);
  });

  return menuItems;
}

/**
 * 根据路由名称获取路由对象
 * @param {string} routeName - 路由名称
 * @param {Object} router - 路由实例
 * @returns {Object|null} 路由对象
 */
export function getRouteByName(routeName, router) {
  const routes = router.getRoutes();
  return routes.find(route => route.name === routeName) || null;
}

/**
 * 获取当前用户的默认首页路由
 * @param {Object} userStore - 用户状态存储
 * @returns {string} 默认路由路径
 */
export function getDefaultRoute(userStore = null) {
  const store = userStore || useUserStore();
  const userRole = store.userRole;

  // 根据用户角色返回不同的默认首页
  const roleDefaultRoutes = {
    'admin': '/dashboard',
    'committee': '/dashboard',
    'resident': '/dashboard',
    'purchaser': '/purchasers',
    'individual_purchaser': '/purchasers'
  };

  return roleDefaultRoutes[userRole] || '/dashboard';
}

/**
 * 检查路由是否需要认证
 * @param {Object} route - 路由对象
 * @returns {boolean} 是否需要认证
 */
export function requiresAuth(route) {
  return route.meta && route.meta.requiresAuth !== false;
}

/**
 * 获取路由的面包屑导航
 * @param {Object} route - 当前路由对象
 * @param {Object} router - 路由实例
 * @returns {Array} 面包屑数组
 */
export function getBreadcrumbFromRoute(route, router) {
  if (route.meta && route.meta.breadcrumb) {
    return route.meta.breadcrumb;
  }

  // 自动生成面包屑
  const pathArray = route.path.split('/').filter(path => path);
  const breadcrumb = [];

  // 添加首页
  breadcrumb.push({
    title: '首页',
    path: '/dashboard'
  });

  let currentPath = '';
  pathArray.forEach((path, index) => {
    currentPath += `/${path}`;
    const matchedRoute = router.getRoutes().find(r => r.path === currentPath);

    if (matchedRoute && matchedRoute.meta && matchedRoute.meta.title) {
      breadcrumb.push({
        title: matchedRoute.meta.title,
        path: index === pathArray.length - 1 ? '' : currentPath
      });
    }
  });

  return breadcrumb;
}

/**
 * 缓存路由权限结果，避免重复计算
 */
const permissionCache = new Map();

/**
 * 清除权限缓存
 */
export function clearPermissionCache() {
  permissionCache.clear();
}

/**
 * 带缓存的权限检查
 * @param {string} routeName - 路由名称
 * @param {Array} permissions - 权限列表
 * @param {Object} userStore - 用户状态存储
 * @returns {boolean} 是否有权限
 */
export function hasPermissionCached(routeName, permissions, userStore = null) {
  const store = userStore || useUserStore();
  const userId = store.user?.id;
  const cacheKey = `${userId}-${routeName}-${permissions.join(',')}`;

  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey);
  }

  const hasPermission = store.hasAnyPermission(permissions);
  permissionCache.set(cacheKey, hasPermission);

  return hasPermission;
}

/**
 * 角色基础路由映射
 */
export const roleRouteMap = {
  'admin': [
    'dashboard',
    'residents',
    'committee',
    'finance',
    'affairs',
    'services',
    'purchasers',
    'system'
  ],
  'committee': [
    'dashboard',
    'residents',
    'committee',
    'finance',
    'affairs',
    'services'
  ],
  'resident': [
    'dashboard',
    'services',
    'affairs'
  ],
  'purchaser': [
    'dashboard',
    'purchasers'
  ],
  'individual_purchaser': [
    'dashboard',
    'purchasers'
  ]
};

/**
 * 根据用户角色获取可访问的路由名称列表
 * @param {string} userRole - 用户角色
 * @returns {Array} 路由名称列表
 */
export function getAccessibleRoutesByRole(userRole) {
  return roleRouteMap[userRole] || [];
}

/**
 * 权限常量定义
 */
export const PERMISSIONS = {
  // 村民管理权限
  RESIDENT_READ: 'resident:read',
  RESIDENT_WRITE: 'resident:write',
  RESIDENT_DELETE: 'resident:delete',

  // 村委管理权限
  COMMITTEE_READ: 'committee:read',
  COMMITTEE_WRITE: 'committee:write',
  COMMITTEE_DELETE: 'committee:delete',

  // 财务管理权限
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  FINANCE_APPROVE: 'finance:approve',
  FINANCE_BUDGET: 'finance:budget',
  FINANCE_REPORTS: 'finance:reports',

  // 村务治理权限
  VILLAGE_READ: 'village:read',
  VILLAGE_WRITE: 'village:write',
  VILLAGE_ANNOUNCEMENT: 'village:announcement',
  VILLAGE_VOTING: 'village:voting',
  VILLAGE_MEETING: 'village:meeting',

  // 生活服务权限
  SERVICE_READ: 'service:read',
  SERVICE_APPLICATION: 'service:application',
  HOUSEHOLD_READ: 'household:read',
  HOUSEHOLD_WRITE: 'household:write',

  // 采购商管理权限
  PURCHASER_READ: 'purchaser:read',
  PURCHASER_WRITE: 'purchaser:write',
  PURCHASER_APPROVE: 'purchaser:approve',

  // 系统管理权限
  SYSTEM_READ: 'system:read',
  SYSTEM_USER: 'system:user',
  SYSTEM_ROLE: 'system:role',
  SYSTEM_LOG: 'system:log',

  // 超级管理员权限
  ALL: '*:*'
};

/**
 * 路由元信息字段定义
 */
export const ROUTE_META_FIELDS = {
  TITLE: 'title',                    // 页面标题
  ICON: 'icon',                      // 菜单图标
  REQUIRES_AUTH: 'requiresAuth',     // 是否需要认证
  PERMISSIONS: 'permissions',        // 所需权限
  ROLES: 'roles',                    // 所需角色
  BREADCRUMB: 'breadcrumb',          // 面包屑导航
  HIDDEN: 'hidden',                  // 是否隐藏
  HIDE_IN_MENU: 'hideInMenu',        // 是否在菜单中隐藏
  LAYOUT: 'layout',                  // 布局类型
  CACHE: 'cache',                    // 是否缓存页面
  ACTIVE_MENU: 'activeMenu'          // 激活的菜单项
};