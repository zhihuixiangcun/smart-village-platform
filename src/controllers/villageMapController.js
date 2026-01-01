const VillageMapService = require('../services/villageMapService');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const logger = require('../utils/logger');

class VillageMapController {
  constructor() {
    this.mapService = new VillageMapService();

    // 配置文件上传
    this.upload = multer({
      dest: path.join(__dirname, '../uploads/maps'),
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif',
          'application/json', 'text/plain',
          'application/vnd.geo+json', 'application/zip'
        ];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.json', '.txt', '.geojson', '.zip'];

        const ext = path.extname(file.originalname).toLowerCase();
        const isValidType = allowedTypes.includes(file.mimetype);
        const isValidExt = allowedExtensions.includes(ext);

        if (isValidType && isValidExt) {
          return cb(null, true);
        } else {
          cb(new Error('只允许上传图片、JSON、GeoJSON和ZIP文件'));
        }
      }
    });
  }

  /**
   * 创建村庄地图
   */
  createVillageMap = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const mapData = {
        ...req.body,
        villageId: req.user.villageId,
        createdBy: req.user._id
      };

      const villageMap = await this.mapService.createVillageMap(mapData);

      res.status(201).json({
        success: true,
        message: '村庄地图创建成功',
        data: villageMap
      });
    } catch (error) {
      logger.error('创建村庄地图失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建村庄地图失败'
      });
    }
  };

  /**
   * 获取村庄地图
   */
  getVillageMap = async (req, res) => {
    try {
      const { mapType = 'base' } = req.query;
      const { villageId } = req.params;

      // 如果未提供villageId，使用用户的村庄ID
      const targetVillageId = villageId || req.user.villageId;

      const villageMap = await this.mapService.getVillageMap(
        targetVillageId,
        mapType,
        req.user
      );

      res.json({
        success: true,
        data: villageMap
      });
    } catch (error) {
      logger.error('获取村庄地图失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取村庄地图失败'
      });
    }
  };

  /**
   * 更新用户位置
   */
  updateLocation = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const locationData = {
        ...req.body,
        userId: req.user._id
      };

      const result = await this.mapService.updateUserLocation(
        req.user._id,
        locationData
      );

      // 通过WebSocket广播位置更新
      req.app.get('io').to(`village_${req.user.villageId}`).emit('location_update', {
        userId: req.user._id,
        location: locationData,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: '位置更新成功',
        data: result
      });
    } catch (error) {
      logger.error('更新位置失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新位置失败'
      });
    }
  };

  /**
   * 获取实时位置
   */
  getRealTimeLocations = async (req, res) => {
    try {
      const { villageId } = req.params;
      const { includeOffline = 'false', onlyEmergency = 'false' } = req.query;

      const locations = await this.mapService.getRealTimeLocations(
        villageId || req.user.villageId,
        req.user,
        {
          anonymizePublic: true,
          blurRadius: 50
        }
      );

      // 应用查询过滤
      let filteredLocations = locations;
      if (includeOffline === 'false') {
        filteredLocations = filteredLocations.filter(loc => loc.isOnline);
      }
      if (onlyEmergency === 'true') {
        filteredLocations = filteredLocations.filter(loc => loc.emergencyStatus.isInEmergency);
      }

      res.json({
        success: true,
        data: {
          locations: filteredLocations,
          total: locations.length,
          filtered: filteredLocations.length
        }
      });
    } catch (error) {
      logger.error('获取实时位置失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取实时位置失败'
      });
    }
  };

  /**
   * 添加灾害预警
   */
  addDisasterWarning = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { villageId } = req.params;
      const warningData = {
        ...req.body,
        updatedBy: req.user._id
      };

      const result = await this.mapService.addDisasterWarning(
        villageId || req.user.villageId,
        warningData
      );

      // 通过WebSocket广播预警
      req.app.get('io').to(`village_${villageId || req.user.villageId}`).emit('disaster_warning', {
        ...warningData,
        issuedBy: req.user.name,
        timestamp: new Date()
      });

      // 发送推送通知
      // await this.notificationService.sendDisasterWarning(villageId, warningData);

      res.json({
        success: true,
        message: '灾害预警添加成功',
        data: result
      });
    } catch (error) {
      logger.error('添加灾害预警失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '添加灾害预警失败'
      });
    }
  };

  /**
   * 计算应急撤离路线
   */
  calculateEvacuationRoutes = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { villageId } = req.params;
      const { startPoint, safeZones } = req.body;

      if (!startPoint || !startPoint.latitude || !startPoint.longitude) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的起始点坐标'
        });
      }

      const result = await this.mapService.calculateEvacuationRoutes(
        villageId || req.user.villageId,
        startPoint,
        safeZones
      );

      res.json({
        success: true,
        message: '撤离路线计算成功',
        data: result
      });
    } catch (error) {
      logger.error('计算撤离路线失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '计算撤离路线失败'
      });
    }
  };

  /**
   * 获取附近应急设施
   */
  getNearbyEmergencyFacilities = async (req, res) => {
    try {
      const { villageId } = req.params;
      const { latitude, longitude, maxDistance = 1000 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: '请提供经纬度坐标'
        });
      }

      const point = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      const facilities = await this.mapService.getNearbyEmergencyFacilities(
        villageId || req.user.villageId,
        point,
        parseInt(maxDistance)
      );

      res.json({
        success: true,
        data: {
          facilities,
          center: point,
          radius: parseInt(maxDistance)
        }
      });
    } catch (error) {
      logger.error('获取附近应急设施失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取附近应急设施失败'
      });
    }
  };

  /**
   * 生成热力图数据
   */
  generateHeatmapData = async (req, res) => {
    try {
      const { villageId } = req.params;
      const { dataType, bounds } = req.query;

      if (!dataType) {
        return res.status(400).json({
          success: false,
          message: '请提供热力图数据类型'
        });
      }

      let boundsData = null;
      if (bounds) {
        try {
          boundsData = JSON.parse(bounds);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: '边界数据格式错误'
          });
        }
      }

      const result = await this.mapService.generateHeatmapData(
        villageId || req.user.villageId,
        dataType,
        boundsData
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('生成热力图数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '生成热力图数据失败'
      });
    }
  };

  /**
   * 添加地图要素
   */
  addMapFeature = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        });
      }

      const { mapId } = req.params;
      const featureData = {
        ...req.body,
        metadata: {
          ...req.body.metadata,
          createdBy: req.user._id,
          createdAt: new Date()
        }
      };

      const result = await this.mapService.addMapFeature(mapId, featureData);

      // 广播要素更新
      req.app.get('io').to(`map_${mapId}`).emit('feature_added', {
        mapId,
        feature: featureData,
        addedBy: req.user.name,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: '地图要素添加成功',
        data: result
      });
    } catch (error) {
      logger.error('添加地图要素失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '添加地图要素失败'
      });
    }
  };

  /**
   * 上传地图数据
   */
  uploadMapData = async (req, res) => {
    try {
      const { villageId } = req.params;
      const { dataType } = req.body; // 'geojson', 'features', 'layers'

      this.upload.array('files')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        try {
          if (!req.files || req.files.length === 0) {
            return res.status(400).json({
              success: false,
              message: '请选择要上传的文件'
            });
          }

          const uploadedFiles = [];
          const processedFeatures = [];

          for (const file of req.files) {
            const fileInfo = {
              originalName: file.originalname,
              filename: file.filename,
              path: file.path,
              size: file.size,
              mimetype: file.mimetype
            };

            // 处理不同类型的文件
            if (file.mimetype === 'application/json' || file.mimetype === 'application/vnd.geo+json') {
              // 处理 GeoJSON 文件
              try {
                const geojsonContent = fs.readFileSync(file.path, 'utf8');
                const geojson = JSON.parse(geojsonContent);

                if (geojson.type === 'FeatureCollection') {
                  geojson.features.forEach(feature => {
                    processedFeatures.push({
                      featureId: this.generateFeatureId(),
                      featureType: this.inferFeatureType(feature),
                      geometry: feature.geometry,
                      properties: {
                        ...feature.properties,
                        source: file.originalname,
                        uploadedBy: req.user._id
                      }
                    });
                  });
                }
              } catch (parseError) {
                logger.error(`解析文件失败: ${file.originalname}`, parseError);
              }
            } else if (file.mimetype === 'application/zip') {
              // 处理 ZIP 文件（可能包含多个文件）
              const extractedPath = path.join(__dirname, '../uploads/maps', `extracted_${  Date.now()}`);
              fs.mkdirSync(extractedPath, { recursive: true });

              // 这里应该解压ZIP文件并处理内容
              // 简化实现
            }

            uploadedFiles.push(fileInfo);
          }

          // 如果有处理过的要素，添加到地图
          if (processedFeatures.length > 0) {
            const villageMap = await this.mapService.getVillageMap(
              villageId || req.user.villageId
            );

            for (const feature of processedFeatures) {
              await this.mapService.addMapFeature(villageMap._id, feature);
            }
          }

          res.json({
            success: true,
            message: '文件上传成功',
            data: {
              uploadedFiles,
              processedFeatures: processedFeatures.length,
              totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0)
            }
          });
        } catch (uploadError) {
          logger.error('文件上传处理失败:', uploadError);
          res.status(500).json({
            success: false,
            message: uploadError.message || '文件上传处理失败'
          });
        }
      });
    } catch (error) {
      logger.error('上传地图数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '上传地图数据失败'
      });
    }
  };

  /**
   * 获取用户轨迹
   */
  getUserTrajectory = async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate, format = 'json' } = req.query;

      // 检查权限（只能查看自己的轨迹或有权限的用户轨迹）
      if (userId !== req.user._id.toString() && !this.hasLocationViewPermission(req.user, userId)) {
        return res.status(403).json({
          success: false,
          message: '无权查看该用户的轨迹'
        });
      }

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const trajectory = await this.mapService.constructor.LocationTracking.getUserTrajectory(
        userId,
        start,
        end
      );

      if (format === 'geojson') {
        const geojson = {
          type: 'FeatureCollection',
          features: trajectory.map(point => ({
            type: 'Feature',
            geometry: point.location,
            properties: {
              timestamp: point.timestamp,
              userId: point.userId,
              accuracy: point.location.accuracy,
              speed: point.location.speed
            }
          }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.send(geojson);
      } else if (format === 'csv') {
        const csv = this.convertTrajectoryToCSV(trajectory);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=trajectory_${userId}.csv`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: {
            trajectory,
            summary: this.calculateTrajectorySummary(trajectory)
          }
        });
      }
    } catch (error) {
      logger.error('获取用户轨迹失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取用户轨迹失败'
      });
    }
  };

  /**
   * 分析活动模式
   */
  analyzeActivityPattern = async (req, res) => {
    try {
      const { userId } = req.params;
      const { days = 7 } = req.query;

      // 检查权限
      if (userId !== req.user._id.toString() && !this.hasLocationViewPermission(req.user, userId)) {
        return res.status(403).json({
          success: false,
          message: '无权分析该用户的活动模式'
        });
      }

      const pattern = await this.mapService.constructor.LocationTracking.analyzeActivityPattern(
        userId,
        parseInt(days)
      );

      res.json({
        success: true,
        data: {
          pattern,
          period: {
            days: parseInt(days),
            startDate: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
            endDate: new Date()
          }
        }
      });
    } catch (error) {
      logger.error('分析活动模式失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '分析活动模式失败'
      });
    }
  };

  /**
   * 更新监测站数据
   */
  updateMonitoringData = async (req, res) => {
    try {
      const { villageId } = req.params;
      const { monitoringData } = req.body;

      if (!Array.isArray(monitoringData)) {
        return res.status(400).json({
          success: false,
          message: '监测数据必须是数组格式'
        });
      }

      const result = await this.mapService.updateMonitoringData(
        villageId || req.user.villageId,
        monitoringData
      );

      // 广播监测数据更新
      req.app.get('io').to(`monitoring_${villageId}`).emit('monitoring_update', {
        villageId,
        data: monitoringData,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: '监测数据更新成功',
        data: result
      });
    } catch (error) {
      logger.error('更新监测数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新监测数据失败'
      });
    }
  };

  /**
   * 导出地图数据
   */
  exportMapData = async (req, res) => {
    try {
      const { villageId } = req.params;
      const { format = 'json', includeLayers = 'true', includeFeatures = 'true' } = req.query;

      const villageMap = await this.mapService.getVillageMap(
        villageId || req.user.villageId
      );

      if (format === 'geojson') {
        const geojson = {
          type: 'FeatureCollection',
          features: includeFeatures === 'true' ? villageMap.features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
          })) : []
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=map_${villageId}.geojson`);
        res.send(geojson);
      } else if (format === 'zip') {
        // 创建 ZIP 文件包含所有地图数据
        const archive = archiver('zip');
        res.attachment(`map_${villageId}.zip`);

        archive.pipe(res);

        // 添加 GeoJSON 文件
        if (includeFeatures === 'true') {
          const geojson = JSON.stringify({
            type: 'FeatureCollection',
            features: villageMap.features
          }, null, 2);

          archive.append(geojson, { name: 'features.geojson' });
        }

        // 添加图层数据
        if (includeLayers === 'true') {
          const layersJson = JSON.stringify(villageMap.layers, null, 2);
          archive.append(layersJson, { name: 'layers.json' });
        }

        // 添加地图配置
        const configJson = JSON.stringify({
          mapBounds: villageMap.mapBounds,
          emergencyConfig: villageMap.emergencyConfig,
          statistics: villageMap.statistics
        }, null, 2);

        archive.append(configJson, { name: 'config.json' });
        archive.finalize();
      } else {
        res.json({
          success: true,
          data: villageMap
        });
      }
    } catch (error) {
      logger.error('导出地图数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '导出地图数据失败'
      });
    }
  };

  // 辅助方法

  generateFeatureId() {
    return `feat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  inferFeatureType(feature) {
    // 根据要素属性推断类型
    const properties = feature.properties || {};

    if (properties.building || properties.amenity) {
      return 'building';
    }
    if (properties.highway) {
      return 'road';
    }
    if (properties.water || properties.natural === 'water') {
      return 'water';
    }
    if (properties.leisure === 'park' || properties.natural === 'forest') {
      return 'vegetation';
    }
    if (properties.emergency || properties.facility) {
      return 'facility';
    }

    return 'building'; // 默认类型
  }

  hasLocationViewPermission(user, targetUserId) {
    // 检查用户是否有权限查看目标用户的位置
    // 简化实现：管理员和村委成员可以查看所有村民位置
    const userRoles = user.roles || [];
    return ['admin', 'staff'].some(role => userRoles.includes(role));
  }

  convertTrajectoryToCSV(trajectory) {
    if (trajectory.length === 0) return '';

    const headers = ['timestamp', 'latitude', 'longitude', 'accuracy', 'altitude', 'speed'];
    const rows = trajectory.map(point => [
      point.timestamp.toISOString(),
      point.location.coordinates[1],
      point.location.coordinates[0],
      point.location.accuracy || '',
      point.location.altitude || '',
      point.location.speed || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  calculateTrajectorySummary(trajectory) {
    if (trajectory.length === 0) {
      return {
        totalPoints: 0,
        duration: 0,
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0
      };
    }

    const startTime = trajectory[0].timestamp;
    const endTime = trajectory[trajectory.length - 1].timestamp;
    const duration = endTime - startTime;

    let totalDistance = 0;
    let maxSpeed = 0;

    for (let i = 1; i < trajectory.length; i++) {
      const prev = trajectory[i - 1];
      const curr = trajectory[i];

      // 计算距离
      const distance = this.calculateDistance(
        prev.location.coordinates,
        curr.location.coordinates
      );
      totalDistance += distance;

      // 记录最大速度
      if (curr.location.speed && curr.location.speed > maxSpeed) {
        maxSpeed = curr.location.speed;
      }
    }

    const averageSpeed = duration > 0 ? (totalDistance / duration) * 1000 : 0; // m/s

    return {
      totalPoints: trajectory.length,
      duration: Math.floor(duration / 1000), // 秒
      totalDistance: Math.round(totalDistance), // 米
      averageSpeed: Math.round(averageSpeed * 100) / 100, // m/s
      maxSpeed: Math.round(maxSpeed * 100) / 100 // m/s
    };
  }

  calculateDistance(coord1, coord2) {
    const R = 6371000; // 地球半径（米）
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

module.exports = VillageMapController;