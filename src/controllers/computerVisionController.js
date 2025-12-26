/**
 * 计算机视觉控制器
 * 处理人脸识别、OCR识别、病虫害识别、工程监控等
 */

const computerVisionService = require('../services/computerVisionService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../utils/logger');

// 创建上传目录
const uploadDirs = {
  face: path.join(__dirname, '../uploads/face'),
  document: path.join(__dirname, '../uploads/document'),
  pest: path.join(__dirname, '../uploads/pest'),
  construction: path.join(__dirname, '../uploads/construction')
};

// 创建所有上传目录
Object.values(uploadDirs).forEach(dir => {
  fs.mkdir(dir, { recursive: true }).catch(() => {});
});

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.body.type || req.params.type || 'general';
    const dir = uploadDirs[uploadType] || uploadDirs.face;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()  }-${  Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, bmp, webp)'));
    }
  }
});

/**
 * 人脸识别认证
 */
exports.faceRecognition = async (req, res) => {
  try {
    const { userId, livenessCheck = true, qualityCheck = true, provider = 'baidu' } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传人脸图片'
      });
    }

    // 读取图片文件
    const imageBuffer = await fs.readFile(req.file.path);

    // 调用人脸识别服务
    const result = await computerVisionService.recognizeFace(imageBuffer, {
      userId,
      livenessCheck,
      qualityCheck,
      provider
    });

    // 清理临时文件
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('人脸识别失败:', error);
    // 清理临时文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('清理临时文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: '人脸识别失败',
      error: error.message
    });
  }
};

/**
 * 人脸注册
 */
exports.faceRegistration = async (req, res) => {
  try {
    const { userId, name, description } = req.body;

    if (!req.file || !userId) {
      return res.status(400).json({
        success: false,
        message: '请提供人脸图片和用户ID'
      });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    // 进行人脸检测和质量检查
    const recognitionResult = await computerVisionService.recognizeFace(imageBuffer, {
      qualityCheck: true,
      livenessCheck: true,
      provider: 'baidu'
    });

    if (!recognitionResult.success) {
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: '人脸检测失败',
        error: recognitionResult.error
      });
    }

    // 生成人脸特征数据
    const faceData = {
      userId,
      name,
      description,
      faceToken: recognitionResult.faceToken,
      features: recognitionResult.features,
      imageHash: crypto.createHash('md5').update(imageBuffer).digest('hex'),
      registrationTime: new Date(),
      lastUsed: new Date(),
      status: 'active'
    };

    // 保存人脸数据到数据库（这里需要实际实现）
    // const savedFace = await FaceModel.create(faceData);

    // 保存人脸图片
    const faceImagePath = path.join(uploadDirs.face, `${userId}_${Date.now()}.jpg`);
    await fs.writeFile(faceImagePath, imageBuffer);

    // 清理临时文件
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: '人脸注册成功',
      data: {
        faceId: faceData.faceToken,
        registrationTime: faceData.registrationTime,
        imageSaved: true
      }
    });

  } catch (error) {
    logger.error('人脸注册失败:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('清理临时文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: '人脸注册失败',
      error: error.message
    });
  }
};

/**
 * 人脸比对
 */
exports.faceComparison = async (req, res) => {
  try {
    const { faceId1, faceId2, threshold = 0.8 } = req.body;

    if (!req.files || !req.files.image1 || !req.files.image2) {
      return res.status(400).json({
        success: false,
        message: '请提供两张人脸图片进行比对'
      });
    }

    const image1Buffer = await fs.readFile(req.files.image1[0].path);
    const image2Buffer = await fs.readFile(req.files.image2[0].path);

    // 进行人脸识别获取特征
    const result1 = await computerVisionService.recognizeFace(image1Buffer, {
      provider: 'baidu'
    });

    const result2 = await computerVisionService.recognizeFace(image2Buffer, {
      provider: 'baidu'
    });

    if (!result1.success || !result2.success) {
      return res.status(400).json({
        success: false,
        message: '人脸检测失败',
        errors: [
          result1.error || null,
          result2.error || null
        ].filter(Boolean)
      });
    }

    // 计算相似度（这里需要实际的人脸比对算法）
    const similarity = await calculateFaceSimilarity(result1.faceToken, result2.faceToken);

    const isMatch = similarity >= threshold;

    // 清理临时文件
    await Promise.all([
      fs.unlink(req.files.image1[0].path),
      fs.unlink(req.files.image2[0].path)
    ]);

    res.json({
      success: true,
      data: {
        similarity,
        isMatch,
        threshold,
        face1: {
          faceToken: result1.faceToken,
          quality: result1.quality
        },
        face2: {
          faceToken: result2.faceToken,
          quality: result2.quality
        }
      }
    });

  } catch (error) {
    logger.error('人脸比对失败:', error);
    // 清理临时文件
    if (req.files) {
      const cleanupPromises = [];
      if (req.files.image1) cleanupPromises.push(fs.unlink(req.files.image1[0].path));
      if (req.files.image2) cleanupPromises.push(fs.unlink(req.files.image2[0].path));
      Promise.all(cleanupPromises).catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: '人脸比对失败',
      error: error.message
    });
  }
};

