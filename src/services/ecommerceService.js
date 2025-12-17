/**
 * 电商平台服务
 * 集成农资采购、农产品销售、供应链管理等功能
 */

const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');

class EcommerceService {
  constructor() {
    this.config = {
      // 支付配置
      payment: {
        wechat: {
          appId: process.env.WECHAT_APP_ID,
          mchId: process.env.WECHAT_MCH_ID,
          apiKey: process.env.WECHAT_API_KEY,
          notifyUrl: process.env.WECHAT_NOTIFY_URL
        },
        alipay: {
          appId: process.env.ALIPAY_APP_ID,
          privateKey: process.env.ALIPAY_PRIVATE_KEY,
          publicKey: process.env.ALIPAY_PUBLIC_KEY,
          notifyUrl: process.env.ALIPAY_NOTIFY_URL
        }
      },

      // 物流配置
      logistics: {
        default: {
          partnerId: process.env.LOGISTICS_PARTNER_ID,
          apiKey: process.env.LOGISTICS_API_KEY,
          apiUrl: process.env.LOGISTICS_API_URL
        }
      },

      // 第三方平台配置
      platforms: {
        taobao: {
          appKey: process.env.TAOBAO_APP_KEY,
          appSecret: process.env.TAOBAO_APP_SECRET,
          apiUrl: 'https://eco.taobao.com/router/rest'
        },
        jd: {
          appKey: process.env.JD_APP_KEY,
          appSecret: process.env.JD_APP_SECRET,
          apiUrl: 'https://api.jd.com/routerjson'
        }
      }
    };

    // 缓存
    this.productCache = new Map();
    this.orderCache = new Map();
    this.cacheTimeout = 300000; // 5分钟缓存

    // 初始化数据库连接
    this.initDatabase();
  }

