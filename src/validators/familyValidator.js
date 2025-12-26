/**
 * 家庭管理验证规则
 */

const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// 创建家庭验证
exports.createFamily = [
  body('familyName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('家庭名称长度必须在2-50字符之间'),

  body('familyType')
    .optional()
    .isIn(['普通户', '低保户', '特困户', '独生户', '双女户', '其他'])
    .withMessage('家庭类型无效'),

  body('address.province')
    .trim()
    .notEmpty()
    .withMessage('省份不能为空'),

  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('城市不能为空'),

  body('address.county')
    .trim()
    .notEmpty()
    .withMessage('区县不能为空'),

  body('address.town')
    .trim()
    .notEmpty()
    .withMessage('乡镇不能为空'),

  body('address.village')
    .trim()
    .notEmpty()
    .withMessage('村名不能为空'),

  body('address.group')
    .optional()
    .trim()
    .withMessage('村民组格式错误'),

  body('address.detail')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('详细地址不能超过200字符'),

  body('contact.primaryPhone')
    .isMobilePhone('zh-CN')
    .withMessage('主要手机号格式不正确'),

  body('contact.secondaryPhone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('备用手机号格式不正确'),

  body('contact.emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('紧急联系人姓名长度必须在2-20字符之间'),

  body('contact.emergencyContact.phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('紧急联系人电话格式不正确'),

  body('contact.emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('与紧急联系人关系不能超过20字符'),

  body('members')
    .isArray({ min: 1 })
    .withMessage('家庭成员列表不能为空'),

  body('members.*.userId')
    .isMongoId()
    .withMessage('用户ID格式不正确'),

  body('members.*.name')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('成员姓名长度必须在2-20字符之间'),

  body('members.*.idCard')
    .isLength({ min: 15, max: 18 })
    .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
    .withMessage('身份证号格式不正确'),

  body('members.*.relationship')
    .isIn(['户主', '配偶', '子女', '父母', '祖父母', '兄弟姐妹', '其他'])
    .withMessage('家庭关系类型无效'),

  body('members.*.isHead')
    .isBoolean()
    .withMessage('是否户主必须是布尔值'),

  body('members.*.phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式不正确'),

  body('members.*.occupation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('职业不能超过50字符'),

  body('members.*.education')
    .optional()
    .isIn(['文盲', '小学', '初中', '高中', '大专', '本科', '研究生'])
    .withMessage('学历无效'),

  body('members.*.healthStatus')
    .optional()
    .isIn(['健康', '慢性病', '残疾', '大病', '其他'])
    .withMessage('健康状况无效'),

  body('familyCode')
    .optional()
    .matches(/^F\d{6}\d{4}[A-F0-9]{6}$/)
    .withMessage('家庭编码格式不正确'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),

  body('tags.*')
    .optional()
    .isIn(['党员户', '军人家庭', '优抚对象', '残疾人家庭', '留守儿童', '空巢老人', '其他'])
    .withMessage('标签类型无效')
];

// 更新家庭验证
exports.updateFamily = [
  param('familyId')
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  body('familyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('家庭名称长度必须在2-50字符之间'),

  body('familyType')
    .optional()
    .isIn(['普通户', '低保户', '特困户', '独生户', '双女户', '其他'])
    .withMessage('家庭类型无效'),

  body('address.province')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('省份不能为空'),

  body('address.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('城市不能为空'),

  body('address.county')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('区县不能为空'),

  body('address.town')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('乡镇不能为空'),

  body('address.village')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('村名不能为空'),

  body('contact.primaryPhone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('主要手机号格式不正确'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),

  body('status')
    .optional()
    .isIn(['正常', '迁出', '注销', '合并'])
    .withMessage('状态无效')
];

// 添加家庭成员验证
exports.addFamilyMember = [
  param('familyId')
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  body('userId')
    .isMongoId()
    .withMessage('用户ID格式不正确'),

  body('name')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('成员姓名长度必须在2-20字符之间'),

  body('idCard')
    .isLength({ min: 15, max: 18 })
    .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
    .withMessage('身份证号格式不正确'),

  body('relationship')
    .isIn(['户主', '配偶', '子女', '父母', '祖父母', '兄弟姐妹', '其他'])
    .withMessage('家庭关系类型无效'),

  body('isHead')
    .optional()
    .isBoolean()
    .withMessage('是否户主必须是布尔值'),

  body('phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式不正确'),

  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('职业不能超过50字符'),

  body('education')
    .optional()
    .isIn(['文盲', '小学', '初中', '高中', '大专', '本科', '研究生'])
    .withMessage('学历无效'),

  body('healthStatus')
    .optional()
    .isIn(['健康', '慢性病', '残疾', '大病', '其他'])
    .withMessage('健康状况无效'),

  body('insuranceType')
    .optional()
    .isArray()
    .withMessage('保险类型必须是数组'),

  body('insuranceType.*')
    .optional()
    .isIn(['城镇职工医保', '城乡居民医保', '商业保险', '无'])
    .withMessage('保险类型无效')
];

// 更新家庭成员验证
exports.updateFamilyMember = [
  param('familyId')
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  param('memberId')
    .isMongoId()
    .withMessage('成员ID格式不正确'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('成员姓名长度必须在2-20字符之间'),

  body('relationship')
    .optional()
    .isIn(['户主', '配偶', '子女', '父母', '祖父母', '兄弟姐妹', '其他'])
    .withMessage('家庭关系类型无效'),

  body('isHead')
    .optional()
    .isBoolean()
    .withMessage('是否户主必须是布尔值'),

  body('phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式不正确'),

  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('职业不能超过50字符'),

  body('education')
    .optional()
    .isIn(['文盲', '小学', '初中', '高中', '大专', '本科', '研究生'])
    .withMessage('学历无效'),

  body('healthStatus')
    .optional()
    .isIn(['健康', '慢性病', '残疾', '大病', '其他'])
    .withMessage('健康状况无效')
];

// 添加代理关系验证
exports.addAgent = [
  param('familyId')
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  body('userId')
    .isMongoId()
    .withMessage('代理用户ID格式不正确'),

  body('name')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('代理姓名长度必须在2-20字符之间'),

  body('relationship')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('关系长度必须在2-20字符之间'),

  body('permissions')
    .isArray({ min: 1 })
    .withMessage('权限列表不能为空'),

  body('permissions.*')
    .isIn(['查看档案', '办理业务', '代签文件', '其他'])
    .withMessage('权限类型无效'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式不正确'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式不正确'),

  body().custom((value, { req }) => {
    if (req.body.startDate && req.body.endDate) {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      if (endDate <= startDate) {
        throw new Error('结束日期必须大于开始日期');
      }
    }
    return true;
  })
];

// 获取家庭列表验证
exports.getFamilyList = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),

  query('sortBy')
    .optional()
    .isIn(['familyName', 'createdAt', 'updatedAt', 'memberCount'])
    .withMessage('排序字段无效'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向无效'),

  query('familyType')
    .optional()
    .isIn(['普通户', '低保户', '特困户', '独生户', '双女户', '其他'])
    .withMessage('家庭类型无效'),

  query('search')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('搜索关键词长度必须在1-50字符之间'),

  query('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every(tag =>
          ['党员户', '军人家庭', '优抚对象', '残疾人家庭', '留守儿童', '空巢老人', '其他'].includes(tag)
        );
      }
      throw new Error('标签格式不正确');
    })
];

// 根据家庭编码查询验证
exports.getFamilyByCode = [
  param('familyCode')
    .matches(/^F\d{6}\d{4}[A-F0-9]{6}$/)
    .withMessage('家庭编码格式不正确')
];

// 根据身份证查询验证
exports.findByIdCard = [
  param('idCard')
    .isLength({ min: 15, max: 18 })
    .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
    .withMessage('身份证号格式不正确')
];

// 检查代理权限验证
exports.checkAgentPermission = [
  param('familyId')
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  query('permission')
    .isIn(['查看档案', '办理业务', '代签文件', '其他'])
    .withMessage('权限类型无效')
];

// 获取家庭统计数据验证
exports.getFamilyStats = [
  query('village')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('村名长度必须在2-50字符之间')
];

// 获取家庭关系图验证
exports.getFamilyRelationships = [
  param('familyId')
    .isMongoId()
    .withMessage('家庭ID格式不正确')
];