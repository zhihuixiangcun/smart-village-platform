/**
 * 公共服务平台服务层
 * 处理医疗服务、教育服务、就业服务等便民功能
 */

const {
  HealthRecord,
  Appointment,
  StudentProfile,
  TrainingCourse,
  JobSeekerProfile,
  JobPosting
} = require('../models/PublicService');
const { Resident } = require('../models/Resident');
const { Village } = require('../models/Village');
const webSocketService = require('./webSocketService');

// ==================== 医疗服务 ====================

/**
 * 获取健康档案
 */
exports.getHealthRecord = async (residentId) => {
  const record = await HealthRecord.findOne({ residentId })
    .populate('residentId', 'name idNumber phone')
    .populate('villageId', 'name')
    .lean();

  if (!record) {
    // 尝试创建新档案
    const resident = await Resident.findById(residentId);
    if (!resident) {
      throw new Error('村民不存在');
    }

    return await this.createHealthRecord(residentId, {
      villageId: resident.villageId,
      basicInfo: {
        name: resident.name,
        idNumber: resident.idNumber,
        phoneNumber: resident.phone
      }
    });
  }

  return record;
};

/**
 * 创建健康档案
 */
exports.createHealthRecord = async (residentId, recordData) => {
  const resident = await Resident.findById(residentId);
  if (!resident) {
    throw new Error('村民不存在');
  }

  const record = new HealthRecord({
    ...recordData,
    residentId,
    basicInfo: {
      ...recordData.basicInfo,
      name: resident.name
    }
  });

  await record.save();

  return record.populate('residentId villageId');
};

/**
 * 更新健康档案
 */
exports.updateHealthRecord = async (residentId, updates) => {
  const record = await HealthRecord.findOne({ residentId });

  if (!record) {
    throw new Error('健康档案不存在');
  }

  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'object' && updates[key] !== null) {
      record[key] = { ...record[key], ...updates[key] };
    } else {
      record[key] = updates[key];
    }
  });

  await record.save();

  return record.populate('residentId villageId');
};

/**
 * 添加体检记录
 */
exports.addCheckup = async (residentId, checkupData) => {
  const record = await HealthRecord.findOne({ residentId });

  if (!record) {
    throw new Error('健康档案不存在');
  }

  record.checkups.push(checkupData);
  await record.save();

  return record.populate('residentId villageId');
};

/**
 * 创建预约挂号
 */
exports.createAppointment = async (appointmentData, userId) => {
  const { patientId } = appointmentData;

  const resident = await Resident.findById(patientId);
  if (!resident) {
    throw new Error('患者不存在');
  }

  const appointmentNumber = await Appointment.generateAppointmentNumber();

  const appointment = new Appointment({
    ...appointmentData,
    appointmentNumber,
    patientName: resident.name,
    patientIdNumber: resident.idNumber,
    patientPhone: resident.phone,
    status: 'pending',
    createdBy: userId
  });

  await appointment.save();

  // 发送预约成功通知
  if (webSocketService) {
    webSocketService.broadcastToUser(patientId.toString(), {
      type: 'appointment_created',
      data: {
        appointmentId: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        hospital: appointment.hospital.name,
        doctor: appointment.doctor.name,
        appointmentDate: appointment.appointmentInfo.appointmentDate,
        timeSlot: appointment.appointmentInfo.timeSlot
      }
    });
  }

  return appointment;
};

/**
 * 取消预约
 */
exports.cancelAppointment = async (appointmentId, reason, userId) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new Error('预约不存在');
  }

  const now = new Date();
  const appointmentTime = new Date(appointment.appointmentInfo.appointmentDate);
  const hoursDiff = (appointmentTime - now) / (1000 * 60 * 60);

  if (hoursDiff <= 2) {
    throw new Error('预约时间前2小时内不能取消');
  }

  appointment.status = 'cancelled';
  appointment.cancelledBy = userId;
  appointment.cancelledReason = reason;

  await appointment.save();

  return appointment;
};

/**
 * 获取预约列表
 */
exports.getAppointments = async (villageId, options = {}) => {
  const {
    patientId,
    status,
    startDate,
    endDate,
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId };
  if (patientId) query.patientId = patientId;
  if (status) query.status = status;

  if (startDate || endDate) {
    query['appointmentInfo.appointmentDate'] = {};
    if (startDate) query['appointmentInfo.appointmentDate'].$gte = new Date(startDate);
    if (endDate) query['appointmentInfo.appointmentDate'].$lte = new Date(endDate);
  }

  const appointments = await Appointment.find(query)
    .populate('patientId', 'name phone')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    appointments,
    total: await Appointment.countDocuments(query)
  };
};

// ==================== 教育服务 ====================

/**
 * 获取学生档案
 */
