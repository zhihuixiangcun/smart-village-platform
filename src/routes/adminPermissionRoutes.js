/**
 * 管理员权限管理路由
 * 提供角色管理、用户角色分配、权限查看等API端点
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

const {
  getAllRoles,
  getRolePermissions,
  changeUserRole,
  getAllPermissions,
  getUsers,
  getPermissionStats,
  batchChangeUserRole,
  changeUserStatus,
  getUserDetail
} = require('../controllers/adminPermissionController');

const { authenticateToken } = require('../middleware/auth');

// 身份认证中间件
router.use(authenticateToken);

/**
 * 角色管理路由
 */

// 获取所有角色
router.get('/roles', async (req, res, next) => {
  try {
    await getAllRoles(req, res);
  } catch (error) {
    logger.error('获取角色列表路由错误:', error);
    next(error);
  }
});

// 获取角色的所有权限
router.get('/roles/:role/permissions', async (req, res, next) => {
  try {
    await getRolePermissions(req, res);
  } catch (error) {
    logger.error('获取角色权限路由错误:', error);
    next(error);
  }
});

/**
 * 权限管理路由
 */

// 获取所有权限
router.get('/permissions', async (req, res, next) => {
  try {
    await getAllPermissions(req, res);
  } catch (error) {
    logger.error('获取所有权限路由错误:', error);
    next(error);
  }
});

/**
 * 用户管理路由
 */

// 获取用户列表
router.get('/users', async (req, res, next) => {
  try {
    await getUsers(req, res);
  } catch (error) {
    logger.error('获取用户列表路由错误:', error);
    next(error);
  }
});

// 获取用户详情
router.get('/users/:userId', async (req, res, next) => {
  try {
    await getUserDetail(req, res);
  } catch (error) {
    logger.error('获取用户详情路由错误:', error);
    next(error);
  }
});

// 修改用户角色
router.put('/users/:userId/role', async (req, res, next) => {
  try {
    await changeUserRole(req, res);
  } catch (error) {
    logger.error('修改用户角色路由错误:', error);
    next(error);
  }
});

// 批量修改用户角色
router.post('/users/batch-role', async (req, res, next) => {
  try {
    await batchChangeUserRole(req, res);
  } catch (error) {
    logger.error('批量修改用户角色路由错误:', error);
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

/**
 * 统计路由
 */

// 获取权限统计
router.get('/stats', async (req, res, next) => {
  try {
    await getPermissionStats(req, res);
  } catch (error) {
    logger.error('获取权限统计路由错误:', error);
    next(error);
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  logger.error('管理员权限路由错误:', error);
  res.status(error.status || 500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: error.message || '服务器内部错误',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

module.exports = router;
