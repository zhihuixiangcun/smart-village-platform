/**
 * 村民档案路由
 */

const express = require('express');
const router = express.Router();
const ResidentProfileController = require('../controllers/residentProfileController');
const residentProfileValidator = require('../validators/residentProfileValidator');
const auth = require('../middleware/auth');

// 创建村民档案
router.post(
  '/',
  auth.authenticate,
  residentProfileValidator.createProfile,
  ResidentProfileController.createProfile
);

// 搜索村民档案
router.get(
  '/search',
  auth.authenticate,
  residentProfileValidator.searchProfiles,
  ResidentProfileController.searchProfiles
);

// 获取档案统计数据
router.get(
  '/stats',
  auth.authenticate,
  residentProfileValidator.getProfileStats,
  ResidentProfileController.getProfileStats
);

// 导出档案数据
router.get(
  '/export',
  auth.authenticate,
  residentProfileValidator.exportProfiles,
  ResidentProfileController.exportProfiles
);

// 根据身份证号获取档案
router.get(
  '/search/idcard/:idCard',
  auth.authenticate,
  residentProfileValidator.getProfileByIdCard,
  ResidentProfileController.getProfileByIdCard
);

// 根据用户ID获取档案
router.get(
  '/user/:userId',
  auth.authenticate,
  residentProfileValidator.getProfileByUserId,
  ResidentProfileController.getProfileByUserId
);

// 获取特殊人群列表
router.get(
  '/special/:groupType',
  auth.authenticate,
  residentProfileValidator.getSpecialGroups,
  ResidentProfileController.getSpecialGroups
);

// 获取档案详情（通过ID）
router.get(
  '/:profileId',
  auth.authenticate,
  [
    param('profileId')
      .isMongoId()
      .withMessage('档案ID格式不正确')
  ],
  ResidentProfileController.getProfileById
);

// 更新村民档案
router.put(
  '/:profileId',
  auth.authenticate,
  residentProfileValidator.updateProfile,
  ResidentProfileController.updateProfile
);

// 更新标签
router.put(
  '/:profileId/tags',
  auth.authenticate,
  residentProfileValidator.updateTags,
  ResidentProfileController.updateTags
);

// 删除（注销）村民档案
router.delete(
  '/:profileId',
  auth.authenticate,
  [
    param('profileId')
      .isMongoId()
      .withMessage('档案ID格式不正确')
  ],
  ResidentProfileController.deleteProfile
);

// 我的档案相关路由
const myProfileRouter = express.Router();

// 获取我的档案
myProfileRouter.get(
  '/',
  auth.authenticate,
  ResidentProfileController.getMyProfile
);

// 更新我的档案
myProfileRouter.put(
  '/',
  auth.authenticate,
  residentProfileValidator.updateProfile,
  ResidentProfileController.updateMyProfile
);

// 挂载我的档案路由
router.use('/my', myProfileRouter);

module.exports = router;