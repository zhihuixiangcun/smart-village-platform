/**
 * 财务模块与区块链存证的集成服务
 * 自动为财务流水创建存证记录
 */

const ledgerProofService = require('./ledgerProofService');
const LedgerProof = require('../models/LedgerProof');
const Logger = require('../utils/logger');

class FinanceLedgerIntegration {
  constructor() {
    this.autoProofEnabled = process.env.AUTO_FINANCIAL_PROOF !== 'false'; // 默认启用
    this.proofBlockchainType = process.env.FINANCIAL_PROOF_BLOCKCHAIN || 'local';
  }

  /**
   * 财务记录创建后自动创建存证
   */
  async onFinancialCreated(financialRecord, userId) {
    try {
      if (!this.autoProofEnabled) {
        Logger.debug('自动存证已禁用，跳过财务存证');
        return null;
      }

      // 准备存证数据
      const proofData = {
        villageId: financialRecord.villageId,
        proofType: 'financial',
        relatedId: financialRecord._id,
        relatedModel: 'Finance',
        originalData: this.extractFinancialData(financialRecord),
        createdBy: userId,
        blockchainType: this.proofBlockchainType,
        metadata: {
          source: 'auto',
          trigger: 'financial_created'
        }
      };

      // 创建存证
      const proof = await ledgerProofService.createProof(proofData);

      Logger.info('财务流水存证创建成功', {
        financialId: financialRecord._id,
        proofId: proof._id,
        blockHeight: proof.blockHeight,
        amount: financialRecord.amount
      });

      return proof;
    } catch (error) {
      Logger.error('创建财务存证失败:', error);
      // 不抛出错误，避免影响主流程
      return null;
    }
  }

  /**
   * 财务记录更新后更新存证
   */
  async onFinancialUpdated(financialRecord, userId) {
    try {
      if (!this.autoProofEnabled) {
        return null;
      }

      // 检查是否已存在存证
      const existingProof = await LedgerProof.findOne({
        relatedId: financialRecord._id,
        relatedModel: 'Finance'
      });

      if (existingProof) {
        // 已存在存证，记录变更日志
        await existingProof.addAuditLog('updated', userId, {
          changeType: 'financial_modified',
          previousData: existingProof.originalData
        });

        // 如果记录状态变更到已完成，创建新的存证
        if (financialRecord.status === 'completed') {
          return await this.createCompletionProof(financialRecord, userId);
        }

        return existingProof;
      }

      // 不存在存证，创建新存证
      return await this.onFinancialCreated(financialRecord, userId);
    } catch (error) {
      Logger.error('更新财务存证失败:', error);
      return null;
    }
  }

  /**
   * 报销记录创建后自动创建存证
   */
  async onReimbursementCreated(reimbursementRecord, userId) {
    try {
      if (!this.autoProofEnabled) {
        return null;
      }

      const proofData = {
        villageId: reimbursementRecord.villageId,
        proofType: 'reimbursement',
        relatedId: reimbursementRecord._id,
        relatedModel: 'Reimbursement',
        originalData: this.extractReimbursementData(reimbursementRecord),
        createdBy: userId,
        blockchainType: this.proofBlockchainType,
        metadata: {
          source: 'auto',
          trigger: 'reimbursement_created'
        }
      };

      const proof = await ledgerProofService.createProof(proofData);

      Logger.info('报销记录存证创建成功', {
        reimbursementId: reimbursementRecord._id,
        proofId: proof._id,
        amount: reimbursementRecord.amount
      });

      return proof;
    } catch (error) {
      Logger.error('创建报销存证失败:', error);
      return null;
    }
  }

  /**
   * 报销审批通过后创建存证
   */
  async onReimbursementApproved(reimbursementRecord, userId) {
    try {
      if (!this.autoProofEnabled) {
        return null;
      }

      const proofData = {
        villageId: reimbursementRecord.villageId,
        proofType: 'reimbursement',
        relatedId: reimbursementRecord._id,
        relatedModel: 'Reimbursement',
        originalData: {
          ...this.extractReimbursementData(reimbursementRecord),
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: userId
        },
        createdBy: userId,
        blockchainType: this.proofBlockchainType,
        metadata: {
          source: 'auto',
          trigger: 'reimbursement_approved'
        }
      };

      const proof = await ledgerProofService.createProof(proofData);

      Logger.info('报销审批存证创建成功', {
        reimbursementId: reimbursementRecord._id,
        proofId: proof._id
      });

      return proof;
    } catch (error) {
      Logger.error('创建报销审批存证失败:', error);
      return null;
    }
  }

  /**
   * 预算审批后创建存证
   */
  async onBudgetApproved(budgetRecord, userId) {
    try {
      if (!this.autoProofEnabled) {
        return null;
      }

      const proofData = {
        villageId: budgetRecord.villageId,
        proofType: 'budget',
        relatedId: budgetRecord._id,
        relatedModel: 'Budget',
        originalData: {
          ...this.extractBudgetData(budgetRecord),
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: userId
        },
        createdBy: userId,
        blockchainType: this.proofBlockchainType,
        metadata: {
          source: 'auto',
          trigger: 'budget_approved'
        }
      };

      const proof = await ledgerProofService.createProof(proofData);

      Logger.info('预算审批存证创建成功', {
        budgetId: budgetRecord._id,
        proofId: proof._id
      });

      return proof;
    } catch (error) {
      Logger.error('创建预算审批存证失败:', error);
      return null;
    }
  }

