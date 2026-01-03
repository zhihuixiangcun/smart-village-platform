const VillageMap = require('../models/VillageMap');
const MapLocation = require('../models/MapLocation');
const ResidentLocation = require('../models/ResidentLocation');
const DangerZone = require('../models/DangerZone');
const EmergencyResource = require('../models/EmergencyResource');
const Village = require('../models/Village');

/**
 * 地图服务类
 *
 * 功能：
 * - 地图数据管理
 * - 位置隐私保护
 * - 位置聚合算法
 * - 距离和面积计算
 * - 地理空间查询
 */
class MapService {
  /**
   * 获取村庄地图配置
   * @param {String} villageId - 村庄ID
   * @returns {Object} 地图配置
   */
  async getVillageMapConfig(villageId) {
    try {
      let villageMap = await VillageMap.getByVillageId(villageId);

      // 如果地图配置不存在，创建默认配置
      if (!villageMap) {
        const village = await Village.findById(villageId);
        if (!village) {
          throw new Error('村庄不存在');
        }

        villageMap = await this.createDefaultVillageMap(villageId, village.name);
      }

      // 更新统计数据
      await villageMap.updateStatistics();

      return villageMap;
    } catch (error) {
      throw new Error(`获取地图配置失败: ${error.message}`);
    }
  }

  /**
   * 创建默认村庄地图配置
   * @param {String} villageId - 村庄ID
   * @param {String} villageName - 村庄名称
   * @returns {Object} 村庄地图配置
   */
  async createDefaultVillageMap(villageId, villageName) {
    const defaultCenter = {
      longitude: 120.1536,  // 默认经度（杭州）
      latitude: 30.2875     // 默认纬度（杭州）
    };

    const defaultBoundary = {
      type: 'Polygon',
      coordinates: [[
        [defaultCenter.longitude - 0.01, defaultCenter.latitude - 0.01],
        [defaultCenter.longitude + 0.01, defaultCenter.latitude - 0.01],
        [defaultCenter.longitude + 0.01, defaultCenter.latitude + 0.01],
        [defaultCenter.longitude - 0.01, defaultCenter.latitude + 0.01],
        [defaultCenter.longitude - 0.01, defaultCenter.latitude - 0.01]
      ]]
    };

    const villageMap = new VillageMap({
      villageId,
      villageName,
      boundary: defaultBoundary,
      center: defaultCenter,
      zoomLevel: 14,
      layers: {
        default: 'normal',
        available: [
          { name: '标准地图', type: 'normal', enabled: true },
          { name: '卫星地图', type: 'satellite', enabled: true },
          { name: '混合地图', type: 'hybrid', enabled: true }
        ]
      }
    });

    await villageMap.save();
    return villageMap;
  }

