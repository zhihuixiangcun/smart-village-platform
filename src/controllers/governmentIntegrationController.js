/**
 * 政务系统集成控制器
 * 处理政务平台对接、数据同步和业务协同
 */

const governmentIntegrationService = require('../services/governmentIntegrationService');
const Village = require('../models/Village');
const SyncHistory = require('../models/SyncHistory');

/**
 * 获取平台连接状态
 */
exports.getConnectionStatus = async (req, res) => {
  try {
    const status = await governmentIntegrationService.getConnectionStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('获取连接状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取连接状态失败',
      error: error.message
    });
  }
};

/**
 * 同步户籍数据到政务平台
 */
exports.syncHouseholdData = async (req, res) => {
  try {
    const { villageId, options = {} } = req.body;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: '村庄ID不能为空'
      });
    }

    // 检查村庄是否存在
    const village = await Village.findById(villageId);
    if (!village) {
      return res.status(404).json({
        success: false,
        message: '村庄不存在'
      });
    }

    // 执行同步
    const result = await governmentIntegrationService.syncHouseholdData(villageId, options);

    // 记录同步历史
    await SyncHistory.create({
      villageId,
      syncType: 'household',
      status: result.success ? 'success' : 'failed',
      totalRecords: result.totalRecords,
      processedRecords: result.processedRecords,
      failedRecords: result.failedRecords,
      duration: result.duration,
      errors: result.errors,
      syncTime: new Date(),
      operator: req.user?.id || 'system'
    });

    res.json({
      success: true,
      data: result,
      message: '户籍数据同步完成'
    });

  } catch (error) {
    logger.error('同步户籍数据失败:', error);
    res.status(500).json({
      success: false,
      message: '同步户籍数据失败',
      error: error.message
    });
  }
};

/**
 * 同步社保数据
 */
exports.syncSocialSecurityData = async (req, res) => {
  try {
    const { villageId, options = {} } = req.body;

    if (!villageId) {
      return res.status(400).json({
        success: false,
        message: '村庄ID不能为空'
      });
    }

    // 检查村庄是否存在
    const village = await Village.findById(villageId);
    if (!village) {
      return res.status(404).json({
        success: false,
        message: '村庄不存在'
      });
    }

    // 执行同步
    const result = await governmentIntegrationService.syncSocialSecurityData(villageId, options);

    // 记录同步历史
    await SyncHistory.create({
      villageId,
      syncType: 'socialSecurity',
      status: result.success ? 'success' : 'failed',
      totalRecords: result.totalRecords,
      processedRecords: result.processedRecords,
      failedRecords: result.failedRecords,
      duration: result.duration,
      errors: result.errors,
      syncTime: new Date(),
      operator: req.user?.id || 'system'
    });

    res.json({
      success: true,
      data: result,
      message: '社保数据同步完成'
    });

  } catch (error) {
    logger.error('同步社保数据失败:', error);
    res.status(500).json({
      success: false,
      message: '同步社保数据失败',
      error: error.message
    });
  }
};

/**
 * 上传统计报表
 */
exports.uploadStatisticsReport = async (req, res) => {
  try {
    const { reportData, reportType } = req.body;

    if (!reportData || !reportType) {
      return res.status(400).json({
        success: false,
        message: '报表数据和类型不能为空'
      });
    }

    // 验证村庄权限
    if (req.user?.role !== 'admin' && req.user?.villageId !== reportData.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权限上传该村庄的报表'
      });
    }

    // 执行上传
    const result = await governmentIntegrationService.uploadStatisticsReport(reportData, reportType);

    res.json({
      success: true,
      data: result,
      message: '统计报表上传成功'
    });

  } catch (error) {
    logger.error('上传统计报表失败:', error);
    res.status(500).json({
      success: false,
      message: '上传统计报表失败',
      error: error.message
    });
  }
};

/**
 * 查询便民服务
 */
exports.queryGovernmentServices = async (req, res) => {
  try {
    const {
      serviceType,
      region,
      category,
      keyword,
      page = 1,
      pageSize = 20
    } = req.query;

    const queryParams = {
      region,
      category,
      keyword,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    };

    const result = await governmentIntegrationService.queryGovernmentServices(
      serviceType,
      queryParams
    );

    res.json({
      success: true,
      data: result,
      message: '便民服务查询完成'
    });

  } catch (error) {
    logger.error('查询便民服务失败:', error);
    res.status(500).json({
      success: false,
      message: '查询便民服务失败',
      error: error.message
    });
  }
};

