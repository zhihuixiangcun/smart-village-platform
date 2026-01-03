/**
 * Family Service
 * 家庭管理业务逻辑层
 *
 * 职责：
 * 1. 家庭档案的增删改查
 * 2. 二维码生成和管理
 * 3. 家庭类型自动识别
 * 4. 标签管理
 * 5. 统计分析
 * 6. 数据验证和清洗
 */

const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');

class FamilyService {
  /**
   * 创建新家庭档案
   * @param {Object} familyData - 家庭数据
   * @param {Object} operator - 操作者信息
   * @returns {Promise<Family>}
   */
  async createFamily(familyData, operator) {
    try {
      // 验证房屋编号是否已存在
      const existingFamily = await Family.findOne({
        houseNumber: familyData.houseNumber,
        isDeleted: false
      });

      if (existingFamily) {
        throw new Error('房屋编号已存在');
      }

      // 验证户主身份证号是否已被使用
      const existingMember = await FamilyMember.findByIdCard(
        familyData.headOfHousehold.idCard
      );

      if (existingMember) {
        throw new Error('该身份证号已注册为家庭成员');
      }

      // 创建家庭档案
      const family = new Family(familyData);

      // 生成二维码
      await family.generateQRCode();

      // 保存家庭信息
      await family.save();

      // 创建户主成员记录
      const headMember = new FamilyMember({
        familyId: family._id,
        name: familyData.headOfHousehold.name,
        idCard: familyData.headOfHousehold.idCard,
        gender: familyData.headOfHousehold.gender || '男',
        birthDate: familyData.headOfHousehold.birthDate || new Date('1970-01-01'),
        phone: familyData.headOfHousehold.phone,
        relationship: '户主',
        isHead: true,
        address: family.address
      });

      await headMember.save();

      // 更新家庭的户主成员ID
      family.headOfHousehold.memberId = headMember._id;
      await family.save();

      // 添加操作日志
      await family.addLog(
        operator.name,
        operator.id,
        '创建家庭档案',
        { houseNumber: family.houseNumber }
      );

      // 计算家庭类型和帮扶优先级
      await family.calculateFamilyTypes();
      await family.calculateHelpPriority();

      return family;
    } catch (error) {
      throw new Error(`创建家庭档案失败: ${error.message}`);
    }
  }

