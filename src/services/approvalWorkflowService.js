/**
 * 财务审批工作流服务
 * 实现多级审批逻辑、状态流转、权限控制等核心功能
 */

const {
  FinancialTransaction,
  BudgetApproval,
  TransactionStatus,
  TransactionTypes
} = require('../models/Finance');

const User = require('../models/User');
const ApprovalNotificationService = require('./approvalNotificationService');
const logger = require('../config/logger');

class ApprovalWorkflowService {
  constructor() {
    // 实例化通知服务
    this.notificationService = new ApprovalNotificationService();
    // 审批工作流配置
    this.workflowConfig = {
      // 支出审批流程
      expense: {
        stages: [
          {
            id: 'village_committee',
            name: '村委审批',
            requiredRoles: ['village_admin', 'department_head'],
            minApprovers: 1,
            maxApprovers: 3,
            timeoutDays: 3,
            canReject: true,
            canReturn: true
          },
          {
            id: 'financial_audit',
            name: '财务审核',
            requiredRoles: ['finance_officer', 'accountant'],
            minApprovers: 1,
            maxApprovers: 2,
            timeoutDays: 2,
            canReject: true,
            canReturn: false
          },
          {
            id: 'final_approval',
            name: '最终批准',
            requiredRoles: ['village_party_secretary', 'village_head'],
            minApprovers: 1,
            maxApprovers: 1,
            timeoutDays: 1,
            canReject: true,
            canReturn: false,
            finalStage: true
          }
        ],
        conditionalRules: [
          {
            condition: 'amount > 50000',
            action: 'add_stage',
            params: {
              stageId: 'township_approval',
              name: '乡镇审批',
              requiredRoles: ['township_officer'],
              insertAfter: 'financial_audit'
            }
          },
          {
            condition: 'category === "infrastructure" && amount > 100000',
            action: 'add_stage',
            params: {
              stageId: 'county_approval',
              name: '县级审批',
              requiredRoles: ['county_officer'],
              insertAfter: 'township_approval'
            }
          }
        ]
      },

      // 收入审批流程（简化）
      income: {
        stages: [
          {
            id: 'financial_review',
            name: '财务复核',
            requiredRoles: ['finance_officer'],
            minApprovers: 1,
            maxApprovers: 1,
            timeoutDays: 2,
            canReject: true,
            canReturn: false,
            finalStage: true
          }
        ]
      },

      // 预算审批流程
      budget: {
        stages: [
          {
            id: 'village_committee',
            name: '村委审议',
            requiredRoles: ['village_admin', 'department_head'],
            minApprovers: 2,
            maxApprovers: 5,
            timeoutDays: 7,
            canReject: true,
            canReturn: true,
            parallelApproval: true
          },
          {
            id: 'public_comment',
            name: '村民公示',
            requiredRoles: ['villager'],
            minApprovers: 0,
            maxApprovers: 0,
            timeoutDays: 7,
            canReject: false,
            canReturn: false,
            isPublic: true
          },
          {
            id: 'township_review',
            name: '乡镇审核',
            requiredRoles: ['township_officer'],
            minApprovers: 1,
            maxApprovers: 2,
            timeoutDays: 5,
            canReject: true,
            canReturn: false,
            finalStage: true
          }
        ]
      }
    };
  }

