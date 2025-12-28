/**
 * 积分系统路由
 * 定义积分相关的API端点
 */

const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');
const authenticate = require('../middleware/auth');
const { requireRoles } = require('../middleware/auth');

/**
 * @route   GET /api/v1/points/my
 * @desc    获取我的积分信息（综合）
 * @access  Private
 */
router.get('/my', authenticate, pointsController.getMyPoints);

/**
 * @route   GET /api/v1/points/balance/:userId
 * @desc    获取用户积分余额
 * @access  Private
 */
router.get('/balance/:userId', authenticate, pointsController.getUserBalance);

/**
 * @route   POST /api/v1/points/earn
 * @desc    增加积分
 * @access  Private (Admin/Village Admin)
 */
router.post('/earn', authenticate, requireRoles(['admin', 'village_admin']), pointsController.addPoints);

/**
 * @route   POST /api/v1/points/redeem/:userId
 * @desc    兑换积分
 * @access  Private
 */
router.post('/redeem/:userId', authenticate, pointsController.redeemPoints);

/**
 * @route   GET /api/v1/points/history/:userId
 * @desc    获取积分历史记录
 * @access  Private
 */
router.get('/history/:userId', authenticate, pointsController.getTransactionHistory);

/**
 * @route   GET /api/v1/points/leaderboard
 * @desc    获取积分排行榜
 * @access  Public
 */
router.get('/leaderboard', pointsController.getLeaderboard);

/**
 * @route   GET /api/v1/points/statistics
 * @desc    获取积分统计报告
 * @access  Private (Admin/Village Admin)
 */
router.get('/statistics', authenticate, requireRoles(['admin', 'village_admin']), pointsController.getStatistics);

/**
 * @route   POST /api/v1/points/admin/adjust
 * @desc    管理员调整积分
 * @access  Private (Admin)
 */
router.post('/admin/adjust', authenticate, requireRoles(['admin', 'village_admin']), pointsController.adminAdjustPoints);

/**
 * @route   POST /api/v1/points/rules/default
 * @desc    创建默认积分规则
 * @access  Private (Admin)
 */
router.post('/rules/default', authenticate, requireRoles(['admin']), pointsController.createDefaultRules);

/**
 * @route   GET /api/v1/points/redemption-items
 * @desc    获取可兑换商品列表
 * @access  Public
 */
router.get('/redemption-items', pointsController.getRedemptionItems);

/**
 * @route   POST /api/v1/points/redemption-items
 * @desc    创建兑换商品
 * @access  Private (Admin/Village Admin)
 */
router.post('/redemption-items', authenticate, requireRoles(['admin', 'village_admin']), pointsController.createRedemptionItem);

/**
 * @route   PUT /api/v1/points/redemption-items/:itemId
 * @desc    更新兑换商品
 * @access  Private (Admin/Village Admin)
 */
router.put('/redemption-items/:itemId', authenticate, requireRoles(['admin', 'village_admin']), pointsController.updateRedemptionItem);

/**
 * @route   DELETE /api/v1/points/redemption-items/:itemId
 * @desc    删除兑换商品
 * @access  Private (Admin)
 */
router.delete('/redemption-items/:itemId', authenticate, requireRoles(['admin']), pointsController.deleteRedemptionItem);

/**
 * @route   POST /api/v1/points/checkin
 * @desc    每日签到
 * @access  Private
 */
router.post('/checkin', authenticate, pointsController.dailyCheckin);

module.exports = router;
