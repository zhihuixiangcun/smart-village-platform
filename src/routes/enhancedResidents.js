/**
 * 增强村民管理路由
 * 集成OCR识别、家庭关系管理、智能分析等功能
 */

const express = require('express');
const router = express.Router();
const {
  createResidentFromIdCard,
  recognizeInvoice,
  getFamilyNetwork,
  queryRelationship,
  updateRelationship,
  getFamilyTree,
  checkBloodRelationship,
  getFamilyStatistics,
  smartBatchImport,
  smartSearchResidents,
  uploadIdCard,
  uploadInvoice
} = require('../controllers/enhancedResidentController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');

// OCR识别限流
const ocrRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 每分钟最多10次OCR请求
  message: {
    success: false,
    error: 'OCR请求过于频繁，请稍后再试'
  }
});

// 智能搜索限流
const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次搜索
  message: {
    success: false,
    error: '搜索请求过于频繁，请稍后再试'
  }
});

// 批量操作限流
const batchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 5, // 每分钟最多5次批量操作
  message: {
    success: false,
    error: '批量操作过于频繁，请稍后再试'
  }
});

// 应用中间件
router.use(authenticateToken);

/**
 * OCR识别相关路由
 */
router.use('/ocr', ocrRateLimit);

// 身份证OCR识别创建村民
router.post('/ocr/idcard',
  checkPermission('resident:create'),
  uploadIdCard,
  createResidentFromIdCard
);

// 发票OCR识别
router.post('/ocr/invoice',
  checkPermission('finance:create'),
  uploadInvoice,
  recognizeInvoice
);

/**
 * 家庭关系管理路由
 */

// 获取家庭关系网络
router.get('/:id/family-network',
  checkPermission('resident:read'),
  getFamilyNetwork
);

// 查询家庭关系
router.get('/:id/relationship',
  checkPermission('resident:read'),
  queryRelationship
);

// 更新家庭关系
router.put('/:id/relationship',
  checkPermission('resident:update'),
  updateRelationship
);

// 生成家庭树
router.get('/:id/family-tree',
  checkPermission('resident:read'),
  getFamilyTree
);

// 检查血缘关系
router.post('/check-blood-relationship',
  checkPermission('resident:read'),
  checkBloodRelationship
);

// 获取家庭统计数据
router.get('/statistics/family',
  checkPermission('resident:stats'),
  getFamilyStatistics
);

/**
 * 智能搜索路由
 */
router.use('/search', searchRateLimit);

// 智能村民搜索
router.get('/search/smart',
  checkPermission('resident:read'),
  smartSearchResidents
);

/**
 * 批量操作路由
 */
router.use('/batch', batchRateLimit);

// 智能批量导入
router.post('/batch/smart-import',
  checkPermission('resident:batch-import'),
  smartBatchImport
);

/**
 * 高级分析路由
 */

// 村民画像分析
router.get('/:id/profile-analysis',
  checkPermission('resident:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const Resident = require('../models/Resident');

      const resident = await Resident.findById(id)
        .populate('villageId', 'name code')
        .lean();

      if (!resident) {
        return res.status(404).json({
          success: false,
          error: '村民不存在'
        });
      }

      // 构建用户画像
      const profile = await buildResidentProfile(resident);

      res.json({
        success: true,
        data: profile,
        message: '村民画像分析完成'
      });

    } catch (error) {
      logger.error('村民画像分析失败:', error);
      res.status(500).json({
        success: false,
        error: '村民画像分析失败'
      });
    }
  }
);

// 家庭健康风险评估
router.get('/:id/family-health-risk',
  checkPermission('resident:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const familyService = require('../services/familyService');

      const network = await familyService.buildFamilyNetwork(id);
      const riskAssessment = await assessFamilyHealthRisk(network);

      res.json({
        success: true,
        data: riskAssessment,
        message: '家庭健康风险评估完成'
      });

    } catch (error) {
      logger.error('家庭健康风险评估失败:', error);
      res.status(500).json({
        success: false,
        error: '家庭健康风险评估失败'
      });
    }
  }
);

