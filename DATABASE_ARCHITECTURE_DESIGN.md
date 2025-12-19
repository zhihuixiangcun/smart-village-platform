# 智慧乡村综合服务平台数据库架构设计方案

## 📋 项目概述

本文档为智慧乡村综合服务平台设计完整的数据库架构，包括MongoDB集合设计、索引优化、数据分片、安全策略和运维方案。平台支持村民管理、村务治理、应急响应、财务管理等核心功能。

## 🗄️ 数据库架构总览

### 技术选型
- **主数据库**: MongoDB 6.0+ (支持分布式事务和高级索引)
- **缓存层**: Redis 7.0+ (会话、热点数据缓存)
- **搜索引擎**: Elasticsearch 8.0+ (全文检索、地理位置搜索)
- **时序数据**: InfluxDB 2.0+ (监控指标、日志数据)
- **区块链**: Hyperledger Fabric (财务数据存证)

### 部署架构
```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层                                    │
├─────────────────────────────────────────────────────────────────┤
│   主服务 (3001)    │    村务服务 (5000)    │    监控服务        │
├─────────────────────────────────────────────────────────────────┤
│                        代理层                                    │
│                    Nginx + MongoDB Driver                      │
├─────────────────────────────────────────────────────────────────┤
│                      数据库集群                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Config Srv  │  │  Shard 1     │  │  Shard 2     │         │
│  │              │  │  (Primary)   │  │  (Secondary) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Query Rtr   │  │  Shard 3     │  │  Arbiter     │         │
│  │              │  │  (Primary)   │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 核心数据模型设计

### 1. 用户和权限体系

#### 1.1 用户模型 (users)
```javascript
{
  _id: ObjectId,

  // 基础认证信息
  username: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 认证安全
  auth: {
    passwordHash: String,
    salt: String,
    mfaSecret: String, // 双因子认证
    mfaEnabled: { type: Boolean, default: false },
    lastPasswordChange: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    accountLockedUntil: Date,
    loginHistory: [{
      ip: String,
      device: String,
      location: { type: 'Point', coordinates: [Number] },
      timestamp: Date,
      success: Boolean
    }]
  },

  // 生物特征认证
  biometrics: {
    faceId: String,        // 人脸特征向量
    voiceId: String,       // 声纹特征
    fingerprint: String,   // 指纹模板
    enabled: {
      face: { type: Boolean, default: false },
      voice: { type: Boolean, default: false },
      fingerprint: { type: Boolean, default: false }
    }
  },

  // 角色权限
  roles: [{
    type: String,
    enum: [
      'system_admin',     // 系统管理员
      'village_admin',    // 村管理员
      'committee_member', // 村委会成员
      'finance_officer',  // 财务人员
      'grid_worker',      // 网格员
      'volunteer',        // 志愿者
      'villager',         // 普通村民
      'guest'            // 访客
    ],
    villageId: ObjectId,  // 角色所属村庄
    assignedAt: Date,
    assignedBy: ObjectId,
    expiresAt: Date       // 角色有效期
  }],

  // 个人信息 (加密存储)
  profile: {
    encrypted: {
      name: String,        // 加密存储
      idCard: String,      // 加密存储
      address: String      // 加密存储
    },
    masked: {
      name: String,        // 脱敏显示
      idCard: String,      // 脱敏显示 330103********1234
      phone: String,       // 脱敏显示 138****1234
      email: String        // 脱敏显示
    },
    avatar: String,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    birthDate: Date,
    age: Number,
    education: String,
    occupation: String
  },

  // 村庄关联 (分片键)
  villageId: {
    type: ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 家庭关联
  householdId: {
    type: ObjectId,
    ref: 'Household',
    index: true
  },

  // 地理位置信息
  location: {
    home: {
      type: 'Point',
      coordinates: [Number], // [经度, 纬度]
      address: String,
      accuracy: Number
    },
    current: {
      type: 'Point',
      coordinates: [Number],
      timestamp: Date,
      accuracy: Number
    }
  },

  // 偏好设置
  preferences: {
    language: { type: String, default: 'zh-CN' },
    dialect: { type: String, enum: ['pcc', 'pcc-qn', 'zh-CN'] },
    timezone: { type: String, default: 'Asia/Shanghai' },
    notifications: {
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: true },
      voice: { type: Boolean, default: true }
    },
    accessibility: {
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      highContrast: { type: Boolean, default: false },
      voiceAssist: { type: Boolean, default: false },
      screenReader: { type: Boolean, default: false }
    }
  },

  // 积分系统
  points: {
    total: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    frozen: { type: Number, default: 0 },
    history: [{
      type: { type: String, enum: ['earn', 'spend', 'expire', 'refund'] },
      amount: Number,
      reason: String,
      relatedId: ObjectId,
      timestamp: Date,
      expiresAt: Date
    }],
    rank: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] }
  },

  // 状态管理
  status: {
    account: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending_verification'],
      default: 'pending_verification',
      index: true
    },
    verification: {
      identity: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      biometric: { type: Boolean, default: false }
    },
    lastActive: Date,
    onlineStatus: {
      type: String,
      enum: ['online', 'offline', 'away', 'busy'],
      default: 'offline'
    }
  },

  // 审计字段
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: ObjectId,
  updatedBy: ObjectId,
  version: { type: Number, default: 1 }
}

