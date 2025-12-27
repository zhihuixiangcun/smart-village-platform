/**
 * TripleQueryVerification Service
 * 三重查询验证系统
 * 实现三层安全验证：身份验证 -> 关系验证 -> 管理员审批
 */

const logger = require('../utils/logger');

class TripleQueryVerification {
  constructor(dbService, options) {
    this.dbService = dbService;
    // 确保 options 不是 null
    const opts = options || {};
    this.enabled = opts.enabled !== false;
    this.approvalTimeout = opts.approvalTimeout || 86400000; // 24小时
  }

  // 查询类型常量
  static get QUERY_TYPES() {
    return {
      SELF_INFO: 'self_info',           // 查询本人信息
      FAMILY_MEMBER: 'family_member',   // 查询家庭成员
      SENSITIVE_DATA: 'sensitive_data', // 查询敏感数据
      GOVERNMENT: 'government'          // 政府部门查询
    };
  }

  // 验证状态常量
  static get VERIFICATION_STATUS() {
    return {
      PENDING: 'pending',
      LEVEL_1_PASSED: 'level_1_passed',
      LEVEL_2_PASSED: 'level_2_passed',
      LEVEL_3_PASSED: 'level_3_passed',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      FAILED: 'failed',
      TIMEOUT: 'timeout'
    };
  }

