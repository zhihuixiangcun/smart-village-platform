/**
 * 政策计算器API
 * @module api/policyCalculator
 */
import request from '@/utils/request';

const policyCalculatorApi = {
  /**
   * 获取政策计算器列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 政策计算器列表
   */
  getPolicyCalculators(params = {}) {
    return request.get('/api/v1/policy-calculator', { params });
  },

  /**
   * 获取政策计算器详情
   * @param {string} id - 计算器ID
   * @returns {Promise} 计算器详情
   */
  getPolicyCalculatorById(id) {
    return request.get(`/api/v1/policy-calculator/${id}`);
  },

  /**
   * 创建政策计算器（管理员）
   * @param {Object} data - 计算器数据
   * @returns {Promise} 创建结果
   */
  createPolicyCalculator(data) {
    return request.post('/api/v1/policy-calculator', data);
  },

  /**
   * 更新政策计算器（管理员）
   * @param {string} id - 计算器ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新结果
   */
  updatePolicyCalculator(id, data) {
    return request.put(`/api/v1/policy-calculator/${id}`, data);
  },

  /**
   * 删除政策计算器（管理员）
   * @param {string} id - 计算器ID
   * @returns {Promise} 删除结果
   */
  deletePolicyCalculator(id) {
    return request.delete(`/api/v1/policy-calculator/${id}`);
  },

  /**
   * 计算补贴金额
   * @param {string} id - 计算器ID
   * @param {Object} applicationData - 申请数据
   * @returns {Promise} 计算结果
   */
  calculateSubsidy(id, applicationData) {
    return request.post(`/api/v1/policy-calculator/${id}/calculate`, applicationData);
  },

  /**
   * 批量计算补贴（管理员）
   * @param {string} id - 计算器ID
   * @param {Array} applicationsData - 申请数据数组
   * @returns {Promise} 批量计算结果
   */
  batchCalculate(id, applicationsData) {
    return request.post(`/api/v1/policy-calculator/${id}/batch-calculate`, { applicationsData });
  },

  /**
   * 获取申请表单
   * @param {string} id - 计算器ID
   * @returns {Promise} 表单结构
   */
  getApplicationForm(id) {
    return request.get(`/api/v1/policy-calculator/${id}/form`);
  },

  // ==================== 补贴申请相关 ====================

  /**
   * 获取申请列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 申请列表
   */
  getApplications(params = {}) {
    return request.get('/api/v1/policy-calculator/applications', { params });
  },

  /**
   * 获取申请详情
   * @param {string} id - 申请ID
   * @returns {Promise} 申请详情
   */
  getApplicationById(id) {
    return request.get(`/api/v1/policy-calculator/applications/${id}`);
  },

  /**
   * 创建补贴申请
   * @param {Object} applicationData - 申请数据
   * @returns {Promise} 创建结果
   */
  createApplication(applicationData) {
    return request.post('/api/v1/policy-calculator/applications', applicationData);
  },

  /**
   * 提交申请
   * @param {string} id - 申请ID
   * @returns {Promise} 提交结果
   */
  submitApplication(id) {
    return request.post(`/api/v1/policy-calculator/applications/${id}/submit`);
  },

  /**
   * 审核申请（管理员）
   * @param {string} id - 申请ID
   * @param {Object} reviewData - 审核数据
   * @returns {Promise} 审核结果
   */
  reviewApplication(id, reviewData) {
    return request.post(`/api/v1/policy-calculator/applications/${id}/review`, reviewData);
  },

  /**
   * 处理支付（财务）
   * @param {string} id - 申请ID
   * @param {Object} paymentData - 支付数据
   * @returns {Promise} 支付结果
   */
  processPayment(id, paymentData) {
    return request.post(`/api/v1/policy-calculator/applications/${id}/payment`, paymentData);
  },

  /**
   * 生成证书（管理员）
   * @param {string} id - 申请ID
   * @returns {Promise} 证书数据
   */
  generateCertificate(id) {
    return request.post(`/api/v1/policy-calculator/applications/${id}/certificate`);
  },

  /**
   * 发送通知（管理员）
   * @param {string} id - 申请ID
   * @param {Object} notificationData - 通知数据
   * @returns {Promise} 发送结果
   */
  sendNotification(id, notificationData) {
    return request.post(`/api/v1/policy-calculator/applications/${id}/notify`, notificationData);
  },

  /**
   * 获取申请统计（管理员）
   * @param {Object} params - 查询参数
   * @returns {Promise} 统计数据
   */
  getApplicationStatistics(params = {}) {
    return request.get('/api/v1/policy-calculator/applications/statistics', { params });
  },

  /**
   * 同步政府政策数据（管理员）
   * @param {Object} options - 同步选项
   * @returns {Promise} 同步结果
   */
  syncGovernmentPolicies(options = {}) {
    return request.post('/api/v1/policy-calculator/sync', options);
  },

  /**
   * 获取同步状态
   * @returns {Promise} 同步状态
   */
  getSyncStatus() {
    return request.get('/api/v1/policy-calculator/sync/status');
  },

  // ==================== 便捷方法 ====================

  /**
   * 快速计算耕地补贴
   * @param {number} landArea - 耕地面积（亩）
   * @param {number} householdSize - 家庭人口
   * @param {Object} options - 其他选项
   * @returns {Promise} 计算结果
   */
  async quickCalculateLandSubsidy(landArea, householdSize, options = {}) {
    // 先获取耕地保护补贴政策
    const calculators = await this.getPolicyCalculators({
      policyType: 'subsidy',
      category: 'agriculture',
      tags: '耕地保护'
    });

    if (!calculators.data || calculators.data.length === 0) {
      throw new Error('未找到耕地保护补贴政策');
    }

    const calculator = calculators.data[0];

    return this.calculateSubsidy(calculator._id, {
      applicantInfo: {
        name: options.applicantName || '',
        idNumber: options.idNumber || '',
        birthDate: options.birthDate || ''
      },
      householdInfo: {
        registeredHouseholdSize: householdSize
      },
      landInfo: {
        totalLandArea: landArea,
        totalLandUnit: 'mu',
        landParcels: [
          {
            area: landArea,
            areaUnit: 'mu',
            landType: 'cultivated'
          }
        ]
      }
    });
  },

  /**
   * 获取可用的政策列表
   * @param {string} villageId - 村庄ID
   * @returns {Promise} 政策列表
   */
  getAvailablePolicies(villageId) {
    return this.getPolicyCalculators({
      villageId,
      isActive: true,
      sortBy: 'createdAt',
      order: 'desc'
    });
  }
};

export default policyCalculatorApi;
