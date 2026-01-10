<template>
  <div class="finance-mobile">
    <!-- 顶部概览卡片 -->
    <div class="finance-overview">
      <div class="overview-header">
        <h2>财务管理</h2>
        <div class="date-selector">
          <el-select v-model="selectedPeriod" @change="handlePeriodChange" size="small">
            <el-option label="本月" value="current" />
            <el-option label="上月" value="last" />
            <el-option label="本季度" value="quarter" />
            <el-option label="本年" value="year" />
          </el-select>
        </div>
      </div>

      <div class="overview-cards">
        <div class="card income-card" @click="showIncomeDetail">
          <div class="card-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="card-info">
            <p class="card-label">总收入</p>
            <p class="card-value">¥{{ formatCurrency(overviewData.income) }}</p>
            <p class="card-change positive">
              <el-icon><ArrowUp /></el-icon>
              {{ overviewData.incomeGrowth }}%
            </p>
          </div>
        </div>

        <div class="card expense-card" @click="showExpenseDetail">
          <div class="card-icon">
            <el-icon><ShoppingCart /></el-icon>
          </div>
          <div class="card-info">
            <p class="card-label">总支出</p>
            <p class="card-value">¥{{ formatCurrency(overviewData.expense) }}</p>
            <p class="card-change negative">
              <el-icon><ArrowDown /></el-icon>
              {{ overviewData.expenseGrowth }}%
            </p>
          </div>
        </div>

        <div class="card budget-card" @click="showBudgetDetail">
          <div class="card-icon">
            <el-icon><PieChart /></el-icon>
          </div>
          <div class="card-info">
            <p class="card-label">预算余额</p>
            <p class="card-value">¥{{ formatCurrency(overviewData.budgetBalance) }}</p>
            <p
              class="card-change"
              :class="overviewData.budgetUsageRate > 80 ? 'negative' : 'positive'"
            >
              使用率 {{ overviewData.budgetUsageRate }}%
            </p>
          </div>
        </div>
      </div>

      <!-- 预算进度条 -->
      <div class="budget-progress">
        <div class="progress-header">
          <span class="label">年度预算使用</span>
          <span class="value">{{ overviewData.budgetUsageRate }}%</span>
        </div>
        <el-progress
          :percentage="overviewData.budgetUsageRate"
          :color="progressColor"
          :stroke-width="8"
          show-text="{false}"
        />
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <div class="action-scroll">
        <div
          v-for="action in quickActions"
          :key="action.key"
          class="action-item"
          @click="handleQuickAction(action.key)"
        >
          <div class="action-icon" :class="action.type">
            <el-icon><component :is="action.icon" /></el-icon>
          </div>
          <span class="action-label">{{ action.label }}</span>
        </div>
      </div>
    </div>

    <!-- 选项卡 -->
    <div class="finance-tabs">
      <van-tabs v-model:active="activeTab" sticky>
        <van-tab title="收支明细" name="transactions">
          <TransactionList @item-click="handleTransactionClick" />
        </van-tab>

        <van-tab title="发票管理" name="invoices">
          <InvoiceList @item-click="handleInvoiceClick" />
        </van-tab>

        <van-tab title="审批流程" name="approvals">
          <ApprovalList @item-click="handleApprovalClick" />
        </van-tab>

        <van-tab title="统计报表" name="reports">
          <ReportList @item-click="handleReportClick" />
        </van-tab>
      </van-tabs>
    </div>

    <!-- 悬浮操作按钮 -->
    <div class="fab-container">
      <el-button
        type="primary"
        :icon="fabExpanded ? 'Close' : 'Plus'"
        @click="toggleFab"
        circle
        size="large"
        class="fab-button"
      />

      <transition-group name="fab" tag="div" class="fab-menu">
        <el-button
          v-for="(action, index) in fabActions"
          :key="action.key"
          :type="action.type || 'default'"
          :icon="action.icon"
          @click="handleFabAction(action.key)"
          circle
          size="small"
          class="fab-item"
          v-show="fabExpanded"
          :style="{
            transform: `translateY(${-(index + 1) * 56}px)`,
            transitionDelay: `${index * 30}ms`,
          }"
        >
          <span class="fab-tooltip">{{ action.label }}</span>
        </el-button>
      </transition-group>
    </div>

    <!-- 发票识别弹窗 -->
    <van-popup v-model:show="showOCRPopup" position="bottom" :style="{ height: '70%' }">
      <div class="ocr-popup">
        <div class="popup-header">
          <h3>发票识别</h3>
          <el-button type="text" @click="showOCRPopup = false">关闭</el-button>
        </div>
        <div class="popup-content">
          <InvoiceOCR @success="handleOCRSuccess" @cancel="showOCRPopup = false" />
        </div>
      </div>
    </van-popup>

    <!-- 快速记账弹窗 -->
    <van-popup v-model:show="showQuickAddPopup" position="bottom" :style="{ height: '90%' }">
      <div class="quick-add-popup">
        <div class="popup-header">
          <h3>快速记账</h3>
          <el-button type="text" @click="showQuickAddPopup = false">关闭</el-button>
        </div>
        <div class="popup-content">
          <QuickAddForm @success="handleQuickAddSuccess" @cancel="showQuickAddPopup = false" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  TrendCharts,
  ShoppingCart,
  PieChart,
  ArrowUp,
  ArrowDown,
  Plus,
  Camera,
  Document,
  Money,
  Bell,
  Close,
} from '@element-plus/icons-vue';
import { VanTabs, VanTab, VanPopup } from 'vant';
import TransactionList from './TransactionList.vue';
import InvoiceList from './InvoiceList.vue';
import ApprovalList from './ApprovalList.vue';
import ReportList from './ReportList.vue';
import InvoiceOCR from './InvoiceOCR.vue';
import QuickAddForm from './QuickAddForm.vue';

