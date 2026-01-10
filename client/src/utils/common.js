/**
 * 通用工具函数库
 * 提供常用的数据处理、格式化、验证等功能
 */

/**
 * 格式化日期
 * @param {Date|string} date 日期对象或字符串
 * @param {string} format 格式 (YYYY-MM-DD, YYYY-MM-DD HH:mm:ss)
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  switch (format) {
  case 'YYYY-MM-DD':
    return `${year}-${month}-${day}`;
  case 'YYYY-MM-DD HH:mm:ss':
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  case 'MM-DD':
    return `${month}-${day}`;
  case 'HH:mm':
    return `${hours}:${minutes}`;
  default:
    return `${year}-${month}-${day}`;
  }
}

/**
 * 格式化金额
 * @param {number} amount 金额
 * @param {number} precision 小数位数
 * @returns {string} 格式化后的金额字符串
 */
export function formatCurrency(amount, precision = 2) {
  if (amount === null || amount === undefined) return '0.00';
  return Number(amount)
    .toFixed(precision)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 身份证号验证和格式化
 * @param {string} idCard 身份证号
 * @returns {object} { isValid: boolean, formatted: string, info: object }
 */
export function validateIdCard(idCard) {
  if (!idCard) return { isValid: false, formatted: '', info: {} };

  const cleanId = idCard.replace(/\s/g, '');
  const isValid =
    /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(
      cleanId
    );

  if (!isValid) {
    return { isValid: false, formatted: cleanId, info: {} };
  }

  // 提取信息
  const year = parseInt(cleanId.substr(6, 4));
  const month = parseInt(cleanId.substr(10, 2));
  const day = parseInt(cleanId.substr(12, 2));
  const gender = parseInt(cleanId.substr(16, 1)) % 2 === 0 ? '女' : '男';

  const today = new Date();
  const birthDate = new Date(year, month - 1, day);
  const age = today.getFullYear() - year;

  return {
    isValid: true,
    formatted: cleanId.replace(/(\d{6})(\d{8})(\d{4})/, '$1 $2 $3'),
    info: {
      birthday: formatDate(birthDate),
      age,
      gender,
      province: cleanId.substr(0, 2),
    },
  };
}

/**
 * 手机号验证和格式化
 * @param {string} phone 手机号
 * @returns {object} { isValid: boolean, formatted: string }
 */
export function validatePhone(phone) {
  if (!phone) return { isValid: false, formatted: '' };

  const cleanPhone = phone.replace(/\D/g, '');
  const isValid = /^1[3-9]\d{9}$/.test(cleanPhone);

  return {
    isValid,
    formatted: isValid ? cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3') : cleanPhone,
  };
}

/**
 * 深拷贝对象
 * @param {any} obj 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} delay 延迟时间(ms)
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} delay 延迟时间(ms)
 * @returns {Function} 节流后的函数
 */
export function throttle(func, delay = 300) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * 数组分页
 * @param {Array} array 要分页的数组
 * @param {number} page 页码 (从1开始)
 * @param {number} pageSize 每页大小
 * @returns {object} { data: Array, total: number, totalPages: number }
 */
export function paginateArray(array, page = 1, pageSize = 10) {
  const total = array.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = array.slice(startIndex, endIndex);

  return {
    data,
    total,
    totalPages,
    currentPage: page,
    pageSize,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * 生成唯一ID
 * @param {string} prefix 前缀
 * @returns {string} 唯一ID
 */
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
}

/**
 * 检查是否为空值
 * @param {any} value 要检查的值
 * @returns {boolean} 是否为空
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 文件大小格式化
 * @param {number} bytes 字节数
 * @param {number} decimals 小数位数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * URL 参数解析
 * @param {string} url URL字符串
 * @returns {object} 解析后的参数对象
 */
export function parseUrlParams(url = window.location.href) {
  const params = {};
  const urlObj = new URL(url);

  for (const [key, value] of urlObj.searchParams) {
    params[key] = value;
  }

  return params;
}

/**
 * 颜色值转换
 * @param {string} color 颜色值 (hex, rgb等)
 * @returns {object} 颜色信息
 */
export function parseColor(color) {
  // 简单的颜色解析，可以扩展
  const hexMatch = color.match(/^#([0-9A-Fa-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    return {
      hex: color,
      rgb: `rgb(${r}, ${g}, ${b})`,
      rgba: `rgba(${r}, ${g}, ${b}, 1)`,
      r,
      g,
      b,
    };
  }

  return { hex: color, rgb: color, rgba: color };
}

/**
 * 数字序列生成
 * @param {number} start 起始数字
 * @param {number} end 结束数字
 * @param {number} step 步长
 * @returns {Array} 数字序列
 */
export function range(start, end, step = 1) {
  const result = [];
  for (let i = start; i <= end; i += step) {
    result.push(i);
  }
  return result;
}

export default {
  formatDate,
  formatCurrency,
  validateIdCard,
  validatePhone,
  deepClone,
  debounce,
  throttle,
  paginateArray,
  generateId,
  isEmpty,
  formatFileSize,
  parseUrlParams,
  parseColor,
  range,
};
