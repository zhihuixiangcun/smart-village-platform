/**
 * 村民数据验证器
 */

/**
 * 验证村民数据
 */
const validateResident = (data) => {
  const errors = [];

  // 必填字段验证
  if (!data.name || data.name.trim() === '') {
    errors.push('姓名不能为空');
  }

  if (!data.idCard || data.idCard.trim() === '') {
    errors.push('身份证号不能为空');
  } else if (!/^\d{15}$|^\d{17}[\dXx]$/.test(data.idCard)) {
    errors.push('身份证号格式不正确');
  }

  if (!data.phone || data.phone.trim() === '') {
    errors.push('手机号不能为空');
  } else if (!/^1[3-9]\d{9}$/.test(data.phone)) {
    errors.push('手机号格式不正确');
  }

  if (!data.villageId) {
    errors.push('村庄ID不能为空');
  }

  // 可选字段验证
  if (data.email && data.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('邮箱格式不正确');
    }
  }

  if (data.age !== undefined && (data.age < 0 || data.age > 150)) {
    errors.push('年龄必须在0-150之间');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 验证村民更新数据
 */
const validateUpdate = (data) => {
  const errors = [];

  // 姓名验证
  if (data.name !== undefined && data.name.trim() === '') {
    errors.push('姓名不能为空');
  }

  // 身份证号验证
  if (data.idCard !== undefined && data.idCard.trim() !== '') {
    if (!/^\d{15}$|^\d{17}[\dXx]$/.test(data.idCard)) {
      errors.push('身份证号格式不正确');
    }
  }

  // 手机号验证
  if (data.phone !== undefined && data.phone.trim() !== '') {
    if (!/^1[3-9]\d{9}$/.test(data.phone)) {
      errors.push('手机号格式不正确');
    }
  }

  // 邮箱验证
  if (data.email !== undefined && data.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('邮箱格式不正确');
    }
  }

  // 年龄验证
  if (data.age !== undefined && (data.age < 0 || data.age > 150)) {
    errors.push('年龄必须在0-150之间');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateResident,
  validateUpdate
};
