/**
 * 村委管理控制器
 *
 * 功能：
 * - 村委成员的增删改查
 * - 权限验证与数据脱敏
 * - 操作审计日志
 * - 职务变更与权限分配
 * - 统计分析
 *
 * @author Smart Village Platform
 * @version 1.0.0
 */

const { CommitteeMember, CommitteeAuditLog, Village, User } = require('../models');
const { maskSensitiveData, maskIdCard, maskPhone } = require('../utils/encryption');
const { generateQRCode } = require('../utils/qrCode');
const { sendNotification } = require('../services/notificationService');

/**
 * @class CommitteeController
 */
class CommitteeController {
  /**
   * 创建村委成员
   * @route POST /api/v1/committee/members
   */
  static async createMember(req, res) {
    try {
      const {
        name,
        idCard,
        phone,
        position,
        partyMember,
        villageId,
        roles = [],
        ...otherData
      } = req.body;

      // 权限验证
      if (!req.user.permissions?.includes('committee:create')) {
        return res.status(403).json({
          success: false,
          message: '无权限创建村委成员'
        });
      }

      // 验证村庄存在
      const village = await Village.findById(villageId);
      if (!village) {
        return res.status(404).json({
          success: false,
          message: '村庄不存在'
        });
      }

      // 检查身份证是否已注册
      const existingMember = await CommitteeMember.findOne({ idCard });
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: '该身份证号已注册'
        });
      }

      // 创建村委成员
      const member = await CommitteeMember.create({
        name,
        idCard,
        phone,
        position: {
          current: position.current,
          startDate: position.startDate || new Date(),
          appointmentDoc: position.appointmentDoc
        },
        partyMember: partyMember || { isMember: false },
        villageId,
        roles: roles.map(role => ({
          ...role,
          grantedBy: req.user.id,
          grantedAt: new Date()
        })),
        ...otherData,
        metadata: {
          createdBy: req.user.id
        }
      });

      // 生成二维码
      const qrCode = await generateQRCode({
        type: 'committee_member',
        id: member._id,
        villageId,
        name: member.name
      });
      member.photo = qrCode.url;
      await member.save();

      // 记录审计日志
      await CommitteeAuditLog.logAction({
        operatorId: req.user.id,
        operatorName: req.user.username,
        villageId,
        action: 'create',
        resourceType: 'member',
        resourceId: member._id,
        resourceName: name,
        details: {
          changes: { after: { name, position } },
          result: 'success'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        },
        sensitiveAction: {
          isSensitive: true,
          verificationMethod: req.session.verificationMethod || 'none'
        }
      });

      // 发送通知
      await sendNotification({
        type: 'committee_member_added',
        villageId,
        data: {
          memberName: name,
          position: position.current
        }
      });

      // 返回脱敏数据
      const maskedMember = maskSensitiveData(member.toObject(), {
        maskIdCard: true,
        maskPhone: true
      });

      res.status(201).json({
        success: true,
        data: maskedMember,
        message: '村委成员创建成功'
      });

    } catch (error) {
      console.error('Create committee member error:', error);
      res.status(500).json({
        success: false,
        message: '创建村委成员失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 获取村委成员列表（分页+搜索）
   * @route GET /api/v1/committee/members
   */
  static async getMembers(req, res) {
    try {
      const {
        villageId,
        status = 'active',
        position,
      // 搜索关键词
        name,
        phone,
        // 分页
        page = 1,
        limit = 20,
        // 排序
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // 权限验证
      const userVillageId = req.user.villageId;
      if (!req.user.permissions?.includes('committee:view_all') &&
          userVillageId.toString() !== villageId) {
        return res.status(403).json({
          success: false,
          message: '无权限查看该村村委成员'
        });
      }

      // 构建查询条件
      const query = { villageId };
      if (status && status !== 'all') {
        query.status = status;
      }
      if (position) {
        query['position.current'] = position;
      }
      if (name) {
        query.name = { $regex: name, $options: 'i' };
      }
      if (phone) {
        query.phone = { $regex: phone, $options: 'i' };
      }

      // 执行查询
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortObj = {};
      sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [members, total] = await Promise.all([
        CommitteeMember.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('userId', 'username email')
          .lean(),
        CommitteeMember.countDocuments(query)
      ]);

      // 脱敏处理
      const maskedMembers = members.map(member =>
        maskSensitiveData(member, {
          maskIdCard: true,
          maskPhone: true
        })
      );

      // 记录查询日志
      await CommitteeAuditLog.logAction({
        operatorId: req.user.id,
        operatorName: req.user.username,
        villageId,
        action: 'view',
        resourceType: 'member',
        details: {
          query: { ...query, page, limit },
          result: 'success'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      res.json({
        success: true,
        data: {
          members: maskedMembers,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get committee members error:', error);
      res.status(500).json({
        success: false,
        message: '获取村委成员列表失败'
      });
    }
  }

  /**
   * 获取单个村委成员详情
   * @route GET /api/v1/committee/members/:id
   */
  static async getMemberById(req, res) {
    try {
      const { id } = req.params;
      const includeSensitive = req.query.includeSensitive === 'true';

      const member = await CommitteeMember.findById(id)
        .populate('userId', 'username email profile')
        .populate('villageId', 'name code')
        .lean();

      if (!member) {
        return res.status(404).json({
          success: false,
          message: '村委成员不存在'
        });
      }

      // 权限验证
      const hasPermission = req.user.permissions?.includes('committee:view_all') ||
                           req.user.permissions?.includes('committee:view_sensitive') ||
                           req.user.id === member.metadata.createdBy?.toString();

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '无权限查看该成员信息'
        });
      }

      // 脱敏处理
      const maskedMember = maskSensitiveData(member, {
        maskIdCard: !includeSensitive || !req.user.permissions?.includes('committee:view_sensitive'),
        maskPhone: !includeSensitive || !req.user.permissions?.includes('committee:view_sensitive')
      });

      res.json({
        success: true,
        data: maskedMember
      });

    } catch (error) {
      console.error('Get committee member error:', error);
      res.status(500).json({
        success: false,
        message: '获取村委成员详情失败'
      });
    }
  }

  /**
   * 更新村委成员信息
   * @route PUT /api/v1/committee/members/:id
   */
  static async updateMember(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const member = await CommitteeMember.findById(id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: '村委成员不存在'
        });
      }

      // 权限验证
      const hasPermission = req.user.permissions?.includes('committee:update') ||
                           req.user.id === member.metadata.createdBy?.toString();

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '无权限更新该成员信息'
        });
      }

      // 保存变更前的数据
      const beforeData = member.toObject();

      // 更新字段
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'metadata') {
          member[key] = updateData[key];
        }
      });

      member.metadata.updatedBy = req.user.id;
      await member.save();

      // 记录审计日志
      await CommitteeAuditLog.logAction({
        operatorId: req.user.id,
        operatorName: req.user.username,
        villageId: member.villageId,
        action: 'update',
        resourceType: 'member',
        resourceId: member._id,
        resourceName: member.name,
        details: {
          changes: {
            before: beforeData,
            after: member.toObject()
          },
          result: 'success'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        },
        sensitiveAction: {
          isSensitive: true,
          verificationMethod: req.session.verificationMethod || 'none'
        }
      });

      const maskedMember = maskSensitiveData(member.toObject(), {
        maskIdCard: true,
        maskPhone: true
      });

      res.json({
        success: true,
        data: maskedMember,
        message: '村委成员信息更新成功'
      });

    } catch (error) {
      console.error('Update committee member error:', error);
      res.status(500).json({
        success: false,
        message: '更新村委成员信息失败'
      });
    }
  }

  /**
   * 删除村委成员
   * @route DELETE /api/v1/committee/members/:id
   */
  static async deleteMember(req, res) {
    try {
      const { id } = req.params;

      const member = await CommitteeMember.findById(id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: '村委成员不存在'
        });
      }

      // 权限验证
      if (!req.user.permissions?.includes('committee:delete')) {
        return res.status(403).json({
          success: false,
          message: '无权限删除村委成员'
        });
      }

      // 软删除
      member.status = 'inactive';
      await member.save();

      // 记录审计日志
      await CommitteeAuditLog.logAction({
        operatorId: req.user.id,
        operatorName: req.user.username,
        villageId: member.villageId,
        action: 'delete',
        resourceType: 'member',
        resourceId: member._id,
        resourceName: member.name,
        details: {
          changes: { before: member.toObject() },
          result: 'success'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        },
        sensitiveAction: {
          isSensitive: true,
          verificationMethod: req.session.verificationMethod || 'none'
        }
      });

      res.json({
        success: true,
        message: '村委成员已删除'
      });

    } catch (error) {
      console.error('Delete committee member error:', error);
      res.status(500).json({
        success: false,
        message: '删除村委成员失败'
      });
    }
  }

  /**
   * 变更职务
   * @route POST /api/v1/committee/members/:id/position/change
   */
  static async changePosition(req, res) {
    try {
      const { id } = req.params;
      const { newPosition, reason, proofDoc } = req.body;

      const member = await CommitteeMember.findById(id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: '村委成员不存在'
        });
      }

      // 权限验证
      if (!req.user.permissions?.includes('committee:change_position')) {
        return res.status(403).json({
          success: false,
          message: '无权限变更职务'
        });
      }

      const beforePosition = member.position.current;
      await member.changePosition(newPosition, reason, proofDoc);

      // 记录审计日志
      await CommitteeAuditLog.logAction({
        operatorId: req.user.id,
        operatorName: req.user.username,
        villageId: member.villageId,
        action: 'change_position',
        resourceType: 'member',
        resourceId: member._id,
        resourceName: member.name,
        details: {
          changes: {
            before: { position: beforePosition },
            after: { position: newPosition }
          },
          result: 'success'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        },
        sensitiveAction: {
          isSensitive: true,
          verificationMethod: req.session.verificationMethod || 'none'
        }
      });

      res.json({
        success: true,
        data: member,
        message: '职务变更成功'
      });

    } catch (error) {
      console.error('Change position error:', error);
      res.status(500).json({
        success: false,
        message: '职务变更失败'
      });
    }
  }

  /**
   * 添加角色权限
   * @route POST /api/v1/committee/members/:id/roles
   */
  static async addRole(req, res) {
    try {
      const { id } = req.params;
      const { roleData } = req.body;

      const member = await CommitteeMember.findById(id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: '村委成员不存在'
        });
      }

      // 权限验证
      if (!req.user.permissions?.includes('committee:assign_roles')) {
        return res.status(403).json({
          success: false,
          message: '无权限分配角色'
        });
      }

      await member.addRole({
        ...roleData,
        grantedBy: req.user.id
      });

      // 记录审计日志
      await CommitteeAuditLog.logAction({
        operatorId: req.user.id,
        operatorName: req.user.username,
        villageId: member.villageId,
        action: 'add_role',
        resourceType: 'member',
        resourceId: member._id,
        resourceName: member.name,
        details: {
          changes: { after: { role: roleData.type } },
          result: 'success'
        },
        requestContext: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        },
        sensitiveAction: {
          isSensitive: true,
          verificationMethod: req.session.verificationMethod || 'none'
        }
      });

      res.json({
        success: true,
        data: member,
        message: '角色添加成功'
      });

    } catch (error) {
      console.error('Add role error:', error);
      res.status(500).json({
        success: false,
        message: '添加角色失败'
      });
    }
  }

  /**
   * 获取村委统计
   * @route GET /api/v1/committee/statistics
   */
  static async getStatistics(req, res) {
    try {
      const { villageId } = req.query;

      if (!villageId) {
        return res.status(400).json({
          success: false,
          message: '缺少村庄ID'
        });
      }

      // 权限验证
      if (!req.user.permissions?.includes('committee:view_statistics')) {
        return res.status(403).json({
          success: false,
          message: '无权限查看统计数据'
        });
      }

      const stats = await CommitteeMember.getStatistics(villageId);

      // 职务分布
      const positionStats = await CommitteeMember.aggregate([
        { $match: { villageId: mongoose.Types.ObjectId(villageId) } },
        {
          $group: {
            _id: '$position.current',
            count: { $sum: 1 }
          }
        }
      ]);

      // 党员统计
      const partyStats = await CommitteeMember.aggregate([
        {
          $match: {
            villageId: mongoose.Types.ObjectId(villageId),
            'partyMember.isMember': true
          }
        },
        {
          $count: 'partyMembers'
        }
      ]);

      res.json({
        success: true,
        data: {
          statusStats: stats,
          positionStats,
          partyStats: partyStats[0]?.partyMembers || 0
        }
      });

    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: '获取统计数据失败'
      });
    }
  }

  /**
   * 导出村委成员数据
   * @route GET /api/v1/committee/members/export
   */
  static async exportMembers(req, res) {
    try {
      const { villageId, format = 'xlsx' } = req.query;

      // 权限验证
      if (!req.user.permissions?.includes('committee:export')) {
        return res.status(403).json({
          success: false,
          message: '无权限导出数据'
        });
      }

      const members = await CommitteeMember.exportData(villageId, req.user.id);

      // 根据格式返回数据
      if (format === 'json') {
        res.json({
          success: true,
          data: members,
          message: '导出成功'
        });
      } else {
        // Excel导出逻辑（需要集成exceljs库）
        res.json({
          success: true,
          message: 'Excel导出功能开发中',
          data: members
        });
      }

    } catch (error) {
      console.error('Export members error:', error);
      res.status(500).json({
        success: false,
        message: '导出数据失败'
      });
    }
  }

  /**
   * 搜索村委成员
   * @route GET /api/v1/committee/members/search
   */
  static async searchMembers(req, res) {
    try {
      const { keyword, villageId } = req.query;

      if (!keyword || !villageId) {
        return res.status(400).json({
          success: false,
          message: '缺少搜索关键词或村庄ID'
        });
      }

      const members = await CommitteeMember.find({
        villageId,
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword, $options: 'i' } }
        ],
        status: 'active'
      })
        .select('-idCard')
        .limit(10)
        .lean();

      const maskedMembers = members.map(member =>
        maskSensitiveData(member, {
          maskPhone: true
        })
      );

      res.json({
        success: true,
        data: maskedMembers
      });

    } catch (error) {
      console.error('Search members error:', error);
      res.status(500).json({
        success: false,
        message: '搜索失败'
      });
    }
  }
}

module.exports = CommitteeController;
