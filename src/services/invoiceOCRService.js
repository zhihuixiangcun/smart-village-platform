/**
 * 智能票据OCR识别服务
 * 提供票据识别、验证、重复检查等功能
 */

const { InvoiceOCR } = require('../models/Finance');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const crypto = require('crypto');

class InvoiceOCRService {
  constructor() {
    this.ocrEngines = {
      baidu: {
        name: '百度OCR',
        apiUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice',
        accessToken: process.env.BAIDU_OCR_ACCESS_TOKEN,
        apiKey: process.env.BAIDU_OCR_API_KEY,
        secretKey: process.env.BAIDU_OCR_SECRET_KEY
      },
      tencent: {
        name: '腾讯OCR',
        apiUrl: 'https://ocr.tencentcloudapi.com/',
        secretId: process.env.TENCENT_OCR_SECRET_ID,
        secretKey: process.env.TENCENT_OCR_SECRET_KEY,
        region: 'ap-beijing'
      },
      alibaba: {
        name: '阿里云OCR',
        apiUrl: 'https://ocr-api.cn-hangzhou.aliyuncs.com/',
        accessKeyId: process.env.ALIBABA_OCR_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIBABA_OCR_ACCESS_KEY_SECRET
      },
      tesseract: {
        name: 'Tesseract OCR',
        command: 'tesseract',
        languages: ['chi_sim', 'eng']
      }
    };

    this.validationRules = {
      invoiceNumber: {
        pattern: /^[0-9]{8,12}$/,
        description: '发票号码应为8-12位数字'
      },
      invoiceCode: {
        pattern: /^[0-9]{10,12}$/,
        description: '发票代码应为10-12位数字'
      },
      amount: {
        min: 0,
        max: 1000000,
        description: '金额应在0-1000000之间'
      },
      taxNumber: {
        pattern: /^[0-9A-Z]{15,20}$/,
        description: '税号应为15-20位数字或大写字母'
      }
    };
  }

  /**
   * 识别票据信息
   * @param {String} imagePath - 图片路径
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeInvoice(imagePath, options = {}) {
    try {
      const startTime = Date.now();
      const engine = options.engine || 'baidu';
      const ocrConfig = this.ocrEngines[engine];

      if (!ocrConfig) {
        throw new Error(`不支持的OCR引擎: ${engine}`);
      }

      // 读取图片信息
      const imageInfo = await this.getImageInfo(imagePath);

      // 执行OCR识别
      let ocrResult;
      switch (engine) {
      case 'baidu':
        ocrResult = await this.recognizeWithBaidu(imagePath, options);
        break;
      case 'tencent':
        ocrResult = await this.recognizeWithTencent(imagePath, options);
        break;
      case 'alibaba':
        ocrResult = await this.recognizeWithAlibaba(imagePath, options);
        break;
      case 'tesseract':
        ocrResult = await this.recognizeWithTesseract(imagePath, options);
        break;
      default:
        throw new Error(`OCR引擎 ${engine} 尚未实现`);
      }

      const processingTime = Date.now() - startTime;

      // 提取结构化信息
      const extractedInvoice = this.extractInvoiceInfo(ocrResult);

      // 计算识别置信度
      const confidence = this.calculateConfidence(extractedInvoice, ocrResult);

      // 生成票据识别记录
      const invoiceRecord = new InvoiceOCR({
        invoiceInfo: extractedInvoice,
        ocrResult: {
          confidence,
          extractedText: ocrResult.fullText || '',
          extractedFields: ocrResult.fields || [],
          engine,
          processingTime
        },
        imageInfo: {
          originalImageUrl: options.imageUrl || '',
          fileSize: imageInfo.size,
          imageFormat: imageInfo.format,
          resolution: imageInfo.resolution
        }
      });

      // 验证识别结果
      await this.validateInvoiceData(invoiceRecord);

      // 检查重复票据
      await this.checkDuplicateInvoice(invoiceRecord);

      await invoiceRecord.save();

      return {
        success: true,
        invoiceId: invoiceRecord._id,
        extractedData: extractedInvoice,
        confidence,
        processingTime,
        verification: invoiceRecord.verification
      };

    } catch (error) {
      logger.error('票据识别失败:', error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 使用百度OCR识别
   * @param {String} imagePath - 图片路径
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeWithBaidu(imagePath, options = {}) {
    try {
      const config = this.ocrEngines.baidu;

      // 获取访问令牌
      const accessToken = await this.getBaiduAccessToken();

      // 读取图片并编码为Base64
      const imageBuffer = fs.readFileSync(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      // 发送OCR请求
      const response = await axios.post(
        `${config.apiUrl}?access_token=${accessToken}`,
        {
          image: imageBase64,
          location: options.location !== false,
          probability: options.probability !== false
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return this.parseBaiduOCRResult(response.data);

    } catch (error) {
      logger.error('百度OCR识别失败:', error);
      throw new Error(`百度OCR识别失败: ${error.message}`);
    }
  }

  /**
   * 使用腾讯OCR识别
   * @param {String} imagePath - 图片路径
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeWithTencent(imagePath, options = {}) {
    try {
      const config = this.ocrEngines.tencent;

      // 读取图片并编码为Base64
      const imageBuffer = fs.readFileSync(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      // 构建腾讯云API请求
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = Math.random().toString(36).substr(2, 16);

      // 计算签名
      const payload = {
        Action: 'VatInvoiceOCR',
        Version: '2018-11-19',
        Region: config.region,
        ImageBase64: imageBase64,
        Timestamp: timestamp,
        Nonce: nonce,
        SecretId: config.secretId
      };

      const signature = this.calculateTencentSignature(payload, config.secretKey);
      payload.Signature = signature;

      // 发送请求
      const response = await axios.post(config.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
        }
      });

      return this.parseTencentOCRResult(response.data);

    } catch (error) {
      logger.error('腾讯OCR识别失败:', error);
      throw new Error(`腾讯OCR识别失败: ${error.message}`);
    }
  }

  /**
   * 计算腾讯云API签名
   * @param {Object} payload - 请求参数
   * @param {String} secretKey - 密钥
   * @returns {String} 签名
   */
  calculateTencentSignature(payload, secretKey) {
    const crypto = require('crypto');

    // 按字典序排序参数
    const sortedKeys = Object.keys(payload).sort();
    const queryString = sortedKeys.map(key => `${key}=${payload[key]}`).join('&');

    // 生成签名
    const signStr = `POSTocr.tencentcloudapi.com/?${queryString}`;
    return crypto.createHmac('sha1', secretKey).update(signStr).digest('base64');
  }

