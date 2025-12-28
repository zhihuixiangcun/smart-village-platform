/**
 * 村委管理路由
 *
 * 功能：
 * - 村委成员的增删改查
 * - 职务变更与权限分配
 * - 统计分析与数据导出
 *
 * @author Smart Village Platform
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const CommitteeController = require('../controllers/committeeController');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// 限流配置
const committeeMutateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 最多10次操作
  message: {
    success: false,
    message: '操作过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const exportLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 最多5次导出
  message: {
    success: false,
    message: '导出次数已达上限'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 验证中间件
const handleValidationErrors = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

// ==================== 村委成员管理 ====================

/**
 * @route   POST /api/v1/committee/members
 * @desc    创建村委成员
 * @access  Private (需要 committee:create 权限)
 */
router.post('/members',
  auth,
  [
    body('name').trim().notEmpty().withMessage('姓名不能为空'),
    body('idCard').trim().isLength({ min: 15, max: 18 }).withMessage('身份证号格式不正确'),
    body('phone').trim().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
    body('position.current').isIn([
      'village_secretary',
      'village_head',
      'accountant',
      'population_admin',
      'party_secretary',
      'vice_secretary',
      'committee_member'
    ]).withMessage('职务类型不正确'),
    body('villageId').isMongoId().withMessage('村庄ID格式不正确')
  ],
  handleValidationErrors,
  committeeMutateLimit,
  CommitteeController.createMember
);

/**
 * @route   GET /api/v1/committee/members
 * @desc    获取村委成员列表（分页+搜索）
 * @access  Private (需要 committee:view_all 或本村权限)
 */
router.get('/members',
  auth,
  [
    query('villageId').optional().isMongoId().withMessage('村庄ID格式不正确'),
    query('status').optional().isIn(['active', 'inactive', 'transferred', 'resigned', 'all']),
    query('position').optional().isIn([
      'village_secretary',
      'village_head',
      'accountant',
      'population_admin',
      'party_secretary',
      'vice_secretary',
      'committee_member'
    ]),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  handleValidationErrors,
  CommitteeController.getMembers
);

/**
 * @route   GET /api/v1/committee/members/:id
 * @desc    获取单个村委成员详情
 * @access  Private
 */
router.get('/members/:id',
  auth,
  [
    param('id').isMongoId().withMessage('成员ID格式不正确'),
    query('includeSensitive').optional().isBoolean()
  ],
  handleValidationErrors,
  CommitteeController.getMemberById
);

/**
 * @route   PUT /api/v1/committee/members/:id
 * @desc    更新村委成员信息
 * @access  Private
 */
router.put('/members/:id',
  auth,
  [
    param('id').isMongoId().withMessage('成员ID格式不正确')
  ],
  handleValidationErrors,
  committeeMutateLimit,
  CommitteeController.updateMember
);

/**
 * @route   DELETE /api/v1/committee/members/:id
 * @desc    删除村委成员（软删除）
 * @access  Private (需要 committee:delete 权限)
 */
router.delete('/members/:id',
  auth,
  [
    param('id').isMongoId().withMessage('成员ID格式不正确')
  ],
  handleValidationErrors,
  committeeMutateLimit,
  CommitteeController.deleteMember
);

/**
 * @route   POST /api/v1/committee/members/:id/position/change
 * @desc    变更职务
 * @access  Private (需要 committee:change_position 权限)
 */
router.post('/members/:id/position/change',
  auth,
  [
    param('id').isMongoId().withMessage('成员ID格式不正确'),
    body('newPosition').isIn([
      'village_secretary',
      'village_head',
      'accountant',
      'population_admin',
      'party_secretary',
      'vice_secretary',
      'committee_member'
    ]).withMessage('新职务类型不正确'),
    body('reason').optional().trim(),
    body('proofDoc').optional().isURL()
  ],
  handleValidationErrors,
  committeeMutateLimit,
  CommitteeController.changePosition
);

/**
 * @route   POST /api/v1/committee/members/:id/roles
 * @desc    添加角色权限
 * @access  Private (需要 committee:assign_roles 权限)
 */
router.post('/members/:id/roles',
  auth,
  [
    param('id').isMongoId().withMessage('成员ID格式不正确'),
    body('roleData.type').isIn(['secretary', 'accountant', 'population_admin', 'member'])
      .withMessage('角色类型不正确'),
    body('roleData.villageId').isMongoId().withMessage('村庄ID格式不正确'),
    body('roleData.permissions').optional().isArray()
  ],
  handleValidationErrors,
  committeeMutateLimit,
  CommitteeController.addRole
);

/**
 * @route   DELETE /api/v1/committee/members/:id/roles/:roleType
 * @desc    移除角色权限
 * @access  Private (需要 committee:assign_roles 权限)
 */
router.delete('/members/:id/roles/:roleType',
  auth,
  [
    param('id').isMongoId().withMessage('成员ID格式不正确'),
    param('roleType').isIn(['secretary', 'accountant', 'population_admin', 'member'])
      .withMessage('角色类型不正确'),
    body('villageId').isMongoId().withMessage('村庄ID格式不正确')
  ],
  handleValidationErrors,
  committeeMutateLimit,
  CommitteeController.removeRole
);

// ==================== 统计分析 ====================

/**
 * @route   GET /api/v1/committee/statistics
 * @desc    获取村委统计
 * @access  Private (需要 committee:view_statistics 权限)
 */
router.get('/statistics',
  auth,
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确')
  ],
  handleValidationErrors,
  CommitteeController.getStatistics
);

/**
 * @route   GET /api/v1/committee/party-members
 * @desc    获取党员列表
 * @access  Private
 */
router.get('/party-members',
  auth,
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  CommitteeController.getPartyMembers
);

/**
 * @route   GET /api/v1/committee/positions
 * @desc    获取职务列表
 * @access  Private
 */
router.get('/positions',
  auth,
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确'),
    query('position').optional()
  ],
  handleValidationErrors,
  CommitteeController.getMembersByPosition
);

// ==================== 搜索与导出 ====================

/**
 * @route   GET /api/v1/committee/members/search
 * @desc    搜索村委成员
 * @access  Private
 */
router.get('/members/search',
  auth,
  [
    query('keyword').trim().notEmpty().withMessage('搜索关键词不能为空'),
    query('villageId').isMongoId().withMessage('村庄ID格式不正确')
  ],
  handleValidationErrors,
  CommitteeController.searchMembers
);

/**
 * @route   GET /api/v1/committee/members/export
 * @desc    导出村委成员数据
 * @access  Private (需要 committee:export 权限)
 */
router.get('/members/export',
  auth,
  [
    query('villageId').isMongoId().withMessage('村庄ID格式不正确'),
    query('format').optional().isIn(['json', 'xlsx', 'csv'])
  ],
  handleValidationErrors,
  exportLimit,
  CommitteeController.exportMembers
);

module.exports = router;
