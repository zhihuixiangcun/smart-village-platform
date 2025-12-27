/**
 * 文档智能分类器
 * 基于机器学习的财务凭证自动分类系统
 */

const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const EventEmitter = require('events');
const logger = require('../../utils/logger');

class DocumentClassifier extends EventEmitter {
  constructor() {
    super();

    // 分类类别定义
    this.categories = {
      // 收入类
      INCOME: {
        GRANT_SUBSIDY: 'grant_subsidy',        // 政府补贴收入
        DONATION: 'donation',                  // 捐赠收入
        SERVICE_REVENUE: 'service_revenue',    // 服务收入
        RENTAL_INCOME: 'rental_income',        // 租金收入
        INTEREST_INCOME: 'interest_income'      // 利息收入
      },

      // 支出类
      EXPENSE: {
        PROCUREMENT: 'procurement',            // 采购支出
        OPERATIONAL: 'operational',            // 运营支出
        PERSONNEL: 'personnel',                // 人员支出
        MAINTENANCE: 'maintenance',            // 维修支出
        UTILITIES: 'utilities',                // 公共事业支出
        TRANSPORTATION: 'transportation',      // 交通支出
        COMMUNICATION: 'communication',        // 通讯支出
        TRAINING: 'training',                  // 培训支出
        ENTERTAINMENT: 'entertainment',        // 招待支出
        OFFICE_SUPPLIES: 'office_supplies'     // 办公用品支出
      },

      // 资产类
      ASSET: {
        EQUIPMENT: 'equipment',                // 设备购置
        VEHICLE: 'vehicle',                    // 车辆购置
        BUILDING: 'building',                  // 建筑物
        INTANGIBLE: 'intangible'               // 无形资产
      },

      // 负债类
      LIABILITY: {
        LOAN: 'loan',                         // 借款
        CREDIT_CARD: 'credit_card',            // 信用卡欠款
        PAYABLE: 'payable'                     // 应付款项
      },

      // 其他
      OTHER: {
        UNKNOWN: 'unknown',                    // 未知类别
        INTERNAL_TRANSFER: 'internal_transfer'  // 内部转账
      }
    };

    // 特征提取器
    this.featureExtractors = {
      keywords: new KeywordExtractor(),
      amounts: new AmountAnalyzer(),
      dates: new DateAnalyzer(),
      entities: new EntityExtractor(),
      structure: new StructureAnalyzer()
    };

    // 分类模型
    this.model = null;
    this.modelLoaded = false;

    // 分词器
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;

    // 缓存
    this.classificationCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30分钟

    // 初始化
    this.initialize();
  }

  /**
   * 初始化分类器
   */
  async initialize() {
    try {
      await this.loadModel();
      this.loadTrainingData();
      this.setupEventListeners();
      logger.debug('文档分类器初始化完成');
    } catch (error) {
      logger.error('文档分类器初始化失败:', error);
    }
  }

  /**
   * 加载模型
   */
  async loadModel() {
    try {
      // 尝试加载预训练模型
      const modelPath = './models/document_classifier';
      if (tf.io.existsSync(modelPath)) {
        this.model = await tf.loadLayersModel(`file://${modelPath}`);
        this.modelLoaded = true;
        logger.debug('预训练模型加载成功');
      } else {
        // 创建新模型
        await this.createModel();
      }
    } catch (error) {
      logger.error('模型加载失败，使用基于规则的分类:', error);
      await this.createRuleBasedModel();
    }
  }

