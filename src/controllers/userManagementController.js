/**
 * 用户管理控制器
 * 处理用户CRUD、搜索、筛选、统计、批量操作等操作
 */

const userManagementService = require('../services/userManagementService');
const logger = require('../utils/logger');

/**
 * 获取用户列表
 */
async function getUsers(req, res) {
  try {
    const filters = {
      role: req.query.role,
      status: req.query.status,
      keyword: req.query.keyword,
      villageId: req.query.villageId,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const result = await userManagementService.getUserList(filters);
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
 * 获取用户详情
 */
async function getUserDetail(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: '缺少用户ID参数'
      });
    }

    const result = await userManagementService.getUserDetail(userId);
    res.json(result);
  } catch (error) {
    logger.error('获取用户详情失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'FETCH_USER_FAILED',
      message: error.message || '获取用户详情失败'
    });
  }
}

/**
 * 创建用户
 */
async function createUser(req, res) {
  try {
    const userData = req.body;
    const operatorId = req.user?._id || 'system';

    if (!userData.username) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USERNAME',
        message: '缺少用户名'
      });
    }

    if (!userData.password) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PASSWORD',
        message: '缺少密码'
      });
    }

    if (!userData.role) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ROLE',
        message: '缺少角色'
      });
    }

    const result = await userManagementService.createUser(userData, operatorId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('创建用户失败:', error);
    const statusCode = error.message.includes('已存在') ? 409 :
                       error.message.includes('已被使用') ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'CREATE_USER_FAILED',
      message: error.message || '创建用户失败'
    });
  }
}

/**
 * 更新用户
 */
async function updateUser(req, res) {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    const operatorId = req.user?._id || 'system';

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: '缺少用户ID参数'
      });
    }

    // 不允许通过此接口直接修改密码（使用专门的密码重置接口）
    delete updateData.password;
    delete updateData.idCard;

    const result = await userManagementService.updateUser(userId, updateData, operatorId);
    res.json(result);
  } catch (error) {
    logger.error('更新用户失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 :
                       error.message.includes('已被使用') ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'UPDATE_USER_FAILED',
      message: error.message || '更新用户失败'
    });
  }
}

/**
 * 删除用户
 */
async function deleteUser(req, res) {
  try {
    const { userId } = req.params;
    const operatorId = req.user?._id || 'system';

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: '缺少用户ID参数'
      });
    }

    const result = await userManagementService.deleteUser(userId, operatorId);
    res.json(result);
  } catch (error) {
    logger.error('删除用户失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 :
                       error.message.includes('不能删除') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'DELETE_USER_FAILED',
      message: error.message || '删除用户失败'
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
    const operatorId = req.user?._id || 'system';

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

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: '无效的状态值'
      });
    }

    const result = await userManagementService.changeUserStatus(userId, status, operatorId);
    res.json(result);
  } catch (error) {
    logger.error('修改用户状态失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'CHANGE_STATUS_FAILED',
      message: error.message || '修改用户状态失败'
    });
  }
}

/**
 * 修改用户角色
 */
async function changeUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const operatorId = req.user?._id || 'system';

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: '缺少用户ID参数'
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ROLE',
        message: '缺少角色参数'
      });
    }

    const result = await userManagementService.updateUser(userId, { role }, operatorId);
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
 * 重置用户密码
 */
async function resetPassword(req, res) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const operatorId = req.user?._id || 'system';

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: '缺少用户ID参数'
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PASSWORD',
        message: '缺少新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_TOO_SHORT',
        message: '密码长度不能少于6位'
      });
    }

    const result = await userManagementService.resetUserPassword(userId, newPassword, operatorId);
    res.json(result);
  } catch (error) {
    logger.error('重置用户密码失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'RESET_PASSWORD_FAILED',
      message: error.message || '重置用户密码失败'
    });
  }
}

/**
 * 获取用户统计
 */
async function getUserStats(req, res) {
  try {
    const filters = {
      role: req.query.role,
      status: req.query.status,
      villageId: req.query.villageId
    };

    const result = await userManagementService.getUserStats(filters);
    res.json(result);
  } catch (error) {
    logger.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_STATS_FAILED',
      message: '获取用户统计失败',
      details: error.message
    });
  }
}

/**
 * 批量操作用户
 */
async function batchOperate(req, res) {
  try {
    const { userIds, operation } = req.body;
    const operatorId = req.user?._id || 'system';

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_IDS',
        message: '缺少用户ID数组'
      });
    }

    if (!operation) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_OPERATION',
        message: '缺少操作类型'
      });
    }

    const result = await userManagementService.batchOperateUsers(userIds, operation, operatorId);
    res.json(result);
  } catch (error) {
    logger.error('批量操作用户失败:', error);
    const statusCode = error.message.includes('无效') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'BATCH_OPERATE_FAILED',
      message: error.message || '批量操作用户失败'
    });
  }
}

/**
 * 导出用户列表
 */
async function exportUsers(req, res) {
  try {
    const filters = {
      role: req.query.role,
      status: req.query.status,
      keyword: req.query.keyword,
      villageId: req.query.villageId
    };

    const operatorId = req.user?._id || 'system';
    const result = await userManagementService.exportUsers(filters, operatorId);

    res.json(result);
  } catch (error) {
    logger.error('导出用户列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'EXPORT_FAILED',
      message: '导出用户列表失败',
      details: error.message
    });
  }
}

/**
 * 搜索用户
 */
async function searchUsers(req, res) {
  try {
    const options = {
      keyword: req.query.keyword,
      role: req.query.role,
      status: req.query.status,
      villageId: req.query.villageId,
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const result = await userManagementService.searchUsers(options);
    res.json(result);
  } catch (error) {
    logger.error('搜索用户失败:', error);
    res.status(500).json({
      success: false,
      error: 'SEARCH_FAILED',
      message: '搜索用户失败',
      details: error.message
    });
  }
}

module.exports = {
  getUsers,
  getUserDetail,
  createUser,
  updateUser,
  deleteUser,
  changeUserStatus,
  changeUserRole,
  resetPassword,
  getUserStats,
  batchOperate,
  exportUsers,
  searchUsers
};
