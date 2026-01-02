/**
 * 身份证OCR识别服务
 * 专门用于身份证正反面识别和信息提取
 *
 * 主要功能：
 * - 身份证正面识别（姓名、身份证号、性别、民族、出生日期、地址）
 * - 身份证背面识别（签发机关、有效期限）
 * - 身份证号校验
 * - 信息提取和验证
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class IdentityCardOCRService {
  constructor() {
    // 腾讯OCR配置
    this.tencentConfig = {
      apiUrl: 'https://ocr.tencentcloudapi.com/',
      secretId: process.env.TENCENT_OCR_SECRET_ID,
      secretKey: process.env.TENCENT_OCR_SECRET_KEY,
      region: process.env.TENCENT_OCR_REGION || 'ap-beijing',
      version: '2018-11-19',
      endpoint: '.tencentcloudapi.com'
    };
  }

  /**
   * 识别身份证正面
   * @param {Buffer|string} image - 图片Buffer或Base64编码
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeIdCardFront(image, options = {}) {
    try {
      const startTime = Date.now();

      // 准备请求参数
      const action = 'GeneralBasicOCR'; // 使用通用OCR，支持身份证
      const payload = {
        ImageBase64: this._prepareImage(image),
        Config: {
          CropPortrait: true, // 裁剪人像
          CropIdCard: true     // 裁剪身份证
        }
      };

      // 调用腾讯OCR API
      const ocrResult = await this._callTencentOCR(action, payload);

      // 解析识别结果
      const parsedResult = this._parseIdCardFrontResult(ocrResult);

      // 计算处理时间
      const processTime = Date.now() - startTime;

      // 记录日志
      logger.info('身份证正面识别完成', {
        success: parsedResult.success,
        confidence: parsedResult.confidence,
        processTime: `${processTime}ms`
      });

      return {
        success: parsedResult.success,
        data: parsedResult.data,
        confidence: parsedResult.confidence,
        processTime,
        raw: ocrResult
      };

    } catch (error) {
      logger.error('身份证正面识别失败:', error);
      throw new Error(`身份证正面识别失败: ${error.message}`);
    }
  }

  /**
   * 识别身份证背面
   * @param {Buffer|string} image - 图片Buffer或Base64编码
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeIdCardBack(image, options = {}) {
    try {
      const startTime = Date.now();

      // 准备请求参数
      const action = 'GeneralBasicOCR';
      const payload = {
        ImageBase64: this._prepareImage(image)
      };

      // 调用腾讯OCR API
      const ocrResult = await this._callTencentOCR(action, payload);

      // 解析识别结果
      const parsedResult = this._parseIdCardBackResult(ocrResult);

      // 计算处理时间
      const processTime = Date.now() - startTime;

      logger.info('身份证背面识别完成', {
        success: parsedResult.success,
        processTime: `${processTime}ms`
      });

      return {
        success: parsedResult.success,
        data: parsedResult.data,
        processTime,
        raw: ocrResult
      };

    } catch (error) {
      logger.error('身份证背面识别失败:', error);
      throw new Error(`身份证背面识别失败: ${error.message}`);
    }
  }

  /**
   * 同时识别身份证正反面
   * @param {Object} images - { front: Buffer, back: Buffer }
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 综合识别结果
   */
  async recognizeIdCard(images, options = {}) {
    try {
      // 并发识别正反面
      const [frontResult, backResult] = await Promise.all([
        this.recognizeIdCardFront(images.front, options),
        this.recognizeIdCardBack(images.back, options)
      ]);

      // 合并结果
      const combinedResult = {
        success: frontResult.success && backResult.success,
        front: frontResult.data,
        back: backResult.data,
        confidence: (frontResult.confidence + backResult.confidence) / 2,
        processTime: frontResult.processTime + backResult.processTime,
        verified: this._validateIdCardNumber(frontResult.data?.idCard)
      };

      logger.info('身份证识别完成', {
        success: combinedResult.success,
        idCardVerified: combinedResult.verified
      });

      return combinedResult;

    } catch (error) {
      logger.error('身份证识别失败:', error);
      throw error;
    }
  }

  /**
   * 验证身份证号码格式和校验位
   * @param {string} idCard - 身份证号码
   * @returns {boolean} 是否有效
   */
  validateIdCard(idCard) {
    if (!idCard || typeof idCard !== 'string') {
      return false;
    }

    // 去除空格
    idCard = idCard.trim();

    // 18位身份证号校验
    const pattern = /^\d{17}[\dXx]$/;
    if (!pattern.test(idCard)) {
      return false;
    }

    // 校验位计算
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * weights[i];
    }

    const checkCode = checkCodes[sum % 11];
    return checkCode.toUpperCase() === idCard[17].toUpperCase();
  }

  /**
   * 从身份证号提取信息
   * @param {string} idCard - 身份证号码
   * @returns {Object} 提取的信息
   */
  extractFromIdCard(idCard) {
    if (!this.validateIdCard(idCard)) {
      throw new Error('无效的身份证号码');
    }

    // 出生日期
    const birthYear = parseInt(idCard.substring(6, 10));
    const birthMonth = parseInt(idCard.substring(10, 12));
    const birthDay = parseInt(idCard.substring(12, 14));
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

    // 性别
    const genderCode = parseInt(idCard[16]);
    const gender = genderCode % 2 === 0 ? '女' : '男';

    // 年龄
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const monthDiff = today.getMonth() + 1 - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
      age--;
    }

    return {
      birthDate,
      birthYear,
      birthMonth,
      birthDay,
      gender,
      genderCode,
      age
    };
  }

  /**
   * 解析身份证正面识别结果
   * @private
   */
  _parseIdCardFrontResult(ocrResult) {
    try {
      if (!ocrResult.TextDetections) {
        return { success: false, data: null, confidence: 0 };
      }

      const texts = ocrResult.TextDetections.map(item => item.DetectedText);
      const data = {
        name: null,
        idCard: null,
        gender: null,
        ethnicity: null,
        birthDate: null,
        address: null
      };

      // 解析姓名（通常是第一个文字）
      if (texts.length > 0) {
        data.name = texts[0];
      }

      // 从OCR结果中提取身份证号（18位数字）
      const idCardMatch = texts.find(text => /^\d{17}[\dXx]$/.test(text));
      if (idCardMatch) {
        data.idCard = idCardMatch;
      }

      // 提取性别（男/女）
      const genderMatch = texts.find(text => ['男', '女'].includes(text));
      if (genderMatch) {
        data.gender = genderMatch;
      }

      // 提取民族
      const ethnicityMatch = texts.find(text => text.includes('族'));
      if (ethnicityMatch) {
        data.ethnicity = ethnicityMatch;
      }

      // 提取出生日期（YYYY年MM月DD日）
      const birthMatch = texts.find(text => /\d{4}年\d{1,2}月\d{1,2}日/.test(text));
      if (birthMatch) {
        data.birthDate = birthMatch;
      }

      // 提取地址（较长的文本）
      const addressMatch = texts.find(text => text.length > 10 && (text.includes('省') || text.includes('市') || text.includes('区') || text.includes('县')));
      if (addressMatch) {
        data.address = addressMatch;
      }

      // 计算置信度（基于是否提取到关键字段）
      const hasName = !!data.name;
      const hasIdCard = !!data.idCard;
      const confidence = (hasName ? 0.25 : 0) + (hasIdCard ? 0.35 : 0) +
                        (data.gender ? 0.1 : 0) + (data.ethnicity ? 0.1 : 0) +
                        (data.birthDate ? 0.1 : 0) + (data.address ? 0.1 : 0);

      return {
        success: hasIdCard, // 至少要有身份证号才算成功
        data,
        confidence
      };

    } catch (error) {
      logger.error('解析身份证正面结果失败:', error);
      return { success: false, data: null, confidence: 0 };
    }
  }

  /**
   * 解析身份证背面识别结果
   * @private
   */
  _parseIdCardBackResult(ocrResult) {
    try {
      if (!ocrResult.TextDetections) {
        return { success: false, data: null };
      }

      const texts = ocrResult.TextDetections.map(item => item.DetectedText);
      const data = {
        issuingAuthority: null,
        validDate: null
      };

      // 提取签发机关（通常是公安部门）
      const authorityMatch = texts.find(text => text.includes('公安') || text.includes('局'));
      if (authorityMatch) {
        data.issuingAuthority = authorityMatch;
      }

      // 提取有效期（YYYY.MM.DD-YYYY.MM.DD格式）
      const validMatch = texts.find(text => /\d{4}\.\d{1,2}\.\d{1,2}-\d{4}\.\d{1,2}\.\d{1,2}/.test(text) ||
                                       /\d{4}年\d{1,2}月\d{1,2}日/.test(text));
      if (validMatch) {
        data.validDate = validMatch;
      }

      const hasAuthority = !!data.issuingAuthority;
      const hasValidDate = !!data.validDate;
      const success = hasAuthority || hasValidDate;

      return {
        success,
        data
      };

    } catch (error) {
      logger.error('解析身份证背面结果失败:', error);
      return { success: false, data: null };
    }
  }

  /**
   * 准备图片数据（转换为Base64）
   * @private
   */
  _prepareImage(image) {
    if (Buffer.isBuffer(image)) {
      return image.toString('base64');
    } else if (typeof image === 'string') {
      // 如果是base64字符串，直接返回
      if (!image.startsWith('data:image')) {
        return image;
      }
      // 去除data:image/xxx;base64,前缀
      return image.split(',')[1];
    } else {
      throw new Error('不支持的图片格式');
    }
  }

  /**
   * 调用腾讯OCR API
   * @private
   */
  async _callTencentOCR(action, payload) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const date = new Date(timestamp * 1000).toISOString().slice(0, 10).replace(/-/g, '');

      // 构造请求参数
      const params = {
        Action: action,
        Version: this.tencentConfig.version,
        Region: this.tencentConfig.region,
        Timestamp: timestamp,
        Language: 'zh-CN',
        ...payload
      };

      // 生成签名
      const authorization = this._generateAuthorization(params, timestamp, date);

      // 发送请求
      const response = await axios.post(
        `https://${this.tencentConfig.endpoint}/`,
        params,
        {
          headers: {
            'Authorization': authorization,
            'Content-Type': 'application/json',
            'Host': this.tencentConfig.endpoint,
            'X-TC-Action': action,
            'X-TC-Timestamp': timestamp.toString(),
            'X-TC-Region': this.tencentConfig.region,
            'X-TC-Version': this.tencentConfig.version
          }
        }
      );

      if (response.data.Response.Error) {
        throw new Error(`腾讯OCR错误: ${response.data.Response.Error.Message}`);
      }

      return response.data.Response;

    } catch (error) {
      logger.error('调用腾讯OCR API失败:', error);
      throw error;
    }
  }

  /**
   * 生成腾讯云API签名
   * @private
   */
  _generateAuthorization(params, timestamp, date) {
    const algorithm = 'TC3-HMAC-SHA256';

    // 1. 构造规范请求串
    const httpRequestMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:application/json\nhost:${this.tencentConfig.endpoint}\n`;
    const signedHeaders = 'content-type;host';
    const hashedRequestPayload = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex');

    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

    // 2. 构造待签名字符串
    const credentialScope = `${date}/${this.tencentConfig.service || 'ocr'}/tc3_request`;
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    // 3. 计算签名
    const secretKey = crypto.createHmac('sha256', `TC3${this.tencentConfig.secretKey}`).update(date).digest();
    const secretId = crypto.createHmac('sha256', secretKey).update(this.tencentConfig.endpoint).digest();
    const signature = crypto.createHmac('sha256', secretId).update(stringToSign).digest('hex');

    // 4. 构造Authorization
    const authorization = `${algorithm} Credential=${this.tencentConfig.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return authorization;
  }

  /**
   * 验证身份证号（内部方法）
   * @private
   */
  _validateIdCardNumber(idCard) {
    if (!idCard) return { valid: false };

    const isValid = this.validateIdCard(idCard);
    if (!isValid) {
      return { valid: false, error: '身份证号格式不正确' };
    }

    try {
      const extractedInfo = this.extractFromIdCard(idCard);
      return {
        valid: true,
        extractedInfo
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new IdentityCardOCRService();
