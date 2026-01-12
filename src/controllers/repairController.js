const RepairOrder = require('../models/RepairOrder');

const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      userId: req.user.id,
      villageId: req.user.villageId,
    };
    const order = await RepairOrder.create(orderData);
    order.addTimeline('pending', '维修订单已创建', req.user.name);
    await order.save();
    
    res.status(201).json({
      success: true,
      data: order,
      message: '订单创建成功',
    });
  } catch (error) {
    console.error('创建维修订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const { status, repairType, priority, page = 1, limit = 20 } = req.query;
    const filters = { userId: req.user.id };
    if (status) filters.status = status;
    if (repairType) filters.repairType = repairType;
    if (priority) filters.priority = priority;
    
    const [orders, total] = await Promise.all([
      RepairOrder.getUserOrders(req.user.id, {
        ...filters,
        skip: (page - 1) * limit,
        limit: parseInt(limit),
      }),
      RepairOrder.countDocuments({ userId: req.user.id, ...filters }),
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
    console.error('获取维修订单列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await RepairOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).populate('technicianId');
    
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
    console.error('获取维修订单详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateOrder = async (req, res) => {
  try {
    const order = await RepairOrder.findOne({
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
    console.error('更新维修订单失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await RepairOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
      });
    }
    
    const { status, note } = req.body;
    await order.updateStatus(status, note, req.user.name);
    
    res.json({
      success: true,
      data: order,
      message: '订单状态更新成功',
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const quoteOrder = async (req, res) => {
  try {
    const order = await RepairOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
      });
    }
    
    const { estimatedPrice, diagnosis } = req.body;
    order.estimatedPrice = estimatedPrice;
    order.diagnosis = diagnosis;
    await order.updateStatus('confirmed', '维修师傅已报价', '维修师傅');
    
    res.json({
      success: true,
      data: order,
      message: '报价成功',
    });
  } catch (error) {
    console.error('报价失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const completeOrder = async (req, res) => {
  try {
    const order = await RepairOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在',
      });
    }
    
    const { laborCost, partsUsed, solution, warranty } = req.body;
    if (partsUsed && partsUsed.length > 0) {
      partsUsed.forEach(part => order.addPart(part));
    }
    order.laborCost = laborCost;
    order.solution = solution;
    if (warranty) order.warranty = warranty;
    
    await order.updateStatus('completed', '维修已完成', req.user.name);
    
    res.json({
      success: true,
      data: order,
      message: '维修完成',
    });
  } catch (error) {
    console.error('完成维修失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await RepairOrder.findOne({
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
    const order = await RepairOrder.findOne({
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

const getRepairTypes = async (req, res) => {
  try {
    const types = [
      {
        value: 'appliance',
        label: '家电维修',
        icon: 'balance-o',
        subTypes: ['冰箱', '空调', '洗衣机', '热水器', '电视', '微波炉'],
      },
      {
        value: 'plumbing',
        label: '水电维修',
        icon: 'service-o',
        subTypes: ['水管漏水', '电路故障', '灯具更换', '插座维修', '水龙头维修'],
      },
      {
        value: 'electrical',
        label: '电路维修',
        icon: 'bolt',
        subTypes: ['短路检测', '电路改造', '开关维修', '配电箱维修'],
      },
      {
        value: 'general',
        label: '其他维修',
        icon: 'wrench-o',
        subTypes: ['门窗维修', '墙面修补', '地板维修', '其他'],
      },
    ];
    
    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error('获取维修类型失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getOrderStatistics = async (req, res) => {
  try {
    const villageId = req.user.villageId;
    const statistics = await RepairOrder.getOrderStatistics(villageId);
    
    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('获取订单统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  quoteOrder,
  completeOrder,
  cancelOrder,
  evaluateOrder,
  getRepairTypes,
  getOrderStatistics,
};
