// const VillageMap = require('../models/VillageMap'); // 临时禁用 - 模型未实现
// const LocationTracking = require('../models/LocationTracking'); // 临时禁用 - 模型未实现
const User = require('../models/User');
const Village = require('../models/Village');
const logger = require('../utils/logger');
// const turf = require('@turf/turf'); // 临时禁用 - 服务依赖未实现的模型
// const geolib = require('geolib'); // 临时禁用 - 服务依赖未实现的模型

class VillageMapService {
  constructor() {
    this.defaultZoomLevels = {
      overview: 12,
      village: 14,
      street: 16,
      building: 18,
      detail: 20
    };

    this.emergencyPriorities = {
      primary: 3,
      secondary: 2,
      emergency: 1
    };
  }

  /**
   * 创建村庄地图
   * @param {Object} mapData - 地图数据
   * @returns {Object} 创建的地图
   */
  async createVillageMap(mapData) {
    try {
      const village = await Village.findById(mapData.villageId);
      if (!village) {
        throw new Error('村庄不存在');
      }

      // 计算地图边界
      if (!mapData.mapBounds) {
        mapData.mapBounds = await this.calculateVillageBounds(village);
      }

      // 创建基础图层
      if (!mapData.layers || mapData.layers.length === 0) {
        mapData.layers = this.createDefaultLayers();
      }

      // 添加基础要素
      if (!mapData.features || mapData.features.length === 0) {
        mapData.features = await this.createDefaultFeatures(village);
      }

      const villageMap = new VillageMap({
        ...mapData,
        statistics: {
          totalFeatures: mapData.features ? mapData.features.length : 0,
          lastUpdated: new Date(),
          version: 1
        }
      });

      await villageMap.save();

      return villageMap;
    } catch (error) {
      throw new Error(`创建村庄地图失败: ${error.message}`);
    }
  }

  /**
   * 获取村庄地图
   * @param {String} villageId - 村庄ID
   * @param {String} mapType - 地图类型
   * @param {Object} user - 用户信息
   * @returns {Object} 地图数据
   */
  async getVillageMap(villageId, mapType = 'base', user = null) {
    try {
      const villageMap = await VillageMap.getVillageMap(villageId, mapType);
      if (!villageMap) {
        throw new Error('地图不存在');
      }

      // 检查访问权限
      if (!this.hasMapAccess(villageMap, user)) {
        throw new Error('无权访问此地图');
      }

      // 应用访问控制
      const filteredMap = this.applyAccessControl(villageMap, user);

      // 获取实时位置数据
      if (villageMap.realTimeTracking.enabled) {
        filteredMap.realTimeLocations = await this.getRealTimeLocations(
          villageId,
          user,
          villageMap.realTimeTracking.privacySettings
        );
      }

      // 获取活跃警告
      filteredMap.activeWarnings = await this.getActiveWarnings(villageId);

      return filteredMap;
    } catch (error) {
      throw new Error(`获取村庄地图失败: ${error.message}`);
    }
  }

