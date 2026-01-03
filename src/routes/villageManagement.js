const express = require('express');
const router = express.Router();
const villageController = require('../controllers/villageManagementController');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// 值班管理路由
router.get('/duty/today/:villageId', auth.authenticate, villageController.getTodayDuty);
router.get('/duty/statistics/:villageId', auth.authenticate, villageController.getDutyStatistics);

// 文档收集路由
router.post('/documents', auth.authenticate, villageController.createDocumentCollection);
router.post('/documents/:collectionId/files',
  auth,
  villageController.upload.array('files', 10),
  villageController.uploadDocumentFiles
);
router.get('/documents/my', auth.authenticate, villageController.getMyDocumentCollections);
router.get('/documents/search', auth.authenticate, villageController.searchDocuments);

// 统计分析路由
router.get('/statistics/personal', auth.authenticate, villageController.getPersonalStatistics);
router.post('/analytics/reports', auth.authenticate, villageController.generateAnalyticsReport);
router.get('/analytics/reports', auth.authenticate, villageController.getAnalyticsReports);

// 获取文档文件（下载）
router.get('/documents/:collectionId/files/:fileId', auth.authenticate, async (req, res) => {
  try {
    const DocumentCollection = require('../models/DocumentCollection');
    const collection = await DocumentCollection.findById(req.params.collectionId);

    if (!collection) {
      return res.status(404).json({ success: false, message: '文档集合不存在' });
    }

    const file = collection.files.id(req.params.fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }

    // 检查权限
    const hasPermission = file.isPublic ||
                         file.accessLevel === 'public' ||
                         collection.collector.userId.toString() === req.user.id ||
                         collection.createdBy.toString() === req.user.id;

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: '没有权限访问此文件' });
    }

    // 增加下载计数
    await collection.incrementDownload();

    const path = require('path');
    res.sendFile(path.resolve(file.path));
  } catch (error) {
    logger.error('文件下载失败:', error);
    res.status(500).json({ success: false, message: '文件下载失败' });
  }
});

// 更新文档收集状态
router.put('/documents/:collectionId/status', auth.authenticate, async (req, res) => {
  try {
    const DocumentCollection = require('../models/DocumentCollection');
    const { status, notes } = req.body;

    const collection = await DocumentCollection.findById(req.params.collectionId);
    if (!collection) {
      return res.status(404).json({ success: false, message: '文档收集任务不存在' });
    }

    // 检查权限
    if (collection.collector.userId.toString() !== req.user.id &&
        collection.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: '没有权限修改状态' });
    }

    await collection.updateStatus(status, req.user.id, notes);

    // 发送实时通知
    req.io.emit('document_status_updated', {
      collectionId: collection._id,
      status,
      updatedBy: req.user.name
    });

    res.json({
      success: true,
      message: '状态更新成功',
      data: collection
    });
  } catch (error) {
    logger.error('更新状态失败:', error);
    res.status(500).json({ success: false, message: '更新状态失败' });
  }
});

// 删除文档文件
router.delete('/documents/:collectionId/files/:fileId', auth.authenticate, async (req, res) => {
  try {
    const DocumentCollection = require('../models/DocumentCollection');
    const fs = require('fs').promises;
    const path = require('path');

    const collection = await DocumentCollection.findById(req.params.collectionId);
    if (!collection) {
      return res.status(404).json({ success: false, message: '文档集合不存在' });
    }

    // 检查权限
    if (collection.collector.userId.toString() !== req.user.id &&
        collection.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: '没有权限删除文件' });
    }

    const file = collection.files.id(req.params.fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }

    // 删除物理文件
    try {
      await fs.unlink(file.path);
    } catch (error) {
      logger.error('删除物理文件失败:', error);
    }

    // 从数据库中删除文件记录
    file.remove();
    await collection.save();

    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    logger.error('删除文件失败:', error);
    res.status(500).json({ success: false, message: '删除文件失败' });
  }
});

// 获取村庄工作总览（村委领导专用）
router.get('/overview/:villageId', auth.authenticate, async (req, res) => {
  try {
    const DocumentCollection = require('../models/DocumentCollection');
    const DutySchedule = require('../models/DutySchedule');
    const { startDate, endDate } = req.query;

    const start = new Date(startDate || new Date().setDate(new Date().getDate() - 7));
    const end = new Date(endDate || new Date());

    // 获取文档统计
    const docStats = await DocumentCollection.aggregate([
      {
        $match: {
          collectionDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalCollections: { $sum: 1 },
          totalFiles: { $sum: '$statistics.totalFiles' },
          totalSize: { $sum: '$statistics.totalSize' },
          byCategory: {
            $push: {
              category: '$category',
              count: 1
            }
          },
          byStatus: {
            $push: {
              status: '$status',
              count: 1
            }
          }
        }
      }
    ]);

    // 获取值班统计
    const dutyStats = await DutySchedule.aggregate([
      {
        $match: {
          'assignments.date': { $gte: start, $lte: end }
        }
      },
      {
        $unwind: '$assignments'
      },
      {
        $group: {
          _id: '$assignments.status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 获取活跃用户统计
    const activeUsers = await DocumentCollection.aggregate([
      {
        $match: {
          collectionDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$collector.userId',
          userName: { $first: '$collector.name' },
          collectionsCount: { $sum: 1 },
          filesCount: { $sum: '$statistics.totalFiles' }
        }
      },
      {
        $sort: { collectionsCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        documentStatistics: docStats[0] || {
          totalCollections: 0,
          totalFiles: 0,
          totalSize: 0
        },
        dutyStatistics: dutyStats,
        activeUsers,
        period: { start, end }
      }
    });
  } catch (error) {
    logger.error('获取村庄总览失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

// 一键呼叫值班人员
router.post('/duty/call/:villageId', auth.authenticate, async (req, res) => {
  try {
    const DutySchedule = require('../models/DutySchedule');
    const logger = require('../utils/logger');
    const { emergency = false, message = '' } = req.body;

    const currentDuty = await DutySchedule.getCurrentDutyByVillage(req.params.villageId);

    if (currentDuty.length === 0) {
      return res.status(404).json({ success: false, message: '当前没有值班人员' });
    }

    // 发送紧急通知给值班人员
    const notifications = currentDuty.map(duty => ({
      userId: duty.user._id,
      title: emergency ? '紧急呼叫' : '值班呼叫',
      message: message || '村委会需要您立即响应',
      type: emergency ? 'emergency' : 'duty_call',
      data: {
        callerName: req.user.name,
        callerPhone: req.user.phone,
        villageId: req.params.villageId
      }
    }));

    // 这里可以集成短信、电话或其他通知方式
    req.io.emit('emergency_call', {
      dutyOfficers: currentDuty,
      message,
      caller: req.user.name,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: '呼叫已发送',
      data: {
        calledOfficers: currentDuty.map(duty => ({
          name: duty.userName,
          phone: duty.userPhone,
          position: duty.userRole
        }))
      }
    });
  } catch (error) {
    logger.error('呼叫值班人员失败:', error);
    res.status(500).json({ success: false, message: '呼叫失败' });
  }
});

module.exports = router;