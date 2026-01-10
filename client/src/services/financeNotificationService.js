import { useNotificationSystem } from '@/composables/useNotificationSystem';

/**
 * 财务智能通知服务
 */
export class FinanceNotificationService {
  constructor() {
    this.notificationSystem = useNotificationSystem();
    this.thresholds = {
      budgetWarning: 0.8, // 预算使用率80%警告
      budgetDanger: 0.9, // 预算使用率90%危险
      largeExpense: 10000, // 大额支出阈值
      urgentApproval: 24, // 紧急审批时长（小时）
    };

    this.init();
  }

  init() {
    // 启动定期检查
    this.startPeriodicChecks();

    // 监听财务数据变化
    this.setupEventListeners();
  }

  /**
   * 启动定期检查
   */
  startPeriodicChecks() {
    // 每30分钟检查一次
    setInterval(
      () => {
        this.checkBudgetStatus();
        this.checkPendingApprovals();
        this.checkUnusualExpenses();
      },
      30 * 60 * 1000
    );

    // 每天检查月度汇总
    setInterval(
      () => {
        this.checkMonthlyReports();
      },
      24 * 60 * 60 * 1000
    );
  }

  /**
   * 检查预算状态
   */
  async checkBudgetStatus() {
    try {
      // 这里应该从API获取实际的预算数据
      const budgetData = await this.getBudgetData();

      budgetData.forEach(budget => {
        const usageRate = budget.used / budget.total;
        const remainingDays = this.calculateRemainingDays(budget.period);

        if (usageRate >= this.thresholds.budgetDanger) {
          this.notificationSystem.showBudgetWarning({
            title: '⚠️ 预算超支警告',
            message: `${budget.category}预算已使用${Math.round(usageRate * 100)}%，请立即控制支出！`,
            priority: 'urgent',
            data: { budgetId: budget.id, usageRate },
            actions: [
              {
                text: '查看详情',
                type: 'primary',
                handler: () => this.viewBudgetDetail(budget.id),
              },
              {
                text: '申请调整',
                type: 'warning',
                handler: () => this.requestBudgetAdjustment(budget.id),
              },
            ],
          });
        } else if (usageRate >= this.thresholds.budgetWarning) {
          this.notificationSystem.showBudgetWarning({
            title: '💰 预算使用提醒',
            message: `${budget.category}预算已使用${Math.round(usageRate * 100)}%，建议注意控制支出。`,
            priority: 'high',
            data: { budgetId: budget.id, usageRate },
            actions: [
              {
                text: '查看详情',
                type: 'primary',
                handler: () => this.viewBudgetDetail(budget.id),
              },
            ],
          });
        }

        // 检查预算执行进度是否异常
        if (this.isBudgetProgressAbnormal(usageRate, remainingDays)) {
          this.notificationSystem.showBudgetWarning({
            title: '📊 预算执行异常',
            message: `${budget.category}预算执行进度异常，建议检查支出计划。`,
            priority: 'high',
            data: { budgetId: budget.id, anomaly: true },
          });
        }
      });
    } catch (error) {
      console.error('检查预算状态失败:', error);
    }
  }

  /**
   * 检查待审批事项
   */
  async checkPendingApprovals() {
    try {
      const pendingApprovals = await this.getPendingApprovals();

      pendingApprovals.forEach(approval => {
        const pendingHours = this.calculatePendingHours(approval.submitTime);

        if (pendingHours >= this.thresholds.urgentApproval) {
          this.notificationSystem.showApprovalNotification({
            title: '🔔 审批超时提醒',
            message: `${approval.title}已待审批${pendingHours}小时，请尽快处理！`,
            priority: 'urgent',
            data: { approvalId: approval.id, pendingHours },
            actions: [
              {
                text: '立即审批',
                type: 'primary',
                handler: () => this.openApprovalDetail(approval.id),
              },
              {
                text: '委托他人',
                type: 'warning',
                handler: () => this.delegateApproval(approval.id),
              },
            ],
          });
        } else if (approval.priority === 'urgent' && pendingHours >= 2) {
          this.notificationSystem.showApprovalNotification({
            title: '⚡ 紧急审批提醒',
            message: `紧急审批${approval.title}已等待${pendingHours}小时，请优先处理！`,
            priority: 'urgent',
            data: { approvalId: approval.id },
          });
        }

        // 检查大额支出审批
        if (approval.amount >= this.thresholds.largeExpense) {
          this.notificationSystem.showApprovalNotification({
            title: '💸 大额支出审批',
            message: `大额支出审批${approval.title}(¥${approval.amount.toLocaleString()})需要您的关注。`,
            priority: 'high',
            data: { approvalId: approval.id, largeAmount: true },
          });
        }
      });
    } catch (error) {
      console.error('检查待审批事项失败:', error);
    }
  }

