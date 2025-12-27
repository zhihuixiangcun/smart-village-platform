/**
 * SpecialCasesHandler Service
 * 特殊情形处理器
 * 处理收养、分户、重组家庭等特殊家庭关系情形
 */

const logger = require('../utils/logger');

class SpecialCasesHandler {
  constructor(dbService, options) {
    this.dbService = dbService;
    // 确保 options 不是 null
    const opts = options || {};
    this.rules = opts.rules || [];
  }

  // 特殊情形类型常量
  static get SPECIAL_CASE_TYPES() {
    return {
      ADOPTION: 'adoption',               // 收养
      HOUSEHOLD_DIVISION: 'division',     // 分户
      STEPFAMILY: 'stepfamily',           // 重组家庭
      FOSTER_CARE: 'foster_care',         // 寄养
      GUARDIANSHIP: 'guardianship',       // 监护
      SEPARATED_HOUSEHOLD: 'separated'    // 户籍分离
    };
  }

  // 处理状态常量
  static get PROCESSING_STATUS() {
    return {
      PENDING: 'pending',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      REJECTED: 'rejected',
      CANCELLED: 'cancelled'
    };
  }

  /**
   * 处理收养关系
   */
  async handleAdoptionCase(adoptionData) {
    try {
      const {
        adopterId,
        adopteeId,
        originalParentIds,
        adoptionType,
        adoptionDate,
        courtOrderNumber,
        documentFiles,
        operatorId
      } = adoptionData;

      // 验证收养数据
      const validation = await this.validateAdoption(adoptionData);
      if (!validation.valid) {
        return {
          success: false,
          reason: validation.reason
        };
      }

      // 处理文档
      const docResult = await this.processDocuments(documentFiles);
      if (!docResult.valid) {
        return {
          success: false,
          reason: '文档处理失败'
        };
      }

      // 创建收养记录
      const caseId = `ADOPTION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (this.dbService?.sqliteDB) {
        await this.dbService.sqliteDB.run(
          `INSERT INTO special_cases (id, case_type, status, primary_person_id, secondary_person_ids,
           case_data, operator_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [caseId, 'adoption', 'completed', adopteeId,
            `${adopterId},${originalParentIds.join(',')}`,
            JSON.stringify(adoptionData), operatorId, new Date()]
        );
      }

      // 更新关系绑定
      const relationshipUpdates = await this.updateAdoptionRelationships(adoptionData);

      logger.info(`收养关系处理完成: ${caseId}`);

      return {
        success: true,
        caseId,
        relationshipUpdates,
        adoptionCertificate: {
          caseId,
          adopterId,
          adopteeId,
          courtOrderNumber,
          adoptionDate
        }
      };

    } catch (error) {
      logger.error('处理收养关系失败:', error);
      throw error;
    }
  }

  /**
   * 处理分户情况
   */
  async handleHouseholdDivision(divisionData) {
    try {
      const {
        originalHouseholdId,
        newHouseholdId,
        newHouseholdHead,
        transferMemberIds,
        divisionReason,
        divisionDate,
        documentFiles,
        operatorId
      } = divisionData;

      // 验证分户数据
      const validation = await this.validateHouseholdDivision(divisionData);
      if (!validation.valid) {
        return {
          success: false,
          reason: validation.reason
        };
      }

      // 创建新户籍
      const newHousehold = await this.createNewHousehold({
        householdId: newHouseholdId,
        head: newHouseholdHead,
        members: transferMemberIds
      });

      // 转移成员
      const transferredMembers = [];
      for (const memberId of transferMemberIds) {
        const result = await this.transferMemberToHousehold(memberId, newHouseholdId);
        transferredMembers.push(result);
      }

      // 创建分户记录
      const caseId = `DIVISION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (this.dbService?.sqliteDB) {
        await this.dbService.sqliteDB.run(
          `INSERT INTO special_cases (id, case_type, status, primary_person_id, secondary_person_ids,
           case_data, operator_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [caseId, 'division', 'completed', originalHouseholdId,
            transferMemberIds.join(','),
            JSON.stringify(divisionData), operatorId, new Date()]
        );
      }

      logger.info(`分户处理完成: ${caseId}`);

      return {
        success: true,
        caseId,
        newHouseholdId,
        transferredMembers
      };

    } catch (error) {
      logger.error('处理分户失败:', error);
      throw error;
    }
  }

  /**
   * 处理重组家庭情况
   */
  async handleStepfamilyCase(stepfamilyData) {
    try {
      const {
        marriageParties,
        childrenFromPreviousMarriages,
        newHouseholdId,
        marriageDate,
        operatorId
      } = stepfamilyData;

      // 创建婚姻关系
      const marriageRelationship = await this.createMarriageRelationship(
        marriageParties[0],
        marriageParties[1],
        marriageDate
      );

      // 创建继子女关系
      const stepchildRelationships = [];
      for (const child of childrenFromPreviousMarriages) {
        const relationship = await this.createStepchildRelationship(
          child,
          marriageParties.find(p => p.memberId !== child.biologicalParentId)
        );
        stepchildRelationships.push(relationship);
      }

      // 创建重组家庭记录
      const caseId = `STEPFAMILY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (this.dbService?.sqliteDB) {
        const allMembers = [
          ...marriageParties.map(p => p.memberId),
          ...childrenFromPreviousMarriages.map(c => c.memberId)
        ].join(',');

        await this.dbService.sqliteDB.run(
          `INSERT INTO special_cases (id, case_type, status, primary_person_id, secondary_person_ids,
           case_data, operator_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [caseId, 'stepfamily', 'completed', marriageParties[0].memberId,
            allMembers,
            JSON.stringify(stepfamilyData), operatorId, new Date()]
        );
      }

      logger.info(`重组家庭处理完成: ${caseId}`);

      return {
        success: true,
        caseId,
        marriageRelationship,
        stepchildRelationships
      };

    } catch (error) {
      logger.error('处理重组家庭失败:', error);
      throw error;
    }
  }

  /**
   * 查询特殊情形记录
   */
  async querySpecialCases(queryParams) {
    try {
      const { caseType, status, limit = 100 } = queryParams;

      let query = 'SELECT * FROM special_cases WHERE 1=1';
      const params = [];

      if (caseType) {
        query += ' AND case_type = ?';
        params.push(caseType);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      let records = [];
      if (this.dbService?.sqliteDB) {
        records = await this.dbService.sqliteDB.all(query, params);
      }

      // 处理结果 - 转换为驼峰命名
      return records.map(record => ({
        id: record.id,
        caseType: record.case_type,
        status: record.status,
        primaryPersonId: record.primary_person_id,
        secondaryPersonIds: record.secondary_person_ids
          ? record.secondary_person_ids.split(',')
          : [],
        caseData: record.case_data ? JSON.parse(record.case_data) : {},
        operatorId: record.operator_id,
        createdAt: record.created_at
      }));

    } catch (error) {
      logger.error('查询特殊情形记录失败:', error);
      return [];
    }
  }

  /**
   * 验证收养数据
   */
  async validateAdoption(adoptionData) {
    const { adopterId, adopteeId, adoptionType } = adoptionData;

    // 检查收养人和被收养人是否是同一人
    if (adopterId === adopteeId) {
      return {
        valid: false,
        reason: '收养人和被收养人不能是同一人'
      };
    }

    // 检查收养类型
    const validTypes = ['full', 'partial', 'simple'];
    if (!validTypes.includes(adoptionType)) {
      return {
        valid: false,
        reason: '无效的收养类型'
      };
    }

    return { valid: true };
  }

  /**
   * 验证分户数据
   */
  async validateHouseholdDivision(divisionData) {
    const { originalHouseholdId, transferMemberIds, newHouseholdHead } = divisionData;

    // 检查原户籍是否存在
    const householdInfo = await this.getHouseholdInfo(originalHouseholdId);
    if (!householdInfo) {
      return {
        valid: false,
        reason: '原户籍不存在'
      };
    }

    // 检查新户主是否在转移名单中
    if (!transferMemberIds.includes(newHouseholdHead.memberId)) {
      return {
        valid: false,
        reason: '新户主必须在转移成员名单中'
      };
    }

    return { valid: true };
  }

  /**
   * 辅助方法
   */
  async processDocuments(documentFiles) {
    // 模拟实现
    return { valid: true, processedCount: documentFiles.length };
  }

  async updateAdoptionRelationships(adoptionData) {
    // 模拟实现
    return { updated: true, relationships: ['adopter_adoptee'] };
  }

  async createNewHousehold(householdData) {
    // 模拟实现
    return { id: 1, householdId: householdData.householdId };
  }

  async transferMemberToHousehold(memberId, newHouseholdId) {
    // 模拟实现
    return { memberId, newHouseholdId, success: true };
  }

  async createMarriageRelationship(spouse1, spouse2, marriageDate) {
    // 模拟实现
    return { spouse1Id: spouse1.memberId, spouse2Id: spouse2.memberId, marriageDate };
  }

  async createStepchildRelationship(child, stepparent) {
    // 模拟实现
    return { childId: child.memberId, stepparentId: stepparent.memberId };
  }

  async getHouseholdInfo(householdId) {
    // 模拟实现
    return { id: 1, householdId };
  }

  async getUserInfo(userId) {
    // 模拟实现 - 返回测试数据
    return {
      memberId: userId,
      memberName: '张三',
      memberIdCard: '110101197001010001',
      phoneNumber: '13800138001'
    };
  }

  /**
   * 检查是否为特殊情形
   */
  async isSpecialCase(data) {
    // 检查收养关系
    if (data.adoptionCertificate) {
      return { isSpecial: true, reason: '收养关系' };
    }

    // 检查分户情况
    if (data.householdDivision) {
      return { isSpecial: true, reason: '分户' };
    }

    // 检查重组家庭
    if (data.stepfamily) {
      return { isSpecial: true, reason: '重组家庭' };
    }

    return { isSpecial: false, reason: null };
  }

  /**
   * 获取可处理的特殊情形列表
   */
  getSupportedCaseTypes() {
    return Object.values(SpecialCasesHandler.SPECIAL_CASE_TYPES);
  }

  /**
   * 处理特殊情形（通用入口）
   */
  async handleSpecialCase(caseData) {
    const { caseType } = caseData;

    switch (caseType) {
    case SpecialCasesHandler.SPECIAL_CASE_TYPES.ADOPTION:
      return await this.handleAdoptionCase(caseData);
    case SpecialCasesHandler.SPECIAL_CASE_TYPES.HOUSEHOLD_DIVISION:
      return await this.handleHouseholdDivision(caseData);
    case SpecialCasesHandler.SPECIAL_CASE_TYPES.STEPFAMILY:
      return await this.handleStepfamilyCase(caseData);
    default:
      return {
        handled: false,
        caseType,
        reason: '不支持的特殊情形类型'
      };
    }
  }
}

module.exports = SpecialCasesHandler;