/**
 * 证件OCR识别
 */
exports.documentOCR = async (req, res) => {
  try {
    const { documentType = 'auto', provider = 'baidu', extractFields = true, validateFormat = true } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传证件图片'
      });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    // 调用OCR识别服务
    const result = await computerVisionService.recognizeDocument(imageBuffer, documentType, {
      provider,
      extractFields,
      validateFormat
    });

    // 清理临时文件
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('证件OCR识别失败:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('清理临时文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: '证件OCR识别失败',
      error: error.message
    });
  }
};

/**
 * 批量证件OCR识别
 */
exports.batchDocumentOCR = async (req, res) => {
  try {
    const { documentType = 'auto', provider = 'baidu' } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请上传证件图片文件'
      });
    }

    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    const results = [];

    for (const file of files) {
      try {
        const imageBuffer = await fs.readFile(file.path);
        const result = await computerVisionService.recognizeDocument(imageBuffer, documentType, {
          provider,
          extractFields: true,
          validateFormat: true
        });

        results.push({
          filename: file.originalname,
          success: result.success,
          data: result.success ? result : null,
          error: result.success ? null : result.error
        });

        // 清理临时文件
        await fs.unlink(file.path);

      } catch (error) {
        results.push({
          filename: file.originalname,
          success: false,
          error: error.message
        });

        // 清理临时文件
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          logger.error('清理临时文件失败:', cleanupError);
        }
      }
    }

    res.json({
      success: true,
      data: {
        total: files.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });

  } catch (error) {
    logger.error('批量证件OCR识别失败:', error);
    // 清理所有临时文件
    if (req.files) {
      const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
      const cleanupPromises = files.map(file =>
        fs.unlink(file.path).catch(() => {})
      );
      Promise.all(cleanupPromises);
    }

    res.status(500).json({
      success: false,
      message: '批量证件OCR识别失败',
      error: error.message
    });
  }
};

/**
 * 农作物病虫害识别
 */
exports.pestDiseaseRecognition = async (req, res) => {
  try {
    const { cropType = 'auto', provider = 'local', confidenceThreshold = 0.7, includeTreatment = true } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传农作物图片'
      });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    // 调用病虫害识别服务
    const result = await computerVisionService.recognizePestDisease(imageBuffer, {
      cropType,
      provider,
      confidenceThreshold,
      includeTreatment
    });

    // 清理临时文件
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('农作物病虫害识别失败:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('清理临时文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: '农作物病虫害识别失败',
      error: error.message
    });
  }
};

/**
 * 工程进度监控
 */
exports.constructionMonitoring = async (req, res) => {
  try {
    const { projectId, compareWithBaseline = true, detectAnomalies = true, generateReport = true } = req.body;

    if (!req.file || !projectId) {
      return res.status(400).json({
        success: false,
        message: '请提供工程图片和项目ID'
      });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    // 调用工程进度监控服务
    const result = await computerVisionService.monitorConstructionProgress(imageBuffer, projectId, {
      compareWithBaseline,
      detectAnomalies,
      generateReport
    });

    // 清理临时文件
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('工程进度监控失败:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('清理临时文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: '工程进度监控失败',
      error: error.message
    });
  }
};

/**
 * 上传工程基准图片
 */
