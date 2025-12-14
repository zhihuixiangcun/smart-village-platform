/**
 * 支付服务单元测试
 */

const paymentService = require('../../../src/services/paymentService');
const PaymentRecord = require('../../../src/models/PaymentRecord');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../../../src/models/PaymentRecord');
jest.mock('crypto');

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('应该成功处理微信支付', async () => {
      const paymentData = {
        method: 'wechat',
        amount: 10000, // 分
        orderId: 'order123',
        description: '农资采购',
        openid: 'user_openid123'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        ...paymentData,
        status: 'pending',
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue({})
      };

      PaymentRecord.mockImplementation(() => mockPaymentRecord);

      // Mock 微信支付API响应
      const mockWeChatResponse = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        prepay_id: 'prepay123',
        code_url: 'weixin://wxpay/bizpayurl?pr=xxx',
        appid: 'wx123456',
        mch_id: '1234567890',
        nonce_str: 'random_string',
        sign: 'generated_signature'
      };

      // Mock axios post for WeChat Pay
      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockWeChatResponse })
      }));

      crypto.randomBytes.mockReturnValue(Buffer.from('random_bytes'));
      crypto.createHash('md5').update().digest = jest.fn().mockReturnValue('md5_hash');

      const result = await paymentService.processPayment(paymentData);

      expect(PaymentRecord).toHaveBeenCalledWith({
        ...paymentData,
        status: 'pending',
        provider: 'wechat'
      });
      expect(mockPaymentRecord.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.provider).toBe('wechat');
      expect(result.payment_url).toBe(mockWeChatResponse.code_url);
      expect(result.prepay_id).toBe(mockWeChatResponse.prepay_id);
    });

    it('应该成功处理支付宝支付', async () => {
      const paymentData = {
        method: 'alipay',
        amount: 10000,
        orderId: 'order123',
        description: '农资采购',
        buyer_id: 'buyer_alipay_id'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        ...paymentData,
        status: 'pending',
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue({})
      };

      PaymentRecord.mockImplementation(() => mockPaymentRecord);

      // Mock 支付宝API响应
      const mockAlipayResponse = {
        alipay_trade_create_response: {
          code: '10000',
          msg: 'Success',
          out_trade_no: 'order123',
          trade_no: 'alipay_trade_no_123',
          total_amount: '100.00'
        }
      };

      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockAlipayResponse })
      }));

      crypto.randomBytes.mockReturnValue(Buffer.from('random_bytes'));

      const result = await paymentService.processPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('alipay');
      expect(result.trade_no).toBe('alipay_trade_no_123');
    });

    it('应该处理支付失败的情况', async () => {
      const paymentData = {
        method: 'wechat',
        amount: 10000,
        orderId: 'order123'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        ...paymentData,
        save: jest.fn().mockResolvedValue({})
      };

      PaymentRecord.mockImplementation(() => mockPaymentRecord);

      // Mock 微信支付失败响应
      const mockErrorResponse = {
        return_code: 'FAIL',
        return_msg: '签名错误'
      };

      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockErrorResponse })
      }));

      const result = await paymentService.processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('支付请求失败');
    });

    it('应该在金额无效时抛出错误', async () => {
      const paymentData = {
        method: 'wechat',
        amount: -100,
        orderId: 'order123'
      };

      await expect(paymentService.processPayment(paymentData))
        .rejects.toThrow('支付金额无效');
    });

    it('应该在支付方法不支持时抛出错误', async () => {
      const paymentData = {
        method: 'unsupported_method',
        amount: 10000,
        orderId: 'order123'
      };

      await expect(paymentService.processPayment(paymentData))
        .rejects.toThrow('不支持的支付方式');
    });
  });

  describe('verifyPaymentCallback', () => {
    it('应该验证微信支付回调', async () => {
      const callbackData = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        out_trade_no: 'order123',
        transaction_id: 'wx_transaction_123',
        total_fee: '10000',
        time_end: '20250101120000'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: 'order123',
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          status: 'paid',
          paidAt: new Date()
        })
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);
      crypto.createHash('md5').update().digest = jest.fn().mockReturnValue('valid_signature');

      const result = await paymentService.verifyPaymentCallback('wechat', callbackData);

      expect(PaymentRecord.findOne).toHaveBeenCalledWith({
        orderId: 'order123',
        status: 'pending'
      });
      expect(mockPaymentRecord.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('paid');
    });

    it('应该验证支付宝回调', async () => {
      const callbackData = {
        trade_status: 'TRADE_SUCCESS',
        out_trade_no: 'order123',
        trade_no: 'alipay_trade_123',
        total_amount: '100.00',
        gmt_payment: '2025-01-01 12:00:00'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: 'order123',
        status: 'pending',
        save: jest.fn().mockResolvedValue({
          status: 'paid',
          paidAt: new Date()
        })
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);

      const result = await paymentService.verifyPaymentCallback('alipay', callbackData);

      expect(result.success).toBe(true);
      expect(result.status).toBe('paid');
    });

    it('应该处理回调签名验证失败', async () => {
      const callbackData = {
        return_code: 'SUCCESS',
        sign: 'invalid_signature'
      };

      crypto.createHash('md5').update().digest = jest.fn().mockReturnValue('different_signature');

      const result = await paymentService.verifyPaymentCallback('wechat', callbackData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('签名验证失败');
    });

    it('应该处理找不到支付记录的情况', async () => {
      const callbackData = {
        out_trade_no: 'nonexistent_order'
      };

      PaymentRecord.findOne.mockResolvedValue(null);

      const result = await paymentService.verifyPaymentCallback('wechat', callbackData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('支付记录不存在');
    });
  });

  describe('queryPaymentStatus', () => {
    it('应该查询微信支付状态', async () => {
      const orderId = 'order123';

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: orderId,
        status: 'pending',
        provider: 'wechat'
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);

      // Mock 微信支付查询响应
      const mockQueryResponse = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        trade_state: 'SUCCESS',
        transaction_id: 'wx_transaction_123',
        total_fee: '10000'
      };

      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockQueryResponse })
      }));

      mockPaymentRecord.save = jest.fn().mockResolvedValue({
        status: 'paid',
        transactionId: 'wx_transaction_123'
      });

      const result = await paymentService.queryPaymentStatus(orderId);

      expect(result.status).toBe('paid');
      expect(result.transactionId).toBe('wx_transaction_123');
    });

    it('应该查询支付宝支付状态', async () => {
      const orderId = 'order123';

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: orderId,
        status: 'pending',
        provider: 'alipay'
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);

      // Mock 支付宝查询响应
      const mockQueryResponse = {
        alipay_trade_query_response: {
          code: '10000',
          trade_status: 'TRADE_SUCCESS',
          trade_no: 'alipay_trade_123',
          total_amount: '100.00'
        }
      };

      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockQueryResponse })
      }));

      mockPaymentRecord.save = jest.fn().mockResolvedValue({
        status: 'paid'
      });

      const result = await paymentService.queryPaymentStatus(orderId);

      expect(result.status).toBe('paid');
    });

    it('应该处理支付未成功的情况', async () => {
      const orderId = 'order123';

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: orderId,
        status: 'pending'
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);

      const mockQueryResponse = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        trade_state: 'NOTPAY'
      };

      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockQueryResponse })
      }));

      const result = await paymentService.queryPaymentStatus(orderId);

      expect(result.status).toBe('pending');
    });
  });

  describe('refundPayment', () => {
    it('应该成功处理微信退款', async () => {
      const refundData = {
        orderId: 'order123',
        refundAmount: 5000,
        reason: '用户申请退款'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: refundData.orderId,
        status: 'paid',
        amount: 10000,
        provider: 'wechat',
        transactionId: 'wx_transaction_123',
        save: jest.fn().mockResolvedValue({})
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);

      // Mock 微信退款响应
      const mockRefundResponse = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        refund_id: 'wx_refund_123',
        out_refund_no: 'refund_order_123',
        refund_fee: '5000'
      };

      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockRefundResponse })
      }));

      const result = await paymentService.refundPayment(refundData);

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('wx_refund_123');
      expect(mockPaymentRecord.status).toBe('refunded');
    });

    it('应该处理部分退款', async () => {
      const refundData = {
        orderId: 'order123',
        refundAmount: 3000,
        reason: '部分商品退货'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: refundData.orderId,
        status: 'paid',
        amount: 10000,
        provider: 'alipay',
        save: jest.fn().mockResolvedValue({})
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);

      // Mock 支付宝退款响应
      const mockRefundResponse = {
        alipay_trade_refund_response: {
          code: '10000',
          msg: 'Success',
          out_trade_no: 'order123',
          refund_amount: '30.00',
          out_request_no: 'refund_request_123'
        }
      };

      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockRefundResponse })
      }));

      const result = await paymentService.refundPayment(refundData);

      expect(result.success).toBe(true);
      expect(result.refund_amount).toBe('30.00');
    });

    it('应该在退款金额无效时抛出错误', async () => {
      const refundData = {
        orderId: 'order123',
        refundAmount: 15000, // 大于原支付金额
        reason: '退款金额错误'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: refundData.orderId,
        status: 'paid',
        amount: 10000
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);

      await expect(paymentService.refundPayment(refundData))
        .rejects.toThrow('退款金额无效');
    });

    it('应该在订单未支付时抛出错误', async () => {
      const refundData = {
        orderId: 'order123',
        refundAmount: 5000
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: refundData.orderId,
        status: 'pending'
      };

      PaymentRecord.findOne.mockResolvedValue(mockPaymentRecord);

      await expect(paymentService.refundPayment(refundData))
        .rejects.toThrow('订单未支付，无法退款');
    });
  });

  describe('getPaymentStatistics', () => {
    it('应该获取支付统计数据', async () => {
      const filters = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        method: 'wechat'
      };

      const mockStats = {
        total_count: 1250,
        total_amount: 1250000,
        success_count: 1200,
        success_amount: 1200000,
        success_rate: 96.0,
        average_amount: 1000,
        daily_stats: [
          { date: '2025-01-01', count: 45, amount: 45000 },
          { date: '2025-01-02', count: 52, amount: 52000 }
        ],
        method_distribution: {
          wechat: { count: 800, amount: 800000 },
          alipay: { count: 450, amount: 450000 }
        }
      };

      PaymentRecord.getPaymentStats.mockResolvedValue(mockStats);

      const result = await paymentService.getPaymentStatistics(filters);

      expect(result.total_count).toBe(1250);
      expect(result.total_amount).toBe(1250000);
      expect(result.success_rate).toBe(96.0);
    });
  });

  describe('generatePaymentQRCode', () => {
    it('应该生成微信支付二维码', async () => {
      const qrData = {
        orderId: 'order123',
        amount: 10000,
        description: '农资采购',
        method: 'wechat'
      };

      const mockQRCode = Buffer.from('qrcode-image-data');

      // Mock QR code generation
      jest.doMock('qrcode', () => ({
        toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qrcode')
      }));

      const result = await paymentService.generatePaymentQRCode(qrData);

      expect(result.success).toBe(true);
      expect(result.qr_code).toContain('data:image/png;base64,');
      expect(result.order_info.orderId).toBe('order123');
    });

    it('应该生成支付宝二维码', async () => {
      const qrData = {
        orderId: 'order123',
        amount: 10000,
        method: 'alipay'
      };

      jest.doMock('qrcode', () => ({
        toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,alipay_qrcode')
      }));

      const result = await paymentService.generatePaymentQRCode(qrData);

      expect(result.success).toBe(true);
      expect(result.method).toBe('alipay');
    });
  });

  describe('validatePaymentAmount', () => {
    it('应该验证有效的支付金额', () => {
      const validAmounts = [
        1, 100, 99999, 100000
      ];

      validAmounts.forEach(amount => {
        expect(paymentService.validatePaymentAmount(amount)).toBe(true);
      });
    });

    it('应该拒绝无效的支付金额', () => {
      const invalidAmounts = [
        0, -1, 0.01, 100001
      ];

      invalidAmounts.forEach(amount => {
        expect(paymentService.validatePaymentAmount(amount)).toBe(false);
      });
    });
  });

  describe('retryPayment', () => {
    it('应该重试失败的支付', async () => {
      const retryData = {
        paymentId: 'payment123',
        reason: '网络超时重试'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        orderId: 'order123',
        status: 'failed',
        method: 'wechat',
        amount: 10000,
        retryCount: 2,
        save: jest.fn().mockResolvedValue({})
      };

      PaymentRecord.findById.mockResolvedValue(mockPaymentRecord);

      // Mock successful retry payment
      const mockRetryResponse = {
        return_code: 'SUCCESS',
        result_code: 'SUCCESS',
        prepay_id: 'new_prepay_123'
      };

      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({ data: mockRetryResponse })
      }));

      const result = await paymentService.retryPayment(retryData);

      expect(result.success).toBe(true);
      expect(mockPaymentRecord.retryCount).toBe(3);
    });

    it('应该在重试次数超限时拒绝', async () => {
      const retryData = {
        paymentId: 'payment123'
      };

      const mockPaymentRecord = {
        _id: 'payment123',
        status: 'failed',
        retryCount: 5 // 已达到最大重试次数
      };

      PaymentRecord.findById.mockResolvedValue(mockPaymentRecord);

      await expect(paymentService.retryPayment(retryData))
        .rejects.toThrow('重试次数已达上限');
    });
  });
});