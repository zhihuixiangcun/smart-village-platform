/**
 * 一户一码管理控制器
 * 支持户码生成、二维码管理、血缘关系验证等功能
 */

const Household = require('../models/Household');
const Resident = require('../models/Resident');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

class HouseholdCodeController {
  /**
   * 创建户码
   */
  async createHouseholdCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const {
        householderIdCard,
        householderName,
        householderPhone,
        address,
        members = []
      } = req.body;

      // 检查是否已存在户码
      const existingHousehold = await Household.findOne({
        'householder.idCard': householderIdCard,
        status: 'active'
      });

      if (existingHousehold) {
        return res.status(400).json({
          success: false,
          message: '该户主已存在户码'
        });
      }

      // 验证户主身份
      const householder = await Resident.findOne({
        idCard: householderIdCard,
        name: householderName,
        status: 'active'
      });

      if (!householder) {
        return res.status(400).json({
          success: false,
          message: '户主信息验证失败'
        });
      }

      // 生成户码
      const villageCode = req.user.villageId || 'DEFAULT';
      const householdCode = await this.generateUniqueHouseholdCode(villageCode);

      // 创建户记录
      const household = new Household({
        codeId: householdCode,
        villageId: req.user.villageId || req.body.villageId,
        householder: {
          userId: householder._id,
          name: householderName,
          idCard: householderIdCard,
          phone: householderPhone,
          isPartyMember: householder.villageParticipation?.partyMember || false,
          occupation: householder.occupation
        },
        address,
        members: members.map(member => ({
          ...member,
          joinDate: new Date(),
          isActive: true
        })),
        metadata: {
          createdBy: req.user._id,
          createdAt: new Date()
        }
      });

      // 生成二维码
      const qrData = household.generateQRCode();
      await household.save();

      // 生成二维码图片
      const qrImagePath = await this.generateQRCodeImage(householdCode, qrData);

