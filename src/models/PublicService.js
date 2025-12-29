/**
 * 公共服务平台模型
 * 处理医疗服务、教育服务、就业服务等便民功能
 */

const mongoose = require('mongoose');

// ==================== 医疗服务 ====================

/**
 * 健康档案模型
 */
const HealthRecordSchema = new mongoose.Schema({
  // 基础信息
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    unique: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 基本信息
  basicInfo: {
    name: { type: String, required: true },
    idNumber: String,
    gender: { type: String, enum: ['male', 'female'] },
    birthDate: Date,
    bloodType: { type: String, enum: ['A', 'B', 'AB', 'O', 'unknown'] },
    rhFactor: { type: String, enum: ['positive', 'negative', 'unknown'] },
    phoneNumber: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },

  // 健康指标
  healthMetrics: {
    height: Number,      // 身高(cm)
    weight: Number,      // 体重(kg)
    bmi: Number,         // BMI指数
    bloodPressure: {
      systolic: Number,  // 收缩压
      diastolic: Number  // 舒张压
    },
    bloodSugar: Number,  // 血糖
    heartRate: Number,   // 心率
    vision: {
      left: Number,
      right: Number
    }
  },

  // 健康状况
  healthStatus: {
    allergies: [String],           // 过敏史
    chronicDiseases: [String],     // 慢性病
    surgeries: [{                  // 手术史
      name: String,
      date: Date,
      hospital: String
    }],
    medications: [{               // 用药情况
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date
    }],
    vaccinations: [{              // 疫苗接种
      vaccineName: String,
      vaccinationDate: Date,
      manufacturer: String,
      batchNumber: String
    }]
  },

  // 残疾情况
  disability: {
    hasDisability: { type: Boolean, default: false },
    type: String,
    level: { type: String, enum: ['1', '2', '3', '4'] },
    certificateNumber: String
  },

  // 体检记录
  checkups: [{
    checkupDate: Date,
    institution: String,
    doctor: String,
    summary: String,
    findings: String,
    recommendations: String,
    attachments: [String]
  }],

  // 就诊记录
  medicalVisits: [{
    visitDate: Date,
    institution: String,
    department: String,
    doctor: String,
    chiefComplaint: String,
    diagnosis: String,
    prescription: String,
    cost: Number,
    reimbursement: Number
  }],

  // 健康提醒
  healthReminders: [{
    type: {
      type: String,
      enum: ['checkup', 'medication', 'vaccination', 'follow_up', 'other']
    },
    title: String,
    description: String,
    dueDate: Date,
    completed: { type: Boolean, default: false }
  }],

  // 签约家庭医生
  familyDoctor: {
    signed: { type: Boolean, default: false },
    doctorName: String,
    hospital: String,
    contractStartDate: Date,
    contractEndDate: Date,
    services: [String]  // 提供的医疗服务
  },

  // 健康档案创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'health_records'
});

/**
 * 预约挂号模型
 */
const AppointmentSchema = new mongoose.Schema({
  // 预约编号
  appointmentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 患者信息
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true
  },
  patientName: String,
  patientIdNumber: String,
  patientPhone: String,
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 医院信息
  hospital: {
    name: { type: String, required: true },
    department: { type: String, required: true },
    address: String,
    phone: String
  },

  // 医生信息
  doctor: {
    name: { type: String, required: true },
    title: String,
    specialty: String
  },

  // 预约信息
  appointmentInfo: {
    appointmentDate: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    type: {
      type: String,
      enum: ['outpatient', 'specialist', 'physical_exam', 'vaccination', 'follow_up', 'other'],
      default: 'outpatient'
    },
    symptoms: String,
    previousRecords: [String]  // 既往病历
  },

  // 预约状态
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
    index: true
  },

  // 就诊信息
  visitInfo: {
    checkInTime: Date,
    actualStartTime: Date,
    endTime: Date,
    diagnosis: String,
    prescription: String,
    cost: Number
  },

  // 费用信息
  fees: {
    registrationFee: { type: Number, default: 0 },
    consultationFee: { type: Number, default: 0 },
    totalFee: { type: Number, default: 0 },
    paid: { type: Boolean, default: false },
    paymentMethod: String
  },

  // 提醒设置
  reminders: {
    sms: { type: Boolean, default: true },
    wechat: { type: Boolean, default: true },
    reminderTime: { type: Number, default: 1 }  // 提前多少小时提醒
  },

  // 备注
  notes: String,

  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledReason: String,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'appointments'
});

