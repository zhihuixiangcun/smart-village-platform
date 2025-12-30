/**
 * 村级应急响应系统路由
 * P2功能模块 - 村级应急响应
 */

const express = require('express');
const router = express.Router();
const emergencyResponseController = require('../controllers/emergencyResponseController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');

// 所有路由需要认证
router.use(authenticate);

/**
 * 应急预案管理
 */
router.get('/plans', authorize(['emergency:read']), emergencyResponseController.getPlans);
router.post('/plans', authorize(['emergency:write']), emergencyResponseController.createPlan);
router.put('/plans/:id', authorize(['emergency:write']), emergencyResponseController.updatePlan);
router.delete('/plans/:id', authorize(['emergency:write']), emergencyResponseController.deletePlan);

/**
 * 一键启动预案
 */
router.post('/plans/:planId/activate', authorize(['emergency:execute']), emergencyResponseController.activatePlan);

/**
 * 救援设备管理
 */
router.get('/equipment', authorize(['emergency:read']), emergencyResponseController.getEquipment);
router.post('/equipment', authorize(['emergency:write']), emergencyResponseController.addEquipment);
router.put('/equipment/:id', authorize(['emergency:write']), emergencyResponseController.updateEquipment);
router.delete('/equipment/:id', authorize(['emergency:write']), emergencyResponseController.deleteEquipment);

/**
 * 设备位置查询
 */
router.get('/equipment/location', authorize(['emergency:read']), emergencyResponseController.getEquipmentByLocation);

/**
 * 应急演练记录
 */
router.get('/drills', authorize(['emergency:read']), emergencyResponseController.getDrills);
router.post('/drills', authorize(['emergency:write']), emergencyResponseController.createDrill);

/**
 * 应急队伍管理
 */
router.get('/teams', authorize(['emergency:read']), emergencyResponseController.getTeams);
router.post('/teams', authorize(['emergency:write']), emergencyResponseController.createTeam);

/**
 * 紧急通知发送
 */
router.post('/broadcast', authorize(['emergency:broadcast']), emergencyResponseController.sendEmergencyBroadcast);

module.exports = router;
