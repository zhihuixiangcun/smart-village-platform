/**
 * 增强OCR票据识别系统
 * 提供智能发票识别、财务凭证自动分类、批量处理等功能
 */

const tesseract = require('tesseract.js');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

// 发票模板库
const invoiceTemplates = require('./templates/invoiceTemplates');
const documentClassifier = require('./ai/documentClassifier');
const ocrValidator = require('./validation/ocrValidator');
const logger = require('../utils/logger');

class EnhancedOCRService {
  constructor() {
    // OCR服务商配置
    this.providers = {
      baidu: {
        apiKey: process.env.BAIDU_OCR_API_KEY,
        secretKey: process.env.BAIDU_OCR_SECRET_KEY,
        endpoints: {
          token: 'https://aip.baidubce.com/oauth/2.0/token',
          vat: 'https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice',
          receipt: 'https://aip.baidubce.com/rest/2.0/ocr/v1/receipt',
          idcard: 'https://aip.baidubce.com/rest/2.0/ocr/v1/idcard'
        }
      },
      tencent: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
        region: process.env.TENCENT_REGION || 'ap-beijing',
        endpoint: 'ocr.tencentcloudapi.com'
      },
      ali: {
        accessKeyId: process.env.ALI_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
        endpoint: process.env.ALI_OCR_ENDPOINT || 'ocr-api.cn-hangzhou.aliyuncs.com'
      }
    };

    // 识别缓存
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30分钟缓存

    // 批处理队列
    this.processingQueue = [];
    this.maxConcurrent = 3;
    this.currentProcessing = 0;

