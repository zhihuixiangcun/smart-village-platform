/**
 * AI智能问答控制器
 * 处理农业知识问答、政策计算、AI填表等
 */

const { AIChatService } = require('../services/aiChatService');
const { AgriQA, AgriculturePolicy } = require('../models/Agriculture');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 创建上传目录
const uploadDir = path.join(__dirname, '../uploads/ai-chat');
fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|wav|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片、音频和视频文件'));
    }
  }
});

// 创建AI聊天服务实例
const aiChatService = new AIChatService();

/**
 * 智能问答主接口
 */
exports.chat = async (req, res) => {
  try {
    const { message, context = {}, userId, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    // 构建完整上下文
    const fullContext = {
      ...context,
      userId: userId || req.user?.id || 'anonymous',
      sessionId: sessionId || 'default',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date()
    };

    // 处理查询
    const result = await aiChatService.processQuery(message, fullContext);

    // 记录查询日志
    await logUserQuery(req, message, result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('AI问答处理失败:', error);
    res.status(500).json({
      success: false,
      message: 'AI问答处理失败',
      error: error.message
    });
  }
};

/**
 * 语音问答接口
 */
exports.voiceChat = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传音频文件'
      });
    }

    const { context = {}, userId, sessionId } = req.body;
    const audioPath = req.file.path;

    // 这里应该调用语音识别服务
    const recognizedText = await recognizeSpeech(audioPath);

    if (!recognizedText) {
      return res.status(400).json({
        success: false,
        message: '语音识别失败'
      });
    }

    // 构建上下文
    const fullContext = {
      ...context,
      userId: userId || req.user?.id || 'anonymous',
      sessionId: sessionId || 'default',
      audioPath: audioPath,
      audioDuration: req.body.duration || 0,
      timestamp: new Date()
    };

    // 处理查询
    const result = await aiChatService.processQuery(recognizedText, fullContext);

    // 清理临时音频文件
    try {
      await fs.unlink(audioPath);
    } catch (error) {
      console.error('清理音频文件失败:', error);
    }

    res.json({
      success: true,
      data: {
        ...result,
        recognizedText: recognizedText
      }
    });

  } catch (error) {
    console.error('语音问答处理失败:', error);
    res.status(500).json({
      success: false,
      message: '语音问答处理失败',
      error: error.message
    });
  }
};

/**
 * 政策计算器接口
 */
exports.calculatePolicy = async (req, res) => {
  try {
    const { type, params } = req.body;

    if (!type || !params) {
      return res.status(400).json({
        success: false,
        message: '计算类型和参数不能为空'
      });
    }

    let result;

    switch (type) {
      case 'subsidy':
        result = await calculateSubsidy(params);
        break;
      case 'insurance':
        result = await calculateInsurance(params);
        break;
      case 'loan':
        result = await calculateLoan(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的计算类型'
        });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('政策计算失败:', error);
    res.status(500).json({
      success: false,
      message: '政策计算失败',
      error: error.message
    });
  }
};

/**
 * AI填表助手接口
 */
exports.fillForm = async (req, res) => {
  try {
    const { formType, inputData, formDescription } = req.body;

    let result;

    if (formDescription) {
      // 生成表单
      result = await aiChatService.formAssistant.generateForm(formDescription);
    } else if (formType && inputData) {
      // 填写表单
      result = await aiChatService.formAssistant.fillForm(formType, inputData);
    } else {
      return res.status(400).json({
        success: false,
        message: '请提供表单类型和输入数据，或表单描述'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('AI填表失败:', error);
    res.status(500).json({
      success: false,
      message: 'AI填表失败',
      error: error.message
    });
  }
};

/**
 * 获取对话历史
 */
exports.getConversationHistory = async (req, res) => {
  try {
    const { userId, sessionId, limit = 20 } = req.query;

    const history = aiChatService.getConversationHistory(
      userId || req.user?.id || 'anonymous',
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        history: history,
        count: history.length
      }
    });

  } catch (error) {
    console.error('获取对话历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取对话历史失败',
      error: error.message
    });
  }
};

/**
 * 农业知识搜索
 */
