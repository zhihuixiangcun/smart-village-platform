/**
 * 家庭管理控制器
 * 处理家庭管理相关的HTTP请求
 */

const FamilyManagementService = require('../services/familyManagementService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class FamilyController {
  /**
   * 创建家庭
   */
  static async createFamily(req, res) {
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

      const familyData = req.body;
      const creator = {
        id: req.user.id,
        ipAddress: req.ip
      };

      const family = await FamilyManagementService.createFamily(familyData, creator);

      res.status(201).json({
        success: true,
        message: '家庭创建成功',
        data: family
      });
    } catch (error) {
      logger.error('创建家庭失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建家庭失败'
      });
    }
  }

  /**
   * 获取家庭详情（通过ID）
   */
  static async getFamilyById(req, res) {
    try {
      const { familyId } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const family = await FamilyManagementService.getFamilyById(familyId, requester);

      res.json({
        success: true,
        message: '获取家庭信息成功',
        data: family
      });
    } catch (error) {
      logger.error('获取家庭详情失败:', error);

      if (error.message === '家庭不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权访问该家庭信息') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '获取家庭详情失败'
      });
    }
  }

  /**
   * 获取家庭详情（通过家庭编码）
   */
  static async getFamilyByCode(req, res) {
    try {
      const { familyCode } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      const family = await FamilyManagementService.getFamilyByCode(familyCode, requester);

      res.json({
        success: true,
        message: '获取家庭信息成功',
        data: family
      });
    } catch (error) {
      logger.error('根据编码获取家庭失败:', error);

      if (error.message === '家庭不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权访问该家庭信息') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '获取家庭信息失败'
      });
    }
  }

  /**
   * 更新家庭信息
   */
  static async updateFamily(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { familyId } = req.params;
      const updateData = req.body;
      const updater = {
        id: req.user.id,
        ipAddress: req.ip
      };

      const family = await FamilyManagementService.updateFamily(familyId, updateData, updater);

      res.json({
        success: true,
        message: '家庭信息更新成功',
        data: family
      });
    } catch (error) {
      logger.error('更新家庭信息失败:', error);

      if (error.message === '家庭不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权修改该家庭信息') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '更新家庭信息失败'
      });
    }
  }

  /**
   * 添加家庭成员
   */
  static async addFamilyMember(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { familyId } = req.params;
      const memberData = req.body;
      const operator = {
        id: req.user.id,
        ipAddress: req.ip
      };

      const family = await FamilyManagementService.addFamilyMember(familyId, memberData, operator);

      res.json({
        success: true,
        message: '家庭成员添加成功',
        data: family
      });
    } catch (error) {
      logger.error('添加家庭成员失败:', error);

      if (error.message === '家庭不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权修改该家庭信息' || error.message === '只有户主或管理员可以添加代理') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '该成员已存在') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '添加家庭成员失败'
      });
    }
  }

  /**
   * 移除家庭成员
   */
  static async removeFamilyMember(req, res) {
    try {
      const { familyId, memberId } = req.params;
      const operator = {
        id: req.user.id,
        ipAddress: req.ip
      };

      const family = await FamilyManagementService.removeFamilyMember(familyId, memberId, operator);

      res.json({
        success: true,
        message: '家庭成员移除成功',
        data: family
      });
    } catch (error) {
      logger.error('移除家庭成员失败:', error);

      if (error.message === '家庭不存在' || error.message === '成员不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权修改该家庭信息' || error.message === '不能删除户主，请先更换户主') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '移除家庭成员失败'
      });
    }
  }

  /**
   * 更新家庭成员信息
   */
  static async updateFamilyMember(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { familyId, memberId } = req.params;
      const updateData = req.body;
      const operator = {
        id: req.user.id,
        ipAddress: req.ip
      };

      const family = await FamilyManagementService.updateFamilyMember(familyId, memberId, updateData, operator);

      res.json({
        success: true,
        message: '家庭成员信息更新成功',
        data: family
      });
    } catch (error) {
      logger.error('更新家庭成员信息失败:', error);

      if (error.message === '家庭不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '无权修改该家庭信息') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '更新家庭成员信息失败'
      });
    }
  }

  /**
   * 添加代理关系
   */
  static async addAgent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { familyId } = req.params;
      const agentData = req.body;
      const operator = {
        id: req.user.id,
        role: req.user.role,
        ipAddress: req.ip
      };

      const family = await FamilyManagementService.addAgent(familyId, agentData, operator);

      res.json({
        success: true,
        message: '代理关系添加成功',
        data: family
      });
    } catch (error) {
      logger.error('添加代理关系失败:', error);

      if (error.message === '家庭不存在') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === '只有户主或管理员可以添加代理') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || '添加代理关系失败'
      });
    }
  }

  /**
   * 获取家庭列表
   */
  static async getFamilyList(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        familyType,
        village,
        tags,
        search
      } = req.query;

      const filters = {};
      if (familyType) filters.familyType = familyType;
      if (village) filters.village = village;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
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

      const result = await FamilyManagementService.getFamilyList(filters, options, requester);

      res.json({
        success: true,
        message: '获取家庭列表成功',
        data: result
      });
    } catch (error) {
      logger.error('获取家庭列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取家庭列表失败'
      });
    }
  }

  /**
   * 获取家庭统计数据
   */
  static async getFamilyStats(req, res) {
    try {
      const { village } = req.query;

      // 村管理员只能查看本村统计
      if (req.user.role === 'village_admin' && req.user.village) {
        village = req.user.village;
      }

      const stats = await FamilyManagementService.getFamilyStats(village);

      res.json({
        success: true,
        message: '获取家庭统计成功',
        data: stats
      });
    } catch (error) {
      logger.error('获取家庭统计数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取家庭统计数据失败'
      });
    }
  }

  /**
   * 检查代理权限
   */
  static async checkAgentPermission(req, res) {
    try {
      const { familyId } = req.params;
      const { permission } = req.query;
      const userId = req.user.id;

      const hasPermission = await FamilyManagementService.checkAgentPermission(
        familyId,
        userId,
        permission
      );

      res.json({
        success: true,
        message: '权限检查完成',
        data: { hasPermission }
      });
    } catch (error) {
      logger.error('检查代理权限失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '检查代理权限失败'
      });
    }
  }

  /**
   * 根据身份证查找家庭
   */
  static async findFamilyByIdCard(req, res) {
    try {
      const { idCard } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      // 使用Family模型的静态方法
      const Family = require('../models/Family');
      const family = await Family.findByIdCard(idCard)
        .populate('members.userId', 'name phone avatar')
        .populate('createdBy', 'name');

      if (!family) {
        return res.status(404).json({
          success: false,
          message: '未找到对应的家庭信息'
        });
      }

      // 检查访问权限
      const hasPermission = await FamilyManagementService.checkFamilyAccess(family, requester);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '无权访问该家庭信息'
        });
      }

      res.json({
        success: true,
        message: '查找家庭成功',
        data: family
      });
    } catch (error) {
      logger.error('根据身份证查找家庭失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '查找家庭失败'
      });
    }
  }

  /**
   * 获取家庭成员关系图
   */
  static async getFamilyRelationships(req, res) {
    try {
      const { familyId } = req.params;
      const requester = {
        id: req.user.id,
        role: req.user.role,
        village: req.user.village
      };

      // 获取家庭信息
      const Family = require('../models/Family');
      const family = await Family.findById(familyId)
        .populate('members.userId', 'name phone avatar');

      if (!family) {
        return res.status(404).json({
          success: false,
          message: '家庭不存在'
        });
      }

      // 检查访问权限
      const hasPermission = await FamilyManagementService.checkFamilyAccess(family, requester);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '无权访问该家庭信息'
        });
      }

      // 构建关系图数据
      const relationships = {
        familyId: family._id,
        familyCode: family.familyCode,
        familyName: family.familyName,
        members: family.members.map(member => ({
          id: member._id,
          userId: member.userId,
          name: member.name,
          relationship: member.relationship,
          isHead: member.isHead,
          phone: member.phone,
          occupation: member.occupation,
          education: member.education,
          healthStatus: member.healthStatus
        })),
        relationships: this.buildRelationships(family.members)
      };

      res.json({
        success: true,
        message: '获取家庭关系图成功',
        data: relationships
      });
    } catch (error) {
      logger.error('获取家庭关系图失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取家庭关系图失败'
      });
    }
  }

  /**
   * 构建家庭成员关系
   */
  static buildRelationships(members) {
    const relationships = [];

    // 找出户主
    const head = members.find(m => m.isHead);
    if (!head) return relationships;

    // 为每个非户主成员建立与户主的关系
    members.forEach(member => {
      if (!member.isHead) {
        relationships.push({
          from: head._id,
          to: member._id,
          type: member.relationship,
          description: `${head.relationship || '户主'} - ${member.relationship}`
        });
      }
    });

    return relationships;
  }
}

module.exports = FamilyController;