  /**
   * 启动审批工作流
   * @param {string} transactionId - 交易ID
   * @param {string} workflowType - 工作流类型
   * @param {Object} submitter - 提交者信息
   * @returns {Promise<Object>} 工作流信息
   */
  async startWorkflow(transactionId, workflowType, submitter) {
    try {
      const transaction = await FinancialTransaction.findById(transactionId)
        .populate('createdBy.userId');

      if (!transaction) {
        throw new Error('交易不存在');
      }

      if (transaction.status !== TransactionStatus.DRAFT) {
        throw new Error('只能对草稿状态的交易启动审批流程');
      }

      // 获取工作流配置
      const workflowConfig = this.getWorkflowConfig(workflowType, transaction);

      // 初始化审批历史
      const approvalHistory = [{
        stage: 'draft',
        approver: {
          userId: submitter.userId,
          userName: submitter.userName,
          role: submitter.role
        },
        decision: 'submitted',
        comments: '提交审批',
        approvalDate: new Date(),
        nextStage: workflowConfig.stages[0].id
      }];

      // 更新交易状态和审批信息
      transaction.status = TransactionStatus.PENDING;
      transaction.approval.submittedBy = {
        userId: submitter.userId,
        userName: submitter.userName,
        submitDate: new Date()
      };
      transaction.approval.reviewedBy = approvalHistory;

      // 添加当前审批阶段信息
      transaction.approval.currentStage = workflowConfig.stages[0].id;
      transaction.approval.workflowConfig = workflowConfig;

      await transaction.save();

      // 发送第一阶段的审批通知
      await this.sendStageNotifications(transaction, workflowConfig.stages[0]);

      logger.info(`审批工作流已启动: ${transaction.transactionInfo.transactionNumber}, 当前阶段: ${workflowConfig.stages[0].name}`);

      return {
        success: true,
        transactionId: transaction._id,
        transactionNumber: transaction.transactionInfo.transactionNumber,
        currentStage: transaction.approval.currentStage,
        workflowStages: workflowConfig.stages,
        estimatedCompletionTime: this.calculateEstimatedCompletionTime(workflowConfig)
      };

    } catch (error) {
      logger.error('启动审批工作流失败:', error);
      throw error;
    }
  }

  /**
   * 处理审批决策
   * @param {string} transactionId - 交易ID
   * @param {string} approverId - 审批者ID
   * @param {string} decision - 决策 (approved/rejected/returned)
   * @param {string} comments - 审批意见
   * @returns {Promise<Object>} 审批结果
   */
  async processApprovalDecision(transactionId, approverId, decision, comments) {
    try {
      const transaction = await FinancialTransaction.findById(transactionId)
        .populate('createdBy.userId')
        .populate('approval.reviewedBy.approver.userId');

      if (!transaction) {
        throw new Error('交易不存在');
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new Error('交易当前不在审批状态');
      }

      const currentStageId = transaction.approval.currentStage;
      const workflowConfig = transaction.approval.workflowConfig;
      const currentStageConfig = workflowConfig.stages.find(s => s.id === currentStageId);

      if (!currentStageConfig) {
        throw new Error('当前审批阶段配置不存在');
      }

      // 验证审批者权限
      const approver = await this.validateApproverPermission(approverId, currentStageConfig);

      // 检查是否已经审批过
      const existingApproval = transaction.approval.reviewedBy.find(
        r => r.stage === currentStageId && r.approver.userId.toString() === approverId
      );

      if (existingApproval) {
        throw new Error('您已经对此交易进行过审批');
      }

      // 添加审批记录
      transaction.approval.reviewedBy.push({
        stage: currentStageId,
        approver: {
          userId: approver._id,
          userName: approver.profile.displayName,
          role: approver.role
        },
        decision,
        comments,
        approvalDate: new Date()
      });

      // 处理审批决策
      const result = await this.processStageDecision(
        transaction,
        currentStageConfig,
        decision,
        comments
      );

      await transaction.save();

      logger.info(`审批决策处理完成: ${transaction.transactionInfo.transactionNumber}, 阶段: ${currentStageId}, 决策: ${decision}`);

      return result;

    } catch (error) {
      logger.error('处理审批决策失败:', error);
      throw error;
    }
  }