// 路由
const router = useRouter();

// 响应式数据
const selectedPeriod = ref('current');
const activeTab = ref('transactions');
const fabExpanded = ref(false);
const showOCRPopup = ref(false);
const showQuickAddPopup = ref(false);

// 概览数据
const overviewData = reactive({
  income: 125680.5,
  incomeGrowth: 12.5,
  expense: 89432.3,
  expenseGrowth: 8.2,
  budgetBalance: 36248.2,
  budgetUsageRate: 71.3,
});

// 快捷操作
const quickActions = ref([
  { key: 'add', label: '记账', icon: 'Edit', type: 'primary' },
  { key: 'ocr', label: '扫码', icon: 'Camera', type: 'success' },
  { key: 'budget', label: '预算', icon: 'PieChart', type: 'warning' },
  { key: 'report', label: '报表', icon: 'TrendCharts', type: 'info' },
  { key: 'approval', label: '审批', icon: 'DocumentChecked', type: 'danger' },
]);

// 浮动按钮操作
const fabActions = ref([
  { key: 'income', label: '收入', icon: 'Plus', type: 'success' },
  { key: 'expense', label: '支出', icon: 'Minus', type: 'danger' },
  { key: 'transfer', label: '转账', icon: 'Switch', type: 'warning' },
  { key: 'ocr', label: '扫发票', icon: 'Camera', type: 'primary' },
]);

// 计算属性
const progressColor = computed(() => {
  const rate = overviewData.budgetUsageRate;
  if (rate < 60) return '#67c23a';
  if (rate < 80) return '#e6a23c';
  return '#f56c6c';
});

// 方法
const formatCurrency = amount => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace('¥', '');
};

const handlePeriodChange = period => {
  // 加载对应时期的数据
  loadOverviewData(period);
};

const loadOverviewData = async period => {
  // 模拟API调用
  ElMessage.loading('加载数据中...');
  await new Promise(resolve => setTimeout(resolve, 500));
  ElMessage.closeAll();
};

const showIncomeDetail = () => {
  router.push('/finance/income');
};

const showExpenseDetail = () => {
  router.push('/finance/expense');
};

const showBudgetDetail = () => {
  router.push('/finance/budget');
};

const handleQuickAction = action => {
  switch (action) {
    case 'add':
      showQuickAddPopup.value = true;
      break;
    case 'ocr':
      showOCRPopup.value = true;
      break;
    case 'budget':
      router.push('/finance/budget');
      break;
    case 'report':
      router.push('/finance/reports');
      break;
    case 'approval':
      activeTab.value = 'approvals';
      break;
  }
};

const handleTransactionClick = transaction => {
  router.push(`/finance/transaction/${transaction.id}`);
};

const handleInvoiceClick = invoice => {
  router.push(`/finance/invoice/${invoice.id}`);
};

const handleApprovalClick = approval => {
  router.push(`/finance/approval/${approval.id}`);
};

const handleReportClick = report => {
  if (report.type === 'monthly') {
    router.push('/finance/reports/monthly');
  } else if (report.type === 'yearly') {
    router.push('/finance/reports/yearly');
  }
};

const toggleFab = () => {
  fabExpanded.value = !fabExpanded.value;
};

