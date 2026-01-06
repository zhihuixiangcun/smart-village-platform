/**
 * 交通服务控制器
 *
 * 处理交通站点查询、班次搜索等HTTP请求
 */

const transportationService = require('../services/transportationService');
const logger = require('../utils/logger');

/**
 * 获取附近的交通站点
 * GET /api/v1/transportation/nearby
 * @query {Number} longitude - 经度
 * @query {Number} latitude - 纬度
 * @query {Number} radius - 搜索半径（公里），默认20
 * @query {String} type - 类型筛选（flight/train/bus）
 */
exports.getNearbyTransportation = async (req, res) => {
  try {
    const { longitude, latitude, radius, type } = req.query;

    // 验证必填参数
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '请提供经纬度坐标'
      });
    }

    // 验证坐标格式
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({
        success: false,
        message: '经纬度格式不正确'
      });
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: '经纬度超出有效范围'
      });
    }

    const filters = {};
    if (type) {
      if (!['flight', 'train', 'bus'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: '无效的交通类型'
        });
      }
      filters.type = type;
    }

    const result = await transportationService.getNearbyTransportation(
      lng,
      lat,
      parseInt(radius) || 20,
      filters
    );

    res.json({
      success: true,
      data: result.data,
      total: result.total
    });

  } catch (error) {
    logger.error('获取附近交通站点失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取附近交通站点失败'
    });
  }
};

/**
 * 获取交通站点详情
 * GET /api/v1/transportation/:id
 */
exports.getTransportationDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '请提供站点ID'
      });
    }

    const result = await transportationService.getTransportationDetail(id);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取交通站点详情失败:', error);

    if (error.message === '站点不存在') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || '获取站点详情失败'
    });
  }
};

/**
 * 搜索班次
 * GET /api/v1/transportation/schedules/search
 * @query {String} origin - 起点
 * @query {String} destination - 终点
 * @query {String} date - 出发日期（YYYY-MM-DD）
 * @query {String} type - 类型（flight/train/bus）
 * @query {Number} minPrice - 最低价格
 * @query {Number} maxPrice - 最高价格
 */
exports.searchSchedules = async (req, res) => {
  try {
    const {
      origin,
      destination,
      date,
      type,
      minPrice,
      maxPrice
    } = req.query;

    // 验证日期格式
    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请提供出发日期'
      });
    }

    const searchDate = new Date(date);
    if (isNaN(searchDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: '日期格式不正确'
      });
    }

    if (!origin && !destination) {
      return res.status(400).json({
        success: false,
        message: '请提供起点或终点'
      });
    }

    const criteria = {
      origin,
      destination,
      date,
      type,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
    };

    const result = await transportationService.searchSchedules(criteria);

    res.json({
      success: true,
      data: result.data,
      total: result.total
    });

  } catch (error) {
    logger.error('搜索班次失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '搜索班次失败'
    });
  }
};

/**
 * 根据站点代码搜索
 * GET /api/v1/transportation/code/:code
 * @param {String} code - 站点代码
 * @query {String} type - 类型（flight/train/bus）
 */
exports.searchByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { type } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '请提供站点代码'
      });
    }

    if (type && !['flight', 'train', 'bus'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的交通类型'
      });
    }

    const result = await transportationService.searchByCode(code, type);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('根据代码搜索站点失败:', error);

    if (error.message === '站点不存在') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || '搜索失败'
    });
  }
};

/**
 * 获取站点统计信息
 * GET /api/v1/transportation/:id/stats
 */
exports.getStationStats = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '请提供站点ID'
      });
    }

    const result = await transportationService.getStationStats(id);

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('获取站点统计失败:', error);

    if (error.message === '站点不存在') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || '获取统计信息失败'
    });
  }
};

/**
 * 获取特定站点的班次
 * GET /api/v1/transportation/:id/schedules
 * @query {String} destination - 目的地筛选
 * @query {String} date - 日期筛选（YYYY-MM-DD）
 */
exports.getStationSchedules = async (req, res) => {
  try {
    const { id } = req.params;
    const { destination, date } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '请提供站点ID'
      });
    }

    // 获取站点详情（包含有效班次）
    const detailResult = await transportationService.getTransportationDetail(id);
    let schedules = detailResult.data.schedules;

    // 按目的地筛选
    if (destination) {
      schedules = schedules.filter(s => s.destination === destination);
    }

    // 按日期筛选
    if (date) {
      const filterDate = new Date(date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(filterDate);
      nextDate.setDate(nextDate.getDate() + 1);

      schedules = schedules.filter(s => {
        const scheduleDate = new Date(s.departureTime);
        return scheduleDate >= filterDate && scheduleDate < nextDate;
      });
    }

    res.json({
      success: true,
      data: {
        station: {
          _id: detailResult.data._id,
          type: detailResult.data.type,
          stationName: detailResult.data.stationName,
          code: detailResult.data.code,
          address: detailResult.data.address
        },
        schedules,
        total: schedules.length
      }
    });

  } catch (error) {
    logger.error('获取站点班次失败:', error);

    if (error.message === '站点不存在') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || '获取班次失败'
    });
  }
};

