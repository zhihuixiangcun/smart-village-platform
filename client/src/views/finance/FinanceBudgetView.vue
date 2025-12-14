<template>
  <div class="finance-budget">
    <!-- 离线管理器 -->
    <offline-manager />

    <!-- 面包屑导航 -->
    <breadcrumb />

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon><PieChart /></el-icon>
            预算管理
          </h1>
          <p class="page-subtitle">预算编制 • 执行监控 • 调整申请 • 绩效评估</p>
        </div>
        <div class="header-right">
          <el-button @click="showCreateBudget" type="primary" icon="Plus">
            新建预算
          </el-button>
          <el-button @click="showBudgetTemplate" type="success" icon="Document">
            预算模板
          </el-button>
          <el-button @click="exportBudgetReport" icon="Download">
            导出报告
          </el-button>
        </div>
      </div>
    </div>

    <!-- 预算概览统计 -->
    <div class="budget-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="overview-card total">
            <div class="card-icon">
              <el-icon size="40"><Money /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-value">¥{{ formatMoney(budgetOverview.totalBudget) }}</div>
              <div class="card-label">年度总预算</div>
              <div class="card-progress">
                <el-progress :percentage="budgetOverview.yearProgress" :show-text="false" />
                <span class="progress-text">已过{{ budgetOverview.yearProgress }}%</span>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card used">
            <div class="card-icon">
              <el-icon size="40"><ShoppingCart /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-value">¥{{ formatMoney(budgetOverview.usedAmount) }}</div>
              <div class="card-label">已使用金额</div>
              <div class="card-progress">
                <el-progress
                  :percentage="budgetOverview.usageRate"
                  :status="getUsageStatus(budgetOverview.usageRate)"
                  :show-text="false"
                />
                <span class="progress-text">使用率{{ budgetOverview.usageRate }}%</span>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card remaining">
            <div class="card-icon">
              <el-icon size="40"><Wallet /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-value">¥{{ formatMoney(budgetOverview.remainingAmount) }}</div>
              <div class="card-label">剩余预算</div>
              <div class="card-trend" :class="getTrendClass(budgetOverview.trendDirection)">
                <el-icon><component :is="getTrendIcon(budgetOverview.trendDirection)" /></el-icon>
                预计{{ budgetOverview.estimatedDays }}天用完
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card efficiency">
            <div class="card-icon">
              <el-icon size="40"><TrendCharts /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-value">{{ budgetOverview.efficiency }}%</div>
              <div class="card-label">执行效率</div>
              <div class="card-status" :class="getEfficiencyStatus(budgetOverview.efficiency)">
                {{ getEfficiencyText(budgetOverview.efficiency) }}
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 预算分类执行情况 -->
    <el-row :gutter="20">
      <!-- 左侧预算列表 -->
      <el-col :span="8">
        <el-card shadow="never" class="budget-list-card">
          <template #header>
            <div class="card-header">
              <span>预算分类</span>
              <el-button @click="refreshBudgets" type="text" size="small" icon="Refresh" />
            </div>
          </template>
          <div class="budget-categories">
            <div
              v-for="category in budgetCategories"
              :key="category.id"
              class="category-item"
              :class="{ active: selectedCategory?.id === category.id }"
              @click="selectCategory(category)"
            >
              <div class="category-header">
                <div class="category-info">
                  <div class="category-name">{{ category.name }}</div>
                  <div class="category-period">{{ category.period }}</div>
                </div>
                <div class="category-status">
                  <el-tag :type="getCategoryStatusType(category.status)" size="small">
                    {{ getCategoryStatusText(category.status) }}
                  </el-tag>
                </div>
              </div>
              <div class="category-amounts">
                <div class="amount-info">
                  <span class="used">已用：¥{{ formatMoney(category.usedAmount) }}</span>
                  <span class="total">总额：¥{{ formatMoney(category.totalAmount) }}</span>
                </div>
                <el-progress
                  :percentage="(category.usedAmount / category.totalAmount) * 100"
                  :status="getProgressStatus(category.usedAmount / category.totalAmount)"
                  :stroke-width="6"
                />
              </div>
              <div class="category-actions">
                <el-dropdown @command="(cmd) => handleCategoryAction(cmd, category)">
                  <el-button type="text" size="small" icon="MoreFilled" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit" icon="Edit">编辑预算</el-dropdown-item>
                      <el-dropdown-item command="adjust" icon="Tools">申请调整</el-dropdown-item>
                      <el-dropdown-item command="history" icon="Clock">执行历史</el-dropdown-item>
                      <el-dropdown-item command="freeze" icon="Lock" divided>冻结预算</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧详情和图表 -->
      <el-col :span="16">
        <!-- 预算详情 -->
        <el-card v-if="selectedCategory" shadow="never" class="budget-detail-card">
          <template #header>
            <div class="detail-header">
              <div class="detail-title">
                <h3>{{ selectedCategory.name }}</h3>
                <div class="detail-meta">
                  <span class="period">{{ selectedCategory.period }}</span>
                  <el-tag :type="getCategoryStatusType(selectedCategory.status)" size="small">
                    {{ getCategoryStatusText(selectedCategory.status) }}
                  </el-tag>
                </div>
              </div>
              <div class="detail-actions">
                <el-button @click="adjustBudget" icon="Tools" size="small">
                  申请调整
                </el-button>
                <el-button @click="viewBudgetDetail" icon="View" size="small">
                  查看详情
                </el-button>
              </div>
            </div>
          </template>

          <!-- 预算执行图表 -->
          <div class="budget-charts">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="chart-section">
                  <h4>执行进度趋势</h4>
                  <div ref="progressChartRef" class="chart-container"></div>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="chart-section">
                  <h4>支出构成分析</h4>
                  <div ref="expenseChartRef" class="chart-container"></div>
                </div>
              </el-col>
            </el-row>
          </div>

          <!-- 预算执行明细 -->
          <div class="budget-details">
            <h4>执行明细</h4>
            <el-table :data="budgetDetails" size="small" border>
              <el-table-column prop="date" label="日期" width="100" />
              <el-table-column prop="description" label="支出项目" min-width="200" />
              <el-table-column prop="amount" label="金额" width="120">
                <template #default="scope">
                  ¥{{ formatMoney(scope.row.amount) }}
                </template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="100">
                <template #default="scope">
                  <el-tag :type="getExpenseTypeColor(scope.row.type)" size="small">
                    {{ getExpenseTypeText(scope.row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getExpenseStatusColor(scope.row.status)" size="small">
                    {{ getExpenseStatusText(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>

        <!-- 空状态 -->
        <el-card v-else shadow="never" class="empty-state-card">
          <el-empty description="请选择左侧预算分类查看详情">
            <el-button @click="showCreateBudget" type="primary">创建新预算</el-button>
          </el-empty>
        </el-card>
      </el-col>
    </el-row>

    <!-- 预算调整申请记录 -->
    <el-card shadow="never" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>预算调整申请</span>
          <el-button @click="viewAllAdjustments" type="text" size="small">
            查看全部
          </el-button>
        </div>
      </template>
      <el-table :data="adjustmentRequests" size="small">
        <el-table-column prop="id" label="申请编号" width="120" />
        <el-table-column prop="category" label="预算分类" width="120" />
        <el-table-column prop="type" label="调整类型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.type === 'increase' ? 'success' : 'warning'" size="small">
              {{ scope.row.type === 'increase' ? '增加' : '减少' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="调整金额" width="120">
          <template #default="scope">
            {{ scope.row.type === 'increase' ? '+' : '-' }}¥{{ formatMoney(scope.row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="调整原因" min-width="200" />
        <el-table-column prop="status" label="审批状态" width="100">
          <template #default="scope">
            <el-tag :type="getAdjustmentStatusColor(scope.row.status)" size="small">
              {{ getAdjustmentStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitTime" label="申请时间" width="150">
          <template #default="scope">
            {{ formatDateTime(scope.row.submitTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button
              type="text"
              size="small"
              @click="viewAdjustmentDetail(scope.row)"
              icon="View"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建预算对话框 -->
    <budget-form-dialog
      v-model="budgetDialogVisible"
      :budget="currentBudget"
      :mode="dialogMode"
      @confirm="handleBudgetSave"
    />

    <!-- 预算调整对话框 -->
    <budget-adjust-dialog
      v-model="adjustDialogVisible"
      :budget="selectedCategory"
      @confirm="handleAdjustmentSubmit"
    />

    <!-- 预算详情对话框 -->
    <budget-detail-dialog
      v-model="detailDialogVisible"
      :budget="selectedCategory"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  PieChart, Plus, Document, Download, Money, ShoppingCart,
  Wallet, TrendCharts, Refresh, MoreFilled, Edit, Tools,
  Clock, Lock, View, CaretTop, CaretBottom
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 导入组件
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import OfflineManager from '@/components/common/OfflineManager.vue'
import BudgetFormDialog from './components/BudgetFormDialog.vue'
import BudgetAdjustDialog from './components/BudgetAdjustDialog.vue'
import BudgetDetailDialog from './components/BudgetDetailDialog.vue'

// 导入API
import { financeAPI } from '@/api/finance'

// 响应式数据
const loading = ref(false)
const selectedCategory = ref(null)
const currentBudget = ref(null)
const dialogMode = ref('add')

// 对话框状态
const budgetDialogVisible = ref(false)
const adjustDialogVisible = ref(false)
const detailDialogVisible = ref(false)

// 图表引用
const progressChartRef = ref()
const expenseChartRef = ref()

// 预算概览数据
const budgetOverview = reactive({
  totalBudget: 2500000,
  usedAmount: 1800000,
  remainingAmount: 700000,
  usageRate: 72,
  yearProgress: 75,
  efficiency: 88,
  trendDirection: 'down',
  estimatedDays: 45
})

// 预算分类数据
const budgetCategories = ref([
  {
    id: 1,
    name: '基础设施建设',
    period: '2025年度',
    totalAmount: 800000,
    usedAmount: 580000,
    status: 'active'
  },
  {
    id: 2,
    name: '日常运营管理',
    period: '2025年度',
    totalAmount: 400000,
    usedAmount: 280000,
    status: 'active'
  },
  {
    id: 3,
    name: '文化活动经费',
    period: '2025年度',
    totalAmount: 300000,
    usedAmount: 180000,
    status: 'active'
  },
  {
    id: 4,
    name: '应急储备资金',
    period: '2025年度',
    totalAmount: 500000,
    usedAmount: 100000,
    status: 'frozen'
  },
  {
    id: 5,
    name: '人员工资福利',
    period: '2025年度',
    totalAmount: 500000,
    usedAmount: 350000,
    status: 'active'
  }
])

// 预算执行明细
const budgetDetails = ref([
  {
    date: '2025-01-15',
    description: '村道路面修复工程',
    amount: 150000,
    type: 'infrastructure',
    status: 'completed'
  },
  {
    date: '2025-01-10',
    description: '路灯安装维护',
    amount: 35000,
    type: 'infrastructure',
    status: 'completed'
  },
  {
    date: '2025-01-08',
    description: '办公设备采购',
    amount: 12000,
    type: 'operation',
    status: 'pending'
  },
  {
    date: '2025-01-05',
    description: '春节文艺活动',
    amount: 25000,
    type: 'culture',
    status: 'approved'
  }
])

// 预算调整申请记录
const adjustmentRequests = ref([
  {
    id: 'ADJ202501001',
    category: '基础设施建设',
    type: 'increase',
    amount: 100000,
    reason: '新增路灯安装项目',
    status: 'pending',
    submitTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'ADJ202501002',
    category: '文化活动经费',
    type: 'decrease',
    amount: 20000,
    reason: '部分活动取消',
    status: 'approved',
    submitTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  }
])

// 计算属性
const selectedCategoryProgress = computed(() => {
  if (!selectedCategory.value) return 0
  return (selectedCategory.value.usedAmount / selectedCategory.value.totalAmount) * 100
})

// 方法
const refreshBudgets = () => {
  ElMessage.success('预算数据已刷新')
}

const selectCategory = async (category) => {
  selectedCategory.value = category
  await nextTick()
  initCharts()
}

const showCreateBudget = () => {
  currentBudget.value = null
  dialogMode.value = 'add'
  budgetDialogVisible.value = true
}

const showBudgetTemplate = () => {
  ElMessage.info('预算模板功能开发中...')
}

const exportBudgetReport = () => {
  ElMessage.success('预算报告导出功能开发中...')
}

const adjustBudget = () => {
  if (!selectedCategory.value) {
    ElMessage.warning('请先选择预算分类')
    return
  }
  adjustDialogVisible.value = true
}

const viewBudgetDetail = () => {
  if (!selectedCategory.value) {
    ElMessage.warning('请先选择预算分类')
    return
  }
  detailDialogVisible.value = true
}

const handleCategoryAction = (command, category) => {
  selectedCategory.value = category

  switch (command) {
    case 'edit':
      currentBudget.value = category
      dialogMode.value = 'edit'
      budgetDialogVisible.value = true
      break
    case 'adjust':
      adjustDialogVisible.value = true
      break
    case 'history':
      ElMessage.info('执行历史功能开发中...')
      break
    case 'freeze':
      freezeBudgetCategory(category)
      break
  }
}

const freezeBudgetCategory = async (category) => {
  try {
    await ElMessageBox.confirm(
      `确定要冻结预算分类 ${category.name} 吗？冻结后将无法进行支出。`,
      '冻结确认',
      {
        confirmButtonText: '确定冻结',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    category.status = 'frozen'
    ElMessage.success('预算已冻结')
  } catch {
    // 取消操作
  }
}

const viewAllAdjustments = () => {
  ElMessage.info('查看全部调整申请功能开发中...')
}

const viewAdjustmentDetail = (adjustment) => {
  ElMessage.info(`查看调整申请详情：${adjustment.id}`)
}

const handleBudgetSave = () => {
  budgetDialogVisible.value = false
  ElMessage.success('预算保存成功')
  refreshBudgets()
}

const handleAdjustmentSubmit = () => {
  adjustDialogVisible.value = false
  ElMessage.success('预算调整申请已提交')
}

// 初始化图表
const initCharts = () => {
  if (!selectedCategory.value) return

  initProgressChart()
  initExpenseChart()
}

const initProgressChart = () => {
  if (!progressChartRef.value) return

  const chart = echarts.init(progressChartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: { type: 'value' },
    series: [{
      name: '预算使用率',
      type: 'line',
      data: [10, 25, 40, 55, 65, 72],
      itemStyle: { color: '#409eff' },
      areaStyle: { opacity: 0.3 }
    }]
  }
  chart.setOption(option)
}

const initExpenseChart = () => {
  if (!expenseChartRef.value) return

  const chart = echarts.init(expenseChartRef.value)
  const option = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '60%',
      data: [
        { value: 300000, name: '工程建设' },
        { value: 150000, name: '设备采购' },
        { value: 80000, name: '维护费用' },
        { value: 50000, name: '其他支出' }
      ]
    }]
  }
  chart.setOption(option)
}

// 工具方法
const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-CN').format(amount)
}

const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const getUsageStatus = (rate) => {
  if (rate > 90) return 'exception'
  if (rate > 70) return 'warning'
  return 'success'
}

const getTrendClass = (direction) => {
  return direction === 'up' ? 'trend-up' : 'trend-down'
}

const getTrendIcon = (direction) => {
  return direction === 'up' ? 'CaretTop' : 'CaretBottom'
}

const getEfficiencyStatus = (efficiency) => {
  if (efficiency >= 90) return 'excellent'
  if (efficiency >= 80) return 'good'
  if (efficiency >= 70) return 'normal'
  return 'poor'
}

const getEfficiencyText = (efficiency) => {
  if (efficiency >= 90) return '优秀'
  if (efficiency >= 80) return '良好'
  if (efficiency >= 70) return '一般'
  return '较差'
}

const getCategoryStatusType = (status) => {
  const typeMap = {
    active: 'success',
    frozen: 'warning',
    completed: 'info'
  }
  return typeMap[status] || 'default'
}

const getCategoryStatusText = (status) => {
  const textMap = {
    active: '执行中',
    frozen: '已冻结',
    completed: '已完成'
  }
  return textMap[status] || '未知'
}

const getProgressStatus = (ratio) => {
  if (ratio > 0.9) return 'exception'
  if (ratio > 0.7) return 'warning'
  return 'success'
}

const getExpenseTypeColor = (type) => {
  const colorMap = {
    infrastructure: 'primary',
    operation: 'success',
    culture: 'warning',
    emergency: 'danger'
  }
  return colorMap[type] || 'default'
}

const getExpenseTypeText = (type) => {
  const textMap = {
    infrastructure: '基础设施',
    operation: '日常运营',
    culture: '文化活动',
    emergency: '应急支出'
  }
  return textMap[type] || '其他'
}

const getExpenseStatusColor = (status) => {
  const colorMap = {
    pending: 'warning',
    approved: 'info',
    completed: 'success',
    rejected: 'danger'
  }
  return colorMap[status] || 'default'
}

const getExpenseStatusText = (status) => {
  const textMap = {
    pending: '待审批',
    approved: '已批准',
    completed: '已完成',
    rejected: '已拒绝'
  }
  return textMap[status] || '未知'
}

const getAdjustmentStatusColor = (status) => {
  const colorMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return colorMap[status] || 'default'
}

const getAdjustmentStatusText = (status) => {
  const textMap = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return textMap[status] || '未知'
}

// 生命周期
onMounted(() => {
  // 默认选择第一个预算分类
  if (budgetCategories.value.length > 0) {
    selectCategory(budgetCategories.value[0])
  }
})
</script>

<style lang="scss" scoped>
.finance-budget {
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

  .budget-overview {
    margin-bottom: 20px;

    .overview-card {
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

      &.total {
        border-left: 4px solid #409eff;
      }

      &.used {
        border-left: 4px solid #e6a23c;
      }

      &.remaining {
        border-left: 4px solid #67c23a;
      }

      &.efficiency {
        border-left: 4px solid #f56c6c;
      }

      .card-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(64, 158, 255, 0.1);
        color: #409eff;
      }

      .card-content {
        flex: 1;

        .card-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 4px;
        }

        .card-label {
          color: #606266;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .card-progress {
          display: flex;
          align-items: center;
          gap: 8px;

          .progress-text {
            font-size: 12px;
            color: #909399;
          }
        }

        .card-trend {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;

          &.trend-up {
            color: #67c23a;
          }

          &.trend-down {
            color: #f56c6c;
          }
        }

        .card-status {
          font-size: 12px;
          font-weight: 500;

          &.excellent {
            color: #67c23a;
          }

          &.good {
            color: #409eff;
          }

          &.normal {
            color: #e6a23c;
          }

          &.poor {
            color: #f56c6c;
          }
        }
      }
    }
  }

  .budget-list-card {
    height: 600px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .budget-categories {
      max-height: 550px;
      overflow-y: auto;

      .category-item {
        padding: 16px;
        border: 1px solid #ebeef5;
        border-radius: 8px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;

        &:hover {
          border-color: #409eff;
          background-color: #f5f7fa;
        }

        &.active {
          border-color: #409eff;
          background-color: #e6f7ff;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          .category-info {
            .category-name {
              font-weight: 500;
              color: #303133;
              margin-bottom: 4px;
            }

            .category-period {
              font-size: 12px;
              color: #909399;
            }
          }
        }

        .category-amounts {
          margin-bottom: 12px;

          .amount-info {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 8px;

            .used {
              color: #e6a23c;
            }

            .total {
              color: #909399;
            }
          }
        }

        .category-actions {
          position: absolute;
          top: 16px;
          right: 16px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        &:hover .category-actions {
          opacity: 1;
        }
      }
    }
  }

  .budget-detail-card {
    height: 600px;
    overflow-y: auto;

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .detail-title {
        h3 {
          margin: 0 0 4px 0;
          color: #303133;
        }

        .detail-meta {
          display: flex;
          align-items: center;
          gap: 12px;

          .period {
            font-size: 14px;
            color: #606266;
          }
        }
      }

      .detail-actions {
        display: flex;
        gap: 8px;
      }
    }

    .budget-charts {
      margin-bottom: 30px;

      .chart-section {
        h4 {
          margin: 0 0 16px 0;
          color: #303133;
        }

        .chart-container {
          height: 200px;
        }
      }
    }

    .budget-details {
      h4 {
        margin: 0 0 16px 0;
        color: #303133;
      }
    }
  }

  .empty-state-card {
    height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .finance-budget {
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

    .budget-overview {
      .el-col {
        margin-bottom: 20px;
      }

      .overview-card {
        .card-icon {
          width: 50px;
          height: 50px;
        }

        .card-content {
          .card-value {
            font-size: 24px;
          }
        }
      }
    }

    .budget-list-card,
    .budget-detail-card {
      height: auto;
      margin-bottom: 20px;
    }
  }
}
</style>