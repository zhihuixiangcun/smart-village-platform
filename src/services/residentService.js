/**
 * 村民管理服务
 * 处理村民相关的业务逻辑
 */

const mongoose = require('mongoose');
const Resident = require('../models/Resident');
const Family = require('../models/Family');
const AuditUtil = require('../utils/audit');
const EncryptionUtil = require('../utils/encryption');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class ResidentService {
  /**
   * 创建村民档案
   * @param {Object} residentData - 村民数据
   * @param {Object} operator - 操作者信息
   * @returns {Object} 创建的村民信息
   */
  async createResident(residentData, operator) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. 加密敏感信息
      const encryptedData = {
        ...residentData,
        phone: residentData.phone ? EncryptionUtil.encrypt(residentData.phone) : undefined,
        idCard: EncryptionUtil.encrypt(residentData.idCard),
        bankAccount: residentData.bankAccount ? EncryptionUtil.encrypt(residentData.bankAccount) : undefined
      };

      // 2. 生成唯一档案编号
      const archiveNumber = await this.generateArchiveNumber(residentData.villageId);

      // 3. 创建村民记录
      const resident = new Resident({
        ...encryptedData,
        archiveNumber,
        villageId: residentData.villageId
      });

      await resident.save({ session });

      // 4. 如果有家庭信息，创建或更新家庭记录
      if (residentData.familyId) {
        await this.updateFamilyMembership(
          residentData.familyId,
          resident._id,
          residentData.relation,
          session
        );
      } else {
        // 创建新的家庭记录
        const family = new Family({
          villageId: residentData.villageId,
          head: resident._id,
          members: [{
            residentId: resident._id,
            name: resident.name,
            relation: 'self',
            isHead: true
          }],
          address: residentData.address
        });
        await family.save({ session });

        // 更新村民的家庭ID
        resident.familyId = family._id;
        await resident.save({ session });
      }

      // 5. 记录审计日志
      await AuditUtil.logOperation('CREATE', 'resident', operator, {
        target: {
          id: resident._id,
          type: 'Resident',
          name: resident.name
        },
        result: 'SUCCESS',
        details: {
          description: `创建村民档案: ${resident.name}`,
          changes: {
            before: null,
            after: {
              name: resident.name,
              archiveNumber
            }
          }
        },
        villageId: residentData.villageId,
        sessionId: operator.sessionId
      });

      // 6. 发送通知
      await notificationService.sendNotification({
        type: 'resident_created',
        recipient: {
          userId: operator.userId,
          name: operator.name
        },
        title: '村民档案创建成功',
        message: `${resident.name} 的档案已创建，档案编号: ${archiveNumber}`,
        data: {
          residentId: resident._id,
          archiveNumber
        }
      });

      await session.commitTransaction();

      logger.info('村民档案创建成功', {
        residentId: resident._id,
        name: resident.name,
        operator: operator.name
      });

      return resident;
    } catch (error) {
      await session.abortTransaction();
      logger.error('创建村民档案失败:', error);
      throw new Error('创建村民档案失败: ' + error.message);
    } finally {
      session.endSession();
    }
  }

  /**
   * 批量导入村民
   * @param {Array} residentsData - 村民数据数组
   * @param {Object} operator - 操作者信息
   * @returns {Object} 导入结果
   */
  async batchImportResidents(residentsData, operator) {
    const results = {
      success: [],
      failed: [],
      total: residentsData.length
    };

    try {
      // 分批处理，避免内存溢出
      const batchSize = 50;
      for (let i = 0; i < residentsData.length; i += batchSize) {
        const batch = residentsData.slice(i, i + batchSize);

        for (const residentData of batch) {
          try {
            // 验证必要字段
            if (!residentData.name || !residentData.idCard) {
              throw new Error('姓名和身份证号为必填项');
            }

            // 检查是否已存在
            const existing = await Resident.findOne({
              idCard: EncryptionUtil.encrypt(residentData.idCard)
            });

            if (existing) {
              throw new Error('该身份证号已存在');
            }

            const resident = await this.createResident(residentData, operator);
            results.success.push({
              name: resident.name,
              idCard: residentData.idCard,
              archiveNumber: resident.archiveNumber
            });
          } catch (error) {
            results.failed.push({
              data: residentData,
              error: error.message
            });
          }
        }
      }

      // 记录批量导入审计日志
      await AuditUtil.logOperation('IMPORT', 'resident', operator, {
        result: results.failed.length === 0 ? 'SUCCESS' : 'PARTIAL',
        details: {
          description: `批量导入村民档案，成功: ${results.success.length}，失败: ${results.failed.length}`,
          changes: {
            before: null,
            after: {
              successCount: results.success.length,
              failedCount: results.failed.length
            }
          }
        },
        riskLevel: 'HIGH',
        villageId: residentsData[0]?.villageId,
        sessionId: operator.sessionId
      });

      return results;
    } catch (error) {
      logger.error('批量导入村民失败:', error);
      throw new Error('批量导入失败: ' + error.message);
    }
  }

  /**
   * 获取村民详细信息
   * @param {string} residentId - 村民ID
   * @param {Object} viewer - 查看者信息
   * @returns {Object} 村民信息
   */
  async getResidentById(residentId, viewer) {
    try {
      const resident = await Resident.findById(residentId)
        .populate('familyId')
        .populate('villageId', 'name code')
        .lean();

      if (!resident) {
        throw new Error('村民不存在');
      }

      // 检查权限
      const hasPermission = await this.checkViewPermission(resident, viewer);
      if (!hasPermission) {
        throw new Error('无权限查看该村民信息');
      }

      // 脱敏处理
      const maskedData = this.maskSensitiveData(resident, viewer);

      // 记录查看审计日志
      await AuditUtil.logOperation('VIEW', 'resident', viewer, {
        target: {
          id: residentId,
          type: 'Resident',
          name: resident.name
        },
        riskLevel: 'LOW',
        villageId: resident.villageId._id,
        sessionId: viewer.sessionId
      });

      return maskedData;
    } catch (error) {
      logger.error('获取村民信息失败:', error);
      throw new Error('获取村民信息失败: ' + error.message);
    }
  }

  /**
   * 更新村民信息
   * @param {string} residentId - 村民ID
   * @param {Object} updateData - 更新数据
   * @param {Object} operator - 操作者信息
   * @returns {Object} 更新后的村民信息
   */
  async updateResident(residentId, updateData, operator) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 获取原始数据
      const originalResident = await Resident.findById(residentId);
      if (!originalResident) {
        throw new Error('村民不存在');
      }

      // 准备更新数据
      const updates = { ...updateData };

      // 加密敏感信息
      if (updates.phone) {
        updates.phone = EncryptionUtil.encrypt(updates.phone);
      }
      if (updates.idCard) {
        updates.idCard = EncryptionUtil.encrypt(updates.idCard);
      }
      if (updates.bankAccount) {
        updates.bankAccount = EncryptionUtil.encrypt(updates.bankAccount);
      }

      // 执行更新
      const updatedResident = await Resident.findByIdAndUpdate(
        residentId,
        { ...updates, updatedAt: new Date() },
        { new: true, session }
      ).populate('familyId');

      // 记录审计日志
      await AuditUtil.logOperation('UPDATE', 'resident', operator, {
        target: {
          id: residentId,
          type: 'Resident',
          name: originalResident.name
        },
        result: 'SUCCESS',
        details: {
          description: `更新村民信息: ${originalResident.name}`,
          changes: {
            before: this.extractChangedFields(originalResident.toObject(), updateData),
            after: updateData
          },
          fields: Object.keys(updateData)
        },
        villageId: originalResident.villageId,
        sessionId: operator.sessionId
      });

      await session.commitTransaction();

      logger.info('村民信息更新成功', {
        residentId,
        operator: operator.name
      });

      return updatedResident;
    } catch (error) {
      await session.abortTransaction();
      logger.error('更新村民信息失败:', error);
      throw new Error('更新村民信息失败: ' + error.message);
    } finally {
      session.endSession();
    }
  }

  /**
   * 获取家庭成员网络
   * @param {string} residentId - 村民ID
   * @param {Object} viewer - 查看者信息
   * @returns {Object} 家庭网络信息
   */
  async getFamilyNetwork(residentId, viewer) {
    try {
      const resident = await Resident.findById(residentId).populate('familyId');
      if (!resident) {
        throw new Error('村民不存在');
      }

      const family = await Family.findById(resident.familyId)
        .populate('members.residentId', 'name phone idCard avatar')
        .populate('head', 'name phone')
        .lean();

      if (!family) {
        return { family: null, relatives: [] };
      }

      // 获取亲属关系
      const relatives = await this.getRelatives(residentId, 3); // 3代以内

      // 脱敏处理
      const maskedFamily = this.maskFamilyData(family, viewer);
      const maskedRelatives = relatives.map(rel => this.maskSensitiveData(rel, viewer));

      return {
        family: maskedFamily,
        relatives: maskedRelatives
      };
    } catch (error) {
      logger.error('获取家庭网络失败:', error);
      throw new Error('获取家庭网络失败: ' + error.message);
    }
  }

  /**
   * 生成档案编号
   * @param {string} villageId - 村庄ID
   * @returns {string} 档案编号
   */
  async generateArchiveNumber(villageId) {
    try {
      const village = await mongoose.model('Village').findById(villageId);
      const villageCode = village?.code || 'V001';

      // 获取今年的计数
      const year = new Date().getFullYear();
      const count = await Resident.countDocuments({
        villageId,
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      });

      // 生成编号: 村庄代码 + 年份后两位 + 4位序号
      const sequence = String(count + 1).padStart(4, '0');
      return `${villageCode}${String(year).slice(2)}${sequence}`;
    } catch (error) {
      logger.error('生成档案编号失败:', error);
      throw new Error('生成档案编号失败');
    }
  }

  /**
   * 更新家庭成员关系
   * @param {string} familyId - 家庭ID
   * @param {string} residentId - 村民ID
   * @param {string} relation - 关系
   * @param {ClientSession} session - MongoDB会话
   */
  async updateFamilyMembership(familyId, residentId, relation, session) {
    try {
      await Family.findByIdAndUpdate(
        familyId,
        {
          $push: {
            members: {
              residentId,
              relation,
              joinedAt: new Date()
            }
          },
          updatedAt: new Date()
        },
        { session }
      );
    } catch (error) {
      throw new Error('更新家庭成员关系失败');
    }
  }

  /**
   * 检查查看权限
   * @param {Object} resident - 村民信息
   * @param {Object} viewer - 查看者
   * @returns {boolean} 是否有权限
   */
  async checkViewPermission(resident, viewer) {
    // 本人可以查看
    if (viewer.userId === resident._id.toString()) {
      return true;
    }

    // 同村村干部可以查看
    if (viewer.role === 'village_official' &&
        viewer.villageId === resident.villageId.toString()) {
      return true;
    }

    // 家庭成员可以查看
    if (viewer.familyId === resident.familyId?.toString()) {
      return true;
    }

    // 系统管理员可以查看
    if (viewer.role === 'system_admin') {
      return true;
    }

    return false;
  }

  /**
   * 脱敏处理敏感数据
   * @param {Object} data - 原始数据
   * @param {Object} viewer - 查看者
   * @returns {Object} 脱敏后的数据
   */
  maskSensitiveData(data, viewer) {
    const masked = { ...data };

    // 判断查看者角色
    const role = viewer.userId === data._id.toString() ? 'self' :
                 viewer.familyId === data.familyId?.toString() ? 'family' :
                 viewer.role === 'village_official' ? 'admin' : 'other';

    // 脱敏身份证号
    if (data.idCard) {
      masked.idCard = EncryptionUtil.maskIdCard(data.idCard, role);
    }

    // 脱敏手机号
    if (data.phone) {
      masked.phone = EncryptionUtil.maskPhone(data.phone, role);
    }

    // 脱敏银行卡号
    if (data.bankAccount && role !== 'self' && role !== 'admin') {
      masked.bankAccount = '**** **** ****';
    }

    return masked;
  }

  /**
   * 脱敏家庭数据
   * @param {Object} family - 家庭数据
   * @param {Object} viewer - 查看者
   * @returns {Object} 脱敏后的家庭数据
   */
  maskFamilyData(family, viewer) {
    const masked = { ...family };

    // 脱敏成员信息
    if (masked.members) {
      masked.members = masked.members.map(member => ({
        ...member,
        residentId: this.maskSensitiveData(member.residentId, viewer)
      }));
    }

    return masked;
  }

  /**
   * 提取变更字段
   * @param {Object} original - 原始数据
   * @param {Object} updated - 更新数据
   * @returns {Object} 变更的字段
   */
  extractChangedFields(original, updated) {
    const changed = {};
    for (const key in updated) {
      if (original[key] !== updated[key]) {
        changed[key] = original[key];
      }
    }
    return changed;
  }

  /**
   * 获取亲属关系
   * @param {string} residentId - 村民ID
   * @param {number} depth - 查找深度
   * @returns {Array} 亲属列表
   */
  async getRelatives(residentId, depth = 2) {
    // 实现亲属关系查询逻辑
    // 这里需要根据实际的数据模型来实现
    return [];
  }
}

module.exports = new ResidentService();