exports.getStudentProfile = async (residentId) => {
  const profile = await StudentProfile.findOne({ residentId })
    .populate('residentId', 'name idNumber phone')
    .populate('villageId', 'name')
    .lean();

  if (!profile) {
    const resident = await Resident.findById(residentId);
    if (!resident) {
      throw new Error('村民不存在');
    }

    return await this.createStudentProfile(residentId, {
      villageId: resident.villageId,
      studentInfo: {
        name: resident.name,
        idNumber: resident.idNumber
      }
    });
  }

  return profile;
};

/**
 * 创建学生档案
 */
exports.createStudentProfile = async (residentId, profileData) => {
  const resident = await Resident.findById(residentId);
  if (!resident) {
    throw new Error('村民不存在');
  }

  const profile = new StudentProfile({
    ...profileData,
    residentId,
    studentInfo: {
      ...profileData.studentInfo,
      name: resident.name
    }
  });

  await profile.save();

  return profile.populate('residentId villageId');
};

/**
 * 更新学生档案
 */
exports.updateStudentProfile = async (residentId, updates) => {
  const profile = await StudentProfile.findOne({ residentId });

  if (!profile) {
    throw new Error('学生档案不存在');
  }

  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'object' && updates[key] !== null) {
      profile[key] = { ...profile[key], ...updates[key] };
    } else {
      profile[key] = updates[key];
    }
  });

  await profile.save();

  return profile.populate('residentId villageId');
};

/**
 * 添加考试成绩
 */
exports.addExamScore = async (residentId, scoreData) => {
  const profile = await StudentProfile.findOne({ residentId });

  if (!profile) {
    throw new Error('学生档案不存在');
  }

  profile.examScores.push(scoreData);
  await profile.save();

  return profile.populate('residentId villageId');
};

/**
 * 创建培训课程
 */
exports.createTrainingCourse = async (courseData, userId) => {
  const course = new TrainingCourse({
    ...courseData,
    status: 'draft',
    createdBy: userId
  });

  await course.save();

  // 发布课程通知
  if (course.status === 'open' && webSocketService) {
    webSocketService.notifyVillage(course.villageId.toString(), {
      type: 'training_course_open',
      data: {
        courseId: course._id,
        courseCode: course.courseCode,
        name: course.basicInfo.name,
        category: course.basicInfo.category,
        startDate: course.schedule.startDate
      }
    });
  }

  return course;
};

/**
 * 报名培训课程
 */
exports.registerForCourse = async (courseId, residentId) => {
  const { Resident } = require('../models/Resident');
  const course = await TrainingCourse.findById(courseId);

  if (!course) {
    throw new Error('课程不存在');
  }

  if (course.status !== 'open') {
    throw new Error('课程未开放报名');
  }

  // 检查报名期限
  const now = new Date();
  if (course.registration.closeDate && now > course.registration.closeDate) {
    throw new Error('报名已截止');
  }

  // 检查人数限制
  if (course.details.maxParticipants &&
      course.participants.length >= course.details.maxParticipants) {
    throw new Error('课程已满员');
  }

  // 检查是否已报名
  const existing = course.participants.find(
    p => p.residentId?.toString() === residentId.toString()
  );
  if (existing) {
    throw new Error('您已报名此课程');
  }

  const resident = await Resident.findById(residentId);
  if (!resident) {
    throw new Error('村民不存在');
  }

  course.participants.push({
    residentId,
    name: resident.name,
    phone: resident.phone,
    idNumber: resident.idNumber,
    registeredAt: now
  });

  course.details.currentParticipants = course.participants.length;
  await course.save();

  return course.populate('villageId');
};

/**
 * 获取培训课程列表
 */
exports.getTrainingCourses = async (villageId, options = {}) => {
  const {
    category,
    status = 'open',
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId };
  if (category) query['basicInfo.category'] = category;
  if (status) query.status = status;

  const courses = await TrainingCourse.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    courses,
    total: await TrainingCourse.countDocuments(query)
  };
};

// ==================== 就业服务 ====================

/**
 * 获取求职者档案
 */
exports.getJobSeekerProfile = async (residentId) => {
  const profile = await JobSeekerProfile.findOne({ residentId })
    .populate('residentId', 'name idNumber phone')
    .populate('villageId', 'name')
    .lean();

  if (!profile) {
    const resident = await Resident.findById(residentId);
    if (!resident) {
      throw new Error('村民不存在');
    }

    return await this.createJobSeekerProfile(residentId, {
      villageId: resident.villageId,
      personalInfo: {
        name: resident.name,
        idNumber: resident.idNumber,
        phoneNumber: resident.phone
      }
    });
  }

  return profile;
};

/**
 * 创建求职者档案
 */
exports.createJobSeekerProfile = async (residentId, profileData) => {
  const resident = await Resident.findById(residentId);
  if (!resident) {
    throw new Error('村民不存在');
  }

  const profile = new JobSeekerProfile({
    ...profileData,
    residentId,
    personalInfo: {
      ...profileData.personalInfo,
      name: resident.name
    }
  });

  await profile.save();

  return profile.populate('residentId villageId');
};

/**
 * 更新求职者档案
 */
