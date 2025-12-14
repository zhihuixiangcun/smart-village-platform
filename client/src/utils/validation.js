/**
 * 表单验证工具
 * 提供常用的验证规则和验证方法
 */

/**
 * 必填验证
 * @param {string} message 错误信息
 * @returns {object} 验证规则
 */
export function required(message = '此项为必填项') {
  return {
    required: true,
    message,
    trigger: ['blur', 'change']
  }
}

/**
 * 手机号验证
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function phone(isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('请输入手机号'))
  }

  rules.push({
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入正确的手机号格式',
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * 身份证号验证
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function idCard(isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('请输入身份证号'))
  }

  rules.push({
    pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
    message: '请输入正确的身份证号格式',
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * 邮箱验证
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function email(isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('请输入邮箱地址'))
  }

  rules.push({
    type: 'email',
    message: '请输入正确的邮箱格式',
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * 密码验证
 * @param {number} minLength 最小长度
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function password(minLength = 6, isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('请输入密码'))
  }

  rules.push({
    min: minLength,
    message: `密码长度不能少于${minLength}位`,
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * 确认密码验证
 * @param {string} passwordField 密码字段名
 * @param {object} formData 表单数据对象
 * @returns {Array} 验证规则数组
 */
export function confirmPassword(passwordField, formData) {
  return [
    required('请确认密码'),
    {
      validator: (rule, value, callback) => {
        if (value === '') {
          callback(new Error('请再次输入密码'))
        } else if (value !== formData[passwordField]) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: ['blur', 'change']
    }
  ]
}

/**
 * 长度验证
 * @param {number} min 最小长度
 * @param {number} max 最大长度
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function length(min, max, isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('此项不能为空'))
  }

  if (min !== undefined && max !== undefined) {
    rules.push({
      min,
      max,
      message: `长度应在${min}到${max}个字符之间`,
      trigger: ['blur', 'change']
    })
  } else if (min !== undefined) {
    rules.push({
      min,
      message: `长度不能少于${min}个字符`,
      trigger: ['blur', 'change']
    })
  } else if (max !== undefined) {
    rules.push({
      max,
      message: `长度不能超过${max}个字符`,
      trigger: ['blur', 'change']
    })
  }

  return rules
}

/**
 * 数字验证
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function number(min, max, isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('请输入数字'))
  }

  rules.push({
    type: 'number',
    message: '请输入正确的数字',
    trigger: ['blur', 'change']
  })

  if (min !== undefined && max !== undefined) {
    rules.push({
      min,
      max,
      message: `数值应在${min}到${max}之间`,
      trigger: ['blur', 'change']
    })
  } else if (min !== undefined) {
    rules.push({
      min,
      message: `数值不能小于${min}`,
      trigger: ['blur', 'change']
    })
  } else if (max !== undefined) {
    rules.push({
      max,
      message: `数值不能大于${max}`,
      trigger: ['blur', 'change']
    })
  }

  return rules
}

/**
 * 正整数验证
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function positiveInteger(isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('请输入正整数'))
  }

  rules.push({
    pattern: /^[1-9]\d*$/,
    message: '请输入正整数',
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * 金额验证
 * @param {boolean} isRequired 是否必填
 * @param {number} precision 小数位数
 * @returns {Array} 验证规则数组
 */
export function money(isRequired = true, precision = 2) {
  const rules = []

  if (isRequired) {
    rules.push(required('请输入金额'))
  }

  const pattern = precision > 0
    ? new RegExp(`^\\d+(\\.\\d{1,${precision}})?$`)
    : /^\d+$/

  rules.push({
    pattern,
    message: precision > 0
      ? `请输入正确的金额格式（最多${precision}位小数）`
      : '请输入正确的金额格式',
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * URL验证
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function url(isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('请输入URL地址'))
  }

  rules.push({
    type: 'url',
    message: '请输入正确的URL格式',
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * 自定义验证器
 * @param {Function} validator 验证函数
 * @param {string} message 错误信息
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function custom(validator, message, isRequired = false) {
  const rules = []

  if (isRequired) {
    rules.push(required('此项不能为空'))
  }

  rules.push({
    validator: (rule, value, callback) => {
      if (validator(value)) {
        callback()
      } else {
        callback(new Error(message))
      }
    },
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * 日期验证
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function date(isRequired = true) {
  const rules = []

  if (isRequired) {
    rules.push(required('请选择日期'))
  }

  rules.push({
    type: 'date',
    message: '请选择正确的日期',
    trigger: ['blur', 'change']
  })

  return rules
}

/**
 * 日期范围验证
 * @param {Date} minDate 最小日期
 * @param {Date} maxDate 最大日期
 * @param {boolean} isRequired 是否必填
 * @returns {Array} 验证规则数组
 */
export function dateRange(minDate, maxDate, isRequired = true) {
  const rules = date(isRequired)

  if (minDate || maxDate) {
    rules.push({
      validator: (rule, value, callback) => {
        if (!value) {
          callback()
          return
        }

        const date = new Date(value)

        if (minDate && date < minDate) {
          callback(new Error(`日期不能早于${minDate.toLocaleDateString()}`))
          return
        }

        if (maxDate && date > maxDate) {
          callback(new Error(`日期不能晚于${maxDate.toLocaleDateString()}`))
          return
        }

        callback()
      },
      trigger: ['blur', 'change']
    })
  }

  return rules
}

/**
 * 常用验证规则集合
 */
export const rules = {
  required,
  phone,
  idCard,
  email,
  password,
  confirmPassword,
  length,
  number,
  positiveInteger,
  money,
  url,
  custom,
  date,
  dateRange
}

export default rules