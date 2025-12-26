const policyCalculatorService = require('../services/policyCalculatorService');
const { validationResult } = require('express-validator');

/**
 * 政策计算器控制器
 * 处理政策计算相关的API请求
 */
class PolicyCalculatorController {
  /**
   * 创建政策计算器
   */
  async createPolicyCalculator(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const policyData = {
        ...req.body,
        createdBy: req.user.id
      };

      const calculator = await policyCalculatorService.createPolicyCalculator(policyData);

      res.status(201).json({
        success: true,
        message: '政策计算器创建成功',
        data: calculator
      });
    } catch (error) {
      console.error('创建政策计算器失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建政策计算器失败'
      });
    }
  }

  /**
   * 获取政策计算器列表
   */
  async getPolicyCalculators(req, res) {
    try {
      const filters = {
        villageId: req.query.villageId,
        policyType: req.query.policyType,
        targetGroup: req.query.targetGroup
      };

      const calculators = await policyCalculatorService.getPolicyCalculators(filters);

      res.json({
        success: true,
        message: '获取政策计算器列表成功',
        data: calculators
      });
    } catch (error) {
      console.error('获取政策计算器列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取政策计算器列表失败'
      });
    }
  }

  /**
   * 获取政策计算器详情
   */
  async getPolicyCalculatorById(req, res) {
    try {
      const { id } = req.params;
      const calculator = await policyCalculatorService.getPolicyCalculatorById(id);

      if (!calculator) {
        return res.status(404).json({
          success: false,
          message: '政策计算器不存在'
        });
      }

      res.json({
        success: true,
        message: '获取政策计算器详情成功',
        data: calculator
      });
    } catch (error) {
      console.error('获取政策计算器详情失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取政策计算器详情失败'
      });
    }
  }

  /**
   * 更新政策计算器
   */
  async updatePolicyCalculator(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: req.user.id,
        currentVersion: req.body.currentVersion
      };

      const calculator = await policyCalculatorService.updatePolicyCalculator(id, updateData);

      if (!calculator) {
        return res.status(404).json({
          success: false,
          message: '政策计算器不存在'
        });
      }

      res.json({
        success: true,
        message: '政策计算器更新成功',
        data: calculator
      });
    } catch (error) {
      console.error('更新政策计算器失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新政策计算器失败'
      });
    }
  }

  /**
   * 删除政策计算器（软删除）
   */
  async deletePolicyCalculator(req, res) {
    try {
      const { id } = req.params;

      const calculator = await policyCalculatorService.updatePolicyCalculator(id, {
        isActive: false,
        updatedBy: req.user.id
      });

      if (!calculator) {
        return res.status(404).json({
          success: false,
          message: '政策计算器不存在'
        });
      }

      res.json({
        success: true,
        message: '政策计算器删除成功'
      });
    } catch (error) {
      console.error('删除政策计算器失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除政策计算器失败'
      });
    }
  }

  /**
   * 计算补贴金额
   */
  async calculateSubsidy(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const applicationData = req.body;

      const result = await policyCalculatorService.calculateSubsidy(id, applicationData);

      res.json({
        success: true,
        message: '补贴计算成功',
        data: result
      });
    } catch (error) {
      console.error('计算补贴金额失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '计算补贴金额失败'
      });
    }
  }

  /**
   * 批量计算补贴
   */
  async batchCalculate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { applicationsData } = req.body;

      if (!applicationsData || !Array.isArray(applicationsData) || applicationsData.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的申请数据数组'
        });
      }

      const result = await policyCalculatorService.batchCalculate(id, applicationsData);

      res.json({
        success: true,
        message: '批量计算成功',
        data: result
      });
    } catch (error) {
      console.error('批量计算失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量计算失败'
      });
    }
  }

  /**
   * 创建补贴申请
   */
  async createSubsidyApplication(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const applicationData = {
        ...req.body,
        createdBy: req.user.id
      };

      const application = await policyCalculatorService.createSubsidyApplication(applicationData);

      res.status(201).json({
        success: true,
        message: '补贴申请创建成功',
        data: application
      });
    } catch (error) {
      console.error('创建补贴申请失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建补贴申请失败'
      });
    }
  }

  /**
   * 提交申请
   */
  async submitApplication(req, res) {
    try {
      const { id } = req.params;
      const application = await policyCalculatorService.submitApplication(id);

      res.json({
        success: true,
        message: '申请提交成功',
        data: application
      });
    } catch (error) {
      console.error('提交申请失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '提交申请失败'
      });
    }
  }

  /**
   * 审核申请
   */
  async reviewApplication(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const reviewData = {
        ...req.body,
        reviewerId: req.user.id
      };

      const application = await policyCalculatorService.reviewApplication(id, reviewData);

      res.json({
        success: true,
        message: '申请审核完成',
        data: application
      });
    } catch (error) {
      console.error('审核申请失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '审核申请失败'
      });
    }
  }

  /**
   * 处理支付
   */
  async processPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const paymentData = {
        ...req.body,
        processedBy: req.user.id
      };

      const application = await policyCalculatorService.processPayment(id, paymentData);

      res.json({
        success: true,
        message: '支付处理成功',
        data: application
      });
    } catch (error) {
      console.error('处理支付失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '处理支付失败'
      });
    }
  }

  /**
   * 生成申请表单
   */
  async generateApplicationForm(req, res) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;

      const form = await policyCalculatorService.generateApplicationForm(id, format);

      if (format === 'json') {
        res.json({
          success: true,
          message: '申请表单生成成功',
          data: form
        });
      } else {
        // 返回PDF文件
        res.download(form.filepath, form.filename);
      }
    } catch (error) {
      console.error('生成申请表单失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '生成申请表单失败'
      });
    }
  }

  /**
   * 生成证书
   */
  async generateCertificate(req, res) {
    try {
      const { id } = req.params;
      const options = req.body;

      const certificate = await policyCalculatorService.generateCertificate(id, options);

      res.json({
        success: true,
        message: '证书生成成功',
        data: certificate
      });
    } catch (error) {
      console.error('生成证书失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '生成证书失败'
      });
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { notificationType, content, metadata } = req.body;

      await policyCalculatorService.sendNotification(id, notificationType, content, metadata);

      res.json({
        success: true,
        message: '通知发送成功'
      });
    } catch (error) {
      console.error('发送通知失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '发送通知失败'
      });
    }
  }

  /**
   * 获取申请统计
   */
  async getApplicationStatistics(req, res) {
    try {
      const filters = {
        villageId: req.query.villageId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const statistics = await policyCalculatorService.getApplicationStatistics(filters);

      res.json({
        success: true,
        message: '获取申请统计成功',
        data: statistics
      });
    } catch (error) {
      console.error('获取申请统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取申请统计失败'
      });
    }
  }

  /**
   * 获取申请列表
   */
  async getApplications(req, res) {
    try {
      const filters = {
        villageId: req.query.villageId,
        applicationStatus: req.query.applicationStatus,
        applicantId: req.query.applicantId,
        calculatorId: req.query.calculatorId,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await policyCalculatorService.getApplications(filters);

      res.json({
        success: true,
        message: '获取申请列表成功',
        data: result
      });
    } catch (error) {
      console.error('获取申请列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取申请列表失败'
      });
    }
  }

  /**
   * 获取申请详情
   */
  async getApplicationById(req, res) {
    try {
      const { id } = req.params;
      const application = await policyCalculatorService.getPolicyCalculatorById(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: '申请不存在'
        });
      }

      res.json({
        success: true,
        message: '获取申请详情成功',
        data: application
      });
    } catch (error) {
      console.error('获取申请详情失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取申请详情失败'
      });
    }
  }

  /**
   * 同步政府政策数据
   * POST /api/v1/policy-calculator/sync
   */
  async syncGovernmentPolicies(req, res) {
    try {
      const options = {
        region: req.body.region || req.query.region || 'national',
        forceUpdate: req.body.forceUpdate === true
      };

      const result = await policyCalculatorService.syncGovernmentPolicies(options);

      res.json({
        success: true,
        message: `同步成功：新建 ${result.summary.created} 条，更新 ${result.summary.updated} 条`,
        data: result
      });
    } catch (error) {
      console.error('同步政府政策失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '同步失败'
      });
    }
  }

  /**
   * 获取同步状态
   * GET /api/v1/policy-calculator/sync/status
   */
  async getSyncStatus(req, res) {
    try {
      const lastSyncTime = await policyCalculatorService.getLastSyncTime();

      // 统计本地政策数量
      const PolicyCalculator = require('../models/PolicyCalculator');
      const totalCount = await PolicyCalculator.countDocuments();
      const syncCount = await PolicyCalculator.countDocuments({ updatedFrom: 'government_sync' });

      res.json({
        success: true,
        data: {
          lastSyncTime,
          totalCount,
          syncCount,
          hasSyncCapability: true
        }
      });
    } catch (error) {
      console.error('获取同步状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取同步状态失败'
      });
    }
  }
}

module.exports = new PolicyCalculatorController();