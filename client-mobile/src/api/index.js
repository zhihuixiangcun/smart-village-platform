import http from '@/utils/request'

/**
 * API模块
 * 按功能模块组织API接口
 */

// ===== 认证模块 =====
export const auth = {
  /**
   * 用户登录
   * @param {Object} credentials - 登录凭证
   * @param {string} credentials.phone - 手机号
   * @param {string} credentials.password - 密码
   * @param {string} credentials.code - 验证码（可选）
   */
  login: (credentials) => {
    return http.post('/auth/login', credentials)
  },

  /**
   * 刷新Token
   * @param {string} refreshToken - 刷新令牌
   */
  refreshToken: (refreshToken) => {
    return http.post('/auth/refresh', { refreshToken })
  },

  /**
   * 用户登出
   */
  logout: () => {
    return http.post('/auth/logout')
  },

  /**
   * 验证Token
   */
  validateToken: () => {
    return http.get('/auth/validate')
  },

  /**
   * 发送验证码
   * @param {string} phone - 手机号
   */
  sendCode: (phone) => {
    return http.post('/auth/send-code', { phone })
  },

  /**
   * 忘记密码
   * @param {Object} data - 重置数据
   */
  forgotPassword: (data) => {
    return http.post('/auth/forgot-password', data)
  }
}

// ===== 用户模块 =====
export const user = {
  /**
   * 获取用户详细信息
   */
  getUserDetail: () => {
    return http.get('/user/profile')
  },

  /**
   * 更新用户信息
   * @param {Object} data - 用户数据
   */
  updateProfile: (data) => {
    return http.put('/user/profile', data)
  },

  /**
   * 上传头像
   * @param {string} filePath - 本地文件路径
   */
  uploadAvatar: (filePath) => {
    return http.upload('/user/avatar', filePath, { name: 'avatar' })
  },

  /**
   * 修改密码
   * @param {Object} data - 密码数据
   */
  changePassword: (data) => {
    return http.post('/user/change-password', data)
  },

  /**
   * 绑定手机号
   * @param {Object} data - 绑定数据
   */
  bindPhone: (data) => {
    return http.post('/user/bind-phone', data)
  },

  /**
   * 实名认证
   * @param {Object} data - 认证数据
   */
  realNameVerify: (data) => {
    return http.post('/user/real-name-verify', data)
  },

  /**
   * 获取用户积分
   */
  getPoints: () => {
    return http.get('/user/points')
  },

  /**
   * 获取用户统计数据
   */
  getStats: () => {
    return http.get('/user/stats')
  }
}

// ===== 村务治理模块 =====
export const village = {
  // 公告相关
  announcement: {
    /**
     * 获取公告列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/village/announcements', params)
    },

    /**
     * 获取公告详情
     * @param {string} id - 公告ID
     */
    getDetail: (id) => {
      return http.get(`/village/announcements/${id}`)
    },

    /**
     * 标记公告为已读
     * @param {string} id - 公告ID
     */
    markAsRead: (id) => {
      return http.post(`/village/announcements/${id}/read`)
    }
  },

  // 会议相关
  meeting: {
    /**
     * 获取会议列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/village/meetings', params)
    },

    /**
     * 获取会议详情
     * @param {string} id - 会议ID
     */
    getDetail: (id) => {
      return http.get(`/village/meetings/${id}`)
    },

    /**
     * 报名参加会议
     * @param {string} id - 会议ID
     */
    register: (id) => {
      return http.post(`/village/meetings/${id}/register`)
    },

    /**
     * 取消会议报名
     * @param {string} id - 会议ID
     */
    cancelRegister: (id) => {
      return http.delete(`/village/meetings/${id}/register`)
    }
  },

  // 投票相关
  vote: {
    /**
     * 获取投票列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/village/votes', params)
    },

    /**
     * 获取投票详情
     * @param {string} id - 投票ID
     */
    getDetail: (id) => {
      return http.get(`/village/votes/${id}`)
    },

    /**
     * 提交投票
     * @param {string} id - 投票ID
     * @param {Array} options - 选项ID数组
     */
    submit: (id, options) => {
      return http.post(`/village/votes/${id}/vote`, { options })
    }
  },

  // 财务相关
  finance: {
    /**
     * 获取财务公示列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/village/finance', params)
    },

    /**
     * 获取财务详情
     * @param {string} id - 财务记录ID
     */
    getDetail: (id) => {
      return http.get(`/village/finance/${id}`)
    }
  }
}

// ===== 村民服务模块 =====
export const services = {
  /**
   * 获取一户一码
   */
  getHouseholdQR: () => {
    return http.get('/services/household-qr')
  },

  /**
   * 扫码获取户信息
   * @param {string} qrCode - 二维码内容
   */
  scanHouseholdQR: (qrCode) => {
    return http.post('/services/household-qr/scan', { qrCode })
  },

  // 办事申请
  application: {
    /**
     * 获取办事申请列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/services/applications', params)
    },

    /**
     * 创建办事申请
     * @param {Object} data - 申请数据
     */
    create: (data) => {
      return http.post('/services/applications', data)
    },

    /**
     * 获取申请详情
     * @param {string} id - 申请ID
     */
    getDetail: (id) => {
      return http.get(`/services/applications/${id}`)
    },

    /**
     * 取消申请
     * @param {string} id - 申请ID
     */
    cancel: (id) => {
      return http.delete(`/services/applications/${id}`)
    }
  },

  // 证件办理
  certificate: {
    /**
     * 获取证件列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/services/certificates', params)
    },

    /**
     * 申请证件
     * @param {Object} data - 证件申请数据
     */
    apply: (data) => {
      return http.post('/services/certificates', data)
    }
  },

  // 福利申请
  welfare: {
    /**
     * 获取福利列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/services/welfares', params)
    },

    /**
     * 申请福利
     * @param {Object} data - 福利申请数据
     */
    apply: (data) => {
      return http.post('/services/welfares', data)
    }
  }
}

