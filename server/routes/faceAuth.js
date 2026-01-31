/**
 * 人脸识别认证路由
 * 提供人脸登录相关API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// 导入模型
const User = require('../models/User');
const FaceData = require('../models/FaceData');
const AuditLog = require('../models/SecurityAudit');

// 导入中间件
const { authenticateToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

// 配置文件上传（内存存储，用于处理Base64）
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

/**
 * 辅助函数：从Base64图像提取人脸特征
 * 注意：实际生产环境应使用专业的人脸识别SDK（如face-api.js、Azure Face API、百度AI等）
 */
async function extractFaceFeatures(imageBuffer) {
  try {
    // TODO: 集成真实的人脸识别SDK
    // 这里提供模拟实现，实际使用时替换为真实的人脸特征提取

    // 生成模拟特征向量（128维）
    const features = [];
    for (let i = 0; i < 128; i++) {
      features.push(Math.random());
    }

    return {
      success: true,
      features: Float32Array.from(features),
      confidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
      faceDetected: true
    };
  } catch (error) {
    console.error('Face feature extraction error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 辅助函数：计算两个特征向量的相似度
 */
function calculateSimilarity(features1, features2) {
  // 使用余弦相似度
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < features1.length; i++) {
    dotProduct += features1[i] * features2[i];
    norm1 += features1[i] * features1[i];
    norm2 += features2[i] * features2[i];
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return similarity;
}

/**
 * 辅助函数：记录安全审计日志
 */
async function logAuditEvent(userId, eventType, details) {
  try {
    await AuditLog.create({
      userId,
      eventType,
      eventCategory: 'face_recognition',
      details,
      timestamp: new Date(),
      ipAddress: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      severity: details.success ? 'low' : 'medium'
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

/**
 * @route   POST /api/face-auth/login
 * @desc    人脸识别登录
 * @access  Public
 */
router.post('/login', rateLimiter, upload.single('image'), async (req, res) => {
  try {
    const { image, villageId } = req.body;

    // 验证输入
    if (!image) {
      return res.status(400).json({
        success: false,
        message: '请提供人脸图像数据'
      });
    }

    // 解码Base64图像
    let imageBuffer;
    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '图像数据格式错误'
      });
    }

    // 提取人脸特征
    const extraction = await extractFaceFeatures(imageBuffer);
    if (!extraction.success || !extraction.faceDetected) {
      await logAuditEvent(null, 'face_login_failed', {
        reason: 'no_face_detected',
        success: false
      });

      return res.status(400).json({
        success: false,
        message: '未检测到人脸，请确保面部清晰可见'
      });
    }

    // 查询该村庄所有已注册人脸的用户
    const query = { villageId: villageId || 'default', hasFaceData: true };
    const users = await User.find(query);

    if (users.length === 0) {
      await logAuditEvent(null, 'face_login_failed', {
        reason: 'no_users_with_face',
        villageId,
        success: false
      });

      return res.status(404).json({
        success: false,
        message: '该村庄暂无用户注册人脸数据'
      });
    }

    // 获取所有用户的人脸特征
    const userIds = users.map(u => u._id);
    const faceDataList = await FaceData.find({
      userId: { $in: userIds },
      isActive: true
    });

    // 寻找最佳匹配
    let bestMatch = null;
    let highestSimilarity = 0;
    const SIMILARITY_THRESHOLD = 0.8; // 相似度阈值

    for (const faceData of faceDataList) {
      const similarity = calculateSimilarity(
        extraction.features,
        faceData.features
      );

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = faceData;
      }
    }

    // 检查是否找到匹配
    if (bestMatch && highestSimilarity >= SIMILARITY_THRESHOLD) {
      const user = users.find(u => u._id.equals(bestMatch.userId));

      if (!user || !user.isActive) {
        await logAuditEvent(bestMatch.userId, 'face_login_failed', {
          reason: 'user_inactive',
          similarity: highestSimilarity,
          success: false
        });

        return res.status(403).json({
          success: false,
          message: '用户账号已被禁用'
        });
      }

      // 生成JWT token
      const token = crypto.randomBytes(32).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');

      // 更新用户登录信息
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      // 记录审计日志
      await logAuditEvent(user._id, 'face_login_success', {
        similarity: highestSimilarity,
        success: true,
        villageId
      });

      res.json({
        success: true,
        message: '人脸识别登录成功',
        data: {
          token,
          refreshToken,
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            villageId: user.villageId,
            avatar: user.avatar
          },
          confidence: extraction.confidence,
          similarity: highestSimilarity
        }
      });
    } else {
      // 未找到匹配
      await logAuditEvent(null, 'face_login_failed', {
        reason: 'no_match',
        highestSimilarity,
        threshold: SIMILARITY_THRESHOLD,
        success: false,
        villageId
      });

      res.status(401).json({
        success: false,
        message: '人脸识别失败，未找到匹配的用户'
      });
    }
  } catch (error) {
    console.error('Face login error:', error);

    await logAuditEvent(null, 'face_login_error', {
      error: error.message,
      success: false
    });

    res.status(500).json({
      success: false,
      message: '人脸识别登录失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/face-auth/register
 * @desc    注册用户人脸数据
 * @access  Private
 */
router.post('/register', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { image, villageId } = req.body;

    // 验证用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 解码Base64图像
    let imageBuffer;
    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '图像数据格式错误'
      });
    }

    // 提取人脸特征
    const extraction = await extractFaceFeatures(imageBuffer);
    if (!extraction.success || !extraction.faceDetected) {
      return res.status(400).json({
        success: false,
        message: '未检测到人脸，请确保面部清晰可见'
      });
    }

    // 检查是否已注册人脸
    const existingFace = await FaceData.findOne({ userId, isActive: true });
    if (existingFace) {
      // 更新现有人脸数据
      existingFace.features = extraction.features;
      existingFace.updatedAt = new Date();
      await existingFace.save();
    } else {
      // 创建新的人脸数据记录
      await FaceData.create({
        userId,
        features: extraction.features,
        villageId: villageId || user.villageId || 'default',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 更新用户标记
    user.hasFaceData = true;
    await user.save();

    // 记录审计日志
    await logAuditEvent(userId, 'face_register_success', {
      success: true,
      villageId: villageId || user.villageId
    });

    res.json({
      success: true,
      message: '人脸数据注册成功',
      data: {
        confidence: extraction.confidence
      }
    });
  } catch (error) {
    console.error('Face register error:', error);

    await logAuditEvent(req.user.id, 'face_register_error', {
      error: error.message,
      success: false
    });

    res.status(500).json({
      success: false,
      message: '人脸数据注册失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/face-auth/status/:userId
 * @desc    检查用户是否已注册人脸
 * @access  Private
 */
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // 验证权限（只能查看自己的状态，管理员可以查看所有）
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const faceData = await FaceData.findOne({ userId, isActive: true });

    res.json({
      success: true,
      data: {
        hasFaceData: !!user.hasFaceData,
        registeredAt: faceData?.createdAt || null,
        updatedAt: faceData?.updatedAt || null
      }
    });
  } catch (error) {
    console.error('Face status check error:', error);
    res.status(500).json({
      success: false,
      message: '查询人脸状态失败',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/face-auth/delete
 * @desc    删除用户人脸数据
 * @access  Private
 */
router.delete('/delete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 验证用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 软删除人脸数据
    await FaceData.updateMany(
      { userId, isActive: true },
      { isActive: false, deletedAt: new Date() }
    );

    // 更新用户标记
    user.hasFaceData = false;
    await user.save();

    // 记录审计日志
    await logAuditEvent(userId, 'face_data_deleted', {
      success: true
    });

    res.json({
      success: true,
      message: '人脸数据已删除'
    });
  } catch (error) {
    console.error('Face data deletion error:', error);
    res.status(500).json({
      success: false,
      message: '删除人脸数据失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/face-auth/verify
 * @desc    验证人脸图像（1:1验证）
 * @access  Private
 */
router.post('/verify', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { image } = req.body;

    // 获取用户人脸数据
    const storedFaceData = await FaceData.findOne({ userId, isActive: true });
    if (!storedFaceData) {
      return res.status(404).json({
        success: false,
        message: '未找到用户人脸数据，请先注册'
      });
    }

    // 解码Base64图像
    let imageBuffer;
    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '图像数据格式错误'
      });
    }

    // 提取人脸特征
    const extraction = await extractFaceFeatures(imageBuffer);
    if (!extraction.success || !extraction.faceDetected) {
      return res.status(400).json({
        success: false,
        message: '未检测到人脸'
      });
    }

    // 计算相似度
    const similarity = calculateSimilarity(
      extraction.features,
      storedFaceData.features
    );

    const SIMILARITY_THRESHOLD = 0.8;
    const isMatch = similarity >= SIMILARITY_THRESHOLD;

    // 记录审计日志
    await logAuditEvent(userId, 'face_verification', {
      similarity,
      isMatch,
      success: true
    });

    res.json({
      success: true,
      data: {
        isMatch,
        similarity,
        confidence: extraction.confidence,
        threshold: SIMILARITY_THRESHOLD
      },
      message: isMatch ? '验证成功' : '验证失败'
    });
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({
      success: false,
      message: '人脸验证失败',
      error: error.message
    });
  }
});

module.exports = router;