  /**
   * 更新家庭档案
   * @param {String} familyId - 家庭ID
   * @param {Object} updateData - 更新数据
   * @param {Object} operator - 操作者信息
   * @returns {Promise<Family>}
   */
  async updateFamily(familyId, updateData, operator) {
    try {
      const family = await Family.findById(familyId);

      if (!family) {
        throw new Error('家庭档案不存在');
      }

      // 验证房屋编号是否与其他家庭冲突
      if (updateData.houseNumber && updateData.houseNumber !== family.houseNumber) {
        const existingFamily = await Family.findOne({
          houseNumber: updateData.houseNumber,
          _id: { $ne: familyId },
          isDeleted: false
        });

        if (existingFamily) {
          throw new Error('房屋编号已被使用');
        }
      }

      // 更新字段
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'qrCode') {
          family[key] = updateData[key];
        }
      });

      family.lastUpdatedBy = operator.id;
      family.lastUpdatedAt = new Date();

      await family.save();

      // 添加操作日志
      await family.addLog(
        operator.name,
        operator.id,
        '更新家庭档案',
        { updatedFields: Object.keys(updateData) }
      );

      // 重新计算家庭类型和帮扶优先级
      await family.calculateFamilyTypes();
      await family.calculateHelpPriority();

      return family;
    } catch (error) {
      throw new Error(`更新家庭档案失败: ${error.message}`);
    }
  }

  /**
   * 删除家庭档案（软删除）
   * @param {String} familyId - 家庭ID
   * @param {Object} operator - 操作者信息
   * @returns {Promise<Boolean>}
   */
  async deleteFamily(familyId, operator) {
    try {
      const family = await Family.findById(familyId);

      if (!family) {
        throw new Error('家庭档案不存在');
      }

      // 软删除家庭
      family.isDeleted = true;
      family.deletedAt = new Date();
      await family.save();

      // 软删除所有家庭成员
      await FamilyMember.updateMany(
        { familyId, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() }
      );

      // 添加操作日志
      await family.addLog(
        operator.name,
        operator.id,
        '删除家庭档案',
        { houseNumber: family.houseNumber }
      );

      return true;
    } catch (error) {
      throw new Error(`删除家庭档案失败: ${error.message}`);
    }
  }

  /**
   * 获取家庭详情
   * @param {String} familyId - 家庭ID
   * @returns {Promise<Object>}
   */
  async getFamilyById(familyId) {
    try {
      const family = await Family.findById(familyId)
        .populate('villageId', 'name district town')
        .populate('lastUpdatedBy', 'name')
        .populate('headOfHousehold.memberId');

      if (!family || family.isDeleted) {
        throw new Error('家庭档案不存在');
      }

      // 获取家庭成员
      const members = await FamilyMember.findByFamilyId(familyId);

      return {
        family,
        members
      };
    } catch (error) {
      throw new Error(`获取家庭详情失败: ${error.message}`);
    }
  }

  /**
   * 根据二维码获取家庭信息
   * @param {String} qrCode - 二维码编码
   * @returns {Promise<Object>}
   */
  async getFamilyByQRCode(qrCode) {
    try {
      const family = await Family.findByQRCode(qrCode);

      if (!family) {
        throw new Error('二维码无效或已过期');
      }

      // 检查二维码是否过期
      if (family.qrCode.expiresAt && new Date() > family.qrCode.expiresAt) {
        family.qrCode.status = 'EXPIRED';
        await family.save();
        throw new Error('二维码已过期');
      }

      // 获取家庭成员
      const members = await FamilyMember.findByFamilyId(family._id);

      return {
        family,
        members
      };
    } catch (error) {
      throw new Error(`获取家庭信息失败: ${error.message}`);
    }
  }

  /**
   * 获取村庄家庭列表
   * @param {String} villageId - 村庄ID
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>}
   */
  async getFamilyList(villageId, filters = {}) {
    try {
      const query = { villageId, isDeleted: false };

      // 家庭类型筛选
      if (filters.familyType) {
        query.familyTypes = filters.familyType;
      }

      // 需要走访筛选
      if (filters.needsVisit !== undefined) {
        query['specialFlags.needsRegularVisit'] = filters.needsVisit;
      }

      // 住房状态筛选
      if (filters.housingType) {
        query['housing.type'] = filters.housingType;
      }

      // 风险等级筛选
      if (filters.riskLevel) {
        query['specialFlags.riskLevel'] = filters.riskLevel;
      }

      // 搜索关键词
      if (filters.keyword) {
        const keyword = filters.keyword;
        query.$or = [
          { houseNumber: new RegExp(keyword, 'i') },
          { 'headOfHousehold.name': new RegExp(keyword, 'i') },
          { 'address.detail': new RegExp(keyword, 'i') }
        ];
      }

      let families = await Family.find(query)
        .populate('villageId', 'name district town')
        .sort({ houseNumber: 1 });

      // 分页
      if (filters.page && filters.pageSize) {
        const skip = (filters.page - 1) * filters.pageSize;
        families = families.skip(skip).limit(filters.pageSize);
      }

      return families;
    } catch (error) {
      throw new Error(`获取家庭列表失败: ${error.message}`);
    }
  }

  /**
   * 添加家庭成员
   * @param {String} familyId - 家庭ID
   * @param {Object} memberData - 成员数据
   * @param {Object} operator - 操作者信息
   * @returns {Promise<FamilyMember>}
   */
  async addFamilyMember(familyId, memberData, operator) {
    try {
      const family = await Family.findById(familyId);

      if (!family) {
        throw new Error('家庭档案不存在');
      }

      // 验证身份证号是否已存在
      const existingMember = await FamilyMember.findByIdCard(memberData.idCard);
      if (existingMember) {
        throw new Error('该身份证号已注册');
      }

      // 如果是户主，检查是否已有户主
      if (memberData.isHead) {
        const existingHead = await FamilyMember.findOne({
          familyId,
          isHead: true,
          isDeleted: false
        });

        if (existingHead) {
          throw new Error('该家庭已有户主');
        }
      }

      // 创建成员
      const member = new FamilyMember({
        ...memberData,
        familyId
      });

      await member.save();

      // 更新家庭成员数量
      await family.updateMemberCount();

      // 重新计算家庭类型和帮扶优先级
      await family.calculateFamilyTypes();
      await family.calculateHelpPriority();

      // 添加操作日志
      await family.addLog(
        operator.name,
        operator.id,
        '添加家庭成员',
        { memberName: member.name, relationship: member.relationship }
      );

      return member;
    } catch (error) {
      throw new Error(`添加家庭成员失败: ${error.message}`);
    }
  }

  /**
   * 更新家庭成员信息
   * @param {String} memberId - 成员ID
   * @param {Object} updateData - 更新数据
   * @param {Object} operator - 操作者信息
   * @returns {Promise<FamilyMember>}
   */
  async updateFamilyMember(memberId, updateData, operator) {
    try {
      const member = await FamilyMember.findById(memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      // 验证身份证号唯一性
      if (updateData.idCard && updateData.idCard !== member.idCard) {
        const existingMember = await FamilyMember.findByIdCard(updateData.idCard);
        if (existingMember && existingMember._id.toString() !== memberId) {
          throw new Error('该身份证号已被使用');
        }
      }

      // 更新字段
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'familyId') {
          member[key] = updateData[key];
        }
      });

      await member.save();

      // 更新家庭信息
      const family = await Family.findById(member.familyId);
      await family.updateMemberCount();
      await family.calculateFamilyTypes();
      await family.calculateHelpPriority();

      // 添加操作日志
      await family.addLog(
        operator.name,
        operator.id,
        '更新家庭成员信息',
        { memberName: member.name }
      );

      return member;
    } catch (error) {
      throw new Error(`更新成员信息失败: ${error.message}`);
    }
  }

  /**
   * 删除家庭成员（软删除）
   * @param {String} memberId - 成员ID
   * @param {Object} operator - 操作者信息
   * @returns {Promise<Boolean>}
   */
  async deleteFamilyMember(memberId, operator) {
    try {
      const member = await FamilyMember.findById(memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      // 户主不能删除
      if (member.isHead) {
        throw new Error('户主不能删除，如需更换户主请先设置新户主');
      }

      member.isDeleted = true;
      member.deletedAt = new Date();
      await member.save();

      // 更新家庭
      const family = await Family.findById(member.familyId);
      await family.updateMemberCount();
      await family.calculateFamilyTypes();
      await family.calculateHelpPriority();

      // 添加操作日志
      await family.addLog(
        operator.name,
        operator.id,
        '删除家庭成员',
        { memberName: member.name }
      );

      return true;
    } catch (error) {
      throw new Error(`删除成员失败: ${error.message}`);
    }
  }

  /**
   * 重新生成二维码
   * @param {String} familyId - 家庭ID
   * @param {Number} expiresInDays - 有效期（天），null表示永久
   * @param {Object} operator - 操作者信息
   * @returns {Promise<Family>}
   */
  async regenerateQRCode(familyId, expiresInDays = null, operator) {
    try {
      const family = await Family.findById(familyId);

      if (!family) {
        throw new Error('家庭档案不存在');
      }

      await family.generateQRCode(expiresInDays);

      // 添加操作日志
      await family.addLog(
        operator.name,
        operator.id,
        '重新生成二维码',
        {
          expiresAt: family.qrCode.expiresAt,
          expiresInDays
        }
      );

      return family;
    } catch (error) {
      throw new Error(`重新生成二维码失败: ${error.message}`);
    }
  }

  /**
   * 撤销二维码
   * @param {String} familyId - 家庭ID
   * @param {Object} operator - 操作者信息
   * @returns {Promise<Family>}
   */
  async revokeQRCode(familyId, operator) {
    try {
      const family = await Family.findById(familyId);

      if (!family) {
        throw new Error('家庭档案不存在');
      }

      await family.revokeQRCode();

      // 添加操作日志
      await family.addLog(
        operator.name,
        operator.id,
        '撤销二维码',
        {}
      );

      return family;
    } catch (error) {
      throw new Error(`撤销二维码失败: ${error.message}`);
    }
  }

  /**
   * 记录二维码打印
   * @param {String} familyId - 家庭ID
   * @returns {Promise<Family>}
   */
  async recordQRCodePrint(familyId) {
    try {
      const family = await Family.findById(familyId);

      if (!family) {
        throw new Error('家庭档案不存在');
      }

      await family.recordPrint();
      return family;
    } catch (error) {
      throw new Error(`记录打印失败: ${error.message}`);
    }
  }

  /**
   * 添加家庭标签
   * @param {String} familyId - 家庭ID
   * @param {String} tagName - 标签名称
   * @param {String} color - 标签颜色
   * @param {String} createdBy - 创建者ID
   * @returns {Promise<Family>}
   */
  async addFamilyTag(familyId, tagName, color, createdBy) {
    try {
      const family = await Family.findById(familyId);

      if (!family) {
        throw new Error('家庭档案不存在');
      }

      await family.addTag(tagName, color, createdBy);
      return family;
    } catch (error) {
      throw new Error(`添加标签失败: ${error.message}`);
    }
  }

  /**
   * 移除家庭标签
   * @param {String} familyId - 家庭ID
   * @param {String} tagName - 标签名称
   * @returns {Promise<Family>}
   */
  async removeFamilyTag(familyId, tagName) {
    try {
      const family = await Family.findById(familyId);

      if (!family) {
        throw new Error('家庭档案不存在');
      }

      await family.removeTag(tagName);
      return family;
    } catch (error) {
      throw new Error(`移除标签失败: ${error.message}`);
    }
  }

  /**
   * 添加成员特殊标签
   * @param {String} memberId - 成员ID
   * @param {String} tag - 标签
   * @returns {Promise<FamilyMember>}
   */
  async addMemberSpecialTag(memberId, tag) {
    try {
      const member = await FamilyMember.findById(memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      await member.addSpecialTag(tag);

      // 更新家庭类型和优先级
      const family = await Family.findById(member.familyId);
      await family.calculateFamilyTypes();
      await family.calculateHelpPriority();

      return member;
    } catch (error) {
      throw new Error(`添加特殊标签失败: ${error.message}`);
    }
  }

  /**
   * 移除成员特殊标签
   * @param {String} memberId - 成员ID
   * @param {String} tag - 标签
   * @returns {Promise<FamilyMember>}
   */
  async removeMemberSpecialTag(memberId, tag) {
    try {
      const member = await FamilyMember.findById(memberId);

      if (!member || member.isDeleted) {
        throw new Error('成员不存在');
      }

      await member.removeSpecialTag(tag);

      // 更新家庭类型和优先级
      const family = await Family.findById(member.familyId);
      await family.calculateFamilyTypes();
      await family.calculateHelpPriority();

      return member;
    } catch (error) {
      throw new Error(`移除特殊标签失败: ${error.message}`);
    }
  }

  /**
   * 获取统计数据
   * @param {String} villageId - 村庄ID
   * @returns {Promise<Object>}
   */
  async getStatistics(villageId) {
    try {
      const stats = await Family.getStatistics(villageId);

      // 获取需要定期走访的家庭列表
      const needsVisitFamilies = await Family.find({
        villageId,
        'specialFlags.needsRegularVisit': true,
        isDeleted: false
      })
        .select('houseNumber headOfHousehold specialFlags')
        .sort({ 'specialFlags.helpPriority': -1 });

      // 按家庭类型统计
      const familyTypeStats = await Family.aggregate([
        {
          $match: {
            villageId: mongoose.Types.ObjectId(villageId),
            isDeleted: false
          }
        },
        {
          $unwind: '$familyTypes'
        },
        {
          $group: {
            _id: '$familyTypes',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return {
        ...stats,
        needsVisitFamilies,
        familyTypeStats
      };
    } catch (error) {
      throw new Error(`获取统计数据失败: ${error.message}`);
    }
  }

  /**
   * 导出家庭数据
   * @param {String} villageId - 村庄ID
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>}
   */
  async exportFamilyData(villageId, filters = {}) {
    try {
      const families = await this.getFamilyList(villageId, filters);

      const exportData = [];

      for (const family of families) {
        const members = await FamilyMember.findByFamilyId(family._id);

        exportData.push({
          房屋编号: family.houseNumber,
          户主姓名: family.headOfHousehold.name,
          户主电话: family.headOfHousehold.phoneMasked,
          家庭地址: family.fullAddress,
          家庭成员数: family.memberCount,
          在村成员数: family.memberCountInVillage,
          家庭类型: family.familyTypes.join(', '),
          住房类型: family.housing.type,
          建筑面积: family.housing.area,
          耕地面积: family.land.cultivatedArea,
          年收入: family.economicStatus.annualIncome,
          帮扶优先级: family.specialFlags.helpPriority,
          风险等级: family.specialFlags.riskLevel,
          成员列表: members.map(m => ({
            姓名: m.name,
            关系: m.relationship,
            年龄: m.age,
            电话: m.phoneMasked,
            特殊标签: m.specialTags.join(', ')
          }))
        });
      }

      return exportData;
    } catch (error) {
      throw new Error(`导出数据失败: ${error.message}`);
    }
  }

  /**
   * 搜索家庭
   * @param {String} villageId - 村庄ID
   * @param {String} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchFamilies(villageId, keyword) {
    try {
      const families = await Family.find({
        villageId,
        isDeleted: false,
        $or: [
          { houseNumber: new RegExp(keyword, 'i') },
          { 'headOfHousehold.name': new RegExp(keyword, 'i') },
          { 'headOfHousehold.phone': new RegExp(keyword, 'i') },
          { 'address.detail': new RegExp(keyword, 'i') }
        ]
      })
        .populate('villageId', 'name district town')
        .limit(20);

      return families;
    } catch (error) {
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  /**
   * 批量导入家庭数据
   * @param {Array} familyList - 家庭数据列表
   * @param {Object} operator - 操作者信息
   * @returns {Promise<Object>}
   */
  async batchImportFamilies(familyList, operator) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const familyData of familyList) {
      try {
        await this.createFamily(familyData, operator);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          houseNumber: familyData.houseNumber,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new FamilyService();
