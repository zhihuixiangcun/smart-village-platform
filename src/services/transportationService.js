/**
 * 交通服务
 *
 * 提供交通站点查询、班次搜索等功能
 */

const Transportation = require('../models/Transportation');
const logger = require('../utils/logger');

class TransportationService {
  /**
   * 获取附近的交通站点
   * @param {Number} longitude - 经度
   * @param {Number} latitude - 纬度
   * @param {Number} radius - 搜索半径（公里）
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Object>} 附近的交通站点
   */
  async getNearbyTransportation(longitude, latitude, radius = 20, filters = {}) {
    try {
      if (!longitude || !latitude) {
        throw new Error('请提供经纬度坐标');
      }

      if (radius < 1 || radius > 100) {
        throw new Error('搜索半径应在1-100公里之间');
      }

      const coordinates = [parseFloat(longitude), parseFloat(latitude)];
      const maxDistance = radius * 1000; // 转换为米

      const stations = await Transportation.findNearby(
        coordinates,
        maxDistance,
        filters
      );

      // 计算每个站点到用户的距离
      const stationsWithDistance = stations.map(station => {
        const stationObj = station.toObject();
        stationObj.distance = this._calculateDistance(
          latitude,
          longitude,
          station.location.coordinates[1],
          station.location.coordinates[0]
        );
        return stationObj;
      });

      // 按距离排序
      stationsWithDistance.sort((a, b) => a.distance - b.distance);

      logger.info('获取附近交通站点成功', {
        count: stationsWithDistance.length,
        radius,
        coordinates
      });

      return {
        success: true,
        data: stationsWithDistance,
        total: stationsWithDistance.length
      };

    } catch (error) {
      logger.error('获取附近交通站点失败:', error);
      throw error;
    }
  }

  /**
   * 获取交通站点详情
   * @param {String} stationId - 站点ID
   * @returns {Promise<Object>} 站点详情
   */
  async getTransportationDetail(stationId) {
    try {
      if (!stationId) {
        throw new Error('请提供站点ID');
      }

      const station = await Transportation.findById(stationId);

      if (!station) {
        throw new Error('站点不存在');
      }

      // 返回有效班次
      const activeSchedules = station.getActiveSchedules();

      logger.info('获取交通站点详情成功', { stationId });

      return {
        success: true,
        data: {
          ...station.toObject(),
          schedules: activeSchedules
        }
      };

    } catch (error) {
      logger.error('获取交通站点详情失败:', error);
      throw error;
    }
  }

  /**
   * 搜索班次
   * @param {Object} criteria - 搜索条件
   * @returns {Promise<Object>} 搜索结果
   */
  async searchSchedules(criteria) {
    try {
      const {
        origin,
        destination,
        date,
        type,
        minPrice,
        maxPrice
      } = criteria;

      if (!date) {
        throw new Error('请提供出发日期');
      }

      if (!origin && !destination) {
        throw new Error('请提供起点或终点');
      }

      const searchDate = new Date(date);
      if (searchDate < new Date().setHours(0, 0, 0, 0)) {
        throw new Error('出发日期不能早于今天');
      }

      const results = await Transportation.searchSchedules({
        origin,
        destination,
        date,
        type,
        minPrice,
        maxPrice
      });

      // 按价格和出发时间排序
      results.forEach(result => {
        result.schedules.sort((a, b) => {
          if (a.price !== b.price) {
            return a.price - b.price; // 价格优先
          }
          return new Date(a.departureTime) - new Date(b.departureTime); // 时间其次
        });
      });

      logger.info('搜索班次成功', {
        count: results.length,
        origin,
        destination,
        date
      });

      return {
        success: true,
        data: results,
        total: results.length
      };

    } catch (error) {
      logger.error('搜索班次失败:', error);
      throw error;
    }
  }

  /**
   * 根据站点代码搜索
   * @param {String} code - 站点代码
   * @param {String} type - 类型
   * @returns {Promise<Object>} 搜索结果
   */
  async searchByCode(code, type) {
    try {
      if (!code) {
        throw new Error('请提供站点代码');
      }

      const query = {
        code: code.toUpperCase(),
        isActive: true
      };

      if (type) {
        query.type = type;
      }

      const station = await Transportation.findOne(query);

      if (!station) {
        throw new Error('站点不存在');
      }

      logger.info('根据代码搜索站点成功', { code });

      return {
        success: true,
        data: station
      };

    } catch (error) {
      logger.error('根据代码搜索站点失败:', error);
      throw error;
    }
  }

  /**
   * 获取站点统计信息
   * @param {String} stationId - 站点ID
   * @returns {Promise<Object>} 统计信息
   */
  async getStationStats(stationId) {
    try {
      const station = await Transportation.findById(stationId);

      if (!station) {
        throw new Error('站点不存在');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 今日班次统计
      const todaySchedules = station.schedules.filter(s =>
        s.departureTime >= today && s.departureTime < tomorrow &&
        s.status !== 'cancelled'
      );

      const stats = {
        totalSchedules: station.schedules.length,
        todaySchedules: todaySchedules.length,
        activeSchedules: todaySchedules.filter(s => s.availableSeats > 0).length,
        averagePrice: todaySchedules.length > 0
          ? todaySchedules.reduce((sum, s) => sum + s.price, 0) / todaySchedules.length
          : 0,
        rating: station.rating,
        facilities: station.facilities,
        services: station.services
      };

      logger.info('获取站点统计成功', { stationId });

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      logger.error('获取站点统计失败:', error);
      throw error;
    }
  }

  /**
   * 计算两点之间的距离（公里）
   * @private
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 10) / 10; // 保留一位小数
  }
}

module.exports = new TransportationService();
