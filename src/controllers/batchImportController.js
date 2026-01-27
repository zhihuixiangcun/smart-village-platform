/**
 * 村民批量导入控制器
 * 处理文件上传、导入任务管理和进度跟踪
 */

const ResidentBatchImportService = require('../services/batch-import/ResidentBatchImportService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 初始化批量导入服务
const batchImportService = new ResidentBatchImportService();

// 配置文件上传
const storage = multer.diskStorage({
  destination (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'batch-import');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename (req, file, cb) {
    const uniqueSuffix = `${Date.now()  }-${  Math.random().toString(36).substr(2, 9)}`;
    cb(null, `import-${  uniqueSuffix  }${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter (req, file, cb) {
    const allowedFormats = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，请上传 Excel (.xlsx, .xls) 或 CSV 文件'));
    }
  }
});

/**
 * 上传文件并创建导入任务
 */
async function uploadAndCreateTask(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const userId = req.user ? req.user.id : 'system';
    const taskId = await batchImportService.createImportTask(userId, req.file);

    res.json({
      success: true,
      message: '文件上传成功，已创建导入任务',
      data: {
        taskId,
        fileName: req.file.originalname,
        fileSize: req.file.size
      }
    });

    // 异步执行导入
    batchImportService.executeImport(taskId).catch(error => {
      logger.error('导入任务执行失败', { taskId, error: error.message });
    });

  } catch (error) {
    logger.error('创建导入任务失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `创建导入任务失败: ${  error.message}`
    });
  }
}

/**
 * 获取任务状态
 */
async function getTaskStatus(req, res) {
  try {
    const { taskId } = req.params;

    const status = batchImportService.getTaskStatus(taskId);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('获取任务状态失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `获取任务状态失败: ${  error.message}`
    });
  }
}

/**
 * 获取所有任务列表
 */
async function getAllTasks(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const tasks = batchImportService.getAllTasks(userId);

    res.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    logger.error('获取任务列表失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `获取任务列表失败: ${  error.message}`
    });
  }
}

/**
 * 取消任务
 */
async function cancelTask(req, res) {
  try {
    const { taskId } = req.params;

    batchImportService.cancelTask(taskId);

    res.json({
      success: true,
      message: '任务已取消'
    });

  } catch (error) {
    logger.error('取消任务失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `取消任务失败: ${  error.message}`
    });
  }
}

/**
 * 下载导入模板
 */
async function downloadTemplate(req, res) {
  try {
    const template = await batchImportService.generateTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=resident-import-template.xlsx');

    res.send(template);

  } catch (error) {
    logger.error('下载模板失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `下载模板失败: ${  error.message}`
    });
  }
}

/**
 * 获取导入统计信息
 */
async function getImportStats(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const tasks = batchImportService.getAllTasks(userId);

    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      totalImported: tasks.reduce((sum, t) => sum + (t.success || 0), 0),
      totalFailed: tasks.reduce((sum, t) => sum + (t.failed || 0), 0)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('获取导入统计失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `获取导入统计失败: ${  error.message}`
    });
  }
}

/**
 * 下载导入报告
 */
async function downloadReport(req, res) {
  try {
    const { taskId } = req.params;
    const report = batchImportService.generateReport(taskId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=import-report-${taskId}.xlsx`);

    res.send(report);

  } catch (error) {
    logger.error('下载报告失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `下载报告失败: ${  error.message}`
    });
  }
}

/**
 * 验证数据格式
 */
async function validateData(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要验证的文件'
      });
    }

    const validation = await batchImportService.validateFile(req.file);

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    logger.error('验证数据失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `验证数据失败: ${  error.message}`
    });
  }
}

/**
 * 批量导入村民数据（前端API调用）
 * 直接返回导入结果，而非创建异步任务
 */
async function importResidents(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const userId = req.user ? req.user.id : 'system';
    const villageId = req.body.villageId || 'default';
    const skipDuplicates = req.body.skipDuplicates !== 'false';
    const updateExisting = req.body.updateExisting === 'true';

    // 执行同步导入
    const result = await batchImportService.importResidentsSync({
      userId,
      villageId,
      file: req.file,
      skipDuplicates,
      updateExisting
    });

    res.json({
      success: true,
      message: '导入完成',
      data: result
    });

  } catch (error) {
    logger.error('批量导入失败', { error: error.message });
    res.status(500).json({
      success: false,
      message: `批量导入失败: ${  error.message}`
    });
  }
}

// 导出路由处理器
module.exports = {
  upload: upload.single('file'),
  uploadAndCreateTask,
  getTaskStatus,
  getAllTasks,
  cancelTask,
  downloadTemplate,
  getImportStats,
  downloadReport,
  validateData,
  importResidents,
  batchImportService // 导出服务实例，用于WebSocket通知
};
