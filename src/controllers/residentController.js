/**
 * 村民管理控制器
 * 处理村民相关的HTTP请求
 */

const residentService = require('../services/residentService');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 配置文件上传
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
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

/**
 * 创建村民档案
 */
async function createResident(req, res) {
  try {
    const { error } = validationResult(req);
    if (error) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: error.array()
      });
    }

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now()
    };

    // 调用服务层创建村民
    const resident = await residentService.createResident(req.body, operator);

    logger.info(`村民档案创建成功: ${resident._id}`);

    res.status(201).json({
      success: true,
      data: resident,
      message: '村民档案创建成功'
    });

  } catch (error) {
    logger.error('创建村民档案失败:', error);

    // 处理特定错误
    if (error.message.includes('身份证号已存在')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '创建村民档案失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 批量导入村民数据
 */
async function batchImportResidents(req, res) {
  try {
    const { residents } = req.body;

    if (!Array.isArray(residents) || residents.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的村民数据数组'
      });
    }

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now()
    };

    // 调用服务层批量导入
    const results = await residentService.batchImportResidents(residents, operator);

    logger.info(`批量导入完成: 成功${results.success}条，失败${results.failed}条`);

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
}

/**
 * 获取村民信息
 */
async function getResidentById(req, res) {
  try {
    const { id } = req.params;

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now(),
      idCard: req.user?.idCard
    };

    // 调用服务层获取村民信息
    const resident = await residentService.getResidentById(id, operator);

    res.json({
      success: true,
      data: resident
    });

  } catch (error) {
    logger.error('获取村民信息失败:', error);

    // 处理特定错误
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('没有权限')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '获取村民信息失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 查询村民列表
 */
async function listResidents(req, res) {
  try {
    const queryParams = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      villageId: req.query.villageId,
      householdNumber: req.query.householdNumber,
      name: req.query.name,
      gender: req.query.gender,
      ageRange: req.query.ageRange,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now()
    };

    // 调用服务层查询村民列表
    const result = await residentService.listResidents(queryParams, operator);

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
}

/**
 * 更新村民信息
 */
async function updateResident(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now()
    };

    // 调用服务层更新村民信息
    const updatedResident = await residentService.updateResident(id, updates, operator);

    logger.info(`村民信息更新成功: ${id} by ${operator.name}`);

    res.json({
      success: true,
      data: updatedResident,
      message: '村民信息更新成功'
    });

  } catch (error) {
    logger.error('更新村民信息失败:', error);

    // 处理特定错误
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('没有权限')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('验证失败')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '更新村民信息失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 删除村民档案
 */
async function deleteResident(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now()
    };

    // 调用服务层删除村民档案
    await residentService.deleteResident(id, reason, operator);

    logger.info(`村民档案删除成功: ${id} by ${operator.name}`);

    res.json({
      success: true,
      message: '村民档案删除成功'
    });

  } catch (error) {
    logger.error('删除村民档案失败:', error);

    // 处理特定错误
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('没有权限')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '删除村民档案失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 上传村民照片
 */
async function uploadPhoto(req, res) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的图片'
      });
    }

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now()
    };

    // 准备文件信息
    const fileInfo = {
      path: req.file.path,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    // 调用服务层处理照片上传
    const result = await residentService.uploadPhoto(id, fileInfo, operator);

    logger.info(`村民照片上传成功: ${id} - ${req.file.path}`);

    res.json({
      success: true,
      data: result,
      message: '照片上传成功'
    });

  } catch (error) {
    logger.error('上传村民照片失败:', error);

    // 清理上传的文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('清理上传文件失败:', unlinkError);
      }
    }

    // 处理特定错误
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
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
}

/**
 * 搜索村民
 */
async function searchResidents(req, res) {
  try {
    const {
      keyword,
      searchType = 'name', // name, phone, idCard
      villageId,
      limit = 10
    } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now()
    };

    // 调用服务层搜索村民
    const results = await residentService.searchResidents({
      keyword,
      searchType,
      villageId,
      limit: parseInt(limit)
    }, operator);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('搜索村民失败:', error);

    // 处理特定错误
    if (error.message.includes('关键词')) {
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
}

/**
 * 获取家庭关系网络
 */
async function getFamilyNetwork(req, res) {
  try {
    const { id } = req.params;

    // 构建操作者信息
    const operator = {
      userId: req.user?.userId || req.headers['x-user-id'],
      username: req.user?.username || 'system',
      name: req.user?.name || '系统',
      role: req.user?.role || 'admin',
      sessionId: req.headers['x-session-id'] || 'session_' + Date.now()
    };

    // 调用服务层获取家庭关系网络
    const result = await residentService.getFamilyNetwork(id, operator);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取家庭关系网络失败:', error);

    // 处理特定错误
    if (error.message.includes('不存在')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('没有权限')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '获取家庭关系网络失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 导出模块

module.exports = {
  createResident,
  batchImportResidents,
  getResidentById,
  listResidents,
  updateResident,
  deleteResident,
  uploadPhoto,
  searchResidents,
  getFamilyNetwork,
  upload: upload.single('photo')
};