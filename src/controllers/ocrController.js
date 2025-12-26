const enhancedOCRService = require('../services/enhancedOCRService');
const batchDocumentProcessor = require('../services/batchDocumentProcessor');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/ocr');
    fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 50 // 最多50个文件
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。只允许图片和PDF文件。'));
    }
  }
});

/**
 * OCR控制器
 */
class OCRController {
  /**
   * 单张票据识别
   */
  async recognizeInvoice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传图片文件'
        });
      }

      const options = {
        invoiceType: req.body.invoiceType || 'auto',
        provider: req.body.provider || 'auto',
        enablePreprocessing: req.body.enablePreprocessing === 'true',
        enableValidation: req.body.enableValidation !== 'false',
        enableClassification: req.body.enableClassification === 'true'
      };

      const result = await enhancedOCRService.recognizeInvoice(req.file.path, options);

      // 清理上传的文件
      await this.cleanupFile(req.file.path);

      res.json({
        success: true,
        message: result.success ? '票据识别成功' : '票据识别失败',
        data: result.data,
        metadata: result.metadata,
        error: result.error
      });

    } catch (error) {
      logger.error('票据识别失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '票据识别失败',
        error: error.message
      });
    }
  }

  /**
   * 批量票据识别
   */
  async batchRecognize(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请上传图片文件'
        });
      }

      const options = {
        maxConcurrency: parseInt(req.body.maxConcurrency) || 5,
        enableParallel: req.body.enableParallel !== 'false',
        skipDuplicates: req.body.skipDuplicates === 'true',
        progressCallback: (stats) => {
          // 通过WebSocket发送进度更新
          if (req.app.locals.io) {
            req.app.locals.io.to(req.user.id).emit('ocr_progress', stats);
          }
        }
      };

      // 准备文件列表
      const files = req.files.map(file => ({
        path: file.path,
        originalName: file.originalname,
        size: file.size,
        type: file.mimetype
      }));

      const result = await enhancedOCRService.batchProcessInvoices(files, options);

      // 清理上传的文件
      await this.cleanupFiles(req.files);

      res.json({
        success: true,
        message: '批量处理完成',
        data: result.results,
        stats: result.stats,
        report: result.report
      });

    } catch (error) {
      logger.error('批量票据识别失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量票据识别失败',
        error: error.message
      });
    }
  }

  /**
   * 提交批量处理任务
   */
  async submitBatchJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请上传图片文件'
        });
      }

      const options = {
        ocr: {
          provider: req.body.ocrProvider || 'auto',
          enablePreprocessing: req.body.enablePreprocessing !== 'false',
          enableValidation: req.body.enableValidation !== 'false'
        },
        classification: {
          enableClassification: req.body.enableClassification === 'true',
          enableRiskAssessment: req.body.enableRiskAssessment === 'true'
        },
        output: {
          format: req.body.outputFormat || 'json',
          includeImages: req.body.includeImages === 'true',
          includeMetadata: req.body.includeMetadata !== 'false'
        },
        retry: {
          maxAttempts: parseInt(req.body.maxRetries) || 3,
          delay: parseInt(req.body.retryDelay) || 1000
        }
      };

      // 准备文件列表
      const files = req.files.map(file => ({
        path: file.path,
        originalName: file.originalname,
        size: file.size,
        type: file.mimetype
      }));

      const batchResult = await batchDocumentProcessor.submitBatch(files, options);

      res.status(202).json({
        success: true,
        message: '批量处理任务已提交',
        data: batchResult
      });

    } catch (error) {
      logger.error('提交批量处理任务失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '提交批量处理任务失败',
        error: error.message
      });
    }
  }

  /**
   * 获取批量任务状态
   */
  async getBatchStatus(req, res) {
    try {
      const { batchId } = req.params;

      if (!batchId) {
        return res.status(400).json({
          success: false,
          message: '批次ID不能为空'
        });
      }

      const status = await batchDocumentProcessor.getBatchStatus(batchId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('获取批量任务状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取批量任务状态失败',
        error: error.message
      });
    }
  }

  /**
   * 取消批量任务
   */
  async cancelBatch(req, res) {
    try {
      const { batchId } = req.params;

      if (!batchId) {
        return res.status(400).json({
          success: false,
          message: '批次ID不能为空'
        });
      }

      const cancelled = await batchDocumentProcessor.cancelBatch(batchId);

      res.json({
        success: true,
        message: cancelled ? '批量任务已取消' : '批量任务无法取消',
        cancelled
      });

    } catch (error) {
      logger.error('取消批量任务失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '取消批量任务失败',
        error: error.message
      });
    }
  }

  /**
   * 财务凭证分类
   */
  async classifyDocument(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文档文件'
        });
      }

      const options = {
        documentType: req.body.documentType || 'auto',
        category: req.body.category || 'auto',
        enableDetailAnalysis: req.body.enableDetailAnalysis === 'true'
      };

      const result = await enhancedOCRService.classifyFinancialDocument(req.file.path, options);

      // 清理上传的文件
      await this.cleanupFile(req.file.path);

      res.json({
        success: true,
        message: '文档分类完成',
        data: result.data
      });

    } catch (error) {
      logger.error('财务凭证分类失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '财务凭证分类失败',
        error: error.message
      });
    }
  }

  /**
   * 获取OCR服务状态
   */
  async getServiceStatus(req, res) {
    try {
      const status = {
        ocr: {
          providers: {
            baidu: !!process.env.BAIDU_OCR_API_KEY && !!process.env.BAIDU_OCR_SECRET_KEY,
            tencent: !!process.env.TENCENT_SECRET_ID && !!process.env.TENCENT_SECRET_KEY,
            ali: !!process.env.ALI_ACCESS_KEY_ID && !!process.env.ALI_ACCESS_KEY_SECRET
          },
          templates: await this.getAvailableTemplates()
        },
        processor: {
          stats: batchDocumentProcessor.getProcessingStats(),
          config: batchDocumentProcessor.config
        },
        performance: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
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
        message: error.message || '获取服务状态失败',
        error: error.message
      });
    }
  }

  /**
   * 获取处理统计
   */
  async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const stats = {
        processing: batchDocumentProcessor.getProcessingStats(),
        performance: await this.getPerformanceStats(),
        trends: await this.getProcessingTrends(startDate, endDate)
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('获取统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取统计信息失败',
        error: error.message
      });
    }
  }

  /**
   * 获取可用模板
   */
  async getAvailableTemplates() {
    try {
      // 这里应该从模板服务获取可用模板
      return [
        { type: 'vat_special', name: '增值税专用发票' },
        { type: 'vat_general', name: '增值税普通发票' },
        { type: 'electronic', name: '电子发票' },
        { type: 'receipt', name: '收据' },
        { type: 'vehicle_sales', name: '机动车销售发票' },
        { type: 'real_estate', name: '不动产销售发票' }
      ];
    } catch (error) {
      logger.error('获取可用模板失败:', error);
      return [];
    }
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStats() {
    try {
      const usage = process.cpuUsage();
      const memory = process.memoryUsage();

      return {
        cpu: {
          user: usage.user,
          system: usage.system
        },
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external
        },
        uptime: process.uptime()
      };
    } catch (error) {
      logger.error('获取性能统计失败:', error);
      return null;
    }
  }

  /**
   * 获取处理趋势
   */
  async getProcessingTrends(startDate, endDate) {
    try {
      // 这里应该从数据库获取历史处理数据
      // 返回模拟数据
      return {
        daily: [],
        weekly: [],
        monthly: []
      };
    } catch (error) {
      logger.error('获取处理趋势失败:', error);
      return { daily: [], weekly: [], monthly: [] };
    }
  }

  /**
   * 清理单个文件
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('清理文件失败:', filePath, error);
    }
  }

  /**
   * 清理多个文件
   */
  async cleanupFiles(files) {
    for (const file of files) {
      await this.cleanupFile(file.path);
    }
  }
}

module.exports = new OCRController();