// 特殊群体识别
router.get('/special-groups/identify',
  checkPermission('resident:read'),
  async (req, res) => {
    try {
      const { villageId, groupType } = req.query;

      if (!villageId) {
        return res.status(400).json({
          success: false,
          error: '请提供村庄ID'
        });
      }

      const Resident = require('../models/Resident');
      const specialGroups = await identifySpecialGroups(villageId, groupType);

      res.json({
        success: true,
        data: specialGroups,
        message: '特殊群体识别完成'
      });

    } catch (error) {
      logger.error('特殊群体识别失败:', error);
      res.status(500).json({
        success: false,
        error: '特殊群体识别失败'
      });
    }
  }
);

// 数据质量检查
router.get('/data-quality/check',
  checkPermission('resident:admin'),
  async (req, res) => {
    try {
      const { villageId } = req.query;

      const qualityReport = await checkDataQuality(villageId);

      res.json({
        success: true,
        data: qualityReport,
        message: '数据质量检查完成'
      });

    } catch (error) {
      logger.error('数据质量检查失败:', error);
      res.status(500).json({
        success: false,
        error: '数据质量检查失败'
      });
    }
  }
);

// 辅助函数

/**
 * 构建村民画像
 */
async function buildResidentProfile(resident) {
  const profile = {
    basic: {
      name: resident.name,
      age: resident.age,
      gender: resident.gender,
      education: resident.education?.degree,
      occupation: resident.occupation
    },
    economic: {
      annualIncome: resident.annualIncome,
      hasHouse: resident.assets?.house?.hasHouse,
      hasVehicles: (resident.assets?.vehicles?.length || 0) > 0
    },
    health: {
      healthStatus: resident.health?.healthStatus,
      hasInsurance: resident.health?.healthInsurance?.hasInsurance,
      chronicDiseases: resident.health?.chronicDiseases?.length || 0
    },
    digital: {
      hasSmartphone: resident.digital?.hasSmartphone,
      canUseWechat: resident.digital?.digitalSkills?.canUseWechat,
      canOnlinePayment: resident.digital?.digitalSkills?.canOnlinePayment
    },
    social: {
      isCommitteeMember: resident.villageParticipation?.isCommitteeMember,
      partyMember: resident.villageParticipation?.partyMember,
      volunteerActivities: resident.villageParticipation?.volunteerActivities?.length || 0
    },
    riskFactors: [],
    opportunities: []
  };

  // 风险因素识别
  if (resident.age >= 70) {
    profile.riskFactors.push({
      type: 'age',
      level: 'high',
      description: '高龄老人，需要重点关注'
    });
  }

  if (resident.health?.chronicDiseases?.length > 0) {
    profile.riskFactors.push({
      type: 'health',
      level: 'medium',
      description: '有慢性疾病史'
    });
  }

  if (!resident.digital?.hasSmartphone) {
    profile.riskFactors.push({
      type: 'digital',
      level: 'low',
      description: '缺乏数字技能'
    });
  }

  // 机会识别
  if (resident.age >= 18 && resident.age <= 60 && resident.occupation === 'unemployed') {
    profile.opportunities.push({
      type: 'employment',
      description: '劳动年龄且有就业需求'
    });
  }

  if (resident.education?.degree === 'college' && !resident.digital?.canOnlinePayment) {
    profile.opportunities.push({
      type: 'digital',
      description: '教育程度高，可加强数字技能培训'
    });
  }

  return profile;
}

/**
 * 家庭健康风险评估
 */
