/**
 * 缴费管理服务层
 * 处理医疗保险、养老保险、水电费、物业费等便民缴费功能
 */

const {
  Bill,
  PaymentRecord,
  AutoPaymentConfig,
  BillTemplate,
  MeterReading,
  PaymentStatistics,
  FeeCategory,
  FeeType
} = require('../models/PaymentManagement');
const { Resident } = require('../models/Resident');
const { Village } = require('../models/Village');
const webSocketService = require('./webSocketService');

// ==================== 账单管理 ====================

/**
 * 生成账单
 */
exports.createBill = async (billData, userId) => {
  const { payerId } = billData;

  // 验证村民存在
  const resident = await Resident.findById(payerId);
  if (!resident) {
    throw new Error('村民不存在');
  }

  // 生成账单编号
  const billNumber = await Bill.generateBillNumber(
    billData.billInfo?.type?.substring(0, 4).toUpperCase() || 'BILL'
  );

  // 计算总金额
  let subtotal = 0;
  if (billData.charges && billData.charges.length > 0) {
    billData.charges.forEach(charge => {
      subtotal += charge.amount || (charge.unitPrice * charge.quantity);
    });
  }

  const bill = new Bill({
    ...billData,
    billNumber,
    payerName: resident.name,
    payerPhone: resident.phone,
    payerIdNumber: resident.idNumber,
    amount: {
      subtotal,
      discount: 0,
      lateFee: 0,
      otherFees: 0,
      totalAmount: subtotal,
      paidAmount: 0,
      outstandingAmount: subtotal
    },
    status: 'issued',
    createdBy: userId
  });

  await bill.save();

  // 发送账单通知
  if (webSocketService && bill.reminders.enabled) {
    webSocketService.broadcastToUser(payerId.toString(), {
      type: 'bill_issued',
      data: {
        billId: bill._id,
        billNumber: bill.billNumber,
        title: bill.billInfo.title,
        totalAmount: bill.amount.totalAmount,
        dueDate: bill.dueDate
      }
    });
  }

  return bill;
};

/**
 * 获取账单列表
 */
exports.getBills = async (villageId, options = {}) => {
  const {
    payerId,
    category,
    type,
    status,
    startDate,
    endDate,
    sort = '-issueDate',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId };
  if (payerId) query.payerId = payerId;
  if (category) query['billInfo.category'] = category;
  if (type) query['billInfo.type'] = type;
  if (status) query.status = status;

  if (startDate || endDate) {
    query.issueDate = {};
    if (startDate) query.issueDate.$gte = new Date(startDate);
    if (endDate) query.issueDate.$lte = new Date(endDate);
  }

  const bills = await Bill.find(query)
    .populate('payerId', 'name phone')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    bills,
    total: await Bill.countDocuments(query)
  };
};

/**
 * 获取账单详情
 */
exports.getBillDetail = async (billId) => {
  const bill = await Bill.findById(billId)
    .populate('payerId', 'name phone idNumber')
    .populate('villageId', 'name')
    .populate('createdBy', 'name')
    .lean();

  if (!bill) {
    throw new Error('账单不存在');
  }

  // 获取支付记录
  const payments = await PaymentRecord.find({ billId })
    .sort('-createdAt')
    .lean();

  return {
    ...bill,
    payments
  };
};

/**
 * 支付账单
 */
exports.payBill = async (billId, paymentData, userId) => {
  const bill = await Bill.findById(billId);

  if (!bill) {
    throw new Error('账单不存在');
  }

  if (bill.status === 'paid') {
    throw new Error('账单已支付');
  }

  if (bill.status === 'cancelled') {
    throw new Error('账单已取消，无法支付');
  }

  const { amount, method } = paymentData;

  if (amount > bill.amount.outstandingAmount) {
    throw new Error('支付金额超过应付金额');
  }

  // 生成支付编号
  const paymentNumber = await PaymentRecord.generatePaymentNumber();

  const payment = new PaymentRecord({
    paymentNumber,
    billId,
    billNumber: bill.billNumber,
    payerId: bill.payerId,
    payerName: bill.payerName,
    payerPhone: bill.payerPhone,
    villageId: bill.villageId,
    payment: {
      amount,
      method,
      status: 'pending'
    },
    createdBy: userId
  });

  await payment.save();

  // TODO: 调用支付接口（微信、支付宝等）
  // 模拟支付成功
  await this.processPaymentSuccess(payment._id);

  // 更新账单状态
  await bill.pay(amount, paymentData);

  return {
    payment,
    bill: await Bill.findById(billId).populate('payerId', 'name phone')
  };
};

/**
 * 处理支付成功
 */
