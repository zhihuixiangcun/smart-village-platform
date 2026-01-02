/**
 * Dashboard路由
 * 为前端Dashboard提供统一的统计数据接口
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

/**
 * @route   GET /api/v1/dashboard/statistics
 * @desc    获取Dashboard综合统计数据
 * @access  Private
 */
router.get('/statistics',
  authenticateToken,
  asyncHandler(dashboardController.getStatistics)
);

/**
 * @route   GET /api/v1/dashboard/residents
 * @desc    获取村民统计数据
 * @access  Private
 */
router.get('/residents',
  authenticateToken,
  asyncHandler(dashboardController.getResidentStatistics)
);

/**
 * @route   GET /api/v1/dashboard/announcements
 * @desc    获取公告统计数据
 * @access  Private
 */
router.get('/announcements',
  authenticateToken,
  asyncHandler(dashboardController.getAnnouncementStatistics)
);

/**
 * @route   GET /api/v1/dashboard/governance
 * @desc    获取村务统计数据
 * @access  Private
 */
router.get('/governance',
  authenticateToken,
  asyncHandler(dashboardController.getGovernanceStatistics)
);

/**
 * @route   GET /api/v1/dashboard/finance
 * @desc    获取财务统计数据
 * @access  Private
 */
router.get('/finance',
  authenticateToken,
  asyncHandler(dashboardController.getFinanceStatistics)
);

/**
 * @route   GET /api/v1/dashboard/emergency
 * @desc    获取应急事件统计数据
 * @access  Private
 */
router.get('/emergency',
  authenticateToken,
  asyncHandler(dashboardController.getEmergencyStatistics)
);

/**
 * @route   GET /api/v1/dashboard/services
 * @desc    获取服务统计数据
 * @access  Private
 */
router.get('/services',
  authenticateToken,
  asyncHandler(dashboardController.getServiceStatistics)
);

module.exports = router;
