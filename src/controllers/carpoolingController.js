/**
 * 拼车服务控制器
 *
 * 处理拼车发布、搜索、加入、取消、评价等HTTP请求
 */

const logger = require('../utils/logger');

// 临时使用模拟数据，后续需要连接真实的 carpoolingService
const mockCarpools = [
  {
    _id: '67890abcdef12345',
    type: 'driver',
    origin: {
      address: '杭州市西湖区文三路',
      location: { type: 'Point', coordinates: [120.1536, 30.2875] }
    },
    destination: {
      address: '杭州市萧山国际机场',
      location: { type: 'Point', coordinates: [120.4436, 30.2295] }
    },
    departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    seats: 4,
    availableSeats: 2,
    price: 50,
    vehicleInfo: {
      brand: '大众',
      model: '帕萨特',
      color: '黑色',
      plateNumber: '浙A·12345'
    },
    driver: {
      name: '张师傅',
      phone: '138****5678',
      rating: 4.8
    },
    requirements: '无吸烟要求',
    notes: '准时出发，过时不候',
    status: 'active',
    createdAt: new Date()
  },
  {
    _id: '67890abcdef12346',
    type: 'passenger',
    origin: {
      address: '杭州市余杭区阿里巴巴园区',
      location: { type: 'Point', coordinates: [120.1872, 30.2846] }
    },
    destination: {
      address: '杭州市上城区城站火车站',
      location: { type: 'Point', coordinates: [120.1908, 30.2547] }
    },
    departureTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
    seats: 1,
    price: 30,
    passenger: {
      name: '李女士',
      phone: '139****8765',
      rating: 4.5
    },
    notes: '行李较多，需要后备箱空间',
    status: 'active',
    createdAt: new Date()
  }
];

/**
 * 发布拼车信息
 * POST /api/v1/carpooling/publish
 */
exports.publish = async (req, res) => {
  try {
    const userId = req.user?.id || 'mock_user_id';
    const carpoolData = req.body;

    // 验证必填字段
    if (!carpoolData.type || !carpoolData.origin || !carpoolData.destination || !carpoolData.departureTime) {
      return res.status(400).json({
        success: false,
        message: '请填写完整的拼车信息'
      });
    }

    // 车主需要提供车辆信息
    if (carpoolData.type === 'driver' && !carpoolData.vehicleInfo) {
      return res.status(400).json({
        success: false,
        message: '车主需要提供车辆信息'
      });
    }

    // 创建拼车信息（模拟）
    const newCarpool = {
      _id: Date.now().toString(),
      userId,
      ...carpoolData,
      status: 'active',
      createdAt: new Date()
    };

    mockCarpools.push(newCarpool);

    res.status(201).json({
      success: true,
      message: '发布成功',
      data: newCarpool
    });

  } catch (error) {
    logger.error('发布拼车失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '发布失败'
    });
  }
};

/**
 * 搜索拼车信息
 * GET /api/v1/carpooling/search
 */
exports.search = async (req, res) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      type,
      minPrice,
      maxPrice,
      minSeats,
      page = 1,
      limit = 20
    } = req.query;

    // 模拟搜索逻辑
    let results = mockCarpools.filter(c => c.status === 'active');

    // 类型筛选
    if (type) {
      results = results.filter(c => c.type === type);
    }

    // 价格筛选
    if (minPrice) {
      results = results.filter(c => c.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      results = results.filter(c => c.price <= parseFloat(maxPrice));
    }

    // 座位筛选
    if (minSeats) {
      results = results.filter(c => c.availableSeats >= parseInt(minSeats));
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults,
      total: results.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    logger.error('搜索拼车失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '搜索失败'
    });
  }
};

/**
 * 获取拼车详情
 * GET /api/v1/carpooling/:id
 */
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const carpool = mockCarpools.find(c => c._id === id);

    if (!carpool) {
      return res.status(404).json({
        success: false,
        message: '拼车信息不存在'
      });
    }

    res.json({
      success: true,
      data: carpool
    });

  } catch (error) {
    logger.error('获取拼车详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取详情失败'
    });
  }
};

