/**
 * 乡村生活服务圈路由
 * P2功能模块 - 乡村生活服务圈
 */

const express = require('express');
const router = express.Router();
const villageServicesController = require('../controllers/villageServicesController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');
const multer = require('multer');

// 配置文件上传
const upload = multer({ dest: 'uploads/services/' });

// 所有路由需要认证
router.use(authenticate);

/**
 * 邻里互助模块
 */
router.get('/help-requests', villageServicesController.getHelpRequests);
router.post('/help-requests', villageServicesController.createHelpRequest);
router.post('/help-requests/:id/respond', villageServicesController.respondToHelpRequest);
router.put('/help-requests/:id/status', villageServicesController.updateHelpRequestStatus);

/**
 * 拼车服务模块
 */
router.get('/carpool', villageServicesController.getCarpoolRequests);
router.post('/carpool', villageServicesController.createCarpoolRequest);
router.post('/carpool/:id/join', villageServicesController.joinCarpool);

/**
 * 设备共享模块（如共享水泵、农机具）
 */
router.get('/shared-equipment', villageServicesController.getSharedEquipment);
router.post('/shared-equipment', upload.single('image'), villageServicesController.addSharedEquipment);
router.post('/shared-equipment/:id/borrow', villageServicesController.borrowEquipment);
router.post('/shared-equipment/:id/return', villageServicesController.returnEquipment);

/**
 * 乡村活动圈
 */
router.get('/activities', villageServicesController.getActivities);
router.post('/activities', upload.fields([{ name: 'images', maxCount: 9 }, { name: 'video', maxCount: 1 }]), villageServicesController.createActivity);
router.post('/activities/:id/join', villageServicesController.joinActivity);
router.post('/activities/:id/like', villageServicesController.likeActivity);

/**
 * 便民服务点管理
 */
router.get('/service-points', villageServicesController.getServicePoints);
router.post('/service-points', villageServicesController.addServicePoint);

/**
 * 电商对接（助农专区）
 */
router.get('/products', villageServicesController.getAgriculturalProducts);
router.post('/products', upload.single('image'), villageServicesController.addProduct);

module.exports = router;
