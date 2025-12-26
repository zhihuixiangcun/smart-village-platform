/**
 * 村民管理控制器
 * 支持村民档案CRUD、查询统计、特殊群体管理等功能
 */

const Resident = require('../models/Resident');
const Household = require('../models/Household');
const { validationResult } = require('express-validator');
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');

class ResidentManagementController {
  /**
   * 创建村民档案
   */
  async createResident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const residentData = {
        ...req.body,
        villageId: req.user.villageId || req.body.villageId,
        status: 'active'
      };

      // 检查身份证是否已存在
      const existingResident = await Resident.findOne({
        idCard: residentData.idCard,
        status: { $ne: 'deceased' }
      });

      if (existingResident) {
        return res.status(400).json({
          success: false,
          message: '该身份证号已存在'
        });
      }

      const resident = new Resident(residentData);
      await resident.save();

      // 如果是户主，检查是否需要创建户码
      if (residentData.household && residentData.household.relationship === 'householder') {
        await this.generateHouseholdCode(resident, req.user);
      }

      res.status(201).json({
        success: true,
        message: '村民档案创建成功',
        data: resident
      });

    } catch (error) {
      logger.error('创建村民档案失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 获取村民详情
   */
  async getResident(req, res) {
    try {
      const { id } = req.params;
      const resident = await Resident.findById(id)
        .populate('villageId', 'name code');

      if (!resident) {
        return res.status(404).json({
          success: false,
          message: '村民档案不存在'
        });
      }

      // 权限检查和数据脱敏
      const sanitizedData = this.sanitizeResidentData(resident, req.user);

      res.json({
        success: true,
        data: sanitizedData
      });

    } catch (error) {
      logger.error('获取村民详情失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 更新村民信息
   */
  async updateResident(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const resident = await Resident.findById(id);
      if (!resident) {
        return res.status(404).json({
          success: false,
          message: '村民档案不存在'
        });
      }

      // 权限检查
      if (!this.hasUpdatePermission(resident, req.user)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      // 如果更新身份证，检查唯一性
      if (updateData.idCard && updateData.idCard !== resident.idCard) {
        const existingResident = await Resident.findOne({
          idCard: updateData.idCard,
          _id: { $ne: id },
          status: { $ne: 'deceased' }
        });

        if (existingResident) {
          return res.status(400).json({
            success: false,
            message: '该身份证号已被使用'
          });
        }
      }

      // 记录变更历史
      const changeHistory = {
        operatorId: req.user._id,
        operatorName: req.user.name,
        changeDate: new Date(),
        oldData: resident.toObject(),
        newData: updateData
      };

      if (!resident.metadata) resident.metadata = {};
      if (!resident.metadata.changeHistory) resident.metadata.changeHistory = [];
      resident.metadata.changeHistory.push(changeHistory);

      // 保留最多50条变更记录
      if (resident.metadata.changeHistory.length > 50) {
        resident.metadata.changeHistory = resident.metadata.changeHistory.slice(-50);
      }

      // 更新信息
      Object.assign(resident, updateData);
      resident.updatedAt = new Date();
      await resident.save();

      res.json({
        success: true,
        message: '村民信息更新成功',
        data: resident
      });

    } catch (error) {
      logger.error('更新村民信息失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 删除村民档案（软删除）
   */
  async deleteResident(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const resident = await Resident.findById(id);
      if (!resident) {
        return res.status(404).json({
          success: false,
          message: '村民档案不存在'
        });
      }

      // 权限检查
      if (!this.hasDeletePermission(req.user)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      // 软删除
      resident.status = 'inactive';
      resident.metadata = resident.metadata || {};
      resident.metadata.deleteReason = reason;
      resident.metadata.deletedBy = req.user._id;
      resident.metadata.deletedAt = new Date();
      await resident.save();

      res.json({
        success: true,
        message: '村民档案删除成功'
      });

    } catch (error) {
      logger.error('删除村民档案失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 获取村民列表
   */
  async getResidents(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        keyword,
        gender,
        ageRange,
        occupation,
        education,
        specialGroup,
        householdNumber,
        status = 'active'
      } = req.query;

      const query = { status };
      const villageId = req.user.villageId || req.query.villageId;
      if (villageId) query.villageId = villageId;

      // 关键词搜索
      if (keyword) {
        query.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { idCard: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword, $options: 'i' } },
          { 'address.detailAddress': { $regex: keyword, $options: 'i' } }
        ];
      }

      // 筛选条件
      if (gender) query.gender = gender;
      if (occupation) query.occupation = occupation;
      if (education) query['education.degree'] = education;
      if (householdNumber) query['household.householdNumber'] = householdNumber;

      // 年龄范围筛选
      if (ageRange) {
        const [minAge, maxAge] = ageRange.split('-').map(Number);
        const currentYear = new Date().getFullYear();
        const minBirthYear = currentYear - maxAge;
        const maxBirthYear = currentYear - minAge;

        query.birthDate = {
          $gte: new Date(`${minBirthYear}-01-01`),
          $lte: new Date(`${maxBirthYear}-12-31`)
        };
      }

      // 特殊群体筛选
      if (specialGroup) {
        query['specialIdentities.type'] = specialGroup;
      }

      const residents = await Resident.find(query)
        .populate('villageId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Resident.countDocuments(query);

      // 数据脱敏
      const sanitizedResidents = residents.map(resident =>
        this.sanitizeResidentData(resident, req.user)
      );

      res.json({
        success: true,
        data: {
          residents: sanitizedResidents,
          pagination: {
            current: parseInt(page),
            pageSize: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('获取村民列表失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 获取村民统计信息
   */
  async getResidentStats(req, res) {
    try {
      const villageId = req.user.villageId || req.query.villageId;

      const stats = await Resident.getResidentStats(villageId);

      // 获取特殊群体统计
      const specialGroups = await Promise.all([
        Resident.countDocuments({
          villageId,
          status: 'active',
          birthDate: { $lte: new Date(`${new Date().getFullYear() - 60}-01-01`) }
        }),
        Resident.countDocuments({
          villageId,
          status: 'active',
          'health.disabilities.0': { $exists: true }
        }),
        Resident.countDocuments({
          villageId,
          status: 'active',
          'poverty.isPovertyHousehold': true
        }),
        Resident.countDocuments({
          villageId,
          status: 'active',
          'villageParticipation.partyMember': true
        }),
        Resident.countDocuments({
          villageId,
          status: 'active',
          'migrantWork.isMigrantWorker': true
        })
      ]);

      res.json({
        success: true,
        data: {
          general: stats[0] || {},
          specialGroups: {
            elderly: specialGroups[0],
            disabled: specialGroups[1],
            poverty: specialGroups[2],
            partyMembers: specialGroups[3],
            migrantWorkers: specialGroups[4]
          }
        }
      });

    } catch (error) {
      logger.error('获取村民统计失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 获取特殊群体列表
   */
  async getSpecialGroups(req, res) {
    try {
      const { groupType } = req.params;
      const villageId = req.user.villageId || req.query.villageId;

      const residents = await Resident.findSpecialGroups(villageId, groupType)
        .populate('villageId', 'name');

      const sanitizedResidents = residents.map(resident =>
        this.sanitizeResidentData(resident, req.user)
      );

      res.json({
        success: true,
        data: sanitizedResidents
      });

    } catch (error) {
      logger.error('获取特殊群体失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 按户查询村民
   */
  async getResidentsByHousehold(req, res) {
    try {
      const { householdNumber } = req.params;
      const villageId = req.user.villageId || req.query.villageId;

      // 查找户信息
      const household = await Household.findOne({
        'householder.idCard': householdNumber,
        villageId,
        status: 'active'
      }).populate('bloodRelationNetwork.relatedFamilies.householdId');

      if (!household) {
        return res.status(404).json({
          success: false,
          message: '户信息不存在'
        });
      }

      // 查找家庭成员
      const residents = await Resident.findByHousehold(householdNumber)
        .populate('villageId', 'name');

      const sanitizedResidents = residents.map(resident =>
        this.sanitizeResidentData(resident, req.user)
      );

      res.json({
        success: true,
        data: {
          household,
          residents: sanitizedResidents
        }
      });

    } catch (error) {
      logger.error('按户查询村民失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message
      });
    }
  }

  /**
   * 生成户码
   */
  async generateHouseholdCode(resident, operator) {
    try {
      // 检查是否已存在户码
      const existingHousehold = await Household.findOne({
        'householder.idCard': resident.idCard,
        status: 'active'
      });

      if (existingHousehold) {
        return existingHousehold;
      }

      // 生成户码
      const villageCode = operator.villageId || 'DEFAULT';
      const householdCode = Household.generateSequence(villageCode);
      const codeId = `${villageCode}H${householdCode.toString().padStart(4, '0')}A`;

      // 创建户记录
      const household = new Household({
        codeId,
        villageId: resident.villageId,
        householder: {
          userId: resident._id,
          name: resident.name,
          idCard: resident.idCard,
          phone: resident.phone,
          isPartyMember: resident.villageParticipation?.partyMember || false,
          occupation: resident.occupation
        },
        address: {
          province: resident.address?.province || '',
          city: resident.address?.city || '',
          county: resident.address?.district || '',
          township: resident.address?.town || '',
          village: resident.address?.village || '',
          detailed: resident.address?.detailAddress || ''
        },
        members: [],
        metadata: {
          createdBy: operator._id,
          createdAt: new Date()
        }
      });

      // 生成二维码
      household.generateQRCode();
      await household.save();

      return household;

    } catch (error) {
      logger.error('生成户码失败:', error);
      throw error;
    }
  }

  /**
   * 数据脱敏
   */
  sanitizeResidentData(resident, user) {
    const data = resident.toObject();

    // 管理员看到完整信息
    if (user.role === 'super_admin' || user.role === 'village_admin') {
      return data;
    }

    // 村民查看时脱敏敏感信息
    if (user.role === 'villager') {
      // 本人查看
      if (user.idCard === data.idCard) {
        return data;
      }

      // 他人查看时脱敏
      if (data.idCard) {
        data.idCard = `${data.idCard.substring(0, 6)}********${data.idCard.substring(14)}`;
      }
      if (data.phone) {
        data.phone = `${data.phone.substring(0, 3)}****${data.phone.substring(7)}`;
      }
    }

    return data;
  }

  /**
   * 检查更新权限
   */
  hasUpdatePermission(resident, user) {
    if (user.role === 'super_admin' || user.role === 'village_admin') {
      return true;
    }

    // 本人可以更新部分信息
    if (user.role === 'villager' && user.idCard === resident.idCard) {
      return true;
    }

    return false;
  }

  /**
   * 检查删除权限
   */
  hasDeletePermission(user) {
    return user.role === 'super_admin' || user.role === 'village_admin';
  }
}

module.exports = new ResidentManagementController();