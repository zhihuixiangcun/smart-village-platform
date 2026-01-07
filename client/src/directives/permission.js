/**
 * 权限指令
 * 用法：v-permission="['resident:read', 'resident:write']"
 */
import { useUserStore } from '@/stores/user';

const permission = {
  mounted(el, binding) {
    const { value } = binding;

    if (value && value instanceof Array && value.length > 0) {
      const userStore = useUserStore();
      const hasPermission = userStore.hasAnyPermission(value);

      if (!hasPermission) {
        el.parentNode && el.parentNode.removeChild(el);
      }
    } else {
      throw new Error('权限指令需要传入权限数组，如 v-permission="[\'resident:read\']"');
    }
  }
};

/**
 * 角色指令
 * 用法：v-role="['admin', 'committee']"
 */
const role = {
  mounted(el, binding) {
    const { value } = binding;

    if (value && value instanceof Array && value.length > 0) {
      const userStore = useUserStore();
      const userRole = userStore.userRole;

      if (!value.includes(userRole)) {
        el.parentNode && el.parentNode.removeChild(el);
      }
    } else {
      throw new Error('角色指令需要传入角色数组，如 v-role="[\'admin\']"');
    }
  }
};

/**
 * 权限或角色指令（满足任一条件即可显示）
 * 用法：v-auth="{ permissions: ['resident:read'], roles: ['admin'] }"
 */
const auth = {
  mounted(el, binding) {
    const { value } = binding;

    if (value && typeof value === 'object') {
      const userStore = useUserStore();
      const { permissions = [], roles = [] } = value;

      let hasPermission = false;
      let hasRole = false;

      // 检查权限
      if (permissions.length > 0) {
        hasPermission = userStore.hasAnyPermission(permissions);
      }

      // 检查角色
      if (roles.length > 0) {
        const userRole = userStore.userRole;
        hasRole = roles.includes(userRole);
      }

      // 如果权限和角色都没有配置，默认显示
      if (permissions.length === 0 && roles.length === 0) {
        return;
      }

      // 只要满足权限或角色其中一个条件即可
      if (!hasPermission && !hasRole) {
        el.parentNode && el.parentNode.removeChild(el);
      }
    }
  }
};

export default {
  install(app) {
    app.directive('permission', permission);
    app.directive('role', role);
    app.directive('auth', auth);
  }
};