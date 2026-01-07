/**
 * 日期时间工具函数
 */

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串
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

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化相对时间
 * @param {Date} date - 日期对象
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  if (!date) return '';

  const now = new Date();
  const target = new Date(date);
  const diff = now - target;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
}

/**
 * 获取日期范围
 * @param {string} type - 范围类型: 'today', 'week', 'month', 'year'
 * @returns {Array} [开始日期, 结束日期]
 */
export function getDateRange(type) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (type) {
  case 'today':
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    break;

  case 'week':
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    break;

  case 'month':
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    break;

  case 'year':
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
    break;

  default:
    return [];
  }

  return [start, end];
}

/**
 * 计算两个日期之间的天数差
 * @param {Date} start - 开始日期
 * @param {Date} end - 结束日期
 * @returns {number} 天数差
 */
export function daysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 判断是否为今天
 * @param {Date} date - 日期对象
 * @returns {boolean} 是否为今天
 */
export function isToday(date) {
  const today = new Date();
  const target = new Date(date);
  return today.toDateString() === target.toDateString();
}

/**
 * 判断是否为昨天
 * @param {Date} date - 日期对象
 * @returns {boolean} 是否为昨天
 */
export function isYesterday(date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date);
  return yesterday.toDateString() === target.toDateString();
}

/**
 * 获取月份名称
 * @param {number} month - 月份 (0-11)
 * @returns {string} 月份名称
 */
export function getMonthName(month) {
  const months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  return months[month] || '';
}

/**
 * 获取星期名称
 * @param {number} day - 星期几 (0-6)
 * @returns {string} 星期名称
 */
export function getWeekDayName(day) {
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekDays[day] || '';
}

/**
 * 日期时间格式化选项
 */
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATETIME_SHORT: 'YYYY-MM-DD HH:mm',
  MONTH_DAY: 'MM-DD',
  YEAR_MONTH: 'YYYY-MM',
  CHINESE_DATE: 'YYYY年MM月DD日',
  CHINESE_DATETIME: 'YYYY年MM月DD日 HH:mm:ss'
};