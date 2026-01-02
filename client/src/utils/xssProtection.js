/**
 * XSS防护工具
 * 提供输入验证、输出转义和安全处理功能
 */

/**
 * HTML转义函数
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的安全字符串
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return str

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }

  return str.replace(/[&<>"'`=\/]/g, (match) => htmlEscapes[match])
}

/**
 * 属性值转义
 * @param {string} str - 需要转义的属性值
 * @returns {string} 转义后的安全属性值
 */
export const escapeAttribute = (str) => {
  if (typeof str !== 'string') return str

  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * URL转义
 * @param {string} url - 需要转义的URL
 * @returns {string} 转义后的安全URL
 */
export const escapeUrl = (url) => {
  if (typeof url !== 'string') return url

  try {
    // 使用encodeURIComponent进行URL编码
    return encodeURIComponent(url)
  } catch (error) {
    console.error('URL转义失败:', error)
    return ''
  }
}

/**
 * JavaScript字符串转义
 * @param {string} str - 需要转义的JS字符串
 * @returns {string} 转义后的安全JS字符串
 */
export const escapeJsString = (str) => {
  if (typeof str !== 'string') return str

  const jsEscapes = {
    '\\': '\\\\',
    '"': '\\"',
    "'": "\\'",
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\b': '\\b',
    '\f': '\\f',
    '\v': '\\v',
    '\0': '\\0'
  }

  return str.replace(/[\\"'\n\r\t\b\f\v\0]/g, (match) => jsEscapes[match])
}

/**
 * 输入验证 - 检查是否包含危险字符
 * @param {string} input - 需要验证的输入
 * @returns {Object} 验证结果
 */
export const validateInput = (input) => {
  if (typeof input !== 'string') {
    return { valid: false, reason: '输入必须是字符串' }
  }

  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /@import/gi,
    /binding\s*:/gi
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      return {
        valid: false,
        reason: '输入包含潜在危险的脚本代码',
        pattern: pattern.source
      }
    }
  }

  return { valid: true }
}

/**
 * 安全的HTML内容处理
 * @param {string} html - HTML内容
 * @param {Object} options - 处理选项
 * @returns {string} 处理后的安全HTML
 */
export const sanitizeHtml = (html, options = {}) => {
  if (typeof html !== 'string') return html

  const {
    allowedTags = ['p', 'br', 'strong', 'em', 'u', 'span', 'div'],
    allowedAttributes = ['class', 'id', 'style'],
    removeComments = true
  } = options

  let sanitized = html

  // 移除HTML注释
  if (removeComments) {
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '')
  }

  // 移除危险的标签和属性
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'applet', 'meta', 'link', 'style']
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gis')
    sanitized = sanitized.replace(regex, '')
  })

  // 移除事件处理器
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')

  // 移除javascript:协议
  sanitized = sanitized.replace(/javascript\s*:/gi, '')

  return sanitized
}

/**
 * 表单数据验证
 * @param {Object} formData - 表单数据
 * @param {Object} rules - 验证规则
 * @returns {Object} 验证结果
 */
