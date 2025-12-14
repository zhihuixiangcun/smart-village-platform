/**
 * 电商服务单元测试
 */

const ecommerceService = require('../../../src/services/ecommerceService');
const AgriculturalProduct = require('../../../src/models/AgriculturalProduct');
const Order = require('../../../src/models/Order');
const FarmProductSupply = require('../../../src/models/FarmProductSupply');
const paymentService = require('../../../src/services/paymentService');
const analyticsService = require('../../../src/services/analyticsService');

// Mock dependencies
jest.mock('../../../src/models/AgriculturalProduct');
jest.mock('../../../src/models/Order');
jest.mock('../../../src/models/FarmProductSupply');
jest.mock('../../../src/services/paymentService');
jest.mock('../../../src/services/analyticsService');

describe('EcommerceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAgriculturalProduct', () => {
    it('应该成功创建农资产品', async () => {
      const productData = {
        name: '有机化肥',
        category: 'fertilizer',
        subCategory: '有机肥',
        brand: '绿源',
        description: '高品质有机化肥',
        pricing: {
          retailPrice: 120,
          wholesalePrice: 100,
          unit: 'bag'
        },
        inventory: {
          quantity: 500
        },
        supplier: {
          name: '绿源农资',
          contactPerson: '张经理',
          contactPhone: '13800138001'
        },
        createdBy: 'user123'
      };

      const mockProduct = {
        _id: 'product123',
        ...productData,
        save: jest.fn().mockResolvedValue({ _id: 'product123', ...productData })
      };

      AgriculturalProduct.mockImplementation(() => mockProduct);
      analyticsService.trackEvent.mockResolvedValue({});

      const result = await ecommerceService.createAgriculturalProduct(productData);

      expect(AgriculturalProduct).toHaveBeenCalledWith(productData);
      expect(mockProduct.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result._id).toBe('product123');
    });

    it('应该在产品信息无效时抛出错误', async () => {
      const invalidData = {
        name: '',
        category: 'invalid'
      };

      await expect(ecommerceService.createAgriculturalProduct(invalidData))
        .rejects.toThrow();
    });
  });

  describe('createFarmProductSupply', () => {
    it('应该成功创建农产品供应', async () => {
      const supplyData = {
        farmerId: 'farmer123',
        villageId: 'village123',
        productName: '有机蔬菜',
        category: 'vegetable',
        description: '新鲜有机蔬菜',
        quantity: 100,
        unit: 'kg',
        price: {
          minPrice: 8,
          maxPrice: 12
        },
        contact: {
          phone: '13900139001'
        }
      };

      const mockSupply = {
        _id: 'supply123',
        ...supplyData,
        save: jest.fn().mockResolvedValue({ _id: 'supply123', ...supplyData })
      };

      FarmProductSupply.mockImplementation(() => mockSupply);

      const result = await ecommerceService.createFarmProductSupply(supplyData);

      expect(FarmProductSupply).toHaveBeenCalledWith(supplyData);
      expect(mockSupply.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result._id).toBe('supply123');
    });
  });

  describe('createOrder', () => {
    it('应该成功创建订单', async () => {
      const orderData = {
        buyerId: 'buyer123',
        type: 'agricultural_purchase',
        items: [{
          productId: 'product123',
          productName: '有机化肥',
          quantity: 2,
          price: 120
        }],
        shipping: {
          recipient: {
            name: '张三',
            phone: '13800138001'
          },
          address: {
            province: '浙江省',
            city: '杭州市',
            district: '余杭区',
            detail: '瓶窑镇'
          }
        },
        payment: {
          method: 'wechat'
        }
      };

      const mockProduct = {
        _id: 'product123',
        inventory: { quantity: 500, reserved: 0 },
        save: jest.fn().mockResolvedValue({})
      };

      const mockOrder = {
        _id: 'order123',
        ...orderData,
        calculateTotals: jest.fn().mockReturnValue({
          itemsCount: 2,
          itemsAmount: 240,
          finalAmount: 240
        }),
        save: jest.fn().mockResolvedValue({
          _id: 'order123',
          ...orderData,
          orderNo: 'ORD20250101001'
        })
      };

      AgriculturalProduct.findById.mockResolvedValue(mockProduct);
      Order.mockImplementation(() => mockOrder);
      analyticsService.trackEvent.mockResolvedValue({});

      const result = await ecommerceService.createOrder(orderData);

      expect(Order).toHaveBeenCalled();
      expect(mockOrder.calculateTotals).toHaveBeenCalled();
      expect(mockOrder.save).toHaveBeenCalled();
      expect(result.orderNo).toBeDefined();
    });

    it('应该在库存不足时抛出错误', async () => {
      const orderData = {
        buyerId: 'buyer123',
        type: 'agricultural_purchase',
        items: [{
          productId: 'product123',
          productName: '有机化肥',
          quantity: 1000,
          price: 120
        }]
      };

      const mockProduct = {
        _id: 'product123',
        inventory: { quantity: 500, reserved: 0 }
      };

      AgriculturalProduct.findById.mockResolvedValue(mockProduct);

      await expect(ecommerceService.createOrder(orderData))
        .rejects.toThrow('库存不足');
    });
  });

  describe('processPayment', () => {
    it('应该成功处理支付', async () => {
      const orderId = 'order123';
      const paymentData = {
        method: 'wechat',
        amount: 240
      };

      const mockOrder = {
        _id: orderId,
        status: 'pending',
        totals: { finalAmount: 240 },
        updateStatus: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      Order.findById.mockResolvedValue(mockOrder);
      paymentService.processPayment.mockResolvedValue({
        success: true,
        transactionId: 'tx123456'
      });
      analyticsService.trackEvent.mockResolvedValue({});

      const result = await ecommerceService.processPayment(orderId, paymentData);

      expect(paymentService.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'wechat',
          amount: 240,
          orderId: orderId
        })
      );
      expect(mockOrder.updateStatus).toHaveBeenCalledWith('paid', expect.any(String));
      expect(result.success).toBe(true);
    });

    it('应该在支付失败时抛出错误', async () => {
      const orderId = 'order123';
      const paymentData = {
        method: 'wechat',
        amount: 240
      };

      const mockOrder = {
        _id: orderId,
        status: 'pending',
        totals: { finalAmount: 240 }
      };

      Order.findById.mockResolvedValue(mockOrder);
      paymentService.processPayment.mockResolvedValue({
        success: false,
        error: '支付失败'
      });

      await expect(ecommerceService.processPayment(orderId, paymentData))
        .rejects.toThrow('支付失败');
    });
  });

  describe('shipOrder', () => {
    it('应该成功发货订单', async () => {
      const orderId = 'order123';
      const shippingData = {
        method: 'express',
        company: '顺丰快递',
        trackingNumber: 'SF123456789'
      };

      const mockOrder = {
        _id: orderId,
        status: 'paid',
        items: [{
          productId: 'product123',
          quantity: 2
        }],
        updateStatus: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      Order.findById.mockResolvedValue(mockOrder);
      AgriculturalProduct.findById.mockResolvedValue({
        _id: 'product123',
        releaseReservedInventory: jest.fn().mockResolvedValue({})
      });
      analyticsService.trackEvent.mockResolvedValue({});

      const result = await ecommerceService.shipOrder(orderId, shippingData);

      expect(mockOrder.updateStatus).toHaveBeenCalledWith('shipped', expect.any(String));
      expect(result).toBeDefined();
    });

    it('应该在订单未支付时抛出错误', async () => {
      const orderId = 'order123';
      const shippingData = {
        method: 'express'
      };

      const mockOrder = {
        _id: orderId,
        status: 'pending'
      };

      Order.findById.mockResolvedValue(mockOrder);

      await expect(ecommerceService.shipOrder(orderId, shippingData))
        .rejects.toThrow('订单未支付，无法发货');
    });
  });

  describe('getProducts', () => {
    it('应该返回产品列表', async () => {
      const options = {
        category: 'fertilizer',
        page: 1,
        limit: 10
      };

      const mockProducts = [
        { _id: 'product1', name: '有机化肥1', category: 'fertilizer' },
        { _id: 'product2', name: '有机化肥2', category: 'fertilizer' }
      ];

      AgriculturalProduct.findByCategory.mockResolvedValue({
        products: mockProducts,
        total: 2,
        page: 1,
        totalPages: 1
      });

      const result = await ecommerceService.getProducts('agricultural', options);

      expect(AgriculturalProduct.findByCategory).toHaveBeenCalledWith('fertilizer', options);
      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('应该支持农产品供应查询', async () => {
      const options = {
        category: 'vegetable',
        page: 1,
        limit: 10
      };

      const mockSupplies = [
        { _id: 'supply1', productName: '有机蔬菜', category: 'vegetable' }
      ];

      FarmProductSupply.findByCategory.mockResolvedValue({
        supplies: mockSupplies,
        total: 1,
        page: 1,
        totalPages: 1
      });

      const result = await ecommerceService.getProducts('farm', options);

      expect(FarmProductSupply.findByCategory).toHaveBeenCalledWith('vegetable', options);
      expect(result.supplies).toHaveLength(1);
    });
  });

  describe('searchProducts', () => {
    it('应该搜索农资产品', async () => {
      const keyword = '有机';
      const options = {
        category: 'fertilizer',
        page: 1,
        limit: 10
      };

      const mockProducts = [
        { _id: 'product1', name: '有机化肥', category: 'fertilizer' }
      ];

      AgriculturalProduct.searchProducts.mockResolvedValue({
        products: mockProducts,
        total: 1,
        page: 1,
        totalPages: 1
      });

      const result = await ecommerceService.searchProducts('agricultural', keyword, options);

      expect(AgriculturalProduct.searchProducts).toHaveBeenCalledWith(keyword, options);
      expect(result.products).toHaveLength(1);
    });

    it('应该搜索农产品供应', async () => {
      const keyword = '蔬菜';
      const options = {
        category: 'vegetable',
        page: 1,
        limit: 10
      };

      const mockSupplies = [
        { _id: 'supply1', productName: '有机蔬菜', category: 'vegetable' }
      ];

      FarmProductSupply.searchSupplies.mockResolvedValue({
        supplies: mockSupplies,
        total: 1,
        page: 1,
        totalPages: 1
      });

      const result = await ecommerceService.searchProducts('farm', keyword, options);

      expect(FarmProductSupply.searchSupplies).toHaveBeenCalledWith(keyword, options);
      expect(result.supplies).toHaveLength(1);
    });
  });

  describe('getOrderDetail', () => {
    it('应该返回订单详情', async () => {
      const orderId = 'order123';
      const userId = 'user123';

      const mockOrder = {
        _id: orderId,
        buyerId: userId,
        orderNo: 'ORD20250101001',
        status: 'paid',
        items: [{
          productId: 'product123',
          productName: '有机化肥',
          quantity: 2,
          price: 120
        }],
        totals: {
          items: 2,
          amount: 240,
          finalAmount: 240
        }
      };

      Order.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrder)
      });

      const result = await ecommerceService.getOrderDetail(orderId, userId);

      expect(Order.findById).toHaveBeenCalledWith(orderId);
      expect(result._id).toBe(orderId);
      expect(result.buyerId).toBe(userId);
    });

    it('应该在用户无权限时抛出错误', async () => {
      const orderId = 'order123';
      const userId = 'user456';

      const mockOrder = {
        _id: orderId,
        buyerId: 'user123'
      };

      Order.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrder)
      });

      await expect(ecommerceService.getOrderDetail(orderId, userId))
        .rejects.toThrow('无权限查看此订单');
    });
  });

  describe('updateInventory', () => {
    it('应该更新产品库存', async () => {
      const productId = 'product123';
      const quantity = 100;
      const operation = 'add';

      const mockProduct = {
        _id: productId,
        inventory: { quantity: 500 },
        updateInventory: jest.fn().mockResolvedValue({
          _id: productId,
          inventory: { quantity: 600 }
        })
      };

      AgriculturalProduct.findById.mockResolvedValue(mockProduct);

      const result = await ecommerceService.updateInventory(productId, quantity, operation);

      expect(mockProduct.updateInventory).toHaveBeenCalledWith(quantity, operation);
      expect(result.inventory.quantity).toBe(600);
    });

    it('应该在产品不存在时抛出错误', async () => {
      const productId = 'nonexistent';
      const quantity = 100;

      AgriculturalProduct.findById.mockResolvedValue(null);

      await expect(ecommerceService.updateInventory(productId, quantity))
        .rejects.toThrow('产品不存在');
    });
  });

  describe('getProductRecommendations', () => {
    it('应该返回推荐产品', async () => {
      const userId = 'user123';
      const limit = 5;

      const mockRecommended = [
        { _id: 'product1', name: '推荐产品1', recommendation: { isRecommended: true } },
        { _id: 'product2', name: '推荐产品2', recommendation: { isRecommended: true } }
      ];

      AgriculturalProduct.findRecommended.mockResolvedValue(mockRecommended);
      FarmProductSupply.findRecommended.mockResolvedValue([]);

      const result = await ecommerceService.getProductRecommendations(userId, limit);

      expect(AgriculturalProduct.findRecommended).toHaveBeenCalledWith(limit);
      expect(result.recommended).toHaveLength(2);
    });

    it('应该基于用户历史记录推荐', async () => {
      const userId = 'user123';
      const limit = 5;

      const mockOrders = [
        {
          items: [{ productId: 'product1', productName: '有机化肥', category: 'fertilizer' }]
        }
      ];

      const mockSimilar = [
        { _id: 'product3', name: '相似产品', category: 'fertilizer' }
      ];

      Order.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrders)
      });
      AgriculturalProduct.findByCategory.mockResolvedValue({
        products: mockSimilar,
        total: 1
      });

      const result = await ecommerceService.getProductRecommendations(userId, limit, true);

      expect(Order.find).toHaveBeenCalled();
      expect(result.similar).toBeDefined();
    });
  });
});