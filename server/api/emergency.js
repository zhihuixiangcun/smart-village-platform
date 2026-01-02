const express = require('express');
const router = express.Router();
const emergencyCallService = require('../services/emergencyCallService');
const EmergencyCall = require('../models/EmergencyCall');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/emergency/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp3|wav|mp4|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片、音频、视频和PDF文件'));
    }
  }
});

/**
 * 创建紧急呼叫
 * POST /api/emergency/call
 */
router.post('/call', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      villageId,
      emergencyType,
      description,
      location,
      anonymous = false
    } = req.body;

    // 处理附件
    const attachments = req.files ? req.files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'image' :
            file.mimetype.startsWith('audio/') ? 'audio' :
            file.mimetype.startsWith('video/') ? 'video' : 'document',
      url: `/uploads/emergency/${file.filename}`,
      filename: file.originalname,
      size: file.size,
      duration: req.body.duration ? parseInt(req.body.duration) : undefined
    })) : [];

    const callData = {
      villageId,
      callerId: req.user.id,
      location: typeof location === 'string' ? JSON.parse(location) : location,
      emergencyType,
      description,
      attachments,
      anonymous
    };

    const result = await emergencyCallService.handleEmergencyCall(callData);

    res.json({
      success: true,
      message: '紧急呼叫已发送，值班人员将立即响应',
      data: result
    });

  } catch (error) {
    console.error('Error creating emergency call:', error);
    res.status(500).json({
      success: false,
      message: error.message || '创建紧急呼叫失败'
    });
  }
});

/**
 * 扫描QR码发起呼叫
 * POST /api/emergency/qrcall
 */
router.post('/qrcall', auth, async (req, res) => {
  try {
    const { qrData, emergencyType, description } = req.body;

    // 验证QR码
    const verification = await emergencyCallService.verifyQRCode(qrData);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.reason
      });
    }

    // 获取QR码对应的位置信息
    const locationInfo = await getLocationInfo(qrData.locationId);

    const callData = {
      villageId: qrData.villageId,
      callerId: req.user.id,
      location: locationInfo,
      emergencyType,
      description,
      metadata: {
        qrCodeData: qrData
      }
    };

    const result = await emergencyCallService.handleEmergencyCall(callData);

    res.json({
      success: true,
      message: '通过QR码发起的紧急呼叫已发送',
      data: result
    });

  } catch (error) {
    console.error('Error handling QR code call:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'QR码呼叫失败'
    });
  }
});

/**
 * 更新呼叫状态
 * PUT /api/emergency/call/:callId/status
 */
router.put('/call/:callId/status', auth, async (req, res) => {
  try {
    const { callId } = req.params;
    const { status, notes } = req.body;

    // 验证权限
    const call = await EmergencyCall.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: '呼叫记录不存在'
      });
    }

    // 检查是否为呼叫者或响应者
    if (call.callerId.toString() !== req.user.id &&
        call.responderId && call.responderId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权限更新此呼叫状态'
      });
    }

    // 更新状态
    let responderId = req.user.id;
    if (status === 'responded' && !call.responderId) {
      responderId = req.user.id;
    }

    const success = await emergencyCallService.updateCallStatus(
      callId,
      status,
      responderId
    );

    if (notes) {
      await EmergencyCall.findByIdAndUpdate(callId, { notes });
    }

    res.json({
      success: success,
      message: '状态更新成功'
    });

  } catch (error) {
    console.error('Error updating call status:', error);
    res.status(500).json({
      success: false,
      message: '状态更新失败'
    });
  }
});

/**
 * 获取呼叫详情
 * GET /api/emergency/call/:callId
 */
