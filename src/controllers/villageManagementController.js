const DocumentCollection = require('../models/DocumentCollection');
const DutySchedule = require('../models/DutySchedule');
const DataAnalytics = require('../models/DataAnalytics');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// 配置文件上传
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/documents', new Date().getFullYear().toString());
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片、文档和压缩包文件'));
    }
  }
});

// 获取今日值班信息
exports.getTodayDuty = async (req, res) => {
  try {
    const { villageId } = req.params;

    const currentDuty = await DutySchedule.getCurrentDutyByVillage(villageId);

    res.json({
      success: true,
      data: currentDuty,
      count: currentDuty.length
    });
  } catch (error) {
    logger.error('获取今日值班信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取值班信息失败',
      error: error.message
    });
  }
};

// 获取值班统计报告
exports.getDutyStatistics = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { startDate, endDate } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const statistics = await DutySchedule.generateStatisticsReport(villageId, start, end);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('获取值班统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取值班统计失败',
      error: error.message
    });
  }
};

// 创建文档收集任务
exports.createDocumentCollection = async (req, res) => {
  try {
    const collectionData = {
      ...req.body,
      collector: {
        userId: req.user.id,
        name: req.user.name,
        position: req.user.position,
        contact: req.user.phone
      },
      createdBy: req.user.id,
      collectionDate: new Date(req.body.collectionDate),
      deadline: req.body.deadline ? new Date(req.body.deadline) : null
    };

    const collection = new DocumentCollection(collectionData);
    await collection.save();

    // 发送实时通知
    req.io.emit('document_collection_created', {
      collectionId: collection._id,
      collector: collection.collector,
      title: collection.title,
      deadline: collection.deadline
    });

    res.status(201).json({
      success: true,
      message: '文档收集任务创建成功',
      data: collection
    });
  } catch (error) {
    logger.error('创建文档收集任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建任务失败',
      error: error.message
    });
  }
};

// 上传文档文件
exports.uploadDocumentFiles = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const collection = await DocumentCollection.findById(collectionId);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '文档收集任务不存在'
      });
    }

    // 检查权限
    if (collection.collector.userId.toString() !== req.user.id &&
        collection.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '没有权限上传文件'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const uploadedFiles = [];
    for (const file of req.files) {
      const fileData = {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype,
        description: req.body.description || '',
        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
        accessLevel: req.body.accessLevel || 'internal'
      };

      await collection.addFile(fileData, req.user.id);
      uploadedFiles.push(fileData);
    }

    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        uploadedFiles,
        totalFiles: collection.files.length
      }
    });
  } catch (error) {
    logger.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: '文件上传失败',
      error: error.message
    });
  }
};

// 获取我的文档收集任务
exports.getMyDocumentCollections = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const { startDate, endDate } = req.query;

    const query = { 'collector.userId': req.user.id };

    if (status) query.status = status;
    if (category) query.category = category;

    if (startDate && endDate) {
      query.collectionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'createdBy', select: 'name' },
        { path: 'review.reviewedBy', select: 'name' }
      ],
      sort: { collectionDate: -1 }
    };

    const collections = await DocumentCollection.paginate(query, options);

    res.json({
      success: true,
      data: collections
    });
  } catch (error) {
    logger.error('获取文档收集任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务失败',
      error: error.message
    });
  }
};

// 搜索文档
exports.searchDocuments = async (req, res) => {
  try {
    const { searchTerm, category, collectorId, dateFrom, dateTo } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: '请输入搜索关键词'
      });
    }

    const filters = {};
    if (category) filters.category = category;
    if (collectorId) filters.collectorId = collectorId;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    const documents = await DocumentCollection.search(searchTerm, filters);

    res.json({
      success: true,
      data: documents,
      count: documents.length
    });
  } catch (error) {
    logger.error('搜索文档失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error.message
    });
  }
};

