# JWT认证系统实现指南

## 1. JWT认证中间件

### src/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redisConnection = require('../config/redis');
const logger = require('./logging');

class AuthMiddleware {
  // 生成Token
  static generateTokens(user) {
    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role,
      villageId: user.villageId,
      permissions: user.permissions
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        issuer: 'smart-village-platform',
        audience: user.villageId
      }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
      }
    );

    return { accessToken, refreshToken };
  }

  // 验证Token
  static async verifyToken(token) {
    try {
      // 检查token是否在黑名单中
      const isBlacklisted = await redisConnection.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  // 认证中间件
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          code: 401,
          message: '未提供认证token',
          data: null
        });
      }

      const token = authHeader.substring(7);
      const decoded = await this.verifyToken(token);

      // 从缓存或数据库获取用户信息
      let user = await redisConnection.get(`user:${decoded.userId}`);

      if (!user) {
        user = await User.findById(decoded.userId)
          .select('-password')
          .populate('villageId', 'name code');

        if (!user || !user.isActive) {
          return res.status(401).json({
            code: 401,
            message: '用户不存在或已被禁用',
            data: null
          });
        }

        // 缓存用户信息（30分钟）
        await redisConnection.set(`user:${decoded.userId}`, user, 1800);
      }

      // 将用户信息添加到请求对象
      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      logger.error('Authentication error:', error);

      return res.status(401).json({
        code: 401,
        message: error.message || '认证失败',
        data: null
      });
    }
  }

  // 权限检查中间件
  static requirePermission(resource, action) {
    return async (req, res, next) => {
      try {
        const user = req.user;

        // 超级管理员拥有所有权限
        if (user.permissions.includes('*')) {
          return next();
        }

        // 检查具体权限
        const requiredPermission = `${resource}:${action}`;

        if (!user.permissions.includes(requiredPermission)) {
          // 检查是否有该资源的所有权限
          const resourcePermission = `${resource}:*`;

          if (!user.permissions.includes(resourcePermission)) {
            return res.status(403).json({
              code: 403,
              message: '权限不足',
              data: {
                required: requiredPermission,
                userPermissions: user.permissions
              }
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Permission check error:', error);

        return res.status(500).json({
          code: 500,
          message: '权限检查失败',
          data: null
        });
      }
    };
  }

  // 角色检查中间件
  static requireRole(...roles) {
    return (req, res, next) => {
      const user = req.user;

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          code: 403,
          message: '角色权限不足',
          data: {
            required: roles,
            current: user.role
          }
        });
      }

      next();
    };
  }

  // 撤销Token
  static async revokeToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) {
        throw new Error('Invalid token');
      }

      // 计算token剩余有效时间
      const expirationTime = decoded.exp * 1000 - Date.now();

      if (expirationTime > 0) {
        // 将token加入黑名单
        await redisConnection.set(
          `blacklist:${token}`,
          'revoked',
          Math.ceil(expirationTime / 1000)
        );
      }

      return true;
    } catch (error) {
      logger.error('Token revocation error:', error);
      return false;
    }
  }

  // 刷新Token
  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // 获取用户信息
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // 生成新的token对
      const tokens = this.generateTokens(user);

      return tokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }
}

module.exports = AuthMiddleware;
```

## 2. 认证路由

### src/routes/auth.js
```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AuthMiddleware = require('../middleware/auth');
const logger = require('../middleware/logging');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 登录限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: {
    code: 429,
    message: '登录尝试过于频繁，请15分钟后再试',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 用户注册
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6位')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('phone')
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('请输入有效的手机号')
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '输入验证失败',
        data: errors.array()
      });
    }

    const { username, password, email, phone, profile } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({
      $or: [{ username }, { email }, { phone }]
    });

    if (existingUser) {
      return res.status(409).json({
        code: 409,
        message: '用户名、邮箱或手机号已被使用',
        data: null
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = new User({
      username,
      password: hashedPassword,
      email,
      phone,
      profile,
      role: 'villager', // 默认角色
      permissions: ['profile:read', 'profile:update'], // 默认权限
      isActive: true
    });

    await user.save();

    logger.info(`New user registered: ${username}`);

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        userId: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);

    res.status(500).json({
      code: 500,
      message: '注册失败',
      data: null
    });
  }
});

