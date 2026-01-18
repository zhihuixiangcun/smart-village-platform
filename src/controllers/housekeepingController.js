const ServiceProvider = require('../models/ServiceProvider');
const HousekeepingOrder = require('../models/HousekeepingOrder');

const getProviders = async (req, res) => {
  try {
    const { type, isVerified, isAvailable, tags, sortBy, page = 1, limit = 20 } = req.query;
    const filters = {
      villageId: req.user.villageId,
    };
    if (type) filters.type = type;
    if (isVerified) filters.isVerified = isVerified === 'true';
    if (isAvailable) filters.isAvailable = isAvailable === 'true';
    if (tags) filters.tags = { $in: tags.split(',') };
    
    let sortOption = { createdAt: -1 };
    if (sortBy === 'rating') sortOption = { 'rating.average': -1 };
    if (sortBy === 'orders') sortOption = { orderCount: -1 };
    
    const providerList = await ServiceProvider.find(filters)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await ServiceProvider.countDocuments(filters);
    
    res.json({
      success: true,
      data: providerList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取服务商列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getProviderById = async (req, res) => {
  try {
    const provider = await ServiceProvider.findOne({
      _id: req.params.id,
      villageId: req.user.villageId,
    });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: '服务商不存在',
      });
    }
    
    res.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    console.error('获取服务商详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      userId: req.user.id,
      villageId: req.user.villageId,
    };
    const order = new HousekeepingOrder(orderData);
    
    const serviceProvider = await ServiceProvider.findById(orderData.serviceProviderId);
    if (serviceProvider) {
      await serviceProvider.incrementOrderCount();
    }
    
    await order.addTimeline('订单创建', 'pending', '订单已创建', req.user.id);
    
    res.status(201).json({
      success: true,
      data: order,
      message: '订单创建成功',
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const { status, serviceType, page = 1, limit = 20 } = req.query;
    const filters = { userId: req.user.id };
    if (status) filters.status = status;
    if (serviceType) filters.serviceType = serviceType;
    
    const [orders, total] = await Promise.all([
      HousekeepingOrder.find(filters)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('serviceProviderId'),
      HousekeepingOrder.countDocuments({ userId: req.user.id, ...filters }),
    ]);
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await HousekeepingOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('serviceProviderId');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
      });
    }
    
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateOrder = async (req, res) => {
  try {
    const order = await HousekeepingOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
      });
    }
    
    Object.assign(order, req.body);
    await order.save();
    
    res.json({
      success: true,
      data: order,
      message: '订单更新成功',
    });
  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await HousekeepingOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
      });
    }
    
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: '订单状态不允许取消',
      });
    }
    
    const { reason } = req.body;
    await order.updateStatus('cancelled', reason || '用户取消', req.user.name);
    
    await ServiceProvider.findByIdAndUpdate(order.serviceProviderId, {
      $inc: { 'statistics.cancelledOrders': 1 },
    });
    
    res.json({
      success: true,
      data: order,
      message: '订单已取消',
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const evaluateOrder = async (req, res) => {
  try {
    const order = await HousekeepingOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
      });
    }
    
    if (order.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: '只能评价已完成的订单',
      });
    }
    
    const { rating, comment } = req.body;
    order.rating = rating;
    order.comment = comment;
    await order.save();
    
    await ServiceProvider.findByIdAndUpdate(order.serviceProviderId).then(provider => {
      provider.updateRating(rating);
    });
    
    res.json({
      success: true,
      data: order,
      message: '评价成功',
    });
  } catch (error) {
    console.error('评价订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getServiceTypes = async (req, res) => {
  try {
    const types = await ServiceProvider.getServiceTypes();
    
    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error('获取服务类型失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  getProviders,
  getProviderById,
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  evaluateOrder,
  getServiceTypes,
};
