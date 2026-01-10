<template>
  <div class="finance-management">
    <!-- 财务概览仪表板 -->
    <div class="finance-dashboard">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card income-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <h3>本月收入</h3>
                <p class="stat-value">¥{{ formatCurrency(monthlyStats.income) }}</p>
                <span class="stat-change positive">
                  <el-icon><ArrowUp /></el-icon>
                  {{ monthlyStats.incomeGrowth }}%
                </span>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card expense-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-info">
                <h3>本月支出</h3>
                <p class="stat-value">¥{{ formatCurrency(monthlyStats.expense) }}</p>
                <span class="stat-change negative">
                  <el-icon><ArrowDown /></el-icon>
                  {{ monthlyStats.expenseGrowth }}%
                </span>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card budget-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><PieChart /></el-icon>
              </div>
              <div class="stat-info">
                <h3>预算余额</h3>
                <p class="stat-value">¥{{ formatCurrency(monthlyStats.budgetBalance) }}</p>
                <span
                  class="stat-change"
                  :class="monthlyStats.budgetUsageRate > 80 ? 'negative' : 'positive'"
                >
                  使用率 {{ monthlyStats.budgetUsageRate }}%
                </span>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card pending-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <h3>待审批</h3>
                <p class="stat-value">{{ pendingCount }}</p>
                <span class="stat-change warning"> 金额 ¥{{ formatCurrency(pendingAmount) }} </span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 功能导航 -->
    <div class="function-nav">
      <el-card>
        <div class="nav-header">
          <h3>财务管理</h3>
          <div class="quick-actions">
            <el-button type="primary" @click="showCreateDialog = true" v-if="canCreateFinance">
              <el-icon><Plus /></el-icon>
              新增财务记录
            </el-button>
            <el-button type="success" @click="showOCRDialog = true" v-if="canCreateFinance">
              <el-icon><Picture /></el-icon>
              发票识别
            </el-button>
            <el-button @click="showReportDialog = true" v-if="canViewReports">
              <el-icon><Document /></el-icon>
              生成报表
            </el-button>
          </div>
        </div>

        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="财务记录" name="records">
            <finance-record-list
              ref="financeListRef"
              @approve="handleApprove"
              @view="handleViewRecord"
            />
          </el-tab-pane>

          <el-tab-pane label="预算管理" name="budget">
            <budget-management @budget-updated="handleBudgetUpdated" />
          </el-tab-pane>

          <el-tab-pane label="待审批" name="pending" v-if="canApprove">
            <pending-approvals @approve="handleApprove" @reject="handleReject" />
          </el-tab-pane>

          <el-tab-pane label="财务统计" name="statistics" v-if="canViewStats">
            <finance-statistics />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <!-- 新增财务记录对话框 -->
    <finance-create-dialog v-model="showCreateDialog" @created="onFinanceCreated" />

    <!-- OCR发票识别对话框 -->
    <invoice-ocr-dialog v-model="showOCRDialog" @recognized="onInvoiceRecognized" />

    <!-- 财务报表对话框 -->
    <finance-report-dialog v-model="showReportDialog" />

    <!-- 财务记录详情对话框 -->
    <finance-detail-dialog v-model="showDetailDialog" :record="selectedRecord" />

    <!-- 审批对话框 -->
    <approval-dialog
      v-model="showApprovalDialog"
      :record="selectedRecord"
      @approved="onApprovalCompleted"
      @rejected="onApprovalCompleted"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  TrendCharts,
  ShoppingCart,
  PieChart,
  Clock,
  Plus,
  Picture,
  Document,
  ArrowUp,
  ArrowDown,
} from '@element-plus/icons-vue';
import FinanceRecordList from './FinanceRecordList.vue';
import BudgetManagement from './BudgetManagement.vue';
import PendingApprovals from './PendingApprovals.vue';
import FinanceStatistics from './FinanceStatistics.vue';
import FinanceCreateDialog from './FinanceCreateDialog.vue';
import InvoiceOCRDialog from './InvoiceOCRDialog.vue';
import FinanceReportDialog from './FinanceReportDialog.vue';
import FinanceDetailDialog from './FinanceDetailDialog.vue';
import ApprovalDialog from './ApprovalDialog.vue';
import { financeApi } from '@/api/project';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();

// 响应式数据
const activeTab = ref('records');
const financeListRef = ref();
const showCreateDialog = ref(false);
const showOCRDialog = ref(false);
const showReportDialog = ref(false);
const showDetailDialog = ref(false);
const showApprovalDialog = ref(false);
const selectedRecord = ref(null);

// 统计数据
const monthlyStats = reactive({
  income: 0,
  expense: 0,
  budgetBalance: 0,
  budgetUsageRate: 0,
  incomeGrowth: 0,
  expenseGrowth: 0,
});

const pendingCount = ref(0);
const pendingAmount = ref(0);

// 权限计算
const canCreateFinance = computed(() => {
  return userStore.hasPermission('financial_management', 'create');
});

const canApprove = computed(() => {
  return userStore.hasPermission('financial_management', 'approve');
});

const canViewReports = computed(() => {
  return userStore.hasPermission('report_generation', 'create');
});

