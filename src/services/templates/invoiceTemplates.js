/**
 * 发票模板库
 * 定义各类发票的字段映射、验证规则和识别策略
 */

class InvoiceTemplates {
  constructor() {
    this.templates = new Map();
    this.fieldMappings = new Map();
    this.validationRules = new Map();

    this.initializeTemplates();
    this.initializeFieldMappings();
    this.initializeValidationRules();
  }

  /**
   * 初始化发票模板
   */
  initializeTemplates() {
    // 增值税专用发票模板
    this.templates.set('vat_special', {
      name: '增值税专用发票',
      version: '2018版',
      layout: {
        header: { x: 0, y: 0, width: 100, height: 15 },
        seller: { x: 5, y: 20, width: 40, height: 25 },
        buyer: { x: 55, y: 20, width: 40, height: 25 },
        items: { x: 5, y: 50, width: 90, height: 30 },
        total: { x: 70, y: 85, width: 25, height: 10 },
        footer: { x: 5, y: 95, width: 90, height: 5 }
      },
      keywords: [
        '增值税专用发票',
        '国家税务总局',
        '税控码',
        '密码区'
      ],
      requiredFields: [
        'invoiceNumber',
        'invoiceCode',
        'invoiceDate',
        'sellerName',
        'sellerTaxNumber',
        'buyerName',
        'buyerTaxNumber',
        'totalAmount',
        'totalTax'
      ],
      confidenceThreshold: 0.85
    });

    // 增值税普通发票模板
    this.templates.set('vat_general', {
      name: '增值税普通发票',
      version: '2018版',
      layout: {
        header: { x: 0, y: 0, width: 100, height: 12 },
        info: { x: 5, y: 15, width: 90, height: 20 },
        items: { x: 5, y: 40, width: 90, height: 35 },
        total: { x: 70, y: 80, width: 25, height: 8 },
        footer: { x: 5, y: 90, width: 90, height: 10 }
      },
      keywords: [
        '增值税普通发票',
        '国家税务总局',
        '电子发票'
      ],
      requiredFields: [
        'invoiceNumber',
        'invoiceCode',
        'invoiceDate',
        'sellerName',
        'buyerName',
        'totalAmount'
      ],
      confidenceThreshold: 0.80
    });

    // 电子发票模板
    this.templates.set('electronic', {
      name: '电子发票',
      version: '电子版',
      layout: {
        header: { x: 0, y: 0, width: 100, height: 10 },
        qrCode: { x: 85, y: 5, width: 10, height: 10 },
        info: { x: 5, y: 12, width: 80, height: 25 },
        items: { x: 5, y: 40, width: 90, height: 35 },
        total: { x: 70, y: 80, width: 25, height: 8 },
        verification: { x: 5, y: 88, width: 90, height: 12 }
      },
      keywords: [
        '电子发票',
        '二维码',
        '查验平台',
        '财政部监制'
      ],
      requiredFields: [
        'invoiceNumber',
        'invoiceCode',
        'invoiceDate',
        'sellerName',
        'buyerName',
        'totalAmount',
        'verificationCode'
      ],
      confidenceThreshold: 0.82
    });

    // 收据模板
    this.templates.set('receipt', {
      name: '收据',
      version: '通用版',
      layout: {
        header: { x: 40, y: 5, width: 20, height: 8 },
        info: { x: 5, y: 15, width: 90, height: 30 },
        items: { x: 5, y: 50, width: 90, height: 25 },
        total: { x: 70, y: 80, width: 25, height: 8 },
        signature: { x: 5, y: 88, width: 90, height: 12 }
      },
      keywords: [
        '收据',
        '收款收据',
        '今收到',
        '人民币'
      ],
      requiredFields: [
        'receiptNumber',
        'receiptDate',
        'payerName',
        'payeeName',
        'amount',
        'paymentMethod'
      ],
      confidenceThreshold: 0.75
    });

    // 机动车销售统一发票
    this.templates.set('vehicle_sales', {
      name: '机动车销售统一发票',
      version: '2018版',
      layout: {
        header: { x: 0, y: 0, width: 100, height: 12 },
        vehicle: { x: 5, y: 15, width: 45, height: 25 },
        buyer: { x: 55, y: 15, width: 40, height: 25 },
        seller: { x: 5, y: 45, width: 90, height: 15 },
        amount: { x: 70, y: 65, width: 25, height: 15 },
        tax: { x: 5, y: 85, width: 90, height: 10 },
        seal: { x: 40, y: 90, width: 20, height: 10 }
      },
      keywords: [
        '机动车销售统一发票',
        '车架号',
        '发动机号',
        '车辆类型'
      ],
      requiredFields: [
        'invoiceNumber',
        'invoiceCode',
        'invoiceDate',
        'vehicleType',
        'vin',
        'engineNumber',
        'sellerName',
        'buyerName',
        'totalAmount'
      ],
      confidenceThreshold: 0.83
    });

    // 不动产销售统一发票
    this.templates.set('real_estate', {
      name: '不动产销售统一发票',
      version: '2018版',
      layout: {
        header: { x: 0, y: 0, width: 100, height: 10 },
        property: { x: 5, y: 12, width: 90, height: 20 },
        parties: { x: 5, y: 35, width: 90, height: 15 },
        amount: { x: 5, y: 55, width: 90, height: 20 },
        details: { x: 5, y: 78, width: 90, height: 15 },
        seal: { x: 40, y: 93, width: 20, height: 7 }
      },
      keywords: [
        '不动产销售统一发票',
        '房屋产权证号',
        '不动产单元号',
        '建筑面积'
      ],
      requiredFields: [
        'invoiceNumber',
        'invoiceCode',
        'invoiceDate',
        'propertyAddress',
        'propertyType',
        'area',
        'unitPrice',
        'totalAmount',
        'sellerName',
        'buyerName'
      ],
      confidenceThreshold: 0.82
    });
  }