// ===== 生活服务模块 =====
export const life = {
  // 电商
  ecommerce: {
    /**
     * 获取商品列表
     * @param {Object} params - 查询参数
     */
    getProducts: (params) => {
      return http.get('/life/ecommerce/products', params)
    },

    /**
     * 获取商品详情
     * @param {string} id - 商品ID
     */
    getProductDetail: (id) => {
      return http.get(`/life/ecommerce/products/${id}`)
    },

    /**
     * 创建订单
     * @param {Object} data - 订单数据
     */
    createOrder: (data) => {
      return http.post('/life/ecommerce/orders', data)
    }
  },

  // 拼车
  carpooling: {
    /**
     * 获取拼车列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/life/carpooling', params)
    },

    /**
     * 发布拼车信息
     * @param {Object} data - 拼车数据
     */
    publish: (data) => {
      return http.post('/life/carpooling', data)
    },

    /**
     * 参与拼车
     * @param {string} id - 拼车ID
     */
    join: (id) => {
      return http.post(`/life/carpooling/${id}/join`)
    }
  },

  // 邻里互助
  neighborhood: {
    /**
     * 获取互助列表
     * @param {Object} params - 查询参数
     */
    getList: (params) => {
      return http.get('/life/neighborhood', params)
    },

    /**
     * 发布互助信息
     * @param {Object} data - 互助数据
     */
    publish: (data) => {
      return http.post('/life/neighborhood', data)
    },

    /**
     * 接受互助
     * @param {string} id - 互助ID
     */
    accept: (id) => {
      return http.post(`/life/neighborhood/${id}/accept`)
    }
  },

  // 农资集采
  agricultural: {
    /**
     * 获取农资列表
     * @param {Object} params - 查询参数
     */
    getSupplies: (params) => {
      return http.get('/life/agricultural/supplies', params)
    },

    /**
     * 参与集采
     * @param {string} id - 集采ID
     * @param {Object} data - 参与数据
     */
    join: (id, data) => {
      return http.post(`/life/agricultural/supplies/${id}/join`, data)
    }
  }
}

// ===== 农技社区模块 =====
export const agriculture = {
  /**
   * 获取知识库列表
   * @param {Object} params - 查询参数
   */
  getKnowledge: (params) => {
    return http.get('/agriculture/knowledge', params)
  },

  /**
   * 获取知识详情
   * @param {string} id - 知识ID
   */
  getKnowledgeDetail: (id) => {
    return http.get(`/agriculture/knowledge/${id}`)
  },

  // 专家问答
  ask: {
    /**
     * 获取问题列表
     * @param {Object} params - 查询参数
     */
    getQuestions: (params) => {
      return http.get('/agriculture/ask', params)
    },

    /**
     * 提问
     * @param {Object} data - 问题数据
     */
    askQuestion: (data) => {
      return http.post('/agriculture/ask', data)
    },

    /**
     * 回答问题
     * @param {string} id - 问题ID
     * @param {string} answer - 回答内容
     */
    answer: (id, answer) => {
      return http.post(`/agriculture/ask/${id}/answer`, { answer })
    }
  },

  // 病虫害识别
  disease: {
    /**
     * 识别病虫害
     * @param {string} filePath - 图片路径
     */
    identify: (filePath) => {
      return http.upload('/agriculture/disease/identify', filePath, {
        name: 'image',
        apiType: 'village'
      })
    }
  },

  // 农友圈
  community: {
    /**
     * 获取农友圈动态
     * @param {Object} params - 查询参数
     */
    getPosts: (params) => {
      return http.get('/agriculture/community', params)
    },

    /**
     * 发布动态
     * @param {Object} data - 动态数据
     */
    publishPost: (data) => {
      return http.post('/agriculture/community', data)
    },

    /**
     * 点赞
     * @param {string} id - 动态ID
     */
    like: (id) => {
      return http.post(`/agriculture/community/${id}/like`)
    },

    /**
     * 评论
     * @param {string} id - 动态ID
     * @param {string} content - 评论内容
     */
    comment: (id, content) => {
      return http.post(`/agriculture/community/${id}/comment`, { content })
    }
  }
}

// ===== 离线同步模块 =====
export const sync = {
  /**
   * 获取待同步数据
   */
  getPending: () => {
    return http.get('/sync/pending')
  },

  /**
   * 上传离线数据
   * @param {Array} data - 离线数据数组
   */
  upload: (data) => {
    return http.post('/sync/upload', { data })
  },

  /**
   * 获取同步状态
   */
  getStatus: () => {
    return http.get('/sync/status')
  }
}

// 导出所有API
export default {
  auth,
  user,
  village,
  services,
  life,
  agriculture,
  sync
}