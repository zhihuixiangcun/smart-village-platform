/**
 * 统一HTTP请求工具
 * 使用标准fetch API，支持拦截器、token刷新、错误处理等
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
};

// 当前环境
const ENV = import.meta.env.MODE === 'production' ? 'prod' : 'dev';

// 获取API基础地址
const getBaseUrl = (type = 'main') => {
  return BASE_URL[ENV][type];
};

// 获取Token
const getToken = () => {
  return localStorage.getItem('access_token') || '';
};

// 请求拦截器
const requestInterceptor = (config) => {
  // 添加token
  const token = getToken();
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  // 添加时间戳（防止缓存）
  if (config.method === 'GET') {
    const url = new URL(config.url, window.location.origin);
    url.searchParams.set('_t', Date.now().toString());
    config.url = url.toString();
  }

  // 添加设备信息
  config.headers = {
    ...config.headers,
    'X-Device-Platform': navigator.platform,
    'X-Device-Version': navigator.userAgent,
    'X-App-Version': '1.0.0'
  };

  console.log('请求发送:', config.url, config.body);
  return config;
};

// 响应拦截器
const responseInterceptor = async (response) => {
  const data = await response.json().catch(() => ({}));

  console.log('响应接收:', response.url, data);

  // HTTP状态码判断
  if (response.status >= 200 && response.status < 300) {
    // 业务状态码判断
    if (data.code === 0 || data.success === true) {
      return data;
    } else {
      // 业务错误
      throw {
        code: data.code,
        message: data.message || data.msg || '请求失败',
        data
      };
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
  };

  const message = errorMap[response.status] || `请求失败(${response.status})`;

  throw {
    statusCode: response.status,
    code: response.status,
    message,
    data
  };
};

// 错误处理
const errorHandler = (error) => {
  console.error('请求错误:', error);

  // Token过期
  if (error.code === 401 || error.statusCode === 401) {
    alert('登录已过期，请重新登录');
    localStorage.clear();
    window.location.href = '/login';
    throw error;
  }

  // 网络错误
  if (error.name === 'TypeError' || error.message?.includes('network')) {
    alert('网络连接失败');
    throw error;
  }

  // 超时处理
  if (error.name === 'AbortError') {
    alert('请求超时，请重试');
    throw error;
  }

  // 显示错误提示
  alert(error.message || '请求失败');

  throw error;
};

/**
 * 统一请求函数
 */
const request = async (config) => {
  // 默认配置
  const defaultConfig = {
    url: '',
    method: 'GET',
    data: {},
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  };

  // 合并配置
  let finalConfig = {
    ...defaultConfig,
    ...config,
    headers: {
      ...defaultConfig.headers,
      ...config.headers
    }
  };

  // 处理完整URL
  if (!finalConfig.url.startsWith('http')) {
    const apiType = finalConfig.apiType || 'main';
    finalConfig.url = getBaseUrl(apiType) + finalConfig.url;
  }

  // 请求拦截
  finalConfig = requestInterceptor(finalConfig);

  // 构建fetch选项
  const fetchOptions = {
    method: finalConfig.method,
    headers: finalConfig.headers
  };

  // 添加请求体
  if (['POST', 'PUT', 'PATCH'].includes(finalConfig.method.toUpperCase())) {
    fetchOptions.body = JSON.stringify(finalConfig.data);
  }

  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);
  fetchOptions.signal = controller.signal;

  try {
    // 发送请求
    const response = await fetch(finalConfig.url, fetchOptions);
    clearTimeout(timeoutId);

    // 响应处理
    return await responseInterceptor(response);
  } catch (error) {
    clearTimeout(timeoutId);
    return errorHandler(error);
  }
};

/**
 * GET请求
 */
const get = (url, data, options = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
};

/**
 * POST请求
 */
const post = (url, data, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
};

/**
 * PUT请求
 */
const put = (url, data, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
};

/**
 * DELETE请求
 */
const del = (url, data, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  });
};

/**
 * 文件上传
 */
const upload = (url, filePath, options = {}) => {
  const { formData = {}, name = 'file', apiType = 'main' } = options;
  const token = getToken();

  const fullUrl = url.startsWith('http') ? url : getBaseUrl(apiType) + url;

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append(name, filePath);

    // 添加额外表单数据
    Object.keys(formData).forEach(key => {
      formData.append(key, formData[key]);
    });

    fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        if (data.success || data.code === 0) {
          resolve(data);
        } else {
          reject({
            code: data.code,
            message: data.message || '上传失败'
          });
        }
      })
      .catch(error => {
        reject({
          message: error.message || '上传失败'
        });
      });
  });
};

/**
 * 文件下载
 */
const download = (url, options = {}) => {
  const { apiType = 'main' } = options;
  const fullUrl = url.startsWith('http') ? url : getBaseUrl(apiType) + url;

  return new Promise((resolve, reject) => {
    fetch(fullUrl)
      .then(response => {
        if (response.status === 200) {
          return response.blob();
        } else {
          throw new Error('下载失败');
        }
      })
      .then(blob => {
        // 创建下载链接
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = options.filename || 'download';
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        resolve();
      })
      .catch(error => {
        reject({
          message: error.message || '下载失败'
        });
      });
  });
};

export default {
  request,
  get,
  post,
  put,
  delete: del,
  upload,
  download
};