  /**
   * 初始化字段映射
   */
  initializeFieldMappings() {
    // 百度OCR字段映射
    this.fieldMappings.set('baidu', {
      vat_special: {
        invoiceNumber: ['invoice_num', '发票号码'],
        invoiceCode: ['invoice_code', '发票代码'],
        invoiceDate: ['invoice_date', '开票日期'],
        sellerName: ['seller_name', '销售方名称'],
        sellerTaxNumber: ['seller_tax_num', '销售方纳税人识别号'],
        sellerAddress: ['seller_address', '销售方地址'],
        sellerBank: ['seller_bank', '销售方开户行及账号'],
        buyerName: ['purchaser_name', '购买方名称'],
        buyerTaxNumber: ['purchaser_tax_num', '购买方纳税人识别号'],
        buyerAddress: ['purchaser_address', '购买方地址'],
        buyerBank: ['purchaser_bank', '购买方开户行及账号'],
        totalAmount: ['total_amount', '价税合计(大写)', '价税合计(小写)'],
        totalTax: ['total_tax', '税额'],
        amountWithoutTax: ['amount_without_tax', '合计金额'],
        checkCode: ['check_code', '校验码'],
        machineNumber: ['machine_number', '机器编号'],
        passwordArea: ['password', '密码区']
      },
      receipt: {
        receiptNumber: ['receipt_num', '票据号码'],
        receiptDate: ['receipt_date', '开票日期'],
        payerName: ['payer', '付款方'],
        payeeName: ['payee', '收款方'],
        amount: ['amount', '金额'],
        amountInWords: ['amount_in_words', '金额大写'],
        amountInFigures: ['amount_in_figures', '金额小写'],
        paymentMethod: ['payment_method', '支付方式'],
        usage: ['usage', '款项用途']
      }
    });

    // 腾讯云OCR字段映射
    this.fieldMappings.set('tencent', {
      vat_special: {
        invoiceNumber: ['InvoiceNum', '发票号码'],
        invoiceCode: ['InvoiceCode', '发票代码'],
        invoiceDate: ['InvoiceDate', '开票日期'],
        sellerName: ['SellerName', '销售方名称'],
        buyerName: ['BuyerName', '购买方名称'],
        totalAmount: ['TotalAmount', '价税合计'],
        totalTax: ['TotalTax', '税额']
      }
    });

    // 阿里云OCR字段映射
    this.fieldMappings.set('ali', {
      vat_special: {
        invoiceNumber: ['invoice_num', '发票号码'],
        invoiceCode: ['invoice_code', '发票代码'],
        invoiceDate: ['invoice_date', '开票日期'],
        sellerName: ['seller_name', '销售方名称'],
        buyerName: ['buyer_name', '购买方名称'],
        totalAmount: ['total_amount', '价税合计']
      }
    });
  }

