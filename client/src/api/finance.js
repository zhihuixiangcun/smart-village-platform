import request from '@/utils/request';

// 财务API接口
export const financeAPI = {
  // ==================== 财务概览 ====================

  // 获取财务统计数据
  getFinanceStats() {
    return request({
      url: '/api/v1/finance/stats',
      method: 'get'
    });
  },

  // 获取收支趋势数据
  getFinanceTrend(params) {
    return request({
      url: '/api/v1/finance/trend',
      method: 'get',
      params
    });
  },

  // 获取近期交易记录
  getRecentTransactions(params) {
    return request({
      url: '/api/v1/finance/transactions/recent',
      method: 'get',
      params
    });
  },

  // ==================== 支出管理 ====================

  // 获取支出列表
  getExpenseList(params) {
    return request({
      url: '/api/v1/finance/expenses',
      method: 'get',
      params
    });
  },

  // 获取支出详情
  getExpenseDetail(id) {
    return request({
      url: `/api/v1/finance/expenses/${id}`,
      method: 'get'
    });
  },

  // 创建支出申请
  createExpense(data) {
    return request({
      url: '/api/v1/finance/expenses',
      method: 'post',
      data
    });
  },

  // 更新支出申请
  updateExpense(id, data) {
    return request({
      url: `/api/v1/finance/expenses/${id}`,
      method: 'put',
      data
    });
  },

  // 删除支出申请
  deleteExpense(id) {
    return request({
      url: `/api/v1/finance/expenses/${id}`,
      method: 'delete'
    });
  },

  // 批量删除支出
  batchDeleteExpenses(ids) {
    return request({
      url: '/api/v1/finance/expenses/batch',
      method: 'delete',
      data: { ids }
    });
  },

  // 导出支出记录
  exportExpenses(params) {
    return request({
      url: '/api/v1/finance/expenses/export',
      method: 'get',
      params,
      responseType: 'blob'
    });
  },

  // ==================== 审批流程 ====================

  // 获取审批列表
  getApprovalList(params) {
    return request({
      url: '/api/v1/finance/approvals',
      method: 'get',
      params
    });
  },

  // 获取审批详情
  getApprovalDetail(id) {
    return request({
      url: `/api/v1/finance/approvals/${id}`,
      method: 'get'
    });
  },

  // 创建审批申请
  createApproval(data) {
    return request({
      url: '/api/v1/finance/approvals',
      method: 'post',
      data
    });
  },

  // 审批操作（通过/驳回）
  processApproval(id, data) {
    return request({
      url: `/api/v1/finance/approvals/${id}/process`,
      method: 'post',
      data
    });
  },

  // 批量审批
  batchProcessApproval(data) {
    return request({
      url: '/api/v1/finance/approvals/batch-process',
      method: 'post',
      data
    });
  },

  // 撤回审批申请
  withdrawApproval(id, reason) {
    return request({
      url: `/api/v1/finance/approvals/${id}/withdraw`,
      method: 'post',
      data: { reason }
    });
  },

  // 获取审批历史
  getApprovalHistory(id) {
    return request({
      url: `/api/v1/finance/approvals/${id}/history`,
      method: 'get'
    });
  },

  // 获取审批流程模板
  getApprovalTemplates() {
    return request({
      url: '/api/v1/finance/approval-templates',
      method: 'get'
    });
  },

  // 委托审批权限
  delegateApproval(data) {
    return request({
      url: '/api/v1/finance/approvals/delegate',
      method: 'post',
      data
    });
  },

  // ==================== 预算管理 ====================

  // 获取预算列表
  getBudgetList(params) {
    return request({
      url: '/api/v1/finance/budgets',
      method: 'get',
      params
    });
  },

  // 获取预算详情
  getBudgetDetail(id) {
    return request({
      url: `/api/v1/finance/budgets/${id}`,
      method: 'get'
    });
  },

  // 创建预算
  createBudget(data) {
    return request({
      url: '/api/v1/finance/budgets',
      method: 'post',
      data
    });
  },

  // 更新预算
  updateBudget(id, data) {
    return request({
      url: `/api/v1/finance/budgets/${id}`,
      method: 'put',
      data
    });
  },

  // 删除预算
  deleteBudget(id) {
    return request({
      url: `/api/v1/finance/budgets/${id}`,
      method: 'delete'
    });
  },

  // 获取预算执行情况
  getBudgetExecution(id, params) {
    return request({
      url: `/api/v1/finance/budgets/${id}/execution`,
      method: 'get',
      params
    });
  },

  // 预算调整申请
  adjustBudget(id, data) {
    return request({
      url: `/api/v1/finance/budgets/${id}/adjust`,
      method: 'post',
      data
    });
  },

  // ==================== 财务报表 ====================

  // 获取财务报表列表
  getReportList(params) {
    return request({
      url: '/api/v1/finance/reports',
      method: 'get',
      params
    });
  },

  // 生成财务报表
  generateReport(data) {
    return request({
      url: '/api/v1/finance/reports/generate',
      method: 'post',
      data
    });
  },

  // 下载财务报表
  downloadReport(id, format = 'pdf') {
    return request({
      url: `/api/v1/finance/reports/${id}/download`,
      method: 'get',
      params: { format },
      responseType: 'blob'
    });
  },

  // 获取收支明细报表
  getIncomeExpenseReport(params) {
    return request({
      url: '/api/v1/finance/reports/income-expense',
      method: 'get',
      params
    });
  },

  // 获取预算执行报表
  getBudgetExecutionReport(params) {
    return request({
      url: '/api/v1/finance/reports/budget-execution',
      method: 'get',
      params
    });
  },

  // 获取资金流水报表
  getCashFlowReport(params) {
    return request({
      url: '/api/v1/finance/reports/cash-flow',
      method: 'get',
      params
    });
  },

  // ==================== 票据管理 ====================

  // 上传票据
  uploadReceipt(formData) {
    return request({
      url: '/api/v1/finance/receipts/upload',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // 获取票据列表
  getReceiptList(params) {
    return request({
      url: '/api/v1/finance/receipts',
      method: 'get',
      params
    });
  },

  // 获取票据详情
  getReceiptDetail(id) {
    return request({
      url: `/api/v1/finance/receipts/${id}`,
      method: 'get'
    });
  },

  // OCR识别票据
  ocrReceipt(id) {
    return request({
      url: `/api/v1/finance/receipts/${id}/ocr`,
      method: 'post'
    });
  },

  // 删除票据
  deleteReceipt(id) {
    return request({
      url: `/api/v1/finance/receipts/${id}`,
      method: 'delete'
    });
  },

  // ==================== 资金管理 ====================

  // 获取账户余额
  getAccountBalance() {
    return request({
      url: '/api/v1/finance/accounts/balance',
      method: 'get'
    });
  },

  // 获取资金流水
  getCashFlow(params) {
    return request({
      url: '/api/v1/finance/cash-flow',
      method: 'get',
      params
    });
  },

  // 资金转账
  transferFunds(data) {
    return request({
      url: '/api/v1/finance/transfer',
      method: 'post',
      data
    });
  },

  // 获取银行账户列表
  getBankAccounts() {
    return request({
      url: '/api/v1/finance/bank-accounts',
      method: 'get'
    });
  },

  // 同步银行流水
  syncBankTransactions(accountId) {
    return request({
      url: `/api/v1/finance/bank-accounts/${accountId}/sync`,
      method: 'post'
    });
  },

  // ==================== 财务设置 ====================

  // 获取财务配置
  getFinanceConfig() {
    return request({
      url: '/api/v1/finance/config',
      method: 'get'
    });
  },

  // 更新财务配置
  updateFinanceConfig(data) {
    return request({
      url: '/api/v1/finance/config',
      method: 'put',
      data
    });
  },

  // 获取审批权限配置
  getApprovalPermissions() {
    return request({
      url: '/api/v1/finance/approval-permissions',
      method: 'get'
    });
  },

  // 更新审批权限配置
  updateApprovalPermissions(data) {
    return request({
      url: '/api/v1/finance/approval-permissions',
      method: 'put',
      data
    });
  },

  // 获取财务分类设置
  getFinanceCategories() {
    return request({
      url: '/api/v1/finance/categories',
      method: 'get'
    });
  },

  // 更新财务分类设置
  updateFinanceCategories(data) {
    return request({
      url: '/api/v1/finance/categories',
      method: 'put',
      data
    });
  }
};

// 审批流程相关的专门API
export const approvalAPI = {
  // 提交审批申请
  submitApproval(data) {
    return financeAPI.createApproval(data);
  },

  // 审批通过
  approve(id, comment = '') {
    return financeAPI.processApproval(id, {
      action: 'approve',
      comment
    });
  },

  // 审批驳回
  reject(id, comment) {
    return financeAPI.processApproval(id, {
      action: 'reject',
      comment
    });
  },

  // 批量审批通过
  batchApprove(ids, comment = '') {
    return financeAPI.batchProcessApproval({
      ids,
      action: 'approve',
      comment
    });
  },

  // 批量审批驳回
  batchReject(ids, comment) {
    return financeAPI.batchProcessApproval({
      ids,
      action: 'reject',
      comment
    });
  },

  // 转审（转给其他人审批）
  transfer(id, targetUserId, comment = '') {
    return request({
      url: `/api/v1/finance/approvals/${id}/transfer`,
      method: 'post',
      data: {
        targetUserId,
        comment
      }
    });
  },

  // 加签（增加审批人）
  addApprover(id, userIds, comment = '') {
    return request({
      url: `/api/v1/finance/approvals/${id}/add-approver`,
      method: 'post',
      data: {
        userIds,
        comment
      }
    });
  },

  // 减签（减少审批人）
  removeApprover(id, userIds, comment = '') {
    return request({
      url: `/api/v1/finance/approvals/${id}/remove-approver`,
      method: 'post',
      data: {
        userIds,
        comment
      }
    });
  },

  // 获取可审批人员列表
  getAvailableApprovers(type = '') {
    return request({
      url: '/api/v1/finance/approvers',
      method: 'get',
      params: { type }
    });
  },

  // 设置审批超时提醒
  setApprovalReminder(id, reminderTime) {
    return request({
      url: `/api/v1/finance/approvals/${id}/reminder`,
      method: 'post',
      data: { reminderTime }
    });
  },

  // 获取审批统计
  getApprovalStats(params = {}) {
    return request({
      url: '/api/v1/finance/approval-stats',
      method: 'get',
      params
    });
  }
};

// 导出默认API
export default financeAPI;