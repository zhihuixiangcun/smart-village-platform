const mongoose = require('mongoose');
const VillageMap = require('./VillageMap');
const MapLocation = require('./MapLocation');
const DangerZone = require('./DangerZone');
const EmergencyResource = require('./EmergencyResource');
const ResidentLocation = require('./ResidentLocation');
const Village = require('./Village');

/**
 * 初始化地图数据
 *
 * 使用方法：
 * node server/models/initMapData.js
 */

async function initMapData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('数据库连接成功');

    // 查找第一个村庄
    const village = await Village.findOne();
    if (!village) {
      console.log('未找到村庄，请先创建村庄数据');
      process.exit(1);
    }

    console.log(`正在为村庄 "${village.name}" 初始化地图数据...`);

    // 1. 创建村庄地图配置
    let villageMap = await VillageMap.findOne({ villageId: village._id });
    if (!villageMap) {
      // 定义村界边界坐标（示例：杭州某村）
      const boundaryCoordinates = [
        [120.140, 30.280],
        [120.160, 30.280],
        [120.160, 30.300],
        [120.140, 30.300],
        [120.140, 30.280]
      ];

      villageMap = new VillageMap({
        villageId: village._id,
        villageName: village.name,
        boundary: {
          type: 'Polygon',
          coordinates: [boundaryCoordinates]
        },
        center: {
          longitude: 120.150,
          latitude: 30.290
        },
        zoomLevel: 14
      });

      await villageMap.save();
      console.log('✓ 村庄地图配置创建成功');
    } else {
      console.log('✓ 村庄地图配置已存在');
    }

    // 2. 创建示例地点
    const locationCount = await MapLocation.countDocuments({ villageId: village._id });
    if (locationCount === 0) {
      const locations = [
        {
          name: '村委会',
          type: 'government',
          subType: '村委会',
          location: {
            type: 'Point',
            coordinates: [120.150, 30.290]
          },
          address: {
            detail: '村中心路1号'
          },
          attributes: {
            population: 10,
            area: 500,
            capacity: 50
          },
          contact: {
            personInCharge: '张书记',
            phone: '13800138000'
          },
          priority: 10
        },
        {
          name: '村小学',
          type: 'education',
          subType: '小学',
          location: {
            type: 'Point',
            coordinates: [120.145, 30.285]
          },
          address: {
            detail: '教育路2号'
          },
          attributes: {
            population: 200,
            area: 2000,
            capacity: 300
          },
          contact: {
            personInCharge: '李校长',
            phone: '13800138001'
          },
          priority: 8
        },
        {
          name: '村卫生室',
          type: 'medical',
          subType: '卫生室',
          location: {
            type: 'Point',
            coordinates: [120.155, 30.295]
          },
          address: {
            detail: '健康路3号'
          },
          attributes: {
            population: 5,
            area: 300,
            capacity: 20
          },
          contact: {
            personInCharge: '王医生',
            phone: '13800138002'
          },
          priority: 9
        },
        {
          name: '文化活动中心',
          type: 'cultural',
          subType: '文化中心',
          location: {
            type: 'Point',
            coordinates: [120.148, 30.292]
          },
          address: {
            detail: '文化路4号'
          },
          attributes: {
            population: 0,
            area: 800,
            capacity: 100
          },
          contact: {
            personInCharge: '赵主任',
            phone: '13800138003'
          },
          priority: 7
        },
        {
          name: '村委会商店',
          type: 'commercial',
          subType: '便利店',
          location: {
            type: 'Point',
            coordinates: [120.152, 30.288]
          },
          address: {
            detail: '商业街5号'
          },
          attributes: {
            population: 3,
            area: 100,
            capacity: 20
          },
          contact: {
            personInCharge: '陈老板',
            phone: '13800138004'
          },
          priority: 5
        }
      ];

      for (const loc of locations) {
        const location = new MapLocation({
          villageId: village._id,
          ...loc
        });
        await location.save();
      }
      console.log(`✓ 创建了 ${locations.length} 个示例地点`);
    } else {
      console.log(`✓ 地点数据已存在 (${locationCount} 个)`);
    }

    // 3. 创建示例危险区域
    const dangerZoneCount = await DangerZone.countDocuments({ villageId: village._id });
    if (dangerZoneCount === 0) {
      const dangerZones = [
        {
          name: '易涝区域A',
          dangerType: 'flood',
          dangerLevel: 'high',
          area: {
            type: 'Polygon',
            coordinates: [[
              [120.142, 30.282],
              [120.147, 30.282],
              [120.147, 30.286],
              [120.142, 30.286],
              [120.142, 30.282]
            ]]
          },
          description: '雨季容易积水，请注意防范',
          alert: {
            title: '易涝区域预警',
            message: '该区域在暴雨天气容易积水，请村民注意安全',
            level: 'danger',
            recommendations: [
              '雨季避免在此区域停车',
              '提前准备防汛物资',
              '关注天气预警信息'
            ]
          },
          status: 'active',
          affectedRadius: 200
        },
        {
          name: '滑坡风险区',
          dangerType: 'landslide',
          dangerLevel: 'medium',
          area: {
            type: 'Polygon',
            coordinates: [[
              [120.158, 30.296],
              [120.163, 30.296],
              [120.163, 30.299],
              [120.158, 30.299],
              [120.158, 30.296]
            ]]
          },
          description: '山坡区域，雨季有滑坡风险',
          alert: {
            title: '滑坡风险预警',
            message: '该区域为山坡地带，连续降雨可能引发滑坡',
            level: 'warning',
            recommendations: [
              '大雨天气避免靠近',
              '发现异常及时报告',
              '定期巡查山坡状况'
            ]
          },
          status: 'monitoring',
          affectedRadius: 150
        }
      ];

      for (const zone of dangerZones) {
        const dangerZone = new DangerZone({
          villageId: village._id,
          ...zone
        });
        await dangerZone.save();
      }
      console.log(`✓ 创建了 ${dangerZones.length} 个示例危险区域`);
    } else {
      console.log(`✓ 危险区域数据已存在 (${dangerZoneCount} 个)`);
    }

    // 4. 创建示例应急资源
    const resourceCount = await EmergencyResource.countDocuments({ villageId: village._id });
    if (resourceCount === 0) {
      const resources = [
        {
          name: '消防栓1号',
          resourceType: 'fire_hydrant',
          location: {
            type: 'Point',
            coordinates: [120.151, 30.291]
          },
          address: {
            detail: '村委会门口'
          },
          status: 'available',
          specifications: {
            brand: '某品牌',
            model: 'FH-100',
            capacity: '100mm',
            quantity: 1
          },
          responsiblePerson: {
            name: '张书记',
            phone: '13800138000'
          },
          priority: 10
        },
        {
          name: '应急水泵',
          resourceType: 'water_pump',
          location: {
            type: 'Point',
            coordinates: [120.149, 30.289]
          },
          address: {
            detail: '物资仓库'
          },
          status: 'available',
          specifications: {
            brand: '某品牌',
            model: 'WP-200',
            capacity: '200m³/h',
            quantity: 2
          },
          responsiblePerson: {
            name: '李主任',
            phone: '13800138005'
          },
          priority: 9
        },
        {
          name: '村避难所',
          resourceType: 'shelter',
          location: {
            type: 'Point',
            coordinates: [120.146, 30.293]
          },
          address: {
            detail: '文化活动中心'
          },
          status: 'available',
          specifications: {
            capacity: '100人',
            quantity: 1
          },
          responsiblePerson: {
            name: '赵主任',
            phone: '13800138003'
          },
          priority: 10
        },
        {
          name: '急救箱',
          resourceType: 'first_aid_kit',
          location: {
            type: 'Point',
            coordinates: [120.155, 30.295]
          },
          address: {
            detail: '卫生室'
          },
          status: 'available',
          specifications: {
            capacity: '50人份',
            quantity: 3
          },
          responsiblePerson: {
            name: '王医生',
            phone: '13800138002'
          },
          priority: 8
        },
        {
          name: '灭火器组',
          resourceType: 'fire_extinguisher',
          location: {
            type: 'Point',
            coordinates: [120.150, 30.290]
          },
          address: {
            detail: '村委会大厅'
          },
          status: 'available',
          specifications: {
            brand: '某品牌',
            model: 'FE-4A',
            capacity: '4kg',
            quantity: 10
          },
          responsiblePerson: {
            name: '张书记',
            phone: '13800138000'
          },
          priority: 9
        }
      ];

      for (const resource of resources) {
        const emergencyResource = new EmergencyResource({
          villageId: village._id,
          ...resource
        });
        await emergencyResource.save();
      }
      console.log(`✓ 创建了 ${resources.length} 个示例应急资源`);
    } else {
      console.log(`✓ 应急资源数据已存在 (${resourceCount} 个)`);
    }

    // 5. 更新地图统计数据
    await villageMap.updateStatistics();
    console.log('✓ 地图统计数据已更新');

    console.log('\n地图数据初始化完成！');
    console.log('========================');
    console.log('统计信息：');
    console.log(`- 村庄地图配置: 1`);
    console.log(`- 地点数量: ${await MapLocation.countDocuments({ villageId: village._id })}`);
    console.log(`- 危险区域数量: ${await DangerZone.countDocuments({ villageId: village._id })}`);
    console.log(`- 应急资源数量: ${await EmergencyResource.countDocuments({ villageId: village._id })}`);
    console.log('========================\n');

    process.exit(0);
  } catch (error) {
    console.error('初始化地图数据失败:', error);
    process.exit(1);
  }
}

// 运行初始化
if (require.main === module) {
  initMapData();
}

module.exports = initMapData;