exports.processPaymentSuccess = async (paymentId) => {
  const payment = await PaymentRecord.findById(paymentId);

  if (!payment) {
    throw new Error('支付记录不存在');
  }

  payment.payment.status = 'success';
  payment.successTime = new Date();
  payment.callback.received = true;
  payment.callback.receivedAt = new Date();

  await payment.save();

  return payment;
};

/**
 * 批量生成账单（从模板）
 */
exports.generateBillsFromTemplate = async (templateId, periodData, userId) => {
  const template = await BillTemplate.findById(templateId);

  if (!template) {
    throw new Error('账单模板不存在');
  }

  if (template.status !== 'active') {
    throw new Error('模板未启用');
  }

  // 查找适用该模板的所有村民
  const { Resident } = require('../models/Resident');
  const residents = await Resident.find({ villageId: template.villageId });

  const bills = [];
  const billNumber = await Bill.generateBillNumber(
    template.templateInfo.type.substring(0, 4).toUpperCase()
  );

  for (const resident of residents) {
    // 检查是否已有代缴配置
    const autoConfig = await AutoPaymentConfig.findOne({ payerId: resident._id });
    const itemConfig = autoConfig?.autoPaymentItems?.find(
      item => item.feeType === template.templateInfo.type
    );

    // 根据规则计算金额
    let totalAmount = 0;
    const charges = [];

    for (const rule of template.feeRules) {
      const amount = rule.unitPrice * (rule.quantity || 1);
      charges.push({
        name: rule.name,
        unitPrice: rule.unitPrice,
        quantity: 1,
        amount,
        description: rule.calculation
      });
      totalAmount += amount;
    }

    const bill = new Bill({
      billNumber: `${billNumber}_${resident._id.toString().slice(-6)}`,
      payerId: resident._id,
      payerName: resident.name,
      payerPhone: resident.phone,
      payerIdNumber: resident.idNumber,
      villageId: resident.villageId,
      billInfo: {
        category: template.templateInfo.category,
        type: template.templateInfo.type,
        title: template.templateInfo.name,
        description: template.templateInfo.description,
        period: template.billingCycle.type,
        periodStart: periodData.startDate,
        periodEnd: periodData.endDate,
        billingCycle: periodData.cycle
      },
      payeeInfo: template.payeeInfo,
      charges,
      amount: {
        subtotal: totalAmount,
        discount: 0,
        lateFee: 0,
        otherFees: 0,
        totalAmount,
        paidAmount: 0,
        outstandingAmount: totalAmount
      },
      issueDate: new Date(),
      dueDate: periodData.dueDate,
      reminders: {
        enabled: true,
        advanceDays: 3
      },
      createdBy: userId
    });

    await bill.save();
    bills.push(bill);

    // 发送账单通知
    if (webSocketService) {
      webSocketService.broadcastToUser(resident._id.toString(), {
        type: 'bill_issued',
        data: {
          billId: bill._id,
          billNumber: bill.billNumber,
          title: bill.billInfo.title,
          totalAmount: bill.amount.totalAmount,
          dueDate: bill.dueDate
        }
      });
    }
  }

  return {
    success: true,
    generated: bills.length,
    bills: bills.slice(0, 10)  // 返回前10条
  };
};

// ==================== 水电抄表 ====================

/**
 * 创建抄表记录
 */
exports.createMeterReading = async (readingData, userId) => {
  const reading = new MeterReading({
    ...readingData,
    status: 'draft',
    createdBy: userId
  });

  await reading.save();

  return reading;
};

/**
 * 确认抄表记录
 */
