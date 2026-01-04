/**
 * 操作日志服务
 * 记录用户操作行为,用于审计和追溯
 */
import { ElMessage } from 'element-plus'

const LOG_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
}

/**
 * 操作日志服务
 */
export const auditLogService = {
  /**
   * 记录日志
   * @param {Object} logData 日志数据
   */
  async log(logData) {
    try {
      const logEntry = {
        ...logData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      // 发送到服务器
      await this.sendLog(logEntry)

      // 同时存储到本地(用于离线时暂存)
      this.saveLocalLog(logEntry)
    } catch (error) {
      console.error('Log error:', error)
    }
  },

  /**
   * 发送日志到服务器
   * @param {Object} logEntry 日志条目
   */
  async sendLog(logEntry) {
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/v1/audit/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify(logEntry)
      })
    } catch (error) {
      // 网络错误时暂存到本地
      console.warn('Failed to send log, saving locally:', error)
      throw error
    }
  },

  /**
   * 保存日志到本地
   * @param {Object} logEntry 日志条目
   */
  saveLocalLog(logEntry) {
    try {
      const logs = JSON.parse(localStorage.getItem('pendingLogs') || '[]')
      logs.push(logEntry)

      // 只保留最近100条
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100)
      }

      localStorage.setItem('pendingLogs', JSON.stringify(logs))
    } catch (error) {
      console.error('Save local log error:', error)
    }
  },

  /**
   * 上传本地暂存的日志
   */
  async uploadPendingLogs() {
    try {
      const logs = JSON.parse(localStorage.getItem('pendingLogs') || '[]')

      if (logs.length === 0) return

      for (const log of logs) {
        try {
          await this.sendLog(log)
        } catch (error) {
          console.error('Upload log failed:', error)
          continue
        }
      }

      // 全部上传成功后清空本地日志
      localStorage.removeItem('pendingLogs')
      console.log(\`Uploaded \${logs.length} pending logs\`)
    } catch (error) {
      console.error('Upload pending logs error:', error)
    }
  },

  /**
   * 记录用户登录
   */
  logLogin(userId, username) {
    return this.log({
      level: LOG_LEVELS.SUCCESS,
      action: 'LOGIN',
      module: 'AUTH',
      description: \`用户\${username}登录成功\`,
      userId,
      username,
      ip: await this.getIP()
    })
  },

  /**
   * 记录用户登出
   */
  logLogout(userId, username) {
    return this.log({
      level: LOG_LEVELS.INFO,
      action: 'LOGOUT',
      module: 'AUTH',
      description: \`用户\${username}登出\`,
      userId,
      username
    })
  },

  /**
   * 记录数据查看
   */
  logDataView(module, dataType, recordId) {
    return this.log({
      level: LOG_LEVELS.INFO,
      action: 'VIEW',
      module,
      description: \`查看\${dataType}数据(ID:\${recordId})\`,
      dataType,
      recordId
    })
  },

  /**
   * 记录数据修改
   */
  logDataUpdate(module, dataType, recordId, changes) {
    return this.log({
      level: LOG_LEVELS.WARNING,
      action: 'UPDATE',
      module,
      description: \`修改\${dataType}数据(ID:\${recordId})\`,
      dataType,
      recordId,
      changes: JSON.stringify(changes)
    })
  },

  /**
   * 记录数据删除
   */
  logDataDelete(module, dataType, recordId) {
    return this.log({
      level: LOG_LEVELS.ERROR,
      action: 'DELETE',
      module,
      description: \`删除\${dataType}数据(ID:\${recordId})\`,
      dataType,
      recordId
    })
  },

  /**
   * 记录敏感数据访问
   */
  logSensitiveDataAccess(module, dataType, recordId, reason) {
    return this.log({
      level: LOG_LEVELS.WARNING,
      action: 'SENSITIVE_ACCESS',
      module,
      description: \`访问敏感\${dataType}数据(ID:\${recordId},原因:\${reason})\`,
      dataType,
      recordId,
      reason
    })
  },

  /**
   * 记录文件下载
   */
  logFileDownload(fileName, fileType) {
    return this.log({
      level: LOG_LEVELS.INFO,
      action: 'DOWNLOAD',
      module: 'FILE',
      description: \`下载文件:\${fileName}(类型:\${fileType})\`,
      fileName,
      fileType
    })
  },

  /**
   * 记录申请提交
   */
  logApplicationSubmit(serviceType, serviceName) {
    return this.log({
      level: LOG_LEVELS.SUCCESS,
      action: 'SUBMIT',
      module: 'SERVICE',
      description: \`提交申请:\${serviceName}\`,
      serviceType,
      serviceName
    })
  },

  /**
   * 记录权限变更
   */
  logPermissionChange(permissionType, oldValue, newValue) {
    return this.log({
      level: LOG_LEVELS.WARNING,
      action: 'PERMISSION_CHANGE',
      module: 'PERMISSION',
      description: \`权限变更:\${permissionType}\`,
      permissionType,
      oldValue,
      newValue
    })
  },

  /**
   * 记录错误
   */
  logError(module, error, context = {}) {
    return this.log({
      level: LOG_LEVELS.ERROR,
      action: 'ERROR',
      module,
      description: \`错误:\${error.message || error}\`,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: JSON.stringify(context)
    })
  },

  /**
   * 获取用户IP地址
   */
  async getIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch (error) {
      return 'unknown'
    }
  },

  /**
   * 查询日志
   */
  async queryLogs(filters = {}) {
    try {
      const token = localStorage.getItem('token')
      const queryParams = new URLSearchParams()

      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key])
        }
      })

      const response = await fetch(\`/api/v1/audit/logs?\${queryParams}\`, {
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      })

      if (!response.ok) {
        throw new Error('查询日志失败')
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Query logs error:', error)
      throw error
    }
  }
}

/**
 * 权限管理服务
 */
export const permissionService = {
  /**
   * 检查权限
   * @param {string} permission 权限标识
   * @returns {boolean} 是否有权限
   */
  hasPermission(permission) {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return false

      const user = JSON.parse(userStr)
      const permissions = user.permissions || []

      return permissions.includes(permission) || user.role === 'admin'
    } catch (error) {
      console.error('Check permission error:', error)
      return false
    }
  },

  /**
   * 检查多个权限(满足其一即可)
   */
  hasAnyPermission(permissions) {
    return permissions.some(p => this.hasPermission(p))
  },

  /**
   * 检查多个权限(必须全部满足)
   */
  hasAllPermissions(permissions) {
    return permissions.every(p => this.hasPermission(p))
  },

  /**
   * 检查数据访问权限
   * @param {string} dataType 数据类型
   * @param {string} action 操作类型
   * @param {Object} data 数据对象
   */
  checkDataAccess(dataType, action, data = {}) {
    const userStr = localStorage.getItem('user')
    if (!userStr) return false

    const user = JSON.parse(userStr)
    const userId = user.id || user._id

    // 管理员有所有权限
    if (user.role === 'admin') return true

    // 检查是否是自己的数据
    if (data.userId === userId || data.createdBy === userId) {
      return true
    }

    // 检查特定权限
    const permission = \`\${dataType}:\${action}\`
    return this.hasPermission(permission)
  },

  /**
   * 检查敏感数据访问
   * @param {string} dataType 数据类型
   * @param {string} recordId 记录ID
   */
  async checkSensitiveAccess(dataType, recordId) {
    const hasPermission = this.checkDataAccess(dataType, 'view', { recordId })

    if (hasPermission) {
      // 记录敏感数据访问
      await auditLogService.logSensitiveDataAccess(
        dataType,
        recordId,
        '业务需要'
      )
    }

    return hasPermission
  },

  /**
   * 权限不足提示
   */
  permissionDenied() {
    ElMessage.error('您没有权限执行此操作')
  },

  /**
   * 获取用户权限列表
   */
  getUserPermissions() {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return []

      const user = JSON.parse(userStr)
      return user.permissions || []
    } catch (error) {
      console.error('Get user permissions error:', error)
      return []
    }
  }
}

/**
 * 数据安全中间件
 * 在Axios拦截器中使用
 */
export const securityMiddleware = {
  /**
   * 请求加密 - 自动加密敏感字段
   */
  encryptRequest(config) {
    // 检查是否需要加密
    const shouldEncrypt = config.encrypt !== false && config.data

    if (!shouldEncrypt) return config

    // 获取接口对应的敏感字段
    const url = config.url || ''
    const fields = this.getSensitiveFields(url)

    if (fields.length > 0) {
      config.data = encryptionService.encryptObject(config.data, fields)
      config._encrypted = true
    }

    return config
  },

  /**
   * 响应解密 - 自动解密敏感字段
   */
  decryptResponse(response) {
    if (!response.config?._encrypted) return response

    const url = response.config.url || ''
    const fields = this.getSensitiveFields(url)

    if (fields.length > 0 && response.data) {
      response.data = encryptionService.decryptObject(response.data, fields)
    }

    return response
  },

  /**
   * 获取接口对应的敏感字段
   */
  getSensitiveFields(url) {
    const fieldMap = {
      '/api/v1/residents': sensitiveFields.resident,
      '/api/v1/users': sensitiveFields.user,
      '/api/v1/finance': sensitiveFields.finance,
      '/api/v1/documents': sensitiveFields.document
    }

    for (const [pattern, fields] of Object.entries(fieldMap)) {
      if (url.includes(pattern)) {
        return fields
      }
    }

    return []
  },

  /**
   * 添加安全头
   */
  addSecurityHeaders(config) {
    config.headers = {
      ...config.headers,
      'X-Request-ID': this.generateRequestId(),
      'X-Timestamp': Date.now().toString()
    }

    return config
  },

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return \`req_\${Date.now()}_\${Math.random().toString(36).substring(2, 15)}\`
  }
}

export default auditLogService
