/**
 * 权限服务层
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const Logger = require('../utils/Logger');

class PermissionService {
  constructor() {
    this.connection = null;
  }

  /**
   * 连接数据库
   */
  async connect() {
    try {
      if (!this.connection) {
        const mongoURI = process.env.USER_DB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village_users';
        this.connection = await mongoose.createConnection(mongoURI);
        Logger.info('权限服务数据库连接成功');
      }
      return this.connection;
    } catch (error) {
      Logger.error('权限服务数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户权限
   */
  async checkPermission(userId, resource, action, context = {}) {
    try {
      // 获取用户及其角色
      const user = await User.findById(userId).populate('roles');
      if (!user || !user.isActive) {
        return false;
      }

      // 检查用户直接权限
      if (user.hasPermission(resource, action)) {
        return true;
      }

      // 检查角色权限
      for (const role of user.roles) {
        if (!role.isActive) continue;

        const roleDoc = await Role.findById(role._id);
        if (roleDoc && roleDoc.hasPermission(resource, action, {
          ...context,
          userId,
          villageId: user.villageId
        })) {
          return true;
        }
      }

      return false;
    } catch (error) {
      Logger.error('权限检查失败:', error);
      return false;
    }
  }

  /**
   * 获取用户所有权限
   */
  async getUserPermissions(userId) {
    try {
      const user = await User.findById(userId).populate('roles');
      if (!user) {
        throw new Error('用户不存在');
      }

      const permissions = new Set();

      // 收集用户直接权限
      user.permissions.forEach(permission => {
        permission.actions.forEach(action => {
          permissions.add(`${permission.resource}:${action}`);
        });
      });

      // 收集角色权限
      for (const role of user.roles) {
        const roleDoc = await Role.findById(role._id);
        if (roleDoc && roleDoc.isActive) {
          const allPermissions = await roleDoc.getAllPermissions();
          allPermissions.forEach(permission => {
            permission.actions.forEach(action => {
              permissions.add(`${permission.resource}:${action}`);
            });
          });
        }
      }

      return Array.from(permissions);
    } catch (error) {
      Logger.error('获取用户权限失败:', error);
      throw error;
    }
  }

  /**
   * 添加用户权限
   */
  async addUserPermission(userId, resource, actions, addedBy = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      await user.addPermission(resource, actions);

      Logger.info('用户权限添加成功', {
        userId,
        resource,
        actions,
        addedBy
      });

      return true;
    } catch (error) {
      Logger.error('添加用户权限失败:', error);
      throw error;
    }
  }

  /**
   * 移除用户权限
   */
  async removeUserPermission(userId, resource, action) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      user.permissions = user.permissions.filter(permission => {
        if (permission.resource === resource) {
          if (action) {
            permission.actions = permission.actions.filter(a => a !== action);
            return permission.actions.length > 0;
          }
          return false;
        }
        return true;
      });

      await user.save();

      Logger.info('用户权限移除成功', {
        userId,
        resource,
        action
      });

      return true;
    } catch (error) {
      Logger.error('移除用户权限失败:', error);
      throw error;
    }
  }

  /**
   * 创建角色
   */
  async createRole(roleData, createdBy = null) {
    try {
      const role = new Role({
        ...roleData,
        createdBy,
        villageId: roleData.villageId || null
      });

      await role.save();

      Logger.info('角色创建成功', {
        roleId: role._id,
        roleName: role.name,
        roleCode: role.code,
        createdBy
      });

      return role;
    } catch (error) {
      Logger.error('创建角色失败:', error);
      throw error;
    }
  }

  /**
   * 更新角色
   */
  async updateRole(roleId, updateData, updatedBy = null) {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        throw new Error('角色不存在');
      }

      if (role.isSystem) {
        throw new Error('系统角色不能修改');
      }

      Object.assign(role, updateData);
      role.updatedBy = updatedBy;
      role.updatedAt = new Date();

      await role.save();

      Logger.info('角色更新成功', {
        roleId,
        updatedFields: Object.keys(updateData),
        updatedBy
      });

      return role;
    } catch (error) {
      Logger.error('更新角色失败:', error);
      throw error;
    }
  }

  /**
   * 删除角色
   */
  async deleteRole(roleId, deletedBy = null) {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        throw new Error('角色不存在');
      }

      if (role.isSystem) {
        throw new Error('系统角色不能删除');
      }

      if (role.userCount > 0) {
        throw new Error('角色下还有用户，无法删除');
      }

      await Role.findByIdAndDelete(roleId);

      Logger.info('角色删除成功', {
        roleId,
        roleName: role.name,
        deletedBy
      });

      return true;
    } catch (error) {
      Logger.error('删除角色失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色列表
   */
  async getRoles(filters = {}, options = {}) {
    try {
      const {
        villageId,
        type,
        scope,
        isActive,
        search
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = {};

      if (villageId) {
        query.villageId = villageId;
      }

      if (type) {
        query.type = type;
      }

      if (scope) {
        query.scope = scope;
      }

      if (isActive !== undefined) {
        query.isActive = isActive;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      const skip = (page - 1) * limit;

      const [roles, total] = await Promise.all([
        Role.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Role.countDocuments(query)
      ]);

      return {
        roles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      Logger.error('获取角色列表失败:', error);
      throw error;
    }
  }

  /**
   * 添加角色权限
   */
  async addRolePermission(roleId, resource, actions, conditions = []) {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        throw new Error('角色不存在');
      }

      if (role.isSystem) {
        throw new Error('系统角色权限不能修改');
      }

      await role.addPermission(resource, actions, conditions);

      Logger.info('角色权限添加成功', {
        roleId,
        resource,
        actions,
        conditions
      });

      return true;
    } catch (error) {
      Logger.error('添加角色权限失败:', error);
      throw error;
    }
  }

  /**
   * 移除角色权限
   */
  async removeRolePermission(roleId, resource, action) {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        throw new Error('角色不存在');
      }

      if (role.isSystem) {
        throw new Error('系统角色权限不能修改');
      }

      await role.removePermission(resource, action);

      Logger.info('角色权限移除成功', {
        roleId,
        resource,
        action
      });

      return true;
    } catch (error) {
      Logger.error('移除角色权限失败:', error);
      throw error;
    }
  }

  /**
   * 获取权限统计
   */
  async getPermissionStats(villageId = null) {
    try {
      const [roleStats, userStats] = await Promise.all([
        Role.getRoleStats(villageId),
        User.getUserStats(villageId)
      ]);

      // 获取权限分布
      const permissionDistribution = await Role.aggregate([
        ...(villageId ? [{ $match: { villageId: new mongoose.Types.ObjectId(villageId) } }] : []),
        { $unwind: '$permissions' },
        {
          $group: {
            _id: '$permissions.resource',
            count: { $sum: 1 },
            actions: { $addToSet: '$permissions.actions' }
          }
        },
        {
          $project: {
            resource: '$_id',
            count: 1,
            uniqueActions: { $size: { $reduce: { input: '$actions', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } } }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        roleStats: roleStats[0] || {},
        userStats: userStats[0] || {},
        permissionDistribution
      };
    } catch (error) {
      Logger.error('获取权限统计失败:', error);
      throw error;
    }
  }

  /**
   * 批量分配角色
   */
  async batchAssignRoles(userIds, roleIds, assignedBy = null) {
    try {
      const results = [];

      for (const userId of userIds) {
        try {
          const user = await User.findById(userId);
          if (user) {
            await user.roles.push(...roleIds.filter(roleId => !user.roles.includes(roleId)));
            await user.save();
            results.push({ userId, success: true });
          } else {
            results.push({ userId, success: false, error: '用户不存在' });
          }
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
        }
      }

      // 更新角色用户计数
      await Role.updateMany(
        { _id: { $in: roleIds } },
        { $inc: { userCount: userIds.length } }
      );

      Logger.info('批量分配角色完成', {
        userIds,
        roleIds,
        successCount: results.filter(r => r.success).length,
        assignedBy
      });

      return results;
    } catch (error) {
      Logger.error('批量分配角色失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否有任一权限
   */
  async hasAnyPermission(userId, permissions) {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissions.some(permission => userPermissions.includes(permission));
    } catch (error) {
      Logger.error('检查任一权限失败:', error);
      return false;
    }
  }

  /**
   * 检查用户是否有所有权限
   */
  async hasAllPermissions(userId, permissions) {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissions.every(permission => userPermissions.includes(permission));
    } catch (error) {
      Logger.error('检查所有权限失败:', error);
      return false;
    }
  }
}

module.exports = PermissionService;