export const validateFormData = (formData, rules) => {
  const errors = []
  const sanitizedData = {}

  Object.keys(rules).forEach(field => {
    const value = formData[field]
    const rule = rules[field]

    // 必填验证
    if (rule.required && (!value || value.trim() === '')) {
      errors.push(`${field}是必填项`)
      return
    }

    // 跳过空值的进一步验证
    if (!value) return

    // 类型验证
    if (rule.type && typeof value !== rule.type) {
      errors.push(`${field}类型不正确`)
      return
    }

    // 长度验证
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${field}长度不能超过${rule.maxLength}个字符`)
      return
    }

    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${field}长度不能少于${rule.minLength}个字符`)
      return
    }

    // XSS安全验证
    const xssCheck = validateInput(value)
    if (!xssCheck.valid) {
      errors.push(`${field}包含不安全内容`)
      return
    }

    // 正则表达式验证
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${field}格式不正确`)
      return
    }

    // 转义并存储安全的数据
    if (rule.escapeHtml) {
      sanitizedData[field] = escapeHtml(value)
    } else {
      sanitizedData[field] = value
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    data: sanitizedData
  }
}

/**
 * 创建安全的DOM内容
 * @param {string} content - 内容
 * @param {string} tag - HTML标签
 * @param {Object} attributes - 属性对象
 * @returns {HTMLElement} 安全的DOM元素
 */
export const createSafeElement = (content, tag = 'div', attributes = {}) => {
  const element = document.createElement(tag)

  // 安全设置内容
  if (content) {
    element.textContent = content // 使用textContent避免HTML注入
  }

  // 安全设置属性
  Object.keys(attributes).forEach(key => {
    if (key === 'className') {
      element.className = escapeAttribute(attributes[key])
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, escapeAttribute(attributes[key]))
    } else if (['id', 'title', 'alt'].includes(key)) {
      element.setAttribute(key, escapeAttribute(attributes[key]))
    }
  })

  return element
}

/**
 * 安全的innerHTML设置
 * @param {HTMLElement} element - 目标元素
 * @param {string} html - HTML内容
 * @param {Object} options - 清理选项
 */
export const setSafeInnerHTML = (element, html, options = {}) => {
  const sanitized = sanitizeHtml(html, options)
  element.innerHTML = sanitized
}

/**
 * CSP (Content Security Policy) 违规检测
 * @param {string} input - 输入内容
 * @returns {Object} 检测结果
 */
export const detectCSPViolations = (input) => {
  if (typeof input !== 'string') {
    return { violations: [], safe: true }
  }

  const cspPatterns = [
    { pattern: /<script/gi, type: 'script-tag', description: '脚本标签' },
    { pattern: /javascript:/gi, type: 'javascript-protocol', description: 'JavaScript协议' },
    { pattern: /on\w+\s*=/gi, type: 'event-handler', description: '事件处理器' },
    { pattern: /eval\s*\(/gi, type: 'eval-function', description: 'eval函数' },
    { pattern: /innerHTML\s*=/gi, type: 'inner-html', description: 'innerHTML赋值' }
  ]

  const violations = []

  cspPatterns.forEach(({ pattern, type, description }) => {
    if (pattern.test(input)) {
      const matches = input.match(pattern)
      violations.push({
        type,
        description,
        matches: matches || [],
        count: matches ? matches.length : 0
      })
    }
  })

  return {
    violations,
    safe: violations.length === 0,
    riskLevel: violations.length === 0 ? 'low' : violations.length <= 2 ? 'medium' : 'high'
  }
}

/**
 * 文件名安全处理
 * @param {string} filename - 文件名
 * @returns {string} 安全的文件名
 */
export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return filename

  // 移除危险字符
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+/, '') // 移除开头的点
    .replace(/\.$/, '') // 移除结尾的点
    .substring(0, 255) // 限制长度
}

/**
 * SQL注入防护
 * @param {string} input - 输入内容
 * @returns {string} 转义后的安全内容
 */
export const escapeSql = (input) => {
  if (typeof input !== 'string') return input

  const sqlEscapes = {
    "'": "''",
    '"': '""',
    '\\': '\\\\',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\x00': '\\x00',
    '\x1a': '\\x1a'
  }

  return input.replace(/['"\\\n\r\t\x00\x1a]/g, (match) => sqlEscapes[match])
}

/**
 * 批量处理对象中的字符串值
 * @param {Object} obj - 需要处理的对象
 * @param {Function} processor - 处理函数
 * @returns {Object} 处理后的对象
 */
export const processObjectStrings = (obj, processor = escapeHtml) => {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  const processed = Array.isArray(obj) ? [] : {}

  Object.keys(obj).forEach(key => {
    const value = obj[key]

    if (typeof value === 'string') {
      processed[key] = processor(value)
    } else if (typeof value === 'object' && value !== null) {
      processed[key] = processObjectStrings(value, processor)
    } else {
      processed[key] = value
    }
  })

  return processed
}

// 导出默认配置
export default {
  escapeHtml,
  escapeAttribute,
  escapeUrl,
  escapeJsString,
  validateInput,
  sanitizeHtml,
  validateFormData,
  createSafeElement,
  setSafeInnerHTML,
  detectCSPViolations,
  sanitizeFilename,
  escapeSql,
  processObjectStrings
}