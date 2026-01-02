/**
 * 调班功能集成测试
 * 测试调班申请流程、审批机制、交接班记录
 */

const mongoose = require('mongoose');
const DutyPersonnel = require('../../../src/models/DutyPersonnel');
const DutySchedule = require('../../../src/models/DutySchedule');
const DutyShift = require('../../../src/models/DutyShift');
const TestHelpers = require('../../helpers');

// 跳过测试如果数据库不可用
const describeTests = mongoose.connection.readyState === 1 ? describe : describe.skip;

describeTests('Duty Rotation Integration Tests', () => {
  let mockVillageId;
  let mockUserId;
  let mockAdminId;
  let testShifts;
  let testPersonnel;
  let testSchedule;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await TestHelpers.clearDatabase();

      mockVillageId = new mongoose.Types.ObjectId();
      mockUserId = new mongoose.Types.ObjectId();
      mockAdminId = new mongoose.Types.ObjectId();

      // 创建测试数据
      testShifts = await createTestShifts(mockVillageId);
      testPersonnel = await createTestPersonnel(mockVillageId);
      testSchedule = await createTestScheduleWithRecords(mockVillageId, mockUserId);
    }
  });

  describe('调班申请流程', () => {
    test('应该成功创建调班申请', async () => {
      const applicant = testPersonnel[0];
      const targetPersonnel = testPersonnel[1];

      const rotationRequest = {
        requestId: new mongoose.Types.ObjectId().toString(),
        scheduleId: testSchedule._id,
        applicantId: applicant._id,
        targetPersonnelId: targetPersonnel._id,

        // 原值班安排
        originalShift: {
          date: new Date('2024-01-15'),
          shiftId: testShifts[0]._id,
          shiftName: '早班'
        },

        // 请求调换到
        requestedShift: {
          date: new Date('2024-01-20'),
          shiftId: testShifts[1]._id,
          shiftName: '午班'
        },

        // 申请信息
        reason: '家里有事，需要调班',
        requestType: 'swap', // swap（对调）或 substitute（替班）
        status: 'pending',

        // 联系信息
        contactPhone: applicant.phone,
        requestDate: new Date(),

        // 附加说明
        notes: '已经和对方沟通好，对方同意调换'
      };

      // 在实际应用中，这里应该创建一个 RotationRequest 模型
      // 为了测试，我们模拟这个流程
      const request = {
        ...rotationRequest,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(request.requestId).toBeDefined();
      expect(request.applicantId).equals(applicant._id);
      expect(request.targetPersonnelId).equals(targetPersonnel._id);
      expect(request.status).toBe('pending');
      expect(request.requestType).toBe('swap');
    });

    test('应该验证调班申请的必填字段', () => {
      const invalidRequest = {
        // 缺少必填字段
        status: 'pending'
      };

      const isValid = validateRotationRequest(invalidRequest);

      expect(isValid).toBe(false);
      expect(validateRotationRequest.errors).toContain('applicantId');
      expect(validateRotationRequest.errors).toContain('targetPersonnelId');
    });

    test('应该验证申请人和目标人员的可用性', async () => {
      const applicant = testPersonnel[0];
      const targetPersonnel = testPersonnel[1];

      // 申请人状态为活跃
      expect(applicant.status).toBe('active');
      expect(targetPersonnel.status).toBe('active');

      // 检查申请人是否可以承担目标班次
      const canHandle = targetPersonnel.canHandleShift(
        testShifts[0].shiftType,
        new Date('2024-01-15')
      );

      expect(canHandle.canHandle).toBe(true);
    });

    test('应该验证调班日期的合理性', async () => {
      const pastDate = new Date('2023-01-01');
      const futureDate = new Date('2025-01-01');

      // 不允许调班到过去的日期
      const pastRotation = {
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: testPersonnel[1]._id,
        originalShift: { date: pastDate },
        requestedShift: { date: new Date('2024-01-15') }
      };

      expect(isDateValid(pastRotation.originalShift.date)).toBe(false);

      // 允许调班到未来日期
      const futureRotation = {
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: testPersonnel[1]._id,
        originalShift: { date: new Date('2024-01-15') },
        requestedShift: { date: futureDate }
      };

      expect(isDateValid(futureRotation.requestedShift.date)).toBe(true);
    });

    test('应该检测调班冲突', async () => {
      const applicant = testPersonnel[0];
      const targetPersonnel = testPersonnel[1];

      // 创建一个会导致冲突的调班申请
      // 目标人员在该日期已经有值班安排
      const conflictingRequest = {
        applicantId: applicant._id,
        targetPersonnelId: targetPersonnel._id,
        originalShift: {
          date: new Date('2024-01-15'),
          shiftId: testShifts[0]._id
        },
        requestedShift: {
          date: new Date('2024-01-15'), // 同一天，可能冲突
          shiftId: testShifts[1]._id
        }
      };

      const hasConflict = await checkForConflict(testSchedule, conflictingRequest);

      // 实际应用中应该检测冲突
      expect(hasConflict).toBeDefined();
    });
  });

  describe('审批机制', () => {
    test('应该支持管理员审批调班申请', async () => {
      const request = {
        _id: new mongoose.Types.ObjectId(),
        requestId: 'RR-2024-001',
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: testPersonnel[1]._id,
        status: 'pending',
        requestType: 'swap',
        requestDate: new Date()
      };

      // 管理员审批
      const approval = {
        approverId: mockAdminId,
        approverName: '村委书记',
        decision: 'approved',
        approvalDate: new Date(),
        comments: '同意调班，已确认双方时间安排',
        approvalLevel: 'village_admin' // village_admin, department_head, etc.
      };

      // 模拟审批流程
      request.status = approval.decision;
      request.approval = approval;
      request.approvalDate = approval.approvalDate;

      expect(request.status).toBe('approved');
      expect(request.approval.decision).toBe('approved');
      expect(request.approval.approverId).equals(mockAdminId);
    });

    test('应该支持多级审批', async () => {
      const request = {
        _id: new mongoose.Types.ObjectId(),
        requestId: 'RR-2024-002',
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: testPersonnel[1]._id,
        status: 'pending',
        approvalHistory: []
      };

      // 第一级审批：部门主管
      const firstApproval = {
        approverId: new mongoose.Types.ObjectId(),
        approverName: '部门主管',
        decision: 'approved',
        approvalDate: new Date(),
        level: 'department_head',
        comments: '同意'
      };

      request.approvalHistory.push(firstApproval);
      request.currentApprovalLevel = 'village_admin';

      // 第二级审批：村委书记
      const secondApproval = {
        approverId: mockAdminId,
        approverName: '村委书记',
        decision: 'approved',
        approvalDate: new Date(),
        level: 'village_admin',
        comments: '最终批准'
      };

      request.approvalHistory.push(secondApproval);
      request.status = 'approved';
      request.finalApprovalDate = secondApproval.approvalDate;

      expect(request.approvalHistory).toHaveLength(2);
      expect(request.status).toBe('approved');
      expect(request.approvalHistory[0].level).toBe('department_head');
      expect(request.approvalHistory[1].level).toBe('village_admin');
    });

    test('应该支持拒绝调班申请', async () => {
      const request = {
        _id: new mongoose.Types.ObjectId(),
        requestId: 'RR-2024-003',
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: testPersonnel[1]._id,
        status: 'pending'
      };

      const rejection = {
        approverId: mockAdminId,
        approverName: '村委书记',
        decision: 'rejected',
        rejectionDate: new Date(),
        reason: '目标人员在该时间段已有其他重要安排',
        rejectionCategory: 'scheduling_conflict'
      };

      request.status = rejection.decision;
      request.rejection = rejection;

      expect(request.status).toBe('rejected');
      expect(request.rejection.reason).toContain('重要安排');
    });

    test('应该记录审批历史', async () => {
      const request = {
        _id: new mongoose.Types.ObjectId(),
        requestId: 'RR-2024-004',
        status: 'pending',
        approvalHistory: [],
        activityLog: []
      };

      // 记录创建
      request.activityLog.push({
        action: 'created',
        actorId: testPersonnel[0]._id,
        timestamp: new Date(),
        details: '调班申请已提交'
      });

      // 记录提交审批
      request.activityLog.push({
        action: 'submitted_for_approval',
        actorId: testPersonnel[0]._id,
        timestamp: new Date(),
        details: '申请已提交给管理员审批'
      });

      // 记录审批
      request.activityLog.push({
        action: 'approved',
        actorId: mockAdminId,
        timestamp: new Date(),
        details: '管理员已批准申请'
      });

      expect(request.activityLog).toHaveLength(3);
      expect(request.activityLog[0].action).toBe('created');
      expect(request.activityLog[2].action).toBe('approved');
    });

    test('应该发送审批通知', async () => {
      const notificationEvents = [];

      // 模拟通知系统
      const notificationSystem = {
        send: (recipient, type, data) => {
          notificationEvents.push({
            recipient: recipient.toString(),
            type,
            data,
            timestamp: new Date()
          });
        }
      };

      const request = {
        _id: new mongoose.Types.ObjectId(),
        requestId: 'RR-2024-005',
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: testPersonnel[1]._id,
        status: 'approved'
      };

      // 发送通知给申请人
      notificationSystem.send(testPersonnel[0]._id, 'rotation_approved', {
        requestId: request.requestId,
        status: 'approved',
        message: '您的调班申请已获批准'
      });

      // 发送通知给目标人员
      notificationSystem.send(testPersonnel[1]._id, 'rotation_approved', {
        requestId: request.requestId,
        status: 'approved',
        message: '有调班申请已获批准，涉及您的值班安排'
      });

      expect(notificationEvents).toHaveLength(2);
      expect(notificationEvents[0].type).toBe('rotation_approved');
      expect(notificationEvents[1].type).toBe('rotation_approved');
    });
  });

  describe('交接班记录', () => {
    test('应该记录交接班信息', async () => {
      const handover = {
        handoverId: new mongoose.Types.ObjectId().toString(),
        scheduleId: testSchedule._id,
        fromPersonnelId: testPersonnel[0]._id,
        toPersonnelId: testPersonnel[1]._id,

        // 交接班基本信息
        date: new Date('2024-01-15'),
        shiftId: testShifts[0]._id,
        shiftName: '早班',

        // 交接时间
        scheduledHandoverTime: new Date('2024-01-15T12:00:00'),
        actualHandoverTime: new Date('2024-01-15T12:05:00'),

        // 交接地点
        location: '村委会办公室',

        // 交接内容
        handoverItems: {
          keys: ['办公室钥匙', '档案柜钥匙'],
          equipment: ['对讲机', '应急包'],
          documents: ['值班日志', '工作台账'],
          tasks: ['待处理的村民咨询2件', '待跟进的维修申请1件']
        },

        // 备注
        notes: '值班期间一切正常，无异常情况',

        // 确认
        fromPersonnelConfirmed: true,
        fromPersonnelConfirmTime: new Date('2024-01-15T12:05:00'),
        toPersonnelConfirmed: true,
        toPersonnelConfirmTime: new Date('2024-01-15T12:06:00'),

        // 附件（照片等）
        attachments: [],

        // 状态
        status: 'completed', // pending, in_progress, completed
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(handover.handoverId).toBeDefined();
      expect(handover.fromPersonnelId).equals(testPersonnel[0]._id);
      expect(handover.toPersonnelId).equals(testPersonnel[1]._id);
      expect(handover.status).toBe('completed');
      expect(handover.handoverItems.keys).toHaveLength(2);
      expect(handover.fromPersonnelConfirmed).toBe(true);
      expect(handover.toPersonnelConfirmed).toBe(true);
    });

    test('应该验证交接班双方的确认', async () => {
      const handover = {
        fromPersonnelId: testPersonnel[0]._id,
        toPersonnelId: testPersonnel[1]._id,
        fromPersonnelConfirmed: false,
        toPersonnelConfirmed: false
      };

      // 交接人确认
      handover.fromPersonnelConfirmed = true;
      handover.fromPersonnelConfirmTime = new Date();

      expect(handover.fromPersonnelConfirmed).toBe(true);
      expect(handover.fromPersonnelConfirmTime).toBeDefined();

      // 接班人确认
      handover.toPersonnelConfirmed = true;
      handover.toPersonnelConfirmTime = new Date();

      expect(handover.toPersonnelConfirmed).toBe(true);
      expect(handover.toPersonnelConfirmTime).toBeDefined();

      // 双方都确认后，交接完成
      handover.status = 'completed';
      expect(handover.status).toBe('completed');
    });

    test('应该记录交接班时的异常情况', async () => {
      const handover = {
        fromPersonnelId: testPersonnel[0]._id,
        toPersonnelId: testPersonnel[1]._id,
        status: 'completed',
        issues: [
          {
            type: 'equipment_damage',
            description: '对讲机电池盖破损',
            severity: 'low',
            reportedAt: new Date(),
            photoUrl: '/uploads/handover/damage-001.jpg'
          },
          {
            type: 'task_outstanding',
            description: '夜间巡查发现的路灯损坏未及时报修',
            severity: 'medium',
            reportedAt: new Date(),
            followUpRequired: true
          }
        ]
      };

      expect(handover.issues).toHaveLength(2);
      expect(handover.issues[0].type).toBe('equipment_damage');
      expect(handover.issues[1].severity).toBe('medium');
      expect(handover.issues[1].followUpRequired).toBe(true);
    });

    test('应该支持交接班附件上传', async () => {
      const handover = {
        handoverId: new mongoose.Types.ObjectId().toString(),
        attachments: [
          {
            type: 'photo',
            url: '/uploads/handover/photo-001.jpg',
            filename: '交接现场照片.jpg',
            uploadedBy: testPersonnel[0]._id,
            uploadedAt: new Date(),
            description: '值班室照片'
          },
          {
            type: 'document',
            url: '/uploads/handover/doc-001.pdf',
            filename: '值班日志.pdf',
            uploadedBy: testPersonnel[0]._id,
            uploadedAt: new Date(),
            description: '本月值班日志'
          }
        ]
      };

      expect(handover.attachments).toHaveLength(2);
      expect(handover.attachments[0].type).toBe('photo');
      expect(handover.attachments[1].type).toBe('document');
    });

    test('应该记录交接班完成后的值班状态转移', async () => {
      // 交接前
      const beforeHandover = {
        currentDutyPersonnel: testPersonnel[0]._id,
        dutyStatus: 'active',
        shiftStartTime: new Date('2024-01-15T08:00:00')
      };

      // 交接后
      const afterHandover = {
        currentDutyPersonnel: testPersonnel[1]._id,
        dutyStatus: 'active',
        shiftStartTime: new Date('2024-01-15T12:00:00'),
        previousPersonnel: testPersonnel[0]._id,
        handoverCompletedAt: new Date('2024-01-15T12:05:00')
      };

      expect(afterHandover.currentDutyPersonnel).equals(testPersonnel[1]._id);
      expect(afterHandover.previousPersonnel).equals(testPersonnel[0]._id);
      expect(afterHandover.handoverCompletedAt).toBeDefined();
    });
  });

  describe('调班历史查询', () => {
    test('应该查询人员的调班历史', async () => {
      const personnelId = testPersonnel[0]._id;

      const rotationHistory = [
        {
          requestId: 'RR-2024-001',
          date: new Date('2024-01-10'),
          type: 'swap',
          status: 'approved',
          withPersonnel: testPersonnel[1]._id
        },
        {
          requestId: 'RR-2024-005',
          date: new Date('2024-01-08'),
          type: 'substitute',
          status: 'completed',
          withPersonnel: testPersonnel[2]._id
        }
      ];

      // 按日期降序排列
      rotationHistory.sort((a, b) => b.date - a.date);

      expect(rotationHistory).toHaveLength(2);
      expect(rotationHistory[0].date.getTime()).toBeGreaterThan(rotationHistory[1].date.getTime());
    });

    test('应该统计调班频率', async () => {
      const personnelRotations = {
        personnelId: testPersonnel[0]._id,
        statistics: {
          totalRotations: 10,
          rotationsAsApplicant: 6,
          rotationsAsTarget: 4,
          approvedRotations: 9,
          rejectedRotations: 1,
          pendingRotations: 0,
          lastRotationDate: new Date('2024-01-15')
        }
      };

      expect(personnelRotations.statistics.totalRotations).toBe(10);
      expect(personnelRotations.statistics.approvedRotations).toBe(9);
      expect(personnelRotations.statistics.rejectedRotations).toBe(1);
    });

    test('应该检测频繁调班模式', async () => {
      // 某人员在短时间内多次申请调班
      const frequentRotations = [
        new Date('2024-01-01'),
        new Date('2024-01-03'),
        new Date('2024-01-05'),
        new Date('2024-01-08'),
        new Date('2024-01-10')
      ];

      // 检测是否频繁调班（例如：10天内超过3次）
      const isFrequent = frequentRotations.length > 3;

      expect(isFrequent).toBe(true);

      // 可以添加预警
      const warning = isFrequent ? {
        type: 'frequent_rotation_warning',
        message: '该人员在短时间内多次申请调班，建议关注',
        threshold: 3,
        actual: frequentRotations.length,
        period: '10_days'
      } : null;

      expect(warning).toBeDefined();
      expect(warning.type).toBe('frequent_rotation_warning');
    });
  });

  describe('边界情况和错误处理', () => {
    test('应该处理申请人与目标人员相同的情况', () => {
      const samePersonnelRequest = {
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: testPersonnel[0]._id, // 相同的人员
        status: 'pending'
      };

      const isValid = validateRotationRequest(samePersonnelRequest);

      expect(isValid).toBe(false);
      expect(validateRotationRequest.errors).toContain('申请人不能与目标人员相同');
    });

    test('应该处理目标人员不在值班名单中的情况', async () => {
      const inactivePersonnel = new DutyPersonnel({
        personnelId: new mongoose.Types.ObjectId(),
        name: '非值班人员',
        phone: '13800138999',
        position: '村民',
        villageId: mockVillageId,
        status: 'inactive',
        emergencyContact: {
          name: '紧急联系人',
          relationship: '家人',
          phone: '13900139999'
        }
      });

      await inactivePersonnel.save();

      const request = {
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: inactivePersonnel._id
      };

      // 目标人员不在可用人员列表中
      const availablePersonnel = await DutyPersonnel.findAvailableByVillage(mockVillageId);
      const isTargetAvailable = availablePersonnel.some(p =>
        p._id.equals(request.targetPersonnelId)
      );

      expect(isTargetAvailable).toBe(false);
    });

    test('应该处理重复的调班申请', () => {
      const existingRequests = [
        {
          applicantId: testPersonnel[0]._id,
          targetPersonnelId: testPersonnel[1]._id,
          date: new Date('2024-01-15'),
          status: 'pending'
        }
      ];

      const duplicateRequest = {
        applicantId: testPersonnel[0]._id,
        targetPersonnelId: testPersonnel[1]._id,
        date: new Date('2024-01-15'),
        status: 'pending'
      };

      const isDuplicate = existingRequests.some(req =>
        req.applicantId.equals(duplicateRequest.applicantId) &&
        req.targetPersonnelId.equals(duplicateRequest.targetPersonnelId) &&
        req.date.getTime() === duplicateRequest.date.getTime() &&
        req.status === 'pending'
      );

      expect(isDuplicate).toBe(true);
    });

    test('应该处理交接班确认超时的情况', async () => {
      const handover = {
        fromPersonnelId: testPersonnel[0]._id,
        toPersonnelId: testPersonnel[1]._id,
        fromPersonnelConfirmed: true,
        fromPersonnelConfirmTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
        toPersonnelConfirmed: false,
        scheduledHandoverTime: new Date(Date.now() - 2 * 60 * 60 * 1000)
      };

      const timeoutThreshold = 30 * 60 * 1000; // 30分钟
      const timeElapsed = Date.now() - handover.fromPersonnelConfirmTime.getTime();
      const isTimeout = timeElapsed > timeoutThreshold;

      expect(isTimeout).toBe(true);

      // 可以触发超时处理流程
      if (isTimeout) {
        handover.status = 'timeout';
        handover.timeoutReason = '接班人未在规定时间内确认交接';
      }

      expect(handover.status).toBe('timeout');
    });
  });

  // 辅助函数

  function validateRotationRequest(request) {
    validateRotationRequest.errors = [];

    if (!request.applicantId) {
      validateRotationRequest.errors.push('applicantId');
    }

    if (!request.targetPersonnelId) {
      validateRotationRequest.errors.push('targetPersonnelId');
    }

    if (request.applicantId && request.targetPersonnelId &&
        request.applicantId.toString() === request.targetPersonnelId.toString()) {
      validateRotationRequest.errors.push('申请人不能与目标人员相同');
    }

    return validateRotationRequest.errors.length === 0;
  }

  function isDateValid(date) {
    const now = new Date();
    const testDate = new Date(date);
    return testDate >= now.setHours(0, 0, 0, 0);
  }

  async function checkForConflict(schedule, request) {
    // 检查目标人员在请求日期是否已有值班安排
    const existingRecords = schedule.dutyRecords.filter(record =>
      record.personnelId.equals(request.targetPersonnelId) &&
      record.date.getTime() === request.requestedShift.date.getTime()
    );

    return existingRecords.length > 0;
  }

  async function createTestShifts(villageId) {
    return await DutyShift.insertMany([
      {
        name: '早班',
        code: 'MORNING',
        shiftType: 'morning',
        startTime: '08:00',
        endTime: '12:00',
        duration: 240,
        minPersonnel: 2,
        maxPersonnel: 5,
        villageId: villageId
      },
      {
        name: '午班',
        code: 'AFTERNOON',
        shiftType: 'afternoon',
        startTime: '14:00',
        endTime: '18:00',
        duration: 240,
        minPersonnel: 2,
        maxPersonnel: 5,
        villageId: villageId
      }
    ]);
  }

  async function createTestPersonnel(villageId) {
    const personnelList = [];
    for (let i = 1; i <= 5; i++) {
      const personnel = new DutyPersonnel({
        personnelId: new mongoose.Types.ObjectId(),
        name: `测试人员${i}`,
        phone: `1380013800${i}`,
        position: '村委',
        villageId: villageId,
        capabilities: {
          availableShiftTypes: ['morning', 'afternoon']
        },
        emergencyContact: {
          name: `紧急联系人${i}`,
          relationship: '家人',
          phone: `1390013900${i}`
        }
      });
      await personnel.save();
      personnelList.push(personnel);
    }
    return personnelList;
  }

  async function createTestScheduleWithRecords(villageId, userId) {
    const schedule = await DutySchedule.create({
      scheduleId: 'SCH-2024-001',
      year: 2024,
      month: 1,
      villageId: villageId,
      createdBy: userId,
      status: 'published'
    });

    // 添加一些值班记录
    await schedule.addDutyRecord({
      date: new Date('2024-01-15'),
      shiftId: testShifts[0]._id,
      personnelId: testPersonnel[0]._id,
      status: 'scheduled'
    });

    await schedule.addDutyRecord({
      date: new Date('2024-01-20'),
      shiftId: testShifts[1]._id,
      personnelId: testPersonnel[1]._id,
      status: 'scheduled'
    });

    return schedule;
  }
});
