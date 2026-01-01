/**
 * 财务管理服务
 * 处理村务财务相关的业务逻辑
 */

const FinanceRecord = require('../models/Finance');
const Budget = require('../models/Budget');
const AuditUtil = require('../utils/audit');
const EncryptionUtil = require('../utils/encryption');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class FinanceService {
  /**
   * 创建财务记录
   * @param {Object} recordData - 财务记录数据
   * @param {Object} operator - 操作者信息
   * @returns {Object} 创建的财务记录
   */
  async createFinanceRecord(recordData, operator) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. 生成唯一记录编号
      const recordNumber = await this.generateRecordNumber(recordData.villageId);

      // 2. 处理发票OCR（如果有发票）
      let ocrResult = null;
      if (recordData.invoice && recordData.invoice.path) {
        ocrResult = await this.processInvoiceOCR(recordData.invoice.path);
      }

      // 3. 创建财务记录
      const record = new FinanceRecord({
        ...recordData,
        recordNumber,
        invoice: recordData.invoice ? {
          ...recordData.invoice,
          ocrData: ocrResult
        } : undefined,
        createdBy: operator.userId
      });

      // 4. 设置审批流程
      if (recordData.amount >= 10000) { // 1万以上需要审批
        record.approval = {
          required: true,
          status: 'pending',
          requestedBy: operator.userId,
          requestedAt: new Date()
        };
      }

      await record.save({ session });

      // 5. 更新预算执行情况
      if (recordData.budgetId) {
        await this.updateBudgetExecution(
          recordData.budgetId,
          recordData.amount,
          recordData.type === 'income' ? 'increase' : 'decrease',
          session
        );
      }

      // 6. 记录审计日志
      await AuditUtil.logOperation('CREATE', 'finance', operator, {
        target: {
          id: record._id,
          type: 'FinanceRecord',
          name: record.title
        },
        result: 'SUCCESS',
        details: {
          description: `创建财务记录: ${record.title}`,
          changes: {
            before: null,
            after: {
              title: record.title,
              amount: record.amount,
              type: record.type,
              recordNumber
            }
          }
        },
        riskLevel: recordData.amount >= 10000 ? 'HIGH' : 'MEDIUM',
        requiresApproval: record.approval?.required || false,
        villageId: recordData.villageId,
        sessionId: operator.sessionId
      });

      // 7. 如果需要审批，发送审批通知
      if (record.approval?.required) {
        await this.sendApprovalNotification(record, operator);
      }

      await session.commitTransaction();

      logger.info('财务记录创建成功', {
        recordId: record._id,
        recordNumber,
        operator: operator.name
      });

      return record;
    } catch (error) {
      await session.abortTransaction();
      logger.error('创建财务记录失败:', error);
      throw new Error(`创建财务记录失败: ${  error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * 处理发票OCR识别
   * @param {string} invoicePath - 发票文件路径
   * @returns {Object} OCR识别结果
   */
  async processInvoiceOCR(invoicePath) {
    try {
      // 这里集成实际的OCR服务（如腾讯云OCR）
      // 目前返回模拟数据
      logger.info('处理发票OCR', { invoicePath });

      // 模拟OCR识别结果
      return {
        invoiceCode: '12345678',
        invoiceNumber: '87654321',
        issueDate: '2025-12-19',
        sellerName: '某某科技有限公司',
        sellerTaxNumber: '91110000MA00123456',
        buyerName: '某某村村民委员会',
        buyerTaxNumber: '12345678MA00123456',
        amount: 15000.00,
        taxAmount: 1950.00,
        totalAmount: 16950.00,
        items: [
          {
            name: '办公设备',
            specification: '台式电脑',
            unit: '台',
            quantity: 1,
            price: 15000.00,
            taxRate: 0.13
          }
        ],
        confidence: 0.95,
        processedAt: new Date()
      };
    } catch (error) {
      logger.error('发票OCR处理失败:', error);
      throw new Error('发票OCR处理失败');
    }
  }

  /**
   * 审批财务记录
   * @param {string} recordId - 记录ID
   * @param {Object} approvalData - 审批数据
   * @param {Object} approver - 审批者信息
   * @returns {Object} 更新后的记录
   */
  async approveFinanceRecord(recordId, approvalData, approver) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const record = await FinanceRecord.findById(recordId);
      if (!record) {
        throw new Error('财务记录不存在');
      }

      if (!record.approval?.required) {
        throw new Error('该记录不需要审批');
      }

      if (record.approval.status !== 'pending') {
        throw new Error('该记录已处理');
      }

      // 更新审批状态
      record.approval.status = approvalData.action; // approved or rejected
      record.approval.reviewedBy = approver.userId;
      record.approval.reviewedAt = new Date();
      record.approval.comments = approvalData.comments;

      if (approvalData.action === 'approved') {
        record.approval.approvedBy = approver.userId;
        record.approval.approvedAt = new Date();
        record.status = 'approved';
      } else {
        record.status = 'rejected';
      }

      await record.save({ session });

      // 记录审计日志
      await AuditUtil.logOperation('APPROVE', 'finance', approver, {
        target: {
          id: recordId,
          type: 'FinanceRecord',
          name: record.title
        },
        result: 'SUCCESS',
        details: {
          description: `审批财务记录: ${record.title}`,
          changes: {
            before: { status: 'pending' },
            after: { status: approvalData.action }
          },
          reason: approvalData.comments
        },
        riskLevel: 'HIGH',
        villageId: record.villageId,
        sessionId: approver.sessionId
      });

      // 发送审批结果通知
      await this.sendApprovalResultNotification(record, approvalData, approver);

      await session.commitTransaction();

      logger.info('财务记录审批完成', {
        recordId,
        action: approvalData.action,
        approver: approver.name
      });

      return record;
    } catch (error) {
      await session.abortTransaction();
      logger.error('审批财务记录失败:', error);
      throw new Error(`审批财务记录失败: ${  error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * 创建预算
   * @param {Object} budgetData - 预算数据
   * @param {Object} operator - 操作者信息
   * @returns {Object} 创建的预算
   */
  async createBudget(budgetData, operator) {
    try {
      const budget = new Budget({
        ...budgetData,
        createdBy: operator.userId
      });

      // 生成预算编号
      budget.budgetNumber = await this.generateBudgetNumber(budgetData.villageId);

      await budget.save();

      // 记录审计日志
      await AuditUtil.logOperation('CREATE', 'budget', operator, {
        target: {
          id: budget._id,
          type: 'Budget',
          name: budget.title
        },
        result: 'SUCCESS',
        details: {
          description: `创建预算: ${budget.title}`,
          changes: {
            before: null,
            after: {
              title: budget.title,
              totalAmount: budget.totalAmount,
              budgetNumber
            }
          }
        },
        riskLevel: 'HIGH',
        villageId: budgetData.villageId,
        sessionId: operator.sessionId
      });

      logger.info('预算创建成功', {
        budgetId: budget._id,
        budgetNumber,
        operator: operator.name
      });

      return budget;
    } catch (error) {
      logger.error('创建预算失败:', error);
      throw new Error(`创建预算失败: ${  error.message}`);
    }
  }

  /**
   * 获取财务报表
   * @param {Object} queryParams - 查询参数
   * @param {Object} operator - 操作者信息
   * @returns {Object} 财务报表
   */
  async getFinancialReport(queryParams, operator) {
    try {
      const {
        villageId,
        startDate,
        endDate,
        type = 'monthly', // daily, weekly, monthly, yearly
        reportType = 'summary' // summary, detailed, budget
      } = queryParams;

      // 构建查询条件
      const matchConditions = {
        villageId: mongoose.Types.ObjectId(villageId),
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // 财务记录统计
      const recordStats = await FinanceRecord.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: type === 'daily' ? { $dayOfMonth: '$createdAt' } : null,
              type: '$type'
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            records: { $push: '$$ROOT' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      // 收支汇总
      const summary = await FinanceRecord.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
            },
            totalExpense: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
            },
            incomeCount: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, 1, 0] }
            },
            expenseCount: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, 1, 0] }
            }
          }
        }
      ]);

      // 分类统计
      const categoryStats = await FinanceRecord.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);

      // 预算执行情况
      const budgetExecution = await this.getBudgetExecutionReport(villageId, startDate, endDate);

      // 记录审计日志
      await AuditUtil.logOperation('VIEW', 'finance', operator, {
        result: 'SUCCESS',
        details: {
          description: '查看财务报表',
          metadata: {
            reportType,
            period: { startDate, endDate }
          }
        },
        riskLevel: 'MEDIUM',
        villageId,
        sessionId: operator.sessionId
      });

      return {
        period: { startDate, endDate },
        type,
        summary: summary[0] || { totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0 },
        recordStats,
        categoryStats,
        budgetExecution,
        balance: (summary[0]?.totalIncome || 0) - (summary[0]?.totalExpense || 0)
      };
    } catch (error) {
      logger.error('获取财务报表失败:', error);
      throw new Error(`获取财务报表失败: ${  error.message}`);
    }
  }

  /**
   * 导出财务数据
   * @param {Object} queryParams - 查询参数
   * @param {string} format - 导出格式
   * @param {Object} operator - 操作者信息
   * @returns {Buffer} 导出文件
   */
  async exportFinancialData(queryParams, format, operator) {
    try {
      const {
        villageId,
        startDate,
        endDate,
        type = 'all', // all, income, expense
        status = 'all' // all, pending, approved, rejected
      } = queryParams;

      // 构建查询条件
      const matchConditions = {
        villageId: mongoose.Types.ObjectId(villageId),
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (type !== 'all') {
        matchConditions.type = type;
      }

      if (status !== 'all') {
        matchConditions.status = status;
      }

      // 查询数据
      const records = await FinanceRecord
        .find(matchConditions)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name')
        .populate('approval.reviewedBy', 'name')
        .populate('approval.approvedBy', 'name')
        .lean();

      // 脱敏处理
      const maskedRecords = records.map(record => ({
        ...record,
        invoice: record.invoice ? {
          ...record.invoice,
          ocrData: record.invoice.ocrData ? {
            ...record.invoice.ocrData,
            sellerTaxNumber: this.maskTaxNumber(record.invoice.ocrData.sellerTaxNumber),
            buyerTaxNumber: this.maskTaxNumber(record.invoice.ocrData.buyerTaxNumber)
          } : null
        } : null
      }));

      // 根据格式导出
      let exportData;
      switch (format) {
      case 'excel':
        exportData = await this.exportToExcel(maskedRecords);
        break;
      case 'csv':
        exportData = await this.exportToCSV(maskedRecords);
        break;
      case 'pdf':
        exportData = await this.exportToPDF(maskedRecords);
        break;
      default:
        throw new Error('不支持的导出格式');
      }

      // 记录审计日志
      await AuditUtil.logOperation('EXPORT', 'finance', operator, {
        result: 'SUCCESS',
        details: {
          description: `导出财务数据，格式: ${format}`,
          metadata: {
            recordCount: records.length,
            format,
            period: { startDate, endDate }
          }
        },
        riskLevel: 'HIGH',
        villageId,
        sessionId: operator.sessionId
      });

      return exportData;
    } catch (error) {
      logger.error('导出财务数据失败:', error);
      throw new Error(`导出财务数据失败: ${  error.message}`);
    }
  }

  /**
   * 生成记录编号
   * @param {string} villageId - 村庄ID
   * @returns {string} 记录编号
   */
  async generateRecordNumber(villageId) {
    try {
      const village = await mongoose.model('Village').findById(villageId);
      const villageCode = village?.code || 'V001';

      // 获取今天的计数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const count = await FinanceRecord.countDocuments({
        villageId,
        createdAt: { $gte: today, $lt: tomorrow }
      });

      // 生成编号: 村庄代码 + 日期 + 3位序号
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const sequence = String(count + 1).padStart(3, '0');

      return `C${villageCode}${dateStr}${sequence}`;
    } catch (error) {
      logger.error('生成记录编号失败:', error);
      throw new Error('生成记录编号失败');
    }
  }

  /**
   * 生成预算编号
   * @param {string} villageId - 村庄ID
   * @returns {string} 预算编号
   */
  async generateBudgetNumber(villageId) {
    try {
      const village = await mongoose.model('Village').findById(villageId);
      const villageCode = village?.code || 'V001';

      const year = new Date().getFullYear();
      const count = await Budget.countDocuments({
        villageId,
        year
      });

      // 生成编号: B + 村庄代码 + 年份 + 2位序号
      const sequence = String(count + 1).padStart(2, '0');

      return `B${villageCode}${year}${sequence}`;
    } catch (error) {
      logger.error('生成预算编号失败:', error);
      throw new Error('生成预算编号失败');
    }
  }

  /**
   * 更新预算执行情况
   * @param {string} budgetId - 预算ID
   * @param {number} amount - 金额
   * @param {string} type - 类型 (increase/decrease)
   * @param {ClientSession} session - MongoDB会话
   */
  async updateBudgetExecution(budgetId, amount, type, session) {
    try {
      const updateField = type === 'increase' ? 'executedIncome' : 'executedExpense';
      await Budget.findByIdAndUpdate(
        budgetId,
        { $inc: { [updateField]: amount } },
        { session }
      );
    } catch (error) {
      throw new Error('更新预算执行情况失败');
    }
  }

  /**
   * 获取预算执行报告
   * @param {string} villageId - 村庄ID
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @returns {Object} 预算执行报告
   */
  async getBudgetExecutionReport(villageId, startDate, endDate) {
    try {
      const budgets = await Budget.find({
        villageId,
        year: new Date(startDate).getFullYear()
      }).lean();

      const execution = budgets.map(budget => ({
        budgetId: budget._id,
        title: budget.title,
        budgetAmount: budget.totalAmount,
        executedAmount: budget.executedIncome + budget.executedExpense,
        executionRate: budget.totalAmount > 0 ?
          ((budget.executedIncome + budget.executedExpense) / budget.totalAmount * 100).toFixed(2) : 0,
        remainingAmount: budget.totalAmount - (budget.executedIncome + budget.executedExpense)
      }));

      return {
        totalBudget: budgets.reduce((sum, b) => sum + b.totalAmount, 0),
        totalExecuted: budgets.reduce((sum, b) => sum + b.executedIncome + b.executedExpense, 0),
        executionDetails: execution
      };
    } catch (error) {
      logger.error('获取预算执行报告失败:', error);
      throw new Error('获取预算执行报告失败');
    }
  }

  /**
   * 发送审批通知
   * @param {Object} record - 财务记录
   * @param {Object} operator - 操作者
   */
  async sendApprovalNotification(record, operator) {
    await notificationService.sendNotification({
      type: 'finance_approval_required',
      recipient: {
        userId: record.approval.requestedBy,
        name: operator.name
      },
      title: '财务记录需要审批',
      message: `您提交的财务记录"${record.title}"需要审批`,
      data: {
        recordId: record._id,
        amount: record.amount,
        recordNumber: record.recordNumber
      }
    });
  }

  /**
   * 发送审批结果通知
   * @param {Object} record - 财务记录
   * @param {Object} approvalData - 审批数据
   * @param {Object} approver - 审批者
   */
  async sendApprovalResultNotification(record, approvalData, approver) {
    const statusText = approvalData.action === 'approved' ? '已通过' : '已拒绝';

    await notificationService.sendNotification({
      type: 'finance_approval_result',
      recipient: {
        userId: record.approval.requestedBy,
        name: '提交者'
      },
      title: `财务记录${statusText}`,
      message: `您提交的财务记录"${record.title}"${statusText}`,
      data: {
        recordId: record._id,
        status: approvalData.action,
        comments: approvalData.comments,
        approver: approver.name
      }
    });
  }

  /**
   * 脱敏税号
   * @param {string} taxNumber - 税号
   * @returns {string} 脱敏后的税号
   */
  maskTaxNumber(taxNumber) {
    if (!taxNumber || taxNumber.length < 10) return taxNumber;
    return `${taxNumber.slice(0, 4)  }********${  taxNumber.slice(-4)}`;
  }

  /**
   * 导出为Excel
   * @param {Array} records - 记录数据
   * @returns {Buffer} Excel文件
   */
  async exportToExcel(records) {
    // 实现Excel导出逻辑
    // 可以使用xlsx等库
    return Buffer.from('Excel export data');
  }

  /**
   * 导出为CSV
   * @param {Array} records - 记录数据
   * @returns {string} CSV字符串
   */
  async exportToCSV(records) {
    const headers = [
      '记录编号', '日期', '类型', '标题', '金额', '分类',
      '经办人', '审批状态', '备注'
    ];

    const rows = records.map(record => [
      record.recordNumber,
      record.createdAt?.toISOString().slice(0, 10) || '',
      record.type === 'income' ? '收入' : '支出',
      record.title,
      record.amount,
      record.category,
      record.createdBy?.name || '',
      record.status,
      record.notes || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * 导出为PDF
   * @param {Array} records - 记录数据
   * @returns {Buffer} PDF文件
   */
  async exportToPDF(records) {
    // 实现PDF导出逻辑
    // 可以使用puppeteer等库
    return Buffer.from('PDF export data');
  }
}

module.exports = new FinanceService();