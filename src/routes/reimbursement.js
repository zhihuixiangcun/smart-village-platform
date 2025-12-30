/**
 * 村委财务报销路由
 * 报销申请管理、审批流程、附件上传和统计分析
 */

const express = require('express');
const router = express.Router();
const reimbursementController = require('../controllers/reimbursementController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

// 配置文件上传
const upload = multer({ dest: 'uploads/reimbursement/' });

// 所有路由需要认证
router.use(authenticate);

/**
 * ========== 报销申请管理 ==========
 */
// 创建报销
router.post('/', reimbursementController.createReimbursement);

// 获取报销列表
router.get('/', reimbursementController.getReimbursements);

// 获取报销详情
router.get('/:id', reimbursementController.getReimbursementById);

// 更新报销
router.put('/:id', reimbursementController.updateReimbursement);

// 提交审批
router.post('/:id/submit', reimbursementController.submitReimbursement);

// 审批报销
router.post('/:id/approve', reimbursementController.approveReimbursement);

// 上传附件
router.post('/:id/attachments',
  upload.single('file'),
  reimbursementController.uploadAttachment
);

// 个人统计
router.get('/stats/personal', reimbursementController.getPersonalStatistics);

// 村级统计
router.get('/stats/village', reimbursementController.getVillageStatistics);

// 删除报销
router.delete('/:id', reimbursementController.deleteReimbursement);

module.exports = router;