      res.status(201).json({
        success: true,
        message: '户码创建成功',
        data: {
          household,
          qrCode: {
            codeId: householdCode,
            qrData,
            imageUrl: qrImagePath
          }
        }
      });

    } catch (error) {
      console.error('创建户码失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 获取户码信息
   */
  async getHouseholdCode(req, res) {
    try {
      const { codeId } = req.params;

      const household = await Household.findOne({
        codeId,
        status: 'active'
      }).populate('bloodRelationNetwork.relatedFamilies.householdId');

      if (!household) {
        return res.status(404).json({
          success: false,
          message: '户码不存在'
        });
      }

      // 权限检查和数据脱敏
      const sanitizedData = household.sanitizeData(
        req.user.role,
        req.user.idCard
      );

      res.json({
        success: true,
        data: sanitizedData
      });

    } catch (error) {
      console.error('获取户码信息失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 扫码验证户码
   */
  async verifyHouseholdCode(req, res) {
    try {
      const { qrData } = req.body;

      if (!qrData) {
        return res.status(400).json({
          success: false,
          message: '二维码数据不能为空'
        });
      }

      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: '二维码数据格式错误'
        });
      }

      // 验证二维码有效性
      if (new Date() > new Date(parsedData.expiryDate)) {
        return res.status(400).json({
          success: false,
          message: '二维码已过期'
        });
      }

      const household = await Household.findOne({
        codeId: parsedData.codeId,
        'qrCode.accessToken': parsedData.accessToken,
        status: 'active'
      });

      if (!household) {
        return res.status(404).json({
          success: false,
          message: '无效的户码'
        });
      }

      // 更新使用次数
      household.qrCode.usageCount += 1;
      await household.save();

      // 数据脱敏
      const sanitizedData = household.sanitizeData(
        req.user.role,
        req.user.idCard
      );

      res.json({
        success: true,
        message: '户码验证成功',
        data: sanitizedData
      });

    } catch (error) {
      console.error('验证户码失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 添加家庭成员
   */
  async addHouseholdMember(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { codeId } = req.params;
      const memberData = req.body;

      const household = await Household.findOne({
        codeId,
        status: 'active'
      });

      if (!household) {
        return res.status(404).json({
          success: false,
          message: '户码不存在'
        });
      }

      // 权限检查
      if (!this.hasManagePermission(household, req.user)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      // 验证成员身份
      const resident = await Resident.findOne({
        idCard: memberData.idCard,
        name: memberData.name,
        status: 'active'
      });

      if (!resident) {
        return res.status(400).json({
          success: false,
          message: '成员信息验证失败'
        });
      }

      // 检查是否已存在
      const existingMember = household.members.find(
        m => m.idCard === memberData.idCard && m.isActive
      );

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: '该成员已存在于户中'
        });
      }

      // 添加成员
      const newMember = {
        userId: resident._id,
        ...memberData,
        joinDate: new Date(),
        isActive: true
      };

      household.members.push(newMember);

      // 添加变更历史
      household.addChangeHistory(
        'add_member',
        req.user._id,
        req.user.name,
        `添加家庭成员: ${memberData.name}`
      );

      // 更新人口统计
      household.updateDemographics();
      await household.save();

      res.json({
        success: true,
        message: '家庭成员添加成功',
        data: household
      });

    } catch (error) {
      console.error('添加家庭成员失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 移除家庭成员
   */
  async removeHouseholdMember(req, res) {
    try {
      const { codeId, memberId } = req.params;

      const household = await Household.findOne({
        codeId,
        status: 'active'
      });

      if (!household) {
        return res.status(404).json({
          success: false,
          message: '户码不存在'
        });
      }

      // 权限检查
      if (!this.hasManagePermission(household, req.user)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const member = household.members.id(memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: '家庭成员不存在'
        });
      }

      // 软删除成员
      member.isActive = false;

      // 添加变更历史
      household.addChangeHistory(
        'remove_member',
        req.user._id,
        req.user.name,
        `移除家庭成员: ${member.name}`
      );

      // 更新人口统计
      household.updateDemographics();
      await household.save();

      res.json({
        success: true,
        message: '家庭成员移除成功',
        data: household
      });

    } catch (error) {
      console.error('移除家庭成员失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 验证血缘关系
   */
  async verifyBloodRelationship(req, res) {
    try {
      const { codeId } = req.params;
      const { targetIdCard, relationshipType } = req.body;

      const household = await Household.findOne({
        codeId,
        status: 'active'
      });

      if (!household) {
        return res.status(404).json({
          success: false,
          message: '户码不存在'
        });
      }

      // 验证血缘关系
      const verificationResult = household.verifyBloodRelationship(
        targetIdCard,
        relationshipType
      );

      res.json({
        success: true,
        data: verificationResult
      });

    } catch (error) {
      console.error('验证血缘关系失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 构建血缘关系图谱
   */
  async buildBloodRelationGraph(req, res) {
    try {
      const villageId = req.user.villageId || req.query.villageId;

      const graph = await Household.buildBloodRelationGraph(villageId);

      res.json({
        success: true,
        data: graph
      });

    } catch (error) {
      console.error('构建血缘关系图谱失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 更新户信息
   */
  async updateHousehold(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { codeId } = req.params;
      const updateData = req.body;

      const household = await Household.findOne({
        codeId,
        status: 'active'
      });

      if (!household) {
        return res.status(404).json({
          success: false,
          message: '户码不存在'
        });
      }

      // 权限检查
      if (!this.hasManagePermission(household, req.user)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      // 添加变更历史
      household.addChangeHistory(
        'update_info',
        req.user._id,
        req.user.name,
        '更新户信息',
        household.toObject(),
        updateData
      );

      // 更新信息
      Object.assign(household, updateData);
      household.metadata.lastUpdated = new Date();
      household.metadata.lastUpdatedBy = req.user._id;

      await household.save();

      res.json({
        success: true,
        message: '户信息更新成功',
        data: household
      });

    } catch (error) {
      console.error('更新户信息失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 重新生成二维码
   */
  async regenerateQRCode(req, res) {
    try {
      const { codeId } = req.params;

      const household = await Household.findOne({
        codeId,
        status: 'active'
      });

      if (!household) {
        return res.status(404).json({
          success: false,
          message: '户码不存在'
        });
      }

      // 权限检查
      if (!this.hasManagePermission(household, req.user)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      // 重新生成二维码
      const qrData = household.generateQRCode();
      await household.save();

      // 生成二维码图片
      const qrImagePath = await this.generateQRCodeImage(codeId, qrData);

      res.json({
        success: true,
        message: '二维码重新生成成功',
        data: {
          qrCode: {
            codeId,
            qrData,
            imageUrl: qrImagePath
          }
        }
      });

    } catch (error) {
      console.error('重新生成二维码失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 生成唯一户码
   */
  async generateUniqueHouseholdCode(villageCode) {
    let isUnique = false;
    let householdCode;
    let attempts = 0;
    const maxAttempts = 100;

    while (!isUnique && attempts < maxAttempts) {
      const sequence = Math.floor(Math.random() * 9999) + 1;
      const baseCode = `${villageCode}H${sequence.toString().padStart(4, '0')}`;

      // 计算校验码
      const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      const checkCodes = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      let sum = 0;
      for (let i = 0; i < baseCode.length; i++) {
        const charCode = baseCode.charCodeAt(i);
        sum += charCode * weights[i];
      }

      const remainder = sum % 36;
      const checkDigit = checkCodes[remainder];
      householdCode = `${baseCode}${checkDigit}`;

      // 检查唯一性
      const existing = await Household.findOne({ codeId: householdCode });
      if (!existing) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      throw new Error('无法生成唯一的户码');
    }

    return householdCode;
  }

  /**
   * 生成二维码图片
   */
  async generateQRCodeImage(codeId, qrData) {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads/qr-codes');
      await fs.mkdir(uploadsDir, { recursive: true });

      const fileName = `${codeId}_${Date.now()}.png`;
      const filePath = path.join(uploadsDir, fileName);

      await QRCode.toFile(filePath, JSON.stringify(qrData), {
        errorCorrectionLevel: 'H',
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      });

      return `/uploads/qr-codes/${fileName}`;

    } catch (error) {
      console.error('生成二维码图片失败:', error);
      throw error;
    }
  }

  /**
   * 检查管理权限
   */
  hasManagePermission(household, user) {
    // 管理员权限
    if (user.role === 'super_admin' || user.role === 'village_admin') {
      return true;
    }

    // 户主权限
    if (user.role === 'villager' && user.idCard === household.householder.idCard) {
      return true;
    }

    return false;
  }
}

module.exports = new HouseholdCodeController();