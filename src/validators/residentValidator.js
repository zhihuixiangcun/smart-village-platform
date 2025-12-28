/**
 * 村民数据验证器
 */

const { body, param, validationResult } = require('express-validator');

/**
 * 验证村民创建数据
 */
const validateResident = [
  body('name').trim().notEmpty().withMessage('姓名不能为空'),
  body('idCard').trim().isLength({ min: 15, max: 18 }).withMessage('身份证号格式不正确'),
  body('phone').trim().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  body('villageId').isMongoId().withMessage('村庄ID格式不正确'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * 验证村民更新数据
 */
const validateUpdate = [
  param('id').isMongoId().withMessage('村民ID格式不正确'),
  body('name').optional().trim().notEmpty().withMessage('姓名不能为空'),
  body('phone').optional().trim().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
  body('idCard').optional().trim().isLength({ min: 15, max: 18 }).withMessage('身份证号格式不正确'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateResident,
  validateUpdate
};