exports.confirmMeterReading = async (readingId, userId) => {
  const reading = await MeterReading.findById(readingId);

  if (!reading) {
    throw new Error('抄表记录不存在');
  }

  // 计算用量和费用
  const usage = reading.reading.currentReading - reading.reading.previousReading;
  reading.reading.usage = usage;

  // 根据阶梯价格计算费用
  let totalAmount = reading.charge.unitPrice * usage;

  if (reading.charge.tier1 && usage <= reading.charge.tier1.limit) {
    totalAmount = usage * reading.charge.tier1.price;
  } else if (reading.charge.tier2 && usage <= reading.charge.tier2.limit) {
    totalAmount = reading.charge.tier1.limit * reading.charge.tier1.price +
                  (usage - reading.charge.tier1.limit) * reading.charge.tier2.price;
  } else if (reading.charge.tier3) {
    totalAmount = reading.charge.tier1.limit * reading.charge.tier1.price +
                  (reading.charge.tier2.limit - reading.charge.tier1.limit) * reading.charge.tier2.price +
                  (usage - reading.charge.tier2.limit) * reading.charge.tier3.price;
  }

  reading.charge.totalAmount = totalAmount;
  reading.status = 'confirmed';

  await reading.save();

  // 自动生成账单
  const billNumber = await Bill.generateBillNumber(
    reading.meterInfo.type === 'water' ? 'WATER' : 'ELEC'
  );

  const bill = new Bill({
    billNumber,
    payerId: reading.residentId,
    payerName: '',  // 需要填充
    villageId: reading.villageId,
    billInfo: {
      category: FeeCategory.UTILITIES,
      type: reading.meterInfo.type === 'water' ? FeeType.WATER : FeeType.ELECTRICITY,
      title: reading.meterInfo.type === 'water' ? '水费' : '电费',
      description: `${reading.reading.readingDate.toLocaleDateString()} 抄表`,
      period: 'monthly',
      periodStart: new Date(),
      periodEnd: new Date()
    },
    payeeInfo: {
      name: '水电公司',
      type: 'utility',
      accountNumber: '',
      contactPhone: ''
    },
    charges: [{
      name: reading.meterInfo.type === 'water' ? '用水量' : '用电量',
      unitPrice: reading.charge.unitPrice,
      quantity: usage,
      unit: reading.meterInfo.type === 'water' ? '立方米' : '度',
      amount: totalAmount
    }],
    amount: {
      subtotal: totalAmount,
      discount: 0,
      lateFee: 0,
      otherFees: 0,
      totalAmount,
      paidAmount: 0,
      outstandingAmount: totalAmount
    },
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    usageData: {
      previousReading: reading.reading.previousReading,
      currentReading: reading.reading.currentReading,
      usage,
      unit: reading.meterInfo.type === 'water' ? '立方米' : '度'
    },
    createdBy: userId
  });

  await bill.save();

  // 关联账单
  reading.billId = bill._id;
  reading.status = 'billed';
  await reading.save();

  return { reading, bill };
};

// ==================== 代缴配置 ====================

/**
 * 获取代缴配置
 */
exports.getAutoPaymentConfig = async (payerId) => {
  const config = await AutoPaymentConfig.findOne({ payerId })
    .lean();

  if (!config) {
    // 创建默认配置
    const { Resident } = require('../models/Resident');
    const resident = await Resident.findById(payerId);
    if (!resident) {
      throw new Error('村民不存在');
    }

    const newConfig = new AutoPaymentConfig({
      payerId,
      villageId: resident.villageId,
      autoPaymentItems: [
        { feeType: FeeType.WATER, enabled: true, autoPay: false },
        { feeType: FeeType.ELECTRICITY, enabled: true, autoPay: false },
        { feeType: FeeType.MEDICAL_INSURANCE, enabled: true, autoPay: false },
        { feeType: FeeType.PENSION_INSURANCE, enabled: true, autoPay: false }
      ]
    });

    await newConfig.save();
    return newConfig;
  }

  return config;
};

/**
 * 更新代缴配置
 */
exports.updateAutoPaymentConfig = async (payerId, updates) => {
  const config = await AutoPaymentConfig.findOne({ payerId });

  if (!config) {
    throw new Error('代缴配置不存在');
  }

  Object.keys(updates).forEach(key => {
    if (key === 'autoPaymentItems') {
      config.autoPaymentItems = updates[key];
    } else if (key === 'accounts') {
      config.accounts = { ...config.accounts, ...updates[key] };
    } else {
      config[key] = updates[key];
    }
  });

  await config.save();

  return config;
};

/**
 * 绑定支付账户
 */
exports.bindPaymentAccount = async (payerId, accountType, accountData) => {
  const config = await AutoPaymentConfig.findOne({ payerId });

  if (!config) {
    throw new Error('代缴配置不存在');
  }

  const accountKey = accountType.toLowerCase(); // wechat, alipay, bank

  if (!config.accounts[accountKey]) {
    throw new Error('不支持的账户类型');
  }

  config.accounts[accountKey] = {
    ...accountData,
    bound: true
  };

  await config.save();

  return config;
};

// ==================== 支付记录 ====================

/**
 * 获取支付记录列表
 */
exports.getPaymentRecords = async (villageId, options = {}) => {
  const {
    payerId,
    status,
    method,
    startDate,
    endDate,
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId };
  if (payerId) query.payerId = payerId;
  if (status) query['payment.status'] = status;
  if (method) query['payment.method'] = method;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const records = await PaymentRecord.find(query)
    .populate('payerId', 'name phone')
    .populate('billId', 'billNumber billInfo.title amount.totalAmount')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    records,
    total: await PaymentRecord.countDocuments(query)
  };
};

/**
 * 申请退款
 */
