import request from '@/utils/request';

// 值班管理API接口
export const dutyApi = {
  // 获取值班人员列表
  getPersonnel() {
    return request({
      url: '/api/duty/personnel',
      method: 'get'
    });
  },

  // 添加值班人员
  addPersonnel(data) {
    return request({
      url: '/api/duty/personnel',
      method: 'post',
      data
    });
  },

  // 更新值班人员信息
  updatePersonnel(id, data) {
    return request({
      url: `/api/duty/personnel/${id}`,
      method: 'put',
      data
    });
  },

  // 删除值班人员
  deletePersonnel(id) {
    return request({
      url: `/api/duty/personnel/${id}`,
      method: 'delete'
    });
  },

  // 获取值班安排
  getSchedules(startDate, endDate) {
    return request({
      url: '/api/duty/schedules',
      method: 'get',
      params: { startDate, endDate }
    });
  },

  // 创建值班安排
  createSchedule(data) {
    return request({
      url: '/api/duty/schedules',
      method: 'post',
      data
    });
  },

  // 更新值班安排
  updateSchedule(id, data) {
    return request({
      url: `/api/duty/schedules/${id}`,
      method: 'put',
      data
    });
  },

  // 删除值班安排
  deleteSchedule(id) {
    return request({
      url: `/api/duty/schedules/${id}`,
      method: 'delete'
    });
  },

  // 批量创建值班安排
  batchCreateSchedules(data) {
    return request({
      url: '/api/duty/schedules/batch',
      method: 'post',
      data
    });
  },

  // 获取推荐值班人员
  getRecommendedPersonnel(date, shiftType) {
    return request({
      url: '/api/duty/recommendations',
      method: 'get',
      params: { date, shiftType }
    });
  },

  // 调班
  swapSchedule(scheduleId1, scheduleId2) {
    return request({
      url: '/api/duty/schedules/swap',
      method: 'post',
      data: { scheduleId1, scheduleId2 }
    });
  },

  // 获取统计数据
  getStatistics() {
    return request({
      url: '/api/duty/statistics',
      method: 'get'
    });
  },

  // 生成人员二维码
  generateQRCode(personnelId) {
    return request({
      url: `/api/duty/personnel/${personnelId}/qrcode`,
      method: 'post'
    });
  },

  // 导出值班报表
  exportReport(startDate, endDate) {
    return request({
      url: '/api/duty/export',
      method: 'get',
      params: { startDate, endDate },
      responseType: 'blob'
    });
  },

  // 获取值班人员详情
  getPersonnelDetail(id) {
    return request({
      url: `/api/duty/personnel/${id}`,
      method: 'get'
    });
  },

  // 获取值班安排详情
  getScheduleDetail(id) {
    return request({
      url: `/api/duty/schedules/${id}`,
      method: 'get'
    });
  },

  // 更新人员状态（激活/停用）
  updatePersonnelStatus(id, status) {
    return request({
      url: `/api/duty/personnel/${id}/status`,
      method: 'patch',
      data: { status }
    });
  },

  // 设置人员请假
  setPersonnelLeave(id, leaveData) {
    return request({
      url: `/api/duty/personnel/${id}/leave`,
      method: 'post',
      data: leaveData
    });
  },

  // 获取值班历史
  getDutyHistory(personnelId, params) {
    return request({
      url: `/api/duty/personnel/${personnelId}/history`,
      method: 'get',
      params
    });
  }
};

// 紧急呼叫API接口
export const getEmergencyAPI = () => {
  return {
    // 获取当前值班人员
    getCurrentDutyPersonnel() {
      return request({
        url: '/api/emergency/current-duty',
        method: 'get'
      });
    },

    // 发送紧急呼叫
    sendEmergencyCall(data) {
      return request({
        url: '/api/emergency/call',
        method: 'post',
        data
      });
    },

    // 响应呼叫
    respondCall(callId, responseData) {
      return request({
        url: `/api/emergency/call/${callId}/respond`,
        method: 'post',
        data: responseData
      });
    },

    // 取消呼叫
    cancelCall(callId, reason) {
      return request({
        url: `/api/emergency/call/${callId}/cancel`,
        method: 'post',
        data: { reason }
      });
    },

    // 重新呼叫
    redialCall(callId) {
      return request({
        url: `/api/emergency/call/${callId}/redial`,
        method: 'post'
      });
    },

    // 上报呼叫
    escalateCall(callId) {
      return request({
        url: `/api/emergency/call/${callId}/escalate`,
        method: 'post'
      });
    },

    // 获取呼叫状态
    getCallStatus(callId) {
      return request({
        url: `/api/emergency/call/${callId}/status`,
        method: 'get'
      });
    },

    // 获取呼叫历史
    getRecentCalls(params = {}) {
      return request({
        url: '/api/emergency/calls/recent',
        method: 'get',
        params
      });
    },

    // 获取完整呼叫历史
    getCallHistory(params = {}) {
      return request({
        url: '/api/emergency/calls/history',
        method: 'get',
        params
      });
    },

    // 更新位置
    updateLocation(callId, location) {
      return request({
        url: `/api/emergency/call/${callId}/location`,
        method: 'post',
        data: { location }
      });
    },

    // 发送聊天消息
    sendChatMessage(callId, message) {
      return request({
        url: `/api/emergency/call/${callId}/chat`,
        method: 'post',
        data: { message }
      });
    },

    // 完成呼叫
    completeCall(callId, result) {
      return request({
        url: `/api/emergency/call/${callId}/complete`,
        method: 'post',
        data: { result }
      });
    },

    // 获取呼叫统计
    getStatistics(params = {}) {
      return request({
        url: '/api/emergency/statistics',
        method: 'get',
        params
      });
    },

    // 验证QR码
    verifyQRCode(qrData) {
      return request({
        url: '/api/emergency/verify-qr',
        method: 'post',
        data: qrData
      });
    },

    // 生成位置QR码
    generateLocationQR(locationId) {
      return request({
        url: '/api/emergency/generate-qr',
        method: 'post',
        data: { locationId }
      });
    },

    // 获取附近值班人员
    getNearbyPersonnel(location, radius = 5000) {
      return request({
        url: '/api/emergency/nearby-personnel',
        method: 'get',
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius
        }
      });
    },

    // 批量呼叫
    batchCall(personnelIds, data) {
      return request({
        url: '/api/emergency/batch-call',
        method: 'post',
        data: {
          personnelIds,
          ...data
        }
      });
    },

    // 获取呼叫详情
    getCallDetail(callId) {
      return request({
        url: `/api/emergency/call/${callId}`,
        method: 'get'
      });
    },

    // 添加呼叫备注
    addCallNote(callId, note) {
      return request({
        url: `/api/emergency/call/${callId}/note`,
        method: 'post',
        data: { note }
      });
    },

    // 上传呼叫附件
    uploadAttachment(callId, file) {
      const formData = new FormData();
      formData.append('file', file);

      return request({
        url: `/api/emergency/call/${callId}/attachment`,
        method: 'post',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
  };
};