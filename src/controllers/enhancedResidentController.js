/**
 * 增强村民管理控制器
 * 集成OCR识别、家庭关系管理、智能分析等功能
 */

const Resident = require('../models/Resident');
const Household = require('../models/Household');
const Village = require('../models/Village');
const ocrService = require('../services/ocrService');
const familyService = require('../services/familyService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const QRCode = require('qrcode');
const { validateResident, validateUpdate } = require('../validators/residentValidator');
const { encryptSensitiveData, decryptSensitiveData } = require('../utils/encryption');
const logger = require('../utils/logger');

// 配置文件上传
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      let uploadDir;

      if (file.fieldname === 'idCard') {
        uploadDir = path.join(process.cwd(), 'uploads/idcards');
      } else if (file.fieldname === 'invoice') {
        uploadDir = path.join(process.cwd(), 'uploads/invoices');
      } else {
        uploadDir = path.join(process.cwd(), 'uploads/residents');
      }

      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueName}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

/**
 * OCR身份证识别并创建村民档案
 */
async function createResidentFromIdCard(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传身份证照片'
      });
    }

    const { villageId, side = 'front' } = req.body;

    // 验证村庄是否存在
    const village = await Village.findById(villageId);
    if (!village) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        error: '指定的村庄不存在'
      });
    }

    // OCR识别
    const ocrResult = await ocrService.recognizeIdCard(req.file.path, side);

    if (!ocrResult.success) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '身份证识别失败',
        details: ocrResult.error
      });
    }

    const { data } = ocrResult;

    // 验证身份证号
    if (data.idCard && !ocrService.validateIdCard(data.idCard)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '身份证号码格式错误'
      });
    }

    // 检查是否已存在
    if (data.idCard) {
      const existingResident = await Resident.findOne({
        idCard: encryptSensitiveData(data.idCard)
      });

      if (existingResident) {
        await fs.unlink(req.file.path);
        return res.status(409).json({
          success: false,
          error: '该身份证号已注册'
        });
      }
    }

    // 构建村民数据
    const residentData = {
      villageId,
      name: data.name || '',
      gender: data.gender === '男' ? 'male' : data.gender === '女' ? 'female' : undefined,
      birthDate: data.birthDate,
      idCard: data.idCard,
      address: {
        village: village.name,
        detailAddress: data.address || ''
      }
    };

    // 创建村民记录
    const resident = new Resident(residentData);

    // 加密敏感数据
    if (residentData.idCard) {
      resident.idCard = encryptSensitiveData(residentData.idCard);
    }

    await resident.save();

    // 生成一户一码
    const qrCode = await generateResidentQRCode(resident._id, villageId);

    // 构建家庭关系网络
    try {
      await familyService.buildFamilyNetwork(resident._id);
    } catch (error) {
      logger.warn('构建家庭关系网络失败:', error);
    }

    // 返回结果
    const response = {
      ...resident.toJSON(),
      idCard: data.idCard ? data.idCard.replace(/(\d{6})\d*(\d{4})/, '$1********$2') : undefined
    };

    // 清理临时文件
    await fs.unlink(req.file.path);

    logger.info(`通过OCR创建村民档案成功: ${resident._id}`);

    res.status(201).json({
      success: true,
      data: response,
      qrCode,
      ocrData: data,
      message: '通过OCR创建村民档案成功'
    });

  } catch (error) {
    logger.error('通过OCR创建村民档案失败:', error);

    // 清理临时文件
    if (req.file) {
      await fs.unlink(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: '创建村民档案失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 发票OCR识别
 */
async function recognizeInvoice(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传发票照片'
      });
    }

    // OCR识别
    const ocrResult = await ocrService.recognizeInvoice(req.file.path);

    if (!ocrResult.success) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: '发票识别失败',
        details: ocrResult.error
      });
    }

    // 清理临时文件
    await fs.unlink(req.file.path);

    logger.info(`发票识别成功: ${req.file.path}`);

    res.json({
      success: true,
      data: ocrResult.data,
      provider: ocrResult.provider,
      message: '发票识别成功'
    });

  } catch (error) {
    logger.error('发票识别失败:', error);

    if (req.file) {
      await fs.unlink(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: '发票识别失败'
    });
  }
}

/**
 * 获取家庭关系网络
 */
async function getFamilyNetwork(req, res) {
  try {
    const { id } = req.params;

    const network = await familyService.buildFamilyNetwork(id);

    res.json({
      success: true,
      data: network,
      message: '获取家庭关系网络成功'
    });

  } catch (error) {
    logger.error('获取家庭关系网络失败:', error);
    res.status(500).json({
      success: false,
      error: '获取家庭关系网络失败'
    });
  }
}

/**
 * 查询家庭关系
 */
async function queryRelationship(req, res) {
  try {
    const { id } = req.params;
    const { targetId } = req.query;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        error: '请提供目标村民ID'
      });
    }

    const relationship = await familyService.findRelationship(id, targetId);

    res.json({
      success: true,
      data: relationship,
      message: relationship.found ? '找到家庭关系' : '未找到家庭关系'
    });

  } catch (error) {
    logger.error('查询家庭关系失败:', error);
    res.status(500).json({
      success: false,
      error: '查询家庭关系失败'
    });
  }
}

