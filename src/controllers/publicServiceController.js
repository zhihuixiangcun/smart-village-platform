/**
 * 公共服务平台控制器
 * 处理医疗服务、教育服务、就业服务等HTTP请求
 */

const publicService = require('../services/publicService');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== 医疗服务 ====================

/**
 * 获取健康档案
 */
exports.getHealthRecord = async (req, res) => {
  try {
    const { residentId } = req.params;

    const record = await publicService.getHealthRecord(residentId);

    return successResponse(res, record);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建健康档案
 */
exports.createHealthRecord = async (req, res) => {
  try {
    const { residentId } = req.params;

    const record = await publicService.createHealthRecord(residentId, req.body);

    return successResponse(res, record, '健康档案创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新健康档案
 */
exports.updateHealthRecord = async (req, res) => {
  try {
    const { residentId } = req.params;

    const record = await publicService.updateHealthRecord(residentId, req.body);

    return successResponse(res, record, '健康档案更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 添加体检记录
 */
exports.addCheckup = async (req, res) => {
  try {
    const { residentId } = req.params;

    const record = await publicService.addCheckup(residentId, req.body);

    return successResponse(res, record, '体检记录添加成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建预约挂号
 */
exports.createAppointment = async (req, res) => {
  try {
    const userId = req.user.id;

    const appointment = await publicService.createAppointment(req.body, userId);

    return successResponse(res, appointment, '预约成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 取消预约
 */
exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const appointment = await publicService.cancelAppointment(appointmentId, reason, userId);

    return successResponse(res, appointment, '预约已取消');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取预约列表
 */
exports.getAppointments = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      patientId: req.query.patientId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await publicService.getAppointments(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 教育服务 ====================

/**
 * 获取学生档案
 */
exports.getStudentProfile = async (req, res) => {
  try {
    const { residentId } = req.params;

    const profile = await publicService.getStudentProfile(residentId);

    return successResponse(res, profile);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建学生档案
 */
exports.createStudentProfile = async (req, res) => {
  try {
    const { residentId } = req.params;

    const profile = await publicService.createStudentProfile(residentId, req.body);

    return successResponse(res, profile, '学生档案创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新学生档案
 */
exports.updateStudentProfile = async (req, res) => {
  try {
    const { residentId } = req.params;

    const profile = await publicService.updateStudentProfile(residentId, req.body);

    return successResponse(res, profile, '学生档案更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 添加考试成绩
 */
exports.addExamScore = async (req, res) => {
  try {
    const { residentId } = req.params;

    const profile = await publicService.addExamScore(residentId, req.body);

    return successResponse(res, profile, '考试成绩添加成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建培训课程
 */
exports.createTrainingCourse = async (req, res) => {
  try {
    const userId = req.user.id;

    const course = await publicService.createTrainingCourse(req.body, userId);

    return successResponse(res, course, '课程创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 报名培训课程
 */
exports.registerForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // 通过userId获取residentId
    const { Resident } = require('../models/Resident');
    const resident = await Resident.findOne({ userId });
    if (!resident) {
      return errorResponse(res, '未找到关联的村民信息', 400);
    }

    const course = await publicService.registerForCourse(courseId, resident._id);

    return successResponse(res, course, '报名成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取培训课程列表
 */
exports.getTrainingCourses = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      category: req.query.category,
      status: req.query.status,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await publicService.getTrainingCourses(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 就业服务 ====================

/**
 * 获取求职者档案
 */
exports.getJobSeekerProfile = async (req, res) => {
  try {
    const { residentId } = req.params;

    const profile = await publicService.getJobSeekerProfile(residentId);

    return successResponse(res, profile);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建求职者档案
 */
exports.createJobSeekerProfile = async (req, res) => {
  try {
    const { residentId } = req.params;

    const profile = await publicService.createJobSeekerProfile(residentId, req.body);

    return successResponse(res, profile, '求职者档案创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新求职者档案
 */
exports.updateJobSeekerProfile = async (req, res) => {
  try {
    const { residentId } = req.params;

    const profile = await publicService.updateJobSeekerProfile(residentId, req.body);

    return successResponse(res, profile, '求职者档案更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建招聘信息
 */
exports.createJobPosting = async (req, res) => {
  try {
    const userId = req.user.id;

    const posting = await publicService.createJobPosting(req.body, userId);

    return successResponse(res, posting, '招聘信息发布成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 申请职位
 */
exports.applyForJob = async (req, res) => {
  try {
    const { postingId } = req.params;
    const userId = req.user.id;

    // 通过userId获取residentId
    const { Resident } = require('../models/Resident');
    const resident = await Resident.findOne({ userId });
    if (!resident) {
      return errorResponse(res, '未找到关联的村民信息', 400);
    }

    const posting = await publicService.applyForJob(postingId, req.body, resident._id);

    return successResponse(res, posting, '职位申请成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取招聘信息列表
 */
exports.getJobPostings = async (req, res) => {
  try {
    const options = {
      villageId: req.query.villageId,
      category: req.query.category,
      location: req.query.location,
      status: req.query.status,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await publicService.getJobPostings(options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取推荐职位
 */
exports.getRecommendedJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    // 通过userId获取residentId
    const { Resident } = require('../models/Resident');
    const resident = await Resident.findOne({ userId });
    if (!resident) {
      return errorResponse(res, '未找到关联的村民信息', 400);
    }

    const options = {
      limit: parseInt(req.query.limit) || 10,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await publicService.getRecommendedJobs(resident._id, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 统计信息 ====================

/**
 * 获取公共服务统计数据
 */
exports.getStatistics = async (req, res) => {
  try {
    const { villageId } = req.params;

    const statistics = await publicService.getStatistics(villageId);

    return successResponse(res, statistics);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
