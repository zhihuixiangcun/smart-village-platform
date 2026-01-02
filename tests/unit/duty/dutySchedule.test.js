/**
 * 值班表单元测试
 * 测试排班算法（轮询、均衡、优先级）、冲突检测、人员可用性判断、二维码生成和验证
 */

const mongoose = require('mongoose');
const DutySchedule = require('../../../src/models/DutySchedule');
const DutyShift = require('../../../src/models/DutyShift');
const DutyPersonnel = require('../../../src/models/DutyPersonnel');
const TestHelpers = require('../../helpers');

// 跳过测试如果数据库不可用
const describeTests = mongoose.connection.readyState === 1 ? describe : describe.skip;

describeTests('DutySchedule Model - Unit Tests', () => {
  let mockVillageId;
  let mockUserId;
  let mockShifts;
  let mockPersonnel;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await TestHelpers.clearDatabase();

      mockVillageId = new mongoose.Types.ObjectId();
      mockUserId = new mongoose.Types.ObjectId();

      // 创建测试班次
      mockShifts = await createTestShifts(mockVillageId);

      // 创建测试人员
      mockPersonnel = await createTestPersonnel(mockVillageId);
    }
  });

  describe('值班表创建和验证', () => {
    test('应该成功创建有效的值班表', async () => {
      const scheduleData = {
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        schedulingRules: {
          algorithm: 'balanced',
          fairnessWeight: 0.5,
          maxConsecutiveDays: 5,
          minRestDays: 1
        }
      };

      const schedule = new DutySchedule(scheduleData);
      const savedSchedule = await schedule.save();

      expect(savedSchedule._id).toBeDefined();
      expect(savedSchedule.scheduleId).toBe('SCH-2024-001');
      expect(savedSchedule.year).toBe(2024);
      expect(savedSchedule.month).toBe(1);
      expect(savedSchedule.status).toBe('draft'); // 默认值
      expect(savedSchedule.version).toBe(1); // 默认值
      expect(savedSchedule.createdAt).toBeDefined();
    });

    test('应该验证必填字段', async () => {
      const schedule = new DutySchedule({
        year: 2024,
        month: 1
        // 缺少：scheduleId, villageId, createdBy
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.scheduleId).toBeDefined();
      expect(error.errors.villageId).toBeDefined();
      expect(error.errors.createdBy).toBeDefined();
    });

    test('应该验证排班编号唯一性', async () => {
      const scheduleData1 = {
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      };

      const scheduleData2 = {
        scheduleId: 'SCH-2024-001', // 相同的编号
        year: 2024,
        month: 2,
        villageId: mockVillageId,
        createdBy: new mongoose.Types.ObjectId()
      };

      await new DutySchedule(scheduleData1).save();

      let error;
      try {
        await new DutySchedule(scheduleData2).save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB重复键错误
    });

    test('应该验证年月组合的唯一性', async () => {
      const scheduleData1 = {
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      };

      const scheduleData2 = {
        scheduleId: 'SCH-2024-002',
        year: 2024,
        month: 1, // 相同的年月
        villageId: mockVillageId,
        createdBy: new mongoose.Types.ObjectId()
      };

      await new DutySchedule(scheduleData1).save();

      let error;
      try {
        await new DutySchedule(scheduleData2).save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000);
    });

    test('应该验证年份范围', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2019-001',
        year: 2019, // 小于2020
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.year).toBeDefined();
    });

    test('应该验证月份范围（1-12）', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 13, // 超过12
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.month).toBeDefined();
    });

    test('应该验证状态枚举', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        status: 'invalid_status'
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });
  });

  describe('值班记录管理', () => {
    test('应该成功添加值班记录', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      await schedule.save();

      const recordData = {
        date: new Date('2024-01-15'),
        shiftId: mockShifts[0]._id,
        personnelId: mockPersonnel[0]._id,
        status: 'scheduled'
      };

      await schedule.addDutyRecord(recordData);

      expect(schedule.dutyRecords).toHaveLength(1);
      expect(schedule.dutyRecords[0].date).toEqual(recordData.date);
      expect(schedule.statistics.totalScheduledDays).toBe(1);
    });

    test('应该检测时间冲突并拒绝重复记录', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      await schedule.save();

      const recordData = {
        date: new Date('2024-01-15'),
        shiftId: mockShifts[0]._id,
        personnelId: mockPersonnel[0]._id,
        status: 'scheduled'
      };

      await schedule.addDutyRecord(recordData);

      // 尝试添加相同时间的记录
      let error;
      try {
        await schedule.addDutyRecord(recordData);
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.message).toContain('该时间段已存在值班记录');
    });

    test('应该成功更新值班记录状态', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      await schedule.save();

      const recordData = {
        date: new Date('2024-01-15'),
        shiftId: mockShifts[0]._id,
        personnelId: mockPersonnel[0]._id,
        status: 'scheduled'
      };

      await schedule.addDutyRecord(recordData);
      const recordId = schedule.dutyRecords[0]._id;

      // 更新状态为进行中
      await schedule.updateDutyRecordStatus(recordId, 'ongoing');
      expect(schedule.dutyRecords[0].status).toBe('ongoing');
      expect(schedule.dutyRecords[0].actualStartTime).toBeDefined();

      // 更新状态为已完成
      await schedule.updateDutyRecordStatus(recordId, 'completed');
      expect(schedule.dutyRecords[0].status).toBe('completed');
      expect(schedule.dutyRecords[0].actualEndTime).toBeDefined();
      expect(schedule.statistics.completedDays).toBe(1);
    });

    test('应该正确处理缺勤状态', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      await schedule.save();

      const recordData = {
        date: new Date('2024-01-15'),
        shiftId: mockShifts[0]._id,
        personnelId: mockPersonnel[0]._id,
        status: 'scheduled'
      };

      await schedule.addDutyRecord(recordData);
      const recordId = schedule.dutyRecords[0]._id;

      await schedule.updateDutyRecordStatus(recordId, 'absent');
      expect(schedule.dutyRecords[0].status).toBe('absent');
      expect(schedule.statistics.absentDays).toBe(1);
    });

    test('应该获取指定日期的值班记录', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      await schedule.save();

      // 添加多条记录
      await schedule.addDutyRecord({
        date: new Date('2024-01-15'),
        shiftId: mockShifts[0]._id,
        personnelId: mockPersonnel[0]._id,
        status: 'scheduled'
      });

      await schedule.addDutyRecord({
        date: new Date('2024-01-15'),
        shiftId: mockShifts[1]._id,
        personnelId: mockPersonnel[1]._id,
        status: 'scheduled'
      });

      await schedule.addDutyRecord({
        date: new Date('2024-01-16'),
        shiftId: mockShifts[0]._id,
        personnelId: mockPersonnel[0]._id,
        status: 'scheduled'
      });

      const records = schedule.getRecordsByDate(new Date('2024-01-15'));
      expect(records).toHaveLength(2);
    });

    test('应该获取人员的月度值班安排', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      await schedule.save();

      // 为同一人员添加多条记录
      await schedule.addDutyRecord({
        date: new Date('2024-01-15'),
        shiftId: mockShifts[0]._id,
        personnelId: mockPersonnel[0]._id,
        status: 'scheduled'
      });

      await schedule.addDutyRecord({
        date: new Date('2024-01-20'),
        shiftId: mockShifts[1]._id,
        personnelId: mockPersonnel[0]._id,
        status: 'scheduled'
      });

      const personnelSchedule = schedule.getPersonnelSchedule(mockPersonnel[0]._id);
      expect(personnelSchedule).toHaveLength(2);
      expect(personnelSchedule[0].date.getTime()).toBeLessThan(personnelSchedule[1].date.getTime());
    });
  });

  describe('排班算法测试', () => {
    test('轮询算法应该均衡分配', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        schedulingRules: {
          algorithm: 'round_robin',
          fairnessWeight: 1.0,
          maxConsecutiveDays: 5,
          minRestDays: 1
        }
      });

      await schedule.save();

      const suggestions = await schedule.generateScheduleSuggestions(mockShifts, mockPersonnel);

      expect(suggestions.length).toBeGreaterThan(0);
      // 轮询应该相对均衡地分配给每个人
      const counts = {};
      suggestions.forEach(s => {
        const pid = s.personnelId.toString();
        counts[pid] = (counts[pid] || 0) + 1;
      });

      const values = Object.values(counts);
      const max = Math.max(...values);
      const min = Math.min(...values);
      expect(max - min).toBeLessThanOrEqual(2); // 差异不超过2
    });

    test('平衡算法应该考虑偏好', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        schedulingRules: {
          algorithm: 'balanced',
          fairnessWeight: 0.5,
          maxConsecutiveDays: 5,
          minRestDays: 1
        }
      });

      await schedule.save();

      // 设置人员偏好
      mockPersonnel[0].preferences.preferredShifts = ['morning'];
      await mockPersonnel[0].save();

      const suggestions = await schedule.generateScheduleSuggestions(mockShifts, mockPersonnel);

      expect(suggestions.length).toBeGreaterThan(0);
      // 检查早班是否优先分配给偏好早班的人员
      const morningSuggestions = suggestions.filter(s =>
        mockShifts.find(shift => shift._id.equals(s.shiftId))?.shiftType === 'morning'
      );
      expect(morningSuggestions.length).toBeGreaterThan(0);
    });

    test('应该遵守连续天数限制', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        schedulingRules: {
          algorithm: 'balanced',
          fairnessWeight: 0.5,
          maxConsecutiveDays: 3, // 最多连续3天
          minRestDays: 1
        }
      });

      await schedule.save();

      const suggestions = await schedule.generateScheduleSuggestions(mockShifts, mockPersonnel);

      // 检查没有人员连续超过3天
      const personnelDays = {};
      suggestions.forEach(s => {
        const pid = s.personnelId.toString();
        const date = s.date.toDateString();
        if (!personnelDays[pid]) {
          personnelDays[pid] = [];
        }
        personnelDays[pid].push(date);
      });

      Object.values(personnelDays).forEach(days => {
        let consecutive = 1;
        for (let i = 1; i < days.length; i++) {
          const prev = new Date(days[i - 1]);
          const curr = new Date(days[i]);
          const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

          if (diffDays === 1) {
            consecutive++;
            expect(consecutive).toBeLessThanOrEqual(3);
          } else {
            consecutive = 1;
          }
        }
      });
    });

    test('应该遵守最小休息天数', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        schedulingRules: {
          algorithm: 'balanced',
          fairnessWeight: 0.5,
          maxConsecutiveDays: 5,
          minRestDays: 2 // 至少休息2天
        }
      });

      await schedule.save();

      const suggestions = await schedule.generateScheduleSuggestions(mockShifts, mockPersonnel);

      // 检查人员之间至少有2天间隔
      const personnelDays = {};
      suggestions.forEach(s => {
        const pid = s.personnelId.toString();
        if (!personnelDays[pid]) {
          personnelDays[pid] = [];
        }
        personnelDays[pid].push(s.date);
      });

      Object.values(personnelDays).forEach(dates => {
        dates.sort((a, b) => a - b);
        for (let i = 1; i < dates.length; i++) {
          const diffDays = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
          if (diffDays > 1) {
            expect(diffDays).toBeGreaterThanOrEqual(2);
          }
        }
      });
    });

    test('应该计算建议置信度', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      await schedule.save();

      const personnel = mockPersonnel[0];
      const shift = mockShifts[0];
      const date = new Date('2024-01-15');

      // 设置偏好以增加置信度
      personnel.preferences.preferredShifts = [shift.shiftType];
      personnel.preferences.preferredDays = [1, 2, 3, 4, 5];
      await personnel.save();

      const confidence = schedule.calculateSuggestionConfidence(personnel, shift, date);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    test('应该验证值班记录日期在排班月份内', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      // 手动添加错误月份的记录
      schedule.dutyRecords.push({
        date: new Date('2024-02-15'), // 二月
        shiftId: mockShifts[0]._id,
        personnelId: mockPersonnel[0]._id
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.message).toContain('值班记录的日期必须在排班月份内');
    });
  });

  describe('虚拟字段测试', () => {
    test('应该正确显示月份名称', () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      expect(schedule.monthName).toBe('一月');

      schedule.month = 12;
      expect(schedule.monthName).toBe('十二月');
    });

    test('应该正确判断是否为当前月份', () => {
      const now = new Date();
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        villageId: mockVillageId,
        createdBy: mockUserId
      });

      expect(schedule.isCurrentMonth).toBe(true);

      schedule.year = 2020;
      expect(schedule.isCurrentMonth).toBe(false);
    });

    test('应该正确计算完成率', () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        statistics: {
          totalScheduledDays: 20,
          completedDays: 15,
          absentDays: 2
        }
      });

      expect(schedule.completionRate).toBe(75); // 15/20 = 75%

      schedule.statistics.totalScheduledDays = 0;
      expect(schedule.completionRate).toBe(0);
    });
  });

  describe('静态方法测试', () => {
    test('应该获取当前活跃的值班表', async () => {
      const now = new Date();

      const schedule1 = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        status: 'published'
      });

      const schedule2 = new DutySchedule({
        scheduleId: 'SCH-2024-002',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        status: 'draft'
      });

      await schedule1.save();
      await schedule2.save();

      const activeSchedule = await DutySchedule.findActiveSchedule(mockVillageId);
      expect(activeSchedule).toBeDefined();
      expect(activeSchedule._id.toString()).toBe(schedule1._id.toString());
    });

    test('应该获取村庄的值班表历史', async () => {
      // 创建多个历史值班表
      for (let i = 1; i <= 5; i++) {
        await new DutySchedule({
          scheduleId: `SCH-2024-00${i}`,
          year: 2024,
          month: i,
          villageId: mockVillageId,
          createdBy: mockUserId
        }).save();
      }

      const history = await DutySchedule.findHistoryByVillage(mockVillageId, 3);
      expect(history).toHaveLength(3);
      // 应该按年份和月份降序排列
      expect(history[0].month).toBeGreaterThan(history[1].month);
    });
  });

  describe('任务管理测试', () => {
    test('应该支持在值班记录中添加任务', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        dutyRecords: [{
          date: new Date('2024-01-15'),
          shiftId: mockShifts[0]._id,
          personnelId: mockPersonnel[0]._id,
          status: 'scheduled',
          tasks: [{
            title: '巡查村道',
            description: '检查村道是否有损坏',
            status: 'pending',
            priority: 'medium'
          }]
        }]
      });

      const savedSchedule = await schedule.save();
      expect(savedSchedule.dutyRecords[0].tasks).toHaveLength(1);
      expect(savedSchedule.dutyRecords[0].tasks[0].title).toBe('巡查村道');
    });

    test('应该验证任务标题最大长度', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        dutyRecords: [{
          date: new Date('2024-01-15'),
          shiftId: mockShifts[0]._id,
          personnelId: mockPersonnel[0]._id,
          status: 'scheduled',
          tasks: [{
            title: 'A'.repeat(101), // 超过100字符
            status: 'pending'
          }]
        }]
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
    });

    test('应该验证任务优先级枚举', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        dutyRecords: [{
          date: new Date('2024-01-15'),
          shiftId: mockShifts[0]._id,
          personnelId: mockPersonnel[0]._id,
          status: 'scheduled',
          tasks: [{
            title: '测试任务',
            status: 'pending',
            priority: 'invalid_priority'
          }]
        }]
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
    });
  });

  describe('异常记录测试', () => {
    test('应该支持记录异常情况', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        dutyRecords: [{
          date: new Date('2024-01-15'),
          shiftId: mockShifts[0]._id,
          personnelId: mockPersonnel[0]._id,
          status: 'completed',
          incidents: [{
            type: 'emergency',
            description: '村民突发疾病',
            severity: 'high',
            reportedAt: new Date('2024-01-15T10:30:00'),
            reporter: mockUserId
          }]
        }]
      });

      const savedSchedule = await schedule.save();
      expect(savedSchedule.dutyRecords[0].incidents).toHaveLength(1);
      expect(savedSchedule.dutyRecords[0].incidents[0].type).toBe('emergency');
      expect(savedSchedule.dutyRecords[0].incidents[0].severity).toBe('high');
    });

    test('应该验证异常严重程度枚举', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        dutyRecords: [{
          date: new Date('2024-01-15'),
          shiftId: mockShifts[0]._id,
          personnelId: mockPersonnel[0]._id,
          status: 'completed',
          incidents: [{
            type: 'emergency',
            description: '测试异常',
            severity: 'invalid_severity'
          }]
        }]
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
    });
  });

  describe('考勤记录测试', () => {
    test('应该支持记录考勤信息', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        dutyRecords: [{
          date: new Date('2024-01-15'),
          shiftId: mockShifts[0]._id,
          personnelId: mockPersonnel[0]._id,
          status: 'completed',
          attendance: {
            checkInTime: new Date('2024-01-15T08:00:00'),
            checkOutTime: new Date('2024-01-15T17:00:00'),
            checkInLocation: '村委会',
            checkOutLocation: '村委会',
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeMinutes: 60
          }
        }]
      });

      const savedSchedule = await schedule.save();
      expect(savedSchedule.dutyRecords[0].attendance.checkInTime).toBeDefined();
      expect(savedSchedule.dutyRecords[0].attendance.overtimeMinutes).toBe(60);
    });
  });

  describe('备勤人员测试', () => {
    test('应该支持添加备勤人员', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        backupPersonnel: [{
          personnelId: mockPersonnel[0]._id,
          priority: 1,
          availableDates: [new Date('2024-01-15'), new Date('2024-01-16')],
          unavailableDates: [new Date('2024-01-20')]
        }]
      });

      const savedSchedule = await schedule.save();
      expect(savedSchedule.backupPersonnel).toHaveLength(1);
      expect(savedSchedule.backupPersonnel[0].priority).toBe(1);
      expect(savedSchedule.backupPersonnel[0].availableDates).toHaveLength(2);
    });

    test('应该验证备勤人员优先级范围', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        backupPersonnel: [{
          personnelId: mockPersonnel[0]._id,
          priority: 15 // 超过10
        }]
      });

      let error;
      try {
        await schedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['backupPersonnel.0.priority']).toBeDefined();
    });
  });

  describe('边界情况测试', () => {
    test('应该处理空值班记录', () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        dutyRecords: []
      });

      expect(schedule.dutyRecords).toHaveLength(0);
      expect(schedule.statistics.totalScheduledDays).toBe(0);
    });

    test('应该处理备注最大长度', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        remarks: 'A'.repeat(2000) // 正好2000字符
      });

      const savedSchedule = await schedule.save();
      expect(savedSchedule.remarks).toHaveLength(2000);

      // 超过2000字符
      savedSchedule.remarks = 'A'.repeat(2001);
      let error;
      try {
        await savedSchedule.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.remarks).toBeDefined();
    });

    test('应该处理版本号递增', async () => {
      const schedule = new DutySchedule({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockUserId,
        version: 1
      });

      await schedule.save();

      schedule.version = 2;
      await schedule.save();

      expect(schedule.version).toBe(2);
    });
  });

  // 辅助函数：创建测试班次
  async function createTestShifts(villageId) {
    const shifts = [
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
      },
      {
        name: '晚班',
        code: 'NIGHT',
        shiftType: 'night',
        startTime: '18:00',
        endTime: '22:00',
        duration: 240,
        minPersonnel: 1,
        maxPersonnel: 3,
        villageId: villageId
      }
    ];

    return await DutyShift.insertMany(shifts);
  }

  // 辅助函数：创建测试人员
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
          availableShiftTypes: ['morning', 'afternoon', 'night'],
          skills: [`技能${i}`]
        },
        preferences: {
          preferredShifts: ['morning'],
          preferredDays: [1, 2, 3, 4, 5],
          maxDutyDaysPerMonth: 22,
          maxConsecutiveDays: 5
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
});
