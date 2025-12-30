/**
 * 阳光村务系统路由
 * P2功能模块 - 财务透明化、工程进度监督
 */

const express = require('express');
const router = express.Router();
const transparencyController = require('../controllers/transparencyController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permission');
const multer = require('multer');
const { body } = require('express-validator');

// 配置文件上传
const upload = multer({ dest: 'uploads/transparency/' });

// 所有路由需要认证
router.use(authenticate);

/**
 * 财务透明化 - 发票管理
 */
router.get('/invoices', transparencyController.getInvoices);
router.post('/invoices',
  upload.single('invoiceImage'),
  [
    body('amount').isNumeric().withMessage('金额必须是数字'),
    body('category').notEmpty().withMessage('类别不能为空'),
    body('description').notEmpty().withMessage('描述不能为空')
  ],
  transparencyController.createInvoice
);

/**
 * 财务透明化 - 收支流水
 */
router.get('/transactions', transparencyController.getTransactions);
router.get('/transactions/statistics', transparencyController.getTransactionStatistics);

/**
 * 工程项目监督
 */
router.get('/projects', transparencyController.getProjects);
router.post('/projects',
  upload.fields([{ name: 'beforePhoto', maxCount: 1 }, { name: 'afterPhoto', maxCount: 1 }]),
  transparencyController.createProject
);

/**
 * 工程进度上报（村民拍照监督）
 */
router.post('/projects/:id/progress',
  upload.single('progressPhoto'),
  transparencyController.reportProjectProgress
);

/**
 * 质量问题反馈
 */
router.post('/projects/:id/feedback',
  upload.single('feedbackPhoto'),
  transparencyController.submitQualityFeedback
);

/**
 * 村务决策公开
 */
router.get('/decisions', transparencyController.getDecisions);
router.post('/decisions', authorize(['committee:write']), transparencyController.createDecision);

/**
 * 投票记录公开
 */
router.get('/votes/:decisionId', transparencyController.getVoteRecords);

/**
 * 区块链存证
 */
router.post('/blockchain/record', transparencyController.createBlockchainRecord);
router.get('/blockchain/verify/:id', transparencyController.verifyBlockchainRecord);

module.exports = router;
