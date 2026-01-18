const residentService = require('../services/residentService');
const logger = require('../utils/logger');
const { body, validationResult, param, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads/residents');
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

const buildOperator = (req) => ({
  userId: req.user?.userId || req.headers['x-user-id'],
  username: req.user?.username || 'system',
  name: req.user?.name || '系统',
  role: req.user?.role || 'admin',
  sessionId: req.headers['x-session-id'] || `session_${Date.now()}`
});

const createResident = async (req, res) => {
  const startTime = Date.now();
  try {
    const errors = validationResult(req);
    if (errors && errors.array && !errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors.array()
      });
    }

    const operator = buildOperator(req);
    const resident = await residentService.createResident(req.body, operator);

    logger.info(`村民档案创建成功: ${resident._id}`, { 
      userId: operator.userId, 
      duration: Date.now() - startTime 
    });

    res.status(201).json({
      success: true,
      data: resident,
      message: '村民档案创建成功'
    });

  } catch (error) {
    logger.error('创建村民档案失败:', error);

    const errorResponses = {
      '身份证号已存在': 409,
      '不存在': 404
    };

    for (const [msg, status] of Object.entries(errorResponses)) {
      if (error.message.includes(msg)) {
        return res.status(status).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: '创建村民档案失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const batchImportResidents = async (req, res) => {
  const startTime = Date.now();
  try {
    const { residents } = req.body;

    if (!Array.isArray(residents) || residents.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的村民数据数组'
      });
    }

    const operator = buildOperator(req);
    const results = await residentService.batchImportResidents(residents, operator);

    logger.info(`批量导入完成: 成功${results.success}条，失败${results.failed}条`, { 
      userId: operator.userId, 
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: results,
      message: `批量导入完成，成功${results.success}条，失败${results.failed}条`
    });

  } catch (error) {
    logger.error('批量导入失败:', error);
    res.status(500).json({
      success: false,
      error: '批量导入失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getResidentById = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    const cacheKey = `resident:${id}`;
    const cachedResident = cache.get(cacheKey);
    
    if (cachedResident) {
      return res.json({
        success: true,
        data: cachedResident,
        cached: true
      });
    }

    const operator = buildOperator(req);
    operator.idCard = req.user?.idCard;

    const resident = await residentService.getResidentById(id, operator);
    cache.set(cacheKey, resident);

    logger.info(`获取村民信息成功: ${id}`, { 
      userId: operator.userId, 
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: resident
    });

  } catch (error) {
    logger.error('获取村民信息失败:', error);

    const errorResponses = {
      '不存在': 404,
      '没有权限': 403
    };

    for (const [msg, status] of Object.entries(errorResponses)) {
      if (error.message.includes(msg)) {
        return res.status(status).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: '获取村民信息失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const listResidents = async (req, res) => {
  const startTime = Date.now();
  try {
    const queryParams = {
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 20, 100),
      villageId: req.query.villageId,
      householdNumber: req.query.householdNumber,
      name: req.query.name,
      gender: req.query.gender,
      ageRange: req.query.ageRange,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const cacheKey = `residents:list:${JSON.stringify(queryParams)}`;
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    const operator = buildOperator(req);
    const result = await residentService.listResidents(queryParams, operator);
    cache.set(cacheKey, result, 60);

    logger.info(`查询村民列表成功`, { 
      userId: operator.userId, 
      count: result.residents?.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('查询村民列表失败:', error);
    res.status(500).json({
      success: false,
      error: '查询村民列表失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateResident = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const updates = req.body;

    const operator = buildOperator(req);
    const updatedResident = await residentService.updateResident(id, updates, operator);

    cache.del(`resident:${id}`);
    cache.del(`residents:list:*`);

    logger.info(`村民信息更新成功: ${id}`, { 
      userId: operator.userId, 
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: updatedResident,
      message: '村民信息更新成功'
    });

  } catch (error) {
    logger.error('更新村民信息失败:', error);

    const errorResponses = {
      '不存在': 404,
      '没有权限': 403,
      '验证失败': 400
    };

    for (const [msg, status] of Object.entries(errorResponses)) {
      if (error.message.includes(msg)) {
        return res.status(status).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: '更新村民信息失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteResident = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const operator = buildOperator(req);
    await residentService.deleteResident(id, reason, operator);

    cache.del(`resident:${id}`);
    cache.del(`residents:list:*`);

    logger.info(`村民档案删除成功: ${id}`, { 
      userId: operator.userId, 
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      message: '村民档案删除成功'
    });

  } catch (error) {
    logger.error('删除村民档案失败:', error);

    const errorResponses = {
      '不存在': 404,
      '没有权限': 403
    };

    for (const [msg, status] of Object.entries(errorResponses)) {
      if (error.message.includes(msg)) {
        return res.status(status).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: '删除村民档案失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const uploadPhoto = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的图片'
      });
    }

    const operator = buildOperator(req);
    const fileInfo = {
      path: req.file.path,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    const result = await residentService.uploadPhoto(id, fileInfo, operator);
    cache.del(`resident:${id}`);

    logger.info(`村民照片上传成功: ${id}`, { 
      userId: operator.userId, 
      fileSize: req.file.size,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result,
      message: '照片上传成功'
    });

  } catch (error) {
    logger.error('上传村民照片失败:', error);

    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('清理上传文件失败:', unlinkError);
      }
    }

    const errorResponses = {
      '不存在': 404
    };

    for (const [msg, status] of Object.entries(errorResponses)) {
      if (error.message.includes(msg)) {
        return res.status(status).json({
          success: false,
          error: error.message
        });
      }
    }

    if (error.message.includes('图片')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '上传照片失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const searchResidents = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      keyword,
      searchType = 'all',
      villageId,
      gender,
      occupation,
      ageRange,
      education,
      specialIdentityType,
      householdType,
      sortBy = 'score',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      useFullTextSearch = false
    } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }

    const operator = buildOperator(req);

    const filters = {};
    if (gender) filters.gender = gender;
    if (occupation) filters.occupation = occupation;
    if (ageRange) {
      const [min, max] = ageRange.split('-').map(Number);
      filters.ageRange = [min, max];
    }
    if (education) filters.education = education;
    if (specialIdentityType) filters.specialIdentityType = specialIdentityType;
    if (householdType) filters.householdType = householdType;

    let results;
    if (useFullTextSearch === 'true') {
      results = await residentService.fullTextSearchResidents({
        keyword,
        villageId,
        filters,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit)
      }, operator);
    } else {
      results = await residentService.searchResidents({
        keyword,
        searchType,
        villageId,
        filters,
        page: parseInt(page),
        limit: parseInt(limit)
      }, operator);
    }

    logger.info(`搜索村民成功: ${keyword}`, { 
      userId: operator.userId, 
      count: results.residents?.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('搜索村民失败:', error);

    if (error.message.includes('关键词') || error.message.includes('不能为空')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '搜索失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getFamilyNetwork = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const operator = buildOperator(req);

    const result = await residentService.getFamilyNetwork(id, operator);

    logger.info(`获取家庭关系网络成功: ${id}`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取家庭关系网络失败:', error);

    const errorResponses = {
      '不存在': 404,
      '没有权限': 403
    };

    for (const [msg, status] of Object.entries(errorResponses)) {
      if (error.message.includes(msg)) {
        return res.status(status).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: '获取家庭关系网络失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createResident: [
    body('idCard').notEmpty().withMessage('身份证号不能为空'),
    body('name').notEmpty().withMessage('姓名不能为空'),
    body('gender').isIn(['male', 'female']).withMessage('性别必须是male或female'),
    body('villageId').notEmpty().withMessage('村庄ID不能为空'),
    createResident
  ],
  batchImportResidents,
  getResidentById: [
    param('id').isMongoId().withMessage('无效的村民ID'),
    getResidentById
  ],
  listResidents,
  updateResident,
  deleteResident,
  uploadPhoto,
  searchResidents,
  getFamilyNetwork,
  upload: upload.single('photo')
};