  /**
   * 初始化数据库连接
   */
  async initDatabase() {
    try {
      // 确保数据库连接正常
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village');
      }
    } catch (error) {
      console.error('数据库连接失败:', error);
    }
  }

  /**
   * 创建农资产品
   */
  async createAgriculturalProduct(productData) {
    try {
      const AgriculturalProduct = require('../models/AgriculturalProduct');

      const product = new AgriculturalProduct({
        name: productData.name,
        category: productData.category,
        subCategory: productData.subCategory,
        brand: productData.brand,
        description: productData.description,
        images: productData.images || [],
        specifications: productData.specifications || {},
        pricing: {
          retailPrice: productData.retailPrice,
          wholesalePrice: productData.wholesalePrice,
          costPrice: productData.costPrice,
          unit: productData.unit || 'piece'
        },
        inventory: {
          quantity: productData.quantity || 0,
          minQuantity: productData.minQuantity || 1,
          maxQuantity: productData.maxQuantity || 999999,
          lowStockThreshold: productData.lowStockThreshold || 10
        },
        supplier: productData.supplier,
        tags: productData.tags || [],
        status: productData.status || 'active',
        createdBy: productData.createdBy
      });

      const result = await product.save();

      // 清理相关缓存
      this.clearProductCache();

      return {
        success: true,
        data: result,
        message: '农资产品创建成功'
      };
    } catch (error) {
      console.error('创建农资产品失败:', error);
      throw error;
    }
  }

  /**
   * 获取农资产品列表
   */
  async getAgriculturalProducts(filters = {}) {
    try {
      const AgriculturalProduct = require('../models/AgriculturalProduct');

      const {
        category,
        subCategory,
        brand,
        minPrice,
        maxPrice,
        inStock,
        status = 'active',
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = filters;

      // 构建查询条件
      const query = { status };

      if (category) query.category = category;
      if (subCategory) query.subCategory = subCategory;
      if (brand) query.brand = brand;

      if (inStock) {
        query['inventory.quantity'] = { $gt: 0 };
      }

      if (minPrice || maxPrice) {
        query['pricing.retailPrice'] = {};
        if (minPrice) query['pricing.retailPrice'].$gte = minPrice;
        if (maxPrice) query['pricing.retailPrice'].$lte = maxPrice;
      }

      // 执行查询
      const products = await AgriculturalProduct.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('supplier', 'name contactPhone')
        .populate('createdBy', 'name');

      const total = await AgriculturalProduct.countDocuments(query);

      return {
        success: true,
        data: {
          products,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        },
        message: '获取农资产品列表成功'
      };
    } catch (error) {
      console.error('获取农资产品列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建订单
   */
  async createOrder(orderData) {
    try {
      const Order = require('../models/Order');
      const AgriculturalProduct = require('../models/AgriculturalProduct');

      // 验证产品库存
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const product = await AgriculturalProduct.findById(item.productId);
          if (!product) {
            throw new Error(`产品不存在: ${item.productId}`);
          }
          if (product.inventory.quantity < item.quantity) {
            throw new Error(`产品库存不足: ${product.name}`);
          }
        }
      }

      // 计算订单金额
      let totalAmount = 0;
      let totalItems = 0;

      if (orderData.items) {
        orderData.items.forEach(item => {
          const itemTotal = item.price * item.quantity;
          totalAmount += itemTotal;
          totalItems += item.quantity;
        });
      }

      // 生成订单号
      const orderNo = this.generateOrderNo();

      const order = new Order({
        orderNo,
        type: orderData.type || 'agricultural_purchase',
        buyerId: orderData.buyerId,
        sellerId: orderData.sellerId,
        items: orderData.items,
        shipping: orderData.shipping || {},
        payment: {
          method: orderData.paymentMethod,
          status: 'pending',
          amount: totalAmount,
          currency: 'CNY'
        },
        totals: {
          items: totalItems,
          amount: totalAmount,
          discount: orderData.discount || 0,
          shipping: orderData.shippingFee || 0,
          tax: orderData.tax || 0,
          finalAmount: totalAmount + (orderData.shippingFee || 0) + (orderData.tax || 0) - (orderData.discount || 0)
        },
        status: 'pending',
        notes: orderData.notes,
        createdBy: orderData.createdBy
      });

      const result = await order.save();

      // 预扣库存
      await this.reserveInventory(orderData.items);

      // 清理缓存
      this.clearOrderCache();

      return {
        success: true,
        data: result,
        message: '订单创建成功'
      };
    } catch (error) {
      console.error('创建订单失败:', error);
      throw error;
    }
  }

  /**
   * 处理支付
   */
  async processPayment(orderId, paymentMethod, paymentData = {}) {
    try {
      const Order = require('../models/Order');

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('订单不存在');
      }

      if (order.payment.status !== 'pending') {
        throw new Error('订单状态不正确，无法支付');
      }

      let paymentResult;

      switch (paymentMethod) {
      case 'wechat':
        paymentResult = await this.processWechatPayment(order, paymentData);
        break;
      case 'alipay':
        paymentResult = await this.processAlipayPayment(order, paymentData);
        break;
      case 'cash':
        paymentResult = await this.processCashPayment(order, paymentData);
        break;
      default:
        throw new Error('不支持的支付方式');
      }

      // 更新订单支付状态
      order.payment.status = 'paid';
      order.payment.transactionId = paymentResult.transactionId;
      order.payment.paidAt = new Date();
      order.status = 'paid';

      await order.save();

      return {
        success: true,
        data: {
          orderId: order._id,
          orderNo: order.orderNo,
          paymentResult
        },
        message: '支付处理成功'
      };
    } catch (error) {
      console.error('处理支付失败:', error);
      throw error;
    }
  }

  /**
   * 微信支付处理
   */
  async processWechatPayment(order, paymentData) {
    try {
      const params = {
        appid: this.config.payment.wechat.appId,
        mch_id: this.config.payment.wechat.mchId,
        nonce_str: this.generateNonceStr(),
        body: `智慧村庄-订单${order.orderNo}`,
        out_trade_no: order.orderNo,
        total_fee: Math.round(order.totals.finalAmount * 100), // 转换为分
        spbill_create_ip: paymentData.ip || '127.0.0.1',
        notify_url: this.config.payment.wechat.notifyUrl,
        trade_type: paymentData.tradeType || 'JSAPI',
        openid: paymentData.openId
      };

      // 生成签名
      params.sign = this.generateWechatSign(params);

      // 发送请求
      const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder',
        this.objectToXml(params));

      const result = this.xmlToObject(response.data);

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        return {
          prepayId: result.prepay_id,
          transactionId: result.prepay_id
        };
      } else {
        throw new Error(`微信支付失败: ${result.return_msg || result.err_code_des}`);
      }
    } catch (error) {
      console.error('微信支付处理失败:', error);
      throw error;
    }
  }

  /**
   * 支付宝支付处理
   */
  async processAlipayPayment(order, paymentData) {
    try {
      const params = {
        app_id: this.config.payment.alipay.appId,
        method: 'alipay.trade.create',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: new Date().toISOString(),
        version: '1.0',
        notify_url: this.config.payment.alipay.notifyUrl,
        biz_content: JSON.stringify({
          out_trade_no: order.orderNo,
          total_amount: order.totals.finalAmount.toFixed(2),
          subject: `智慧村庄-订单${order.orderNo}`,
          product_code: 'QUICK_MSECURITY_PAY'
        })
      };

      // 生成签名
      params.sign = this.generateAlipaySign(params);

      const response = await axios.post('https://openapi.alipay.com/gateway.do', params);

      if (response.data.alipay_trade_create_response.code === '10000') {
        return {
          tradeNo: response.data.alipay_trade_create_response.trade_no,
          transactionId: response.data.alipay_trade_create_response.out_trade_no
        };
      } else {
        throw new Error(`支付宝支付失败: ${response.data.alipay_trade_create_response.msg}`);
      }
    } catch (error) {
      console.error('支付宝支付处理失败:', error);
      throw error;
    }
  }

  /**
   * 现金支付处理
   */
  async processCashPayment(order, paymentData) {
    return {
      transactionId: `CASH_${Date.now()}`,
      method: 'cash',
      amount: order.totals.finalAmount,
      paidAt: new Date()
    };
  }

  /**
   * 处理订单发货
   */
  async shipOrder(orderId, shippingData) {
    try {
      const Order = require('../models/Order');

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('订单不存在');
      }

      if (order.status !== 'paid') {
        throw new Error('订单状态不正确，无法发货');
      }

      // 创建物流信息
      const logisticsInfo = {
        company: shippingData.company,
        trackingNumber: shippingData.trackingNumber,
        status: 'shipped',
        shippedAt: new Date(),
        estimatedDelivery: shippingData.estimatedDelivery,
        notes: shippingData.notes
      };

      order.shipping.logistics = logisticsInfo;
      order.status = 'shipped';
      order.shippedAt = new Date();

      await order.save();

      // 扣减库存
      await this.deductInventory(order.items);

      // 发送通知
      await this.sendShippingNotification(order, logisticsInfo);

      return {
        success: true,
        data: order,
        message: '订单发货成功'
      };
    } catch (error) {
      console.error('订单发货失败:', error);
      throw error;
    }
  }

  /**
   * 处理订单完成
   */
  async completeOrder(orderId, completionData = {}) {
    try {
      const Order = require('../models/Order');

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('订单不存在');
      }

      if (order.status !== 'shipped') {
        throw new Error('订单状态不正确，无法完成');
      }

      order.status = 'completed';
      order.completedAt = new Date();

      if (completionData.rating) {
        order.rating = completionData.rating;
      }
      if (completionData.feedback) {
        order.feedback = completionData.feedback;
      }

      await order.save();

      // 更新销量统计
      await this.updateSalesStatistics(order.items);

      return {
        success: true,
        data: order,
        message: '订单完成'
      };
    } catch (error) {
      console.error('订单完成失败:', error);
      throw error;
    }
  }

  /**
   * 获取订单列表
   */
  async getOrders(filters = {}) {
    try {
      const Order = require('../models/Order');

      const {
        buyerId,
        sellerId,
        status,
        type,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = filters;

      const query = {};

      if (buyerId) query.buyerId = buyerId;
      if (sellerId) query.sellerId = sellerId;
      if (status) query.status = status;
      if (type) query.type = type;

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const orders = await Order.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('buyerId', 'name phone')
        .populate('sellerId', 'name phone')
        .populate('items.productId', 'name images');

      const total = await Order.countDocuments(query);

      return {
        success: true,
        data: {
          orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        },
        message: '获取订单列表成功'
      };
    } catch (error) {
      console.error('获取订单列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建农产品供应信息
   */
  async createFarmProductSupply(supplyData) {
    try {
      const FarmProductSupply = require('../models/FarmProductSupply');

      const supply = new FarmProductSupply({
        farmerId: supplyData.farmerId,
        villageId: supplyData.villageId,
        productName: supplyData.productName,
        category: supplyData.category,
        variety: supplyData.variety,
        description: supplyData.description,
        images: supplyData.images || [],
        quantity: supplyData.quantity,
        unit: supplyData.unit || 'kg',
        price: {
          minPrice: supplyData.minPrice,
          maxPrice: supplyData.maxPrice,
          negotiable: supplyData.negotiable || false
        },
        quality: {
          grade: supplyData.grade || 'A',
          certification: supplyData.certification || [],
          inspectionDate: supplyData.inspectionDate,
          inspectionReport: supplyData.inspectionReport
        },
        harvest: {
          date: supplyData.harvestDate,
          season: supplyData.season,
          method: supplyData.method
        },
        location: supplyData.location,
        availability: {
          startDate: supplyData.startDate,
          endDate: supplyData.endDate,
          continuous: supplyData.continuous || false
        },
        shipping: {
          available: supplyData.shippingAvailable || true,
          methods: supplyData.shippingMethods || ['pickup'],
          radius: supplyData.shippingRadius || 50
        },
        status: supplyData.status || 'available'
      });

      const result = await supply.save();

      return {
        success: true,
        data: result,
        message: '农产品供应信息创建成功'
      };
    } catch (error) {
      console.error('创建农产品供应信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取农产品供应列表
   */
  async getFarmProductSupplies(filters = {}) {
    try {
      const FarmProductSupply = require('../models/FarmProductSupply');

      const {
        farmerId,
        villageId,
        category,
        grade,
        minPrice,
        maxPrice,
        available,
        status = 'available',
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = filters;

      const query = { status };

      if (farmerId) query.farmerId = farmerId;
      if (villageId) query.villageId = villageId;
      if (category) query.category = category;
      if (grade) query['quality.grade'] = grade;

      if (available !== undefined) {
        const now = new Date();
        if (available) {
          query['availability.startDate'] = { $lte: now };
          query['availability.endDate'] = { $gte: now };
        } else {
          query.$or = [
            { 'availability.startDate': { $gt: now } },
            { 'availability.endDate': { $lt: now } }
          ];
        }
      }

      if (minPrice || maxPrice) {
        query['price.minPrice'] = {};
        if (minPrice) query['price.minPrice'].$lte = minPrice;
        if (maxPrice) query['price.maxPrice'].$gte = maxPrice;
      }

      const supplies = await FarmProductSupply.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('farmerId', 'name phone')
        .populate('villageId', 'name');

      const total = await FarmProductSupply.countDocuments(query);

      return {
        success: true,
        data: {
          supplies,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        },
        message: '获取农产品供应列表成功'
      };
    } catch (error) {
      console.error('获取农产品供应列表失败:', error);
      throw error;
    }
  }

  /**
   * 同步第三方平台商品
   */
  async syncPlatformProducts(platform, category = '') {
    try {
      const products = [];

      switch (platform) {
      case 'taobao':
        products.push(...await this.syncTaobaoProducts(category));
        break;
      case 'jd':
        products.push(...await this.syncJDProducts(category));
        break;
      default:
        throw new Error('不支持的平台');
      }

      return {
        success: true,
        data: {
          platform,
          category,
          products: products.slice(0, 100), // 限制返回数量
          total: products.length
        },
        message: '同步平台商品成功'
      };
    } catch (error) {
      console.error('同步平台商品失败:', error);
      throw error;
    }
  }

  /**
   * 同步淘宝商品
   */
  async syncTaobaoProducts(category) {
    try {
      const params = {
        method: 'taobao.tbk.item.get',
        app_key: this.config.platforms.taobao.appKey,
        timestamp: new Date().toISOString(),
        format: 'json',
        v: '2.0',
        sign_method: 'md5'
      };

      if (category) {
        params.cat = category;
      }

      // 生成签名
      params.sign = this.generateTaobaoSign(params);

      const response = await axios.get(this.config.platforms.taobao.apiUrl, { params });

      if (response.data.tbk_item_get_response && response.data.tbk_item_get_response.results) {
        return response.data.tbk_item_get_response.results.n_tbk_item.map(item => ({
          platform: 'taobao',
          numIid: item.num_iid,
          title: item.title,
          price: item.zk_final_price,
          commissionRate: item.commission_rate,
          couponInfo: item.coupon_info,
          images: item.pict_url ? [item.pict_url] : [],
          category: item.category,
          sales: item.volume,
          url: item.item_url
        }));
      }

      return [];
    } catch (error) {
      console.error('同步淘宝商品失败:', error);
      return [];
    }
  }

  /**
   * 同步京东商品
   */
  async syncJDProducts(category) {
    try {
      const params = {
        method: 'jd.union.search.goods',
        app_key: this.config.platforms.jd.appKey,
        timestamp: new Date().toISOString().replace(/[-:T.Z]/g, ''),
        format: 'json',
        v: '1.0'
      };

      if (category) {
        params.cat1Id = category;
      }

      // 生成签名
      params.sign = this.generateJDSign(params);

      const response = await axios.get(this.config.platforms.jd.apiUrl, { params });

      if (response.data.jd_union_search_goods_responce && response.data.jd_union_search_goods_responce.data) {
        return response.data.jd_union_search_goods_responce.data.map(item => ({
          platform: 'jd',
          skuId: item.skuId,
          title: item.goodsName,
          price: item.unitPrice,
          commissionRate: item.commissionRatio,
          images: item.imageInfo ? item.imageInfo.imageList : [],
          category: item.categoryId,
          sales: item.inOrderCount30Days,
          url: item.materialUrl
        }));
      }

      return [];
    } catch (error) {
      console.error('同步京东商品失败:', error);
      return [];
    }
  }

  /**
   * 生成订单号
   */
  generateOrderNo() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `EC${timestamp}${random}`;
  }

  /**
   * 生成随机字符串
   */
  generateNonceStr(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成微信签名
   */
  generateWechatSign(params) {
    const keys = Object.keys(params).sort();
    let string = keys.map(key => `${key}=${params[key]}`).join('&');
    string += `&key=${this.config.payment.wechat.apiKey}`;
    return crypto.createHash('md5').update(string).digest('hex').toUpperCase();
  }

  /**
   * 生成支付宝签名
   */
  generateAlipaySign(params) {
    const keys = Object.keys(params).sort();
    const string = keys.map(key => `${key}=${params[key]}`).join('&');
    return crypto.createSign('RSA-SHA256')
      .update(string)
      .sign(this.config.payment.alipay.privateKey, 'base64');
  }

  /**
   * 生成淘宝签名
   */
  generateTaobaoSign(params) {
    const secret = this.config.platforms.taobao.appSecret;
    const keys = Object.keys(params).sort();
    const string = secret + keys.map(key => `${key}${params[key]}`).join('') + secret;
    return crypto.createHash('md5').update(string).digest('hex').toUpperCase();
  }

  /**
   * 生成京东签名
   */
  generateJDSign(params) {
    const secret = this.config.platforms.jd.appSecret;
    const keys = Object.keys(params).sort();
    const string = keys.map(key => `${key}${params[key]}`).join('') + secret;
    return crypto.createHash('md5').update(string).digest('hex').toUpperCase();
  }

  /**
   * 对象转XML
   */
  objectToXml(obj) {
    let xml = '<xml>';
    for (const key in obj) {
      xml += `<${key}>${obj[key]}</${key}>`;
    }
    xml += '</xml>';
    return xml;
  }

  /**
   * XML转对象
   */
  xmlToObject(xml) {
    const xml2js = require('xml2js');
    return new Promise((resolve, reject) => {
      xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) reject(err);
        else resolve(result.xml);
      });
    });
  }

  /**
   * 预扣库存
   */
  async reserveInventory(items) {
    const AgriculturalProduct = require('../models/AgriculturalProduct');

    for (const item of items) {
      await AgriculturalProduct.findByIdAndUpdate(
        item.productId,
        { $inc: { 'inventory.quantity': -item.quantity } }
      );
    }
  }

  /**
   * 扣减库存
   */
  async deductInventory(items) {
    // 预扣库存和实际扣减使用相同的方法
    await this.reserveInventory(items);
  }

  /**
   * 发送发货通知
   */
  async sendShippingNotification(order, logisticsInfo) {
    try {
      // 这里可以集成云通信服务发送通知
      console.log(`订单 ${order.orderNo} 已发货，物流单号: ${logisticsInfo.trackingNumber}`);
    } catch (error) {
      console.error('发送发货通知失败:', error);
    }
  }

  /**
   * 更新销量统计
   */
  async updateSalesStatistics(items) {
    const AgriculturalProduct = require('../models/AgriculturalProduct');

    for (const item of items) {
      await AgriculturalProduct.findByIdAndUpdate(
        item.productId,
        { $inc: { 'sales.totalSold': item.quantity, 'sales.totalRevenue': item.price * item.quantity } }
      );
    }
  }

  /**
   * 清理产品缓存
   */
  clearProductCache() {
    this.productCache.clear();
  }

  /**
   * 清理订单缓存
   */
  clearOrderCache() {
    this.orderCache.clear();
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    return {
      payment: {
        wechat: !!this.config.payment.wechat.appId,
        alipay: !!this.config.payment.alipay.appId
      },
      logistics: {
        configured: !!this.config.logistics.default.apiKey
      },
      platforms: {
        taobao: !!this.config.platforms.taobao.appKey,
        jd: !!this.config.platforms.jd.appKey
      },
      cache: {
        productCache: this.productCache.size,
        orderCache: this.orderCache.size,
        timeout: this.cacheTimeout
      }
    };
  }
}

module.exports = new EcommerceService();