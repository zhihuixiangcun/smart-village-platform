/**
 * 农业知识图谱数据模型
 * 包含作物种植、病虫害防治、农技知识、气候适应等
 */

const mongoose = require('mongoose');

// 作物品种Schema
const CropVarietySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  variety: {
    type: String,
    required: true,
    trim: true
  },
  scientificName: String,
  origin: String,
  characteristics: [{
    trait: String,
    value: String,
    importance: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  }],
  yieldData: {
    averageYield: Number, // 平均亩产(kg)
    maxYield: Number,
    minYield: Number,
    unit: {
      type: String,
      default: 'kg/亩'
    }
  },
  growthPeriod: {
    min: Number, // 最短生长期(天)
    max: Number, // 最长生长期(天)
    optimal: Number
  },
  climateRequirements: {
    temperature: {
      min: Number,
      max: Number,
      optimal: Number,
      unit: '°C'
    },
    rainfall: {
      min: Number,
      max: Number,
      optimal: Number,
      unit: 'mm'
    },
    humidity: {
      min: Number,
      max: Number,
      optimal: Number,
      unit: '%'
    },
    sunlight: {
      min: Number,
      max: Number,
      unit: 'hours/day'
    }
  },
  soilRequirements: [{
    soilType: String, // 土壤类型
    phRange: {
      min: Number,
      max: Number
    },
    organicMatter: {
      min: Number,
      max: Number,
      unit: '%'
    },
    fertility: String
  }],
  plantingSeason: [{
    season: String, // 春季、夏季、秋季、冬季
    startMonth: Number,
    endMonth: Number,
    suitableRegions: [String] // 适合地区
  }],
  nutritionalNeeds: [{
    nutrient: String, // 氮磷钾等
    growthStage: String, // 生长期
    amount: Number,
    unit: String,
    timing: String
  }]
}, { timestamps: true });

// 病虫害信息Schema
const PestDiseaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['pest', 'disease', 'weed'], // 害虫、病害、杂草
    required: true
  },
  scientificName: String,
  family: String, // 科属分类
  affectedCrops: [String], // 影响的作物
  symptoms: [{
    description: String,
    affectedPart: String, // 受影响部位
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'moderate'
    },
    images: [String] // 症状图片
  }],
  lifecycle: {
    stages: [{
      stage: String,
      duration: Number,
      unit: String,
      description: String,
      conditions: {
        temperature: {
          min: Number,
          max: Number
        },
        humidity: {
          min: Number,
          max: Number
        }
      }
    }],
    peakSeason: {
      startMonth: Number,
      endMonth: Number
    }
  },
  preventionMethods: [{
    method: String,
    effectiveness: {
      type: Number,
      min: 0,
      max: 100
    },
    cost: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'hard']
    },
    description: String,
    timing: String,
    materials: [String]
  }],
  treatmentMethods: [{
    name: String,
    type: {
      type: String,
      enum: ['chemical', 'biological', 'physical', 'cultural']
    },
    effectiveness: {
      type: Number,
      min: 0,
      max: 100
    },
    application: {
      method: String,
      dosage: String,
      frequency: String,
      timing: String,
      precautions: [String]
    },
    cost: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    environmentalImpact: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    resistance: {
      potential: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      management: String
    }
  }],
  resistantVarieties: [String], // 抗性品种
  economicImpact: {
    yieldLoss: {
      min: Number,
      max: Number,
      unit: '%'
    },
    economicLoss: {
      min: Number,
      max: Number,
      unit: '元/亩'
    }
  },
  monitoring: {
    earlySigns: [String],
    monitoringFrequency: String,
    keyIndicators: [String]
  }
}, { timestamps: true });

// 农业技术知识Schema
const AgriTechKnowledgeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['planting', 'fertilization', 'irrigation', 'harvesting', 'storage', 'processing'],
    required: true
  },
  subcategory: String,
  content: {
    type: String,
    required: true
  },
  summary: String,
  targetCrops: [String],
  targetRegions: [String],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  timeRequired: {
    preparation: Number, // 准备时间(小时)
    implementation: Number, // 实施时间(小时)
    duration: Number // 持续时间(天)
  },
  resources: [{
    type: {
      type: String,
      enum: ['tool', 'material', 'equipment', 'labor']
    },
    name: String,
    quantity: String,
    cost: Number,
    unit: String,
    alternative: String
  }],
  steps: [{
    step: Number,
    title: String,
    description: String,
    duration: Number,
    images: [String],
    tips: [String],
    warnings: [String]
  }],
  bestPractices: [String],
  commonMistakes: [String],
  successRate: Number,
  economicBenefits: {
    costSavings: Number,
    yieldIncrease: {
      min: Number,
      max: Number,
      unit: '%'
    },
    returnOnInvestment: Number
  },
  environmentalBenefits: [String],
  relatedKnowledge: [mongoose.Schema.Types.ObjectId],
  references: [{
    title: String,
    author: String,
    year: Number,
    source: String,
    url: String
  }],
  media: {
    images: [String],
    videos: [String],
    documents: [String]
  },
  validation: {
    verified: Boolean,
    verifiedBy: String,
    verificationDate: Date,
    expertReviews: [{
      reviewer: String,
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: String,
      date: Date
    }]
  }
}, { timestamps: true });

