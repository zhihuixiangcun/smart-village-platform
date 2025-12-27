/**
 * 村民档案服务 - 优化版本
 * 使用批量查询和缓存避免N+1问题
 */

const ResidentProfile = require('../models/ResidentProfile');
const Family = require('../models/Family');
const { QueryOptimizer } = require('../utils/queryOptimizer');
const { CACHE_PREFIX, CACHE_TTL } = require('../utils/cacheManager');
const logger = require('../utils/logger');

class ResidentProfileServiceOptimized {
  /**
   * 创建村民档案
   * @param {Object} profileData - 档案数据
   * @param {Object} creator - 创建者信息
   * @param {Object} cacheManager - 缓存管理器
   */
  static async createResidentProfile(profileData, creator, cacheManager = null) {
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

      // 缓存新创建的档案
      if (cacheManager) {
        const cacheKey = CacheManager.buildKey(CACHE_PREFIX.RESIDENT, profile._id);
        await cacheManager.set(cacheKey, profile, CACHE_TTL.MEDIUM);
      }

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
   * 获取村民档案详情 - 优化版本
   * @param {string} profileId - 档案ID
   * @param {Object} requester - 请求者信息
   * @param {Object} cacheManager - 缓存管理器
   */
  static async getProfileById(profileId, requester, cacheManager = null) {
    try {
      let profile;
      let cacheKey;

      // 尝试从缓存获取
      if (cacheManager) {
        cacheKey = CacheManager.buildKey(CACHE_PREFIX.RESIDENT, profileId);
        profile = await cacheManager.get(cacheKey);
      }

      // 缓存未命中，从数据库查询
      if (!profile) {
        profile = await ResidentProfile.findById(profileId)
          .populate('userId', 'name phone avatar')
          .populate('familyId', 'familyName familyCode')
          .populate('createdBy', 'name')
          .populate('updatedBy', 'name');

        if (!profile) {
          throw new Error('档案不存在');
        }

        // 存入缓存
        if (cacheManager) {
          await cacheManager.set(cacheKey, profile, CACHE_TTL.MEDIUM);
        }
      }

      // 检查访问权限
      const hasPermission = await this.checkProfileAccess(profile, requester, cacheManager);
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
   * 批量获取村民档案 - 优化版本
   * 使用QueryOptimizer.batchFind避免N+1
   * @param {Array} profileIds - 档案ID数组
   * @param {Object} requester - 请求者信息
   * @param {Object} cacheManager - 缓存管理器
   */
  static async batchGetProfiles(profileIds, requester, cacheManager = null) {
    try {
      // 使用QueryOptimizer批量查询
      const profiles = await QueryOptimizer.batchFind(
        ResidentProfile,
        profileIds,
        {
          select: 'personalInfo contact familyId status tags',
          populate: [
            { path: 'userId', select: 'name phone avatar' },
            { path: 'familyId', select: 'familyName familyCode' }
          ],
          lean: true
        }
      );

      // 批量检查权限
      const validProfiles = [];
      for (const profile of profiles) {
        const hasPermission = await this.checkProfileAccess(profile, requester, cacheManager);
        if (hasPermission) {
          validProfiles.push(profile);
        }
      }

      return validProfiles;
    } catch (error) {
      logger.error('批量获取村民档案失败:', error);
      throw error;
    }
  }

  /**
   * 根据用户ID获取档案
   * @param {string} userId - 用户ID
   * @param {Object} requester - 请求者信息
   * @param {Object} cacheManager - 缓存管理器
   */
  static async getProfileByUserId(userId, requester, cacheManager = null) {
    try {
      const cacheKey = CacheManager.buildKey(CACHE_PREFIX.USER, `profile:${userId}`);
      let profile = cacheManager ? await cacheManager.get(cacheKey) : null;

      if (!profile) {
        profile = await ResidentProfile.findOne({ userId })
          .populate('userId', 'name phone avatar')
          .populate('familyId', 'familyName familyCode')
          .populate('createdBy', 'name');

        if (!profile) {
          throw new Error('档案不存在');
        }

        if (cacheManager) {
          await cacheManager.set(cacheKey, profile, CACHE_TTL.MEDIUM);
        }
      }

      // 检查访问权限
      const hasPermission = await this.checkProfileAccess(profile, requester, cacheManager);
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
   * @param {Object} cacheManager - 缓存管理器
   */
  static async getProfileByIdCard(idCard, requester, cacheManager = null) {
    try {
      const cacheKey = CacheManager.buildKey(CACHE_PREFIX.RESIDENT, `idcard:${idCard}`);
      let profile = cacheManager ? await cacheManager.get(cacheKey) : null;

      if (!profile) {
        profile = await ResidentProfile.findByIdCard(idCard)
          .populate('userId', 'name phone avatar')
          .populate('familyId', 'familyName familyCode')
          .populate('createdBy', 'name');

        if (!profile) {
          throw new Error('档案不存在');
        }

        if (cacheManager) {
          await cacheManager.set(cacheKey, profile, CACHE_TTL.LONG);
        }
      }

      // 检查访问权限
      const hasPermission = await this.checkProfileAccess(profile, requester, cacheManager);
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
   * @param {Object} cacheManager - 缓存管理器
   */
  static async updateProfile(profileId, updateData, updater, cacheManager = null) {
    try {
      const profile = await ResidentProfile.findById(profileId);
      if (!profile) {
        throw new Error('档案不存在');
      }

      // 检查修改权限
      const hasPermission = await this.checkProfileEditAccess(profile, updater, cacheManager);
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

      // 失效相关缓存
      if (cacheManager) {
        const patterns = [
          `${CACHE_PREFIX.RESIDENT}${profile._id}*`,
          `${CACHE_PREFIX.USER}profile:${profile.userId}*`,
          `${CACHE_PREFIX.RESIDENT}idcard:${profile.personalInfo.idCard}*`
        ];
        for (const pattern of patterns) {
          await cacheManager.delPattern(pattern);
        }
      }

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
   * @param {Object} cacheManager - 缓存管理器
   */
  static async deleteProfile(profileId, operator, cacheManager = null) {
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

      // 失效相关缓存
      if (cacheManager) {
        await cacheManager.delPattern(`${CACHE_PREFIX.RESIDENT}${profileId}*`);
      }

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
   * 搜索村民档案 - 优化版本
   * 使用QueryOptimizer.paginatedFind优化分页查询
   * @param {Object} filters - 过滤条件
   * @param {Object} options - 分页选项
   * @param {Object} requester - 请求者信息
   * @param {Object} cacheManager - 缓存管理器
   */
  static async searchProfiles(filters, options, requester, cacheManager = null) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // 构建查询条件
      const query = { status: '正常' };

      // 根据用户角色过滤 - 批量获取家庭ID避免N+1
      if (requester.role === 'resident') {
        query.userId = requester.id;
      } else if (requester.role === 'village_admin') {
        if (requester.village) {
          // 使用聚合管道一次性获取所有家庭ID
          const familyIds = await this._getVillageFamilyIds(requester.village, cacheManager);
          if (familyIds.length > 0) {
            query.familyId = { $in: familyIds };
          } else {
            // 没有家庭，返回空结果
            return {
              profiles: [],
              pagination: { page, limit, total: 0, pages: 0 }
            };
          }
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

      // 使用QueryOptimizer进行优化的分页查询
      const result = await QueryOptimizer.paginatedFind(
        ResidentProfile,
        query,
        {
          page,
          limit,
          sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
          select: 'personalInfo contact education employment familyId tags status',
          populate: [
            { path: 'userId', select: 'name phone avatar' },
            { path: 'familyId', select: 'familyName familyCode' }
          ],
          lean: true
        }
      );

      return {
        profiles: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('搜索村民档案失败:', error);
      throw error;
    }
  }

  /**
   * 获取村庄的家庭ID列表 - 优化版本
   * 使用缓存避免重复查询
   * @private
   */
  static async _getVillageFamilyIds(village, cacheManager = null) {
    const cacheKey = CacheManager.buildKey(CACHE_PREFIX.VILLAGE, `families:${village}`);

    if (cacheManager) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const families = await Family.find({ 'address.village': village })
      .select('_id')
      .lean();

    const familyIds = families.map(f => f._id);

    if (cacheManager) {
      await cacheManager.set(cacheKey, familyIds, CACHE_TTL.LONG);
    }

    return familyIds;
  }

  /**
   * 获取档案统计数据 - 优化版本
   * 使用聚合管道一次性计算所有统计
   * @param {string} village - 村名（可选）
   * @param {Object} cacheManager - 缓存管理器
   */
  static async getProfileStats(village = null, cacheManager = null) {
    try {
      const cacheKey = CacheManager.buildKey(CACHE_PREFIX.STATS, `profiles:${village || 'all'}`);

      if (cacheManager) {
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const matchStage = { status: '正常' };

      // 如果指定了村庄，通过家庭关联过滤
      if (village) {
        const familyIds = await this._getVillageFamilyIds(village, cacheManager);
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
            tagCount: { $sum: { $size: { $ifNull: ['$tags', []] } } }
          }
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
            genderStats: this._countDistribution('$genderDistribution'),
            ageGroupStats: this._countDistribution('$ageGroups'),
            educationStats: this._countDistribution('$educationDistribution'),
            employmentStats: this._countDistribution('$employmentStatuses'),
            healthStats: this._countDistribution('$healthStatuses'),
            insuranceRate: { $divide: ['$hasInsuranceCount', '$totalCount'] },
            avgTagsPerResident: { $divide: ['$tagCount', '$totalCount'] }
          }
        }
      ]);

      const result = stats[0] || {
        totalCount: 0,
        genderStats: {},
        ageGroupStats: {},
        educationStats: {},
        employmentStats: {},
        healthStats: {},
        insuranceRate: 0,
        avgTagsPerResident: 0
      };

      // 缓存统计结果（1小时）
      if (cacheManager) {
        await cacheManager.set(cacheKey, result, CACHE_TTL.MEDIUM);
      }

      return result;
    } catch (error) {
      logger.error('获取档案统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 计算分布统计 - 辅助函数
   * @private
   */
  static _countDistribution(fieldPath) {
    return {
      $reduce: {
        input: fieldPath,
        initialValue: {},
        in: {
          $mergeObjects: [
            '$$value',
            {
              $arrayToObject: [[
                {
                  k: '$$this',
                  v: {
                    $add: [
                      { $ifNull: [{ $indexOfArray: ['$$value', '$$this'] }, -1] },
                      1
                    ]
                  }
                }
              ]]
            }
          ]
        }
      }
    };
  }

  /**
   * 检查档案访问权限 - 优化版本
   * 使用缓存减少Family查询
   * @param {Object} profile - 档案对象
   * @param {Object} requester - 请求者信息
   * @param {Object} cacheManager - 缓存管理器
   */
  static async checkProfileAccess(profile, requester, cacheManager = null) {
    // 管理员可以访问所有档案
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 村管理员可以访问本村档案
    if (requester.role === 'village_admin') {
      if (requester.village && profile.familyId) {
        // 使用缓存的Family数据
        const family = await this._getFamilyById(profile.familyId, cacheManager);
        if (family && family.address.village === requester.village) {
          return true;
        }
      }
    }

    // 自己可以访问自己的档案
    if (profile.userId && profile.userId.toString() === requester.id) {
      return true;
    }

    // 检查是否是家庭成员
    if (profile.familyId) {
      const family = await this._getFamilyById(profile.familyId, cacheManager);
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
   * 检查档案编辑权限 - 优化版本
   * 使用缓存减少Family查询
   * @param {Object} profile - 档案对象
   * @param {Object} requester - 请求者信息
   * @param {Object} cacheManager - 缓存管理器
   */
  static async checkProfileEditAccess(profile, requester, cacheManager = null) {
    // 管理员可以编辑所有档案
    if (requester.role === 'admin' || requester.role === 'system_admin') {
      return true;
    }

    // 村管理员可以编辑本村档案
    if (requester.role === 'village_admin') {
      if (requester.village && profile.familyId) {
        const family = await this._getFamilyById(profile.familyId, cacheManager);
        if (family && family.address.village === requester.village) {
          return true;
        }
      }
    }

    // 自己可以编辑自己的档案
    if (profile.userId && profile.userId.toString() === requester.id) {
      return true;
    }

    // 检查是否是家庭成员且有权限
    if (profile.familyId) {
      const family = await this._getFamilyById(profile.familyId, cacheManager);
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

  /**
   * 获取Family对象 - 使用缓存优化
   * @private
   */
  static async _getFamilyById(familyId, cacheManager = null) {
    const cacheKey = CacheManager.buildKey(CACHE_PREFIX.FAMILY, familyId);

    if (cacheManager) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const family = await Family.findById(familyId);
    if (family && cacheManager) {
      await cacheManager.set(cacheKey, family, CACHE_TTL.LONG);
    }

    return family;
  }
}

module.exports = ResidentProfileServiceOptimized;
