/**
 * 权限控制指令
 */
import { useUserStore } from '@/stores/userStore';

/**
 * 权限检查指令
 * 用法：v-permission="'user:create'" 或 v-permission="['user:create', 'user:edit']"
 */
const permission = {
  mounted(el, binding) {
    const { value } = binding;
    if (!value) return;

    const userStore = useUserStore();
    const hasPermission = userStore.hasPermission(value);

    if (!hasPermission) {
      // 没有权限时隐藏元素
      el.style.display = 'none';
      // 或者从DOM中移除
      // el.parentNode && el.parentNode.removeChild(el)
    }
  },

  updated(el, binding) {
    const { value } = binding;
    if (!value) return;

    const userStore = useUserStore();
    const hasPermission = userStore.hasPermission(value);

    if (hasPermission) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }
};

/**
 * 角色检查指令
 * 用法：v-role="'admin'" 或 v-role="['admin', 'manager']"
 */
const role = {
  mounted(el, binding) {
    const { value } = binding;
    if (!value) return;

    const userStore = useUserStore();
    const hasRole = userStore.hasRole(value);

    if (!hasRole) {
      el.style.display = 'none';
    }
  },

  updated(el, binding) {
    const { value } = binding;
    if (!value) return;

    const userStore = useUserStore();
    const hasRole = userStore.hasRole(value);

    if (hasRole) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }
};

/**
 * 管理员权限指令
 * 用法：v-admin
 */
const admin = {
  mounted(el, binding) {
    const userStore = useUserStore();
    const isAdmin = userStore.hasRole('admin');

    if (!isAdmin) {
      el.style.display = 'none';
    }
  },

  updated(el, binding) {
    const userStore = useUserStore();
    const isAdmin = userStore.hasRole('admin');

    if (isAdmin) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }
};

/**
 * 权限或角色检查指令（任一满足即可）
 * 用法：v-auth="{ permissions: ['user:create'], roles: ['admin'] }"
 */
const auth = {
  mounted(el, binding) {
    const { value } = binding;
    if (!value) return;

    const userStore = useUserStore();
    const { permissions = [], roles = [] } = value;

    const hasPermission = permissions.length === 0 || userStore.hasPermission(permissions);
    const hasRole = roles.length === 0 || userStore.hasRole(roles);

    // 权限或角色任一满足即可显示
    if (!hasPermission && !hasRole) {
      el.style.display = 'none';
    }
  },

  updated(el, binding) {
    const { value } = binding;
    if (!value) return;

    const userStore = useUserStore();
    const { permissions = [], roles = [] } = value;

    const hasPermission = permissions.length === 0 || userStore.hasPermission(permissions);
    const hasRole = roles.length === 0 || userStore.hasRole(roles);

    if (hasPermission || hasRole) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }
};

/**
 * 禁用指令（根据权限禁用元素）
 * 用法：v-permission-disabled="'user:edit'"
 */
const permissionDisabled = {
  mounted(el, binding) {
    const { value } = binding;
    if (!value) return;

    const userStore = useUserStore();
    const hasPermission = userStore.hasPermission(value);

    if (!hasPermission) {
      el.disabled = true;
      el.classList.add('is-disabled');
      el.style.cursor = 'not-allowed';
      el.style.opacity = '0.5';
    }
  },

  updated(el, binding) {
    const { value } = binding;
    if (!value) return;

    const userStore = useUserStore();
    const hasPermission = userStore.hasPermission(value);

    if (hasPermission) {
      el.disabled = false;
      el.classList.remove('is-disabled');
      el.style.cursor = '';
      el.style.opacity = '';
    } else {
      el.disabled = true;
      el.classList.add('is-disabled');
      el.style.cursor = 'not-allowed';
      el.style.opacity = '0.5';
    }
  }
};

/**
 * 权限检查函数（在JS中使用）
 */
export function checkPermission(permission) {
  const userStore = useUserStore();
  return userStore.hasPermission(permission);
}

/**
 * 角色检查函数（在JS中使用）
 */
export function checkRole(role) {
  const userStore = useUserStore();
  return userStore.hasRole(role);
}

/**
 * 管理员检查函数（在JS中使用）
 */
export function checkAdmin() {
  const userStore = useUserStore();
  return userStore.hasRole('admin');
}

/**
 * 权限指令安装函数
 */
export default function install(app) {
  app.directive('permission', permission);
  app.directive('role', role);
  app.directive('admin', admin);
  app.directive('auth', auth);
  app.directive('permission-disabled', permissionDisabled);
}

// 导出所有指令
export {
  permission,
  role,
  admin,
  auth,
  permissionDisabled
};