exports.requestRefund = async (paymentId, refundData, userId) => {
  const payment = await PaymentRecord.findById(paymentId);

  if (!payment) {
    throw new Error('支付记录不存在');
  }

  if (payment.payment.status !== 'success') {
    throw new Error('只能对成功的支付申请退款');
  }

  if (payment.refund.applied) {
    throw new Error('已申请退款');
  }

  payment.refund = {
    applied: true,
    ...refundData,
    approvedBy: userId,
    approvedAt: new Date()
  };

  payment.payment.status = 'refunded';

  await payment.save();

  // 更新关联账单
  if (payment.billId) {
    const bill = await Bill.findById(payment.billId);
    if (bill) {
      bill.amount.paidAmount -= payment.refund.amount;
      bill.amount.outstandingAmount += payment.refund.amount;
      if (bill.amount.outstandingAmount > 0) {
        bill.status = 'issued';
      }
      await bill.save();
    }
  }

  return payment;
};

// ==================== 账单模板 ====================

/**
 * 获取账单模板列表
 */
exports.getBillTemplates = async (villageId, options = {}) => {
  const {
    category,
    status = 'active',
    sort = 'sortOrder',
    limit = 100,
    skip = 0
  } = options;

  const query = { villageId };
  if (category) query['templateInfo.category'] = category;
  if (status) query.status = status;

  const templates = await BillTemplate.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    templates,
    total: await BillTemplate.countDocuments(query)
  };
};

/**
 * 创建账单模板
 */
exports.createBillTemplate = async (templateData, userId) => {
  const template = new BillTemplate({
    ...templateData,
    createdBy: userId
  });

  await template.save();

  return template;
};

// ==================== 统计信息 ====================

/**
 * 获取缴费统计
 */
exports.getPaymentStatistics = async (villageId, period = {}) => {
  const now = new Date();
  const year = period.year || now.getFullYear();
  const month = period.month || now.getMonth() + 1;

  // 查找或创建统计记录
  let statistics = await PaymentStatistics.findOne({
    villageId,
    'period.year': year,
    'period.month': month,
    'period.type': 'monthly'
  });

  if (!statistics) {
    // 计算统计数据
    const bills = await Bill.find({
      villageId,
      issueDate: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    }).lean();

    const categoryStats = {};

    let totalBills = bills.length;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    bills.forEach(bill => {
      const category = bill.billInfo.category;
      if (!categoryStats[category]) {
        categoryStats[category] = {
          category,
          billCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          outstandingAmount: 0,
          overdueAmount: 0,
          paymentRate: 0
        };
      }

      categoryStats[category].billCount++;
      categoryStats[category].totalAmount += bill.amount.totalAmount;
      categoryStats[category].paidAmount += bill.amount.paidAmount;
      categoryStats[category].outstandingAmount += bill.amount.outstandingAmount;

      if (bill.isOverdue) {
        categoryStats[category].overdueAmount += bill.amount.outstandingAmount;
      }

      totalAmount += bill.amount.totalAmount;
      totalPaid += bill.amount.paidAmount;
      totalOutstanding += bill.amount.outstandingAmount;

      if (bill.isOverdue) {
        totalOverdue += bill.amount.outstandingAmount;
      }
    });

    // 计算缴费率
    Object.keys(categoryStats).forEach(cat => {
      const stats = categoryStats[cat];
      stats.paymentRate = stats.totalAmount > 0
        ? ((stats.paidAmount / stats.totalAmount) * 100).toFixed(2)
        : '0';
    });

    statistics = new PaymentStatistics({
      period: { year, month, type: 'monthly' },
      villageId,
      statistics: Object.values(categoryStats),
      summary: {
        totalBills,
        totalAmount,
        totalPaid,
        totalOutstanding,
        totalOverdue,
        overallPaymentRate: totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(2) : '0'
      }
    });

    await statistics.save();
  }

  return statistics;
};

/**
 * 获取用户缴费概况
 */
exports.getUserPaymentSummary = async (payerId) => {
  const now = new Date();

  // 待支付账单
  const pendingBills = await Bill.find({
    payerId,
    status: { $in: ['issued', 'overdue'] }
  })
    .sort('dueDate')
    .limit(10)
    .lean();

  // 近期支付记录
  const recentPayments = await PaymentRecord.find({
    payerId,
    'payment.status': 'success'
  })
    .sort('-createdAt')
    .limit(10)
    .populate('billId', 'billNumber billInfo.title')
    .lean();

  // 待支付金额统计
  const pendingStats = await Bill.aggregate([
    { $match: { payerId, status: { $in: ['issued', 'overdue'] } } },
    {
      $group: {
        _id: '$billInfo.category',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount.totalAmount' },
        outstandingAmount: { $sum: '$amount.outstandingAmount' }
      }
    }
  ]);

  return {
    pendingBills,
    pendingStats,
    recentPayments
  };
};
