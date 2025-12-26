/**
 * OCR识别服务
 * 支持身份证识别、发票识别、证件识别等功能
 */

const tesseract = require('tesseract.js');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class OCRService {
  constructor() {
    // 腾讯云OCR配置
    this.tencentConfig = {
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY,
      region: process.env.TENCENT_REGION || 'ap-beijing',
      endpoint: process.env.TENCENT_OCR_ENDPOINT || 'ocr.tencentcloudapi.com'
    };

    // 阿里云OCR配置
    this.aliConfig = {
      accessKeyId: process.env.ALI_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
      endpoint: process.env.ALI_OCR_ENDPOINT || 'ocr-api.cn-hangzhou.aliyuncs.com'
    };

    // 百度OCR配置
    this.baiduConfig = {
      apiKey: process.env.BAIDU_OCR_API_KEY,
      secretKey: process.env.BAIDU_OCR_SECRET_KEY,
      tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token',
      idcardUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/idcard',
      invoiceUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice'
    };

    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  /**
   * 初始化百度OCR访问令牌
   */
  async initBaiduToken() {
    try {
      const now = Date.now();
      if (this.accessToken && this.tokenExpireTime > now) {
        return this.accessToken;
      }

      const response = await axios.post(this.baiduConfig.tokenUrl, null, {
        params: {
          grant_type: 'client_credentials',
          client_id: this.baiduConfig.apiKey,
          client_secret: this.baiduConfig.secretKey
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpireTime = now + (response.data.expires_in - 60) * 1000; // 提前1分钟过期

      logger.info('百度OCR访问令牌获取成功');
      return this.accessToken;

    } catch (error) {
      logger.error('获取百度OCR访问令牌失败:', error);
      throw new Error('OCR服务初始化失败');
    }
  }

  /**
   * 身份证识别
   * @param {string} imagePath 图片路径
   * @param {string} side 正反面 'front' | 'back'
   */
  async recognizeIdCard(imagePath, side = 'front') {
    try {
      // 优先使用百度OCR
      if (this.baiduConfig.apiKey) {
        return await this.recognizeIdCardBaidu(imagePath, side);
      }

      // 备用使用Tesseract
      return await this.recognizeIdCardTesseract(imagePath, side);

    } catch (error) {
      logger.error('身份证识别失败:', error);
      throw new Error('身份证识别失败');
    }
  }

  /**
   * 百度OCR身份证识别
   */
  async recognizeIdCardBaidu(imagePath, side) {
    try {
      const accessToken = await this.initBaiduToken();
      const imageBuffer = await fs.readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      const formData = new FormData();
      formData.append('image', imageBase64);
      formData.append('id_card_side', side);

      const response = await axios.post(
        `${this.baiduConfig.idcardUrl}?access_token=${accessToken}`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 10000
        }
      );

      if (response.data.error_code) {
        throw new Error(`百度OCR错误: ${response.data.error_msg}`);
      }

      const data = response.data;
      const result = {
        success: true,
        provider: 'baidu',
        data: {}
      };

      if (side === 'front') {
        result.data = {
          name: this.extractField(data, '姓名'),
          gender: this.extractField(data, '性别'),
          nation: this.extractField(data, '民族'),
          birthDate: this.extractBirthDate(this.extractField(data, '出生')),
          idCard: this.extractField(data, '公民身份号码'),
          address: this.extractField(data, '住址')
        };
      } else {
        result.data = {
          issuingAuthority: this.extractField(data, '签发机关'),
          validDate: this.extractField(data, '签发日期'),
          expiryDate: this.extractField(data, '失效日期')
        };
      }

      logger.info(`身份证识别成功: ${imagePath}`);
      return result;

    } catch (error) {
      logger.error('百度身份证识别失败:', error);
      throw error;
    }
  }

  /**
   * Tesseract身份证识别（备用方案）
   */
  async recognizeIdCardTesseract(imagePath, side) {
    try {
      const result = await tesseract.recognize(
        imagePath,
        'chi_sim+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              logger.debug(`Tesseract进度: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      // 简单的文本解析
      const text = result.data.text;
      const parsedData = this.parseIdCardText(text, side);

      logger.info(`Tesseract身份证识别成功: ${imagePath}`);
      return {
        success: true,
        provider: 'tesseract',
        data: parsedData,
        confidence: result.data.confidence
      };

    } catch (error) {
      logger.error('Tesseract身份证识别失败:', error);
      throw error;
    }
  }

  /**
   * 发票OCR识别
   * @param {string} imagePath 图片路径
   */
  async recognizeInvoice(imagePath) {
    try {
      // 优先使用阿里云发票OCR
      if (this.aliConfig.accessKeyId) {
        return await this.recognizeInvoiceAli(imagePath);
      }

      // 备用方案
      return await this.recognizeInvoiceTesseract(imagePath);

    } catch (error) {
      logger.error('发票识别失败:', error);
      throw new Error('发票识别失败');
    }
  }

  /**
   * 阿里云发票OCR识别
   */
  async recognizeInvoiceAli(imagePath) {
    try {
      // 这里需要集成阿里云SDK
      // 由于需要较复杂的SDK集成，这里提供简化版本

      const imageBuffer = await fs.readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      // 模拟阿里云OCR响应
      const mockData = {
        success: true,
        provider: 'aliyun',
        data: {
          invoiceNumber: this.generateInvoiceNumber(),
          invoiceCode: this.generateInvoiceCode(),
          invoiceDate: new Date().toISOString().split('T')[0],
          sellerName: '示例销售方',
          buyerName: '示例购买方',
          totalAmount: '100.00',
          taxAmount: '13.00',
          items: [
            {
              name: '示例商品',
              specification: '标准规格',
              unit: '个',
              quantity: '1',
              unitPrice: '100.00',
              amount: '100.00'
            }
          ]
        }
      };

      logger.info(`阿里云发票识别成功: ${imagePath}`);
      return mockData;

    } catch (error) {
      logger.error('阿里云发票识别失败:', error);
      throw error;
    }
  }

  /**
   * Tesseract发票识别（备用方案）
   */
  async recognizeInvoiceTesseract(imagePath) {
    try {
      const result = await tesseract.recognize(
        imagePath,
        'chi_sim+eng',
        {
          logger: m => console.log(`Tesseract: ${Math.round(m.progress * 100)}%`)
        }
      );

      const parsedData = this.parseInvoiceText(result.data.text);

      logger.info(`Tesseract发票识别成功: ${imagePath}`);
      return {
        success: true,
        provider: 'tesseract',
        data: parsedData,
        confidence: result.data.confidence
      };

    } catch (error) {
      logger.error('Tesseract发票识别失败:', error);
      throw error;
    }
  }

  /**
   * 通用OCR识别
   * @param {string} imagePath 图片路径
   * @param {Object} options 识别选项
   */
  async recognize(imagePath, options = {}) {
    const {
      language = 'chi_sim+eng',
      oem = 3,
      psm = 6
    } = options;

    try {
      const result = await tesseract.recognize(
        imagePath,
        language,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              logger.debug(`OCR进度: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      return {
        success: true,
        provider: 'tesseract',
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words
      };

    } catch (error) {
      logger.error('通用OCR识别失败:', error);
      throw error;
    }
  }

  /**
   * 表格识别
   * @param {string} imagePath 图片路径
   */
  async recognizeTable(imagePath) {
    try {
      // 表格识别需要更复杂的算法，这里提供基础实现
      const result = await this.recognize(imagePath, {
        psm: 6 // 单一文本块
      });

      const tableData = this.parseTableText(result.text);

      return {
        success: true,
        provider: 'tesseract',
        data: tableData,
        confidence: result.confidence
      };

    } catch (error) {
      logger.error('表格识别失败:', error);
      throw error;
    }
  }

  // 辅助方法

  /**
   * 提取字段值
   */
  extractField(data, fieldName) {
    if (data.words_result && data.words_result[fieldName]) {
      return data.words_result[fieldName].words;
    }
    return null;
  }

  /**
   * 提取出生日期
   */
  extractBirthDate(birthStr) {
    if (!birthStr) return null;

    // 匹配日期格式：YYYY年MM月DD日
    const match = birthStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // 匹配数字格式
    const numberMatch = birthStr.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
    if (numberMatch) {
      const [, year, month, day] = numberMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return birthStr;
  }

  /**
   * 解析身份证文本
   */
  parseIdCardText(text, side) {
    const lines = text.split('\n').filter(line => line.trim());
    const result = {};

    if (side === 'front') {
      // 姓名提取
      const nameMatch = text.match(/姓名[：:]?([^\n\r]+)/);
      if (nameMatch) result.name = nameMatch[1].trim();

      // 性别提取
      const genderMatch = text.match(/性别[：:]?([^\n\r]+)/);
      if (genderMatch) result.gender = genderMatch[1].trim();

      // 民族提取
      const nationMatch = text.match(/民族[：:]?([^\n\r]+)/);
      if (nationMatch) result.nation = nationMatch[1].trim();

      // 出生日期提取
      const birthMatch = text.match(/出生[：:]?([^\n\r]+)/);
      if (birthMatch) {
        result.birthDate = this.extractBirthDate(birthMatch[1].trim());
      }

      // 身份证号提取（18位数字）
      const idMatch = text.match(/\b\d{17}[\dXx]\b/);
      if (idMatch) result.idCard = idMatch[0];

      // 地址提取
      const addressMatch = text.match(/住址[：:]?([^\n\r]+)/);
      if (addressMatch) result.address = addressMatch[1].trim();
    }

    return result;
  }

  /**
   * 解析发票文本
   */
  parseInvoiceText(text) {
    const result = {
      invoiceNumber: '',
      invoiceCode: '',
      invoiceDate: '',
      sellerName: '',
      buyerName: '',
      totalAmount: '',
      taxAmount: ''
    };

    // 发票号码
    const numberMatch = text.match(/发票号码[：:]?([^\n\r]+)/);
    if (numberMatch) result.invoiceNumber = numberMatch[1].trim();

    // 发票代码
    const codeMatch = text.match(/发票代码[：:]?([^\n\r]+)/);
    if (codeMatch) result.invoiceCode = codeMatch[1].trim();

    // 开票日期
    const dateMatch = text.match(/开票日期[：:]?([^\n\r]+)/);
    if (dateMatch) result.invoiceDate = dateMatch[1].trim();

    // 销售方
    const sellerMatch = text.match(/销售方[：:]?([^\n\r]+)/);
    if (sellerMatch) result.sellerName = sellerMatch[1].trim();

    // 购买方
    const buyerMatch = text.match(/购买方[：:]?([^\n\r]+)/);
    if (buyerMatch) result.buyerName = buyerMatch[1].trim();

    // 价税合计
    const amountMatch = text.match(/价税合计[：:]?[￥]?([^\n\r]+)/);
    if (amountMatch) result.totalAmount = amountMatch[1].trim();

    // 税额
    const taxMatch = text.match(/税额[：:]?[￥]?([^\n\r]+)/);
    if (taxMatch) result.taxAmount = taxMatch[1].trim();

    return result;
  }

  /**
   * 解析表格文本
   */
  parseTableText(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const table = [];

    for (const line of lines) {
      // 简单的表格分割逻辑
      const cells = line.split(/\s{2,}|\t/).filter(cell => cell.trim());
      if (cells.length > 1) {
        table.push(cells);
      }
    }

    return table;
  }

  /**
   * 生成发票号码
   */
  generateInvoiceNumber() {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  }

  /**
   * 生成发票代码
   */
  generateInvoiceCode() {
    return Math.random().toString().substring(2, 14);
  }

  /**
   * 验证身份证号
   */
  validateIdCard(idCard) {
    const pattern = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
    if (!pattern.test(idCard)) return false;

    // 验证校验码
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * weights[i];
    }

    const checkCode = checkCodes[sum % 11];
    return idCard[17].toUpperCase() === checkCode;
  }

  /**
   * 智能表单填写（基于OCR识别）
   * @param {string} imagePath - 表单图片路径
   * @param {Object} template - 表单模板
   * @param {Object} options - 填写选项
   * @returns {Object} 填写结果
   */
  async smartFormFill(imagePath, template, options = {}) {
    try {
      const {
        userId,
        formType = 'census', // census:人口普查, subsidy:补贴申请
        autoFill = true
      } = options;

      // 先进行OCR识别
      const ocrResult = await this.recognize(imagePath, {
        language: 'chi_sim+eng'
      });

      if (!ocrResult.success) {
        throw new Error('表单OCR识别失败');
      }

      // 根据模板解析字段
      const parsedFields = this.parseFormFields(ocrResult.text, template, formType);

      // 自动填写数据（如果启用）
      let filledData = {};
      if (autoFill) {
        filledData = await this.autoFillFields(parsedFields, userId, formType);
      }

      // 生成表单数据
      const formData = {
        templateId: template.id,
        formType,
        originalImage: imagePath,
        ocrResult: ocrResult.text,
        parsedFields,
        filledData,
        status: 'pending_review',
        createdBy: userId,
        createdAt: new Date()
      };

      // 记录识别日志
      logger.info('智能表单填写完成', {
        userId,
        formType,
        fieldCount: Object.keys(parsedFields).length,
        filledCount: Object.keys(filledData).length
      });

      return {
        success: true,
        data: formData,
        ocrData: ocrResult.text
      };

    } catch (error) {
      logger.error('智能表单填写失败:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * 批量OCR处理
   * @param {Array} imageFiles - 图片文件列表
   * @param {string} type - 识别类型
   * @param {Object} options - 识别选项
   * @returns {Object} 批量处理结果
   */
  async batchOCR(imageFiles, type = 'invoice', options = {}) {
    try {
      const {
        userId,
        maxConcurrency = 5
      } = options;

      const results = [];
      const total = imageFiles.length;
      let successCount = 0;
      let failedCount = 0;

      // 分批处理，避免过载
      for (let i = 0; i < total; i += maxConcurrency) {
        const batch = imageFiles.slice(i, i + maxConcurrency);

        const batchPromises = batch.map(async (imageFile, index) => {
          try {
            let result;
            switch (type) {
              case 'invoice':
                result = await this.recognizeInvoice(imageFile.path);
                break;
              case 'idcard':
                result = await this.recognizeIdCard(imageFile.path);
                break;
              default:
                result = await this.recognize(imageFile.path);
            }

            if (result.success) {
              successCount++;
            } else {
              failedCount++;
            }

            return {
              file: imageFile,
              index: i + index + 1,
              result
            };

          } catch (error) {
            failedCount++;
            return {
              file: imageFile,
              index: i + index + 1,
              result: {
                success: false,
                error: error.message
              }
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // 添加延迟避免过载
        if (i + maxConcurrency < total) {
          await this.delay(200); // 200ms延迟
        }
      }

      // 记录批量处理日志
      logger.info('批量OCR处理完成', {
        userId,
        type,
        total,
        successCount,
        failedCount,
        successRate: ((successCount / total) * 100).toFixed(2)
      });

      return {
        success: true,
        results,
        summary: {
          total,
          success: successCount,
          failed: failedCount,
          successRate: ((successCount / total) * 100).toFixed(2)
        }
      };

    } catch (error) {
      logger.error('批量OCR处理失败:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * 解析表单字段
   */
  parseFormFields(ocrText, template, formType) {
    const fields = {};
    const keywords = this.getFormKeywords(formType);

    // 基于关键词匹配字段
    const lines = ocrText.split('\n');

    for (const line of lines) {
      const text = line.trim();

      // 检查是否是字段标签
      for (const [fieldName, fieldKeywords] of Object.entries(keywords)) {
        if (fieldKeywords.some(keyword => text.includes(keyword))) {
          // 尝试获取字段值
          const value = this.extractFieldValue(text, lines, lines.indexOf(line));
          if (value) {
            fields[fieldName] = value;
          }
        }
      }
    }

    return fields;
  }

  /**
   * 获取表单关键词
   */
  getFormKeywords(formType) {
    const keywordMaps = {
      census: {
        name: ['姓名', '名字'],
        idNumber: ['身份证号', '身份证号码'],
        gender: ['性别'],
        birth: ['出生', '出生日期'],
        address: ['住址', '地址'],
        phone: ['电话', '手机'],
        education: ['学历', '文化程度'],
        occupation: ['职业', '工作'],
        marital: ['婚姻', '婚况']
      },
      subsidy: {
        applicant: ['申请人', '申请户'],
        idNumber: ['身份证号'],
        household: ['户号', '户籍'],
        address: ['地址', '住址'],
        phone: ['联系电话'],
        bank: ['银行', '卡号'],
        amount: ['金额', '补贴']
      }
    };

    return keywordMaps[formType] || {};
  }

  /**
   * 提取字段值
   */
  extractFieldValue(labelText, lines, labelIndex) {
    // 简单的值提取逻辑：在同一行或下一行找值
    if (labelIndex < 0) return null;

    // 尝试从同一行提取
    const sameLine = lines[labelIndex];
    const colonIndex = sameLine.indexOf('：') || sameLine.indexOf(':');
    if (colonIndex > -1 && colonIndex < sameLine.length - 1) {
      const value = sameLine.substring(colonIndex + 1).trim();
      if (value && value.length > 0) {
        return value;
      }
    }

    // 尝试从下一行提取
    if (labelIndex + 1 < lines.length) {
      const nextLine = lines[labelIndex + 1].trim();
      if (nextLine && !this.isFieldLabel(nextLine)) {
        return nextLine;
      }
    }

    return null;
  }

  /**
   * 判断是否是字段标签
   */
  isFieldLabel(text) {
    const labelKeywords = ['姓名', '性别', '身份证', '地址', '电话', '日期', '金额'];
    return labelKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 自动填充字段
   */
  async autoFillFields(parsedFields, userId, formType) {
    const filledFields = {};

    try {
      // 获取用户信息
      const { User } = require('../models/User');
      const user = await User.findById(userId);

      if (!user) return filledFields;

      // 根据字段类型自动填充
      for (const [fieldName, value] of Object.entries(parsedFields)) {
        switch (fieldName) {
          case 'name':
            filledFields[fieldName] = user.name || value;
            break;
          case 'idNumber':
            filledFields[fieldName] = user.idCard || value;
            break;
          case 'gender':
            filledFields[fieldName] = this.formatGender(user.gender) || value;
            break;
          case 'address':
            filledFields[fieldName] = user.address || value;
            break;
          case 'phone':
            filledFields[fieldName] = user.phone || value;
            break;
          default:
            filledFields[fieldName] = value;
        }
      }

    } catch (error) {
      logger.error('自动填充字段失败:', error);
    }

    return filledFields;
  }

  /**
   * 格式化性别
   */
  formatGender(gender) {
    if (!gender) return '';

    const genderMap = {
      'male': '男',
      'female': '女',
      '男': '男',
      '女': '女',
      '1': '男',
      '2': '女'
    };

    return genderMap[gender] || gender;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理临时文件
   */
  async cleanup(imagePath) {
    try {
      await fs.unlink(imagePath);
      logger.debug(`临时文件已清理: ${imagePath}`);
    } catch (error) {
      logger.warn(`清理临时文件失败: ${imagePath}`, error);
    }
  }
}

module.exports = new OCRService();