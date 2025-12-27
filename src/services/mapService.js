/**
 * 地图服务
 * 集成高德地图、百度地图等第三方地图服务
 */

const axios = require('axios');
const crypto = require('crypto');

class MapService {
  constructor() {
    this.config = {
      gaode: {
        key: process.env.GAODE_API_KEY,
        webKey: process.env.GAODE_WEB_KEY,
        apiBaseUrl: 'https://restapi.amap.com',
        webApiUrl: 'https://webapi.amap.com',
        geocodeUrl: '/v3/geocode/geo',
        regeocodeUrl: '/v3/geocode/regeocode',
        weatherUrl: '/v3/weather/weatherInfo',
        poiSearchUrl: '/v5/place/text',
        poiDetailUrl: '/v5/place/detail',
        drivingUrl: '/v5/direction/driving',
        walkingUrl: '/v5/direction/walking',
        cyclingUrl: '/v5/direction/bicycling',
        distanceUrl: '/v5/distance',
        ipLocationUrl: '/v3/ip'
      },
      baidu: {
        ak: process.env.BAIDU_MAP_AK,
        sk: process.env.BAIDU_MAP_SK,
        apiBaseUrl: 'https://api.map.baidu.com',
        geocodeUrl: '/geocoder/v2/',
        reverseGeocodeUrl: '/reverse_geocoding/v3/',
        weatherUrl: '/weather/v1/',
        placeSearchUrl: '/place/v2/search',
        placeDetailUrl: '/place/v2/detail',
        directionUrl: '/direction/v2/driving',
        distanceUrl: '/routematrix/v2/driving',
        ipLocationUrl: '/location/ip'
      }
    };

    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1小时缓存
  }

  /**
   * 获取缓存数据
   */
  getCacheKey(provider, method, params) {
    return `${provider}:${method}:${JSON.stringify(params)}`;
  }

  getFromCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  setCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 高德地图 - 地址解析（地址转坐标）
   */
  async geocodeAddress(address, city = null) {
    try {
      const cacheKey = this.getCacheKey('gaode', 'geocode', { address, city });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.config.gaode.key,
        address
      };

      if (city) {
        params.city = city;
      }

      const response = await axios.get(
        `${this.config.gaode.apiBaseUrl}${this.config.gaode.geocodeUrl}`,
        { params }
      );

      if (response.data.status === '1' && response.data.count > 0) {
        const result = {
          address,
          location: response.data.geocodes[0].location.split(','),
          level: response.data.geocodes[0].level,
          confidence: response.data.geocodes[0].confidence,
          formatted_address: response.data.geocodes[0].formatted_address
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.info || '地址解析失败');
      }
    } catch (error) {
      logger.error('高德地址解析失败:', error);
      throw error;
    }
  }

  /**
   * 高德地图 - 逆地址解析（坐标转地址）
   */
  async reverseGeocode(longitude, latitude) {
    try {
      const cacheKey = this.getCacheKey('gaode', 'reverseGeocode', { longitude, latitude });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.config.gaode.key,
        location: `${longitude},${latitude}`,
        extensions: 'all'
      };

      const response = await axios.get(
        `${this.config.gaode.apiBaseUrl}${this.config.gaode.regeocodeUrl}`,
        { params }
      );

      if (response.data.status === '1') {
        const result = {
          location: [longitude, latitude],
          address: response.data.regeocode.formatted_address,
          addressComponent: response.data.regeocode.addressComponent,
          pois: response.data.regeocode.pois || []
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.info || '逆地址解析失败');
      }
    } catch (error) {
      logger.error('高德逆地址解析失败:', error);
      throw error;
    }
  }

  /**
   * 高德地图 - POI搜索
   */
  async searchPoi(keyword, city = '全国', type = '', page = 1, pageSize = 20) {
    try {
      const cacheKey = this.getCacheKey('gaode', 'searchPoi', { keyword, city, type, page, pageSize });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.config.gaode.key,
        keywords: keyword,
        city,
        citylimit: city === '全国' ? false : true,
        page_size: pageSize,
        page_num: page - 1,
        extensions: 'all'
      };

      if (type) {
        params.types = type;
      }

      const response = await axios.get(
        `${this.config.gaode.apiBaseUrl}${this.config.gaode.poiSearchUrl}`,
        { params }
      );

      if (response.data.status === '1') {
        const result = {
          keyword,
          city,
          pois: response.data.pois || [],
          count: response.data.count,
          page,
          pageSize
        };

        // 标准化POI数据
        result.pois = result.pois.map(poi => ({
          id: poi.id,
          name: poi.name,
          type: poi.type,
          typecode: poi.typecode,
          address: poi.address,
          location: poi.location ? poi.location.split(',').map(Number) : null,
          tel: poi.tel,
          distance: poi.distance ? parseFloat(poi.distance) : null,
          rating: poi.rating || null,
          cost: poi.cost || null
        }));

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.info || 'POI搜索失败');
      }
    } catch (error) {
      logger.error('高德POI搜索失败:', error);
      throw error;
    }
  }

  /**
   * 高德地图 - 路线规划（驾车）
   */
  async planDrivingRoute(origin, destination, waypoints = [], strategy = 0) {
    try {
      const cacheKey = this.getCacheKey('gaode', 'driving', { origin, destination, waypoints, strategy });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.config.gaode.key,
        origin: Array.isArray(origin) ? origin.join(',') : origin,
        destination: Array.isArray(destination) ? destination.join(',') : destination,
        strategy, // 路线策略 0-躲避拥堵
        extensions: 'all'
      };

      if (waypoints && waypoints.length > 0) {
        params.waypoints = Array.isArray(waypoints[0])
          ? waypoints.map(wp => wp.join(',')).join('|')
          : waypoints.join('|');
      }

      const response = await axios.get(
        `${this.config.gaode.apiBaseUrl}${this.config.gaode.drivingUrl}`,
        { params }
      );

      if (response.data.status === '1' && response.data.route.paths.length > 0) {
        const path = response.data.route.paths[0];
        const result = {
          origin: params.origin,
          destination: params.destination,
          distance: path.distance, // 米
          duration: path.duration, // 秒
          strategy: path.strategy,
          toll: path.toll || 0,
          traffic_lights: path.traffic_lights || 0,
          restriction: path.restriction || 0,
          steps: path.steps.map(step => ({
            instruction: step.instruction,
            road: step.road,
            distance: step.distance,
            duration: step.duration,
            polyline: step.polyline,
            action: step.action,
            assistant_action: step.assistant_action
          }))
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.info || '路线规划失败');
      }
    } catch (error) {
      logger.error('高德路线规划失败:', error);
      throw error;
    }
  }

  /**
   * 高德地图 - 距离测量
   */
  async calculateDistance(origins, destination, type = '1') {
    try {
      const cacheKey = this.getCacheKey('gaode', 'distance', { origins, destination, type });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.config.gaode.key,
        origins: Array.isArray(origins[0])
          ? origins.map(origin => origin.join(',')).join('|')
          : origins.join('|'),
        destination: Array.isArray(destination) ? destination.join(',') : destination,
        type // 1:驾车距离 3:步行距离
      };

      const response = await axios.get(
        `${this.config.gaode.apiBaseUrl}${this.config.gaode.distanceUrl}`,
        { params }
      );

      if (response.data.status === '1') {
        const results = response.data.results.map(result => ({
          origin_id: result.origin_id,
          destination_id: result.destination_id,
          distance: result.distance,
          duration: result.duration
        }));

        const result = {
          origins: params.origins,
          destination: params.destination,
          type,
          results
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.info || '距离计算失败');
      }
    } catch (error) {
      logger.error('高德距离计算失败:', error);
      throw error;
    }
  }

  /**
   * 高德地图 - 天气查询
   */
  async getWeather(city, extensions = 'all') {
    try {
      const cacheKey = this.getCacheKey('gaode', 'weather', { city, extensions });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        // 天气数据缓存时间较短
        const weatherCached = this.getFromCache(cacheKey);
        if (weatherCached && Date.now() - weatherCached.timestamp < 1800000) { // 30分钟
          return weatherCached;
        }
      }

      const params = {
        key: this.config.gaode.key,
        city,
        extensions // all:预报天气信息, base:实况天气信息
      };

      const response = await axios.get(
        `${this.config.gaode.apiBaseUrl}${this.config.gaode.weatherUrl}`,
        { params }
      );

      if (response.data.status === '1') {
        const result = {
          city,
          weather: response.data.lives ? {
            province: response.data.lives[0].province,
            city: response.data.lives[0].city,
            weather: response.data.lives[0].weather,
            temperature: response.data.lives[0].temperature,
            winddirection: response.data.lives[0].winddirection,
            windpower: response.data.lives[0].windpower,
            humidity: response.data.lives[0].humidity,
            reporttime: response.data.lives[0].reporttime
          } : null,
          forecasts: response.data.forecasts ? response.data.forecasts.map(forecast => ({
            city: forecast.city,
            adcode: forecast.adcode,
            province: forecast.province,
            reporttime: forecast.reporttime,
            casts: forecast.casts.map(cast => ({
              date: cast.date,
              week: cast.week,
              dayweather: cast.dayweather,
              nightweather: cast.nightweather,
              daytemp: cast.daytemp,
              nighttemp: cast.nighttemp,
              daywind: cast.daywind,
              nightwind: cast.nightwind,
              daypower: cast.daypower,
              nightpower: cast.nightpower
            }))
          })) : []
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.info || '天气查询失败');
      }
    } catch (error) {
      logger.error('高德天气查询失败:', error);
      throw error;
    }
  }

  /**
   * 百度地图 - 地址解析
   */
  async baiduGeocode(address, city = null) {
    try {
      const cacheKey = this.getCacheKey('baidu', 'geocode', { address, city });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const params = {
        ak: this.config.baidu.ak,
        address,
        output: 'json'
      };

      if (city) {
        params.city = city;
      }

      // 百度地图需要添加SN签名
      if (this.config.baidu.sk) {
        params.sn = this.generateBaiduSN(params);
      }

      const response = await axios.get(
        `${this.config.baidu.apiBaseUrl}${this.config.baidu.geocodeUrl}`,
        { params }
      );

      if (response.data.status === 0) {
        const result = {
          address,
          location: [response.data.result.location.lng, response.data.result.location.lat],
          level: response.data.result.level,
          confidence: response.data.result.confidence,
          precise: response.data.result.precise
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.message || '百度地址解析失败');
      }
    } catch (error) {
      logger.error('百度地址解析失败:', error);
      throw error;
    }
  }

  /**
   * 百度地图 - 生成SN签名
   */
  generateBaiduSN(params) {
    // 按照key排序
    const sortedKeys = Object.keys(params).sort();
    const query = [];
    sortedKeys.forEach(key => {
      if (key !== 'sn') {
        query.push(`${key}=${encodeURIComponent(params[key])}`);
      }
    });

    const queryString = query.join('&');
    const url = `/geocoder/v2/?${  queryString}`;

    return crypto.createHash('md5')
      .update(encodeURIComponent(url) + this.config.baidu.sk)
      .digest('hex');
  }

  /**
   * 获取行政区边界
   */
  async getDistrictBoundary(adcode, subdistrict = 1) {
    try {
      const cacheKey = this.getCacheKey('gaode', 'boundary', { adcode, subdistrict });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.config.gaode.key,
        keywords: adcode,
        subdistrict,
        extensions: 'all'
      };

      const response = await axios.get(
        `${this.config.gaode.apiBaseUrl}/v3/config/district`,
        { params }
      );

      if (response.data.status === '1' && response.data.districts.length > 0) {
        const district = response.data.districts[0];
        const result = {
          adcode: district.adcode,
          name: district.name,
          center: district.center ? district.center.split(',').map(Number) : null,
          level: district.level,
          boundaries: district.polyline ? district.polyline.split(';').map(polyline =>
            polyline.split('|').map(point => point.split(',').map(Number))
          ) : []
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.info || '行政区边界获取失败');
      }
    } catch (error) {
      logger.error('行政区边界获取失败:', error);
      throw error;
    }
  }

  /**
   * IP定位
   */
  async locateByIP(ip = null) {
    try {
      const cacheKey = this.getCacheKey('gaode', 'ipLocation', { ip });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const params = {
        key: this.config.gaode.key
      };

      if (ip) {
        params.ip = ip;
      }

      const response = await axios.get(
        `${this.config.gaode.apiBaseUrl}${this.config.gaode.ipLocationUrl}`,
        { params }
      );

      if (response.data.status === '1') {
        const result = {
          ip: response.data.ip,
          province: response.data.province,
          city: response.data.city,
          adcode: response.data.adcode,
          rectangle: response.data.rectangle ? response.data.rectangle.split(';').map(coord => coord.split(',').map(Number)) : null
        };

        this.setCache(cacheKey, result);
        return result;
      } else {
        throw new Error(response.data.info || 'IP定位失败');
      }
    } catch (error) {
      logger.error('IP定位失败:', error);
      throw error;
    }
  }

  /**
   * 村庄地图服务整合
   */
  async getVillageMapInfo(villageId) {
    try {
      const Village = require('../models/Village');
      const logger = require('../utils/logger');
      const village = await Village.findById(villageId);

      if (!village) {
        throw new Error('村庄不存在');
      }

      // 如果村庄有坐标信息，获取详细的地图数据
      const mapInfo = {
        villageId: village._id,
        name: village.name,
        address: village.address
      };

      if (village.location && village.location.coordinates) {
        const [longitude, latitude] = village.location.coordinates;

        // 逆地址解析获取详细地址信息
        const reverseGeocode = await this.reverseGeocode(longitude, latitude);
        mapInfo.location = {
          coordinates: [longitude, latitude],
          formatted_address: reverseGeocode.address,
          addressComponent: reverseGeocode.addressComponent
        };

        // 获取周边POI
        const nearbyPois = await this.searchPoi('村委会', reverseGeocode.addressComponent.city || '全国', '', 1, 10);
        mapInfo.nearbyPois = nearbyPois.pois;

        // 获取天气信息
        const weather = await this.getWeather(reverseGeocode.addressComponent.city || village.name);
        mapInfo.weather = weather;

        // 获取行政区边界
        if (reverseGeocode.addressComponent.adcode) {
          const boundary = await this.getDistrictBoundary(reverseGeocode.addressComponent.adcode);
          mapInfo.boundary = boundary;
        }
      } else if (village.address) {
        // 根据地址解析坐标
        const geocode = await this.geocodeAddress(village.address);
        mapInfo.location = {
          coordinates: geocode.location,
          formatted_address: geocode.formatted_address,
          level: geocode.level
        };

        // 更新村庄位置信息
        await Village.findByIdAndUpdate(villageId, {
          location: {
            type: 'Point',
            coordinates: geocode.location
          }
        });
      }

      return mapInfo;
    } catch (error) {
      logger.error('获取村庄地图信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取村庄服务设施分布
   */
  async getVillageServiceFacilities(villageId, facilityTypes = []) {
    try {
      const villageMapInfo = await this.getVillageMapInfo(villageId);

      if (!villageMapInfo.location || !villageMapInfo.location.coordinates) {
        throw new Error('村庄位置信息不完整');
      }

      const [longitude, latitude] = villageMapInfo.location.coordinates;
      const city = villageMapInfo.location.addressComponent ?
        villageMapInfo.location.addressComponent.city : '全国';

      const facilities = {};

      // 定义设施类型搜索关键词
      const facilityKeywords = {
        medical: ['医院', '诊所', '卫生院', '药店'],
        education: ['学校', '幼儿园', '小学', '中学', '大学'],
        government: ['村委会', '政府', '街道办事处', '派出所'],
        commercial: ['超市', '商店', '市场', '银行', 'ATM'],
        transportation: ['公交站', '地铁站', '火车站', '机场'],
        recreation: ['公园', '广场', '体育馆', '文化中心']
      };

      const searchTypes = facilityTypes.length > 0 ?
        facilityTypes : Object.keys(facilityKeywords);

      for (const type of searchTypes) {
        if (facilityKeywords[type]) {
          facilities[type] = [];

          // 为每个设施类型搜索POI
          for (const keyword of facilityKeywords[type]) {
            try {
              const poiResult = await this.searchPoi(
                keyword,
                city,
                '',
                1,
                20
              );

              // 计算距离并筛选较近的设施
              const nearbyPois = poiResult.pois
                .filter(poi => poi.location)
                .map(poi => {
                  const distance = this.calculateDistanceBetweenPoints(
                    [longitude, latitude],
                    poi.location
                  );
                  return {
                    ...poi,
                    distance
                  };
                })
                .filter(poi => poi.distance <= 10000) // 10公里内
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 5); // 每个类型最多5个

              facilities[type].push(...nearbyPois);
            } catch (error) {
              logger.warn(`搜索${type}设施失败:`, error.message);
            }
          }

          // 去重并排序
          facilities[type] = this.deduplicateAndSort(facilities[type]);
        }
      }

      return {
        villageId,
        villageName: villageMapInfo.name,
        location: villageMapInfo.location,
        facilities
      };
    } catch (error) {
      logger.error('获取村庄服务设施失败:', error);
      throw error;
    }
  }

  /**
   * 计算两点间距离（米）
   */
  calculateDistanceBetweenPoints(point1, point2) {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;

    const R = 6371000; // 地球半径（米）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * 去重并排序POI列表
   */
  deduplicateAndSort(pois) {
    const uniquePois = [];
    const seen = new Set();

    for (const poi of pois) {
      const key = `${poi.name}_${poi.address}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePois.push(poi);
      }
    }

    return uniquePois.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new MapService();