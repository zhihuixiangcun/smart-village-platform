/**
 * 村民档案验证规则
 */

const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// 创建档案验证
exports.createProfile = [
  body('userId')
    .isMongoId()
    .withMessage('用户ID格式不正确'),

  body('familyId')
    .isMongoId()
    .withMessage('家庭ID格式不正确'),

  body('personalInfo.name')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('姓名长度必须在2-20字符之间'),

  body('personalInfo.gender')
    .isIn(['男', '女'])
    .withMessage('性别必须是男或女'),

  body('personalInfo.birthDate')
    .isISO8601()
    .withMessage('出生日期格式不正确'),

  body('personalInfo.age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('年龄必须在0-150之间'),

  body('personalInfo.idCard')
    .isLength({ min: 15, max: 18 })
    .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
    .withMessage('身份证号格式不正确'),

  body('personalInfo.ethnicity')
    .optional()
    .isIn([
      '汉族', '壮族', '满族', '回族', '苗族', '维吾尔族', '土家族', '彝族', '蒙古族', '藏族',
      '布依族', '侗族', '瑶族', '朝鲜族', '白族', '哈尼族', '哈萨克族', '黎族', '傣族',
      '畲族', '傈僳族', '仡佬族', '东乡族', '高山族', '拉祜族', '水族', '佤族', '纳西族',
      '羌族', '土族', '锡伯族', '柯尔克孜族', '达斡尔族', '景颇族', '毛南族', '撒拉族',
      '布朗族', '塔吉克族', '阿昌族', '普米族', '鄂温克族', '怒族', '京族', '基诺族',
      '德昂族', '保安族', '俄罗斯族', '裕固族', '乌孜别克族', '门巴族', '鄂伦春族',
      '独龙族', '塔塔尔族', '赫哲族', '珞巴族'
    ])
    .withMessage('民族无效'),

  body('personalInfo.politicalStatus')
    .optional()
    .isIn([
      '中共党员', '中共预备党员', '共青团员', '民革党员', '民盟盟员', '民建会员',
      '民进会员', '农工党党员', '致公党党员', '九三学社社员', '台盟盟员', '无党派人士', '群众'
    ])
    .withMessage('政治面貌无效'),

  body('personalInfo.maritalStatus')
    .optional()
    .isIn(['未婚', '已婚', '离婚', '丧偶'])
    .withMessage('婚姻状况无效'),

  body('personalInfo.healthStatus')
    .optional()
    .isIn(['健康', '良好', '一般', '较差', '慢性病', '残疾', '重大疾病'])
    .withMessage('健康状况无效'),

  body('personalInfo.bloodType')
    .optional()
    .isIn(['A', 'B', 'AB', 'O', '未知'])
    .withMessage('血型无效'),

  body('personalInfo.height')
    .optional()
    .isFloat({ min: 50, max: 250 })
    .withMessage('身高必须在50-250cm之间'),

  body('personalInfo.weight')
    .optional()
    .isFloat({ min: 20, max: 300 })
    .withMessage('体重必须在20-300kg之间'),

  body('contact.phone')
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式不正确'),

  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确'),

  body('contact.wechat')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('微信号不能超过50字符'),

  body('contact.qq')
    .optional()
    .isNumeric()
    .withMessage('QQ号必须是数字'),

  body('contact.address')
    .trim()
    .notEmpty()
    .withMessage('住址不能为空'),

  body('contact.postalCode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('邮政编码格式不正确'),

  body('education.degree')
    .optional()
    .isIn(['文盲', '小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士'])
    .withMessage('学历无效'),

  body('education.school')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('学校名称不能超过100字符'),

  body('education.major')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('专业不能超过50字符'),

  body('education.graduationYear')
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage('毕业年份无效'),

  body('employment.status')
    .optional()
    .isIn(['在业', '失业', '务农', '个体经营', '退休', '学生', '其他'])
    .withMessage('就业状态无效'),

  body('employment.income.monthly')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('月收入必须大于等于0'),

  body('employment.income.annual')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('年收入必须大于等于0'),

  body('socialSecurity.hasMedicalInsurance')
    .optional()
    .isBoolean()
    .withMessage('是否有医保必须是布尔值'),

  body('socialSecurity.medicalInsuranceType')
    .optional()
    .isIn(['城镇职工医保', '城乡居民医保', '新农合', '商业保险', '无'])
    .withMessage('医保类型无效'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),

  body('tags.*')
    .optional()
    .isIn([
      '党员', '村干部', '退役军人', '残疾人', '低保户', '五保户', '留守儿童', '空巢老人',
      '独居老人', '大病家庭', '单亲家庭', '失独家庭', '烈属', '优抚对象', '困难党员',
      '返乡创业', '农民工', '大学生', '专业技术人才', '其他'
    ])
    .withMessage('标签类型无效'),

  body('privacy.showPersonalInfo')
    .optional()
    .isBoolean()
    .withMessage('显示个人信息必须是布尔值'),

  body('privacy.showContactInfo')
    .optional()
    .isBoolean()
    .withMessage('显示联系信息必须是布尔值'),

  body('privacy.allowProxy')
    .optional()
    .isBoolean()
    .withMessage('允许代理必须是布尔值')
];

// 更新档案验证
exports.updateProfile = [
  param('profileId')
    .isMongoId()
    .withMessage('档案ID格式不正确'),

  body('personalInfo.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('姓名长度必须在2-20字符之间'),

  body('personalInfo.gender')
    .optional()
    .isIn(['男', '女'])
    .withMessage('性别必须是男或女'),

  body('personalInfo.birthDate')
    .optional()
    .isISO8601()
    .withMessage('出生日期格式不正确'),

  body('personalInfo.idCard')
    .optional()
    .isLength({ min: 15, max: 18 })
    .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
    .withMessage('身份证号格式不正确'),

  body('contact.phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式不正确'),

  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确'),

  body('education.degree')
    .optional()
    .isIn(['文盲', '小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士'])
    .withMessage('学历无效'),

  body('employment.status')
    .optional()
    .isIn(['在业', '失业', '务农', '个体经营', '退休', '学生', '其他'])
    .withMessage('就业状态无效'),

  body('employment.employer')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('工作单位不能超过100字符'),

  body('employment.position')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('职位不能超过50字符'),

  body('employment.income.monthly')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('月收入必须大于等于0'),

  body('employment.income.annual')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('年收入必须大于等于0'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),

  body('status')
    .optional()
    .isIn(['正常', '迁出', '死亡', '注销'])
    .withMessage('状态无效')
];

// 搜索档案验证
exports.searchProfiles = [
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
    .isIn(['personalInfo.name', 'createdAt', 'updatedAt', 'personalInfo.age'])
    .withMessage('排序字段无效'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向无效'),

  query('name')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('姓名长度必须在1-20字符之间'),

  query('gender')
    .optional()
    .isIn(['男', '女'])
    .withMessage('性别必须是男或女'),

  query('ageRange')
    .optional()
    .matches(/^\d+-\d+$/)
    .withMessage('年龄范围格式不正确，应为：最小值-最大值'),

  query('education')
    .optional()
    .isIn(['文盲', '小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士'])
    .withMessage('学历无效'),

  query('employment')
    .optional()
    .isIn(['在业', '失业', '务农', '个体经营', '退休', '学生', '其他'])
    .withMessage('就业状态无效'),

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
          [
            '党员', '村干部', '退役军人', '残疾人', '低保户', '五保户', '留守儿童', '空巢老人',
            '独居老人', '大病家庭', '单亲家庭', '失独家庭', '烈属', '优抚对象', '困难党员',
            '返乡创业', '农民工', '大学生', '专业技术人才', '其他'
          ].includes(tag)
        );
      }
      throw new Error('标签格式不正确');
    })
];