  /**
   * 解析腾讯OCR结果
   * @param {Object} result - OCR结果
   * @returns {Object} 解析后的结果
   */
  parseTencentOCRResult(result) {
    if (!result.Response || result.Response.Error) {
      throw new Error(result.Response?.Error?.Message || '腾讯OCR识别失败');
    }

    const data = result.Response;

    return {
      success: true,
      fullText: this.extractFullTextFromTencent(data),
      fields: this.extractFieldsFromTencent(data),
      confidence: this.calculateTencentConfidence(data)
    };
  }

  /**
   * 从腾讯OCR结果提取完整文本
   * @param {Object} data - 腾讯OCR数据
   * @returns {String} 完整文本
   */
  extractFullTextFromTencent(data) {
    if (!data.VatInvoiceInfos || data.VatInvoiceInfos.length === 0) {
      return '';
    }

    const invoice = data.VatInvoiceInfos[0];
    let fullText = '';

    // 组合各个字段的文本
    if (invoice.InvoiceNum) fullText += `发票号码: ${invoice.InvoiceNum} `;
    if (invoice.InvoiceCode) fullText += `发票代码: ${invoice.InvoiceCode} `;
    if (invoice.InvoiceDate) fullText += `开票日期: ${invoice.InvoiceDate} `;
    if (invoice.SellerName) fullText += `销售方: ${invoice.SellerName} `;
    if (invoice.PurchaserName) fullText += `购买方: ${invoice.PurchaserName} `;
    if (invoice.TotalAmount) fullText += `价税合计: ${invoice.TotalAmount} `;

    return fullText.trim();
  }

  /**
   * 从腾讯OCR结果提取字段
   * @param {Object} data - 腾讯OCR数据
   * @returns {Array} 字段数组
   */
  extractFieldsFromTencent(data) {
    if (!data.VatInvoiceInfos || data.VatInvoiceInfos.length === 0) {
      return [];
    }

    const invoice = data.VatInvoiceInfos[0];
    const fields = [];

    // 提取各字段并添加位置信息
    const fieldMappings = {
      'InvoiceNum': '发票号码',
      'InvoiceCode': '发票代码',
      'InvoiceDate': '开票日期',
      'SellerName': '销售方名称',
      'SellerTaxNum': '销售方税号',
      'PurchaserName': '购买方名称',
      'PurchaserTaxNum': '购买方税号',
      'TotalAmount': '价税合计',
      'TaxAmount': '税额',
      'AmountWithoutTax': '不含税金额'
    };

    Object.keys(fieldMappings).forEach(key => {
      if (invoice[key]) {
        fields.push({
          fieldName: fieldMappings[key],
          fieldValue: invoice[key],
          confidence: 0.95, // 腾讯OCR一般不提供单字段置信度
          boundingBox: {
            x: 0,
            y: 0,
            width: 100,
            height: 20
          }
        });
      }
    });

    return fields;
  }

