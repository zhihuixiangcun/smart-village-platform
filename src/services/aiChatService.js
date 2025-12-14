/**
 * AI智能问答服务
 * 整合农业知识图谱、政策计算器、AI填表助手
 */

const { AgriQA, CropVariety, PestDisease, AgriTechKnowledge, AgriculturePolicy } = require('../models/Agriculture');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class AIChatService {
  constructor() {
    this.nlpModel = null;
    this.knowledgeGraph = new Map();
    this.contextCache = new Map();
    this.policyCalculator = new PolicyCalculator();
    this.formAssistant = new AIFormAssistant();

    // 初始化服务
    this.initializeServices();
  }

  /**
   * 初始化服务
   */
  async initializeServices() {
    try {
      console.log('🤖 初始化AI智能问答服务...');

      // 加载知识图谱
      await this.loadKnowledgeGraph();

      // 初始化NLP模型
      await this.initializeNLPModel();

      // 加载政策数据
      await this.loadPolicyData();

      console.log('✅ AI智能问答服务初始化完成');
    } catch (error) {
      console.error('❌ AI智能问答服务初始化失败:', error);
    }
  }

  /**
   * 加载知识图谱
   */
  async loadKnowledgeGraph() {
    try {
      // 加载农业问答对
      const qaData = await AgriQA.find({}).lean();
      qaData.forEach(qa => {
        this.knowledgeGraph.set(qa._id.toString(), qa);
      });

      // 加载作物品种信息
      const crops = await CropVariety.find({}).lean();
      crops.forEach(crop => {
        this.knowledgeGraph.set(`crop_${crop._id}`, crop);
      });

      // 加载病虫害信息
      const pests = await PestDisease.find({}).lean();
      pests.forEach(pest => {
        this.knowledgeGraph.set(`pest_${pest._id}`, pest);
      });

      // 加载农业技术知识
      const techKnowledge = await AgriTechKnowledge.find({}).lean();
      techKnowledge.forEach(tech => {
        this.knowledgeGraph.set(`tech_${tech._id}`, tech);
      });

      console.log(`📚 知识图谱加载完成: ${this.knowledgeGraph.size} 条记录`);
    } catch (error) {
      console.error('加载知识图谱失败:', error);
      throw error;
    }
  }

  /**
   * 初始化NLP模型
   */
  async initializeNLPModel() {
    try {
      // 这里可以集成现有的NLP库或API
      // 例如百度ERNIE、腾讯NLP、阿里云NLP等

      this.nlpModel = {
        // 意图识别
        intentClassification: async (text) => {
          // 简化实现，实际应该调用真正的NLP模型
          const intents = {
            '种植咨询': ['种', '栽', '播', '植', '培养'],
            '病虫害防治': ['病', '虫', '害', '防治', '农药'],
            '施肥建议': ['肥', '施', '营养', '养分'],
            '灌溉管理': ['水', '灌溉', '浇', '旱'],
            '收获存储': ['收', '获', '储', '存', '收割'],
            '政策咨询': ['政策', '补贴', '补助', '支持'],
            '市场价格': ['价格', '市场', '销售', '买卖'],
            '天气预报': ['天气', '气候', '雨', '温度', '风']
          };

          for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => text.includes(keyword))) {
              return intent;
            }
          }

          return '通用咨询';
        },

        // 实体识别
        entityExtraction: async (text) => {
          const entities = {
            crops: [],
            pests: [],
            regions: [],
            numbers: [],
            dates: []
          };

          // 作物名称识别
          const cropNames = ['水稻', '小麦', '玉米', '大豆', '棉花', '蔬菜', '水果', '茶叶'];
          cropNames.forEach(crop => {
            if (text.includes(crop)) {
              entities.crops.push(crop);
            }
          });

          // 地区识别
          const regions = ['广东', '广西', '湖南', '湖北', '河南', '山东', '江苏', '浙江'];
          regions.forEach(region => {
            if (text.includes(region)) {
              entities.regions.push(region);
            }
          });

          // 数字提取
          const numberPattern = /\d+(\.\d+)?/g;
          const matches = text.match(numberPattern);
          if (matches) {
            entities.numbers = matches.map(Number);
          }

          return entities;
        },

        // 情感分析
        sentimentAnalysis: async (text) => {
          const positiveWords = ['好', '棒', '优', '喜', '爱', '满意'];
          const negativeWords = ['坏', '差', '恶', '忧', '愁', '失望'];

          const positiveCount = positiveWords.filter(word => text.includes(word)).length;
          const negativeCount = negativeWords.filter(word => text.includes(word)).length;

          if (positiveCount > negativeCount) {
            return 'positive';
          } else if (negativeCount > positiveCount) {
            return 'negative';
          } else {
            return 'neutral';
          }
        }
      };

      console.log('🧠 NLP模型初始化完成');
    } catch (error) {
      console.error('NLP模型初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载政策数据
   */
  async loadPolicyData() {
    try {
      const policies = await AgriculturePolicy.find({
        'implementationStatus.status': 'active'
      }).lean();

      this.policyCalculator.loadPolicies(policies);
      console.log(`📋 政策数据加载完成: ${policies.length} 条有效政策`);
    } catch (error) {
      console.error('加载政策数据失败:', error);
      throw error;
    }
  }

  /**
   * 智能问答主接口
   */
  async processQuery(query, context = {}) {
    try {
      console.log(`🤖 处理查询: ${query}`);

      // 生成查询ID
      const queryId = this.generateQueryId();

      // 构建完整上下文
      const fullContext = {
        ...context,
        queryId,
        timestamp: new Date(),
        query: query
      };

      // 意图识别
      const intent = await this.nlpModel.intentClassification(query);
      console.log(`📝 识别意图: ${intent}`);

      // 实体提取
      const entities = await this.nlpModel.entityExtraction(query);
      console.log(`🔍 提取实体:`, entities);

      // 根据意图处理查询
      let response;
      switch (intent) {
        case '种植咨询':
          response = await this.handlePlantingQuery(query, entities, fullContext);
          break;
        case '病虫害防治':
          response = await this.handlePestDiseaseQuery(query, entities, fullContext);
          break;
        case '施肥建议':
          response = await this.handleFertilizerQuery(query, entities, fullContext);
          break;
        case '灌溉管理':
          response = await this.handleIrrigationQuery(query, entities, fullContext);
          break;
        case '收获存储':
          response = await this.handleHarvestQuery(query, entities, fullContext);
          break;
        case '政策咨询':
          response = await this.handlePolicyQuery(query, entities, fullContext);
          break;
        case '市场价格':
          response = await this.handleMarketQuery(query, entities, fullContext);
          break;
        case '天气预报':
          response = await this.handleWeatherQuery(query, entities, fullContext);
          break;
        default:
          response = await this.handleGeneralQuery(query, entities, fullContext);
      }

      // 缓存上下文
      this.contextCache.set(queryId, fullContext);

      return {
        success: true,
        queryId: queryId,
        intent: intent,
        entities: entities,
        response: response,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('处理查询失败:', error);
      return {
        success: false,
        error: error.message,
        fallbackResponse: '抱歉，我现在无法回答这个问题。请稍后再试或联系农业专家。'
      };
    }
  }

  /**
   * 处理种植咨询
   */
  async handlePlantingQuery(query, entities, context) {
    try {
      const response = {
        type: 'planting_advice',
        title: '种植建议',
        content: '',
        recommendations: [],
        resources: []
      };

      if (entities.crops.length > 0) {
        const cropName = entities.crops[0];

        // 查找作物品种信息
        const cropVarieties = await CropVariety.find({
          name: { $regex: cropName, $options: 'i' }
        }).lean();

        if (cropVarieties.length > 0) {
          const crop = cropVarieties[0];

          response.content = `关于${cropName}的种植建议：`;
          response.recommendations = [
            `最佳种植季节：${crop.plantingSeason.map(s => s.season).join('、')}`,
            `生长期：${crop.growthPeriod.min}-${crop.growthPeriod.max}天`,
            `适宜温度：${crop.climateRequirements.temperature.optimal}°C`,
            `需水量：${crop.climateRequirements.rainfall.optimal}mm`
          ];

          // 添加施肥建议
          response.fertilizerAdvice = crop.nutritionalNeeds.map(nutrient =>
            `${nutrient.growthStage}期施用${nutrient.nutrient}${nutrient.amount}${nutrient.unit}`
          );

        } else {
          response.content = `抱歉，我没有找到关于${cropName}的具体种植信息。`;
          response.fallback = '建议您咨询当地农业技术推广站。';
        }
      } else {
        response.content = '请告诉我您想了解哪种作物的种植信息？';
        response.examples = ['水稻种植', '小麦管理', '玉米施肥'];
      }

      return response;
    } catch (error) {
      throw new Error(`处理种植咨询失败: ${error.message}`);
    }
  }

  /**
   * 处理病虫害防治查询
   */
  async handlePestDiseaseQuery(query, entities, context) {
    try {
      const response = {
        type: 'pest_disease_control',
        title: '病虫害防治',
        content: '',
        symptoms: [],
        prevention: [],
        treatment: []
      };

      // 检查是否提到具体病虫害
      const pestKeywords = ['蚜虫', '稻飞虱', '纹枯病', '白叶枯病', '锈病'];
      let detectedPest = null;

      for (const pest of pestKeywords) {
        if (query.includes(pest)) {
          detectedPest = pest;
          break;
        }
      }

      if (detectedPest) {
        const pestData = await PestDisease.find({
          name: { $regex: detectedPest, $options: 'i' }
        }).lean();

        if (pestData.length > 0) {
          const pest = pestData[0];

          response.content = `关于${pest.name}的防治方案：`;
          response.symptoms = pest.symptoms.map(s => s.description);

          response.prevention = pest.preventionMethods.map(p => ({
            method: p.method,
            effectiveness: `${p.effectiveness}%`,
            cost: p.cost
          }));

          response.treatment = pest.treatmentMethods.map(t => ({
            name: t.name,
            type: t.type,
            effectiveness: `${t.effectiveness}%`,
            application: t.application
          }));

        } else {
          response.content = `抱歉，我没有找到关于${detectedPest}的详细信息。`;
        }
      } else {
        response.content = '请描述您遇到的病虫害问题，我会为您提供防治建议。';
        response.guidance = '您可以描述症状、受害作物部位或可能的病虫害名称。';
      }

      return response;
    } catch (error) {
      throw new Error(`处理病虫害防治查询失败: ${error.message}`);
    }
  }

  /**
   * 处理政策咨询
   */
  async handlePolicyQuery(query, entities, context) {
    try {
      const response = {
        type: 'policy_consultation',
        title: '农业政策咨询',
        content: '',
        policies: [],
        calculations: []
      };

      // 检查是否涉及补贴计算
      if (query.includes('补贴') || query.includes('补助')) {
        if (entities.crops.length > 0 || entities.numbers.length > 0) {
          // 调用政策计算器
          const calculation = await this.policyCalculator.calculateSubsidy({
            crop: entities.crops[0] || null,
            area: entities.numbers[0] || null,
            region: entities.regions[0] || context.user?.region || '全国'
          });

          response.calculations.push(calculation);
          response.content = calculation.explanation;
        }
      }

      // 查找相关政策
      const policies = await AgriculturePolicy.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ],
        'implementationStatus.status': 'active'
      }).lean();

      if (policies.length > 0) {
        response.policies = policies.map(policy => ({
          title: policy.title,
          type: policy.policyType,
          level: policy.level,
          description: policy.description,
          benefits: policy.benefits,
          applicationDeadline: policy.deadlines
        }));

        if (!response.content) {
          response.content = `为您找到 ${policies.length} 项相关政策：`;
        }
      } else {
        if (!response.content) {
          response.content = '抱歉，没有找到匹配的政策信息。';
          response.suggestion = '您可以尝试使用"补贴计算器"功能，或咨询当地农业部门。';
        }
      }

      return response;
    } catch (error) {
      throw new Error(`处理政策咨询失败: ${error.message}`);
    }
  }

  /**
   * 处理施肥建议
   */
  async handleFertilizerQuery(query, entities, context) {
    try {
      const response = {
        type: 'fertilizer_advice',
        title: '施肥建议',
        content: '',
        recommendations: []
      };

      if (entities.crops.length > 0) {
        const cropName = entities.crops[0];
        const crops = await CropVariety.find({
          name: { $regex: cropName, $options: 'i' }
        }).lean();

        if (crops.length > 0) {
          const crop = crops[0];

          response.content = `${cropName}施肥建议：`;
          response.recommendations = crop.nutritionalNeeds.map(nutrient => ({
            stage: nutrient.growthStage,
            nutrient: nutrient.nutrient,
            amount: `${nutrient.amount}${nutrient.unit}`,
            timing: nutrient.timing
          }));

          // 添加施肥技巧
          response.tips = [
            '施肥应在作物需肥关键期进行',
            '注意氮磷钾配比平衡',
            '避免一次性大量施肥',
            '根据土壤检测结果调整施肥量'
          ];
        }
      } else {
        response.content = '请告诉我您想了解哪种作物的施肥建议？';
      }

      return response;
    } catch (error) {
      throw new Error(`处理施肥建议失败: ${error.message}`);
    }
  }

  /**
   * 处理灌溉管理
   */
  async handleIrrigationQuery(query, entities, context) {
    try {
      const response = {
        type: 'irrigation_management',
        title: '灌溉管理',
        content: '',
        advice: []
      };

      if (entities.crops.length > 0) {
        const cropName = entities.crops[0];
        const crops = await CropVariety.find({
          name: { $regex: cropName, $options: 'i' }
        }).lean();

        if (crops.length > 0) {
          const crop = crops[0];

          response.content = `${cropName}灌溉管理：`;
          response.advice = [
            `需水量：${crop.climateRequirements.rainfall.optimal}mm`,
            '保持土壤湿润但避免积水',
            '关键生长期增加灌溉频率',
            '根据天气情况调整灌溉量'
          ];

          // 添加灌溉技巧
          response.techniques = [
            '滴灌可节水30-50%',
            '晨间灌溉效果最佳',
            '避免中午高温时段灌溉',
            '雨季注意排水防涝'
          ];
        }
      } else {
        response.content = '请告诉我您想了解哪种作物的灌溉管理？';
        response.generalAdvice = [
          '保持土壤适度湿润',
          '根据作物生长期调整灌溉',
          '注意天气预报，避免雨前灌溉',
          '采用节水灌溉技术'
        ];
      }

      return response;
    } catch (error) {
      throw new Error(`处理灌溉管理失败: ${error.message}`);
    }
  }

  /**
   * 处理收获存储
   */
  async handleHarvestQuery(query, entities, context) {
    try {
      const response = {
        type: 'harvest_storage',
        title: '收获存储',
        content: '',
        advice: []
      };

      if (entities.crops.length > 0) {
        const cropName = entities.crops[0];

        response.content = `${cropName}收获存储建议：`;
        response.advice = [
          '选择适宜的收获时间',
          '注意天气条件，避免雨天收获',
          '及时晾晒，防止霉变',
          '控制存储温度和湿度'
        ];

        // 根据作物类型添加具体建议
        if (['水稻', '小麦'].includes(cropName)) {
          response.advice.push('籽粒含水率降至13%以下方可入库存储');
        } else if (['蔬菜', '水果'].includes(cropName)) {
          response.advice.push('分类存储，注意温度控制');
          response.advice.push('避免挤压损伤');
        }
      } else {
        response.content = '请告诉我您想了解哪种作物的收获存储方法？';
      }

      return response;
    } catch (error) {
      throw new Error(`处理收获存储失败: ${error.message}`);
    }
  }

  /**
   * 处理市场价格查询
   */
  async handleMarketQuery(query, entities, context) {
    try {
      const response = {
        type: 'market_price',
        title: '市场价格',
        content: '',
        prices: []
      };

      if (entities.crops.length > 0) {
        const cropName = entities.crops[0];

        // 这里应该连接实时市场价格API
        // 简化实现，返回模拟数据
        response.content = `${cropName}当前市场行情：`;
        response.prices = [
          {
            market: '本地市场',
            price: '2.5-3.0元/斤',
            trend: '↗ 上涨',
            reason: '供应量减少'
          },
          {
            market: '批发市场',
            price: '2.2-2.8元/斤',
            trend: '→ 稳定',
            reason: '供需平衡'
          },
          {
            market: '期货市场',
            price: '2.4元/斤',
            trend: '↘ 下跌',
            reason: '远期预期供应增加'
          }
        ];

        response.suggestions = [
          '当前价格适中，可适时销售',
          '关注市场动态，把握销售时机',
          '考虑分批销售，降低价格风险'
        ];
      } else {
        response.content = '请告诉我您想了解哪种农产品的价格行情？';
      }

      return response;
    } catch (error) {
      throw new Error(`处理市场价格查询失败: ${error.message}`);
    }
  }

  /**
   * 处理天气查询
   */
  async handleWeatherQuery(query, entities, context) {
    try {
      const response = {
        type: 'weather_forecast',
        title: '天气预报',
        content: '',
        forecast: []
      };

      // 获取用户位置信息
      const region = entities.regions[0] || context.user?.region || '当地';

      // 这里应该连接天气API
      // 简化实现，返回模拟数据
      response.content = `${region}未来几天天气预报：`;
      response.forecast = [
        {
          date: '今天',
          weather: '多云',
          temperature: '18-25°C',
          humidity: '65%',
          wind: '东南风3级',
          advice: '适宜田间作业'
        },
        {
          date: '明天',
          weather: '晴',
          temperature: '20-27°C',
          humidity: '60%',
          wind: '南风2级',
          advice: '适合播种施肥'
        },
        {
          date: '后天',
          weather: '小雨',
          temperature: '17-23°C',
          humidity: '80%',
          wind: '北风3级',
          advice: '不宜田间喷药'
        }
      ];

      response.agriculturalAdvice = [
        '关注天气变化，合理安排农事活动',
        '雨天注意排水，避免田间积水',
        '大风天气避免喷洒农药'
      ];

      return response;
    } catch (error) {
      throw new Error(`处理天气查询失败: ${error.message}`);
    }
  }

  /**
   * 处理通用查询
   */
  async handleGeneralQuery(query, entities, context) {
    try {
      const response = {
        type: 'general',
        title: '农业知识',
        content: '',
        relatedInfo: []
      };

      // 在知识库中搜索相关信息
      const qaMatches = await AgriQA.find({
        $or: [
          { question: { $regex: query, $options: 'i' } },
          { keywords: { $in: query.split(' ') } }
        ]
      }).lean();

      if (qaMatches.length > 0) {
        const bestMatch = qaMatches[0];
        response.content = bestMatch.answer.mainAnswer;

        if (bestMatch.answer.detailedExplanation) {
          response.content += '\n\n' + bestMatch.answer.detailedExplanation;
        }

        response.relatedInfo = qaMatches.slice(1, 3).map(qa => ({
          question: qa.question,
          answer: qa.answer.mainAnswer
        }));
      } else {
        // 尝试在农业技术知识中搜索
        const techMatches = await AgriTechKnowledge.find({
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { content: { $regex: query, $options: 'i' } }
          ]
        }).lean();

        if (techMatches.length > 0) {
          const tech = techMatches[0];
          response.content = tech.summary || tech.content;
          response.type = 'technical_knowledge';
        } else {
          response.content = '抱歉，我没有找到与您问题相关的具体信息。';
          response.suggestions = [
            '请尝试更具体的问题描述',
            '可以咨询当地农业技术推广站',
            '拨打农业服务热线12316'
          ];
        }
      }

      return response;
    } catch (error) {
      throw new Error(`处理通用查询失败: ${error.message}`);
    }
  }

  /**
   * 生成查询ID
   */
  generateQueryId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(userId, limit = 10) {
    return Array.from(this.contextCache.values())
      .filter(context => context.userId === userId)
      .slice(-limit);
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.contextCache.clear();
  }
}

