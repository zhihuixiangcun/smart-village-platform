/**
 * 管理员权限管理服务
 * 提供角色管理、权限管理、用户角色分配等功能
 */

const User = require('../models/User');
const { ROLES, ROLE_PERMISSIONS, getRolePermissions, getPermissionName, buildPermission } = require('../config/permissions');
const logger = require('../utils/logger');

class AdminPermissionService {
  /**
   * 获取所有角色列表
   * @returns {Array} 角色列表
   */
  getAllRoles() {
    try {
      const roleList = Object.values(ROLES).map(role => ({
        key: role,
        name: this.getRoleName(role),
        permissions: getRolePermissions(role),
        description: this.getRoleDescription(role)
      }));

      logger.info('获取角色列表成功', { count: roleList.length });
      return roleList;
    } catch (error) {
      logger.error('获取角色列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色的所有权限
   * @param {string} role - 角色代码
   * @returns {Array} 权限列表
   */
  getRolePermissionsList(role) {
    try {
      if (!ROLES[role.toUpperCase()]) {
        throw new Error('角色不存在');
      }

      const permissions = getRolePermissions(role);
      const permissionList = permissions.map(permission => ({
        code: permission,
        name: getPermissionName(permission),
        module: permission.split(':')[0],
        action: permission.split(':')[1]
      }));

      return permissionList;
    } catch (error) {
      logger.error('获取角色权限失败:', error);
      throw error;
    }
  }

  /**
   * 修改用户角色
   * @param {string} userId - 用户ID
   * @param {string} newRole - 新角色
   * @param {string} operatorId - 操作者ID
   * @returns {Object} 修改结果
   */
  async changeUserRole(userId, newRole, operatorId) {
    try {
      // 验证新角色是否存在
      if (!ROLES[newRole.toUpperCase()]) {
        throw new Error('角色不存在');
      }

      // 获取用户信息
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 记录旧角色
      const oldRole = user.role;

      // 更新角色
      user.role = newRole;
      await user.save();

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'UPDATE',
        resource: 'user_role',
        action: 'change_role',
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        target: {
          userId: user._id,
          userName: user.username || user.profile?.firstName
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          changeType: 'role',
          oldValue: oldRole,
          newValue: newRole
        },
        metadata: {
          reason: '管理员修改用户角色',
          permission: 'user_role:update'
        }
      });

      logger.info('用户角色修改成功', {
        userId,
        oldRole,
        newRole,
        operatorId
      });

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          oldRole,
          newRole
        },
        message: '角色修改成功'
      };
    } catch (error) {
      logger.error('用户角色修改失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统所有权限
   * @returns {Array} 权限列表
   */
  getAllPermissions() {
    try {
      const { PERMISSION_MODULES, ACTIONS } = require('../config/permissions');

      const permissions = [];
      Object.values(PERMISSION_MODULES).forEach(module => {
        Object.values(ACTIONS).forEach(action => {
          permissions.push({
            code: buildPermission(module, action),
            name: getPermissionName(buildPermission(module, action)),
            module,
            action,
            description: this.getPermissionDescription(module, action)
          });
        });
      });

      logger.info('获取所有权限成功', { count: permissions.length });
      return permissions;
    } catch (error) {
      logger.error('获取所有权限失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户列表（带角色信息）
   * @param {Object} filters - 过滤条件
   * @param {Object} pagination - 分页参数
   * @returns {Object} 用户列表
   */
  async getUsersWithRoles(filters = {}, pagination = {}) {
    try {
      const {
        role,
        status,
        keyword,
        page = 1,
        limit = 20
      } = filters;

      // 构建查询条件
      const query = {};
      if (role) query.role = role;
      if (status) query.status = status;
      if (keyword) {
        query.$or = [
          { username: { $regex: keyword, $options: 'i' } },
          { 'profile.firstName': { $regex: keyword, $options: 'i' } },
          { 'profile.lastName': { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } }
        ];
      }

      // 分页
      const skip = (page - 1) * limit;

      // 查询用户
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        User.countDocuments(query)
      ]);

      // 格式化用户列表
      const userList = users.map(user => ({
        id: user._id,
        username: user.username,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        email: user.email,
        phone: user.profile?.phone,
        role: user.role,
        roleName: this.getRoleName(user.role),
        status: user.status,
        villageId: user.villageId,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount
      }));

      return {
        success: true,
        data: userList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色权限统计
   * @returns {Object} 统计数据
   */
  async getPermissionStats() {
    try {
      const { PERMISSION_MODULES, ACTIONS } = require('../config/permissions');

      // 获取各角色用户数量
      const roleStats = {};
      Object.values(ROLES).forEach(role => {
        roleStats[role] = {
          name: this.getRoleName(role),
          userCount: 0,
          permissionCount: getRolePermissions(role).length
        };
      });

      // 统计各角色用户数
      const usersByRole = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);

      usersByRole.forEach(stat => {
        if (roleStats[stat._id]) {
          roleStats[stat._id].userCount = stat.count;
        }
      });

      // 统计总权限数
      const totalPermissions = Object.values(PERMISSION_MODULES).length * Object.values(ACTIONS).length;

      return {
        success: true,
        data: {
          totalRoles: Object.keys(ROLES).length,
          totalPermissions,
          roleStats: Object.values(roleStats)
        }
      };
    } catch (error) {
      logger.error('获取权限统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色名称
   * @param {string} role - 角色代码
   * @returns {string} 角色名称
   */
  getRoleName(role) {
    const roleNames = {
      [ROLES.SECRETARY]: '村支书',
      [ROLES.VILLAGE_HEAD]: '村主任',
      [ROLES.ACCOUNTANT]: '会计',
      [ROLES.POPULATION_ADMIN]: '人口主任',
      [ROLES.SECURITY_DIRECTOR]: '治保主任',
      [ROLES.RESIDENT]: '普通村民'
    };
    return roleNames[role] || role;
  }

  /**
   * 获取角色描述
   * @param {string} role - 角色代码
   * @returns {string} 角色描述
   */
  getRoleDescription(role) {
    const descriptions = {
      [ROLES.SECRETARY]: '拥有村庄管理所有权限，是村庄最高管理者',
      [ROLES.VILLAGE_HEAD]: '负责村庄日常管理和决策，拥有大部分管理权限',
      [ROLES.ACCOUNTANT]: '负责财务管理、报表生成、资金审批',
      [ROLES.POPULATION_ADMIN]: '负责村民档案管理、人口统计、分组管理',
      [ROLES.SECURITY_DIRECTOR]: '负责安全管理、应急事件处理、资源调配',
      [ROLES.RESIDENT]: '普通村民，拥有基础查看和个人信息修改权限'
    };
    return descriptions[role] || '';
  }

  /**
   * 获取权限描述
   * @param {string} module - 模块名
   * @param {string} action - 操作名
   * @returns {string} 权限描述
   */
  getPermissionDescription(module, action) {
    const descriptions = {
      resident: {
        read: '查看村民信息',
        create: '创建村民档案',
        update: '修改村民信息',
        delete: '删除村民档案'
      },
      population: {
        read: '查看人口数据',
        create: '添加人口记录',
        update: '修改人口数据',
        delete: '删除人口记录',
        export: '导出人口数据'
      },
      finance: {
        read: '查看财务信息',
        create: '创建财务记录',
        update: '修改财务记录',
        delete: '删除财务记录',
        approve: '审批财务申请',
        manage: '财务管理',
        export: '导出财务数据'
      },
      security: {
        read: '查看安全记录',
        create: '创建安全记录',
        update: '修改安全记录',
        delete: '删除安全记录'
      },
      emergency: {
        read: '查看应急事件',
        create: '上报应急事件',
        update: '更新应急事件',
        approve: '审批应急预案'
      },
      announcement: {
        read: '查看公告',
        create: '发布公告',
        update: '修改公告',
        delete: '删除公告'
      },
      task: {
        read: '查看任务',
        create: '创建任务',
        update: '更新任务',
        delete: '删除任务',
        assign: '分配任务'
      },
      group: {
        read: '查看分组',
        create: '创建分组',
        update: '修改分组',
        delete: '删除分组'
      },
      audit: {
        read: '查看审计日志'
      },
      committee: {
        create: '创建村委账号',
        update: '修改村委信息',
        delete: '删除村委账号'
      },
      profile: {
        update: '修改个人资料'
      },
      service: {
        read: '查看便民服务'
      },
      resource: {
        read: '查看资源',
        update: '管理资源'
      }
    };

    return descriptions[module]?.[action] || '';
  }

  /**
   * 批量修改用户角色
   * @param {Array} userIds - 用户ID数组
   * @param {string} newRole - 新角色
   * @param {string} operatorId - 操作者ID
   * @returns {Object} 修改结果
   */
  async batchChangeUserRole(userIds, newRole, operatorId) {
    try {
      if (!ROLES[newRole.toUpperCase()]) {
        throw new Error('角色不存在');
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('用户ID列表不能为空');
      }

      // 批量更新
      const result = await User.updateMany(
        { _id: { $in: userIds } },
        { role: newRole }
      );

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'UPDATE',
        resource: 'user_role',
        action: 'batch_change_role',
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: result.modifiedCount
        },
        dataChange: {
          changeType: 'role',
          newValue: newRole
        },
        metadata: {
          reason: '批量修改用户角色',
          permission: 'user_role:update',
          affectedUsers: userIds
        }
      });

      logger.info('批量修改用户角色成功', {
        count: result.modifiedCount,
        newRole,
        operatorId
      });

      return {
        success: true,
        modifiedCount: result.modifiedCount,
        message: `成功修改 ${result.modifiedCount} 个用户的角色`
      };
    } catch (error) {
      logger.error('批量修改用户角色失败:', error);
      throw error;
    }
  }

  /**
   * 修改用户状态
   * @param {string} userId - 用户ID
   * @param {string} status - 新状态 (active/inactive/suspended)
   * @param {string} operatorId - 操作者ID
   * @returns {Object} 修改结果
   */
  async changeUserStatus(userId, status, operatorId) {
    try {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        throw new Error('无效的用户状态');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const oldStatus = user.status;
      user.status = status;
      await user.save();

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'UPDATE',
        resource: 'user_status',
        action: 'change_status',
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        target: {
          userId: user._id,
          userName: user.username || user.profile?.firstName
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          changeType: 'status',
          oldValue: oldStatus,
          newValue: status
        },
        metadata: {
          reason: '管理员修改用户状态',
          permission: 'user_status:update'
        }
      });

      logger.info('用户状态修改成功', {
        userId,
        oldStatus,
        newStatus: status,
        operatorId
      });

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          oldStatus,
          newStatus: status
        },
        message: '用户状态修改成功'
      };
    } catch (error) {
      logger.error('用户状态修改失败:', error);
      throw error;
    }
  }
}

module.exports = new AdminPermissionService();
