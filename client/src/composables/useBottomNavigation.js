/**
 * 底部导航组合式API
 * Bottom Navigation Composable
 *
 * 提供底部导航的状态管理和逻辑处理
 */

import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getNavigationByRoute,
  getRoleNameByRoute,
  getBadgeConfig,
  ROUTE_PREFIX_MAP,
} from '@/config/navigation.config';

/**
 * 底部导航组合式API
 * @returns {Object} 底部导航的状态和方法
 */
export function useBottomNavigation() {
  const route = useRoute();
  const router = useRouter();

  // 适老化模式状态
  const isElderlyMode = ref(false);
  // 横屏模式状态
  const isLandscape = ref(false);

  // 消息徽章数量（可以从 Pinia store 中获取）
  const unreadCount = ref(3);
  const pendingOrders = ref(0);
  const systemMessages = ref(0);

  /**
   * 获取当前用户角色名称
   */
  const currentRoleName = computed(() => {
    return getRoleNameByRoute(route.path);
  });

  /**
   * 获取导航配置
   */
  const navigationConfig = computed(() => {
    return getNavigationByRoute(route.path);
  });

  /**
   * 获取导航项列表（带徽章）
   */
  const navigationItems = computed(() => {
    const config = navigationConfig.value;
    if (!config || !config.items) {
      return [];
    }

    const badgeConfig = getBadgeConfig(config.role);

    return config.items.map((item) => {
      const navItem = {
        id: item.id,
        label: item.label,
        icon: item.icon,
        route: item.route,
      };

      // 添加徽章
      if (badgeConfig.enabled && item.badgeKey) {
        const badgeKey = badgeConfig.items[item.badgeKey];

        switch (badgeKey) {
        case 'unreadCount':
          navItem.badge = unreadCount.value;
          navItem.badgeType = 'danger';
          break;
        case 'pendingOrders':
          navItem.badge = pendingOrders.value;
          navItem.badgeType = 'warning';
          break;
        case 'systemMessages':
          navItem.badge = systemMessages.value;
          navItem.badgeType = 'info';
          break;
        default:
          navItem.badge = 0;
        }
      }

      return navItem;
    });
  });

  /**
   * 当前路由路径
   */
  const currentRoute = computed(() => route.path);

  /**
   * 检查导航项是否激活
   * @param {Object} item - 导航项对象
   * @returns {boolean} 是否激活
   */
  function isActive(item) {
    const currentPath = route.path;
    const itemRoute = item.route;

    // 精确匹配
    if (currentPath === itemRoute) {
      return true;
    }

    // 前缀匹配（用于子页面）
    if (currentPath.startsWith(`${itemRoute  }/`)) {
      return true;
    }

    return false;
  }

  /**
   * 处理导航项点击
   * @param {Object} item - 导航项对象
   */
  function handleNavClick(item) {
    // 如果点击的是当前路由，不跳转
    if (route.path === item.route) {
      return;
    }

    router.push(item.route);
  }

  /**
   * 更新徽章数量
   * @param {string} type - 徽章类型 ('messages' | 'orders' | 'system')
   * @param {number} count - 徽章数量
   */
  function updateBadge(type, count) {
    switch (type) {
    case 'messages':
      unreadCount.value = count;
      break;
    case 'orders':
      pendingOrders.value = count;
      break;
    case 'system':
      systemMessages.value = count;
      break;
    }
  }

  /**
   * 批量更新徽章数量
   * @param {Object} badges - 徽章数量对象
   */
  function updateBadges(badges) {
    if (badges.messages !== undefined) {
      unreadCount.value = badges.messages;
    }
    if (badges.orders !== undefined) {
      pendingOrders.value = badges.orders;
    }
    if (badges.system !== undefined) {
      systemMessages.value = badges.system;
    }
  }

  /**
   * 更新适老化模式
   * @param {boolean} enabled - 是否启用适老化模式
   */
  function setElderlyMode(enabled) {
    isElderlyMode.value = enabled;
    localStorage.setItem('elderlyMode', enabled.toString());
  }

  /**
   * 加载持久化的适老化模式设置
   */
  function loadElderlyMode() {
    const saved = localStorage.getItem('elderlyMode');
    if (saved === 'true') {
      isElderlyMode.value = true;
      document.body.classList.add('large-text-mode');
    }
  }

  /**
   * 检测屏幕方向
   */
  function checkOrientation() {
    isLandscape.value = window.innerWidth > window.innerHeight;
  }

  /**
   * 监听屏幕方向变化
   */
  function handleOrientationChange() {
    checkOrientation();
  }

  /**
   * 初始化
   */
  function initialize() {
    loadElderlyMode();
    checkOrientation();
  }

  // 组件挂载时初始化
  onMounted(() => {
    initialize();

    // 监听屏幕方向变化
    window.addEventListener('resize', handleOrientationChange);

    // 监听屏幕方向变化事件
    window.addEventListener('orientationchange', handleOrientationChange);
  });

  // 组件卸载时清理事件监听
  onUnmounted(() => {
    window.removeEventListener('resize', handleOrientationChange);
    window.removeEventListener('orientationchange', handleOrientationChange);
  });

  return {
    // 状态
    isElderlyMode,
    isLandscape,
    currentRoleName,
    navigationConfig,
    navigationItems,
    currentRoute,

    // 徽章数量
    unreadCount,
    pendingOrders,
    systemMessages,

    // 方法
    isActive,
    handleNavClick,
    updateBadge,
    updateBadges,
    setElderlyMode,
    loadElderlyMode,
    checkOrientation,
  };
}