  /**
   * 公告发布后创建存证
   */
  async onAnnouncementPublished(announcementRecord, userId) {
    try {
      if (!this.autoProofEnabled) {
        return null;
      }

      // 只有重要公告需要存证
      if (!announcementRecord.isImportant && !announcementRecord.requiresProof) {
        return null;
      }

      const proofData = {
        villageId: announcementRecord.villageId,
        proofType: 'announcement',
        relatedId: announcementRecord._id,
        relatedModel: 'Announcement',
        originalData: this.extractAnnouncementData(announcementRecord),
        createdBy: userId,
        blockchainType: this.proofBlockchainType,
        metadata: {
          source: 'auto',
          trigger: 'announcement_published'
        }
      };

      const proof = await ledgerProofService.createProof(proofData);

      Logger.info('公告存证创建成功', {
        announcementId: announcementRecord._id,
        proofId: proof._id
      });

      return proof;
    } catch (error) {
      Logger.error('创建公告存证失败:', error);
      return null;
    }
  }

  /**
   * 提取财务数据（用于存证）
   */
  extractFinancialData(record) {
    return {
      transactionId: record.transactionId || record._id.toString(),
      transactionType: record.transactionType,
      amount: record.amount,
      category: record.category,
      description: record.description,
      status: record.status,
      date: record.transactionDate || record.date,
      payer: record.payer,
      payee: record.payee,
      evidence: record.evidenceFiles || [],
      approvalStatus: record.approvalStatus,
      createdAt: record.createdAt
    };
  }

  /**
   * 提取报销数据
   */
  extractReimbursementData(record) {
    return {
      reimbursementId: record.reimbursementId || record._id.toString(),
      applicant: record.applicant,
      applicantName: record.applicantName,
      amount: record.amount,
      category: record.category,
      description: record.description,
      invoiceImages: record.invoiceImages || [],
      status: record.status,
      approvalStatus: record.approvalStatus,
      applyDate: record.applyDate,
      createdAt: record.createdAt
    };
  }

  /**
   * 提取预算数据
   */
  extractBudgetData(record) {
    return {
      budgetId: record.budgetId || record._id.toString(),
      fiscalYear: record.fiscalYear,
      totalAmount: record.totalAmount,
      items: record.items || [],
      status: record.status,
      approvalStatus: record.approvalStatus,
      createdAt: record.createdAt
    };
  }

  /**
   * 提取公告数据
   */
  extractAnnouncementData(record) {
    return {
      announcementId: record.announcementId || record._id.toString(),
      title: record.title,
      content: record.content,
      type: record.type,
      priority: record.priority,
      status: record.status,
      publishedAt: record.publishedAt,
      publisher: record.publisher,
      createdAt: record.createdAt
    };
  }

  /**
   * 创建完成存证
   */
  async createCompletionProof(record, userId) {
    const proofData = {
      villageId: record.villageId,
      proofType: 'financial',
      relatedId: record._id,
      relatedModel: 'Finance',
      originalData: {
        ...this.extractFinancialData(record),
        completionStatus: 'completed',
        completedAt: new Date()
      },
      createdBy: userId,
      blockchainType: this.proofBlockchainType,
      metadata: {
        source: 'auto',
        trigger: 'financial_completed'
      }
    };

    return await ledgerProofService.createProof(proofData);
  }

  /**
   * 批量为财务记录创建存证
   */
  async batchCreateProofs(records, userId) {
    try {
      const proofDataList = records.map(record => ({
        villageId: record.villageId,
        proofType: record.modelName === 'Reimbursement' ? 'reimbursement' : 'financial',
        relatedId: record._id,
        relatedModel: record.modelName || 'Finance',
        originalData: record.data || this.extractFinancialData(record),
        createdBy: userId,
        blockchainType: this.proofBlockchainType,
        metadata: {
          source: 'batch',
          trigger: 'batch_proof'
        }
      }));

      return await ledgerProofService.createBatchProofs(proofDataList);
    } catch (error) {
      Logger.error('批量创建财务存证失败:', error);
      throw error;
    }
  }

  /**
   * 验证财务记录的存证状态
   */
  async verifyFinancialProof(recordId) {
    try {
      const proof = await LedgerProof.findOne({
        relatedId: recordId,
        relatedModel: 'Finance'
      });

      if (!proof) {
        return {
          hasProof: false,
          message: '未找到存证记录'
        };
      }

      const verification = proof.verifyIntegrity();

      return {
        hasProof: true,
        proofId: proof._id,
        blockHeight: proof.blockHeight,
        dataHash: proof.dataHash,
        isOnChain: proof.isOnChain,
        blockchainInfo: proof.blockchain,
        integrity: verification,
        verifiedAt: new Date()
      };
    } catch (error) {
      Logger.error('验证财务存证失败:', error);
      throw error;
    }
  }

  /**
   * 获取村庄的财务存证统计
   */
  async getVillageFinancialStats(villageId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await LedgerProof.aggregate([
        {
          $match: {
            villageId: villageId,
            proofType: { $in: ['financial', 'reimbursement', 'budget'] },
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$proofType',
            count: { $sum: 1 },
            onChainCount: {
              $sum: { $cond: [{ $eq: ['$blockchain.status', 'confirmed'] }, 1, 0] }
            },
            totalAmount: {
              $sum: '$originalData.amount'
            },
            lastProof: { $max: '$createdAt' }
          }
        }
      ]);

      return stats;
    } catch (error) {
      Logger.error('获取财务存证统计失败:', error);
      throw error;
    }
  }

  /**
   * 启用/禁用自动存证
   */
  setAutoProofEnabled(enabled) {
    this.autoProofEnabled = enabled;
    Logger.info('自动财务存证状态已更新', { enabled });
  }

  /**
   * 设置默认区块链类型
   */
  setProofBlockchainType(blockchainType) {
    this.proofBlockchainType = blockchainType;
    Logger.info('存证区块链类型已更新', { blockchainType });
  }
}

module.exports = new FinanceLedgerIntegration();
