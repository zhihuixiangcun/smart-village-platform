/**
 * 家庭管理路由
 */

const express = require('express');
const router = express.Router();
const FamilyController = require('../controllers/familyController');
const familyValidator = require('../validators/familyValidator');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// 创建家庭
router.post(
  '/',
  auth.authenticate,
  familyValidator.createFamily,
  FamilyController.createFamily
);

// 获取家庭列表
router.get(
  '/',
  auth.authenticate,
  familyValidator.getFamilyList,
  FamilyController.getFamilyList
);

// 获取家庭统计数据
router.get(
  '/stats',
  auth.authenticate,
  familyValidator.getFamilyStats,
  FamilyController.getFamilyStats
);

// 根据家庭编码获取家庭信息
router.get(
  '/code/:familyCode',
  auth.authenticate,
  familyValidator.getFamilyByCode,
  FamilyController.getFamilyByCode
);

// 根据身份证查找家庭
router.get(
  '/search/idcard/:idCard',
  auth.authenticate,
  familyValidator.findByIdCard,
  FamilyController.findFamilyByIdCard
);

// 获取家庭详情（通过ID）
router.get(
  '/:familyId',
  auth.authenticate,
  [
    param('familyId')
      .isMongoId()
      .withMessage('家庭ID格式不正确')
  ],
  FamilyController.getFamilyById
);

// 更新家庭信息
router.put(
  '/:familyId',
  auth.authenticate,
  familyValidator.updateFamily,
  FamilyController.updateFamily
);

// 添加家庭成员
router.post(
  '/:familyId/members',
  auth.authenticate,
  familyValidator.addFamilyMember,
  FamilyController.addFamilyMember
);

// 更新家庭成员信息
router.put(
  '/:familyId/members/:memberId',
  auth.authenticate,
  familyValidator.updateFamilyMember,
  FamilyController.updateFamilyMember
);

// 移除家庭成员
router.delete(
  '/:familyId/members/:memberId',
  auth.authenticate,
  [
    param('familyId')
      .isMongoId()
      .withMessage('家庭ID格式不正确'),
    param('memberId')
      .isMongoId()
      .withMessage('成员ID格式不正确')
  ],
  FamilyController.removeFamilyMember
);

// 添加代理关系
router.post(
  '/:familyId/agents',
  auth.authenticate,
  familyValidator.addAgent,
  FamilyController.addAgent
);

// 检查代理权限
router.get(
  '/:familyId/agents/check',
  auth.authenticate,
  familyValidator.checkAgentPermission,
  FamilyController.checkAgentPermission
);

// 获取家庭成员关系图
router.get(
  '/:familyId/relationships',
  auth.authenticate,
  familyValidator.getFamilyRelationships,
  FamilyController.getFamilyRelationships
);

module.exports = router;