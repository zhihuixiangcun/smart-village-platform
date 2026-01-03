const express = require('express');
const router = express.Router();
const mapService = require('../services/mapService');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * 地图相关API路由
 * 基础路径: /api/map
 */

// ============ 村域地图配置 ============

/**
 * GET /api/map/village/:villageId
 * 获取村庄地图配置
 */
router.get('/village/:villageId', authenticateToken, async (req, res) => {
  try {
    const { villageId } = req.params;

    const mapConfig = await mapService.getVillageMapConfig(villageId);

    res.json({
      success: true,
      data: mapConfig
    });
  } catch (error) {
    console.error('获取地图配置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/map/village/:villageId
 * 更新村庄地图配置（需要管理员权限）
 */
router.put('/village/:villageId',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const { villageId } = req.params;
      const updates = req.body;

      const mapConfig = await mapService.updateVillageMapConfig(villageId, updates);

      res.json({
        success: true,
        data: mapConfig,
        message: '地图配置更新成功'
      });
    } catch (error) {
      console.error('更新地图配置失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/map/village/:villageId/summary
 * 获取地图数据汇总
 */
router.get('/village/:villageId/summary', authenticateToken, async (req, res) => {
  try {
    const { villageId } = req.params;

    const summary = await mapService.getMapDataSummary(villageId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('获取地图数据汇总失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============ 地点管理 ============

/**
 * GET /api/map/locations/:villageId
 * 获取村庄内所有地点
 */
router.get('/locations/:villageId', authenticateToken, async (req, res) => {
  try {
    const { villageId } = req.params;
    const { type } = req.query;

    const MapLocation = require('../models/MapLocation');
    const query = {
      villageId,
      visible: true,
      approvalStatus: 'approved'
    };

    if (type) {
      query.type = type;
    }

    const locations = await MapLocation.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .populate('associatedResidents', 'name phone')
      .populate('services', 'name');

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('获取地点列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/map/locations
 * 添加地点（需要管理员权限）
 */
router.post('/locations',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const locationData = req.body;
      locationData.createdBy = req.user.id;

      const location = await mapService.addLocation(
        locationData.villageId,
        locationData
      );

      res.json({
        success: true,
        data: location,
        message: '地点添加成功'
      });
    } catch (error) {
      console.error('添加地点失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/map/locations/:locationId
 * 更新地点信息（需要管理员权限）
 */
router.put('/locations/:locationId',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const { locationId } = req.params;
      const updates = req.body;
      updates.updatedBy = req.user.id;

      const location = await mapService.updateLocation(locationId, updates);

      res.json({
        success: true,
        data: location,
        message: '地点更新成功'
      });
    } catch (error) {
      console.error('更新地点失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/map/locations/:locationId
 * 删除地点（需要管理员权限）
 */
router.delete('/locations/:locationId',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const { locationId } = req.params;

      await mapService.deleteLocation(locationId);

      res.json({
        success: true,
        message: '地点删除成功'
      });
    } catch (error) {
      console.error('删除地点失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/map/locations/nearby
 * 搜索附近地点
 */
router.get('/locations/nearby', authenticateToken, async (req, res) => {
  try {
    const { villageId, longitude, latitude, maxDistance = 1000, limit = 10 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '缺少坐标参数'
      });
    }

    const locations = await mapService.findNearbyLocations(
      villageId,
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(maxDistance),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('搜索附近地点失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/map/locations/search
 * 搜索地点
 */
router.get('/locations/search', authenticateToken, async (req, res) => {
  try {
    const { villageId, keyword, type } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '缺少搜索关键词'
      });
    }

    const locations = await mapService.searchLocations(villageId, keyword, {
      type,
      limit: 20
    });

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('搜索地点失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============ 危险区域管理 ============

/**
 * GET /api/map/danger-zones/:villageId
 * 获取村庄内所有危险区域
 */
router.get('/danger-zones/:villageId', authenticateToken, async (req, res) => {
  try {
    const { villageId } = req.params;

    const zones = await mapService.getVillageMapConfig(villageId)
      .then(() => require('../models/DangerZone').getActiveZones(villageId));

    res.json({
      success: true,
      data: zones
    });
  } catch (error) {
    console.error('获取危险区域失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/map/danger-zones
 * 添加危险区域（需要管理员权限）
 */
router.post('/danger-zones',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const zoneData = req.body;
      zoneData.createdBy = req.user.id;

      const zone = await mapService.addDangerZone(zoneData.villageId, zoneData);

      res.json({
        success: true,
        data: zone,
        message: '危险区域添加成功'
      });
    } catch (error) {
      console.error('添加危险区域失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/map/danger-zones/:zoneId/status
 * 更新危险区域状态（需要管理员权限）
 */
router.put('/danger-zones/:zoneId/status',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const { zoneId } = req.params;
      const { status } = req.body;

      const DangerZone = require('../models/DangerZone');
      const zone = await DangerZone.findById(zoneId);

      if (!zone) {
        return res.status(404).json({
          success: false,
          message: '危险区域不存在'
        });
      }

      await zone.updateStatus(status, req.user.id);

      res.json({
        success: true,
        data: zone,
        message: '状态更新成功'
      });
    } catch (error) {
      console.error('更新危险区域状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/map/danger-zones/check
 * 检查位置是否在危险区域
 */
router.get('/danger-zones/check', authenticateToken, async (req, res) => {
  try {
    const { villageId, longitude, latitude } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '缺少坐标参数'
      });
    }

    const dangerZones = await mapService.checkLocationInDangerZone(
      villageId,
      parseFloat(longitude),
      parseFloat(latitude)
    );

    res.json({
      success: true,
      data: dangerZones,
      inDangerZone: dangerZones.length > 0
    });
  } catch (error) {
    console.error('检查危险区域失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============ 应急资源管理 ============

/**
 * GET /api-map/resources/:villageId
 * 获取村庄内所有应急资源
 */
router.get('/resources/:villageId', authenticateToken, async (req, res) => {
  try {
    const { villageId } = req.params;
    const { type, status } = req.query;

    const EmergencyResource = require('../models/EmergencyResource');
    const query = { villageId, visible: true };

    if (type) query.resourceType = type;
    if (status) query.status = status;

    const resources = await EmergencyResource.find(query)
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('获取应急资源失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/map/resources
 * 添加应急资源（需要管理员权限）
 */
router.post('/resources',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const resourceData = req.body;
      resourceData.createdBy = req.user.id;

      const resource = await mapService.addEmergencyResource(
        resourceData.villageId,
        resourceData
      );

      res.json({
        success: true,
        data: resource,
        message: '应急资源添加成功'
      });
    } catch (error) {
      console.error('添加应急资源失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/map/resources/:resourceId/status
 * 更新资源状态
 */
router.put('/resources/:resourceId/status',
  authenticateToken,
  async (req, res) => {
    try {
      const { resourceId } = req.params;
      const { status, remarks } = req.body;

      const EmergencyResource = require('../models/EmergencyResource');
      const resource = await EmergencyResource.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: '资源不存在'
        });
      }

      await resource.updateStatus(status, req.user.id, remarks);

      res.json({
        success: true,
        data: resource,
        message: '资源状态更新成功'
      });
    } catch (error) {
      console.error('更新资源状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/map/resources/:resourceId/usage
 * 记录资源使用
 */
router.post('/resources/:resourceId/usage',
  authenticateToken,
  async (req, res) => {
    try {
      const { resourceId } = req.params;
      const usageData = req.body;
      usageData.userId = req.user.id;
      usageData.userName = req.user.name;

      const resource = await mapService.recordResourceUsage(resourceId, usageData);

      res.json({
        success: true,
        data: resource,
        message: '资源使用记录成功'
      });
    } catch (error) {
      console.error('记录资源使用失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/map/resources/:resourceId/maintenance
 * 记录资源维护（需要管理员权限）
 */
router.post('/resources/:resourceId/maintenance',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const { resourceId } = req.params;
      const checkData = req.body;
      checkData.checker = req.user.id;
      checkData.checkerName = req.user.name;

      const resource = await mapService.recordResourceMaintenance(resourceId, checkData);

      res.json({
        success: true,
        data: resource,
        message: '资源维护记录成功'
      });
    } catch (error) {
      console.error('记录资源维护失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/map/resources/nearby
 * 搜索附近应急资源
 */
router.get('/resources/nearby', authenticateToken, async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 500 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '缺少坐标参数'
      });
    }

    const resources = await mapService.findNearbyResources(
      null,
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(maxDistance)
    );

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('搜索附近资源失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/map/resources/maintenance/:villageId
 * 获取需要维护的资源
 */
router.get('/resources/maintenance/:villageId',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const { villageId } = req.params;

      const resources = await mapService.getResourcesNeedingMaintenance(villageId);

      res.json({
        success: true,
        data: resources
      });
    } catch (error) {
      console.error('获取维护资源失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/map/resources/expiring/:villageId
 * 获取即将过期的资源
 */
router.get('/resources/expiring/:villageId',
  authenticateToken,
  authorizeRoles('admin', 'village_admin'),
  async (req, res) => {
    try {
      const { villageId } = req.params;
      const { days = 30 } = req.query;

      const resources = await mapService.getExpiringResources(
        villageId,
        parseInt(days)
      );

      res.json({
        success: true,
        data: resources
      });
    } catch (error) {
      console.error('获取过期资源失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// ============ 村民位置管理 ============

/**
 * POST /api/map/residents/location
 * 更新村民位置
 */
router.post('/residents/location', authenticateToken, async (req, res) => {
  try {
    const { longitude, latitude, status, source, accuracy, deviceInfo, batteryLevel, isCharging } = req.body;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '缺少坐标参数'
      });
    }

    const location = await mapService.updateResidentLocation(
      req.user.id,
      longitude,
      latitude,
      {
        status,
        source,
        accuracy,
        deviceInfo,
        batteryLevel,
        isCharging
      }
    );

    res.json({
      success: true,
      data: location,
      message: '位置更新成功'
    });
  } catch (error) {
    console.error('更新位置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/map/residents/:villageId
 * 获取村庄内村民位置（公开）
 */
router.get('/residents/:villageId', authenticateToken, async (req, res) => {
  try {
    const { villageId } = req.params;

    const locations = await mapService.getResidentLocations(villageId, req.user);

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    console.error('获取村民位置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/map/residents/nearby
 * 搜索附近村民（用于应急响应）
 */
router.get('/residents/nearby',
  authenticateToken,
  authorizeRoles('admin', 'village_admin', 'emergency_responder'),
  async (req, res) => {
    try {
      const { villageId, longitude, latitude, radius = 500 } = req.query;

      if (!longitude || !latitude) {
        return res.status(400).json({
          success: false,
          message: '缺少坐标参数'
        });
      }

      const residents = await mapService.findNearbyResidents(
        villageId,
        parseFloat(longitude),
        parseFloat(latitude),
        parseInt(radius)
      );

      res.json({
        success: true,
        data: residents
      });
    } catch (error) {
      console.error('搜索附近村民失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * PUT /api-map/residents/privacy
 * 更新位置隐私设置
 */
router.put('/residents/privacy', authenticateToken, async (req, res) => {
  try {
    const ResidentLocation = require('../models/ResidentLocation');
    const location = await ResidentLocation.findOne({ userId: req.user.id });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: '位置记录不存在'
      });
    }

    await location.updatePrivacySettings(req.body);

    res.json({
      success: true,
      data: location,
      message: '隐私设置更新成功'
    });
  } catch (error) {
    console.error('更新隐私设置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============ 工具函数 ============

/**
 * POST /api/map/calculate-distance
 * 计算两点间距离
 */
router.post('/calculate-distance', authenticateToken, async (req, res) => {
  try {
    const { point1, point2 } = req.body;

    if (!point1 || !point2 || !point1.longitude || !point1.latitude ||
        !point2.longitude || !point2.latitude) {
      return res.status(400).json({
        success: false,
        message: '缺少坐标参数'
      });
    }

    const distance = mapService.calculateDistance(
      point1.longitude,
      point1.latitude,
      point2.longitude,
      point2.latitude
    );

    res.json({
      success: true,
      data: {
        distance, // 米
        distanceInKm: distance / 1000 // 千米
      }
    });
  } catch (error) {
    console.error('计算距离失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/map/calculate-area
 * 计算多边形面积
 */
router.post('/calculate-area', authenticateToken, async (req, res) => {
  try {
    const { coordinates } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({
        success: false,
        message: '无效的坐标数据'
      });
    }

    const area = mapService.calculatePolygonArea(coordinates);

    res.json({
      success: true,
      data: {
        area, // 平方米
        areaInSqKm: area / 1000000, // 平方千米
        areaInMu: area * 0.0015 // 亩
      }
    });
  } catch (error) {
    console.error('计算面积失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