// 索引策略
const userIndexes = [
  { username: 1 },                    // 唯一索引
  { email: 1 },                       // 唯一索引
  { phone: 1 },                       // 唯一索引
  { villageId: 1, 'status.account': 1 }, // 复合索引
  { roles: 1, villageId: 1 },         // 复合索引
  { householdId: 1 },                 // 家庭索引
  { 'location.home': '2dsphere' },    // 地理位置索引
  { createdAt: -1 },                  // 时间索引
  { 'auth.loginHistory.timestamp': -1 }, // 登录历史索引
  { 'points.total': -1 },             // 积分排序索引
  { 'profile.encrypted.idCard': 1 },  // 身份证索引（加密）
];
```

#### 1.2 村庄模型 (villages)
```javascript
{
  _id: ObjectId,

  // 基本信息
  code: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z0-9]{6}V[0-9]{3}[A-Z]$/,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  alias: [String],                    // 村庄别名

  // 地理位置
  location: {
    center: {
      type: 'Point',
      coordinates: [Number],
      required: true,
      index: '2dsphere'
    },
    boundary: {
      type: 'Polygon',
      coordinates: [[[Number]]],      // GeoJSON格式
      index: '2dsphere'
    },
    area: Number,                     // 面积（平方公里）
    elevation: Number,                // 海拔高度
    timezone: String
  },

  // 行政区划
  administration: {
    province: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    town: { type: String, required: true, index: true },
    code: String,                     // 行政区划代码
    level: { type: String, enum: ['province', 'city', 'district', 'town', 'village'] }
  },

  // 村委管理
  committee: {
    administrator: {
      userId: { type: ObjectId, ref: 'User', required: true },
      appointedAt: Date,
      appointmentDocument: String,    // 任命文件URL
      termStart: Date,
      termEnd: Date,
      status: { type: String, enum: ['active', 'expired', 'suspended'] }
    },
    members: [{
      userId: { type: ObjectId, ref: 'User', required: true },
      position: {                     // 职务
        type: String,
        enum: [
          'party_secretary',          // 党支部书记
          'village_head',             // 村长
          'deputy_head',              // 副村长
          'accountant',               // 会计
          'women_director',           // 妇女主任
          'youth_league',             // 团支书
          'security_director',        // 治保主任
          'ministry_director'         // 民政主任
        ]
      },
      contact: {
        phone: String,
        email: String,
        wechat: String
      },
      duties: [String],               // 职责描述
      appointedAt: Date,
      termStart: Date,
      termEnd: Date,
      status: { type: String, default: 'active' }
    }],
    meetingSchedule: {
      regular: String,                // 定期会议时间
      emergency: String,              // 应急会议安排
      location: String                // 会议地点
    }
  },

  // 村庄概况
  overview: {
    population: {
      total: { type: Number, default: 0 },
      households: { type: Number, default: 0 },
      adults: { type: Number, default: 0 },
      children: { type: Number, default: 0 },
      elderly: { type: Number, default: 0 },
      disabled: { type: Number, default: 0 },
      partyMembers: { type: Number, default: 0 }
    },
    economy: {
      mainIndustries: [String],       // 主要产业
      annualIncome: Number,           // 年收入
      perCapitaIncome: Number,        // 人均收入
      enterprises: { type: Number, default: 0 },
      cooperatives: { type: Number, default: 0 }
    },
    infrastructure: {
      roads: Number,                  // 道路里程
      waterSupply: Boolean,           // 自来水
      electricity: Boolean,           // 电力
      internet: Boolean,              // 网络
      gas: Boolean,                   // 燃气
      sewage: Boolean                 // 污水处理
    },
    geography: {
      terrain: String,                // 地形特征
      climate: String,                // 气候类型
      resources: [String],            // 自然资源
      disasters: [String]             // 常见灾害
    }
  },

  // 应急资源
  emergency: {
    shelter: [{
      name: String,
      location: { type: 'Point', coordinates: [Number] },
      capacity: Number,
      type: { type: String, enum: ['earthquake', 'flood', 'fire', 'comprehensive'] },
      facilities: [String],
      contact: { phone: String, person: String }
    }],
    equipment: [{
      name: String,
      type: String,
      quantity: Number,
      location: { type: 'Point', coordinates: [Number] },
      responsiblePerson: ObjectId,
      lastMaintenance: Date,
      status: { type: String, enum: ['available', 'in_use', 'maintenance', 'damaged'] }
    }],
    contacts: [{
      role: String,
      name: String,
      phone: String,
      wechat: String,
      priority: Number
    }],
    plans: [{
      type: String,
      name: String,
      version: String,
      documentUrl: String,
      approvedAt: Date,
      effectiveDate: Date,
      exercises: [{
        date: Date,
        participants: Number,
        summary: String,
        improvements: [String]
      }]
    }]
  },

  // 村务公开
  transparency: {
    finance: {
      level: { type: String, enum: ['full', 'partial', 'restricted'], default: 'full' },
      delayDays: { type: Number, default: 7 }, // 公开延迟天数
      categories: [String]                     // 需要公开的财务类别
    },
    affairs: {
      announcementChannels: [String],  // 公开渠道
      updateFrequency: String,         // 更新频率
      archiveRetention: Number         // 档案保留年限
    }
  },

  // 数字化程度
  digitalization: {
    internetAccess: {
      coverage: Number,               // 网络覆盖率
      bandwidth: String,              // 带宽
      provider: String                // 运营商
    },
    deviceOwnership: {
      smartphones: Number,
      computers: Number,
      tablets: Number
    },
    digitalLiteracy: {
      trained: Number,
      interested: Number,
      resistant: Number
    }
  },

  // 特色标签
  tags: [{
    type: String,
    enum: [
      'tourism_village',     // 旅游乡村
      'agricultural_base',   // 农业基地
      'eco_village',         // 生态村
      'cultural_heritage',   // 文化遗产
      'poverty_alleviated',  // 脱贫村
      'model_village',       // 示范村
      'digital_village'      // 数字乡村
    ]
  }],

  // 状态和配置
  status: {
    type: String,
    enum: ['active', 'inactive', 'under_development'],
    default: 'active',
    index: true
  },
  settings: {
    language: { type: String, default: 'zh-CN' },
    dialect: String,
    timezone: { type: String, default: 'Asia/Shanghai' },
    features: {
      digital_twin: Boolean,
      smart_agriculture: Boolean,
      e_commerce: Boolean,
      tourism_service: Boolean,
      emergency_response: Boolean
    }
  },

  // 统计数据
  statistics: {
    dailyActiveUsers: Number,
    monthlyActiveUsers: Number,
    totalTransactions: Number,
    averageResponseTime: Number,
    satisfactionScore: Number
  },

  // 审计字段
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: ObjectId,
  updatedBy: ObjectId
}
```

### 2. 家庭和村民管理

#### 2.1 家庭模型 (households) - 一户一码系统
```javascript
{
  _id: ObjectId,

  // 户码标识
  householdCode: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z0-9]{6}H[0-9]{4}[A-Z]$/,
    index: true
  },

  // 分片键
  villageId: {
    type: ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 户主信息
  householder: {
    userId: {
      type: ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    idCard: String,                   // 加密存储
    phone: String,
    relationship: '户主',
    isResident: { type: Boolean, default: true }
  },

  // 家庭成员
  members: [{
    userId: {
      type: ObjectId,
      ref: 'User'
    },
    name: String,
    idCard: String,                   // 加密存储
    relationship: {                   // 关系类型
      type: String,
      enum: [
        'spouse',           // 配偶
        'son',              // 儿子
        'daughter',         // 女儿
        'father',           // 父亲
        'mother',           // 母亲
        'grandparent',      // 祖父母
        'grandchild',       // 孙子女
        'sibling',          // 兄弟姐妹
        'other'             // 其他
      ]
    },
    relationshipDegree: {             // 血缘关系度数
      type: Number,
      enum: [1, 2, 3],               // 1-直系 2-旁系 3-远亲
      default: 1
    },
    phone: String,
    birthDate: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    education: String,
    occupation: String,
    incomeLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high']
    },
    isDependent: { type: Boolean, default: false },
    hasDisability: { type: Boolean, default: false },
    disabilityType: String,
    joinedDate: Date,
    leftDate: Date,
    isResident: { type: Boolean, default: true },
    residencyStatus: {
      type: String,
      enum: ['permanent', 'temporary', 'non_resident'],
      default: 'permanent'
    }
  }],

  // 家庭地址
  address: {
    full: String,                     // 完整地址
    province: String,
    city: String,
    district: String,
    town: String,
    village: String,
    group: String,                    // 村组
    road: String,
    number: String,                   // 门牌号
    postalCode: String,
    coordinates: {
      type: 'Point',
      coordinates: [Number],          // [经度, 纬度]
      accuracy: Number,
      collectedAt: Date
    },
    geohash: String,                  // 地理哈希，便于邻近查询
    locationDescription: String       // 位置描述（如：村东头第三家）
  },

  // 住房信息
  housing: {
    type: {
      type: String,
      enum: ['self_built', 'commercial', 'rental', 'government_provided'],
      default: 'self_built'
    },
    ownership: {
      type: String,
      enum: ['private', 'rented', 'shared', 'government'],
      default: 'private'
    },
    area: {
      total: Number,                  // 总面积
      living: Number,                 // 居住面积
      farmland: Number,               // 农田面积
      courtyard: Number               // 院落面积
    },
    structure: {
      buildingYear: Number,           // 建造年份
      floors: Number,                 // 楼层数
      rooms: Number,                  // 房间数
      bedrooms: Number,               // 卧室数
      bathrooms: Number,              // 卫生间数
      hasKitchen: Boolean,
      hasBathroom: Boolean,
      hasRunningWater: Boolean,
      hasElectricity: Boolean,
      hasInternet: Boolean,
      hasGas: Boolean
    },
    safety: {
      structureStatus: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'dangerous'],
        default: 'good'
      },
      lastInspection: Date,
      inspectionResult: String,
      needsRepair: Boolean,
      repairPriority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'low'
      }
    },
    value: {
      purchasePrice: Number,          // 购买价格
      currentMarketValue: Number,     // 当前市值
      lastAssessmentDate: Date
    }
  },

  // 经济状况
  economics: {
    incomeLevel: {
      type: String,
      enum: ['poverty', 'low', 'medium', 'high', 'wealthy'],
      index: true
    },
    annualIncome: {
      total: Number,
      agriculture: Number,
      business: Number,
      wages: Number,
      subsidies: Number,
      other: Number
    },
    incomeSources: [{
      type: String,
      description: String,
      amount: Number,
      frequency: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'irregular'] }
    }],
    povertyStatus: {
      isPovertyHousehold: { type: Boolean, index: true },
      povertyType: {
        type: String,
        enum: ['none', 'absolute', 'relative', 'urban', 'rural']
      },
      supportLevel: {
        type: String,
        enum: ['none', 'basic', 'enhanced', 'comprehensive']
      },
      povertyDate: Date,
      alleviationDate: Date,
      benefitsReceived: [{
        type: String,
        amount: Number,
        date: Date,
        provider: String
      }]
    },
    assets: [{
      type: String,                   // 资产类型
      description: String,
      value: Number,
      purchaseDate: Date,
      condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor']
      }
    }],
    debts: [{
      type: String,
      amount: Number,
      creditor: String,
      interestRate: Number,
      startDate: Date,
      endDate: Date
    }]
  },

  // 健康档案
  health: {
    insurance: {
      hasInsurance: { type: Boolean, default: false },
      type: {
        type: String,
        enum: ['urban_resident', 'rural_cooperative', 'commercial', 'government']
      },
      policyNumber: String,
      provider: String,
      coverage: [String],
      premium: Number,
      validUntil: Date
    },
    medicalHistory: [{
      memberId: ObjectId,
      condition: String,
      diagnosisDate: Date,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      },
      treatment: String,
      hospital: String,
      doctor: String,
      cost: Number,
      insuranceCoverage: Number,
      followUpRequired: Boolean,
      nextCheckup: Date
    }],
    chronicDiseases: [{
      name: String,
      diagnosisDate: Date,
      severity: String,
      treatment: String,
      medication: [String],
      lastCheckup: Date,
      isControlled: Boolean
    }],
    disabilities: [{
      memberId: ObjectId,
      type: String,
      level: {
        type: String,
        enum: ['level_1', 'level_2', 'level_3', 'level_4']
      },
      certificateNumber: String,
      issuedDate: Date,
      validUntil: Date,
      benefits: [String]
    }],
    vaccinations: [{
      memberId: ObjectId,
      vaccine: String,
      date: Date,
      dose: Number,
      nextDose: Date,
      location: String
    }],
    healthMetrics: {
      lastHealthCheck: Date,
      bmi: Number,
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
        measuredAt: Date
      },
      bloodSugar: Number,
      allergies: [String]
    }
  },

  // 家庭标签
  tags: [{
    type: String,
    enum: [
      'low_income',           // 低收入家庭
      'elderly_care',         // 老人照料
      'disabled_care',        // 残疾人照料
      'single_parent',        // 单亲家庭
      'veteran_family',       // 军属家庭
      'party_member',         // 党员家庭
      'outstanding_family',   // 文明家庭
      'needs_attention',      // 需要关注
      'entrepreneurial',      // 创业家庭
      'agricultural',         // 务农家庭
      'migrant_worker',       // 外出务工
      'student_family',       // 学生家庭
      'elderly_only',         // 独居老人
      'left_behind_children'  // 留守儿童
    ],
    addedDate: Date,
    addedBy: ObjectId,
    expiresAt: Date,
    notes: String
  }],

  // 家庭关系网络
  relationships: [{
    householdId: {
      type: ObjectId,
      ref: 'Household'
    },
    type: {
      type: String,
      enum: ['parent_family', 'child_family', 'sibling_family', 'relative', 'neighbor', 'friend']
    },
    description: String,
    distance: Number,              // 家庭距离（米）
    interactionFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'occasionally', 'rarely']
    },
    mutualAid: {
      type: Boolean,
      description: String
    }
  }],

  // QR码管理
  qrCode: {
    dataUrl: String,                // 二维码图片URL
    version: String,                // 二维码版本
    generatedAt: Date,
    expiresAt: Date,
    scanCount: { type: Number, default: 0 },
    scanHistory: [{
      scannedBy: ObjectId,
      timestamp: Date,
      purpose: String,
      location: { type: 'Point', coordinates: [Number] }
    }],
    isActive: { type: Boolean, default: true }
  },

  // 积分账户
  points: {
    balance: { type: Number, default: 0 },
    earned: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    history: [{
      memberId: ObjectId,
      type: { type: String, enum: ['earn', 'spend', 'bonus', 'penalty'] },
      amount: Number,
      reason: String,
      relatedTo: String,
      timestamp: Date,
      expiresAt: Date
    }]
  },

  // 村务参与记录
  participation: {
    meetings: [{
      type: String,
      date: Date,
      attendedBy: [ObjectId],
      topics: [String],
      feedback: String
    }],
    activities: [{
      name: String,
      date: Date,
      participants: [ObjectId],
      contribution: String,
      hours: Number
    }],
    suggestions: [{
      memberId: ObjectId,
      content: String,
      category: String,
      status: {
        type: String,
        enum: ['pending', 'reviewed', 'accepted', 'rejected', 'implemented']
      },
      submittedAt: Date,
      response: String
    }]
  },

  // 统计信息
  statistics: {
    memberCount: { type: Number, default: 1 },
    workingMembers: { type: Number, default: 0 },
    dependentMembers: { type: Number, default: 0 },
    elderlyCount: { type: Number, default: 0 },
    childCount: { type: Number, default: 0 },
    disabledCount: { type: Number, default: 0 },
    averageAge: Number,
    educationLevel: {
      illiterate: Number,
      primary: Number,
      middle: Number,
      high: Number,
      college: Number,
      above: Number
    }
  },

  // 隐私设置
  privacy: {
    level: {
      type: String,
      enum: ['public', 'village_only', 'family_only', 'private'],
      default: 'village_only'
    },
    shareableInfo: [{
      type: String,
      enum: [
        'basic_info', 'contact_info', 'income_level',
        'health_info', 'education_info', 'participation'
      ]
    }],
    restrictedAccess: [{
      userId: ObjectId,
      reason: String,
      grantedAt: Date,
      expiresAt: Date
    }]
  },

  // 状态和审计
  status: {
    type: String,
    enum: ['active', 'inactive', 'moved_away', 'deleted'],
    default: 'active',
    index: true
  },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: ObjectId,
  updatedBy: ObjectId,
  version: { type: Number, default: 1 },

  // 变更历史
  changeHistory: [{
    type: String,
    description: String,
    changedBy: ObjectId,
    changedAt: Date,
    oldValue: String,
    newValue: String
  }]
}