exports.updateJobSeekerProfile = async (residentId, updates) => {
  const profile = await JobSeekerProfile.findOne({ residentId });

  if (!profile) {
    throw new Error('求职者档案不存在');
  }

  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'object' && updates[key] !== null) {
      profile[key] = { ...profile[key], ...updates[key] };
    } else {
      profile[key] = updates[key];
    }
  });

  await profile.save();

  return profile.populate('residentId villageId');
};

/**
 * 创建招聘信息
 */
exports.createJobPosting = async (postingData, userId) => {
  const postingNumber = await JobPosting.generatePostingNumber();

  const posting = new JobPosting({
    ...postingData,
    postingNumber,
    status: 'active',
    publishedBy: userId
  });

  await posting.save();

  // 推送给符合条件的求职者
  if (webSocketService && posting.villageId) {
    webSocketService.notifyVillage(posting.villageId.toString(), {
      type: 'new_job_posting',
      data: {
        postingId: posting._id,
        postingNumber: posting.postingNumber,
        company: posting.company.name,
        position: posting.position.title,
        salaryMin: posting.compensation.salaryMin,
        salaryMax: posting.compensation.salaryMax
      }
    });
  }

  return posting;
};

/**
 * 申请职位
 */
exports.applyForJob = async (postingId, applicationData, residentId) => {
  const posting = await JobPosting.findById(postingId);

  if (!posting) {
    throw new Error('招聘信息不存在');
  }

  if (posting.status !== 'active') {
    throw new Error('该职位不再接受申请');
  }

  if (posting.recruitment.deadline && new Date() > posting.recruitment.deadline) {
    throw new Error('招聘已截止');
  }

  // 检查是否已申请
  const existing = posting.applications.find(
    app => app.seekerId?.toString() === residentId.toString()
  );
  if (existing) {
    throw new Error('您已申请该职位');
  }

  const profile = await JobSeekerProfile.findOne({ residentId });
  if (!profile) {
    throw new Error('请先完善求职者档案');
  }

  const resident = await Resident.findById(residentId);

  posting.applications.push({
    seekerId: residentId,
    name: resident.name,
    phone: profile.personalInfo.phoneNumber,
    appliedDate: new Date(),
    status: 'pending'
  });

  await posting.save();

  return posting;
};

/**
 * 获取招聘信息列表
 */
exports.getJobPostings = async (options = {}) => {
  const {
    villageId,
    category,
    location,
    status = 'active',
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = {};
  if (status) query.status = status;
  if (category) query['position.category'] = category;
  if (villageId) {
    query.$or = [
      { villageId },
      { isRecommendedFor: villageId }
    ];
  }

  const postings = await JobPosting.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    postings,
    total: await JobPosting.countDocuments(query)
  };
};

/**
 * 获取推荐的职位
 */
exports.getRecommendedJobs = async (residentId, options = {}) => {
  const profile = await JobSeekerProfile.findOne({ residentId }).lean();

  if (!profile || !profile.jobPreferences) {
    throw new Error('请先完善求职意向');
  }

  const { jobPreferences } = profile;
  const { limit = 10, skip = 0 } = options;

  // 根据求职意向构建查询
  const query = {
    status: 'active',
    'position.type': jobPreferences.jobTypes || { $exists: true }
  };

  if (jobPreferences.industries && jobPreferences.industries.length > 0) {
    query['company.industry'] = { $in: jobPreferences.industries };
  }

  if (jobPreferences.expectedLocations && jobPreferences.expectedLocations.length > 0) {
    query['location.city'] = { $in: jobPreferences.expectedLocations };
  }

  const postings = await JobPosting.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    postings,
    total: await JobPosting.countDocuments(query)
  };
};

// ==================== 统计信息 ====================

/**
 * 获取公共服务统计数据
 */
exports.getStatistics = async (villageId) => {
  const [
    totalHealthRecords,
    todayAppointments,
    pendingAppointments,
    totalStudents,
    activeCourses,
    totalJobSeekers,
    activeJobPostings,
    unemployedCount
  ] = await Promise.all([
    HealthRecord.countDocuments({ villageId }),
    Appointment.countDocuments({
      villageId,
      status: { $in: ['pending', 'confirmed'] },
      'appointmentInfo.appointmentDate': {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    }),
    Appointment.countDocuments({
      villageId,
      status: { $in: ['pending', 'confirmed'] }
    }),
    StudentProfile.countDocuments({ villageId }),
    TrainingCourse.countDocuments({
      villageId,
      status: { $in: ['open', 'ongoing'] }
    }),
    JobSeekerProfile.countDocuments({ villageId }),
    JobPosting.countDocuments({ status: 'active' }),
    JobSeekerProfile.countDocuments({
      villageId,
      'employmentStatus.status': 'unemployed'
    })
  ]);

  return {
    healthcare: {
      totalRecords: totalHealthRecords,
      todayAppointments,
      pendingAppointments
    },
    education: {
      totalStudents,
      activeCourses
    },
    employment: {
      totalJobSeekers,
      activeJobPostings,
      unemployedCount
    }
  };
};