exports.searchAgriculture = async (req, res) => {
  try {
    const {
      query,
      category,
      crop,
      region,
      page = 1,
      limit = 10,
      sort = 'relevance'
    } = req.query;

    // 构建搜索条件
    const searchConditions = {
      $and: []
    };

    // 关键词搜索
    if (query) {
      searchConditions.$and.push({
        $or: [
          { question: { $regex: query, $options: 'i' } },
          { answer: { $regex: query, $options: 'i' } },
          { keywords: { $in: query.split(' ') } }
        ]
      });
    }

    // 分类筛选
    if (category) {
      searchConditions.$and.push({ category: category });
    }

    // 作物筛选
    if (crop) {
      searchConditions.$and.push({
        targetCrops: { $in: [crop] }
      });
    }

    // 地区筛选
    if (region) {
      searchConditions.$and.push({
        targetRegions: { $in: [region] }
      });
    }

    // 如果没有任何条件，搜索所有
    if (searchConditions.$and.length === 0) {
      delete searchConditions.$and;
    }

    // 排序条件
    let sortCondition = {};
    switch (sort) {
      case 'usefulness':
        sortCondition = { 'usefulness.rating': -1 };
        break;
      case 'recent':
        sortCondition = { lastUpdated: -1 };
        break;
      case 'confidence':
        sortCondition = { confidence: -1 };
        break;
      default:
        sortCondition = { relevance: { $meta: 'textScore' } };
    }

    // 执行搜索
    const results = await AgriQA.find(searchConditions)
      .sort(sortCondition)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // 获取总数
    const total = await AgriQA.countDocuments(searchConditions);

    res.json({
      success: true,
      data: {
        results: results,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('农业知识搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '农业知识搜索失败',
      error: error.message
    });
  }
};

/**
 * 获取热门问答
 */
exports.getPopularQA = async (req, res) => {
  try {
    const { limit = 10, category } = req.query;

    const conditions = {};
    if (category) {
      conditions.category = category;
    }

    const popularQA = await AgriQA.find(conditions)
      .sort({
        'usefulness.feedbackCount': -1,
        'usefulness.rating': -1
      })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: popularQA
    });

  } catch (error) {
    console.error('获取热门问答失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门问答失败',
      error: error.message
    });
  }
};

/**
 * 问答反馈
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { qaId, rating, comment } = req.body;

    if (!qaId || !rating) {
      return res.status(400).json({
        success: false,
        message: '问答ID和评分不能为空'
      });
    }

    // 更新问答的反馈统计
    const updateData = {
      $inc: { 'usefulness.feedbackCount': 1 }
    };

    if (rating === 'helpful') {
      updateData.$inc['usefulness.helpfulVotes'] = 1;
    }

    await AgriQA.findByIdAndUpdate(qaId, updateData);

    // 如果有评论，保存到反馈表
    if (comment) {
      // 这里可以保存到专门的反馈表
      console.log(`用户反馈: ${qaId}, 评分: ${rating}, 评论: ${comment}`);
    }

    res.json({
      success: true,
      message: '反馈提交成功'
    });

  } catch (error) {
    console.error('提交反馈失败:', error);
    res.status(500).json({
      success: false,
      message: '提交反馈失败',
      error: error.message
    });
  }
};

/**
 * 获取支持的方言列表
 */
exports.getSupportedDialects = async (req, res) => {
  try {
    const dialects = [
      { code: 'mandarin', name: '普通话', regions: ['全国'] },
      { code: 'cantonese', name: '粤语', regions: ['广东', '广西', '香港', '澳门'] },
      { code: 'hokkien', name: '闽南语', regions: ['福建', '台湾', '广东潮汕'] },
      { code: 'hunanese', name: '湖南话', regions: ['湖南'] },
      { code: 'sichuanese', name: '四川话', regions: ['四川', '重庆'] },
      { code: 'shanghainese', name: '上海话', regions: ['上海', '江苏南部'] }
    ];

    res.json({
      success: true,
      data: dialects
    });

  } catch (error) {
    console.error('获取方言列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取方言列表失败',
      error: error.message
    });
  }
};

/**
 * 语音识别（模拟实现）
 */
