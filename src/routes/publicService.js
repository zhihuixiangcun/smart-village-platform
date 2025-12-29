/**
 * 公共服务平台API路由
 * 处理医疗服务、教育服务、就业服务等RESTful接口
 */

const express = require('express');
const router = express.Router();
const publicServiceController = require('../controllers/publicServiceController');
const { authenticate } = require('../middleware/auth');
const { body, param } = require('express-validator');

// 验证中间件
const validate = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

// ==================== 医疗服务 ====================

/**
 * @route   GET /api/v1/residents/:residentId/health-record
 * @desc    获取健康档案
 * @access  Private
 */
router.get(
  '/residents/:residentId/health-record',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  validate,
  publicServiceController.getHealthRecord
);

/**
 * @route   POST /api/v1/residents/:residentId/health-record
 * @desc    创建健康档案
 * @access  Private
 */
router.post(
  '/residents/:residentId/health-record',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('basicInfo.name').notEmpty().withMessage('姓名不能为空'),
  validate,
  publicServiceController.createHealthRecord
);

/**
 * @route   PUT /api/v1/residents/:residentId/health-record
 * @desc    更新健康档案
 * @access  Private
 */
router.put(
  '/residents/:residentId/health-record',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  validate,
  publicServiceController.updateHealthRecord
);

/**
 * @route   POST /api/v1/residents/:residentId/health-checkups
 * @desc    添加体检记录
 * @access  Private
 */
router.post(
  '/residents/:residentId/health-checkups',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  body('checkupDate').isISO8601().withMessage('checkupDate格式无效'),
  body('institution').notEmpty().withMessage('institution不能为空'),
  validate,
  publicServiceController.addCheckup
);

/**
 * @route   POST /api/v1/appointments
 * @desc    创建预约挂号
 * @access  Private
 */
