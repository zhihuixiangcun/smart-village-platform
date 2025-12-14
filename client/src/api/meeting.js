import axios from 'axios'

const API_BASE = '/api/v1/meetings'

export const meetingAPI = {
  // 获取会议列表
  getMeetingList: (params) => {
    return axios.get(API_BASE, { params })
  },

  // 获取会议详情
  getMeetingDetails: (meetingId) => {
    return axios.get(`${API_BASE}/${meetingId}`)
  },

  // 创建会议
  createMeeting: (meetingData) => {
    return axios.post(API_BASE, meetingData)
  },

  // 发送会议通知
  sendMeetingNotifications: (meetingId, notificationData) => {
    return axios.post(`${API_BASE}/${meetingId}/notify`, notificationData)
  },

  // 会议签到
  checkInMeeting: (meetingId, checkInData) => {
    return axios.post(`${API_BASE}/${meetingId}/checkin`, checkInData)
  },

  // 获取签到二维码
  getCheckInQR: (meetingId) => {
    return axios.get(`${API_BASE}/${meetingId}/checkin/qr`)
  },

  // 获取出席情况
  getAttendance: (meetingId) => {
    return axios.get(`${API_BASE}/${meetingId}/attendance`)
  },

  // 获取即将举行的会议
  getUpcomingMeetings: (days = 7) => {
    return axios.get(`${API_BASE}/upcoming`, { params: { days } })
  },

  // 获取会议统计
  getMeetingStatistics: () => {
    return axios.get(`${API_BASE}/statistics`)
  },

  // 更新会议议程
  updateMeetingAgenda: (meetingId, agendaData) => {
    return axios.put(`${API_BASE}/${meetingId}/agenda`, agendaData)
  },

  // 更新议程进度
  updateAgendaProgress: (meetingId, progressData) => {
    return axios.post(`${API_BASE}/${meetingId}/agenda/progress`, progressData)
  },

  // 标记议程项完成
  markAgendaItemCompleted: (meetingId, itemId) => {
    return axios.post(`${API_BASE}/${meetingId}/agenda/items/${itemId}/complete`)
  },

  // 保存会议纪要
  saveMeetingMinutes: (meetingId, minutesData) => {
    return axios.post(`${API_BASE}/${meetingId}/minutes`, minutesData)
  },

  // 获取会议纪要
  getMeetingMinutes: (meetingId) => {
    return axios.get(`${API_BASE}/${meetingId}/minutes`)
  },

  // 导出会议纪要
  exportMeetingMinutes: (meetingId) => {
    return axios.get(`${API_BASE}/${meetingId}/minutes/export`, {
      responseType: 'blob'
    })
  },

  // 审核会议纪要
  approveMeetingMinutes: (meetingId, approvalData) => {
    return axios.post(`${API_BASE}/${meetingId}/minutes/approve`, approvalData)
  }
}

export default meetingAPI