  /**
   * 计算腾讯OCR置信度
   * @param {Object} data - 腾讯OCR数据
   * @returns {Number} 置信度
   */
  calculateTencentConfidence(data) {
    // 腾讯OCR不提供具体置信度，基于字段完整性计算
    if (!data.VatInvoiceInfos || data.VatInvoiceInfos.length === 0) {
      return 0;
    }

    const invoice = data.VatInvoiceInfos[0];
    const requiredFields = ['InvoiceNum', 'InvoiceCode', 'SellerName', 'TotalAmount'];
    const presentFields = requiredFields.filter(field => invoice[field]).length;

    return (presentFields / requiredFields.length) * 100;
  }
  async recognizeWithTencent(imagePath, options = {}) {
    try {
      const config = this.ocrEngines.tencent;

      // 读取图片
      const imageBuffer = fs.readFileSync(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      // 构建请求参数
      const params = {
        Action: 'VatInvoiceOCR',
        Version: '2018-11-19',
        Region: config.region,
        ImageBase64: imageBase64
      };

      // 发送请求
      const response = await axios.post(
        config.apiUrl,
        params,
        {
          headers: this.generateTencentHeaders(params)
        }
      );

      return this.parseTencentOCRResult(response.data);

    } catch (error) {
      logger.error('腾讯OCR识别失败:', error);
      throw new Error(`腾讯OCR识别失败: ${error.message}`);
    }
  }

  /**
   * 使用阿里云OCR识别
   * @param {String} imagePath - 图片路径
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeWithAlibaba(imagePath, options = {}) {
    try {
      const config = this.ocrEngines.alibaba;

      // 读取图片
      const imageBuffer = fs.readFileSync(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      // 构建请求参数
      const params = {
        Action: 'RecognizeVatInvoice',
        Version: '2021-07-07',
        Body: imageBase64
      };

      // 发送请求
      const response = await axios.post(
        config.apiUrl,
        params,
        {
          headers: this.generateAlibabaHeaders(params)
        }
      );

      return this.parseAlibabaOCRResult(response.data);

    } catch (error) {
      logger.error('阿里云OCR识别失败:', error);
      throw new Error(`阿里云OCR识别失败: ${error.message}`);
    }
  }

  /**
   * 使用Tesseract识别
   * @param {String} imagePath - 图片路径
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeWithTesseract(imagePath, options = {}) {
    try {
      const { exec } = require('child_process');
      const path = require('path');
const logger = require('../utils/logger');

      const outputPath = path.join(
        path.dirname(imagePath),
        `tesseract_output_${Date.now()}`
      );

      return new Promise((resolve, reject) => {
        const languages = options.languages || this.ocrEngines.tesseract.languages.join('+');
        const command = `${this.ocrEngines.tesseract.command} "${imagePath}" "${outputPath}" -l ${languages} hocr`;

        exec(command, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Tesseract识别失败: ${error.message}`));
            return;
          }

          try {
            const hocrPath = `${outputPath}.hocr`;
            const hocrContent = fs.readFileSync(hocrPath, 'utf8');
            const result = this.parseTesseractResult(hocrContent);

            // 清理临时文件
            fs.unlinkSync(hocrPath);

            resolve(result);

          } catch (parseError) {
            reject(new Error(`解析Tesseract结果失败: ${parseError.message}`));
          }
        });
      });

    } catch (error) {
      logger.error('Tesseract识别失败:', error);
      throw error;
    }
  }

  /**
   * 提取票据信息
   * @param {Object} ocrResult - OCR识别结果
   * @returns {Object} 提取的票据信息
   */
  extractInvoiceInfo(ocrResult) {
    const extracted = {
      invoiceNumber: '',
      invoiceCode: '',
      invoiceDate: null,
      sellerName: '',
      sellerTaxNumber: '',
      buyerName: '',
      buyerTaxNumber: '',
      totalAmount: 0,
      taxAmount: 0,
      amountWithoutTax: 0
    };

    // 从OCR结果中提取字段
    if (ocrResult.words_result) {
      const fields = ocrResult.words_result;

      extracted.invoiceNumber = fields.InvoiceNum?.words || '';
      extracted.invoiceCode = fields.InvoiceCode?.words || '';
      extracted.invoiceDate = this.parseInvoiceDate(fields.InvoiceDate?.words || '');
      extracted.sellerName = fields.SellerName?.words || '';
      extracted.sellerTaxNumber = fields.SellerRegisterNum?.words || '';
      extracted.buyerName = fields.PurchaserName?.words || '';
      extracted.buyerTaxNumber = fields.PurchaserRegisterNum?.words || '';
      extracted.totalAmount = this.parseAmount(fields.InvoiceTotalAmount?.words || '0');
      extracted.taxAmount = this.parseAmount(fields.TotalTax?.words || '0');
      extracted.amountWithoutTax = this.parseAmount(fields.InvoiceTotalAmount?.words || '0') -
                                  this.parseAmount(fields.TotalTax?.words || '0');
    }

    return extracted;
  }

  /**
   * 验证票据数据
   * @param {Object} invoiceRecord - 票据记录
   */
  async validateInvoiceData(invoiceRecord) {
    const invoice = invoiceRecord.invoiceInfo;
    let authenticityScore = 100;

    // 验证发票号码
    if (!this.validationRules.invoiceNumber.pattern.test(invoice.invoiceNumber)) {
      authenticityScore -= 20;
      invoiceRecord.verification.riskFlags.push('invalid_invoice_number');
    }

    // 验证发票代码
    if (!this.validationRules.invoiceCode.pattern.test(invoice.invoiceCode)) {
      authenticityScore -= 15;
      invoiceRecord.verification.riskFlags.push('invalid_invoice_code');
    }

    // 验证金额
    if (invoice.totalAmount < this.validationRules.amount.min ||
        invoice.totalAmount > this.validationRules.amount.max) {
      authenticityScore -= 25;
      invoiceRecord.verification.riskFlags.push('suspicious_amount');
    }

    // 验证税号
    if (invoice.sellerTaxNumber &&
        !this.validationRules.taxNumber.pattern.test(invoice.sellerTaxNumber)) {
      authenticityScore -= 10;
      invoiceRecord.verification.riskFlags.push('invalid_tax_number');
    }

    // 验证日期
    if (!invoice.invoiceDate || invoice.invoiceDate > new Date()) {
      authenticityScore -= 15;
      invoiceRecord.verification.riskFlags.push('invalid_date');
    }

    // 验证金额一致性
    const calculatedAmount = invoice.amountWithoutTax + invoice.taxAmount;
    if (Math.abs(calculatedAmount - invoice.totalAmount) > 0.01) {
      authenticityScore -= 20;
      invoiceRecord.verification.riskFlags.push('amount_inconsistency');
    }

    invoiceRecord.verification.authenticityScore = Math.max(0, authenticityScore);
  }

  /**
   * 检查重复票据
   * @param {Object} invoiceRecord - 票据记录
   */
  async checkDuplicateInvoice(invoiceRecord) {
    const invoice = invoiceRecord.invoiceInfo;

    // 检查发票号码重复
    const duplicateByNumber = await InvoiceOCR.findOne({
      'invoiceInfo.invoiceNumber': invoice.invoiceNumber,
      'verification.duplicateCheck.isDuplicate': false
    });

    if (duplicateByNumber) {
      invoiceRecord.verification.duplicateCheck.isDuplicate = true;
      invoiceRecord.verification.duplicateCheck.duplicateInvoices.push(duplicateByNumber._id.toString());
      invoiceRecord.verification.riskFlags.push('duplicate_invoice');
    }

    // 检查发票代码+号码组合重复
    const duplicateByCodeAndNumber = await InvoiceOCR.findOne({
      'invoiceInfo.invoiceCode': invoice.invoiceCode,
      'invoiceInfo.invoiceNumber': invoice.invoiceNumber,
      _id: { $ne: invoiceRecord._id }
    });

    if (duplicateByCodeAndNumber) {
      invoiceRecord.verification.duplicateCheck.isDuplicate = true;
      invoiceRecord.verification.duplicateCheck.duplicateInvoices.push(duplicateByCodeAndNumber._id.toString());
      invoiceRecord.verification.riskFlags.push('duplicate_invoice');
    }

    invoiceRecord.verification.duplicateCheck.checkDate = new Date();
  }

  /**
   * 税务局验证
   * @param {String} invoiceId - 票据ID
   * @returns {Promise<Object>} 验证结果
   */
  async verifyWithTaxAuthority(invoiceId) {
    try {
      const invoice = await InvoiceOCR.findById(invoiceId);
      if (!invoice) {
        throw new Error('票据不存在');
      }

      // 构建税务局验证请求
      const verificationRequest = {
        invoiceCode: invoice.invoiceInfo.invoiceCode,
        invoiceNumber: invoice.invoiceInfo.invoiceNumber,
        invoiceDate: invoice.invoiceInfo.invoiceDate,
        sellerName: invoice.invoiceInfo.sellerName,
        totalAmount: invoice.invoiceInfo.totalAmount,
        buyerName: invoice.invoiceInfo.buyerName
      };

      // 调用税务局验证API（这里需要实现实际的API调用）
      const verificationResult = await this.callTaxAuthorityAPI(verificationRequest);

      // 更新验证结果
      invoice.verification.taxAuthorityVerified = verificationResult.isValid;
      invoice.verification.taxAuthorityVerifyDate = new Date();
      invoice.verification.taxAuthorityResult = verificationResult.message;

      await invoice.save();

      return {
        success: true,
        isValid: verificationResult.isValid,
        message: verificationResult.message,
        verifiedAt: invoice.verification.taxAuthorityVerifyDate
      };

    } catch (error) {
      logger.error('税务局验证失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量识别票据
   * @param {Array} imagePaths - 图片路径数组
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 批量识别结果
   */
  async batchRecognizeInvoices(imagePaths, options = {}) {
    try {
      const results = [];
      const batchSize = options.batchSize || 5;
      const delay = options.delay || 1000; // 延迟以避免API限制

      for (let i = 0; i < imagePaths.length; i += batchSize) {
        const batch = imagePaths.slice(i, i + batchSize);

        const batchPromises = batch.map(imagePath =>
          this.recognizeInvoice(imagePath, options)
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // 批次间延迟
        if (i + batchSize < imagePaths.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return {
        totalInvoices: imagePaths.length,
        successCount,
        failureCount,
        results,
        successRate: Math.round((successCount / imagePaths.length) * 100)
      };

    } catch (error) {
      logger.error('批量识别失败:', error);
      throw error;
    }
  }

  /**
   * 获取图片信息
   * @param {String} imagePath - 图片路径
   * @returns {Promise<Object>} 图片信息
   */
  async getImageInfo(imagePath) {
    try {
      const stats = fs.statSync(imagePath);
      const size = stats.size;

      // 获取图片分辨率
      const resolution = await this.getImageResolution(imagePath);

      // 获取图片格式
      const format = imagePath.split('.').pop().toLowerCase();

      return {
        size,
        resolution,
        format
      };

    } catch (error) {
      throw new Error(`获取图片信息失败: ${error.message}`);
    }
  }

  /**
   * 获取图片分辨率
   * @param {String} imagePath - 图片路径
   * @returns {Promise<Object>} 分辨率信息
   */
  async getImageResolution(imagePath) {
    try {
      // 这里可以使用sharp或jimp等库来获取图片信息
      // 简化实现，返回默认值
      return {
        width: 1920,
        height: 1080
      };

    } catch (error) {
      return {
        width: 0,
        height: 0
      };
    }
  }

  /**
   * 解析票据日期
   * @param {String} dateStr - 日期字符串
   * @returns {Date|null} 解析后的日期
   */
  parseInvoiceDate(dateStr) {
    if (!dateStr) return null;

    try {
      // 尝试多种日期格式
      const formats = [
        /(\d{4})年(\d{1,2})月(\d{1,2})日/,
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          let year, month, day;
          if (format === formats[2]) { // MM/DD/YYYY
            month = parseInt(match[1]);
            day = parseInt(match[2]);
            year = parseInt(match[3]);
          } else { // YYYY-MM-DD or YYYY年MM月DD日
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          }

          return new Date(year, month - 1, day);
        }
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * 解析金额
   * @param {String} amountStr - 金额字符串
   * @returns {Number} 解析后的金额
   */
  parseAmount(amountStr) {
    if (!amountStr) return 0;

    try {
      // 移除非数字字符（保留小数点）
      const cleanAmount = amountStr.replace(/[^\d.]/g, '');
      return parseFloat(cleanAmount) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 计算识别置信度
   * @param {Object} extractedData - 提取的数据
   * @param {Object} ocrResult - OCR结果
   * @returns {Number} 置信度（0-1）
   */
  calculateConfidence(extractedData, ocrResult) {
    let confidence = 0;
    let fields = 0;

    // 检查关键字段
    const keyFields = [
      'invoiceNumber', 'invoiceCode', 'sellerName',
      'buyerName', 'totalAmount'
    ];

    for (const field of keyFields) {
      fields++;
      if (extractedData[field] && extractedData[field].length > 0) {
        confidence += 1;
      }
    }

    // 考虑OCR引擎返回的置信度
    if (ocrResult.confidence !== undefined) {
      confidence = (confidence / fields) * ocrResult.confidence;
    } else {
      confidence = confidence / fields;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * 获取百度访问令牌
   * @returns {Promise<String>} 访问令牌
   */
  async getBaiduAccessToken() {
    try {
      const config = this.ocrEngines.baidu;
      const response = await axios.post(
        `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.secretKey}`
      );

      return response.data.access_token;

    } catch (error) {
      throw new Error(`获取百度访问令牌失败: ${error.message}`);
    }
  }

  /**
   * 生成腾讯云请求头
   * @param {Object} params - 请求参数
   * @returns {Object} 请求头
   */
  generateTencentHeaders(params) {
    // 这里需要实现腾讯云API签名算法
    return {
      'Content-Type': 'application/json',
      'Authorization': 'TC3-HMAC-SHA256 Credential=xxx, SignedHeaders=content-type;host, Signature=xxx'
    };
  }

  /**
   * 生成阿里云请求头
   * @param {Object} params - 请求参数
   * @returns {Object} 请求头
   */
  generateAlibabaHeaders(params) {
    // 这里需要实现阿里云API签名算法
    return {
      'Content-Type': 'application/json',
      'Authorization': 'ACS3-HMAC-SHA256 Credential=xxx, SignedHeaders=content-type;host, Signature=xxx'
    };
  }

  /**
   * 解析百度OCR结果
   * @param {Object} data - 百度API返回数据
   * @returns {Object} 解析后的结果
   */
  parseBaiduOCRResult(data) {
    return {
      fullText: data.words_result?.map(item => item.words).join('\n') || '',
      fields: data.words_result_num ? Object.keys(data.words_result) : [],
      confidence: data.error_code ? 0 : 0.9
    };
  }

  /**
   * 解析腾讯OCR结果
   * @param {Object} data - 腾讯API返回数据
   * @returns {Object} 解析后的结果
   */
  parseTencentOCRResult(data) {
    return {
      fullText: data.VatInvoiceInfos?.map(item => JSON.stringify(item)).join('\n') || '',
      fields: data.VatInvoiceInfos ? Object.keys(data.VatInvoiceInfos[0] || {}) : [],
      confidence: data.Response?.Error ? 0 : 0.9
    };
  }

  /**
   * 解析阿里云OCR结果
   * @param {Object} data - 阿里云API返回数据
   * @returns {Object} 解析后的结果
   */
  parseAlibabaOCRResult(data) {
    return {
      fullText: JSON.stringify(data),
      fields: data.Data ? Object.keys(data.Data) : [],
      confidence: data.Code === '200' ? 0.9 : 0
    };
  }

  /**
   * 解析Tesseract结果
   * @param {String} hocrContent - hOCR内容
   * @returns {Object} 解析后的结果
   */
  parseTesseractResult(hocrContent) {
    // 简化实现，实际需要解析hOCR格式
    return {
      fullText: hocrContent.replace(/<[^>]*>/g, ''),
      fields: [],
      confidence: 0.7
    };
  }

  /**
   * 调用税务局API
   * @param {Object} requestData - 请求数据
   * @returns {Promise<Object>} 验证结果
   */
  async callTaxAuthorityAPI(requestData) {
    try {
      // 这里需要实现实际的税务局API调用
      // 简化实现，返回模拟结果
      return {
        isValid: true,
        message: '发票验证通过'
      };

    } catch (error) {
      throw new Error(`税务局API调用失败: ${error.message}`);
    }
  }

  /**
   * 智能票据分类
   * @param {String} imagePath - 图片路径
   * @returns {Promise<Object>} 分类结果
   */
  async classifyInvoice(imagePath) {
    try {
      const result = await this.recognizeInvoice(imagePath, { engine: 'baidu' });

      if (!result.success) {
        return {
          success: false,
          classification: 'unknown',
          confidence: 0
        };
      }

      const invoiceData = result.extractedData;
      let classification = 'other';
      let confidence = 0;

      // 根据发票特征进行分类
      if (invoiceData.sellerName) {
        const sellerName = invoiceData.sellerName.toLowerCase();

        // 增值税专用发票
        if (sellerName.includes('有限公司') || sellerName.includes('企业')) {
          classification = 'vat_special';
          confidence = 0.9;
        }
        // 增值税普通发票
        else if (invoiceData.invoiceCode && invoiceData.invoiceCode.length === 12) {
          classification = 'vat_common';
          confidence = 0.8;
        }
        // 电子发票
        else if (sellerName.includes('电子发票') || result.ocrResult?.extractedText?.includes('电子发票')) {
          classification = 'electronic';
          confidence = 0.85;
        }
        // 机动车发票
        else if (sellerName.includes('汽车') || sellerName.includes('车辆')) {
          classification = 'vehicle';
          confidence = 0.9;
        }
        // 货运运输发票
        else if (sellerName.includes('运输') || sellerName.includes('物流')) {
          classification = 'freight';
          confidence = 0.85;
        }
      }

      return {
        success: true,
        classification,
        confidence,
        details: invoiceData
      };

    } catch (error) {
      logger.error('票据分类失败:', error);
      return {
        success: false,
        classification: 'unknown',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * 票据真伪检测
   * @param {String} invoiceId - 票据ID
   * @returns {Promise<Object>} 检测结果
   */
  async detectInvoiceFraud(invoiceId) {
    try {
      const invoice = await InvoiceOCR.findById(invoiceId);
      if (!invoice) {
        throw new Error('票据不存在');
      }

      const fraudDetection = {
        overallRisk: 'low',
        riskScore: 0,
        riskFactors: [],
        recommendations: []
      };

      // 检查1: 发票号码格式
      const invoiceNumber = invoice.invoiceInfo.invoiceNumber;
      if (!this.validationRules.invoiceNumber.pattern.test(invoiceNumber)) {
        fraudDetection.riskFactors.push('发票号码格式异常');
        fraudDetection.riskScore += 20;
      }

      // 检查2: 发票日期合理性
      const invoiceDate = new Date(invoice.invoiceInfo.invoiceDate);
      const now = new Date();
      if (invoiceDate > now) {
        fraudDetection.riskFactors.push('发票日期异常（未来日期）');
        fraudDetection.riskScore += 30;
      }
      if (now - invoiceDate > 365 * 24 * 60 * 60 * 1000) { // 超过一年
        fraudDetection.riskFactors.push('发票日期过久（超过一年）');
        fraudDetection.riskScore += 15;
      }

      // 检查3: 金额合理性
      const amount = invoice.invoiceInfo.totalAmount;
      if (amount > this.validationRules.amount.max) {
        fraudDetection.riskFactors.push('发票金额异常（超过最大限额）');
        fraudDetection.riskScore += 25;
      }

      // 检查4: OCR识别置信度
      if (invoice.ocrResult.confidence < 60) {
        fraudDetection.riskFactors.push('OCR识别置信度过低');
        fraudDetection.riskScore += 20;
      }

      // 检查5: 重复票据
      if (invoice.verification.duplicateCheck.isDuplicate) {
        fraudDetection.riskFactors.push('检测到重复票据');
        fraudDetection.riskScore += 40;
      }

      // 检查6: 卖方信息异常
      if (!invoice.invoiceInfo.sellerName || invoice.invoiceInfo.sellerName.length < 2) {
        fraudDetection.riskFactors.push('卖方信息异常');
        fraudDetection.riskScore += 15;
      }

      // 综合风险评估
      if (fraudDetection.riskScore >= 70) {
        fraudDetection.overallRisk = 'high';
        fraudDetection.recommendations.push('建议人工审核');
        fraudDetection.recommendations.push('联系开票方确认');
      } else if (fraudDetection.riskScore >= 40) {
        fraudDetection.overallRisk = 'medium';
        fraudDetection.recommendations.push('建议补充验证材料');
      } else {
        fraudDetection.recommendations.push('票据基本可信');
      }

      // 保存检测结果
      invoice.verification.fraudDetection = {
        riskScore: fraudDetection.riskScore,
        overallRisk: fraudDetection.overallRisk,
        riskFactors: fraudDetection.riskFactors,
        detectedAt: new Date()
      };

      await invoice.save();

      return {
        success: true,
        fraudDetection
      };

    } catch (error) {
      logger.error('票据真伪检测失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 票据数据修复和建议
   * @param {String} invoiceId - 票据ID
   * @returns {Promise<Object>} 修复建议
   */
  async suggestInvoiceDataRepair(invoiceId) {
    try {
      const invoice = await InvoiceOCR.findById(invoiceId);
      if (!invoice) {
        throw new Error('票据不存在');
      }

      const suggestions = [];
      const invoiceData = invoice.invoiceInfo;

      // 检查并建议修复的字段
      if (!invoiceData.invoiceNumber) {
        suggestions.push({
          field: 'invoiceNumber',
          issue: '缺少发票号码',
          suggestion: '请确认发票号码并手动输入',
          priority: 'high'
        });
      }

      if (!invoiceData.invoiceCode) {
        suggestions.push({
          field: 'invoiceCode',
          issue: '缺少发票代码',
          suggestion: '请确认发票代码并手动输入',
          priority: 'high'
        });
      }

      if (!invoiceData.invoiceDate) {
        suggestions.push({
          field: 'invoiceDate',
          issue: '缺少开票日期',
          suggestion: '请确认开票日期并手动输入',
          priority: 'medium'
        });
      } else if (invoiceData.invoiceDate.length !== 10) {
        suggestions.push({
          field: 'invoiceDate',
          issue: '日期格式不正确',
          suggestion: '请使用YYYY-MM-DD格式',
          currentValue: invoiceData.invoiceDate,
          priority: 'medium'
        });
      }

      if (!invoiceData.totalAmount || invoiceData.totalAmount === 0) {
        suggestions.push({
          field: 'totalAmount',
          issue: '金额识别失败或为零',
          suggestion: '请手动输入发票金额',
          priority: 'high'
        });
      }

      if (invoiceData.totalAmount && invoiceData.amountWithoutTax && invoiceData.taxAmount) {
        const calculatedTotal = parseFloat(invoiceData.amountWithoutTax) + parseFloat(invoiceData.taxAmount);
        if (Math.abs(calculatedTotal - parseFloat(invoiceData.totalAmount)) > 0.01) {
          suggestions.push({
            field: 'amount_calculation',
            issue: '金额计算不一致',
            suggestion: `不含税金额(${invoiceData.amountWithoutTax}) + 税额(${invoiceData.taxAmount}) ≠ 价税合计(${invoiceData.totalAmount})`,
            priority: 'medium'
          });
        }
      }

      // OCR识别质量建议
      if (invoice.ocrResult.confidence < 70) {
        suggestions.push({
          field: 'ocr_quality',
          issue: 'OCR识别置信度较低',
          suggestion: '建议重新拍照或使用更清晰的图片',
          currentValue: invoice.ocrResult.confidence,
          priority: 'low'
        });
      }

      return {
        success: true,
        suggestions,
        confidence: invoice.ocrResult.confidence,
        needsManualReview: suggestions.some(s => s.priority === 'high')
      };

    } catch (error) {
      logger.error('生成修复建议失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取OCR服务统计信息
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计信息
   */
  async getOCRStatistics(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        engine,
        status
      } = filters;

      // 构建查询条件
      const query = {};
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      if (engine) {
        query['ocrResult.engine'] = engine;
      }
      if (status) {
        query['verification.taxAuthorityVerified'] = status === 'verified';
      }

      const totalInvoices = await InvoiceOCR.countDocuments(query);
      const verifiedInvoices = await InvoiceOCR.countDocuments({
        ...query,
        'verification.taxAuthorityVerified': true
      });
      const duplicateInvoices = await InvoiceOCR.countDocuments({
        ...query,
        'verification.duplicateCheck.isDuplicate': true
      });

      // 获取各引擎使用统计
      const engineStats = await InvoiceOCR.aggregate([
        { $match: query },
        { $group: { _id: '$ocrResult.engine', count: { $sum: 1 } } }
      ]);

      // 获取平均置信度
      const avgConfidence = await InvoiceOCR.aggregate([
        { $match: query },
        { $group: { _id: null, avgConfidence: { $avg: '$ocrResult.confidence' } } }
      ]);

      // 获取处理时间统计
      const processingTimeStats = await InvoiceOCR.aggregate([
        { $match: query },
        { $group: {
          _id: null,
          avgTime: { $avg: '$ocrResult.processingTime' },
          minTime: { $min: '$ocrResult.processingTime' },
          maxTime: { $max: '$ocrResult.processingTime' }
        }}
      ]);

      return {
        totalInvoices,
        verifiedInvoices,
        duplicateInvoices,
        verificationRate: totalInvoices > 0 ? Math.round((verifiedInvoices / totalInvoices) * 100) : 0,
        duplicateRate: totalInvoices > 0 ? Math.round((duplicateInvoices / totalInvoices) * 100) : 0,
        engineUsage: engineStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        averageConfidence: avgConfidence[0]?.avgConfidence || 0,
        processingTime: processingTimeStats[0] || {
          avgTime: 0,
          minTime: 0,
          maxTime: 0
        }
      };

    } catch (error) {
      logger.error('获取OCR统计信息失败:', error);
      throw error;
    }
  }
}

module.exports = new InvoiceOCRService();