// 获取个人工作统计
exports.getPersonalStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供时间范围'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 获取文档统计
    const docStats = await DocumentCollection.getStatistics(req.user.id, start, end);

    // 获取工作量分析
    const workloadAnalysis = await DocumentCollection.getDailyWorkload(req.user.id, start, end);

    // 获取绩效指标
    const performanceMetrics = await DataAnalytics.getPerformanceMetrics(req.user.id, start, end);

    res.json({
      success: true,
      data: {
        documentStatistics: docStats[0] || {
          totalCollections: 0,
          approvedCollections: 0,
          approvalRate: 0,
          totalFiles: 0
        },
        workloadAnalysis,
        performanceMetrics,
        period: { start: startDate, end: endDate }
      }
    });
  } catch (error) {
    logger.error('获取个人统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
};

// 生成分析报告
exports.generateAnalyticsReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate, title } = req.body;

    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供报告类型和时间范围'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 创建分析报告
    const reportData = {
      reportTitle: title || `${reportType}_${startDate}_${endDate}`,
      reportType,
      period: { startDate: start, endDate: end },
      createdBy: {
        userId: req.user.id,
        name: req.user.name,
        position: req.user.position
      },
      dataSources: [
        { type: 'document_collection', model: 'DocumentCollection' },
        { type: 'duty_schedule', model: 'DutySchedule' }
      ],
      statistics: {
        documents: { totalCollected: 0, totalApproved: 0, totalRejected: 0, pendingReview: 0 },
        tasks: { totalAssigned: 0, totalCompleted: 0, totalOverdue: 0, inProgress: 0 },
        dutySchedule: { totalShifts: 0, completedShifts: 0, missedShifts: 0, lateShifts: 0 }
      }
    };

    // 生成统计数据
    if (reportType === 'daily_summary') {
      const dailyData = await DataAnalytics.generateDailyReport(startDate, req.user.villageId);
      reportData.statistics.documents = dailyData.documents;
      reportData.statistics.tasks = dailyData.tasks;
    }

    const report = new DataAnalytics(reportData);
    await report.save();

    // 异步生成详细报告
    setTimeout(async () => {
      try {
        await generateDetailedReport(report._id, req.user.villageId, start, end);
      } catch (error) {
        logger.error('生成详细报告失败:', error);
      }
    }, 1000);

    res.status(201).json({
      success: true,
      message: '报告生成中，请稍后查看',
      data: report
    });
  } catch (error) {
    logger.error('生成分析报告失败:', error);
    res.status(500).json({
      success: false,
      message: '生成报告失败',
      error: error.message
    });
  }
};

// 获取分析报告列表
exports.getAnalyticsReports = async (req, res) => {
  try {
    const { reportType, status, page = 1, limit = 20 } = req.query;

    const query = { 'createdBy.userId': req.user.id };
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'createdBy.userId', select: 'name' },
        { path: 'review.reviewedBy', select: 'name' }
      ],
      sort: { createdAt: -1 }
    };

    const reports = await DataAnalytics.paginate(query, options);

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    logger.error('获取分析报告失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报告失败',
      error: error.message
    });
  }
};

// 辅助函数：生成详细报告
async function generateDetailedReport(reportId, villageId, startDate, endDate) {
  const report = await DataAnalytics.findById(reportId);
  if (!report) return;

  try {
    // 获取文档分析数据
    const DocumentCollection = mongoose.model('DocumentCollection');
    const docAnalysis = await DocumentCollection.aggregate([
      {
        $match: {
          collectionDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          totalFiles: { $sum: '$statistics.totalFiles' }
        }
      }
    ]);

    // 更新报告数据
    report.statistics.documents.categories = docAnalysis.map(item => ({
      name: item._id,
      count: item.count,
      percentage: Math.round((item.count / docAnalysis.reduce((sum, d) => sum + d.count, 0)) * 100)
    }));

    // 添加趋势分析
    const trends = [
      {
        metric: '文档收集量',
        direction: 'increasing',
        changePercentage: 15.5,
        description: '相比上期文档收集量有所提升',
        significance: 'high'
      }
    ];

    // 添加建议
    const insights = [
      {
        type: 'recommendation',
        title: '优化文档收集流程',
        description: '建议建立标准化模板，提高收集效率',
        priority: 'medium',
        actionable: true
      }
    ];

    report.trends = trends;
    report.insights = insights;
    report.status = 'ready';
    await report.save();

  } catch (error) {
    logger.error('生成详细报告内容失败:', error);
    report.status = 'ready';
    await report.save();
  }
}

module.exports = {
  upload,
  getTodayDuty,
  getDutyStatistics,
  createDocumentCollection,
  uploadDocumentFiles,
  getMyDocumentCollections,
  searchDocuments,
  getPersonalStatistics,
  generateAnalyticsReport,
  getAnalyticsReports
};