router.post(
  '/appointments',
  authenticate,
  body('patientId').isMongoId().withMessage('patientId无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('hospital.name').notEmpty().withMessage('医院名称不能为空'),
  body('hospital.department').notEmpty().withMessage('科室不能为空'),
  body('doctor.name').notEmpty().withMessage('医生姓名不能为空'),
  body('appointmentInfo.appointmentDate').isISO8601().withMessage('appointmentDate格式无效'),
  body('appointmentInfo.timeSlot').notEmpty().withMessage('timeSlot不能为空'),
  validate,
  publicServiceController.createAppointment
);

/**
 * @route   POST /api/v1/appointments/:appointmentId/cancel
 * @desc    取消预约
 * @access  Private
 */
router.post(
  '/appointments/:appointmentId/cancel',
  authenticate,
  param('appointmentId').isMongoId().withMessage('appointmentId无效'),
  body('reason').optional(),
  validate,
  publicServiceController.cancelAppointment
);

/**
 * @route   GET /api/v1/villages/:villageId/appointments
 * @desc    获取预约列表
 * @access  Private
 */
router.get(
  '/villages/:villageId/appointments',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  publicServiceController.getAppointments
);

// ==================== 教育服务 ====================

/**
 * @route   GET /api/v1/residents/:residentId/student-profile
 * @desc    获取学生档案
 * @access  Private
 */
router.get(
  '/residents/:residentId/student-profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  validate,
  publicServiceController.getStudentProfile
);

/**
 * @route   POST /api/v1/residents/:residentId/student-profile
 * @desc    创建学生档案
 * @access  Private
 */
router.post(
  '/residents/:residentId/student-profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('studentInfo.name').notEmpty().withMessage('姓名不能为空'),
  validate,
  publicServiceController.createStudentProfile
);

/**
 * @route   PUT /api/v1/residents/:residentId/student-profile
 * @desc    更新学生档案
 * @access  Private
 */
router.put(
  '/residents/:residentId/student-profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  validate,
  publicServiceController.updateStudentProfile
);

/**
 * @route   POST /api/v1/residents/:residentId/exam-scores
 * @desc    添加考试成绩
 * @access  Private
 */
router.post(
  '/residents/:residentId/exam-scores',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  body('examName').notEmpty().withMessage('examName不能为空'),
  body('examDate').isISO8601().withMessage('examDate格式无效'),
  validate,
  publicServiceController.addExamScore
);

/**
 * @route   POST /api/v1/training-courses
 * @desc    创建培训课程
 * @access  Private
 */
router.post(
  '/training-courses',
  authenticate,
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('courseCode').notEmpty().withMessage('courseCode不能为空'),
  body('basicInfo.name').notEmpty().withMessage('课程名称不能为空'),
  body('basicInfo.category').isIn(['agriculture', 'vocational', 'entrepreneurship', 'digital', 'health', 'culture', 'other']).withMessage('category无效'),
  validate,
  publicServiceController.createTrainingCourse
);

/**
 * @route   POST /api/v1/training-courses/:courseId/register
 * @desc    报名培训课程
 * @access  Private
 */
router.post(
  '/training-courses/:courseId/register',
  authenticate,
  param('courseId').isMongoId().withMessage('courseId无效'),
  validate,
  publicServiceController.registerForCourse
);

/**
 * @route   GET /api/v1/villages/:villageId/training-courses
 * @desc    获取培训课程列表
 * @access  Public
 */
router.get(
  '/villages/:villageId/training-courses',
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  publicServiceController.getTrainingCourses
);

// ==================== 就业服务 ====================

/**
 * @route   GET /api/v1/residents/:residentId/job-seeker-profile
 * @desc    获取求职者档案
 * @access  Private
 */
router.get(
  '/residents/:residentId/job-seeker-profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  validate,
  publicServiceController.getJobSeekerProfile
);

/**
 * @route   POST /api/v1/residents/:residentId/job-seeker-profile
 * @desc    创建求职者档案
 * @access  Private
 */
router.post(
  '/residents/:residentId/job-seeker-profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  body('villageId').isMongoId().withMessage('villageId无效'),
  body('personalInfo.name').notEmpty().withMessage('姓名不能为空'),
  validate,
  publicServiceController.createJobSeekerProfile
);

/**
 * @route   PUT /api/v1/residents/:residentId/job-seeker-profile
 * @desc    更新求职者档案
 * @access  Private
 */
router.put(
  '/residents/:residentId/job-seeker-profile',
  authenticate,
  param('residentId').isMongoId().withMessage('residentId无效'),
  validate,
  publicServiceController.updateJobSeekerProfile
);

/**
 * @route   POST /api/v1/job-postings
 * @desc    创建招聘信息
 * @access  Private
 */
router.post(
  '/job-postings',
  authenticate,
  body('company.name').notEmpty().withMessage('公司名称不能为空'),
  body('position.title').notEmpty().withMessage('职位名称不能为空'),
  body('position.headCount').isInt({ min: 1 }).withMessage('headCount必须大于0'),
  validate,
  publicServiceController.createJobPosting
);

/**
 * @route   POST /api/v1/job-postings/:postingId/apply
 * @desc    申请职位
 * @access  Private
 */
router.post(
  '/job-postings/:postingId/apply',
  authenticate,
  param('postingId').isMongoId().withMessage('postingId无效'),
  validate,
  publicServiceController.applyForJob
);

/**
 * @route   GET /api/v1/job-postings
 * @desc    获取招聘信息列表
 * @access  Public
 */
router.get(
  '/job-postings',
  validate,
  publicServiceController.getJobPostings
);

/**
 * @route   GET /api/v1/job-seeker/recommended-jobs
 * @desc    获取推荐职位
 * @access  Private
 */
router.get(
  '/job-seeker/recommended-jobs',
  authenticate,
  validate,
  publicServiceController.getRecommendedJobs
);

// ==================== 统计信息 ====================

/**
 * @route   GET /api/v1/villages/:villageId/public-service-statistics
 * @desc    获取公共服务统计数据
 * @access  Private
 */
router.get(
  '/villages/:villageId/public-service-statistics',
  authenticate,
  param('villageId').isMongoId().withMessage('villageId无效'),
  validate,
  publicServiceController.getStatistics
);

module.exports = router;