/**
 * 政策计算器
 */
class PolicyCalculator {
  constructor() {
    this.policies = [];
  }

  loadPolicies(policies) {
    this.policies = policies;
  }

  async calculateSubsidy(params) {
    const { crop, area, region } = params;

    const calculation = {
      crop: crop,
      area: area,
      region: region,
      subsidies: [],
      totalAmount: 0,
      explanation: ''
    };

    // 查找适用的补贴政策
    const applicablePolicies = this.policies.filter(policy => {
      return policy.policyType === 'subsidy' &&
             (policy.region.includes(region) || policy.region.includes('全国'));
    });

    applicablePolicies.forEach(policy => {
      if (policy.benefits && policy.benefits.length > 0) {
        policy.benefits.forEach(benefit => {
          if (benefit.amount && benefit.amount.calculation) {
            let amount = 0;

            // 根据计算公式计算补贴金额
            if (benefit.amount.calculation.includes('面积')) {
              amount = (benefit.amount.min || 0) * (area || 0);
            }

            calculation.subsidies.push({
              policyTitle: policy.title,
              benefitType: benefit.type,
              amount: amount,
              unit: benefit.amount.unit,
              calculation: benefit.amount.calculation
            });

            calculation.totalAmount += amount;
          }
        });
      }
    });

    calculation.explanation = this.generateExplanation(calculation);

    return calculation;
  }

