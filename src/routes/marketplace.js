/**
 * 市场相关路由
 */
const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/marketplace/products/nearby
 * @desc    获取附近商品
 * @access  Public
 */
router.get('/products/nearby', marketplaceController.getNearbyProducts);

/**
 * @route   GET /api/marketplace/products/:id
 * @desc    获取商品详情
 * @access  Public
 */
router.get('/products/:id', marketplaceController.getProductDetail);

/**
 * @route   POST /api/marketplace/products
 * @desc    发布商品
 * @access  Private
 */
router.post('/products', authenticate, marketplaceController.publishProduct);

/**
 * @route   GET /api/marketplace/merchants/nearby
 * @desc    获取附近商家
 * @access  Public
 */
router.get('/merchants/nearby', async (req, res) => {
  try {
    const { longitude, latitude, radius = 5000, type } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        error: '缺少位置信息'
      });
    }

    // TODO: 实现附近商家查询逻辑
    res.json({
      success: true,
      data: [],
      message: '功能开发中'
    });
  } catch (error) {
    console.error('获取附近商家失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

/**
 * @route   GET /api/marketplaces/venues/nearby
 * @desc    获取附近场所（餐厅、景点等）
 * @access  Public
 */
router.get('/venues/nearby', async (req, res) => {
  try {
    const { longitude, latitude, radius = 5000, category } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        error: '缺少位置信息'
      });
    }

    // TODO: 实现附近场所查询逻辑
    res.json({
      success: true,
      data: [],
      message: '功能开发中'
    });
  } catch (error) {
    console.error('获取附近场所失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

/**
 * @route   GET /api/marketplace/carpool/search
 * @desc    搜索拼车信息
 * @access  Public
 */
router.get('/carpool/search', async (req, res) => {
  try {
    const { from, to, date, seats } = req.query;

    // TODO: 实现拼车搜索逻辑
    const Carpool = require('../models/Carpooling');

    const query = { status: 'active' };

    if (from) {
      query.fromLocation = { $regex: from, $options: 'i' };
    }

    if (to) {
      query.toLocation = { $regex: to, $options: 'i' };
    }

    if (date) {
      query.departureTime = {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59, 999)
      };
    }

    if (seats) {
      query.availableSeats = { $gte: parseInt(seats) };
    }

    const carpools = await Carpool.find(query)
      .populate('driverId', 'username name avatar phone rating')
      .sort({ departureTime: 1 });

    res.json({
      success: true,
      data: carpools
    });
  } catch (error) {
    console.error('搜索拼车失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

/**
 * @route   POST /api/marketplace/carpool
 * @desc    发布拼车信息
 * @access  Private
 */
router.post('/carpool', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fromLocation,
      toLocation,
      departureTime,
      availableSeats,
      pricePerSeat,
      vehicleType,
      note
    } = req.body;

    const Carpool = require('../models/Carpooling');

    const carpool = new Carpool({
      driverId: userId,
      fromLocation,
      toLocation,
      departureTime: new Date(departureTime),
      availableSeats,
      totalSeats: availableSeats,
      pricePerSeat,
      vehicleType,
      note,
      status: 'active'
    });

    await carpool.save();

    // 奖励积分
    const Points = require('../models/Points');
    await Points.findOneAndUpdate(
      { userId },
      {
        $inc: { total: 5, available: 5 },
        $push: {
          history: {
            type: 'earn',
            amount: 5,
            reason: '发布拼车',
            relatedId: carpool._id,
            createdAt: new Date()
          }
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: carpool,
      message: '发布成功！积分+5'
    });
  } catch (error) {
    console.error('发布拼车失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

/**
 * @route   POST /api/marketplace/carpool/:id/book
 * @desc    预订拼车
 * @access  Private
 */
router.post('/carpool/:id/book', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { seats } = req.body;

    const Carpool = require('../models/Carpooling');

    const carpool = await Carpool.findById(id);

    if (!carpool) {
      return res.status(404).json({
        success: false,
        error: '拼车信息不存在'
      });
    }

    if (carpool.availableSeats < seats) {
      return res.status(400).json({
        success: false,
        error: '座位不足'
      });
    }

    // 更新座位数
    carpool.availableSeats -= seats;

    if (carpool.availableSeats === 0) {
      carpool.status = 'full';
    }

    await carpool.save();

    // 发送通知给司机
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: carpool.driverId,
      type: 'carpool',
      title: '新的拼车预订',
      content: `有人预订了您的拼车服务，座位数：${seats}`,
      data: {
        carpoolId: carpool._id,
        passengerId: userId,
        seats
      },
      isRead: false
    });

    res.json({
      success: true,
      message: '预订成功！司机将很快与您联系'
    });
  } catch (error) {
    console.error('预订拼车失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

module.exports = router;
