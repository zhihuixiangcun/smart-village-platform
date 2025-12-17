/**
 * 支付控制器
 * 处理微信支付、支付宝等第三方支付接口
 */

const paymentService = require('../services/paymentService');
const PaymentRecord = require('../models/PaymentRecord');

/**
 * 创建支付订单
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      orderId,
      amount,
      description,
      type,
      userId,
      villageId,
      businessType,
      businessId,
      returnUrl,
      openid,
      paymentMethod
    } = req.body;

    if (!orderId || !amount || !description || !type || !userId || !villageId) {
      return res.status(400).json({
        success: false,
        message: '订单信息不完整'
      });
    }

    // 验证金额
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '支付金额必须大于0'
      });
    }

    // 检查订单是否已存在
    const existingOrder = await PaymentRecord.findOne({ orderId });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: '订单已存在'
      });
    }

    let paymentResult;

    // 根据支付类型创建订单
    switch (type) {
    case 'wechat':
      paymentResult = await paymentService.createWechatOrder({
        orderId,
        amount,
        description,
        userId,
        villageId,
        type: paymentMethod === 'h5' ? 'h5' : 'native',
        openid,
        businessType,
        businessId
      });
      break;

    case 'alipay':
      paymentResult = await paymentService.createAlipayOrder({
        orderId,
        amount,
        description,
        userId,
        villageId,
        businessType,
        businessId,
        returnUrl,
        type: paymentMethod
      });
      break;

    default:
      return res.status(400).json({
        success: false,
        message: '不支持的支付类型'
      });
    }

    res.json({
      success: true,
      data: paymentResult,
      message: '支付订单创建成功'
    });

  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建支付订单失败',
      error: error.message
    });
  }
};

/**
 * 查询支付状态
 */
exports.queryPaymentStatus = async (req, res) => {
  try {
    const { orderId, type } = req.query;

    if (!orderId || !type) {
      return res.status(400).json({
        success: false,
        message: '订单ID和支付类型不能为空'
      });
    }

    const result = await paymentService.queryPaymentStatus(orderId, type);

    res.json({
      success: true,
      data: result,
      message: '查询成功'
    });

  } catch (error) {
    console.error('查询支付状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询支付状态失败',
      error: error.message
    });
  }
};

/**
 * 申请退款
 */
exports.refundPayment = async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: '订单ID和退款金额不能为空'
      });
    }

    // 验证订单存在
    const paymentRecord = await PaymentRecord.findOne({ orderId });
    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 验证支付状态
    if (!paymentRecord.isPaid) {
      return res.status(400).json({
        success: false,
        message: '订单未支付，无法退款'
      });
    }

    // 验证退款金额
    if (amount > paymentRecord.amount) {
      return res.status(400).json({
        success: false,
        message: '退款金额不能超过支付金额'
      });
    }

    // 验证是否已退款
    if (paymentRecord.isRefunded) {
      return res.status(400).json({
        success: false,
        message: '订单已退款'
      });
    }

    const result = await paymentService.refundPayment(orderId, amount, reason);

    res.json({
      success: true,
      data: result,
      message: '退款申请已提交'
    });

  } catch (error) {
    console.error('申请退款失败:', error);
    res.status(500).json({
      success: false,
      message: '申请退款失败',
      error: error.message
    });
  }
};

/**
 * 处理支付回调
 */
exports.handlePaymentCallback = async (req, res) => {
  try {
    const { type } = req.params;
    let callbackData;

    if (type === 'wechat') {
      // 微信支付回调是XML格式
      callbackData = req.body;
    } else if (type === 'alipay') {
      // 支付宝回调是表单格式
      callbackData = req.body;
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的回调类型'
      });
    }

    const result = await paymentService.verifyPaymentCallback(type, callbackData);

    // 微信支付需要返回XML格式响应
    if (type === 'wechat') {
      res.set('Content-Type', 'application/xml');
      res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
    } else {
      res.json({
        success: true,
        message: '回调验证成功'
      });
    }

    // 可以在这里发送通知或更新其他业务逻辑

  } catch (error) {
    console.error('处理支付回调失败:', error);

    // 微信支付需要返回XML格式响应
    if (type === 'wechat') {
      res.set('Content-Type', 'application/xml');
      res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>');
    } else {
      res.status(500).json({
        success: false,
        message: '回调验证失败'
      });
    }
  }
};

/**
 * 获取支付记录
 */
exports.getPaymentRecord = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: '订单ID不能为空'
      });
    }

    const paymentRecord = await PaymentRecord.getPaymentByOrderId(orderId);

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: '支付记录不存在'
      });
    }

    res.json({
      success: true,
      data: paymentRecord,
      message: '获取支付记录成功'
    });

  } catch (error) {
    console.error('获取支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付记录失败',
      error: error.message
    });
  }
};

/**
 * 获取用户支付记录
 */
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      status,
      businessType,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    const result = await PaymentRecord.getPaymentsByUserId(userId, {
      status,
      businessType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // 获取统计数据
    const stats = await PaymentRecord.getPaymentStats();

    res.json({
      success: true,
      data: {
        payments: result,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.length
        }
      },
      message: '获取支付记录成功'
    });

  } catch (error) {
    console.error('获取用户支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付记录失败',
      error: error.message
    });
  }
};

