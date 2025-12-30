/**
 * 上级联动枢纽路由
 * P2功能模块 - 数据自动上报、跨域资源调度
 */

const express = require('express');
const router = express.Router();
const governmentLinkageController = require('../controllers/governmentLinkageController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');

// 所有路由需要认证
router.use(authenticate);

/**
 * 数据自动上报
 */
router.post('/reports/auto', authorize(['committee:write']), governmentLinkageController.autoGenerateReport);
router.get('/reports', governmentLinkageController.getReports);
router.get('/reports/:id', governmentLinkageController.getReportDetail);

/**
 * 人口数据上报
 */
router.post('/population/sync', authorize(['committee:write']), governmentLinkageController.syncPopulationData);
router.get('/population/statistics', governmentLinkageController.getPopulationStatistics);

/**
 * 跨域资源调度申请
 */
router.post('/resources/request', authorize(['committee:write']), governmentLinkageController.requestResource);
router.get('/resources', governmentLinkageController.getResources);
router.get('/resources/:id/status', governmentLinkageController.getResourceStatus);

/**
 * 政策接收与分发
 */
router.get('/policies', governmentLinkageController.getPolicies);
router.post('/policies/:id/distribute', authorize(['committee:write']), governmentLinkageController.distributePolicy);

/**
 * 任务承接与反馈
 */
router.get('/tasks', governmentLinkageController.getTasks);
router.post('/tasks/:id/accept', authorize(['committee:write']), governmentLinkageController.acceptTask);
router.post('/tasks/:id/feedback', authorize(['committee:write']), governmentLinkageController.submitTaskFeedback);

/**
 * 跨村协作
 */
router.get('/collaboration', governmentLinkageController.getCollaborationRequests);
router.post('/collaboration', authorize(['committee:write']), governmentLinkageController.createCollaborationRequest);
router.post('/collaboration/:id/respond', authorize(['committee:write']), governmentLinkageController.respondToCollaboration);

/**
 * 应急资源调度
 */
router.post('/emergency/dispatch', authorize(['emergency:execute']), governmentLinkageController.dispatchEmergencyResource);
router.get('/emergency/resources', governmentLinkageController.getEmergencyResources);

module.exports = router;