/**
 * 申请便民服务
 */
exports.applyForGovernmentService = async (req, res) => {
  try {
    const { serviceId, applicantData } = req.body;

    if (!serviceId || !applicantData) {
      return res.status(400).json({
        success: false,
        message: '服务ID和申请数据不能为空'
      });
    }

    // 验证申请人身份
    if (req.user?.role !== 'admin' && req.user?.idCard !== applicantData.idCard) {
      return res.status(403).json({
        success: false,
        message: '只能为自己申请便民服务'
      });
    }

    // 添加申请人信息
    applicantData.userId = req.user?.id;
    applicantData.villageId = req.user?.villageId;

    // 执行申请
    const result = await governmentIntegrationService.applyForGovernmentService(
      serviceId,
      applicantData
    );

    res.json({
      success: true,
      data: result,
      message: '便民服务申请成功'
    });

  } catch (error) {
    logger.error('申请便民服务失败:', error);
    res.status(500).json({
      success: false,
      message: '申请便民服务失败',
      error: error.message
    });
  }
};

/**
 * 获取同步状态
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const status = governmentIntegrationService.getSyncStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('获取同步状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取同步状态失败',
      error: error.message
    });
  }
};

/**
 * 启动自动同步
 */
exports.startAutoSync = async (req, res) => {
  try {
    governmentIntegrationService.startAutoSync();

    res.json({
      success: true,
      message: '自动同步已启动'
    });

  } catch (error) {
    logger.error('启动自动同步失败:', error);
    res.status(500).json({
      success: false,
      message: '启动自动同步失败',
      error: error.message
    });
  }
};

/**
 * 停止自动同步
 */
exports.stopAutoSync = async (req, res) => {
  try {
    governmentIntegrationService.stopAutoSync();

    res.json({
      success: true,
      message: '自动同步已停止'
    });

  } catch (error) {
    logger.error('停止自动同步失败:', error);
    res.status(500).json({
      success: false,
      message: '停止自动同步失败',
      error: error.message
    });
  }
};

/**
 * 获取同步历史记录
 */
exports.getSyncHistory = async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      villageId,
      syncType,
      startDate,
      endDate
    } = req.query;

    // 构建查询条件
    const query = {};

    if (villageId) {
      query.villageId = villageId;
    }

    if (syncType) {
      query.syncType = syncType;
    }

    if (startDate || endDate) {
      query.syncTime = {};
      if (startDate) {
        query.syncTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.syncTime.$lte = new Date(endDate);
      }
    }

    const history = await SyncHistory.find(query)
      .sort({ syncTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('villageId', 'name')
      .lean();

    const total = await SyncHistory.countDocuments(query);

    res.json({
      success: true,
      data: {
        history,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      message: '获取同步历史成功'
    });

  } catch (error) {
    logger.error('获取同步历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取同步历史失败',
      error: error.message
    });
  }
};

/**
 * 批量同步所有村庄数据
 */
