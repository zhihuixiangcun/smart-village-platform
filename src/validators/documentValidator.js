/**
 * 文档管理验证规则
 */

const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// 上传文档验证
exports.uploadDocument = [
  body('userId')
    .isMongoId()
    .withMessage('用户ID格式不正确'),

  body('familyId')
    .optional()
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('文档名称长度必须在2-100字符之间'),

  body('type')
    .isIn([
      '身份证', '户口本', '结婚证', '离婚证', '出生证明', '死亡证明',
      '房产证', '土地证', '承包合同', '营业执照', '卫生许可证',
      '毕业证', '学位证', '职业资格证', '技能等级证', '培训证书',
      '残疾证', '低保证', '五保证', '优待证', '退役军人证',
      '医疗证', '社保卡', '医保卡', '公积金卡',
      '驾驶证', '行驶证', '车辆登记证',
      '申请表', '审批表', '证明材料', '合同协议',
      '其他'
    ])
    .withMessage('文档类型无效'),

  body('number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('证件号码不能超过50字符'),

  body('issuingAuthority')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('发证机关不能超过100字符'),

  body('issueDate')
    .optional()
    .isISO8601()
    .withMessage('发证日期格式不正确'),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('到期日期格式不正确'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),

  body('tags.*')
    .optional()
    .isIn(['重要', '常用', '备份', '原件', '复印件', '扫描件', '照片', '电子版'])
    .withMessage('标签类型无效'),

  body().custom((value, { req }) => {
    if (req.body.issueDate && req.body.expiryDate) {
      const issueDate = new Date(req.body.issueDate);
      const expiryDate = new Date(req.body.expiryDate);
      if (expiryDate <= issueDate) {
        throw new Error('到期日期必须大于发证日期');
      }
    }
    return true;
  })
];

// 更新文档验证
exports.updateDocument = [
  param('documentId')
    .isMongoId()
    .withMessage('文档ID格式不正确'),

  body('documentInfo.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('文档名称长度必须在2-100字符之间'),

  body('documentInfo.type')
    .optional()
    .isIn([
      '身份证', '户口本', '结婚证', '离婚证', '出生证明', '死亡证明',
      '房产证', '土地证', '承包合同', '营业执照', '卫生许可证',
      '毕业证', '学位证', '职业资格证', '技能等级证', '培训证书',
      '残疾证', '低保证', '五保证', '优待证', '退役军人证',
      '医疗证', '社保卡', '医保卡', '公积金卡',
      '驾驶证', '行驶证', '车辆登记证',
      '申请表', '审批表', '证明材料', '合同协议',
      '其他'
    ])
    .withMessage('文档类型无效'),

  body('documentInfo.number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('证件号码不能超过50字符'),

  body('documentInfo.issuingAuthority')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('发证机关不能超过100字符'),

  body('documentInfo.issueDate')
    .optional()
    .isISO8601()
    .withMessage('发证日期格式不正确'),

  body('documentInfo.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('到期日期格式不正确'),

  body('documentInfo.status')
    .optional()
    .isIn(['有效', '过期', '挂失', '补办中', '已注销'])
    .withMessage('文档状态无效'),

  body('category')
    .optional()
    .isIn(['身份证明', '户籍证明', '婚姻证明', '学历证明', '职业资格', '财产证明', '许可证明', '社会保障', '其他'])
    .withMessage('文档分类无效'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),

  body('tags.*')
    .optional()
    .isIn(['重要', '常用', '备份', '原件', '复印件', '扫描件', '照片', '电子版'])
    .withMessage('标签类型无效'),

  body('keywords')
    .optional()
    .isArray()
    .withMessage('关键词必须是数组'),

  body('privacy.isPublic')
    .optional()
    .isBoolean()
    .withMessage('是否公开必须是布尔值'),

  body('privacy.accessLevel')
    .optional()
    .isIn(['公开', '保密', '机密', '绝密'])
    .withMessage('访问级别无效')
];

// 分享文档验证
exports.shareDocument = [
  param('documentId')
    .isMongoId()
    .withMessage('文档ID格式不正确'),

  body('sharedWith')
    .isArray({ min: 1 })
    .withMessage('请选择至少一个分享对象'),

  body('sharedWith.*')
    .isMongoId()
    .withMessage('分享对象ID格式不正确'),

  body('permission')
    .optional()
    .isIn(['查看', '下载', '打印', '编辑'])
    .withMessage('权限级别无效')
];

// 获取文档列表验证
exports.getDocumentList = [
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
    .isIn(['documentInfo.name', 'createdAt', 'updatedAt', 'documentInfo.expiryDate', 'fileInfo.fileSize'])
    .withMessage('排序字段无效'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向无效'),

  query('userId')
    .optional()
    .isMongoId()
    .withMessage('用户ID格式不正确'),

  query('familyId')
    .optional()
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  query('category')
    .optional()
    .isIn(['身份证明', '户籍证明', '婚姻证明', '学历证明', '职业资格', '财产证明', '许可证明', '社会保障', '其他'])
    .withMessage('文档分类无效'),

  query('documentType')
    .optional()
    .isIn([
      '身份证', '户口本', '结婚证', '离婚证', '出生证明', '死亡证明',
      '房产证', '土地证', '承包合同', '营业执照', '卫生许可证',
      '毕业证', '学位证', '职业资格证', '技能等级证', '培训证书',
      '残疾证', '低保证', '五保证', '优待证', '退役军人证',
      '医疗证', '社保卡', '医保卡', '公积金卡',
      '驾驶证', '行驶证', '车辆登记证',
      '申请表', '审批表', '证明材料', '合同协议',
      '其他'
    ])
    .withMessage('文档类型无效'),

  query('status')
    .optional()
    .isIn(['有效', '过期', '挂失', '补办中', '已注销'])
    .withMessage('文档状态无效'),

  query('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return ['重要', '常用', '备份', '原件', '复印件', '扫描件', '照片', '电子版'].includes(value);
      }
      if (Array.isArray(value)) {
        return value.every(tag =>
          ['重要', '常用', '备份', '原件', '复印件', '扫描件', '照片', '电子版'].includes(tag)
        );
      }
      throw new Error('标签格式不正确');
    })
    .withMessage('标签无效'),

  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('搜索关键词长度必须在1-100字符之间'),

  query('expiringSoon')
    .optional()
    .isBoolean()
    .withMessage('即将过期标志必须是布尔值')
];

// 获取我的文档验证
exports.getMyDocuments = [
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
    .isIn(['documentInfo.name', 'createdAt', 'updatedAt', 'documentInfo.expiryDate'])
    .withMessage('排序字段无效'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向无效'),

  query('category')
    .optional()
    .isIn(['身份证明', '户籍证明', '婚姻证明', '学历证明', '职业资格', '财产证明', '许可证明', '社会保障', '其他'])
    .withMessage('文档分类无效'),

  query('documentType')
    .optional()
    .isIn([
      '身份证', '户口本', '结婚证', '离婚证', '出生证明', '死亡证明',
      '房产证', '土地证', '承包合同', '营业执照', '卫生许可证',
      '毕业证', '学位证', '职业资格证', '技能等级证', '培训证书',
      '残疾证', '低保证', '五保证', '优待证', '退役军人证',
      '医疗证', '社保卡', '医保卡', '公积金卡',
      '驾驶证', '行驶证', '车辆登记证',
      '申请表', '审批表', '证明材料', '合同协议',
      '其他'
    ])
    .withMessage('文档类型无效'),

  query('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return ['重要', '常用', '备份', '原件', '复印件', '扫描件', '照片', '电子版'].includes(value);
      }
      if (Array.isArray(value)) {
        return value.every(tag =>
          ['重要', '常用', '备份', '原件', '复印件', '扫描件', '照片', '电子版'].includes(tag)
        );
      }
      throw new Error('标签格式不正确');
    })
    .withMessage('标签无效'),

  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('搜索关键词长度必须在1-100字符之间')
];

// 获取统计数据验证
exports.getDocumentStats = [
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('用户ID格式不正确'),

  query('familyId')
    .optional()
    .isMongoId()
    .withMessage('家庭ID格式不正确')
];

// 语音读取验证
exports.readDocumentContent = [
  param('documentId')
    .isMongoId()
    .withMessage('文档ID格式不正确'),

  query('language')
    .optional()
    .isIn(['zh-CN', 'en-US', 'ja-JP'])
    .withMessage('不支持的语言类型')
];

// 批量上传验证
exports.batchUploadDocuments = [
  body('documentsInfo')
    .isArray({ min: 1 })
    .withMessage('文档信息不能为空'),

  body('documentsInfo.*.userId')
    .isMongoId()
    .withMessage('用户ID格式不正确'),

  body('documentsInfo.*.familyId')
    .optional()
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  body('documentsInfo.*.type')
    .isIn([
      '身份证', '户口本', '结婚证', '离婚证', '出生证明', '死亡证明',
      '房产证', '土地证', '承包合同', '营业执照', '卫生许可证',
      '毕业证', '学位证', '职业资格证', '技能等级证', '培训证书',
      '残疾证', '低保证', '五保证', '优待证', '退役军人证',
      '医疗证', '社保卡', '医保卡', '公积金卡',
      '驾驶证', '行驶证', '车辆登记证',
      '申请表', '审批表', '证明材料', '合同协议',
      '其他'
    ])
    .withMessage('文档类型无效')
];

// 通用文档ID验证
exports.documentId = [
  param('documentId')
    .isMongoId()
    .withMessage('文档ID格式不正确')
];