  /**
   * 检查异常支出
   */
  async checkUnusualExpenses() {
    try {
      const recentExpenses = await this.getRecentExpenses();
      const unusualExpenses = this.detectUnusualExpenses(recentExpenses);

      unusualExpenses.forEach(expense => {
        this.notificationSystem.showExpenseAlert({
          title: '🚨 异常支出检测',
          message: `检测到异常支出：${expense.description}，金额：¥${expense.amount.toLocaleString()}`,
          priority: 'high',
          data: { expenseId: expense.id, unusual: true },
          actions: [
            {
              text: '查看详情',
              type: 'primary',
              handler: () => this.viewExpenseDetail(expense.id),
            },
            {
              text: '标记正常',
              type: 'success',
              handler: () => this.markExpenseNormal(expense.id),
            },
          ],
        });
      });
    } catch (error) {
      console.error('检查异常支出失败:', error);
    }
  }

  /**
   * 检查月度报告
   */
  async checkMonthlyReports() {
    const today = new Date();
    const isFirstDayOfMonth = today.getDate() === 1;

    if (isFirstDayOfMonth) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
      const monthName = lastMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

      this.notificationSystem.showNotification({
        type: 'system',
        title: '📊 月度财务报告',
        message: `${monthName}财务数据已汇总完成，请查看月度报告。`,
        priority: 'normal',
        actions: [
          {
            text: '查看报告',
            type: 'primary',
            handler: () => this.viewMonthlyReport(lastMonth),
          },
          {
            text: '导出数据',
            type: 'default',
            handler: () => this.exportMonthlyData(lastMonth),
          },
        ],
      });
    }
  }

  /**
   * 处理新的审批申请
   */
  onNewApproval(approval) {
    // AI智能分析审批建议
    const suggestion = this.analyzeApproval(approval);

    let priority = 'normal';
    let message = `新的审批申请：${approval.title}`;

    if (suggestion.riskLevel === 'high' || suggestion.riskLevel === 'very_high') {
      priority = 'high';
      message += `（AI检测到高风险：${suggestion.riskScore}分）`;
    }

    if (approval.amount >= this.thresholds.largeExpense) {
      priority = 'high';
      message += `（大额支出：¥${approval.amount.toLocaleString()}）`;
    }

    this.notificationSystem.showApprovalNotification({
      title: '📋 新的审批申请',
      message,
      priority,
      data: {
        approvalId: approval.id,
        aiSuggestion: suggestion,
        isNew: true,
      },
      actions: [
        {
          text: '立即审批',
          type: 'primary',
          handler: () => this.openApprovalDetail(approval.id),
        },
        {
          text: 'AI建议',
          type: 'info',
          handler: () => this.showAISuggestion(suggestion),
        },
      ],
    });
  }

  /**
   * 处理审批结果
   */
  onApprovalResult(approval, result) {
    const applicantNotification = {
      title: result === 'approved' ? '✅ 审批通过' : '❌ 审批驳回',
      message: `您的申请${approval.title}已${result === 'approved' ? '通过审批' : '被驳回'}。`,
      priority: 'normal',
      data: { approvalId: approval.id, result },
    };

    if (result === 'approved') {
      applicantNotification.actions = [
        {
          text: '查看详情',
          type: 'primary',
          handler: () => this.viewApprovalResult(approval.id),
        },
      ];
    } else {
      applicantNotification.actions = [
        {
          text: '查看原因',
          type: 'primary',
          handler: () => this.viewRejectionReason(approval.id),
        },
        {
          text: '重新申请',
          type: 'warning',
          handler: () => this.reapplyApproval(approval.id),
        },
      ];
    }

    this.notificationSystem.showNotification(applicantNotification);
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听WebSocket事件
    if (window.socket) {
      window.socket.on('new_approval', this.onNewApproval.bind(this));
      window.socket.on('approval_result', this.onApprovalResult.bind(this));
      window.socket.on('budget_update', this.checkBudgetStatus.bind(this));
      window.socket.on('emergency_alert', this.handleEmergencyAlert.bind(this));
    }

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 页面重新可见时检查是否有新通知
        this.checkForUpdates();
      }
    });
  }

  /**
   * 处理紧急警报
   */
  handleEmergencyAlert(alert) {
    this.notificationSystem.showEmergencyAlert({
      title: '🚨 紧急警报',
      message: alert.message,
      data: alert,
      actions: [
        {
          text: '立即处理',
          type: 'danger',
          handler: () => this.handleEmergency(alert),
        },
        {
          text: '查看详情',
          type: 'primary',
          handler: () => this.viewEmergencyDetail(alert.id),
        },
      ],
    });
  }

  // 辅助方法
  async getBudgetData() {
    // 模拟数据，实际项目中从API获取
    return [
      { id: 1, category: '基础设施', used: 220000, total: 300000, period: '2025-01' },
      { id: 2, category: '日常运营', used: 85000, total: 100000, period: '2025-01' },
    ];
  }

  async getPendingApprovals() {
    // 模拟数据
    return [
      {
        id: 'APP001',
        title: '村道维修费用',
        amount: 25000,
        priority: 'urgent',
        submitTime: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26小时前
      },
    ];
  }

  async getRecentExpenses() {
    // 模拟数据
    return [];
  }

  calculatePendingHours(submitTime) {
    return Math.floor((Date.now() - new Date(submitTime)) / (1000 * 60 * 60));
  }

  calculateRemainingDays(period) {
    // 计算期间剩余天数
    const [year, month] = period.split('-');
    const endOfPeriod = new Date(year, month, 0); // 月末
    const today = new Date();
    return Math.max(0, Math.ceil((endOfPeriod - today) / (1000 * 60 * 60 * 24)));
  }

  isBudgetProgressAbnormal(usageRate, remainingDays) {
    // 简单的异常检测：如果使用率远超时间进度
    const totalDays = 31; // 假设一个月31天
    const expectedProgress = (totalDays - remainingDays) / totalDays;
    return usageRate > expectedProgress + 0.2;
  }

  detectUnusualExpenses(expenses) {
    // 简单的异常检测逻辑
    return expenses.filter(expense => {
      // 检测异常大的金额
      const isUnusuallyLarge = expense.amount > 50000;
      // 检测频繁的重复支出
      const isFrequent = this.checkFrequentExpenses(expense);

      return isUnusuallyLarge || isFrequent;
    });
  }

  checkFrequentExpenses(expense) {
    // 检测是否有频繁的相似支出
    return false; // 简化实现
  }

  analyzeApproval(approval) {
    // 简化的AI分析
    return {
      riskLevel: approval.amount > 20000 ? 'high' : 'low',
      riskScore: approval.amount > 20000 ? 75 : 25,
    };
  }

  // 操作方法
  viewBudgetDetail(budgetId) {
    window.location.href = `/finance/budget/${budgetId}`;
  }

  requestBudgetAdjustment(budgetId) {
    // 打开预算调整对话框
  }

  openApprovalDetail(approvalId) {
    window.location.href = `/finance/approval/${approvalId}`;
  }

  delegateApproval(approvalId) {
    // 打开委托审批对话框
  }

  viewExpenseDetail(expenseId) {
    window.location.href = `/finance/expenses/${expenseId}`;
  }

  markExpenseNormal(expenseId) {
    // 标记支出为正常
  }

  viewMonthlyReport(month) {
    window.location.href = `/finance/reports/monthly/${month.getFullYear()}-${month.getMonth() + 1}`;
  }

  exportMonthlyData(month) {
    // 导出月度数据
  }

  checkForUpdates() {
    // 检查更新
    this.checkBudgetStatus();
    this.checkPendingApprovals();
  }
}

// 创建全局实例
export const financeNotificationService = new FinanceNotificationService();