/**
 * 更新家庭关系
 */
async function updateRelationship(req, res) {
  try {
    const { id } = req.params;
    const relation = req.body;

    const result = await familyService.updateRelationship(id, relation);

    res.json({
      success: true,
      data: result,
      message: '家庭关系更新成功'
    });

  } catch (error) {
    logger.error('更新家庭关系失败:', error);
    res.status(500).json({
      success: false,
      error: '更新家庭关系失败'
    });
  }
}

/**
 * 生成家庭树
 */
async function getFamilyTree(req, res) {
  try {
    const { id } = req.params;
    const { depth = 3 } = req.query;

    const tree = await familyService.generateFamilyTree(id, parseInt(depth));

    res.json({
      success: true,
      data: tree,
      message: '获取家庭树成功'
    });

  } catch (error) {
    logger.error('生成家庭树失败:', error);
    res.status(500).json({
      success: false,
      error: '生成家庭树失败'
    });
  }
}

/**
 * 检查血缘关系
 */
async function checkBloodRelationship(req, res) {
  try {
    const { idCard1, idCard2 } = req.body;

    if (!idCard1 || !idCard2) {
      return res.status(400).json({
        success: false,
        error: '请提供两个身份证号'
      });
    }

    const result = await familyService.checkBloodRelationship(idCard1, idCard2);

    res.json({
      success: true,
      data: result,
      message: result.hasRelationship ? '存在血缘关系' : '不存在血缘关系'
    });

  } catch (error) {
    logger.error('检查血缘关系失败:', error);
    res.status(500).json({
      success: false,
      error: '检查血缘关系失败'
    });
  }
}

/**
 * 获取家庭统计数据
 */
async function getFamilyStatistics(req, res) {
  try {
    const { villageId } = req.query;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        error: '请提供村庄ID'
      });
    }

    const statistics = await familyService.getFamilyStatistics(villageId);

    res.json({
      success: true,
      data: statistics,
      message: '获取家庭统计数据成功'
    });

  } catch (error) {
    logger.error('获取家庭统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取家庭统计数据失败'
    });
  }
}

/**
 * 批量智能导入村民
 */
async function smartBatchImport(req, res) {
  try {
    const { residents } = req.body;

    if (!Array.isArray(residents) || residents.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的村民数据数组'
      });
    }

    const results = {
      total: residents.length,
      success: 0,
      failed: 0,
      errors: [],
      processedResidents: []
    };

    // 批量处理
    for (let i = 0; i < residents.length; i++) {
      try {
        const residentData = residents[i];

        // 验证村庄
        const village = await Village.findById(residentData.villageId);
        if (!village) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: '村庄不存在'
          });
          continue;
        }

        // 检查重复
        const existing = await Resident.findOne({
          idCard: encryptSensitiveData(residentData.idCard)
        });

        if (existing) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: '身份证号已存在'
          });
          continue;
        }

        // 智能数据清理和标准化
        const cleanedData = await cleanAndStandardizeData(residentData);

        // 加密敏感数据
        const encryptedData = {
          ...cleanedData,
          phone: cleanedData.phone ? encryptSensitiveData(cleanedData.phone) : undefined,
          idCard: encryptSensitiveData(cleanedData.idCard)
        };

        const resident = new Resident(encryptedData);
        await resident.save();

        // 生成一户一码
        const qrCode = await generateResidentQRCode(resident._id, residentData.villageId);

        results.success++;
        results.processedResidents.push({
          id: resident._id,
          name: resident.name,
          qrCode
        });

        // 异步构建家庭关系（不阻塞主流程）
        setImmediate(async () => {
          try {
            await familyService.buildFamilyNetwork(resident._id);
          } catch (error) {
            logger.warn(`构建家庭关系网络失败 (ID: ${resident._id}):`, error);
          }
        });

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    logger.info(`智能批量导入完成: 成功${results.success}条，失败${results.failed}条`);

    res.json({
      success: true,
      data: results,
      message: `智能批量导入完成，成功${results.success}条，失败${results.failed}条`
    });

  } catch (error) {
    logger.error('智能批量导入失败:', error);
    res.status(500).json({
      success: false,
      error: '智能批量导入失败'
    });
  }
}

/**
 * 智能村民搜索
 */