  /**
   * 初始化验证规则
   */
  initializeValidationRules() {
    // 发票号码验证规则
    this.validationRules.set('invoiceNumber', {
      pattern: /^\d{8}$/,
      required: true,
      description: '8位数字发票号码'
    });

    // 发票代码验证规则
    this.validationRules.set('invoiceCode', {
      pattern: /^\d{10,12}$/,
      required: true,
      description: '10-12位数字发票代码'
    });

    // 税号验证规则
    this.validationRules.set('taxNumber', {
      pattern: /^[A-Z0-9]{15,20}$/,
      required: true,
      description: '15-20位字母数字组合'
    });

    // 金额验证规则
    this.validationRules.set('amount', {
      pattern: /^\d+(\.\d{1,2})?$/,
      required: true,
      min: 0.01,
      max: 999999999.99,
      description: '正数金额，最多2位小数'
    });

    // 日期验证规则
    this.validationRules.set('date', {
      pattern: /^\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?$/,
      required: true,
      description: 'YYYY-MM-DD格式日期'
    });

    // 车架号验证规则
    this.validationRules.set('vin', {
      pattern: /^[A-HJ-NPR-Z0-9]{17}$/,
      required: true,
      description: '17位车架号'
    });

    // 发动机号验证规则
    this.validationRules.set('engineNumber', {
      pattern: /^[A-Z0-9]{6,20}$/,
      required: true,
      description: '6-20位字母数字组合'
    });
  }

  /**
   * 获取模板
   */
  getTemplate(templateType) {
    return this.templates.get(templateType);
  }

  /**
   * 获取所有模板
   */
  getAllTemplates() {
    return Array.from(this.templates.entries()).map(([key, template]) => ({
      type: key,
      ...template
    }));
  }

  /**
   * 匹配模板
   */
  matchTemplate(ocrResult, detectedKeywords = []) {
    const text = typeof ocrResult === 'string' ? ocrResult :
      (ocrResult.data?.text || '');

    let bestMatch = null;
    let bestScore = 0;

    // 遍历所有模板进行匹配
    for (const [templateType, template] of this.templates) {
      const score = this.calculateTemplateMatch(text, detectedKeywords, template);

      if (score > bestScore && score >= template.confidenceThreshold) {
        bestScore = score;
        bestMatch = {
          type: templateType,
          template,
          score
        };
      }
    }

    return bestMatch;
  }

  /**
   * 计算模板匹配分数
   */
  calculateTemplateMatch(text, detectedKeywords, template) {
    let score = 0;
    const totalWeight = 100;

    // 关键词匹配（权重40%）
    const keywordScore = this.calculateKeywordScore(text, template.keywords);
    score += keywordScore * 40;

    // 布局匹配（权重30%）
    const layoutScore = this.calculateLayoutScore(detectedKeywords, template);
    score += layoutScore * 30;

    // 格式匹配（权重20%）
    const formatScore = this.calculateFormatScore(text, template);
    score += formatScore * 20;

    // 特殊元素匹配（权重10%）
    const elementScore = this.calculateElementScore(text, template);
    score += elementScore * 10;

    return score / totalWeight;
  }