const canViewStats = computed(() => {
  return userStore.hasPermission('financial_management', 'read');
});

// 生命周期
onMounted(() => {
  loadDashboardData();
});

// 方法
const loadDashboardData = async () => {
  try {
    await Promise.all([loadMonthlyStats(), loadPendingStats()]);
  } catch (error) {
    ElMessage.error('加载财务数据失败：' + error.message);
  }
};

const loadMonthlyStats = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const response = await financeApi.getStatistics(userStore.currentVillage._id, {
      year: currentYear,
    });

    const stats = response.data;

    // 计算本月收支
    const currentMonth = new Date().getMonth() + 1;
    const monthlyData = stats.monthlyTrend.filter(item => item._id.month === currentMonth);

    monthlyStats.income = monthlyData
      .filter(item => item._id.type === 'income')
      .reduce((sum, item) => sum + item.totalAmount, 0);

    monthlyStats.expense = monthlyData
      .filter(item => item._id.type === 'expense')
      .reduce((sum, item) => sum + item.totalAmount, 0);

    // 模拟预算数据和增长率
    monthlyStats.budgetBalance = 500000 - monthlyStats.expense;
    monthlyStats.budgetUsageRate = Math.round((monthlyStats.expense / 500000) * 100);
    monthlyStats.incomeGrowth = Math.round(Math.random() * 20);
    monthlyStats.expenseGrowth = Math.round(Math.random() * 15);
  } catch (error) {
    console.error('加载月度统计失败:', error);
  }
};

const loadPendingStats = async () => {
  try {
    if (canApprove.value) {
      const response = await financeApi.getPendingApprovals({
        villageId: userStore.currentVillage._id,
      });

      const pendingRecords = response.data;
      pendingCount.value = pendingRecords.length;
      pendingAmount.value = pendingRecords.reduce((sum, record) => sum + record.amount, 0);
    }
  } catch (error) {
    console.error('加载待审批统计失败:', error);
  }
};

// 标签切换处理
const handleTabChange = tabName => {
  activeTab.value = tabName;
};

// 事件处理
const onFinanceCreated = () => {
  showCreateDialog.value = false;
  loadDashboardData();

  // 刷新财务记录列表
  if (financeListRef.value) {
    financeListRef.value.loadFinanceRecords();
  }
};

const onInvoiceRecognized = ocrResult => {
  showOCRDialog.value = false;

  // 用OCR结果预填充创建表单
  showCreateDialog.value = true;
  // 这里可以传递OCR结果给创建对话框
};

const handleViewRecord = record => {
  selectedRecord.value = record;
  showDetailDialog.value = true;
};

const handleApprove = record => {
  selectedRecord.value = record;
  showApprovalDialog.value = true;
};

const handleReject = record => {
  selectedRecord.value = record;
  showApprovalDialog.value = true;
};

const onApprovalCompleted = () => {
  showApprovalDialog.value = false;
  selectedRecord.value = null;
  loadDashboardData();

  // 刷新相关列表
  if (financeListRef.value) {
    financeListRef.value.loadFinanceRecords();
  }
};

const handleBudgetUpdated = () => {
  loadDashboardData();
};

// 工具函数
const formatCurrency = amount => {
  if (amount === undefined || amount === null) return '0.00';
  return Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
</script>

<style scoped>
.finance-management {
  padding: 20px;
}

.finance-dashboard {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.income-card .stat-icon {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.expense-card .stat-icon {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.budget-card .stat-icon {
  background: linear-gradient(135deg, #409eff, #66b1ff);
}

.pending-card .stat-icon {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
}

.stat-info {
  flex: 1;
}

.stat-info h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.stat-value {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-change {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  gap: 4px;
}

.stat-change.positive {
  color: #67c23a;
}

.stat-change.negative {
  color: #f56c6c;
}

.stat-change.warning {
  color: #e6a23c;
}

.function-nav {
  border-radius: 12px;
  overflow: hidden;
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.nav-header h3 {
  margin: 0;
  color: #303133;
  font-size: 20px;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.quick-actions .el-button {
  border-radius: 8px;
}

/* 标签页样式 */
:deep(.el-tabs__header) {
  margin: 0 0 20px 0;
}

:deep(.el-tabs__nav-wrap) {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 4px;
}

:deep(.el-tabs__item) {
  border-radius: 6px;
  transition: all 0.3s ease;
}

:deep(.el-tabs__item.is-active) {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .finance-dashboard .el-col {
    margin-bottom: 16px;
  }
}

@media (max-width: 768px) {
  .finance-management {
    padding: 16px;
  }

  .nav-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .quick-actions {
    justify-content: center;
  }

  .stat-content {
    padding: 16px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .stat-value {
    font-size: 20px;
  }
}

/* 动画效果 */
.stat-card {
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .stat-card {
    background-color: #2d2d2d;
    border-color: #4d4d4d;
  }

  .stat-value {
    color: #e5eaf3;
  }

  .stat-info h3 {
    color: #a3a6ad;
  }

  :deep(.el-tabs__nav-wrap) {
    background-color: #2d2d2d;
  }

  :deep(.el-tabs__item.is-active) {
    background-color: #3d3d3d;
  }
}
</style>
