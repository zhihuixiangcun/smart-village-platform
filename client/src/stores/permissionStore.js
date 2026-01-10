import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import enhancedPermissionService from '@/services/enhancedPermissionService';

export const usePermissionStore = defineStore('permission', () => {
  // 状态
  const permissions = ref([]);
  const roles = ref([]);
  const policies = ref([]);
  const templates = ref([]);
  const loading = ref(false);
  const lastUpdated = ref(null);

  // 计算属性
  const hasPermission = computed(() => (resource, action) => {
    return permissions.value.some(permission => {
      // 直接匹配
      if (permission === `${resource}:${action}`) return true;

      // 通配符匹配
      if (permission === `${resource}:*` || permission === `*:${action}`) return true;

      // 多操作匹配
      const [res, acts] = permission.split(':');
      if (res === resource || res === '*') {
        return acts.split(',').includes(action);
      }

      return false;
    });
  });

  const hasAnyPermission = computed(() => permissionList => {
    return permissionList.some(permission => {
      const [resource, action] = permission.split(':');
      return hasPermission.value(resource, action);
    });
  });

  const hasAllPermissions = computed(() => permissionList => {
    return permissionList.every(permission => {
      const [resource, action] = permission.split(':');
      return hasPermission.value(resource, action);
    });
  });

  const getPermissionsByResource = computed(() => resource => {
    return permissions.value
      .filter(permission => {
        const [res] = permission.split(':');
        return res === resource || res === '*';
      })
      .map(permission => {
        const [, actions] = permission.split(':');
        return actions.split(',').map(action => `${resource}:${action}`);
      })
      .flat();
  });

  const getRolePermissions = computed(() => roleId => {
    const role = roles.value.find(r => r.id === roleId);
    return role ? role.permissions || [] : [];
  });

  // 方法
  const fetchUserPermissions = async () => {
    loading.value = true;
    try {
      const userPermissions = await enhancedPermissionService.getUserPermissions();
      permissions.value = userPermissions;
      lastUpdated.value = new Date();
      return userPermissions;
    } catch (error) {
      console.error('获取用户权限失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const checkPermission = async (resource, action, context = {}) => {
    try {
      const result = await enhancedPermissionService.checkPermission(resource, action, context);
      return result.allowed;
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  };

  const batchCheckPermissions = async permissionList => {
    try {
      const result = await enhancedPermissionService.batchCheckPermissions(permissionList);
      return result.results || [];
    } catch (error) {
      console.error('批量权限检查失败:', error);
      return permissionList.map(() => ({ allowed: false, reason: 'ERROR' }));
    }
  };

  const refreshPermissions = async () => {
    // 清除缓存
    permissions.value = [];
    await fetchUserPermissions();
  };

  const updatePermissionsRealtime = async (userId, newPermissions) => {
    try {
      await enhancedPermissionService.updatePermissionsRealtime(userId, newPermissions);

      // 如果是当前用户，更新本地权限
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser.id === userId) {
        permissions.value = newPermissions;
        localStorage.setItem('permissions', JSON.stringify(newPermissions));
      }
    } catch (error) {
      console.error('实时更新权限失败:', error);
      throw error;
    }
  };

  // 角色管理
  const fetchRoles = async () => {
    try {
      // 这里应该调用实际的API
      const mockRoles = [
        {
          id: '1',
          name: '村级管理员',
          description: '村级最高管理员',
          permissions: ['*:*'],
          userCount: 5,
        },
        {
          id: '2',
          name: '部门主管',
          description: '部门负责人',
          permissions: ['user:*', 'resident:*', 'finance:read'],
          userCount: 12,
        },
        {
          id: '3',
          name: '工作人员',
          description: '普通工作人员',
          permissions: ['user:read', 'resident:read', 'service:*'],
          userCount: 28,
        },
        {
          id: '4',
          name: '村民',
          description: '普通村民',
          permissions: ['announcement:read', 'service:apply'],
          userCount: 1250,
        },
      ];
      roles.value = mockRoles;
      return mockRoles;
    } catch (error) {
      console.error('获取角色列表失败:', error);
      throw error;
    }
  };

  const createRole = async roleData => {
    try {
      // 调用API创建角色
      const newRole = {
        id: Date.now().toString(),
        ...roleData,
        userCount: 0,
      };
      roles.value.push(newRole);
      return newRole;
    } catch (error) {
      console.error('创建角色失败:', error);
      throw error;
    }
  };

  const updateRole = async (roleId, roleData) => {
    try {
      const index = roles.value.findIndex(r => r.id === roleId);
      if (index > -1) {
        roles.value[index] = { ...roles.value[index], ...roleData };
      }
      return roles.value[index];
    } catch (error) {
      console.error('更新角色失败:', error);
      throw error;
    }
  };

  const deleteRole = async roleId => {
    try {
      const index = roles.value.findIndex(r => r.id === roleId);
      if (index > -1) {
        roles.value.splice(index, 1);
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      throw error;
    }
  };

  // 策略管理
  const fetchPolicies = async () => {
    try {
      const policyList = await enhancedPermissionService.getPermissionPolicies();
      policies.value = policyList;
      return policyList;
    } catch (error) {
      console.error('获取权限策略失败:', error);
      throw error;
    }
  };

  const createPolicy = async policyData => {
    try {
      const result = await enhancedPermissionService.createPermissionPolicy(policyData);
      if (result.success) {
        policies.value.push(result.policy);
      }
      return result;
    } catch (error) {
      console.error('创建策略失败:', error);
      throw error;
    }
  };

  // 模板管理
  const fetchTemplates = async () => {
    try {
      // 模拟数据
      const mockTemplates = [
        {
          id: '1',
          name: '基础权限模板',
          description: '包含基础权限的模板',
          category: 'system',
          permissionCount: 15,
          permissions: [],
        },
        {
          id: '2',
          name: '管理员权限模板',
          description: '管理员专用权限模板',
          category: 'custom',
          permissionCount: 35,
          permissions: [],
        },
      ];
      templates.value = mockTemplates;
      return mockTemplates;
    } catch (error) {
      console.error('获取权限模板失败:', error);
      throw error;
    }
  };

  // 缓存管理
  const clearCache = async () => {
    try {
      await enhancedPermissionService.clearPermissionCache();
      permissions.value = [];
      lastUpdated.value = null;
    } catch (error) {
      console.error('清除权限缓存失败:', error);
      throw error;
    }
  };

  // 初始化
  const initialize = async () => {
    const storedPermissions = localStorage.getItem('permissions');
    if (storedPermissions) {
      try {
        permissions.value = JSON.parse(storedPermissions);
      } catch (error) {
        console.error('解析存储的权限失败:', error);
        permissions.value = [];
      }
    } else {
      await fetchUserPermissions();
    }

    // 预加载其他数据
    await Promise.all([
      fetchRoles().catch(() => {}),
      fetchPolicies().catch(() => {}),
      fetchTemplates().catch(() => {}),
    ]);
  };

  // 权限变化监听
  const setupPermissionListener = () => {
    // 监听权限更新事件
    enhancedPermissionService.on('permission_update', data => {
      if (data.userId === getCurrentUserId()) {
        permissions.value = data.permissions;
        localStorage.setItem('permissions', JSON.stringify(data.permissions));
      }
    });
  };

  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id;
  };

  return {
    // 状态
    permissions,
    roles,
    policies,
    templates,
    loading,
    lastUpdated,

    // 计算属性
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionsByResource,
    getRolePermissions,

    // 方法
    fetchUserPermissions,
    checkPermission,
    batchCheckPermissions,
    refreshPermissions,
    updatePermissionsRealtime,

    // 角色管理
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,

    // 策略管理
    fetchPolicies,
    createPolicy,

    // 模板管理
    fetchTemplates,

    // 缓存管理
    clearCache,

    // 初始化
    initialize,
    setupPermissionListener,
  };
});
