/**
 * 村情地图完整流程E2E测试
 * 测试从地图初始化到完整用户交互的端到端流程
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const VillageMap = require('../../src/models/VillageMap');
const Village = require('../../src/models/Village');
const User = require('../../src/models/User');
const LocationTracking = require('../../src/models/LocationTracking');
const jwt = require('jsonwebtoken');

describe('Village Map Complete Flow - E2E Tests', () => {
  let adminToken;
  let villagerToken;
  let testVillageId;
  let testMapId;
  let testUserId;

  beforeAll(async () => {
    // 创建管理员
    const admin = new User({
      name: 'Admin User',
      phone: '13800000001',
      role: 'admin',
      villageId: new mongoose.Types.ObjectId()
    });
    await admin.save();
    adminToken = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET);

    // 创建村民
    const villager = new User({
      name: 'Test Villager',
      phone: '13800000002',
      role: 'villager',
      villageId: new mongoose.Types.ObjectId()
    });
    await villager.save();
    testUserId = villager._id;
    villagerToken = jwt.sign({ userId: villager._id }, process.env.JWT_SECRET);

    // 创建测试村庄
    const village = new Village({
      name: '测试智慧村',
      code: 'SMART001',
      address: '浙江省杭州市余杭区瓶窑镇智慧村',
      location: {
        type: 'Point',
        coordinates: [120.0123, 30.2674] // 杭州地区坐标
      },
      population: 1500,
      households: 450,
      area: 5.2 // 平方公里
    });
    await village.save();
    testVillageId = village._id;
  });

  describe('完整用户流程', () => {
    test('流程1: 初始化地图数据 -> 用户打开地图 -> 查看各类信息', async () => {
      // 步骤1: 初始化地图数据
      const mapInitData = {
        villageId: testVillageId,
        mapName: '智慧村综合地图',
        mapType: 'base',
        isActive: true,
        mapBounds: {
          northeast: { latitude: 30.2774, longitude: 120.0223 },
          southwest: { latitude: 30.2574, longitude: 120.0023 },
          center: { latitude: 30.2674, longitude: 120.0123 },
          zoomLevel: 15
        },
        layers: [
          {
            layerId: 'base_layer',
            layerName: '基础地图',
            layerType: 'base',
            isVisible: true,
            opacity: 1,
            zIndex: 0,
            source: {
              type: 'tile',
              url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              attribution: '© OpenStreetMap contributors'
            }
          }
        ]
      };

      const initResponse = await request(app)
        .post('/api/v1/maps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mapInitData)
        .expect(201);

      expect(initResponse.body.success).toBe(true);
      testMapId = initResponse.body.data._id;

      // 步骤2: 用户打开地图页面
      const mapConfigResponse = await request(app)
        .get(`/api/v1/maps/${testVillageId}/config`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(mapConfigResponse.body.success).toBe(true);
      expect(mapConfigResponse.body.data.mapBounds).toBeDefined();
      expect(mapConfigResponse.body.data.layers).toBeDefined();

      // 步骤3: 查看村域边界
      const boundsResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/statistics`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(boundsResponse.body.success).toBe(true);
      expect(boundsResponse.body.data.totalFeatures).toBeDefined();
    });

    test('流程2: 添加地点标记 -> 查看地点 -> 搜索地点', async () => {
      // 步骤1: 添加各类地点标记
      const locations = [
        {
          featureType: 'building',
          geometry: { type: 'Point', coordinates: [120.0123, 30.2674] },
          properties: {
            name: '智慧村村委会',
            description: '村行政管理中心',
            address: '村内中心位置',
            type: 'government',
            status: 'active'
          }
        },
        {
          featureType: 'medical_point',
          geometry: { type: 'Point', coordinates: [120.0133, 30.2684] },
          properties: {
            name: '村卫生室',
            description: '基本医疗服务点',
            capacity: 30,
            currentOccupancy: 5
          }
        },
        {
          featureType: 'facility',
          geometry: { type: 'Point', coordinates: [120.0143, 30.2694] },
          properties: {
            name: '文化广场',
            description: '村民文化娱乐场所',
            type: 'recreation'
          }
        }
      ];

      for (const location of locations) {
        const response = await request(app)
          .post(`/api/v1/maps/${testMapId}/features`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(location)
          .expect(201);

        expect(response.body.success).toBe(true);
      }

      // 步骤2: 查看所有地点标记
      const featuresResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(featuresResponse.body.success).toBe(true);
      expect(Array.isArray(featuresResponse.body.data)).toBe(true);
      expect(featuresResponse.body.data.length).toBeGreaterThanOrEqual(3);

      // 步骤3: 按类型筛选地点
      const buildingResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/features?type=building`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(buildingResponse.body.success).toBe(true);
      expect(buildingResponse.body.data.length).toBeGreaterThan(0);

      // 步骤4: 搜索地点
      const searchResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/search`)
        .query({ q: '村委会' })
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);
      expect(searchResponse.body.data[0].properties.name).toContain('村委会');
    });

    test('流程3: 查看危险区域 -> 查询附近资源 -> 测试应急响应', async () => {
      // 步骤1: 添加危险区域预警
      const warningData = {
        type: 'flood',
        severity: 'yellow',
        title: '低洼地带积水预警',
        description: '雨季低洼地带容易积水',
        affectedArea: {
          type: 'Polygon',
          coordinates: [[
            [120.0103, 30.2654],
            [120.0153, 30.2654],
            [120.0153, 30.2704],
            [120.0103, 30.2704],
            [120.0103, 30.2654]
          ]]
        },
        centerPoint: { type: 'Point', coordinates: [120.0128, 30.2679] },
        radius: 300,
        isPublic: true,
        actions: ['注意积水', '避免通行', '关注通知']
      };

      const warningResponse = await request(app)
        .post(`/api/v1/maps/${testMapId}/warnings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(warningData)
        .expect(201);

      expect(warningResponse.body.success).toBe(true);

      // 步骤2: 查看活跃预警
      const warningsResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/warnings/active`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(warningsResponse.body.success).toBe(true);
      expect(warningsResponse.body.data.length).toBeGreaterThan(0);

      // 步骤3: 查询附近应急资源
      await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          featureType: 'shelter',
          geometry: { type: 'Point', coordinates: [120.0133, 30.2684] },
          properties: {
            name: '应急避难所',
            capacity: 200,
            currentOccupancy: 0
          }
        });

      const resourcesResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/emergency/nearby`)
        .query({
          lat: 30.2674,
          lng: 120.0123,
          radius: 1000
        })
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(resourcesResponse.body.success).toBe(true);
    });

    test('流程4: 更新村民位置 -> 查看位置分布 -> 测试隐私保护', async () => {
      // 步骤1: 村民更新位置
      const locationUpdate = {
        location: {
          type: 'Point',
          coordinates: [120.0128, 30.2679],
          accuracy: 10,
          altitude: 50
        },
        deviceInfo: {
          platform: 'Android',
          appVersion: '1.0.0'
        },
        privacySettings: {
          isVisibleToPublic: false,
          isVisibleToVillage: true,
          anonymizePublic: true,
          blurRadius: 100
        }
      };

      const updateResponse = await request(app)
        .put('/api/v1/users/location')
        .set('Authorization', `Bearer ${villagerToken}`)
        .send(locationUpdate)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // 步骤2: 查看村庄内所有村民位置
      const locationsResponse = await request(app)
        .get(`/api/v1/villages/${testVillageId}/locations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(locationsResponse.body.success).toBe(true);
      expect(Array.isArray(locationsResponse.body.data)).toBe(true);

      // 步骤3: 测试隐私保护（公开视图）
      const publicResponse = await request(app)
        .get(`/api/v1/villages/${testVillageId}/locations`)
        .query({ public: true })
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(publicResponse.body.success).toBe(true);
      // 公开视图中的位置应该被模糊化或隐藏
    });

    test('流程5: 测试图层切换功能', async () => {
      // 步骤1: 添加多个图层
      const layers = [
        {
          layerId: 'satellite',
          layerName: '卫星图',
          layerType: 'overlay',
          isVisible: false,
          opacity: 0.7,
          zIndex: 1,
          source: {
            type: 'tile',
            url: 'https://satellite.example.com/{z}/{x}/{y}.png'
          }
        },
        {
          layerId: 'terrain',
          layerName: '地形图',
          layerType: 'overlay',
          isVisible: false,
          opacity: 0.6,
          zIndex: 2,
          source: {
            type: 'tile',
            url: 'https://terrain.example.com/{z}/{x}/{y}.png'
          }
        }
      ];

      for (const layer of layers) {
        const response = await request(app)
          .post(`/api/v1/maps/${testMapId}/layers`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(layer)
          .expect(201);

        expect(response.body.success).toBe(true);
      }

      // 步骤2: 获取所有图层
      const getLayersResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/layers`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(getLayersResponse.body.success).toBe(true);
      expect(getLayersResponse.body.data.length).toBeGreaterThanOrEqual(2);

      // 步骤3: 切换图层显示状态
      const toggleResponse = await request(app)
        .put(`/api/v1/maps/${testMapId}/layers/satellite`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .send({ isVisible: true, opacity: 0.8 })
        .expect(200);

      expect(toggleResponse.body.success).toBe(true);
      expect(toggleResponse.body.data.isVisible).toBe(true);
    });

    test('流程6: 批量操作和数据导出', async () => {
      // 步骤1: 批量添加地点
      const batchData = {
        features: [
          {
            featureType: 'building',
            geometry: { type: 'Point', coordinates: [120.0153, 30.2704] },
            properties: { name: '村民活动中心' }
          },
          {
            featureType: 'building',
            geometry: { type: 'Point', coordinates: [120.0163, 30.2714] },
            properties: { name: '村幼儿园' }
          },
          {
            featureType: 'vegetation',
            geometry: { type: 'Polygon', coordinates: [[
              [120.0173, 30.2724],
              [120.0193, 30.2724],
              [120.0193, 30.2744],
              [120.0173, 30.2744],
              [120.0173, 30.2724]
            ]]},
            properties: { name: '村树林' }
          }
        ]
      };

      const batchResponse = await request(app)
        .post(`/api/v1/maps/${testMapId}/features/batch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(batchData)
        .expect(201);

      expect(batchResponse.body.success).toBe(true);
      expect(batchResponse.body.data.added).toBe(3);

      // 步骤2: 获取地图统计信息
      const statsResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/statistics`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.totalFeatures).toBeGreaterThan(0);
      expect(statsResponse.body.data.featuresByType).toBeDefined();
    });

    test('流程7: 完整的应急响应流程', async () => {
      // 步骤1: 创建紧急预警
      const emergencyWarning = {
        type: 'fire',
        severity: 'red',
        title: '森林火灾紧急预警',
        description: '村北山林发生火灾，请立即撤离',
        affectedArea: {
          type: 'Polygon',
          coordinates: [[
            [120.0173, 30.2724],
            [120.0223, 30.2724],
            [120.0223, 30.2774],
            [120.0173, 30.2774],
            [120.0173, 30.2724]
          ]]
        },
        centerPoint: { type: 'Point', coordinates: [120.0198, 30.2749] },
        radius: 500,
        isPublic: true,
        actions: ['立即撤离', '前往安全区域', '保持联系'],
        contactInfo: {
          phone: '119',
          email: 'emergency@smartvillage.gov.cn'
        }
      };

      await request(app)
        .post(`/api/v1/maps/${testMapId}/warnings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emergencyWarning)
        .expect(201);

      // 步骤2: 查询撤离路线
      const evacuationResponse = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/evacuation-routes`)
        .query({
          fromLat: 30.2749,
          fromLng: 120.0198,
          priority: 'primary'
        })
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(evacuationResponse.body.success).toBe(true);

      // 步骤3: 查询附近安全区域
      const safeZonesResponse = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/safe-zones`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(safeZonesResponse.body.success).toBe(true);

      // 步骤4: 更新村民位置为紧急状态
      await request(app)
        .put('/api/v1/users/location')
        .set('Authorization', `Bearer ${villagerToken}`)
        .send({
          location: {
            type: 'Point',
            coordinates: [120.0198, 30.2749]
          },
          emergencyStatus: {
            isInEmergency: true,
            emergencyType: 'danger',
            emergencyContacts: [
              { name: '紧急联系人', phone: '13800138000', relation: '家属' }
            ]
          }
        })
        .expect(200);

      // 步骤5: 查询危险区域内的村民
      const dangerResponse = await request(app)
        .get(`/api/v1/emergency/${testVillageId}/residents-in-danger`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(dangerResponse.body.success).toBe(true);
    });
  });

  describe('性能和稳定性测试', () => {
    test('应该处理大量地点标记', async () => {
      // 批量添加100个地点标记
      const features = [];
      for (let i = 0; i < 100; i++) {
        features.push({
          featureType: 'building',
          geometry: {
            type: 'Point',
            coordinates: [120.0123 + i * 0.0001, 30.2674 + i * 0.0001]
          },
          properties: {
            name: `建筑${i}`,
            description: `测试建筑${i}`
          }
        });
      }

      const batchResponse = await request(app)
        .post(`/api/v1/maps/${testMapId}/features/batch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ features })
        .expect(201);

      expect(batchResponse.body.success).toBe(true);
      expect(batchResponse.body.data.added).toBe(100);

      // 验证查询性能
      const startTime = Date.now();
      const queryResponse = await request(app)
        .get(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      const queryTime = Date.now() - startTime;
      expect(queryResponse.body.success).toBe(true);
      expect(queryTime).toBeLessThan(5000); // 查询应在5秒内完成
    });

    test('应该处理并发请求', async () => {
      const requests = [];

      // 创建10个并发请求
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get(`/api/v1/maps/${testMapId}/features`)
            .set('Authorization', `Bearer ${villagerToken}`)
        );
      }

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理无效的地图ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/maps/${invalidId}/features`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('应该处理无效的坐标', async () => {
      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          featureType: 'building',
          geometry: {
            type: 'Point',
            coordinates: [999, 999] // 无效坐标
          },
          properties: {
            name: '测试'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('应该处理未授权访问', async () => {
      const response = await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .send({
          featureType: 'building',
          geometry: { type: 'Point', coordinates: [120.0123, 30.2674] },
          properties: { name: '测试' }
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('数据一致性测试', () => {
    test('更新地图数据后应该立即反映在查询中', async () => {
      // 添加新地点
      await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          featureType: 'building',
          geometry: { type: 'Point', coordinates: [120.0203, 30.2754] },
          properties: { name: '新建建筑' }
        })
        .expect(201);

      // 立即查询
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      const newBuilding = response.body.data.find(
        f => f.properties.name === '新建建筑'
      );

      expect(newBuilding).toBeDefined();
    });

    test('删除地点后不应该在查询结果中出现', async () => {
      // 添加测试地点
      const addResponse = await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          featureType: 'building',
          geometry: { type: 'Point', coordinates: [120.0213, 30.2764] },
          properties: { name: '待删除建筑' }
        })
        .expect(201);

      const featureId = addResponse.body.data._id;

      // 删除地点
      await request(app)
        .delete(`/api/v1/maps/${testMapId}/features/${featureId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 验证删除
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      const deletedFeature = response.body.data.find(
        f => f._id === featureId
      );

      expect(deletedFeature).toBeUndefined();
    });
  });

  describe('用户体验测试', () => {
    test('地图加载应该快速响应', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/v1/maps/${testVillageId}/config`)
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      const loadTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(loadTime).toBeLessThan(2000); // 加载应在2秒内完成
    });

    test('搜索功能应该返回相关结果', async () => {
      // 添加已知地点
      await request(app)
        .post(`/api/v1/maps/${testMapId}/features`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          featureType: 'building',
          geometry: { type: 'Point', coordinates: [120.0223, 30.2774] },
          properties: { name: '智慧村便民服务中心' }
        });

      // 搜索关键词
      const response = await request(app)
        .get(`/api/v1/maps/${testMapId}/search`)
        .query({ q: '服务中心' })
        .set('Authorization', `Bearer ${villagerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].properties.name).toContain('服务中心');
    });
  });
});
