import request from '@/utils/request';

/**
 * 项目管理 API
 */
export const projectApi = {
  /**
   * 获取项目列表
   */
  getProjectList(params) {
    return request({
      url: '/api/v1/projects',
      method: 'get',
      params,
    });
  },

  /**
   * 获取项目详情
   */
  getProjectDetails(projectId) {
    return request({
      url: `/api/v1/projects/${projectId}`,
      method: 'get',
    });
  },

  /**
   * 创建项目
   */
  createProject(data) {
    return request({
      url: '/api/v1/projects',
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 更新项目基本信息
   */
  updateProject(projectId, data) {
    return request({
      url: `/api/v1/projects/${projectId}`,
      method: 'put',
      data,
    });
  },

  /**
   * 删除项目
   */
  deleteProject(projectId) {
    return request({
      url: `/api/v1/projects/${projectId}`,
      method: 'delete',
    });
  },

  /**
   * 提交项目审批
   */
  submitProject(projectId) {
    return request({
      url: `/api/v1/projects/${projectId}/submit`,
      method: 'post',
    });
  },

  /**
   * 审批项目
   */
  approveProject(projectId, data) {
    return request({
      url: `/api/v1/projects/${projectId}/approve`,
      method: 'post',
      data,
    });
  },

  /**
   * 启动项目
   */
  startProject(projectId) {
    return request({
      url: `/api/v1/projects/${projectId}/start`,
      method: 'post',
    });
  },

  /**
   * 更新项目进度
   */
  updateProgress(projectId, data) {
    return request({
      url: `/api/v1/projects/${projectId}/progress`,
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 添加项目风险
   */
  addRisk(projectId, data) {
    return request({
      url: `/api/v1/projects/${projectId}/risks`,
      method: 'post',
      data,
    });
  },

  /**
   * 项目变更申请
   */
  requestChange(projectId, data) {
    return request({
      url: `/api/v1/projects/${projectId}/changes`,
      method: 'post',
      data,
    });
  },

  /**
   * 项目验收
   */
  acceptProject(projectId, data) {
    return request({
      url: `/api/v1/projects/${projectId}/accept`,
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 获取待审批项目
   */
  getPendingApprovals(params) {
    return request({
      url: '/api/v1/projects/pending-approvals',
      method: 'get',
      params,
    });
  },

  /**
   * 获取项目统计
   */
  getStatistics(villageId, params) {
    return request({
      url: `/api/v1/projects/statistics/${villageId}`,
      method: 'get',
      params,
    });
  },

  /**
   * 生成项目报告
   */
  generateReport(type, params) {
    return request({
      url: `/api/v1/projects/reports/${type}`,
      method: 'get',
      params,
    });
  },
};

/**
 * 财务管理 API
 */
export const financeApi = {
  /**
   * 获取财务记录列表
   */
  getFinanceList(params) {
    return request({
      url: '/api/v1/finance/records',
      method: 'get',
      params,
    });
  },

  /**
   * 创建财务记录
   */
  createFinanceRecord(data) {
    return request({
      url: '/api/v1/finance/records',
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 审批财务记录
   */
  approveFinanceRecord(recordId, data) {
    return request({
      url: `/api/v1/finance/records/${recordId}/approve`,
      method: 'post',
      data,
    });
  },

  /**
   * OCR发票识别
   */
  processInvoiceOCR(file, ocrProvider = 'baidu') {
    const formData = new FormData();
    formData.append('invoice', file);
    formData.append('ocrProvider', ocrProvider);

    return request({
      url: '/api/v1/finance/ocr/invoice',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 获取待审批财务事项
   */
  getPendingApprovals(params) {
    return request({
      url: '/api/v1/finance/pending-approvals',
      method: 'get',
      params,
    });
  },

  /**
   * 获取财务统计
   */
  getStatistics(villageId, params) {
    return request({
      url: `/api/v1/finance/statistics/${villageId}`,
      method: 'get',
      params,
    });
  },

  /**
   * 创建年度预算
   */
  createBudget(data) {
    return request({
      url: '/api/v1/finance/budgets',
      method: 'post',
      data,
    });
  },

  /**
   * 预算调整
   */
  adjustBudget(budgetId, data) {
    return request({
      url: `/api/v1/finance/budgets/${budgetId}/adjust`,
      method: 'post',
      data,
    });
  },

  /**
   * 生成财务报表
   */
  generateReport(type, params) {
    return request({
      url: `/api/v1/finance/reports/${type}`,
      method: 'get',
      params,
    });
  },
};

export default {
  projectApi,
  financeApi,
};
