/**
 * 用户管理路由
 * 提供用户CRUD、搜索、筛选、统计、批量操作等API端点
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

const {
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
} = require('../controllers/userManagementController');

const { authenticateToken } = require('../middleware/auth');

// 身份认证中间件
router.use(authenticateToken);

/**
 * 用户列表路由
 */

// 获取用户列表（支持筛选和分页）
router.get('/users', async (req, res, next) => {
  try {
    await getUsers(req, res);
  } catch (error) {
    logger.error('获取用户列表路由错误:', error);
    next(error);
  }
});

// 搜索用户
router.get('/users/search', async (req, res, next) => {
  try {
    await searchUsers(req, res);
  } catch (error) {
    logger.error('搜索用户路由错误:', error);
    next(error);
  }
});

/**
 * 用户详情路由
 */

// 获取用户详情
router.get('/users/:userId', async (req, res, next) => {
  try {
    await getUserDetail(req, res);
  } catch (error) {
    logger.error('获取用户详情路由错误:', error);
    next(error);
  }
});

/**
 * 用户操作路由
 */

// 创建用户
router.post('/users', async (req, res, next) => {
  try {
    await createUser(req, res);
  } catch (error) {
    logger.error('创建用户路由错误:', error);
    next(error);
  }
});

// 更新用户
router.put('/users/:userId', async (req, res, next) => {
  try {
    await updateUser(req, res);
  } catch (error) {
    logger.error('更新用户路由错误:', error);
    next(error);
  }
});

// 删除用户（软删除）
router.delete('/users/:userId', async (req, res, next) => {
  try {
    await deleteUser(req, res);
  } catch (error) {
    logger.error('删除用户路由错误:', error);
    next(error);
  }
});

/**
 * 用户角色和状态管理路由
 */

// 修改用户角色
router.put('/users/:userId/role', async (req, res, next) => {
  try {
    await changeUserRole(req, res);
  } catch (error) {
    logger.error('修改用户角色路由错误:', error);
    next(error);
  }
});

// 修改用户状态
router.put('/users/:userId/status', async (req, res, next) => {
  try {
    await changeUserStatus(req, res);
  } catch (error) {
    logger.error('修改用户状态路由错误:', error);
    next(error);
  }
});

// 重置用户密码
router.post('/users/:userId/reset-password', async (req, res, next) => {
  try {
    await resetPassword(req, res);
  } catch (error) {
    logger.error('重置用户密码路由错误:', error);
    next(error);
  }
});

/**
 * 批量操作路由
 */

// 批量操作用户（激活/禁用/暂停）
router.post('/users/batch', async (req, res, next) => {
  try {
    await batchOperate(req, res);
  } catch (error) {
    logger.error('批量操作用户路由错误:', error);
    next(error);
  }
});

/**
 * 统计和导出路由
 */

// 获取用户统计
router.get('/stats', async (req, res, next) => {
  try {
    await getUserStats(req, res);
  } catch (error) {
    logger.error('获取用户统计路由错误:', error);
    next(error);
  }
});

// 导出用户列表
router.post('/export', async (req, res, next) => {
  try {
    await exportUsers(req, res);
  } catch (error) {
    logger.error('导出用户列表路由错误:', error);
    next(error);
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  logger.error('用户管理路由错误:', error);
  res.status(error.status || 500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: error.message || '服务器内部错误',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;