// ==================== 教育服务 ====================

/**
 * 学生档案模型
 */
const StudentProfileSchema = new mongoose.Schema({
  // 基础信息
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    unique: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 学生信息
  studentInfo: {
    name: { type: String, required: true },
    idNumber: String,
    gender: { type: String, enum: ['male', 'female'] },
    birthDate: Date,
    phoneNumber: String,
    parentGuardian: {
      name: String,
      relationship: String,
      phone: String,
      idNumber: String
    }
  },

  // 学校信息
  schoolInfo: {
    currentSchool: String,
    schoolType: {
      type: String,
      enum: ['kindergarten', 'primary', 'junior_high', 'senior_high', 'vocational', 'college', 'other']
    },
    grade: String,
    class: String,
    studentNumber: String,
    address: String,
    phone: String
  },

  // 学业信息
  academicInfo: {
    enrollmentDate: Date,
    graduationDate: Date,
    major: String,
    performance: String,      // 表现评价
    awards: [String],         // 获奖情况
    specialSkills: [String]   // 特长
  },

  // 教育资助
  financialAid: [{
    type: {
      type: String,
      enum: ['scholarship', 'grant', 'subsidy', 'loan', 'other']
    },
    name: String,
    amount: Number,
    startDate: Date,
    endDate: Date,
    provider: String
  }],

  // 考试成绩
  examScores: [{
    examName: String,
    examDate: Date,
    subjects: [{
      name: String,
      score: Number,
      fullScore: Number
    }],
    totalScore: Number,
    rank: Number
  }],

  // 出勤记录
  attendance: {
    totalDays: Number,
    presentDays: Number,
    absentDays: Number,
    lateDays: Number,
    leaveDays: Number
  },

  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'student_profiles'
});

/**
 * 培训课程模型
 */
const TrainingCourseSchema = new mongoose.Schema({
  // 课程编号
  courseCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 课程基本信息
  basicInfo: {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['agriculture', 'vocational', 'entrepreneurship', 'digital', 'health', 'culture', 'other'],
      required: true
    },
    subCategory: String,
    description: String,
    objectives: [String],  // 培训目标
    targetAudience: [String]  // 适合人群
  },

  // 课程详情
  details: {
    duration: Number,         // 培训时长（小时）
    sessionsCount: Number,    // 课次数
    maxParticipants: Number,
    currentParticipants: { type: Number, default: 0 },
    location: String,
    requirements: [String],   // 报名条件
    materials: [String],      // 培训材料
    certificate: { type: Boolean, default: false }  // 是否颁发证书
  },

  // 培训安排
  schedule: {
    startDate: Date,
    endDate: Date,
    sessions: [{
      date: Date,
      startTime: String,
      endTime: String,
      topic: String,
      instructor: String
    }]
  },

  // 师资信息
  instructors: [{
    name: String,
    title: String,
    organization: String,
    expertise: [String],
    phone: String
  }],

  // 费用信息
  fees: {
    courseFee: { type: Number, default: 0 },
    materialFee: { type: Number, default: 0 },
    totalFee: { type: Number, default: 0 },
    freeOfCharge: { type: Boolean, default: true },
    subsidyAvailable: { type: Boolean, default: false }
  },

  // 报名信息
  registration: {
    openDate: Date,
    closeDate: Date,
    method: {
      type: String,
      enum: ['online', 'offline', 'both'],
      default: 'both'
    },
    contact: String
  },

  // 报名人员
  participants: [{
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    name: String,
    phone: String,
    idNumber: String,
    registeredAt: Date,
    attendance: {
      attended: Boolean,
      completed: Boolean,
      score: Number,
      certificateNumber: String
    }
  }],

  // 课程状态
  status: {
    type: String,
    enum: ['draft', 'open', 'ongoing', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },

  // 反馈评价
  feedback: {
    overallRating: { type: Number, min: 1, max: 5 },
    comments: [String],
    suggestions: [String]
  },

  // 村庄关联
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'training_courses'
});

