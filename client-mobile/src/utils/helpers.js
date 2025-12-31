export const request = (config) => {
  // 默认配置
  const defaultConfig = {
    timeout: 30000,
    header: {
      'Content-Type': 'application/json'
    }
  }

  // 合并配置
  const finalConfig = {
    ...defaultConfig,
    ...config
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: finalConfig.url,
      method: finalConfig.method || 'GET',
      data: finalConfig.data,
      header: finalConfig.header,
      timeout: finalConfig.timeout,
      success: (response) => {
        const { statusCode, data } = response

        if (statusCode >= 200 && statusCode < 300) {
          resolve(data)
        } else {
          reject({
            statusCode,
            message: '请求失败'
          })
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

export const get = (url, data) => {
  return request({
    url,
    method: 'GET',
    data
  })
}

export const post = (url, data) => {
  return request({
    url,
    method: 'POST',
    data
  })
}

export default {
  request,
  get,
  post
}