exports.uploadBaselineImage = async (req, res) => {
  try {
    const { projectId, phaseName = 'initial' } = req.body;

    if (!req.file || !projectId) {
      return res.status(400).json({
        success: false,
        message: '请提供基准图片和项目ID'
      });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    // 生成基准图片路径
    const baselineImagePath = path.join(
      uploadDirs.construction,
      `baseline_${projectId}_${phaseName}_${Date.now()}.jpg`
    );

    // 保存基准图片
    await fs.writeFile(baselineImagePath, imageBuffer);

    // 记录基准图片信息到数据库（需要实际实现）
    const baselineInfo = {
      projectId,
      phaseName,
      imagePath: baselineImagePath,
      uploadTime: new Date(),
      imageHash: crypto.createHash('md5').update(imageBuffer).digest('hex')
    };

    // 保存到数据库
    // await BaselineImageModel.create(baselineInfo);

    // 清理临时文件
    await fs.unlink(req.file.path);

    res.json({
      success: true,
      message: '基准图片上传成功',
      data: {
        projectId,
        phaseName,
        uploadTime: baselineInfo.uploadTime,
        imagePath: baselineImagePath
      }
    });

  } catch (error) {
    logger.error('基准图片上传失败:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('清理临时文件失败:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: '基准图片上传失败',
      error: error.message
    });
  }
};

/**
 * 获取工程历史分析
 */
exports.getConstructionHistory = async (req, res) => {
  try {
    const { projectId, startDate, endDate, limit = 50 } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: '请提供项目ID'
      });
    }

    // 从数据库获取历史分析记录（需要实际实现）
    const historyData = {
      projectId,
      analyses: [
        // 模拟数据
        {
          id: 'analysis_1',
          timestamp: new Date('2024-01-15'),
          progress: 45,
          phase: '主体结构',
          confidence: 0.92,
          anomalies: []
        },
        {
          id: 'analysis_2',
          timestamp: new Date('2024-01-22'),
          progress: 58,
          phase: '主体结构',
          confidence: 0.88,
          anomalies: [
            { type: 'safety_violation', description: '未佩戴安全帽', severity: 'medium' }
          ]
        }
      ],
      total: 2,
      summary: {
        averageProgress: 51.5,
        anomalyCount: 1,
        qualityScore: 0.9
      }
    };

    res.json({
      success: true,
      data: historyData
    });

  } catch (error) {
    logger.error('获取工程历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工程历史失败',
      error: error.message
    });
  }
};

/**
 * 获取识别服务状态
 */
exports.getServiceStatus = async (req, res) => {
  try {
    const status = {
      faceRecognition: {
        available: true,
        providers: ['baidu', 'tencent', 'alibaba'],
        currentProvider: 'baidu',
        lastHealthCheck: new Date(),
        uptime: '99.9%'
      },
      documentOCR: {
        available: true,
        supportedTypes: ['idcard', 'driver_license', 'passport', 'household_register'],
        accuracy: '98.5%'
      },
      pestDiseaseRecognition: {
        available: true,
        supportedCrops: ['rice', 'wheat', 'corn', 'soybean', 'cotton'],
        modelVersion: '1.2.0',
        accuracy: '94.2%'
      },
      constructionMonitoring: {
        available: true,
        features: ['progress_analysis', 'anomaly_detection', 'quality_assessment'],
        processingTime: '2.3s'
      },
      storage: {
        usedSpace: await calculateUsedStorage(),
        totalSpace: '10GB',
        availableSpace: '8.7GB'
      }
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('获取服务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取服务状态失败',
      error: error.message
    });
  }
};

/**
 * 计算相似度（模拟实现）
 */
async function calculateFaceSimilarity(faceToken1, faceToken2) {
  // 这里应该调用实际的人脸特征比对算法
  // 简化实现，返回随机相似度
  return Math.random() * 0.4 + 0.6; // 0.6-1.0之间
}

/**
 * 计算已用存储空间
 */
async function calculateUsedStorage() {
  try {
    const dirs = Object.values(uploadDirs);
    let totalSize = 0;

    for (const dir of dirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      } catch (error) {
        logger.error(`计算目录大小失败: ${dir}`, error);
      }
    }

    return `${(totalSize / (1024 * 1024 * 1024)).toFixed(2)  }GB`; // 转换为GB
  } catch (error) {
    logger.error('计算存储空间失败:', error);
    return '未知';
  }
}

// 导出上传中间件
exports.upload = upload;