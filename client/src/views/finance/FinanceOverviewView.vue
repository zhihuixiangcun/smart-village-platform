<template>
  <div class="finance-overview">
    <!-- 离线管理器 -->
    <offline-manager />

    <!-- PWA管理器 -->
    <pwa-manager ref="pwaManager" />

    <!-- 面包屑导航 -->
    <breadcrumb />

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon><Money /></el-icon>
            财务概览
          </h1>
          <p class="page-subtitle">资金状况 • 收支分析 • 预算执行 • 透明公开</p>
        </div>
        <div class="header-right">
          <el-button @click="refreshData" icon="Refresh" type="primary">
            刷新数据
          </el-button>
          <el-button @click="exportFinanceReport" icon="Download" type="success">
            导出报表
          </el-button>
          <el-button @click="showFinanceSettings" icon="Setting">
            财务设置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 财务统计卡片 -->
    <div class="finance-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card balance">
            <div class="stat-icon">
              <el-icon size="40"><Wallet /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">¥{{ formatMoney(financeStats.currentBalance) }}</div>
              <div class="stat-label">当前余额</div>
              <div class="stat-trend" :class="balanceTrend.class">
                <el-icon><component :is="balanceTrend.icon" /></el-icon>
                {{ balanceTrend.text }}
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card income">
            <div class="stat-icon">
              <el-icon size="40"><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">¥{{ formatMoney(financeStats.monthlyIncome) }}</div>
              <div class="stat-label">本月收入</div>
              <div class="stat-trend income-trend">
                <el-icon><CaretTop /></el-icon>
                +{{ financeStats.incomeGrowth }}%
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card expense">
            <div class="stat-icon">
              <el-icon size="40"><ShoppingCart /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">¥{{ formatMoney(financeStats.monthlyExpense) }}</div>
              <div class="stat-label">本月支出</div>
              <div class="stat-trend expense-trend">
                <el-icon><CaretBottom /></el-icon>
                {{ financeStats.expenseChange }}%
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card budget">
            <div class="stat-icon">
              <el-icon size="40"><PieChart /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ financeStats.budgetUsage }}%</div>
              <div class="stat-label">预算执行率</div>
              <div class="stat-trend">
                <el-progress :percentage="financeStats.budgetUsage" :show-text="false" />
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区域 -->
    <el-row :gutter="20">
      <!-- 左侧内容 -->
      <el-col :span="16">
        <!-- 收支趋势图表 -->
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>收支趋势分析</span>
              <div class="header-actions">
                <el-radio-group v-model="trendPeriod" size="small">
                  <el-radio-button label="7days">7天</el-radio-button>
                  <el-radio-button label="30days">30天</el-radio-button>
                  <el-radio-button label="3months">3个月</el-radio-button>
                  <el-radio-button label="1year">1年</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>

        <!-- 支出分类分析 -->
        <el-card shadow="never" class="chart-card">
          <template #header>
            <span>支出分类分析</span>
          </template>
          <div ref="expenseCategoryChartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 右侧内容 -->
      <el-col :span="8">
        <!-- 待审批事项 -->
        <el-card shadow="never" class="pending-card">
          <template #header>
            <div class="card-header">
              <span>待审批事项</span>
              <el-badge :value="pendingApprovals.length" type="danger">
                <el-button @click="viewAllApprovals" type="text" size="small">
                  查看全部
                </el-button>
              </el-badge>
            </div>
          </template>
          <div class="pending-list">
            <div
              v-for="item in pendingApprovals.slice(0, 5)"
              :key="item.id"
              class="pending-item"
              @click="viewApprovalDetail(item)"
            >
              <div class="pending-info">
                <div class="pending-title">{{ item.title }}</div>
                <div class="pending-meta">
                  <span class="amount">¥{{ formatMoney(item.amount) }}</span>
                  <span class="date">{{ formatDate(item.submitTime) }}</span>
                </div>
              </div>
              <div class="pending-status">
                <el-tag :type="getApprovalStatusType(item.status)" size="small">
                  {{ getApprovalStatusText(item.status) }}
                </el-tag>
              </div>
            </div>
            <div v-if="pendingApprovals.length === 0" class="empty-state">
              <el-empty description="暂无待审批事项" :image-size="80" />
            </div>
          </div>
        </el-card>

        <!-- 近期交易记录 -->
        <el-card shadow="never" class="transaction-card">
          <template #header>
            <div class="card-header">
              <span>近期交易</span>
              <el-button @click="viewAllTransactions" type="text" size="small">
                查看全部
              </el-button>
            </div>
          </template>
          <div class="transaction-list">
            <div
              v-for="transaction in recentTransactions.slice(0, 8)"
              :key="transaction.id"
              class="transaction-item"
            >
              <div class="transaction-icon">
                <el-icon :class="transaction.type === 'income' ? 'income-icon' : 'expense-icon'">
                  <component :is="transaction.type === 'income' ? 'Plus' : 'Minus'" />
                </el-icon>
              </div>
              <div class="transaction-info">
                <div class="transaction-title">{{ transaction.description }}</div>
                <div class="transaction-date">{{ formatDate(transaction.date) }}</div>
              </div>
              <div class="transaction-amount" :class="transaction.type">
                {{ transaction.type === 'income' ? '+' : '-' }}¥{{ formatMoney(transaction.amount) }}
              </div>
            </div>
            <div v-if="recentTransactions.length === 0" class="empty-state">
              <el-empty description="暂无交易记录" :image-size="60" />
            </div>
          </div>
        </el-card>

        <!-- 预算执行情况 -->
        <el-card shadow="never" class="budget-card">
          <template #header>
            <span>预算执行情况</span>
          </template>
          <div class="budget-progress">
            <div
              v-for="budget in budgetItems"
              :key="budget.category"
              class="budget-item"
            >
              <div class="budget-header">
                <span class="budget-category">{{ budget.category }}</span>
                <span class="budget-ratio">{{ budget.used }}/{{ budget.total }}</span>
              </div>
              <el-progress
                :percentage="(budget.used / budget.total) * 100"
                :status="getBudgetStatus(budget.used / budget.total)"
                :stroke-width="8"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 审批详情对话框 -->
    <el-dialog
      v-model="approvalDetailVisible"
      :title="currentApproval?.title"
      width="600px"
    >
      <div v-if="currentApproval" class="approval-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请金额">
            ¥{{ formatMoney(currentApproval.amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ currentApproval.applicant }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDateTime(currentApproval.submitTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getApprovalStatusType(currentApproval.status)">
              {{ getApprovalStatusText(currentApproval.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请说明" :span="2">
            {{ currentApproval.description }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="approvalDetailVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleApproval">
          去审批
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Money, Wallet, TrendCharts, ShoppingCart, PieChart,
  CaretTop, CaretBottom, Plus, Minus, Refresh, Download, Setting
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 导入组件
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import OfflineManager from '@/components/common/OfflineManager.vue'
import PWAManager from '@/components/common/PWAManager.vue'

// 导入API和离线功能
import { financeAPI } from '@/api/finance'
import { useOfflineStorage } from '@/composables/useOfflineStorage'

const router = useRouter()

// 离线存储初始化
const {
  isOnline,
  saveToOfflineStorage,
  getFromOfflineStorage
} = useOfflineStorage({
  keyPrefix: 'finance',
  autoSync: true,
  syncInterval: 30000
})

// 响应式数据
const loading = ref(false)
const trendPeriod = ref('30days')
const approvalDetailVisible = ref(false)
const currentApproval = ref(null)

// 图表引用
const trendChartRef = ref()
const expenseCategoryChartRef = ref()
const pwaManager = ref()

// 财务统计数据
const financeStats = reactive({
  currentBalance: 1250000,
  monthlyIncome: 180000,
  monthlyExpense: 145000,
  incomeGrowth: 8.5,
  expenseChange: -2.3,
  budgetUsage: 72
})

// 待审批事项
const pendingApprovals = ref([
  {
    id: 1,
    title: '村道维修费用申请',
    amount: 25000,
    applicant: '张建设',
    submitTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'pending',
    description: '主村道出现多处坑洼，需要进行维修处理'
  },
  {
    id: 2,
    title: '文化活动经费申请',
    amount: 8000,
    applicant: '李文化',
    submitTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
    status: 'reviewing',
    description: '春节文艺演出活动经费申请'
  },
  {
    id: 3,
    title: '办公用品采购',
    amount: 3500,
    applicant: '王会计',
    submitTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'pending',
    description: '村委会办公用品和耗材采购'
  }
])

// 近期交易记录
const recentTransactions = ref([
  {
    id: 1,
    type: 'income',
    description: '土地流转收入',
    amount: 50000,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    id: 2,
    type: 'expense',
    description: '路灯维护费',
    amount: 1200,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    id: 3,
    type: 'income',
    description: '政府补贴资金',
    amount: 30000,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: 4,
    type: 'expense',
    description: '办公用品采购',
    amount: 850,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: 5,
    type: 'expense',
    description: '清洁用品购买',
    amount: 420,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  }
])

// 预算项目
const budgetItems = ref([
  { category: '基础设施', used: 45000, total: 80000 },
  { category: '日常运营', used: 12000, total: 20000 },
  { category: '文化活动', used: 6000, total: 15000 },
  { category: '应急储备', used: 5000, total: 25000 }
])

// 计算属性
const balanceTrend = computed(() => {
  const change = financeStats.monthlyIncome - financeStats.monthlyExpense
  if (change > 0) {
    return {
      class: 'trend-positive',
      icon: 'CaretTop',
      text: `较上月+¥${formatMoney(Math.abs(change))}`
    }
  } else if (change < 0) {
    return {
      class: 'trend-negative',
      icon: 'CaretBottom',
      text: `较上月-¥${formatMoney(Math.abs(change))}`
    }
  } else {
    return {
      class: 'trend-neutral',
      icon: 'Minus',
      text: '较上月持平'
    }
  }
})

// 方法
const refreshData = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    loading.value = false
  }
}

const exportFinanceReport = () => {
  ElMessage.success('报表导出功能开发中...')
}

const showFinanceSettings = () => {
  ElMessage.info('财务设置功能开发中...')
}

const viewAllApprovals = () => {
  router.push('/finance/approval')
}

const viewAllTransactions = () => {
  router.push('/finance/expenses')
}

const viewApprovalDetail = (approval) => {
  currentApproval.value = approval
  approvalDetailVisible.value = true
}

const handleApproval = () => {
  router.push(`/finance/approval/${currentApproval.value.id}`)
}

const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-CN').format(amount)
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const getApprovalStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    reviewing: 'info',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

const getApprovalStatusText = (status) => {
  const textMap = {
    pending: '待审批',
    reviewing: '审批中',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return textMap[status] || '未知'
}

const getBudgetStatus = (ratio) => {
  if (ratio > 0.9) return 'exception'
  if (ratio > 0.7) return 'warning'
  return 'success'
}

// 初始化图表
const initTrendChart = () => {
  const chart = echarts.init(trendChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = params[0].axisValueLabel + '<br/>'
        params.forEach(param => {
          result += `${param.seriesName}: ¥${formatMoney(param.value)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['收入', '支出']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        data: [120000, 135000, 150000, 165000, 175000, 180000],
        itemStyle: { color: '#67c23a' },
        areaStyle: { opacity: 0.1 }
      },
      {
        name: '支出',
        type: 'line',
        smooth: true,
        data: [95000, 105000, 120000, 135000, 148000, 145000],
        itemStyle: { color: '#f56c6c' },
        areaStyle: { opacity: 0.1 }
      }
    ]
  }

  chart.setOption(option)

  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

const initExpenseCategoryChart = () => {
  const chart = echarts.init(expenseCategoryChartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '支出分类',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 45000, name: '基础设施' },
          { value: 25000, name: '日常运营' },
          { value: 15000, name: '文化活动' },
          { value: 35000, name: '人员工资' },
          { value: 25000, name: '其他支出' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  chart.setOption(option)

  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 生命周期
onMounted(async () => {
  await nextTick()
  initTrendChart()
  initExpenseCategoryChart()
})
</script>

<style lang="scss" scoped>
.finance-overview {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;

  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 20px;
    color: white;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        .page-title {
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-subtitle {
          font-size: 14px;
          opacity: 0.9;
          margin: 0;
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
      }
    }
  }

  .finance-stats {
    margin-bottom: 20px;

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 20px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      &.balance {
        border-left: 4px solid #409eff;
      }

      &.income {
        border-left: 4px solid #67c23a;
      }

      &.expense {
        border-left: 4px solid #f56c6c;
      }

      &.budget {
        border-left: 4px solid #e6a23c;
      }

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(64, 158, 255, 0.1);
        color: #409eff;
      }

      .stat-content {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 4px;
        }

        .stat-label {
          color: #606266;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .stat-trend {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;

          &.trend-positive {
            color: #67c23a;
          }

          &.trend-negative {
            color: #f56c6c;
          }

          &.trend-neutral {
            color: #909399;
          }

          &.income-trend {
            color: #67c23a;
          }

          &.expense-trend {
            color: #f56c6c;
          }
        }
      }
    }
  }

  .chart-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chart-container {
      height: 350px;
    }
  }

  .pending-card {
    margin-bottom: 20px;

    .pending-list {
      .pending-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #ebeef5;
        cursor: pointer;
        transition: background-color 0.3s;

        &:hover {
          background-color: #f5f7fa;
        }

        &:last-child {
          border-bottom: none;
        }

        .pending-info {
          flex: 1;

          .pending-title {
            font-weight: 500;
            color: #303133;
            margin-bottom: 4px;
          }

          .pending-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #909399;

            .amount {
              color: #e6a23c;
              font-weight: 500;
            }
          }
        }

        .pending-status {
          flex-shrink: 0;
        }
      }
    }
  }

  .transaction-card {
    margin-bottom: 20px;

    .transaction-list {
      .transaction-item {
        display: flex;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .transaction-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;

          .income-icon {
            background: rgba(103, 194, 58, 0.1);
            color: #67c23a;
          }

          .expense-icon {
            background: rgba(245, 108, 108, 0.1);
            color: #f56c6c;
          }
        }

        .transaction-info {
          flex: 1;

          .transaction-title {
            font-size: 14px;
            color: #303133;
            margin-bottom: 2px;
          }

          .transaction-date {
            font-size: 12px;
            color: #909399;
          }
        }

        .transaction-amount {
          font-weight: 500;
          font-size: 14px;

          &.income {
            color: #67c23a;
          }

          &.expense {
            color: #f56c6c;
          }
        }
      }
    }
  }

  .budget-card {
    .budget-progress {
      .budget-item {
        margin-bottom: 16px;

        &:last-child {
          margin-bottom: 0;
        }

        .budget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .budget-category {
            font-size: 14px;
            color: #303133;
          }

          .budget-ratio {
            font-size: 12px;
            color: #909399;
          }
        }
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 20px 0;
  }

  .approval-detail {
    .el-descriptions {
      margin-top: 20px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .finance-overview {
    padding: 10px;

    .page-header {
      .header-content {
        flex-direction: column;
        gap: 20px;
        text-align: center;

        .header-right {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
    }

    .finance-stats {
      .el-col {
        margin-bottom: 20px;
      }

      .stat-card {
        .stat-icon {
          width: 50px;
          height: 50px;
        }

        .stat-content {
          .stat-value {
            font-size: 24px;
          }
        }
      }
    }

    .chart-container {
      height: 250px;
    }
  }
}
</style>