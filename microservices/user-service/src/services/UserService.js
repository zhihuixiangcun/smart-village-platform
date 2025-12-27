/**
 * 用户服务层
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const Logger = require('../utils/Logger');

class UserService {
  constructor() {
    this.connection = null;
  }

  /**
   * 连接数据库
   */
  async connect() {
    try {
      const mongoURI = process.env.USER_DB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village_users';

      this.connection = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      Logger.info('用户服务数据库连接成功');

      // 确保系统角色存在
      await Role.createSystemRoles();

      return true;
    } catch (error) {
      Logger.error('用户服务数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      Logger.info('用户服务数据库连接已断开');
    }
  }

  /**
   * 检查数据库健康状态
   */
  async checkHealth() {
    try {
      if (!this.connection) {
        return 'disconnected';
      }

      await mongoose.connection.db.admin().ping();
      return 'connected';
    } catch (error) {
      Logger.error('数据库健康检查失败:', error);
      return 'error';
    }
  }

  /**
   * 创建用户
   */
  async createUser(userData, createdBy = null) {
    try {
      // 检查用户名和邮箱是否已存在
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username },
          { email: userData.email.toLowerCase() }
        ]
      });

      if (existingUser) {
        throw new Error('用户名或邮箱已存在');
      }

      // 创建用户
      const user = new User({
        ...userData,
        email: userData.email.toLowerCase(),
        createdBy,
        villageId: userData.villageId
      });

      // 分配默认角色
      if (!userData.roles || userData.roles.length === 0) {
        const defaultRole = await Role.findOne({ code: 'VILLAGER' });
        if (defaultRole) {
          user.roles.push(defaultRole._id);
        }
      }

      await user.save();

      // 更新角色用户计数
      if (user.roles && user.roles.length > 0) {
        await Role.updateMany(
          { _id: { $in: user.roles } },
          { $inc: { userCount: 1 } }
        );
      }

      Logger.info('用户创建成功', {
        userId: user._id,
        username: user.username,
        villageId: user.villageId
      });

      return user;
    } catch (error) {
      Logger.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId)
        .populate('roles')
        .lean();

      if (!user) {
        throw new Error('用户不存在');
      }

      return user;
    } catch (error) {
      Logger.error('获取用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, updateData, updatedBy = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 不允许更新敏感字段
      delete updateData.password;
      delete updateData.twoFactorAuth;
      delete updateData.sessions;

      // 更新邮箱时检查唯一性
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({
          email: updateData.email.toLowerCase(),
          _id: { $ne: userId }
        });

        if (existingUser) {
          throw new Error('邮箱已被使用');
        }

        updateData.email = updateData.email.toLowerCase();
      }

      // 更新用户名时检查唯一性
      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await User.findOne({
          username: updateData.username,
          _id: { $ne: userId }
        });

        if (existingUser) {
          throw new Error('用户名已被使用');
        }
      }

      Object.assign(user, updateData);
      user.updatedBy = updatedBy;
      user.updatedAt = new Date();

      await user.save();

      Logger.info('用户更新成功', {
        userId: user._id,
        updatedFields: Object.keys(updateData)
      });

      return user;
    } catch (error) {
      Logger.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证当前密码
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('当前密码不正确');
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      // 登出所有设备
      await user.logoutAll();

      Logger.info('用户密码修改成功', {
        userId: user._id
      });

      return true;
    } catch (error) {
      Logger.error('修改密码失败:', error);
      throw error;
    }
  }

  /**
   * 分配角色
   */
  async assignRoles(userId, roleIds, assignedBy = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证角色是否存在
      const roles = await Role.find({ _id: { $in: roleIds }, isActive: true });
      if (roles.length !== roleIds.length) {
        throw new Error('部分角色不存在或已禁用');
      }

      // 计算角色变化
      const oldRoleIds = user.roles.map(role => role.toString());
      const newRoleIds = roleIds.map(roleId => roleId.toString());

      const addedRoles = newRoleIds.filter(id => !oldRoleIds.includes(id));
      const removedRoles = oldRoleIds.filter(id => !newRoleIds.includes(id));

      // 更新用户角色
      user.roles = roleIds;
      user.updatedBy = assignedBy;
      await user.save();

      // 更新角色用户计数
      if (addedRoles.length > 0) {
        await Role.updateMany(
          { _id: { $in: addedRoles } },
          { $inc: { userCount: 1 } }
        );
      }

      if (removedRoles.length > 0) {
        await Role.updateMany(
          { _id: { $in: removedRoles } },
          { $inc: { userCount: -1 } }
        );
      }

      Logger.info('用户角色分配成功', {
        userId,
        addedRoles,
        removedRoles,
        assignedBy
      });

      return user;
    } catch (error) {
      Logger.error('分配角色失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户列表
   */
  async getUsers(filters = {}, options = {}) {
    try {
      const {
        villageId,
        isActive,
        search,
        role,
        createdAfter,
        createdBefore
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = {};

      // 构建查询条件
      if (villageId) {
        query.villageId = villageId;
      }

      if (isActive !== undefined) {
        query.isActive = isActive;
      }

      if (role) {
        query.roles = role;
      }

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
          { 'profile.phone': { $regex: search, $options: 'i' } }
        ];
      }

      if (createdAfter || createdBefore) {
        query.createdAt = {};
        if (createdAfter) {
          query.createdAt.$gte = new Date(createdAfter);
        }
        if (createdBefore) {
          query.createdAt.$lte = new Date(createdBefore);
        }
      }

      // 排序选项
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // 分页选项
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query)
          .populate('roles', 'name code description')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query)
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      Logger.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 启用/禁用用户
   */
  async toggleUserStatus(userId, isActive, updatedBy = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      user.isActive = isActive;
      user.updatedBy = updatedBy;

      if (!isActive) {
        // 禁用用户时登出所有设备
        await user.logoutAll();
      }

      await user.save();

      Logger.info('用户状态更新成功', {
        userId,
        isActive,
        updatedBy
      });

      return user;
    } catch (error) {
      Logger.error('更新用户状态失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId, deletedBy = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 更新角色用户计数
      if (user.roles && user.roles.length > 0) {
        await Role.updateMany(
          { _id: { $in: user.roles } },
          { $inc: { userCount: -1 } }
        );
      }

      // 软删除：禁用账户
      user.isActive = false;
      user.email = `deleted_${Date.now()}_${user.email}`;
      user.username = `deleted_${Date.now()}_${user.username}`;
      user.updatedBy = deletedBy;

      await user.save();

      Logger.info('用户删除成功', {
        userId,
        deletedBy
      });

      return true;
    } catch (error) {
      Logger.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 重置密码（管理员操作）
   */
  async resetPassword(userId, newPassword, resetBy = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      user.password = newPassword;
      await user.logoutAll();

      Logger.info('用户密码重置成功', {
        userId,
        resetBy
      });

      return true;
    } catch (error) {
      Logger.error('重置密码失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(villageId = null) {
    try {
      const [stats, recentUsers] = await Promise.all([
        User.getUserStats(villageId),
        User.find(villageId ? { villageId } : {})
          .sort({ createdAt: -1 })
          .limit(5)
          .select('username email createdAt isActive')
          .lean()
      ]);

      // 获取角色分布
      const roleDistribution = await User.aggregate([
        ...(villageId ? [{ $match: { villageId: new mongoose.Types.ObjectId(villageId) } }] : []),
        { $unwind: '$roles' },
        {
          $group: {
            _id: '$roles',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'roles',
            localField: '_id',
            foreignField: '_id',
            as: 'role'
          }
        },
        { $unwind: '$role' },
        {
          $project: {
            roleName: '$role.name',
            roleCode: '$role.code',
            count: 1
          }
        }
      ]);

      return {
        ...stats[0],
        roleDistribution,
        recentUsers
      };
    } catch (error) {
      Logger.error('获取用户统计失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作用户
   */
  async batchUpdateUsers(userIds, updateData, updatedBy = null) {
    try {
      const result = await User.updateMany(
        { _id: { $in: userIds } },
        {
          ...updateData,
          updatedBy,
          updatedAt: new Date()
        }
      );

      Logger.info('批量更新用户成功', {
        userIds,
        updatedCount: result.modifiedCount,
        updatedBy
      });

      return result;
    } catch (error) {
      Logger.error('批量更新用户失败:', error);
      throw error;
    }
  }
}

module.exports = UserService;