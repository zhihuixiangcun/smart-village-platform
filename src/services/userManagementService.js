/**
 * 用户管理服务
 * 提供用户CRUD、搜索、筛选、统计等功能
 */

const User = require('../models/User');
const { ROLES } = require('../config/permissions');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

class UserManagementService {
  /**
   * 获取用户列表
   * @param {Object} filters - 筛选条件
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 用户列表
   */
  async getUserList(filters = {}, pagination = {}) {
    try {
      const {
        role,
        status,
        keyword,
        villageId,
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;

      // 构建查询条件
      const query = {};

      // 角色筛选
      if (role) {
        query.role = role;
      }

      // 状态筛选
      if (status) {
        query.status = status;
      }

      // 村庄筛选
      if (villageId) {
        query.villageId = villageId;
      }

      // 关键词搜索
      if (keyword) {
        query.$or = [
          { username: { $regex: keyword, $options: 'i' } },
          { 'profile.firstName': { $regex: keyword, $options: 'i' } },
          { 'profile.lastName': { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } },
          { 'profile.phone': { $regex: keyword, $options: 'i' } }
        ];
      }

      // 查询用户
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        User.countDocuments(query)
      ]);

      logger.info('获取用户列表成功', {
        count: users.length,
        total,
        page,
        limit
      });

      return {
        success: true,
        data: users.map(user => ({
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          roleName: this.getRoleName(user.role),
          status: user.status,
          villageId: user.villageId,
          householdId: user.householdId,
          profile: user.profile,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          loginCount: user.loginCount
        })),
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
   * 获取用户详情
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户详情
   */
  async getUserDetail(userId) {
    try {
      const user = await User.findById(userId).select('-password');

      if (!user) {
        throw new Error('用户不存在');
      }

      logger.info('获取用户详情成功', { userId });

      return {
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          roleName: this.getRoleName(user.role),
          status: user.status,
          villageId: user.villageId,
          householdId: user.householdId,
          householdCodeId: user.householdCodeId,
          profile: user.profile,
          committeeProfile: user.committeeProfile,
          voiceSettings: user.voiceSettings,
          faceSettings: user.faceSettings,
          securitySettings: user.securitySettings,
          notificationPreferences: user.notificationPreferences,
          offlineSettings: user.offlineSettings,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          loginCount: user.loginCount
        }
      };
    } catch (error) {
      logger.error('获取用户详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 创建结果
   */
  async createUser(userData, operatorId) {
    try {
      // 检查用户名是否已存在
      const existingUser = await User.findOne({
        username: userData.username
      });

      if (existingUser) {
        throw new Error('用户名已存在');
      }

      // 检查邮箱是否已存在
      if (userData.email) {
        const existingEmail = await User.findOne({
          email: userData.email.toLowerCase()
        });

        if (existingEmail) {
          throw new Error('邮箱已被使用');
        }
      }

      // 检查手机号是否已存在
      if (userData.profile?.phone) {
        const existingPhone = await User.findOne({
          'profile.phone': userData.profile.phone
        });

        if (existingPhone) {
          throw new Error('手机号已被使用');
        }
      }

      // 创建用户
      const user = new User({
        ...userData,
        status: 'active'
      });

      await user.save();

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'CREATE',
        resource: 'user',
        action: 'create_user',
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        target: {
          userId: user._id,
          userName: user.username
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          changeType: 'create',
          newValue: {
            username: user.username,
            role: user.role,
            status: user.status
          }
        },
        metadata: {
          reason: '管理员创建用户',
          permission: 'user:create'
        }
      });

      logger.info('创建用户成功', {
        userId: user._id,
        username: user.username,
        operatorId
      });

      return {
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        message: '用户创建成功'
      };
    } catch (error) {
      logger.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户
   * @param {string} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 更新结果
   */
  async updateUser(userId, updateData, operatorId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查敏感字段修改权限
      const sensitiveFields = ['idCard', 'password', 'role'];
      const hasSensitiveUpdate = Object.keys(updateData).some(field =>
        sensitiveFields.includes(field)
      );

      // 如果修改了手机号，检查是否冲突
      if (updateData.profile?.phone) {
        const existingPhone = await User.findOne({
          'profile.phone': updateData.profile.phone,
          _id: { $ne: userId }
        });

        if (existingPhone) {
          throw new Error('手机号已被使用');
        }
      }

      // 如果修改了邮箱，检查是否冲突
      if (updateData.email) {
        const existingEmail = await User.findOne({
          email: updateData.email.toLowerCase(),
          _id: { $ne: userId }
        });

        if (existingEmail) {
          throw new Error('邮箱已被使用');
        }
      }

      // 记录旧值（用于审计）
      const oldValues = {
        username: user.username,
        role: user.role,
        status: user.status,
        profile: user.profile
      };

      // 更新用户
      Object.assign(user, updateData);
      await user.save();

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'UPDATE',
        resource: 'user',
        action: 'update_user',
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        target: {
          userId: user._id,
          userName: user.username
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          changeType: 'update',
          oldValue: oldValues,
          newValue: {
            username: user.username,
            role: user.role,
            status: user.status,
            profile: user.profile
          }
        },
        metadata: {
          reason: '管理员更新用户',
          permission: 'user:update',
          fieldsChanged: Object.keys(updateData).join(', ')
        }
      });

      logger.info('更新用户成功', {
        userId,
        fieldsChanged: Object.keys(updateData),
        operatorId
      });

      return {
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        message: '用户更新成功'
      };
    } catch (error) {
      logger.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户
   * @param {string} userId - 用户ID
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteUser(userId, operatorId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('用户不存在');
      }

      // 不能删除自己
      if (userId === operatorId) {
        throw new Error('不能删除自己');
      }

      // 软删除（设置状态为inactive）
      user.status = 'inactive';
      user.deletedAt = new Date();
      await user.save();

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'DELETE',
        resource: 'user',
        action: 'delete_user',
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        target: {
          userId: user._id,
          userName: user.username,
          userRole: user.role
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          changeType: 'delete',
          oldValue: {
            username: user.username,
            role: user.role,
            status: user.status
          }
        },
        metadata: {
          reason: '管理员删除用户',
          permission: 'user:delete',
          hardDelete: false
        }
      });

      logger.info('删除用户成功', {
        userId,
        operatorId
      });

      return {
        success: true,
        data: {
          userId: user._id,
          username: user.username
        },
        message: '用户删除成功'
      };
    } catch (error) {
      logger.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 修改用户状态
   * @param {string} userId - 用户ID
   * @param {string} status - 新状态 (active/inactive/suspended)
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 修改结果
   */
  async changeUserStatus(userId, status, operatorId) {
    try {
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
          userName: user.username
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
        data: {
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

  /**
   * 重置用户密码
   * @param {string} userId - 用户ID
   * @param {string} newPassword - 新密码
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 重置结果
   */
  async resetUserPassword(userId, newPassword, operatorId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('用户不存在');
      }

      // 加密新密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      const oldPassword = user.password;
      user.password = hashedPassword;
      await user.save();

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'UPDATE',
        resource: 'user_password',
        action: 'reset_password',
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        target: {
          userId: user._id,
          userName: user.username
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          changeType: 'password_reset',
          newValue: {
            passwordReset: true,
            operatorId
          }
        },
        metadata: {
          reason: '管理员重置用户密码',
          permission: 'user_password:reset'
        }
      });

      logger.info('用户密码重置成功', {
        userId,
        operatorId
      });

      return {
        success: true,
        data: {
          id: user._id,
          username: user.username
        },
        message: '密码重置成功'
      };
    } catch (error) {
      logger.error('用户密码重置失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计
   * @returns {Promise<Object>} 统计数据
   */
  async getUserStats(filters = {}) {
    try {
      const { role, status, villageId } = filters;

      const query = {};
      if (role) query.role = role;
      if (status) query.status = status;
      if (villageId) query.villageId = villageId;

      // 按角色统计
      const roleStats = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            activeCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
              }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // 按状态统计
      const statusStats = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // 按村庄统计
      const villageStats = await User.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$villageId',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        { $limit: 10 }
      ]);

      // 近7天活跃用户
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activeUsersCount = await User.countDocuments({
        ...query,
        status: 'active',
        lastLoginAt: { $gte: sevenDaysAgo }
      });

      // 总数
      const totalUsers = await User.countDocuments(query);

      logger.info('获取用户统计成功', {
        totalUsers,
        activeUsersCount
      });

      return {
        success: true,
        data: {
          total: totalUsers,
          active: activeUsersCount,
          activeRate: totalUsers > 0 ? ((activeUsersCount / totalUsers) * 100).toFixed(2) : 0,
          roleStats: roleStats.map(stat => ({
            role: stat._id,
            roleName: this.getRoleName(stat._id),
            count: stat.count,
            activeCount: stat.activeCount
          })),
          statusStats: statusStats.map(stat => ({
            status: stat._id,
            statusName: this.getStatusName(stat._id),
            count: stat.count
          })),
          villageStats: villageStats.map(stat => ({
            villageId: stat._id,
            count: stat.count
          }))
        }
      };
    } catch (error) {
      logger.error('获取用户统计失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作用户
   * @param {Array} userIds - 用户ID数组
   * @param {string} operation - 操作类型 (activate/inactivate/suspend)
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 批量操作结果
   */
  async batchOperateUsers(userIds, operation, operatorId) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('用户ID列表不能为空');
      }

      const validOperations = ['activate', 'inactivate', 'suspend'];
      if (!validOperations.includes(operation)) {
        throw new Error('无效的操作类型');
      }

      const newStatus = operation === 'activate' ? 'active' :
                       operation === 'inactivate' ? 'inactive' : 'suspended';

      // 批量更新
      const result = await User.updateMany(
        { _id: { $in: userIds } },
        { status: newStatus }
      );

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'UPDATE',
        resource: 'user_batch',
        action: `batch_${operation}`,
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: result.modifiedCount
        },
        dataChange: {
          changeType: 'batch_status_change',
          newValue: {
            operation,
            newStatus
          }
        },
        metadata: {
          reason: '管理员批量操作用户',
          permission: 'user:batch_operate',
          affectedUsers: userIds
        }
      });

      logger.info('批量操作用户成功', {
        count: result.modifiedCount,
        operation,
        operatorId
      });

      return {
        success: true,
        modifiedCount: result.modifiedCount,
        message: `成功批量${operation === 'activate' ? '启用' : operation === 'inactivate' ? '禁用' : '暂停'} ${result.modifiedCount} 个用户`
      };
    } catch (error) {
      logger.error('批量操作用户失败:', error);
      throw error;
    }
  }

  /**
   * 导出用户列表
   * @param {Object} filters - 筛选条件
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 导出结果
   */
  async exportUsers(filters = {}, operatorId) {
    try {
      const result = await this.getUserList(filters, { limit: 10000 });

      // 记录审计日志
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        operation: 'EXPORT',
        resource: 'user_list',
        action: 'export',
        actor: {
          userId: operatorId,
          userName: '管理员'
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: result.data.length
        },
        metadata: {
          reason: '管理员导出用户列表',
          permission: 'user:export',
          filters
        }
      });

      logger.info('导出用户列表成功', {
        count: result.data.length,
        operatorId
      });

      return {
        success: true,
        data: result.data,
        total: result.pagination.total,
        message: '用户列表导出成功'
      };
    } catch (error) {
      logger.error('导出用户列表失败:', error);
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
      [ROLES.RESIDENT]: '普通村民',
      'admin': '管理员',
      'village_official': '村委干部',
      'township_official': '乡镇干部',
      'resident': '村民',
      'purchaser': '采购商'
    };
    return roleNames[role] || role;
  }

  /**
   * 获取状态名称
   * @param {string} status - 状态代码
   * @returns {string} 状态名称
   */
  getStatusName(status) {
    const statusNames = {
      'active': '活跃',
      'inactive': '未激活',
      'suspended': '已暂停'
    };
    return statusNames[status] || status;
  }

  /**
   * 搜索用户
   * @param {Object} options - 搜索选项
   * @returns {Promise<Object>} 搜索结果
   */
  async searchUsers(options = {}) {
    try {
      const {
        keyword,
        role,
        status,
        villageId,
        page = 1,
        limit = 20
      } = options;

      const filters = {
        keyword,
        role,
        status,
        villageId,
        page,
        limit
      };

      return await this.getUserList(filters);
    } catch (error) {
      logger.error('搜索用户失败:', error);
      throw error;
    }
  }
}

module.exports = new UserManagementService();
