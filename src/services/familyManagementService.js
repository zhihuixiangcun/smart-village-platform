/**
 * 家庭管理服务
 * 基于新的Family模型的家庭管理服务
 */

const Family = require('../models/Family');
const User = require('../models/User');
const ResidentProfile = require('../models/ResidentProfile');
const logger = require('../utils/logger');
const { generateFamilyCode } = require('../utils/codeGenerator');

class FamilyManagementService {
  /**
   * 创建家庭
   * @param {Object} familyData - 家庭数据
   * @param {Object} creator - 创建者信息
   */
  static async createFamily(familyData, creator) {
    try {
      // 检查家庭编码是否已存在
      if (familyData.familyCode) {
        const existingFamily = await Family.findOne({ familyCode: familyData.familyCode });
        if (existingFamily) {
          throw new Error('家庭编码已存在');
        }
      } else {
        // 自动生成家庭编码
        familyData.familyCode = generateFamilyCode(familyData.address.village || '0000');
      }

      // 设置创建者
      familyData.createdBy = creator.id;

      // 创建家庭
      const family = new Family(familyData);
      await family.save();

      // 记录操作日志
      await family.addOperationLog(
        creator.id,
        '创建',
        `创建家庭：${family.familyName}`,
        creator.ipAddress
      );

      logger.info('家庭创建成功', {
        familyId: family._id,
        familyCode: family.familyCode,
        creator: creator.id
      });

      return family;
    } catch (error) {
      logger.error('创建家庭失败:', error);
      throw error;
    }
  }

