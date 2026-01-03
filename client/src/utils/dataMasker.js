/**
 * 数据脱敏工具
 * 提供各种数据类型的脱敏处理功能
 */

/**
 * 数据脱敏规则配置
 */
const MASK_RULES = {
  // 身份证号：显示前6位和后4位
  idCard: {
    keepFirst: 6,
    keepLast: 4,
    maskChar: '*'
  },
  // 手机号：显示前3位和后4位
  phone: {
    keepFirst: 3,
    keepLast: 4,
    maskChar: '*'
  },
  // 银行卡号：显示前4位和后4位
  bankCard: {
    keepFirst: 4,
    keepLast: 4,
    maskChar: '*'
  },
  // 邮箱：显示第一个字符
  email: {
    keepFirst: 1,
    keepLast: 0,
    maskChar: '***'
  },
  // 姓名：显示第一个字
  name: {
    keepFirst: 1,
    keepLast: 0,
    maskChar: '*'
  },
  // 地址：隐藏详细门牌号
  address: {
    keepFirst: 0,
    keepLast: 0,
    maskChar: '**',
    customMask: (value) => {
      // 隐藏具体门牌号，保留到街道/路级别
      return value.replace(/(.{2}省.{2,6}市).*(区|县).*(街道|路).*/, '$1****$2$3****')
    }
  }
}

/**
 * 通用脱敏函数
 * @param {String} value - 原始值
 * @param {Number} keepFirst - 保留前n位
 * @param {Number} keepLast - 保留后n位
 * @param {String} maskChar - 掩码字符
 * @returns {String} 脱敏后的值
 */
export function maskValue(value, keepFirst = 0, keepLast = 0, maskChar = '*') {
  if (!value) return value

  const valueStr = String(value)

  // 如果值太短，不脱敏
  if (valueStr.length <= keepFirst + keepLast) {
    return valueStr
  }

  const firstPart = valueStr.substring(0, keepFirst)
  const lastPart = valueStr.substring(valueStr.length - keepLast)
  const maskLength = valueStr.length - keepFirst - keepLast
  const maskedPart = maskChar.repeat(Math.max(maskLength, 1))

  return firstPart + maskedPart + lastPart
}

/**
 * 身份证号脱敏
 * @param {String} idCard - 身份证号
 * @returns {String} 脱敏后的身份证号
 */
export function maskIdCard(idCard) {
  if (!idCard) return idCard

  const rule = MASK_RULES.idCard
  return maskValue(idCard, rule.keepFirst, rule.keepLast, rule.maskChar)
}

/**
 * 手机号脱敏
 * @param {String} phone - 手机号
 * @returns {String} 脱敏后的手机号
 */
export function maskPhone(phone) {
  if (!phone) return phone

  const rule = MASK_RULES.phone
  return maskValue(phone, rule.keepFirst, rule.keepLast, rule.maskChar)
}

/**
 * 银行卡号脱敏
 * @param {String} bankCard - 银行卡号
 * @returns {String} 脱敏后的银行卡号
 */
export function maskBankCard(bankCard) {
  if (!bankCard) return bankCard

  // 去除空格
  const cleanCard = bankCard.replace(/\s/g, '')

  const rule = MASK_RULES.bankCard
  return maskValue(cleanCard, rule.keepFirst, rule.keepLast, rule.maskChar)
}

/**
 * 邮箱脱敏
 * @param {String} email - 邮箱地址
 * @returns {String} 脱敏后的邮箱
 */
export function maskEmail(email) {
  if (!email) return email

  const atIndex = email.indexOf('@')

  if (atIndex <= 1) {
    return email
  }

  const username = email.substring(0, 1) + '***'
  const domain = email.substring(atIndex)

  return username + domain
}

/**
 * 姓名脱敏
 * @param {String} name - 姓名
 * @returns {String} 脱敏后的姓名
 */
export function maskName(name) {
  if (!name) return name

  const rule = MASK_RULES.name
  return maskValue(name, rule.keepFirst, rule.keepLast, rule.maskChar)
}

/**
 * 地址脱敏
 * @param {String} address - 地址
 * @returns {String} 脱敏后的地址
 */