// 根据用户ID查询验证
exports.getProfileByUserId = [
  param('userId')
    .isMongoId()
    .withMessage('用户ID格式不正确')
];

// 根据身份证查询验证
exports.getProfileByIdCard = [
  param('idCard')
    .isLength({ min: 15, max: 18 })
    .matches(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/)
    .withMessage('身份证号格式不正确')
];

// 更新标签验证
exports.updateTags = [
  param('profileId')
    .isMongoId()
    .withMessage('档案ID格式不正确'),

  body('tags')
    .isArray()
    .withMessage('标签必须是数组'),

  body('tags.*')
    .isIn([
      '党员', '村干部', '退役军人', '残疾人', '低保户', '五保户', '留守儿童', '空巢老人',
      '独居老人', '大病家庭', '单亲家庭', '失独家庭', '烈属', '优抚对象', '困难党员',
      '返乡创业', '农民工', '大学生', '专业技术人才', '其他'
    ])
    .withMessage('标签类型无效')
];

// 获取统计数据验证
exports.getProfileStats = [
  query('village')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('村名长度必须在2-50字符之间')
];

// 获取特殊人群验证
exports.getSpecialGroups = [
  param('groupType')
    .isIn([
      '党员', '村干部', '退役军人', '残疾人', '低保户', '五保户', '留守儿童', '空巢老人',
      '独居老人', '大病家庭', '单亲家庭', '失独家庭', '烈属', '优抚对象', '困难党员',
      '返乡创业', '农民工', '大学生', '专业技术人才', '其他'
    ])
    .withMessage('特殊人群类型无效'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
];

// 导出数据验证
exports.exportProfiles = [
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('导出格式必须是json或csv'),

  query('filters')
    .optional()
    .isJSON()
    .withMessage('过滤条件必须是有效的JSON字符串')
];