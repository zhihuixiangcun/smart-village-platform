import dayjs from 'dayjs';

/**
 * 格式化日期
 * @param {Date|string} date 日期
 * @param {string} format 格式化字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  return dayjs(date).format(format);
}

/**
 * 格式化日期时间
 * @param {Date|string} date 日期
 * @param {string} format 格式化字符串
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';
  return dayjs(date).format(format);
}

/**
 * 格式化相对时间
 * @param {Date|string} date 日期
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');
  const diffHours = now.diff(target, 'hour');
  const diffDays = now.diff(target, 'day');

  if (diffMinutes < 1) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 30) {
    return `${diffDays}天前`;
  } else {
    return formatDate(date);
  }
}

/**
 * 格式化手机号码（脱敏）
 * @param {string} phone 手机号码
 * @returns {string} 脱敏后的手机号码
 */
export function formatPhone(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 格式化身份证号（脱敏）
 * @param {string} idCard 身份证号
 * @returns {string} 脱敏后的身份证号
 */
export function formatIdCard(idCard) {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
}

/**
 * 格式化银行卡号（脱敏）
 * @param {string} cardNumber 银行卡号
 * @returns {string} 脱敏后的银行卡号
 */
export function formatBankCard(cardNumber) {
  if (!cardNumber) return '';
  return cardNumber.replace(/(\d{4})\d*(\d{4})/, '$1 **** **** $2');
}

/**
 * 格式化金额
 * @param {number} amount 金额
 * @param {number} decimals 小数位数
 * @param {string} thousandsSeparator 千分位分隔符
 * @returns {string} 格式化后的金额字符串
 */
export function formatAmount(amount, decimals = 2, thousandsSeparator = ',') {
  if (amount === null || amount === undefined) return '0.00';
  const number = parseFloat(amount);
  if (isNaN(number)) return '0.00';

  const fixed = number.toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  return parts.join('.');
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @param {number} decimals 小数位数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))  } ${  sizes[i]}`;
}

/**
 * 格式化百分比
 * @param {number} value 数值
 * @param {number} total 总数
 * @param {number} decimals 小数位数
 * @returns {string} 百分比字符串
 */
export function formatPercentage(value, total, decimals = 1) {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * 格式化数字（添加千分位分隔符）
 * @param {number} num 数字
 * @param {string} separator 分隔符
 * @returns {string} 格式化后的数字字符串
 */
export function formatNumber(num, separator = ',') {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * 格式化性别
 * @param {string} gender 性别代码
 * @returns {string} 格式化后的性别
 */
export function formatGender(gender) {
  const genderMap = {
    'male': '男',
    'female': '女',
    'M': '男',
    'F': '女',
    '1': '男',
    '2': '女',
    '男': '男',
    '女': '女'
  };
  return genderMap[gender] || gender;
}

/**
 * 格式化婚姻状况
 * @param {string} status 婚姻状况代码
 * @returns {string} 格式化后的婚姻状况
 */
export function formatMaritalStatus(status) {
  const statusMap = {
    'single': '未婚',
    'married': '已婚',
    'divorced': '离异',
    'widowed': '丧偶',
    'unmarried': '未婚',
    'married': '已婚',
    'divorce': '离异',
    'widow': '丧偶'
  };
  return statusMap[status] || status;
}

/**
 * 格式化学历
 * @param {string} education 学历代码
 * @returns {string} 格式化后的学历
 */
export function formatEducation(education) {
  const educationMap = {
    'primary': '小学',
    'junior': '初中',
    'high': '高中',
    'college': '大专',
    'bachelor': '本科',
    'master': '研究生',
    'doctor': '博士',
    '小学': '小学',
    '初中': '初中',
    '高中': '高中',
    '中专': '中专',
    '大专': '大专',
    '本科': '本科',
    '研究生': '研究生',
    '硕士': '硕士',
    '博士': '博士'
  };
  return educationMap[education] || education;
}

/**
 * 格式化政治面貌
 * @param {string} political 政治面貌代码
 * @returns {string} 格式化后的政治面貌
 */
export function formatPoliticalStatus(political) {
  const politicalMap = {
    'party': '中共党员',
    'league': '共青团员',
    'democratic': '民主党派',
    'masses': '群众',
    '党员': '中共党员',
    '团员': '共青团员',
    '民主党派': '民主党派',
    '群众': '群众'
  };
  return politicalMap[political] || political;
}

/**
 * 格式化职业
 * @param {string} occupation 职业代码
 * @returns {string} 格式化后的职业
 */
export function formatOccupation(occupation) {
  const occupationMap = {
    'farmer': '农民',
    'worker': '工人',
    'teacher': '教师',
    'doctor': '医生',
    'official': '公务员',
    'business': '经商',
    'student': '学生',
    'retired': '退休',
    'unemployed': '待业',
    '农民': '农民',
    '工人': '工人',
    '教师': '教师',
    '医生': '医生',
    '公务员': '公务员',
    '经商': '经商',
    '学生': '学生',
    '退休': '退休',
    '待业': '待业'
  };
  return occupationMap[occupation] || occupation;
}

/**
 * 格式化家庭类型
 * @param {string} type 家庭类型代码
 * @returns {string} 格式化后的家庭类型
 */
export function formatHouseholdType(type) {
  const typeMap = {
    'normal': '普通住户',
    'lowIncome': '低保户',
    'singleChild': '独生子女户',
    'elderly': '独居老人',
    'disabled': '残疾家庭',
    'household': '普通住户',
    '五保户': '五保户',
    '低保户': '低保户',
    '独生子女户': '独生子女户',
    '独居老人': '独居老人',
    '残疾家庭': '残疾家庭'
  };
  return typeMap[type] || type;
}