export function maskAddress(address) {
  if (!address) return address

  const rule = MASK_RULES.address

  if (rule.customMask) {
    return rule.customMask(address)
  }

  return maskValue(address, rule.keepFirst, rule.keepLast, rule.maskChar)
}

/**
 * 对象脱敏
 * @param {Object} obj - 原始对象
 * @param {Object} fieldMapping - 字段映射 { fieldName: 'fieldType' }
 * @returns {Object} 脱敏后的对象
 */
export function maskObject(obj, fieldMapping = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const result = { ...obj }

  for (const [field, type] of Object.entries(fieldMapping)) {
    if (result[field]) {
      switch (type) {
        case 'idCard':
          result[field] = maskIdCard(result[field])
          result[`${field}_masked`] = true
          break
        case 'phone':
          result[field] = maskPhone(result[field])
          result[`${field}_masked`] = true
          break
        case 'bankCard':
          result[field] = maskBankCard(result[field])
          result[`${field}_masked`] = true
          break
        case 'email':
          result[field] = maskEmail(result[field])
          result[`${field}_masked`] = true
          break
        case 'name':
          result[field] = maskName(result[field])
          result[`${field}_masked`] = true
          break
        case 'address':
          result[field] = maskAddress(result[field])
          result[`${field}_masked`] = true
          break
      }
    }
  }

  return result
}

/**
 * 数组脱敏
 * @param {Array} arr - 原始数组
 * @param {Object} fieldMapping - 字段映射
 * @returns {Array} 脱敏后的数组
 */
export function maskArray(arr, fieldMapping = {}) {
  if (!Array.isArray(arr)) {
    return arr
  }

  return arr.map(item => {
    if (typeof item === 'object' && item !== null) {
      return maskObject(item, fieldMapping)
    }
    return item
  })
}

/**
 * 自动识别字段类型并脱敏
 * @param {Object} data - 数据对象
 * @returns {Object} 脱敏后的数据
 */
export function autoMask(data) {
  if (!data || typeof data !== 'object') {
    return data
  }

  // 常见字段名模式
  const fieldPatterns = {
    // 身份证相关
    idCard: /(idCard|id_card|idcard|身份证|证件号)/i,
    // 手机号相关
    phone: /(phone|mobile|联系电话|手机号)/i,
    // 银行卡相关
    bankCard: /(bankCard|bank_card|bankcard|银行卡)/i,
    // 邮箱相关
    email: /(email|邮箱|邮件)/i,
    // 姓名相关
    name: /(name|userName|user_name|姓名)/i,
    // 地址相关
    address: /(address|地址)/i
  }

  const fieldMapping = {}

  for (const field in data) {
    for (const [type, pattern] of Object.entries(fieldPatterns)) {
      if (pattern.test(field)) {
        fieldMapping[field] = type
        break
      }
    }
  }

  return maskObject(data, fieldMapping)
}

/**
 * 批量脱敏
 * @param {Array|Object} data - 数据
 * @param {Object} fieldMapping - 字段映射
 * @returns {Array|Object} 脱敏后的数据
 */
export function batchMask(data, fieldMapping = {}) {
  if (Array.isArray(data)) {
    return maskArray(data, fieldMapping)
  } else if (typeof data === 'object' && data !== null) {
    return maskObject(data, fieldMapping)
  }
  return data
}

/**
 * 验证脱敏后的数据格式
 * @param {String} value - 脱敏后的值
 * @param {String} type - 数据类型
 * @returns {Boolean} 是否有效
 */
export function validateMaskedValue(value, type) {
  if (!value) return true

  const rules = {
    idCard: /^\*{6,}\d{4}$/, // ******1234
    phone: /^\d{3}\*{4,}\d{4}$/, // 138****1234
    bankCard: /^\d{4}\*{8,}\d{4}$/, // 1234********5678
    email: /^.\*{3}@.+$/, // u***@example.com
    name: /^.\*{1,}$/ // 张*
  }

  const pattern = rules[type]

  if (!pattern) {
    return true
  }

  return pattern.test(value)
}

// 默认导出所有函数
export default {
  maskValue,
  maskIdCard,
  maskPhone,
  maskBankCard,
  maskEmail,
  maskName,
  maskAddress,
  maskObject,
  maskArray,
  autoMask,
  batchMask,
  validateMaskedValue
}