/**
 * 获取用户的拼车历史
 * GET /api/v1/carpooling/history
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user?.id || 'mock_user_id';
    const { status, type, page = 1, limit = 20 } = req.query;

    // 模拟获取用户历史
    let results = mockCarpools.filter(c => c.userId === userId);

    if (status) {
      results = results.filter(c => c.status === status);
    }
    if (type) {
      results = results.filter(c => c.type === type);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults,
      total: results.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    logger.error('获取拼车历史失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取历史失败'
    });
  }
};

/**
 * 加入拼车
 * POST /api/v1/carpooling/:id/join
 */
exports.join = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'mock_user_id';
    const { name, phone, seats, pickupLocation } = req.body;

    const carpool = mockCarpools.find(c => c._id === id);

    if (!carpool) {
      return res.status(404).json({
        success: false,
        message: '拼车信息不存在'
      });
    }

    if (carpool.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: '该拼车已结束'
      });
    }

    if (carpool.availableSeats < seats) {
      return res.status(400).json({
        success: false,
        message: '可用座位不足'
      });
    }

    // 更新可用座位
    carpool.availableSeats -= seats;

    if (!carpool.passengers) {
      carpool.passengers = [];
    }

    carpool.passengers.push({
      userId,
      name,
      phone,
      seats,
      pickupLocation,
      status: 'pending',
      joinTime: new Date()
    });

    res.json({
      success: true,
      message: '申请成功，等待车主确认',
      data: carpool
    });

  } catch (error) {
    logger.error('加入拼车失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '加入失败'
    });
  }
};

/**
 * 确认乘客（车主）
 * PUT /api/v1/carpooling/:id/confirm
 */
exports.confirmPassenger = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'mock_user_id';
    const { passengerId } = req.body;

    const carpool = mockCarpools.find(c => c._id === id);

    if (!carpool) {
      return res.status(404).json({
        success: false,
        message: '拼车信息不存在'
      });
    }

    if (carpool.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有车主可以确认乘客'
      });
    }

    const passenger = carpool.passengers?.find(p => p.userId === passengerId);
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: '乘客不存在'
      });
    }

    passenger.status = 'confirmed';

    res.json({
      success: true,
      message: '确认成功',
      data: carpool
    });

  } catch (error) {
    logger.error('确认乘客失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '确认失败'
    });
  }
};

/**
 * 更新拼车状态
 * PUT /api/v1/carpooling/:id/status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'mock_user_id';
    const { status } = req.body;

    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态'
      });
    }

    const carpool = mockCarpools.find(c => c._id === id);

    if (!carpool) {
      return res.status(404).json({
        success: false,
        message: '拼车信息不存在'
      });
    }

    if (carpool.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有发布者可以更新状态'
      });
    }

    carpool.status = status;

    res.json({
      success: true,
      message: '状态更新成功',
      data: carpool
    });

  } catch (error) {
    logger.error('更新状态失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新失败'
    });
  }
};

/**
 * 取消拼车
 * DELETE /api/v1/carpooling/:id/cancel
 */
exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'mock_user_id';
    const { reason } = req.body;

    const carpool = mockCarpools.find(c => c._id === id);

    if (!carpool) {
      return res.status(404).json({
        success: false,
        message: '拼车信息不存在'
      });
    }

    if (carpool.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有发布者可以取消'
      });
    }

    carpool.status = 'cancelled';
    carpool.cancelReason = reason;
    carpool.cancelTime = new Date();

    res.json({
      success: true,
      message: '取消成功',
      data: carpool
    });

  } catch (error) {
    logger.error('取消拼车失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取消失败'
    });
  }
};

/**
 * 评价拼车
 * POST /api/v1/carpooling/:id/rate
 */
exports.rate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'mock_user_id';
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: '评分必须在1-5之间'
      });
    }

    const carpool = mockCarpools.find(c => c._id === id);

    if (!carpool) {
      return res.status(404).json({
        success: false,
        message: '拼车信息不存在'
      });
    }

    if (carpool.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '只能评价已完成的拼车'
      });
    }

    // 添加评价（模拟）
    if (!carpool.ratings) {
      carpool.ratings = [];
    }

    carpool.ratings.push({
      userId,
      rating,
      comment,
      createdAt: new Date()
    });

    // 计算平均评分
    const avgRating = carpool.ratings.reduce((sum, r) => sum + r.rating, 0) / carpool.ratings.length;
    carpool.rating = {
      average: avgRating,
      count: carpool.ratings.length
    };

    res.json({
      success: true,
      message: '评价成功',
      data: carpool
    });

  } catch (error) {
    logger.error('评价失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '评价失败'
    });
  }
};