exports.batchSyncAllVillages = async (req, res) => {
  try {
    const { syncType = 'household', options = {} } = req.body;

    // 获取所有活跃村庄
    const villages = await Village.find({ isActive: true })
      .select('_id name')
      .lean();

    if (villages.length === 0) {
      return res.json({
        success: true,
        data: {
          totalVillages: 0,
          results: []
        },
        message: '没有需要同步的村庄'
      });
    }

    const results = [];
    let totalProcessed = 0;
    let totalFailed = 0;

    for (const village of villages) {
      try {
        logger.debug(`开始同步村庄: ${village.name}`);
        let result;
        if (syncType === 'household') {
          result = await governmentIntegrationService.syncHouseholdData(
            village._id.toString(),
            options
          );
        } else if (syncType === 'socialSecurity') {
          result = await governmentIntegrationService.syncSocialSecurityData(
            village._id.toString(),
            options
          );
        }

        results.push({
          villageId: village._id,
          villageName: village.name,
          success: true,
          ...result
        });

        totalProcessed += result.processedRecords;
        totalFailed += result.failedRecords;

        // 记录同步历史
        await SyncHistory.create({
          villageId: village._id,
          syncType,
          status: result.success ? 'success' : 'failed',
          totalRecords: result.totalRecords,
          processedRecords: result.processedRecords,
          failedRecords: result.failedRecords,
          duration: result.duration,
          syncTime: new Date(),
          operator: req.user?.id || 'system'
        });

        // 避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        logger.error(`村庄 ${village.name} 同步失败:`, error.message);
        results.push({
          villageId: village._id,
          villageName: village.name,
          success: false,
          error: error.message
        });

        totalFailed++;

        // 记录失败的同步历史
        await SyncHistory.create({
          villageId: village._id,
          syncType,
          status: 'failed',
          error: error.message,
          syncTime: new Date(),
          operator: req.user?.id || 'system'
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalVillages: villages.length,
        successCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length,
        totalProcessed,
        totalFailed,
        results
      },
      message: '批量同步完成'
    });

  } catch (error) {
    logger.error('批量同步失败:', error);
    res.status(500).json({
      success: false,
      message: '批量同步失败',
      error: error.message
    });
  }
};

/**
 * 获取可用的便民服务类型
 */
exports.getAvailableServiceTypes = async (req, res) => {
  try {
    const serviceTypes = [
      {
        code: 'social_security',
        name: '社保服务',
        description: '社保查询、缴费、待遇申领等',
        icon: 'social_security',
        category: '民生保障'
      },
      {
        code: 'medical',
        name: '医疗服务',
        description: '医保报销、预约挂号、健康档案等',
        icon: 'medical',
        category: '医疗健康'
      },
      {
        code: 'education',
        name: '教育服务',
        description: '学籍管理、助学金申请、学历认证等',
        icon: 'education',
        category: '教育培训'
      },
      {
        code: 'housing',
        name: '住房保障',
        description: '公租房申请、公积金查询、房产登记等',
        icon: 'housing',
        category: '住房保障'
      },
      {
        code: 'employment',
        name: '就业服务',
        description: '招聘信息、职业培训、失业保险等',
        icon: 'employment',
        category: '就业创业'
      },
      {
        code: 'elderly',
        name: '养老服务',
        description: '养老补贴、助餐服务、日间照料等',
        icon: 'elderly',
        category: '为老服务'
      },
      {
        code: 'disability',
        name: '助残服务',
        description: '残疾证办理、康复服务、无障碍改造等',
        icon: 'disability',
        category: '助残服务'
      },
      {
        code: 'agriculture',
        name: '农业服务',
        description: '农业补贴、农机服务、技术推广等',
        icon: 'agriculture',
        category: '农业服务'
      }
    ];

    res.json({
      success: true,
      data: serviceTypes,
      message: '获取服务类型成功'
    });

  } catch (error) {
    logger.error('获取服务类型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取服务类型失败',
      error: error.message
    });
  }
};

/**
 * 获取我的服务申请记录
 */
exports.getMyApplications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, page = 1, pageSize = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    const ApplicationHistory = require('../models/ApplicationHistory');

    const query = { applicantId: req.user.idCard };
    if (status) {
      query.status = status;
    }

    const applications = await ApplicationHistory.find(query)
      .sort({ applyTime: -1 })
      .limit(parseInt(pageSize))
      .skip((parseInt(page) - 1) * parseInt(pageSize))
      .populate('serviceId', 'name type category')
      .lean();

    const total = await ApplicationHistory.countDocuments(query);

    res.json({
      success: true,
      data: {
        applications,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      },
      message: '获取申请记录成功'
    });

  } catch (error) {
    logger.error('获取申请记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取申请记录失败',
      error: error.message
    });
  }
};

/**
 * 取消服务申请
 */
exports.cancelApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      });
    }

    const ApplicationHistory = require('../models/ApplicationHistory');
const logger = require('../utils/logger');

    // 查找申请记录
    const application = await ApplicationHistory.findOne({
      _id: applicationId,
      applicantId: req.user.idCard
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请记录不存在'
      });
    }

    if (application.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: '只能取消已提交状态的申请'
      });
    }

    // 调用政务平台取消申请
    try {
      await governmentIntegrationService.makeRequest(
        'municipalPlatform',
        'POST',
        `/services/${application.serviceId}/cancel`,
        { applicationId }
      );

      // 更新本地状态
      application.status = 'cancelled';
      application.cancelTime = new Date();
      await application.save();

      res.json({
        success: true,
        message: '申请已取消'
      });

    } catch (error) {
      logger.error('取消政务申请失败:', error);
      res.status(500).json({
        success: false,
        message: '取消申请失败',
        error: error.message
      });
    }

  } catch (error) {
    logger.error('取消申请失败:', error);
    res.status(500).json({
      success: false,
      message: '取消申请失败',
      error: error.message
    });
  }
};