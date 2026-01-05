/**
 * 交通服务路由
 *
 * 处理交通站点查询、班次搜索等路由
 */

const express = require('express');
const router = express.Router();
const transportationController = require('../controllers/transportationController');

/**
 * @route   GET /api/v1/transportation/nearby
 * @desc    获取附近的交通站点
 * @access  Public
 * @query   longitude - 经度（必填）
 * @query   latitude - 纬度（必填）
 * @query   radius - 搜索半径（公里），默认20
 * @query   type - 类型筛选（flight/train/bus）
 */
router.get('/nearby', transportationController.getNearbyTransportation);

/**
 * @route   GET /api/v1/transportation/schedules/search
 * @desc    搜索班次
 * @access  Public
 * @query   origin - 起点
 * @query   destination - 终点
 * @query   date - 出发日期（YYYY-MM-DD，必填）
 * @query   type - 类型（flight/train/bus）
 * @query   minPrice - 最低价格
 * @query   maxPrice - 最高价格
 */
router.get('/schedules/search', transportationController.searchSchedules);

/**
 * @route   GET /api/v1/transportation/code/:code
 * @desc    根据站点代码搜索
 * @access  Public
 * @param   code - 站点代码
 * @query   type - 类型（flight/train/bus）
 */
router.get('/code/:code', transportationController.searchByCode);

/**
 * @route   GET /api/v1/transportation/:id
 * @desc    获取交通站点详情
 * @access  Public
 * @param   id - 站点ID
 */
router.get('/:id', transportationController.getTransportationDetail);

/**
 * @route   GET /api/v1/transportation/:id/stats
 * @desc    获取站点统计信息
 * @access  Public
 * @param   id - 站点ID
 */
router.get('/:id/stats', transportationController.getStationStats);

/**
 * @route   GET /api/v1/transportation/:id/schedules
 * @desc    获取站点的班次列表
 * @access  Public
 * @param   id - 站点ID
 * @query   destination - 目的地筛选
 * @query   date - 日期筛选（YYYY-MM-DD）
 */
router.get('/:id/schedules', transportationController.getStationSchedules);

module.exports = router;