  generateExplanation(calculation) {
    let explanation = `根据${calculation.region}的农业补贴政策：\n\n`;

    if (calculation.crop && calculation.area) {
      explanation += `您种植${calculation.crop}${calculation.area}亩，可以享受以下补贴：\n\n`;

      calculation.subsidies.forEach((subsidy, index) => {
        explanation += `${index + 1}. ${subsidy.policyTitle}\n`;
        explanation += `   补贴金额：${subsidy.amount}元\n`;
        explanation += `   计算方式：${subsidy.calculation}\n\n`;
      });

      explanation += `总计补贴金额：${calculation.totalAmount}元`;
    } else {
      explanation += '请提供具体的作物类型和种植面积，我可以为您计算准确的补贴金额。';
    }

    explanation += '\n\n注：实际补贴金额以当地农业部门审核为准。';

    return explanation;
  }
}

/**
 * AI填表助手
 */
class AIFormAssistant {
  constructor() {
    this.templates = new Map();
    this.loadFormTemplates();
  }

  loadFormTemplates() {
    // 加载常用表单模板
    this.templates.set('农业补贴申请', {
      fields: [
        { name: '申请人姓名', type: 'text', required: true },
        { name: '身份证号', type: 'text', required: true },
        { name: '联系电话', type: 'text', required: true },
        { name: '种植作物', type: 'select', options: ['水稻', '小麦', '玉米', '大豆'] },
        { name: '种植面积', type: 'number', unit: '亩', required: true },
        { name: '种植地点', type: 'text', required: true }
      ]
    });

    this.templates.set('农业保险投保', {
      fields: [
        { name: '投保人姓名', type: 'text', required: true },
        { name: '身份证号', type: 'text', required: true },
        { name: '联系方式', type: 'text', required: true },
        { name: '保险标的', type: 'select', options: ['水稻', '小麦', '玉米', '设施农业'] },
        { name: '保险面积', type: 'number', unit: '亩', required: true },
        { name: '保险期限', type: 'date', required: true }
      ]
    });
  }

