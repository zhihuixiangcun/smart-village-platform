/**
 * 认证中间件
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 从用户服务获取用户信息的函数
async function getUserFromUserService(userId) {
  try {
    // 这里应该调用用户服务的API获取用户信息
    // 暂时返回模拟数据
    return {
      id: userId,
      name: '用户',
      role: 'user',
      permissions: []
    };
  } catch (error) {
    throw new Error('获取用户信息失败');
  }
}

// JWT认证中间件
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，未提供令牌'
      });
    }

    // 验证JWT令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // 从用户服务获取用户信息
    const user = await getUserFromUserService(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '令牌无效，用户不存在'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '令牌无效'
    });
  }
};

// 角色验证中间件
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

// 权限验证中间件
const permission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

module.exports = {
  auth,
  authorize,
  permission
};