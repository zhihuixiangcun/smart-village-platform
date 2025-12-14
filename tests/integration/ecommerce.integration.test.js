/**
 * 电商平台集成测试
 */

const request = require('supertest');
const app = require('../../src/app');
const { connectDB, closeDB } = require('../../src/config/database');
const AgriculturalProduct = require('../../src/models/AgriculturalProduct');
const Order = require('../../src/models/Order');
const FarmProductSupply = require('../../src/models/FarmProductSupply');
const User = require('../../src/models/User');
const PaymentRecord = require('../../src/models/PaymentRecord');

describe('E-commerce Platform Integration Tests', () => {
  let authToken;
  let testUser;
  let testProduct;
  let testOrder;

  beforeAll(async () => {
    await connectDB();

    // 创建测试用户
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      phone: '13800138001',
      role: 'villager',
      villageId: 'testVillage123'
    });
    await testUser.save();

    // 获取认证token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    // 创建测试农资产品
    testProduct = new AgriculturalProduct({
      name: '测试有机化肥',
      category: 'fertilizer',
      subCategory: 'organic',
      brand: '绿源',
      description: '高品质有机化肥测试产品',
      pricing: {
        retailPrice: 120,
        wholesalePrice: 100,
        unit: 'bag'
      },
      inventory: {
        quantity: 500,
        minQuantity: 10
      },
      supplier: {
        name: '绿源农资',
        contactPerson: '张经理',
        contactPhone: '13900139001'
      },
      status: 'active',
      createdBy: testUser._id
    });
    await testProduct.save();
  });

  afterEach(async () => {
    // 清理测试数据
    await AgriculturalProduct.deleteMany({});
    await Order.deleteMany({});
    await FarmProductSupply.deleteMany({});
    await PaymentRecord.deleteMany({});
  });

  describe('完整电商流程测试', () => {
    it('应该完成完整的购买流程', async () => {
      // 1. 浏览产品列表
      const productsResponse = await request(app)
        .get('/api/v1/ecommerce/agricultural/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(productsResponse.body.success).toBe(true);
      expect(productsResponse.body.data.products.length).toBeGreaterThan(0);

      // 2. 查看产品详情
      const productDetailResponse = await request(app)
        .get(`/api/v1/ecommerce/agricultural/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(productDetailResponse.body.success).toBe(true);
      expect(productDetailResponse.body.data._id).toBe(testProduct._id.toString());

      // 3. 添加到购物车
      const cartResponse = await request(app)
        .put('/api/v1/ecommerce/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{
            productId: testProduct._id,
            quantity: 2,
            price: 120
          }]
        })
        .expect(200);

      expect(cartResponse.body.success).toBe(true);
      expect(cartResponse.body.data.items).toHaveLength(1);
      expect(cartResponse.body.data.total).toBe(240);

      // 4. 创建订单
      const orderData = {
        type: 'agricultural_purchase',
        items: [{
          productId: testProduct._id,
          productName: testProduct.name,
          quantity: 2,
          price: 120,
          totalPrice: 240
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
            detail: '瓶窑镇测试地址'
          }
        },
        payment: {
          method: 'wechat'
        }
      };

      const createOrderResponse = await request(app)
        .post('/api/v1/ecommerce/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(createOrderResponse.body.success).toBe(true);
      testOrder = createOrderResponse.body.data;
      expect(testOrder.status).toBe('pending');
      expect(testOrder.totals.finalAmount).toBe(240);

      // 5. 处理支付 (模拟)
      const paymentResponse = await request(app)
        .post(`/api/v1/ecommerce/orders/${testOrder._id}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: 'wechat',
          amount: 240
        })
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);

      // 6. 发货 (管理员操作)
      // 首先需要管理员token或模拟管理员权限
      const shippingResponse = await request(app)
        .post(`/api/v1/ecommerce/orders/${testOrder._id}/ship`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: 'express',
          company: '顺丰快递',
          trackingNumber: 'SF123456789'
        })
        .expect(200);

      expect(shippingResponse.body.success).toBe(true);

      // 7. 完成订单
      const completeResponse = await request(app)
        .post(`/api/v1/ecommerce/orders/${testOrder._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          review: {
            rating: 5,
            comment: '产品质量很好',
            serviceRating: 5,
            deliveryRating: 5
          }
        })
        .expect(200);

      expect(completeResponse.body.success).toBe(true);
      expect(completeResponse.body.data.status).toBe('completed');
    });

    it('应该处理农产品供应流程', async () => {
      // 1. 发布农产品供应
      const supplyData = {
        productName: '有机蔬菜',
        category: 'vegetable',
        description: '新鲜有机蔬菜，无农药残留',
        quantity: 100,
        unit: 'kg',
        price: {
          minPrice: 8,
          maxPrice: 12
        },
        quality: {
          grade: 'AAA',
          certification: ['organic', 'green']
        },
        harvest: {
          date: new Date(),
          season: 'summer',
          method: 'manual'
        },
        contact: {
          phone: '13800138001',
          address: '浙江省杭州市余杭区瓶窑镇'
        }
      };

      const createSupplyResponse = await request(app)
        .post('/api/v1/ecommerce/farm-supplies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(supplyData)
        .expect(201);

      expect(createSupplyResponse.body.success).toBe(true);
      const farmSupply = createSupplyResponse.body.data;
      expect(farmSupply.productName).toBe('有机蔬菜');
      expect(farmSupply.status).toBe('available');

      // 2. 查询农产品供应
      const suppliesResponse = await request(app)
        .get('/api/v1/ecommerce/farm-supplies')
        .query({ category: 'vegetable' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(suppliesResponse.body.success).toBe(true);
      expect(suppliesResponse.body.data.supplies.length).toBeGreaterThan(0);

      // 3. 搜索农产品
      const searchResponse = await request(app)
        .get('/api/v1/ecommerce/farm-supplies/search')
        .query({ keyword: '有机蔬菜' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.supplies.length).toBeGreaterThan(0);
    });
  });

  describe('支付集成测试', () => {
    it('应该集成支付服务处理订单支付', async () => {
      // 创建订单
      const orderData = {
        type: 'agricultural_purchase',
        items: [{
          productId: testProduct._id,
          quantity: 1,
          price: 120
        }],
        payment: { method: 'alipay' }
      };

      const orderResponse = await request(app)
        .post('/api/v1/ecommerce/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      const order = orderResponse.body.data;

      // 处理支付
      const paymentData = {
        method: 'alipay',
        amount: order.totals.finalAmount
      };

      const paymentResponse = await request(app)
        .post(`/api/v1/ecommerce/orders/${order._id}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
    });

    it('应该处理支付回调验证', async () => {
      // 模拟微信支付回调
      const callbackData = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'ORDER123456',
        transaction_id: 'WX123456789',
        total_fee: '12000'
      };

      const callbackResponse = await request(app)
        .post('/api/v1/payments/callback/wechat')
        .send(callbackData)
        .expect(200);

      expect(callbackResponse.body.return_code).toBe('SUCCESS');
    });
  });

  describe('库存管理集成测试', () => {
    it('应该在订单创建后自动扣减库存', async () => {
      const initialQuantity = testProduct.inventory.quantity;

      // 创建订单
      const orderData = {
        type: 'agricultural_purchase',
        items: [{
          productId: testProduct._id,
          quantity: 5,
          price: 120
        }]
      };

      await request(app)
        .post('/api/v1/ecommerce/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      // 检查库存是否正确扣减
      const updatedProduct = await AgriculturalProduct.findById(testProduct._id);
      expect(updatedProduct.inventory.reserved).toBe(5);
      expect(updatedProduct.inventory.available).toBe(initialQuantity - 5);
    });

    it('应该在订单完成后更新库存', async () => {
      // 创建并支付订单
      const orderData = {
        type: 'agricultural_purchase',
        items: [{
          productId: testProduct._id,
          quantity: 3,
          price: 120
        }]
      };

      const orderResponse = await request(app)
        .post('/api/v1/ecommerce/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      const order = orderResponse.body.data;

      // 模拟支付成功
      await request(app)
        .post(`/api/v1/ecommerce/orders/${order._id}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ method: 'wechat', amount: 360 })
        .expect(200);

      // 发货
      await request(app)
        .post(`/api/v1/ecommerce/orders/${order._id}/ship`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ method: 'express', company: '顺丰快递' })
        .expect(200);

      // 完成订单
      await request(app)
        .post(`/api/v1/ecommerce/orders/${order._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      // 检查库存是否正确更新
      const finalProduct = await AgriculturalProduct.findById(testProduct._id);
      expect(finalProduct.sales.totalSold).toBe(3);
      expect(finalProduct.inventory.reserved).toBe(0);
    });
  });

  describe('权限控制集成测试', () => {
    it('应该验证用户权限', async () => {
      // 未授权用户创建产品应该失败
      await request(app)
        .post('/api/v1/ecommerce/agricultural/products')
        .send({
          name: '未授权产品',
          category: 'fertilizer'
        })
        .expect(401);

      // 授权用户创建产品 (需要管理员权限)
      await request(app)
        .post('/api/v1/ecommerce/agricultural/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试产品',
          category: 'fertilizer'
        })
        .expect(403); // 普通用户无权限
    });

    it('应该验证数据访问权限', async () => {
      // 创建另一个用户的订单
      const anotherUserOrder = new Order({
        buyerId: 'anotherUserId',
        orderNo: 'ORDER789',
        status: 'pending'
      });
      await anotherUserOrder.save();

      // 尝试访问他人订单
      const response = await request(app)
        .get(`/api/v1/ecommerce/orders/${anotherUserOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('错误处理集成测试', () => {
    it('应该处理库存不足错误', async () => {
      // 设置库存为0
      testProduct.inventory.quantity = 0;
      await testProduct.save();

      // 尝试创建订单
      const orderData = {
        type: 'agricultural_purchase',
        items: [{
          productId: testProduct._id,
          quantity: 1,
          price: 120
        }]
      };

      const response = await request(app)
        .post('/api/v1/ecommerce/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('库存不足');
    });

    it('应该处理支付失败场景', async () => {
      const orderData = {
        type: 'agricultural_purchase',
        items: [{
          productId: testProduct._id,
          quantity: 1,
          price: 120
        }]
      };

      const orderResponse = await request(app)
        .post('/api/v1/ecommerce/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      // 尝试使用无效支付方式
      const paymentResponse = await request(app)
        .post(`/api/v1/ecommerce/orders/${orderResponse.body.data._id}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: 'invalid_method',
          amount: 120
        })
        .expect(400);

      expect(paymentResponse.body.success).toBe(false);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内响应产品列表请求', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/v1/ecommerce/agricultural/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // 应该在1秒内响应
    });

    it('应该支持并发请求', async () => {
      const promises = [];
      const concurrentRequests = 10;

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/ecommerce/agricultural/products')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});