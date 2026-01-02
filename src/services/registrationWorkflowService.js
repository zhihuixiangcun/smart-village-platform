/**
 * 用户注册审批工作流服务
 *
 * 核心功能：
 * - 处理注册申请提交
 * - 管理多级审批流程
 * - 创建用户账号
 * - 发送通知
 *
 * 审批流程：
 * - 村民: pending → village_review → approved/rejected
 * - 村管理员: pending → village_review → township_review → approved/rejected
 * - 乡镇管理员: pending → township_review → super_admin_review → approved/rejected
 */

const { RegistrationApplication } = require('../models/RegistrationApplication');
const User = require('../models/User');
const Resident = require('../models/Resident');
const CommitteeMember = require('../models/CommitteeMember');
const Village = require('../models/Village');
const identityCardOCRService = require('./identityCardOCRService');
const logger = require('../utils/logger');

class RegistrationWorkflowService {
  /**
   * 提交注册申请
   * @param {Object} applicationData - 申请数据
   * @param {Object} files - 上传的文件
   * @returns {Promise<Object>} 提交结果
   */
  async submitApplication(applicationData, files = {}) {
    try {
      logger.info('开始处理注册申请', {
        type: applicationData.applicationType,
        phone: applicationData.applicant?.phone
      });

      // 1. 验证必填字段
      this._validateApplicationData(applicationData);

      // 2. 检查重复申请
      await this._checkDuplicateApplication(applicationData);

      // 3. 执行OCR识别
      let ocrResults = { idCardVerified: false };
      if (files.idCardFront && files.idCardBack) {
        ocrResults = await this._performOCRRecognition(files);
      }

      // 4. 创建申请记录
      const application = new RegistrationApplication({
        ...applicationData,
        ocrVerification: ocrResults,
        metadata: {
          ...applicationData.metadata,
          ipAddress: applicationData.metadata?.ipAddress || 'unknown',
          userAgent: applicationData.metadata?.userAgent || 'unknown'
        }
      });

      await application.save();

      logger.info('注册申请已创建', {
        applicationId: application._id,
        status: application.approval.status
      });

      // 5. 发送通知给审批人
      await this._notifyReviewers(application);

      return {
        success: true,
        applicationId: application._id,
        status: application.approval.status,
        currentStage: application.approval.currentStage,
        estimatedReviewTime: this._calculateEstimatedReviewTime(applicationData.applicationType)
      };

    } catch (error) {
      logger.error('提交注册申请失败:', error);
      throw error;
    }
  }

  /**
   * 审批申请
   * @param {String} applicationId - 申请ID
   * @param {Object} reviewData - 审批数据
   * @returns {Promise<Object>} 审批结果
   */
  async reviewApplication(applicationId, reviewData) {
    try {
      const application = await RegistrationApplication.findById(applicationId);
      if (!application) {
        throw new Error('申请不存在');
      }

      // 1. 验证审批权限
      await this._validateReviewPermission(application, reviewData.reviewerId);

      // 2. 添加审批记录
      application.approval.reviewedBy.push({
        reviewerId: reviewData.reviewerId,
        reviewerName: reviewData.reviewerName,
        reviewerRole: reviewData.reviewerRole,
        decision: reviewData.decision,
        comments: reviewData.comments,
        reviewedAt: new Date()
      });

      // 3. 根据决策更新状态
      if (reviewData.decision === 'approved') {
        await this._approveApplication(application, reviewData);
      } else if (reviewData.decision === 'rejected') {
        await this._rejectApplication(application, reviewData);
      } else if (reviewData.decision === 'request_info') {
        await this._requestAdditionalInfo(application, reviewData);
      }

      await application.save();

      logger.info('申请审批完成', {
        applicationId,
        decision: reviewData.decision,
        newStatus: application.approval.status
      });

      // 4. 发送通知给申请人
      await this._notifyApplicant(application, reviewData);

      return {
        success: true,
        applicationId: application._id,
        newStatus: application.approval.status,
        newStage: application.approval.currentStage
      };

    } catch (error) {
      logger.error('审批申请失败:', error);
      throw error;
    }
  }