// 用户登录
router.post('/login', loginLimiter, [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '输入验证失败',
        data: errors.array()
      });
    }

    const { username, password, rememberMe = false } = req.body;

    // 查找用户
    const user = await User.findOne({ username })
      .select('+password')
      .populate('villageId', 'name code');

    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
        data: null
      });
    }

    // 检查用户是否被禁用
    if (!user.isActive) {
      return res.status(401).json({
        code: 401,
        message: '账户已被禁用，请联系管理员',
        data: null
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
        data: null
      });
    }

    // 生成Token
    const tokens = AuthMiddleware.generateTokens(user);

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 缓存用户信息
    const redisConnection = require('../config/redis');
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;
    await redisConnection.set(
      `user:${user._id}`,
      userWithoutPassword,
      rememberMe ? 604800 : 1800 // 记住我则缓存7天
    );

    logger.info(`User logged in: ${username}`);

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
          profile: user.profile,
          village: user.villageId
        },
        tokens
      }
    });
  } catch (error) {
    logger.error('Login error:', error);

    res.status(500).json({
      code: 500,
      message: '登录失败',
      data: null
    });
  }
});

// 刷新Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        code: 400,
        message: 'Refresh token不能为空',
        data: null
      });
    }

    const tokens = await AuthMiddleware.refreshToken(refreshToken);

    res.json({
      code: 200,
      message: 'Token刷新成功',
      data: tokens
    });
  } catch (error) {
    logger.error('Token refresh error:', error);

    res.status(401).json({
      code: 401,
      message: error.message || 'Token刷新失败',
      data: null
    });
  }
});

// 用户登出
router.post('/logout', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const token = req.token;

    // 撤销当前Token
    await AuthMiddleware.revokeToken(token);

    // 清除用户缓存
    const redisConnection = require('../config/redis');
    await redisConnection.del(`user:${req.user._id}`);

    logger.info(`User logged out: ${req.user.username}`);

    res.json({
      code: 200,
      message: '登出成功',
      data: null
    });
  } catch (error) {
    logger.error('Logout error:', error);

    res.status(500).json({
      code: 500,
      message: '登出失败',
      data: null
    });
  }
});

// 获取当前用户信息
router.get('/me', AuthMiddleware.authenticate, async (req, res) => {
  try {
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          role: req.user.role,
          permissions: req.user.permissions,
          profile: req.user.profile,
          village: req.user.villageId,
          createdAt: req.user.createdAt,
          lastLoginAt: req.user.lastLoginAt
        }
      }
    });
  } catch (error) {
    logger.error('Get user info error:', error);

    res.status(500).json({
      code: 500,
      message: '获取用户信息失败',
      data: null
    });
  }
});

// 修改密码
router.put('/change-password', [
  AuthMiddleware.authenticate,
  body('oldPassword').notEmpty().withMessage('原密码不能为空'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少6位')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含大小写字母和数字')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        code: 400,
        message: '输入验证失败',
        data: errors.array()
      });
    }

    const { oldPassword, newPassword } = req.body;

    // 获取用户完整信息（包含密码）
    const user = await User.findById(req.user.id).select('+password');

    // 验证原密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      return res.status(400).json({
        code: 400,
        message: '原密码错误',
        data: null
      });
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // 更新密码
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // 撤销所有当前用户的Token
    const redisConnection = require('../config/redis');
    await redisConnection.del(`user:${req.user.id}`);

    logger.info(`Password changed for user: ${req.user.username}`);

    res.json({
      code: 200,
      message: '密码修改成功',
      data: null
    });
  } catch (error) {
    logger.error('Change password error:', error);

    res.status(500).json({
      code: 500,
      message: '密码修改失败',
      data: null
    });
  }
});