  /**
   * 处理阶段决策
   * @param {Object} transaction - 交易对象
   * @param {Object} stageConfig - 阶段配置
   * @param {string} decision - 决策
   * @param {string} comments - 意见
   * @returns {Promise<Object>} 处理结果
   */
  async processStageDecision(transaction, stageConfig, decision, comments) {
    const currentStageId = stageConfig.id;
    const workflowConfig = transaction.approval.workflowConfig;

    // 获取当前阶段的审批记录
    const stageReviews = transaction.approval.reviewedBy.filter(
      r => r.stage === currentStageId
    );

    // 判断是否达到审批要求
    const approvalThreshold = this.checkApprovalThreshold(stageReviews, stageConfig);

    if (decision === 'rejected') {
      // 拒绝：直接结束流程
      transaction.status = TransactionStatus.REJECTED;
      await this.sendRejectionNotifications(transaction, decision, comments);

      return {
        success: true,
        decision: 'rejected',
        message: '交易已被拒绝',
        transactionId: transaction._id,
        finalStatus: TransactionStatus.REJECTED
      };
    }

    if (decision === 'returned') {
      // 退回：回到草稿状态
      transaction.status = TransactionStatus.DRAFT;
      await this.sendReturnNotifications(transaction, comments);

      return {
        success: true,
        decision: 'returned',
        message: '交易已退回修改',
        transactionId: transaction._id,
        finalStatus: TransactionStatus.DRAFT
      };
    }

    if (decision === 'approved') {
      if (approvalThreshold.meetsRequirement) {
        // 达到审批要求，进入下一阶段
        const nextStageIndex = workflowConfig.stages.findIndex(s => s.id === currentStageId) + 1;

        if (nextStageIndex >= workflowConfig.stages.length) {
          // 最后一个阶段，审批完成
          transaction.status = TransactionStatus.APPROVED;
          transaction.approval.finalApprover = {
            userId: stageReviews[stageReviews.length - 1].approver.userId,
            userName: stageReviews[stageReviews.length - 1].approver.userName,
            approvalDate: new Date()
          };

          await this.sendApprovalNotifications(transaction);

          return {
            success: true,
            decision: 'approved',
            message: '交易审批已完成',
            transactionId: transaction._id,
            finalStatus: TransactionStatus.APPROVED
          };
        } else {
          // 进入下一阶段
          const nextStage = workflowConfig.stages[nextStageIndex];
          transaction.approval.currentStage = nextStage.id;

          // 为下一阶段添加审批记录
          transaction.approval.reviewedBy.push({
            stage: currentStageId,
            approver: stageReviews[0].approver,
            decision: 'forwarded',
            comments: `阶段完成，转至${nextStage.name}`,
            approvalDate: new Date(),
            nextStage: nextStage.id
          });

          await this.sendStageNotifications(transaction, nextStage);

          return {
            success: true,
            decision: 'forwarded',
            message: `已转至${nextStage.name}`,
            transactionId: transaction._id,
            nextStage,
            remainingApprovers: this.getRemainingApprovers(nextStage, transaction)
          };
        }
      } else {
        // 未达到审批要求，等待更多审批
        return {
          success: true,
          decision: 'pending',
          message: '等待更多审批者',
          transactionId: transaction._id,
          currentStage: currentStageId,
          approvalProgress: {
            approved: approvalThreshold.approvedCount,
            required: stageConfig.minApprovers,
            remaining: Math.max(0, stageConfig.minApprovers - approvalThreshold.approvedCount)
          }
        };
      }
    }

    throw new Error('未知的审批决策');
  }

  /**
   * 检查审批阈值
   * @param {Array} reviews - 审批记录
   * @param {Object} stageConfig - 阶段配置
   * @returns {Object} 审批阈值信息
   */
  checkApprovalThreshold(reviews, stageConfig) {
    const approvedReviews = reviews.filter(r => r.decision === 'approved');
    const rejectedReviews = reviews.filter(r => r.decision === 'rejected');

    const approvedCount = approvedReviews.length;
    const rejectedCount = rejectedReviews.length;
    const totalCount = reviews.length;

    // 如果有拒绝，检查是否超过允许数量
    const maxRejections = stageConfig.maxRejections || 0;
    if (rejectedCount > maxRejections) {
      return {
        meetsRequirement: false,
        rejected: true,
        approvedCount,
        rejectedCount,
        totalCount
      };
    }

    // 检查是否满足最小审批人数
    const meetsRequirement = approvedCount >= stageConfig.minApprovers;

    // 检查是否超过最大审批人数
    const exceedsMaximum = totalCount > stageConfig.maxApprovers;

    return {
      meetsRequirement,
      rejected: false,
      approvedCount,
      rejectedCount,
      totalCount,
      exceedsMaximum
    };
  }

