/**
 * Smart Village Platform - User Authentication Service
 * 智慧乡村综合服务平台 - 用户认证服务
 *
 * Microservice: User Service
 * Port: 3001
 *
 * Features:
 * - User registration and login
 * - JWT token management
 * - Role-based access control (RBAC)
 * - Password reset
 * - Session management
 */

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  next();
});

// ==================== MODELS ====================

/**
 * User Schema
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'village_admin', 'user', 'guest'],
    default: 'user'
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  },
  profile: {
    name: String,
    phone: String,
    avatar: String,
    idCard: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLoginAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateToken = function() {
  return jwt.sign(
    {
      id: this._id,
      username: this.username,
      role: this.role,
      villageId: this.villageId
    },
    process.env.JWT_SECRET || 'smart-village-secret-key',
    { expiresIn: '7d' }
  );
};

const User = mongoose.model('User', userSchema);

/**
 * Session Schema
 */
const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: String,
  refreshToken: String,
  deviceInfo: {
    userAgent: String,
    ip: String
  },
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

sessionSchema.index({ userId: 1, expiresAt: 1 });
sessionSchema.index({ token: 1 });

const Session = mongoose.model('Session', sessionSchema);

/**
 * Permission Schema
 */
const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  resource: String,
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'manage']
  },
  roles: [{
    type: String,
    enum: ['admin', 'village_admin', 'user', 'guest']
  }]
});

const Permission = mongoose.model('Permission', permissionSchema);

// ==================== SERVICES ====================

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Register new user
   */
  async register(data) {
    const { username, email, password, role, villageId, profile } = data;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      throw new Error('用户名或邮箱已存在');
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      role: role || 'user',
      villageId,
      profile
    });

    await user.save();

    // Generate token
    const token = user.generateToken();

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile
      },
      token
    };
  }

  /**
   * Login user
   */
  async login(username, password, deviceInfo) {
    // Find user
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('用户名或密码错误');
    }

    // Check status
    if (user.status !== 'active') {
      throw new Error('账户已被禁用');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = user.generateToken();
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET + '-refresh',
      { expiresIn: '30d' }
    );

    // Create session
    await Session.create({
      userId: user._id,
      token,
      refreshToken,
      deviceInfo,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile
      },
      token,
      refreshToken
    };
  }

  /**
   * Refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + '-refresh');

      const session = await Session.findOne({ refreshToken, expiresAt: { $gt: new Date() } });
      if (!session) {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findById(decoded.id);
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }

      const newToken = user.generateToken();

      // Update session
      session.token = newToken;
      await session.save();

      return { token: newToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(token) {
    await Session.deleteOne({ token });
  }

  /**
   * Verify token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smart-village-secret-key');

      const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
      if (!session) {
        throw new Error('Session not found or expired');
      }

      const user = await User.findById(decoded.id).select('-password');
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

/**
 * RBAC Service
 */
class RBACService {
  /**
   * Check if user has permission
   */
  async hasPermission(user, resource, action) {
    // Admin has all permissions
    if (user.role === 'admin') {
      return true;
    }

    // Find permission
    const permission = await Permission.findOne({
      resource,
      action,
      roles: { $in: [user.role, 'all'] }
    });

    return !!permission;
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userRole) {
    if (userRole === 'admin') {
      return await Permission.find({});
    }

    return await Permission.find({
      roles: { $in: [userRole, 'all'] }
    });
  }
}

// ==================== CONTROLLERS ====================

const authService = new AuthService();
const rbacService = new RBACService();

/**
 * Auth Controller
 */
const authController = {
  /**
   * Register new user
   * POST /api/auth/register
   */
  register: async (req, res) => {
    try {
      // Validate
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Login user
   * POST /api/auth/login
   */
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      };

      const result = await authService.login(username, password, deviceInfo);

      res.json({
        success: true,
        message: '登录成功',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Refresh token
   * POST /api/auth/refresh
   */
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout: async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      await authService.logout(token);

      res.json({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};

/**
 * User Controller
 */
const userController = {
  /**
   * Get user profile
   * GET /api/users/profile
   */
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Update user profile
   * PUT /api/users/profile
   */
  updateProfile: async (req, res) => {
    try {
      const { profile } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { profile } },
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        success: true,
        message: '更新成功',
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Change password
   * POST /api/users/change-password
   */
  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;

      const user = await User.findById(req.user.id);
      const isMatch = await user.comparePassword(oldPassword);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: '原密码错误'
        });
      }

      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: '密码修改成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};

// ==================== MIDDLEWARE ====================

/**
 * Authentication middleware
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }
};

/**
 * Permission check middleware
 */
const permissionMiddleware = (resource, action) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await rbacService.hasPermission(req.user, resource, action);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
};

// ==================== ROUTES ====================

/**
 * Authentication routes
 */
app.post('/api/auth/register',
  body('username').isLength({ min: 3, max: 50 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  authController.register
);

app.post('/api/auth/login',
  body('username').notEmpty(),
  body('password').notEmpty(),
  authController.login
);

app.post('/api/auth/refresh',
  body('refreshToken').notEmpty(),
  authController.refreshToken
);

app.post('/api/auth/logout', authController.logout);

/**
 * User routes
 */
app.get('/api/users/profile', authMiddleware, userController.getProfile);
app.put('/api/users/profile', authMiddleware, userController.updateProfile);
app.post('/api/users/change-password', authMiddleware, userController.changePassword);

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: 'user-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date()
  });
});

// ==================== SERVER START ====================

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log(`[User Service] Connected to MongoDB: ${MONGO_URI}`);
}).catch((error) => {
  console.error(`[User Service] MongoDB connection error:`, error);
});

// Start server
app.listen(PORT, () => {
  console.log(`[User Service] Server running on port ${PORT}`);
});

// Export for testing
module.exports = { app, authService, rbacService };