/**
 * 导航激活状态组合式API
 * Navigation Active State Composable
 */
export function useNavigationActive() {
  const route = useRoute();

  /**
   * 检查路径是否属于导航项
   * @param {string} itemRoute - 导航项路由
   * @returns {boolean} 是否激活
   */
  function isPathActive(itemRoute) {
    const currentPath = route.path;

    // 精确匹配
    if (currentPath === itemRoute) {
      return true;
    }

    // 前缀匹配（用于子页面）
    if (currentPath.startsWith(`${itemRoute  }/`)) {
      return true;
    }

    return false;
  }

  return {
    isPathActive,
  };
}

/**
 * 导航徽章管理组合式API
 * Navigation Badge Management Composable
 */
export function useNavigationBadges() {
  const unreadCount = ref(0);
  const pendingOrders = ref(0);
  const systemMessages = ref(0);

  /**
   * 获取徽章数量
   * @param {string} type - 徽章类型
   * @returns {number} 徽章数量
   */
  function getBadge(type) {
    switch (type) {
    case 'messages':
      return unreadCount.value;
    case 'orders':
      return pendingOrders.value;
    case 'system':
      return systemMessages.value;
    default:
      return 0;
    }
  }

  /**
   * 设置徽章数量
   * @param {string} type - 徽章类型
   * @param {number} count - 徽章数量
   */
  function setBadge(type, count) {
    switch (type) {
    case 'messages':
      unreadCount.value = count;
      break;
    case 'orders':
      pendingOrders.value = count;
      break;
    case 'system':
      systemMessages.value = count;
      break;
    }
  }

  /**
   * 增加徽章数量
   * @param {string} type - 徽章类型
   * @param {number} delta - 增加的数量（默认为1）
   */
  function incrementBadge(type, delta = 1) {
    switch (type) {
    case 'messages':
      unreadCount.value += delta;
      break;
    case 'orders':
      pendingOrders.value += delta;
      break;
    case 'system':
      systemMessages.value += delta;
      break;
    }
  }

  /**
   * 减少徽章数量
   * @param {string} type - 徽章类型
   * @param {number} delta - 减少的数量（默认为1）
   */
  function decrementBadge(type, delta = 1) {
    switch (type) {
    case 'messages':
      unreadCount.value = Math.max(0, unreadCount.value - delta);
      break;
    case 'orders':
      pendingOrders.value = Math.max(0, pendingOrders.value - delta);
      break;
    case 'system':
      systemMessages.value = Math.max(0, systemMessages.value - delta);
      break;
    }
  }

  /**
   * 清除徽章
   * @param {string} type - 徽章类型
   */
  function clearBadge(type) {
    setBadge(type, 0);
  }

  /**
   * 清除所有徽章
   */
  function clearAllBadges() {
    unreadCount.value = 0;
    pendingOrders.value = 0;
    systemMessages.value = 0;
  }

  return {
    // 状态
    unreadCount,
    pendingOrders,
    systemMessages,

    // 方法
    getBadge,
    setBadge,
    incrementBadge,
    decrementBadge,
    clearBadge,
    clearAllBadges,
  };
}

/**
 * 导航权限组合式API
 * Navigation Permission Composable
 */
export function useNavigationPermission() {
  const route = useRoute();

  /**
   * 检查是否有权限访问导航项
   * @param {Object} item - 导航项对象
   * @returns {boolean} 是否有权限
   */
  function hasPermission(item) {
    // 如果导航项有 hidden 属性且为 true，则不显示
    if (item.hidden) {
      return false;
    }

    // 这里可以添加更复杂的权限检查逻辑
    // 例如：检查用户权限列表、角色权限等

    return true;
  }

  /**
   * 过滤有权限的导航项
   * @param {Array} items - 导航项数组
   * @returns {Array} 过滤后的导航项数组
   */
  function filterNavigationItems(items) {
    return items.filter((item) => hasPermission(item));
  }

  return {
    hasPermission,
    filterNavigationItems,
  };
}

/**
 * 导出所有组合式API
 */
export default {
  useBottomNavigation,
  useNavigationActive,
  useNavigationBadges,
  useNavigationPermission,
};
