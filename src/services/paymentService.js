/**
 * 支付服务
 * 集成微信支付、支付宝等第三方支付系统
 */

const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
  constructor() {
    // 支付配置
    this.config = {
      // 微信支付配置
      wechat: {
        appId: process.env.WECHAT_APP_ID,
        mchId: process.env.WECHAT_MCH_ID,
        apiKey: process.env.WECHAT_API_KEY,
        apiCertPath: process.env.WECHAT_API_CERT_PATH,
        apiKeyPath: process.env.WECHAT_API_KEY_PATH,
        notifyUrl: process.env.WECHAT_NOTIFY_URL,
        sandbox: process.env.NODE_ENV !== 'production'
      },

      // 支付宝配置
      alipay: {
        appId: process.env.ALIPAY_APP_ID,
        merchantPrivateKey: process.env.ALIPAY_MERCHANT_PRIVATE_KEY,
        alipayPublicKey: process.env.ALIPAY_ALIPAY_PUBLIC_KEY,
        gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
        notifyUrl: process.env.ALIPAY_NOTIFY_URL,
        sandbox: process.env.NODE_ENV !== 'production'
      },

      // 通用配置
      common: {
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 2000,
        currency: 'CNY',
        maxAmount: 50000 // 最大支付金额（分）
      }
    };

    // 支付类型映射
    this.paymentTypes = {
      wechat: 'wechat_pay',
      alipay: 'alipay',
      unionpay: 'union_pay',
      balance: 'balance'
    };

    // 支付状态映射
    this.statusMap = {
      pending: 'pending',
      processing: 'processing',
      success: 'success',
      failed: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded'
    };
  }

  /**
   * 创建微信支付订单
   */
  async createWechatOrder(orderData) {
    try {
      const {
        orderId,
        amount,
        description,
        userId,
        villageId,
        type = 'native',
        openid
      } = orderData;

      // 验证参数
      this.validateOrderParams(orderData);

      // 构建微信支付参数
      const wechatParams = {
        appid: this.config.wechat.appId,
        mch_id: this.config.wechat.mchId,
        nonce_str: this.generateNonceStr(),
        body: description,
        out_trade_no: orderId,
        total_fee: amount, // 金额（分）
        spbill_create_ip: '127.0.0.1',
        notify_url: this.config.wechat.notifyUrl,
        trade_type: type === 'h5' ? 'MWEB' : 'NATIVE',
        openid,
        attach: JSON.stringify({
          userId,
          villageId,
          type: 'village_service'
        })
      };

      // 生成签名
      const sign = this.generateWechatSign(wechatParams);
      wechatParams.sign = sign;

      // 发送微信支付请求
      const url = this.config.wechat.sandbox
        ? 'https://api.mch.weixin.qq.com/sandboxnew/pay/unifiedorder'
        : 'https://api.mch.weixin.qq.com/pay/unifiedorder';

      const response = await axios.post(url, this.convertToXml(wechatParams), {
        headers: { 'Content-Type': 'application/xml' },
        timeout: this.config.common.timeout
      });

      const result = await this.parseWechatResponse(response.data);

      if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
        throw new Error(`微信支付创建失败: ${result.return_msg || result.err_code_des}`);
      }

      // 保存支付记录
      await this.savePaymentRecord({
        orderId,
        type: 'wechat',
        amount,
        description,
        status: 'pending',
        userId,
        villageId,
        platformOrderId: result.prepay_id,
        rawData: result
      });

      return {
        success: true,
        type: 'wechat',
        orderId,
        platformOrderId: result.prepay_id,
        qrCode: result.code_url,
        payUrl: result.mweb_url,
        expireTime: this.addMinutes(new Date(), 30) // 30分钟过期
      };

    } catch (error) {
      logger.error('创建微信支付订单失败:', error);
      throw new Error(`微信支付创建失败: ${error.message}`);
    }
  }

  /**
   * 创建支付宝订单
   */
  async createAlipayOrder(orderData) {
    try {
      const {
        orderId,
        amount,
        description,
        userId,
        villageId,
        returnUrl,
        type = 'pc'
      } = orderData;

      // 验证参数
      this.validateOrderParams(orderData);

      // 构建支付宝参数
      const alipayParams = {
        app_id: this.config.alipay.appId,
        method: 'alipay.trade.page.pay',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: this.formatDate(new Date()),
        version: '1.0',
        notify_url: this.config.alipay.notifyUrl,
        return_url: returnUrl,
        biz_content: JSON.stringify({
          out_trade_no: orderId,
          product_code: 'FAST_INSTANT_TRADE_PAY',
          total_amount: (amount / 100).toFixed(2), // 转换为元
          subject: description,
          body: JSON.stringify({
            userId,
            villageId,
            type: 'village_service'
          })
        })
      };

      // 生成签名
      const sign = this.generateAlipaySign(alipayParams);
      alipayParams.sign = sign;

      // 发送支付宝请求
      const response = await axios.post(this.config.alipay.gateway, alipayParams, {
        timeout: this.config.common.timeout
      });

      const result = response.data;

      if (result.alipay_trade_page_pay_response.code !== '10000') {
        throw new Error(`支付宝创建失败: ${result.alipay_trade_page_pay_response.msg}`);
      }

      // 保存支付记录
      await this.savePaymentRecord({
        orderId,
        type: 'alipay',
        amount,
        description,
        status: 'pending',
        userId,
        villageId,
        platformOrderId: result.alipay_trade_page_pay_response.out_trade_no,
        rawData: result
      });

      return {
        success: true,
        type: 'alipay',
        orderId,
        platformOrderId: result.alipay_trade_page_pay_response.out_trade_no,
        payUrl: result.alipay_trade_page_pay_response.url,
        expireTime: this.addMinutes(new Date(), 30)
      };

    } catch (error) {
      logger.error('创建支付宝订单失败:', error);
      throw new Error(`支付宝创建失败: ${error.message}`);
    }
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(orderId, type) {
    try {
      let result;

      if (type === 'wechat') {
        result = await this.queryWechatPayment(orderId);
      } else if (type === 'alipay') {
        result = await this.queryAlipayPayment(orderId);
      } else {
        throw new Error('不支持的支付类型');
      }

      // 更新本地支付记录
      await this.updatePaymentStatus(orderId, result.status, result);

      return result;

    } catch (error) {
      console.error(`查询支付状态失败 (${type}):`, error);
      throw error;
    }
  }

  /**
   * 申请退款
   */
  async refundPayment(orderId, amount, reason) {
    try {
      // 获取支付记录
      const paymentRecord = await this.getPaymentRecord(orderId);
      if (!paymentRecord) {
        throw new Error('支付记录不存在');
      }

      let refundResult;

      if (paymentRecord.type === 'wechat') {
        refundResult = await this.createWechatRefund(orderId, amount, reason);
      } else if (paymentRecord.type === 'alipay') {
        refundResult = await this.createAlipayRefund(orderId, amount, reason);
      } else {
        throw new Error('不支持的支付类型');
      }

      // 更新支付记录
      await this.updateRefundStatus(orderId, refundResult);

      return {
        success: true,
        orderId,
        refundId: refundResult.refundId,
        refundAmount: amount,
        refundStatus: 'processing'
      };

    } catch (error) {
      logger.error('申请退款失败:', error);
      throw new Error(`申请退款失败: ${error.message}`);
    }
  }

  /**
   * 验证支付回调
   */
  async verifyPaymentCallback(type, callbackData) {
    try {
      let isValid = false;
      let orderId = null;
      let status = null;

      if (type === 'wechat') {
        const result = await this.verifyWechatCallback(callbackData);
        isValid = result.valid;
        orderId = result.orderId;
        status = result.status;
      } else if (type === 'alipay') {
        const result = await this.verifyAlipayCallback(callbackData);
        isValid = result.valid;
        orderId = result.orderId;
        status = result.status;
      }

      if (!isValid) {
        throw new Error('支付回调验证失败');
      }

      // 更新支付状态
      await this.updatePaymentStatus(orderId, status, { callbackVerified: true });

      return {
        success: true,
        orderId,
        status,
        callbackVerified: true
      };

    } catch (error) {
      logger.error('验证支付回调失败:', error);
      throw new Error(`验证支付回调失败: ${error.message}`);
    }
  }

  /**
   * 查询微信支付状态
   */
  async queryWechatPayment(orderId) {
    const params = {
      appid: this.config.wechat.appId,
      mch_id: this.config.wechat.mchId,
      out_trade_no: orderId,
      nonce_str: this.generateNonceStr()
    };

    const sign = this.generateWechatSign(params);
    params.sign = sign;

    const url = this.config.wechat.sandbox
      ? 'https://api.mch.weixin.qq.com/sandboxnew/pay/orderquery'
      : 'https://api.mch.weixin.qq.com/pay/orderquery';

    const response = await axios.post(url, this.convertToXml(params), {
      headers: { 'Content-Type': 'application/xml' },
      timeout: this.config.common.timeout
    });

    const result = await this.parseWechatResponse(response.data);

    return {
      orderId: result.out_trade_no,
      platformOrderId: result.transaction_id,
      status: this.mapWechatStatus(result.trade_state),
      amount: parseInt(result.total_fee),
      payTime: result.time_end ? new Date(result.time_end) : null,
      rawData: result
    };
  }

  /**
   * 查询支付宝支付状态
   */
  async queryAlipayPayment(orderId) {
    const params = {
      app_id: this.config.alipay.appId,
      method: 'alipay.trade.query',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatDate(new Date()),
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: orderId
      })
    };

    const sign = this.generateAlipaySign(params);
    params.sign = sign;

    const response = await axios.post(this.config.alipay.gateway, params, {
      timeout: this.config.common.timeout
    });

    const result = response.data.alipay_trade_query_response;

    if (result.code !== '10000') {
      throw new Error(`支付宝查询失败: ${result.msg}`);
    }

    return {
      orderId: result.out_trade_no,
      platformOrderId: result.trade_no,
      status: this.mapAlipayStatus(result.trade_status),
      amount: Math.round(parseFloat(result.total_amount) * 100), // 转换为分
      payTime: result.send_pay_time ? new Date(result.send_pay_time) : null,
      rawData: result
    };
  }

  /**
   * 创建微信退款
   */
  async createWechatRefund(orderId, amount, reason) {
    const refundId = `RF${  orderId  }${Date.now()}`;
    const params = {
      appid: this.config.wechat.appId,
      mch_id: this.config.wechat.mchId,
      nonce_str: this.generateNonceStr(),
      out_trade_no: orderId,
      out_refund_no: refundId,
      total_fee: amount,
      refund_fee: amount,
      refund_desc: reason || '正常退款'
    };

    const sign = this.generateWechatSign(params);
    params.sign = sign;

    const url = this.config.wechat.sandbox
      ? 'https://api.mch.weixin.qq.com/sandboxnew/refund'
      : 'https://api.mch.weixin.qq.com/secapi/pay/refund';

    const response = await axios.post(url, this.convertToXml(params), {
      headers: { 'Content-Type': 'application/xml' },
      timeout: this.config.common.timeout
    });

    const result = await this.parseWechatResponse(response.data);

    if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS') {
      throw new Error(`微信退款失败: ${result.return_msg || result.err_code_des}`);
    }

    return {
      refundId,
      platformRefundId: result.refund_id,
      status: 'processing'
    };
  }

  /**
   * 创建支付宝退款
   */
  async createAlipayRefund(orderId, amount, reason) {
    const refundId = `RF${  orderId  }${Date.now()}`;
    const params = {
      app_id: this.config.alipay.appId,
      method: 'alipay.trade.refund',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatDate(new Date()),
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: orderId,
        refund_amount: (amount / 100).toFixed(2), // 转换为元
        refund_reason: reason || '正常退款',
        out_request_no: refundId
      })
    };

    const sign = this.generateAlipaySign(params);
    params.sign = sign;

    const response = await axios.post(this.config.alipay.gateway, params, {
      timeout: this.config.common.timeout
    });

    const result = response.data.alipay_trade_refund_response;

    if (result.code !== '10000') {
      throw new Error(`支付宝退款失败: ${result.msg}`);
    }

    return {
      refundId,
      platformRefundId: result.refund_id || result.out_request_no,
      status: this.mapAlipayRefundStatus(result.refund_status)
    };
  }

  /**
   * 生成随机字符串
   */
  generateNonceStr() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 生成微信支付签名
   */
  generateWechatSign(params) {
    // 排序参数
    const sortedKeys = Object.keys(params).sort();
    const stringA = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

    // 添加商户密钥
    const stringSignTemp = `${stringA}&key=${this.config.wechat.apiKey}`;

    // MD5签名
    return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
  }

  /**
   * 生成支付宝签名
   */
  generateAlipaySign(params) {
    // 排序参数并排除sign
    const sortedKeys = Object.keys(params).sort().filter(key => key !== 'sign');
    const stringA = sortedKeys.map(key => {
      let value = params[key];
      if (key === 'biz_content') {
        value = value.replace(/\+/g, '%20');
      }
      return `${key}=${value}`;
    }).join('&');

    // 使用RSA私钥签名
    const sign = crypto
      .createSign('RSA-SHA256')
      .update(stringA, 'utf8')
      .sign(this.config.alipay.merchantPrivateKey, 'base64');

    return sign;
  }

  /**
   * 验证微信回调签名
   */
  async verifyWechatCallback(callbackData) {
    const params = this.parseXmlToMap(callbackData);
    const sign = params.sign;

    delete params.sign;

    const stringA = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    const stringSignTemp = `${stringA}&key=${this.config.wechat.apiKey}`;
    const generatedSign = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();

    const isValid = generatedSign === sign.toUpperCase();

    return {
      valid: isValid,
      orderId: params.out_trade_no,
      status: this.mapWechatStatus(params.trade_state),
      amount: parseInt(params.total_fee),
      transactionId: params.transaction_id
    };
  }

  /**
   * 验证支付宝回调签名
   */
  async verifyAlipayCallback(callbackData) {
    const params = callbackData;
    const sign = params.sign;

    delete params.sign;

    const sortedKeys = Object.keys(params).sort();
    const stringA = sortedKeys.map(key => {
      let value = params[key];
      if (key === 'biz_content') {
        value = value.replace(/\+/g, '%20');
      }
      return `${key}=${value}`;
    }).join('&');

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(stringA, 'utf8');

    const isValid = verifier.verify(this.config.alipay.alipayPublicKey, sign, 'base64');

    const bizContent = JSON.parse(params.biz_content);

    return {
      valid: isValid,
      orderId: bizContent.out_trade_no,
      status: this.mapAlipayStatus(bizContent.trade_status),
      amount: Math.round(parseFloat(bizContent.total_amount) * 100),
      transactionId: bizContent.trade_no
    };
  }

  /**
   * 保存支付记录
   */
  async savePaymentRecord(paymentData) {
    try {
      const PaymentRecord = require('../models/PaymentRecord');

      const record = new PaymentRecord({
        orderId: paymentData.orderId,
        type: paymentData.type,
        amount: paymentData.amount,
        description: paymentData.description,
        status: paymentData.status,
        userId: paymentData.userId,
        villageId: paymentData.villageId,
        platformOrderId: paymentData.platformOrderId,
        rawData: paymentData.rawData,
        createdAt: new Date()
      });

      await record.save();
      return record;
    } catch (error) {
      logger.error('保存支付记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取支付记录
   */
  async getPaymentRecord(orderId) {
    try {
      const PaymentRecord = require('../models/PaymentRecord');
      return await PaymentRecord.findOne({ orderId });
    } catch (error) {
      logger.error('获取支付记录失败:', error);
      return null;
    }
  }

  /**
   * 更新支付状态
   */
  async updatePaymentStatus(orderId, updateData) {
    try {
      const PaymentRecord = require('../models/PaymentRecord');

      const updateFields = {
        status: updateData.status,
        updatedAt: new Date()
      };

      if (updateData.amount) {
        updateFields.amount = updateData.amount;
      }

      if (updateData.payTime) {
        updateFields.payTime = updateData.payTime;
      }

      if (updateData.platformOrderId) {
        updateFields.platformOrderId = updateData.platformOrderId;
      }

      if (updateData.callbackVerified) {
        updateFields.callbackVerified = updateData.callbackVerified;
      }

      await PaymentRecord.updateOne(
        { orderId },
        { $set: updateFields }
      );
    } catch (error) {
      logger.error('更新支付状态失败:', error);
    }
  }

  /**
   * 更新退款状态
   */
  async updateRefundStatus(orderId, refundData) {
    try {
      const PaymentRecord = require('../models/PaymentRecord');

      await PaymentRecord.updateOne(
        { orderId },
        {
          $set: {
            refundId: refundData.refundId,
            platformRefundId: refundData.platformRefundId,
            refundStatus: refundData.status,
            refundAmount: refundData.amount,
            refundTime: new Date(),
            updatedAt: new Date()
          }
        }
      );
    } catch (error) {
      logger.error('更新退款状态失败:', error);
    }
  }

  /**
   * 验证订单参数
   */
  validateOrderParams(orderData) {
    const { orderId, amount, description, userId, villageId } = orderData;

    if (!orderId || !amount || !description || !userId || !villageId) {
      throw new Error('订单参数不完整');
    }

    if (amount <= 0) {
      throw new Error('金额必须大于0');
    }

    if (amount > this.config.common.maxAmount) {
      throw new Error(`支付金额不能超过${this.config.common.maxAmount}分`);
    }

    if (!uuidv4.validate(orderId)) {
      throw new Error('订单ID格式不正确');
    }
  }

  /**
   * 映射微信支付状态
   */
  mapWechatStatus(wechatStatus) {
    const statusMap = {
      'SUCCESS': 'success',
      'REFUND': 'refunded',
      'NOTPAY': 'pending',
      'CLOSED': 'cancelled',
      'USERPAYING': 'processing',
      'PAYERROR': 'failed'
    };

    return statusMap[wechatStatus] || 'failed';
  }

  /**
   * 映射支付宝支付状态
   */
  mapAlipayStatus(alipayStatus) {
    const statusMap = {
      'WAIT_BUYER_PAY': 'pending',
      'TRADE_SUCCESS': 'success',
      'TRADE_FINISHED': 'success',
      'TRADE_CLOSED': 'cancelled',
      'WAIT_BUYER_PAY': 'pending'
    };

    return statusMap[alipayStatus] || 'failed';
  }

  /**
   * 映射支付宝退款状态
   */
  mapAlipayRefundStatus(refundStatus) {
    const statusMap = {
      'REFUND_SUCCESS': 'success',
      'REFUND_PROCESSING': 'processing',
      'REFUND_FAILED': 'failed'
    };

    return statusMap[refundStatus] || 'failed';
  }

  /**
   * 转换为XML格式
   */
  convertToXml(params) {
    const xml = Object.keys(params).map(key => {
      return `<${key}><![CDATA[${params[key]}]]></${key}>`;
    }).join('');

    return `<xml>${xml}</xml>`;
  }

  /**
   * 解析XML响应
   */
  async parseWechatResponse(xmlData) {
    try {
      const xml2js = require('xml2js');
      const logger = require('../utils/logger');
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: true
      });

      const result = await parser.parseStringPromise(xmlData);
      return result.xml;
    } catch (error) {
      throw new Error('解析微信支付响应失败');
    }
  }

  /**
   * 解析XML为Map
   */
  parseXmlToMap(xmlData) {
    const result = {};
    const matches = xmlData.match(/<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g);

    if (matches) {
      matches.forEach(match => {
        const key = match.match(/<(\w+)>/)[1];
        const value = match.match(/<!\[CDATA\[(.*?)\]\]>/)[2];
        result[key] = value;
      });
    }

    return result;
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  /**
   * 添加分钟
   */
  addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }
}

module.exports = new PaymentService();