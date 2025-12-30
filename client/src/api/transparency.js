/**
 * 阳光村务系统 API
 */
import request from '@/utils/request'

export default {
  // ========== 财务透明化 - 发票管理 ==========
  // 获取发票列表
  getInvoices(params) {
    return request({
      url: '/api/transparency/invoices',
      method: 'get',
      params
    })
  },

  // 创建发票记录（拍照自动识别）
  createInvoice(data) {
    return request({
      url: '/api/transparency/invoices',
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 更新发票
  updateInvoice(id, data) {
    return request({
      url: `/api/transparency/invoices/${id}`,
      method: 'put',
      data
    })
  },

  // 审核发票
  verifyInvoice(id, data) {
    return request({
      url: `/api/transparency/invoices/${id}/verify`,
      method: 'post',
      data
    })
  },

  // ========== 财务透明化 - 收支流水 ==========
  // 获取收支流水
  getTransactions(params) {
    return request({
      url: '/api/transparency/transactions',
      method: 'get',
      params
    })
  },

  // 创建收支记录
  createTransaction(data) {
    return request({
      url: '/api/transparency/transactions',
      method: 'post',
      data
    })
  },

  // 获取财务统计数据
  getTransactionStatistics(params) {
    return request({
      url: '/api/transparency/transactions/statistics',
      method: 'get',
      params
    })
  },

  // ========== 工程项目监督 ==========
  // 获取工程项目列表
  getProjects(params) {
    return request({
      url: '/api/transparency/projects',
      method: 'get',
      params
    })
  },

  // 创建工程项目
  createProject(data) {
    return request({
      url: '/api/transparency/projects',
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 更新工程项目
  updateProject(id, data) {
    return request({
      url: `/api/transparency/projects/${id}`,
      method: 'put',
      data
    })
  },

  // 上报工程进度（村民拍照监督）
  reportProjectProgress(id, data) {
    return request({
      url: `/api/transparency/projects/${id}/progress`,
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 提交质量问题反馈
  submitQualityFeedback(id, data) {
    return request({
      url: `/api/transparency/projects/${id}/feedback`,
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 获取项目进度记录
  getProjectProgress(id) {
    return request({
      url: `/api/transparency/projects/${id}/progress`,
      method: 'get'
    })
  },

  // ========== 村务决策公开 ==========
  // 获取决策列表
  getDecisions(params) {
    return request({
      url: '/api/transparency/decisions',
      method: 'get',
      params
    })
  },

  // 创建决策
  createDecision(data) {
    return request({
      url: '/api/transparency/decisions',
      method: 'post',
      data
    })
  },

  // 参与投票
  voteDecision(id, data) {
    return request({
      url: `/api/transparency/decisions/${id}/vote`,
      method: 'post',
      data
    })
  },

  // 获取投票记录
  getVoteRecords(id) {
    return request({
      url: `/api/transparency/decisions/${id}/votes`,
      method: 'get'
    })
  },

  // ========== 区块链存证 ==========
  // 创建区块链存证
  createBlockchainRecord(data) {
    return request({
      url: '/api/transparency/blockchain',
      method: 'post',
      data
    })
  },

  // 验证区块链记录
  verifyBlockchainRecord(id) {
    return request({
      url: `/api/transparency/blockchain/${id}/verify`,
      method: 'get'
    })
  },

  // 获取区块链存证列表
  getBlockchainRecords(params) {
    return request({
      url: '/api/transparency/blockchain',
      method: 'get',
      params
    })
  }
}
