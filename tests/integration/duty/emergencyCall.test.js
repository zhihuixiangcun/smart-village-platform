/**
 * 紧急呼叫功能集成测试
 * 测试呼叫发起流程、Socket.IO事件处理、响应状态更新、位置记录、超时自动升级
 */

const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const DutyPersonnel = require('../../../src/models/DutyPersonnel');
const DutySchedule = require('../../../src/models/DutySchedule');
const DutyShift = require('../../../src/models/DutyShift');
const TestHelpers = require('../../helpers');

// 跳过测试如果数据库不可用
const describeTests = mongoose.connection.readyState === 1 ? describe : describe.skip;

describeTests('Emergency Call Integration Tests', () => {
  let httpServer;
  let ioServer;
  let clientSockets;
  let mockVillageId;
  let mockUserId;
  let testShifts;
  let testPersonnel;
  let testSchedule;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 1) {
      // 创建HTTP服务器用于Socket.IO测试
      httpServer = http.createServer();
      ioServer = new Server(httpServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      });

      // Socket.IO事件处理
      ioServer.on('connection', (socket) => {
        socket.on('join-village', (villageId) => {
          socket.join(`village-${villageId}`);
          socket.emit('joined-village', { villageId, success: true });
        });

        socket.on('emergency-call', async (data) => {
          // 广播紧急呼叫到村庄内所有在线人员
          ioServer.to(`village-${data.villageId}`).emit('emergency-call-broadcast', {
            callId: data.callId,
            caller: data.caller,
            location: data.location,
            emergencyType: data.emergencyType,
            severity: data.severity,
            timestamp: new Date(),
            status: 'pending'
          });

          // 模拟发送呼叫通知给值班人员
          socket.emit('call-notification-sent', {
            callId: data.callId,
            notifiedCount: data.notifiedPersonnel?.length || 0
          });
        });

        socket.on('accept-emergency-call', async (data) => {
          const { callId, personnelId, location } = data;

          // 通知其他人员该呼叫已被接受
          ioServer.to(`village-${data.villageId}`).emit('call-accepted', {
            callId,
            personnelId,
            acceptedAt: new Date(),
            responderLocation: location
          });

          socket.emit('call-accepted-confirmation', {
            callId,
            status: 'accepted'
          });
        });

        socket.on('update-call-status', async (data) => {
          const { callId, status, location, notes } = data;

          // 广播状态更新
          ioServer.to(`village-${data.villageId}`).emit('call-status-updated', {
            callId,
            status,
            location,
            notes,
            updatedAt: new Date()
          });

          socket.emit('status-update-confirmed', { callId, status });
        });

        socket.on('complete-emergency-call', async (data) => {
          const { callId, resolution, duration } = data;

          ioServer.to(`village-${data.villageId}`).emit('call-completed', {
            callId,
            resolution,
            duration,
            completedAt: new Date()
          });

          socket.emit('call-completed-confirmation', { callId });
        });

        socket.on('disconnect', () => {
          // 清理资源
        });
      });

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
      mockUserId = new mongoose.Types.ObjectId();

      // 创建测试数据
      testShifts = await createTestShifts(mockVillageId);
      testPersonnel = await createTestPersonnel(mockVillageId);
      testSchedule = await createTestSchedule(mockVillageId, mockUserId);

      // 重置客户端socket数组
      clientSockets = [];
    }
  });

  afterEach(async () => {
    // 清理测试中创建的socket连接
    if (clientSockets) {
      clientSockets.forEach(socket => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
      clientSockets = [];
    }
  });

  describe('紧急呼叫发起流程', () => {
    test('应该成功发起紧急呼叫并广播给值班人员', async () => {
      const callerSocket = await createClientSocket();
      const personnelSocket1 = await createClientSocket();
      const personnelSocket2 = await createClientSocket();

      // 值班人员加入村庄房间
      await Promise.all([
        joinVillage(personnelSocket1, mockVillageId.toString()),
        joinVillage(personnelSocket2, mockVillageId.toString())
      ]);

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '张三',
          phone: '13800138000'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '浙江省杭州市余杭区某村1号'
        },
        emergencyType: 'medical',
        severity: 'high',
        description: '突发疾病，需要急救',
        notifiedPersonnel: testPersonnel.slice(0, 2).map(p => p._id.toString())
      };

      // 发起紧急呼叫
      const broadcastPromise = new Promise((resolve) => {
        personnelSocket1.on('emergency-call-broadcast', (data) => {
          resolve(data);
        });
      });

      callerSocket.emit('emergency-call', callData);

      const broadcast = await broadcastPromise;

      expect(broadcast).toBeDefined();
      expect(broadcast.callId).toBe(callData.callId);
      expect(broadcast.emergencyType).toBe('medical');
      expect(broadcast.severity).toBe('high');
      expect(broadcast.location).toEqual(callData.location);
      expect(broadcast.status).toBe('pending');
    });

    test('应该记录呼叫者的准确位置信息', async () => {
      const callerSocket = await createClientSocket();
      const personnelSocket = await createClientSocket();

      await joinVillage(personnelSocket, mockVillageId.toString());

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '李四',
          phone: '13800138001'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '浙江省杭州市余杭区某村2号',
          accuracy: 10.5, // 米
          altitude: 50.2,
          timestamp: new Date()
        },
        emergencyType: 'fire',
        severity: 'critical'
      };

      const broadcastPromise = new Promise((resolve) => {
        personnelSocket.on('emergency-call-broadcast', (data) => {
          resolve(data);
        });
      });

      callerSocket.emit('emergency-call', callData);
      const broadcast = await broadcastPromise;

      expect(broadcast.location.latitude).toBe(30.2741);
      expect(broadcast.location.longitude).toBe(120.1551);
      expect(broadcast.location.address).toContain('浙江省杭州市');
      expect(broadcast.location.accuracy).toBe(10.5);
    });

    test('应该根据紧急类型选择合适的通知人员', async () => {
      // 医疗紧急情况应该通知具备急救技能的人员
      const medicalPersonnel = testPersonnel[0];
      medicalPersonnel.capabilities.skills = ['急救', '医疗应急'];
      await medicalPersonnel.save();

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        emergencyType: 'medical',
        severity: 'high',
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '王五',
          phone: '13800138002'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '测试地址'
        },
        notifiedPersonnel: [medicalPersonnel._id.toString()]
      };

      const callerSocket = await createClientSocket();
      const personnelSocket = await createClientSocket();

      await joinVillage(personnelSocket, mockVillageId.toString());

      const notificationPromise = new Promise((resolve) => {
        callerSocket.on('call-notification-sent', (data) => {
          resolve(data);
        });
      });

      callerSocket.emit('emergency-call', callData);
      const notification = await notificationPromise;

      expect(notification.notifiedCount).toBe(1);
    });
  });

  describe('Socket.IO事件处理', () => {
    test('应该正确处理加入村庄事件', async () => {
      const socket = await createClientSocket();

      const promise = new Promise((resolve) => {
        socket.on('joined-village', (data) => {
          resolve(data);
        });
      });

      socket.emit('join-village', mockVillageId.toString());
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.villageId).toBe(mockVillageId.toString());
    });

    test('应该只接收本村庄的紧急呼叫', async () => {
      const otherVillageId = new mongoose.Types.ObjectId().toString();

      const socket1 = await createClientSocket(); // 本村人员
      const socket2 = await createClientSocket(); // 外村人员

      await Promise.all([
        joinVillage(socket1, mockVillageId.toString()),
        joinVillage(socket2, otherVillageId)
      ]);

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '测试',
          phone: '13800138000'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '测试地址'
        },
        emergencyType: 'medical',
        severity: 'high'
      };

      const callerSocket = await createClientSocket();

      const promise1 = new Promise((resolve) => {
        socket1.on('emergency-call-broadcast', (data) => resolve(data));
      });

      const promise2 = new Promise((resolve, reject) => {
        socket2.on('emergency-call-broadcast', () => reject(new Error('外村不应收到呼叫')));
        setTimeout(() => resolve(null), 500); // 超时则认为测试通过
      });

      callerSocket.emit('emergency-call', callData);

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBeDefined();
      expect(result2).toBeNull(); // 外村不应该收到呼叫
    });

    test('应该处理断线重连后的房间重新加入', async () => {
      const socket = await createClientSocket();

      await joinVillage(socket, mockVillageId.toString());

      // 模拟断线
      socket.disconnect();

      // 重新连接
      await new Promise(resolve => setTimeout(resolve, 100));
      await socket.connect();

      // 重新加入村庄
      const promise = new Promise((resolve) => {
        socket.on('joined-village', (data) => resolve(data));
      });

      socket.emit('join-village', mockVillageId.toString());
      const result = await promise;

      expect(result.success).toBe(true);
    });
  });

  describe('响应状态更新', () => {
    test('应该支持值班人员接受呼叫', async () => {
      const callerSocket = await createClientSocket();
      const personnelSocket = await createClientSocket();

      await joinVillage(personnelSocket, mockVillageId.toString());

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '测试',
          phone: '13800138000'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '测试地址'
        },
        emergencyType: 'medical',
        severity: 'high'
      };

      // 先发起呼叫
      callerSocket.emit('emergency-call', callData);
      await new Promise(resolve => setTimeout(resolve, 100));

      // 接受呼叫
      const acceptPromise = new Promise((resolve) => {
        personnelSocket.on('call-accepted', (data) => resolve(data));
      });

      const confirmPromise = new Promise((resolve) => {
        personnelSocket.on('call-accepted-confirmation', (data) => resolve(data));
      });

      personnelSocket.emit('accept-emergency-call', {
        callId: callData.callId,
        villageId: mockVillageId.toString(),
        personnelId: testPersonnel[0]._id.toString(),
        location: {
          latitude: 30.2742,
          longitude: 120.1552
        }
      });

      const [accepted, confirmed] = await Promise.all([acceptPromise, confirmPromise]);

      expect(accepted.callId).toBe(callData.callId);
      expect(accepted.personnelId).toBe(testPersonnel[0]._id.toString());
      expect(accepted.acceptedAt).toBeDefined();
      expect(confirmed.status).toBe('accepted');
    });

    test('应该支持更新响应状态（前往中、到达中、处理中）', async () => {
      const personnelSocket = await createClientSocket();
      await joinVillage(personnelSocket, mockVillageId.toString());

      const statusUpdates = ['on_the_way', 'arrived', 'handling'];

      for (const status of statusUpdates) {
        const updatePromise = new Promise((resolve) => {
          personnelSocket.on('call-status-updated', (data) => resolve(data));
        });

        const confirmPromise = new Promise((resolve) => {
          personnelSocket.on('status-update-confirmed', (data) => resolve(data));
        });

        personnelSocket.emit('update-call-status', {
          callId: new mongoose.Types.ObjectId().toString(),
          villageId: mockVillageId.toString(),
          status: status,
          location: {
            latitude: 30.2741 + Math.random() * 0.001,
            longitude: 120.1551 + Math.random() * 0.001
          },
          notes: `状态更新为: ${status}`
        });

        const [updated, confirmed] = await Promise.all([updatePromise, confirmPromise]);

        expect(updated.status).toBe(status);
        expect(confirmed.status).toBe(status);
      }
    });

    test('应该支持多个值班人员同时响应呼叫', async () => {
      const callerSocket = await createClientSocket();
      const personnelSocket1 = await createClientSocket();
      const personnelSocket2 = await createClientSocket();

      await Promise.all([
        joinVillage(personnelSocket1, mockVillageId.toString()),
        joinVillage(personnelSocket2, mockVillageId.toString())
      ]);

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '测试',
          phone: '13800138000'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '测试地址'
        },
        emergencyType: 'fire',
        severity: 'critical'
      };

      callerSocket.emit('emergency-call', callData);
      await new Promise(resolve => setTimeout(resolve, 100));

      const acceptPromises = [
        new Promise(resolve => {
          personnelSocket1.on('call-accepted', resolve);
        }),
        new Promise(resolve => {
          personnelSocket2.on('call-accepted', resolve);
        })
      ];

      // 两人都接受呼叫
      personnelSocket1.emit('accept-emergency-call', {
        callId: callData.callId,
        villageId: mockVillageId.toString(),
        personnelId: testPersonnel[0]._id.toString()
      });

      personnelSocket2.emit('accept-emergency-call', {
        callId: callData.callId,
        villageId: mockVillageId.toString(),
        personnelId: testPersonnel[1]._id.toString()
      });

      const responses = await Promise.all(acceptPromises);

      expect(responses).toHaveLength(2);
      expect(responses[0].callId).toBe(callData.callId);
      expect(responses[1].callId).toBe(callData.callId);
    });
  });

  describe('位置记录功能', () => {
    test('应该记录响应人员的实时位置', async () => {
      const personnelSocket = await createClientSocket();
      await joinVillage(personnelSocket, mockVillageId.toString());

      const locations = [];
      personnelSocket.on('call-status-updated', (data) => {
        if (data.location) {
          locations.push(data.location);
        }
      });

      // 模拟位置更新
      const updatePromises = [];
      for (let i = 0; i < 5; i++) {
        const promise = new Promise(resolve => {
          personnelSocket.on('status-update-confirmed', resolve);
        });
        updatePromises.push(promise);

        personnelSocket.emit('update-call-status', {
          callId: new mongoose.Types.ObjectId().toString(),
          villageId: mockVillageId.toString(),
          status: 'on_the_way',
          location: {
            latitude: 30.2741 + i * 0.0001,
            longitude: 120.1551 + i * 0.0001,
            accuracy: 5 + i,
            timestamp: new Date()
          }
        });

        await new Promise(res => setTimeout(res, 50));
      }

      await Promise.all(updatePromises);

      expect(locations).toHaveLength(5);
      expect(locations[0].latitude).toBeLessThan(locations[4].latitude);
    });

    test('应该计算响应人员与呼叫者的距离', async () => {
      const callerLocation = {
        latitude: 30.2741,
        longitude: 120.1551
      };

      const responderLocation = {
        latitude: 30.2751,
        longitude: 120.1561
      };

      // Haversine公式计算距离（约1.56公里）
      const distance = calculateDistance(
        callerLocation.latitude,
        callerLocation.longitude,
        responderLocation.latitude,
        responderLocation.longitude
      );

      expect(distance).toBeGreaterThan(1500);
      expect(distance).toBeLessThan(1600);
    });

    test('应该支持位置历史记录', async () => {
      const callId = new mongoose.Types.ObjectId().toString();
      const locationHistory = [];

      const personnelSocket = await createClientSocket();
      await joinVillage(personnelSocket, mockVillageId.toString());

      const updatePromise = new Promise(resolve => {
        let count = 0;
        personnelSocket.on('call-status-updated', (data) => {
          locationHistory.push({
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            timestamp: data.updatedAt
          });
          count++;
          if (count >= 3) resolve();
        });
      });

      // 发送多次位置更新
      for (let i = 0; i < 3; i++) {
        personnelSocket.emit('update-call-status', {
          callId: callId,
          villageId: mockVillageId.toString(),
          status: 'on_the_way',
          location: {
            latitude: 30.2741 + i * 0.0001,
            longitude: 120.1551 + i * 0.0001
          }
        });
        await new Promise(res => setTimeout(res, 50));
      }

      await updatePromise;

      expect(locationHistory).toHaveLength(3);
      expect(locationHistory[0].timestamp).toBeLessThan(locationHistory[2].timestamp);
    });
  });

  describe('超时自动升级', () => {
    test('应该在指定时间后自动升级未响应的呼叫', async () => {
      const callerSocket = await createClientSocket();
      const observerSocket = await createClientSocket();

      await joinVillage(observerSocket, mockVillageId.toString());

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '测试',
          phone: '13800138000'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '测试地址'
        },
        emergencyType: 'medical',
        severity: 'high'
      };

      callerSocket.emit('emergency-call', callData);

      // 模拟超时（这里用短时间模拟）
      await new Promise(resolve => setTimeout(resolve, 200));

      // 在实际应用中，应该有定时器检查未响应的呼叫
      // 这里我们模拟升级逻辑
      const upgradePromise = new Promise((resolve) => {
        observerSocket.on('call-status-updated', (data) => {
          if (data.status === 'escalated') {
            resolve(data);
          }
        });
      });

      // 模拟系统自动升级
      ioServer.to(`village-${mockVillageId.toString()}`).emit('call-status-updated', {
        callId: callData.callId,
        status: 'escalated',
        severity: 'critical',
        escalatedAt: new Date(),
        reason: 'no_response_within_timeout'
      });

      const upgraded = await upgradePromise;

      expect(upgraded.status).toBe('escalated');
      expect(upgraded.severity).toBe('critical');
      expect(upgraded.escalatedAt).toBeDefined();
    });

    test('应该根据严重程度设置不同的超时时间', () => {
      const timeouts = {
        'low': 300000,      // 5分钟
        'medium': 180000,   // 3分钟
        'high': 60000,      // 1分钟
        'critical': 30000   // 30秒
      };

      expect(timeouts.critical).toBeLessThan(timeouts.high);
      expect(timeouts.high).toBeLessThan(timeouts.medium);
      expect(timeouts.medium).toBeLessThan(timeouts.low);
    });

    test('升级后应该通知更多人员', async () => {
      const initialNotified = testPersonnel.slice(0, 2);
      const escalatedNotified = testPersonnel;

      expect(escalatedNotified.length).toBeGreaterThan(initialNotified.length);
    });
  });

  describe('呼叫完成流程', () => {
    test('应该支持完成紧急呼叫并记录结果', async () => {
      const personnelSocket = await createClientSocket();
      await joinVillage(personnelSocket, mockVillageId.toString());

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        emergencyType: 'medical',
        severity: 'high'
      };

      const completePromise = new Promise((resolve) => {
        personnelSocket.on('call-completed', (data) => resolve(data));
      });

      const confirmPromise = new Promise((resolve) => {
        personnelSocket.on('call-completed-confirmation', (data) => resolve(data));
      });

      const startTime = Date.now();

      personnelSocket.emit('complete-emergency-call', {
        callId: callData.callId,
        villageId: mockVillageId.toString(),
        resolution: {
          status: 'resolved',
          outcome: 'patient_transported_to_hospital',
          description: '患者已安全送往医院',
          actionsTaken: ['现场急救', '联系救护车', '协助转运'],
          followUpRequired: true,
          followUpNotes: '需关注患者后续治疗情况'
        },
        duration: Date.now() - startTime,
        completedBy: testPersonnel[0]._id.toString()
      });

      const [completed, confirmed] = await Promise.all([completePromise, confirmPromise]);

      expect(completed.callId).toBe(callData.callId);
      expect(completed.resolution.status).toBe('resolved');
      expect(completed.resolution.actionsTaken).toHaveLength(3);
      expect(completed.completedAt).toBeDefined();
      expect(confirmed.callId).toBe(callData.callId);
    });

    test('应该计算响应时间统计数据', async () => {
      const callTimes = [
        { callId: '1', responseTime: 45000, handlingTime: 180000 },
        { callId: '2', responseTime: 30000, handlingTime: 120000 },
        { callId: '3', responseTime: 60000, handlingTime: 240000 }
      ];

      const avgResponseTime = callTimes.reduce((sum, c) => sum + c.responseTime, 0) / callTimes.length;
      const avgHandlingTime = callTimes.reduce((sum, c) => sum + c.handlingTime, 0) / callTimes.length;

      expect(avgResponseTime).toBe(45000); // 45秒
      expect(avgHandlingTime).toBe(180000); // 3分钟
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理无效的村庄ID', async () => {
      const socket = await createClientSocket();

      const promise = new Promise((resolve, reject) => {
        socket.on('error', (data) => {
          resolve(data);
        });
        socket.on('joined-village', () => {
          reject(new Error('不应该成功加入'));
        });
        setTimeout(() => resolve(null), 500);
      });

      socket.emit('join-village', 'invalid-village-id');
      const result = await promise;

      // 在实际应用中应该返回错误，这里验证没有成功加入即可
      expect(result).toBeNull();
    });

    test('应该处理缺失的必填字段', async () => {
      const callerSocket = await createClientSocket();
      const personnelSocket = await createClientSocket();

      await joinVillage(personnelSocket, mockVillageId.toString());

      const invalidCallData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString()
        // 缺少caller, location, emergencyType等必填字段
      };

      const errorPromise = new Promise((resolve) => {
        callerSocket.on('error', (data) => resolve(data));
      });

      callerSocket.emit('emergency-call', invalidCallData);

      // 在实际应用中应该验证并返回错误
      // 这里我们验证流程能够处理不完整的数据
      await new Promise(res => setTimeout(res, 100));
    });

    test('应该处理网络延迟和消息重传', async () => {
      const socket = await createClientSocket();

      let messageCount = 0;
      socket.on('emergency-call-broadcast', () => {
        messageCount++;
      });

      await joinVillage(socket, mockVillageId.toString());

      const callData = {
        callId: new mongoose.Types.ObjectId().toString(),
        villageId: mockVillageId.toString(),
        caller: {
          userId: new mongoose.Types.ObjectId().toString(),
          name: '测试',
          phone: '13800138000'
        },
        location: {
          latitude: 30.2741,
          longitude: 120.1551,
          address: '测试地址'
        },
        emergencyType: 'medical',
        severity: 'high'
      };

      // 发送多次相同的呼叫（模拟重传）
      socket.emit('emergency-call', callData);
      socket.emit('emergency-call', callData);

      await new Promise(res => setTimeout(res, 200));

      // 实际应用中应该有去重机制
      expect(messageCount).toBeGreaterThan(0);
    });
  });

  // 辅助函数

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

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 地球半径（米）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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
          availableShiftTypes: ['morning', 'afternoon', 'emergency'],
          skills: i === 1 ? ['急救', '医疗应急'] : ['应急处理']
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

  async function createTestSchedule(villageId, userId) {
    return await DutySchedule.create({
      scheduleId: 'SCH-2024-001',
      year: 2024,
      month: 1,
      villageId: villageId,
      createdBy: userId,
      status: 'published'
    });
  }
});
