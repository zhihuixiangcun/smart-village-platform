/**
 * 管理员权限管理控制器
 * 处理角色管理、用户角色分配、权限查看等操作
 */

const adminPermissionService = require('../services/adminPermissionService');
const logger = require('../utils/logger');

/**
 * 获取所有角色列表
 */
async function getAllRoles(req, res) {
  try {
    const roles = adminPermissionService.getAllRoles();

    res.json({
      success: true,
      data: roles,
      message: '获取角色列表成功'
    });
  } catch (error) {
    logger.error('获取角色列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ROLES_FAILED',
      message: '获取角色列表失败',
      details: error.message
    });
  }
}

/**
 * 获取角色的所有权限
 */
async function getRolePermissions(req, res) {
  try {
    const { role } = req.params;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ROLE',
        message: '缺少角色参数'
      });
    }

    const permissions = adminPermissionService.getRolePermissionsList(role);

    res.json({
      success: true,
      data: permissions,
      message: '获取角色权限成功'
    });
  } catch (error) {
    logger.error('获取角色权限失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_PERMISSIONS_FAILED',
      message: error.message || '获取角色权限失败'
    });
  }
}

/**
 * 修改用户角色
 */
async function changeUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;
    const operatorId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: '缺少用户ID参数'
      });
    }

    if (!newRole) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ROLE',
        message: '缺少角色参数'
      });
    }

    const result = await adminPermissionService.changeUserRole(userId, newRole, operatorId);

    res.json(result);
  } catch (error) {
    logger.error('修改用户角色失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'CHANGE_ROLE_FAILED',
      message: error.message || '修改用户角色失败'
    });
  }
}

/**
 * 获取所有权限
 */
async function getAllPermissions(req, res) {
  try {
    const permissions = adminPermissionService.getAllPermissions();

    res.json({
      success: true,
      data: permissions,
      message: '获取所有权限成功'
    });
  } catch (error) {
    logger.error('获取所有权限失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_PERMISSIONS_FAILED',
      message: '获取所有权限失败',
      details: error.message
    });
  }
}

/**
 * 获取用户列表
 */
async function getUsers(req, res) {
  try {
    const { role, status, keyword, page, limit } = req.query;

    const filters = {
      role,
      status,
      keyword,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20
    };

    const result = await adminPermissionService.getUsersWithRoles(filters);

    res.json(result);
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_USERS_FAILED',
      message: '获取用户列表失败',
      details: error.message
    });
  }
}

/**
 * 获取权限统计
 */
async function getPermissionStats(req, res) {
  try {
    const stats = await adminPermissionService.getPermissionStats();

    res.json(stats);
  } catch (error) {
    logger.error('获取权限统计失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_STATS_FAILED',
      message: '获取权限统计失败',
      details: error.message
    });
  }
}

/**
 * 批量修改用户角色
 */
async function batchChangeUserRole(req, res) {
  try {
    const { userIds, newRole } = req.body;
    const operatorId = req.user._id;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_IDS',
        message: '缺少用户ID数组'
      });
    }

    if (!newRole) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ROLE',
        message: '缺少角色参数'
      });
    }

    const result = await adminPermissionService.batchChangeUserRole(userIds, newRole, operatorId);

    res.json(result);
  } catch (error) {
    logger.error('批量修改用户角色失败:', error);
    const statusCode = error.message.includes('不存在') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'BATCH_CHANGE_ROLE_FAILED',
      message: error.message || '批量修改用户角色失败'
    });
  }
}

/**
 * 修改用户状态
 */
async function changeUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const operatorId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: '缺少用户ID参数'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_STATUS',
        message: '缺少状态参数'
      });
    }

    const result = await adminPermissionService.changeUserStatus(userId, status, operatorId);

    res.json(result);
  } catch (error) {
    logger.error('修改用户状态失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 :
                       error.message.includes('无效') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'CHANGE_STATUS_FAILED',
      message: error.message || '修改用户状态失败'
    });
  }
}

/**
 * 获取单个用户信息
 */
async function getUserDetail(req, res) {
  try {
    const { userId } = req.params;
    const User = require('../models/User');

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在'
      });
    }

    // 获取用户权限
    const { getRolePermissions } = require('../config/permissions');
    const permissions = getRolePermissions(user.role);

    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        email: user.email,
        phone: user.profile?.phone,
        avatar: user.profile?.avatar,
        role: user.role,
        roleName: adminPermissionService.getRoleName(user.role),
        status: user.status,
        villageId: user.villageId,
        householdId: user.householdId,
        permissions,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount
      }
    });
  } catch (error) {
    logger.error('获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_USER_FAILED',
      message: '获取用户详情失败',
      details: error.message
    });
  }
}

module.exports = {
  getAllRoles,
  getRolePermissions,
  changeUserRole,
  getAllPermissions,
  getUsers,
  getPermissionStats,
  batchChangeUserRole,
  changeUserStatus,
  getUserDetail
};