module.exports = router;
```

## 3. 用户模型

### src/models/User.js
```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^1[3-9]\d{9}$/
  },

  // 角色权限
  role: {
    type: String,
    enum: ['admin', 'village_director', 'finance_manager', 'committee_member', 'villager'],
    default: 'villager'
  },
  permissions: [{
    type: String
  }],

  // 个人资料
  profile: {
    name: String,
    avatar: String,
    gender: {
      type: String,
      enum: ['男', '女']
    },
    birthDate: Date,
    idCard: String,
    address: String
  },

  // 村庄关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },

  // 登录信息
  lastLoginAt: Date,
  passwordChangedAt: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,

  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },

  // 多因子认证
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: String,

  // 系统字段
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 虚拟字段：账户是否被锁定
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// 索引
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ villageId: 1, role: 1 });

// 中间件：更新时间
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 中间件：密码修改后处理
userSchema.pre('save', function(next) {
  if (this.isModified('password') && !this.isNew) {
    this.passwordChangedAt = new Date();
  }
  next();
});

// 实例方法：增加登录失败次数
userSchema.methods.incLoginAttempts = function() {
  // 如果之前有锁定且已过期，重置计数器
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // 如果达到最大尝试次数且未锁定，则锁定账户
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 锁定2小时
  }

  return this.updateOne(updates);
};

// 实例方法：重置登录尝试
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