router.get('/call/:callId', auth, async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await EmergencyCall.findById(callId)
      .populate('callerId', 'name phone')
      .populate('responderId', 'name position avatar')
      .populate('notifications.personnelId', 'name position');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: '呼叫记录不存在'
      });
    }

    // 检查权限
    if (call.callerId._id.toString() !== req.user.id &&
        call.responderId && call.responderId._id.toString() !== req.user.id &&
        !req.user.roles.includes('admin') &&
        call.villageId.toString() !== req.user.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权限查看此呼叫详情'
      });
    }

    res.json({
      success: true,
      data: call
    });

  } catch (error) {
    console.error('Error getting call details:', error);
    res.status(500).json({
      success: false,
      message: '获取呼叫详情失败'
    });
  }
});

/**
 * 获取呼叫列表
 * GET /api/emergency/calls
 */
router.get('/calls', auth, async (req, res) => {
  try {
    const {
      villageId,
      status,
      emergencyType,
      page = 1,
      limit = 20,
      dateFrom,
      dateTo
    } = req.query;

    // 构建查询条件
    const query = {};

    // 村民只能查看自己村庄的呼叫
    if (!req.user.roles.includes('admin')) {
      query.villageId = req.user.villageId;
    } else if (villageId) {
      query.villageId = villageId;
    }

    // 非管理员只能查看自己的呼叫或自己响应的呼叫
    if (!req.user.roles.includes('admin')) {
      query.$or = [
        { callerId: req.user.id },
        { responderId: req.user.id }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (emergencyType) {
      query.emergencyType = emergencyType;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const calls = await EmergencyCall.find(query)
      .populate('callerId', 'name phone')
      .populate('responderId', 'name position')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EmergencyCall.countDocuments(query);

    res.json({
      success: true,
      data: {
        calls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting calls list:', error);
    res.status(500).json({
      success: false,
      message: '获取呼叫列表失败'
    });
  }
});

/**
 * 获取活跃呼叫
 * GET /api/emergency/active-calls
 */
router.get('/active-calls', auth, async (req, res) => {
  try {
    const { villageId } = req.query;

    // 使用复合查询优化性能
    const query = {
      status: { $in: ['active', 'responded', 'processing'] }
    };

    // 非管理员只能查看自己村庄的活跃呼叫
    if (!req.user.roles.includes('admin')) {
      query.villageId = req.user.villageId;
    } else if (villageId) {
      query.villageId = villageId;
    }

    const calls = await EmergencyCall.find(query)
      .populate('callerId', 'name phone')
      .populate('responderId', 'name position avatar')
      .sort({ priority: 1, createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: calls
    });

  } catch (error) {
    console.error('Error getting active calls:', error);
    res.status(500).json({
      success: false,
      message: '获取活跃呼叫失败'
    });
  }
});

/**
 * 终止呼叫
 * POST /api/emergency/call/:callId/terminate
 */
router.post('/call/:callId/terminate', auth, async (req, res) => {
  try {
    const { callId } = req.params;
    const { reason, resolution = 'cancelled' } = req.body;

    const call = await EmergencyCall.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: '呼叫记录不存在'
      });
    }

    // 权限检查
    if (call.callerId.toString() !== req.user.id &&
        !req.user.roles.includes('admin') &&
        call.responderId && call.responderId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权限终止此呼叫'
      });
    }

    // 更新状态
    await emergencyCallService.updateCallStatus(callId, 'resolved');

    // 记录终止原因
    await EmergencyCall.findByIdAndUpdate(callId, {
      status: 'resolved',
      resolution,
      notes: reason || '用户手动终止',
      resolvedTime: new Date()
    });

    res.json({
      success: true,
      message: '呼叫已终止'
    });

  } catch (error) {
    console.error('Error terminating call:', error);
    res.status(500).json({
      success: false,
      message: '终止呼叫失败'
    });
  }
});

/**
 * 获取值班人员信息
 * GET /api/emergency/on-duty
 */
router.get('/on-duty', auth, async (req, res) => {
  try {
    const { villageId } = req.query;

    const onDutyPersonnel = await emergencyCallService.getOnDutyPersonnel(
      villageId || req.user.villageId
    );

    res.json({
      success: true,
      data: onDutyPersonnel
    });

  } catch (error) {
    console.error('Error getting on-duty personnel:', error);
    res.status(500).json({
      success: false,
      message: '获取值班人员信息失败'
    });
  }
});

/**
 * 生成QR码
 * POST /api/emergency/qrcode
 */
router.post('/qrcode', auth, async (req, res) => {
  try {
    const { villageId, locationId, locationName } = req.body;

    // 验证权限（只有管理员可以生成QR码）
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: '无权限生成QR码'
      });
    }

    const qrData = emergencyCallService.generateQRCodeData(villageId, locationId);

    // 保存位置信息到数据库（如果需要）
    await saveLocationInfo(locationId, {
      villageId,
      name: locationName,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      data: {
        qrData,
        qrCodeUrl: `/api/emergency/qrcode-image/${locationId}`
      }
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      message: '生成QR码失败'
    });
  }
});