  /**
   * 获取待审批列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 待审批列表
   */
  async getPendingApplications(filters = {}) {
    try {
      return await RegistrationApplication.getPendingApplications(filters);
    } catch (error) {
      logger.error('获取待审批列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取申请状态
   * @param {String} applicationId - 申请ID
   * @returns {Promise<Object>} 申请状态
   */
  async getApplicationStatus(applicationId) {
    try {
      const application = await RegistrationApplication.findById(applicationId)
        .populate('residentInfo.villageId')
        .populate('villageAdminInfo.villageId')
        .populate('approval.reviewedBy.reviewerId');

      if (!application) {
        throw new Error('申请不存在');
      }

      return {
        success: true,
        application: {
          id: application._id,
          type: application.applicationType,
          status: application.approval.status,
          currentStage: application.approval.currentStage,
          submittedAt: application.approval.submittedAt,
          reviewedBy: application.approval.reviewedBy,
          canModify: application.approval.status === 'requires_info'
        }
      };
    } catch (error) {
      logger.error('获取申请状态失败:', error);
      throw error;
    }
  }

  /**
   * 批准申请 - 内部方法
   * @private
   */
  async _approveApplication(application, reviewData) {
    // 1. 确定下一审批阶段
    const nextStage = this._getNextApprovalStage(application);

    if (nextStage) {
      // 进入下一审批阶段
      application.approval.currentStage = nextStage;
      application.approval.status = 'under_review';

      logger.info('申请进入下一审批阶段', {
        applicationId: application._id,
        nextStage
      });

      // 通知下一阶段审批人
      await this._notifyReviewers(application);

    } else {
      // 最终批准 - 创建用户账号
      const user = await this._createUserAccount(application, reviewData);

      application.approval.status = 'approved';
      application.approval.finalDecision = {
        decision: 'approved',
        decisionBy: reviewData.reviewerId,
        decisionAt: new Date(),
        notes: reviewData.comments
      };
      application.userId = user._id;

      logger.info('申请已批准，用户账号已创建', {
        applicationId: application._id,
        userId: user._id
      });

      // 发送批准通知
      await this._notifyApplicantApproved(application, user);
    }

    // 添加状态历史
    application.statusHistory.push({
      status: application.approval.status,
      changedBy: reviewData.reviewerId,
      comments: reviewData.comments || '批准'
    });
  }

  /**
   * 拒绝申请 - 内部方法
   * @private
   */
  async _rejectApplication(application, reviewData) {
    application.approval.status = 'rejected';
    application.approval.finalDecision = {
      decision: 'rejected',
      decisionBy: reviewData.reviewerId,
      decisionAt: new Date(),
      notes: reviewData.comments
    };

    logger.info('申请已拒绝', {
      applicationId: application._id,
      reason: reviewData.comments
    });
  }

  /**
   * 要求补充信息 - 内部方法
   * @private
   */
  async _requestAdditionalInfo(application, reviewData) {
    application.approval.status = 'requires_info';

    logger.info('申请要求补充信息', {
      applicationId: application._id,
      requestedInfo: reviewData.comments
    });
  }

  /**
   * 创建用户账号 - 内部方法
   * @private
   */
  async _createUserAccount(application, reviewData) {
    try {
      let user;

      switch (application.applicationType) {
        case 'resident':
          // 创建村民账号（使用Resident模型）
          user = await Resident.create({
            name: application.applicant.name,
            phone: application.applicant.phone,
            idCard: application.applicant.idCard,
            villageId: application.residentInfo.villageId,
            household: {
              householdNumber: application.residentInfo.householdNumber || null
            },
            status: 'active',
            metadata: {
              registrationSource: 'registration_approval',
              applicationId: application._id
            }
          });

          // 同时创建User账号用于登录
          const userLogin = await User.create({
            username: application.applicant.phone,
            phone: application.applicant.phone,
            name: application.applicant.name,
            role: 'resident',
            villageId: application.residentInfo.villageId,
            status: 'active',
            residentProfile: user._id
          });

          return userLogin;

        case 'village_admin':
          // 先创建User账号
          user = await User.create({
            username: application.applicant.phone,
            phone: application.applicant.phone,
            name: application.applicant.name,
            role: 'village_admin',
            villageId: application.villageAdminInfo.villageId,
            status: 'active',
            committeeProfile: {
              position: application.villageAdminInfo.position,
              isOnDuty: true,
              committeeLevel: 'village'
            }
          });

          // 创建或更新CommitteeMember
          const committeeMember = await CommitteeMember.create({
            name: application.applicant.name,
            phone: application.applicant.phone,
            idCard: application.applicant.idCard,
            villageId: application.villageAdminInfo.villageId,
            'position.current': application.villageAdminInfo.position,
            'position.startDate': new Date(),
            'position.appointmentDoc': application.villageAdminInfo.appointmentLetterUrl,
            status: 'active',
            userId: user._id
          });

          // 更新User的committeeProfile关联
          user.committeeProfile.memberId = committeeMember._id;
          await user.save();

          break;

        case 'township_admin':
          // 创建乡镇管理员账号
          user = await User.create({
            username: application.applicant.phone,
            phone: application.applicant.phone,
            name: application.applicant.name,
            role: 'township_admin',
            status: 'active',
            committeeProfile: {
              committeeLevel: 'township'
            }
          });

          break;
      }

      return user;

    } catch (error) {
      logger.error('创建用户账号失败:', error);
      throw new Error(`创建用户账号失败: ${error.message}`);
    }
  }

  /**
   * 执行OCR识别 - 内部方法
   * @private
   */
  async _performOCRRecognition(files) {
    try {
      const results = await identityCardOCRService.recognizeIdCard({
        front: files.idCardFront,
        back: files.idCardBack
      });

      return {
        idCardVerified: results.verified,
        extractedInfo: {
          name: results.front?.name,
          idCard: results.front?.idCard,
          gender: results.front?.gender,
          ethnicity: results.front?.ethnicity,
          birthDate: results.front?.birthDate,
          address: results.front?.address,
          issuingAuthority: results.back?.issuingAuthority,
          validDate: results.back?.validDate
        },
        confidenceScore: results.confidence,
        verifiedAt: new Date()
      };

    } catch (error) {
      logger.error('OCR识别失败:', error);
      return {
        idCardVerified: false,
        extractedInfo: {},
        confidenceScore: 0,
        verifiedAt: new Date(),
        error: error.message
      };
    }
  }

  /**
   * 获取下一审批阶段 - 内部方法
   * @private
   */
  _getNextApprovalStage(application) {
    const flowMap = {
      resident: {
        pending: null, // 村民注册只需村级审批，无需下一步
        village_review: null
      },
      village_admin: {
        pending: 'village_review',
        village_review: 'township_review',
        township_review: null
      },
      township_admin: {
        pending: 'township_review',
        township_review: 'super_admin_review',
        super_admin_review: null
      }
    };

    const currentStage = application.approval.currentStage;
    const flow = flowMap[application.applicationType];

    return flow[currentStage];
  }

  /**
   * 计算预计审批时间 - 内部方法
   * @private
   */
  _calculateEstimatedReviewTime(applicationType) {
    const timeMap = {
      resident: 3,  // 3天
      village_admin: 7, // 7天
      township_admin: 14 // 14天
    };

    const days = timeMap[applicationType] || 7;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + days);

    return estimatedDate;
  }

  /**
   * 验证申请数据 - 内部方法
   * @private
   */
  _validateApplicationData(data) {
    const requiredFields = {
      resident: ['applicant.name', 'applicant.phone', 'applicant.idCard', 'residentInfo.villageId'],
      village_admin: ['applicant.name', 'applicant.phone', 'applicant.idCard', 'villageAdminInfo.villageId', 'villageAdminInfo.position'],
      township_admin: ['applicant.name', 'applicant.phone', 'applicant.idCard', 'townshipAdminInfo.townshipId']
    };

    const fields = requiredFields[data.applicationType];
    for (const field of fields) {
      const value = field.split('.').reduce((obj, key) => obj && obj[key], data);
      if (!value) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }

    // 验证外村村民详细信息
    if (data.applicationType === 'resident' && data.residentInfo?.isNonLocal) {
      if (data.residentInfo.nonLocalReason === 'other') {
        const details = data.residentInfo.otherReasonDetails;
        if (!details?.purpose || details?.hasFixedResidence === undefined) {
          throw new Error('外村村民选择"其他"时必须填写详细信息');
        }
      }
    }
  }

  /**
   * 检查重复申请 - 内部方法
   * @private
   */
  async _checkDuplicateApplication(data) {
    const existing = await RegistrationApplication.checkDuplicateApplication(
      data.applicant.phone,
      data.applicant.idCard
    );

    if (existing) {
      throw new Error('您已有待审核的申请，请勿重复提交');
    }
  }

  /**
   * 验证审批权限 - 内部方法
   * @private
   */
  async _validateReviewPermission(application, reviewerId) {
    // TODO: 实现权限验证逻辑
    // 检查审批人是否有权限审批此申请
    // 村民申请只能由本村管理员审批
    // 村管理员申请由乡镇管理员审批
    // 乡镇管理员申请由超级管理员审批
  }

  /**
   * 通知审批人 - 内部方法
   * @private
   */
  async _notifyReviewers(application) {
    // TODO: 实现通知功能
    logger.info('通知审批人', {
      applicationId: application._id,
      type: application.applicationType,
      stage: application.approval.currentStage
    });
  }

  /**
   * 通知申请人 - 内部方法
   * @private
   */
  async _notifyApplicant(application, reviewData) {
    // TODO: 实现通知功能（短信/邮件）
    logger.info('通知申请人审批结果', {
      applicationId: application._id,
      decision: reviewData.decision
    });
  }

  /**
   * 通知申请人批准 - 内部方法
   * @private
   */
  async _notifyApplicantApproved(application, user) {
    // TODO: 实现批准通知
    logger.info('通知申请人申请已批准', {
      applicationId: application._id,
      userId: user._id
    });
  }
}

module.exports = new RegistrationWorkflowService();