/**
 * 获取村庄支付记录
 */
exports.getVillagePayments = async (req, res) => {
  try {
    const { villageId } = req.params;
    const {
      status,
      businessType,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: '村庄ID不能为空'
      });
    }

    const result = await PaymentRecord.getPaymentsByVillage(villageId, {
      status,
      businessType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // 获取统计数据
    const stats = await PaymentRecord.getPaymentStats(villageId);

    res.json({
      success: true,
      data: {
        payments: result,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.length
        }
      },
      message: '获取村庄支付记录成功'
    });

  } catch (error) {
    console.error('获取村庄支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付记录失败',
      error: error.message
    });
  }
};

/**
 * 获取支付统计
 */
exports.getPaymentStats = async (req, res) => {
  try {
    const { villageId, days = 30 } = req.query;

    const stats = await PaymentRecord.getPaymentStats(villageId, parseInt(days));

    res.json({
      success: true,
      data: stats,
      message: '获取支付统计成功'
    });

  } catch (error) {
    console.error('获取支付统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付统计失败',
      error: error.message
    });
  }
};

/**
 * 获取每日支付统计
 */
exports.getDailyPaymentStats = async (req, res) => {
  try {
    const { villageId, days = 7 } = req.query;

    const stats = await PaymentRecord.getDailyPaymentStats(villageId, parseInt(days));

    res.json({
      success: true,
      data: stats,
      message: '获取每日支付统计成功'
    });

  } catch (error) {
    console.error('获取每日支付统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取每日支付统计失败',
      error: error.message
    });
  }
};

/**
 * 获取业务类型统计
 */
exports.getBusinessTypeStats = async (req, res) => {
  try {
    const { villageId } = req.query;

    const stats = await PaymentRecord.getBusinessTypeStats(villageId);

    res.json({
      success: true,
      data: stats,
      message: '获取业务类型统计成功'
    });

  } catch (error) {
    console.error('获取业务类型统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取业务类型统计失败',
      error: error.message
    });
  }
};

/**
 * 获取待处理支付订单
 */
exports.getPendingPayments = async (req, res) => {
  try {
    const pendingPayments = await PaymentRecord.getPendingPayments();

    res.json({
      success: true,
      data: pendingPayments,
      message: '获取待处理支付订单成功'
    });

  } catch (error) {
    console.error('获取待处理支付订单失败:', error);
    res.status(500).json({
      success: false,
      message: '获取待处理支付订单失败',
      error: error.message
    });
  }
};

/**
 * 获取失败支付记录
 */
exports.getFailedPayments = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const failedPayments = await PaymentRecord.getFailedPayments(parseInt(days));

    res.json({
      success: true,
      data: failedPayments,
      message: '获取失败支付记录成功'
    });

  } catch (error) {
    console.error('获取失败支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取失败支付记录失败',
      error: error.message
    });
  }
};

/**
 * 获取退款记录
 */
exports.getRefundedPayments = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const refundedPayments = await PaymentRecord.getRefundedPayments(parseInt(days));

    res.json({
      success: true,
      data: refundedPayments,
      message: '获取退款记录成功'
    });

  } catch (error) {
    console.error('获取退款记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取退款记录失败',
      error: error.message
    });
  }
};

/**
 * 重试支付查询
 */
exports.retryPaymentQuery = async (req, res) => {
  try {
    const { orderId, type } = req.body;

    if (!orderId || !type) {
      return res.status(400).json({
        success: false,
        message: '订单ID和支付类型不能为空'
      });
    }

    const paymentRecord = await PaymentRecord.findOne({ orderId });
    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: '支付记录不存在'
      });
    }

    // 增加重试次数
    paymentRecord.retryCount += 1;
    await paymentRecord.save();

    // 重试查询
    const result = await paymentService.queryPaymentStatus(orderId, type);

    // 更新支付状态
    await paymentRecord.updateStatus(result.status, {
      payTime: result.payTime,
      platformOrderId: result.platformOrderId,
      rawData: result.rawData
    });

    res.json({
      success: true,
      data: result,
      message: '支付状态查询成功'
    });

  } catch (error) {
    console.error('重试支付查询失败:', error);
    res.status(500).json({
      success: false,
      message: '重试支付查询失败',
      error: error.message
    });
  }
};

/**
 * 获取支付配置
 */
exports.getPaymentConfig = async (req, res) => {
  try {
    const config = {
      paymentTypes: ['wechat', 'alipay'],
      wechat: {
        appId: process.env.WECHAT_APP_ID ? '***' : '',
        mchId: process.env.WECHAT_MCH_ID ? '***' : '',
        sandbox: process.env.NODE_ENV !== 'production'
      },
      alipay: {
        appId: process.env.ALIPAY_APP_ID ? '***' : '',
        sandbox: process.env.NODE_ENV !== 'production'
      },
      limits: {
        maxAmount: 50000, // 分
        dailyAmount: 500000, // 分
        monthlyAmount: 2000000 // 分
      }
    };

    res.json({
      success: true,
      data: config,
      message: '获取支付配置成功'
    });

  } catch (error) {
    console.error('获取支付配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支付配置失败',
      error: error.message
    });
  }
};