/**
 * 电商平台控制器
 * 处理农资采购、农产品销售、供应链管理等电商请求
 */

const ecommerceService = require('../services/ecommerceService');

/**
 * 创建农资产品
 */
exports.createAgriculturalProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      subCategory,
      brand,
      description,
      images,
      specifications,
      retailPrice,
      wholesalePrice,
      costPrice,
      unit,
      quantity,
      minQuantity,
      maxQuantity,
      lowStockThreshold,
      supplier,
      tags,
      status
    } = req.body;

    if (!name || !category || !retailPrice) {
      return res.status(400).json({
        success: false,
        message: '产品名称、类别和零售价格不能为空'
      });
    }

    const productData = {
      name,
      category,
      subCategory,
      brand,
      description,
      images,
      specifications,
      retailPrice: parseFloat(retailPrice),
      wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : undefined,
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      unit,
      quantity: quantity ? parseInt(quantity) : 0,
      minQuantity: minQuantity ? parseInt(minQuantity) : 1,
      maxQuantity: maxQuantity ? parseInt(maxQuantity) : 999999,
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : 10,
      supplier,
      tags,
      status: status || 'active',
      createdBy: req.user.id
    };

    const result = await ecommerceService.createAgriculturalProduct(productData);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('创建农资产品失败:', error);
    res.status(500).json({
      success: false,
      message: '创建农资产品失败',
      error: error.message
    });
  }
};

/**
 * 获取农资产品列表
 */
exports.getAgriculturalProducts = async (req, res) => {
  try {
    const {
      category,
      subCategory,
      brand,
      minPrice,
      maxPrice,
      inStock,
      status,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder
    } = req.query;

    const filters = {
      category,
      subCategory,
      brand,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStock: inStock === 'true',
      status,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder ? parseInt(sortOrder) : -1
    };

    const result = await ecommerceService.getAgriculturalProducts(filters);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('获取农资产品列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取农资产品列表失败',
      error: error.message
    });
  }
};

/**
 * 创建订单
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      type,
      items,
      shipping,
      paymentMethod,
      discount,
      shippingFee,
      tax,
      notes
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '订单商品不能为空'
      });
    }

    // 验证订单商品
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: '订单商品信息不完整'
        });
      }
    }

    const orderData = {
      type: type || 'agricultural_purchase',
      buyerId: req.user.id,
      sellerId: items[0].sellerId, // 假设第一个商品的卖家
      items,
      shipping: shipping || {},
      paymentMethod,
      discount: discount ? parseFloat(discount) : 0,
      shippingFee: shippingFee ? parseFloat(shippingFee) : 0,
      tax: tax ? parseFloat(tax) : 0,
      notes,
      createdBy: req.user.id
    };

    const result = await ecommerceService.createOrder(orderData);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败',
      error: error.message
    });
  }
};

/**
 * 处理支付
 */
exports.processPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod, paymentData } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: '订单ID不能为空'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: '支付方式不能为空'
      });
    }

    const result = await ecommerceService.processPayment(orderId, paymentMethod, paymentData);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('处理支付失败:', error);
    res.status(500).json({
      success: false,
      message: '处理支付失败',
      error: error.message
    });
  }
};

/**
 * 订单发货
 */
exports.shipOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const {
      company,
      trackingNumber,
      estimatedDelivery,
      notes
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: '订单ID不能为空'
      });
    }

    if (!company || !trackingNumber) {
      return res.status(400).json({
        success: false,
        message: '物流公司和跟踪单号不能为空'
      });
    }

    const shippingData = {
      company,
      trackingNumber,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      notes
    };

    const result = await ecommerceService.shipOrder(orderId, shippingData);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('订单发货失败:', error);
    res.status(500).json({
      success: false,
      message: '订单发货失败',
      error: error.message
    });
  }
};

/**
 * 完成订单
 */
exports.completeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, feedback } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: '订单ID不能为空'
      });
    }

    const completionData = {};
    if (rating !== undefined) {
      completionData.rating = parseInt(rating);
    }
    if (feedback) {
      completionData.feedback = feedback;
    }

    const result = await ecommerceService.completeOrder(orderId, completionData);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('完成订单失败:', error);
    res.status(500).json({
      success: false,
      message: '完成订单失败',
      error: error.message
    });
  }
};

/**
 * 获取订单列表
 */
