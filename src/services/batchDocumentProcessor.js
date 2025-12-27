/**
 * 批量票据处理引擎
 * 提供高性能、可扩展的批量文档处理能力
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');
const cluster = require('cluster');
const os = require('os');
const enhancedOCRService = require('./enhancedOCRService');
const documentClassifier = require('./ai/documentClassifier');
const logger = require('../utils/logger');

class BatchDocumentProcessor extends EventEmitter {
  constructor() {
    super();

    // 配置参数
    this.config = {
      maxConcurrency: 3,                    // 最大并发数
      maxQueueSize: 1000,                  // 最大队列大小
      batchSize: 50,                       // 批处理大小
      retryAttempts: 3,                    // 重试次数
      retryDelay: 1000,                    // 重试延迟(ms)
      progressReportInterval: 5000,         // 进度报告间隔(ms)
      cleanupInterval: 30000,              // 清理间隔(ms)
      enableClustering: false,              // 是否启用集群模式
      workerCount: os.cpus().length,       // 工作进程数
      tempDir: path.join(__dirname, '../../temp'), // 临时目录
      resultDir: path.join(__dirname, '../../results'), // 结果目录
      enablePersistence: true,             // 启用持久化
      compressionEnabled: true             // 启用压缩
    };

    // 处理队列
    this.processingQueue = [];
    this.completedQueue = [];
    this.failedQueue = [];

    // 状态管理
    this.isProcessing = false;
    this.processingStats = {
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      startTime: null,
      endTime: null,
      currentBatch: 0,
      totalBatches: 0
    };

    // 工作进程池
    this.workerPool = [];
    this.availableWorkers = [];

    // 缓存管理
    this.processingCache = new Map();
    this.resultCache = new Map();

    // 错误处理
    this.errorHandler = new ErrorHandler();

    // 性能监控
    this.performanceMonitor = new PerformanceMonitor();

    // 初始化
    this.initialize();
  }

  /**
   * 初始化批量处理器
   */
  async initialize() {
    try {
      // 创建必要的目录
      await this.createDirectories();

      // 初始化工作进程（如果启用集群模式）
      if (this.config.enableClustering && cluster.isMaster) {
        await this.initializeWorkers();
      }

      // 启动清理任务
      this.startCleanupTask();

      // 设置事件监听器
      this.setupEventListeners();

      logger.debug('批量文档处理器初始化完成');
    } catch (error) {
      logger.error('批量文档处理器初始化失败:', error);
    }
  }

  /**
   * 创建必要的目录
   */
  async createDirectories() {
    const directories = [
      this.config.tempDir,
      this.config.resultDir,
      path.join(this.config.tempDir, 'processing'),
      path.join(this.config.tempDir, 'completed'),
      path.join(this.config.resultDir, 'batches'),
      path.join(this.config.resultDir, 'reports')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        logger.warn(`创建目录失败: ${dir}`, error);
      }
    }
  }

  /**
   * 初始化工作进程
   */
  async initializeWorkers() {
    if (!this.config.enableClustering) return;

    for (let i = 0; i < this.config.workerCount; i++) {
      const worker = cluster.fork();

      worker.on('online', () => {
        logger.debug(`工作进程 ${worker.process.pid} 启动`);
        this.availableWorkers.push(worker);
      });

      worker.on('message', (message) => {
        this.handleWorkerMessage(worker, message);
      });

      worker.on('error', (error) => {
        logger.error(`工作进程 ${worker.process.pid} 错误:`, error);
        this.errorHandler.handleWorkerError(worker, error);
      });

      worker.on('exit', (code, signal) => {
        logger.debug(`工作进程 ${worker.process.pid} 退出: ${code}, ${signal}`);
        this.handleWorkerExit(worker);
      });

      this.workerPool.push(worker);
    }
  }

  /**
   * 提交批量处理任务
   */
  async submitBatch(files, options = {}) {
    try {
      const batchId = this.generateBatchId();
      const batch = {
        id: batchId,
        files: this.prepareFiles(files),
        options: this.mergeOptions(options),
        status: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0
      };

      // 验证批次
      const validation = await this.validateBatch(batch);
      if (!validation.valid) {
        throw new Error(`批次验证失败: ${validation.errors.join(', ')}`);
      }

      // 添加到队列
      this.processingQueue.push(batch);

      // 持久化批次信息
      if (this.config.enablePersistence) {
        await this.saveBatchInfo(batch);
      }

      // 启动处理
      this.startProcessing();

      this.emit('batch_submitted', { batchId, fileCount: files.length });

      return {
        batchId,
        status: 'queued',
        fileCount: files.length,
        estimatedDuration: this.estimateDuration(files.length)
      };

    } catch (error) {
      logger.error('提交批量处理失败:', error);
      throw error;
    }
  }

  /**
   * 准备文件列表
   */
  prepareFiles(files) {
    return files.map((file, index) => ({
      id: crypto.randomBytes(16).toString('hex'),
      index,
      path: file.path || file,
      originalName: file.originalName || path.basename(file),
      size: file.size || 0,
      type: file.type || 'unknown',
      checksum: file.checksum || '',
      status: 'pending',
      result: null,
      error: null,
      processingTime: 0,
      retryCount: 0
    }));
  }

  /**
   * 合并选项
   */
  mergeOptions(options) {
    return {
      // OCR选项
      ocr: {
        provider: options.ocr?.provider || 'auto',
        enablePreprocessing: options.ocr?.enablePreprocessing !== false,
        enableValidation: options.ocr?.enableValidation !== false,
        ...options.ocr
      },

      // 分类选项
      classification: {
        enableClassification: options.classification?.enableClassification !== false,
        enableRiskAssessment: options.classification?.enableRiskAssessment !== false,
        ...options.classification
      },

      // 输出选项
      output: {
        format: options.output?.format || 'json',
        includeImages: options.output?.includeImages || false,
        includeMetadata: options.output?.includeMetadata !== false,
        compression: options.output?.compression !== false,
        ...options.output
      },

      // 重试选项
      retry: {
        maxAttempts: options.retry?.maxAttempts || this.config.retryAttempts,
        delay: options.retry?.delay || this.config.retryDelay,
        ...options.retry
      }
    };
  }

  /**
   * 验证批次
   */
  async validateBatch(batch) {
    const errors = [];
    const warnings = [];

    // 检查文件数量
    if (batch.files.length === 0) {
      errors.push('批次中没有文件');
    }

    // 检查文件存在性
    for (const file of batch.files) {
      try {
        const stats = await fs.stat(file.path);
        if (stats.size === 0) {
          warnings.push(`文件 ${file.originalName} 为空`);
        }
        if (stats.size > 50 * 1024 * 1024) { // 50MB
          warnings.push(`文件 ${file.originalName} 过大 (>50MB)`);
        }
      } catch (error) {
        errors.push(`文件 ${file.originalName} 不存在或无法访问: ${error.message}`);
      }
    }

    // 检查队列容量
    if (this.processingQueue.length + this.processingStats.processed >= this.config.maxQueueSize) {
      errors.push('处理队列已满');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 启动处理
   */
  startProcessing() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.processingStats.startTime = Date.now();

    this.processNextBatch();
  }

  /**
   * 处理下一批次
   */
  async processNextBatch() {
    if (this.processingQueue.length === 0) {
      this.isProcessing = false;
      this.processingStats.endTime = Date.now();
      this.emit('processing_complete', this.processingStats);
      return;
    }

    // 获取下一批次
    const batch = this.processingQueue.shift();
    batch.status = 'processing';
    batch.startedAt = new Date();

    this.processingStats.currentBatch++;
    this.processingStats.totalBatches = Math.ceil(batch.files.length / this.config.batchSize);

    // 分割文件块
    const fileChunks = this.createFileChunks(batch.files, this.config.batchSize);

    // 处理每个文件块
    try {
      if (this.config.enableClustering && this.availableWorkers.length > 0) {
        await this.processChunkWithWorkers(batch, fileChunks[0]);
      } else {
        await this.processChunkDirectly(batch, fileChunks[0]);
      }

      // 处理剩余的文件块
      for (let i = 1; i < fileChunks.length; i++) {
        await this.delay(100); // 避免过载
        if (this.config.enableClustering && this.availableWorkers.length > 0) {
          await this.processChunkWithWorkers(batch, fileChunks[i]);
        } else {
          await this.processChunkDirectly(batch, fileChunks[i]);
        }
      }

      // 完成批次处理
      await this.completeBatch(batch);

    } catch (error) {
      logger.error(`批次 ${batch.id} 处理失败:`, error);
      await this.handleBatchError(batch, error);
    }

    // 继续处理下一批次
    setImmediate(() => this.processNextBatch());
  }

  /**
   * 创建文件块
   */
  createFileChunks(files, chunkSize) {
    const chunks = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 使用工作进程处理文件块
   */
  async processChunkWithWorkers(batch, fileChunk) {
    const worker = this.availableWorkers.shift();
    if (!worker) {
      // 没有可用的工作进程，直接处理
      return await this.processChunkDirectly(batch, fileChunk);
    }

    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();

      // 设置超时
      const timeout = setTimeout(() => {
        this.availableWorkers.push(worker);
        reject(new Error('工作进程处理超时'));
      }, 60000); // 60秒超时

      // 发送消息
      worker.send({
        type: 'process_files',
        messageId,
        batchId: batch.id,
        files: fileChunk,
        options: batch.options
      });

      // 等待响应
      this.once(`worker_response_${messageId}`, (response) => {
        clearTimeout(timeout);
        this.availableWorkers.push(worker);

        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.results);
        }
      });
    });
  }

  /**
   * 直接处理文件块
   */
  async processChunkDirectly(batch, fileChunk) {
    const results = [];

    for (const file of fileChunk) {
      try {
        const startTime = Date.now();
        const result = await this.processSingleFile(file, batch.options);
        const processingTime = Date.now() - startTime;

        results.push({
          fileId: file.id,
          success: true,
          result,
          processingTime
        });

        this.processingStats.processed++;
        this.processingStats.success++;

        // 报告进度
        this.reportProgress();

      } catch (error) {
        logger.error(`文件 ${file.originalName} 处理失败:`, error);
        results.push({
          fileId: file.id,
          success: false,
          error: error.message
        });

        this.processingStats.processed++;
        this.processingStats.failed++;
      }
    }

    return results;
  }

  /**
   * 处理单个文件
   */
  async processSingleFile(file, options) {
    const result = {};

    try {
      // OCR识别
      const ocrResult = await enhancedOCRService.recognizeInvoice(file.path, options.ocr);

      if (!ocrResult.success) {
        throw new Error(`OCR识别失败: ${ocrResult.error}`);
      }

      result.ocr = ocrResult.data;

      // 文档分类
      if (options.classification.enableClassification) {
        const classificationResult = await documentClassifier.classify({
          ocrResult: ocrResult.data,
          documentType: ocrResult.data.invoiceType
        });

        result.classification = classificationResult;
      }

      // 生成输出
      result.output = await this.generateOutput(result, options.output);

      // 添加元数据
      result.metadata = {
        fileName: file.originalName,
        fileSize: file.size,
        processingDate: new Date(),
        options
      };

    } catch (error) {
      logger.error(`文件处理失败: ${file.originalName}`, error);
      throw error;
    }

    return result;
  }

  /**
   * 生成输出
   */
  async generateOutput(result, outputOptions) {
    const output = {
      success: true,
      data: result,
      format: outputOptions.format
    };

    if (outputOptions.includeImages) {
      // 处理图像相关逻辑
      output.images = {
        original: 'path/to/original',
        processed: 'path/to/processed'
      };
    }

    if (outputOptions.compression) {
      // 压缩输出
      output.compressed = true;
    }

    return output;
  }

  /**
   * 完成批次处理
   */
  async completeBatch(batch) {
    batch.status = 'completed';
    batch.completedAt = new Date();

    // 生成报告
    const report = await this.generateBatchReport(batch);

    // 保存结果
    if (this.config.enablePersistence) {
      await this.saveBatchResults(batch, report);
    }

    // 移动到完成队列
    this.completedQueue.push(batch);

    // 清理临时文件
    await this.cleanupBatchFiles(batch);

    this.emit('batch_completed', {
      batchId: batch.id,
      report
    });
  }

  /**
   * 处理批次错误
   */
  async handleBatchError(batch, error) {
    batch.status = 'failed';
    batch.error = error.message;
    batch.failedAt = new Date();

    // 检查是否需要重试
    if (batch.retryCount < batch.options.retry.maxAttempts) {
      batch.retryCount++;
      batch.status = 'retrying';
      this.processingQueue.unshift(batch); // 重新加入队列头部
      this.emit('batch_retry', { batchId: batch.id, retryCount: batch.retryCount });
    } else {
      this.failedQueue.push(batch);
      this.emit('batch_failed', { batchId: batch.id, error: error.message });
    }
  }

  /**
   * 生成批次报告
   */
  async generateBatchReport(batch) {
    const report = {
      batchId: batch.id,
      summary: {
        totalFiles: batch.files.length,
        successCount: 0,
        failureCount: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        throughput: 0 // 文件/秒
      },
      details: {
        ocrStats: { success: 0, failed: 0, averageConfidence: 0 },
        classificationStats: { success: 0, failed: 0, averageConfidence: 0 },
        fileStats: {}
      },
      errors: [],
      recommendations: []
    };

    let totalProcessingTime = 0;

    for (const file of batch.files) {
      if (file.result) {
        report.summary.successCount++;
        totalProcessingTime += file.processingTime || 0;

        // OCR统计
        if (file.result.ocr) {
          report.details.ocrStats.success++;
          if (file.result.ocr.confidence) {
            report.details.ocrStats.averageConfidence += file.result.ocr.confidence;
          }
        }

        // 分类统计
        if (file.result.classification) {
          report.details.classificationStats.success++;
          if (file.result.classification.confidence) {
            report.details.classificationStats.averageConfidence += file.result.classification.confidence;
          }
        }
      } else {
        report.summary.failureCount++;
        if (file.error) {
          report.errors.push({
            fileName: file.originalName,
            error: file.error
          });
        }
      }
    }

    // 计算平均值
    if (report.details.ocrStats.success > 0) {
      report.details.ocrStats.averageConfidence /= report.details.ocrStats.success;
    }
    if (report.details.classificationStats.success > 0) {
      report.details.classificationStats.averageConfidence /= report.details.classificationStats.success;
    }

    // 计算汇总数据
    report.summary.totalProcessingTime = totalProcessingTime;
    report.summary.averageProcessingTime = totalProcessingTime / batch.files.length;

    const duration = (batch.completedAt - batch.startedAt) / 1000; // 秒
    if (duration > 0) {
      report.summary.throughput = batch.files.length / duration;
    }

    // 生成建议
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * 生成建议
   */
  generateRecommendations(report) {
    const recommendations = [];

    // OCR准确率建议
    if (report.details.ocrStats.averageConfidence < 0.8) {
      recommendations.push('建议提高图像质量以提升OCR识别准确率');
    }

    // 失败率建议
    const failureRate = report.summary.failureCount / report.summary.totalFiles;
    if (failureRate > 0.1) {
      recommendations.push('失败率较高，建议检查文件格式和完整性');
    }

    // 处理时间建议
    if (report.summary.averageProcessingTime > 10000) { // 10秒
      recommendations.push('处理时间较长，建议优化算法或增加并发数');
    }

    // 吞吐量建议
    if (report.summary.throughput < 0.5) { // 每秒少于0.5个文件
      recommendations.push('处理吞吐量较低，建议启用集群模式或增加工作进程');
    }

    return recommendations;
  }

  /**
   * 保存批次信息
   */
  async saveBatchInfo(batch) {
    try {
      const filePath = path.join(this.config.resultDir, 'batches', `${batch.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(batch, null, 2));
    } catch (error) {
      logger.warn('保存批次信息失败:', error);
    }
  }

  /**
   * 保存批次结果
   */
  async saveBatchResults(batch, report) {
    try {
      const results = {
        batch,
        report,
        savedAt: new Date()
      };

      const filePath = path.join(this.config.resultDir, 'batches', `${batch.id}_results.json`);
      await fs.writeFile(filePath, JSON.stringify(results, null, 2));
    } catch (error) {
      logger.warn('保存批次结果失败:', error);
    }
  }

  /**
   * 清理批次文件
   */
  async cleanupBatchFiles(batch) {
    for (const file of batch.files) {
      try {
        // 检查文件是否仍在被使用
        const stats = await fs.stat(file.path);
        if (stats.isFile() && file.path.includes('temp_')) {
          await fs.unlink(file.path);
        }
      } catch (error) {
        // 忽略清理错误
      }
    }
  }

  /**
   * 报告进度
   */
  reportProgress() {
    const now = Date.now();
    const lastReport = this.lastProgressReport || 0;

    if (now - lastReport >= this.config.progressReportInterval) {
      this.emit('progress', {
        ...this.processingStats,
        successRate: this.processingStats.processed > 0 ?
          (this.processingStats.success / this.processingStats.processed * 100).toFixed(2) : 0
      });
      this.lastProgressReport = now;
    }
  }

  /**
   * 获取批次状态
   */
  async getBatchStatus(batchId) {
    // 查找批次
    const batch = this.findBatch(batchId);
    if (!batch) {
      throw new Error(`批次 ${batchId} 不存在`);
    }

    return {
      batchId,
      status: batch.status,
      progress: this.calculateProgress(batch),
      stats: this.getBatchStats(batch),
      createdAt: batch.createdAt,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      estimatedCompletion: this.estimateCompletion(batch)
    };
  }

  /**
   * 查找批次
   */
  findBatch(batchId) {
    return this.processingQueue.find(b => b.id === batchId) ||
           this.completedQueue.find(b => b.id === batchId) ||
           this.failedQueue.find(b => b.id === batchId);
  }

  /**
   * 计算进度
   */
  calculateProgress(batch) {
    if (batch.status === 'queued') return 0;
    if (batch.status === 'completed') return 100;

    const processedCount = batch.files.filter(f => f.result !== null).length;
    return Math.round((processedCount / batch.files.length) * 100);
  }

  /**
   * 获取批次统计
   */
  getBatchStats(batch) {
    const stats = {
      total: batch.files.length,
      processed: batch.files.filter(f => f.result !== null).length,
      success: batch.files.filter(f => f.result !== null && f.result.ocr?.success).length,
      failed: batch.files.filter(f => f.result === null).length
    };

    return stats;
  }

  /**
   * 估算完成时间
   */
  estimateCompletion(batch) {
    if (batch.status === 'completed') return batch.completedAt;
    if (batch.status === 'queued') return null;

    const remaining = batch.files.length - batch.files.filter(f => f.result !== null).length;
    const avgTime = 5000; // 平均处理时间5秒
    const estimatedMs = remaining * avgTime;

    return new Date(Date.now() + estimatedMs);
  }

  /**
   * 估算处理时长
   */
  estimateDuration(fileCount) {
    const avgTime = 5000; // 平均处理时间5秒
    const concurrency = this.config.maxConcurrency;
    const batches = Math.ceil(fileCount / this.config.batchSize);

    return Math.ceil((batches * avgTime) / concurrency);
  }

  /**
   * 取消批次
   */
  async cancelBatch(batchId) {
    const batchIndex = this.processingQueue.findIndex(b => b.id === batchId);
    if (batchIndex === -1) {
      throw new Error(`批次 ${batchId} 不存在或已在处理中`);
    }

    const batch = this.processingQueue.splice(batchIndex, 1)[0];
    batch.status = 'cancelled';
    batch.cancelledAt = new Date();

    this.emit('batch_cancelled', { batchId });
    return true;
  }

  /**
   * 启动清理任务
   */
  startCleanupTask() {
    setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        logger.error('清理任务失败:', error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * 清理过期数据
   */
  async cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    // 清理缓存
    for (const [key, value] of this.processingCache) {
      if (now - value.timestamp > maxAge) {
        this.processingCache.delete(key);
      }
    }

    // 清理临时文件
    try {
      const files = await fs.readdir(this.config.tempDir);
      for (const file of files) {
        const filePath = path.join(this.config.tempDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      logger.warn('清理临时文件失败:', error);
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    this.on('error', (error) => {
      logger.error('批量处理器错误:', error);
    });

    this.on('batch_completed', (data) => {
      logger.debug(`批次 ${data.batchId} 完成`);
    });

    this.on('batch_failed', (data) => {
      logger.error(`批次 ${data.batchId} 失败: ${data.error}`);
    });
  }

  /**
   * 处理工作进程消息
   */
  handleWorkerMessage(worker, message) {
    if (message.type === 'response') {
      this.emit(`worker_response_${message.messageId}`, message);
    }
  }

  /**
   * 处理工作进程退出
   */
  async handleWorkerExit(worker) {
    const index = this.workerPool.indexOf(worker);
    if (index > -1) {
      this.workerPool.splice(index, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }

    // 重启工作进程
    if (this.config.enableClustering && cluster.isMaster) {
      const newWorker = cluster.fork();
      this.workerPool.push(newWorker);
      this.availableWorkers.push(newWorker);
    }
  }

  /**
   * 生成批次ID
   */
  generateBatchId() {
    return `batch_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * 生成消息ID
   */
  generateMessageId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取处理统计
   */
  getProcessingStats() {
    return {
      ...this.processingStats,
      queueSize: this.processingQueue.length,
      completedCount: this.completedQueue.length,
      failedCount: this.failedQueue.length,
      availableWorkers: this.availableWorkers.length
    };
  }
}

/**
 * 错误处理器
 */
class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrorCount = 1000;
  }

  handleWorkerError(worker, error) {
    const errorInfo = {
      timestamp: new Date(),
      workerId: worker.process.pid,
      error: error.message,
      stack: error.stack
    };

    this.errors.push(errorInfo);
    this.trimErrors();
  }

  trimErrors() {
    if (this.errors.length > this.maxErrorCount) {
      this.errors = this.errors.slice(-this.maxErrorCount);
    }
  }

  getRecentErrors(count = 10) {
    return this.errors.slice(-count);
  }
}

/**
 * 性能监控器
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      processingTimes: [],
      memoryUsage: [],
      cpuUsage: []
    };
  }

  recordProcessingTime(time) {
    this.metrics.processingTimes.push({
      time,
      timestamp: Date.now()
    });
    this.trimMetrics();
  }

  recordMemoryUsage() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      ...usage,
      timestamp: Date.now()
    });
  }

  recordCPUUsage() {
    const usage = process.cpuUsage();
    this.metrics.cpuUsage.push({
      ...usage,
      timestamp: Date.now()
    });
  }

  trimMetrics() {
    const maxMetrics = 1000;
    if (this.metrics.processingTimes.length > maxMetrics) {
      this.metrics.processingTimes = this.metrics.processingTimes.slice(-maxMetrics);
    }
    if (this.metrics.memoryUsage.length > maxMetrics) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-maxMetrics);
    }
    if (this.metrics.cpuUsage.length > maxMetrics) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-maxMetrics);
    }
  }

  getAverageProcessingTime() {
    if (this.metrics.processingTimes.length === 0) return 0;

    const total = this.metrics.processingTimes.reduce((sum, item) => sum + item.time, 0);
    return total / this.metrics.processingTimes.length;
  }

  getStats() {
    return {
      averageProcessingTime: this.getAverageProcessingTime(),
      currentMemoryUsage: process.memoryUsage(),
      metricsCount: {
        processingTimes: this.metrics.processingTimes.length,
        memoryUsage: this.metrics.memoryUsage.length,
        cpuUsage: this.metrics.cpuUsage.length
      }
    };
  }
}

module.exports = new BatchDocumentProcessor();