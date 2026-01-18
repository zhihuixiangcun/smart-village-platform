/**
 * System Settings Routes
 * 系统设置路由
 */

const express = require('express');
const router = express.Router();
const systemSettingsController = require('../controllers/systemSettingsController');
const { authenticateToken, requirePermissions } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { auditLog } = require('../middleware/newPermissionMiddleware');

// 应用认证中间件到所有路由
router.use(authenticateToken);

// ===== 系统设置查询 =====

/**
 * @route   GET /api/v1/system-settings
 * @desc    获取所有系统设置（支持按分类筛选）
 * @access   Private (需要认证）
 * @query    category - 设置分类（可选）
 * @query    villageId - 村庄ID（可选，用于租户隔离）
 */
router.get('/',
  requirePermissions(['settings:read']),
  asyncHandler(async (req, res) => {
    await systemSettingsController.getAllSettings(req, res);
  })
);

/**
 * @route   GET /api/v1/system-settings/:key
 * @desc    获取单个设置
 * @access   Private
 * @param    key - 设置键
 * @query    villageId - 村庄ID（可选）
 */
router.get('/:key',
  requirePermissions(['settings:read']),
  asyncHandler(async (req, res) => {
    await systemSettingsController.getSettingByKey(req, res);
  })
);

// ===== 系统设置管理（需要system:config权限） =====

/**
 * @route   POST /api/v1/system-settings
 * @desc    创建新设置
 * @access   Private (需要system:config权限)
 * @body     key, category, title, value, valueType, description, options, villageId, validation
 */
router.post('/',
  requirePermissions(['system:config']),
  auditLog('创建系统设置', true),
  asyncHandler(async (req, res) => {
    await systemSettingsController.createSetting(req, res);
  })
);

/**
 * @route   PUT /api/v1/system-settings/:key
 * @desc    更新设置
 * @access   Private (需要system:config权限)
 * @param    key - 设置键
 * @body     value, options, validation
 * @query    villageId - 村庄ID（可选）
 */
router.put('/:key',
  requirePermissions(['system:config']),
  auditLog('更新系统设置', true),
  asyncHandler(async (req, res) => {
    await systemSettingsController.updateSetting(req, res);
  })
);

/**
 * @route   POST /api/v1/system-settings/batch
 * @desc    批量更新设置
 * @access   Private (需要system:config权限)
 * @body     updates - 更新数组（最多50条）
 * @query    villageId - 村庄ID（可选）
 */
router.post('/batch',
  requirePermissions(['system:config']),
  auditLog('批量更新系统设置', true),
  asyncHandler(async (req, res) => {
    await systemSettingsController.batchUpdateSettings(req, res);
  })
);

/**
 * @route   POST /api/v1/system-settings/reset
 * @desc    重置设置为默认值
 * @access   Private (需要system:config权限)
 * @body     keys - 要重置的键数组（可选）
 * @body     category - 按分类重置（可选）
 * @query    villageId - 村庄ID（可选）
 */
router.post('/reset',
  requirePermissions(['system:config']),
  auditLog('重置系统设置', true),
  asyncHandler(async (req, res) => {
    await systemSettingsController.resetSettings(req, res);
  })
);

/**
 * @route   GET /api/v1/system-settings/:key/history
 * @desc    获取设置修改历史
 * @access   Private (需要settings:read权限)
 * @param    key - 设置键
 * @query    limit - 返回历史记录数量（默认10）
 * @query    villageId - 村庄ID（可选）
 */
router.get('/:key/history',
  requirePermissions(['settings:read']),
  asyncHandler(async (req, res) => {
    await systemSettingsController.getSettingHistory(req, res);
  })
);

/**
 * @route   DELETE /api/v1/system-settings/:key
 * @desc    删除设置
 * @access   Private (需要system:config权限)
 * @param    key - 设置键
 * @query    villageId - 村庄ID（可选）
 */
router.delete('/:key',
  requirePermissions(['system:config']),
  auditLog('删除系统设置', true),
  asyncHandler(async (req, res) => {
    await systemSettingsController.deleteSetting(req, res);
  })
);

// 错误处理中间件
router.use((error, req, res, next) => {
  logger.error('系统设置路由错误:', error);
  res.status(error.status || 500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: error.message || '服务器内部错误'
  });
});

module.exports = router;