exports.getOrders = async (req, res) => {
  try {
    const {
      buyerId,
      sellerId,
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder
    } = req.query;

    const filters = {
      buyerId: buyerId || (req.user.role === 'user' ? req.user.id : undefined),
      sellerId: sellerId,
      status,
      type,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder ? parseInt(sortOrder) : -1
    };

    const result = await ecommerceService.getOrders(filters);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败',
      error: error.message
    });
  }
};

/**
 * 创建农产品供应信息
 */
exports.createFarmProductSupply = async (req, res) => {
  try {
    const {
      productName,
      category,
      variety,
      description,
      images,
      quantity,
      unit,
      minPrice,
      maxPrice,
      negotiable,
      grade,
      certification,
      inspectionDate,
      inspectionReport,
      harvestDate,
      season,
      method,
      location,
      startDate,
      endDate,
      continuous,
      shippingAvailable,
      shippingMethods,
      shippingRadius,
      status
    } = req.body;

    if (!productName || !category || !quantity || !minPrice || !maxPrice) {
      return res.status(400).json({
        success: false,
        message: '产品名称、类别、数量和价格范围不能为空'
      });
    }

    const supplyData = {
      farmerId: req.user.id,
      villageId: req.user.villageId,
      productName,
      category,
      variety,
      description,
      images,
      quantity: parseFloat(quantity),
      unit: unit || 'kg',
      price: {
        minPrice: parseFloat(minPrice),
        maxPrice: parseFloat(maxPrice),
        negotiable: negotiable || false
      },
      quality: {
        grade: grade || 'A',
        certification: certification || [],
        inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
        inspectionReport
      },
      harvest: {
        date: harvestDate ? new Date(harvestDate) : null,
        season,
        method
      },
      location,
      availability: {
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        continuous: continuous || false
      },
      shipping: {
        available: shippingAvailable !== undefined ? shippingAvailable : true,
        methods: shippingMethods || ['pickup'],
        radius: shippingRadius ? parseInt(shippingRadius) : 50
      },
      status: status || 'available'
    };

    const result = await ecommerceService.createFarmProductSupply(supplyData);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('创建农产品供应信息失败:', error);
    res.status(500).json({
      success: false,
      message: '创建农产品供应信息失败',
      error: error.message
    });
  }
};

/**
 * 获取农产品供应列表
 */
exports.getFarmProductSupplies = async (req, res) => {
  try {
    const {
      farmerId,
      villageId,
      category,
      grade,
      minPrice,
      maxPrice,
      available,
      status,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder
    } = req.query;

    const filters = {
      farmerId,
      villageId: villageId || (req.user.role === 'farmer' ? req.user.villageId : undefined),
      category,
      grade,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      available: available !== undefined ? available === 'true' : undefined,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder ? parseInt(sortOrder) : -1
    };

    const result = await ecommerceService.getFarmProductSupplies(filters);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('获取农产品供应列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取农产品供应列表失败',
      error: error.message
    });
  }
};

/**
 * 同步第三方平台商品
 */
exports.syncPlatformProducts = async (req, res) => {
  try {
    const { platform, category } = req.body;

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: '平台名称不能为空'
      });
    }

    const result = await ecommerceService.syncPlatformProducts(platform, category);

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('同步平台商品失败:', error);
    res.status(500).json({
      success: false,
      message: '同步平台商品失败',
      error: error.message
    });
  }
};

/**
 * 获取商品详情
 */
exports.getProductDetail = async (req, res) => {
  try {
    const { productId } = req.params;
    const { type = 'agricultural' } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: '产品ID不能为空'
      });
    }

    let product;

    if (type === 'agricultural') {
      const AgriculturalProduct = require('../models/AgriculturalProduct');
      product = await AgriculturalProduct.findById(productId)
        .populate('supplier', 'name contactPhone')
        .populate('createdBy', 'name');
    } else if (type === 'farm_supply') {
      const FarmProductSupply = require('../models/FarmProductSupply');
      product = await FarmProductSupply.findById(productId)
        .populate('farmerId', 'name phone')
        .populate('villageId', 'name');
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在'
      });
    }

    res.json({
      success: true,
      data: product,
      message: '获取产品详情成功'
    });

  } catch (error) {
    console.error('获取产品详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取产品详情失败',
      error: error.message
    });
  }
};

