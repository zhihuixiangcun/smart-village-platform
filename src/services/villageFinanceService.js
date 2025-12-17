/**
 * 村民财务查询权限服务
 * 管理村民对村级财务的访问权限、查询记录、问题反馈等
 */

const { VillageFinanceAccess, FinancialTransaction, BudgetApproval } = require('../models/Finance');
const { User } = require('../models/User');
const { AuditLog } = require('../models/Permission');

class VillageFinanceService {
  constructor() {
    this.defaultPermissions = {
      basicAccess: {
        canViewSummary: true,
        canViewIncome: true,
        canViewExpense: true,
        canViewBudget: false
      },
      detailedAccess: {
        canViewTransactionDetails: false,
        canViewInvoiceDetails: false,
        canViewApprovalProcess: false,
        canDownloadReports: false
      },
      specialAccess: {
        canAskQuestions: true,
        canRequestClarification: true,
        canReportIssues: true,
        canParticipateInMeetings: false
      },
      dataScope: {
        timeRange: {
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date()
        },
        amountThreshold: {
          minAmount: 0,
          maxAmount: Infinity
        },
        categoryFilter: []
      }
    };
  }

  /**
   * 授予村民财务查询权限
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} customPermissions - 自定义权限
   * @param {Object} grantInfo - 授权信息
   * @returns {Promise<Object>} 授权结果
   */
  async grantFinanceAccess(userId, villageId, customPermissions = {}, grantInfo = {}) {
    try {
      // 验证用户信息
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查是否已有权限
      const existingAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId
      });

      if (existingAccess) {
        throw new Error('该用户已拥有财务查询权限');
      }

      // 合并默认权限和自定义权限
      const permissions = this.mergePermissions(this.defaultPermissions, customPermissions);

      // 创建权限记录
      const financeAccess = new VillageFinanceAccess({
        villager: {
          userId,
          userName: user.profile.displayName,
          villageId
        },
        accessPermissions: permissions,
        grantedBy: {
          userId: grantInfo.granterId,
          userName: grantInfo.granterName || '系统管理员',
          role: grantInfo.granterRole || 'village_admin',
          reason: grantInfo.reason || '村务财务公开需要'
        },
        validityPeriod: grantInfo.validityPeriod || {
          startDate: new Date(),
          isPermanent: true
        }
      });

      await financeAccess.save();

      // 记录审计日志
      await this.logPermissionOperation('GRANT_ACCESS', userId, villageId, grantInfo);

