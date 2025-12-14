/**
 * 电商控制器单元测试
 */

const ecommerceController = require('../../../src/controllers/ecommerceController');
const ecommerceService = require('../../../src/services/ecommerceService');

// Mock dependencies
jest.mock('../../../src/services/ecommerceService');

describe('EcommerceController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 'user123', role: 'user' },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('createAgriculturalProduct', () => {
    it('应该成功创建农资产品', async () => {
      const productData = {
        name: '有机化肥',
        category: 'fertilizer',
        pricing: { retailPrice: 120 }
      };

      req.body = productData;
      req.user = { id: 'user123', role: 'admin' };

      const mockProduct = {
        _id: 'product123',
        ...productData,
        createdBy: 'user123'
      };

      ecommerceService.createAgriculturalProduct.mockResolvedValue(mockProduct);

      await ecommerceController.createAgriculturalProduct(req, res);

      expect(ecommerceService.createAgriculturalProduct).toHaveBeenCalledWith({
        ...productData,
        createdBy: 'user123'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '农资产品创建成功',
        data: mockProduct
      });
    });

    it('应该在未授权时返回403错误', async () => {
      req.user = { id: 'user123', role: 'user' };
      req.body = { name: '有机化肥' };

      await ecommerceController.createAgriculturalProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '无权限创建产品'
      });
    });

    it('应该处理创建失败的情况', async () => {
      req.user = { id: 'user123', role: 'admin' };
      req.body = { name: '有机化肥' };

      const error = new Error('创建失败');
      ecommerceService.createAgriculturalProduct.mockRejectedValue(error);

      await ecommerceController.createAgriculturalProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '创建失败'
      });
    });
  });

  describe('getAgriculturalProducts', () => {
    it('应该返回农资产品列表', async () => {
      const options = {
        category: 'fertilizer',
        page: 1,
        limit: 10
      };

      req.query = options;

      const mockResult = {
        products: [
          { _id: 'product1', name: '有机化肥1' },
          { _id: 'product2', name: '有机化肥2' }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      ecommerceService.getProducts.mockResolvedValue(mockResult);

      await ecommerceController.getAgriculturalProducts(req, res);

      expect(ecommerceService.getProducts).toHaveBeenCalledWith('agricultural', options);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('应该设置默认分页参数', async () => {
      req.query = {};

      const mockResult = {
        products: [],
        total: 0,
        page: 1,
        totalPages: 0
      };

      ecommerceService.getProducts.mockResolvedValue(mockResult);

      await ecommerceController.getAgriculturalProducts(req, res);

      expect(ecommerceService.getProducts).toHaveBeenCalledWith('agricultural', {
        page: 1,
        limit: 20
      });
    });
  });

  describe('createFarmProductSupply', () => {
    it('应该成功创建农产品供应', async () => {
      const supplyData = {
        productName: '有机蔬菜',
        category: 'vegetable',
        quantity: 100
      };

      req.body = supplyData;
      req.user = { id: 'farmer123' };

      const mockSupply = {
        _id: 'supply123',
        ...supplyData,
        farmerId: 'farmer123'
      };

      ecommerceService.createFarmProductSupply.mockResolvedValue(mockSupply);

      await ecommerceController.createFarmProductSupply(req, res);

      expect(ecommerceService.createFarmProductSupply).toHaveBeenCalledWith({
        ...supplyData,
        farmerId: 'farmer123'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '农产品供应发布成功',
        data: mockSupply
      });
    });
  });

  describe('createOrder', () => {
    it('应该成功创建订单', async () => {
      const orderData = {
        type: 'agricultural_purchase',
        items: [{
          productId: 'product123',
          quantity: 2
        }],
        shipping: {
          recipient: { name: '张三', phone: '13800138001' },
          address: { province: '浙江省', city: '杭州市' }
        },
        payment: { method: 'wechat' }
      };

      req.body = orderData;
      req.user = { id: 'buyer123' };

      const mockOrder = {
        _id: 'order123',
        orderNo: 'ORD20250101001',
        ...orderData,
        buyerId: 'buyer123'
      };

      ecommerceService.createOrder.mockResolvedValue(mockOrder);

      await ecommerceController.createOrder(req, res);

      expect(ecommerceService.createOrder).toHaveBeenCalledWith({
        ...orderData,
        buyerId: 'buyer123'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '订单创建成功',
        data: mockOrder
      });
    });
  });

  describe('processPayment', () => {
    it('应该成功处理支付', async () => {
      const orderId = 'order123';
      const paymentData = {
        method: 'wechat',
        amount: 240
      };

      req.params = { orderId };
      req.body = paymentData;

      const mockResult = {
        success: true,
        transactionId: 'tx123456'
      };

      ecommerceService.processPayment.mockResolvedValue(mockResult);

      await ecommerceController.processPayment(req, res);

      expect(ecommerceService.processPayment).toHaveBeenCalledWith(orderId, paymentData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '支付处理成功',
        data: mockResult
      });
    });
  });

  describe('shipOrder', () => {
    it('应该成功发货', async () => {
      const orderId = 'order123';
      const shippingData = {
        method: 'express',
        company: '顺丰快递',
        trackingNumber: 'SF123456789'
      };

      req.params = { orderId };
      req.body = shippingData;

      const mockOrder = {
        _id: orderId,
        status: 'shipped'
      };

      ecommerceService.shipOrder.mockResolvedValue(mockOrder);

      await ecommerceController.shipOrder(req, res);

      expect(ecommerceService.shipOrder).toHaveBeenCalledWith(orderId, shippingData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '发货成功',
        data: mockOrder
      });
    });
  });

  describe('completeOrder', () => {
    it('应该成功完成订单', async () => {
      const orderId = 'order123';
      const completionData = {
        review: {
          rating: 5,
          comment: '非常满意'
        }
      };

      req.params = { orderId };
      req.body = completionData;

      const mockOrder = {
        _id: orderId,
        status: 'completed'
      };

      ecommerceService.completeOrder.mockResolvedValue(mockOrder);

      await ecommerceController.completeOrder(req, res);

      expect(ecommerceService.completeOrder).toHaveBeenCalledWith(orderId, completionData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '订单完成',
        data: mockOrder
      });
    });
  });

  describe('getOrders', () => {
    it('应该返回订单列表', async () => {
      const options = {
        status: 'completed',
        page: 1,
        limit: 10
      };

      req.query = options;
      req.user = { id: 'user123' };

      const mockResult = {
        orders: [
          { _id: 'order1', orderNo: 'ORD001', status: 'completed' },
          { _id: 'order2', orderNo: 'ORD002', status: 'completed' }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      ecommerceService.getOrders.mockResolvedValue(mockResult);

      await ecommerceController.getOrders(req, res);

      expect(ecommerceService.getOrders).toHaveBeenCalledWith('user123', options);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('updateProduct', () => {
    it('应该成功更新产品', async () => {
      const productId = 'product123';
      const updateData = {
        name: '更新后的产品名',
        pricing: { retailPrice: 150 }
      };

      req.params = { productId };
      req.body = updateData;
      req.user = { id: 'user123', role: 'admin' };

      const mockProduct = {
        _id: productId,
        ...updateData
      };

      ecommerceService.updateProduct.mockResolvedValue(mockProduct);

      await ecommerceController.updateProduct(req, res);

      expect(ecommerceService.updateProduct).toHaveBeenCalledWith(productId, updateData, 'user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '产品更新成功',
        data: mockProduct
      });
    });
  });

  describe('deleteProduct', () => {
    it('应该成功删除产品', async () => {
      const productId = 'product123';

      req.params = { productId };
      req.user = { id: 'user123', role: 'admin' };

      ecommerceService.deleteProduct.mockResolvedValue({});

      await ecommerceController.deleteProduct(req, res);

      expect(ecommerceService.deleteProduct).toHaveBeenCalledWith(productId, 'user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '产品删除成功'
      });
    });
  });

  describe('getShoppingCart', () => {
    it('应该返回购物车内容', async () => {
      req.user = { id: 'user123' };

      const mockCart = {
        items: [
          { productId: 'product1', quantity: 2, price: 120 },
          { productId: 'product2', quantity: 1, price: 80 }
        ],
        total: 320,
        itemCount: 3
      };

      ecommerceService.getShoppingCart.mockResolvedValue(mockCart);

      await ecommerceController.getShoppingCart(req, res);

      expect(ecommerceService.getShoppingCart).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCart
      });
    });
  });

  describe('updateShoppingCart', () => {
    it('应该成功更新购物车', async () => {
      const cartData = {
        items: [
          { productId: 'product1', quantity: 3 }
        ]
      };

      req.body = cartData;
      req.user = { id: 'user123' };

      const mockCart = {
        items: cartData.items,
        total: 360,
        itemCount: 3
      };

      ecommerceService.updateShoppingCart.mockResolvedValue(mockCart);

      await ecommerceController.updateShoppingCart(req, res);

      expect(ecommerceService.updateShoppingCart).toHaveBeenCalledWith('user123', cartData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '购物车更新成功',
        data: mockCart
      });
    });
  });

  describe('clearShoppingCart', () => {
    it('应该成功清空购物车', async () => {
      req.user = { id: 'user123' };

      ecommerceService.clearShoppingCart.mockResolvedValue({});

      await ecommerceController.clearShoppingCart(req, res);

      expect(ecommerceService.clearShoppingCart).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '购物车已清空'
      });
    });
  });

  describe('syncPlatformProducts', () => {
    it('应该成功同步平台产品', async () => {
      const syncData = {
        platforms: ['taobao', 'jd'],
        categories: ['fertilizer']
      };

      req.body = syncData;
      req.user = { id: 'user123', role: 'admin' };

      const mockResult = {
        synced: 25,
        failed: 2,
        platforms: {
          taobao: { synced: 15, failed: 1 },
          jd: { synced: 10, failed: 1 }
        }
      };

      ecommerceService.syncPlatformProducts.mockResolvedValue(mockResult);

      await ecommerceController.syncPlatformProducts(req, res);

      expect(ecommerceService.syncPlatformProducts).toHaveBeenCalledWith(syncData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '平台产品同步完成',
        data: mockResult
      });
    });
  });

  describe('getServiceStatus', () => {
    it('应该返回服务状态', async () => {
      const mockStatus = {
        ecommerce: {
          status: 'healthy',
          uptime: 86400,
          memory: { used: '150MB', total: '512MB' },
          database: { status: 'connected', responseTime: '15ms' },
          cache: { status: 'connected', hitRate: '85%' },
          payment: {
            wechat: { status: 'available', lastCheck: new Date() },
            alipay: { status: 'available', lastCheck: new Date() }
          },
          statistics: {
            totalProducts: 1250,
            activeOrders: 85,
            todayRevenue: 12500,
            conversionRate: '3.2%'
          }
        },
        timestamp: new Date()
      };

      ecommerceService.getServiceStatus.mockResolvedValue(mockStatus);

      await ecommerceController.getServiceStatus(req, res);

      expect(ecommerceService.getServiceStatus).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理服务抛出的错误', async () => {
      req.user = { id: 'user123', role: 'admin' };
      req.body = { name: '测试产品' };

      const error = new Error('服务错误');
      error.status = 500;
      ecommerceService.createAgriculturalProduct.mockRejectedValue(error);

      await ecommerceController.createAgriculturalProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '服务错误'
      });
    });

    it('应该处理未知错误', async () => {
      req.user = { id: 'user123', role: 'admin' };
      req.body = { name: '测试产品' };

      const error = new Error('未知错误');
      delete error.status;
      ecommerceService.createAgriculturalProduct.mockRejectedValue(error);

      await ecommerceController.createAgriculturalProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '创建产品失败'
      });
    });
  });
});