const DutyScheduleService = require('../services/dutyScheduleService');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

class DutyScheduleController {
  constructor() {
    this.dutyService = new DutyScheduleService();

    // 配置文件上传
    this.upload = multer({
      dest: path.join(__dirname, '../uploads/duty'),
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('只允许上传图片和文档文件'));
        }
      }
    });
  }

  /**
   * 创建值班表
   */
  createSchedule = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const scheduleData = {
        ...req.body,
        currentUserId: req.user._id,
        villageId: req.user.villageId
      };

      const schedule = await this.dutyService.createSchedule(scheduleData);

      res.status(201).json({
        success: true,
        message: '值班表创建成功',
        data: schedule
      });
    } catch (error) {
      console.error('创建值班表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建值班表失败'
      });
    }
  };

  /**
   * 生成智能排班
   */
  generateSmartSchedule = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { scheduleId } = req.params;
      const options = {
        ...req.body,
        currentUserId: req.user._id
      };

      const result = await this.dutyService.generateSmartSchedule(scheduleId, options);

      res.json({
        success: true,
        message: '智能排班生成成功',
        data: result
      });
    } catch (error) {
      console.error('生成智能排班失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '生成智能排班失败'
      });
    }
  };

  /**
   * 扫码紧急呼叫
   */
  emergencyCall = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { qrCodeData } = req.body;
      const { emergencyType = 'general', latitude, longitude, address } = req.body;

      const callerInfo = {
        userId: req.user._id,
        userName: req.user.name,
        userPhone: req.user.phone,
        location: {
          latitude,
          longitude,
          address
        },
        timestamp: new Date()
      };

      const result = await this.dutyService.emergencyCall(
        qrCodeData,
        { latitude, longitude, address },
        emergencyType,
        callerInfo
      );

      res.json({
        success: true,
        message: '紧急呼叫已发送',
        data: result
      });
    } catch (error) {
      console.error('紧急呼叫失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '紧急呼叫失败'
      });
    }
  };

  /**
   * 签到/签退
   */
  handleAttendance = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { scheduleId } = req.params;
      const { action } = req.body;
      const { latitude, longitude, address } = req.body;

      const location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address
      };

      const additionalData = {
        userName: req.user.name,
        userPhone: req.user.phone,
        userRole: req.user.roles[0],
        department: req.user.department
      };

      const result = await this.dutyService.handleAttendance(
        req.user._id,
        scheduleId,
        action,
        location,
        additionalData
      );

      res.json({
        success: true,
        message: `${action === 'checkin' ? '签到' : '签退'}成功`,
        data: result
      });
    } catch (error) {
      console.error(`${req.body.action}失败:`, error);
      res.status(500).json({
        success: false,
        message: error.message || `${req.body.action}失败`
      });
    }
  };

  /**
   * 获取值班表列表
   */
  getSchedules = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        isActive = 'true',
        scheduleType,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        isActive: isActive === 'true',
        scheduleType,
        sortBy,
        sortOrder
      };

      const result = await this.dutyService.getSchedules(req.user.villageId, options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取值班表列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取值班表列表失败'
      });
    }
  };

  /**
   * 获取值班表详情
   */
  getScheduleDetail = async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const { startDate, endDate, includeLogs } = req.query;

      const options = {
        startDate,
        endDate,
        includeLogs: includeLogs === 'true'
      };

      const schedule = await this.dutyService.getScheduleDetail(scheduleId, options);

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('获取值班表详情失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取值班表详情失败'
      });
    }
  };

  /**
   * 生成值班表二维码
   */
  generateQRCode = async (req, res) => {
    try {
      const { scheduleId } = req.params;

      const result = await this.dutyService.generateQRCode(scheduleId);

      res.json({
        success: true,
        message: '二维码生成成功',
        data: result
      });
    } catch (error) {
      console.error('生成二维码失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '生成二维码失败'
      });
    }
  };

  /**
   * 获取当前值班信息
   */
  getCurrentDuty = async (req, res) => {
    try {
      const currentDuty = await this.dutyService.constructor.getCurrentDutyByVillage(
        req.user.villageId
      );

      res.json({
        success: true,
        data: currentDuty
      });
    } catch (error) {
      console.error('获取当前值班信息失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取当前值班信息失败'
      });
    }
  };

  /**
   * 获取我的值班安排
   */
  getMySchedule = async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;

      // 获取用户参与的所有值班表
      const schedules = await this.dutyService.constructor.find({
        'assignments.userId': req.user._id,
        villageId: req.user.villageId,
        isActive: true
      }).populate('assignments.userId');

      // 过滤和整理用户的值班安排
      let myAssignments = [];
      schedules.forEach(schedule => {
        schedule.assignments.forEach(assignment => {
          if (assignment.userId._id.toString() === req.user._id.toString()) {
            // 应用日期过滤
            if (startDate || endDate) {
              const assignmentDate = new Date(assignment.date);
              if (startDate && assignmentDate < new Date(startDate)) return;
              if (endDate && assignmentDate > new Date(endDate)) return;
            }

            // 应用状态过滤
            if (status && assignment.status !== status) return;

            myAssignments.push({
              ...assignment.toObject(),
              scheduleId: schedule._id,
              scheduleName: schedule.scheduleName,
              shift: schedule.shifts.id(assignment.shiftId)
            });
          }
        });
      });

      // 按日期排序
      myAssignments.sort((a, b) => new Date(a.date) - new Date(b.date));

      res.json({
        success: true,
        data: myAssignments
      });
    } catch (error) {
      console.error('获取我的值班安排失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取我的值班安排失败'
      });
    }
  };

  /**
   * 添加工作记录
   */
  addWorkRecord = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { scheduleId } = req.params;
      const recordData = {
        ...req.body,
        location: {
          type: 'Point',
          coordinates: [req.body.longitude, req.body.latitude]
        }
      };

      const dutyLog = await this.dutyService.constructor.DutyLog.findOne({
        scheduleId,
        'dutyOfficer.userId': req.user._id,
        'attendance.actualStart': {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });

      if (!dutyLog) {
        return res.status(404).json({
          success: false,
          message: '未找到今日值班记录'
        });
      }

      const updatedLog = await this.dutyService.constructor.addWorkRecord(dutyLog, recordData);

      res.json({
        success: true,
        message: '工作记录添加成功',
        data: updatedLog
      });
    } catch (error) {
      console.error('添加工作记录失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '添加工作记录失败'
      });
    }
  };

  /**
   * 上传工作记录附件
   */
  uploadWorkRecordAttachment = async (req, res) => {
    try {
      const { scheduleId, logId } = req.params;

      this.upload.single('file')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        try {
          if (!req.file) {
            return res.status(400).json({
              success: false,
              message: '请选择要上传的文件'
            });
          }

          const dutyLog = await this.dutyService.constructor.DutyLog.findOne({
            _id: logId,
            scheduleId,
            'dutyOfficer.userId': req.user._id
          });

          if (!dutyLog) {
            return res.status(404).json({
              success: false,
              message: '未找到值班记录'
            });
          }

          // 创建附件记录
          const attachment = {
            type: this.getFileType(req.file.mimetype),
            url: `/uploads/duty/${req.file.filename}`,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            uploadedAt: new Date()
          };

          res.json({
            success: true,
            message: '文件上传成功',
            data: attachment
          });
        } catch (uploadError) {
          console.error('文件上传处理失败:', uploadError);
          res.status(500).json({
            success: false,
            message: uploadError.message || '文件上传处理失败'
          });
        }
      });
    } catch (error) {
      console.error('文件上传失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '文件上传失败'
      });
    }
  };

  /**
   * 获取值班统计
   */
  getDutyStatistics = async (req, res) => {
    try {
      const { startDate, endDate, reportType = 'comprehensive' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '请提供开始和结束日期'
        });
      }

      const report = await this.dutyService.generateDutyReport(
        req.user.villageId,
        new Date(startDate),
        new Date(endDate),
        reportType
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('获取值班统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取值班统计失败'
      });
    }
  };

  /**
   * 更新值班表
   */
  updateSchedule = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { scheduleId } = req.params;
      const updateData = {
        ...req.body,
        lastModifiedBy: req.user._id
      };

      const schedule = await this.dutyService.constructor.findByIdAndUpdate(
        scheduleId,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy lastModifiedBy');

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: '值班表不存在'
        });
      }

      res.json({
        success: true,
        message: '值班表更新成功',
        data: schedule
      });
    } catch (error) {
      console.error('更新值班表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新值班表失败'
      });
    }
  };

  /**
   * 删除值班表
   */
  deleteSchedule = async (req, res) => {
    try {
      const { scheduleId } = req.params;

      const schedule = await this.dutyService.constructor.findById(scheduleId);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: '值班表不存在'
        });
      }

      // 软删除
      schedule.isActive = false;
      schedule.lastModifiedBy = req.user._id;
      await schedule.save();

      res.json({
        success: true,
        message: '值班表删除成功'
      });
    } catch (error) {
      console.error('删除值班表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除值班表失败'
      });
    }
  };

  /**
   * 交接班
   */
  handleShiftChange = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { scheduleId } = req.params;
      const handoverData = {
        ...req.body,
        acknowledgedBy: {
          userId: req.user._id,
          userName: req.user.name,
          acknowledgedAt: new Date()
        }
      };

      const dutyLog = await this.dutyService.constructor.DutyLog.findOne({
        scheduleId,
        'dutyOfficer.userId': req.user._id,
        'attendance.actualStart': {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });

      if (!dutyLog) {
        return res.status(404).json({
          success: false,
          message: '未找到今日值班记录'
        });
      }

      const updatedLog = await this.dutyService.constructor.completeHandover(dutyLog, handoverData);

      res.json({
        success: true,
        message: '交接班成功',
        data: updatedLog
      });
    } catch (error) {
      console.error('交接班失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '交接班失败'
      });
    }
  };

  /**
   * 获取值班历史
   */
  getDutyHistory = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        userId
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        startDate,
        endDate,
        villageId: req.user.villageId
      };

      // 如果指定了userId，则获取该用户的历史
      const targetUserId = userId || req.user._id;

      const result = await this.dutyService.constructor.DutyLog.getUserDutyHistory(
        targetUserId,
        options
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取值班历史失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取值班历史失败'
      });
    }
  };

  /**
   * 验证值班二维码
   */
  validateQRCode = async (req, res) => {
    try {
      const { qrCodeData } = req.body;

      let qrData;
      try {
        qrData = JSON.parse(qrCodeData);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: '无效的二维码数据'
        });
      }

      if (qrData.type !== 'duty_schedule') {
        return res.status(400).json({
          success: false,
          message: '不是有效的值班表二维码'
        });
      }

      // 验证值班表是否存在且有效
      const schedule = await this.dutyService.constructor.findById(qrData.scheduleId);

      if (!schedule || !schedule.isActive) {
        return res.status(404).json({
          success: false,
          message: '值班表不存在或已失效'
        });
      }

      // 检查时间戳（二维码生成后1小时内有效）
      const qrTime = new Date(qrData.timestamp);
      const now = new Date();
      const timeDiff = (now - qrTime) / (1000 * 60); // 分钟

      if (timeDiff > 60) {
        return res.status(400).json({
          success: false,
          message: '二维码已过期，请重新获取'
        });
      }

      res.json({
        success: true,
        message: '二维码验证成功',
        data: qrData
      });
    } catch (error) {
      console.error('验证二维码失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '验证二维码失败'
      });
    }
  };

  /**
   * 导出值班报表
   */
  exportDutyReport = async (req, res) => {
    try {
      const { startDate, endDate, format = 'excel' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '请提供开始和结束日期'
        });
      }

      const report = await this.dutyService.generateDutyReport(
        req.user.villageId,
        new Date(startDate),
        new Date(endDate),
        'comprehensive'
      );

      // 这里可以根据format参数生成不同格式的文件
      // 简化实现，返回JSON数据
      res.json({
        success: true,
        message: '报表导出成功',
        data: report
      });
    } catch (error) {
      console.error('导出报表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '导出报表失败'
      });
    }
  };

  /**
   * 获取日历视图数据
   */
  getCalendarData = async (req, res) => {
    try {
      const { year, month } = req.query;
      const villageId = req.user.villageId;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: '请提供年份和月份'
        });
      }

      const calendarData = await this.dutyService.getCalendarData(
        villageId,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        success: true,
        data: calendarData
      });
    } catch (error) {
      console.error('获取日历数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取日历数据失败'
      });
    }
  };

  /**
   * 扫码呼叫值班人员（村民端）
   */
  scanAndCall = async (req, res) => {
    try {
      const { qrCodeData } = req.body;
      const callerInfo = {
        userId: req.user?._id || null,
        name: req.user?.name || req.body.callerName,
        phone: req.user?.phone || req.body.callerPhone,
        address: req.body.address || req.location?.address
      };

      const callData = {
        urgency: req.body.urgency || 'LOW',
        content: req.body.content,
        location: req.body.location || {}
      };

      const result = await this.dutyService.scanAndCallDutyOfficer(
        qrCodeData,
        callerInfo,
        callData
      );

      res.json({
        success: true,
        message: '呼叫已发送',
        data: result
      });
    } catch (error) {
      console.error('扫码呼叫失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '扫码呼叫失败'
      });
    }
  };

  /**
   * 获取今日值班信息（公开接口，用于村委大厅展示）
   */
  getTodayDutyPublic = async (req, res) => {
    try {
      const { villageId } = req.params;
      const todayDuty = await this.dutyService.getTodayDuty(villageId);

      res.json({
        success: true,
        data: {
          villageId,
          date: new Date(),
          duties: todayDuty
        }
      });
    } catch (error) {
      console.error('获取今日值班失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取今日值班失败'
      });
    }
  };

  // 辅助方法
  getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'document';
  }
}

module.exports = DutyScheduleController;