      return {
        success: true,
        accessId: financeAccess._id,
        permissions: financeAccess.accessPermissions,
        grantedAt: financeAccess.grantedBy.grantDate
      };

    } catch (error) {
      console.error('授予财务查询权限失败:', error);
      throw error;
    }
  }

  /**
   * 检查村民访问权限
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {String} accessType - 访问类型
   * @returns {Promise<Boolean>} 是否有权限
   */
  async checkAccessPermission(userId, villageId, accessType) {
    try {
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId,
        status: 'active'
      });

      if (!financeAccess) {
        return false;
      }

      return financeAccess.hasAccess(accessType);

    } catch (error) {
      console.error('检查访问权限失败:', error);
      return false;
    }
  }

  /**
   * 获取村民财务摘要信息
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 财务摘要
   */
  async getFinanceSummary(userId, villageId, filters = {}) {
    try {
      // 检查基础访问权限
      const hasAccess = await this.checkAccessPermission(userId, villageId, 'view_summary');
      if (!hasAccess) {
        throw new Error('无权限查看财务摘要');
      }

      // 获取用户访问权限配置
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId,
        status: 'active'
      });

      if (!financeAccess) {
        throw new Error('未找到有效的财务访问权限');
      }

      // 构建查询条件
      const queryConditions = this.buildQueryConditions(financeAccess, filters);

      // 获取收入统计
      const incomeStats = await FinancialTransaction.aggregate([
        {
          $match: {
            ...queryConditions,
            'transactionInfo.transactionType': 'income',
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              category: '$transactionInfo.category'
            },
            totalAmount: { $sum: '$transactionInfo.amount' },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: '$totalAmount' },
            categories: {
              $push: {
                category: '$_id.category',
                amount: '$totalAmount',
                count: '$count'
              }
            }
          }
        }
      ]);

      // 获取支出统计
      const expenseStats = await FinancialTransaction.aggregate([
        {
          $match: {
            ...queryConditions,
            'transactionInfo.transactionType': 'expense',
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              category: '$transactionInfo.category'
            },
            totalAmount: { $sum: '$transactionInfo.amount' },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: '$totalAmount' },
            categories: {
              $push: {
                category: '$_id.category',
                amount: '$totalAmount',
                count: '$count'
              }
            }
          }
        }
      ]);

      // 获取预算执行情况
      const budgetStats = await this.getBudgetExecution(villageId, financeAccess);

      const summary = {
        period: {
          startDate: financeAccess.accessPermissions.dataScope.timeRange.startDate,
          endDate: financeAccess.accessPermissions.dataScope.timeRange.endDate
        },
        income: incomeStats[0] || { totalIncome: 0, categories: [] },
        expense: expenseStats[0] || { totalExpense: 0, categories: [] },
        balance: (incomeStats[0]?.totalIncome || 0) - (expenseStats[0]?.totalExpense || 0),
        budget: budgetStats,
        lastUpdated: new Date()
      };

      // 记录访问历史
      await this.recordAccessHistory(userId, villageId, 'view_summary', {
        duration: 0,
        dataViewed: '财务摘要信息'
      });

      return summary;

    } catch (error) {
      console.error('获取财务摘要失败:', error);
      throw error;
    }
  }

  /**
   * 获取财务交易详情
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} pagination - 分页参数
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 交易详情
   */
  async getTransactionDetails(userId, villageId, pagination = {}, filters = {}) {
    try {
      // 检查详细访问权限
      const hasAccess = await this.checkAccessPermission(userId, villageId, 'view_details');
      if (!hasAccess) {
        throw new Error('无权限查看交易详情');
      }

      // 获取用户访问权限配置
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId,
        status: 'active'
      });

      if (!financeAccess) {
        throw new Error('未找到有效的财务访问权限');
      }

      // 构建查询条件
      const queryConditions = this.buildQueryConditions(financeAccess, filters);

      // 分页参数
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const skip = (page - 1) * limit;

      // 查询交易记录
      const transactions = await FinancialTransaction.find(queryConditions)
        .select(this.getTransactionFields(financeAccess))
        .sort({ 'transactionInfo.transactionDate': -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy.userId', 'profile.displayName')
        .populate('approval.finalApprover.userId', 'profile.displayName');

      const total = await FinancialTransaction.countDocuments(queryConditions);

      // 脱敏处理
      const maskedTransactions = transactions.map(tx =>
        this.maskTransactionData(tx, financeAccess)
      );

      // 记录访问历史
      await this.recordAccessHistory(userId, villageId, 'view_details', {
        duration: 0,
        dataViewed: `交易记录 ${skip + 1}-${skip + transactions.length}`
      });

      return {
        transactions: maskedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        filters: queryConditions
      };

    } catch (error) {
      console.error('获取交易详情失败:', error);
      throw error;
    }
  }

  /**
   * 提交财务问题
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} questionData - 问题数据
   * @returns {Promise<Object>} 提交结果
   */
  async submitFinanceQuestion(userId, villageId, questionData) {
    try {
      // 检查提问权限
      const hasAccess = await this.checkAccessPermission(userId, villageId, 'ask_question');
      if (!hasAccess) {
        throw new Error('无权限提交财务问题');
      }

      // 获取用户权限记录
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId,
        status: 'active'
      });

      if (!financeAccess) {
        throw new Error('未找到有效的财务访问权限');
      }

      // 生成问题ID
      const questionId = `Q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 添加问题到权限记录
      financeAccess.questions.push({
        questionId,
        questionText: questionData.questionText,
        category: questionData.category || 'general',
        askedDate: new Date(),
        status: 'pending'
      });

      await financeAccess.save();

      // 通知相关负责人
      await this.notifyNewQuestion(questionId, questionData, villageId);

      // 记录审计日志
      await this.logQuestionOperation('SUBMIT_QUESTION', userId, villageId, questionData);

      return {
        success: true,
        questionId,
        status: 'pending',
        submittedAt: new Date()
      };

    } catch (error) {
      console.error('提交财务问题失败:', error);
      throw error;
    }
  }

  /**
   * 获取村民问题列表
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 问题列表
   */
  async getVillageQuestions(userId, villageId, filters = {}) {
    try {
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId,
        status: 'active'
      });

      if (!financeAccess) {
        throw new Error('未找到有效的财务访问权限');
      }

      let questions = financeAccess.questions;

      // 应用过滤条件
      if (filters.status) {
        questions = questions.filter(q => q.status === filters.status);
      }

      if (filters.category) {
        questions = questions.filter(q => q.category === filters.category);
      }

      if (filters.isPublic !== undefined) {
        questions = questions.filter(q =>
          filters.isPublic ? q.response?.isPublic : !q.response?.isPublic
        );
      }

      // 按时间倒序排列
      questions.sort((a, b) => new Date(b.askedDate) - new Date(a.askedDate));

      // 记录访问历史
      await this.recordAccessHistory(userId, villageId, 'view_questions', {
        duration: 0,
        dataViewed: `村民问题列表 ${questions.length} 条`
      });

      return questions;

    } catch (error) {
      console.error('获取村民问题失败:', error);
      throw error;
    }
  }

  /**
   * 下载财务报告
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {String} reportType - 报告类型
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 下载结果
   */
  async downloadFinanceReport(userId, villageId, reportType, filters = {}) {
    try {
      // 检查下载权限
      const hasAccess = await this.checkAccessPermission(userId, villageId, 'download_report');
      if (!hasAccess) {
        throw new Error('无权限下载财务报告');
      }

      // 获取用户权限配置
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId,
        status: 'active'
      });

      if (!financeAccess) {
        throw new Error('未找到有效的财务访问权限');
      }

      // 生成报告
      let reportData;
      switch (reportType) {
      case 'summary':
        reportData = await this.generateSummaryReport(villageId, financeAccess, filters);
        break;
      case 'transaction':
        reportData = await this.generateTransactionReport(villageId, financeAccess, filters);
        break;
      case 'budget':
        reportData = await this.generateBudgetReport(villageId, financeAccess, filters);
        break;
      default:
        throw new Error(`不支持的报告类型: ${reportType}`);
      }

      // 生成报告文件
      const reportFile = await this.createReportFile(reportData, reportType, userId);

      // 记录下载历史
      await this.recordAccessHistory(userId, villageId, 'download_report', {
        duration: 0,
        dataViewed: `下载${reportType}报告`
      });

      return {
        success: true,
        reportUrl: reportFile.url,
        fileName: reportFile.fileName,
        fileSize: reportFile.fileSize,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('下载财务报告失败:', error);
      throw error;
    }
  }

  /**
   * 更新访问权限
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} permissionUpdates - 权限更新
   * @param {Object} operatorInfo - 操作者信息
   * @returns {Promise<Object>} 更新结果
   */
  async updateAccessPermissions(userId, villageId, permissionUpdates, operatorInfo) {
    try {
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId
      });

      if (!financeAccess) {
        throw new Error('未找到该用户的财务访问权限');
      }

      // 更新权限配置
      const oldPermissions = JSON.parse(JSON.stringify(financeAccess.accessPermissions));
      Object.assign(financeAccess.accessPermissions, permissionUpdates);

      await financeAccess.save();

      // 记录审计日志
      await this.logPermissionOperation('UPDATE_PERMISSION', userId, villageId, {
        operator: operatorInfo,
        oldPermissions,
        newPermissions: financeAccess.accessPermissions
      });

      return {
        success: true,
        permissions: financeAccess.accessPermissions,
        updatedAt: new Date()
      };

    } catch (error) {
      console.error('更新访问权限失败:', error);
      throw error;
    }
  }

  /**
   * 撤销财务访问权限
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} revokeInfo - 撤销信息
   * @returns {Promise<Object>} 撤销结果
   */
  async revokeFinanceAccess(userId, villageId, revokeInfo) {
    try {
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId,
        status: 'active'
      });

      if (!financeAccess) {
        throw new Error('未找到该用户的活跃财务访问权限');
      }

      // 更新状态为已撤销
      financeAccess.status = 'revoked';
      financeAccess.validityPeriod.endDate = new Date();

      await financeAccess.save();

      // 记录审计日志
      await this.logPermissionOperation('REVOKE_ACCESS', userId, villageId, revokeInfo);

      return {
        success: true,
        revokedAt: new Date(),
        reason: revokeInfo.reason || '权限调整需要'
      };

    } catch (error) {
      console.error('撤销财务访问权限失败:', error);
      throw error;
    }
  }

  /**
   * 获取财务访问统计
   * @param {String} villageId - 村庄ID
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计信息
   */
  async getFinanceAccessStats(villageId, filters = {}) {
    try {
      const matchStage = { 'villager.villageId': villageId };

      if (filters.status) {
        matchStage.status = filters.status;
      }

      if (filters.dateRange) {
        matchStage.createdAt = {
          $gte: new Date(filters.dateRange.start),
          $lte: new Date(filters.dateRange.end)
        };
      }

      const stats = await VillageFinanceAccess.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            suspendedUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
            },
            revokedUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] }
            },
            totalQuestions: { $sum: { $size: '$questions' } },
            pendingQuestions: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$questions',
                    cond: { $eq: ['$$this.status', 'pending'] }
                  }
                }
              }
            },
            answeredQuestions: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$questions',
                    cond: { $eq: ['$$this.status', 'answered'] }
                  }
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalUsers: 1,
            activeUsers: 1,
            suspendedUsers: 1,
            revokedUsers: 1,
            totalQuestions: 1,
            pendingQuestions: 1,
            answeredQuestions: 1,
            questionAnswerRate: {
              $cond: [
                { $eq: ['$totalQuestions', 0] },
                0,
                { $multiply: [{ $divide: ['$answeredQuestions', '$totalQuestions'] }, 100] }
              ]
            }
          }
        }
      ]);

      return stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        revokedUsers: 0,
        totalQuestions: 0,
        pendingQuestions: 0,
        answeredQuestions: 0,
        questionAnswerRate: 0
      };

    } catch (error) {
      console.error('获取财务访问统计失败:', error);
      throw error;
    }
  }

  /**
   * 合并权限配置
   * @param {Object} defaultPermissions - 默认权限
   * @param {Object} customPermissions - 自定义权限
   * @returns {Object} 合并后的权限
   */
  mergePermissions(defaultPermissions, customPermissions) {
    const merged = JSON.parse(JSON.stringify(defaultPermissions));

    function deepMerge(target, source) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }

    deepMerge(merged, customPermissions);
    return merged;
  }

  /**
   * 构建查询条件
   * @param {Object} financeAccess - 财务访问权限
   * @param {Object} filters - 过滤条件
   * @returns {Object} 查询条件
   */
  buildQueryConditions(financeAccess, filters = {}) {
    const conditions = {};

    // 时间范围
    const timeRange = financeAccess.accessPermissions.dataScope.timeRange;
    if (!filters.startDate) conditions['transactionInfo.transactionDate'] = {};
    conditions['transactionInfo.transactionDate'].$gte = filters.startDate || timeRange.startDate;
    conditions['transactionInfo.transactionDate'].$lte = filters.endDate || timeRange.endDate;

    // 金额阈值
    const amountThreshold = financeAccess.accessPermissions.dataScope.amountThreshold;
    if (!filters.minAmount) conditions['transactionInfo.amount'] = {};
    conditions['transactionInfo.amount'].$gte = filters.minAmount || amountThreshold.minAmount;
    conditions['transactionInfo.amount'].$lte = filters.maxAmount || amountThreshold.maxAmount;

    // 类别过滤
    const categoryFilter = [
      ...financeAccess.accessPermissions.dataScope.categoryFilter,
      ...(filters.categories || [])
    ];
    if (categoryFilter.length > 0) {
      conditions['transactionInfo.category'] = { $in: categoryFilter };
    }

    // 交易类型过滤
    if (filters.transactionType) {
      conditions['transactionInfo.transactionType'] = filters.transactionType;
    }

    // 状态过滤
    if (filters.status) {
      conditions.status = filters.status;
    }

    return conditions;
  }

  /**
   * 获取交易字段（根据权限）
   * @param {Object} financeAccess - 财务访问权限
   * @returns {String} 字段选择字符串
   */
  getTransactionFields(financeAccess) {
    const baseFields = [
      'transactionInfo.transactionNumber',
      'transactionInfo.transactionType',
      'transactionInfo.category',
      'transactionInfo.transactionDate',
      'transactionInfo.description',
      'status',
      'createdAt'
    ];

    // 根据权限添加字段
    if (financeAccess.accessPermissions.detailedAccess.canViewInvoiceDetails) {
      baseFields.push('invoices');
    }

    if (financeAccess.accessPermissions.detailedAccess.canViewApprovalProcess) {
      baseFields.push('approval');
    }

    // 金额字段根据村民访问级别决定是否显示
    const publicAccess = financeAccess.publicAccess;
    if (publicAccess.isPublic && !publicAccess.restrictions.includes('amount_masked')) {
      baseFields.push('transactionInfo.amount');
    }

    return baseFields.join(' ');
  }

  /**
   * 脱敏交易数据
   * @param {Object} transaction - 交易记录
   * @param {Object} financeAccess - 财务访问权限
   * @returns {Object} 脱敏后的交易记录
   */
  maskTransactionData(transaction, financeAccess) {
    const masked = JSON.parse(JSON.stringify(transaction));

    const publicAccess = financeAccess.publicAccess;

    // 脱敏金额
    if (publicAccess.restrictions.includes('amount_masked')) {
      if (masked.transactionInfo.amount) {
        masked.transactionInfo.amount = this.maskAmount(masked.transactionInfo.amount);
      }
    }

    // 隐藏相关方信息
    if (publicAccess.restrictions.includes('party_hidden')) {
      if (masked.parties) {
        delete masked.parties.payer;
        delete masked.parties.payee;
      }
    }

    // 限制详细信息
    if (publicAccess.restrictions.includes('details_limited')) {
      masked.transactionInfo.description = `${masked.transactionInfo.description?.substring(0, 50)  }...`;
    }

    return masked;
  }

  /**
   * 脱敏金额
   * @param {Number} amount - 金额
   * @returns {String} 脱敏后的金额
   */
  maskAmount(amount) {
    if (amount < 1000) {
      return '***';
    }
    return amount.toString().replace(/\d{3}$/, '***');
  }

  /**
   * 记录访问历史
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {String} accessType - 访问类型
   * @param {Object} reqInfo - 请求信息
   */
  async recordAccessHistory(userId, villageId, accessType, reqInfo) {
    try {
      const financeAccess = await VillageFinanceAccess.findOne({
        'villager.userId': userId,
        'villager.villageId': villageId
      });

      if (financeAccess) {
        await financeAccess.recordAccess(accessType, reqInfo);
      }

    } catch (error) {
      console.error('记录访问历史失败:', error);
    }
  }

  /**
   * 记录权限操作日志
   * @param {String} operation - 操作类型
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} operationInfo - 操作信息
   */
  async logPermissionOperation(operation, userId, villageId, operationInfo) {
    try {
      await AuditLog.logOperation({
        operation: {
          type: operation,
          resource: 'village_finance_access',
          action: operation.toLowerCase(),
          description: `村民财务访问权限${operation}`
        },
        actor: {
          userId: operationInfo.operator?.userId || 'system',
          userName: operationInfo.operator?.userName || 'System',
          userRole: operationInfo.operator?.role || 'system'
        },
        target: {
          userId,
          userName: operationInfo.targetUserName || '村民',
          targetResource: 'finance_access'
        },
        result: {
          status: 'SUCCESS'
        },
        privacy: {
          sensitiveLevel: 'internal',
          accessReason: '权限管理操作',
          legalBasis: 'contract'
        },
        system: {
          platform: 'api',
          ipAddress: operationInfo.ipAddress || '127.0.0.1'
        }
      });

    } catch (error) {
      console.error('记录权限操作日志失败:', error);
    }
  }

  /**
   * 记录问题操作日志
   * @param {String} operation - 操作类型
   * @param {String} userId - 用户ID
   * @param {String} villageId - 村庄ID
   * @param {Object} questionInfo - 问题信息
   */
  async logQuestionOperation(operation, userId, villageId, questionInfo) {
    try {
      await AuditLog.logOperation({
        operation: {
          type: operation,
          resource: 'village_finance_question',
          action: operation.toLowerCase(),
          description: `村民财务问题${operation}`
        },
        actor: {
          userId,
          userName: questionInfo.userName || '村民',
          userRole: 'villager'
        },
        result: {
          status: 'SUCCESS'
        },
        dataChange: {
          newValue: questionInfo
        },
        privacy: {
          sensitiveLevel: 'internal',
          accessReason: '村民提问',
          legalBasis: 'consent'
        }
      });

    } catch (error) {
      console.error('记录问题操作日志失败:', error);
    }
  }

  /**
   * 通知新问题
   * @param {String} questionId - 问题ID
   * @param {Object} questionData - 问题数据
   * @param {String} villageId - 村庄ID
   */
  async notifyNewQuestion(questionId, questionData, villageId) {
    try {
      // 这里需要实现通知逻辑，如发送邮件、短信或系统通知
      console.log('新财务问题通知:', {
        questionId,
        villageId,
        category: questionData.category,
        questionText: `${questionData.questionText.substring(0, 50)  }...`
      });

    } catch (error) {
      console.error('通知新问题失败:', error);
    }
  }

  /**
   * 获取预算执行情况
   * @param {String} villageId - 村庄ID
   * @param {Object} financeAccess - 财务访问权限
   * @returns {Promise<Object>} 预算执行情况
   */
  async getBudgetExecution(villageId, financeAccess) {
    try {
      if (!financeAccess.accessPermissions.basicAccess.canViewBudget) {
        return {
          totalBudget: 0,
          executedAmount: 0,
          executionRate: 0,
          budgets: []
        };
      }

      const budgets = await BudgetApproval.find({
        'budgetInfo.budgetYear': new Date().getFullYear(),
        'execution.status': { $in: ['in_progress', 'completed'] }
      }).select('budgetInfo execution');

      const totalBudget = budgets.reduce((sum, budget) => sum + budget.budgetInfo.totalAmount, 0);
      const executedAmount = budgets.reduce((sum, budget) => sum + (budget.execution.spentAmount || 0), 0);

      return {
        totalBudget,
        executedAmount,
        executionRate: totalBudget > 0 ? Math.round((executedAmount / totalBudget) * 100) : 0,
        budgets: budgets.map(budget => ({
          name: budget.budgetInfo.budgetName,
          budgetAmount: budget.budgetInfo.totalAmount,
          spentAmount: budget.execution.spentAmount || 0,
          executionRate: budget.budgetInfo.totalAmount > 0 ?
            Math.round(((budget.execution.spentAmount || 0) / budget.budgetInfo.totalAmount) * 100) : 0
        }))
      };

    } catch (error) {
      console.error('获取预算执行情况失败:', error);
      return {
        totalBudget: 0,
        executedAmount: 0,
        executionRate: 0,
        budgets: []
      };
    }
  }

  /**
   * 生成摘要报告
   * @param {String} villageId - 村庄ID
   * @param {Object} financeAccess - 财务访问权限
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 报告数据
   */
  async generateSummaryReport(villageId, financeAccess, filters) {
    try {
      const summary = await this.getFinanceSummary(
        financeAccess.villager.userId,
        villageId,
        filters
      );

      return {
        title: '村级财务摘要报告',
        data: summary,
        generatedAt: new Date(),
        generatedBy: financeAccess.villager.userName
      };

    } catch (error) {
      console.error('生成摘要报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成交易报告
   * @param {String} villageId - 村庄ID
   * @param {Object} financeAccess - 财务访问权限
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 报告数据
   */
  async generateTransactionReport(villageId, financeAccess, filters) {
    try {
      const transactions = await this.getTransactionDetails(
        financeAccess.villager.userId,
        villageId,
        { page: 1, limit: 1000 },
        filters
      );

      return {
        title: '村级财务交易明细报告',
        data: transactions,
        generatedAt: new Date(),
        generatedBy: financeAccess.villager.userName
      };

    } catch (error) {
      console.error('生成交易报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成预算报告
   * @param {String} villageId - 村庄ID
   * @param {Object} financeAccess - 财务访问权限
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 报告数据
   */
  async generateBudgetReport(villageId, financeAccess, filters) {
    try {
      const budgetStats = await this.getBudgetExecution(villageId, financeAccess);

      return {
        title: '村级预算执行报告',
        data: budgetStats,
        generatedAt: new Date(),
        generatedBy: financeAccess.villager.userName
      };

    } catch (error) {
      console.error('生成预算报告失败:', error);
      throw error;
    }
  }

  /**
   * 创建报告文件
   * @param {Object} reportData - 报告数据
   * @param {String} reportType - 报告类型
   * @param {String} userId - 用户ID
   * @returns {Promise<Object>} 报告文件信息
   */
  async createReportFile(reportData, reportType, userId) {
    try {
      // 这里需要实现实际的文件生成逻辑，如生成PDF或Excel
      const fileName = `${reportData.title}_${userId}_${Date.now()}.pdf`;
      const filePath = `/uploads/reports/${fileName}`;

      // 模拟文件创建
      const fileSize = Math.floor(Math.random() * 100000) + 10000; // 10KB-110KB

      return {
        url: filePath,
        fileName,
        fileSize
      };

    } catch (error) {
      console.error('创建报告文件失败:', error);
      throw error;
    }
  }
}

module.exports = new VillageFinanceService();