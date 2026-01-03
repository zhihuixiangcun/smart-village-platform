/**
 * 隐私规则数据模型
 * 用于管理数据脱敏和访问控制规则
 */

const mongoose = require('mongoose');

const privacyRuleSchema = new mongoose.Schema({
  // 规则名称
  name: {
    type: String,
    required: true,
    unique: true
  },

  // 规则代码（唯一标识）
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 规则类型
  ruleType: {
    type: String,
    required: true,
    enum: {
      values: [
        'id_card',           // 身份证号
        'phone',             // 手机号
        'bank_card',         // 银行卡号
        'address',           // 地址
        'email',             // 邮箱
        'name',              // 姓名
        'custom'             // 自定义
      ],
      message: '无效的规则类型'
    },
    index: true
  },

  // 脱敏模式
  maskPattern: {
    type: String,
    required: true,
    description: '脱敏模式，使用*表示隐藏字符，例如：***1234表示隐藏前3位'
  },

  // 脱敏正则表达式
  maskRegex: {
    type: String,
    description: '用于匹配和替换的正则表达式'
  },

  // 显示规则
  displayRule: {
    // 保留前n位
    keepFirst: {
      type: Number,
      default: 0,
      min: 0
    },
    // 保留后n位
    keepLast: {
      type: Number,
      default: 0,
      min: 0
    },
    // 掩码字符
    maskChar: {
      type: String,
      default: '*'
    }
  },

  // 适用角色列表（哪些角色可以看到完整信息）
  allowedRoles: [{
    type: String,
    enum: ['admin', 'village_admin', 'village_staff', 'user', 'system']
  }],

  // 适用用户列表（具体用户ID）
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // 是否需要人脸识别验证
  requireFaceAuth: {
    type: Boolean,
    default: true
  },

  // 查看次数限制（0表示不限制）
  viewLimit: {
    type: Number,
    default: 0,
    min: 0
  },

  // 时间限制（工作时间内可查看）
  timeRestriction: {
    enabled: {
      type: Boolean,
      default: false
    },
    // 允许查看的时间段
    allowedHours: [{
      start: String,  // 格式：HH:mm
      end: String     // 格式：HH:mm
    }],
    // 允许查看的星期
    allowedDays: [{
      type: Number,
      min: 0,  // 0=周日
      max: 6   // 6=周六
    }]
  },

  // 适用数据范围
  dataScope: {
    type: String,
    enum: ['all', 'own_village', 'own_family', 'self'],
    default: 'all'
  },

  // 优先级（数字越大优先级越高）
  priority: {
    type: Number,
    default: 0,
    index: true
  },

  // 是否启用
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },

  // 规则描述
  description: {
    type: String,
    maxlength: 500
  },

  // 使用场景
  scenarios: [{
    type: String,
    enum: ['display', 'export', 'api', 'log', 'report']
  }],

  // 标签
  tags: [String],

  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // 更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'privacy_rules'
});

// 索引
privacyRuleSchema.index({ ruleType: 1, enabled: 1 });
privacyRuleSchema.index({ priority: -1 });
privacyRuleSchema.index({ code: 1 });

