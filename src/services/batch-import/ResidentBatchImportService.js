/**
 * 村民批量导入服务
 * 支持Excel/CSV文件解析、数据验证、错误处理和进度跟踪
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { Resident } = require('../../models/Resident');
const { Village } = require('../../models/Village');
const logger = require('../../utils/logger');

class ResidentBatchImportService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.dbService = options.dbService;
    this.uploadDir = options.uploadDir || path.join(process.cwd(), 'uploads', 'batch-import');
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB
    this.supportedFormats = ['.xlsx', '.xls', '.csv'];
    this.batchSize = options.batchSize || 100;

    // 导入任务队列
    this.importTasks = new Map();

    // 确保上传目录存在
    this.ensureUploadDir();
  }

  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async ensureUploadDirAsync() {
    try {
      await fsPromises.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 创建导入任务
   */
  async createImportTask(userId, fileInfo) {
    const taskId = `import_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`;

    const task = {
      id: taskId,
      userId,
      fileName: fileInfo.originalname,
      filePath: fileInfo.path,
      status: 'pending',
      progress: 0,
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
      warnings: [],
      startTime: null,
      endTime: null,
      createdAt: new Date()
    };

    this.importTasks.set(taskId, task);
    this.emit('task:created', task);

    return taskId;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    const task = this.importTasks.get(taskId);
    if (!task) {
      return null;
    }

    return {
      id: task.id,
      status: task.status,
      progress: task.progress,
      total: task.total,
      success: task.success,
      failed: task.failed,
      errors: task.errors.slice(0, 10),
      warnings: task.warnings.slice(0, 10),
      startTime: task.startTime,
      endTime: task.endTime
    };
  }

  /**
   * 解析文件
   */
  async parseFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (!this.supportedFormats.includes(ext)) {
      throw new Error(`不支持的文件格式: ${  ext}`);
    }

    // 检查文件大小
    const stats = await fsPromises.stat(filePath);
    if (stats.size > this.maxFileSize) {
      throw new Error(`文件大小超过限制: ${  Math.round(stats.size / 1024 / 1024)  }MB`);
    }

    let data = [];

    if (ext === '.csv') {
      data = await this.parseCSV(filePath);
    } else {
      data = await this.parseExcel(filePath);
    }

    return data;
  }

  /**
   * 解析CSV文件
   */
  async parseCSV(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.csv.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    const data = [];

    // 获取第一行作为表头
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell(cell => {
      headers.push(cell.value);
    });

    // 从第二行开始读取数据
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头

      const rowData = {};
      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      data.push(rowData);
    });

    return data;
  }

  /**
   * 解析Excel文件
   */
  async parseExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    const data = [];

    // 获取第一行作为表头
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell(cell => {
      headers.push(cell.value);
    });

    // 从第二行开始读取数据
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头

      const rowData = {};
      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      data.push(rowData);
    });

    return data;
  }

  /**
   * 验证数据
   */
  async validateData(data, taskId) {
    const task = this.importTasks.get(taskId);
    const validRecords = [];
    const errors = [];

    // 必填字段定义
    const requiredFields = ['姓名', '身份证号', '手机号'];
    // 可选字段
    const optionalFields = ['性别', '出生日期', '家庭住址', '村ID', '户主姓名', '与户主关系'];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const record = {
        rowIndex: i + 2,
        data: {},
        errors: [],
        warnings: []
      };

      // 检查必填字段
      for (const field of requiredFields) {
        if (!row[field] || row[field].trim() === '') {
          record.errors.push(`${field  }不能为空`);
        } else {
          record.data[field] = row[field].trim();
        }
      }

      // 检查可选字段
      for (const field of optionalFields) {
        if (row[field] && row[field].trim() !== '') {
          record.data[field] = row[field].trim();
        }
      }

      // 验证身份证号格式
      if (record.data['身份证号']) {
        const idCardValidation = this.validateIdCard(record.data['身份证号']);
        if (!idCardValidation.valid) {
          record.errors.push(idCardValidation.message);
        }
      }

      // 验证手机号格式
      if (record.data['手机号']) {
        const phoneValidation = this.validatePhone(record.data['手机号']);
        if (!phoneValidation.valid) {
          record.errors.push(phoneValidation.message);
        }
      }

      // 验证村ID是否存在
      if (record.data['村ID']) {
        const villageExists = await this.checkVillageExists(record.data['村ID']);
        if (!villageExists) {
          record.warnings.push(`村ID ${  record.data['村ID']  } 不存在`);
        }
      }

      // 检查是否重复
      if (record.data['身份证号']) {
        const duplicate = await this.checkDuplicateIdCard(record.data['身份证号']);
        if (duplicate) {
          record.warnings.push('身份证号已存在于系统中');
        }
      }

      if (record.errors.length > 0) {
        errors.push({
          row: record.rowIndex,
          data: record.data,
          errors: record.errors
        });
      } else {
        validRecords.push({
          ...record.data,
          _rowIndex: record.rowIndex,
          _warnings: record.warnings
        });
      }

      // 更新进度
      task.progress = Math.round(((i + 1) / data.length) * 50);
      this.emit('task:progress', task);
    }

    return {
      validRecords,
      errors,
      total: data.length,
      validCount: validRecords.length,
      errorCount: errors.length
    };
  }

  /**
   * 验证身份证号
   */
  validateIdCard(idCard) {
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;

    if (!idCardRegex.test(idCard)) {
      return {
        valid: false,
        message: '身份证号格式不正确'
      };
    }

    // 验证校验码
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * weights[i];
    }

    const checkCode = checkCodes[sum % 11];
    if (idCard[17].toUpperCase() !== checkCode) {
      return {
        valid: false,
        message: '身份证号校验码不正确'
      };
    }

    return { valid: true };
  }

  /**
   * 验证手机号
   */
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;

    if (!phoneRegex.test(phone)) {
      return {
        valid: false,
        message: '手机号格式不正确'
      };
    }

    return { valid: true };
  }

  /**
   * 检查村庄是否存在
   */
  async checkVillageExists(villageId) {
    try {
      const village = await Village.findById(villageId);
      return !!village;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查身份证号是否重复
   */
  async checkDuplicateIdCard(idCard) {
    try {
      const resident = await Resident.findOne({ idCard });
      return !!resident;
    } catch (error) {
      return false;
    }
  }

  /**
   * 批量导入数据
   */
  async importData(records, taskId) {
    const task = this.importTasks.get(taskId);
    task.status = 'processing';
    task.startTime = new Date();
    task.total = records.length;
    this.emit('task:started', task);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      // 分批处理
      for (let i = 0; i < records.length; i += this.batchSize) {
        const batch = records.slice(i, i + this.batchSize);

        for (const record of batch) {
          try {
            const residentData = this.transformRecord(record);

            const resident = new Resident(residentData);
            await resident.save();

            results.success++;

            if (record._warnings && record._warnings.length > 0) {
              task.warnings.push({
                row: record._rowIndex,
                name: record['姓名'],
                warnings: record._warnings
              });
            }
          } catch (error) {
            results.failed++;
            results.errors.push({
              row: record._rowIndex,
              name: record['姓名'],
              error: error.message
            });
            logger.error('导入失败:', { row: record._rowIndex, error: error.message });
          }
        }

        // 更新进度
        task.progress = Math.round(50 + ((i + batch.length) / records.length) * 50);
        task.success = results.success;
        task.failed = results.failed;
        this.emit('task:progress', task);
      }

      task.status = 'completed';
      task.endTime = new Date();
      task.errors = results.errors;
      this.emit('task:completed', task);

      return results;
    } catch (error) {
      task.status = 'failed';
      task.endTime = new Date();
      task.errors.push({
        error: '导入过程出错',
        message: error.message
      });
      this.emit('task:failed', task);
      throw error;
    }
  }

  /**
   * 转换记录为数据库格式
   */
  transformRecord(record) {
    const mapping = {
      '姓名': 'realName',
      '身份证号': 'idCard',
      '手机号': 'phone',
      '性别': 'gender',
      '出生日期': 'birthDate',
      '家庭住址': 'address',
      '村ID': 'villageId',
      '户主姓名': 'householderName',
      '与户主关系': 'relationship'
    };

    const data = {};

    for (const key in mapping) {
      if (record[key]) {
        data[mapping[key]] = record[key];
      }
    }

    data.status = 'active';
    data.createdAt = new Date();
    data.updatedAt = new Date();

    // 性别转换
    if (data.gender) {
      const genderMap = {
        '男': 'male',
        '女': 'female',
        'Male': 'male',
        'Female': 'female',
        'M': 'male',
        'F': 'female'
      };
      data.gender = genderMap[data.gender] || data.gender;
    }

    return data;
  }

  /**
   * 执行完整导入流程
   */
  async executeImport(taskId) {
    const task = this.importTasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    try {
      // 1. 解析文件
      const data = await this.parseFile(task.filePath);
      logger.info('文件解析完成', { taskId, rowCount: data.length });

      // 2. 验证数据
      const validation = await this.validateData(data, taskId);
      logger.info('数据验证完成', { taskId, ...validation });

      if (validation.validCount === 0) {
        throw new Error('没有有效数据可导入');
      }

      // 3. 导入数据
      const results = await this.importData(validation.validRecords, taskId);
      logger.info('数据导入完成', { taskId, ...results });

      // 4. 清理临时文件
      this.cleanupFile(task.filePath);

      return {
        taskId,
        ...validation,
        importResults: results
      };
    } catch (error) {
      logger.error('导入失败', { taskId, error: error.message });
      task.status = 'failed';
      task.endTime = new Date();
      task.errors.push({ error: error.message });
      this.emit('task:failed', task);
      throw error;
    }
  }

  /**
   * 清理临时文件
   */
  async cleanupFile(filePath) {
    try {
      try {
        await fsPromises.unlink(filePath);
        logger.info('临时文件已删除', { filePath });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    } catch (error) {
      logger.error('删除临时文件失败:', error);
    }
  }

  /**
   * 下载导入模板
   */
  async generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('村民数据');

    // 定义表头
    worksheet.columns = [
      { header: '姓名', key: 'name', width: 10 },
      { header: '身份证号', key: 'idCard', width: 20 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '性别', key: 'gender', width: 6 },
      { header: '出生日期', key: 'birthDate', width: 12 },
      { header: '家庭住址', key: 'address', width: 30 },
      { header: '村ID', key: 'villageId', width: 25 },
      { header: '户主姓名', key: 'householderName', width: 10 },
      { header: '与户主关系', key: 'relationship', width: 10 }
    ];

    // 添加示例数据
    worksheet.addRow({
      name: '张三',
      idCard: '110101199001011234',
      phone: '13800138000',
      gender: '男',
      birthDate: '1990-01-01',
      address: '某某村某某组',
      villageId: 'village_id_here',
      householderName: '张父',
      relationship: '子女'
    });

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(userId) {
    const tasks = Array.from(this.importTasks.values())
      .filter(task => !userId || task.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);

    return tasks.map(task => ({
      id: task.id,
      fileName: task.fileName,
      status: task.status,
      progress: task.progress,
      total: task.total,
      success: task.success,
      failed: task.failed,
      createdAt: task.createdAt,
      startTime: task.startTime,
      endTime: task.endTime
    }));
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    const task = this.importTasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status === 'processing') {
      task.status = 'cancelled';
      task.endTime = new Date();
      this.emit('task:cancelled', task);
    }

    return true;
  }

  /**
   * 验证文件
   */
  async validateFile(file) {
    try {
      const data = await this.parseFile(file.path);

      const validation = {
        total: data.length,
        valid: 0,
        invalid: 0,
        errors: []
      };

      // 简单验证每条记录
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let isValid = true;
        const errors = [];

        // 必填字段检查
        if (!row['姓名'] || row['姓名'].trim() === '') {
          errors.push('姓名不能为空');
          isValid = false;
        }
        if (!row['身份证号'] || row['身份证号'].trim() === '') {
          errors.push('身份证号不能为空');
          isValid = false;
        }
        if (!row['手机号'] || row['手机号'].trim() === '') {
          errors.push('手机号不能为空');
          isValid = false;
        }

        // 格式验证
        if (row['身份证号']) {
          const idValidation = this.validateIdCard(row['身份证号'].trim());
          if (!idValidation.valid) {
            errors.push(idValidation.message);
            isValid = false;
          }
        }

        if (row['手机号']) {
          const phoneValidation = this.validatePhone(row['手机号'].trim());
          if (!phoneValidation.valid) {
            errors.push(phoneValidation.message);
            isValid = false;
          }
        }

        if (isValid) {
          validation.valid++;
        } else {
          validation.invalid++;
          validation.errors.push({
            row: i + 2,
            name: row['姓名'] || '未知',
            errors
          });
        }
      }

      return validation;
    } catch (error) {
      throw new Error(`验证文件失败: ${  error.message}`);
    }
  }

  /**
   * 生成导入报告
   */
  async generateReport(taskId) {
    const task = this.importTasks.get(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('导入报告');

    // 定义表头
    worksheet.columns = [
      { header: '任务ID', key: 'taskId', width: 30 },
      { header: '文件名', key: 'fileName', width: 30 },
      { header: '状态', key: 'status', width: 10 },
      { header: '总数', key: 'total', width: 10 },
      { header: '成功', key: 'success', width: 10 },
      { header: '失败', key: 'failed', width: 10 },
      { header: '开始时间', key: 'startTime', width: 25 },
      { header: '结束时间', key: 'endTime', width: 25 }
    ];

    // 添加任务摘要
    worksheet.addRow({
      taskId: task.id,
      fileName: task.fileName,
      status: this.getStatusText(task.status),
      total: task.total,
      success: task.success,
      failed: task.failed,
      startTime: task.startTime ? task.startTime.toISOString() : '-',
      endTime: task.endTime ? task.endTime.toISOString() : '-'
    });

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };

    // 如果有错误，添加错误详情工作表
    if (task.errors && task.errors.length > 0) {
      const errorWorksheet = workbook.addWorksheet('错误详情');
      errorWorksheet.columns = [
        { header: '错误序号', key: 'errorNo', width: 10 },
        { header: '行号', key: 'row', width: 10 },
        { header: '姓名', key: 'name', width: 15 },
        { header: '错误信息', key: 'error', width: 40 }
      ];

      errorWorksheet.getRow(1).font = { bold: true };

      task.errors.slice(0, 100).forEach((err, index) => {
        errorWorksheet.addRow({
          errorNo: index + 1,
          row: err.row || err.rowIndex || '-',
          name: err.name || '-',
          error: err.error || err.message || '-'
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'pending': '等待中',
      'processing': '处理中',
      'completed': '已完成',
      'failed': '失败',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  }

  /**
   * 同步导入村民数据
   */
  async importResidentsSync(options) {
    const { userId, villageId, file, skipDuplicates = true, updateExisting = false } = options;

    // 创建临时任务ID
    const tempTaskId = `sync_${  Date.now()}`;
    await this.createImportTask(userId, { originalname: file.originalname, path: file.path });
    const tempTask = this.importTasks.get(tempTaskId);

    try {
      // 1. 解析文件
      const data = await this.parseFile(file.path);

      // 2. 验证数据
      const validation = await this.validateData(data, tempTaskId);

      if (validation.validCount === 0) {
        throw new Error('没有有效数据可导入');
      }

      // 处理重复数据
      let recordsToImport = validation.validRecords;
      if (skipDuplicates) {
        recordsToImport = recordsToImport.filter(record => !record._warnings || !record._warnings.some(w => w.includes('已存在')));
      }

      // 3. 导入数据
      let successCount = 0;
      let failedCount = 0;
      let updatedCount = 0;

      for (const record of recordsToImport) {
        try {
          const residentData = this.transformRecord(record);
          if (villageId && villageId !== 'default') {
            residentData.villageId = villageId;
          }

          // 检查是否更新已存在的记录
          if (updateExisting) {
            const existing = await Resident.findOne({ idCard: residentData.idCard });
            if (existing) {
              await Resident.findByIdAndUpdate(existing._id, residentData);
              updatedCount++;
              continue;
            }
          }

          const resident = new Resident(residentData);
          await resident.save();
          successCount++;
        } catch (error) {
          failedCount++;
          logger.error('导入记录失败:', { name: record['姓名'], error: error.message });
        }
      }

      // 清理临时文件
      this.cleanupFile(file.path);

      return {
        success: successCount,
        failed: failedCount,
        updated: updatedCount,
        total: data.length
      };
    } catch (error) {
      this.cleanupFile(file.path);
      throw error;
    }
  }
}

module.exports = ResidentBatchImportService;