const handleFabAction = action => {
  fabExpanded.value = false;

  switch (action) {
    case 'income':
      showQuickAddPopup.value = true;
      // 传递收入类型
      break;
    case 'expense':
      showQuickAddPopup.value = true;
      // 传递支出类型
      break;
    case 'transfer':
      router.push('/finance/transfer');
      break;
    case 'ocr':
      showOCRPopup.value = true;
      break;
  }
};

const handleOCRSuccess = invoiceData => {
  showOCRPopup.value = false;
  ElMessage.success('发票识别成功');
  // 跳转到确认页面
  router.push({
    path: '/finance/confirm',
    query: { data: JSON.stringify(invoiceData) },
  });
};

const handleQuickAddSuccess = transaction => {
  showQuickAddPopup.value = false;
  ElMessage.success('记账成功');
  // 刷新列表
  window.location.reload();
};

// 生命周期
onMounted(() => {
  loadOverviewData(selectedPeriod.value);
});
</script>

<style lang="scss" scoped>
.finance-mobile {
  background: #f5f5f5;
  min-height: 100vh;

  // 顶部概览
  .finance-overview {
    background: white;
    padding: 16px;
    margin-bottom: 12px;

    .overview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #333;
      }
    }

    .overview-cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 20px;

      .card {
        display: flex;
        align-items: center;
        padding: 16px;
        border-radius: 12px;
        background: #f8f9fa;
        cursor: pointer;
        transition: all 0.3s;

        &:active {
          transform: scale(0.98);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;

          .el-icon {
            font-size: 24px;
            color: white;
          }
        }

        .card-info {
          flex: 1;

          .card-label {
            font-size: 14px;
            color: #666;
            margin: 0 0 4px 0;
          }

          .card-value {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin: 0 0 4px 0;
          }

          .card-change {
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 2px;

            .el-icon {
              font-size: 12px;
            }

            &.positive {
              color: #67c23a;
            }

            &.negative {
              color: #f56c6c;
            }
          }
        }

        &.income-card .card-icon {
          background: linear-gradient(135deg, #67c23a, #85ce61);
        }

        &.expense-card .card-icon {
          background: linear-gradient(135deg, #f56c6c, #f78989);
        }

        &.budget-card .card-icon {
          background: linear-gradient(135deg, #409eff, #66b1ff);
        }
      }
    }

    .budget-progress {
      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .label {
          font-size: 14px;
          color: #666;
        }

        .value {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
      }
    }
  }

  // 快捷操作
  .quick-actions {
    background: white;
    padding: 16px;
    margin-bottom: 12px;

    .action-scroll {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }

      .action-item {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        min-width: 60px;

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;

          .el-icon {
            font-size: 24px;
            color: white;
          }

          &.primary {
            background: linear-gradient(135deg, #409eff, #66b1ff);
          }

          &.success {
            background: linear-gradient(135deg, #67c23a, #85ce61);
          }

          &.warning {
            background: linear-gradient(135deg, #e6a23c, #ebb563);
          }

          &.info {
            background: linear-gradient(135deg, #909399, #a6a9ad);
          }

          &.danger {
            background: linear-gradient(135deg, #f56c6c, #f78989);
          }
        }

        .action-label {
          font-size: 12px;
          color: #666;
        }
      }
    }
  }

  // 选项卡
  .finance-tabs {
    background: white;

    :deep(.van-tabs__wrap) {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    :deep(.van-tabs__content) {
      min-height: 400px;
    }
  }

  // 悬浮按钮
  .fab-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 1000;

    .fab-button {
      width: 56px;
      height: 56px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .fab-menu {
      position: absolute;
      bottom: 64px;
      right: 0;

      .fab-item {
        position: absolute;
        bottom: 0;
        right: 0;
        margin-bottom: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        position: relative;

        .fab-tooltip {
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: 8px;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          font-size: 12px;
          border-radius: 4px;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        &:hover .fab-tooltip {
          opacity: 1;
        }
      }
    }
  }

  // 弹窗样式
  .ocr-popup,
  .quick-add-popup {
    height: 100%;
    display: flex;
    flex-direction: column;

    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;

      h3 {
        margin: 0;
        font-size: 16px;
      }
    }

    .popup-content {
      flex: 1;
      overflow-y: auto;
    }
  }
}

// 动画
.fab-enter-active,
.fab-leave-active {
  transition: all 0.3s ease;
}

.fab-enter-from,
.fab-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

// Vant组件覆盖
:deep(.van-tab) {
  font-size: 14px;
}

:deep(.van-tabs__line) {
  background-color: #409eff;
  height: 3px;
}
</style>
