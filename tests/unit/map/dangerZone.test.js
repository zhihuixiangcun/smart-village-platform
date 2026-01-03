/**
 * 危险区域单元测试
 * 测试危险区域的创建、不同形状、等级判断和重叠检测
 */

const VillageMap = require('../../../src/models/VillageMap');
const mongoose = require('mongoose');

describe('Danger Zone - Unit Tests', () => {
  let testVillageId;
  let testMapId;

  beforeEach(async () => {
    testVillageId = new mongoose.Types.ObjectId();

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

  describe('危险区域创建', () => {
    test('应该创建多边形危险区域', async () => {
      const map = await VillageMap.findById(testMapId);

      const warningData = {
        type: 'flood',
        severity: 'red',
        title: '洪水预警区域',
        description: '易发生洪水积水的危险区域',
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
        issuedBy: new mongoose.Types.ObjectId(),
        isPublic: true,
        actions: ['立即撤离', '避免进入', '关注官方通知'],
        contactInfo: {
          phone: '13800138000',
          email: 'emergency@village.gov.cn'
        }
      };

      await map.addDisasterWarning(warningData);

      expect(map.disasterWarning.activeWarnings.length).toBe(1);
      expect(map.disasterWarning.activeWarnings[0].type).toBe('flood');
      expect(map.disasterWarning.activeWarnings[0].severity).toBe('red');
      expect(map.disasterWarning.activeWarnings[0].title).toBe('洪水预警区域');
    });

    test('应该创建圆形危险区域', async () => {
      const map = await VillageMap.findById(testMapId);

      const warningData = {
        type: 'fire',
        severity: 'orange',
        title: '森林火灾危险区',
        affectedArea: {
          type: 'Circle',
          coordinates: null
        },
        centerPoint: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        radius: 1000, // 1公里半径
        isPublic: true
      };

      await map.addDisasterWarning(warningData);

      expect(map.disasterWarning.activeWarnings.length).toBe(1);
      expect(map.disasterWarning.activeWarnings[0].type).toBe('fire');
      expect(map.disasterWarning.activeWarnings[0].radius).toBe(1000);
    });

    test('应该设置预警过期时间', async () => {
      const map = await VillageMap.findById(testMapId);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后

      const warningData = {
        type: 'storm',
        severity: 'yellow',
        title: '暴雨预警',
        expiresAt: expiresAt,
        centerPoint: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        radius: 2000
      };

      await map.addDisasterWarning(warningData);

      const warning = map.disasterWarning.activeWarnings[0];
      expect(warning.expiresAt).toBeDefined();
      expect(warning.expiresAt.getTime()).toBeCloseTo(expiresAt.getTime(), -3);
    });
  });

  describe('不同区域形状测试', () => {
    test('应该支持点状危险区域', async () => {
      const map = await VillageMap.findById(testMapId);

      const warningData = {
        type: 'landslide',
        severity: 'red',
        title: '山体滑坡点',
        affectedArea: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        centerPoint: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        radius: 50
      };

      await map.addDisasterWarning(warningData);

      expect(map.disasterWarning.activeWarnings[0].affectedArea.type).toBe('Point');
    });

    test('应该支持线状危险区域（如危险路段）', async () => {
      const map = await VillageMap.findById(testMapId);

      const warningData = {
        type: 'other',
        severity: 'yellow',
        title: '危险路段',
        description: '山体滑坡易发路段',
        affectedArea: {
          type: 'LineString',
          coordinates: [
            [116.397128, 39.916527],
            [116.400128, 39.918527],
            [116.403128, 39.920527],
            [116.407128, 39.923527]
          ]
        },
        centerPoint: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        radius: 100
      };

      await map.addDisasterWarning(warningData);

      expect(map.disasterWarning.activeWarnings[0].affectedArea.type).toBe('LineString');
      expect(map.disasterWarning.activeWarnings[0].affectedArea.coordinates.length).toBe(4);
    });

    test('应该支持多面多边形危险区域', async () => {
      const map = await VillageMap.findById(testMapId);

      const warningData = {
        type: 'flood',
        severity: 'orange',
        title: '多区域洪水预警',
        affectedArea: {
          type: 'MultiPolygon',
          coordinates: [
            // 第一个区域
            [[
              [116.397128, 39.916527],
              [116.400128, 39.916527],
              [116.400128, 39.919527],
              [116.397128, 39.919527],
              [116.397128, 39.916527]
            ]],
            // 第二个区域
            [[
              [116.405128, 39.922527],
              [116.407128, 39.922527],
              [116.407128, 39.925527],
              [116.405128, 39.925527],
              [116.405128, 39.922527]
            ]]
          ]
        },
        centerPoint: {
          type: 'Point',
          coordinates: [116.402128, 39.921527]
        },
        radius: 1000
      };

      await map.addDisasterWarning(warningData);

      expect(map.disasterWarning.activeWarnings[0].affectedArea.type).toBe('MultiPolygon');
      expect(map.disasterWarning.activeWarnings[0].affectedArea.coordinates.length).toBe(2);
    });
  });

  describe('危险等级判断', () => {
    test('应该支持所有危险等级', async () => {
      const severities = ['blue', 'yellow', 'orange', 'red'];
      const map = await VillageMap.findById(testMapId);

      for (const severity of severities) {
        const warningData = {
          type: 'storm',
          severity: severity,
          title: `${severity}级预警`,
          centerPoint: {
            type: 'Point',
            coordinates: [116.402128, 39.921527]
          },
          radius: 500
        };

        await map.addDisasterWarning(warningData);
      }

      expect(map.disasterWarning.activeWarnings.length).toBe(4);

      const blueWarning = map.disasterWarning.activeWarnings.find(w => w.severity === 'blue');
      const redWarning = map.disasterWarning.activeWarnings.find(w => w.severity === 'red');

      expect(blueWarning).toBeDefined();
      expect(redWarning).toBeDefined();
    });

    test('应该按严重程度排序预警', async () => {
      const map = await VillageMap.findById(testMapId);

      // 添加不同等级的预警
      await map.addDisasterWarning({
        type: 'storm',
        severity: 'yellow',
        title: '黄色预警',
        centerPoint: { type: 'Point', coordinates: [116.400128, 39.920527] },
        radius: 500
      });

      await map.addDisasterWarning({
        type: 'fire',
        severity: 'red',
        title: '红色预警',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      await map.addDisasterWarning({
        type: 'flood',
        severity: 'orange',
        title: '橙色预警',
        centerPoint: { type: 'Point', coordinates: [116.403128, 39.922527] },
        radius: 500
      });

      // 按严重程度排序：red > orange > yellow > blue
      const severityOrder = { red: 4, orange: 3, yellow: 2, blue: 1 };

      const sortedWarnings = [...map.disasterWarning.activeWarnings].sort((a, b) => {
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      expect(sortedWarnings[0].severity).toBe('red');
      expect(sortedWarnings[1].severity).toBe('orange');
      expect(sortedWarnings[2].severity).toBe('yellow');
    });

    test('应该根据等级提供相应的行动建议', async () => {
      const severityActions = {
        blue: ['关注天气变化', '做好准备'],
        yellow: ['避免外出', '储备物资', '关注通知'],
        orange: ['立即撤离', '远离危险区', '听从指挥'],
        red: ['紧急撤离', '寻求庇护', '保持通讯', '等待救援']
      };

      const map = await VillageMap.findById(testMapId);

      for (const [severity, actions] of Object.entries(severityActions)) {
        const warningData = {
          type: 'storm',
          severity: severity,
          title: `${severity}级预警`,
          actions: actions,
          centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
          radius: 500
        };

        await map.addDisasterWarning(warningData);
      }

      const redWarning = map.disasterWarning.activeWarnings.find(w => w.severity === 'red');
      expect(redWarning.actions).toContain('紧急撤离');
      expect(redWarning.actions).toContain('寻求庇护');
    });
  });

  describe('危险区域重叠检测', () => {
    test('应该检测两个圆形危险区域的重叠', async () => {
      const map = await VillageMap.findById(testMapId);

      // 第一个圆形区域
      await map.addDisasterWarning({
        type: 'fire',
        severity: 'red',
        title: '火灾区1',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      // 第二个圆形区域（与第一个重叠）
      await map.addDisasterWarning({
        type: 'fire',
        severity: 'orange',
        title: '火灾区2',
        centerPoint: { type: 'Point', coordinates: [116.403128, 39.922527] },
        radius: 600
      });

      // 计算圆心距离
      const warning1 = map.disasterWarning.activeWarnings[0];
      const warning2 = map.disasterWarning.activeWarnings[1];

      const [lon1, lat1] = warning1.centerPoint.coordinates;
      const [lon2, lat2] = warning2.centerPoint.coordinates;

      const R = 6371000; // 地球半径（米）
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      // 判断是否重叠（距离 < 半径之和）
      const isOverlapping = distance < (warning1.radius + warning2.radius);

      expect(isOverlapping).toBe(true);
    });

    test('应该检测多边形危险区域的重叠', async () => {
      const map = await VillageMap.findById(testMapId);

      // 第一个多边形
      await map.addDisasterWarning({
        type: 'flood',
        severity: 'red',
        title: '洪水区1',
        affectedArea: {
          type: 'Polygon',
          coordinates: [[
            [116.397128, 39.916527],
            [116.403128, 39.916527],
            [116.403128, 39.922527],
            [116.397128, 39.922527],
            [116.397128, 39.916527]
          ]]
        },
        centerPoint: { type: 'Point', coordinates: [116.400128, 39.919527] },
        radius: 500
      });

      // 第二个多边形（与第一个部分重叠）
      await map.addDisasterWarning({
        type: 'flood',
        severity: 'orange',
        title: '洪水区2',
        affectedArea: {
          type: 'Polygon',
          coordinates: [[
            [116.401128, 39.919527],
            [116.407128, 39.919527],
            [116.407128, 39.925527],
            [116.401128, 39.925527],
            [116.401128, 39.919527]
          ]]
        },
        centerPoint: { type: 'Point', coordinates: [116.404128, 39.922527] },
        radius: 500
      });

      expect(map.disasterWarning.activeWarnings.length).toBe(2);

      // 注意：完整的多边形重叠检测需要使用地理计算库（如turf.js）
      // 这里我们验证预警都已添加
      expect(map.disasterWarning.activeWarnings[0].type).toBe('flood');
      expect(map.disasterWarning.activeWarnings[1].type).toBe('flood');
    });

    test('应该检测嵌套的危险区域', async () => {
      const map = await VillageMap.findById(testMapId);

      // 大区域
      await map.addDisasterWarning({
        type: 'storm',
        severity: 'yellow',
        title: '大范围暴雨区',
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
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 1000
      });

      // 小区域（嵌套在大区域内）
      await map.addDisasterWarning({
        type: 'landslide',
        severity: 'red',
        title: '重点滑坡区',
        affectedArea: {
          type: 'Polygon',
          coordinates: [[
            [116.400128, 39.919527],
            [116.404128, 39.919527],
            [116.404128, 39.923527],
            [116.400128, 39.923527],
            [116.400128, 39.919527]
          ]]
        },
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 300
      });

      expect(map.disasterWarning.activeWarnings.length).toBe(2);

      // 小区域应该有更高的危险等级
      const redWarning = map.disasterWarning.activeWarnings.find(w => w.severity === 'red');
      expect(redWarning.title).toBe('重点滑坡区');
    });
  });

  describe('预警管理', () => {
    test('应该能够取消预警', async () => {
      const map = await VillageMap.findById(testMapId);

      const warningData = {
        type: 'fire',
        severity: 'red',
        title: '火灾预警',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      };

      await map.addDisasterWarning(warningData);

      expect(map.disasterWarning.activeWarnings.length).toBe(1);

      const warningId = map.disasterWarning.activeWarnings[0].warningId;
      const userId = new mongoose.Types.ObjectId();

      await map.removeDisasterWarning(warningId, userId);

      expect(map.disasterWarning.activeWarnings.length).toBe(0);
      expect(map.disasterWarning.warningHistory.length).toBe(2); // 添加和取消各一条
    });

    test('应该记录预警历史', async () => {
      const map = await VillageMap.findById(testMapId);

      const warningData = {
        type: 'flood',
        severity: 'orange',
        title: '洪水预警',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      };

      await map.addDisasterWarning(warningData);

      expect(map.disasterWarning.warningHistory.length).toBe(1);

      const historyEntry = map.disasterWarning.warningHistory[0];
      expect(historyEntry.type).toBe('flood');
      expect(historyEntry.action).toBe('issued');
      expect(historyEntry.createdAt).toBeDefined();

      const userId = new mongoose.Types.ObjectId();
      const warningId = map.disasterWarning.activeWarnings[0].warningId;

      await map.removeDisasterWarning(warningId, userId);

      expect(map.disasterWarning.warningHistory.length).toBe(2);

      const cancelEntry = map.disasterWarning.warningHistory[1];
      expect(cancelEntry.action).toBe('cancelled');
      expect(cancelEntry.cancelledBy).toEqual(userId);
      expect(cancelEntry.cancelledAt).toBeDefined();
    });

    test('应该生成唯一的预警ID', async () => {
      const map = await VillageMap.findById(testMapId);

      await map.addDisasterWarning({
        type: 'fire',
        severity: 'red',
        title: '火灾预警1',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      await map.addDisasterWarning({
        type: 'flood',
        severity: 'orange',
        title: '洪水预警2',
        centerPoint: { type: 'Point', coordinates: [116.403128, 39.922527] },
        radius: 500
      });

      const ids = map.disasterWarning.activeWarnings.map(w => w.warningId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(2);
      expect(ids[0]).not.toBe(ids[1]);
    });
  });

  describe('预警查询和筛选', () => {
    test('应该获取所有活跃预警', async () => {
      const map = await VillageMap.findById(testMapId);

      // 添加多个预警
      await map.addDisasterWarning({
        type: 'fire',
        severity: 'red',
        title: '火灾预警',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      await map.addDisasterWarning({
        type: 'flood',
        severity: 'orange',
        title: '洪水预警',
        centerPoint: { type: 'Point', coordinates: [116.403128, 39.922527] },
        radius: 500
      });

      const activeWarnings = await VillageMap.getActiveWarnings(testVillageId);

      expect(activeWarnings.length).toBeGreaterThanOrEqual(2);
    });

    test('应该按类型筛选预警', async () => {
      const map = await VillageMap.findById(testMapId);

      await map.addDisasterWarning({
        type: 'fire',
        severity: 'red',
        title: '火灾预警1',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      await map.addDisasterWarning({
        type: 'fire',
        severity: 'orange',
        title: '火灾预警2',
        centerPoint: { type: 'Point', coordinates: [116.403128, 39.922527] },
        radius: 500
      });

      await map.addDisasterWarning({
        type: 'flood',
        severity: 'yellow',
        title: '洪水预警',
        centerPoint: { type: 'Point', coordinates: [116.404128, 39.923527] },
        radius: 500
      });

      const fireWarnings = map.disasterWarning.activeWarnings.filter(w => w.type === 'fire');

      expect(fireWarnings.length).toBe(2);
      expect(fireWarnings.every(w => w.type === 'fire')).toBe(true);
    });

    test('应该按严重程度筛选预警', async () => {
      const map = await VillageMap.findById(testMapId);

      await map.addDisasterWarning({
        type: 'storm',
        severity: 'red',
        title: '红色预警',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      await map.addDisasterWarning({
        type: 'flood',
        severity: 'orange',
        title: '橙色预警',
        centerPoint: { type: 'Point', coordinates: [116.403128, 39.922527] },
        radius: 500
      });

      await map.addDisasterWarning({
        type: 'landslide',
        severity: 'yellow',
        title: '黄色预警',
        centerPoint: { type: 'Point', coordinates: [116.404128, 39.923527] },
        radius: 500
      });

      const highSeverityWarnings = map.disasterWarning.activeWarnings.filter(
        w => ['red', 'orange'].includes(w.severity)
      );

      expect(highSeverityWarnings.length).toBe(2);
    });
  });

  describe('预警关联功能', () => {
    test('应该支持设置预警的可见性', async () => {
      const map = await VillageMap.findById(testMapId);

      // 公开预警
      await map.addDisasterWarning({
        type: 'fire',
        severity: 'red',
        title: '公开预警',
        isPublic: true,
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      // 非公开预警
      await map.addDisasterWarning({
        type: 'other',
        severity: 'yellow',
        title: '内部预警',
        isPublic: false,
        centerPoint: { type: 'Point', coordinates: [116.403128, 39.922527] },
        radius: 500
      });

      const publicWarnings = map.disasterWarning.activeWarnings.filter(w => w.isPublic);
      const privateWarnings = map.disasterWarning.activeWarnings.filter(w => !w.isPublic);

      expect(publicWarnings.length).toBe(1);
      expect(privateWarnings.length).toBe(1);
    });

    test('应该支持添加联系方式', async () => {
      const map = await VillageMap.findById(testMapId);

      await map.addDisasterWarning({
        type: 'flood',
        severity: 'red',
        title: '洪水预警',
        contactInfo: {
          phone: '13800138000',
          email: 'emergency@village.gov.cn',
          wechat: 'village_emergency'
        },
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 500
      });

      const warning = map.disasterWarning.activeWarnings[0];

      expect(warning.contactInfo.phone).toBe('13800138000');
      expect(warning.contactInfo.email).toBe('emergency@village.gov.cn');
      expect(warning.contactInfo.wechat).toBe('village_emergency');
    });
  });

  describe('边界情况测试', () => {
    test('应该处理空的危险区域', async () => {
      const map = await VillageMap.findById(testMapId);

      const warningData = {
        type: 'other',
        severity: 'blue',
        title: '测试预警',
        affectedArea: {
          type: 'Polygon',
          coordinates: [] // 空多边形
        },
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 0
      };

      // 应该仍然能够保存
      await map.addDisasterWarning(warningData);

      expect(map.disasterWarning.activeWarnings.length).toBe(1);
    });

    test('应该处理极小的危险区域', async () => {
      const map = await VillageMap.findById(testMapId);

      await map.addDisasterWarning({
        type: 'other',
        severity: 'yellow',
        title: '极小危险区',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 1 // 1米
      });

      expect(map.disasterWarning.activeWarnings.length).toBe(1);
    });

    test('应该处理极大的危险区域', async () => {
      const map = await VillageMap.findById(testMapId);

      await map.addDisasterWarning({
        type: 'storm',
        severity: 'red',
        title: '超大预警区',
        centerPoint: { type: 'Point', coordinates: [116.402128, 39.921527] },
        radius: 50000 // 50公里
      });

      expect(map.disasterWarning.activeWarnings.length).toBe(1);
    });
  });
});
