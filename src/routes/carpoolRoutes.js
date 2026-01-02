/**
 * 拼车服务路由
 * 定义所有拼车相关的API端点
 */

const express = require('express');
const router = express.Router();
const carpoolController = require('../controllers/carpoolController');
const { authenticate } = require('../middleware/auth');

// ============== 中间件 ==============
router.use(authenticate);

// ============== 行程管理 ==============

/**
 * @route   POST /api/v1/carpool/trips
 * @desc    创建拼车行程
 * @access  Private
 */
router.post('/trips', carpoolController.createTrip);

/**
 * @route   GET /api/v1/carpool/trips
 * @desc    获取拼车行程列表
 * @query   villageId - 村庄ID
 * @query   status - 状态筛选
 * @query   driverId - 司机ID
 * @query   departureAfter - 出发时间（最早）
 * @query   departureBefore - 出发时间（最晚）
 * @access  Private
 */
router.get('/trips', carpoolController.getTrips);

/**
 * @route   GET /api/v1/carpool/trips/:id
 * @desc    获取行程详情
 * @access  Private
 */
router.get('/trips/:id', carpoolController.getTripById);

/**
 * @route   PUT /api/v1/carpool/trips/:id
 * @desc    更新行程
 * @access  Private (司机或管理员)
 */
router.put('/trips/:id', carpoolController.updateTrip);

/**
 * @route   DELETE /api/v1/carpool/trips/:id
 * @desc    取消行程
 * @access  Private (司机或管理员)
 */
router.delete('/trips/:id', carpoolController.cancelTrip);

// ============== 乘客管理 ==============

/**
 * @route   POST /api/v1/carpool/trips/:id/join
 * @desc    加入拼车
 * @body    pickupLocation - 上车地点
 * @body    dropoffLocation - 下车地点
 * @body    seats - 座位数
 * @access  Private
 */
router.post('/trips/:id/join', carpoolController.joinTrip);

/**
 * @route   POST /api/v1/carpool/trips/:id/passengers/:passengerId/confirm
 * @desc    确认乘客
 * @access  Private (司机)
 */
router.post('/trips/:id/passengers/:passengerId/confirm', carpoolController.confirmPassenger);

/**
 * @route   DELETE /api/v1/carpool/trips/:id/passengers/:passengerId
 * @desc    取消乘客
 * @access  Private (乘客或司机)
 */
router.delete('/trips/:id/passengers/:passengerId', carpoolController.cancelPassenger);

// ============== 行程状态 ==============

/**
 * @route   POST /api/v1/carpool/trips/:id/start
 * @desc    开始行程
 * @access  Private (司机)
 */
router.post('/trips/:id/start', carpoolController.startTrip);

/**
 * @route   POST /api/v1/carpool/trips/:id/complete
 * @desc    完成行程
 * @body    actualDistance - 实际里程(km)
 * @body    actualDuration - 实际时长(分钟)
 * @access  Private (司机)
 */
router.post('/trips/:id/complete', carpoolController.completeTrip);

// ============== 智能匹配 ==============

/**
 * @route   GET /api/v1/carpool/nearby
 * @desc    查找附近拼车
 * @query   longitude - 经度
 * @query   latitude - 纬度
 * @query   maxDistance - 最大距离(km)
 * @query   seats - 需要座位数
 * @query   departureAfter - 最早出发时间
 * @query   departureBefore - 最晚出发时间
 * @access  Private
 */
router.get('/nearby', carpoolController.findNearby);

/**
 * @route   POST /api/v1/carpool/match
 * @desc    智能匹配拼车
 * @body    origin - 起点 {lng, lat}
 * @body    destination - 终点 {lng, lat}
 * @body    departureTime - 出发时间
 * @body    seats - 座位数
 * @access  Private
 */
router.post('/match', carpoolController.smartMatch);

module.exports = router;
