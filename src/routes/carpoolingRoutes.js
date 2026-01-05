/**
 * 拼车服务路由
 *
 * 处理拼车发布、搜索、加入、取消、评价等路由
 */

const express = require('express');
const router = express.Router();
const carpoolingController = require('../controllers/carpoolingController');
const auth = require('../middleware/auth');

/**
 * @route   POST /api/v1/carpooling/publish
 * @desc    发布拼车信息
 * @access  Private (需要认证)
 * @body    type - 类型（driver/passenger）
 * @body    origin - 起点（address, location, landmark）
 * @body    destination - 终点（address, location, landmark）
 * @body    departureTime - 出发时间
 * @body    seats - 总座位数
 * @body    availableSeats - 可用座位数
 * @body    price - 价格
 * @body    vehicleInfo - 车辆信息（车主必填）
 * @body    requirements - 乘车要求
 * @body    notes - 备注
 */
router.post('/publish', auth, carpoolingController.publish);

/**
 * @route   GET /api/v1/carpooling/search
 * @desc    搜索拼车信息
 * @access  Public
 * @query   origin - 起点坐标 [longitude, latitude]
 * @query   destination - 终点坐标 [longitude, latitude]
 * @query   departureDate - 出发日期（YYYY-MM-DD）
 * @query   type - 类型（driver/passenger）
 * @query   minPrice - 最低价格
 * @query   maxPrice - 最高价格
 * @query   minSeats - 最小座位数
 * @query   gender - 性别偏好
 * @query   page - 页码
 * @query   limit - 每页数量
 */
router.get('/search', carpoolingController.search);

/**
 * @route   GET /api/v1/carpooling/history
 * @desc    获取用户的拼车历史
 * @access  Private (需要认证)
 * @query   status - 状态筛选
 * @query   type - 类型筛选
 * @query   page - 页码
 * @query   limit - 每页数量
 */
router.get('/history', auth, carpoolingController.getHistory);

/**
 * @route   GET /api/v1/carpooling/:id
 * @desc    获取拼车详情
 * @access  Public
 * @param   id - 拼车ID
 */
router.get('/:id', carpoolingController.getDetail);

/**
 * @route   POST /api/v1/carpooling/:id/join
 * @desc    加入拼车
 * @access  Private (需要认证)
 * @param   id - 拼车ID
 * @body    name - 姓名
 * @body    phone - 电话
 * @body    seats - 座位数
 * @body    pickupLocation - 上车地点
 */
router.post('/:id/join', auth, carpoolingController.join);

/**
 * @route   PUT /api/v1/carpooling/:id/confirm
 * @desc    确认乘客（车主）
 * @access  Private (需要认证)
 * @param   id - 拼车ID
 * @body    passengerId - 乘客ID
 */
router.put('/:id/confirm', auth, carpoolingController.confirmPassenger);

/**
 * @route   PUT /api/v1/carpooling/:id/status
 * @desc    更新拼车状态
 * @access  Private (需要认证)
 * @param   id - 拼车ID
 * @body    status - 新状态（active/completed）
 */
router.put('/:id/status', auth, carpoolingController.updateStatus);

/**
 * @route   DELETE /api/v1/carpooling/:id/cancel
 * @desc    取消拼车
 * @access  Private (需要认证)
 * @param   id - 拼车ID
 * @body    reason - 取消原因
 */
router.delete('/:id/cancel', auth, carpoolingController.cancel);

/**
 * @route   POST /api/v1/carpooling/:id/rate
 * @desc    评价拼车
 * @access  Private (需要认证)
 * @param   id - 拼车ID
 * @body    rating - 评分（1-5）
 * @body    comment - 评价内容
 */
router.post('/:id/rate', auth, carpoolingController.rate);

module.exports = router;
