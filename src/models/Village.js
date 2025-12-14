/**
 * 村庄模型
 */

const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema({
  // 村庄基本信息
  name: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  address: {
    type: String,
    required: true
  },

  // 地理位置
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },

  // 行政区划信息
  province: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  adcode: {
    type: String,
    required: true,
    index: true
  },

  // 村庄统计信息
  population: {
    type: Number,
    required: true,
    min: 0
  },
  households: {
    type: Number,
    required: true,
    min: 0
  },
  area: {
    type: Number,
    required: true,
    min: 0
  },

  // 村庄负责人信息
  villageHead: {
    name: String,
    phone: String,
    idCard: String,
    appointmentDate: Date
  },

  // 村委会信息
  committee: {
    secretary: String,
    members: [{
      name: String,
      position: String,
      phone: String,
      joinDate: Date
    }]
  },

  // 经济信息
  economy: {
    mainIndustry: String,
    annualIncome: Number,
    perCapitaIncome: Number,
    povertyRate: Number,
    enterprises: [{
      name: String,
      type: String,
      employees: Number,
      annualRevenue: Number
    }]
  },

  // 基础设施
  infrastructure: {
    hasRunningWater: {
      type: Boolean,
      default: false
    },
    hasElectricity: {
      type: Boolean,
      default: true
    },
    hasInternet: {
      type: Boolean,
      default: false
    },
    hasRoad: {
      type: Boolean,
      default: true
    },
    hasSchool: {
      type: Boolean,
      default: false
    },
    hasClinic: {
      type: Boolean,
      default: false
    },
    publicFacilities: [{
      name: String,
      type: String,
      capacity: Number,
      yearBuilt: Number
    }]
  },

  // 土地信息
  land: {
    totalArea: Number,
    farmlandArea: Number,
    forestArea: Number,
    constructionArea: Number,
    unusedArea: Number
  },

  // 特色信息
  specialties: [{
    name: String,
    category: String,
    annualOutput: Number,
    marketValue: Number
  }],

  tourism: {
    isTouristSpot: {
      type: Boolean,
      default: false
    },
    attractions: [{
      name: String,
      type: String,
      description: String,
      tickets: Number
    }],
    annualVisitors: Number
  },

  // 状态信息
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // 扶贫信息
  poverty: {
    isPovertyVillage: {
      type: Boolean,
      default: false
    },
    povertyAlleviationDate: Date,
    reliefPolicies: [String],
    reliefFunds: Number
  },

  // 环境信息
  environment: {
    airQuality: String,
    waterQuality: String,
    greenCoverage: Number,
    wasteManagement: String
  },

  // 数字化建设
  digitalization: {
    hasWebsite: {
      type: Boolean,
      default: false
    },
    hasWechatAccount: {
      type: Boolean,
      default: false
    },
    hasApp: {
      type: Boolean,
      default: false
    },
    internetPenetration: Number
  },

  // 应急信息
  emergency: {
    emergencyContacts: [{
      name: String,
      role: String,
      phone: String
    }],
    emergencyEquipment: [{
      name: String,
      quantity: Number,
      location: String
    }],
    evacuationRoutes: [{
      name: String,
      capacity: Number,
      destination: String
    }]
  },

  // 历史文化
  culture: {
    history: String,
    culturalHeritage: [String],
    traditionalCustoms: [String],
    famousPeople: [{
      name: String,
      achievement: String,
      era: String
    }]
  },

  // 扩展数据
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
villageSchema.index({ province: 1, city: 1, district: 1 });
villageSchema.index({ isActive: 1, createdAt: -1 });
villageSchema.index({ 'economy.mainIndustry': 1 });
villageSchema.index({ adcode: 1 });

// 虚拟字段
villageSchema.virtual('householdAverageSize').get(function() {
  return this.population > 0 ? Math.round(this.population / this.households * 100) / 100 : 0;
});

villageSchema.virtual('populationDensity').get(function() {
  return this.area > 0 ? Math.round(this.population / this.area * 100) / 100 : 0;
});

// 实例方法
villageSchema.methods.updatePopulation = function(population) {
  this.population = population;
  this.updatedAt = new Date();
  return this.save();
};

villageSchema.methods.addEnterprise = function(enterprise) {
  this.economy.enterprises.push(enterprise);
  this.updatedAt = new Date();
  return this.save();
};

villageSchema.methods.updateInfrastructure = function(infrastructureUpdate) {
  this.infrastructure = { ...this.infrastructure, ...infrastructureUpdate };
  this.updatedAt = new Date();
  return this.save();
};

// 静态方法
villageSchema.statics.findByProvince = function(province) {
  return this.find({ province, isActive: true }).sort({ name: 1 });
};

villageSchema.statics.findByCity = function(city) {
  return this.find({ city, isActive: true }).sort({ name: 1 });
};

villageSchema.statics.findByIndustry = function(industry) {
  return this.find({ 'economy.mainIndustry': industry, isActive: true }).sort({ 'economy.annualIncome': -1 });
};

villageSchema.statics.findPovertyVillages = function() {
  return this.find({ 'poverty.isPovertyVillage': true, isActive: true }).sort({ createdAt: -1 });
};

villageSchema.statics.getVillageStats = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalVillages: { $sum: 1 },
        totalPopulation: { $sum: '$population' },
        totalHouseholds: { $sum: '$households' },
        totalArea: { $sum: '$area' },
        avgPopulation: { $avg: '$population' },
        avgIncome: { $avg: '$economy.perCapitaIncome' },
        povertyVillages: {
          $sum: { $cond: ['$poverty.isPovertyVillage', 1, 0] }
        }
      }
    }
  ]);
};

villageSchema.statics.getVillagesByRegion = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: {
          province: '$province',
          city: '$city'
        },
        villages: { $sum: 1 },
        population: { $sum: '$population' },
        avgIncome: { $avg: '$economy.perCapitaIncome' }
      }
    },
    {
      $group: {
        _id: '$_id.province',
        cities: {
          $push: {
            name: '$_id.city',
            villages: '$villages',
            population: '$population',
            avgIncome: '$avgIncome'
          }
        },
        totalVillages: { $sum: '$villages' },
        totalPopulation: { $sum: '$population' }
      }
    }
  ]);
};

villageSchema.statics.getNearbyVillages = function(longitude, latitude, maxDistance = 50000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  }).limit(20);
};

villageSchema.statics.searchVillages = function(keyword, options = {}) {
  const {
    province,
    city,
    industry,
    hasInternet,
    limit = 20,
    page = 1
  } = options;

  const query = {
    isActive: true,
    $or: [
      { name: { $regex: keyword, $options: 'i' } },
      { address: { $regex: keyword, $options: 'i' } },
      { 'specialties.name': { $regex: keyword, $options: 'i' } }
    ]
  };

  if (province) query.province = province;
  if (city) query.city = city;
  if (industry) query['economy.mainIndustry'] = industry;
  if (hasInternet !== undefined) query['digitalization.hasInternet'] = hasInternet;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// 导出模型
module.exports = mongoose.model('Village', villageSchema);