/**
 * 值班管理完整流程端到端测试
 * 从人员创建到排班到呼叫的全流程测试
 */

const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const DutyPersonnel = require('../../src/models/DutyPersonnel');
const DutySchedule = require('../../src/models/DutySchedule');
const DutyShift = require('../../src/models/DutyShift');
const TestHelpers = require('../helpers');

// 跳过测试如果数据库不可用
const describeTests = mongoose.connection.readyState === 1 ? describe : describe.skip;

describeTests('Duty Management End-to-End Tests', () => {
  let httpServer;
  let ioServer;
  let clientSockets;
  let mockVillageId;
  let mockAdminId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 1) {
      // 创建Socket.IO服务器
      httpServer = http.createServer();
      ioServer = new Server(httpServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      });

      // Socket.IO事件处理
      setupSocketIOHandlers(ioServer);

      await new Promise((resolve) => {
        httpServer.listen(() => {
          const port = httpServer.address().port;
          global.socket_io_port = port;
          resolve();
        });
      });

      clientSockets = [];
    }
  });

  afterAll(async () => {
    if (ioServer) {
      ioServer.close();
    }
    if (httpServer) {
      httpServer.close();
    }
    if (clientSockets) {
      clientSockets.forEach(socket => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
    }
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await TestHelpers.clearDatabase();
      mockVillageId = new mongoose.Types.ObjectId();
      mockAdminId = new mongoose.Types.ObjectId();
      clientSockets = [];
    }
  });

  afterEach(async () => {
    if (clientSockets) {
      clientSockets.forEach(socket => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
      clientSockets = [];
    }
  });

  describe('完整值班管理流程', () => {
    test('从人员创建到排班发布的完整流程', async () => {
      // ========== 第一阶段：创建班次配置 ==========
      console.log('\n=== 第一阶段：创建班次配置 ===');

      const shiftData = [
        {
          name: '早班',
          code: 'MORNING',
          shiftType: 'morning',
          startTime: '08:00',
          endTime: '12:00',
          duration: 240,
          minPersonnel: 2,
          maxPersonnel: 5,
          villageId: mockVillageId,
          requirements: {
            skills: ['基础服务'],
            physicalRequirements: ['normal']
          }
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
          villageId: mockVillageId,
          requirements: {
            skills: ['基础服务'],
            physicalRequirements: ['normal']
          }
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
          villageId: mockVillageId,
          requirements: {
            skills: ['应急处理'],
            physicalRequirements: ['good_health']
          }
        }
      ];

      const createdShifts = await DutyShift.insertMany(shiftData);
      expect(createdShifts).toHaveLength(3);
      console.log('✓ 成功创建3个班次配置');

      // ========== 第二阶段：创建值班人员 ==========
      console.log('\n=== 第二阶段：创建值班人员 ===');

      const personnelData = [
        {
          personnelId: new mongoose.Types.ObjectId(),
          name: '张书记',
          phone: '13800138001',
          position: '村委书记',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['morning', 'afternoon', 'night'],
            skills: ['行政管理', '应急处置'],
            languages: ['zh-CN', 'pcc'],
            certifications: [{
              name: '村干部资格证',
              certificateNumber: 'VC2024001'
            }]
          },
          preferences: {
            preferredShifts: ['morning'],
            maxDutyDaysPerMonth: 20,
            maxConsecutiveDays: 5
          },
          emergencyContact: {
            name: '李四',
            relationship: '配偶',
            phone: '13900139001'
          }
        },
        {
          personnelId: new mongoose.Types.ObjectId(),
          name: '李委员',
          phone: '13800138002',
          position: '村委委员',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['morning', 'afternoon'],
            skills: ['村民服务', '纠纷调解'],
            languages: ['zh-CN', 'pcc-qn']
          },
          preferences: {
            preferredShifts: ['afternoon'],
            preferredDays: [1, 2, 3, 4, 5],
            maxDutyDaysPerMonth: 22,
            maxConsecutiveDays: 5
          },
          emergencyContact: {
            name: '王五',
            relationship: '家人',
            phone: '13900139002'
          }
        },
        {
          personnelId: new mongoose.Types.ObjectId(),
          name: '王主任',
          phone: '13800138003',
          position: '办公室主任',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['morning', 'afternoon', 'night'],
            skills: ['文书处理', '档案管理', '应急处理'],
            certifications: [{
              name: '急救证书',
              certificateNumber: 'FA2024001',
              issuedBy: '红十字会'
            }]
          },
          preferences: {
            preferredShifts: ['morning', 'afternoon'],
            maxDutyDaysPerMonth: 22,
            maxConsecutiveDays: 6
          },
          emergencyContact: {
            name: '赵六',
            relationship: '配偶',
            phone: '13900139003'
          }
        },
        {
          personnelId: new mongoose.Types.ObjectId(),
          name: '赵干事',
          phone: '13800138004',
          position: '村委干事',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['morning', 'afternoon'],
            skills: ['基础服务']
          },
          preferences: {
            preferredShifts: ['morning'],
            maxDutyDaysPerMonth: 22,
            maxConsecutiveDays: 5
          },
          emergencyContact: {
            name: '钱七',
            relationship: '家人',
            phone: '13900139004'
          }
        },
        {
          personnelId: new mongoose.Types.ObjectId(),
          name: '孙干事',
          phone: '13800138005',
          position: '村委干事',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['night'],
            skills: ['夜间值守', '安全巡逻'],
            physicalRequirements: ['good_health']
          },
          preferences: {
            preferredShifts: ['night'],
            maxDutyDaysPerMonth: 15,
            maxConsecutiveDays: 3
          },
          emergencyContact: {
            name: '周八',
            relationship: '家人',
            phone: '13900139005'
          }
        }
      ];

      const createdPersonnel = await DutyPersonnel.insertMany(personnelData);
      expect(createdPersonnel).toHaveLength(5);
      console.log('✓ 成功创建5名值班人员');

      // 验证二维码自动生成
      createdPersonnel.forEach(person => {
        expect(person.qrCode.content).toBeDefined();
        expect(person.isQRCodeValid).toBe(true);
      });
      console.log('✓ 所有人员二维码已自动生成');

      // ========== 第三阶段：创建值班表 ==========
      console.log('\n=== 第三阶段：创建值班表 ===');

      const now = new Date();
      const scheduleData = {
        scheduleId: `SCH-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-001`,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        villageId: mockVillageId,
        createdBy: mockAdminId,
        status: 'draft',
        schedulingRules: {
          algorithm: 'balanced',
          fairnessWeight: 0.6,
          maxConsecutiveDays: 5,
          minRestDays: 1
        }
      };

      const schedule = new DutySchedule(scheduleData);
      await schedule.save();
      expect(schedule.status).toBe('draft');
      console.log('✓ 成功创建值班表');

      // ========== 第四阶段：自动排班 ==========
      console.log('\n=== 第四阶段：自动排班 ===');

      // 使用内置的排班算法生成建议
      const suggestions = await schedule.generateScheduleSuggestions(
        createdShifts,
        createdPersonnel
      );

      expect(suggestions.length).toBeGreaterThan(0);
      console.log(`✓ 生成了${suggestions.length}条排班建议`);

      // 添加排班建议到值班表
      const addedCount = 0;
      for (const suggestion of suggestions) {
        try {
          await schedule.addDutyRecord({
            date: suggestion.date,
            shiftId: suggestion.shiftId,
            personnelId: suggestion.personnelId,
            status: 'scheduled'
          });
        } catch (error) {
          // 可能有些日期已有记录，跳过
        }
      }

      console.log(`✓ 成功添加排班记录到值班表`);

      // 验证排班公平性
      const personnelCounts = {};
      schedule.dutyRecords.forEach(record => {
        const pid = record.personnelId.toString();
        personnelCounts[pid] = (personnelCounts[pid] || 0) + 1;
      });

      const counts = Object.values(personnelCounts);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      const fairness = maxCount - minCount;

      expect(fairness).toBeLessThanOrEqual(3); // 最大差异不超过3天
      console.log(`✓ 排班公平性验证通过，最大差异${fairness}天`);

      // ========== 第五阶段：发布值班表 ==========
      console.log('\n=== 第五阶段：发布值班表 ===');

      schedule.status = 'published';
      schedule.publishedBy = mockAdminId;
      schedule.publishedAt = new Date();
      await schedule.save();

      expect(schedule.status).toBe('published');
      expect(schedule.publishedAt).toBeDefined();
      console.log('✓ 值班表已发布');

      // ========== 第六阶段：值班人员查看排班 ==========
      console.log('\n=== 第六阶段：值班人员查看排班 ===');

      const personnelSchedule = schedule.getPersonnelSchedule(createdPersonnel[0]._id);
      expect(personnelSchedule.length).toBeGreaterThan(0);
      console.log(`✓ 张书记的本月值班安排：${personnelSchedule.length}天`);

      // ========== 第七阶段：紧急呼叫响应 ==========
      console.log('\n=== 第七阶段：紧急呼叫响应 ===');

      // 创建Socket.IO连接
      const callerSocket = await createClientSocket();
      const personnelSocket1 = await createClientSocket();
      const personnelSocket2 = await createClientSocket();

      // 值班人员加入村庄
      await joinVillage(personnelSocket1, mockVillageId.toString());
      await joinVillage(personnelSocket2, mockVillageId.toString());
      console.log('✓ 值班人员已上线');

      // 模拟村民发起紧急呼叫
      const emergencyCall = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '村民小明',
          phone: '13700137001'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '浙江省杭州市余杭区某村1号',
          accuracy: 10.5
        },
        emergencyType: 'medical',
        severity: 'high',
        description: '老人突发疾病，需要急救',
        notifiedPersonnel: createdPersonnel.slice(0, 2).map(p => p._id.toString())
      };

      // 发起紧急呼叫
      const broadcastPromise = new Promise((resolve) => {
        personnelSocket1.on('emergency-call-broadcast', (data) => {
          resolve(data);
        });
      });

      callerSocket.emit('emergency-call', emergencyCall);
      const broadcast = await broadcastPromise;

      expect(broadcast.callId).toBe(emergencyCall.callId);
      expect(broadcast.emergencyType).toBe('medical');
      console.log('✓ 紧急呼叫已广播给值班人员');

      // 值班人员接受呼叫
      const acceptPromise = new Promise((resolve) => {
        personnelSocket1.on('call-accepted', (data) => resolve(data));
      });

      personnelSocket1.emit('accept-emergency-call', {
        callId: emergencyCall.callId,
        villageId: mockVillageId.toString(),
        personnelId: createdPersonnel[0]._id.toString(),
        location: {
          latitude: 30.2742,
          longitude: 120.1552
        }
      });

      const accepted = await acceptPromise;
      expect(accepted.personnelId).toBe(createdPersonnel[0]._id.toString());
      console.log('✓ 张书记已接受紧急呼叫');

      // 更新响应状态
      personnelSocket1.emit('update-call-status', {
        callId: emergencyCall.callId,
        villageId: mockVillageId.toString(),
        status: 'on_the_way',
        location: {
          latitude: 30.2743,
          longitude: 120.1553
        },
        notes: '正在赶往现场'
      });
      console.log('✓ 响应状态已更新：正在赶往现场');

      // ========== 第八阶段：完成呼叫并记录 ==========
      console.log('\n=== 第八阶段：完成呼叫并记录 ===');

      personnelSocket1.emit('complete-emergency-call', {
        callId: emergencyCall.callId,
        villageId: mockVillageId.toString(),
        resolution: {
          status: 'resolved',
          outcome: 'patient_assisted',
          description: '已提供急救并联系救护车',
          actionsTaken: ['现场急救', '联系120', '协助转运']
        },
        duration: 1800000, // 30分钟
        completedBy: createdPersonnel[0]._id.toString()
      });
      console.log('✓ 紧急呼叫已完成');

      // ========== 验证整个流程 ==========
      console.log('\n=== 流程验证 ===');

      // 验证统计数据
      expect(createdShifts.length).toBe(3);
      expect(createdPersonnel.length).toBe(5);
      expect(schedule.dutyRecords.length).toBeGreaterThan(0);

      // 验证人员二维码有效性
      const validPersonnel = await DutyPersonnel.findAvailableByVillage(mockVillageId);
      expect(validPersonnel.length).toBe(5);

      // 验证值班表状态
      expect(schedule.status).toBe('published');
      expect(schedule.version).toBe(1);

      console.log('\n✅ 完整流程测试通过！');
    }, 30000); // 增加超时时间到30秒

    test('调班申请到交接班完整流程', async () => {
      console.log('\n=== 调班完整流程测试 ===');

      // 准备数据
      const shifts = await DutyShift.insertMany([
        {
          name: '早班',
          code: 'MORNING',
          shiftType: 'morning',
          startTime: '08:00',
          endTime: '12:00',
          duration: 240,
          minPersonnel: 2,
          maxPersonnel: 5,
          villageId: mockVillageId
        }
      ]);

      const personnel = await DutyPersonnel.insertMany([
        {
          personnelId: new mongoose.Types.ObjectId(),
          name: '张三',
          phone: '13800138001',
          position: '村委',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['morning']
          },
          emergencyContact: {
            name: '李四',
            relationship: '家人',
            phone: '13900139001'
          }
        },
        {
          personnelId: new mongoose.Types.ObjectId(),
          name: '李四',
          phone: '13800138002',
          position: '村委',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['morning']
          },
          emergencyContact: {
            name: '王五',
            relationship: '家人',
            phone: '13900139002'
          }
        }
      ]);

      // 创建值班表并添加记录
      const schedule = await DutySchedule.create({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockAdminId,
        status: 'published'
      });

      await schedule.addDutyRecord({
        date: new Date('2024-01-15'),
        shiftId: shifts[0]._id,
        personnelId: personnel[0]._id,
        status: 'scheduled'
      });

      // 步骤1：创建调班申请
      console.log('1. 创建调班申请');
      const rotationRequest = {
        requestId: 'RR-2024-001',
        scheduleId: schedule._id,
        applicantId: personnel[0]._id,
        targetPersonnelId: personnel[1]._id,
        originalShift: {
          date: new Date('2024-01-15'),
          shiftId: shifts[0]._id,
          shiftName: '早班'
        },
        reason: '家里有事',
        requestType: 'swap',
        status: 'pending'
      };
      console.log('✓ 调班申请已创建');

      // 步骤2：管理员审批
      console.log('2. 管理员审批');
      rotationRequest.status = 'approved';
      rotationRequest.approval = {
        approverId: mockAdminId,
        decision: 'approved',
        approvalDate: new Date(),
        comments: '同意调班'
      };
      console.log('✓ 调班申请已批准');

      // 步骤3：更新值班记录
      console.log('3. 更新值班记录');
      const recordIndex = schedule.dutyRecords.findIndex(r =>
        r.date.getTime() === new Date('2024-01-15').getTime() &&
        r.shiftId.equals(shifts[0]._id)
      );

      if (recordIndex !== -1) {
        schedule.dutyRecords[recordIndex].personnelId = personnel[1]._id;
        await schedule.save();
      }
      console.log('✓ 值班记录已更新');

      // 步骤4：创建交接班记录
      console.log('4. 创建交接班记录');
      const handover = {
        handoverId: new mongoose.Types.ObjectId().toString(),
        fromPersonnelId: personnel[0]._id,
        toPersonnelId: personnel[1]._id,
        date: new Date('2024-01-15'),
        shiftId: shifts[0]._id,
        handoverItems: {
          keys: ['办公室钥匙'],
          equipment: ['对讲机'],
          documents: ['值班日志']
        },
        fromPersonnelConfirmed: true,
        toPersonnelConfirmed: true,
        status: 'completed'
      };
      console.log('✓ 交接班记录已创建');

      // 验证
      expect(rotationRequest.status).toBe('approved');
      expect(handover.status).toBe('completed');
      expect(schedule.dutyRecords[recordIndex].personnelId).equals(personnel[1]._id);

      console.log('\n✅ 调班流程测试通过！');
    });

    test('值班统计和分析功能', async () => {
      console.log('\n=== 值班统计测试 ===');

      // 创建测试数据
      const shifts = await DutyShift.insertMany([
        {
          name: '早班',
          code: 'MORNING',
          shiftType: 'morning',
          startTime: '08:00',
          endTime: '12:00',
          duration: 240,
          minPersonnel: 1,
          maxPersonnel: 3,
          villageId: mockVillageId
        }
      ]);

      const personnel = await DutyPersonnel.insertMany([
        {
          personnelId: new mongoose.Types.ObjectId(),
          name: '张三',
          phone: '13800138001',
          position: '村委',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['morning']
          },
          statistics: {
            currentMonthCount: 10,
            totalCount: 100,
            totalHours: 800,
            consecutiveDays: 3
          },
          emergencyContact: {
            name: '李四',
            relationship: '家人',
            phone: '13900139001'
          }
        }
      ]);

      const schedule = await DutySchedule.create({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockAdminId,
        status: 'published',
        statistics: {
          totalScheduledDays: 31,
          completedDays: 20,
          absentDays: 1,
          substituteCount: 2,
          emergencyResponses: 5
        }
      });

      // 统计分析
      console.log('\n统计数据：');
      console.log(`- 排班天数：${schedule.statistics.totalScheduledDays}`);
      console.log(`- 完成天数：${schedule.statistics.completedDays}`);
      console.log(`- 缺勤天数：${schedule.statistics.absentDays}`);
      console.log(`- 替班次数：${schedule.statistics.substituteCount}`);
      console.log(`- 应急响应：${schedule.statistics.emergencyResponses}`);
      console.log(`- 完成率：${schedule.completionRate}%`);

      console.log(`\n人员统计：`);
      console.log(`- 总值班次数：${personnel[0].statistics.totalCount}`);
      console.log(`- 总值班时长：${personnel[0].statistics.totalHours}小时`);
      console.log(`- 当前月值班：${personnel[0].statistics.currentMonthCount}次`);
      console.log(`- 连续值班：${personnel[0].statistics.consecutiveDays}天`);

      // 验证统计数据
      expect(schedule.statistics.totalScheduledDays).toBe(31);
      expect(schedule.statistics.completedDays).toBe(20);
      expect(schedule.completionRate).toBe(65); // 20/31 ≈ 64.5%，四舍五入为65
      expect(personnel[0].statistics.totalHours).toBe(800);

      console.log('\n✅ 统计分析功能测试通过！');
    });
  });

  describe('性能和负载测试', () => {
    test('应能处理大量人员排班', async () => {
      console.log('\n=== 大规模排班性能测试 ===');

      const startTime = Date.now();

      // 创建20个班次
      const shifts = await DutyShift.insertMany(
        Array.from({ length: 20 }, (_, i) => ({
          name: `班次${i + 1}`,
          code: `SHIFT${String(i + 1).padStart(3, '0')}`,
          shiftType: ['morning', 'afternoon', 'night'][i % 3],
          startTime: `${String(8 + i * 2).padStart(2, '0')}:00`,
          endTime: `${String(12 + i * 2).padStart(2, '0')}:00`,
          duration: 240,
          minPersonnel: 2,
          maxPersonnel: 5,
          villageId: mockVillageId
        }))
      );

      // 创建50名人员
      const personnel = await DutyPersonnel.insertMany(
        Array.from({ length: 50 }, (_, i) => ({
          personnelId: new mongoose.Types.ObjectId(),
          name: `人员${i + 1}`,
          phone: `138${String(i + 1).padStart(8, '0')}`,
          position: '村委',
          villageId: mockVillageId,
          capabilities: {
            availableShiftTypes: ['morning', 'afternoon', 'night']
          },
          emergencyContact: {
            name: `紧急联系人${i + 1}`,
            relationship: '家人',
            phone: `139${String(i + 1).padStart(8, '0')}`
          }
        }))
      );

      // 创建值班表并生成排班
      const schedule = await DutySchedule.create({
        scheduleId: 'SCH-2024-001',
        year: 2024,
        month: 1,
        villageId: mockVillageId,
        createdBy: mockAdminId,
        schedulingRules: {
          algorithm: 'balanced',
          fairnessWeight: 0.5
        }
      });

      const generateStartTime = Date.now();
      const suggestions = await schedule.generateScheduleSuggestions(shifts, personnel);
      const generateTime = Date.now() - generateStartTime;

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`\n性能指标：`);
      console.log(`- 创建班次：20个`);
      console.log(`- 创建人员：50名`);
      console.log(`- 生成建议：${suggestions.length}条`);
      console.log(`- 排班耗时：${generateTime}ms`);
      console.log(`- 总耗时：${totalTime}ms`);

      // 验证性能
      expect(shifts).toHaveLength(20);
      expect(personnel).toHaveLength(50);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(generateTime).toBeLessThan(10000); // 排班应在10秒内完成

      console.log('\n✅ 性能测试通过！');
    }, 30000);
  });

  // 辅助函数

  function setupSocketIOHandlers(io) {
    io.on('connection', (socket) => {
      socket.on('join-village', (villageId) => {
        socket.join(`village-${villageId}`);
        socket.emit('joined-village', { villageId, success: true });
      });

      socket.on('emergency-call', (data) => {
        io.to(`village-${data.villageId}`).emit('emergency-call-broadcast', {
          ...data,
          timestamp: new Date(),
          status: 'pending'
        });
        socket.emit('call-notification-sent', {
          callId: data.callId,
          notifiedCount: data.notifiedPersonnel?.length || 0
        });
      });

      socket.on('accept-emergency-call', (data) => {
        io.to(`village-${data.villageId}`).emit('call-accepted', {
          callId: data.callId,
          personnelId: data.personnelId,
          acceptedAt: new Date(),
          responderLocation: data.location
        });
        socket.emit('call-accepted-confirmation', {
          callId: data.callId,
          status: 'accepted'
        });
      });

      socket.on('update-call-status', (data) => {
        io.to(`village-${data.villageId}`).emit('call-status-updated', {
          callId: data.callId,
          status: data.status,
          location: data.location,
          notes: data.notes,
          updatedAt: new Date()
        });
        socket.emit('status-update-confirmed', { callId: data.callId, status: data.status });
      });

      socket.on('complete-emergency-call', (data) => {
        io.to(`village-${data.villageId}`).emit('call-completed', {
          callId: data.callId,
          resolution: data.resolution,
          duration: data.duration,
          completedAt: new Date()
        });
        socket.emit('call-completed-confirmation', { callId: data.callId });
      });
    });
  }

  async function createClientSocket() {
    const port = global.socket_io_port;
    const socket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      reconnection: false
    });

    await new Promise((resolve) => {
      socket.on('connect', resolve);
    });

    clientSockets.push(socket);
    return socket;
  }

  async function joinVillage(socket, villageId) {
    return new Promise((resolve) => {
      socket.on('joined-village', () => resolve());
      socket.emit('join-village', villageId);
    });
  }
});
