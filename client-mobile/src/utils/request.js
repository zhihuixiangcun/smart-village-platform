import { useUserStore } from '@/store/user'
import { useNetworkStore } from '@/store/network'

/**
 * 统一HTTP请求工具
 * 封装uni.request，支持拦截器、token刷新、错误处理等
 */

// API基础地址
const BASE_URL = {
  dev: {
    main: 'http://localhost:3001/api/v1',
    village: 'http://localhost:5000/api/v1'
  },
  prod: {
    main: 'https://api.smartvillage.com/api/v1',
    village: 'https://village-api.smartvillage.com/api/v1'
  }
}

// 当前环境
const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev'

// 获取API基础地址
const getBaseUrl = (type = 'main') => {
  return BASE_URL[ENV][type]
}

// 请求拦截器
const requestInterceptor = (config) => {
  // 添加token
  const userStore = useUserStore()
  if (userStore.accessToken) {
    config.header = {
      ...config.header,
      'Authorization': `Bearer ${userStore.accessToken}`
    }
  }

  // 添加时间戳（防止缓存）
  if (config.method === 'GET') {
    config.data = {
      ...config.data,
      _t: Date.now()
    }
  }

  // 添加设备信息
  const systemInfo = uni.getSystemInfoSync()
  config.header = {
    ...config.header,
    'X-Device-Platform': systemInfo.platform,
    'X-Device-Version': systemInfo.system,
    'X-App-Version': '1.0.0'
  }

  console.log('请求发送:', config.url, config.data)
  return config
}

// 响应拦截器
const responseInterceptor = (response) => {
  const { statusCode, data } = response

  console.log('响应接收:', response.config.url, data)

  // HTTP状态码判断
  if (statusCode >= 200 && statusCode < 300) {
    // 业务状态码判断
    if (data.code === 0 || data.success === true) {
      return Promise.resolve(data)
    } else {
      // 业务错误
      return Promise.reject({
        code: data.code,
        message: data.message || data.msg || '请求失败',
        data
      })
    }
  }

  // HTTP错误
  const errorMap = {
    400: '请求参数错误',
    401: '未授权，请重新登录',
    403: '拒绝访问',
    404: '请求资源不存在',
    405: '请求方法不允许',
    408: '请求超时',
    429: '请求过于频繁',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务不可用',
    504: '网关超时'
  }

  const message = errorMap[statusCode] || `请求失败(${statusCode})`

  return Promise.reject({
    statusCode,
    code: statusCode,
    message,
    data
  })
}

// 错误处理
const errorHandler = (error) => {
  console.error('请求错误:', error)

  // Token过期，尝试刷新
  if (error.code === 401 || error.statusCode === 401) {
    const userStore = useUserStore()
    return userStore.refreshAccessToken().then(success => {
      if (success) {
        // 刷新成功，重试原请求
        return request(error.config)
      } else {
        // 刷新失败，跳转登录
        uni.showToast({
          title: '登录已过期，请重新登录',
          icon: 'none'
        })
        setTimeout(() => {
          userStore.logout()
        }, 1500)
        return Promise.reject(error)
      }
    })
  }

  // 网络错误处理
  if (error.errMsg && error.errMsg.includes('network')) {
    const networkStore = useNetworkStore()
    networkStore.setNetworkType('none')
    uni.showToast({
      title: '网络连接失败',
      icon: 'none'
    })
    return Promise.reject(error)
  }

  // 超时处理
  if (error.errMsg && error.errMsg.includes('timeout')) {
    uni.showToast({
      title: '请求超时，请重试',
      icon: 'none'
    })
    return Promise.reject(error)
  }

  // 显示错误提示
  uni.showToast({
    title: error.message || '请求失败',
    icon: 'none'
  })

  return Promise.reject(error)
}

/**
 * 统一请求函数
 */
const request = (config) => {
  // 默认配置
  const defaultConfig = {
    url: '',
    method: 'GET',
    data: {},
    header: {
      'Content-Type': 'application/json'
    },
    timeout: 30000,
    dataType: 'json'
  }

  // 合并配置
  const finalConfig = {
    ...defaultConfig,
    ...config,
    header: {
      ...defaultConfig.header,
      ...config.header
    }
  }

  // 处理完整URL
  if (!finalConfig.url.startsWith('http')) {
    // 判断使用哪个API地址
    const apiType = finalConfig.apiType || 'main'
    finalConfig.url = getBaseUrl(apiType) + finalConfig.url
  }

  // 请求拦截
  const interceptedConfig = requestInterceptor(finalConfig)

  // 发送请求
  return new Promise((resolve, reject) => {
    uni.request({
      ...interceptedConfig,
      success: (response) => {
        responseInterceptor({
          ...response,
          config: interceptedConfig
        }).then(resolve).catch(reject)
      },
      fail: (error) => {
        errorHandler({
          ...error,
          config: interceptedConfig
        }).then(resolve).catch(reject)
      }
    })
  })
}

/**
 * GET请求
 */
const get = (url, data, options = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  })
}

/**
 * POST请求
 */
const post = (url, data, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

/**
 * PUT请求
 */
const put = (url, data, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

/**
 * DELETE请求
 */
const del = (url, data, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  })
}

/**
 * 文件上传
 */
const upload = (url, filePath, options = {}) => {
  const { formData = {}, name = 'file', apiType = 'main' } = options

  const userStore = useUserStore()

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: url.startsWith('http') ? url : getBaseUrl(apiType) + url,
      filePath,
      name,
      formData,
      header: {
        'Authorization': `Bearer ${userStore.accessToken}`
      },
      success: (response) => {
        try {
          const data = JSON.parse(response.data)
          if (data.success || data.code === 0) {
            resolve(data)
          } else {
            reject({
              code: data.code,
              message: data.message || '上传失败'
            })
          }
        } catch (error) {
          reject({
            message: '响应解析失败'
          })
        }
      },
      fail: (error) => {
        reject({
          message: error.errMsg || '上传失败'
        })
      }
    })
  })
}

/**
 * 文件下载
 */
const download = (url, options = {}) => {
  const { apiType = 'main' } = options

  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url: url.startsWith('http') ? url : getBaseUrl(apiType) + url,
      success: (response) => {
        if (response.statusCode === 200) {
          resolve(response.tempFilePath)
        } else {
          reject({
            statusCode: response.statusCode,
            message: '下载失败'
          })
        }
      },
      fail: (error) => {
        reject({
          message: error.errMsg || '下载失败'
        })
      }
    })
  })
}

export default {
  request,
  get,
  post,
  put,
  delete: del,
  upload,
  download
}