  /**
   * 启动三重验证流程
   */
  async initiateTripleVerification(queryRequest) {
    try {
      const {
        queryId,
        requesterId,
        targetUserId,
        queryType,
        queryData,
        requestReason,
        urgencyLevel = 'normal'
      } = queryRequest;

      // 验证必要参数
      if (!queryId || !requesterId || !targetUserId || !queryType) {
        throw new Error('缺少必要参数');
      }

      // 创建验证记录
      const verificationId = `VERIFY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const estimatedTime = this.estimateCompletionTime(queryType, urgencyLevel);

      const verificationRecord = {
        id: verificationId,
        queryId,
        requesterId,
        targetUserId,
        queryType,
        queryData: JSON.stringify(queryData),
        requestReason,
        urgencyLevel,
        currentLevel: 1,
        status: TripleQueryVerification.VERIFICATION_STATUS.PENDING,
        createdAt: new Date(),
        estimatedCompletionTime: estimatedTime
      };

      // 保存到数据库
      if (this.dbService?.sqliteDB) {
        await this.dbService.sqliteDB.run(
          `INSERT INTO query_verifications (id, query_id, requester_id, target_user_id,
           query_type, query_data, request_reason, urgency_level, current_level, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [verificationId, queryId, requesterId, targetUserId, queryType,
            JSON.stringify(queryData), requestReason, urgencyLevel, 1, 'pending']
        );
      }

      logger.info(`三重验证流程启动: ${verificationId}`);

      return {
        success: true,
        verificationId,
        currentLevel: 1,
        estimatedCompletionTime: estimatedTime,
        message: '三重验证流程已启动'
      };

    } catch (error) {
      logger.error('启动三重验证失败:', error);
      throw new Error(`启动三重验证失败: ${error.message}`);
    }
  }

  /**
   * 第一层验证：身份验证（人脸识别、身份证、手机号）
   */
  async performLevel1Verification(verificationRecord) {
    try {
      // 模拟人脸识别验证
      const faceResult = await this.performFaceVerification(verificationRecord);
      if (!faceResult.success) {
        return {
          status: TripleQueryVerification.VERIFICATION_STATUS.FAILED,
          reason: '人脸识别验证失败'
        };
      }

      // 身份证验证
      const idCardResult = await this.performIdCardVerification(verificationRecord);
      if (!idCardResult.success) {
        return {
          status: TripleQueryVerification.VERIFICATION_STATUS.FAILED,
          reason: '身份证验证失败'
        };
      }

      // 手机号验证
      const phoneResult = await this.performPhoneVerification(verificationRecord);
      if (!phoneResult.success) {
        return {
          status: TripleQueryVerification.VERIFICATION_STATUS.FAILED,
          reason: '手机号验证失败'
        };
      }

      logger.info(`第一层验证通过: ${verificationRecord.id}`);

      return {
        status: TripleQueryVerification.VERIFICATION_STATUS.LEVEL_1_PASSED,
        faceConfidence: faceResult.confidence,
        message: '第一层验证通过'
      };

    } catch (error) {
      logger.error('第一层验证失败:', error);
      return {
        status: TripleQueryVerification.VERIFICATION_STATUS.FAILED,
        reason: error.message
      };
    }
  }

  /**
   * 第二层验证：血缘关系匹配
   */
  async performLevel2Verification(verificationRecord) {
    try {
      // 获取关系数据
      const relationshipData = await this.getRelationshipData(
        verificationRecord.requesterId,
        verificationRecord.targetUserId
      );

      // 验证关系权限
      const permissionResult = await this.verifyRelationshipPermission(
        verificationRecord,
        relationshipData
      );

      if (!permissionResult.hasPermission) {
        return {
          status: TripleQueryVerification.VERIFICATION_STATUS.FAILED,
          reason: '关系权限验证失败'
        };
      }

      // 检查自动审批条件
      const approvalCheck = await this.checkAutoApprovalConditions(
        verificationRecord,
        relationshipData
      );

      if (approvalCheck.approved) {
        logger.info(`第二层验证自动通过: ${verificationRecord.id}`);
        return {
          status: TripleQueryVerification.VERIFICATION_STATUS.LEVEL_2_PASSED,
          approved: true,
          approvalMethod: 'automatic',
          message: '第二层验证通过，自动批准'
        };
      }

      // 需要进入第三层审批
      return {
        status: TripleQueryVerification.VERIFICATION_STATUS.LEVEL_2_PASSED,
        approved: false,
        approvalMethod: 'manual',
        message: '需要管理员审批'
      };

    } catch (error) {
      logger.error('第二层验证失败:', error);
      return {
        status: TripleQueryVerification.VERIFICATION_STATUS.FAILED,
        reason: error.message
      };
    }
  }

  /**
   * 第三层验证：管理员审批
   */
  async performLevel3Verification(verificationRecord) {
    try {
      // 确定审批要求
      const requirements = await this.determineApprovalRequirements(verificationRecord);

      // 查找可用审批人
      const approvers = await this.findAvailableApprovers(verificationRecord);

      if (approvers.length === 0) {
        return {
          status: TripleQueryVerification.VERIFICATION_STATUS.FAILED,
          reason: '没有可用的审批人'
        };
      }

      // 创建审批请求
      const approvalRequest = await this.createApprovalRequest({
        verificationId: verificationRecord.id,
        requiredApprovers: requirements.requiredApprovers,
        approvers: approvers.slice(0, requirements.requiredApprovers),
        urgencyLevel: verificationRecord.urgencyLevel,
        timeout: this.approvalTimeout
      });

      logger.info(`第三层审批流程创建: ${approvalRequest.id}`);

      return {
        status: TripleQueryVerification.VERIFICATION_STATUS.PENDING,
        currentLevel: 3,
        approvalRequestId: approvalRequest.id,
        message: '等待管理员审批'
      };

    } catch (error) {
      logger.error('第三层验证失败:', error);
      return {
        status: TripleQueryVerification.VERIFICATION_STATUS.FAILED,
        reason: error.message
      };
    }
  }

  /**
   * 处理管理员审批决定
   */
  async processApprovalDecision(approvalDecision) {
    try {
      const { approvalRequestId, approverId, decision, reason } = approvalDecision;

      // 验证审批权限
      const hasPermission = await this.verifyApprovalPermission(approverId);
      if (!hasPermission) {
        throw new Error('无审批权限');
      }

      // 获取审批请求状态
      const approvalStatus = await this.checkApprovalStatus(approvalRequestId);

      if (approvalStatus.isComplete) {
        return {
          success: true,
          decision: approvalStatus.finalDecision,
          message: '审批已完成'
        };
      }

      // 更新审批决定
      if (this.dbService?.sqliteDB) {
        await this.dbService.sqliteDB.run(
          'UPDATE approval_requests SET decision = ?, approver_id = ?, reason = ?, decided_at = ? WHERE id = ?',
          [decision, approverId, reason, new Date(), approvalRequestId]
        );
      }

      // 如果批准，执行授权查询
      if (decision === 'approved') {
        const queryResult = await this.executeAuthorizedQuery(approvalStatus.verificationRecord);
        return {
          success: true,
          decision: 'approved',
          queryResult,
          message: '审批通过，查询已执行'
        };
      }

      return {
        success: true,
        decision: 'rejected',
        message: '审批被拒绝'
      };

    } catch (error) {
      logger.error('处理审批决定失败:', error);
      throw error;
    }
  }

  /**
   * 执行授权查询
   */
  async executeAuthorizedQuery(verificationRecord) {
    const { queryType, targetUserId, queryData } = verificationRecord;

    switch (queryType) {
    case TripleQueryVerification.QUERY_TYPES.SELF_INFO:
      return await this.querySelfInfo(targetUserId);
    case TripleQueryVerification.QUERY_TYPES.FAMILY_MEMBER:
      return await this.queryFamilyMember(targetUserId, JSON.parse(queryData || '{}'));
    case TripleQueryVerification.QUERY_TYPES.SENSITIVE_DATA:
      return await this.querySensitiveData(targetUserId, JSON.parse(queryData || '{}'));
    default:
      throw new Error('不支持的查询类型');
    }
  }

  /**
   * 辅助方法
   */
  async performFaceVerification(record) {
    // 模拟实现
    return { success: true, confidence: 0.95 };
  }

  async performIdCardVerification(record) {
    // 模拟实现
    return { success: true };
  }

  async performPhoneVerification(record) {
    // 模拟实现
    return { success: true };
  }

  async getRelationshipData(userId1, userId2) {
    // 模拟实现
    return { relationshipType: 'parent_child', confidence: 0.9 };
  }

  async verifyRelationshipPermission(record, relationshipData) {
    // 模拟实现
    return { hasPermission: true };
  }

  async checkAutoApprovalConditions(record, relationshipData) {
    // 模拟实现
    return { approved: true };
  }

  async determineApprovalRequirements(record) {
    // 模拟实现
    return { requiredApprovers: 1, estimatedTime: 30 };
  }

  async findAvailableApprovers(record) {
    // 模拟实现
    return [{ id: 'admin1', name: '管理员1' }];
  }

  async createApprovalRequest(requestData) {
    // 模拟实现
    return { id: `approval_${Date.now()}` };
  }

  async verifyApprovalPermission(approverId) {
    // 模拟实现
    return true;
  }

  async checkApprovalStatus(approvalRequestId) {
    // 模拟实现
    return { isComplete: true, finalDecision: 'approved' };
  }

  async querySelfInfo(userId) {
    return { userId, data: {} };
  }

  async queryFamilyMember(userId, fields) {
    return { userId, fields, data: {} };
  }

  async querySensitiveData(userId, fields) {
    return { userId, fields, data: {} };
  }

  estimateCompletionTime(queryType, urgencyLevel) {
    const baseTime = { normal: 30, urgent: 10, emergency: 5 };
    return (baseTime[urgencyLevel] || 30) * 60000; // 转换为毫秒
  }
}

module.exports = TripleQueryVerification;
