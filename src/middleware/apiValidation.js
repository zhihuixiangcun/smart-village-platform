/**
 * API验证中间件
 * 提供通用的API输入验证和响应格式化
 */

const { body, query, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

class ApiValidationMiddleware {
  /**
   * 处理验证错误
   */
  handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }));

      logger.warn('API验证失败:', {
        url: req.originalUrl,
        method: req.method,
        errors: errorMessages,
        body: req.body,
        query: req.query,
        params: req.params
      });

      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errorMessages,
        requestId: req.id
      });
    }
    next();
  };

  /**
   * 村民管理相关验证规则
   */
  residentValidation = {
    // 创建村民验证
    create: [
      body('name')
        .trim()
        .notEmpty()
        .withMessage('姓名不能为空')
        .isLength({ min: 2, max: 50 })
        .withMessage('姓名长度必须在2-50个字符之间')
        .matches(/^[\u4e00-\u9fa5a-zA-Z\s]+$/)
        .withMessage('姓名只能包含中文、英文和空格'),

      body('gender')
        .isIn(['male', 'female', 'other'])
        .withMessage('性别必须是male、female或other'),

      body('birthDate')
        .isISO8601()
        .withMessage('出生日期格式不正确')
        .custom(value => {
          const birthDate = new Date(value);
          const now = new Date();
          const age = now.getFullYear() - birthDate.getFullYear();
          if (age < 0 || age > 150) {
            throw new Error('年龄必须在0-150岁之间');
          }
          return true;
        }),

      body('idCard')
        .trim()
        .notEmpty()
        .withMessage('身份证号不能为空')
        .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
        .withMessage('身份证号格式不正确'),

      body('phone')
        .optional()
        .trim()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('手机号格式不正确'),

      body('address')
        .trim()
        .notEmpty()
        .withMessage('地址不能为空')
        .isLength({ min: 5, max: 200 })
        .withMessage('地址长度必须在5-200个字符之间'),

      body('villageId')
        .isMongoId()
        .withMessage('村庄ID格式不正确'),

      body('household.householdNumber')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('户号不能为空'),

      body('familyMembers')
        .optional()
        .isArray()
        .withMessage('家庭成员必须是数组'),

      body('familyMembers.*.name')
        .if(body('familyMembers').exists())
        .trim()
        .notEmpty()
        .withMessage('家庭成员姓名不能为空'),

      body('familyMembers.*.relationship')
        .if(body('familyMembers').exists())
        .trim()
        .notEmpty()
        .withMessage('关系不能为空'),

      body('familyMembers.*.idCard')
        .if(body('familyMembers').exists())
        .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
        .withMessage('家庭成员身份证号格式不正确')
    ],

    // 更新村民验证
    update: [
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('姓名长度必须在2-50个字符之间')
        .matches(/^[\u4e00-\u9fa5a-zA-Z\s]+$/)
        .withMessage('姓名只能包含中文、英文和空格'),

      body('phone')
        .optional()
        .trim()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('手机号格式不正确'),

      body('address')
        .optional()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('地址长度必须在5-200个字符之间'),

      body('idCard')
        .optional()
        .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
        .withMessage('身份证号格式不正确')
    ],

    // 村民列表查询验证
    list: [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是大于0的整数'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须是1-100之间的整数'),

      query('villageId')
        .optional()
        .isMongoId()
        .withMessage('村庄ID格式不正确'),

      query('gender')
        .optional()
        .isIn(['male', 'female', 'other'])
        .withMessage('性别筛选值不正确'),

      query('ageRange')
        .optional()
        .matches(/^\d+-\d+$/)
        .withMessage('年龄范围格式不正确，应为：最小年龄-最大年龄'),

      query('sortBy')
        .optional()
        .isIn(['name', 'age', 'createdAt', 'updatedAt'])
        .withMessage('排序字段不正确'),

      query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('排序方向必须是asc或desc')
    ],

    // 搜索验证
    search: [
      query('keyword')
        .trim()
        .notEmpty()
        .withMessage('搜索关键词不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('搜索关键词长度必须在1-50个字符之间'),

      query('searchType')
        .optional()
        .isIn(['name', 'phone', 'idCard'])
        .withMessage('搜索类型不正确'),

      query('villageId')
        .optional()
        .isMongoId()
        .withMessage('村庄ID格式不正确'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('返回数量必须是1-50之间的整数')
    ],

    // ID参数验证
    idParam: [
      param('id')
        .isMongoId()
        .withMessage('ID格式不正确')
    ]
  };

  /**
   * 村务治理相关验证规则
   */
  governanceValidation = {
    // 创建公告验证
    createAnnouncement: [
      body('title')
        .trim()
        .notEmpty()
        .withMessage('标题不能为空')
        .isLength({ min: 5, max: 200 })
        .withMessage('标题长度必须在5-200个字符之间'),

      body('content')
        .trim()
        .notEmpty()
        .withMessage('内容不能为空')
        .isLength({ min: 10 })
        .withMessage('内容至少需要10个字符'),

      body('type')
        .isIn(['notice', 'policy', 'activity', 'emergency', 'other'])
        .withMessage('公告类型不正确'),

      body('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('优先级不正确'),

      body('villageId')
        .isMongoId()
        .withMessage('村庄ID格式不正确'),

      body('publishAt')
        .optional()
        .isISO8601()
        .withMessage('发布时间格式不正确'),

      body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('过期时间格式不正确')
        .custom((value, { req }) => {
          if (req.body.publishAt && new Date(value) <= new Date(req.body.publishAt)) {
            throw new Error('过期时间必须晚于发布时间');
          }
          return true;
        })
    ],

    // 创建会议验证
    createMeeting: [
      body('title')
        .trim()
        .notEmpty()
        .withMessage('会议标题不能为空')
        .isLength({ min: 5, max: 200 })
        .withMessage('会议标题长度必须在5-200个字符之间'),

      body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('会议描述不能超过1000个字符'),

      body('startTime')
        .isISO8601()
        .withMessage('开始时间格式不正确')
        .custom((value) => {
          if (new Date(value) <= new Date()) {
            throw new Error('开始时间必须是未来时间');
          }
          return true;
        }),

      body('endTime')
        .isISO8601()
        .withMessage('结束时间格式不正确')
        .custom((value, { req }) => {
          if (new Date(value) <= new Date(req.body.startTime)) {
            throw new Error('结束时间必须晚于开始时间');
          }
          return true;
        }),

      body('location')
        .trim()
        .notEmpty()
        .withMessage('会议地点不能为空'),

      body('villageId')
        .isMongoId()
        .withMessage('村庄ID格式不正确'),

      body('participants')
        .isArray()
        .withMessage('参会人员必须是数组'),

      body('participants.*.userId')
        .if(body('participants').exists())
        .isMongoId()
        .withMessage('参会人员ID格式不正确')
    ]
  };

  /**
   * 财务管理相关验证规则
   */
  financeValidation = {
    // 创建财务记录验证
    createRecord: [
      body('title')
        .trim()
        .notEmpty()
        .withMessage('标题不能为空')
        .isLength({ min: 5, max: 200 })
        .withMessage('标题长度必须在5-200个字符之间'),

      body('type')
        .isIn(['income', 'expense'])
        .withMessage('财务类型必须是income或expense'),

      body('category')
        .trim()
        .notEmpty()
        .withMessage('分类不能为空')
        .isLength({ max: 50 })
        .withMessage('分类不能超过50个字符'),

      body('amount')
        .isFloat({ min: 0 })
        .withMessage('金额必须是大于等于0的数字'),

      body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('描述不能超过500个字符'),

      body('villageId')
        .isMongoId()
        .withMessage('村庄ID格式不正确'),

      body('date')
        .isISO8601()
        .withMessage('日期格式不正确')
        .custom((value) => {
          if (new Date(value) > new Date()) {
            throw new Error('日期不能是未来时间');
          }
          return true;
        })
    ],

    // 预算验证
    createBudget: [
      body('title')
        .trim()
        .notEmpty()
        .withMessage('预算标题不能为空')
        .isLength({ min: 5, max: 200 })
        .withMessage('预算标题长度必须在5-200个字符之间'),

      body('totalAmount')
        .isFloat({ min: 0 })
        .withMessage('总金额必须是大于等于0的数字'),

      body('period.startDate')
        .isISO8601()
        .withMessage('开始日期格式不正确'),

      body('period.endDate')
        .isISO8601()
        .withMessage('结束日期格式不正确')
        .custom((value, { req }) => {
          if (new Date(value) <= new Date(req.body.period.startDate)) {
            throw new Error('结束日期必须晚于开始日期');
          }
          return true;
        }),

      body('villageId')
        .isMongoId()
        .withMessage('村庄ID格式不正确'),

      body('categories')
        .isArray({ min: 1 })
        .withMessage('预算分类至少需要一个'),

      body('categories.*.name')
        .if(body('categories').exists())
        .trim()
        .notEmpty()
        .withMessage('分类名称不能为空'),

      body('categories.*.amount')
        .if(body('categories').exists())
        .isFloat({ min: 0 })
        .withMessage('分类金额必须是大于等于0的数字')
    ]
  };

  /**
   * 应急管理相关验证规则
   */
  emergencyValidation = {
    // 创建应急事件验证
    createEvent: [
      body('title')
        .trim()
        .notEmpty()
        .withMessage('事件标题不能为空')
        .isLength({ min: 5, max: 200 })
        .withMessage('事件标题长度必须在5-200个字符之间'),

      body('type')
        .isIn(['fire', 'flood', 'earthquake', 'accident', 'medical', 'weather', 'security', 'other'])
        .withMessage('事件类型不正确'),

      body('level')
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('事件级别不正确'),

      body('description')
        .trim()
        .notEmpty()
        .withMessage('事件描述不能为空')
        .isLength({ min: 10 })
        .withMessage('事件描述至少需要10个字符'),

      body('location.address')
        .trim()
        .notEmpty()
        .withMessage('事件地址不能为空'),

      body('location.coordinates')
        .isArray({ min: 2, max: 2 })
        .withMessage('坐标必须是包含经度和纬度的数组'),

      body('location.coordinates.*')
        .if(body('location.coordinates').exists())
        .isFloat({ min: -180, max: 180 })
        .withMessage('坐标值必须在-180到180之间'),

      body('villageId')
        .isMongoId()
        .withMessage('村庄ID格式不正确'),

      body('reporter.name')
        .trim()
        .notEmpty()
        .withMessage('上报人姓名不能为空'),

      body('reporter.phone')
        .trim()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('上报人手机号格式不正确')
    ],

    // 快速上报验证
    quickReport: [
      body('type')
        .isIn(['fire', 'flood', 'earthquake', 'accident', 'medical', 'weather', 'security', 'other'])
        .withMessage('事件类型不正确'),

      body('level')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('事件级别不正确'),

      body('description')
        .trim()
        .notEmpty()
        .withMessage('事件描述不能为空')
        .isLength({ min: 5, max: 500 })
        .withMessage('事件描述长度必须在5-500个字符之间'),

      body('location.address')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('事件地址不能为空'),

      body('villageId')
        .isMongoId()
        .withMessage('村庄ID格式不正确')
    ]
  };

  /**
   * 通用验证规则
   */
  commonValidation = {
    // 分页验证
    pagination: [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是大于0的整数'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须是1-100之间的整数')
    ],

    // 日期范围验证
    dateRange: [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('开始日期格式不正确'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('结束日期格式不正确')
        .custom((value, { req }) => {
          if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
            throw new Error('结束日期必须晚于开始日期');
          }
          return true;
        })
    ],

    // 村庄ID验证
    villageId: [
      query('villageId')
        .optional()
        .isMongoId()
        .withMessage('村庄ID格式不正确')
    ]
  };

  /**
   * 响应格式化
   */
  formatResponse = (success, data = null, message = null, statusCode = 200, meta = null) => {
    const response = {
      success,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    if (message) {
      if (success) {
        response.message = message;
      } else {
        response.error = message;
      }
    }

    if (meta) {
      response.meta = meta;
    }

    return response;
  };

  /**
   * 成功响应
   */
  success = (data, message = '操作成功', meta = null) => {
    return this.formatResponse(true, data, message, 200, meta);
  };

  /**
   * 错误响应
   */
  error = (message, statusCode = 400, details = null) => {
    const response = this.formatResponse(false, null, message, statusCode);
    if (details) {
      response.details = details;
    }
    return response;
  };
}

// 创建单例实例
const apiValidation = new ApiValidationMiddleware();

// 导出中间件
module.exports = {
  handleValidationErrors: apiValidation.handleValidationErrors,
  residentValidation: apiValidation.residentValidation,
  governanceValidation: apiValidation.governanceValidation,
  financeValidation: apiValidation.financeValidation,
  emergencyValidation: apiValidation.emergencyValidation,
  commonValidation: apiValidation.commonValidation,
  formatResponse: apiValidation.formatResponse.bind(apiValidation),
  success: apiValidation.success.bind(apiValidation),
  error: apiValidation.error.bind(apiValidation)
};