  /**
   * 创建新模型
   */
  async createModel() {
    // 创建神经网络模型
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [200], // 特征向量长度
          units: 128,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: this.getCategoryCount(),
          activation: 'softmax'
        })
      ]
    });

    // 编译模型
    this.model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.modelLoaded = true;
    logger.debug('新模型创建成功');
  }

  /**
   * 创建基于规则的模型
   */
  async createRuleBasedModel() {
    this.model = {
      predict: (features) => this.ruleBasedPrediction(features),
      classify: (document) => this.ruleBasedClassify(document)
    };
    this.modelLoaded = true;
  }

  /**
   * 分类文档
   */
  async classify(document) {
    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(document);
      const cached = this.classificationCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
        return cached.result;
      }

      // 预处理文档
      const preprocessed = await this.preprocessDocument(document);

      // 特征提取
      const features = await this.extractFeatures(preprocessed);

      // 分类
      let classification;
      if (this.modelLoaded) {
        classification = await this.model.classify(features);
      } else {
        classification = await this.ruleBasedClassify(features);
      }

      // 后处理
      const result = await this.postprocessClassification(classification, preprocessed);

      // 缓存结果
      this.classificationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      this.emit('classified', { document, classification: result });

      return result;

    } catch (error) {
      logger.error('文档分类失败:', error);
      return {
        category: 'OTHER',
        subcategory: 'UNKNOWN',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * 批量分类
   */
  async batchClassify(documents, options = {}) {
    const { batchSize = 10, progressCallback } = options;
    const results = [];
    const total = documents.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchPromises = batch.map(doc => this.classify(doc));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 进度回调
      if (progressCallback) {
        progressCallback({
          processed: Math.min(i + batchSize, total),
          total,
          percentage: Math.min(((i + batchSize) / total) * 100, 100)
        });
      }
    }

    return {
      results,
      summary: this.generateBatchSummary(results)
    };
  }

  /**
   * 预处理文档
   */
  async preprocessDocument(document) {
    const preprocessed = {
      text: '',
      metadata: {},
      structure: {}
    };

    // 提取文本
    if (document.ocrResult) {
      if (typeof document.ocrResult === 'string') {
        preprocessed.text = document.ocrResult;
      } else if (document.ocrResult.text) {
        preprocessed.text = document.ocrResult.text;
      } else if (document.ocrResult.data) {
        preprocessed.text = document.ocrResult.data.text || '';
      }
    }

    // 标准化文本
    preprocessed.text = this.normalizeText(preprocessed.text);

    // 提取元数据
    preprocessed.metadata = {
      documentType: document.documentType || 'unknown',
      hasAmount: /\d+(\.\d{2})?/.test(preprocessed.text),
      hasDate: /\d{4}[-年]\d{1,2}[-月]\d{1,2}/.test(preprocessed.text),
      wordCount: preprocessed.text.split(/\s+/).length,
      lineCount: preprocessed.text.split('\n').length
    };

    // 分析结构
    preprocessed.structure = this.analyzeStructure(preprocessed.text);

    return preprocessed;
  }

  /**
   * 标准化文本
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // 保留中英文和数字
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 分析文档结构
   */
  analyzeStructure(text) {
    const lines = text.split('\n');
    const structure = {
      hasHeader: false,
      hasFooter: false,
      hasTable: false,
      hasList: false,
      sections: []
    };

    // 检查头部
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      structure.hasHeader = /发票|收据|合同|凭证/.test(firstLine);
    }

    // 检查尾部
    if (lines.length > 1) {
      const lastLine = lines[lines.length - 1].trim();
      structure.hasFooter = /合计|总计|金额|签名/.test(lastLine);
    }

    // 检查表格
    structure.hasTable = lines.some(line => line.includes('|') || /\s{3,}/.test(line));

    // 检查列表
    structure.hasList = lines.some(line => /^\d+[\.、]/.test(line) || /^[•\-*]/.test(line));

    return structure;
  }

  /**
   * 特征提取
   */
  async extractFeatures(preprocessed) {
    const features = {
      keywords: await this.featureExtractors.keywords.extract(preprocessed.text),
      amounts: this.featureExtractors.amounts.extract(preprocessed.text),
      dates: this.featureExtractors.dates.extract(preprocessed.text),
      entities: await this.featureExtractors.entities.extract(preprocessed.text),
      structure: this.featureExtractors.structure.extract(preprocessed.structure)
    };

    return features;
  }

  /**
   * 基于规则的分类
   */
  async ruleBasedClassify(features) {
    const classification = {
      category: 'OTHER',
      subcategory: 'UNKNOWN',
      confidence: 0,
      rules: []
    };

    const text = features.keywords.text;
    const amounts = features.amounts;
    const entities = features.entities;

    // 收入类规则
    if (this.hasIncomeKeywords(text)) {
      classification.category = 'INCOME';
      classification.confidence += 0.3;
      classification.rules.push('income_keywords');

      if (text.includes('补贴') || text.includes('补助')) {
        classification.subcategory = 'GRANT_SUBSIDY';
        classification.confidence += 0.2;
        classification.rules.push('grant_subsidy');
      } else if (text.includes('捐赠') || text.includes('赞助')) {
        classification.subcategory = 'DONATION';
        classification.confidence += 0.2;
        classification.rules.push('donation');
      } else if (text.includes('服务费') || text.includes('收入')) {
        classification.subcategory = 'SERVICE_REVENUE';
        classification.confidence += 0.2;
        classification.rules.push('service_revenue');
      }
    }

    // 支出类规则
    if (this.hasExpenseKeywords(text)) {
      classification.category = 'EXPENSE';
      classification.confidence += 0.3;
      classification.rules.push('expense_keywords');

      if (text.includes('采购') || text.includes('购买') || text.includes('设备')) {
        classification.subcategory = 'PROCUREMENT';
        classification.confidence += 0.2;
        classification.rules.push('procurement');
      } else if (text.includes('工资') || text.includes('人员') || text.includes('社保')) {
        classification.subcategory = 'PERSONNEL';
        classification.confidence += 0.2;
        classification.rules.push('personnel');
      } else if (text.includes('维修') || text.includes('维护')) {
        classification.subcategory = 'MAINTENANCE';
        classification.confidence += 0.2;
        classification.rules.push('maintenance');
      } else if (text.includes('水电') || text.includes('燃气') || text.includes('物业')) {
        classification.subcategory = 'UTILITIES';
        classification.confidence += 0.2;
        classification.rules.push('utilities');
      } else if (text.includes('交通') || text.includes('油费') || text.includes('出租车')) {
        classification.subcategory = 'TRANSPORTATION';
        classification.confidence += 0.2;
        classification.rules.push('transportation');
      } else if (text.includes('办公') || text.includes('文具') || text.includes('耗材')) {
        classification.subcategory = 'OFFICE_SUPPLIES';
        classification.confidence += 0.2;
        classification.rules.push('office_supplies');
      }
    }

    // 资产类规则
    if (this.hasAssetKeywords(text)) {
      classification.category = 'ASSET';
      classification.confidence += 0.3;
      classification.rules.push('asset_keywords');

      if (text.includes('车辆') || text.includes('汽车')) {
        classification.subcategory = 'VEHICLE';
        classification.confidence += 0.2;
        classification.rules.push('vehicle');
      } else if (text.includes('设备') || text.includes('机器')) {
        classification.subcategory = 'EQUIPMENT';
        classification.confidence += 0.2;
        classification.rules.push('equipment');
      } else if (text.includes('建筑') || text.includes('房屋')) {
        classification.subcategory = 'BUILDING';
        classification.confidence += 0.2;
        classification.rules.push('building');
      }
    }

    // 负债类规则
    if (this.hasLiabilityKeywords(text)) {
      classification.category = 'LIABILITY';
      classification.confidence += 0.3;
      classification.rules.push('liability_keywords');

      if (text.includes('借款') || text.includes('贷款')) {
        classification.subcategory = 'LOAN';
        classification.confidence += 0.2;
        classification.rules.push('loan');
      } else if (text.includes('信用卡') || text.includes('还款')) {
        classification.subcategory = 'CREDIT_CARD';
        classification.confidence += 0.2;
        classification.rules.push('credit_card');
      }
    }

    // 基于金额特征的调整
    if (amounts.length > 0) {
      const largeAmount = amounts.some(amount => parseFloat(amount) > 10000);
      if (largeAmount) {
        classification.confidence += 0.1;
        classification.rules.push('large_amount');
      }
    }

    // 确保置信度在合理范围内
    classification.confidence = Math.min(Math.max(classification.confidence, 0.1), 1.0);

    return classification;
  }

  /**
   * 检查收入关键词
   */
  hasIncomeKeywords(text) {
    const incomeKeywords = [
      '收入', '收入', '补贴', '补助', '拨款', '奖金', '奖励',
      '捐赠', '赞助', '投资收益', '利息收入', '租金收入',
      '服务费', '咨询费', '营业收入'
    ];
    return incomeKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 检查支出关键词
   */
  hasExpenseKeywords(text) {
    const expenseKeywords = [
      '支出', '费用', '成本', '花费', '采购', '购买', '订货',
      '工资', '薪酬', '社保', '福利', '培训', '会议',
      '差旅', '交通', '住宿', '餐饮', '招待', '礼品',
      '办公', '文具', '耗材', '维修', '维护', '水电',
      '燃气', '物业', '租金', '保险', '税金', '罚款'
    ];
    return expenseKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 检查资产关键词
   */
  hasAssetKeywords(text) {
    const assetKeywords = [
      '资产', '设备', '机器', '车辆', '汽车', '房产',
      '房屋', '建筑', '土地', '无形资产', '专利', '商标'
    ];
    return assetKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 检查负债关键词
   */
  hasLiabilityKeywords(text) {
    const liabilityKeywords = [
      '借款', '贷款', '欠款', '应付款', '负债', '债务',
      '信用卡', '透支', '还款', '还贷'
    ];
    return liabilityKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 后处理分类结果
   */
  async postprocessClassification(classification, preprocessed) {
    // 添加元数据
    classification.metadata = {
      documentType: preprocessed.documentType,
      processedAt: new Date(),
      featureCount: Object.keys(classification.features || {}).length,
      ruleCount: classification.rules?.length || 0
    };

    // 添加风险评估
    classification.risk = await this.assessRisk(classification, preprocessed);

    // 添加建议
    classification.recommendations = this.generateRecommendations(classification);

    return classification;
  }

  /**
   * 风险评估
   */
  async assessRisk(classification, preprocessed) {
    const risk = {
      level: 'low',
      score: 0,
      factors: []
    };

    const text = preprocessed.text;
    const amount = parseFloat(preprocessed.metadata.hasAmount ?
      text.match(/[\d,]+\.?\d*/)?.[0] : 0) || 0;

    // 大额支出风险
    if (classification.category === 'EXPENSE' && amount > 50000) {
      risk.score += 0.3;
      risk.factors.push('large_expense');
    }

    // 现金交易风险
    if (text.includes('现金') || text.includes('现钞')) {
      risk.score += 0.2;
      risk.factors.push('cash_transaction');
    }

    // 个人消费风险
    if (text.includes('个人') && amount > 2000) {
      risk.score += 0.2;
      risk.factors.push('personal_expense');
    }

    // 不明来源收入风险
    if (classification.category === 'INCOME' && !text.includes('政府') && !text.includes('公司')) {
      risk.score += 0.1;
      risk.factors.push('unidentified_income');
    }

    // 确定风险等级
    if (risk.score >= 0.6) {
      risk.level = 'high';
    } else if (risk.score >= 0.3) {
      risk.level = 'medium';
    }

    return risk;
  }

  /**
   * 生成建议
   */
  generateRecommendations(classification) {
    const recommendations = [];

    // 基于分类的建议
    if (classification.category === 'EXPENSE' && classification.subcategory === 'PROCUREMENT') {
      recommendations.push('建议进行三比一比价，保留比价记录');
    }

    if (classification.category === 'EXPENSE' && classification.amount > 10000) {
      recommendations.push('大额支出需要相应的审批流程');
    }

    if (classification.category === 'ASSET') {
      recommendations.push('资产购置需要登记入账，建立资产卡片');
    }

    // 基于风险的建议
    if (classification.risk && classification.risk.level === 'high') {
      recommendations.push('建议提供更多支撑材料以降低风险');
    }

    return recommendations;
  }

  /**
   * 训练模型
   */
  async trainModel(trainingData, options = {}) {
    const { epochs = 100, batchSize = 32, validationSplit = 0.2 } = options;

    try {
      // 准备训练数据
      const { xs, ys } = this.prepareTrainingData(trainingData);

      // 训练模型
      const history = await this.model.fit(xs, ys, {
        epochs,
        batchSize,
        validationSplit,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            logger.debug(`Epoch ${epoch + 1}: loss = ${logs.loss}, accuracy = ${logs.acc}`);
          }
        }
      });

      logger.debug('模型训练完成');
      return history;

    } catch (error) {
      logger.error('模型训练失败:', error);
      throw error;
    }
  }

  /**
   * 准备训练数据
   */
  prepareTrainingData(trainingData) {
    // 实现训练数据预处理逻辑
    // 这里是简化版本
    const features = [];
    const labels = [];

    trainingData.forEach(item => {
      // 特征向量
      const featureVector = this.extractFeatureVector(item.text);
      features.push(featureVector);

      // 标签向量
      const labelVector = this.createLabelVector(item.category, item.subcategory);
      labels.push(labelVector);
    });

    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels);

    return { xs, ys };
  }

  /**
   * 提取特征向量
   */
  extractFeatureVector(text) {
    // 简化的特征提取
    const vector = new Array(200).fill(0);

    // 关键词特征
    const keywords = this.tokenizer.tokenize(text);
    keywords.forEach((word, index) => {
      if (index < 100) {
        const hash = this.simpleHash(word) % 100;
        vector[hash] = 1;
      }
    });

    // 金额特征
    const amounts = text.match(/[\d,]+\.?\d*/g) || [];
    amounts.forEach(amount => {
      const value = parseFloat(amount.replace(/,/g, ''));
      if (value > 1000) {
        vector[100 + Math.min(Math.floor(Math.log10(value)), 99)] = 1;
      }
    });

    return vector;
  }

  /**
   * 创建标签向量
   */
  createLabelVector(category, subcategory) {
    const categoryCount = Object.keys(this.categories).length;
    const subcategoryCount = Object.values(this.categories)
      .reduce((total, cat) => total + Object.keys(cat).length, 0);

    const vector = new Array(categoryCount + subcategoryCount).fill(0);

    // 设置类别标签
    const categoryIndex = Object.keys(this.categories).indexOf(category);
    if (categoryIndex >= 0) {
      vector[categoryIndex] = 1;
    }

    // 设置子类别标签
    let subcategoryStart = categoryCount;
    Object.values(this.categories).forEach((subcats) => {
      const subcatIndex = Object.values(subcats).indexOf(subcategory);
      if (subcatIndex >= 0) {
        vector[subcategoryStart + subcatIndex] = 1;
      }
      subcategoryStart += Object.keys(subcats).length;
    });

    return vector;
  }

  /**
   * 保存模型
   */
  async saveModel(modelPath) {
    if (this.model && this.modelLoaded) {
      await this.model.save(`file://${modelPath}`);
      logger.debug(`模型已保存到: ${modelPath}`);
    }
  }

  /**
   * 获取类别总数
   */
  getCategoryCount() {
    return Object.values(this.categories)
      .reduce((total, category) => total + Object.keys(category).length, 0);
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(document) {
    const text = document.ocrResult?.text || document.ocrResult || '';
    const hash = this.simpleHash(text.substring(0, 1000));
    return `${hash}_${document.documentType || 'unknown'}`;
  }

  /**
   * 简单哈希函数
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    this.on('trained', (history) => {
      logger.debug('模型训练事件:', history);
    });

    this.on('classified', (result) => {
      logger.debug('文档分类事件:', result);
    });
  }

  /**
   * 加载训练数据
   */
  loadTrainingData() {
    // 实现训练数据加载逻辑
    // 这里是占位符
  }

  /**
   * 生成批量处理摘要
   */
  generateBatchSummary(results) {
    const summary = {
      total: results.length,
      categories: {},
      subcategories: {},
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
      averageConfidence: 0
    };

    let totalConfidence = 0;

    results.forEach(result => {
      // 统计类别
      if (result.category) {
        summary.categories[result.category] = (summary.categories[result.category] || 0) + 1;
      }

      // 统计子类别
      if (result.subcategory) {
        summary.subcategories[result.subcategory] = (summary.subcategories[result.subcategory] || 0) + 1;
      }

      // 统计置信度分布
      const confidence = result.confidence || 0;
      totalConfidence += confidence;

      if (confidence >= 0.8) {
        summary.confidenceDistribution.high++;
      } else if (confidence >= 0.6) {
        summary.confidenceDistribution.medium++;
      } else {
        summary.confidenceDistribution.low++;
      }
    });

    summary.averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    return summary;
  }
}

/**
 * 关键词提取器
 */
class KeywordExtractor {
  constructor() {
    this.stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她', '它']);
  }

  async extract(text) {
    const tokens = text.split(/\s+/);
    const keywords = tokens
      .filter(word => word.length > 1 && !this.stopWords.has(word))
      .slice(0, 100); // 限制关键词数量

    return {
      text,
      keywords,
      keywordCount: keywords.length,
      uniqueWords: new Set(keywords).size
    };
  }
}

/**
 * 金额分析器
 */
class AmountAnalyzer {
  extract(text) {
    const amountRegex = /[¥￥$]?\s*[\d,]+\.?\d*/g;
    const amounts = text.match(amountRegex) || [];

    return {
      amounts: amounts.map(a => a.replace(/[^\d.]/g, '')),
      count: amounts.length,
      hasAmounts: amounts.length > 0,
      totalAmount: amounts.reduce((sum, amount) => sum + parseFloat(amount.replace(/[^\d.]/g, '') || 0), 0)
    };
  }
}

/**
 * 日期分析器
 */
class DateAnalyzer {
  extract(text) {
    const dateRegex = /\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?/g;
    const dates = text.match(dateRegex) || [];

    return {
      dates,
      count: dates.length,
      hasDates: dates.length > 0,
      latestDate: dates.length > 0 ? new Date(dates[dates.length - 1].replace(/[年月]/g, '-').replace('日', '')) : null
    };
  }
}

/**
 * 实体提取器
 */
class EntityExtractor {
  async extract(text) {
    const entities = {
      organizations: this.extractOrganizations(text),
      locations: this.extractLocations(text),
      persons: this.extractPersons(text),
      numbers: this.extractNumbers(text)
    };

    return entities;
  }

  extractOrganizations(text) {
    const orgPatterns = [
      /[\u4e00-\u9fa5]+(?:公司|集团|企业|有限|责任|股份)/g,
      /[\u4e00-\u9fa5]+(?:政府|部门|局|委|办|中心)/g,
      /[\u4e00-\u9fa5]+(?:学校|医院|银行|合作社)/g
    ];

    const organizations = new Set();
    orgPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => organizations.add(match));
    });

    return Array.from(organizations);
  }

  extractLocations(text) {
    const locationPatterns = [
      /[\u4e00-\u9fa5]+(?:省|市|县|区|镇|乡|村|街道|路|号)/g,
      /[\u4e00-\u9fa5]+(?:大厦|广场|中心|园区|基地)/g
    ];

    const locations = new Set();
    locationPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => locations.add(match));
    });

    return Array.from(locations);
  }

  extractPersons(text) {
    // 简化的人员提取
    const personPatterns = [
      /[\u4e00-\u9fa5]{2,4}(?=[：:]\s*(?:负责人|经办人|申请人|联系人))/g,
      /负责人[：:]?\s*([\u4e00-\u9fa5]{2,4})/g,
      /经办人[：:]?\s*([\u4e00-\u9fa5]{2,4})/g
    ];

    const persons = new Set();
    personPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const name = match.includes('：') || match.includes(':') ?
          match.split(/[：:]/)[1] : match;
        if (name && name.length >= 2 && name.length <= 4) {
          persons.add(name);
        }
      });
    });

    return Array.from(persons);
  }

  extractNumbers(text) {
    const numberPatterns = [
      /\d{1,3}(?:,\d{3})*(?:\.\d+)?/g, // 千分位数字
      /\d+(?:\.\d+)?/g              // 普通数字
    ];

    const numbers = new Set();
    numberPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => numbers.add(match));
    });

    return Array.from(numbers);
  }
}

/**
 * 结构分析器
 */
class StructureAnalyzer {
  extract(structure) {
    return {
      hasHeader: structure.hasHeader,
      hasFooter: structure.hasFooter,
      hasTable: structure.hasTable,
      hasList: structure.hasList,
      complexity: this.calculateComplexity(structure),
      layoutType: this.determineLayoutType(structure)
    };
  }

  calculateComplexity(structure) {
    let complexity = 0;
    if (structure.hasHeader) complexity += 1;
    if (structure.hasFooter) complexity += 1;
    if (structure.hasTable) complexity += 2;
    if (structure.hasList) complexity += 1;
    return Math.min(complexity, 5); // 最大复杂度为5
  }

  determineLayoutType(structure) {
    if (structure.hasTable) return 'tabular';
    if (structure.hasList) return 'list';
    if (structure.hasHeader && structure.hasFooter) return 'formal';
    return 'freeform';
  }
}

module.exports = new DocumentClassifier();