async function recognizeSpeech(audioPath) {
  try {
    // 这里应该集成真正的语音识别服务
    // 例如百度语音、讯飞语音、腾讯语音等

    // 模拟实现：根据音频文件名生成模拟识别结果
    const audioFileName = path.basename(audioPath);
    const mockResults = {
      'query1': '水稻什么时候播种最好？',
      'query2': '玉米得了纹枯病怎么办？',
      'query3': '今年小麦补贴政策是什么？'
    };

    // 简单的模拟逻辑
    const hash = audioFileName.length % 3;
    return mockResults[`query${hash + 1}`] || '请告诉我农业种植相关问题';

  } catch (error) {
    console.error('语音识别失败:', error);
    return null;
  }
}

/**
 * 计算补贴
 */
async function calculateSubsidy(params) {
  const { crop, area, region, farmerType } = params;

  // 查找适用的补贴政策
  const policies = await AgriculturePolicy.find({
    policyType: 'subsidy',
    'implementationStatus.status': 'active',
    $or: [
      { region: { $in: [region, '全国'] } },
      { region: { $size: 0 } }
    ]
  });

  const subsidies = [];
  let totalAmount = 0;

  policies.forEach(policy => {
    if (policy.benefits && policy.benefits.length > 0) {
      policy.benefits.forEach(benefit => {
        if (benefit.amount && benefit.amount.calculation) {
          let amount = 0;

          // 根据计算规则计算补贴金额
          if (crop && benefit.amount.calculation.includes('作物')) {
            if (area) {
              amount = (benefit.amount.min || 0) * area;
            }
          }

          if (amount > 0) {
            subsidies.push({
              policy: policy.title,
              amount: amount,
              unit: benefit.amount.unit || '元',
              conditions: policy.eligibility
            });
            totalAmount += amount;
          }
        }
      });
    }
  });

  return {
    crop,
    area,
    region,
    subsidies,
    totalAmount,
    explanation: `根据您种植${crop}${area}亩的情况，预计可获得${totalAmount}元补贴`
  };
}

/**
 * 计算保险费用
 */
async function calculateInsurance(params) {
  const { crop, area, coverageLevel, region } = params;

  // 基础费率表（简化实现）
  const baseRates = {
    '水稻': 0.05,
    '小麦': 0.04,
    '玉米': 0.045,
    '大豆': 0.06
  };

  const baseRate = baseRates[crop] || 0.05;
  const coverageMultiplier = coverageLevel === 'full' ? 1.2 : 1.0;

  const premium = area * 500 * baseRate * coverageMultiplier; // 假设亩产值500元

  return {
    crop,
    area,
    coverageLevel,
    premium,
    explanation: `${crop}保险费用：每亩${(premium/area).toFixed(2)}元，总计${premium.toFixed(2)}元`
  };
}

/**
 * 计算贷款额度
 */
async function calculateLoan(params) {
  const { crop, area, creditLevel, loanPurpose } = params;

  // 基础额度标准
  const baseAmountPerAcre = {
    '水稻': 3000,
    '小麦': 2800,
    '玉米': 3200,
    '大豆': 2500
  };

  const creditMultiplier = {
    'excellent': 1.2,
    'good': 1.0,
    'fair': 0.8,
    'poor': 0.6
  };

  const baseAmount = (baseAmountPerAcre[crop] || 3000) * area;
  const multiplier = creditMultiplier[creditLevel] || 1.0;
  const loanAmount = baseAmount * multiplier;

  return {
    crop,
    area,
    creditLevel,
    loanAmount,
    explanation: `根据您的信用评级和${crop}种植面积，可申请贷款额度为${loanAmount.toFixed(2)}元`
  };
}

/**
 * 记录用户查询日志
 */
async function logUserQuery(req, message, result) {
  try {
    const logData = {
      userId: req.user?.id || 'anonymous',
      sessionId: req.body.sessionId || 'default',
      message: message,
      intent: result.intent,
      entities: result.entities,
      success: result.success,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    // 这里可以保存到日志表
    console.log('用户查询日志:', logData);

  } catch (error) {
    console.error('记录查询日志失败:', error);
  }
}

// 导出中间件
exports.upload = upload;