  async fillForm(formType, inputData) {
    const template = this.templates.get(formType);
    if (!template) {
      throw new Error(`未找到表单模板: ${formType}`);
    }

    const filledForm = {
      formType: formType,
      fields: [],
      completeness: 0
    };

    let filledCount = 0;

    template.fields.forEach(field => {
      const filledField = {
        name: field.name,
        type: field.type,
        value: inputData[field.name] || '',
        required: field.required,
        valid: false
      };

      // 验证字段
      if (filledField.value) {
        filledField.valid = this.validateField(filledField);
        if (filledField.valid) {
          filledCount++;
        }
      }

      filledForm.fields.push(filledField);
    });

    filledForm.completeness = Math.round((filledCount / template.fields.length) * 100);

    return filledForm;
  }

  validateField(field) {
    switch (field.type) {
      case 'text':
        return field.value.length > 0;
      case 'number':
        return !isNaN(parseFloat(field.value));
      case 'select':
        return field.value !== '';
      case 'date':
        return !isNaN(Date.parse(field.value));
      default:
        return field.value.length > 0;
    }
  }

  async generateForm(formDescription) {
    // 根据描述智能生成表单字段
    const formFields = [];

    // 基础字段
    formFields.push(
      { name: '申请人姓名', type: 'text', required: true },
      { name: '联系电话', type: 'text', required: true }
    );

    // 根据描述添加特定字段
    if (formDescription.includes('种植')) {
      formFields.push(
        { name: '种植作物', type: 'text', required: true },
        { name: '种植面积', type: 'number', unit: '亩', required: true }
      );
    }

    if (formDescription.includes('补贴')) {
      formFields.push(
        { name: '身份证号', type: 'text', required: true },
        { name: '银行账号', type: 'text', required: true }
      );
    }

    return {
      formName: formDescription,
      fields: formFields
    };
  }
}

module.exports = {
  AIChatService,
  PolicyCalculator,
  AIFormAssistant
};