// 索引策略
const householdIndexes = [
  { householdCode: 1 },             // 唯一索引
  { villageId: 1, status: 1 },      // 复合索引
  { 'householder.phone': 1 },       // 户主电话索引
  { 'economics.povertyStatus.isPovertyHousehold': 1 }, // 贫困户索引
  { tags: 1 },                      // 标签索引
  { 'address.coordinates': '2dsphere' }, // 地理位置索引
  { 'address.geohash': 1 },          // 地理哈希索引
  { createdAt: -1 },                // 时间索引
  { 'housing.safety.structureStatus': 1 }, // 住房安全索引
  { 'health.medicalHistory.condition': 1 }, // 疾病索引
  { qrCode: 1 },                    // QR码索引
];
```

### 3. 村务管理数据

#### 3.1 公告通知模型 (announcements)
```javascript
{
  _id: ObjectId,

  // 基本信息
  title: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  summary: String,                  // 摘要

  // 分类
  category: {
    type: String,
    required: true,
    enum: [
      'policy',                      // 政策宣传
      'meeting',                     // 会议通知
      'activity',                    // 活动通知
      'emergency',                   // 应急通知
      'financial',                   // 财务公开
      'construction',                // 工程建设
      'agriculture',                 // 农业信息
      'welfare',                     // 福利通知
      'education',                   // 教育相关
      'health',                      // 健康防疫
      'security',                    // 安全提醒
      'other'                        // 其他
    ],
    index: true
  },

  // 优先级
  priority: {
    level: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent', 'critical'],
      default: 'normal',
      index: true
    },
    color: String,                   // 优先级颜色标识
    pushNotification: Boolean,       // 是否推送通知
    smsAlert: Boolean,               // 是否短信提醒
    voiceBroadcast: Boolean          // 是否语音广播
  },

  // 发布范围
  target: {
    villages: [{
      villageId: { type: ObjectId, ref: 'Village' },
      villageName: String
    }],
    households: [{
      householdId: { type: ObjectId, ref: 'Household' },
      householdCode: String
    }],
    users: [{
      userId: { type: ObjectId, ref: 'User' },
      name: String
    }],
    groups: [{
      type: {
        type: String,
        enum: [
          'all_residents',           // 全体村民
          'committee_members',       // 村委会成员
          'party_members',           // 党员
          'elderly',                 // 老年人
          'poverty_households',      // 贫困户
          'disabled',                // 残疾人
          'students',                // 学生
          'agricultural_workers',    // 务农人员
          'entrepreneurs'            // 创业者
        ]
      },
      count: Number
    }],
    customFilters: [{
      field: String,                 // 自定义过滤字段
      operator: String,              // 操作符
      value: String                  // 值
    }]
  },

  // 发布者信息
  publisher: {
    userId: { type: ObjectId, ref: 'User', required: true },
    name: String,
    position: String,                // 职务
    department: String,              // 部门
    onBehalfOf: {                    // 代表发布
      organization: String,
      position: String
    }
  },

  // 时间管理
  schedule: {
    publishTime: { type: Date, required: true, index: true },
    effectiveDate: Date,             // 生效时间
    expiryDate: Date,                // 过期时间
    reminderTimes: [Date],           // 提醒时间
    displayDuration: Number          // 展示时长（天）
  },

  // 内容格式
  format: {
    type: { type: String, enum: ['text', 'html', 'markdown', 'image', 'video', 'audio'] },
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'document', 'video', 'audio', 'pdf']
      },
      filename: String,
      originalName: String,
      url: String,
      size: Number,
      mimeType: String,
      uploadedAt: Date
    }],
    images: [{
      url: String,
      description: String,
      width: Number,
      height: Number
    }],
    videos: [{
      url: String,
      thumbnail: String,
      duration: Number,
      description: String
    }],
    audio: [{
      url: String,
      duration: Number,
      transcript: String,
      language: String
    }]
  },

  // 多语言支持
  localization: {
    languages: [{
      code: { type: String, enum: ['zh-CN', 'pcc', 'pcc-qn', 'en'] },
      title: String,
      content: String,
      summary: String,
      audioUrl: String                // 语音版本
    }],
    autoTranslate: Boolean,
    originalLanguage: String
  },

  // 互动功能
  interaction: {
    allowComments: { type: Boolean, default: true },
    allowLikes: { type: Boolean, default: true },
    allowShares: { type: Boolean, default: true },
    requireReadConfirmation: { type: Boolean, default: false },
    feedbackRequired: Boolean,       // 是否需要反馈
    questionnaire: {                 // 问卷调查
      questions: [{
        type: {
          type: String,
          enum: ['single_choice', 'multiple_choice', 'text', 'rating', 'date']
        },
        question: String,
        options: [String],
        required: Boolean,
        order: Number
      }],
      anonymous: Boolean,
      deadline: Date
    }
  },

  // 阅读统计
  statistics: {
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    readRate: { type: Number, default: 0 },
    readByUser: [{
      userId: { type: ObjectId, ref: 'User' },
      readAt: Date,
      device: String,
      location: { type: 'Point', coordinates: [Number] }
    }],
    readByHousehold: [{
      householdId: { type: ObjectId, ref: 'Household' },
      readCount: Number,
      lastReadAt: Date
    }],
    readByRegion: [{
      region: String,
      count: Number,
      percentage: Number
    }],
    demographics: {
      ageGroups: Map,                // 年龄段统计
      genders: Map,                  // 性别统计
      educationLevels: Map           // 教育水平统计
    }
  },

  // 反馈统计
  feedback: {
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    reports: [{
      userId: { type: ObjectId, ref: 'User' },
      reason: String,
      description: String,
      reportedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
        default: 'pending'
      }
    }],
    suggestions: [{
      userId: { type: ObjectId, ref: 'User' },
      content: String,
      submittedAt: Date,
      response: String,
      respondedAt: Date
    }]
  },

  // 评论记录
  comments: [{
    _id: ObjectId,
    userId: { type: ObjectId, ref: 'User' },
    userName: String,
    userAvatar: String,
    content: String,
    parentId: ObjectId,              // 父评论ID（用于回复）
    replies: [ObjectId],             // 回复评论ID列表
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],

  // 审核流程
  approval: {
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'published'],
      default: 'draft',
      index: true
    },
    requestedBy: ObjectId,
    approvedBy: ObjectId,
    approvedAt: Date,
    rejectionReason: String,
    reviewComments: [{
      reviewerId: ObjectId,
      reviewerName: String,
      comment: String,
      timestamp: Date
    }],
    workflow: [{
      step: String,
      status: String,
      assignee: ObjectId,
      completedAt: Date
    }]
  },

  // 推送记录
  pushHistory: [{
    channel: {
      type: String,
      enum: ['app_push', 'sms', 'wechat', 'voice', 'email', 'broadcast']
    },
    sentAt: Date,
    targetCount: Number,
    successCount: Number,
    failureCount: Number,
    cost: Number,
    provider: String
  }],

  // 状态和审计
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'expired', 'archived', 'deleted'],
    default: 'draft',
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'village_only', 'group_only', 'private'],
    default: 'village_only'
  },

  // 审计字段
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: ObjectId,
  updatedBy: ObjectId,
  publishedAt: Date,
  archivedAt: Date,
  version: { type: Number, default: 1 },

  // 相关文档
  relatedDocuments: [{
    type: {
      type: String,
      enum: ['policy', 'regulation', 'plan', 'report', 'contract']
    },
    title: String,
    url: String,
    documentNumber: String,
    issuedBy: String,
    issueDate: Date
  }]
}

