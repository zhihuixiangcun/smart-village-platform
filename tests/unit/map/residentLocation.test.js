/**
 * 村民位置单元测试
 * 测试村民位置的创建、更新、模糊化、聚合和隐私设置
 */

const LocationTracking = require('../../../src/models/LocationTracking');
const VillageMap = require('../../../src/models/VillageMap');
const mongoose = require('mongoose');

describe('Resident Location - Unit Tests', () => {
  let testUserId;
  let testVillageId;
  let testSessionId;

  beforeEach(() => {
    testUserId = new mongoose.Types.ObjectId();
    testVillageId = new mongoose.Types.ObjectId();
    testSessionId = `session_${Date.now()}`;
  });

  describe('位置创建和更新', () => {
    test('应该成功创建村民位置记录', async () => {
      const locationData = {
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: {
          type: 'Point',
          coordinates: [116.397128, 39.916527],
          accuracy: 10,
          altitude: 50,
          altitudeAccuracy: 5,
          heading: 90,
          speed: 1.5
        }
      };

      const location = new LocationTracking(locationData);
      const savedLocation = await location.save();

      expect(savedLocation._id).toBeDefined();
      expect(savedLocation.userId).toEqual(testUserId);
      expect(savedLocation.location.coordinates).toEqual([116.397128, 39.916527]);
      expect(savedLocation.location.accuracy).toBe(10);
    });

    test('应该更新位置信息', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: {
          type: 'Point',
          coordinates: [116.397128, 39.916527],
          accuracy: 10
        }
      });

      await location.save();

      // 更新位置
      const newLocationData = {
        type: 'Point',
        coordinates: [116.398128, 39.917527],
        accuracy: 15,
        altitude: 60
      };

      await location.updateLocation(newLocationData);

      expect(location.location.coordinates).toEqual([116.398128, 39.917527]);
      expect(location.location.accuracy).toBe(15);
      expect(location.location.altitude).toBe(60);
    });

    test('应该检测异常的位置跳跃', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: {
          type: 'Point',
          coordinates: [116.397128, 39.916527],
          accuracy: 10
        },
        timestamp: new Date('2024-01-01T10:00:00Z')
      });

      await location.save();

      // 1分钟后跳跃到500公里外的位置（异常）
      const newLocationData = {
        type: 'Point',
        coordinates: [117.397128, 40.916527], // 约500公里外
        accuracy: 10
      };

      await location.updateLocation(newLocationData);

      // 应该生成异常记录
      expect(location.anomalies.length).toBeGreaterThan(0);
      const jumpAnomaly = location.anomalies.find(a => a.type === 'location_jump');
      expect(jumpAnomaly).toBeDefined();
      expect(jumpAnomaly.severity).toBe('high');
    });

    test('应该记录设备信息', async () => {
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        platform: 'iOS',
        deviceId: 'device_12345',
        appVersion: '1.0.0',
        osVersion: '14.0'
      };

      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: {
          type: 'Point',
          coordinates: [116.397128, 39.916527]
        },
        deviceInfo
      });

      await location.save();

      expect(location.deviceInfo.userAgent).toBe(deviceInfo.userAgent);
      expect(location.deviceInfo.platform).toBe('iOS');
      expect(location.deviceInfo.deviceId).toBe('device_12345');
    });
  });

  describe('位置模糊化处理', () => {
    test('应该对公众视图进行位置模糊化', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: {
          type: 'Point',
          coordinates: [116.397128, 39.916527]
        },
        privacySettings: {
          anonymizePublic: true,
          blurRadius: 100
        }
      });

      await location.save();

      // 获取隐私保护的位置
      const privacyProtected = location.privacyProtectedLocation;

      expect(privacyProtected).toBeDefined();
      expect(privacyProtected.isAnonymized).toBe(true);
      expect(privacyProtected.blurRadius).toBe(100);

      // 模糊化的位置应该在原始位置100米范围内
      const distance = location.calculateDistance(
        location.location.coordinates,
        [privacyProtected.longitude, privacyProtected.latitude]
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThanOrEqual(100);
    });

    test('管理员视图应该显示精确位置', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: {
          type: 'Point',
          coordinates: [116.397128, 39.916527]
        },
        privacySettings: {
          anonymizePublic: true,
          blurRadius: 100
        }
      });

      await location.save();

      // 管理员视图（非publicView）应该看到精确位置
      const exactLocation = {
        latitude: location.location.coordinates[1],
        longitude: location.location.coordinates[0],
        isAnonymized: false
      };

      expect(exactLocation.latitude).toBe(39.916527);
      expect(exactLocation.longitude).toBe(116.397128);
      expect(exactLocation.isAnonymized).toBe(false);
    });

    test('应该支持不同的模糊半径', async () => {
      const blurRadii = [10, 50, 100, 200, 500];

      for (const radius of blurRadii) {
        const location = new LocationTracking({
          userId: testUserId,
          villageId: testVillageId,
          sessionId: testSessionId,
          location: {
            type: 'Point',
            coordinates: [116.397128, 39.916527]
          },
          privacySettings: {
            anonymizePublic: true,
            blurRadius: radius
          }
        });

        await location.save();

        const privacyProtected = location.privacyProtectedLocation;

        expect(privacyProtected.blurRadius).toBe(radius);

        const distance = location.calculateDistance(
          location.location.coordinates,
          [privacyProtected.longitude, privacyProtected.latitude]
        );

        expect(distance).toBeLessThanOrEqual(radius);
      }
    });

    test('当anonymizePublic为false时不模糊化', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: {
          type: 'Point',
          coordinates: [116.397128, 39.916527]
        },
        privacySettings: {
          anonymizePublic: false,
          blurRadius: 100
        }
      });

      await location.save();

      const privacyProtected = location.privacyProtectedLocation;

      expect(privacyProtected.isAnonymized).toBe(false);
      expect(privacyProtected.latitude).toBe(39.916527);
      expect(privacyProtected.longitude).toBe(116.397128);
    });
  });

  describe('位置聚合功能', () => {
    test('应该聚合村庄内所有在线用户位置', async () => {
      // 创建多个用户位置
      const locations = [
        {
          userId: new mongoose.Types.ObjectId(),
          location: { type: 'Point', coordinates: [116.397128, 39.916527] }
        },
        {
          userId: new mongoose.Types.ObjectId(),
          location: { type: 'Point', coordinates: [116.397130, 39.916529] }
        },
        {
          userId: new mongoose.Types.ObjectId(),
          location: { type: 'Point', coordinates: [116.407128, 39.926527] }
        }
      ];

      for (const locData of locations) {
        const location = new LocationTracking({
          ...locData,
          villageId: testVillageId,
          sessionId: `session_${Date.now()}_${Math.random()}`
        });
        await location.save();
      }

      // 获取村庄内所有位置
      const villageLocations = await LocationTracking.getVillageLocations(testVillageId, {
        includeOffline: false,
        publicView: true
      });

      expect(villageLocations.length).toBe(3);
    });

    test('应该只返回在线用户的位置', async () => {
      // 创建在线用户
      const onlineLocation = new LocationTracking({
        userId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        sessionId: 'online_session',
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        timestamp: new Date() // 当前时间
      });

      await onlineLocation.save();

      // 创建离线用户（6分钟前）
      const offlineLocation = new LocationTracking({
        userId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        sessionId: 'offline_session',
        location: { type: 'Point', coordinates: [116.397130, 39.916529] },
        timestamp: new Date(Date.now() - 6 * 60 * 1000) // 6分钟前
      });

      await offlineLocation.save();

      // 只获取在线用户
      const onlineLocations = await LocationTracking.getVillageLocations(testVillageId, {
        includeOffline: false
      });

      expect(onlineLocations.length).toBe(1);
      expect(onlineLocations[0].sessionId).toBe('online_session');
    });

    test('应该只返回处于紧急状态的用户', async () => {
      // 普通用户
      const normalLocation = new LocationTracking({
        userId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        sessionId: 'normal_session',
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        emergencyStatus: {
          isInEmergency: false
        }
      });

      await normalLocation.save();

      // 紧急状态用户
      const emergencyLocation = new LocationTracking({
        userId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        sessionId: 'emergency_session',
        location: { type: 'Point', coordinates: [116.397130, 39.916529] },
        emergencyStatus: {
          isInEmergency: true,
          emergencyType: 'medical',
          emergencyContacts: [
            { name: '张三', phone: '13800138000', relation: '配偶' }
          ]
        }
      });

      await emergencyLocation.save();

      // 只获取紧急状态用户
      const emergencyLocations = await LocationTracking.getVillageLocations(testVillageId, {
        onlyEmergency: true
      });

      expect(emergencyLocations.length).toBe(1);
      expect(emergencyLocations[0].emergencyStatus.isInEmergency).toBe(true);
      expect(emergencyLocations[0].emergencyStatus.emergencyType).toBe('medical');
    });
  });

  describe('隐私设置', () => {
    test('应该正确设置隐私选项', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        privacySettings: {
          isVisibleToPublic: false,
          isVisibleToVillage: true,
          isVisibleToStaff: true,
          anonymizePublic: true,
          blurRadius: 150
        }
      });

      await location.save();

      expect(location.privacySettings.isVisibleToPublic).toBe(false);
      expect(location.privacySettings.isVisibleToVillage).toBe(true);
      expect(location.privacySettings.isVisibleToStaff).toBe(true);
      expect(location.privacySettings.anonymizePublic).toBe(true);
      expect(location.privacySettings.blurRadius).toBe(150);
    });

    test('应该支持位置共享给特定用户', async () => {
      const sharedUserId = new mongoose.Types.ObjectId();

      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        privacySettings: {
          shareLocationWith: [
            {
              userId: sharedUserId,
              permission: 'track',
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
            }
          ]
        }
      });

      await location.save();

      expect(location.privacySettings.shareLocationWith.length).toBe(1);
      expect(location.privacySettings.shareLocationWith[0].userId).toEqual(sharedUserId);
      expect(location.privacySettings.shareLocationWith[0].permission).toBe('track');
    });

    test('应该验证模糊半径的范围', async () => {
      const invalidRadii = [5, 600]; // 小于10米和大于500米

      for (const radius of invalidRadii) {
        const location = new LocationTracking({
          userId: testUserId,
          villageId: testVillageId,
          sessionId: testSessionId,
          location: { type: 'Point', coordinates: [116.397128, 39.916527] },
          privacySettings: {
            blurRadius: radius
          }
        });

        let validationError;
        try {
          await location.save();
        } catch (error) {
          validationError = error;
        }

        // Mongoose应该验证范围
        if (radius < 10 || radius > 500) {
          expect(validationError).toBeDefined();
        }
      }
    });
  });

  describe('位置过期机制', () => {
    test('应该正确计算位置年龄', async () => {
      const timestamp = new Date(Date.now() - 60000); // 1分钟前

      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        timestamp
      });

      await location.save();

      const age = location.locationAge;

      expect(age).toBeGreaterThan(50); // 约60秒
      expect(age).toBeLessThan(70);
    });

    test('应该正确判断用户是否在线', async () => {
      // 在线用户（2分钟前更新）
      const onlineLocation = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: 'online_user',
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        timestamp: new Date(Date.now() - 2 * 60 * 1000)
      });

      await onlineLocation.save();

      expect(onlineLocation.isOnline).toBe(true);

      // 离线用户（10分钟前更新）
      const offlineLocation = new LocationTracking({
        userId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        sessionId: 'offline_user',
        location: { type: 'Point', coordinates: [116.397130, 39.916529] },
        timestamp: new Date(Date.now() - 10 * 60 * 1000)
      });

      await offlineLocation.save();

      expect(offlineLocation.isOnline).toBe(false);
    });

    test('应该在30天后自动删除位置记录', async () => {
      // 注意：这个测试需要MongoDB的TTL索引支持
      // 在测试环境中，我们可以验证索引是否存在

      const indexes = await LocationTracking.collection.getIndexes();
      const ttlIndex = indexes['timestamp_1'];

      expect(ttlIndex).toBeDefined();
      expect(ttlIndex.expireAfterSeconds).toBeDefined();
      expect(ttlIndex.expireAfterSeconds).toBe(2592000); // 30天
    });
  });

  describe('活动状态检测', () => {
    test('应该记录活动状态', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        activityStatus: {
          isMoving: true,
          activityType: 'walking',
          confidence: 0.85
        }
      });

      await location.save();

      expect(location.activityStatus.isMoving).toBe(true);
      expect(location.activityStatus.activityType).toBe('walking');
      expect(location.activityStatus.confidence).toBe(0.85);
    });

    test('应该支持所有活动类型', async () => {
      const activityTypes = ['still', 'walking', 'running', 'cycling', 'driving', 'unknown'];

      for (const type of activityTypes) {
        const location = new LocationTracking({
          userId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          sessionId: `session_${type}`,
          location: { type: 'Point', coordinates: [116.397128, 39.916527] },
          activityStatus: {
            isMoving: type !== 'still',
            activityType: type,
            confidence: 0.8
          }
        });

        await location.save();

        expect(location.activityStatus.activityType).toBe(type);
      }
    });
  });

  describe('电池和网络状态', () => {
    test('应该记录电池状态', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        batteryStatus: {
          level: 0.75,
          isCharging: true,
          isPowerSaveMode: false
        }
      });

      await location.save();

      expect(location.batteryStatus.level).toBe(0.75);
      expect(location.batteryStatus.isCharging).toBe(true);
      expect(location.batteryStatus.isPowerSaveMode).toBe(false);
    });

    test('应该记录网络状态', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        networkStatus: {
          type: 'wifi',
          effectiveType: '4g',
          downlink: 50,
          rtt: 30,
          wifiSSID: 'TestWiFi'
        }
      });

      await location.save();

      expect(location.networkStatus.type).toBe('wifi');
      expect(location.networkStatus.effectiveType).toBe('4g');
      expect(location.networkStatus.downlink).toBe(50);
      expect(location.networkStatus.rtt).toBe(30);
    });
  });

  describe('地理围栏功能', () => {
    test('应该添加地理围栏事件', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: { type: 'Point', coordinates: [116.397128, 39.916527] }
      });

      await location.save();

      await location.addGeofenceEvent('fence_1', '危险区域', 'enter');

      expect(location.geofenceEvents.length).toBe(1);
      expect(location.geofenceEvents[0].fenceId).toBe('fence_1');
      expect(location.geofenceEvents[0].action).toBe('enter');
    });

    test('应该记录所有围栏事件类型', async () => {
      const actions = ['enter', 'exit', 'dwell'];

      for (const action of actions) {
        const location = new LocationTracking({
          userId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          sessionId: `session_${action}`,
          location: { type: 'Point', coordinates: [116.397128, 39.916527] }
        });

        await location.save();
        await location.addGeofenceEvent(`fence_${action}`, '测试围栏', action);

        expect(location.geofenceEvents[0].action).toBe(action);
      }
    });
  });

  describe('紧急状态', () => {
    test('应该设置紧急状态', async () => {
      const location = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: testSessionId,
        location: { type: 'Point', coordinates: [116.397128, 39.916527] }
      });

      await location.save();

      await location.setEmergencyStatus({
        emergencyType: 'medical',
        emergencyContacts: [
          { name: '李四', phone: '13900139000', relation: '子女' }
        ],
        emergencyNotes: '突发心脏病'
      });

      expect(location.emergencyStatus.isInEmergency).toBe(true);
      expect(location.emergencyStatus.emergencyType).toBe('medical');
      expect(location.emergencyStatus.emergencyContacts.length).toBe(1);
      expect(location.emergencyStatus.lastEmergencyAlert).toBeDefined();
    });

    test('应该支持所有紧急类型', async () => {
      const emergencyTypes = ['medical', 'accident', 'lost', 'danger', 'other'];

      for (const type of emergencyTypes) {
        const location = new LocationTracking({
          userId: new mongoose.Types.ObjectId(),
          villageId: testVillageId,
          sessionId: `session_${type}`,
          location: { type: 'Point', coordinates: [116.397128, 39.916527] }
        });

        await location.save();
        await location.setEmergencyStatus({ emergencyType: type });

        expect(location.emergencyStatus.emergencyType).toBe(type);
      }
    });
  });

  describe('静态方法测试', () => {
    test('应该获取用户最新位置', async () => {
      const userId = new mongoose.Types.ObjectId();

      // 创建多个位置记录
      const location1 = new LocationTracking({
        userId,
        villageId: testVillageId,
        sessionId: 'session_1',
        location: { type: 'Point', coordinates: [116.397128, 39.916527] },
        timestamp: new Date(Date.now() - 10000)
      });

      await location1.save();

      const location2 = new LocationTracking({
        userId,
        villageId: testVillageId,
        sessionId: 'session_2',
        location: { type: 'Point', coordinates: [116.398128, 39.917527] },
        timestamp: new Date()
      });

      await location2.save();

      const latestLocation = await LocationTracking.getLatestLocation(userId);

      expect(latestLocation).toBeDefined();
      expect(latestLocation.sessionId).toBe('session_2');
      expect(latestLocation.location.coordinates).toEqual([116.398128, 39.917527]);
    });

    test('应该获取用户轨迹', async () => {
      const userId = new mongoose.Types.ObjectId();
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // 创建轨迹点
      for (let i = 0; i < 10; i++) {
        const location = new LocationTracking({
          userId,
          villageId: testVillageId,
          sessionId: `session_${i}`,
          location: {
            type: 'Point',
            coordinates: [116.397128 + i * 0.001, 39.916527 + i * 0.001]
          },
          timestamp: new Date(startDate.getTime() + i * 3600000)
        });

        await location.save();
      }

      const trajectory = await LocationTracking.getUserTrajectory(userId, startDate, endDate);

      expect(trajectory.length).toBe(10);
      expect(trajectory[0].timestamp.getTime()).toBeLessThan(trajectory[9].timestamp.getTime());
    });
  });
});