module.exports = mongoose.model('User', userSchema);
```

## 4. 前端认证配置

### client/src/utils/auth.js
```javascript
import axios from 'axios';
import { ElMessage } from 'element-plus';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');

    // 设置axios默认值
    this.setupAxiosInterceptors();
  }

  // 设置axios拦截器
  setupAxiosInterceptors() {
    // 请求拦截器
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    axios.interceptors.response.use(
      (response) => {
        return response.data;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // 尝试刷新token
            const response = await this.refreshAccessToken();

            this.setToken(response.data.tokens.accessToken);
            this.setRefreshToken(response.data.tokens.refreshToken);

            // 重新发送原始请求
            originalRequest.headers.Authorization = `Bearer ${response.data.tokens.accessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // 刷新失败，跳转到登录页
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // 显示错误消息
        if (error.response?.data?.message) {
          ElMessage.error(error.response.data.message);
        }

        return Promise.reject(error);
      }
    );
  }

  // 登录
  async login(credentials) {
    try {
      const response = await axios.post('/api/v1/auth/login', credentials);

      if (response.code === 200) {
        const { user, tokens } = response.data;

        this.setToken(tokens.accessToken);
        this.setRefreshToken(tokens.refreshToken);
        this.setUser(user);

        return { success: true, user };
      }

      return { success: false, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '登录失败'
      };
    }
  }

  // 注册
  async register(userData) {
    try {
      const response = await axios.post('/api/v1/auth/register', userData);

      return {
        success: response.code === 201,
        message: response.message,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '注册失败',
        errors: error.response?.data?.data
      };
    }
  }

  // 登出
  async logout() {
    try {
      if (this.token) {
        await axios.post('/api/v1/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // 刷新token
  async refreshAccessToken() {
    return await axios.post('/api/v1/auth/refresh', {
      refreshToken: this.refreshToken
    });
  }

  // 获取当前用户信息
  async getCurrentUser() {
    try {
      const response = await axios.get('/api/v1/auth/me');

      if (response.code === 200) {
        this.setUser(response.data.user);
        return response.data.user;
      }

      return null;
    } catch (error) {
      if (error.response?.status === 401) {
        this.logout();
      }
      return null;
    }
  }

  // 修改密码
  async changePassword(passwords) {
    try {
      const response = await axios.put('/api/v1/auth/change-password', passwords);

      return {
        success: response.code === 200,
        message: response.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '修改密码失败'
      };
    }
  }

  // 检查权限
  hasPermission(resource, action) {
    if (!this.user) return false;

    const permissions = this.user.permissions || [];

    // 超级管理员
    if (permissions.includes('*')) return true;

    // 检查具体权限
    return permissions.includes(`${resource}:${action}`) ||
           permissions.includes(`${resource}:*`);
  }

  // 检查角色
  hasRole(...roles) {
    if (!this.user) return false;
    return roles.includes(this.user.role);
  }

  // 辅助方法
  setToken(token) {
    this.token = token;
    localStorage.setItem('accessToken', token);
  }

  setRefreshToken(token) {
    this.refreshToken = token;
    localStorage.setItem('refreshToken', token);
  }

  setUser(user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  // Getters
  get isAuthenticated() {
    return !!this.token && !!this.user;
  }

  get currentUser() {
    return this.user;
  }

  get userRole() {
    return this.user?.role;
  }

  get userPermissions() {
    return this.user?.permissions || [];
  }
}

// 创建单例
export const authService = new AuthService();
export default authService;
```

## 5. 路由守卫

### client/src/router/index.js
```javascript
import { createRouter, createWebHistory } from 'vue-router';
import { authService } from '@/utils/auth';
import { ElMessage } from 'element-plus';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue')
      },
      {
        path: 'residents',
        name: 'Residents',
        component: () => import('@/views/residents/ResidentsView.vue'),
        meta: {
          permission: { resource: 'residents', action: 'read' }
        }
      },
      {
        path: 'finance',
        name: 'Finance',
        component: () => import('@/views/finance/FinanceOverviewView.vue'),
        meta: {
          permission: { resource: 'finance', action: 'read' }
        }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/ProfileView.vue')
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404View.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  // 检查认证状态
  const isAuthenticated = authService.isAuthenticated;

  // 需要游客页面的路由
  if (to.meta.requiresGuest && isAuthenticated) {
    next({ name: 'Dashboard' });
    return;
  }

  // 需要认证的路由
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    });
    return;
  }

  // 检查权限
  if (to.meta.permission && isAuthenticated) {
    const { resource, action } = to.meta.permission;

    if (!authService.hasPermission(resource, action)) {
      ElMessage.error('权限不足');
      next({ name: 'Dashboard' });
      return;
    }
  }

  // 检查角色
  if (to.meta.roles && isAuthenticated) {
    const hasRole = authService.hasRole(...to.meta.roles);

    if (!hasRole) {
      ElMessage.error('角色权限不足');
      next({ name: 'Dashboard' });
      return;
    }
  }

  next();
});

export default router;
```

## 使用示例

### 登录组件
```vue
<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { authService } from '@/utils/auth';

const router = useRouter();
const route = useRoute();

const loginForm = ref({
  username: '',
  password: '',
  rememberMe: false
});

const loading = ref(false);

const handleLogin = async () => {
  loading.value = true;

  try {
    const result = await authService.login(loginForm.value);

    if (result.success) {
      ElMessage.success('登录成功');

      // 跳转到目标页面
      const redirect = route.query.redirect || '/';
      router.push(redirect);
    } else {
      ElMessage.error(result.message);
    }
  } finally {
    loading.value = false;
  }
};
</script>
```

## 测试用例

### tests/auth.test.js
```javascript
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Authentication', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        password: 'Test123456',
        email: 'test@example.com',
        phone: '13800138000',
        profile: {
          name: '测试用户'
        }
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.code).toBe(201);
      expect(response.body.data.username).toBe(userData.username);
    });

    it('should not register user with invalid data', async () => {
      const userData = {
        username: 'ab', // 太短
        password: '123', // 太简单
        email: 'invalid-email',
        phone: '123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.code).toBe(400);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      const user = new User({
        username: 'testuser',
        password: 'hashedPassword',
        email: 'test@example.com',
        phone: '13800138000'
      });
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'Test123456'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.message).toBe('用户名或密码错误');
    });
  });
});
```

这个JWT认证系统提供了完整的用户认证功能，包括注册、登录、权限检查、token刷新等功能，确保系统安全可靠。