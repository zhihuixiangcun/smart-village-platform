const VillageUser = require('../models/VillageUser');
const Village = require('../models/Village');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

// 用户注册
exports.register = async (req, res) => {
  try {
    const { name, phone, idCard, villageId, role = 'resident', password } = req.body;

    // 检查手机号是否已存在
    const existingUser = await VillageUser.findByPhone(phone);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '该手机号已被注册'
      });
    }

    // 检查村庄是否存在
    const village = await Village.findById(villageId);
    if (!village) {
      return res.status(400).json({
        success: false,
        message: '村庄不存在'
      });
    }

    // 创建用户
    const user = new VillageUser({
      name,
      phone,
      idCard,
      villageId,
      villageName: village.name,
      role,
      password: password || phone.slice(-6), // 默认密码为手机号后6位
      createdBy: req.user?.id
    });

    // 根据角色设置默认权限
    if (role === 'village_head' || role === 'village_director') {
      user.level = 'admin';
      user.permissions = [
        { module: 'document_management', actions: ['create', 'read', 'update', 'delete', 'approve'] },
        { module: 'duty_management', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'user_management', actions: ['create', 'read', 'update', 'delete'] },
        { module: 'village_overview', actions: ['read'] },
        { module: 'statistics_analysis', actions: ['read', 'export'] }
      ];
    } else if (role === 'staff' || role === 'committee_member') {
      user.level = 'operator';
      user.permissions = [
        { module: 'document_management', actions: ['create', 'read', 'update'] },
        { module: 'duty_management', actions: ['read'] },
        { module: 'village_overview', actions: ['read'] }
      ];
    }

    await user.save();

    // 发送实时通知给管理员
    req.io.emit('user_registered', {
      userId: user._id,
      name: user.name,
      role: user.role,
      villageName: user.villageName,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: '用户注册成功',
      data: {
        userId: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        employeeId: user.employeeId
      }
    });
  } catch (error) {
    logger.error('用户注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { phone, password, deviceId, deviceType, platform } = req.body;

    // 查找用户
    const user = await VillageUser.findByPhone(phone);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查用户状态
    if (!user.isActive || user.workStatus !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户账号已被禁用'
      });
    }

    // 验证密码
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }

    // 生成JWT令牌
    const token = user.generateToken();

    // 记录登录信息
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await user.addLoginRecord(ip, userAgent, req.body.location || '');

    // 添加设备信息
    if (deviceId) {
      await user.addDevice({
        deviceId,
        deviceType: deviceType || 'mobile',
        platform: platform || 'unknown'
      });
    }

    // 发送在线状态
    req.io.emit('user_online', {
      userId: user._id,
      name: user.name,
      role: user.role,
      villageId: user.villageId
    });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          userId: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          level: user.level,
          villageId: user.villageId,
          villageName: user.villageName,
          avatar: user.avatar,
          position: user.position,
          permissions: user.permissions
        }
      }
    });
  } catch (error) {
    logger.error('用户登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
};

// 获取用户信息
exports.getUserProfile = async (req, res) => {
  try {
    const user = await VillageUser.findById(req.user.userId)
      .populate('villageId', 'name code address')
      .select('-password -faceFeatures');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
};

// 更新用户信息
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, avatar, position, notificationSettings } = req.body;

    const user = await VillageUser.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新允许修改的字段
    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;
    if (position) user.position = position;
    if (notificationSettings) {
      user.notificationSettings = { ...user.notificationSettings, ...notificationSettings };
    }

    await user.save();

    res.json({
      success: true,
      message: '更新成功',
      data: user
    });
  } catch (error) {
    logger.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败',
      error: error.message
    });
  }
};

// 修改密码
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await VillageUser.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证旧密码
    const isValidPassword = await user.comparePassword(oldPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: '旧密码错误'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    // 发送通知
    req.io.emit('password_changed', {
      userId: user._id,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    logger.error('修改密码失败:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败',
      error: error.message
    });
  }
};

// 用户登出
exports.logout = async (req, res) => {
  try {
    const user = await VillageUser.findById(req.user.userId);
    if (user) {
      await user.addLogoutRecord();

      // 发送离线状态
      req.io.emit('user_offline', {
        userId: user._id,
        name: user.name,
        villageId: user.villageId
      });
    }

    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    logger.error('用户登出失败:', error);
    res.status(500).json({
      success: false,
      message: '登出失败',
      error: error.message
    });
  }
};

// 获取村庄用户列表
exports.getVillageUsers = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { role, workStatus, page = 1, limit = 20, search } = req.query;

    // 构建查询条件
    const query = { villageId, isActive: true };
    if (role) query.role = role;
    if (workStatus) query.workStatus = workStatus;

    // 搜索功能
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      select: '-password -faceFeatures -loginHistory'
    };

    const users = await VillageUser.paginate(query, options);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
};

// 获取在线用户
exports.getOnlineUsers = async (req, res) => {
  try {
    const { villageId } = req.params;

    const onlineUsers = await VillageUser.getOnlineUsers(villageId);

    res.json({
      success: true,
      data: onlineUsers
    });
  } catch (error) {
    logger.error('获取在线用户失败:', error);
    res.status(500).json({
      success: false,
      message: '获取在线用户失败',
      error: error.message
    });
  }
};

// 获取用户工作统计
exports.getUserWorkStats = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { startDate, endDate } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const stats = await VillageUser.getWorkStatistics(villageId, start, end);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取工作统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
};

// 更新用户状态（管理员功能）
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { workStatus, isActive } = req.body;

    const user = await VillageUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (workStatus !== undefined) user.workStatus = workStatus;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // 发送通知
    req.io.emit('user_status_updated', {
      userId: user._id,
      workStatus: user.workStatus,
      isActive: user.isActive,
      updatedBy: req.user.name
    });

    res.json({
      success: true,
      message: '用户状态更新成功',
      data: user
    });
  } catch (error) {
    logger.error('更新用户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败',
      error: error.message
    });
  }
};

// 分配权限
exports.assignPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    const user = await VillageUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    user.permissions = permissions;
    await user.save();

    res.json({
      success: true,
      message: '权限分配成功',
      data: user.permissions
    });
  } catch (error) {
    logger.error('分配权限失败:', error);
    res.status(500).json({
      success: false,
      message: '分配权限失败',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getUserProfile,
  updateProfile,
  changePassword,
  logout,
  getVillageUsers,
  getOnlineUsers,
  getUserWorkStats,
  updateUserStatus,
  assignPermissions
};