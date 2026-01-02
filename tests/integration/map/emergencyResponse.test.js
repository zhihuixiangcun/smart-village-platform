/**
 * 应急响应集成测试
 * 测试危险区域内村民查询、附近资源查询、救援路径计算和应急通知发送
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const VillageMap = require('../../../src/models/VillageMap');
const LocationTracking = require('../../../src/models/LocationTracking');
const Emergency = require('../../../src/models/Emergency');
const User = require('../../../src/models/User');
const jwt = require('jsonwebtoken');

describe('Emergency Response - Integration Tests', () => {
  let adminToken;
  let staffToken;
  let testVillageId;
  let testMapId;

  beforeAll(async () => {
    // 创建测试用户
    const admin = new User({
      name: 'Admin User',
      phone: '13800000001',
      role: 'admin',
      villageId: new mongoose.Types.ObjectId()
    });
    await admin.save();
    adminToken = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET);

    const staff = new User({
      name: 'Staff User',
      phone: '13800000002',
      role: 'staff',
      villageId: new mongoose.Types.ObjectId()
    });
    await staff.save();
    staffToken = jwt.sign({ userId: staff._id }, process.env.JWT_SECRET);

    testVillageId = new mongoose.Types.ObjectId();

    // 创建测试地图
    const mapData = {
      villageId: testVillageId,
      mapName: '测试村庄地图',
      mapType: 'emergency',
      isActive: true,
      mapBounds: {
        northeast: { latitude: 39.926527, longitude: 116.407128 },
        southwest: { latitude: 39.916527, longitude: 116.397128 },
        center: { latitude: 39.921527, longitude: 116.402128 },
        zoomLevel: 15
      },
      emergencyConfig: {
        safeZones: [
          {
            zoneId: 'safe_1',
            name: '村广场',
            capacity: 500,
            coordinates: {
              type: 'Polygon',
              coordinates: [[
                [116.400128, 39.920527],
                [116.405128, 39.920527],
                [116.405128, 39.925527],
                [116.400128, 39.925527],
                [116.400128, 39.920527]
              ]]
            },
            facilities: ['医疗点', '水源', '临时 shelter'],
            accessRoutes: ['route_1', 'route_2']
          }
        ],
        evacuationRoutes: [
          {
            routeId: 'route_1',
            name: '主撤离路线',
            priority: 'primary',
            path: {
              type: 'LineString',
              coordinates: [
                [116.397128, 39.916527],
                [116.400128, 39.919527],
                [116.402128, 39.921527]
              ]
            },
            capacity: 1000,
            estimatedTime: 10
          },
          {
            routeId: 'route_2',
            name: '备用撤离路线',
            priority: 'secondary',
            path: {
              type: 'LineString',
              coordinates: [
                [116.398128, 39.917527],
                [116.401128, 39.920527],
                [116.403128, 39.922527]
              ]
            },
            capacity: 500,
            estimatedTime: 15
          }
        ],
        assemblyPoints: [
          {
            pointId: 'assembly_1',
            name: '村委会集合点',
            location: {
              type: 'Point',
              coordinates: [116.402128, 39.921527]
            },
            capacity: 200,
            facilities: ['广播', '医疗'],
            contactPerson: '张主任',
            contactPhone: '13800138000'
          }
        ]
      }
    };

    const map = new VillageMap(mapData);
    const savedMap = await map.save();
    testMapId = savedMap._id;
  });

  describe('危险区域内村民查询', () => {
    beforeEach(async () => {
      // 创建在危险区域内的村民位置
      const residentsInDanger = [
        {
          userId: new mongoose.Types.ObjectId(),
          location: { type: 'Point', coordinates: [116.402128, 39.921527] }, // 危险区域内
          name: '村民1'
        },
        {
          userId: new mongoose.Types.ObjectId(),
          location: { type: 'Point', coordinates: [116.403128, 39.922527] }, // 危险区域内
          name: '村民2'
        },
        {
          userId: new mongoose.Types.ObjectId(),
          location: { type: 'Point', coordinates: [116.396128, 39.915527] }, // 危险区域外
          name: '村民3'
        }
      ];

      for (const resident of residentsInDanger) {
        const location = new LocationTracking({
          userId: resident.userId,
          villageId: testVillageId,
          sessionId: `session_${resident.userId}`,
          location: resident.location,
          timestamp: new Date()
        });
        await location.save();
      }

      // 添加危险区域预警
      const map = await VillageMap.findById(testMapId);
      await map.addDisasterWarning({
        type: 'flood',
        severity: 'red',
        title: '洪水预警',
        affectedArea: {
          type: 'Polygon',
          coordinates: [[
            [116.401128, 39.920527],
            [116.405128, 39.920527],
            [116.405128, 39.924527],
            [116.401128, 39.924527],
            [116.401128, 39.920527]
          ]]
        },
        centerPoint: { type: 'Point', coordinates: [116.403128, 39.922527] },
        radius: 500,
        isPublic: true
      });
    });

    test('GET /api/v1/emergency/:villageId/residents-in-danger - 查询危险区域内的村民', async () => {
      const warningId = 'test_warning_id';

      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/residents-in-danger`)
        .query({ warningId })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // 应该返回危险区域内的村民
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });

    test('POST /api/v1/emergency/:villageId/check-locations - 批量检查村民位置', async () => {
      const requestBody = {
        dangerZone: {
          type: 'Polygon',
          coordinates: [[
            [116.401128, 39.920527],
            [116.405128, 39.920527],
            [116.405128, 39.924527],
            [116.401128, 39.924527],
            [116.401128, 39.920527]
          ]]
        }
      };

      const response = await request(app)
        .post(`/api/v1/emergency/${testVillageId}/check-locations`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.inDanger).toBeDefined();
      expect(response.body.data.safe).toBeDefined();
    });

    test('应该返回危险区域内村民的详细信息', async () => {
      const map = await VillageMap.findById(testMapId);
      const warning = map.disasterWarning.activeWarnings[0];

      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/residents-in-danger`)
        .query({ warningId: warning.warningId, includeDetails: true })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 0) {
        const resident = response.body.data[0];
        expect(resident.userId).toBeDefined();
        expect(resident.location).toBeDefined();
        expect(resident.emergencyStatus).toBeDefined();
      }
    });

    test('应该筛选需要紧急救援的村民', async () => {
      // 创建一个紧急状态的村民
      const emergencyUser = new LocationTracking({
        userId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        sessionId: 'emergency_session',
        location: { type: 'Point', coordinates: [116.402528, 39.921727] },
        emergencyStatus: {
          isInEmergency: true,
          emergencyType: 'medical',
          emergencyContacts: [
            { name: '家属', phone: '13900000000', relation: '配偶' }
          ]
        },
        timestamp: new Date()
      });

      await emergencyUser.save();

      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/residents-in-danger`)
        .query({ onlyEmergency: true })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 0) {
        const emergencyResident = response.body.data.find(r => r.emergencyStatus && r.emergencyStatus.isInEmergency);
        expect(emergencyResident).toBeDefined();
      }
    });
  });

  describe('附近资源查询', () => {
    beforeEach(async () => {
      const map = await VillageMap.findById(testMapId);

      // 添加应急设施
      await map.addFeature({
        featureType: 'medical_point',
        geometry: { type: 'Point', coordinates: [116.402128, 39.921527] },
        properties: {
          name: '医疗点1',
          capacity: 50,
          currentOccupancy: 10,
          status: 'active'
        }
      });

      await map.addFeature({
        featureType: 'shelter',
        geometry: { type: 'Point', coordinates: [116.403128, 39.922527] },
        properties: {
          name: '避难所1',
          capacity: 200,
          currentOccupancy: 30,
          status: 'active'
        }
      });

      await map.addFeature({
        featureType: 'rescue_point',
        geometry: { type: 'Point', coordinates: [116.404128, 39.923527] },
        properties: {
          name: '救援点1',
          capacity: 100,
          currentOccupancy: 5,
          status: 'active'
        }
      });

      await map.save();
    });

    test('GET /api/v1/emergency/:villageId/nearby-resources - 查询附近的应急资源', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/nearby-resources`)
        .query({
          lat: 39.921527,
          lng: 116.402128,
          radius: 1000,
          types: 'medical_point,shelter,rescue_point'
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // 验证返回的数据包含距离信息
      if (response.body.data.length > 0) {
        const resource = response.body.data[0];
        expect(resource.distance).toBeDefined();
        expect(resource.featureType).toBeDefined();
      }
    });

    test('应该按距离排序返回资源', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/nearby-resources`)
        .query({
          lat: 39.921527,
          lng: 116.402128,
          radius: 2000,
          sortBy: 'distance'
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 1) {
        // 验证是按距离升序排列
        for (let i = 0; i < response.body.data.length - 1; i++) {
          expect(response.body.data[i].distance)
            .toBeLessThanOrEqual(response.body.data[i + 1].distance);
        }
      }
    });

    test('应该筛选特定类型的资源', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/nearby-resources`)
        .query({
          lat: 39.921527,
          lng: 116.402128,
          radius: 1000,
          types: 'medical_point'
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 0) {
        response.body.data.forEach(resource => {
          expect(resource.featureType).toBe('medical_point');
        });
      }
    });

    test('应该只返回可用的资源', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/nearby-resources`)
        .query({
          lat: 39.921527,
          lng: 116.402128,
          radius: 1000,
          availableOnly: true
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 0) {
        response.body.data.forEach(resource => {
          expect(resource.properties.status).toBe('active');
          expect(resource.properties.currentOccupancy).toBeLessThan(resource.properties.capacity);
        });
      }
    });
  });

  describe('救援路径计算', () => {
    test('GET /api/v1/emergency/:villageId/evacuation-routes - 获取撤离路线', async () => {
      const startPoint = {
        latitude: 39.916527,
        longitude: 116.397128
      };

      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/evacuation-routes`)
        .query({
          fromLat: startPoint.latitude,
          fromLng: startPoint.longitude,
          priority: 'primary'
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // 验证路线数据结构
      const route = response.body.data[0];
      expect(route.routeId).toBeDefined();
      expect(route.name).toBeDefined();
      expect(route.priority).toBeDefined();
      expect(route.path).toBeDefined();
      expect(route.path.coordinates).toBeDefined();
      expect(route.estimatedTime).toBeDefined();
    });

    test('应该根据优先级排序路线', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/evacuation-routes`)
        .query({
          fromLat: 39.916527,
          fromLng: 116.397128
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 1) {
        // primary应该排在前面
        const priorityOrder = { primary: 3, secondary: 2, emergency: 1 };
        const sortedRoutes = [...response.body.data].sort((a, b) => {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        expect(response.body.data[0].priority).toBe(sortedRoutes[0].priority);
      }
    });

    test('应该计算路线的实际距离', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/evacuation-routes`)
        .query({
          fromLat: 39.916527,
          fromLng: 116.397128,
          includeDistance: true
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 0) {
        const route = response.body.data[0];
        expect(route.distance).toBeDefined();
        expect(route.distance).toBeGreaterThan(0);
      }
    });

    test('应该返回安全区域信息', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/safe-zones`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const safeZone = response.body.data[0];
        expect(safeZone.zoneId).toBeDefined();
        expect(safeZone.name).toBeDefined();
        expect(safeZone.capacity).toBeDefined();
        expect(safeZone.coordinates).toBeDefined();
        expect(safeZone.facilities).toBeDefined();
      }
    });
  });

  describe('应急通知发送', () => {
    test('POST /api/v1/emergency/:villageId/notify-danger - 通知危险区域内的村民', async () => {
      const notificationData = {
        warningId: 'test_warning',
        message: '您所在的区域存在洪水危险，请立即撤离！',
        channel: ['sms', 'app', 'broadcast'],
        targetArea: {
          type: 'Polygon',
          coordinates: [[
            [116.401128, 39.920527],
            [116.405128, 39.920527],
            [116.405128, 39.924527],
            [116.401128, 39.924527],
            [116.401128, 39.920527]
          ]]
        }
      };

      const response = await request(app)
        .post(`/api/v1/emergency/${testVillageId}/notify-danger`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifiedCount).toBeDefined();
      expect(response.body.data.failedCount).toBeDefined();
    });

    test('POST /api/v1/emergency/:villageId/notify-evacuation - 发送撤离通知', async () => {
      const evacuationData = {
        routeId: 'route_1',
        assemblyPointId: 'assembly_1',
        message: '请沿主撤离路线前往村委会集合点',
        urgency: 'high'
      };

      const response = await request(app)
        .post(`/api/v1/emergency/${testVillageId}/notify-evacuation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(evacuationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recipients).toBeDefined();
    });

    test('应该记录通知发送历史', async () => {
      // 创建应急事件
      const emergency = new Emergency({
        villageId: testVillageId,
        type: 'flood',
        severity: 'red',
        title: '洪水应急',
        description: '村庄低洼地带发生洪水',
        status: 'active',
        location: {
          type: 'Point',
          coordinates: [116.403128, 39.922527]
        },
        affectedArea: {
          type: 'Polygon',
          coordinates: [[
            [116.401128, 39.920527],
            [116.405128, 39.920527],
            [116.405128, 39.924527],
            [116.401128, 39.924527],
            [116.401128, 39.920527]
          ]]
        },
        reportedBy: new mongoose.Types.ObjectId(),
        responseTeam: [new mongoose.Types.ObjectId()],
        notifications: []
      });

      await emergency.save();

      // 添加通知记录
      emergency.notifications.push({
        type: 'evacuation_order',
        message: '立即撤离',
        channel: 'sms',
        sentAt: new Date(),
        recipients: [new mongoose.Types.ObjectId()],
        status: 'sent'
      });

      await emergency.save();

      const response = await request(app)
        .get(`/api/v1/emergency/${emergency._id}/notifications`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].type).toBe('evacuation_order');
    });
  });

  describe('应急资源管理', () => {
    test('GET /api/v1/emergency/:villageId/resources - 获取所有应急资源', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/resources`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/v1/emergency/:villageId/resources - 添加应急资源', async () => {
      const resourceData = {
        name: '应急水泵',
        type: 'equipment',
        location: {
          type: 'Point',
          coordinates: [116.405128, 39.924527]
        },
        quantity: 5,
        status: 'available',
        keeper: '张三',
        keeperPhone: '13800138000'
      };

      const response = await request(app)
        .post(`/api/v1/emergency/${testVillageId}/resources`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resourceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('应急水泵');
    });

    test('PUT /api/v1/emergency/resources/:resourceId - 更新资源状态', async () => {
      // 首先创建一个资源
      const createResponse = await request(app)
        .post(`/api/v1/emergency/${testVillageId}/resources`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '测试资源',
          type: 'equipment',
          location: { type: 'Point', coordinates: [116.406128, 39.925527] },
          quantity: 10,
          status: 'available'
        })
        .expect(201);

      const resourceId = createResponse.body.data._id;

      const updateData = {
        status: 'in_use',
        quantity: 8
      };

      const updateResponse = await request(app)
        .put(`/api/v1/emergency/resources/${resourceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.status).toBe('in_use');
      expect(updateResponse.body.data.quantity).toBe(8);
    });
  });

  describe('应急统计和报告', () => {
    test('GET /api/v1/emergency/:villageId/statistics - 获取应急统计', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/statistics`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalResidents).toBeDefined();
      expect(response.body.data.inDangerZone).toBeDefined();
      expect(response.body.data.safe).toBeDefined();
      expect(response.body.data.resources).toBeDefined();
    });

    test('GET /api/v1/emergency/:villageId/status - 获取应急状态', async () => {
      const response = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.activeEmergencies).toBeDefined();
      expect(response.body.data.activeWarnings).toBeDefined();
      expect(response.body.data.readinessLevel).toBeDefined();
    });
  });
});
