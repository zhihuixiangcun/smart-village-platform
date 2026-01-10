/**
 * 地图服务API接口
 */

import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || '/api/v1';

class MapService {
  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/map`,
      timeout: 10000,
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      response => {
        return response.data;
      },
      error => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error);
      }
    );
  }

  /**
   * 地址解析（地址转坐标）
   */
  async geocodeAddress(address, city = null) {
    try {
      return await this.client.post('/geocode', { address, city });
    } catch (error) {
      throw new Error(`地址解析失败: ${error.message}`);
    }
  }

  /**
   * 逆地址解析（坐标转地址）
   */
  async reverseGeocode(longitude, latitude) {
    try {
      return await this.client.get('/reverse-geocode', {
        params: { longitude, latitude },
      });
    } catch (error) {
      throw new Error(`逆地址解析失败: ${error.message}`);
    }
  }

  /**
   * POI搜索
   */
  async searchPOI(keyword, city = '全国', type = '', page = 1, pageSize = 20) {
    try {
      return await this.client.get('/poi/search', {
        params: { keyword, city, type, page, pageSize },
      });
    } catch (error) {
      throw new Error(`POI搜索失败: ${error.message}`);
    }
  }

  /**
   * 路线规划
   */
  async planRoute(routeData) {
    try {
      return await this.client.post('/route/plan', routeData);
    } catch (error) {
      throw new Error(`路线规划失败: ${error.message}`);
    }
  }

  /**
   * 距离计算
   */
  async calculateDistance(origins, destination, type = '1') {
    try {
      return await this.client.post('/distance/calculate', {
        origins,
        destination,
        type,
      });
    } catch (error) {
      throw new Error(`距离计算失败: ${error.message}`);
    }
  }

  /**
   * 天气查询
   */
  async getWeather(city, extensions = 'all') {
    try {
      return await this.client.get('/weather', {
        params: { city, extensions },
      });
    } catch (error) {
      throw new Error(`天气查询失败: ${error.message}`);
    }
  }

  /**
   * IP定位
   */
  async locateByIP(ip = null) {
    try {
      return await this.client.get('/ip/location', {
        params: { ip },
      });
    } catch (error) {
      throw new Error(`IP定位失败: ${error.message}`);
    }
  }

  /**
   * 获取行政区边界
   */
  async getDistrictBoundary(adcode, subdistrict = 1) {
    try {
      return await this.client.get('/district/boundary', {
        params: { adcode, subdistrict },
      });
    } catch (error) {
      throw new Error(`行政区边界获取失败: ${error.message}`);
    }
  }

  /**
   * 获取村庄地图信息
   */
  async getVillageMapInfo(villageId) {
    try {
      return await this.client.get(`/village/${villageId}`);
    } catch (error) {
      throw new Error(`村庄地图信息获取失败: ${error.message}`);
    }
  }

  /**
   * 获取村庄服务设施
   */
  async getVillageServiceFacilities(villageId, facilityTypes = []) {
    try {
      return await this.client.get(`/village/${villageId}/facilities`, {
        params: { facilityTypes: facilityTypes.join(',') },
      });
    } catch (error) {
      throw new Error(`村庄服务设施获取失败: ${error.message}`);
    }
  }

  /**
   * 批量地址解析
   */
  async batchGeocode(addresses) {
    try {
      return await this.client.post('/batch/geocode', { addresses });
    } catch (error) {
      throw new Error(`批量地址解析失败: ${error.message}`);
    }
  }

  /**
   * 获取村民位置
   */
  async getResidentLocation(residentId) {
    try {
      return await this.client.get(`/resident/${residentId}/location`);
    } catch (error) {
      throw new Error(`村民位置获取失败: ${error.message}`);
    }
  }

  /**
   * 更新村民位置
   */
  async updateResidentLocation(residentId, locationData) {
    try {
      return await this.client.put(`/resident/${residentId}/location`, locationData);
    } catch (error) {
      throw new Error(`村民位置更新失败: ${error.message}`);
    }
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus() {
    try {
      return await this.client.get('/service/status');
    } catch (error) {
      throw new Error(`服务状态获取失败: ${error.message}`);
    }
  }

  /**
   * 清理缓存
   */
  async clearCache() {
    try {
      return await this.client.delete('/cache/clear');
    } catch (error) {
      throw new Error(`缓存清理失败: ${error.message}`);
    }
  }

  /**
   * 地理编码优化版本 - 支持缓存和重试
   */
  async geocodeWithCache(address, city = null, useCache = true) {
    const cacheKey = `geocode_${address}_${city || 'default'}`;

    if (useCache) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // 缓存1小时有效
        if (Date.now() - timestamp < 3600000) {
          return { success: true, data };
        }
      }
    }

    try {
      const result = await this.geocodeAddress(address, city);

      if (useCache && result.success) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: result.data,
            timestamp: Date.now(),
          })
        );
      }

      return result;
    } catch (error) {
      // 如果有缓存数据，在网络失败时返回缓存
      if (useCache) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          return {
            success: true,
            data,
            cached: true,
            message: '使用缓存数据',
          };
        }
      }
      throw error;
    }
  }

  /**
   * 智能POI搜索 - 支持排序和过滤
   */
  async smartPOISearch(params) {
    const {
      keyword,
      city = '全国',
      type = '',
      page = 1,
      pageSize = 20,
      sortBy = 'distance',
      sortOrder = 'asc',
      filters = {},
    } = params;

    try {
      // 先进行基础搜索
      const result = await this.searchPOI(keyword, city, type, page, pageSize * 2);

      if (!result.success || !result.data.pois) {
        return result;
      }

      let pois = result.data.pois;

      // 应用过滤器
      if (filters.distance) {
        pois = pois.filter(poi => poi.distance && poi.distance <= filters.distance);
      }

      if (filters.rating) {
        pois = pois.filter(poi => poi.rating && poi.rating >= filters.rating);
      }

      if (filters.priceRange) {
        const [minPrice, maxPrice] = filters.priceRange;
        pois = pois.filter(poi => {
          if (!poi.cost) return false;
          return poi.cost >= minPrice && poi.cost <= maxPrice;
        });
      }

      // 排序
      pois.sort((a, b) => {
        let aValue = a[sortBy] || 0;
        let bValue = b[sortBy] || 0;

        if (sortBy === 'distance' || sortBy === 'cost') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }

        if (sortOrder === 'desc') {
          return bValue - aValue;
        }
        return aValue - bValue;
      });

      // 分页
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedPOIs = pois.slice(startIndex, endIndex);

      return {
        ...result,
        data: {
          ...result.data,
          pois: paginatedPOIs,
          count: pois.length,
          totalCount: result.data.count,
        },
      };
    } catch (error) {
      throw new Error(`智能POI搜索失败: ${error.message}`);
    }
  }

  /**
   * 多点路线规划
   */
  async multiPointRoutePlanning(points, type = 'driving', optimize = true) {
    try {
      if (points.length < 2) {
        throw new Error('至少需要2个点进行路线规划');
      }

      const routes = [];

      if (optimize && points.length > 2) {
        // 优化路径顺序（简化的最近邻算法）
        const optimizedPoints = this.optimizeRouteOrder(points);

        for (let i = 0; i < optimizedPoints.length - 1; i++) {
          const routeResult = await this.planRoute({
            origin: optimizedPoints[i],
            destination: optimizedPoints[i + 1],
            type,
          });

          if (routeResult.success) {
            routes.push(routeResult.data);
          }
        }
      } else {
        // 按顺序规划
        for (let i = 0; i < points.length - 1; i++) {
          const routeResult = await this.planRoute({
            origin: points[i],
            destination: points[i + 1],
            type,
          });

          if (routeResult.success) {
            routes.push(routeResult.data);
          }
        }
      }

      return {
        success: true,
        data: {
          routes,
          totalDistance: routes.reduce((sum, route) => sum + route.distance, 0),
          totalDuration: routes.reduce((sum, route) => sum + route.duration, 0),
        },
      };
    } catch (error) {
      throw new Error(`多点路线规划失败: ${error.message}`);
    }
  }

  /**
   * 路径优化（最近邻算法）
   */
  optimizeRouteOrder(points) {
    if (points.length <= 2) return points;

    const optimized = [points[0]];
    const remaining = points.slice(1);

    while (remaining.length > 0) {
      const currentPoint = optimized[optimized.length - 1];
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const distance = this.calculateDirectDistance(currentPoint, remaining[i]);

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      optimized.push(remaining[nearestIndex]);
      remaining.splice(nearestIndex, 1);
    }

    return optimized;
  }

  /**
   * 计算两点间直线距离
   */
  calculateDirectDistance(point1, point2) {
    // 简化计算，实际应用中应该使用更精确的地理距离计算
    const [lng1, lat1] = typeof point1 === 'string' ? point1.split(',') : point1;
    const [lng2, lat2] = typeof point2 === 'string' ? point2.split(',') : point2;

    const R = 6371; // 地球半径（公里）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 获取周边推荐地点
   */
  async getRecommendations(longitude, latitude, radius = 5000, types = []) {
    try {
      const recommendations = {};

      const defaultTypes = [
        { type: 'restaurant', name: '餐厅', keywords: ['餐厅', '美食', '小吃'] },
        { type: 'hotel', name: '酒店', keywords: ['酒店', '宾馆', '住宿'] },
        { type: 'shopping', name: '购物', keywords: ['商场', '超市', '购物'] },
        { type: 'entertainment', name: '娱乐', keywords: ['娱乐', 'KTV', '电影院'] },
        { type: 'transport', name: '交通', keywords: ['公交站', '地铁站', '火车站'] },
      ];

      const searchTypes = types.length > 0 ? types : defaultTypes;

      for (const typeInfo of searchTypes) {
        const results = [];

        for (const keyword of typeInfo.keywords) {
          try {
            const result = await this.searchPOI(keyword, '', '', 1, 5);
            if (result.success && result.data.pois) {
              const nearbyPOIs = result.data.pois
                .filter(poi => poi.location)
                .map(poi => ({
                  ...poi,
                  distance:
                    this.calculateDirectDistance(
                      `${longitude},${latitude}`,
                      poi.location.join(',')
                    ) * 1000, // 转换为米
                }))
                .filter(poi => poi.distance <= radius)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 3);

              results.push(...nearbyPOIs);
            }
          } catch (error) {
            console.warn(`搜索${typeInfo.name}失败:`, error.message);
          }
        }

        // 去重
        const uniqueResults = results
          .filter((poi, index, self) => index === self.findIndex(p => p.id === poi.id))
          .slice(0, 5);

        recommendations[typeInfo.type] = {
          name: typeInfo.name,
          places: uniqueResults,
        };
      }

      return {
        success: true,
        data: {
          center: [longitude, latitude],
          radius,
          recommendations,
        },
      };
    } catch (error) {
      throw new Error(`获取周边推荐失败: ${error.message}`);
    }
  }
}

// 创建单例实例
const mapService = new MapService();

export default mapService;