  /**
   * 获取工作流配置
   * @param {string} workflowType - 工作流类型
   * @param {Object} transaction - 交易对象
   * @returns {Object} 工作流配置
   */
  getWorkflowConfig(workflowType, transaction) {
    const baseConfig = this.workflowConfig[workflowType];
    if (!baseConfig) {
      throw new Error(`不支持的工作流类型: ${workflowType}`);
    }

    // 深拷贝配置
    const config = JSON.parse(JSON.stringify(baseConfig));

    // 应用条件规则
    if (config.conditionalRules) {
      for (const rule of config.conditionalRules) {
        if (this.evaluateCondition(rule.condition, transaction)) {
          this.applyRule(rule, config);
        }
      }
    }

    return config;
  }

  /**
   * 评估条件
   * @param {string} condition - 条件表达式
   * @param {Object} transaction - 交易对象
   * @returns {boolean} 评估结果
   */
  evaluateCondition(condition, transaction) {
    try {
      // 简单的条件评估器
      // 在实际应用中，可能需要更复杂的表达式解析器

      const context = {
        amount: transaction.transactionInfo.amount,
        category: transaction.transactionInfo.category,
        type: transaction.transactionInfo.transactionType,
        description: transaction.transactionInfo.description
      };

      // 替换条件中的变量
      let evaluatedCondition = condition;
      Object.keys(context).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluatedCondition = evaluatedCondition.replace(regex, context[key]);
      });

