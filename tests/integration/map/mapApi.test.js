/**
 * 地图API集成测试
 * 测试地图配置、地点管理、危险区域、应急资源、村民位置和地理位置查询API
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const VillageMap = require('../../../src/models/VillageMap');
const Village = require('../../../src/models/Village');
const User = require('../../../src/models/User');
const jwt = require('jsonwebtoken');

describe('Map API - Integration Tests', () => {
  let adminToken;
  let staffToken;
  let villagerToken;
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

    const villager = new User({
      name: 'Villager User',
      phone: '13800000003',
      role: 'villager',
      villageId: new mongoose.Types.ObjectId()
    });
    await villager.save();
    villagerToken = jwt.sign({ userId: villager._id }, process.env.JWT_SECRET);

    // 创建测试村庄
    const village = new Village({
      name: '测试村',
      code: 'TEST001',
      address: '北京市朝阳区测试路123号',
      location: {
        type: 'Point',
        coordinates: [116.397128, 39.916527]
      },
      population: 1000,
      households: 300
    });
    await village.save();
    testVillageId = village._id;

    // 创建测试地图
    const mapData = {
      villageId: testVillageId,
      mapName: '测试村庄地图',
      mapType: 'base',
      isActive: true,
      mapBounds: {
        northeast: { latitude: 39.926527, longitude: 116.407128 },
        southwest: { latitude: 39.916527, longitude: 116.397128 },
        center: { latitude: 39.921527, longitude: 116.402128 },
        zoomLevel: 15
      }
    };

    const map = new VillageMap(mapData);
    const savedMap = await map.save();
    testMapId = savedMap._id;
  });

  describe('地图配置API', () => {
    test('GET /api/v1/maps/:villageId/config - 获取地图配置', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testVillageId}/config`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.mapBounds).toBeDefined();
      expect(response.body.data.mapBounds.center).toBeDefined();
    });

    test('PUT /api/v1/maps/:mapId/config - 更新地图配置（管理员）', async () => {
      const updateData = {
        zoomLevel: 16,
        isActive: true
      };

      const response = await request(app)
        .put(`/api/v1/maps/${testMapId}/config`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.zoomLevel).toBe(16);
    });

    test('PUT /api/v1/maps/:mapId/config - 普通村民无权更新', async () => {
      const updateData = {
        zoomLevel: 17
      };

      const response = await request(app)
        .put(`/api/v1/maps/${testMapId}/config`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('POST /api/v1/maps - 创建新地图（管理员）', async () => {
      const newMapData = {
        villageId: testVillageId,
        mapName: '应急地图',
        mapType: 'emergency',
        mapBounds: {
          northeast: { latitude: 39.926527, longitude: 116.407128 },
          southwest: { latitude: 39.916527, longitude: 116.397128 },
          center: { latitude: 39.921527, longitude: 116.402128 },
          zoomLevel: 14
        }
      };

      const response = await request(app)
        .post('/api/v1/maps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newMapData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mapName).toBe('应急地图');
      expect(response.body.data.mapType).toBe('emergency');
    });
  });

  describe('地点管理API', () => {
    test('POST /api/v1/maps/:mapId/features - 添加地点标记', async () => {
      const featureData = {
        featureType: 'building',
        geometry: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        properties: {
          name: '村委会',
          description: '村庄村委会办公室',
          address: '村内中心位置',
          status: 'active'
        }
      };

      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(featureData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties.name).toBe('村委会');
    });

    test('GET /api/v1/maps/:mapId/features - 获取所有地点', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/maps/:mapId/features/:featureId - 获取单个地点', async () => {
      // 先添加一个地点
      const map = await VillageMap.findById(testMapId);
      await map.addFeature({
        featureType: 'facility',
        geometry: {
          type: 'Point',
          coordinates: [116.403128, 39.922527]
        },
        properties: {
          name: '卫生室',
          description: '村卫生室'
        }
      });

      const featureId = map.features[map.features.length - 1]._id;

      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/features/${featureId}`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties.name).toBe('卫生室');
    });

    test('PUT /api/v1/maps/:mapId/features/:featureId - 更新地点', async () => {
      const map = await VillageMap.findById(testMapId);
      await map.addFeature({
        featureType: 'building',
        geometry: {
          type: 'Point',
          coordinates: [116.404128, 39.923527]
        },
        properties: {
          name: '旧名称'
        }
      });

      const featureId = map.features[map.features.length - 1]._id;

      const updateData = {
        properties: {
          name: '新名称',
          description: '更新后的描述'
        }
      };

      const response = await request(app)
        .put(`/api/v1/maps/${testMapId}/features/${featureId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties.name).toBe('新名称');
    });

    test('DELETE /api/v1/maps/:mapId/features/:featureId - 删除地点', async () => {
      const map = await VillageMap.findById(testMapId);
      await map.addFeature({
        featureType: 'building',
        geometry: {
          type: 'Point',
          coordinates: [116.405128, 39.924527]
        },
        properties: {
          name: '待删除的建筑'
        }
      });

      const featureId = map.features[map.features.length - 1]._id;

      const response = await request(app)
        .delete(`/api/v1/maps/${testMapId}/features/${featureId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/maps/:mapId/features?type=building - 按类型筛选地点', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/features?type=building`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('危险区域API', () => {
    test('POST /api/v1/maps/:mapId/warnings - 添加危险区域预警', async () => {
      const warningData = {
        type: 'flood',
        severity: 'red',
        title: '洪水预警区域',
        description: '低洼易涝区',
        affectedArea: {
          type: 'Polygon',
          coordinates: [[
            [116.397128, 39.916527],
            [116.407128, 39.916527],
            [116.407128, 39.926527],
            [116.397128, 39.926527],
            [116.397128, 39.916527]
          ]]
        },
        centerPoint: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        radius: 500,
        isPublic: true
      };

      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/warnings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(warningData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('flood');
      expect(response.body.data.severity).toBe('red');
    });

    test('GET /api/v1/maps/:mapId/warnings - 获取所有预警', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/warnings`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/maps/:mapId/warnings/active - 获取活跃预警', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/warnings/active`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/maps/:mapId/warnings?severity=red - 按严重程度筛选', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/warnings?severity=red`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('DELETE /api/v1/maps/:mapId/warnings/:warningId - 取消预警', async () => {
      const map = await VillageMap.findById(testMapId);
      await map.addDisasterWarning({
        type: 'fire',
        severity: 'orange',
        title: '待取消的预警',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      const warningId = map.disasterWarning.activeWarnings[
        map.disasterWarning.activeWarnings.length - 1
      ].warningId;

      const response = await request(app)
        .delete(`/api/v1/maps/${testMapId}/warnings/${warningId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('应急资源API', () => {
    beforeEach(async () => {
      const map = await VillageMap.findById(testMapId);

      // 添加应急设施
      await map.addFeature({
        featureType: 'medical_point',
        geometry: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        properties: {
          name: '医疗点',
          capacity: 50,
          currentOccupancy: 10
        }
      });

      await map.addFeature({
        featureType: 'shelter',
        geometry: {
          type: 'Point',
          coordinates: [116.403128, 39.922527]
        },
        properties: {
          name: '避难所',
          capacity: 200,
          currentOccupancy: 50
        }
      });

      await map.addFeature({
        featureType: 'rescue_point',
        geometry: {
          type: 'Point',
          coordinates: [116.404128, 39.923527]
        },
        properties: {
          name: '救援点',
          capacity: 100,
          currentOccupancy: 0
        }
      });
    });

    test('GET /api/v1/maps/:mapId/emergency/facilities - 获取应急设施', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/emergency/facilities`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    test('GET /api/v1/maps/:mapId/emergency/facilities?type=medical_point - 按类型查询', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/emergency/facilities?type=medical_point`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0].featureType).toBe('medical_point');
    });

    test('GET /api/v1/maps/:mapId/emergency/nearby?lat=39.921527&lng=116.402128 - 查询附近设施', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/emergency/nearby?lat=39.921527&lng=116.402128&radius=1000`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/villages/:villageId/emergency/routes - 获取撤离路线', async () => {
      // 先添加撤离路线
      const map = await VillageMap.findById(testMapId);
      map.emergencyConfig.evacuationRoutes.push({
        routeId: 'route_1',
        name: '主撤离路线',
        priority: 'primary',
        path: {
          type: 'LineString',
          coordinates: [
            [116.397128, 39.916527],
            [116.400128, 39.919527],
            [116.405128, 39.924527]
          ]
        },
        capacity: 500,
        estimatedTime: 15
      });
      await map.save();

      const response = await request(app)
        .get(`/api/v1/villages/${testVillageId}/emergency/routes`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('村民位置API', () => {
    let testUserId;

    beforeEach(async () => {
      const LocationTracking = require('../../../src/models/LocationTracking');

      // 创建测试位置记录
      testUserId = new mongoose.Types.ObjectId();

      const location1 = new LocationTracking({
        userId: testUserId,
        villageId: testVillageId,
        sessionId: 'session_1',
        location: {
          type: 'Point',
          coordinates: [116.402128, 39.921527],
          accuracy: 10
        },
        privacySettings: {
          isVisibleToPublic: false,
          isVisibleToVillage: true,
          anonymizePublic: true,
          blurRadius: 100
        },
        timestamp: new Date()
      });

      await location1.save();

      // 在线用户
      const location2 = new LocationTracking({
        userId: new mongoose.Types.ObjectId(),
        villageId: testVillageId,
        sessionId: 'session_2',
        location: {
          type: 'Point',
          coordinates: [116.403128, 39.922527],
          accuracy: 15
        },
        timestamp: new Date()
      });

      await location2.save();
    });

    test('GET /api/v1/villages/:villageId/locations - 获取村庄内所有位置', async () => {
      const response = await request(app)
        .get(`/api/v1/villages/${testVillageId}/locations`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    test('GET /api/v1/villages/:villageId/locations?online=true - 只获取在线用户', async () => {
      const response = await request(app)
        .get(`/api/v1/villages/${testVillageId}/locations?online=true`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/users/:userId/location - 获取用户位置', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUserId}/location`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toBeDefined();
    });

    test('PUT /api/v1/users/location - 更新用户位置', async () => {
      const updateData = {
        location: {
          type: 'Point',
          coordinates: [116.405128, 39.924527],
          accuracy: 10,
          altitude: 50
        },
        deviceInfo: {
          platform: 'iOS',
          appVersion: '1.0.0'
        }
      };

      const response = await request(app)
        .put('/api/v1/users/location')
        .set('Authorization', `Bearer ${villagerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/users/:userId/trajectory - 获取用户轨迹', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/v1/users/${testUserId}/trajectory?start=${startDate.toISOString()}&end=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('地理位置查询API', () => {
    test('GET /api/v1/maps/:mapId/features/in-bounds - 查询边界内的要素', async () => {
      const bounds = {
        northeast: { lat: 39.926527, lng: 116.407128 },
        southwest: { lat: 39.916527, lng: 116.397128 }
      };

      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/features/in-bounds`)
        .query({
          north: bounds.northeast.lat,
          east: bounds.northeast.lng,
          south: bounds.southwest.lat,
          west: bounds.southwest.lng
        })
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/maps/:mapId/features/nearby - 查询附近的要素', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/features/nearby`)
        .query({
          lat: 39.921527,
          lng: 116.402128,
          radius: 500,
          type: 'facility'
        })
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/maps/:mapId/search - 搜索地点', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/search`)
        .query({ q: '村委会' })
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/v1/maps/:mapId/statistics - 获取地图统计信息', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/statistics`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalFeatures).toBeDefined();
      expect(response.body.data.featuresByType).toBeDefined();
    });
  });

  describe('图层管理API', () => {
    test('POST /api/v1/maps/:mapId/layers - 添加图层', async () => {
      const layerData = {
        layerId: 'layer_1',
        layerName: '卫星图',
        layerType: 'overlay',
        isVisible: true,
        opacity: 0.8,
        zIndex: 1,
        source: {
          type: 'tile',
          url: 'https://tile.example.com/{z}/{x}/{y}.png',
          attribution: 'Example Tiles'
        }
      };

      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/layers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(layerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.layerName).toBe('卫星图');
    });

    test('GET /api/v1/maps/:mapId/layers - 获取所有图层', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/layers`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('PUT /api/v1/maps/:mapId/layers/:layerId - 更新图层', async () => {
      const map = await VillageMap.findById(testMapId);
      map.layers.push({
        layerId: 'layer_2',
        layerName: '测试图层',
        layerType: 'overlay',
        isVisible: true,
        opacity: 1
      });
      await map.save();

      const updateData = {
        isVisible: false,
        opacity: 0.5
      };

      const response = await request(app)
        .put(`/api/v1/maps/${testMapId}/layers/layer_2`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isVisible).toBe(false);
      expect(response.body.data.opacity).toBe(0.5);
    });

    test('DELETE /api/v1/maps/:mapId/layers/:layerId - 删除图层', async () => {
      const map = await VillageMap.findById(testMapId);
      map.layers.push({
        layerId: 'layer_3',
        layerName: '待删除图层',
        layerType: 'overlay',
        isVisible: true
      });
      await map.save();

      const response = await request(app)
        .delete(`/api/v1/maps/${testMapId}/layers/layer_3`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('权限控制测试', () => {
    test('未认证用户访问地图数据应返回401', async () => {
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/features`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('普通村民无法删除地图要素', async () => {
      const map = await VillageMap.findById(testMapId);
      await map.addFeature({
        featureType: 'building',
        geometry: {
          type: 'Point',
          coordinates: [116.406128, 39.925527]
        },
        properties: {
          name: '测试建筑'
        }
      });

      const featureId = map.features[map.features.length - 1]._id;

      const response = await request(app)
        .delete(`/api/v1/maps/${testMapId}/features/${featureId}`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('工作人员可以添加地点标记', async () => {
      const featureData = {
        featureType: 'facility',
        geometry: {
          type: 'Point',
          coordinates: [116.407128, 39.926527]
        },
        properties: {
          name: '公共设施'
        }
      };

      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(featureData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('数据验证测试', () => {
    test('无效的GPS坐标应返回400', async () => {
      const featureData = {
        featureType: 'building',
        geometry: {
          type: 'Point',
          coordinates: [999, 999] // 无效坐标
        },
        properties: {
          name: '测试'
        }
      };

      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(featureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('缺少必填字段应返回400', async () => {
      const featureData = {
        featureType: 'building'
        // 缺少geometry和properties
      };

      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(featureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('无效的危险等级应返回400', async () => {
      const warningData = {
        type: 'fire',
        severity: 'invalid_severity', // 无效等级
        title: '测试预警',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      };

      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/warnings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(warningData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('批量操作测试', () => {
    test('POST /api/v1/maps/:mapId/features/batch - 批量添加地点', async () => {
      const batchData = {
        features: [
          {
            featureType: 'building',
            geometry: { type: 'Point', coordinates: [116.402128, 39.921527] },
            properties: { name: '建筑1' }
          },
          {
            featureType: 'building',
            geometry: { type: 'Point', coordinates: [116.403128, 39.922527] },
            properties: { name: '建筑2' }
          },
          {
            featureType: 'building',
            geometry: { type: 'Point', coordinates: [116.404128, 39.923527] },
            properties: { name: '建筑3' }
          }
        ]
      };

      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/features/batch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(batchData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.added).toBe(3);
    });

    test('DELETE /api/v1/maps/:mapId/features/batch - 批量删除地点', async () => {
      const map = await VillageMap.findById(testMapId);

      // 添加多个测试要素
      const featureIds = [];
      for (let i = 0; i < 3; i++) {
        await map.addFeature({
          featureType: 'building',
          geometry: { type: 'Point', coordinates: [116.402128 + i * 0.001, 39.921527 + i * 0.001] },
          properties: { name: `建筑${i}` }
        });
        featureIds.push(map.features[map.features.length - 1]._id);
      }

      const response = await request(app)
        .delete(`/api/v1/maps/${testMapId}/features/batch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ featureIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(3);
    });
  });
});
