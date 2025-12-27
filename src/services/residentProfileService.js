/**
 * 村民档案服务
 * 处理村民档案的CRUD操作和查询功能
 */

const ResidentProfile = require('../models/ResidentProfile');
const Family = require('../models/Family');
const User = require('../models/User');
const logger = require('../utils/logger');
const { generateResidentCode } = require('../utils/codeGenerator');

class ResidentProfileService {
  /**
   * 创建村民档案
   * @param {Object} profileData - 档案数据
   * @param {Object} creator - 创建者信息
   */
  static async createResidentProfile(profileData, creator) {
    try {
      // 检查用户是否已有档案
      const existingProfile = await ResidentProfile.findOne({ userId: profileData.userId });
      if (existingProfile) {
        throw new Error('该用户已有档案');
      }

      // 检查身份证是否已被使用
      if (profileData.personalInfo.idCard) {
        const existingIdCard = await ResidentProfile.findOne({
          'personalInfo.idCard': profileData.personalInfo.idCard
        });
        if (existingIdCard) {
          throw new Error('该身份证号已被使用');
        }
      }

      // 设置创建者
      profileData.createdBy = creator.id;

      // 计算年龄
      if (profileData.personalInfo.birthDate && !profileData.personalInfo.age) {
        const today = new Date();
        const birthDate = new Date(profileData.personalInfo.birthDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        profileData.personalInfo.age = age;
      }

      // 创建档案
      const profile = new ResidentProfile(profileData);
      await profile.save();

      // 记录操作日志
      await profile.addOperationLog(
        creator.id,
        '创建',
        `创建村民档案：${profile.personalInfo.name}`,
        creator.ipAddress
      );

      logger.info('村民档案创建成功', {
        profileId: profile._id,
        userId: profile.userId,
        name: profile.personalInfo.name,
        creator: creator.id
      });

      return profile;
    } catch (error) {
      logger.error('创建村民档案失败:', error);
      throw error;
    }
  }

  /**
   * 获取村民档案详情
   * @param {string} profileId - 档案ID
   * @param {Object} requester - 请求者信息
   */
  static async getProfileById(profileId, requester) {
    try {
      const profile = await ResidentProfile.findById(profileId)
        .populate('userId', 'name phone avatar')
        .populate('familyId', 'familyName familyCode')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      if (!profile) {
        throw new Error('档案不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkProfileAccess(profile, requester);
      if (!hasPermission) {
        throw new Error('无权访问该档案');
      }

      // 记录查看日志
      await profile.addOperationLog(
        requester.id,
        '查看',
        `查看村民档案：${profile.personalInfo.name}`,
        requester.ipAddress
      );

      return profile;
    } catch (error) {
      logger.error('获取村民档案失败:', error);
      throw error;
    }
  }

  /**
   * 根据用户ID获取档案
   * @param {string} userId - 用户ID
   * @param {Object} requester - 请求者信息
   */
  static async getProfileByUserId(userId, requester) {
    try {
      const profile = await ResidentProfile.findOne({ userId })
        .populate('userId', 'name phone avatar')
        .populate('familyId', 'familyName familyCode')
        .populate('createdBy', 'name');

      if (!profile) {
        throw new Error('档案不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkProfileAccess(profile, requester);
      if (!hasPermission) {
        throw new Error('无权访问该档案');
      }

      // 记录查看日志
      await profile.addOperationLog(
        requester.id,
        '查看',
        `查看村民档案：${profile.personalInfo.name}`,
        requester.ipAddress
      );

      return profile;
    } catch (error) {
      logger.error('根据用户ID获取档案失败:', error);
      throw error;
    }
  }

  /**
   * 根据身份证号获取档案
   * @param {string} idCard - 身份证号
   * @param {Object} requester - 请求者信息
   */
  static async getProfileByIdCard(idCard, requester) {
    try {
      const profile = await ResidentProfile.findByIdCard(idCard)
        .populate('userId', 'name phone avatar')
        .populate('familyId', 'familyName familyCode')
        .populate('createdBy', 'name');

      if (!profile) {
        throw new Error('档案不存在');
      }

      // 检查访问权限
      const hasPermission = await this.checkProfileAccess(profile, requester);
      if (!hasPermission) {
        throw new Error('无权访问该档案');
      }

      // 记录查看日志
      await profile.addOperationLog(
        requester.id,
        '查看',
        `通过身份证查看村民档案：${profile.personalInfo.name}`,
        requester.ipAddress
      );

      return profile;
    } catch (error) {
      logger.error('根据身份证获取档案失败:', error);
      throw error;
    }
  }

  /**
   * 更新村民档案
   * @param {string} profileId - 档案ID
   * @param {Object} updateData - 更新数据
   * @param {Object} updater - 更新者信息
   */
  static async updateProfile(profileId, updateData, updater) {
    try {
      const profile = await ResidentProfile.findById(profileId);
      if (!profile) {
        throw new Error('档案不存在');
      }

      // 检查修改权限
      const hasPermission = await this.checkProfileEditAccess(profile, updater);
      if (!hasPermission) {
        throw new Error('无权修改该档案');
      }

      // 检查身份证唯一性（如果要更新身份证）
      if (updateData.personalInfo && updateData.personalInfo.idCard) {
        const existingIdCard = await ResidentProfile.findOne({
          'personalInfo.idCard': updateData.personalInfo.idCard,
          _id: { $ne: profileId }
        });
        if (existingIdCard) {
          throw new Error('该身份证号已被使用');
        }
      }

      // 更新基本信息
      const allowedFields = [
        'personalInfo', 'contact', 'education', 'employment',
        'socialSecurity', 'healthRecord', 'familyRelations',
        'assets', 'tags', 'digitalServices', 'privacy'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          profile[field] = updateData[field];
        }
      });

      // 更新年龄（如果更新了出生日期）
      if (updateData.personalInfo && updateData.personalInfo.birthDate) {
        const today = new Date();
        const birthDate = new Date(updateData.personalInfo.birthDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        profile.personalInfo.age = age;
      }

      profile.updatedBy = updater.id;
      await profile.save();

      // 记录操作日志
      await profile.addOperationLog(
        updater.id,
        '修改',
        `更新村民档案：${profile.personalInfo.name}`,
        updater.ipAddress
      );

      logger.info('村民档案更新成功', {
        profileId: profile._id,
        name: profile.personalInfo.name,
        updater: updater.id
      });

      return profile;
    } catch (error) {
      logger.error('更新村民档案失败:', error);
      throw error;
    }
  }

  /**
   * 删除村民档案（逻辑删除）
   * @param {string} profileId - 档案ID
   * @param {Object} operator - 操作者信息
   */
  static async deleteProfile(profileId, operator) {
    try {
      const profile = await ResidentProfile.findById(profileId);
      if (!profile) {
        throw new Error('档案不存在');
      }

      // 检查删除权限
      if (operator.role !== 'admin' && operator.role !== 'system_admin') {
        throw new Error('只有管理员可以删除档案');
      }

      // 逻辑删除
      profile.status = '注销';
      await profile.save();

      // 记录操作日志
      await profile.addOperationLog(
        operator.id,
        '删除',
        `注销村民档案：${profile.personalInfo.name}`,
        operator.ipAddress
      );

      logger.info('村民档案注销成功', {
        profileId: profile._id,
        name: profile.personalInfo.name,
        operator: operator.id
      });

      return profile;
    } catch (error) {
      logger.error('注销村民档案失败:', error);
      throw error;
    }
  }

  /**
   * 搜索村民档案
   * @param {Object} filters - 过滤条件
   * @param {Object} options - 分页选项
   * @param {Object} requester - 请求者信息
   */
  static async searchProfiles(filters, options, requester) {
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
        // 普通村民只能查看自己的档案
        query.userId = requester.id;
      } else if (requester.role === 'village_admin') {
        // 村管理员只能查看本村的档案
        if (requester.village) {
          // 通过家庭关联查找本村村民
          const families = await Family.find({ 'address.village': requester.village });
          const familyIds = families.map(f => f._id);
          query.familyId = { $in: familyIds };
        }
      }

      // 应用过滤条件
      if (filters.name) {
        query['personalInfo.name'] = { $regex: filters.name, $options: 'i' };
      }
      if (filters.gender) {
        query['personalInfo.gender'] = filters.gender;
      }
      if (filters.ageRange) {
        const { min, max } = filters.ageRange;
        query['personalInfo.age'] = {};
        if (min !== undefined) query['personalInfo.age'].$gte = min;
        if (max !== undefined) query['personalInfo.age'].$lte = max;
      }
      if (filters.education) {
        query['education.degree'] = filters.education;
      }
      if (filters.employment) {
        query['employment.status'] = filters.employment;
      }
      if (filters.tags) {
        query.tags = { $in: filters.tags };
      }
      if (filters.search) {
        query.$or = [
          { 'personalInfo.name': { $regex: filters.search, $options: 'i' } },
          { 'contact.phone': { $regex: filters.search, $options: 'i' } },
          { 'employment.employer': { $regex: filters.search, $options: 'i' } }
        ];
      }

      // 执行查询
      const profiles = await ResidentProfile.find(query)
        .populate('userId', 'name phone avatar')
        .populate('familyId', 'familyName familyCode')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      // 获取总数
      const total = await ResidentProfile.countDocuments(query);

      return {
        profiles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('搜索村民档案失败:', error);
      throw error;
    }
  }

  /**
   * 获取档案统计数据
   * @param {string} village - 村名（可选）
   */
  static async getProfileStats(village = null) {
    try {
      const matchStage = { status: '正常' };

      // 如果指定了村庄，通过家庭关联过滤
      if (village) {
        const families = await Family.find({ 'address.village': village });
        const familyIds = families.map(f => f._id);
        matchStage.familyId = { $in: familyIds };
      }

      const stats = await ResidentProfile.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            genderDistribution: {
              $push: '$personalInfo.gender'
            },
            ageGroups: {
              $push: {
                $cond: {
                  if: { $lt: ['$personalInfo.age', 18] },
                  then: '未成年人',
                  else: {
                    $cond: {
                      if: { $lt: ['$personalInfo.age', 60] },
                      then: '成年人',
                      else: '老年人'
                    }
                  }
                }
              }
            },
            educationDistribution: {
              $push: '$education.degree'
            },
            employmentStatuses: {
              $push: '$employment.status'
            },
            healthStatuses: {
              $push: '$personalInfo.healthStatus'
            },
            hasInsuranceCount: {
              $sum: { $cond: ['$socialSecurity.hasMedicalInsurance', 1, 0] }
            },
            tagCount: { $sum: { $size: { $ifNull: ['$tags', []] } } },
            tags: { $push: '$tags' }
          }
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
            genderStats: {
              $reduce: {
                input: '$genderDistribution',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            ageGroupStats: {
              $reduce: {
                input: '$ageGroups',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            educationStats: {
              $reduce: {
                input: '$educationDistribution',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            employmentStats: {
              $reduce: {
                input: '$employmentStatuses',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            healthStats: {
              $reduce: {
                input: '$healthStatuses',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            insuranceRate: { $divide: ['$hasInsuranceCount', '$totalCount'] },
            avgTagsPerResident: { $divide: ['$tagCount', '$totalCount'] }
          }
        }
      ]);

      return stats[0] || {};
    } catch (error) {
      logger.error('获取档案统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 检查档案访问权限
   * @param {Object} profile - 档案对象
   * @param {Object} requester - 请求者信息
   */
  static async checkProfileAccess(profile, requester) {
    // 管理员可以访问所有档案
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 村管理员可以访问本村档案
    if (requester.role === 'village_admin') {
      if (requester.village && profile.familyId) {
        const family = await Family.findById(profile.familyId);
        if (family && family.address.village === requester.village) {
          return true;
        }
      }
    }

    // 自己可以访问自己的档案
    if (profile.userId.toString() === requester.id) {
      return true;
    }

    // 检查是否是家庭成员
    if (profile.familyId) {
      const family = await Family.findById(profile.familyId);
      if (family) {
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
      }
    }

    return false;
  }

  /**
   * 检查档案编辑权限
   * @param {Object} profile - 档案对象
   * @param {Object} requester - 请求者信息
   */
  static async checkProfileEditAccess(profile, requester) {
    // 管理员可以编辑所有档案
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 村管理员可以编辑本村档案
    if (requester.role === 'village_admin') {
      if (requester.village && profile.familyId) {
        const family = await Family.findById(profile.familyId);
        if (family && family.address.village === requester.village) {
          return true;
        }
      }
    }

    // 自己可以编辑自己的档案
    if (profile.userId.toString() === requester.id) {
      return true;
    }

    // 检查是否是家庭成员且有权限
    if (profile.familyId) {
      const family = await Family.findById(profile.familyId);
      if (family) {
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
      }
    }

    return false;
  }
}

module.exports = ResidentProfileService;