// 农业问答对Schema
const AgriQASchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['crop', 'pest', 'disease', 'fertilizer', 'irrigation', 'harvest', 'policy', 'market'],
    required: true
  },
  subcategory: String,
  keywords: [String],
  targetCrops: [String],
  targetRegions: [String],
  questionType: {
    type: String,
    enum: ['what', 'how', 'why', 'when', 'where', 'how_much'],
    required: true
  },
  complexity: {
    type: String,
    enum: ['simple', 'moderate', 'complex'],
    default: 'moderate'
  },
  context: {
    season: String,
    growthStage: String,
    weatherConditions: String,
    soilType: String
  },
  answer: {
    mainAnswer: {
      type: String,
      required: true
    },
    detailedExplanation: String,
    steps: [String],
    tips: [String],
    warnings: [String],
    alternatives: [String],
    relatedInfo: [String]
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  },
  usefulness: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    feedbackCount: Number,
    helpfulVotes: Number
  },
  source: {
    type: String,
    enum: ['expert', 'research', 'farmer', 'ai_generated'],
    default: 'expert'
  },
  relatedQuestions: [mongoose.Schema.Types.ObjectId],
  tags: [String],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// 农业政策Schema
const AgriculturePolicySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  policyType: {
    type: String,
    enum: ['subsidy', 'support', 'regulation', 'insurance', 'tax'],
    required: true
  },
  category: {
    type: String,
    enum: ['planting', 'livestock', 'machinery', 'insurance', 'rural_development'],
    required: true
  },
  level: {
    type: String,
    enum: ['national', 'provincial', 'municipal', 'county', 'township'],
    required: true
  },
  region: [String], // 适用地区
  description: {
    type: String,
    required: true
  },
  eligibility: [{
    condition: String,
    requirement: String,
    verification: String
  }],
  benefits: [{
    type: {
      type: String,
      enum: ['financial', 'technical', 'infrastructure', 'market']
    },
    description: String,
    amount: {
      min: Number,
      max: Number,
      unit: String,
      calculation: String
    },
    frequency: String,
    duration: String
  }],
  applicationProcess: [{
    step: Number,
    title: String,
    description: String,
    requiredDocuments: [String],
    timeEstimate: String,
    responsibleDepartment: String
  }],
  deadlines: [{
    name: String,
    startDate: Date,
    endDate: Date,
    description: String
  }],
  contactInfo: {
    department: String,
    phone: String,
    email: String,
    address: String,
    website: String
  },
  implementationStatus: {
    status: {
      type: String,
      enum: ['draft', 'active', 'suspended', 'expired'],
      default: 'active'
    },
    effectiveDate: Date,
    expiryDate: Date,
    lastAmended: Date
  },
  impact: {
    beneficiaries: Number,
    budgetAllocated: Number,
    outcomes: [String],
    statistics: [{
      year: Number,
      metric: String,
      value: Number,
      unit: String
    }]
  },
  relatedPolicies: [mongoose.Schema.Types.ObjectId],
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadDate: Date
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// 农业气候知识Schema
const AgricultureClimateSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true
  },
  climateZone: String,
  latitude: Number,
  longitude: Number,
  altitude: Number,
  annualData: {
    temperature: {
      average: Number,
      min: Number,
      max: Number,
      unit: '°C'
    },
    rainfall: {
      total: Number,
      monthly: [Number],
      unit: 'mm'
    },
    humidity: {
      average: Number,
      unit: '%'
    },
    sunshine: {
      annualHours: Number,
      monthlyHours: [Number],
      unit: 'hours'
    },
    frostDays: Number,
    growingSeason: {
      startMonth: Number,
      endMonth: Number,
      days: Number
    }
  },
  seasonalData: [{
    season: String,
    months: [Number],
    characteristics: [String],
    risks: [String],
    opportunities: [String]
  }],
  extremeEvents: [{
    type: {
      type: String,
      enum: ['drought', 'flood', 'hailstorm', 'freeze', 'heatwave']
    },
    frequency: String,
    severity: String,
    impactOnAgriculture: String,
    mitigationStrategies: [String]
  }],
  cropSuitability: [{
    crop: String,
    suitabilityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    recommendedVarieties: [String],
    plantingRecommendations: [{
      month: Number,
      recommendation: String,
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }]
  }],
  climateChange: {
    trends: [{
      parameter: String,
      trend: String,
      rate: String,
      timePeriod: String
    }],
    impacts: [String],
    adaptationStrategies: [String]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// 创建索引
CropVarietySchema.index({ name: 1, variety: 1 });
CropVarietySchema.index({ 'plantingSeason.season': 1 });
CropVarietySchema.index({ 'climateRequirements.temperature.optimal': 1 });

PestDiseaseSchema.index({ name: 1, type: 1 });
PestDiseaseSchema.index({ affectedCrops: 1 });

AgriTechKnowledgeSchema.index({ category: 1 });
AgriTechKnowledgeSchema.index({ targetCrops: 1 });

AgriculturePolicySchema.index({ policyType: 1, level: 1 });
AgriculturePolicySchema.index({ region: 1 });

AgricultureClimateSchema.index({ region: 1 });

// 导出模型
module.exports = {
  CropVariety: mongoose.model('CropVariety', CropVarietySchema),
  PestDisease: mongoose.model('PestDisease', PestDiseaseSchema),
  AgriTechKnowledge: mongoose.model('AgriTechKnowledge', AgriTechKnowledgeSchema),
  AgriQA: mongoose.model('AgriQA', AgriQA Schema),
  AgriculturePolicy: mongoose.model('AgriculturePolicy', AgriculturePolicySchema),
  AgricultureClimate: mongoose.model('AgricultureClimate', AgricultureClimateSchema)
};