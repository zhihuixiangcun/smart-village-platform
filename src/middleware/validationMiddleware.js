/**
 * 统一输入验证中间件
 * 使用express-validator进行严格的输入验证
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/AppError');

/**
 * 验证结果检查中间件
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));

    throw new ValidationError(
      '数据验证失败',
      formattedErrors
    );
  }
  next();
};

/**
 * 用户ID参数验证
 */
const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('用户ID格式无效'),
  validate
];

/**
 * 分页参数验证
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须是1-100之间的整数'),
  validate
];

/**
 * 用户注册验证
 */
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30字符之间'),
  body('phone')
    .trim()
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式无效'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('密码长度必须在8-128字符之间'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度必须在2-50字符之间'),
  validate
];

/**
 * SQL注入检测中间件
 */
const sanitizeInput = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(;|\-\-|\/\*|\*\/)/g
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          throw new ValidationError('检测到非法输入', [
            { field: 'input', message: '输入包含潜在的SQL注入代码' }
          ]);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        checkValue(value[key]);
      }
    }
  };

  if (req.body) checkValue(req.body);
  if (req.query) checkValue(req.query);
  if (req.params) checkValue(req.params);

  next();
};

module.exports = {
  validate,
  validateUserId,
  validatePagination,
  validateUserRegistration,
  sanitizeInput
};
