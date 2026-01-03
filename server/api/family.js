/**
 * Family API Routes
 * 家庭管理API路由
 */

const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { authenticate } = require('../middleware/auth');

// 中间件：验证村庄权限
const checkVillagePermission = (req, res, next) => {
  // 这里应该添加权限验证逻辑
  // 例如：检查用户是否有权限访问指定村庄的数据
  next();
};

// ==================== 家庭档案管理 ====================

/**
 * @route   POST /api/family
 * @desc    创建家庭档案
 * @access  Private (需要管理员权限)
 */
router.post('/', authenticate, familyController.createFamily);

/**
 * @route   PUT /api/family/:familyId
 * @desc    更新家庭档案
 * @access  Private
 */
router.put('/:familyId', authenticate, familyController.updateFamily);

/**
 * @route   DELETE /api/family/:familyId
 * @desc    删除家庭档案（软删除）
 * @access  Private (需要管理员权限)
 */
router.delete('/:familyId', authenticate, familyController.deleteFamily);

/**
 * @route   GET /api/family/:familyId
 * @desc    获取家庭详情
 * @access  Private
 */
router.get('/:familyId', authenticate, checkVillagePermission, familyController.getFamilyById);

/**
 * @route   GET /api/family/qrcode/:qrCode
 * @desc    根据二维码获取家庭信息（公开接口）
 * @access  Public
 */
router.get('/qrcode/:qrCode', familyController.getFamilyByQRCode);

/**
 * @route   GET /api/family/village/:villageId
 * @desc    获取村庄家庭列表
 * @access  Private
 */
router.get('/village/:villageId', authenticate, checkVillagePermission, familyController.getFamilyList);

/**
 * @route   GET /api/family/village/:villageId/search/:keyword
 * @desc    搜索家庭
 * @access  Private
 */
router.get('/village/:villageId/search/:keyword', authenticate, checkVillagePermission, familyController.searchFamilies);

/**
 * @route   GET /api/family/village/:villageId/statistics
 * @desc    获取村庄家庭统计数据
 * @access  Private
 */
router.get('/village/:villageId/statistics', authenticate, checkVillagePermission, familyController.getStatistics);

/**
 * @route   GET /api/family/village/:villageId/export
 * @desc    导出家庭数据
 * @access  Private
 */
router.get('/village/:villageId/export', authenticate, checkVillagePermission, familyController.exportFamilyData);

// ==================== 家庭成员管理 ====================

/**
 * @route   POST /api/family/:familyId/members
 * @desc    添加家庭成员
 * @access  Private
 */
router.post('/:familyId/members', authenticate, familyController.addFamilyMember);

/**
 * @route   PUT /api/family/members/:memberId
 * @desc    更新家庭成员信息
 * @access  Private
 */
router.put('/members/:memberId', authenticate, familyController.updateFamilyMember);

/**
 * @route   DELETE /api/family/members/:memberId
 * @desc    删除家庭成员
 * @access  Private
 */
router.delete('/members/:memberId', authenticate, familyController.deleteFamilyMember);

// ==================== 二维码管理 ====================

/**
 * @route   POST /api/family/:familyId/qrcode/regenerate
 * @desc    重新生成二维码
 * @access  Private
 */
router.post('/:familyId/qrcode/regenerate', authenticate, familyController.regenerateQRCode);

/**
 * @route   POST /api/family/:familyId/qrcode/revoke
 * @desc    撤销二维码
 * @access  Private
 */
router.post('/:familyId/qrcode/revoke', authenticate, familyController.revokeQRCode);

/**
 * @route   POST /api/family/:familyId/qrcode/print
 * @desc    记录二维码打印
 * @access  Private
 */
router.post('/:familyId/qrcode/print', authenticate, familyController.recordQRCodePrint);

// ==================== 标签管理 ====================

/**
 * @route   POST /api/family/:familyId/tags
 * @desc    添加家庭标签
 * @access  Private
 */
router.post('/:familyId/tags', authenticate, familyController.addFamilyTag);

/**
 * @route   DELETE /api/family/:familyId/tags/:tagName
 * @desc    移除家庭标签
 * @access  Private
 */
router.delete('/:familyId/tags/:tagName', authenticate, familyController.removeFamilyTag);

/**
 * @route   POST /api/family/members/:memberId/tags
 * @desc    添加成员特殊标签
 * @access  Private
 */
router.post('/members/:memberId/tags', authenticate, familyController.addMemberSpecialTag);

/**
 * @route   DELETE /api/family/members/:memberId/tags/:tag
 * @desc    移除成员特殊标签
 * @access  Private
 */
router.delete('/members/:memberId/tags/:tag', authenticate, familyController.removeMemberSpecialTag);

// ==================== 远程认证 ====================

/**
 * @route   POST /api/family/auth/:sessionId/recognize
 * @desc    执行人脸识别
 * @access  Public
 */
router.post('/auth/:sessionId/recognize', familyController.performFaceRecognition);

/**
 * @route   POST /api/family/auth/verify-token
 * @desc    验证认证Token
 * @access  Public
 */
router.post('/auth/verify-token', familyController.verifyAuthToken);

/**
 * @route   POST /api/family/auth/liveness
 * @desc    活体检测
 * @access  Public
 */
router.post('/auth/liveness', familyController.performLivenessDetection);

// ==================== 亲属代理 ====================

/**
 * @route   POST /api/family/members/:memberId/proxy/request
 * @desc    请求亲属代理认证
 * @access  Private
 */
router.post('/members/:memberId/proxy/request', authenticate, familyController.requestProxyAuth);

/**
 * @route   POST /api/family/members/:memberId/proxy/settings
 * @desc    设置代理配置
 * @access  Private
 */
router.post('/members/:memberId/proxy/settings', authenticate, familyController.setProxySettings);

/**
 * @route   GET /api/family/members/:memberId/proxy/available
 * @desc    获取可用代理列表
 * @access  Private
 */
router.get('/members/:memberId/proxy/available', authenticate, familyController.getAvailableProxies);

// ==================== 人脸信息管理 ====================

/**
 * @route   POST /api/family/members/:memberId/face/register
 * @desc    注册人脸信息
 * @access  Private
 */
router.post('/members/:memberId/face/register', authenticate, familyController.registerFace);

/**
 * @route   POST /api/family/members/:memberId/face/authenticate
 * @desc    初始化人脸认证
 * @access  Public
 */
router.post('/members/:memberId/face/authenticate', familyController.initializeFaceAuth);

/**
 * @route   GET /api/family/members/:memberId/auth/history
 * @desc    获取认证记录
 * @access  Private
 */
router.get('/members/:memberId/auth/history', authenticate, familyController.getAuthHistory);

/**
 * @route   POST /api/family/members/:memberId/auth/reset
 * @desc    重置认证状态
 * @access  Private
 */
router.post('/members/:memberId/auth/reset', authenticate, familyController.resetAuthStatus);

// ==================== 批量操作 ====================

/**
 * @route   POST /api/family/batch/import
 * @desc    批量导入家庭数据
 * @access  Private (需要管理员权限)
 */
router.post('/batch/import', authenticate, familyController.batchImportFamilies);

module.exports = router;
