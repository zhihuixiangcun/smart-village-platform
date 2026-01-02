/**
 * 拼车服务控制器
 * 处理拼车相关的业务逻辑
 */

const CarpoolTrip = require('../models/CarpoolTrip');
const User = require('../models/User');

// ============== 行程管理 ==============

/**
 * 创建拼车行程
 */
exports.createTrip = async (req, res) => {
  try {
    const {
      villageId,
      route,
      seats,
      vehicle,
      rules,
      notes
    } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!route || !route.origin || !route.destination) {
      return res.status(400).json({
        success: false,
        error: '路线信息不完整',
        code: 'INCOMPLETE_ROUTE'
      });
    }

    if (!seats || seats.total < 1) {
      return res.status(400).json({
        success: false,
        error: '座位数无效',
        code: 'INVALID_SEATS'
      });
    }

    // 创建行程
    const trip = new CarpoolTrip({
      villageId,
      driver: userId,
      route: {
        ...route,
        distance: calculateDistance(route.origin.coordinates, route.destination.coordinates)
      },
      seats: {
        total: seats.total,
        available: seats.total,
        pricePerSeat: seats.pricePerSeat || 0
      },
      vehicle,
      rules: rules || {},
      notes,
      status: 'open'
    });

    await trip.save();

    return res.status(201).json({
      success: true,
      data: trip,
      message: '拼车行程发布成功'
    });
  } catch (error) {
    console.error('创建拼车行程失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'CREATE_TRIP_ERROR'
    });
  }
};

/**
 * 获取拼车行程列表
 */
exports.getTrips = async (req, res) => {
  try {
    const {
      villageId,
      status,
      driverId,
      departureAfter,
      departureBefore,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (villageId) query.villageId = villageId;
    if (status) query.status = status;
    if (driverId) query.driver = driverId;
    if (departureAfter || departureBefore) {
      query['route.origin.time'] = {};
      if (departureAfter) query['route.origin.time'].$gte = new Date(departureAfter);
      if (departureBefore) query['route.origin.time'].$lte = new Date(departureBefore);
    }

    const trips = await CarpoolTrip.find(query)
      .populate('driver', 'username profile.firstName profile.lastName profile.phone')
      .sort({ 'route.origin.time': 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await CarpoolTrip.countDocuments(query);

    return res.json({
      success: true,
      data: trips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取拼车列表失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_TRIPS_ERROR'
    });
  }
};

/**
 * 获取行程详情
 */
exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await CarpoolTrip.findById(id)
      .populate('driver', 'username profile.firstName profile.lastName profile.phone verification')
      .populate('passengers.user', 'username profile.firstName profile.lastName profile.phone');

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: '行程不存在',
        code: 'TRIP_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('获取行程详情失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_TRIP_ERROR'
    });
  }
};

/**
 * 更新行程
 */
exports.updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const trip = await CarpoolTrip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: '行程不存在',
        code: 'TRIP_NOT_FOUND'
      });
    }

    // 检查权限
    if (!trip.driver.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权修改此行程',
        code: 'NO_PERMISSION'
      });
    }

    // 只有草稿状态可以编辑
    if (trip.status !== 'draft' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: '只有草稿状态的行程可以编辑',
        code: 'CANNOT_EDIT'
      });
    }

    // 更新允许修改的字段
    const allowedUpdates = ['route', 'seats', 'vehicle', 'rules', 'notes'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        trip[field] = updates[field];
      }
    });

    await trip.save();

    return res.json({
      success: true,
      data: trip,
      message: '行程更新成功'
    });
  } catch (error) {
    console.error('更新行程失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'UPDATE_TRIP_ERROR'
    });
  }
};

/**
 * 取消行程
 */
exports.cancelTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const trip = await CarpoolTrip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: '行程不存在',
        code: 'TRIP_NOT_FOUND'
      });
    }

    // 检查权限
    if (!trip.driver.equals(userId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权取消此行程',
        code: 'NO_PERMISSION'
      });
    }

    await trip.cancelTrip(userId, reason);

    // 处理退款
    if (trip.cancellation.refundPolicy !== 'no_refund') {
      // TODO: 触发退款流程
    }

    return res.json({
      success: true,
      data: trip,
      message: '行程已取消'
    });
  } catch (error) {
    console.error('取消行程失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'CANCEL_TRIP_ERROR'
    });
  }
};

// ============== 乘客管理 ==============

/**
 * 加入拼车
 */
exports.joinTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pickupLocation,
      dropoffLocation,
      seats = 1,
      notes
    } = req.body;
    const userId = req.user.id;

    const trip = await CarpoolTrip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: '行程不存在',
        code: 'TRIP_NOT_FOUND'
      });
    }

    // 检查状态
    if (!['open', 'filling'].includes(trip.status)) {
      return res.status(400).json({
        success: false,
        error: '该行程不可加入',
        code: 'TRIP_NOT_AVAILABLE'
      });
    }

    // 检查座位
    if (trip.seats.available < seats) {
      return res.status(400).json({
        success: false,
        error: '座位不足',
        code: 'NOT_ENOUGH_SEATS'
      });
    }

    // 添加乘客
    await trip.addPassenger({
      user: userId,
      pickupLocation,
      dropoffLocation,
      seats,
      notes
    });

    return res.json({
      success: true,
      data: trip,
      message: '已申请加入拼车，等待司机确认'
    });
  } catch (error) {
    console.error('加入拼车失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'JOIN_TRIP_ERROR'
    });
  }
};