async function smartSearchResidents(req, res) {
  try {
    const {
      keyword,
      searchType = 'fuzzy', // exact | fuzzy | intelligent
      villageId,
      ageRange,
      gender,
      occupation,
      limit = 20
    } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }

    let residents = [];

    if (searchType === 'intelligent') {
      // 智能搜索：多字段模糊匹配 + 关系扩展
      residents = await performIntelligentSearch(keyword, villageId);
    } else if (searchType === 'fuzzy') {
      // 模糊搜索
      residents = await performFuzzySearch(keyword, villageId);
    } else {
      // 精确搜索
      residents = await performExactSearch(keyword, villageId);
    }

    // 应用筛选条件
    if (ageRange) {
      const [minAge, maxAge] = ageRange.split('-').map(Number);
      residents = residents.filter(r => r.age >= minAge && r.age <= maxAge);
    }

    if (gender) {
      residents = residents.filter(r => r.gender === gender);
    }

    if (occupation) {
      residents = residents.filter(r => r.occupation === occupation);
    }

    // 限制数量
    residents = residents.slice(0, parseInt(limit));

    // 处理敏感数据
    const results = residents.map(resident => ({
      _id: resident._id,
      name: resident.name,
      gender: resident.gender,
      age: resident.age,
      village: resident.villageId,
      occupation: resident.occupation,
      phone: resident.phone ? resident.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : undefined,
      specialIdentities: resident.specialIdentities
    }));

    res.json({
      success: true,
      data: results,
      total: results.length,
      searchType,
      message: `智能搜索完成，找到${results.length}条记录`
    });

  } catch (error) {
    logger.error('智能搜索失败:', error);
    res.status(500).json({
      success: false,
      error: '智能搜索失败'
    });
  }
}

// 辅助函数

/**
 * 生成村民二维码
 */
async function generateResidentQRCode(residentId, villageId) {
  try {
    const qrData = {
      type: 'resident',
      id: residentId,
      villageId,
      timestamp: Date.now()
    };

    const qrString = JSON.stringify(qrData);
    const qrCode = await QRCode.toDataURL(qrString);

    return qrCode;
  } catch (error) {
    logger.error('生成二维码失败:', error);
    return null;
  }
}

/**
 * 清理和标准化数据
 */
async function cleanAndStandardizeData(data) {
  const cleaned = { ...data };

  // 标准化性别
  if (cleaned.gender) {
    const genderMap = {
      '男': 'male',
      '女': 'female',
      'M': 'male',
      'F': 'female'
    };
    cleaned.gender = genderMap[cleaned.gender] || cleaned.gender;
  }

  // 标准化生日
  if (cleaned.birthDate && typeof cleaned.birthDate === 'string') {
    const dateMatch = cleaned.birthDate.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
    if (dateMatch) {
      cleaned.birthDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    }
  }

  // 计算年龄
  if (cleaned.birthDate && !cleaned.age) {
    const birthYear = new Date(cleaned.birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    cleaned.age = currentYear - birthYear;
  }

  return cleaned;
}

/**
 * 智能搜索
 */
async function performIntelligentSearch(keyword, villageId) {
  const query = villageId ? { villageId } : {};

  // 多字段模糊匹配
  query.$or = [
    { name: { $regex: keyword, $options: 'i' } },
    { 'address.detailAddress': { $regex: keyword, $options: 'i' } },
    { 'workplace.name': { $regex: keyword, $options: 'i' } },
    { 'education.school': { $regex: keyword, $options: 'i' } }
  ];

  const residents = await Resident.find(query)
    .populate('villageId', 'name')
    .limit(50);

  // 关系扩展搜索
  const expandedResults = [];
  for (const resident of residents) {
    expandedResults.push(resident);

    try {
      const network = await familyService.buildFamilyNetwork(resident._id);
      const relatedResidents = await Resident.find({
        _id: { $in: network.relations.map(r => r.id) }
      }).populate('villageId', 'name');

      expandedResults.push(...relatedResidents);
    } catch (error) {
      logger.warn('关系扩展搜索失败:', error);
    }
  }

  // 去重
  const uniqueResidents = [];
  const seenIds = new Set();

  for (const resident of expandedResults) {
    if (!seenIds.has(resident._id.toString())) {
      seenIds.add(resident._id.toString());
      uniqueResidents.push(resident);
    }
  }

  return uniqueResidents;
}

/**
 * 模糊搜索
 */
async function performFuzzySearch(keyword, villageId) {
  const query = villageId ? { villageId } : {};

  query.$or = [
    { name: { $regex: keyword, $options: 'i' } },
    { 'address.detailAddress': { $regex: keyword, $options: 'i' } }
  ];

  return await Resident.find(query)
    .populate('villageId', 'name')
    .limit(20);
}

/**
 * 精确搜索
 */
async function performExactSearch(keyword, villageId) {
  const query = villageId ? { villageId } : {};

  // 根据关键词类型判断搜索字段
  if (/^\d+$/.test(keyword)) {
    // 纯数字，可能是电话号码
    query.phone = encryptSensitiveData(keyword);
  } else if (/^\d{17}[\dXx]$/.test(keyword)) {
    // 身份证号
    query.idCard = encryptSensitiveData(keyword);
  } else {
    // 姓名
    query.name = keyword;
  }

  return await Resident.find(query)
    .populate('villageId', 'name')
    .limit(20);
}

module.exports = {
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
  uploadIdCard: upload.single('idCard'),
  uploadInvoice: upload.single('invoice')
};