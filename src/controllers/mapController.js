/**
 * 地图服务控制器
 * 处理地图相关功能的请求
 */

const mapService = require('../services/mapService');

/**
 * 地址解析（地址转坐标）
 */
exports.geocodeAddress = async (req, res) => {
  try {
    const { address, city } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: '地址不能为空'
      });
    }

    const { provider = 'gaode' } = req.query;
    let result;

    if (provider === 'baidu') {
      result = await mapService.baiduGeocode(address, city);
    } else {
      result = await mapService.geocodeAddress(address, city);
    }

    res.json({
      success: true,
      data: result,
      message: '地址解析成功'
    });

  } catch (error) {
    logger.error('地址解析失败:', error);
    res.status(500).json({
      success: false,
      message: '地址解析失败',
      error: error.message
    });
  }
};

/**
 * 逆地址解析（坐标转地址）
 */
exports.reverseGeocode = async (req, res) => {
  try {
    const { longitude, latitude } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '经纬度不能为空'
      });
    }

    const result = await mapService.reverseGeocode(
      parseFloat(longitude),
      parseFloat(latitude)
    );

    res.json({
      success: true,
      data: result,
      message: '逆地址解析成功'
    });

  } catch (error) {
    logger.error('逆地址解析失败:', error);
    res.status(500).json({
      success: false,
      message: '逆地址解析失败',
      error: error.message
    });
  }
};

/**
 * POI搜索
 */
exports.searchPoi = async (req, res) => {
  try {
    const {
      keyword,
      city = '全国',
      type,
      page = 1,
      pageSize = 20
    } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }

    const result = await mapService.searchPoi(
      keyword,
      city,
      type,
      parseInt(page),
      parseInt(pageSize)
    );

    res.json({
      success: true,
      data: result,
      message: 'POI搜索成功'
    });

  } catch (error) {
    logger.error('POI搜索失败:', error);
    res.status(500).json({
      success: false,
      message: 'POI搜索失败',
      error: error.message
    });
  }
};

/**
 * 路线规划
 */
exports.planRoute = async (req, res) => {
  try {
    const {
      origin,
      destination,
      waypoints,
      type = 'driving',
      strategy = 0
    } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: '起点和终点不能为空'
      });
    }

    let result;

    switch (type) {
    case 'driving':
      result = await mapService.planDrivingRoute(origin, destination, waypoints, strategy);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: '不支持的路线规划类型'
      });
    }

    res.json({
      success: true,
      data: result,
      message: '路线规划成功'
    });

  } catch (error) {
    logger.error('路线规划失败:', error);
    res.status(500).json({
      success: false,
      message: '路线规划失败',
      error: error.message
    });
  }
};

/**
 * 距离计算
 */
exports.calculateDistance = async (req, res) => {
  try {
    const {
      origins,
      destination,
      type = '1'
    } = req.body;

    if (!origins || !destination) {
      return res.status(400).json({
        success: false,
        message: '起点和终点不能为空'
      });
    }

    const result = await mapService.calculateDistance(origins, destination, type);

    res.json({
      success: true,
      data: result,
      message: '距离计算成功'
    });

  } catch (error) {
    logger.error('距离计算失败:', error);
    res.status(500).json({
      success: false,
      message: '距离计算失败',
      error: error.message
    });
  }
};

/**
 * 天气查询
 */
exports.getWeather = async (req, res) => {
  try {
    const { city, extensions = 'all' } = req.query;

    if (!city) {
      return res.status(400).json({
        success: false,
        message: '城市不能为空'
      });
    }

    const result = await mapService.getWeather(city, extensions);

    res.json({
      success: true,
      data: result,
      message: '天气查询成功'
    });

  } catch (error) {
    logger.error('天气查询失败:', error);
    res.status(500).json({
      success: false,
      message: '天气查询失败',
      error: error.message
    });
  }
};

/**
 * IP定位
 */
