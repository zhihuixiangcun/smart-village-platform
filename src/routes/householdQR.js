/**
 * 一户一码路由
 * @module routes/householdQR
 */

const express = require('express');
const router = express.Router();
const householdQRController = require('../controllers/householdQRController');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// 公开接口（无需认证）
// ============================================

/**
 * @swagger
 * /api/v1/household-qr/public/scan:
 *   post:
 *     summary: 公开扫码查看户信息
 *     tags: [Household QR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codeId
 *             properties:
 *               codeId:
 *                 type: string
 *                 description: 户码 (格式: XXXXXXHXXXXX)
 *                 example: "ABC123H0001A"
 *     responses:
 *       200:
 *         description: 扫码成功
 *       400:
 *         description: 户码无效或已过期
 */
router.post('/public/scan', householdQRController.publicScanQR);

/**
 * @swagger
 * /api/v1/household-qr/validate:
 *   post:
 *     summary: 验证户码有效性
 *     tags: [Household QR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codeId
 *             properties:
 *               codeId:
 *                 type: string
 *                 description: 户码
 *     responses:
 *       200:
 *         description: 验证结果
 */
router.post('/validate', householdQRController.validateCode);

// ============================================
// 需要认证的接口
// ============================================

/**
 * @swagger
 * /api/v1/household-qr/generate/{householdId}:
 *   post:
 *     summary: 生成户码二维码
 *     tags: [Household QR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *         description: 家庭ID
 *       - in: query
 *         name: includeImage
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否生成二维码图片
 *     responses:
 *       200:
 *         description: 二维码生成成功
 *       401:
 *         description: 未授权
 */
router.post('/generate/:householdId', authenticateToken, householdQRController.generateQR);

/**
 * @swagger
 * /api/v1/household-qr/scan:
 *   post:
 *     summary: 扫码查看户信息（需登录）
 *     tags: [Household QR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codeId
 *             properties:
 *               codeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 扫码成功
 */
router.post('/scan', authenticateToken, householdQRController.scanQR);

/**
 * @swagger
 * /api/v1/household-qr/update/{codeId}:
 *   put:
 *     summary: 通过二维码更新户信息
 *     tags: [Household QR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: object
 *                 description: 更新地址
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 更新标签
 *               contact:
 *                 type: object
 *                 description: 更新联系方式
 *               memberData:
 *                 type: object
 *                 description: 添加/更新成员数据
 *               memberId:
 *                 type: string
 *                 description: 成员ID（更新时使用）
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 无权限或数据无效
 */
router.put('/update/:codeId', authenticateToken, householdQRController.updateByQR);

/**
 * @swagger
 * /api/v1/household-qr/member/{codeId}/{memberId}:
 *   get:
 *     summary: 获取成员详情
 *     tags: [Household QR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: codeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成员详情
 *       404:
 *         description: 成员不存在
 */
router.get('/member/:codeId/:memberId', authenticateToken, householdQRController.getMember);

// ============================================
// 管理员接口
// ============================================

/**
 * @swagger
 * /api/v1/household-qr/batch/{villageId}:
 *   post:
 *     summary: 批量生成户码（管理员）
 *     tags: [Household QR Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 批量生成结果
 */
router.post('/batch/:villageId',
  // requireRoles(['village_admin', 'super_admin']),
  householdQRController.batchGenerate
);

/**
 * @swagger
 * /api/v1/household-qr/refresh/{householdId}:
 *   post:
 *     summary: 刷新二维码
 *     tags: [Household QR Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 刷新成功
 */
router.post('/refresh/:householdId',
  // requireRoles(['village_admin', 'super_admin']),
  householdQRController.refreshQR
);

/**
 * @swagger
 * /api/v1/household-qr/stats/{villageId}:
 *   get:
 *     summary: 获取户码统计
 *     tags: [Household QR Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 统计信息
 */
router.get('/stats/:villageId',
  // requireRoles(['village_admin', 'super_admin']),
  householdQRController.getStats
);

module.exports = router;
