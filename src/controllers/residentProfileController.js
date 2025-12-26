/**
 * 村民档案控制器
 * 处理村民档案相关的HTTP请求
 */

const ResidentProfileService = require('../services/residentProfileService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class ResidentProfileController {
  /**
   * 创建村民档案
   */
  static async createProfile(req, res) {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const profileData = req.body;
      const creator = {
        id: req.user.id,
        ipAddress: req.ip
      };

      const profile = await ResidentProfileService.createResidentProfile(profileData, creator);

      res.status(201).json({
        success: true,
        message: '村民档案创建成功',
        data: profile
      });
    } catch (error) {
      logger.error('创建村民档案失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建村民档案失败'
      });
    }
  }

  /**
   * 获取档案详情（通过ID）
   */
  static async getProfileById(req, res) {
    try {
      const { profileId } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const profile = await ResidentProfileService.getProfileById(profileId, requester);

      res.json({
        success: true,
        message: '获取档案信息成功',
        data: profile
      });
    } catch (error) {
      logger.error('获取档案详情失败:', error);

      if (error.message === '档案不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权访问该档案') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '获取档案详情失败'
      });
    }
  }

  /**
   * 根据用户ID获取档案
   */
  static async getProfileByUserId(req, res) {
    try {
      const { userId } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const profile = await ResidentProfileService.getProfileByUserId(userId, requester);

      res.json({
        success: true,
        message: '获取档案信息成功',
        data: profile
      });
    } catch (error) {
      logger.error('根据用户ID获取档案失败:', error);

      if (error.message === '档案不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权访问该档案') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '获取档案信息失败'
      });
    }
  }

  /**
   * 根据身份证号获取档案
   */
  static async getProfileByIdCard(req, res) {
    try {
      const { idCard } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const profile = await ResidentProfileService.getProfileByIdCard(idCard, requester);

      res.json({
        success: true,
        message: '获取档案信息成功',
        data: profile
      });
    } catch (error) {
      logger.error('根据身份证获取档案失败:', error);

      if (error.message === '档案不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权访问该档案') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '获取档案信息失败'
      });
    }
  }

  /**
   * 更新村民档案
   */
  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { profileId } = req.params;
      const updateData = req.body;
      const updater = {
        id: req.user.id,
        ipAddress: req.ip
      };

      const profile = await ResidentProfileService.updateProfile(profileId, updateData, updater);

      res.json({
        success: true,
        message: '档案更新成功',
        data: profile
      });
    } catch (error) {
      logger.error('更新村民档案失败:', error);

      if (error.message === '档案不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权修改该档案' || error.message === '该身份证号已被使用') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '更新档案失败'
      });
    }
  }

  /**
   * 删除（注销）村民档案
   */
  static async deleteProfile(req, res) {
    try {
      const { profileId } = req.params;
      const operator = {
        id: req.user.id,
        role: req.user.role,
        ipAddress: req.ip
      };

      const profile = await ResidentProfileService.deleteProfile(profileId, operator);

      res.json({
        success: true,
        message: '档案注销成功',
        data: profile
      });
    } catch (error) {
      logger.error('注销村民档案失败:', error);

      if (error.message === '档案不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '只有管理员可以删除档案') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '注销档案失败'
      });
    }
  }

  /**
   * 搜索村民档案
   */
  static async searchProfiles(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        name,
        gender,
        ageRange,
        education,
        employment,
        tags,
        search
      } = req.query;

      const filters = {};
      if (name) filters.name = name;
      if (gender) filters.gender = gender;
      if (ageRange) {
        const [min, max] = ageRange.split('-').map(Number);
        filters.ageRange = { min, max };
      }
      if (education) filters.education = education;
      if (employment) filters.employment = employment;
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }
      if (search) filters.search = search;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const result = await ResidentProfileService.searchProfiles(filters, options, requester);

      res.json({
        success: true,
        message: '搜索档案成功',
        data: result
      });
    } catch (error) {
      logger.error('搜索村民档案失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '搜索档案失败'
      });
    }
  }

  /**
   * 获取档案统计数据
   */
  static async getProfileStats(req, res) {
    try {
      const { village } = req.query;

      // 村管理员只能查看本村统计
      if (req.user.role === 'village_admin' && req.user.village) {
        village = req.user.village;
      }

      const stats = await ResidentProfileService.getProfileStats(village);

      res.json({
        success: true,
        message: '获取档案统计成功',
        data: stats
      });
    } catch (error) {
      logger.error('获取档案统计数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取档案统计数据失败'
      });
    }
  }

  /**
   * 获取我的档案
   */
  static async getMyProfile(req, res) {
    try {
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village,
        ipAddress: req.ip
      };

      const profile = await ResidentProfileService.getProfileByUserId(req.user.id, requester);

      res.json({
        success: true,
        message: '获取我的档案成功',
        data: profile
      });
    } catch (error) {
      logger.error('获取我的档案失败:', error);

      if (error.message === '档案不存在') {
        return res.status(404).json({
          success: false,
          message: '您的档案尚未创建'
        });
      }

      if (error.message === '无权访问该档案') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '获取档案失败'
      });
    }
  }

  /**
   * 更新我的档案
   */
  static async updateMyProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const updateData = req.body;
      const updater = {
        id: req.user.id,
        ipAddress: req.ip
      };

      // 先获取档案ID
      const ResidentProfile = require('../models/ResidentProfile');
      const profile = await ResidentProfile.findOne({ userId: req.user.id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: '您的档案尚未创建'
        });
      }

      const updatedProfile = await ResidentProfileService.updateProfile(
        profile._id,
        updateData,
        updater
      );

      res.json({
        success: true,
        message: '档案更新成功',
        data: updatedProfile
      });
    } catch (error) {
      logger.error('更新我的档案失败:', error);

      if (error.message === '档案不存在') {
        return res.status(404).json({
          success: false,
          message: '您的档案尚未创建'
        });
      }

      if (error.message === '无权修改该档案') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '更新档案失败'
      });
    }
  }

  /**
   * 添加/更新标签
   */
  static async updateTags(req, res) {
    try {
      const { profileId } = req.params;
      const { tags } = req.body;
      const updater = {
        id: req.user.id,
        role: req.user.role,
        ipAddress: req.ip
      };

      if (!Array.isArray(tags)) {
        return res.status(400).json({
          success: false,
          message: '标签必须是数组'
        });
      }

      // 验证标签有效性
      const validTags = [
        '党员', '村干部', '退役军人', '残疾人', '低保户', '五保户', '留守儿童', '空巢老人',
        '独居老人', '大病家庭', '单亲家庭', '失独家庭', '烈属', '优抚对象', '困难党员',
        '返乡创业', '农民工', '大学生', '专业技术人才', '其他'
      ];

      for (const tag of tags) {
        if (!validTags.includes(tag)) {
          return res.status(400).json({
            success: false,
            message: `无效的标签: ${tag}`
          });
        }
      }

      const profile = await ResidentProfileService.updateProfile(
        profileId,
        { tags },
        updater
      );

      res.json({
        success: true,
        message: '标签更新成功',
        data: profile
      });
    } catch (error) {
      logger.error('更新标签失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新标签失败'
      });
    }
  }

  /**
   * 获取特殊人群列表
   */
  static async getSpecialGroups(req, res) {
    try {
      const { groupType } = req.params;
      const {
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        tags: [groupType]
      };

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const result = await ResidentProfileService.searchProfiles(filters, options, requester);

      res.json({
        success: true,
        message: `获取${groupType}列表成功`,
        data: result
      });
    } catch (error) {
      logger.error('获取特殊人群列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取特殊人群列表失败'
      });
    }
  }

  /**
   * 导出档案数据
   */
  static async exportProfiles(req, res) {
    try {
      const { format = 'json', filters = {} } = req.query;

      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      // 构建过滤条件
      const searchFilters = {};
      if (filters.village) searchFilters.village = filters.village;
      if (filters.gender) searchFilters.gender = filters.gender;
      if (filters.ageRange) searchFilters.ageRange = JSON.parse(filters.ageRange);
      if (filters.tags) searchFilters.tags = JSON.parse(filters.tags);

      const options = {
        page: 1,
        limit: 10000, // 导出限制
        sortBy: 'personalInfo.name',
        sortOrder: 'asc'
      };

      const result = await ResidentProfileService.searchProfiles(
        searchFilters,
        options,
        requester
      );

      // 根据格式返回数据
      if (format === 'csv') {
        // 设置CSV响应头
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=profiles.csv');

        // CSV数据转换
        const csvData = result.profiles.map(profile => ({
          姓名: profile.personalInfo.name,
          性别: profile.personalInfo.gender,
          年龄: profile.personalInfo.age,
          身份证号: profile.personalInfo.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2'),
          联系电话: profile.contact.phone,
          教育程度: profile.education.degree,
          就业状态: profile.employment.status,
          健康状况: profile.personalInfo.healthStatus,
          标签: profile.tags.join(', ')
        }));

        // 简单的CSV格式化
        const csv = [
          Object.keys(csvData[0]).join(','),
          ...csvData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
        ].join('\n');

        res.send(csv);
      } else {
        // JSON格式
        res.json({
          success: true,
          message: '导出成功',
          data: {
            total: result.pagination.total,
            profiles: result.profiles
          }
        });
      }
    } catch (error) {
      logger.error('导出档案失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '导出档案失败'
      });
    }
  }
}

module.exports = ResidentProfileController;