// 索引策略
const announcementIndexes = [
  { villageId: 1, status: 1 },
  { category: 1, priority: { level: -1 } },
  { 'schedule.publishTime': -1 },
  { 'schedule.effectiveDate': 1, 'schedule.expiryDate': -1 },
  { publisher: 1 },
  { tags: 1 },
  { 'statistics.totalViews': -1 },
  { 'feedback.likes': -1 },
  { 'approval.status': 1 },
  { createdAt: -1 }
];
```

### 4. 财务管理数据

#### 4.1 财务交易模型 (financial_transactions) - 区块链存证
```javascript
{
  _id: ObjectId,

  // 交易编号
  transactionNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 区块链存证
  blockchain: {
    transactionHash: String,         // 交易哈希
    blockNumber: Number,             // 区块号
    blockHash: String,               // 区块哈希
    timestamp: Date,                 // 上链时间
    confirmations: Number,           // 确认数
    smartContract: {
      address: String,               // 合约地址
      abi: String,                   // 合约ABI
      method: String                 // 调用方法
    },
    merkleProof: {                   // 默克尔证明
      root: String,
      proof: [String],
      position: Number
    }
  },

  // 分片键
  villageId: {
    type: ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },

  // 交易分类
  category: {
    main: {
      type: String,
      enum: ['income', 'expense', 'transfer', 'adjustment'],
      required: true,
      index: true
    },
    sub: {
      type: String,
      required: true,
      index: true
    },
    detail: String,
    code: String                     // 会计科目代码
  },

  // 金额信息（支持多币种）
  amount: {
    value: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'CNY',
      enum: ['CNY', 'USD', 'EUR', 'JPY']
    },
    exchangeRate: Number,            // 汇率
    originalCurrency: String,        // 原币种
    originalValue: Number,           // 原币种金额
    taxAmount: Number,               // 税额
    taxRate: Number,                 // 税率
    netAmount: Number,               // 净额
    feeAmount: Number                // 手续费
  },

  // 关联信息
  relatedTo: {
    householdId: {
      type: ObjectId,
      ref: 'Household',
      index: true
    },
    userId: {
      type: ObjectId,
      ref: 'User',
      index: true
    },
    projectId: {
      type: ObjectId,
      ref: 'Project'
    },
    budgetId: {
      type: ObjectId,
      ref: 'Budget'
    },
    invoiceId: {
      type: ObjectId,
      ref: 'Invoice'
    },
    contractId: {
      type: ObjectId,
      ref: 'Contract'
    },
    eventId: String                  // 关联事件ID
  },

  // 交易详情
  description: {
    type: String,
    required: true
  },

  // 时间信息
  transactionDate: {
    type: Date,
    required: true,
    index: true
  },
  accountingPeriod: {
    year: Number,
    month: Number,
    quarter: Number
  },

  // 交易方信息
  parties: {
    payer: {
      type: {
        type: String,
        enum: ['household', 'individual', 'organization', 'government', 'project'],
        required: true
      },
      id: ObjectId,                  // 对应的ID
      name: String,                  // 名称
      account: String,               // 账户
      bankInfo: {
        bankName: String,
        accountNumber: String,
        accountName: String
      },
      contact: {
        phone: String,
        email: String
      }
    },
    payee: {
      type: {
        type: String,
        enum: ['household', 'individual', 'organization', 'government', 'project'],
        required: true
      },
      id: ObjectId,
      name: String,
      account: String,
      bankInfo: {
        bankName: String,
        accountNumber: String,
        accountName: String
      },
      contact: {
        phone: String,
        email: String
      }
    }
  },

  // 审批流程
  approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processing'],
      default: 'pending',
      index: true
    },
    workflow: [{
      step: Number,
      name: String,
      assignee: {
        userId: ObjectId,
        name: String,
        position: String
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped']
      },
      decision: String,
      comments: String,
      timestamp: Date,
      duration: Number               // 处理时长（分钟）
    }],
    requiredApprovals: Number,       // 需要审批数
    receivedApprovals: Number,       // 已收到审批数
    finalApprover: ObjectId,
    approvalDate: Date,
    rejectionReason: String
  },

  // 支付信息
  payment: {
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'alipay', 'wechat', 'check', 'credit_card', 'other'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending'
    },
    reference: String,               // 支付参考号
    transactionId: String,           // 第三方交易ID
    bankTransactionId: String,       // 银行交易ID
    bankAccount: String,
    paidDate: Date,
    processedBy: ObjectId,
    failureReason: String,
    refundInfo: {
      refundId: String,
      refundAmount: Number,
      refundDate: Date,
      reason: String
    }
  },

  // 附件信息
  attachments: [{
    type: {
      type: String,
      enum: ['invoice', 'receipt', 'contract', 'agreement', 'certificate', 'other']
    },
    title: String,
    fileId: ObjectId,
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    mimeType: String,
    checksum: String,                // 文件校验和
    uploadedAt: Date,
    uploadedBy: ObjectId,
    isPublic: Boolean,
    blockchainHash: String           // 文件上链哈希
  }],

  // 透明度设置
  transparency: {
    isPublic: {
      type: Boolean,
      default: true
    },
    publicLevel: {
      type: String,
      enum: ['public', 'villagers', 'committee', 'finance_only', 'private'],
      default: 'public'
    },
    hideAmount: {
      type: Boolean,
      default: false
    },
    hidePayer: {
      type: Boolean,
      default: false
    },
    hidePayee: {
      type: Boolean,
      default: false
    },
    delayPublicDays: {
      type: Number,
      default: 0
    },
    restrictions: [String]           // 访问限制
  },

  // 预算关联
  budget: {
    budgetId: {
      type: ObjectId,
      ref: 'Budget'
    },
    allocationAmount: Number,        // 预算分配金额
    remainingAmount: Number,         // 剩余预算
    overBudget: Boolean,             // 是否超预算
    budgetCategory: String
  },

  // 标签和分类
  tags: [{
    type: String,
    category: String,
    addedBy: ObjectId,
    addedAt: Date
  }],

  // 统计分析
  analytics: {
    department: String,              // 部门
    project: String,                 // 项目
    fundSource: String,              // 资金来源
    fiscalYear: Number,              // 财政年度
    quarter: Number,                 // 季度
    month: Number,                   // 月份
    region: String,                  // 地区
    economicCode: String             // 经济分类代码
  },

  // 风险控制
  riskControl: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    flags: [{
      type: String,
      description: String,
      detectedAt: Date,
      resolvedAt: Date
    }],
    complianceChecks: [{
      check: String,
      result: {
        type: String,
        enum: ['pass', 'fail', 'warning']
      },
      details: String,
      checkedBy: ObjectId,
      checkedAt: Date
    }],
    auditTrail: [{
      action: String,
      userId: ObjectId,
      timestamp: Date,
      details: String,
      ipAddress: String,
      userAgent: String
    }]
  },

  // 审计字段
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: ObjectId,
  updatedBy: ObjectId,
  version: { type: Number, default: 1 },

  // 变更历史
  changeHistory: [{
    field: String,
    oldValue: String,
    newValue: String,
    changedBy: ObjectId,
    changedAt: Date,
    reason: String
  }],

  // 导出记录
  exportHistory: [{
    exportedBy: ObjectId,
    exportedAt: Date,
    format: String,
    purpose: String,
    fileId: ObjectId
  }]
}
```

## 🔍 索引优化策略

### 1. 复合索引设计
```javascript
// 核心业务查询复合索引
const coreIndexes = [
  // 用户查询优化
  { villageId: 1, 'status.account': 1, roles: 1 },
  { villageId: 1, householdId: 1, status: 1 },
  { 'profile.encrypted.idCard': 1, villageId: 1 },

  // 家庭查询优化
  { householdCode: 1, villageId: 1 },
  { villageId: 1, 'economics.povertyStatus.isPovertyHousehold': 1, status: 1 },
  { 'address.geohash': 1, villageId: 1 },
  { tags: 1, villageId: 1, status: 1 },

  // 财务查询优化
  { villageId: 1, 'category.main': 1, transactionDate: -1 },
  { 'approval.status': 1, createdAt: -1 },
  { 'relatedTo.householdId': 1, transactionDate: -1 },
  { 'blockchain.transactionHash': 1 },

  // 公告查询优化
  { villageId: 1, status: 1, 'schedule.publishTime': -1 },
  { category: 1, 'priority.level': -1, villageId: 1 },
  { publisher: 1, createdAt: -1 },

  // 地理位置查询优化
  { 'location.home': '2dsphere', villageId: 1 },
  { 'address.coordinates': '2dsphere', status: 1 },

  // 时间序列优化
  { createdAt: -1, villageId: 1 },
  { 'schedule.publishTime': -1, status: 1 },
  { transactionDate: -1, villageId: 1 }
];
```

### 2. 地理空间索引
```javascript
// 地理位置索引优化
const geoIndexes = [
  // 村庄边界
  { 'location.boundary': '2dsphere' },
  { 'location.center': '2dsphere' },

  // 家庭位置
  { 'address.coordinates': '2dsphere' },
  { 'location.home': '2dsphere' },
  { 'location.current': '2dsphere' },

  // 应急资源位置
  { 'emergency.shelter.location': '2dsphere' },
  { 'emergency.equipment.location': '2dsphere' },

  // 复合地理位置索引
  { villageId: 1, 'address.coordinates': '2dsphere' },
  { 'status.account': 1, 'location.home': '2dsphere' }
];
```

### 3. 全文搜索索引
```javascript
// 全文搜索索引
const textIndexes = [
  {
    name: 'announcement_search',
    fields: ['title', 'content', 'summary'],
    weights: {
      title: 10,
      summary: 5,
      content: 1
    }
  },
  {
    name: 'user_search',
    fields: ['profile.masked.name', 'household.name'],
    weights: {
      'profile.masked.name': 10,
      'household.name': 5
    }
  }
];
```

## 🚀 数据分片方案

### 1. 分片策略
```javascript
// 分片键设计
const shardingKeys = {
  // 用户数据按村庄分片
  users: {
    shardKey: { villageId: 1 },
    strategy: 'hashed',
    collections: ['users', 'user_sessions', 'user_preferences']
  },

  // 家庭数据按村庄分片
  households: {
    shardKey: { villageId: 1, householdCode: 1 },
    strategy: 'hashed',
    collections: ['households', 'family_members', 'family_relationships']
  },

  // 财务数据按村庄和时间范围分片
  financial: {
    shardKey: { villageId: 1, transactionDate: 1 },
    strategy: 'range',
    collections: ['financial_transactions', 'invoices', 'budgets', 'contracts']
  },

  // 公告数据按村庄和时间分片
  announcements: {
    shardKey: { villageId: 1, 'schedule.publishTime': 1 },
    strategy: 'range',
    collections: ['announcements', 'comments', 'notifications']
  },

  // 地理数据按区域分片
  geographic: {
    shardKey: { 'location.coordinates': '2dsphere' },
    strategy: 'hashed',
    collections: ['emergency_resources', 'infrastructure', 'land_records']
  },

  // 日志数据按时间分片
  logs: {
    shardKey: { timestamp: 1 },
    strategy: 'range',
    collections: ['audit_logs', 'operation_logs', 'system_logs']
  }
};