exports.locateByIP = async (req, res) => {
  try {
    const { ip } = req.query;
    const clientIP = ip || req.ip || req.connection.remoteAddress;

    const result = await mapService.locateByIP(clientIP);

    res.json({
      success: true,
      data: result,
      message: 'IP定位成功'
    });

  } catch (error) {
    logger.error('IP定位失败:', error);
    res.status(500).json({
      success: false,
      message: 'IP定位失败',
      error: error.message
    });
  }
};

/**
 * 获取行政区边界
 */
exports.getDistrictBoundary = async (req, res) => {
  try {
    const { adcode, subdistrict = 1 } = req.query;

    if (!adcode) {
      return res.status(400).json({
        success: false,
        message: '行政区编码不能为空'
      });
    }

    const result = await mapService.getDistrictBoundary(
      adcode,
      parseInt(subdistrict)
    );

    res.json({
      success: true,
      data: result,
      message: '行政区边界获取成功'
    });

  } catch (error) {
    logger.error('行政区边界获取失败:', error);
    res.status(500).json({
      success: false,
      message: '行政区边界获取失败',
      error: error.message
    });
  }
};

/**
 * 获取村庄地图信息
 */
exports.getVillageMapInfo = async (req, res) => {
  try {
    const { villageId } = req.params;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: '村庄ID不能为空'
      });
    }

    const result = await mapService.getVillageMapInfo(villageId);

    res.json({
      success: true,
      data: result,
      message: '村庄地图信息获取成功'
    });

  } catch (error) {
    logger.error('获取村庄地图信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取村庄地图信息失败',
      error: error.message
    });
  }
};

/**
 * 获取村庄服务设施分布
 */
exports.getVillageServiceFacilities = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { facilityTypes } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: '村庄ID不能为空'
      });
    }

    const types = facilityTypes ? facilityTypes.split(',') : [];
    const result = await mapService.getVillageServiceFacilities(villageId, types);

    res.json({
      success: true,
      data: result,
      message: '村庄服务设施获取成功'
    });

  } catch (error) {
    logger.error('获取村庄服务设施失败:', error);
    res.status(500).json({
      success: false,
      message: '获取村庄服务设施失败',
      error: error.message
    });
  }
};

/**
 * 批量地址解析
 */
exports.batchGeocode = async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({
        success: false,
        message: '地址列表不能为空且必须是数组'
      });
    }

    if (addresses.length > 100) {
      return res.status(400).json({
        success: false,
        message: '批量地址解析最多支持100个地址'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < addresses.length; i++) {
      const addressItem = addresses[i];
      const address = typeof addressItem === 'string' ? addressItem : addressItem.address;
      const city = typeof addressItem === 'object' ? addressItem.city : null;

      try {
        const result = await mapService.geocodeAddress(address, city);
        results.push({
          index: i,
          address,
          success: true,
          data: result
        });
      } catch (error) {
        errors.push({
          index: i,
          address,
          error: error.message
        });
      }

      // 避免请求过于频繁
      if (i < addresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    res.json({
      success: true,
      data: {
        total: addresses.length,
        success: results.length,
        failed: errors.length,
        results,
        errors
      },
      message: '批量地址解析完成'
    });

  } catch (error) {
    logger.error('批量地址解析失败:', error);
    res.status(500).json({
      success: false,
      message: '批量地址解析失败',
      error: error.message
    });
  }
};

/**
 * 地图缓存管理
 */
exports.clearCache = async (req, res) => {
  try {
    mapService.clearCache();

    res.json({
      success: true,
      message: '地图缓存清理成功'
    });

  } catch (error) {
    logger.error('清理地图缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清理地图缓存失败',
      error: error.message
    });
  }
};

/**
 * 获取服务状态
 */
exports.getServiceStatus = async (req, res) => {
  try {
    const status = {
      gaode: {
        configured: !!process.env.GAODE_API_KEY,
        apiKey: process.env.GAODE_API_KEY ? '已配置' : '未配置'
      },
      baidu: {
        configured: !!(process.env.BAIDU_MAP_AK && process.env.BAIDU_MAP_SK),
        apiKey: process.env.BAIDU_MAP_AK ? '已配置' : '未配置'
      },
      cache: {
        size: mapService.cache.size,
        timeout: mapService.cacheTimeout
      },
      features: {
        geocode: true,
        reverseGeocode: true,
        poiSearch: true,
        routePlanning: true,
        distanceCalculation: true,
        weather: true,
        ipLocation: true,
        districtBoundary: true
      }
    };

    res.json({
      success: true,
      data: status,
      message: '地图服务状态获取成功'
    });

  } catch (error) {
    logger.error('获取地图服务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取地图服务状态失败',
      error: error.message
    });
  }
};

