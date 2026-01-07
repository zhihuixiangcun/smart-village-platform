import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '/api',
  timeout: 15000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const userStore = useUserStore()

    // 在请求头中添加token
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }

    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }

    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data

    // 如果返回的状态码为200，说明接口请求成功，可以正常拿到数据
    if (response.status === 200) {
      return res
    }

    // 其他状态码都当作错误处理
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  async error => {
    console.error('响应错误:', error)

    const { response } = error
    const userStore = useUserStore()

    if (response) {
      const { status, data } = response

      switch (status) {
        case 401:
          // 未授权，token过期或无效
          console.warn('[Request] 401 未授权错误')

          // 尝试刷新token
          try {
            await userStore.doRefreshToken()
            // 重新发送原请求
            return service.request(error.config)
          } catch (refreshError) {
            // 刷新失败，跳转到统一登录页
            console.warn('[Request] Token刷新失败，跳转到登录页')
            await userStore.logout(false)
            router.push({
              name: 'unified-login',
              query: { redirect: window.location.pathname + window.location.search }
            })
            return Promise.reject(error)
          }

        case 403:
          // 没有权限
          ElMessage.error(data?.message || '没有访问权限')
          router.push('/403')
          break

        case 404:
          ElMessage.error('请求的资源不存在')
          break

        case 500:
          ElMessage.error('服务器内部错误')
          break

        case 502:
        case 503:
        case 504:
          ElMessage.error('服务器暂时无法访问，请稍后重试')
          break

        default:
          ElMessage.error(data?.message || `请求失败 (${status})`)
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络连接')
    } else if (error.message === 'Network Error') {
      ElMessage.error('网络连接异常，请检查网络')
    } else {
      ElMessage.error('未知错误，请稍后重试')
    }

    return Promise.reject(error)
  }
)

// 请求方法封装
const request = {
  // GET请求
  get(url, params = {}, config = {}) {
    return service({
      url,
      method: 'get',
      params,
      ...config
    })
  },

  // POST请求
  post(url, data = {}, config = {}) {
    return service({
      url,
      method: 'post',
      data,
      ...config
    })
  },

  // PUT请求
  put(url, data = {}, config = {}) {
    return service({
      url,
      method: 'put',
      data,
      ...config
    })
  },

  // DELETE请求
  delete(url, config = {}) {
    return service({
      url,
      method: 'delete',
      ...config
    })
  },

  // PATCH请求
  patch(url, data = {}, config = {}) {
    return service({
      url,
      method: 'patch',
      data,
      ...config
    })
  },

  // 文件上传
  upload(url, formData, config = {}) {
    return service({
      url,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...config
    })
  },

  // 文件下载
  download(url, params = {}, filename = '') {
    return service({
      url,
      method: 'get',
      params,
      responseType: 'blob'
    }).then(response => {
      const blob = new Blob([response.data])
      const downloadElement = document.createElement('a')
      const href = window.URL.createObjectURL(blob)

      downloadElement.href = href
      downloadElement.download = filename || 'download'
      document.body.appendChild(downloadElement)
      downloadElement.click()
      document.body.removeChild(downloadElement)
      window.URL.revokeObjectURL(href)
    })
  }
}

// 批量请求
export const batchRequest = async (requests) => {
  try {
    const results = await Promise.allSettled(requests)
    return results.map((result, index) => ({
      index,
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }))
  } catch (error) {
    console.error('批量请求失败:', error)
    throw error
  }
}

// 取消请求
export const CancelToken = axios.CancelToken

// 创建可取消的请求
export const createCancelableRequest = () => {
  const source = CancelToken.source()
  return {
    token: source.token,
    cancel: source.cancel
  }
}

export default request