      // 使用Function构造器安全地评估条件
      return new Function(`return ${  evaluatedCondition}`)();
    } catch (error) {
      logger.error('条件评估失败:', error);
      return false;
    }
  }

  /**
   * 应用规则
   * @param {Object} rule - 规则对象
   * @param {Object} config - 配置对象
   */
  applyRule(rule, config) {
    switch (rule.action) {
    case 'add_stage':
      const stage = {
        id: rule.params.stageId,
        name: rule.params.name,
        requiredRoles: rule.params.requiredRoles,
        minApprovers: 1,
        maxApprovers: 1,
        timeoutDays: 3,
        canReject: true,
        canReturn: false
      };

      const insertAfter = rule.params.insertAfter;
      const insertIndex = config.stages.findIndex(s => s.id === insertAfter);

      if (insertIndex !== -1) {
        config.stages.splice(insertIndex + 1, 0, stage);
      } else {
        config.stages.push(stage);
      }
      break;

      // 可以添加更多规则类型
    default:
      logger.warn(`未知的规则动作: ${rule.action}`);
    }
  }

  /**
   * 验证审批者权限
   * @param {string} approverId - 审批者ID
   * @param {Object} stageConfig - 阶段配置
   * @returns {Promise<Object>} 审批者信息
   */
  async validateApproverPermission(approverId, stageConfig) {
    const approver = await User.findById(approverId);

    if (!approver) {
      throw new Error('审批者不存在');
    }

    // 检查角色权限
    const hasPermission = stageConfig.requiredRoles.includes(approver.role);
    if (!hasPermission) {
      throw new Error(`审批者角色 ${approver.role} 无权限进行当前阶段审批`);
    }

    // 检查账号状态
    if (approver.status !== 'active') {
      throw new Error('审批者账号状态异常');
    }

    return approver;
  }

  /**
   * 发送阶段通知
   * @param {Object} transaction - 交易对象
   * @param {Object} stage - 阶段配置
   */
  async sendStageNotifications(transaction, stage) {
    try {
      const recipients = await this.getStageRecipients(stage, transaction);

      const notificationData = {
        type: 'approval_request',
        title: '财务审批通知',
        content: `您有新的财务审批任务：${transaction.transactionInfo.description}`,
        data: {
          transactionId: transaction._id,
          transactionNumber: transaction.transactionInfo.transactionNumber,
          amount: transaction.transactionInfo.amount,
          stage: stage.name,
          submitter: transaction.createdBy.userName,
          submitDate: transaction.approval.submittedBy.submitDate,
          workflowStage: stage.id
        }
      };

      const recipientIds = recipients.map(r => r.userId);

      // 使用新的通知服务
      await this.notificationService.sendNotification(recipientIds, notificationData);

      logger.info(`已发送审批通知: ${transaction.transactionInfo.transactionNumber}, 阶段: ${stage.name}, 接收者: ${recipients.length}人`);
    } catch (error) {
      logger.error('发送阶段通知失败:', error);
    }
  }

  /**
   * 获取阶段接收者
   * @param {Object} stage - 阶段配置
   * @param {Object} transaction - 交易对象
   * @returns {Promise<Array>} 接收者列表
   */
  async getStageRecipients(stage, transaction) {
    if (stage.isPublic) {
      // 公开阶段（如村民公示）
      return await User.find({
        'village.villageId': transaction.createdBy.userId.village?.villageId,
        role: 'villager',
        status: 'active'
      });
    }

    // 普通阶段，根据角色查找
    return await User.find({
      role: { $in: stage.requiredRoles },
      status: 'active',
      $and: [
        { 'village.villageId': transaction.createdBy.userId.village?.villageId }
      ]
    });
  }

  /**
   * 发送拒绝通知
   * @param {Object} transaction - 交易对象
   * @param {string} decision - 决策
   * @param {string} comments - 意见
   */
  async sendRejectionNotifications(transaction, decision, comments) {
    try {
      await this.notificationService.sendNotification(transaction.createdBy.userId, {
        type: 'approval_result',
        title: '审批结果通知',
        content: `您的财务申请已被拒绝：${comments}`,
        data: {
          transactionId: transaction._id,
          transactionNumber: transaction.transactionInfo.transactionNumber,
          decision: 'rejected',
          rejectionReason: comments
        }
      });
    } catch (error) {
      logger.error('发送拒绝通知失败:', error);
    }
  }

  /**
   * 发送退回通知
   * @param {Object} transaction - 交易对象
   * @param {string} comments - 意见
   */
  async sendReturnNotifications(transaction, comments) {
    try {
      await this.notificationService.sendNotification(transaction.createdBy.userId, {
        type: 'approval_result',
        title: '审批退回通知',
        content: `您的财务申请已退回修改：${comments}`,
        data: {
          transactionId: transaction._id,
          transactionNumber: transaction.transactionInfo.transactionNumber,
          decision: 'returned',
          returnReason: comments
        }
      });
    } catch (error) {
      logger.error('发送退回通知失败:', error);
    }
  }

  /**
   * 发送批准通知
   * @param {Object} transaction - 交易对象
   */
  async sendApprovalNotifications(transaction) {
    try {
      // 通知提交者
      await this.notificationService.sendNotification(transaction.createdBy.userId, {
        type: 'approval_result',
        title: '审批完成通知',
        content: `您的财务申请已批准：${transaction.transactionInfo.description}`,
        data: {
          transactionId: transaction._id,
          transactionNumber: transaction.transactionInfo.transactionNumber,
          decision: 'approved',
          amount: transaction.transactionInfo.amount
        }
      });

      // 通知财务部门进行后续处理
      const financeUsers = await User.find({
        role: { $in: ['finance_officer', 'accountant'] },
        status: 'active'
      });

      if (financeUsers.length > 0) {
        const financeUserIds = financeUsers.map(u => u._id);
        await this.notificationService.sendNotification(financeUserIds, {
          type: 'finance_processing',
          title: '财务处理通知',
          content: `有新的已批准交易需要处理：${transaction.transactionInfo.transactionNumber}`,
          data: {
            transactionId: transaction._id,
            transactionNumber: transaction.transactionInfo.transactionNumber
          }
        });
      }
    } catch (error) {
      logger.error('发送批准通知失败:', error);
    }
  }

  /**
   * 计算预计完成时间
   * @param {Object} workflowConfig - 工作流配置
   * @returns {Date} 预计完成时间
   */
  calculateEstimatedCompletionTime(workflowConfig) {
    const totalDays = workflowConfig.stages.reduce((sum, stage) => {
      return sum + (stage.timeoutDays || 3);
    }, 0);

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + totalDays);

    return estimatedDate;
  }

  /**
   * 获取剩余审批者
   * @param {Object} stage - 阶段配置
   * @param {Object} transaction - 交易对象
   * @returns {Array} 剩余审批者列表
   */
  getRemainingApprovers(stage, transaction) {
    // 获取已经审批过的用户ID
    const approvedUserIds = transaction.approval.reviewedBy
      .filter(r => r.stage === stage.id)
      .map(r => r.approver.userId.toString());

    // 返回还未审批的用户
    return stage.requiredRoles.filter(role => {
      // 这里需要根据实际业务逻辑来筛选
      return true; // 简化实现
    });
  }

  /**
   * 获取待办审批任务
   * @param {string} userId - 用户ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 待办任务列表
   */
  async getPendingTasks(userId, filters = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 构建查询条件
      const query = {
        status: TransactionStatus.PENDING,
        'approval.workflowConfig.stages': {
          $elemMatch: {
            requiredRoles: user.role
          }
        }
      };

      // 应用过滤条件
      if (filters.transactionType) {
        query['transactionInfo.transactionType'] = filters.transactionType;
      }

      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        query['createdAt'] = {
          $gte: new Date(start),
          $lte: new Date(end)
        };
      }

      const transactions = await FinancialTransaction.find(query)
        .sort({ createdAt: -1 })
        .populate('createdBy.userId', 'profile.displayName')
        .populate('approval.reviewedBy.approver.userId', 'profile.displayName');

      // 过滤出用户真正需要审批的交易
      const pendingTasks = transactions.filter(transaction => {
        const currentStageId = transaction.approval.currentStage;
        const stageConfig = transaction.approval.workflowConfig.stages.find(s => s.id === currentStageId);

        // 检查用户是否已审批过此阶段
        const hasApproved = transaction.approval.reviewedBy.some(
          r => r.stage === currentStageId && r.approver.userId.toString() === userId
        );

        return stageConfig &&
               stageConfig.requiredRoles.includes(user.role) &&
               !hasApproved;
      });

      // 格式化任务信息
      return pendingTasks.map(transaction => ({
        transactionId: transaction._id,
        transactionNumber: transaction.transactionInfo.transactionNumber,
        transactionType: transaction.transactionInfo.transactionType,
        amount: transaction.transactionInfo.amount,
        description: transaction.transactionInfo.description,
        submitter: transaction.createdBy.userName,
        submitDate: transaction.approval.submittedBy.submitDate,
        currentStage: transaction.approval.currentStage,
        stageName: transaction.approval.workflowConfig.stages.find(s => s.id === transaction.approval.currentStage)?.name,
        priority: this.calculateTaskPriority(transaction),
        deadline: this.calculateTaskDeadline(transaction)
      }));

    } catch (error) {
      logger.error('获取待办任务失败:', error);
      throw error;
    }
  }

  /**
   * 计算任务优先级
   * @param {Object} transaction - 交易对象
   * @returns {string} 优先级
   */
  calculateTaskPriority(transaction) {
    const amount = transaction.transactionInfo.amount;
    const waitingDays = Math.floor((Date.now() - transaction.approval.submittedBy.submitDate) / (1000 * 60 * 60 * 24));

    if (amount > 100000) return 'high';
    if (amount > 50000 || waitingDays > 3) return 'medium';
    return 'low';
  }

  /**
   * 计算任务截止时间
   * @param {Object} transaction - 交易对象
   * @returns {Date} 截止时间
   */
  calculateTaskDeadline(transaction) {
    const currentStageId = transaction.approval.currentStage;
    const stageConfig = transaction.approval.workflowConfig.stages.find(s => s.id === currentStageId);

    if (!stageConfig) return null;

    const submitDate = transaction.approval.submittedBy.submitDate;
    const deadline = new Date(submitDate);
    deadline.setDate(deadline.getDate() + (stageConfig.timeoutDays || 3));

    return deadline;
  }
}

module.exports = ApprovalWorkflowService;