  /**
   * 获取家庭详情
   * @param {string} familyId - 家庭ID
   * @param {Object} requester - 请求者信息
   */
  static async getFamilyById(familyId, requester) {
    try {
      const family = await Family.findById(familyId)
        .populate('members.userId', 'name phone avatar')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      if (!family) {
        throw new Error('家庭不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkFamilyAccess(family, requester);
      if (!hasPermission) {
        throw new Error('无权访问该家庭信息');
      }

      // 记录查看日志
      await family.addOperationLog(
        requester.id,
        '查看',
        `查看家庭信息：${family.familyName}`,
        requester.ipAddress
      );

      return family;
    } catch (error) {
      logger.error('获取家庭详情失败:', error);
      throw error;
    }
  }

  /**
   * 根据家庭编码查询
   * @param {string} familyCode - 家庭编码
   * @param {Object} requester - 请求者信息
   */
  static async getFamilyByCode(familyCode, requester) {
    try {
      const family = await Family.findByFamilyCode(familyCode)
        .populate('members.userId', 'name phone avatar')
        .populate('createdBy', 'name');

      if (!family) {
        throw new Error('家庭不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkFamilyAccess(family, requester);
      if (!hasPermission) {
        throw new Error('无权访问该家庭信息');
      }

      // 记录查看日志
      await family.addOperationLog(
        requester.id,
        '查看',
        `通过编码查看家庭：${family.familyName}`,
        requester.ipAddress
      );

      return family;
    } catch (error) {
      logger.error('根据编码获取家庭失败:', error);
      throw error;
    }
  }

  /**
   * 更新家庭信息
   * @param {string} familyId - 家庭ID
   * @param {Object} updateData - 更新数据
   * @param {Object} updater - 更新者信息
   */
  static async updateFamily(familyId, updateData, updater) {
    try {
      const family = await Family.findById(familyId);
      if (!family) {
        throw new Error('家庭不存在');
      }

      // 检查修改权限
      const hasPermission = await this.checkFamilyEditAccess(family, updater);
      if (!hasPermission) {
        throw new Error('无权修改该家庭信息');
      }

      // 更新基本信息
      const allowedFields = [
        'familyName', 'familyType', 'address', 'contact',
        'housing', 'economic', 'tags', 'status'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          family[field] = updateData[field];
        }
      });

      family.updatedBy = updater.id;
      await family.save();

      // 记录操作日志
      await family.addOperationLog(
        updater.id,
        '修改',
        `更新家庭信息：${family.familyName}`,
        updater.ipAddress
      );

      logger.info('家庭信息更新成功', {
        familyId: family._id,
        updater: updater.id
      });

      return family;
    } catch (error) {
      logger.error('更新家庭信息失败:', error);
      throw error;
    }
  }

  /**
   * 添加家庭成员
   * @param {string} familyId - 家庭ID
   * @param {Object} memberData - 成员数据
   * @param {Object} operator - 操作者信息
   */
  static async addFamilyMember(familyId, memberData, operator) {
    try {
      const family = await Family.findById(familyId);
      if (!family) {
        throw new Error('家庭不存在');
      }

      // 检查修改权限
      const hasPermission = await this.checkFamilyEditAccess(family, operator);
      if (!hasPermission) {
        throw new Error('无权修改该家庭信息');
      }

      // 检查成员是否已存在
      const existingMember = family.members.find(
        m => m.idCard === memberData.idCard
      );
      if (existingMember) {
        throw new Error('该成员已存在');
      }

      // 添加成员
      await family.addMember(memberData);

      // 记录操作日志
      await family.addOperationLog(
        operator.id,
        '修改',
        `添加家庭成员：${memberData.name}`,
        operator.ipAddress
      );

      logger.info('家庭成员添加成功', {
        familyId: family._id,
        memberName: memberData.name,
        operator: operator.id
      });

      return family;
    } catch (error) {
      logger.error('添加家庭成员失败:', error);
      throw error;
    }
  }

  /**
   * 移除家庭成员
   * @param {string} familyId - 家庭ID
   * @param {string} memberId - 成员ID
   * @param {Object} operator - 操作者信息
   */
  static async removeFamilyMember(familyId, memberId, operator) {
    try {
      const family = await Family.findById(familyId);
      if (!family) {
        throw new Error('家庭不存在');
      }

      // 检查修改权限
      const hasPermission = await this.checkFamilyEditAccess(family, operator);
      if (!hasPermission) {
        throw new Error('无权修改该家庭信息');
      }

      // 获取要删除的成员信息
      const member = family.members.id(memberId);
      if (!member) {
        throw new Error('成员不存在');
      }

      // 检查是否可以删除（不能删除户主，除非是家庭注销）
      if (member.isHead && family.status === '正常') {
        throw new Error('不能删除户主，请先更换户主');
      }

      // 移除成员
      await family.removeMember(memberId);

      // 记录操作日志
      await family.addOperationLog(
        operator.id,
        '修改',
        `移除家庭成员：${member.name}`,
        operator.ipAddress
      );

      logger.info('家庭成员移除成功', {
        familyId: family._id,
        memberName: member.name,
        operator: operator.id
      });

      return family;
    } catch (error) {
      logger.error('移除家庭成员失败:', error);
      throw error;
    }
  }

  /**
   * 更新家庭成员信息
   * @param {string} familyId - 家庭ID
   * @param {string} memberId - 成员ID
   * @param {Object} updateData - 更新数据
   * @param {Object} operator - 操作者信息
   */
  static async updateFamilyMember(familyId, memberId, updateData, operator) {
    try {
      const family = await Family.findById(familyId);
      if (!family) {
        throw new Error('家庭不存在');
      }

      // 检查修改权限
      const hasPermission = await this.checkFamilyEditAccess(family, operator);
      if (!hasPermission) {
        throw new Error('无权修改该家庭信息');
      }

      // 更新成员
      await family.updateMember(memberId, updateData);

      // 记录操作日志
      await family.addOperationLog(
        operator.id,
        '修改',
        `更新家庭成员信息：${updateData.name || '未知'}`,
        operator.ipAddress
      );

      logger.info('家庭成员信息更新成功', {
        familyId: family._id,
        memberId,
        operator: operator.id
      });

      return family;
    } catch (error) {
      logger.error('更新家庭成员信息失败:', error);
      throw error;
    }
  }

  /**
   * 添加代理关系
   * @param {string} familyId - 家庭ID
   * @param {Object} agentData - 代理数据
   * @param {Object} operator - 操作者信息
   */
  static async addAgent(familyId, agentData, operator) {
    try {
      const family = await Family.findById(familyId);
      if (!family) {
        throw new Error('家庭不存在');
      }

      // 检查权限（家庭户主或管理员可以添加代理）
      const isHead = family.members.some(m =>
        m.isHead && m.userId.toString() === operator.id
      );
      const isAdmin = operator.role === 'admin' || operator.role === 'village_admin';

      if (!isHead && !isAdmin) {
        throw new Error('只有户主或管理员可以添加代理');
      }

      // 添加代理
      await family.addAgent(agentData);

      // 记录操作日志
      await family.addOperationLog(
        operator.id,
        '修改',
        `添加代理关系：${agentData.name}`,
        operator.ipAddress
      );

      logger.info('代理关系添加成功', {
        familyId: family._id,
        agentId: agentData.userId,
        operator: operator.id
      });

      return family;
    } catch (error) {
      logger.error('添加代理关系失败:', error);
      throw error;
    }
  }

  /**
   * 检查代理权限
   * @param {string} familyId - 家庭ID
   * @param {string} userId - 用户ID
   * @param {string} permission - 权限
   */
  static async checkAgentPermission(familyId, userId, permission) {
    try {
      const family = await Family.findById(familyId);
      if (!family) {
        return false;
      }

      return family.hasAgentPermission(userId, permission);
    } catch (error) {
      logger.error('检查代理权限失败:', error);
      return false;
    }
  }

  /**
   * 获取家庭列表
   * @param {Object} filters - 过滤条件
   * @param {Object} options - 分页选项
   * @param {Object} requester - 请求者信息
   */
  static async getFamilyList(filters, options, requester) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // 构建查询条件
      const query = { status: '正常' };

      // 根据用户角色过滤
      if (requester.role === 'resident') {
        // 普通村民只能查看自己的家庭
        query['members.userId'] = requester.id;
      } else if (requester.role === 'village_admin') {
        // 村管理员只能查看本村的家庭
        if (requester.village) {
          query['address.village'] = requester.village;
        }
      }

      // 应用过滤条件
      if (filters.familyType) {
        query.familyType = filters.familyType;
      }
      if (filters.village) {
        query['address.village'] = filters.village;
      }
      if (filters.tags) {
        query.tags = { $in: filters.tags };
      }
      if (filters.search) {
        query.$or = [
          { familyName: { $regex: filters.search, $options: 'i' } },
          { 'members.name': { $regex: filters.search, $options: 'i' } },
          { familyCode: { $regex: filters.search, $options: 'i' } }
        ];
      }

      // 执行查询
      const families = await Family.find(query)
        .populate('members.userId', 'name phone avatar')
        .populate('createdBy', 'name')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      // 获取总数
      const total = await Family.countDocuments(query);

      return {
        families,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取家庭列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取家庭统计数据
   * @param {string} village - 村名（可选）
   */
  static async getFamilyStats(village = null) {
    try {
      let stats;

      if (village) {
        // 获取指定村的统计
        stats = await Family.getVillageStats(village);
      } else {
        // 获取全局统计
        stats = await Family.aggregate([
          { $match: { status: '正常' } },
          {
            $group: {
              _id: null,
              totalFamilies: { $sum: 1 },
              totalMembers: { $sum: { $size: '$members' } },
              avgFamilySize: { $avg: { $size: '$members' } },
              familyTypes: { $push: '$familyType' },
              tags: { $push: '$tags' }
            }
          },
          {
            $project: {
              _id: 0,
              totalFamilies: 1,
              totalMembers: 1,
              avgFamilySize: { $round: ['$avgFamilySize', 2] },
              familyTypeDistribution: {
                $reduce: {
                  input: '$familyTypes',
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [[
                          { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] }, 1] } }
                        ]]
                      }
                    ]
                  }
                }
              },
              tagDistribution: {
                $reduce: {
                  input: '$tags',
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $reduce: {
                          input: '$$this',
                          initialValue: {},
                          in: {
                            $mergeObjects: [
                              '$$value',
                              {
                                $arrayToObject: [[
                                  { k: { $arrayElemAt: ['$$this', 0] }, v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', { $arrayElemAt: ['$$this', 0] }] }, -1] }, 1] } }
                                ]]
                              }
                            ]
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        ]);
      }

      return stats[0] || {};
    } catch (error) {
      logger.error('获取家庭统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 检查家庭访问权限
   * @param {Object} family - 家庭对象
   * @param {Object} requester - 请求者信息
   */
  static async checkFamilyAccess(family, requester) {
    // 管理员可以访问所有家庭
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 村管理员可以访问本村的家庭
    if (requester.role === 'village_admin') {
      if (requester.village && family.address.village === requester.village) {
        return true;
      }
    }

    // 家庭成员可以访问自己的家庭
    const isMember = family.members.some(
      m => m.userId && m.userId.toString() === requester.id
    );
    if (isMember) {
      return true;
    }

    // 检查代理权限
    const hasAgentPermission = family.hasAgentPermission(requester.id, '查看档案');
    if (hasAgentPermission) {
      return true;
    }

    return false;
  }

  /**
   * 检查家庭编辑权限
   * @param {Object} family - 家庭对象
   * @param {Object} requester - 请求者信息
   */
  static async checkFamilyEditAccess(family, requester) {
    // 管理员可以编辑所有家庭
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 村管理员可以编辑本村的家庭
    if (requester.role === 'village_admin') {
      if (requester.village && family.address.village === requester.village) {
        return true;
      }
    }

    // 家庭户主可以编辑自己的家庭
    const isHead = family.members.some(
      m => m.isHead && m.userId && m.userId.toString() === requester.id
    );
    if (isHead) {
      return true;
    }

    // 检查代理权限
    const hasAgentPermission = family.hasAgentPermission(requester.id, '办理业务');
    if (hasAgentPermission) {
      return true;
    }

    return false;
  }
}

module.exports = FamilyManagementService;