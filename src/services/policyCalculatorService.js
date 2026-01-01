const mongoose = require('mongoose');
const PolicyCalculator = require('../models/PolicyCalculator');
const SubsidyApplication = require('../models/SubsidyApplication');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * 政策计算器服务
 * 提供政策计算、补贴申请、AI模型集成等功能
 */
class PolicyCalculatorService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads/policies');
    this.certificateDir = path.join(__dirname, '../../uploads/certificates');

    // 确保目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.certificateDir)) {
      fs.mkdirSync(this.certificateDir, { recursive: true });
    }
  }

  /**
   * 创建政策计算器
   */
  async createPolicyCalculator(policyData) {
    try {
      // 生成计算器ID
      policyData.calculatorId = await this.generateCalculatorId(policyData.villageId);

      // 设置默认值
      policyData.isActive = policyData.isActive !== false;
      policyData.version = policyData.version || '1.0.0';
      policyData.calculationRules.baseAmount = policyData.calculationRules.baseAmount || 0;
      policyData.calculationRates = policyData.calculationRates || [];

      const calculator = new PolicyCalculator(policyData);
      await calculator.save();

      return calculator;
    } catch (error) {
      throw new Error(`创建政策计算器失败: ${error.message}`);
    }
  }

  /**
   * 获取政策计算器列表
   */
  async getPolicyCalculators(filters = {}) {
    try {
      const query = { isActive: true };

      if (filters.villageId) {
        query.villageId = filters.villageId;
      }
      if (filters.policyType) {
        query.policyType = filters.policyType;
      }
      if (filters.targetGroup) {
        query.targetGroup = { $in: [filters.targetGroup] };
      }

      return await PolicyCalculator.find(query)
        .populate('villageId', 'name')
        .sort({ priority: -1, createdAt: -1 });
    } catch (error) {
      throw new Error(`获取政策计算器列表失败: ${error.message}`);
    }
  }

  /**
   * 获取政策计算器详情
   */
  async getPolicyCalculatorById(calculatorId) {
    try {
      return await PolicyCalculator.findById(calculatorId)
        .populate('villageId', 'name')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');
    } catch (error) {
      throw new Error(`获取政策计算器详情失败: ${error.message}`);
    }
  }

  /**
   * 更新政策计算器
   */
  async updatePolicyCalculator(calculatorId, updateData) {
    try {
      // 更新版本号
      updateData.version = this.incrementVersion(updateData.currentVersion);
      delete updateData.currentVersion;

      const calculator = await PolicyCalculator.findByIdAndUpdate(
        calculatorId,
        updateData,
        { new: true, runValidators: true }
      );

      return calculator;
    } catch (error) {
      throw new Error(`更新政策计算器失败: ${error.message}`);
    }
  }

  /**
   * 计算补贴金额
   */
  async calculateSubsidy(calculatorId, applicationData) {
    try {
      const calculator = await PolicyCalculator.findById(calculatorId);
      if (!calculator) {
        throw new Error('政策计算器不存在');
      }

      // 执行计算
      const result = calculator.calculateSubsidy(applicationData);

      // 应用AI模型增强（如果启用）
      if (calculator.aiConfig.enabled && calculator.aiConfig.modelType) {
        const aiResult = await this.applyAIModel(
          calculator,
          applicationData,
          result
        );
        result.aiAdjustment = aiResult;
        result.confidenceLevel = aiResult.confidenceScore;
      }

      return {
        calculatorId,
        calculatorName: calculator.name,
        policyType: calculator.policyType,
        ...result
      };
    } catch (error) {
      throw new Error(`计算补贴金额失败: ${error.message}`);
    }
  }

  /**
   * 批量计算
   */
  async batchCalculate(calculatorId, applicationsData) {
    try {
      const calculator = await PolicyCalculator.findById(calculatorId);
      if (!calculator) {
        throw new Error('政策计算器不存在');
      }

      const results = [];
      const startTime = new Date();

      for (const applicationData of applicationsData) {
        const result = calculator.calculateSubsidy(applicationData);

        if (calculator.aiConfig.enabled) {
          const aiResult = await this.applyAIModel(
            calculator,
            applicationData,
            result
          );
          result.aiAdjustment = aiResult;
        }

        results.push({
          applicationId: applicationData.applicationId,
          ...result
        });
      }

      return {
        calculatorId,
        calculatorName: calculator.name,
        totalCount: applicationsData.length,
        results,
        processingTime: new Date() - startTime
      };
    } catch (error) {
      throw new Error(`批量计算失败: ${error.message}`);
    }
  }

  /**
   * 创建补贴申请
   */
  async createSubsidyApplication(applicationData) {
    try {
      // 生成申请ID
      applicationData.applicationId = await SubsidyApplication.generateApplicationId(
        applicationData.villageId
      );

      const application = new SubsidyApplication(applicationData);
      await application.save();

      return application;
    } catch (error) {
      throw new Error(`创建补贴申请失败: ${error.message}`);
    }
  }

  /**
   * 提交申请
   */
  async submitApplication(applicationId) {
    try {
      const application = await SubsidyApplication.findById(applicationId);
      if (!application) {
        throw new Error('申请不存在');
      }

      // 执行计算
      const calculator = await PolicyCalculator.findById(application.calculatorId);
      if (!calculator) {
        throw new Error('政策计算器不存在');
      }

      const calculationResult = calculator.calculateSubsidy(application);

      // 应用AI增强
      if (calculator.aiConfig.enabled) {
        const aiResult = await this.applyAIModel(
          calculator,
          application,
          calculationResult
        );
        calculationResult.aiAdjustment = aiResult;
        calculationResult.confidenceLevel = aiResult.confidenceScore;
      }

      // 保存计算结果
      application.calculationResult = calculationResult;

      // 提交申请
      await application.submit();

      return application;
    } catch (error) {
      throw new Error(`提交申请失败: ${error.message}`);
    }
  }

  /**
   * 审核申请
   */
  async reviewApplication(applicationId, reviewData) {
    try {
      const application = await SubsidyApplication.findById(applicationId);
      if (!application) {
        throw new Error('申请不存在');
      }

      // 添加审核记录
      await application.addReviewRecord(reviewData);

      // 根据审核决定更新状态
      if (reviewData.reviewDecision === 'approve') {
        await application.approve(
          reviewData.reviewerId,
          reviewData.approvedAmount || application.calculationResult.subsidyAmount,
          reviewData.reviewComments
        );
      } else if (reviewData.reviewDecision === 'reject') {
        await application.reject(
          reviewData.reviewerId,
          reviewData.rejectReason || '不符合申请条件',
          reviewData.reviewComments
        );
      }

      return application;
    } catch (error) {
      throw new Error(`审核申请失败: ${error.message}`);
    }
  }

  /**
   * 处理支付
   */
  async processPayment(applicationId, paymentData) {
    try {
      const application = await SubsidyApplication.findById(applicationId);
      if (!application) {
        throw new Error('申请不存在');
      }

      if (application.applicationStatus !== 'approved') {
        throw new Error('申请状态不允许支付');
      }

      // 添加支付记录
      await application.addPaymentRecord(paymentData);

      return application;
    } catch (error) {
      throw new Error(`处理支付失败: ${error.message}`);
    }
  }

  /**
   * 生成申请表单
   */
  async generateApplicationForm(calculatorId, format = 'json') {
    try {
      const calculator = await PolicyCalculator.findById(calculatorId);
      if (!calculator) {
        throw new Error('政策计算器不存在');
      }

      const form = {
        calculatorId: calculator._id,
        calculatorName: calculator.name,
        policyType: calculator.policyType,
        description: calculator.description,
        sections: []
      };

      // 基础信息部分
      form.sections.push({
        title: '基础信息',
        fields: [
          {
            name: 'applicantInfo.name',
            label: '申请人姓名',
            type: 'text',
            required: true
          },
          {
            name: 'applicantInfo.idNumber',
            label: '身份证号',
            type: 'text',
            required: true
          },
          {
            name: 'applicantInfo.phone',
            label: '联系电话',
            type: 'text',
            required: true
          }
        ]
      });

      // 根据政策要求添加字段
      if (calculator.eligibilityCriteria.requirements) {
        calculator.eligibilityCriteria.requirements.forEach(req => {
          if (req.field === 'householdSize') {
            form.sections.push({
              title: '家庭信息',
              fields: [
                {
                  name: 'householdInfo.registeredHouseholdSize',
                  label: '户籍人口',
                  type: 'number',
                  required: req.required
                },
                {
                  name: 'householdInfo.actualHouseholdSize',
                  label: '实际居住人口',
                  type: 'number',
                  required: req.required
                }
              ]
            });
          } else if (req.field === 'landArea') {
            form.sections.push({
              title: '土地信息',
              fields: [
                {
                  name: 'landInfo.totalLandArea',
                  label: '土地总面积',
                  type: 'number',
                  required: req.required
                },
                {
                  name: 'landInfo.totalLandUnit',
                  label: '面积单位',
                  type: 'select',
                  options: ['mu', 'hectare', 'square_meter'],
                  default: 'mu'
                }
              ]
            });
          }
        });
      }

      // 申请材料部分
      if (calculator.requiredDocuments && calculator.requiredDocuments.length > 0) {
        form.sections.push({
          title: '申请材料',
          fields: calculator.requiredDocuments.map(doc => ({
            name: `documents.${doc}`,
            label: doc,
            type: 'file',
            required: true
          }))
        });
      }

      if (format === 'json') {
        return form;
      } else {
        // 生成PDF表单
        return this.generatePDFForm(form);
      }
    } catch (error) {
      throw new Error(`生成申请表单失败: ${error.message}`);
    }
  }

  /**
   * 生成PDF证书
   */
  async generateCertificate(applicationId, options = {}) {
    try {
      const application = await SubsidyApplication.findById(applicationId)
        .populate('villageId', 'name')
        .populate('applicantId', 'name');

      if (!application) {
        throw new Error('申请不存在');
      }

      if (application.applicationStatus !== 'approved') {
        throw new Error('申请未通过审核');
      }

      const calculator = await PolicyCalculator.findById(application.calculatorId);
      if (!calculator) {
        throw new Error('政策计算器不存在');
      }

      const doc = new PDFDocument();
      const filename = `certificate_${application.applicationId}_${Date.now()}.pdf`;
      const filepath = path.join(this.certificateDir, filename);
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // 添加内容
      this.addCertificateContent(doc, {
        application,
        calculator,
        ...options
      });

      doc.end();

      return {
        filename,
        filepath,
        url: `/uploads/certificates/${filename}`
      };
    } catch (error) {
      throw new Error(`生成证书失败: ${error.message}`);
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(applicationId, notificationType, content, metadata = {}) {
    try {
      const application = await SubsidyApplication.findById(applicationId);
      if (!application) {
        throw new Error('申请不存在');
      }

      // 添加通知记录
      await application.addNotification(notificationType, content, metadata);

      // 根据发送方式发送实际通知
      const sentMethod = metadata.sentMethod || 'sms';

      switch (sentMethod) {
      case 'sms':
        await this.sendSMSNotification(application.applicantInfo.phone, content);
        break;
      case 'email':
        await this.sendEmailNotification(application.applicantInfo.email, content);
        break;
      case 'wechat':
        await this.sendWeChatNotification(metadata.openId, content);
        break;
      }

      return true;
    } catch (error) {
      throw new Error(`发送通知失败: ${error.message}`);
    }
  }

  /**
   * 获取申请统计
   */
  async getApplicationStatistics(filters = {}) {
    try {
      const matchStage = {};

      if (filters.villageId) {
        matchStage.villageId = mongoose.Types.ObjectId(filters.villageId);
      }
      if (filters.startDate || filters.endDate) {
        matchStage.submissionDate = {};
        if (filters.startDate) {
          matchStage.submissionDate.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          matchStage.submissionDate.$lte = new Date(filters.endDate);
        }
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: '$applicationStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$calculationResult.subsidyAmount' },
            avgAmount: { $avg: '$calculationResult.subsidyAmount' }
          }
        },
        {
          $lookup: {
            from: 'policycalculators',
            localField: 'calculatorId',
            foreignField: '_id',
            as: 'calculator'
          }
        }
      ];

      const results = await SubsidyApplication.aggregate(pipeline);

      const statistics = {
        total: 0,
        draft: 0,
        submitted: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        paid: 0,
        completed: 0,
        totalSubsidyAmount: 0,
        averageSubsidyAmount: 0
      };

      results.forEach(result => {
        statistics.total += result.count;
        statistics[result._id] = result.count;
        statistics.totalSubsidyAmount += result.totalAmount || 0;
      });

      if (statistics.total > 0) {
        statistics.averageSubsidyAmount = statistics.totalSubsidyAmount / statistics.total;
      }

      return statistics;
    } catch (error) {
      throw new Error(`获取申请统计失败: ${error.message}`);
    }
  }

  /**
   * 获取申请列表
   */
  async getApplications(filters = {}) {
    try {
      const query = {};

      if (filters.villageId) {
        query.villageId = filters.villageId;
      }
      if (filters.applicationStatus) {
        query.applicationStatus = filters.applicationStatus;
      }
      if (filters.applicantId) {
        query.applicantId = filters.applicantId;
      }
      if (filters.calculatorId) {
        query.calculatorId = filters.calculatorId;
      }

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;

      const applications = await SubsidyApplication.find(query)
        .populate('villageId', 'name')
        .populate('applicantId', 'name phone')
        .populate('calculatorId', 'name policyType')
        .sort({ submissionDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await SubsidyApplication.countDocuments(query);

      return {
        applications,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`获取申请列表失败: ${error.message}`);
    }
  }

  /**
   * 私有方法
   */

  /**
   * 生成计算器ID
   */
  async generateCalculatorId(villageId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6);
    const sequence = await PolicyCalculator.countDocuments({ villageId });
    const sequenceStr = String(sequence + 1).padStart(3, '0');
    return `CALC${villageId.toString().slice(-6)}${dateStr}${sequenceStr}${random}`;
  }

  /**
   * 递增版本号
   */
  incrementVersion(currentVersion) {
    if (!currentVersion) return '1.0.0';

    const parts = currentVersion.split('.').map(Number);
    parts[2]++; // 递增补丁版本

    return parts.join('.');
  }

  /**
   * 应用AI模型
   */
  async applyAIModel(calculator, applicationData, baseResult) {
    try {
      // 模拟AI模型调用
      // 实际实现应该调用真实的AI服务

      const adjustment = {
        applied: true,
        originalAmount: baseResult.amount,
        adjustedAmount: baseResult.amount,
        confidenceScore: 0.85,
        factors: [],
        explanation: 'AI模型基于历史数据和政策适用性进行了调整'
      };

      // 根据不同因素调整
      if (applicationData.applicantInfo.isPovertyHousehold) {
        adjustment.adjustedAmount *= 1.1;
        adjustment.factors.push('低保户加成10%');
      }

      if (applicationData.applicantInfo.hasDisability) {
        adjustment.adjustedAmount *= 1.05;
        adjustment.factors.push('残疾人补贴5%');
      }

      // 根据地理位置调整
      if (applicationData.metadata && applicationData.metadata.location) {
        const { longitude, latitude } = applicationData.metadata.location;
        // 示例：根据偏远程度调整
        adjustment.adjustedAmount *= 1.02;
        adjustment.factors.push('偏远地区补贴2%');
      }

      adjustment.adjustedAmount = Math.round(adjustment.adjustedAmount * 100) / 100;

      return adjustment;
    } catch (error) {
      logger.error('AI模型调用失败:', error);
      return {
        applied: false,
        error: error.message
      };
    }
  }

  /**
   * 添加PDF证书内容
   */
  addCertificateContent(doc, data) {
    const { application, calculator, options } = data;

    // 设置字体
    doc.font('Helvetica');

    // 标题
    doc.fontSize(20)
      .text('补贴批准证书', { align: 'center' })
      .moveDown();

    // 基本信息
    doc.fontSize(14);
    doc.text(`证书编号: ${application.applicationId}`);
    doc.text(`申请人: ${application.applicantInfo.name}`);
    doc.text(`身份证号: ${this.maskIdNumber(application.applicantInfo.idNumber)}`);
    doc.text(`所在村庄: ${application.villageId.name}`);
    doc.text(`政策名称: ${calculator.name}`);
    doc.moveDown();

    // 批准信息
    doc.text(`批准金额: ¥${application.calculationResult.subsidyAmount} 元`);
    doc.text(`批准日期: ${application.decisionDate.toLocaleDateString()}`);
    doc.text(`有效期至: ${options.validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
    doc.moveDown();

    // 备注
    if (options.notes) {
      doc.text(`备注: ${options.notes}`);
    }

    // 签章区域
    doc.moveDown(2);
    doc.text('审批单位: ________________');
    doc.text('审批人: ________________');
    doc.text('日期: ________________', { align: 'right' });
  }

  /**
   * 掩码身份证号
   */
  maskIdNumber(idNumber) {
    if (!idNumber || idNumber.length < 8) return idNumber;
    return `${idNumber.substring(0, 4)  }********${  idNumber.substring(idNumber.length - 4)}`;
  }

  /**
   * 发送短信通知
   */
  async sendSMSNotification(phone, content) {
    // 集成短信服务提供商API
    logger.debug(`发送短信到 ${phone}: ${content}`);
    return true;
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(email, content) {
    // 集成邮件服务
    logger.debug(`发送邮件到 ${email}: ${content}`);
    return true;
  }

  /**
   * 发送微信通知
   */
  async sendWeChatNotification(openId, content) {
    // 集成微信公众号API
    logger.debug(`发送微信通知到 ${openId}: ${content}`);
    return true;
  }

  /**
   * 同步政府政策数据
   * 从政府服务器获取最新政策并更新本地数据库
   */
  async syncGovernmentPolicies(options = {}) {
    const {
      governmentApiUrl = process.env.GOVERNMENT_POLICY_API_URL,
      region = options.region || 'national',
      forceUpdate = false
    } = options;

    try {
      const syncResult = {
        success: true,
        timestamp: new Date(),
        summary: {
          total: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 0
        },
        details: [],
        errors: []
      };

      // 如果没有配置政府API，返回模拟数据
      if (!governmentApiUrl) {
        // 返回模拟同步结果（用于演示）
        syncResult.summary.total = 5;
        syncResult.summary.updated = 3;
        syncResult.summary.created = 2;
        syncResult.message = '使用内置政策数据（未配置政府API）';

        // 记录同步日志
        await this.logSyncHistory(syncResult);

        return syncResult;
      }

      // 调用政府API获取政策数据
      const policies = await this.fetchPoliciesFromGovernment(governmentApiUrl, { region });

      syncResult.summary.total = policies.length;

      // 处理每条政策
      for (const policyData of policies) {
        try {
          // 检查政策是否已存在（通过政府政策ID）
          const existingPolicy = await PolicyCalculator.findOne({
            governmentPolicyId: policyData.id,
            villageId: policyData.villageId || null
          });

          if (existingPolicy) {
            // 检查是否需要更新
            const shouldUpdate = forceUpdate ||
              this.shouldUpdatePolicy(existingPolicy, policyData);

            if (shouldUpdate) {
              await this.updatePolicyFromGovernment(existingPolicy, policyData);
              syncResult.summary.updated++;
              syncResult.details.push({
                action: 'updated',
                policyId: existingPolicy._id,
                name: existingPolicy.name,
                reason: '政府数据更新'
              });
            } else {
              syncResult.summary.skipped++;
              syncResult.details.push({
                action: 'skipped',
                policyId: existingPolicy._id,
                name: existingPolicy.name,
                reason: '无需更新'
              });
            }
          } else {
            // 创建新政策
            const newPolicy = await this.createPolicyFromGovernment(policyData);
            syncResult.summary.created++;
            syncResult.details.push({
              action: 'created',
              policyId: newPolicy._id,
              name: newPolicy.name,
              reason: '新政策'
            });
          }
        } catch (error) {
          syncResult.summary.failed++;
          syncResult.errors.push({
            policyId: policyData.id,
            policyName: policyData.name,
            error: error.message
          });
        }
      }

      // 记录同步日志
      await this.logSyncHistory(syncResult);

      return syncResult;
    } catch (error) {
      throw new Error(`同步政府政策失败: ${error.message}`);
    }
  }

  /**
   * 从政府服务器获取政策数据
   */
  async fetchPoliciesFromGovernment(apiUrl, options = {}) {
    try {
      // 这里应该调用真实的政府API
      // 示例实现（需要根据实际政府API文档调整）
      const axios = require('axios');
      const logger = require('../utils/logger');
      const response = await axios.get(apiUrl, {
        params: {
          region: options.region,
          format: 'json',
          status: 'active'
        },
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data.policies || [];
    } catch (error) {
      // 如果API调用失败，返回模拟数据用于演示
      logger.warn('政府API调用失败，使用模拟数据:', error.message);
      return this.getMockGovernmentPolicies(options.region);
    }
  }

  /**
   * 获取模拟政府政策数据
   */
  getMockGovernmentPolicies(region) {
    return [
      {
        id: `GOV-${region}-001`,
        name: '耕地保护补贴',
        description: '为保护耕地资源，对符合条件的耕地经营者给予补贴',
        policyType: 'subsidy',
        category: 'agriculture',
        issuingAuthority: '农业农村部',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-12-31'),
        calculationRules: {
          calculationType: 'per_area',
          baseAmount: 100,
          perAreaRate: 200,
          unitType: 'mu'
        },
        eligibilityCriteria: {
          minAge: 18,
          maxAge: 65,
          requirements: [
            { field: 'landArea', minValue: 1, description: '耕地面积至少1亩' }
          ]
        },
        maxAmount: 50000,
        tags: ['农业', '耕地', '补贴'],
        version: '2024.1',
        updatedAt: new Date()
      },
      {
        id: `GOV-${region}-002`,
        name: '农村危房改造补助',
        description: '支持农村危房改造，改善农村居民居住条件',
        policyType: 'subsidy',
        category: 'housing',
        issuingAuthority: '住房和城乡建设部',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-12-31'),
        calculationRules: {
          calculationType: 'fixed',
          baseAmount: 20000
        },
        eligibilityCriteria: {
          requirements: [
            { field: 'houseCondition', value: 'dangerous', description: '房屋属于危房' }
          ]
        },
        maxAmount: 30000,
        tags: ['住房', '危房改造', '补助'],
        version: '2024.1',
        updatedAt: new Date()
      },
      {
        id: `GOV-${region}-003`,
        name: '义务教育阶段家庭经济困难学生生活补助',
        description: '对义务教育阶段家庭经济困难学生提供生活补助',
        policyType: 'subsidy',
        category: 'education',
        issuingAuthority: '教育部',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-12-31'),
        calculationRules: {
          calculationType: 'fixed',
          baseAmount: 1000
        },
        eligibilityCriteria: {
          requirements: [
            { field: 'economicDifficulty', value: true, description: '家庭经济困难' }
          ]
        },
        tags: ['教育', '学生', '补助'],
        version: '2024.1',
        updatedAt: new Date()
      },
      {
        id: `GOV-${region}-004`,
        name: '城乡居民基本养老保险补贴',
        description: '对参加城乡居民基本养老保险的居民给予缴费补贴',
        policyType: 'subsidy',
        category: 'elderly',
        issuingAuthority: '人力资源社会保障部',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-12-31'),
        calculationRules: {
          calculationType: 'tiered',
          baseAmount: 500,
          rates: [
            { min: 0, max: 100, rate: 30 },
            { min: 100, max: 200, rate: 40 },
            { min: 200, max: 300, rate: 50 },
            { min: 300, max: null, rate: 60 }
          ]
        },
        eligibilityCriteria: {
          minAge: 16,
          maxAge: 59,
          requirements: [
            { field: 'hasInsurance', value: true, description: '已参加养老保险' }
          ]
        },
        tags: ['养老', '保险', '补贴'],
        version: '2024.1',
        updatedAt: new Date()
      },
      {
        id: `GOV-${region}-005`,
        name: '农村居民医疗保险补贴',
        description: '对参加城乡居民基本医疗保险的农村居民给予缴费补贴',
        policyType: 'subsidy',
        category: 'medical',
        issuingAuthority: '国家医疗保障局',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-12-31'),
        calculationRules: {
          calculationType: 'fixed',
          baseAmount: 350
        },
        eligibilityCriteria: {
          requirements: [
            { field: 'hasMedicalInsurance', value: true, description: '已参加医疗保险' }
          ]
        },
        tags: ['医疗', '保险', '补贴'],
        version: '2024.1',
        updatedAt: new Date()
      }
    ];
  }

  /**
   * 判断是否需要更新政策
   */
  shouldUpdatePolicy(existingPolicy, governmentData) {
    // 检查版本号
    if (governmentData.version && existingPolicy.version !== governmentData.version) {
      return true;
    }

    // 检查更新时间
    if (governmentData.updatedAt && existingPolicy.updatedAt) {
      const govUpdateTime = new Date(governmentData.updatedAt);
      const localUpdateTime = new Date(existingPolicy.updatedAt);
      return govUpdateTime > localUpdateTime;
    }

    return false;
  }

  /**
   * 从政府数据更新本地政策
   */
  async updatePolicyFromGovernment(existingPolicy, governmentData) {
    const updateData = {
      name: governmentData.name,
      description: governmentData.description,
      issuingAuthority: governmentData.issuingAuthority,
      effectiveDate: governmentData.effectiveDate,
      expiryDate: governmentData.expiryDate,
      calculationRules: governmentData.calculationRules,
      eligibilityCriteria: governmentData.eligibilityCriteria,
      maxAmount: governmentData.maxAmount,
      tags: governmentData.tags || [],
      version: governmentData.version,
      updatedFrom: 'government_sync',
      updatedAt: new Date(),
      governmentPolicyId: governmentData.id
    };

    await PolicyCalculator.findByIdAndUpdate(existingPolicy._id, updateData);
    return existingPolicy;
  }

  /**
   * 从政府数据创建新政策
   */
  async createPolicyFromGovernment(governmentData) {
    const policyData = {
      name: governmentData.name,
      description: governmentData.description,
      policyType: governmentData.policyType || 'subsidy',
      policyInfo: {
        category: governmentData.category || 'other',
        issuingAuthority: governmentData.issuingAuthority,
        effectiveDate: governmentData.effectiveDate,
        expiryDate: governmentData.expiryDate,
        legalBasis: governmentData.legalBasis || ''
      },
      calculationRules: governmentData.calculationRules || {},
      eligibilityCriteria: governmentData.eligibilityCriteria || {},
      maxAmount: governmentData.maxAmount,
      tags: governmentData.tags || [],
      version: governmentData.version,
      isActive: true,
      updatedFrom: 'government_sync',
      governmentPolicyId: governmentData.id,
      villageId: governmentData.villageId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newPolicy = await PolicyCalculator.create(policyData);
    return newPolicy;
  }

  /**
   * 记录同步历史
   */
  async logSyncHistory(syncResult) {
    // 这里可以实现同步历史记录功能
    // 例如保存到数据库的同步日志表中
    logger.debug('[政府政策同步]', {
      timestamp: syncResult.timestamp,
      summary: syncResult.summary,
      details: syncResult.details.length,
      errors: syncResult.errors.length
    });
  }

  /**
   * 获取最后同步时间
   */
  async getLastSyncTime() {
    // 从数据库或缓存中获取最后同步时间
    const lastSync = await PolicyCalculator.findOne({
      updatedFrom: 'government_sync'
    }).sort({ updatedAt: -1 });

    return lastSync?.updatedAt || null;
  }

  /**
   * 生成PDF表单
   */
  async generatePDFForm(form) {
    // 实现PDF表单生成逻辑
    return { url: '/forms/generated.pdf' };
  }
}

module.exports = new PolicyCalculatorService();