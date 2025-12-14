/**
 * 政务系统集成服务
 * 对接省级政务平台，实现数据同步和业务协同
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class GovernmentIntegrationService {
  constructor() {
    // 政务平台配置
    this.config = {
      // 省级政务平台配置
      provincialPlatform: {
        baseUrl: process.env.PROVINCIAL_PLATFORM_URL || 'https://api.province.gov.cn',
        appId: process.env.PROVINCIAL_PLATFORM_APP_ID,
        appSecret: process.env.PROVINCIAL_PLATFORM_APP_SECRET,
        version: 'v1.0',
        timeout: 30000
      },

      // 市级政务平台配置
      municipalPlatform: {
        baseUrl: process.env.MUNICIPAL_PLATFORM_URL || 'https://api.city.gov.cn',
        appId: process.env.MUNICIPAL_PLATFORM_APP_ID,
        appSecret: process.env.MUNICIPAL_PLATFORM_APP_SECRET,
        version: 'v1.0',
        timeout: 30000
      },

      // 同步配置
      sync: {
        batchSize: 100,           // 批量同步数量
        retryAttempts: 3,         // 重试次数
        retryDelay: 5000,         // 重试延迟(ms)
        syncInterval: 3600000,    // 同步间隔(1小时)
        enableAutoSync: true      // 启用自动同步
      }
    };

    // 数据映射配置
    this.dataMapping = {
      // 户籍数据映射
      household: {
        id: 'householdId',
        householdNumber: 'householdNo',
        householdType: 'type',
        address: 'address',
        householderName: 'householderName',
        householderId: 'householderId',
        memberCount: 'memberCount',
        registrationDate: 'regDate',
        economicType: 'economicType'
      },

      // 社保数据映射
      socialSecurity: {
        id: 'socialSecurityId',
        participantId: 'participantId',
        name: 'participantName',
        idCard: 'idNumber',
        type: 'insuranceType',
        status: 'status',
        contributionBase: 'contributionBase',
        contributionAmount: 'contributionAmount',
        lastPaymentDate: 'lastPaymentDate',
        eligibilityDate: 'eligibilityDate'
      },

      // 统计数据映射
      statistics: {
        villageId: 'villageCode',
        reportDate: 'reportDate',
        totalPopulation: 'totalPop',
        householdCount: 'householdCount',
        malePopulation: 'malePop',
        femalePopulation: 'femalePop',
        elderlyPopulation: 'elderlyPop',
        minorPopulation: 'minorPop',
        employmentRate: 'employmentRate',
        perCapitaIncome: 'perCapitaIncome'
      }
    };

    // API端点配置
    this.endpoints = {
      // 户籍管理
      household: {
        list: '/household/list',
        get: '/household/:id',
        create: '/household/create',
        update: '/household/:id/update',
        delete: '/household/:id/delete',
        sync: '/household/sync'
      },

      // 社保管理
      socialSecurity: {
        list: '/socialSecurity/list',
        get: '/socialSecurity/:id',
        query: '/socialSecurity/query',
        contribution: '/socialSecurity/contribution',
        eligibility: '/socialSecurity/eligibility'
      },

      // 统计报表
      statistics: {
        population: '/statistics/population',
        economy: '/statistics/economy',
        social: '/statistics/social',
        upload: '/statistics/upload',
        download: '/statistics/download'
      },

      // 便民服务
      services: {
        query: '/services/query',
        apply: '/services/apply',
        status: '/services/:id/status',
        cancel: '/services/:id/cancel'
      }
    };

    // 同步状态
    this.syncStatus = {
      lastSyncTime: null,
      inProgress: false,
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      errors: []
    };
  }

  /**
   * 生成API签名
   */
  generateSignature(appSecret, timestamp, nonce, data) {
    const params = {
      appSecret,
      timestamp,
      nonce,
      ...data
    };

    // 按键名排序
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

    return crypto.createHash('sha256').update(signString).digest('hex');
  }

  /**
   * 构建API请求头
   */
  buildHeaders(platform, additionalHeaders = {}) {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const config = this.config[platform];

    const signature = this.generateSignature(config.appSecret, timestamp, nonce);

    return {
      'Content-Type': 'application/json',
      'X-App-Id': config.appId,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
      'X-Version': config.version,
      ...additionalHeaders
    };
  }

  /**
   * 发送API请求
   */
  async makeRequest(platform, method, endpoint, data = {}, options = {}) {
    const config = this.config[platform];
    const url = `${config.baseUrl}${endpoint}`;
    const headers = this.buildHeaders(platform);

    const requestConfig = {
      method,
      url,
      headers,
      timeout: config.timeout,
      ...options
    };

    if (method.toLowerCase() !== 'get') {
      requestConfig.data = data;
    } else {
      requestConfig.params = data;
    }

    try {
      const response = await axios(requestConfig);
      return response.data;
    } catch (error) {
      console.error(`政务API请求失败 [${platform}] ${endpoint}:`, error.message);
      throw new Error(`政务平台请求失败: ${error.message}`);
    }
  }

  /**
   * 同步户籍数据
   */
  async syncHouseholdData(villageId, options = {}) {
    console.log(`开始同步户籍数据 - 村庄: ${villageId}`);

    try {
      const startTime = Date.now();
      this.syncStatus.inProgress = true;
      this.syncStatus.errors = [];

      // 获取本地户籍数据
      const localHouseholds = await this.getLocalHouseholdData(villageId);
      this.syncStatus.totalRecords = localHouseholds.length;

      // 批量同步到政务平台
      const batchSize = options.batchSize || this.config.sync.batchSize;
      const batches = this.createBatches(localHouseholds, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`同步批次 ${i + 1}/${batches.length}, 记录数: ${batch.length}`);

        try {
          await this.syncHouseholdBatch(batch, i + 1);
          this.syncStatus.processedRecords += batch.length;
        } catch (error) {
          this.syncStatus.failedRecords += batch.length;
          this.syncStatus.errors.push({
            batch: i + 1,
            error: error.message,
            records: batch.length
          });

          // 重试机制
          if (options.enableRetry !== false) {
            await this.retrySyncBatch(batch, i + 1, 'household');
          }
        }

        // 避免请求过于频繁
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const duration = Date.now() - startTime;
      this.syncStatus.lastSyncTime = new Date();

      console.log(`户籍数据同步完成 - 耗时: ${duration}ms, 成功: ${this.syncStatus.processedRecords}, 失败: ${this.syncStatus.failedRecords}`);

      return {
        success: true,
        villageId,
        totalRecords: this.syncStatus.totalRecords,
        processedRecords: this.syncStatus.processedRecords,
        failedRecords: this.syncStatus.failedRecords,
        duration,
        errors: this.syncStatus.errors
      };

    } catch (error) {
      console.error('户籍数据同步失败:', error);
      throw error;
    } finally {
      this.syncStatus.inProgress = false;
    }
  }

  /**
   * 同步社保数据
   */
  async syncSocialSecurityData(villageId, options = {}) {
    console.log(`开始同步社保数据 - 村庄: ${villageId}`);

    try {
      const startTime = Date.now();
      const residents = await this.getVillageResidents(villageId);
      let totalProcessed = 0;
      let totalFailed = 0;
      const errors = [];

      for (const resident of residents) {
        try {
          // 查询社保信息
          const socialSecurityInfo = await this.querySocialSecurity(resident.idCard);

          if (socialSecurityInfo && socialSecurityInfo.data) {
            // 更新本地社保数据
            await this.updateLocalSocialSecurity(resident.id, socialSecurityInfo.data);
            totalProcessed++;
          } else {
            totalFailed++;
            errors.push({
              idCard: resident.idCard,
              error: '未找到社保信息'
            });
          }

          // 避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          totalFailed++;
          errors.push({
            idCard: resident.idCard,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;

      console.log(`社保数据同步完成 - 耗时: ${duration}ms, 成功: ${totalProcessed}, 失败: ${totalFailed}`);

      return {
        success: true,
        villageId,
        totalRecords: residents.length,
        processedRecords: totalProcessed,
        failedRecords: totalFailed,
        duration,
        errors
      };

    } catch (error) {
      console.error('社保数据同步失败:', error);
      throw error;
    }
  }

  /**
   * 上传统计报表
   */
  async uploadStatisticsReport(reportData, reportType) {
    console.log(`上传统计报表 - 类型: ${reportType}`);

    try {
      // 验证报表数据
      const validation = await this.validateReportData(reportData, reportType);
      if (!validation.valid) {
        throw new Error(`报表数据验证失败: ${validation.errors.join(', ')}`);
      }

      // 生成报表文件
      const reportFile = await this.generateReportFile(reportData, reportType);

      // 构建上传数据
      const uploadData = {
        reportType,
        reportDate: reportData.reportDate,
        villageId: reportData.villageId,
        fileName: reportFile.fileName,
        fileSize: reportFile.fileSize,
        fileHash: reportFile.fileHash,
        data: reportData
      };

      // 上传到省级平台
      const provincialResult = await this.makeRequest(
        'provincialPlatform',
        'POST',
        this.endpoints.statistics.upload,
        uploadData
      );

      // 上传到市级平台（如果需要）
      if (reportType !== 'basic') {
        const municipalResult = await this.makeRequest(
          'municipalPlatform',
          'POST',
          this.endpoints.statistics.upload,
          uploadData
        );
      }

      // 记录上传日志
      await this.logUploadHistory({
        reportType,
        reportDate: reportData.reportDate,
        platform: 'provincial',
        status: 'success',
        fileSize: reportFile.fileSize,
        uploadTime: new Date()
      });

      console.log(`统计报表上传成功 - 报告ID: ${provincialResult.reportId}`);

      return {
        success: true,
        reportId: provincialResult.reportId,
        uploadTime: new Date(),
        fileSize: reportFile.fileSize
      };

    } catch (error) {
      console.error('统计报表上传失败:', error);

      // 记录失败日志
      await this.logUploadHistory({
        reportType,
        reportDate: reportData.reportDate,
        platform: 'provincial',
        status: 'failed',
        error: error.message,
        uploadTime: new Date()
      });

      throw error;
    }
  }

  /**
   * 查询便民服务
   */
  async queryGovernmentServices(serviceType, queryParams = {}) {
    console.log(`查询便民服务 - 类型: ${serviceType}`);

    try {
      const queryData = {
        serviceType,
        region: queryParams.region,
        category: queryParams.category,
        keyword: queryParams.keyword,
        page: queryParams.page || 1,
        pageSize: queryParams.pageSize || 20
      };

      const result = await this.makeRequest(
        'provincialPlatform',
        'GET',
        this.endpoints.services.query,
        queryData
      );

      // 处理服务数据
      const services = result.data.map(service => ({
        id: service.serviceId,
        name: service.serviceName,
        type: service.serviceType,
        category: service.category,
        description: service.description,
        requirements: service.requirements,
        process: service.process,
        documents: service.requiredDocuments,
        timeline: service.processingTime,
        contact: service.contactInfo,
        onlineApply: service.supportOnlineApplication
      }));

      return {
        success: true,
        services,
        total: result.total,
        page: queryData.page,
        pageSize: queryData.pageSize
      };

    } catch (error) {
      console.error('查询便民服务失败:', error);
      throw error;
    }
  }

  /**
   * 申请便民服务
   */
  async applyForGovernmentService(serviceId, applicantData) {
    console.log(`申请便民服务 - 服务ID: ${serviceId}`);

    try {
      // 验证申请数据
      const validation = await this.validateApplicationData(applicantData);
      if (!validation.valid) {
        throw new Error(`申请数据验证失败: ${validation.errors.join(', ')}`);
      }

      // 构建申请数据
      const applicationData = {
        serviceId,
        applicantName: applicantData.name,
        idCard: applicantData.idCard,
        phone: applicantData.phone,
        address: applicantData.address,
        villageId: applicantData.villageId,
        applicationData: applicantData.formData,
        attachments: applicantData.attachments || [],
        applyTime: new Date().toISOString()
      };

      const result = await this.makeRequest(
        'municipalPlatform',
        'POST',
        this.endpoints.services.apply,
        applicationData
      );

      // 记录申请日志
      await this.logApplicationHistory({
        serviceId,
        applicationId: result.applicationId,
        applicantId: applicantData.idCard,
        status: 'submitted',
        applyTime: new Date()
      });

      console.log(`便民服务申请成功 - 申请ID: ${result.applicationId}`);

      return {
        success: true,
        applicationId: result.applicationId,
        status: result.status,
        expectedProcessingTime: result.processingTime
      };

    } catch (error) {
      console.error('申请便民服务失败:', error);
      throw error;
    }
  }

  /**
   * 获取本地户籍数据
   */
  async getLocalHouseholdData(villageId) {
    try {
      const Household = require('../models/Household');

      const households = await Household.find({
        villageId: villageId,
        isActive: true
      }).lean();

      // 映射数据格式
      return households.map(household => this.mapHouseholdData(household));

    } catch (error) {
      console.error('获取本地户籍数据失败:', error);
      throw new Error('获取本地户籍数据失败');
    }
  }

  /**
   * 映射户籍数据
   */
  mapHouseholdData(household) {
    const mapping = this.dataMapping.household;
    const mapped = {};

    Object.keys(mapping).forEach(localKey => {
      const remoteKey = mapping[localKey];
      mapped[remoteKey] = household[localKey];
    });

    // 添加必要的元数据
    mapped.source = 'village_system';
    mapped.lastUpdated = household.updatedAt;
    mapped.syncStatus = 'pending';

    return mapped;
  }

  /**
   * 批量同步户籍数据
   */
  async syncHouseholdBatch(batch, batchNumber) {
    const syncData = {
      batchNumber,
      households: batch,
      syncTime: new Date().toISOString()
    };

    return await this.makeRequest(
      'provincialPlatform',
      'POST',
      this.endpoints.household.sync,
      syncData
    );
  }

  /**
   * 重试同步批次
   */
  async retrySyncBatch(batch, batchNumber, dataType) {
    const maxRetries = this.config.sync.retryAttempts;
    const retryDelay = this.config.sync.retryDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`重试同步批次 ${batchNumber} - 尝试 ${attempt}/${maxRetries}`);

      try {
        if (dataType === 'household') {
          await this.syncHouseholdBatch(batch, batchNumber);
        }

        console.log(`批次 ${batchNumber} 重试成功`);
        break;

      } catch (error) {
        console.error(`批次 ${batchNumber} 重试失败 (${attempt}/${maxRetries}):`, error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  /**
   * 创建数据批次
   */
  createBatches(data, batchSize) {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 查询社保信息
   */
  async querySocialSecurity(idCard) {
    const queryData = {
      idCard,
      queryType: 'comprehensive',
      includeHistory: false
    };

    return await this.makeRequest(
      'municipalPlatform',
      'GET',
      this.endpoints.socialSecurity.query,
      queryData
    );
  }

  /**
   * 更新本地社保数据
   */
  async updateLocalSocialSecurity(residentId, socialSecurityData) {
    try {
      // 这里应该更新数据库中的社保信息
      // 具体实现依赖于数据模型
      console.log(`更新居民 ${residentId} 的社保信息`);

      // 示例：更新村民模型中的社保信息
      const Resident = require('../models/Resident');
      await Resident.findByIdAndUpdate(residentId, {
        socialSecurityInfo: socialSecurityData,
        socialSecurityLastSync: new Date()
      });

    } catch (error) {
      console.error('更新本地社保数据失败:', error);
      throw new Error('更新社保数据失败');
    }
  }

  /**
   * 获取村庄村民信息
   */
  async getVillageResidents(villageId) {
    try {
      const Resident = require('../models/Resident');

      return await Resident.find({
        villageId: villageId,
        isActive: true
      }).select('id name idCard villageId').lean();

    } catch (error) {
      console.error('获取村庄村民信息失败:', error);
      throw new Error('获取村民信息失败');
    }
  }

  /**
   * 验证报表数据
   */
  async validateReportData(reportData, reportType) {
    const errors = [];

    // 基本验证
    if (!reportData.villageId) {
      errors.push('村庄ID不能为空');
    }

    if (!reportData.reportDate) {
      errors.push('报表日期不能为空');
    }

    // 根据报表类型进行特定验证
    switch (reportType) {
      case 'population':
        if (typeof reportData.totalPopulation !== 'number') {
          errors.push('总人口数必须为数字');
        }
        if (reportData.malePopulation + reportData.femalePopulation !== reportData.totalPopulation) {
          errors.push('男性人口与女性人口之和必须等于总人口');
        }
        break;

      case 'economic':
        if (typeof reportData.perCapitaIncome !== 'number') {
          errors.push('人均收入必须为数字');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成报表文件
   */
  async generateReportFile(reportData, reportType) {
    const fileName = `${reportType}_report_${reportData.villageId}_${reportData.reportDate}.json`;
    const filePath = path.join(__dirname, '../../temp', fileName);

    // 确保temp目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 写入报表数据
    const reportContent = JSON.stringify(reportData, null, 2);
    await fs.writeFile(filePath, reportContent, 'utf8');

    // 计算文件哈希
    const fileHash = crypto.createHash('sha256').update(reportContent).digest('hex');
    const stats = await fs.stat(filePath);

    return {
      fileName,
      filePath,
      fileSize: stats.size,
      fileHash
    };
  }

  /**
   * 记录上传历史
   */
  async logUploadHistory(logData) {
    try {
      const UploadHistory = require('../models/UploadHistory');

      const log = new UploadHistory({
        reportType: logData.reportType,
        reportDate: logData.reportDate,
        platform: logData.platform,
        status: logData.status,
        fileSize: logData.fileSize,
        error: logData.error,
        uploadTime: logData.uploadTime
      });

      await log.save();

    } catch (error) {
      console.error('记录上传历史失败:', error);
    }
  }

  /**
   * 记录申请历史
   */
  async logApplicationHistory(logData) {
    try {
      const ApplicationHistory = require('../models/ApplicationHistory');

      const log = new ApplicationHistory({
        serviceId: logData.serviceId,
        applicationId: logData.applicationId,
        applicantId: logData.applicantId,
        status: logData.status,
        applyTime: logData.applyTime
      });

      await log.save();

    } catch (error) {
      console.error('记录申请历史失败:', error);
    }
  }

  /**
   * 验证申请数据
   */
  async validateApplicationData(applicantData) {
    const errors = [];

    if (!applicantData.name || applicantData.name.trim().length === 0) {
      errors.push('申请人姓名不能为空');
    }

    if (!applicantData.idCard || !this.validateIdCard(applicantData.idCard)) {
      errors.push('身份证号格式不正确');
    }

    if (!applicantData.phone || !this.validatePhone(applicantData.phone)) {
      errors.push('联系电话格式不正确');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证身份证号
   */
  validateIdCard(idCard) {
    const regex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}(\d|X|x)$/;
    return regex.test(idCard);
  }

  /**
   * 验证手机号
   */
  validatePhone(phone) {
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(phone);
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    return {
      ...this.syncStatus,
      nextSyncTime: this.config.sync.enableAutoSync
        ? new Date(Date.now() + this.config.sync.syncInterval)
        : null
    };
  }

  /**
   * 启动自动同步
   */
  startAutoSync() {
    if (!this.config.sync.enableAutoSync) {
      return;
    }

    console.log('启动政务数据自动同步...');

    // 立即执行一次同步
    this.performAutoSync();

    // 设置定时同步
    this.syncInterval = setInterval(() => {
      this.performAutoSync();
    }, this.config.sync.syncInterval);
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('政务数据自动同步已停止');
    }
  }

  /**
   * 执行自动同步
   */
  async performAutoSync() {
    if (this.syncStatus.inProgress) {
      console.log('自动同步跳过 - 上次同步仍在进行中');
      return;
    }

    try {
      console.log('开始执行自动同步...');

      // 获取需要同步的村庄列表
      const Village = require('../models/Village');
      const villages = await Village.find({ isActive: true }).select('_id name').lean();

      for (const village of villages) {
        try {
          // 同步户籍数据（每天同步一次）
          await this.syncHouseholdData(village._id.toString());

          // 同步社保数据（每周同步一次）
          const now = new Date();
          if (now.getDay() === 1) { // 周一同步
            await this.syncSocialSecurityData(village._id.toString());
          }

          // 避免同步过于频繁
          await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (error) {
          console.error(`村庄 ${village.name} 自动同步失败:`, error.message);
        }
      }

      console.log('自动同步完成');

    } catch (error) {
      console.error('自动同步失败:', error);
    }
  }

  /**
   * 获取平台连接状态
   */
  async getConnectionStatus() {
    const status = {
      provincial: { connected: false, lastCheck: new Date(), error: null },
      municipal: { connected: false, lastCheck: new Date(), error: null }
    };

    // 检查省级平台连接
    try {
      await this.makeRequest('provincialPlatform', 'GET', '/health');
      status.provincial.connected = true;
    } catch (error) {
      status.provincial.error = error.message;
    }

    // 检查市级平台连接
    try {
      await this.makeRequest('municipalPlatform', 'GET', '/health');
      status.municipal.connected = true;
    } catch (error) {
      status.municipal.error = error.message;
    }

    return status;
  }

  /**
   * 获取同步历史记录
   */
  async getSyncHistory(limit = 50, offset = 0) {
    try {
      const SyncHistory = require('../models/SyncHistory');

      const history = await SyncHistory.find()
        .sort({ syncTime: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      const total = await SyncHistory.countDocuments();

      return {
        success: true,
        history,
        total,
        limit,
        offset
      };

    } catch (error) {
      console.error('获取同步历史失败:', error);
      throw new Error('获取同步历史失败');
    }
  }
}

module.exports = new GovernmentIntegrationService();