  /**
   * 更新用户位置
   * @param {String} userId - 用户ID
   * @param {Object} locationData - 位置数据
   * @returns {Object} 更新结果
   */
  async updateUserLocation(userId, locationData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 获取或创建位置追踪记录
      let locationTracking = await LocationTracking.getLatestLocation(userId);

      if (!locationTracking ||
          locationTracking.sessionId !== locationData.sessionId) {
        locationTracking = new LocationTracking({
          userId,
          villageId: user.villageId,
          sessionId: locationData.sessionId,
          trackingSettings: locationData.trackingSettings || {},
          privacySettings: locationData.privacySettings || {}
        });
      }

      // 更新位置
      await locationTracking.updateLocation({
        coordinates: [locationData.longitude, locationData.latitude],
        accuracy: locationData.accuracy,
        altitude: locationData.altitude,
        altitudeAccuracy: locationData.altitudeAccuracy,
        heading: locationData.heading,
        speed: locationData.speed
      });

      // 更新设备信息
      if (locationData.deviceInfo) {
        locationTracking.deviceInfo = {
          ...locationTracking.deviceInfo,
          ...locationData.deviceInfo
        };
      }

      // 更新活动状态
      if (locationData.activityStatus) {
        locationTracking.activityStatus = {
          ...locationTracking.activityStatus,
          ...locationData.activityStatus
        };
      }

      // 更新电池状态
      if (locationData.batteryStatus) {
        locationTracking.batteryStatus = {
          ...locationTracking.batteryStatus,
          ...locationData.batteryStatus
        };
      }

      // 更新网络状态
      if (locationData.networkStatus) {
        locationTracking.networkStatus = {
          ...locationTracking.networkStatus,
          ...locationData.networkStatus
        };
      }

      // 检查地理围栏
      const villageMap = await VillageMap.getVillageMap(user.villageId);
      if (villageMap && villageMap.features.length > 0) {
        const geofences = villageMap.features.filter(
          f => f.featureType === 'danger_zone'
        );

        const violations = await locationTracking.checkGeofenceViolations(geofences);
        if (violations.length > 0) {
          await this.handleGeofenceViolations(userId, violations);
        }
      }

      await locationTracking.save();

      // 广播位置更新（如果需要）
      if (locationTracking.trackingSettings.trackingMode === 'emergency') {
        await this.broadcastEmergencyLocation(locationTracking);
      }

      return {
        success: true,
        locationId: locationTracking._id,
        timestamp: locationTracking.timestamp
      };
    } catch (error) {
      throw new Error(`更新位置失败: ${error.message}`);
    }
  }

  /**
   * 添加灾害预警
   * @param {String} villageId - 村庄ID
   * @param {Object} warningData - 预警数据
   * @returns {Object} 添加结果
   */
  async addDisasterWarning(villageId, warningData) {
    try {
      const villageMap = await VillageMap.getVillageMap(villageId, 'disaster');
      if (!villageMap) {
        // 创建灾害预警地图
        villageMap = await this.createVillageMap({
          villageId,
          mapName: '灾害预警地图',
          mapType: 'disaster'
        });
      }

      // 处理预警区域
      if (warningData.centerPoint && warningData.radius) {
        warningData.affectedArea = {
          type: 'Circle',
          center: warningData.centerPoint,
          radius: warningData.radius
        };
      }

      await villageMap.addDisasterWarning(warningData);

      // 通知受影响的用户
      await this.notifyAffectedUsers(villageId, warningData);

      // 更新监测站
      if (warningData.monitoringData) {
        await this.updateMonitoringStations(villageId, warningData);
      }

      return {
        success: true,
        warningId: warningData.warningId,
        affectedUsers: await this.countAffectedUsers(villageId, warningData)
      };
    } catch (error) {
      throw new Error(`添加灾害预警失败: ${error.message}`);
    }
  }

  /**
   * 计算应急撤离路线
   * @param {String} villageId - 村庄ID
   * @param {Object} startPoint - 起始点
   * @param {Array} safeZones - 安全区列表
   * @returns {Array} 撤离路线
   */
  async calculateEvacuationRoutes(villageId, startPoint, safeZones = null) {
    try {
      const villageMap = await VillageMap.getVillageMap(villageId);
      if (!villageMap) {
        throw new Error('村庄地图不存在');
      }

      // 获取安全区
      const targetSafeZones = safeZones || villageMap.emergencyConfig.safeZones;

      // 计算到每个安全区的路线
      const routes = [];
      for (const safeZone of targetSafeZones) {
        const route = await this.calculateRouteToSafeZone(
          villageMap,
          startPoint,
          safeZone
        );
        if (route) {
          routes.push(route);
        }
      }

      // 排序和优化路线
      const optimizedRoutes = this.optimizeEvacuationRoutes(routes);

      return {
        success: true,
        routes: optimizedRoutes,
        totalCapacity: optimizedRoutes.reduce((sum, route) => sum + route.capacity, 0),
        estimatedEvacuationTime: this.calculateEvacuationTime(optimizedRoutes)
      };
    } catch (error) {
      throw new Error(`计算撤离路线失败: ${error.message}`);
    }
  }

  /**
   * 获取实时村民位置
   * @param {String} villageId - 村庄ID
   * @param {Object} user - 当前用户
   * @param {Object} privacySettings - 隐私设置
   * @returns {Array} 位置列表
   */
  async getRealTimeLocations(villageId, user = null, privacySettings = {}) {
    try {
      const options = {
        includeOffline: false,
        onlyEmergency: false,
        publicView: privacySettings.anonymizePublic !== false
      };

      let locations = await LocationTracking.getVillageLocations(villageId, options);

      // 应用隐私保护
      if (options.publicView && privacySettings.blurRadius) {
        locations = locations.map(loc => {
          const locObj = loc.toObject();
          if (loc.privacySettings.anonymizePublic) {
            locObj.privacyProtectedLocation = LocationTracking.anonymizeLocation(
              {
                latitude: loc.location.coordinates[1],
                longitude: loc.location.coordinates[0]
              },
              privacySettings.blurRadius
            );
          }
          return locObj;
        });
      }

      // 过滤可见性
      locations = locations.filter(loc => {
        // 检查用户是否在紧急状态
        if (loc.emergencyStatus.isInEmergency) {
          return true;
        }

        // 检查隐私设置
        if (user) {
          if (loc.userId.toString() === user._id.toString()) {
            return true; // 可以看到自己的位置
          }

          // 检查共享权限
          const sharedPermission = loc.privacySettings.shareLocationWith.find(
            share => share.userId.toString() === user._id.toString()
          );

          if (sharedPermission) {
            return !sharedPermission.expiresAt || sharedPermission.expiresAt > new Date();
          }
        }

        return loc.privacySettings.isVisibleToPublic;
      });

      // 按优先级排序
      locations.sort((a, b) => {
        // 紧急状态优先
        if (a.emergencyStatus.isInEmergency && !b.emergencyStatus.isInEmergency) return -1;
        if (!a.emergencyStatus.isInEmergency && b.emergencyStatus.isInEmergency) return 1;

        // 在线状态优先
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;

        return b.timestamp - a.timestamp;
      });

      return locations;
    } catch (error) {
      throw new Error(`获取实时位置失败: ${error.message}`);
    }
  }

  /**
   * 获取附近应急设施
   * @param {String} villageId - 村庄ID
   * @param {Object} point - 参考点
   * @param {Number} maxDistance - 最大距离（米）
   * @returns {Array} 设施列表
   */
  async getNearbyEmergencyFacilities(villageId, point, maxDistance = 1000) {
    try {
      return VillageMap.getNearbyEmergencyFacilities(villageId, point, maxDistance);
    } catch (error) {
      throw new Error(`获取附近应急设施失败: ${error.message}`);
    }
  }

  /**
   * 添加地图要素
   * @param {String} mapId - 地图ID
   * @param {Object} featureData - 要素数据
   * @returns {Object} 添加结果
   */
  async addMapFeature(mapId, featureData) {
    try {
      const villageMap = await VillageMap.findById(mapId);
      if (!villageMap) {
        throw new Error('地图不存在');
      }

      await villageMap.addFeature(featureData);

      return {
        success: true,
        featureId: featureData.featureId
      };
    } catch (error) {
      throw new Error(`添加地图要素失败: ${error.message}`);
    }
  }

  /**
   * 更新监测站数据
   * @param {String} villageId - 村庄ID
   * @param {Object} monitoringData - 监测数据
   * @returns {Object} 更新结果
   */
  async updateMonitoringData(villageId, monitoringData) {
    try {
      const villageMap = await VillageMap.getVillageMap(villageId);
      if (!villageMap) {
        throw new Error('地图不存在');
      }

      // 更新监测站数据
      const updates = [];
      monitoringData.forEach(data => {
        const station = villageMap.disasterWarning.monitoringStations.find(
          s => s.stationId === data.stationId
        );

        if (station) {
          station.lastData = {
            timestamp: new Date(),
            value: data.value,
            unit: data.unit
          };

          // 检查阈值
          station.thresholds.forEach(threshold => {
            if (data.value >= threshold.critical) {
              this.createThresholdWarning(villageId, station, threshold, data.value);
            }
          });

          updates.push({
            stationId: data.stationId,
            lastData: station.lastData
          });
        }
      });

      await villageMap.save();

      return {
        success: true,
        updatedStations: updates.length
      };
    } catch (error) {
      throw new Error(`更新监测数据失败: ${error.message}`);
    }
  }

  /**
   * 生成热力图数据
   * @param {String} villageId - 村庄ID
   * @param {String} dataType - 数据类型
   * @param {Object} bounds - 地图边界
   * @returns {Object} 热力图数据
   */
  async generateHeatmapData(villageId, dataType, bounds = null) {
    try {
      let data = [];

      switch (dataType) {
        case 'population':
          data = await this.generatePopulationHeatmap(villageId, bounds);
          break;
        case 'emergency':
          data = await this.generateEmergencyHeatmap(villageId, bounds);
          break;
        case 'activity':
          data = await this.generateActivityHeatmap(villageId, bounds);
          break;
        case 'disaster':
          data = await this.generateDisasterHeatmap(villageId, bounds);
          break;
        default:
          throw new Error('不支持的热力图类型');
      }

      return {
        success: true,
        dataType,
        data,
        bounds: bounds || await this.getVillageBounds(villageId)
      };
    } catch (error) {
      throw new Error(`生成热力图数据失败: ${error.message}`);
    }
  }

  // 私有方法

  async calculateVillageBounds(village) {
    // 如果村庄已有边界信息
    if (village.bounds) {
      return {
        northeast: village.bounds.northeast,
        southwest: village.bounds.southwest,
        center: village.bounds.center
      };
    }

    // 默认边界（示例）
    const defaultBounds = {
      northeast: { latitude: 30.5828, longitude: 104.0768 },
      southwest: { latitude: 30.5628, longitude: 104.0568 },
      center: { latitude: 30.5728, longitude: 104.0668 }
    };

    return defaultBounds;
  }

  createDefaultLayers() {
    return [
      {
        layerId: 'base_map',
        layerName: '基础地图',
        layerType: 'base',
        isVisible: true,
        zIndex: 0,
        source: {
          type: 'tile',
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }
      },
      {
        layerId: 'satellite',
        layerName: '卫星图层',
        layerType: 'base',
        isVisible: false,
        zIndex: 1,
        source: {
          type: 'tile',
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '© Esri',
          maxZoom: 19
        }
      },
      {
        layerId: 'buildings',
        layerName: '建筑物',
        layerType: 'overlay',
        isVisible: true,
        zIndex: 10,
        style: {
          fillColor: '#e0e0e0',
          color: '#666666',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7
        }
      },
      {
        layerId: 'realtime_locations',
        layerName: '实时位置',
        layerType: 'dynamic',
        isVisible: true,
        zIndex: 20
      },
      {
        layerId: 'emergency_warnings',
        layerName: '灾害预警',
        layerType: 'emergency',
        isVisible: true,
        zIndex: 30
      }
    ];
  }

  async createDefaultFeatures(village) {
    const features = [];

    // 添加村委会
    features.push({
      featureId: 'village_committee',
      featureType: 'building',
      geometry: {
        type: 'Point',
        coordinates: [village.location?.longitude || 104.0668, village.location?.latitude || 30.5728]
      },
      properties: {
        name: '村委会',
        type: 'administrative',
        status: 'active'
      },
      style: {
        iconUrl: '/icons/village-committee.png',
        iconSize: [32, 32]
      }
    });

    return features;
  }

  hasMapAccess(villageMap, user) {
    // 检查公开访问
    if (villageMap.accessControl.publicAccess && !villageMap.accessControl.requireAuth) {
      return true;
    }

    // 未登录用户
    if (!user) {
      return villageMap.accessControl.publicAccess;
    }

    // 检查角色权限
    const userRole = user.roles[0];
    return villageMap.accessControl.allowedRoles.includes(userRole);
  }

  applyAccessControl(villageMap, user) {
    const filteredMap = villageMap.toObject();

    // 过滤受限区域
    if (user && villageMap.accessControl.restrictedAreas.length > 0) {
      const userRole = user.roles[0];

      filteredMap.accessControl.restrictedAreas =
        villageMap.accessControl.restrictedAreas.filter(area => {
          return area.allowedRoles.includes(userRole) ||
                 area.allowedUsers.some(userId => userId.toString() === user._id.toString());
        });
    }

    return filteredMap;
  }

  async getActiveWarnings(villageId) {
    return VillageMap.getActiveWarnings(villageId);
  }

  async handleGeofenceViolations(userId, violations) {
    // 处理地理围栏违规
    logger.debug(`用户 ${userId} 触发地理围栏违规:`, violations);
    // 发送通知
    violations.forEach(violation => {
      if (violation.severity === 'high' || violation.severity === 'critical') {
        // 发送紧急通知
        this.sendEmergencyNotification(userId, violation);
      }
    });
  }

  async broadcastEmergencyLocation(locationTracking) {
    // 广播紧急位置信息
    logger.debug(`广播用户 ${locationTracking.userId} 的紧急位置`);
  }

  async notifyAffectedUsers(villageId, warningData) {
    // 通知受影响用户
    const affectedUsers = await LocationTracking.find({
      villageId,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: warningData.centerPoint
          },
          $maxDistance: warningData.radius
        }
      }
    });

    logger.debug(`通知 ${affectedUsers.length} 个用户关于预警 ${warningData.warningId}`);
  }

  async updateMonitoringStations(villageId, warningData) {
    // 更新监测站数据
    const villageMap = await VillageMap.getVillageMap(villageId);
    if (villageMap) {
      await this.updateMonitoringData(villageId, warningData.monitoringData || []);
    }
  }

  async countAffectedUsers(villageId, warningData) {
    // 统计受影响用户数
    const count = await LocationTracking.countDocuments({
      villageId,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: warningData.centerPoint
          },
          $maxDistance: warningData.radius
        }
      }
    });

    return count;
  }

  async calculateRouteToSafeZone(villageMap, startPoint, safeZone) {
    // 计算到安全区的路线
    const evacuationRoutes = villageMap.emergencyConfig.evacuationRoutes.filter(
      route => route.accessRoutes.some(routeId =>
        safeZone.accessRoutes.includes(routeId)
      )
    );

    if (evacuationRoutes.length === 0) {
      return null;
    }

    // 使用最短路径算法计算最优路线
    const bestRoute = evacuationRoutes.reduce((best, route) => {
      const routeDistance = this.calculateRouteDistance(route.path.coordinates);
      const bestDistance = best ? this.calculateRouteDistance(best.path.coordinates) : Infinity;
      return routeDistance < bestDistance ? route : best;
    }, null);

    return {
      routeId: bestRoute.routeId,
      name: `前往 ${safeZone.name} - ${bestRoute.name}`,
      path: bestRoute.path.coordinates,
      distance: this.calculateRouteDistance(bestRoute.path.coordinates),
      estimatedTime: bestRoute.estimatedTime,
      capacity: Math.min(bestRoute.capacity, safeZone.capacity),
      priority: bestRoute.priority
    };
  }

  optimizeEvacuationRoutes(routes) {
    // 优化撤离路线
    return routes.sort((a, b) => {
      // 按优先级排序
      const priorityDiff = this.emergencyPriorities[b.priority] - this.emergencyPriorities[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 按时间排序
      return a.estimatedTime - b.estimatedTime;
    });
  }

  calculateRouteDistance(coordinates) {
    return VillageMap.calculateRouteDistance(coordinates);
  }

  calculateEvacuationTime(routes) {
    // 计算整体撤离时间
    const totalCapacity = routes.reduce((sum, route) => sum + route.capacity, 0);
    const maxTime = Math.max(...routes.map(route => route.estimatedTime));

    return {
      minimum: Math.min(...routes.map(route => route.estimatedTime)),
      maximum: maxTime,
      average: routes.reduce((sum, route) => sum + route.estimatedTime, 0) / routes.length,
      totalCapacity
    };
  }

  async generatePopulationHeatmap(villageId, bounds) {
    // 生成人口热力图数据
    const locations = await LocationTracking.getVillageLocations(villageId, {
      includeOffline: true
    });

    return locations.map(loc => ({
      lat: loc.location.coordinates[1],
      lng: loc.location.coordinates[0],
      intensity: loc.emergencyStatus.isInEmergency ? 1.0 : 0.8
    }));
  }

  async generateEmergencyHeatmap(villageId, bounds) {
    // 生成紧急事件热力图
    const emergencyLocations = await LocationTracking.find({
      villageId,
      'emergencyStatus.isInEmergency': true
    });

    return emergencyLocations.map(loc => ({
      lat: loc.location.coordinates[1],
      lng: loc.location.coordinates[0],
      intensity: 1.0
    }));
  }

  async generateActivityHeatmap(villageId, bounds) {
    // 生成活动热力图
    const locations = await LocationTracking.getVillageLocations(villageId, {
      includeOffline: false
    });

    return locations.map(loc => ({
      lat: loc.location.coordinates[1],
      lng: loc.location.coordinates[0],
      intensity: loc.activityStatus.isMoving ? 0.7 : 0.3
    }));
  }

  async generateDisasterHeatmap(villageId, bounds) {
    // 生成灾害预警热力图
    const warnings = await VillageMap.getActiveWarnings(villageId);

    const heatmapData = [];
    warnings.forEach(warning => {
      if (warning.centerPoint) {
        heatmapData.push({
          lat: warning.centerPoint.coordinates[1],
          lng: warning.centerPoint.coordinates[0],
          intensity: warning.severity === 'red' ? 1.0 :
                    warning.severity === 'orange' ? 0.8 :
                    warning.severity === 'yellow' ? 0.6 : 0.4
        });
      }
    });

    return heatmapData;
  }

  async getVillageBounds(villageId) {
    const village = await Village.findById(villageId);
    return await this.calculateVillageBounds(village);
  }

  async createThresholdWarning(villageId, station, threshold, value) {
    // 创建阈值警告
    const warningData = {
      type: station.stationType,
      severity: 'yellow',
      title: `${station.name} 超过警戒值`,
      description: `${station.name} 的 ${threshold.parameter} 达到 ${value} ${threshold.unit}，超过警戒值 ${threshold.warning}`,
      centerPoint: station.location,
      affectedArea: {
        type: 'Circle',
        center: station.location,
        radius: 500
      }
    };

    await this.addDisasterWarning(villageId, warningData);
  }

  async sendEmergencyNotification(userId, violation) {
    // 发送紧急通知
    logger.debug(`发送紧急通知给用户 ${userId}:`, violation);
  }
}

module.exports = VillageMapService;