    // 图像预处理配置
    this.imagePreprocessing = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff'],
      optimalDPI: 300,
      qualityThreshold: 0.7
    };

    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  /**
   * 智能发票识别
   * @param {string} imagePath 图片路径
   * @param {Object} options 识别选项
   */
  async recognizeInvoice(imagePath, options = {}) {
    const {
      invoiceType = 'auto', // auto, vat, receipt, electronic
      provider = 'auto', // auto, baidu, tencent, ali, tesseract
      enablePreprocessing = true,
      enableValidation = true,
      enableClassification = true
    } = options;

    try {
      // 1. 图像预处理
      const processedImage = enablePreprocessing ?
        await this.preprocessImage(imagePath) : imagePath;

      // 2. 自动检测发票类型
      const detectedType = invoiceType === 'auto' ?
        await this.detectInvoiceType(processedImage) : invoiceType;

      // 3. 选择最优OCR提供商
      const selectedProvider = provider === 'auto' ?
        await this.selectBestProvider(detectedType) : provider;

      // 4. 执行OCR识别
      const ocrResult = await this.performOCR(processedImage, {
        type: 'invoice',
        invoiceType: detectedType,
        provider: selectedProvider
      });

      // 5. 智能数据提取和结构化
      const structuredData = await this.extractInvoiceData(
        ocrResult,
        detectedType,
        options
      );

      // 6. 数据验证和纠错
      if (enableValidation) {
        structuredData.validation = await this.validateInvoiceData(structuredData);
      }

      // 7. 自动分类
      if (enableClassification) {
        structuredData.classification = await this.classifyInvoice(structuredData);
      }

      // 8. 计算置信度
      structuredData.confidence = this.calculateConfidence(ocrResult, structuredData);

      // 清理临时文件
      if (processedImage !== imagePath) {
        await this.cleanup(processedImage);
      }

      return {
        success: true,
        data: structuredData,
        metadata: {
          detectedType,
          provider: selectedProvider,
          processingTime: Date.now(),
          originalImage: imagePath
        }
      };

    } catch (error) {
      logger.error('智能发票识别失败:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * 批量票据处理
   * @param {Array} files 文件列表
   * @param {Object} options 处理选项
   */
  async batchProcessInvoices(files, options = {}) {
    const {
      maxConcurrency = 5,
      enableParallel = true,
      progressCallback = null,
      skipDuplicates = true
    } = options;

    const results = [];
    const stats = {
      total: files.length,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now()
    };

    try {
      // 去重检查
      let filesToProcess = files;
      if (skipDuplicates) {
        const uniqueFiles = await this.removeDuplicateFiles(files);
        stats.skipped = files.length - uniqueFiles.length;
        filesToProcess = uniqueFiles;
      }

      if (enableParallel) {
        // 并行处理
        const batches = this.createBatches(filesToProcess, maxConcurrency);

        for (const batch of batches) {
          const batchPromises = batch.map(file =>
            this.processSingleInvoice(file, options)
          );

          const batchResults = await Promise.allSettled(batchPromises);

          batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              results.push(result.value);
              if (result.value.success) stats.success++;
              else stats.failed++;
            } else {
              results.push({
                success: false,
                file: batch[index],
                error: result.reason.message
              });
              stats.failed++;
            }

            stats.processed++;

            // 进度回调
            if (progressCallback) {
              progressCallback(stats);
            }
          });
        }
      } else {
        // 串行处理
        for (const file of filesToProcess) {
          const result = await this.processSingleInvoice(file, options);
          results.push(result);

          if (result.success) stats.success++;
          else stats.failed++;

          stats.processed++;

          if (progressCallback) {
            progressCallback(stats);
          }
        }
      }

      stats.endTime = Date.now();
      stats.duration = stats.endTime - stats.startTime;
      stats.successRate = (stats.success / stats.processed * 100).toFixed(2);

      // 生成处理报告
      const report = this.generateBatchReport(results, stats);

      return {
        success: true,
        results,
        stats,
        report
      };

    } catch (error) {
      logger.error('批量处理失败:', error);
      return {
        success: false,
        error: error.message,
        results,
        stats
      };
    }
  }

  /**
   * 财务凭证自动分类
   * @param {string} imagePath 凭证图片路径
   * @param {Object} options 分类选项
   */
  async classifyFinancialDocument(imagePath, options = {}) {
    const {
      documentType = 'auto', // auto, invoice, receipt, contract, bank_statement
      category = 'auto', // auto, income, expense, asset, liability
      enableDetailAnalysis = true
    } = options;

    try {
      // 1. 基础OCR识别
      const ocrResult = await this.performOCR(imagePath, {
        type: 'document',
        provider: 'baidu'
      });

      // 2. 文档类型识别
      const detectedType = documentType === 'auto' ?
        await this.detectDocumentType(ocrResult) : documentType;

      // 3. 财务分类
      const classification = await documentClassifier.classify({
        ocrResult,
        documentType: detectedType,
        enableDetailAnalysis
      });

      // 4. 数据提取
      const extractedData = await this.extractFinancialData(
        ocrResult,
        detectedType,
        classification
      );

      // 5. 风险评估
      const riskAssessment = await this.assessDocumentRisk(
        extractedData,
        classification
      );

      return {
        success: true,
        data: {
          documentType: detectedType,
          classification,
          extractedData,
          riskAssessment,
          ocrConfidence: ocrResult.confidence,
          processingMetadata: {
            imagePath,
            processedAt: new Date(),
            processingTime: Date.now()
          }
        }
      };

    } catch (error) {
      logger.error('财务凭证分类失败:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * 图像预处理
   */
  async preprocessImage(imagePath) {
    try {
      const stats = await fs.stat(imagePath);

      // 检查文件大小
      if (stats.size > this.imagePreprocessing.maxFileSize) {
        throw new Error(`文件过大，最大支持 ${this.imagePreprocessing.maxFileSize / 1024 / 1024}MB`);
      }

      // 生成临时文件路径
      const ext = path.extname(imagePath);
      const tempPath = path.join(
        path.dirname(imagePath),
        `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`
      );

      // 图像增强处理
      await sharp(imagePath)
        .resize(null, {
          height: 2000,
          withoutEnlargement: true
        }) // 限制高度，提高处理速度
        .sharpen({
          sigma: 1,
          flat: 1.5,
          jagged: 2
        }) // 锐化
        .normalize() // 标准化对比度
        .threshold(128) // 二值化
        .png({
          quality: 90,
          compressionLevel: 6
        })
        .toFile(tempPath);

      return tempPath;

    } catch (error) {
      logger.error('图像预处理失败:', error);
      return imagePath; // 返回原图像
    }
  }

  /**
   * 自动检测发票类型
   */
  async detectInvoiceType(imagePath) {
    try {
      // 使用快速OCR获取关键信息
      const quickResult = await this.performQuickOCR(imagePath);
      const text = quickResult.text.toLowerCase();

      // 增值税发票特征
      if (text.includes('增值税专用发票') || text.includes('增值税普通发票')) {
        return 'vat';
      }

      // 电子发票特征
      if (text.includes('电子发票') || text.includes('国家税务总局')) {
        return 'electronic';
      }

      // 收据特征
      if (text.includes('收据') || text.includes('收款收据')) {
        return 'receipt';
      }

      // 通用发票
      if (text.includes('发票') || text.includes('invoice')) {
        return 'general';
      }

      return 'unknown';

    } catch (error) {
      logger.warn('发票类型检测失败:', error);
      return 'general';
    }
  }

  /**
   * 选择最优OCR提供商
   */
  async selectBestProvider(invoiceType) {
    const providerPreferences = {
      vat: ['baidu', 'tencent', 'ali'],
      electronic: ['baidu', 'ali'],
      receipt: ['baidu', 'tesseract'],
      general: ['baidu', 'tencent']
    };

    const preferredProviders = providerPreferences[invoiceType] || ['baidu'];

    // 检查提供商可用性
    for (const provider of preferredProviders) {
      if (await this.isProviderAvailable(provider)) {
        return provider;
      }
    }

    return 'tesseract'; // 备用方案
  }

  /**
   * 执行OCR识别
   */
  async performOCR(imagePath, options) {
    const { type, invoiceType, provider } = options;

    try {
      switch (provider) {
      case 'baidu':
        return await this.performBaiduOCR(imagePath, type, invoiceType);
      case 'tencent':
        return await this.performTencentOCR(imagePath, type);
      case 'ali':
        return await this.performAliOCR(imagePath, type);
      default:
        return await this.performTesseractOCR(imagePath);
      }
    } catch (error) {
      logger.error(`${provider} OCR识别失败，尝试备用方案:`, error);
      // 备用方案
      return await this.performTesseractOCR(imagePath);
    }
  }

  /**
   * 百度OCR识别
   */
  async performBaiduOCR(imagePath, type, invoiceType) {
    try {
      const accessToken = await this.getBaiduAccessToken();
      const imageBuffer = await fs.readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      let endpoint;
      switch (type) {
      case 'invoice':
        endpoint = invoiceType === 'receipt' ?
          this.providers.baidu.endpoints.receipt :
          this.providers.baidu.endpoints.vat;
        break;
      case 'idcard':
        endpoint = this.providers.baidu.endpoints.idcard;
        break;
      default:
        endpoint = this.providers.baidu.endpoints.vat;
      }

      const formData = new FormData();
      formData.append('image', imageBase64);

      const response = await axios.post(
        `${endpoint}?access_token=${accessToken}`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 15000
        }
      );

      if (response.data.error_code) {
        throw new Error(`百度OCR错误: ${response.data.error_msg}`);
      }

      return {
        provider: 'baidu',
        data: response.data,
        confidence: this.calculateBaiduConfidence(response.data)
      };

    } catch (error) {
      logger.error('百度OCR识别失败:', error);
      throw error;
    }
  }

  /**
   * 腾讯云OCR识别
   */
  async performTencentOCR(imagePath, type) {
    // 简化的腾讯云OCR实现
    // 实际实现需要集成腾讯云SDK
    return {
      provider: 'tencent',
      data: { text: '模拟腾讯云OCR结果' },
      confidence: 0.85
    };
  }

  /**
   * 阿里云OCR识别
   */
  async performAliOCR(imagePath, type) {
    // 简化的阿里云OCR实现
    // 实际实现需要集成阿里云SDK
    return {
      provider: 'ali',
      data: { text: '模拟阿里云OCR结果' },
      confidence: 0.88
    };
  }

  /**
   * Tesseract OCR识别
   */
  async performTesseractOCR(imagePath) {
    try {
      const result = await tesseract.recognize(
        imagePath,
        'chi_sim+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.debug(`Tesseract进度: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      return {
        provider: 'tesseract',
        data: { text: result.data.text, words: result.data.words },
        confidence: result.data.confidence
      };

    } catch (error) {
      logger.error('Tesseract OCR识别失败:', error);
      throw error;
    }
  }

  /**
   * 快速OCR识别
   */
  async performQuickOCR(imagePath) {
    try {
      const result = await tesseract.recognize(
        imagePath,
        'eng',
        {
          logger: () => {}
        }
      );

      return {
        text: result.data.text,
        confidence: result.data.confidence
      };

    } catch (error) {
      logger.error('快速OCR识别失败:', error);
      return { text: '', confidence: 0 };
    }
  }

  /**
   * 提取发票数据
   */
  async extractInvoiceData(ocrResult, invoiceType, options) {
    const extractedData = {
      invoiceType,
      basicInfo: {},
      amountInfo: {},
      itemInfo: [],
      taxInfo: {},
      metadata: {}
    };

    try {
      // 根据OCR提供商处理数据
      if (ocrResult.provider === 'baidu') {
        return await this.extractFromBaiduOCR(ocrResult.data, invoiceType);
      }

      // 通用文本解析
      return await this.extractFromText(ocrResult.data.text, invoiceType);

    } catch (error) {
      logger.error('发票数据提取失败:', error);
      return extractedData;
    }
  }

  /**
   * 从百度OCR结果提取数据
   */
  async extractFromBaiduOCR(data, invoiceType) {
    const extracted = {
      invoiceType,
      basicInfo: {},
      amountInfo: {},
      itemInfo: [],
      taxInfo: {}
    };

    const wordsResult = data.words_result || {};

    // 基本信息
    extracted.basicInfo = {
      invoiceNumber: this.extractValue(wordsResult, 'invoice_num'),
      invoiceCode: this.extractValue(wordsResult, 'invoice_code'),
      invoiceDate: this.extractValue(wordsResult, 'invoice_date'),
      sellerName: this.extractValue(wordsResult, 'seller_name'),
      sellerTaxNumber: this.extractValue(wordsResult, 'seller_tax_num'),
      buyerName: this.extractValue(wordsResult, 'purchaser_name'),
      buyerTaxNumber: this.extractValue(wordsResult, 'purchaser_tax_num'),
      checkCode: this.extractValue(wordsResult, 'check_code')
    };

    // 金额信息
    extracted.amountInfo = {
      totalAmount: this.extractValue(wordsResult, 'total_amount'),
      totalTax: this.extractValue(wordsResult, 'total_tax'),
      amountInWords: this.extractValue(wordsResult, 'amount_in_words'),
      amountInFigures: this.extractValue(wordsResult, 'amount_in_figures')
    };

    // 商品明细
    if (wordsResult.commodity_details && Array.isArray(wordsResult.commodity_details)) {
      extracted.itemInfo = wordsResult.commodity_details.map(item => ({
        name: item.word || '',
        specification: item.specification || '',
        unit: item.unit || '',
        quantity: item.quantity || '',
        unitPrice: item.unit_price || '',
        amount: item.amount || '',
        taxRate: item.tax_rate || '',
        taxAmount: item.tax_amount || ''
      }));
    }

    // 税务信息
    extracted.taxInfo = {
      taxRate: this.extractValue(wordsResult, 'tax_rate'),
      taxClass: this.extractValue(wordsResult, 'tax_class')
    };

    return extracted;
  }

  /**
   * 从通用文本提取数据
   */
  async extractFromText(text, invoiceType) {
    const extracted = {
      invoiceType,
      basicInfo: {},
      amountInfo: {},
      itemInfo: []
    };

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    // 使用正则表达式提取关键信息
    lines.forEach(line => {
      // 发票号码
      const invoiceNumMatch = line.match(/发票号码[：:]?\s*(\w+)/);
      if (invoiceNumMatch) {
        extracted.basicInfo.invoiceNumber = invoiceNumMatch[1];
      }

      // 发票代码
      const invoiceCodeMatch = line.match(/发票代码[：:]?\s*(\w+)/);
      if (invoiceCodeMatch) {
        extracted.basicInfo.invoiceCode = invoiceCodeMatch[1];
      }

      // 开票日期
      const dateMatch = line.match(/开票日期[：:]?\s*(\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?)/);
      if (dateMatch) {
        extracted.basicInfo.invoiceDate = dateMatch[1].replace(/[年月]/g, '-').replace('日', '');
      }

      // 销售方
      const sellerMatch = line.match(/销售方[：:]?\s*([^$\n]+)/);
      if (sellerMatch) {
        extracted.basicInfo.sellerName = sellerMatch[1].trim();
      }

      // 购买方
      const buyerMatch = line.match(/购买方[：:]?\s*([^$\n]+)/);
      if (buyerMatch) {
        extracted.basicInfo.buyerName = buyerMatch[1].trim();
      }

      // 价税合计
      const totalMatch = line.match(/价税合计[：:]?\s*[￥¥]?\s*([\d,]+\.?\d*)/);
      if (totalMatch) {
        extracted.amountInfo.totalAmount = totalMatch[1].replace(',', '');
      }

      // 税额
      const taxMatch = line.match(/税额[：:]?\s*[￥¥]?\s*([\d,]+\.?\d*)/);
      if (taxMatch) {
        extracted.amountInfo.totalTax = taxMatch[1].replace(',', '');
      }
    });

    return extracted;
  }

  /**
   * 验证发票数据
   */
  async validateInvoiceData(data) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 0
    };

    try {
      // 发票号码验证
      if (data.basicInfo.invoiceNumber) {
        if (!/^\d{8}$/.test(data.basicInfo.invoiceNumber)) {
          validation.warnings.push('发票号码格式异常');
          validation.score += 10;
        }
      } else {
        validation.errors.push('缺少发票号码');
        validation.isValid = false;
        validation.score += 50;
      }

      // 发票代码验证
      if (data.basicInfo.invoiceCode) {
        if (!/^\d{10,12}$/.test(data.basicInfo.invoiceCode)) {
          validation.warnings.push('发票代码格式异常');
          validation.score += 10;
        }
      } else {
        validation.errors.push('缺少发票代码');
        validation.isValid = false;
        validation.score += 30;
      }

      // 金额验证
      if (data.amountInfo.totalAmount) {
        const amount = parseFloat(data.amountInfo.totalAmount);
        if (isNaN(amount) || amount <= 0) {
          validation.errors.push('金额格式错误');
          validation.isValid = false;
          validation.score += 40;
        } else if (amount > 1000000) {
          validation.warnings.push('金额过大，请确认');
          validation.score += 15;
        }
      }

      // 日期验证
      if (data.basicInfo.invoiceDate) {
        const date = new Date(data.basicInfo.invoiceDate);
        if (isNaN(date.getTime())) {
          validation.warnings.push('日期格式异常');
          validation.score += 20;
        }
      }

      // 计算最终分数（分数越低质量越好）
      validation.score = Math.min(100, validation.score);

    } catch (error) {
      logger.error('数据验证失败:', error);
      validation.isValid = false;
      validation.errors.push('验证过程出错');
    }

    return validation;
  }

  /**
   * 发票分类
   */
  async classifyInvoice(data) {
    const classification = {
      category: '',
      subcategory: '',
      tags: [],
      confidence: 0
    };

    try {
      // 基于金额分类
      if (data.amountInfo.totalAmount) {
        const amount = parseFloat(data.amountInfo.totalAmount);
        if (amount < 1000) {
          classification.category = '小额支出';
        } else if (amount < 10000) {
          classification.category = '中等支出';
        } else {
          classification.category = '大额支出';
        }
      }

      // 基于销售方分类
      if (data.basicInfo.sellerName) {
        const sellerName = data.basicInfo.sellerName.toLowerCase();

        if (sellerName.includes('超市') || sellerName.includes('商场')) {
          classification.subcategory = '购物消费';
          classification.tags.push('日用品');
        } else if (sellerName.includes('餐厅') || sellerName.includes('饭店')) {
          classification.subcategory = '餐饮消费';
          classification.tags.push('餐饮');
        } else if (sellerName.includes('石油') || sellerName.includes('加油站')) {
          classification.subcategory = '交通出行';
          classification.tags.push('燃油');
        } else if (sellerName.includes('酒店') || sellerName.includes('宾馆')) {
          classification.subcategory = '住宿费用';
          classification.tags.push('住宿');
        }
      }

      // 基于商品明细分类
      if (data.itemInfo && data.itemInfo.length > 0) {
        const itemNames = data.itemInfo.map(item => item.name.toLowerCase()).join(' ');

        if (itemNames.includes('办公用品') || itemNames.includes('文具')) {
          classification.subcategory = '办公用品';
          classification.tags.push('办公');
        }

        if (itemNames.includes('维修') || itemNames.includes('配件')) {
          classification.subcategory = '维修费用';
          classification.tags.push('维修');
        }
      }

      // 计算置信度
      classification.confidence = this.calculateClassificationConfidence(
        classification,
        data
      );

    } catch (error) {
      logger.error('发票分类失败:', error);
    }

    return classification;
  }

  /**
   * 计算识别置信度
   */
  calculateConfidence(ocrResult, structuredData) {
    let confidence = ocrResult.confidence || 0.5;

    // 基于数据完整性调整
    const completenessScore = this.assessDataCompleteness(structuredData);
    confidence *= completenessScore;

    // 基于验证结果调整
    if (structuredData.validation) {
      const validationScore = (100 - structuredData.validation.score) / 100;
      confidence *= validationScore;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * 评估数据完整性
   */
  assessDataCompleteness(data) {
    let score = 0;
    let total = 0;

    // 基本信息完整性
    const basicFields = ['invoiceNumber', 'invoiceCode', 'invoiceDate', 'sellerName'];
    basicFields.forEach(field => {
      total++;
      if (data.basicInfo && data.basicInfo[field]) {
        score++;
      }
    });

    // 金额信息完整性
    const amountFields = ['totalAmount', 'totalTax'];
    amountFields.forEach(field => {
      total++;
      if (data.amountInfo && data.amountInfo[field]) {
        score++;
      }
    });

    return score / total;
  }

  /**
   * 辅助方法
   */

  /**
   * 获取百度访问令牌
   */
  async getBaiduAccessToken() {
    const now = Date.now();
    if (this.accessToken && this.tokenExpireTime > now) {
      return this.accessToken;
    }

    const response = await axios.post(this.providers.baidu.endpoints.token, null, {
      params: {
        grant_type: 'client_credentials',
        client_id: this.providers.baidu.apiKey,
        client_secret: this.providers.baidu.secretKey
      }
    });

    this.accessToken = response.data.access_token;
    this.tokenExpireTime = now + (response.data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  /**
   * 检查提供商可用性
   */
  async isProviderAvailable(provider) {
    const config = this.providers[provider];
    if (!config) return false;

    // 检查必需的配置
    if (provider === 'baidu') {
      return !!(config.apiKey && config.secretKey);
    } else if (provider === 'tencent') {
      return !!(config.secretId && config.secretKey);
    } else if (provider === 'ali') {
      return !!(config.accessKeyId && config.accessKeySecret);
    }

    return true; // Tesseract总是可用
  }

  /**
   * 去除重复文件
   */
  async removeDuplicateFiles(files) {
    const uniqueFiles = [];
    const seen = new Set();

    for (const file of files) {
      const key = `${file.path}_${file.size}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueFiles.push(file);
      }
    }

    return uniqueFiles;
  }

  /**
   * 创建批次
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 处理单个发票
   */
  async processSingleInvoice(file, options) {
    try {
      const result = await this.recognizeInvoice(file.path, options);
      result.file = file;
      return result;
    } catch (error) {
      return {
        success: false,
        file,
        error: error.message
      };
    }
  }

  /**
   * 生成批量处理报告
   */
  generateBatchReport(results, stats) {
    const report = {
      summary: {
        total: stats.total,
        success: stats.success,
        failed: stats.failed,
        skipped: stats.skipped,
        successRate: `${stats.successRate}%`,
        duration: `${(stats.duration / 1000).toFixed(2)}秒`
      },
      distribution: {
        byType: {},
        byProvider: {},
        byConfidence: { high: 0, medium: 0, low: 0 }
      },
      errors: [],
      recommendations: []
    };

    // 统计分布
    results.forEach(result => {
      if (result.success && result.data) {
        // 按类型统计
        const type = result.data.invoiceType || 'unknown';
        report.distribution.byType[type] = (report.distribution.byType[type] || 0) + 1;

        // 按提供商统计
        const provider = result.metadata?.provider || 'unknown';
        report.distribution.byProvider[provider] = (report.distribution.byProvider[provider] || 0) + 1;

        // 按置信度统计
        const confidence = result.data.confidence || 0;
        if (confidence >= 0.9) {
          report.distribution.byConfidence.high++;
        } else if (confidence >= 0.7) {
          report.distribution.byConfidence.medium++;
        } else {
          report.distribution.byConfidence.low++;
        }
      } else {
        report.errors.push({
          file: result.file?.name || 'unknown',
          error: result.error
        });
      }
    });

    // 生成建议
    if (report.distribution.byConfidence.low / stats.success > 0.3) {
      report.recommendations.push('建议提高图像质量以提升识别准确率');
    }

    if (stats.failed / stats.total > 0.1) {
      report.recommendations.push('部分文件处理失败，请检查文件格式和完整性');
    }

    return report;
  }

  /**
   * 提取值
   */
  extractValue(data, field) {
    return data[field]?.words || '';
  }

  /**
   * 计算百度OCR置信度
   */
  calculateBaiduConfidence(data) {
    // 简化的置信度计算
    return 0.9;
  }

  /**
   * 检测文档类型
   */
  async detectDocumentType(ocrResult) {
    // 简化的文档类型检测
    return 'invoice';
  }

  /**
   * 提取财务数据
   */
  async extractFinancialData(ocrResult, documentType, classification) {
    // 简化的财务数据提取
    return {
      amount: 0,
      date: new Date(),
      category: classification.category || 'other'
    };
  }

  /**
   * 文档风险评估
   */
  async assessDocumentRisk(data, classification) {
    // 简化的风险评估
    return {
      level: 'low',
      score: 0.1,
      factors: []
    };
  }

  /**
   * 计算分类置信度
   */
  calculateClassificationConfidence(classification, data) {
    let confidence = 0.5;

    if (classification.category) confidence += 0.2;
    if (classification.subcategory) confidence += 0.2;
    if (classification.tags.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * 清理临时文件
   */
  async cleanup(filePath) {
    try {
      await fs.unlink(filePath);
      logger.debug(`临时文件已清理: ${filePath}`);
    } catch (error) {
      logger.warn(`清理临时文件失败: ${filePath}`, error);
    }
  }
}

module.exports = new EnhancedOCRService();