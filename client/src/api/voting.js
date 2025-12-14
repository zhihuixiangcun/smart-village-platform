import axios from 'axios'

const API_BASE = '/api/v1/voting'

export const votingAPI = {
  // 获取投票列表
  getVoteList: (params) => {
    return axios.get(`${API_BASE}/votes`, { params })
  },

  // 获取投票详情
  getVoteDetails: (voteId, params) => {
    return axios.get(`${API_BASE}/votes/${voteId}`, { params })
  },

  // 创建投票
  createVote: (voteData) => {
    return axios.post(`${API_BASE}/votes`, voteData)
  },

  // 参与投票
  castVote: (voteId, voteData) => {
    return axios.post(`${API_BASE}/votes/${voteId}/cast`, voteData)
  },

  // 获取投票结果
  getVoteResults: (voteId) => {
    return axios.get(`${API_BASE}/votes/${voteId}/results`)
  },

  // 获取投票统计
  getVotingStatistics: () => {
    return axios.get(`${API_BASE}/statistics`)
  }
}

export default votingAPI