// ==================== 就业服务 ====================

/**
 * 求职者档案
 */
const JobSeekerProfileSchema = new mongoose.Schema({
  // 基础信息
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    unique: true,
    index: true
  },
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 个人信息
  personalInfo: {
    name: { type: String, required: true },
    idNumber: String,
    gender: { type: String, enum: ['male', 'female'] },
    birthDate: Date,
    phoneNumber: String,
    email: String,
    address: String,
    photo: String
  },

  // 求职意向
  jobPreferences: {
    expectedSalary: {
      min: Number,
      max: Number
    },
    expectedLocations: [String],
    jobTypes: [String],     // 全职/兼职/临时
    industries: [String],
    positions: [String]
  },

  // 教育背景
  education: [{
    degree: String,
    major: String,
    school: String,
    startDate: Date,
    endDate: Date
  }],

  // 工作经验
  workExperience: [{
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    isCurrent: Boolean,
    description: String,
    skills: [String]
  }],

  // 技能特长
  skills: {
    professional: [String],  // 专业技能
    certificates: [String],  // 证书
    languages: [{
      language: String,
      proficiency: String    // 熟练程度
    }],
    drivingLicense: String
  },

  // 就业状态
  employmentStatus: {
    status: {
      type: String,
      enum: ['employed', 'unemployed', 'seeking', 'not_seeking'],
      default: 'seeking'
    },
    currentCompany: String,
    currentPosition: String,
    availableDate: Date
  },

  // 求职记录
  jobApplications: [{
    company: String,
    position: String,
    appliedDate: Date,
    status: String,
    interviewDate: Date,
    result: String
  }],

  // 就业帮扶
  employmentAssistance: {
    needsAssistance: { type: Boolean, default: false },
    assistanceType: [String],  // 培训/推荐/补贴
    assignedCounselor: String,
    notes: String
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'employed'],
    default: 'active',
    index: true
  },

  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'job_seeker_profiles'
});

/**
 * 招聘信息模型
 */
const JobPostingSchema = new mongoose.Schema({
  // 职位编号
  postingNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 企业信息
  company: {
    name: { type: String, required: true },
    industry: String,
    scale: String,
    address: String,
    contactPerson: String,
    contactPhone: String,
    description: String
  },

  // 职位信息
  position: {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship', 'seasonal'],
      required: true
    },
    category: String,
    department: String,
    headCount: { type: Number, required: true },
    filledCount: { type: Number, default: 0 }
  },

  // 工作地点
  location: {
    province: String,
    city: String,
    district: String,
    address: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    }
  },

  // 职位要求
  requirements: {
    education: String,
    experience: String,
    ageRange: {
      min: Number,
      max: Number
    },
    gender: String,
    skills: [String],
    certifications: [String],
    description: String
  },

  // 薪资福利
  compensation: {
    salaryMin: Number,
    salaryMax: Number,
    salaryType: {
      type: String,
      enum: ['monthly', 'yearly', 'hourly', 'daily', 'piece']
    },
    socialInsurance: { type: Boolean, default: true },
    housingFund: { type: Boolean, default: false },
    benefits: [String],  // 其他福利
    description: String
  },

  // 工作时间
  workSchedule: {
    workDays: String,
    workHours: String,
    overtime: String
  },

  // 招聘时间
  recruitment: {
    publishDate: { type: Date, default: Date.now },
    deadline: Date,
    interviewStartDate: Date,
    onboardingDate: Date
  },

  // 应聘信息
  applications: [{
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobSeekerProfile'
    },
    name: String,
    phone: String,
    resume: String,
    appliedDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'interview', 'offered', 'hired', 'rejected'],
      default: 'pending'
    },
    interviewDate: Date,
    notes: String
  }],

  // 职位状态
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'filled'],
    default: 'active',
    index: true
  },

  // 村庄关联（用于定向推荐）
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  },
  isRecommendedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  }],

  // 发布信息
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'job_postings'
});