/**
 * 确认乘客
 */
exports.confirmPassenger = async (req, res) => {
  try {
    const { id, passengerId } = req.params;
    const userId = req.user.id;

    const trip = await CarpoolTrip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: '行程不存在',
        code: 'TRIP_NOT_FOUND'
      });
    }

    // 检查权限（只有司机可以确认）
    if (!trip.driver.equals(userId)) {
      return res.status(403).json({
        success: false,
        error: '只有司机可以确认乘客',
        code: 'NO_PERMISSION'
      });
    }

    await trip.confirmPassenger(passengerId);

    // 发送通知给乘客
    // TODO: 发送通知

    return res.json({
      success: true,
      message: '乘客已确认'
    });
  } catch (error) {
    console.error('确认乘客失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'CONFIRM_PASSENGER_ERROR'
    });
  }
};

/**
 * 取消乘客
 */
exports.cancelPassenger = async (req, res) => {
  try {
    const { id, passengerId } = req.params;
    const userId = req.user.id;

    const trip = await CarpoolTrip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: '行程不存在',
        code: 'TRIP_NOT_FOUND'
      });
    }

    // 乘客自己取消或司机取消
    const passenger = trip.passengers.find(p => p.user.equals(passengerId));
    if (!passenger) {
      return res.status(404).json({
        success: false,
        error: '乘客不存在',
        code: 'PASSENGER_NOT_FOUND'
      });
    }

    const isPassenger = passenger.user.equals(userId);
    const isDriver = trip.driver.equals(userId);

    if (!isPassenger && !isDriver) {
      return res.status(403).json({
        success: false,
        error: '无权操作',
        code: 'NO_PERMISSION'
      });
    }

    await trip.cancelPassenger(passengerId);

    // 处理退款
    if (passenger.paymentStatus === 'paid') {
      // TODO: 计算退款
    }

    return res.json({
      success: true,
      message: '已取消拼车'
    });
  } catch (error) {
    console.error('取消乘客失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'CANCEL_PASSENGER_ERROR'
    });
  }
};

// ============== 行程状态 ==============

/**
 * 开始行程
 */
exports.startTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const trip = await CarpoolTrip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: '行程不存在',
        code: 'TRIP_NOT_FOUND'
      });
    }

    if (!trip.driver.equals(userId)) {
      return res.status(403).json({
        success: false,
        error: '只有司机可以开始行程',
        code: 'NO_PERMISSION'
      });
    }

    await trip.startTrip();

    return res.json({
      success: true,
      data: trip,
      message: '行程已开始'
    });
  } catch (error) {
    console.error('开始行程失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'START_TRIP_ERROR'
    });
  }
};

/**
 * 完成行程
 */
exports.completeTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualDistance, actualDuration } = req.body;
    const userId = req.user.id;

    const trip = await CarpoolTrip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: '行程不存在',
        code: 'TRIP_NOT_FOUND'
      });
    }

    if (!trip.driver.equals(userId)) {
      return res.status(403).json({
        success: false,
        error: '只有司机可以完成行程',
        code: 'NO_PERMISSION'
      });
    }

    await trip.completeTrip(actualDistance, actualDuration);

    return res.json({
      success: true,
      data: trip,
      message: '行程已完成'
    });
  } catch (error) {
    console.error('完成行程失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'COMPLETE_TRIP_ERROR'
    });
  }
};

// ============== 智能匹配 ==============

/**
 * 查找附近拼车
 */
exports.findNearby = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10, seats, departureAfter, departureBefore } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        error: '缺少位置信息',
        code: 'MISSING_LOCATION'
      });
    }

    const trips = await CarpoolTrip.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(maxDistance),
      {
        seats: seats ? parseInt(seats) : undefined,
        departureAfter: departureAfter ? new Date(departureAfter) : undefined,
        departureBefore: departureBefore ? new Date(departureBefore) : undefined
      }
    );

    return res.json({
      success: true,
      data: trips,
      meta: {
        center: { longitude, latitude },
        radius: maxDistance
      }
    });
  } catch (error) {
    console.error('查找附近拼车失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'FIND_NEARBY_ERROR'
    });
  }
};

/**
 * 智能匹配
 */
exports.smartMatch = async (req, res) => {
  try {
    const { origin, destination, departureTime, seats } = req.body;

    if (!origin || !destination || !departureTime) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        code: 'MISSING_PARAMETERS'
      });
    }

    const trips = await CarpoolTrip.smartMatch({
      origin: [parseFloat(origin.lng), parseFloat(origin.lat)],
      destination: [parseFloat(destination.lng), parseFloat(destination.lat)],
      departureTime: new Date(departureTime),
      seats: parseInt(seats) || 1
    });

    return res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    console.error('智能匹配失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'SMART_MATCH_ERROR'
    });
  }
};

// ============== 工具函数 ==============

/**
 * 计算两点间距离（简化版）
 * 使用Haversine公式
 */
function calculateDistance(coords1, coords2) {
  const R = 6371; // 地球半径(km)
  const dLat = toRad(coords2[1] - coords1[1]);
  const dLon = toRad(coords2[0] - coords1[0]);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coords1[1])) * Math.cos(toRad(coords2[1])) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 保留1位小数
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}