  /**
   * 计算关键词匹配分数
   */
  calculateKeywordScore(text, keywords) {
    if (!keywords || keywords.length === 0) return 0;

    let matchCount = 0;
    const lowerText = text.toLowerCase();

    keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    });

    return matchCount / keywords.length;
  }

  /**
   * 计算布局匹配分数
   */
  calculateLayoutScore(detectedKeywords, template) {
    // 简化的布局匹配逻辑
    // 实际实现应基于OCR的位置信息
    return 0.8;
  }

  /**
   * 计算格式匹配分数
   */
  calculateFormatScore(text, template) {
    let score = 0;

    // 检查是否有标准的发票格式特征
    if (/发票号码/.test(text)) score += 0.25;
    if (/发票代码/.test(text)) score += 0.25;
    if (/开票日期/.test(text)) score += 0.25;
    if (/价税合计/.test(text)) score += 0.25;

    return score;
  }

  /**
   * 计算特殊元素匹配分数
   */
  calculateElementScore(text, template) {
    let score = 0;

    // 检查特殊元素
    if (template.name.includes('电子') && /二维码/.test(text)) score += 0.5;
    if (template.name.includes('机动车') && /车架号/.test(text)) score += 0.5;
    if (template.name.includes('不动产') && /建筑面积/.test(text)) score += 0.5;

    return score;
  }

  /**
   * 获取字段映射
   */
  getFieldMapping(provider, templateType) {
    const providerMappings = this.fieldMappings.get(provider);
    if (!providerMappings) return {};

    return providerMappings[templateType] || providerMappings['vat_special'] || {};
  }

  /**
   * 映射字段
   */
  mapFields(ocrData, provider, templateType) {
    const mapping = this.getFieldMapping(provider, templateType);
    const mappedData = {};

    for (const [targetField, sourceFields] of Object.entries(mapping)) {
      const value = this.extractFieldFromOCR(ocrData, sourceFields);
      if (value) {
        mappedData[targetField] = value;
      }
    }

    return mappedData;
  }

  /**
   * 从OCR数据中提取字段
   */
  extractFieldFromOCR(ocrData, sourceFields) {
    const data = ocrData.data || ocrData;

    for (const field of sourceFields) {
      // 直接匹配
      if (data[field]) {
        return typeof data[field] === 'object' ? data[field].words : data[field];
      }

      // words_result匹配（百度OCR）
      if (data.words_result && data.words_result[field]) {
        return data.words_result[field].words;
      }

      // 文本搜索匹配
      if (typeof data === 'string' || data.text) {
        const text = typeof data === 'string' ? data : data.text;
        const regex = new RegExp(`${field}[：:]?\\s*([^\\n\\r]+)`, 'i');
        const match = text.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }

    return null;
  }

  /**
   * 验证字段
   */
  validateField(fieldName, value) {
    const rule = this.validationRules.get(fieldName);
    if (!rule) return { valid: true, message: '' };

    // 检查必填
    if (rule.required && (!value || value.trim() === '')) {
      return {
        valid: false,
        message: `${fieldName}为必填项`
      };
    }

    if (!value) return { valid: true, message: '' };

    // 检查格式
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        valid: false,
        message: `${fieldName}格式不正确：${rule.description}`
      };
    }

    // 检查数值范围
    if (rule.min || rule.max) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        if (rule.min !== undefined && numValue < rule.min) {
          return {
            valid: false,
            message: `${fieldName}不能小于${rule.min}`
          };
        }
        if (rule.max !== undefined && numValue > rule.max) {
          return {
            valid: false,
            message: `${fieldName}不能大于${rule.max}`
          };
        }
      }
    }

    return { valid: true, message: '' };
  }

  /**
   * 验证完整数据
   */
  validateData(data, templateType) {
    const template = this.getTemplate(templateType);
    if (!template) {
      return { valid: false, errors: ['未知的模板类型'] };
    }

    const errors = [];
    const warnings = [];

    // 验证必填字段
    template.requiredFields.forEach(field => {
      const validation = this.validateField(field, data[field]);
      if (!validation.valid) {
        errors.push(validation.message);
      }
    });

    // 验证可选字段
    Object.keys(data).forEach(field => {
      if (!template.requiredFields.includes(field)) {
        const validation = this.validateField(field, data[field]);
        if (!validation.valid) {
          warnings.push(validation.message);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 标准化数据
   */
  standardizeData(data, templateType) {
    const standardized = { ...data };

    // 标准化日期格式
    if (standardized.invoiceDate) {
      standardized.invoiceDate = this.standardizeDate(standardized.invoiceDate);
    }

    // 标准化金额格式
    const amountFields = ['totalAmount', 'totalTax', 'amountWithoutTax'];
    amountFields.forEach(field => {
      if (standardized[field]) {
        standardized[field] = this.standardizeAmount(standardized[field]);
      }
    });

    // 标准化税号格式
    const taxFields = ['sellerTaxNumber', 'buyerTaxNumber'];
    taxFields.forEach(field => {
      if (standardized[field]) {
        standardized[field] = this.standardizeTaxNumber(standardized[field]);
      }
    });

    return standardized;
  }

  /**
   * 标准化日期
   */
  standardizeDate(dateStr) {
    if (!dateStr) return '';

    // 移除非数字字符，保留分隔符
    const normalized = dateStr.replace(/[年月]/g, '-').replace('日', '');

    // 解析日期
    const date = new Date(normalized);
    if (isNaN(date.getTime())) {
      return dateStr; // 返回原始字符串
    }

    return date.toISOString().split('T')[0];
  }

  /**
   * 标准化金额
   */
  standardizeAmount(amountStr) {
    if (!amountStr) return '';

    // 移除非数字字符，保留小数点
    const normalized = amountStr.replace(/[^\d.]/g, '');
    const amount = parseFloat(normalized);

    if (isNaN(amount)) {
      return amountStr;
    }

    return amount.toFixed(2);
  }

  /**
   * 标准化税号
   */
  standardizeTaxNumber(taxNumber) {
    if (!taxNumber) return '';

    // 移除空格和特殊字符
    return taxNumber.replace(/[\s\-]/g, '').toUpperCase();
  }

  /**
   * 添加自定义模板
   */
  addCustomTemplate(templateType, templateData) {
    // 验证模板数据
    if (!templateData.name || !templateData.keywords || !templateData.requiredFields) {
      throw new Error('模板数据不完整');
    }

    this.templates.set(templateType, templateData);
  }

  /**
   * 更新模板
   */
  updateTemplate(templateType, updates) {
    const existingTemplate = this.templates.get(templateType);
    if (!existingTemplate) {
      throw new Error(`模板 ${templateType} 不存在`);
    }

    const updatedTemplate = { ...existingTemplate, ...updates };
    this.templates.set(templateType, updatedTemplate);
  }

  /**
   * 删除模板
   */
  removeTemplate(templateType) {
    return this.templates.delete(templateType);
  }
}

module.exports = new InvoiceTemplates();