/**
 * HouseholdQRService - 一户一码服务
 * 提供二维码生成、扫码查看、更新等功能
 */

const Household = require('../models/Household');
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');

class HouseholdQRService {
  /**
   * 生成户码二维码
   * @param {String} householdId - 家庭ID
   * @param {Object} options - 选项
   * @returns {Object} 二维码数据
   */
  async generateHouseholdQR(householdId, options = {}) {
    const household = await Household.findById(householdId);
    if (!household) {
      throw new Error('家庭不存在');
    }

    // 生成二维码数据
    const qrData = household.generateQRCode();

    // 生成二维码图片URL
    let qrImageUrl = null;
    if (options.includeImage !== false) {
      try {
        const protocol = options.protocol || 'smartvillage';
        const codeContent = `${protocol}://household/${household.codeId}`;
        qrImageUrl = await QRCode.toDataURL(codeContent, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // 同时保存图片URL到数据库
        household.qrCode.imageUrl = qrImageUrl;
        await household.save();
      } catch (err) {
        logger.error('生成二维码图片失败:', err);
      }
    }

    // 生成访问链接
    const accessUrl = `${process.env.CLIENT_URL || 'https://smartvillage.example'}/household/${household.codeId}`;

    return {
      codeId: household.codeId,
      qrCodeData: qrData,
      qrImageUrl,
      accessUrl,
      protocol: 'smartvillage',
      expiryDate: household.qrCode.expiryDate,
      household: {
        householder: household.householder.name,
        memberCount: household.totalFamilyMembers,
        address: this.formatAddress(household.address)
      }
    };
  }

  /**
   * 扫码解析户码
   * @param {String} codeId - 户码
   * @param {Object} scannerInfo - 扫码者信息
   * @returns {Object} 家庭信息
   */
  async scanHouseholdQR(codeId, scannerInfo = {}) {
    // 验证户码格式
    const validation = Household.validateHouseholdCode(codeId);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // 查找家庭
    const household = await Household.findOne({ codeId, status: 'active' });
    if (!household) {
      throw new Error('家庭不存在或已注销');
    }

    // 检查二维码是否过期
    if (household.qrCode.expiryDate && new Date() > household.qrCode.expiryDate) {
      throw new Error('二维码已过期，请联系管理员更新');
    }

    // 检查使用次数限制
    if (household.qrCode.maxUsage && household.qrCode.usageCount >= household.qrCode.maxUsage) {
      throw new Error('二维码已达到使用次数限制');
    }

    // 增加使用次数
    household.qrCode.usageCount = (household.qrCode.usageCount || 0) + 1;
    await household.save();

    // 记录扫描日志
    await this.logScan(household._id, scannerInfo);

    // 根据扫描者权限返回数据
    const viewerRole = scannerInfo.role || 'guest';
    const viewerIdCard = scannerInfo.idCard || null;

    // 脱敏数据
    const sanitizedData = household.sanitizeData(viewerRole, viewerIdCard);

    return {
      household: sanitizedData,
      permissions: this.getViewerPermissions(viewerRole, household, scannerInfo),
      scanInfo: {
        scanTime: new Date(),
        canView: true,
        canEdit: this.canEdit(viewerRole, household, scannerInfo)
      }
    };
  }

  /**
   * 更新家庭信息（通过扫码）
   * @param {String} codeId - 户码
   * @param {Object} updateData - 更新数据
   * @param {Object} updaterInfo - 更新者信息
   * @returns {Object} 更新后的家庭信息
   */
  async updateHouseholdByQR(codeId, updateData, updaterInfo = {}) {
    const household = await Household.findOne({ codeId, status: 'active' });
    if (!household) {
      throw new Error('家庭不存在或已注销');
    }

    // 验证更新权限
    if (!this.canEdit(updaterInfo.role, household, updaterInfo)) {
      throw new Error('无权限编辑此家庭信息');
    }

    // 记录变更前的数据
    const oldData = household.toObject();

    // 根据更新数据类型进行更新
    const updateType = this.determineUpdateType(updateData);

    switch (updateType) {
      case 'add_member':
        await this.handleAddMember(household, updateData, updaterInfo);
        break;
      case 'remove_member':
        await this.handleRemoveMember(household, updateData, updaterInfo);
        break;
      case 'update_member':
        await this.handleUpdateMember(household, updateData, updaterInfo);
        break;
      case 'update_address':
        await this.handleUpdateAddress(household, updateData, updaterInfo);
        break;
      case 'update_tags':
        await this.handleUpdateTags(household, updateData, updaterInfo);
        break;
      case 'update_contact':
        await this.handleUpdateContact(household, updateData, updaterInfo);
        break;
      default:
        throw new Error('不支持的更新类型');
    }

    // 添加变更历史
    household.addChangeHistory(
      updateType,
      updaterInfo.userId,
      updaterInfo.userName,
      `通过二维码更新: ${updateType}`,
      oldData,
      household.toObject()
    );

    await household.save();

    return {
      success: true,
      message: '更新成功',
      household: household.sanitizeData(updaterInfo.role, updaterInfo.idCard)
    };
  }

  /**
   * 获取家庭成员详情
   * @param {String} codeId - 户码
   * @param {String} memberId - 成员ID
   * @param {Object} viewerInfo - 查看者信息
   * @returns {Object} 成员详情
   */
  async getMemberByQR(codeId, memberId, viewerInfo = {}) {
    const household = await Household.findOne({ codeId, status: 'active' });
    if (!household) {
      throw new Error('家庭不存在或已注销');
    }

    // 查找成员
    let member = null;
    if (household.householder._id.toString() === memberId) {
      member = household.householder;
    } else {
      member = household.members.find(m => m._id.toString() === memberId && m.isActive);
    }

    if (!member) {
      throw new Error('成员不存在');
    }

    // 检查查看权限
    const viewerRole = viewerInfo.role || 'guest';
    const viewerIdCard = viewerInfo.idCard || null;

    // 脱敏敏感信息
    let sanitizedMember = { ...member };

    if (viewerRole !== 'super_admin' && viewerRole !== 'village_admin') {
      const isFamilyMember = viewerIdCard && (
        household.householder.idCard === viewerIdCard ||
        household.members.some(m => m.idCard === viewerIdCard && m.isActive)
      );

      if (!isFamilyMember) {
        if (sanitizedMember.idCard) {
          sanitizedMember.idCard = this.maskIdCard(sanitizedMember.idCard);
        }
        if (sanitizedMember.phone) {
          sanitizedMember.phone = this.maskPhone(sanitizedMember.phone);
        }
      }
    }

    return {
      member: sanitizedMember,
      householdInfo: {
        codeId: household.codeId,
        householder: household.householder.name,
        address: this.formatAddress(household.address)
      },
      permissions: this.getViewerPermissions(viewerRole, household, viewerInfo)
    };
  }

  /**
   * 批量生成户码（村庄级别）
   * @param {String} villageId - 村庄ID
   * @returns {Object} 生成结果
   */
  async batchGenerateQRForVillage(villageId) {
    const households = await Household.find({
      villageId,
      status: 'active'
    });

    if (households.length === 0) {
      throw new Error('该村庄没有活跃的家庭');
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const household of households) {
      try {
        const qrData = await this.generateHouseholdQR(household._id, {
          includeImage: false // 批量生成时不生成图片，提高速度
        });
        results.push({
          householdId: household._id,
          codeId: household.codeId,
          success: true,
          qrData
        });
        successCount++;
      } catch (error) {
        results.push({
          householdId: household._id,
          codeId: household.codeId,
          success: false,
          error: error.message
        });
        failureCount++;
      }
    }

    return {
      villageId,
      total: households.length,
      successCount,
      failureCount,
      results
    };
  }

  /**
   * 刷新过期二维码
   * @param {String} householdId - 家庭ID
   * @returns {Object} 新的二维码数据
   */
  async refreshQRCode(householdId) {
    const household = await Household.findById(householdId);
    if (!household) {
      throw new Error('家庭不存在');
    }

    // 重新生成二维码
    const qrData = await this.generateHouseholdQR(householdId);

    return {
      success: true,
      message: '二维码已刷新',
      qrData
    };
  }

  /**
   * 获取户码统计信息
   * @param {String} villageId - 村庄ID
   * @returns {Object} 统计信息
   */
  async getHouseholdQRStats(villageId) {
    const households = await Household.find({ villageId, status: 'active' });

    let activeQRCount = 0;
    let expiredQRCount = 0;
    let totalUsage = 0;

    households.forEach(h => {
      if (h.qrCode.expiryDate) {
        if (new Date() > h.qrCode.expiryDate) {
          expiredQRCount++;
        } else {
          activeQRCount++;
        }
      } else {
        activeQRCount++; // 没有过期时间的视为有效
      }
      totalUsage += h.qrCode.usageCount || 0;
    });

    return {
      villageId,
      totalHouseholds: households.length,
      activeQRCount,
      expiredQRCount,
      totalUsage,
      avgUsage: households.length > 0 ? Math.round(totalUsage / households.length) : 0
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 格式化地址
   */
  formatAddress(address) {
    const parts = [
      address.province,
      address.city,
      address.county,
      address.township,
      address.village,
      address.group,
      address.detailed
    ].filter(Boolean);

    return parts.join('');
  }

  /**
   * 获取查看者权限
   */
  getViewerPermissions(role, household, viewerInfo) {
    const permissions = {
      canViewBasic: true,
      canViewMembers: false,
      canViewSensitive: false,
      canEdit: false,
      canAddMember: false,
      canRemoveMember: false
    };

    const isFamilyMember = viewerInfo.idCard && (
      household.householder.idCard === viewerInfo.idCard ||
      household.members.some(m => m.idCard === viewerInfo.idCard && m.isActive)
    );

    switch (role) {
      case 'super_admin':
      case 'village_admin':
        permissions.canViewMembers = true;
        permissions.canViewSensitive = true;
        permissions.canEdit = true;
        permissions.canAddMember = true;
        permissions.canRemoveMember = true;
        break;
      case 'village_worker':
        permissions.canViewMembers = true;
        permissions.canViewSensitive = false;
        permissions.canEdit = false;
        break;
      default:
        if (isFamilyMember) {
          permissions.canViewMembers = true;
          permissions.canViewSensitive = true;
          // 家庭成员可以编辑基本信息
          permissions.canEdit = true;
        } else if (household.privacySettings.allowPublicView) {
          permissions.canViewMembers = true;
        }
        break;
    }

    return permissions;
  }

  /**
   * 检查是否可以编辑
   */
  canEdit(role, household, viewerInfo) {
    const permissions = this.getViewerPermissions(role, household, viewerInfo);
    return permissions.canEdit;
  }

  /**
   * 确定更新类型
   */
  determineUpdateType(updateData) {
    if (updateData.memberData) {
      if (updateData.memberId) {
        return 'update_member';
      }
      return 'add_member';
    }
    if (updateData.removeMemberId) {
      return 'remove_member';
    }
    if (updateData.address) {
      return 'update_address';
    }
    if (updateData.tags) {
      return 'update_tags';
    }
    if (updateData.contact) {
      return 'update_contact';
    }
    return 'unknown';
  }

  /**
   * 处理添加成员
   */
  async handleAddMember(household, updateData, updaterInfo) {
    household.members.push({
      ...updateData.memberData,
      joinDate: new Date(),
      isActive: true
    });
  }

  /**
   * 处理移除成员
   */
  async handleRemoveMember(household, updateData, updaterInfo) {
    household.members = household.members.map(m => {
      if (m._id.toString() === updateData.removeMemberId) {
        m.isActive = false;
        m.leaveDate = new Date();
      }
      return m;
    });
  }

  /**
   * 处理更新成员
   */
  async handleUpdateMember(household, updateData, updaterInfo) {
    const memberIndex = household.members.findIndex(
      m => m._id.toString() === updateData.memberId
    );
    if (memberIndex !== -1) {
      Object.assign(household.members[memberIndex], updateData.memberData);
    }
  }

  /**
   * 处理更新地址
   */
  async handleUpdateAddress(household, updateData, updaterInfo) {
    Object.assign(household.address, updateData.address);
  }

  /**
   * 处理更新标签
   */
  async handleUpdateTags(household, updateData, updaterInfo) {
    household.specialTags = updateData.tags;
  }

  /**
   * 处理更新联系方式
   */
  async handleUpdateContact(household, updateData, updaterInfo) {
    if (updateData.contact.householderPhone) {
      household.householder.phone = updateData.contact.householderPhone;
    }
  }

  /**
   * 记录扫描日志
   */
  async logScan(householdId, scannerInfo) {
    // 可以集成到日志系统
    logger.debug(`[HouseholdQR] Scan logged:`, {
      householdId,
      scannerId: scannerInfo.userId,
      scannerName: scannerInfo.userName,
      scanTime: new Date();
    });
  }

  /**
   * 身份证脱敏
   */
  maskIdCard(idCard) {
    if (!idCard || idCard.length !== 18) return idCard;
    return `${idCard.substring(0, 6)}********${idCard.substring(14)}`;
  }

  /**
   * 手机号脱敏
   */
  maskPhone(phone) {
    if (!phone || phone.length !== 11) return phone;
    return `${phone.substring(0, 3)}****${phone.substring(7)}`;
  }
}

module.exports = new HouseholdQRService();