/**
 * 更新产品信息
 */
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { type = 'agricultural' } = req.query;
    const updateData = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: '产品ID不能为空'
      });
    }

    let Model;

    if (type === 'agricultural') {
      Model = require('../models/AgriculturalProduct');
    } else if (type === 'farm_supply') {
      Model = require('../models/FarmProductSupply');
    }

    const product = await Model.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在'
      });
    }

    // 检查权限
    if (product.createdBy?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限修改此产品'
      });
    }

    // 更新产品信息
    Object.assign(product, updateData);
    product.updatedAt = new Date();

    const result = await product.save();

    res.json({
      success: true,
      data: result,
      message: '产品更新成功'
    });

  } catch (error) {
    console.error('更新产品失败:', error);
    res.status(500).json({
      success: false,
      message: '更新产品失败',
      error: error.message
    });
  }
};

/**
 * 删除产品
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { type = 'agricultural' } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: '产品ID不能为空'
      });
    }

    let Model;

    if (type === 'agricultural') {
      Model = require('../models/AgriculturalProduct');
    } else if (type === 'farm_supply') {
      Model = require('../models/FarmProductSupply');
    }

    const product = await Model.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '产品不存在'
      });
    }

    // 检查权限
    if (product.createdBy?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权限删除此产品'
      });
    }

    // 软删除（设置为inactive状态）
    product.status = 'inactive';
    product.updatedAt = new Date();

    await product.save();

    res.json({
      success: true,
      message: '产品删除成功'
    });

  } catch (error) {
    console.error('删除产品失败:', error);
    res.status(500).json({
      success: false,
      message: '删除产品失败',
      error: error.message
    });
  }
};

/**
 * 获取购物车
 */
exports.getShoppingCart = async (req, res) => {
  try {
    const ShoppingCart = require('../models/ShoppingCart');

    let cart = await ShoppingCart.findOne({ userId: req.user.id })
      .populate('items.productId', 'name images pricing');

    if (!cart) {
      cart = {
        userId: req.user.id,
        items: [],
        totals: {
          items: 0,
          amount: 0
        }
      };
    }

    res.json({
      success: true,
      data: cart,
      message: '获取购物车成功'
    });

  } catch (error) {
    console.error('获取购物车失败:', error);
    res.status(500).json({
      success: false,
      message: '获取购物车失败',
      error: error.message
    });
  }
};

/**
 * 更新购物车
 */
exports.updateShoppingCart = async (req, res) => {
  try {
    const { items } = req.body;
    const ShoppingCart = require('../models/ShoppingCart');

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: '购物车商品不能为空'
      });
    }

    let cart = await ShoppingCart.findOne({ userId: req.user.id });

    if (!cart) {
      cart = new ShoppingCart({ userId: req.user.id });
    }

    // 更新购物车商品
    cart.items = items;
    cart.updatedAt = new Date();

    // 计算总计
    let totalItems = 0;
    let totalAmount = 0;

    items.forEach(item => {
      totalItems += item.quantity || 0;
      totalAmount += (item.price || 0) * (item.quantity || 0);
    });

    cart.totals = {
      items: totalItems,
      amount: totalAmount
    };

    const result = await cart.save();

    res.json({
      success: true,
      data: result,
      message: '购物车更新成功'
    });

  } catch (error) {
    console.error('更新购物车失败:', error);
    res.status(500).json({
      success: false,
      message: '更新购物车失败',
      error: error.message
    });
  }
};

/**
 * 清空购物车
 */
exports.clearShoppingCart = async (req, res) => {
  try {
    const ShoppingCart = require('../models/ShoppingCart');

    await ShoppingCart.findOneAndUpdate(
      { userId: req.user.id },
      {
        items: [],
        totals: { items: 0, amount: 0 },
        updatedAt: new Date()
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: '购物车清空成功'
    });

  } catch (error) {
    console.error('清空购物车失败:', error);
    res.status(500).json({
      success: false,
      message: '清空购物车失败',
      error: error.message
    });
  }
};

/**
 * 获取服务状态
 */
exports.getServiceStatus = async (req, res) => {
  try {
    const status = ecommerceService.getServiceStatus();

    res.json({
      success: true,
      data: status,
      message: '获取服务状态成功'
    });

  } catch (error) {
    console.error('获取服务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取服务状态失败',
      error: error.message
    });
  }
};