/**
 * 村民位置服务 - 获取村民当前位置
 */
exports.getResidentLocation = async (req, res) => {
  try {
    const { residentId } = req.params;
    const Resident = require('../models/Resident');

    const resident = await Resident.findById(residentId);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: '村民不存在'
      });
    }

    const locationData = {
      residentId: resident._id,
      name: resident.name,
      address: resident.address
    };

    // 如果村民有位置信息
    if (resident.location && resident.location.coordinates) {
      const [longitude, latitude] = resident.location.coordinates;

      try {
        const reverseGeocode = await mapService.reverseGeocode(longitude, latitude);
        locationData.location = {
          coordinates: [longitude, latitude],
          formatted_address: reverseGeocode.address,
          addressComponent: reverseGeocode.addressComponent,
          lastUpdate: resident.locationUpdatedAt || new Date()
        };
      } catch (error) {
        logger.warn('逆地址解析失败:', error.message);
        locationData.location = {
          coordinates: [longitude, latitude],
          lastUpdate: resident.locationUpdatedAt || new Date()
        };
      }
    }

    // 获取村庄地图信息作为参考
    if (resident.villageId) {
      try {
        const villageMapInfo = await mapService.getVillageMapInfo(resident.villageId);
        if (villageMapInfo.location) {
          locationData.villageLocation = villageMapInfo.location;

          // 计算与村庄中心的距离
          if (locationData.location && locationData.location.coordinates) {
            const distance = mapService.calculateDistanceBetweenPoints(
              locationData.location.coordinates,
              villageMapInfo.location.coordinates
            );
            locationData.distanceToVillage = Math.round(distance); // 米
          }
        }
      } catch (error) {
        logger.warn('获取村庄地图信息失败:', error.message);
      }
    }

    res.json({
      success: true,
      data: locationData,
      message: '村民位置信息获取成功'
    });

  } catch (error) {
    logger.error('获取村民位置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取村民位置失败',
      error: error.message
    });
  }
};

/**
 * 更新村民位置
 */
exports.updateResidentLocation = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { longitude, latitude, address } = req.body;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '经纬度不能为空'
      });
    }

    const Resident = require('../models/Resident');
const logger = require('../utils/logger');
    const resident = await Resident.findById(residentId);

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: '村民不存在'
      });
    }

    // 更新位置信息
    const locationUpdate = {
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      locationUpdatedAt: new Date()
    };

    if (address) {
      locationUpdate.address = address;
    } else {
      // 如果没有提供地址，尝试通过逆地址解析获取
      try {
        const reverseGeocode = await mapService.reverseGeocode(
          parseFloat(longitude),
          parseFloat(latitude)
        );
        locationUpdate.address = reverseGeocode.address;
      } catch (error) {
        logger.warn('逆地址解析失败，使用原始地址:', error.message);
      }
    }

    await Resident.findByIdAndUpdate(residentId, locationUpdate);

    res.json({
      success: true,
      message: '村民位置更新成功',
      data: {
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: locationUpdate.address,
        updatedAt: locationUpdate.locationUpdatedAt
      }
    });

  } catch (error) {
    logger.error('更新村民位置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新村民位置失败',
      error: error.message
    });
  }
};