// ==================== 索引定义 ====================

HealthRecordSchema.index({ residentId: 1 });
HealthRecordSchema.index({ villageId: 1 });
HealthRecordSchema.index({ 'basicInfo.idNumber': 1 });

AppointmentSchema.index({ patientId: 1 });
AppointmentSchema.index({ villageId: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ 'appointmentInfo.appointmentDate': 1 });

StudentProfileSchema.index({ residentId: 1 });
StudentProfileSchema.index({ villageId: 1 });
StudentProfileSchema.index({ 'studentInfo.studentNumber': 1 });

TrainingCourseSchema.index({ courseCode: 1 });
TrainingCourseSchema.index({ villageId: 1, status: 1 });
TrainingCourseSchema.index({ 'basicInfo.category': 1 });

JobSeekerProfileSchema.index({ residentId: 1 });
JobSeekerProfileSchema.index({ villageId: 1, status: 1 });
JobSeekerProfileSchema.index({ 'employmentStatus.status': 1 });

JobPostingSchema.index({ postingNumber: 1 });
JobPostingSchema.index({ status: 1 });
JobPostingSchema.index({ 'recruitment.deadline': 1 });
JobPostingSchema.index({ 'location.coordinates': '2dsphere' });

// ==================== 静态方法 ====================

/**
 * 生成预约编号
 */
AppointmentSchema.statics.generateAppointmentNumber = async function() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `APT${dateStr}${randomStr}`;
};

/**
 * 生成招聘编号
 */
JobPostingSchema.statics.generatePostingNumber = async function() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
                 (date.getMonth() + 1).toString().padStart(2, '0') +
                 date.getDate().toString().padStart(2, '0');
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JOB${dateStr}${randomStr}`;
};

// ==================== 虚拟字段 ====================

HealthRecordSchema.virtual('age').get(function() {
  if (this.basicInfo.birthDate) {
    const today = new Date();
    const birthDate = new Date(this.basicInfo.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return null;
});

AppointmentSchema.virtual('canCancel').get(function() {
  if (this.status !== 'pending' && this.status !== 'confirmed') {
    return false;
  }
  const now = new Date();
  const appointmentTime = new Date(this.appointmentInfo.appointmentDate);
  const hoursDiff = (appointmentTime - now) / (1000 * 60 * 60);
  return hoursDiff > 2;  // 提前2小时可取消
});

JobPostingSchema.virtual('vacancies').get(function() {
  return this.position.headCount - this.position.filledCount;
});

JobPostingSchema.virtual('isExpired').get(function() {
  return this.recruitment.deadline && new Date() > this.recruitment.deadline;
});

// ==================== 导出模型 ====================

module.exports = {
  HealthRecord: mongoose.model('HealthRecord', HealthRecordSchema),
  Appointment: mongoose.model('Appointment', AppointmentSchema),
  StudentProfile: mongoose.model('StudentProfile', StudentProfileSchema),
  TrainingCourse: mongoose.model('TrainingCourse', TrainingCourseSchema),
  JobSeekerProfile: mongoose.model('JobSeekerProfile', JobSeekerProfileSchema),
  JobPosting: mongoose.model('JobPosting', JobPostingSchema)
};