/**
 * 获取QR码图片
 * GET /api/emergency/qrcode-image/:locationId
 */
router.get('/qrcode-image/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;

    // 获取位置信息
    const location = await getLocationInfo(locationId);
    if (!location) {
      return res.status(404).send('Location not found');
    }

    // 生成QR码数据
    const qrData = emergencyCallService.generateQRCodeData(
      location.villageId,
      locationId
    );

    // 使用qrcode库生成QR码图片
    const QRCode = require('qrcode');
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData));

    // 转换base64图片
    const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, '');
    const img = Buffer.from(base64Data, 'base64');

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);

  } catch (error) {
    console.error('Error generating QR code image:', error);
    res.status(500).send('Error generating QR code');
  }
});

/**
 * 获取紧急统计数据
 * GET /api/emergency/stats
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const { villageId, dateFrom, dateTo } = req.query;

    // 构建查询条件
    const matchCondition = {};

    if (!req.user.roles.includes('admin')) {
      matchCondition.villageId = req.user.villageId;
    } else if (villageId) {
      matchCondition.villageId = mongoose.Types.ObjectId(villageId);
    }

    if (dateFrom || dateTo) {
      matchCondition.createdAt = {};
      if (dateFrom) matchCondition.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchCondition.createdAt.$lte = new Date(dateTo);
    }

    // 聚合查询统计
    const stats = await EmergencyCall.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            emergencyType: '$emergencyType',
            status: '$status'
          },
          count: { $sum: 1 },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $ne: ['$responseTime', null] },
                { $divide: [{ $subtract: ['$responseTime', '$createdAt'] }, 1000] },
                null
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.emergencyType',
          total: { $sum: '$count' },
          details: {
            $push: {
              status: '$_id.status',
              count: '$count',
              avgResponseTime: '$avgResponseTime'
            }
          }
        }
      }
    ]);

    // 总体统计
    const overallStats = await EmergencyCall.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          resolvedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          activeCalls: {
            $sum: { $cond: [{ $in: ['$status', ['active', 'responded', 'processing']] }, 1, 0] }
          },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $ne: ['$responseTime', null] },
                { $divide: [{ $subtract: ['$responseTime', '$createdAt'] }, 1000] },
                null
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byType: stats,
        overall: overallStats[0] || {
          totalCalls: 0,
          resolvedCalls: 0,
          activeCalls: 0,
          avgResponseTime: 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting emergency stats:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

// 辅助函数
async function getLocationInfo(locationId) {
  // TODO: 从数据库获取位置信息
  return {
    locationId,
    villageId: '60d5f7f8a3b9b83a9c8c8c8c',
    address: '示例地址',
    latitude: 30.5728,
    longitude: 104.0668,
    description: '示例位置描述'
  };
}

async function saveLocationInfo(locationId, info) {
  // TODO: 保存位置信息到数据库
  console.log('Saving location info:', locationId, info);
}

module.exports = router;