// 分片初始化脚本
const initSharding = async () => {
  const admin = db.admin();

  // 启用分片
  await admin.command({ enableSharding: 'smart_village' });

  // 配置分片集合
  for (const [service, config] of Object.entries(shardingKeys)) {
    for (const collection of config.collections) {
      try {
        await admin.command({
          shardCollection: `smart_village.${collection}`,
          key: config.shardKey
        });
        console.log(`✓ 成功配置分片集合: ${collection}`);
      } catch (error) {
        console.error(`✗ 配置分片集合失败 ${collection}:`, error.message);
      }
    }
  }
};
```

### 2. 数据分布策略
```javascript
// 数据分布配置
const distributionStrategy = {
  // 村庄数据分布
  villageDistribution: {
    principle: '按行政村分布',
    rule: '同一村庄的所有数据存储在同一分片',
    benefit: '提高查询效率，减少跨分片查询',
    exception: '大型数据集（如财务、日志）采用复合分片键'
  },

  // 时间数据分布
  timeDistribution: {
    principle: '按时间范围分布',
    rule: '按月或季度分片，历史数据归档',
    benefit: '便于数据归档和清理',
    hotDataRetention: '12个月在线',
    warmDataRetention: '24个月温存储',
    coldDataArchive: '永久冷存储'
  },

  // 地理数据分布
  geoDistribution: {
    principle: '按地理区域分布',
    rule: '使用地理哈希或区域编码分片',
    benefit: '优化地理位置查询',
    queryOptimization: '邻近查询自动路由到相关分片'
  }
};
```

## 🛡️ 数据安全策略

### 1. 加密存储策略
```javascript
// 字段级加密配置
const encryptionConfig = {
  // 敏感个人信息加密
  personalInfo: {
    fields: [
      'profile.encrypted.name',
      'profile.encrypted.idCard',
      'profile.encrypted.address',
      'phone',
      'email'
    ],
    algorithm: 'AES-256-GCM',
    keyRotation: 'quarterly',
    accessLevel: 'authorized_only'
  },

  // 财务数据加密
  financialData: {
    fields: [
      'amount.value',
      'bankAccount.accountNumber',
      'payment.bankTransactionId'
    ],
    algorithm: 'AES-256-CBC',
    keyRotation: 'monthly',
    accessLevel: 'finance_only'
  },

  // 生物特征加密
  biometricData: {
    fields: [
      'biometrics.faceId',
      'biometrics.voiceId',
      'biometrics.fingerprint'
    ],
    algorithm: 'RSA-4096',
    keyRotation: 'annually',
    accessLevel: 'biometric_only'
  }
};
```

### 2. 数据脱敏规则
```javascript
// 数据脱敏配置
const maskingRules = {
  // 身份证脱敏
  idCard: {
    pattern: /^(\d{6})\d{8}(\d{4})$/,
    replacement: '$1********$2',
    example: '330103********1234'
  },

  // 手机号脱敏
  phone: {
    pattern: /^(\d{3})\d{4}(\d{4})$/,
    replacement: '$1****$2',
    example: '138****1234'
  },

  // 银行卡脱敏
  bankCard: {
    pattern: /^(\d{4})\d+(\d{4})$/,
    replacement: '$1 **** **** $2',
    example: '6222 **** **** 1234'
  },

  // 姓名脱敏
  name: {
    rule: '保留姓，名用*替代',
    example: '张**',
    exception: '少数民族姓名特殊处理'
  }
};
```

### 3. 访问控制策略
```javascript
// 基于角色的访问控制 (RBAC)
const accessControl = {
  // 系统管理员
  system_admin: {
    permissions: ['*'],              // 所有权限
    dataAccess: 'all',
    restrictions: []
  },

  // 村管理员
  village_admin: {
    permissions: [
      'user:read', 'user:update',
      'household:read', 'household:create', 'household:update',
      'announcement:*',
      'financial:read', 'financial:create'
    ],
    dataAccess: 'village_only',
    restrictions: ['sensitive_biometric', 'other_village_data']
  },

  // 财务人员
  finance_officer: {
    permissions: [
      'financial:*',
      'budget:*',
      'report:read'
    ],
    dataAccess: 'village_only',
    restrictions: ['personal_info', 'biometric']
  },

  // 普通村民
  villager: {
    permissions: [
      'profile:read', 'profile:update:self',
      'household:read:own',
      'announcement:read',
      'financial:read:public'
    ],
    dataAccess: 'family_only',
    restrictions: ['other_family_data', 'sensitive_data']
  }
};
```

## 📊 监控和告警机制

### 1. 性能监控
```javascript
// 数据库性能监控指标
const performanceMetrics = {
  // 查询性能
  queryPerformance: {
    slowQueryThreshold: 1000,        // 慢查询阈值（毫秒）
    maxQueryTime: 5000,              // 最大查询时间
    avgQueryTime: 100,               // 平均查询时间目标
    indexUsageRatio: 0.95            // 索引使用率目标
  },

  // 连接管理
  connectionMetrics: {
    maxConnections: 1000,
    activeConnections: 100,
    connectionPoolUtilization: 0.8,
    connectionTimeout: 5000
  },

  // 存储使用
  storageMetrics: {
    diskUsageThreshold: 0.8,         // 磁盘使用率阈值
    indexToDataRatio: 0.3,           // 索引/数据比例
    growthRatePerMonth: 0.1,         // 月增长率
    archiveThreshold: 0.9            // 归档阈值
  },

  // 复制延迟
  replicationMetrics: {
    maxReplicationLag: 10,           // 最大复制延迟（秒）
    oplogWindowHours: 24,            // Oplog时间窗口
    secondaryHealthStatus: 'ok'
  }
};
```

### 2. 自动告警配置
```javascript
// 告警规则配置
const alertRules = {
  // 性能告警
  performance: {
    slowQuery: {
      enabled: true,
      threshold: 1000,
      action: ['log', 'notify_admin'],
      severity: 'warning'
    },
    connectionExhaustion: {
      enabled: true,
      threshold: 0.9,
      action: ['scale', 'notify_admin'],
      severity: 'critical'
    },
    diskSpace: {
      enabled: true,
      threshold: 0.85,
      action: ['cleanup', 'notify_admin'],
      severity: 'high'
    }
  },

  // 安全告警
  security: {
    bruteForceAttack: {
      enabled: true,
      threshold: 5,                  // 5次失败尝试
      window: 300,                   // 5分钟窗口
      action: ['lock_account', 'notify_admin'],
      severity: 'critical'
    },
    unauthorizedAccess: {
      enabled: true,
      action: ['block_ip', 'notify_admin'],
      severity: 'critical'
    },
    dataExfiltration: {
      enabled: true,
      threshold: 1000,               // 大量数据导出
      action: ['alert', 'require_approval'],
      severity: 'high'
    }
  }
};
```

## 📝 初始化和迁移脚本

### 1. 数据库初始化脚本
```javascript
// init-database.js
const { MongoClient } = require('mongodb');

