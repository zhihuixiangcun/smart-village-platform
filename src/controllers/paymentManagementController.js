/**
 * 缴费管理控制器
 * 处理医疗保险、养老保险、水电费、物业费等便民缴费功能的HTTP请求
 */

const paymentManagementService = require('../services/paymentManagementService');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== 账单管理 ====================

/**
 * 生成账单
 */
exports.createBill = async (req, res) => {
  try {
    const userId = req.user.id;

    const bill = await paymentManagementService.createBill(req.body, userId);

    return successResponse(res, bill, '账单生成成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取账单列表
 */
exports.getBills = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      payerId: req.query.payerId,
      category: req.query.category,
      type: req.query.type,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await paymentManagementService.getBills(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取账单详情
 */
exports.getBillDetail = async (req, res) => {
  try {
    const { billId } = req.params;

    const bill = await paymentManagementService.getBillDetail(billId);

    return successResponse(res, bill);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 支付账单
 */
exports.payBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const userId = req.user.id;

    const result = await paymentManagementService.payBill(billId, req.body, userId);

    return successResponse(res, result, '支付成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 批量生成账单（从模板）
 */
exports.generateBillsFromTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const periodData = req.body;

    const result = await paymentManagementService.generateBillsFromTemplate(
      templateId,
      periodData,
      userId
    );

    return successResponse(res, result, `成功生成${result.generated}张账单`);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 水电抄表 ====================

/**
 * 创建抄表记录
 */
exports.createMeterReading = async (req, res) => {
  try {
    const userId = req.user.id;

    const reading = await paymentManagementService.createMeterReading(req.body, userId);

    return successResponse(res, reading, '抄表记录创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 确认抄表记录
 */
exports.confirmMeterReading = async (req, res) => {
  try {
    const { readingId } = req.params;
    const userId = req.user.id;

    const result = await paymentManagementService.confirmMeterReading(readingId, userId);

    return successResponse(res, result, '抄表确认成功，账单已生成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 代缴配置 ====================

/**
 * 获取代缴配置
 */
exports.getAutoPaymentConfig = async (req, res) => {
  try {
    const { payerId } = req.params;

    const config = await paymentManagementService.getAutoPaymentConfig(payerId);

    return successResponse(res, config);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新代缴配置
 */
exports.updateAutoPaymentConfig = async (req, res) => {
  try {
    const { payerId } = req.params;

    const config = await paymentManagementService.updateAutoPaymentConfig(payerId, req.body);

    return successResponse(res, config, '代缴配置更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 绑定支付账户
 */
exports.bindPaymentAccount = async (req, res) => {
  try {
    const { payerId } = req.params;
    const { accountType, ...accountData } = req.body;

    const config = await paymentManagementService.bindPaymentAccount(
      payerId,
      accountType,
      accountData
    );

    return successResponse(res, config, '支付账户绑定成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 支付记录 ====================

/**
 * 获取支付记录列表
 */
exports.getPaymentRecords = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      payerId: req.query.payerId,
      status: req.query.status,
      method: req.query.method,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await paymentManagementService.getPaymentRecords(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 申请退款
 */
exports.requestRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await paymentManagementService.requestRefund(paymentId, req.body, userId);

    return successResponse(res, payment, '退款申请成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 账单模板 ====================

/**
 * 获取账单模板列表
 */
exports.getBillTemplates = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      category: req.query.category,
      status: req.query.status,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await paymentManagementService.getBillTemplates(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建账单模板
 */
exports.createBillTemplate = async (req, res) => {
  try {
    const userId = req.user.id;

    const template = await paymentManagementService.createBillTemplate(req.body, userId);

    return successResponse(res, template, '账单模板创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 统计信息 ====================

/**
 * 获取缴费统计
 */
exports.getPaymentStatistics = async (req, res) => {
  try {
    const { villageId } = req.params;
    const period = {
      year: parseInt(req.query.year),
      month: parseInt(req.query.month)
    };

    const statistics = await paymentManagementService.getPaymentStatistics(villageId, period);

    return successResponse(res, statistics);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取用户缴费概况
 */
exports.getUserPaymentSummary = async (req, res) => {
  try {
    const { payerId } = req.params;

    const summary = await paymentManagementService.getUserPaymentSummary(payerId);

    return successResponse(res, summary);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
