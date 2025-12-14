/**
 * 户一码系统API路由
 * 提供户一码管理的完整RESTful接口
 */

const express = require('express');
const router = express.Router();
const Household = require('../models/Household');
const BloodRelationService = require('../services/bloodRelationService');
const QRCodeService = require('../services/qrCodeService');
const { authenticate, authorize } = require('../middleware/auth');
const { validateHousehold, validateQRCode } = require('../middleware/validation');
const upload = require('../middleware/upload');
const logger = require('../config/logger');

const bloodRelationService = new BloodRelationService();
const qrCodeService = new QRCodeService();

/**
 * @route   POST /api/v1/household
 * @desc    创建户一码
 * @access  Private (需要村委及以上权限)
 */
router.post('/', authenticate, authorize(['village_admin', 'department_head']), validateHousehold, async (req, res) => {
  try {
    const householdData = {
      ...req.body,
      metadata: {
        ...req.body.metadata,
        createdBy: req.user._id,
        lastUpdatedBy: req.user._id
      }
    };

    // 生成户码ID
    const household = new Household(householdData);
    household.codeId = household.generateCodeId(req.body.villageCode);
    household.villageId = req.body.villageId;

    await household.save();

    logger.info(`户一码创建成功: ${household.codeId}`);

    res.status(201).json({
      success: true,
      message: '户一码创建成功',
      data: {
        household: household,
        codeId: household.codeId
      }
    });

  } catch (error) {
    logger.error('创建户一码失败:', error);
    res.status(500).json({
      success: false,
      message: '创建户一码失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/household
 * @desc    获取户一码列表
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      status = 'active',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query = { status };

    if (villageId) {
      query.villageId = villageId;
    }

    if (search) {
      query.$or = [
        { 'householder.name': { $regex: search, $options: 'i' } },
        { 'householder.idCard': { $regex: search, $options: 'i' } },
        { codeId: { $regex: search, $options: 'i' } }
      ];
    }

    // 权限控制
    if (req.user.role !== 'super_admin') {
      query.villageId = req.user.village.villageId;
    }

    // 排序
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 分页
    const skip = (page - 1) * limit;

    const households = await Household.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('householder.userId', 'userName phone')
      .lean();

    const total = await Household.countDocuments(query);

    // 数据脱敏
    const sanitizedHouseholds = households.map(household =>
      household.sanitizeData(req.user.role, req.user.profile.idCard)
    );

    res.json({
      success: true,
      data: {
        households: sanitizedHouseholds,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('获取户一码列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取户一码列表失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/household/:codeId
 * @desc    获取户一码详情
 * @access  Private
 */
router.get('/:codeId', authenticate, async (req, res) => {
  try {
    const { codeId } = req.params;

    const household = await Household.findOne({ codeId, status: 'active' })
      .populate('householder.userId', 'userName phone email')
      .populate('members.userId', 'userName phone email');

    if (!household) {
      return res.status(404).json({
        success: false,
        message: '户一码不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' && household.villageId !== req.user.village.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该户一码信息'
      });
    }

    // 数据脱敏
    const sanitizedHousehold = household.sanitizeData(
      req.user.role,
      req.user.profile.idCard
    );

    res.json({
      success: true,
      data: {
        household: sanitizedHousehold
      }
    });

  } catch (error) {
    logger.error('获取户一码详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取户一码详情失败',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/household/:codeId
 * @desc    更新户一码信息
 * @access  Private
 */
router.put('/:codeId', authenticate, validateHousehold, async (req, res) => {
  try {
    const { codeId } = req.params;
    const updates = req.body;

    const household = await Household.findOne({ codeId });

    if (!household) {
      return res.status(404).json({
        success: false,
        message: '户一码不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' &&
        req.user.role !== 'village_admin' &&
        household.villageId !== req.user.village.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权修改该户一码信息'
      });
    }

    // 记录变更历史
    const oldData = household.toObject();
    household.addChangeHistory(
      'update_info',
      req.user._id,
      req.user.profile.displayName,
      `更新户一码信息`,
      oldData,
      updates
    );

    // 应用更新
    Object.assign(household, updates);
    household.metadata.lastUpdatedBy = req.user._id;

    await household.save();

    logger.info(`户一码更新成功: ${codeId}`);

    res.json({
      success: true,
      message: '户一码更新成功',
      data: {
        household: household
      }
    });

  } catch (error) {
    logger.error('更新户一码失败:', error);
    res.status(500).json({
      success: false,
      message: '更新户一码失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/household/:codeId/members
 * @desc    添加家庭成员
 * @access  Private
 */
router.post('/:codeId/members', authenticate, async (req, res) => {
  try {
    const { codeId } = req.params;
    const memberData = req.body;

    const household = await Household.findOne({ codeId });

    if (!household) {
      return res.status(404).json({
        success: false,
        message: '户一码不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' &&
        req.user.role !== 'village_admin' &&
        household.villageId !== req.user.village.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权添加家庭成员'
      });
    }

    // 检查重复
    const existingMember = household.members.find(
      m => m.idCard === memberData.idCard
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: '该身份证号已存在于家庭中'
      });
    }

    // 添加成员
    household.members.push({
      ...memberData,
      joinDate: new Date()
    });

    // 记录变更历史
    household.addChangeHistory(
      'add_member',
      req.user._id,
      req.user.profile.displayName,
      `添加家庭成员: ${memberData.name}`
    );

    await household.save();

    logger.info(`家庭成员添加成功: ${codeId} - ${memberData.name}`);

    res.status(201).json({
      success: true,
      message: '家庭成员添加成功',
      data: {
        household: household
      }
    });

  } catch (error) {
    logger.error('添加家庭成员失败:', error);
    res.status(500).json({
      success: false,
      message: '添加家庭成员失败',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/v1/household/:codeId/members/:memberId
 * @desc    删除家庭成员
 * @access  Private
 */
router.delete('/:codeId/members/:memberId', authenticate, async (req, res) => {
  try {
    const { codeId, memberId } = req.params;

    const household = await Household.findOne({ codeId });

    if (!household) {
      return res.status(404).json({
        success: false,
        message: '户一码不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' &&
        req.user.role !== 'village_admin' &&
        household.villageId !== req.user.village.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权删除家庭成员'
      });
    }

    // 查找成员
    const member = household.members.id(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: '家庭成员不存在'
      });
    }

    // 记录成员信息用于历史记录
    const memberName = member.name;

    // 删除成员（软删除）
    member.isActive = false;

    // 记录变更历史
    household.addChangeHistory(
      'remove_member',
      req.user._id,
      req.user.profile.displayName,
      `删除家庭成员: ${memberName}`
    );

    await household.save();

    logger.info(`家庭成员删除成功: ${codeId} - ${memberName}`);

    res.json({
      success: true,
      message: '家庭成员删除成功'
    });

  } catch (error) {
    logger.error('删除家庭成员失败:', error);
    res.status(500).json({
      success: false,
      message: '删除家庭成员失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/household/:codeId/qrcode
 * @desc    生成户一码二维码
 * @access  Private
 */
router.post('/:codeId/qrcode', authenticate, validateQRCode, async (req, res) => {
  try {
    const { codeId } = req.params;
    const options = req.body;

    const household = await Household.findOne({ codeId });

    if (!household) {
      return res.status(404).json({
        success: false,
        message: '户一码不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' &&
        req.user.role !== 'village_admin' &&
        household.villageId !== req.user.village.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权生成二维码'
      });
    }

    // 生成二维码
    const qrCodeResult = await qrCodeService.generateHouseholdQRCode(
      household._id,
      {
        ...options,
        operatorId: req.user._id
      }
    );

    logger.info(`户一码二维码生成成功: ${codeId}`);

    res.json({
      success: true,
      message: '二维码生成成功',
      data: qrCodeResult
    });

  } catch (error) {
    logger.error('生成二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成二维码失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/household/qrcode/verify
 * @desc    验证户一码二维码
 * @access  Public
 */
router.post('/qrcode/verify', validateQRCode, async (req, res) => {
  try {
    const { qrCodeData } = req.body;
    const options = {
      ...req.body,
      requesterId: req.user?._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const verificationResult = await qrCodeService.verifyQRCode(qrCodeData, options);

    logger.info(`二维码验证: ${verificationResult.valid ? '成功' : '失败'}`);

    res.json({
      success: true,
      data: verificationResult
    });

  } catch (error) {
    logger.error('验证二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '验证二维码失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/household/blood-relation/verify
 * @desc    验证血缘关系
 * @access  Private
 */
router.post('/blood-relation/verify', authenticate, async (req, res) => {
  try {
    const { idCard1, idCard2, relationshipType } = req.body;

    const verificationResult = await bloodRelationService.verifyBloodRelationship(
      idCard1,
      idCard2,
      {
        relationshipType,
        operatorId: req.user._id
      }
    );

    logger.info(`血缘关系验证完成: ${idCard1} <-> ${idCard2} - ${verificationResult.relationship}`);

    res.json({
      success: true,
      data: verificationResult
    });

  } catch (error) {
    logger.error('验证血缘关系失败:', error);
    res.status(500).json({
      success: false,
      message: '验证血缘关系失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/household/:villageId/blood-relation-graph
 * @desc    获取村庄血缘关系图谱
 * @access  Private
 */
router.get('/:villageId/blood-relation-graph', authenticate, async (req, res) => {
  try {
    const { villageId } = req.params;

    // 权限检查
    if (req.user.role !== 'super_admin' &&
        req.user.village.villageId !== villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该村庄的血缘关系图谱'
      });
    }

    const relationshipGraph = await bloodRelationService.buildVillageBloodRelationGraph(villageId);

    logger.info(`血缘关系图谱生成成功: ${villageId}`);

    res.json({
      success: true,
      data: {
        graph: relationshipGraph,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('生成血缘关系图谱失败:', error);
    res.status(500).json({
      success: false,
      message: '生成血缘关系图谱失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/household/search/related-families
 * @desc    推荐潜在血缘关系
 * @access  Private
 */
router.get('/search/related-families', authenticate, async (req, res) => {
  try {
    const { villageId, householdId } = req.query;

    if (!villageId || !householdId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' &&
        req.user.village.villageId !== villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该村庄的推荐功能'
      });
    }

    const recommendations = await bloodRelationService.recommendPotentialRelations(
      villageId,
      householdId
    );

    res.json({
      success: true,
      data: {
        recommendations: recommendations,
        householdId: householdId
      }
    });

  } catch (error) {
    logger.error('推荐潜在血缘关系失败:', error);
    res.status(500).json({
      success: false,
      message: '推荐潜在血缘关系失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/household/batch/qrcode
 * @desc    批量生成二维码
 * @access  Private
 */
router.post('/batch/qrcode', authenticate, authorize(['village_admin']), async (req, res) => {
  try {
    const { householdIds, options = {} } = req.body;

    if (!Array.isArray(householdIds) || householdIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的户一码ID列表'
      });
    }

    // 验证权限
    const households = await Household.find({
      _id: { $in: householdIds },
      villageId: req.user.village.villageId
    });

    if (households.length !== householdIds.length) {
      return res.status(403).json({
        success: false,
        message: '部分户一码无权访问'
      });
    }

    const batchResult = await qrCodeService.batchGenerateQRCodes(
      householdIds,
      {
        ...options,
        operatorId: req.user._id
      }
    );

    logger.info(`批量生成二维码完成: 成功${batchResult.success}个, 失败${batchResult.failure}个`);

    res.json({
      success: true,
      message: '批量生成二维码完成',
      data: batchResult
    });

  } catch (error) {
    logger.error('批量生成二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '批量生成二维码失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/household/statistics/qrcode
 * @desc    获取二维码统计信息
 * @access  Private
 */
router.get('/statistics/qrcode', authenticate, async (req, res) => {
  try {
    const { villageId, filters = {} } = req.query;

    // 权限检查
    if (req.user.role !== 'super_admin' &&
        req.user.village.villageId !== villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该村庄的统计信息'
      });
    }

    const statistics = await qrCodeService.getQRCodeStatistics(villageId, filters);

    res.json({
      success: true,
      data: {
        statistics: statistics,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('获取二维码统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取二维码统计信息失败',
      error: error.message
    });
  }
});

module.exports = router;