async function initDatabase() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db('smart_village');

  // 创建集合
  const collections = [
    'users', 'households', 'villages',
    'announcements', 'financial_transactions',
    'emergency_resources', 'audit_logs'
  ];

  for (const collectionName of collections) {
    if (!await db.listCollections({ name: collectionName }).hasNext()) {
      await db.createCollection(collectionName);
      console.log(`✓ 创建集合: ${collectionName}`);
    }
  }

  // 创建索引
  await createIndexes(db);

  // 插入初始数据
  await insertInitialData(db);

  console.log('数据库初始化完成');
  await client.close();
}

// 执行初始化
initDatabase().catch(console.error);
```

### 2. 数据迁移脚本
```javascript
// migrate-database.js
const migration = {
  version: '1.0.0',
  description: '添加区块链存证支持',
  up: async (db) => {
    // 添加区块链字段
    await db.collection('financial_transactions').updateMany(
      { blockchain: { $exists: false } },
      {
        $set: {
          blockchain: {
            transactionHash: null,
            blockNumber: null,
            blockHash: null,
            timestamp: null,
            confirmations: 0
          }
        }
      }
    );

    // 创建区块链哈希索引
    await db.collection('financial_transactions').createIndex(
      { 'blockchain.transactionHash': 1 },
      { sparse: true }
    );
  },

  down: async (db) => {
    // 移除区块链字段
    await db.collection('financial_transactions').updateMany(
      {},
      { $unset: { blockchain: 1 } }
    );
  }
};
```

## 📈 实施建议

### 1. 分阶段实施
1. **第一阶段**（1-2周）：基础数据模型和索引优化
2. **第二阶段**（2-3周）：数据分片和读写分离
3. **第三阶段**（1-2周）：安全加固和区块链集成
4. **第四阶段**（1周）：监控和告警系统

### 2. 性能优化建议
- 使用连接池管理数据库连接
- 实施查询缓存策略
- 定期进行索引优化
- 监控慢查询并及时优化

### 3. 安全加固建议
- 实施端到端加密
- 定期进行安全审计
- 建立数据备份策略
- 制定应急响应预案

### 4. 运维管理建议
- 建立自动化运维流程
- 定期进行性能基准测试
- 实施数据生命周期管理
- 建立完善的文档体系

---

## 📚 相关文档

- [数据库优化方案](./DATABASE_OPTIMIZATION_PLAN.md)
- [API设计规范](./API_DESIGN_STANDARDS.md)
- [安全设计文档](./SECURITY_DESIGN.md)
- [系统架构文档](./TECHNICAL_ARCHITECTURE.md)

本文档将根据项目发展持续更新，确保数据库架构始终满足业务需求和技术发展。