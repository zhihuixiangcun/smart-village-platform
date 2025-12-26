const express = require('express');
const router = express.Router();
const villageUserController = require('../controllers/villageUserController');
const { authenticate, authorize, checkVillageAccess, checkRole, rateLimitByUser } = require('../middleware/villageAuth');

// 公开路由（不需要认证）
router.post('/register', villageUserController.register);
router.post('/login', villageUserController.login);

// 需要认证的路由
router.use(authenticate);

// 用户个人信息管理
router.get('/profile', villageUserController.getUserProfile);
router.put('/profile', villageUserController.updateProfile);
router.put('/password', rateLimitByUser(5, 15 * 60 * 1000), villageUserController.changePassword);
router.post('/logout', villageUserController.logout);

// 村庄用户管理（需要村庄管理员权限）
router.get('/village/:villageId/users',
  checkVillageAccess,
  authorize('user_management', 'read'),
  villageUserController.getVillageUsers
);

router.get('/village/:villageId/users/online',
  checkVillageAccess,
  authorize('user_management', 'read'),
  villageUserController.getOnlineUsers
);

router.get('/village/:villageId/users/stats',
  checkVillageAccess,
  authorize('statistics_analysis', 'read'),
  villageUserController.getUserWorkStats
);

// 用户状态管理（仅管理员）
router.put('/users/:userId/status',
  authorize('user_management', 'update'),
  villageUserController.updateUserStatus
);

router.put('/users/:userId/permissions',
  authorize('user_management', 'update'),
  villageUserController.assignPermissions
);

module.exports = router;