async function assessFamilyHealthRisk(network) {
  const riskAssessment = {
    overallRisk: 'low',
    riskFactors: [],
    recommendations: []
  };

  let totalRiskScore = 0;
  const memberCount = network.relations.length + 1; // +1 for center person

  // 分析每个成员的健康状况
  for (const member of [network.center, ...network.relations]) {
    if (member.age >= 65) {
      totalRiskScore += 2;
      riskAssessment.riskFactors.push({
        type: 'elderly',
        member: member.name,
        description: '老年人健康风险较高'
      });
    }

    if (member.gender === 'female' && member.age >= 50 && member.age <= 65) {
      totalRiskScore += 1;
      riskAssessment.riskFactors.push({
        type: 'women_health',
        member: member.name,
        description: '更年期妇女需要健康关注'
      });
    }
  }

  // 计算总体风险等级
  const avgRiskScore = totalRiskScore / memberCount;
  if (avgRiskScore >= 1.5) {
    riskAssessment.overallRisk = 'high';
  } else if (avgRiskScore >= 0.8) {
    riskAssessment.overallRisk = 'medium';
  }

  // 生成建议
  if (riskAssessment.overallRisk === 'high') {
    riskAssessment.recommendations.push('建议定期进行家庭健康体检');
    riskAssessment.recommendations.push('建立家庭健康档案');
  }

  if (riskAssessment.overallRisk === 'medium') {
    riskAssessment.recommendations.push('关注老年人健康变化');
  }

  return riskAssessment;
}

/**
 * 识别特殊群体
 */
async function identifySpecialGroups(villageId, groupType) {
  const Resident = require('../models/Resident');
  const query = { villageId, status: 'active' };

  let specialGroups = [];

  switch (groupType) {
    case 'elderly':
      query.birthDate = { $lte: new Date(`${new Date().getFullYear() - 60}-01-01`) };
      break;
    case 'left_behind_children':
      query.birthDate = { $gte: new Date(`${new Date().getFullYear() - 18}-01-01`) };
      query['migrantWork.isMigrantWorker'] = true;
      break;
    case 'disabled':
      query['health.disabilities.0'] = { $exists: true };
      break;
    case 'low_income':
      query['household.householdType'] = { $in: ['low_income', 'minimum_living'] };
      break;
    case 'single_parent':
      // 复杂查询，需要进一步处理
      break;
  }

  if (groupType !== 'single_parent') {
    specialGroups = await Resident.find(query)
      .select('name age gender household health')
      .lean();
  } else {
    // 单亲家庭识别
    const allResidents = await Resident.find({ villageId, status: 'active' })
      .select('name age gender family household')
      .lean();

    const householdGroups = {};
    allResidents.forEach(resident => {
      const householdNumber = resident.household?.householdNumber;
      if (householdNumber) {
        if (!householdGroups[householdNumber]) {
          householdGroups[householdNumber] = [];
        }
        householdGroups[householdNumber].push(resident);
      }
    });

    Object.values(householdGroups).forEach(members => {
      const adults = members.filter(m => m.age >= 18);
      const children = members.filter(m => m.age < 18);

      if (children.length > 0 && adults.length === 1) {
        specialGroups.push({
          singleParent: adults[0],
          children: children,
          householdMembers: members
        });
      }
    });
  }

  return specialGroups;
}

/**
 * 检查数据质量
 */
async function checkDataQuality(villageId) {
  const Resident = require('../models/Resident');
const logger = require('../utils/logger');

  const residents = await Resident.find({ villageId });
  const totalResidents = residents.length;

  const qualityReport = {
    totalRecords: totalResidents,
    issues: [],
    score: 0
  };

  let errorCount = 0;

  residents.forEach(resident => {
    // 检查必填字段
    if (!resident.name) {
      qualityReport.issues.push({
        type: 'missing_name',
        id: resident._id,
        description: '缺少姓名'
      });
      errorCount++;
    }

    if (!resident.idCard) {
      qualityReport.issues.push({
        type: 'missing_idcard',
        id: resident._id,
        description: '缺少身份证号'
      });
      errorCount++;
    }

    if (!resident.phone) {
      qualityReport.issues.push({
        type: 'missing_phone',
        id: resident._id,
        description: '缺少联系电话'
      });
      errorCount++;
    }

    // 检查数据格式
    if (resident.age && (resident.age < 0 || resident.age > 150)) {
      qualityReport.issues.push({
        type: 'invalid_age',
        id: resident._id,
        age: resident.age,
        description: '年龄数据异常'
      });
      errorCount++;
    }
  });

  // 计算质量分数
  qualityReport.score = Math.max(0, 100 - Math.round((errorCount / totalResidents) * 100));

  return qualityReport;
}

module.exports = router;