  /**
   * 更新村庄地图配置
   * @param {String} villageId - 村庄ID
   * @param {Object} updates - 更新数据
   * @returns {Object} 更新后的地图配置
   */
  async updateVillageMapConfig(villageId, updates) {
    try {
      const villageMap = await VillageMap.findOne({ villageId });
      if (!villageMap) {
        throw new Error('地图配置不存在');
      }

      // 允许更新的字段
      const allowedUpdates = ['boundary', 'center', 'zoomLevel', 'layers', 'style', 'controls', 'features', 'remarks'];
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          villageMap[field] = updates[field];
        }
      });

      await villageMap.save();
      return villageMap;
    } catch (error) {
      throw new Error(`更新地图配置失败: ${error.message}`);
    }
  }

  /**
   * 获取地图数据汇总
   * @param {String} villageId - 村庄ID
   * @returns {Object} 地图数据汇总
   */
  async getMapDataSummary(villageId) {
    try {
      const [locations, dangerZones, resources, residents] = await Promise.all([
        MapLocation.find({ villageId, visible: true, approvalStatus: 'approved' }),
        DangerZone.getActiveZones(villageId),
        EmergencyResource.find({ villageId, visible: true }),
        ResidentLocation.find({
          villageId,
          'privacySettings.showLocation': true,
          status: { $ne: 'offline' },
          expiresAt: { $gt: new Date() }
        }).populate('userId', 'name phone avatar')
      ]);

      // 按类型分组地点
      const locationsByType = {};
      locations.forEach(loc => {
        if (!locationsByType[loc.type]) {
          locationsByType[loc.type] = [];
        }
        locationsByType[loc.type].push({
          id: loc._id,
          name: loc.name,
          type: loc.type,
          subType: loc.subType,
          location: loc.location,
          address: loc.address,
          attributes: loc.attributes,
          contact: loc.contact,
          serviceHours: loc.serviceHours,
          priority: loc.priority
        });
      });

      // 处理危险区域
      const dangerZonesData = dangerZones.map(zone => ({
        id: zone._id,
        name: zone.name,
        dangerType: zone.dangerType,
        dangerLevel: zone.dangerLevel,
        area: zone.area,
        centerPoint: zone.centerPoint,
        alert: zone.alert,
        status: zone.status,
        displayConfig: zone.displayConfig
      }));

      // 处理应急资源
      const resourcesData = resources.map(resource => ({
        id: resource._id,
        resourceCode: resource.resourceCode,
        name: resource.name,
        resourceType: resource.resourceType,
        location: resource.location,
        status: resource.status,
        specifications: resource.specifications,
        responsiblePerson: resource.responsiblePerson,
        priority: resource.priority
      }));

      // 处理村民位置（添加隐私保护）
      const residentsData = this.privacyProtectResidents(residents);

      return {
        locations: locationsByType,
        dangerZones: dangerZonesData,
        resources: resourcesData,
        residents: residentsData,
        statistics: {
          locationCount: locations.length,
          dangerZoneCount: dangerZones.length,
          resourceCount: resources.length,
          residentCount: residents.length
        }
      };
    } catch (error) {
      throw new Error(`获取地图数据汇总失败: ${error.message}`);
    }
  }

  /**
   * 位置隐私保护
   * @param {Array} residents - 村民位置列表
   * @returns {Array} 隐私保护后的位置数据
   */
  privacyProtectResidents(residents) {
    const protectedResidents = residents.map(resident => {
      return {
        userId: resident.userId._id,
        name: resident.userId.name,
        status: resident.status,
        // 使用公开位置（已添加随机偏移）
        location: resident.publicLocation,
        batteryLevel: resident.batteryLevel,
        lastUpdate: resident.locationTimestamp
      };
    });

    return protectedResidents;
  }

  /**
   * 添加地点
   * @param {String} villageId - 村庄ID
   * @param {Object} locationData - 地点数据
   * @returns {Object} 创建的地点
   */
  async addLocation(villageId, locationData) {
    try {
      const location = new MapLocation({
        villageId,
        ...locationData,
        location: {
          type: 'Point',
          coordinates: [locationData.longitude, locationData.latitude]
        }
      });

      await location.save();

      // 更新地图统计数据
      await this.updateMapStatistics(villageId);

      return location;
    } catch (error) {
      throw new Error(`添加地点失败: ${error.message}`);
    }
  }

  /**
   * 更新地点
   * @param {String} locationId - 地点ID
   * @param {Object} updates - 更新数据
   * @returns {Object} 更新后的地点
   */
  async updateLocation(locationId, updates) {
    try {
      const location = await MapLocation.findById(locationId);
      if (!location) {
        throw new Error('地点不存在');
      }

      // 如果更新坐标
      if (updates.longitude !== undefined && updates.latitude !== undefined) {
        location.location = {
          type: 'Point',
          coordinates: [updates.longitude, updates.latitude]
        };
        delete updates.longitude;
        delete updates.latitude;
      }

      // 更新其他字段
      Object.assign(location, updates);
      await location.save();

      return location;
    } catch (error) {
      throw new Error(`更新地点失败: ${error.message}`);
    }
  }

  /**
   * 删除地点
   * @param {String} locationId - 地点ID
   * @returns {Boolean} 删除结果
   */
  async deleteLocation(locationId) {
    try {
      const location = await MapLocation.findById(locationId);
      if (!location) {
        throw new Error('地点不存在');
      }

      const villageId = location.villageId;
      await location.deleteOne();

      // 更新地图统计数据
      await this.updateMapStatistics(villageId);

      return true;
    } catch (error) {
      throw new Error(`删除地点失败: ${error.message}`);
    }
  }

  /**
   * 搜索附近地点
   * @param {String} villageId - 村庄ID
   * @param {Number} longitude - 经度
   * @param {Number} latitude - 纬度
   * @param {Number} maxDistance - 最大距离（米）
   * @param {Number} limit - 返回数量限制
   * @returns {Array} 附近地点列表
   */
  async findNearbyLocations(villageId, longitude, latitude, maxDistance = 1000, limit = 10) {
    try {
      const locations = await MapLocation.findNearby(longitude, latitude, maxDistance, limit);

      // 添加距离信息
      const locationsWithDistance = locations.map(location => {
        const distance = this.calculateDistance(
          longitude, latitude,
          location.location.coordinates[0],
          location.location.coordinates[1]
        );

        return {
          ...location.toObject(),
          distance
        };
      });

      // 按距离排序
      locationsWithDistance.sort((a, b) => a.distance - b.distance);

      return locationsWithDistance;
    } catch (error) {
      throw new Error(`搜索附近地点失败: ${error.message}`);
    }
  }

  /**
   * 添加危险区域
   * @param {String} villageId - 村庄ID
   * @param {Object} zoneData - 危险区域数据
   * @returns {Object} 创建的危险区域
   */
  async addDangerZone(villageId, zoneData) {
    try {
      const zone = new DangerZone({
        villageId,
        ...zoneData
      });

      await zone.save();

      // 更新地图统计数据
      await this.updateMapStatistics(villageId);

      return zone;
    } catch (error) {
      throw new Error(`添加危险区域失败: ${error.message}`);
    }
  }

  /**
   * 检查位置是否在危险区域
   * @param {String} villageId - 村庄ID
   * @param {Number} longitude - 经度
   * @param {Number} latitude - 纬度
   * @returns {Array} 危险区域列表
   */
  async checkLocationInDangerZone(villageId, longitude, latitude) {
    try {
      return await DangerZone.checkPointInDangerZone(villageId, longitude, latitude);
    } catch (error) {
      throw new Error(`检查危险区域失败: ${error.message}`);
    }
  }

  /**
   * 添加应急资源
   * @param {String} villageId - 村庄ID
   * @param {Object} resourceData - 资源数据
   * @returns {Object} 创建的资源
   */
  async addEmergencyResource(villageId, resourceData) {
    try {
      // 生成资源编号
      const resourceCode = await EmergencyResource.generateResourceCode(
        villageId,
        resourceData.resourceType
      );

      const resource = new EmergencyResource({
        villageId,
        resourceCode,
        ...resourceData,
        location: {
          type: 'Point',
          coordinates: [resourceData.longitude, resourceData.latitude]
        }
      });

      await resource.save();

      // 更新地图统计数据
      await this.updateMapStatistics(villageId);

      return resource;
    } catch (error) {
      throw new Error(`添加应急资源失败: ${error.message}`);
    }
  }

  /**
   * 搜索附近应急资源
   * @param {String} villageId - 村庄ID
   * @param {Number} longitude - 经度
   * @param {Number} latitude - 纬度
   * @param {Number} maxDistance - 最大距离（米）
   * @returns {Array} 附近资源列表
   */
  async findNearbyResources(villageId, longitude, latitude, maxDistance = 500) {
    try {
      const resources = await EmergencyResource.findNearbyResources(
        longitude,
        latitude,
        maxDistance
      );

      // 添加距离信息
      const resourcesWithDistance = resources.map(resource => {
        const distance = this.calculateDistance(
          longitude, latitude,
          resource.location.coordinates[0],
          resource.location.coordinates[1]
        );

        return {
          ...resource.toObject(),
          distance
        };
      });

      // 按距离排序
      resourcesWithDistance.sort((a, b) => a.distance - b.distance);

      return resourcesWithDistance;
    } catch (error) {
      throw new Error(`搜索附近资源失败: ${error.message}`);
    }
  }

  /**
   * 更新村民位置
   * @param {String} userId - 用户ID
   * @param {Number} longitude - 经度
   * @param {Number} latitude - 纬度
   * @param {Object} options - 选项
   * @returns {Object} 更新后的位置
   */
  async updateResidentLocation(userId, longitude, latitude, options = {}) {
    try {
      return await ResidentLocation.updateLocation(
        userId,
        longitude,
        latitude,
        options
      );
    } catch (error) {
      throw new Error(`更新位置失败: ${error.message}`);
    }
  }

  /**
   * 获取村庄内村民位置（公开）
   * @param {String} villageId - 村庄ID
   * @param {Object} user - 当前用户
   * @returns {Object} 村民位置数据
   */
  async getResidentLocations(villageId, user) {
    try {
      return await ResidentLocation.getPublicLocations(villageId, user);
    } catch (error) {
      throw new Error(`获取村民位置失败: ${error.message}`);
    }
  }

  /**
   * 搜索附近村民（用于应急响应）
   * @param {String} villageId - 村庄ID
   * @param {Number} longitude - 经度
   * @param {Number} latitude - 纬度
   * @param {Number} radius - 搜索半径（米）
   * @returns {Array} 附近村民列表
   */
  async findNearbyResidents(villageId, longitude, latitude, radius = 500) {
    try {
      const residents = await ResidentLocation.findNearbyResidents(
        longitude,
        latitude,
        radius
      );

      // 添加距离信息
      const residentsWithDistance = residents.map(resident => {
        const distance = this.calculateDistance(
          longitude, latitude,
          resident.exactLocation.coordinates[0],
          resident.exactLocation.coordinates[1]
        );

        return {
          userId: resident.userId._id,
          name: resident.userId.name,
          phone: resident.userId.phone,
          status: resident.status,
          batteryLevel: resident.batteryLevel,
          distance,
          lastUpdate: resident.locationTimestamp
        };
      });

      // 按距离排序
      residentsWithDistance.sort((a, b) => a.distance - b.distance);

      return residentsWithDistance;
    } catch (error) {
      throw new Error(`搜索附近村民失败: ${error.message}`);
    }
  }

  /**
   * 计算两点间距离（米）
   * @param {Number} lon1 - 点1经度
   * @param {Number} lat1 - 点1纬度
   * @param {Number} lon2 - 点2经度
   * @param {Number} lat2 - 点2纬度
   * @returns {Number} 距离（米）
   */
  calculateDistance(lon1, lat1, lon2, lat2) {
    const R = 6371e3; // 地球半径（米）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 计算多边形面积（平方米）
   * @param {Array} coordinates - 坐标数组 [[经度, 纬度], ...]
   * @returns {Number} 面积（平方米）
   */
  calculatePolygonArea(coordinates) {
    let area = 0;
    const n = coordinates.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = coordinates[i][0];
      const y1 = coordinates[i][1];
      const x2 = coordinates[j][0];
      const y2 = coordinates[j][1];

      area += x1 * y2;
      area -= x2 * y1;
    }

    area = Math.abs(area) / 2;

    // 转换为平方米
    const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / n;
    const latToMeter = 111320;
    const lonToMeter = 111320 * Math.cos(avgLat * Math.PI / 180);

    return area * latToMeter * lonToMeter;
  }

  /**
   * 更新地图统计数据
   * @param {String} villageId - 村庄ID
   */
  async updateMapStatistics(villageId) {
    try {
      const villageMap = await VillageMap.findOne({ villageId });
      if (villageMap) {
        await villageMap.updateStatistics();
      }
    } catch (error) {
      console.error('更新地图统计数据失败:', error);
    }
  }

  /**
   * 搜索地点
   * @param {String} villageId - 村庄ID
   * @param {String} keyword - 搜索关键词
   * @param {Object} options - 选项
   * @returns {Array} 搜索结果
   */
  async searchLocations(villageId, keyword, options = {}) {
    try {
      return await MapLocation.searchLocations(villageId, keyword, options);
    } catch (error) {
      throw new Error(`搜索地点失败: ${error.message}`);
    }
  }

  /**
   * 获取需要维护的资源
   * @param {String} villageId - 村庄ID
   * @returns {Array} 需要维护的资源列表
   */
  async getResourcesNeedingMaintenance(villageId) {
    try {
      return await EmergencyResource.getResourcesNeedingMaintenance(villageId);
    } catch (error) {
      throw new Error(`获取维护资源失败: ${error.message}`);
    }
  }

  /**
   * 获取即将过期的资源
   * @param {String} villageId - 村庄ID
   * @param {Number} days - 天数
   * @returns {Array} 即将过期的资源列表
   */
  async getExpiringResources(villageId, days = 30) {
    try {
      return await EmergencyResource.getExpiringResources(villageId, days);
    } catch (error) {
      throw new Error(`获取过期资源失败: ${error.message}`);
    }
  }

  /**
   * 记录资源使用
   * @param {String} resourceId - 资源ID
   * @param {Object} usageData - 使用数据
   * @returns {Object} 更新后的资源
   */
  async recordResourceUsage(resourceId, usageData) {
    try {
      const resource = await EmergencyResource.findById(resourceId);
      if (!resource) {
        throw new Error('资源不存在');
      }

      return await resource.recordUsage(usageData);
    } catch (error) {
      throw new Error(`记录资源使用失败: ${error.message}`);
    }
  }

  /**
   * 记录资源维护
   * @param {String} resourceId - 资源ID
   * @param {Object} checkData - 检查数据
   * @returns {Object} 更新后的资源
   */
  async recordResourceMaintenance(resourceId, checkData) {
    try {
      const resource = await EmergencyResource.findById(resourceId);
      if (!resource) {
        throw new Error('资源不存在');
      }

      return await resource.recordMaintenance(checkData);
    } catch (error) {
      throw new Error(`记录资源维护失败: ${error.message}`);
    }
  }
}

// 创建单例实例
const mapService = new MapService();

module.exports = mapService;
