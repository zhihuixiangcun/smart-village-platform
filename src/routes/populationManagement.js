/**
 * 人口管理路由
 * 处理村民分组、人口变动等功能
 * 主要用户：人口主任 (population_admin)
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, auditLog } = require('../middleware/newPermissionMiddleware');

// 引入模型
const ResidentGroup = require('../models/ResidentGroup');
const PopulationChange = require('../models/PopulationChange');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// 所有路由需要认证
router.use(authenticateToken);

// ==================== 村民分组管理 ====================

/**
 * @route   POST /api/population/groups
 * @desc    创建村民分组
 * @access  Private (人口主任权限)
 */
router.post('/groups',
  checkPermission(['group:create']),
  auditLog('创建村民分组', false),
  async (req, res) => {
    try {
      const {
        groupName,
        groupType,
        villageId,
        description,
        carePlan,
        autoGroupRules,
        tags
      } = req.body;

      // 验证分组类型
      const validTypes = [
        'special_care',
        'dynamic_monitoring',
        'party_member',
        'volunteer',
        'grid_responsibility',
        'custom'
      ];

      if (!validTypes.includes(groupType)) {
        return res.status(400).json({
          success: false,
          message: '无效的分组类型'
        });
      }

      // 检查同一村是否已有同名分组
      const existingGroup = await ResidentGroup.findOne({
        villageId,
        groupName,
        status: 'active'
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: '该村庄已存在同名分组'
        });
      }

      // 创建分组
      const group = new ResidentGroup({
        groupId: `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        groupName,
        groupType,
        villageId,
        description,
        members: [],
        carePlan: carePlan || { enabled: false },
        autoGroupRules: autoGroupRules || {},
        tags: tags || [],
        createdBy: req.user._id,
        status: 'active',
        createdAt: new Date()
      });

      await group.save();

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.name,
        operatorRole: req.user.role,
        action: 'create_resident_group',
        resourceType: 'ResidentGroup',
        resourceId: group._id,
        details: {
          groupId: group.groupId,
          groupName,
          groupType,
          villageId
        },
        isSensitive: false,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        message: '分组创建成功',
        data: group
      });
    } catch (error) {
      logger.error('创建分组失败:', error);
      res.status(500).json({
        success: false,
        message: '创建分组失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/population/groups
 * @desc    获取村民分组列表
 * @access  Private (人口主任权限)
 */
router.get('/groups', checkPermission(['group:read']), async (req, res) => {
  try {
    const {
      villageId,
      groupType,
      status = 'active',
      page = 1,
      limit = 20
    } = req.query;

    const query = { status };
    if (villageId) query.villageId = villageId;
    if (groupType) query.groupType = groupType;

    // 如果不是村支书和人口主任，只能看到自己村的数据
    if (req.user.role !== 'secretary' &&
        req.user.role !== 'population_admin' &&
        req.user.villageId) {
      query.villageId = req.user.villageId;
    }

    const total = await ResidentGroup.countDocuments(query);
    const groups = await ResidentGroup.find(query)
      .populate('createdBy', 'name')
      .populate('members.userId', 'name phone villageId householdId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        groups,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取分组列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分组列表失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/population/groups/:groupId
 * @desc    获取单个分组详情
 * @access  Private
 */
router.get('/groups/:groupId', async (req, res) => {
  try {
    const group = await ResidentGroup.findOne({
      groupId: req.params.groupId
    })
      .populate('createdBy', 'name')
      .populate('members.userId', 'name phone idCard villageId householdId age')
      .populate('members.careTasks.assignedTo', 'name');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: '分组不存在'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    logger.error('获取分组详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分组详情失败',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/population/groups/:groupId
 * @desc    更新分组信息
 * @access  Private (人口主任权限)
 */
router.put('/groups/:groupId',
  checkPermission(['group:update']),
  auditLog('更新村民分组', false),
  async (req, res) => {
    try {
      const {
        groupName,
        description,
        carePlan,
        autoGroupRules,
        tags,
        status
      } = req.body;

      const group = await ResidentGroup.findOne({
        groupId: req.params.groupId
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: '分组不存在'
        });
      }

      // 记录变更前状态
      const beforeState = {
        groupName: group.groupName,
        description: group.description,
        carePlan: group.carePlan,
        tags: group.tags
      };

      // 更新字段
      if (groupName) group.groupName = groupName;
      if (description !== undefined) group.description = description;
      if (carePlan) group.carePlan = { ...group.carePlan, ...carePlan };
      if (autoGroupRules) group.autoGroupRules = autoGroupRules;
      if (tags) group.tags = tags;
      if (status) group.status = status;

      group.updatedAt = new Date();
      await group.save();

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.name,
        operatorRole: req.user.role,
        action: 'update_resident_group',
        resourceType: 'ResidentGroup',
        resourceId: group._id,
        details: {
          groupId: group.groupId,
          groupName
        },
        changes: {
          before: beforeState,
          after: {
            groupName: group.groupName,
            description: group.description,
            carePlan: group.carePlan,
            tags: group.tags
          }
        },
        isSensitive: false,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: '更新成功',
        data: group
      });
    } catch (error) {
      logger.error('更新分组失败:', error);
      res.status(500).json({
        success: false,
        message: '更新失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/population/groups/:groupId/members
 * @desc    添加分组成员
 * @access  Private (人口主任权限)
 */
router.post('/groups/:groupId/members',
  checkPermission(['group:update']),
  auditLog('添加分组成员', false),
  async (req, res) => {
    try {
      const { userIds, careTasks } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供要添加的用户ID列表'
        });
      }

      const group = await ResidentGroup.findOne({
        groupId: req.params.groupId
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: '分组不存在'
        });
      }

      // 验证用户是否存在
      const users = await User.find({ _id: { $in: userIds } });
      if (users.length !== userIds.length) {
        return res.status(400).json({
          success: false,
          message: '部分用户不存在'
        });
      }

      // 添加成员
      const newMembers = userIds.map(userId => ({
        userId,
        joinedAt: new Date(),
        careTasks: careTasks || []
      }));

      // 过滤已存在的成员
      const existingMemberIds = group.members.map(m => m.userId.toString());
      const membersToAdd = newMembers.filter(
        m => !existingMemberIds.includes(m.userId.toString())
      );

      if (membersToAdd.length === 0) {
        return res.status(400).json({
          success: false,
          message: '这些用户已在分组中'
        });
      }

      group.members.push(...membersToAdd);
      group.memberCount = group.members.length;
      group.updatedAt = new Date();
      await group.save();

      res.json({
        success: true,
        message: `成功添加 ${membersToAdd.length} 名成员`,
        data: {
          addedCount: membersToAdd.length,
          totalMembers: group.memberCount
        }
      });
    } catch (error) {
      logger.error('添加成员失败:', error);
      res.status(500).json({
        success: false,
        message: '添加成员失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/population/groups/:groupId/members/:userId
 * @desc    移除分组成员
 * @access  Private (人口主任权限)
 */
router.delete('/groups/:groupId/members/:userId',
  checkPermission(['group:update']),
  auditLog('移除分组成员', false),
  async (req, res) => {
    try {
      const group = await ResidentGroup.findOne({
        groupId: req.params.groupId
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: '分组不存在'
        });
      }

      const memberIndex = group.members.findIndex(
        m => m.userId.toString() === req.params.userId
      );

      if (memberIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '成员不存在'
        });
      }

      group.members.splice(memberIndex, 1);
      group.memberCount = group.members.length;
      group.updatedAt = new Date();
      await group.save();

      res.json({
        success: true,
        message: '成员已移除',
        data: {
          totalMembers: group.memberCount
        }
      });
    } catch (error) {
      logger.error('移除成员失败:', error);
      res.status(500).json({
        success: false,
        message: '移除成员失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/population/groups/:groupId
 * @desc    删除分组
 * @access  Private (仅村支书和人口主任)
 */
router.delete('/groups/:groupId',
  checkPermission(['group:delete']),
  auditLog('删除村民分组', false),
  async (req, res) => {
    try {
      const group = await ResidentGroup.findOne({
        groupId: req.params.groupId
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: '分组不存在'
        });
      }

      // 软删除
      group.status = 'deleted';
      group.deletedAt = new Date();
      group.deletedBy = req.user._id;
      await group.save();

      res.json({
        success: true,
        message: '分组已删除'
      });
    } catch (error) {
      logger.error('删除分组失败:', error);
      res.status(500).json({
        success: false,
        message: '删除分组失败',
        error: error.message
      });
    }
  }
);

// ==================== 人口变动管理 ====================

/**
 * @route   POST /api/population/changes
 * @desc    提交人口变动申请
 * @access  Private (人口主任权限)
 */
router.post('/changes',
  checkPermission(['population:create']),
  auditLog('提交人口变动申请', true),
  async (req, res) => {
    try {
      const {
        changeType,
        villageId,
        householdId,
        personInfo,
        changeDate,
        documents,
        notes,
        autoUpdateHousehold = false
      } = req.body;

      // 验证变动类型
      const validTypes = [
        'birth',
        'marriage_in',
        'marriage_out',
        'death',
        'move_in',
        'move_out'
      ];

      if (!validTypes.includes(changeType)) {
        return res.status(400).json({
          success: false,
          message: '无效的变动类型'
        });
      }

      // 创建变动记录
      const change = new PopulationChange({
        changeId: `CHG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        changeType,
        villageId,
        householdId,
        personInfo: {
          name: personInfo.name,
          idCard: personInfo.idCard,
          gender: personInfo.gender,
          birthDate: personInfo.birthDate,
          relation: personInfo.relation,
          phone: personInfo.phone
        },
        changeDate: new Date(changeDate),
        documents: documents || [],
        notes,
        submittedBy: req.user._id,
        status: 'pending',
        autoUpdateHousehold,
        createdAt: new Date()
      });

      await change.save();

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.name,
        operatorRole: req.user.role,
        action: 'submit_population_change',
        resourceType: 'PopulationChange',
        resourceId: change._id,
        details: {
          changeId: change.changeId,
          changeType,
          villageId,
          householdId,
          personName: personInfo.name
        },
        isSensitive: true,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        message: '变动申请已提交，等待审核',
        data: {
          changeId: change.changeId,
          status: change.status
        }
      });
    } catch (error) {
      logger.error('提交变动申请失败:', error);
      res.status(500).json({
        success: false,
        message: '提交申请失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/population/changes
 * @desc    获取人口变动列表
 * @access  Private (人口主任权限)
 */
router.get('/changes', checkPermission(['population:read']), async (req, res) => {
  try {
    const {
      villageId,
      householdId,
      changeType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    if (villageId) query.villageId = villageId;
    if (householdId) query.householdId = householdId;
    if (changeType) query.changeType = changeType;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.changeDate = {};
      if (startDate) query.changeDate.$gte = new Date(startDate);
      if (endDate) query.changeDate.$lte = new Date(endDate);
    }

    // 如果不是村支书和人口主任，只能看到自己村的数据
    if (req.user.role !== 'secretary' &&
        req.user.role !== 'population_admin' &&
        req.user.villageId) {
      query.villageId = req.user.villageId;
    }

    const total = await PopulationChange.countDocuments(query);
    const changes = await PopulationChange.find(query)
      .populate('submittedBy', 'name')
      .populate('reviewedBy', 'name')
      .sort({ changeDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        changes,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取变动列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取变动列表失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/population/changes/:changeId
 * @desc    获取单个变动详情
 * @access  Private
 */
router.get('/changes/:changeId', async (req, res) => {
  try {
    const change = await PopulationChange.findOne({
      changeId: req.params.changeId
    })
      .populate('submittedBy', 'name phone')
      .populate('reviewedBy', 'name')
      .populate('householdId', 'householdNumber address');

    if (!change) {
      return res.status(404).json({
        success: false,
        message: '变动记录不存在'
      });
    }

    res.json({
      success: true,
      data: change
    });
  } catch (error) {
    logger.error('获取变动详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取变动详情失败',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/population/changes/:changeId/review
 * @desc    审核人口变动申请
 * @access  Private (村支书或人口主任)
 */
router.put('/changes/:changeId/review',
  checkPermission(['population:approve']),
  auditLog('审核人口变动申请', true),
  async (req, res) => {
    try {
      const { decision, reviewNotes } = req.body;
      const change = await PopulationChange.findOne({
        changeId: req.params.changeId
      });

      if (!change) {
        return res.status(404).json({
          success: false,
          message: '变动记录不存在'
        });
      }

      if (change.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '该申请已处理'
        });
      }

      const beforeState = { status: change.status };

      if (decision === 'approve') {
        change.status = 'approved';

        // 如果需要自动更新家庭档案
        if (change.autoUpdateHousehold && change.householdId) {
          try {
            const Household = require('../models/Household');
            const household = await Household.findById(change.householdId);

            if (household) {
              switch (change.changeType) {
                case 'birth':
                  // 新增家庭成员
                  household.members.push({
                    name: change.personInfo.name,
                    idCard: change.personInfo.idCard,
                    gender: change.personInfo.gender,
                    birthDate: change.personInfo.birthDate,
                    relation: change.personInfo.relation,
                    phone: change.personInfo.phone
                  });
                  household.populationCount += 1;
                  break;

                case 'death':
                  // 标记成员为已故
                  const member = household.members.find(
                    m => m.idCard === change.personInfo.idCard
                  );
                  if (member) {
                    member.isAlive = false;
                    member.deathDate = change.changeDate;
                    household.populationCount -= 1;
                  }
                  break;

                case 'marriage_out':
                case 'move_out':
                  // 移除成员
                  household.members = household.members.filter(
                    m => m.idCard !== change.personInfo.idCard
                  );
                  household.populationCount -= 1;
                  break;

                case 'marriage_in':
                case 'move_in':
                  // 新增成员
                  household.members.push({
                    name: change.personInfo.name,
                    idCard: change.personInfo.idCard,
                    gender: change.personInfo.gender,
                    birthDate: change.personInfo.birthDate,
                    relation: change.personInfo.relation,
                    phone: change.personInfo.phone
                  });
                  household.populationCount += 1;
                  break;
              }

              await household.save();
            }
          } catch (err) {
            logger.error('自动更新家庭档案失败:', err);
          }
        }
      } else if (decision === 'reject') {
        change.status = 'rejected';
      }

      change.reviewedBy = req.user._id;
      change.reviewedAt = new Date();
      change.reviewNotes = reviewNotes;

      await change.save();

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.name,
        operatorRole: req.user.role,
        action: decision === 'approve' ? 'approve_population_change' : 'reject_population_change',
        resourceType: 'PopulationChange',
        resourceId: change._id,
        details: {
          changeId: change.changeId,
          changeType: change.changeType,
          personName: change.personInfo.name,
          decision,
          reviewNotes
        },
        changes: {
          before: beforeState,
          after: { status: change.status }
        },
        isSensitive: true,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: decision === 'approve' ? '已通过' : '已驳回',
        data: {
          changeId: change.changeId,
          status: change.status
        }
      });
    } catch (error) {
      logger.error('审核变动申请失败:', error);
      res.status(500).json({
        success: false,
        message: '审核失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/population/statistics
 * @desc    获取人口管理统计数据
 * @access  Private (人口主任权限)
 */
router.get('/statistics', checkPermission(['population:read']), async (req, res) => {
  try {
    const { villageId, startDate, endDate } = req.query;

    const matchQuery = {};
    if (villageId) matchQuery.villageId = villageId;
    if (startDate || endDate) {
      matchQuery.changeDate = {};
      if (startDate) matchQuery.changeDate.$gte = new Date(startDate);
      if (endDate) matchQuery.changeDate.$lte = new Date(endDate);
    }

    // 统计各类变动数量
    const changeStats = await PopulationChange.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$changeType',
          count: { $sum: 1 }
        }
      }
    ]);

    // 统计审核状态
    const statusStats = await PopulationChange.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 转换为易读格式
    const typeMap = {
      birth: '新生儿出生',
      marriage_in: '婚入',
      marriage_out: '婚出',
      death: '死亡',
      move_in: '迁入',
      move_out: '迁出'
    };

    const statistics = {
      changesByType: changeStats.map(stat => ({
        type: stat._id,
        typeName: typeMap[stat._id] || stat._id,
        count: stat.count
      })),
      changesByStatus: {
        pending: statusStats.find(s => s._id === 'pending')?.count || 0,
        approved: statusStats.find(s => s._id === 'approved')?.count || 0,
        rejected: statusStats.find(s => s._id === 'rejected')?.count || 0
      },
      total: changeStats.reduce((sum, stat) => sum + stat.count, 0)
    };

    // 获取分组统计
    const groupMatchQuery = { status: 'active' };
    if (villageId) groupMatchQuery.villageId = villageId;

    const groupStats = await ResidentGroup.aggregate([
      { $match: groupMatchQuery },
      {
        $group: {
          _id: '$groupType',
          count: { $sum: 1 },
          totalMembers: { $sum: '$memberCount' }
        }
      }
    ]);

    const groupTypeMap = {
      special_care: '特殊关怀组',
      dynamic_monitoring: '动态监测户',
      party_member: '党员',
      volunteer: '志愿者',
      grid_responsibility: '网格责任',
      custom: '自定义'
    };

    statistics.groups = groupStats.map(stat => ({
      type: stat._id,
      typeName: groupTypeMap[stat._id] || stat._id,
      count: stat.count,
      totalMembers: stat.totalMembers
    }));

    statistics.totalGroups = groupStats.reduce((sum, stat) => sum + stat.count, 0);
    statistics.totalGroupMembers = groupStats.reduce((sum, stat) => sum + stat.totalMembers, 0);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  logger.error('人口管理路由错误:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user ? req.user.id : 'anonymous'
  });

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: `参数验证失败: ${error.message}`
    });
  }

  if (error.status === 403) {
    return res.status(403).json({
      success: false,
      message: '权限不足'
    });
  }

  if (error.status === 401) {
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }

  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

module.exports = router;