// 预置的隐私规则
privacyRuleSchema.statics.getDefaultRules = function() {
  return [
    {
      name: '身份证号脱敏规则',
      code: 'ID_CARD_MASK',
      ruleType: 'id_card',
      maskPattern: '******1234',
      displayRule: {
        keepFirst: 6,
        keepLast: 4,
        maskChar: '*'
      },
      allowedRoles: ['admin'],
      requireFaceAuth: true,
      viewLimit: 0,
      enabled: true,
      priority: 100,
      description: '身份证号显示前6位和后4位，中间使用*号代替',
      scenarios: ['display', 'export', 'api']
    },
    {
      name: '手机号脱敏规则',
      code: 'PHONE_MASK',
      ruleType: 'phone',
      maskPattern: '138****1234',
      displayRule: {
        keepFirst: 3,
        keepLast: 4,
        maskChar: '*'
      },
      allowedRoles: ['admin', 'village_admin'],
      requireFaceAuth: false,
      viewLimit: 0,
      enabled: true,
      priority: 90,
      description: '手机号显示前3位和后4位，中间使用*号代替',
      scenarios: ['display', 'export', 'api']
    },
    {
      name: '银行卡号脱敏规则',
      code: 'BANK_CARD_MASK',
      ruleType: 'bank_card',
      maskPattern: '1234********5678',
      displayRule: {
        keepFirst: 4,
        keepLast: 4,
        maskChar: '*'
      },
      allowedRoles: ['admin'],
      requireFaceAuth: true,
      viewLimit: 3,
      enabled: true,
      priority: 100,
      description: '银行卡号显示前4位和后4位，中间使用*号代替',
      scenarios: ['display', 'export']
    },
    {
      name: '详细地址脱敏规则',
      code: 'ADDRESS_MASK',
      ruleType: 'address',
      maskPattern: '浙江省杭州市**区**街道**号',
      maskRegex: '(.{2}省.{2,6}市).*(区|县).*(街道|路).*(号)',
      displayRule: {
        keepFirst: 0,
        keepLast: 0,
        maskChar: '**'
      },
      allowedRoles: ['admin', 'village_admin'],
      requireFaceAuth: false,
      viewLimit: 0,
      enabled: true,
      priority: 80,
      description: '地址隐藏详细门牌号信息',
      scenarios: ['display', 'export', 'api']
    },
    {
      name: '邮箱脱敏规则',
      code: 'EMAIL_MASK',
      ruleType: 'email',
      maskPattern: 'u***@example.com',
      displayRule: {
        keepFirst: 1,
        keepLast: 0,
        maskChar: '***'
      },
      allowedRoles: ['admin'],
      requireFaceAuth: false,
      viewLimit: 0,
      enabled: true,
      priority: 70,
      description: '邮箱显示第一个字符，其余用***代替',
      scenarios: ['display', 'export']
    },
    {
      name: '姓名脱敏规则',
      code: 'NAME_MASK',
      ruleType: 'name',
      maskPattern: '张*',
      displayRule: {
        keepFirst: 1,
        keepLast: 0,
        maskChar: '*'
      },
      allowedRoles: ['admin'],
      requireFaceAuth: false,
      viewLimit: 0,
      enabled: true,
      priority: 60,
      description: '姓名显示第一个字，其余用*代替（仅特殊场景）',
      scenarios: ['export']
    }
  ];
};

// 实例方法：应用脱敏规则
privacyRuleSchema.methods.applyMask = function(value) {
  if (!value) return value;

  const { keepFirst, keepLast, maskChar } = this.displayRule;
  const valueStr = String(value);

  if (valueStr.length <= keepFirst + keepLast) {
    return valueStr; // 值太短，不脱敏
  }

  const firstPart = valueStr.substring(0, keepFirst);
  const lastPart = valueStr.substring(valueStr.length - keepLast);
  const maskLength = valueStr.length - keepFirst - keepLast;
  const maskedPart = maskChar.repeat(maskLength);

  return firstPart + maskedPart + lastPart;
};

// 实例方法：检查权限
privacyRuleSchema.methods.checkPermission = function(user) {
  // 检查用户角色
  if (this.allowedRoles.includes(user.role)) {
    return true;
  }

  // 检查具体用户
  if (this.allowedUsers.some(id => id.equals(user._id))) {
    return true;
  }

  return false;
};

// 静态方法：根据类型获取规则
privacyRuleSchema.statics.getRuleByType = async function(ruleType) {
  return this.findOne({
    ruleType,
    enabled: true
  }).sort({ priority: -1 });
};

// 静态方法：根据代码获取规则
privacyRuleSchema.statics.getRuleByCode = async function(code) {
  return this.findOne({
    code,
    enabled: true
  });
};

// 静态方法：获取所有启用的规则
privacyRuleSchema.statics.getActiveRules = function() {
  return this.find({ enabled: true }).sort({ priority: -1 });
};

// 静态方法：批量脱敏数据
privacyRuleSchema.statics.maskData = async function(data, user) {
  const rules = await this.getActiveRules();
  const result = { ...data };

  for (const rule of rules) {
    const field = this.getFieldName(rule.ruleType);
    if (result[field] && !rule.checkPermission(user)) {
      result[field] = rule.applyMask(result[field]);
      result[`${field}_masked`] = true;
    }
  }

  return result;
};

// 辅助方法：获取字段名
privacyRuleSchema.statics.getFieldName = function(ruleType) {
  const fieldMap = {
    id_card: 'idCard',
    phone: 'phone',
    bank_card: 'bankCard',
    address: 'address',
    email: 'email',
    name: 'name'
  };
  return fieldMap[ruleType] || ruleType;
};

const PrivacyRule = mongoose.model('PrivacyRule', privacyRuleSchema);

module.exports = PrivacyRule;
