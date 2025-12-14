<template>
  <div class="finance-reports">
    <!-- 离线管理器 -->
    <offline-manager />

    <!-- 面包屑导航 -->
    <breadcrumb />

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon><DataBoard /></el-icon>
            财务报表
          </h1>
          <p class="page-subtitle">数据统计 • 图表分析 • 报表导出 • 决策支持</p>
        </div>
        <div class="header-right">
          <el-button @click="generateCustomReport" type="primary" icon="Plus">
            生成报表
          </el-button>
          <el-button @click="showReportTemplates" type="success" icon="Document">
            报表模板
          </el-button>
          <el-button @click="exportAllReports" icon="Download">
            批量导出
          </el-button>
        </div>
      </div>
    </div>

    <!-- 报表筛选区域 -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item label="报表类型">
          <el-select v-model="filterForm.reportType" placeholder="全部类型" @change="handleTypeChange">
            <el-option label="收支明细" value="income-expense" />
            <el-option label="预算执行" value="budget-execution" />
            <el-option label="资金流水" value="cash-flow" />
            <el-option label="分类统计" value="category-stats" />
            <el-option label="趋势分析" value="trend-analysis" />
            <el-option label="对比分析" value="comparison" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item label="快速选择">
          <el-radio-group v-model="filterForm.quickRange" @change="handleQuickRangeChange">
            <el-radio-button label="7days">近7天</el-radio-button>
            <el-radio-button label="30days">近30天</el-radio-button>
            <el-radio-button label="3months">近3个月</el-radio-button>
            <el-radio-button label="1year">近1年</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button @click="generateReport" type="primary" icon="Search">生成报表</el-button>
          <el-button @click="resetFilter" icon="Refresh">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 报表展示区域 -->
    <el-row :gutter="20">
      <!-- 左侧报表列表 -->
      <el-col :span="6">
        <el-card shadow="never" class="report-list-card">
          <template #header>
            <div class="card-header">
              <span>报表列表</span>
              <el-button @click="refreshReportList" type="text" size="small" icon="Refresh" />
            </div>
          </template>
          <div class="report-list">
            <div
              v-for="report in reportList"
              :key="report.id"
              class="report-item"
              :class="{ active: selectedReport?.id === report.id }"
              @click="selectReport(report)"
            >
              <div class="report-icon">
                <el-icon><component :is="getReportIcon(report.type)" /></el-icon>
              </div>
              <div class="report-info">
                <div class="report-name">{{ report.name }}</div>
                <div class="report-meta">
                  <span class="report-date">{{ formatDate(report.createTime) }}</span>
                  <el-tag :type="getReportStatusType(report.status)" size="small">
                    {{ getReportStatusText(report.status) }}
                  </el-tag>
                </div>
              </div>
              <div class="report-actions">
                <el-dropdown @command="(cmd) => handleReportAction(cmd, report)">
                  <el-button type="text" size="small" icon="MoreFilled" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="view" icon="View">查看</el-dropdown-item>
                      <el-dropdown-item command="download" icon="Download">下载</el-dropdown-item>
                      <el-dropdown-item command="share" icon="Share">分享</el-dropdown-item>
                      <el-dropdown-item command="delete" icon="Delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧报表内容 -->
      <el-col :span="18">
        <el-card v-if="selectedReport" shadow="never" class="report-content-card">
          <template #header>
            <div class="report-header">
              <div class="report-title">
                <h3>{{ selectedReport.name }}</h3>
                <div class="report-subtitle">
                  {{ selectedReport.description }}
                  <span class="report-period">
                    ({{ formatDateRange(selectedReport.startDate, selectedReport.endDate) }})
                  </span>
                </div>
              </div>
              <div class="report-actions">
                <el-button @click="refreshCurrentReport" icon="Refresh" size="small">
                  刷新数据
                </el-button>
                <el-button @click="exportCurrentReport('pdf')" icon="Download" size="small">
                  导出PDF
                </el-button>
                <el-button @click="exportCurrentReport('excel')" icon="Document" size="small">
                  导出Excel
                </el-button>
              </div>
            </div>
          </template>

          <!-- 报表内容根据类型动态显示 -->
          <div class="report-content" v-loading="reportLoading">
            <!-- 收支明细报表 -->
            <div v-if="selectedReport.type === 'income-expense'" class="income-expense-report">
              <div class="summary-cards">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <div class="summary-card income">
                      <div class="card-icon">
                        <el-icon><TrendCharts /></el-icon>
                      </div>
                      <div class="card-content">
                        <div class="card-value">¥{{ formatMoney(reportData.totalIncome) }}</div>
                        <div class="card-label">总收入</div>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="summary-card expense">
                      <div class="card-icon">
                        <el-icon><ShoppingCart /></el-icon>
                      </div>
                      <div class="card-content">
                        <div class="card-value">¥{{ formatMoney(reportData.totalExpense) }}</div>
                        <div class="card-label">总支出</div>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="summary-card balance">
                      <div class="card-icon">
                        <el-icon><Money /></el-icon>
                      </div>
                      <div class="card-content">
                        <div class="card-value">¥{{ formatMoney(reportData.netBalance) }}</div>
                        <div class="card-label">净结余</div>
                      </div>
                    </div>
                  </el-col>
                </el-row>
              </div>

              <!-- 收支趋势图 -->
              <div class="chart-section">
                <h4>收支趋势分析</h4>
                <div ref="incomeExpenseTrendRef" class="chart-container"></div>
              </div>

              <!-- 分类统计图 -->
              <div class="chart-section">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <h4>收入来源分布</h4>
                    <div ref="incomeSourceChartRef" class="chart-container-small"></div>
                  </el-col>
                  <el-col :span="12">
                    <h4>支出类别分布</h4>
                    <div ref="expenseCategoryChartRef" class="chart-container-small"></div>
                  </el-col>
                </el-row>
              </div>
            </div>

            <!-- 预算执行报表 -->
            <div v-else-if="selectedReport.type === 'budget-execution'" class="budget-execution-report">
              <div class="budget-overview">
                <h4>预算执行概览</h4>
                <div class="budget-progress-list">
                  <div
                    v-for="budget in reportData.budgetItems"
                    :key="budget.category"
                    class="budget-progress-item"
                  >
                    <div class="budget-info">
                      <span class="budget-category">{{ budget.category }}</span>
                      <span class="budget-amounts">
                        ¥{{ formatMoney(budget.used) }} / ¥{{ formatMoney(budget.total) }}
                      </span>
                    </div>
                    <el-progress
                      :percentage="getBudgetPercentage(budget)"
                      :status="getBudgetProgressStatus(budget)"
                      :stroke-width="12"
                    />
                  </div>
                </div>
              </div>

              <!-- 预算执行图表 -->
              <div class="chart-section">
                <h4>预算执行率对比</h4>
                <div ref="budgetExecutionChartRef" class="chart-container"></div>
              </div>
            </div>

            <!-- 资金流水报表 -->
            <div v-else-if="selectedReport.type === 'cash-flow'" class="cash-flow-report">
              <div class="cash-flow-summary">
                <el-row :gutter="20">
                  <el-col :span="6">
                    <div class="flow-item">
                      <div class="flow-value">¥{{ formatMoney(reportData.cashFlow.inflow) }}</div>
                      <div class="flow-label">现金流入</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="flow-item">
                      <div class="flow-value">¥{{ formatMoney(reportData.cashFlow.outflow) }}</div>
                      <div class="flow-label">现金流出</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="flow-item">
                      <div class="flow-value">¥{{ formatMoney(reportData.cashFlow.netFlow) }}</div>
                      <div class="flow-label">净现金流</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="flow-item">
                      <div class="flow-value">¥{{ formatMoney(reportData.cashFlow.endingBalance) }}</div>
                      <div class="flow-label">期末余额</div>
                    </div>
                  </el-col>
                </el-row>
              </div>

              <!-- 现金流量图 -->
              <div class="chart-section">
                <h4>现金流量变化</h4>
                <div ref="cashFlowChartRef" class="chart-container"></div>
              </div>

              <!-- 现金流水明细表 -->
              <div class="table-section">
                <h4>现金流水明细</h4>
                <el-table :data="reportData.cashFlowDetails" border size="small">
                  <el-table-column prop="date" label="日期" width="120" />
                  <el-table-column prop="description" label="摘要" min-width="200" />
                  <el-table-column prop="inflow" label="流入金额" width="120">
                    <template #default="scope">
                      <span v-if="scope.row.inflow" class="text-success">
                        +¥{{ formatMoney(scope.row.inflow) }}
                      </span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="outflow" label="流出金额" width="120">
                    <template #default="scope">
                      <span v-if="scope.row.outflow" class="text-danger">
                        -¥{{ formatMoney(scope.row.outflow) }}
                      </span>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="balance" label="余额" width="120">
                    <template #default="scope">
                      ¥{{ formatMoney(scope.row.balance) }}
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>

            <!-- 趋势分析报表 -->
            <div v-else-if="selectedReport.type === 'trend-analysis'" class="trend-analysis-report">
              <div class="trend-metrics">
                <el-row :gutter="20">
                  <el-col :span="6">
                    <div class="metric-item">
                      <div class="metric-value">{{ reportData.trends.incomeGrowth }}%</div>
                      <div class="metric-label">收入增长率</div>
                      <div class="metric-trend" :class="reportData.trends.incomeGrowth > 0 ? 'positive' : 'negative'">
                        <el-icon><component :is="reportData.trends.incomeGrowth > 0 ? 'CaretTop' : 'CaretBottom'" /></el-icon>
                        较上期
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="metric-item">
                      <div class="metric-value">{{ reportData.trends.expenseGrowth }}%</div>
                      <div class="metric-label">支出增长率</div>
                      <div class="metric-trend" :class="reportData.trends.expenseGrowth > 0 ? 'negative' : 'positive'">
                        <el-icon><component :is="reportData.trends.expenseGrowth > 0 ? 'CaretTop' : 'CaretBottom'" /></el-icon>
                        较上期
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="metric-item">
                      <div class="metric-value">{{ reportData.trends.efficiency }}%</div>
                      <div class="metric-label">资金使用效率</div>
                      <div class="metric-trend positive">
                        <el-icon><TrendCharts /></el-icon>
                        良好
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="metric-item">
                      <div class="metric-value">{{ reportData.trends.stability }}%</div>
                      <div class="metric-label">财务稳定性</div>
                      <div class="metric-trend positive">
                        <el-icon><CircleCheck /></el-icon>
                        稳定
                      </div>
                    </div>
                  </el-col>
                </el-row>
              </div>

              <!-- 趋势分析图表 -->
              <div class="chart-section">
                <h4>长期趋势分析</h4>
                <div ref="trendAnalysisChartRef" class="chart-container"></div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 空状态 -->
        <el-card v-else shadow="never" class="empty-state-card">
          <el-empty description="请选择左侧报表进行查看">
            <el-button @click="generateCustomReport" type="primary">生成新报表</el-button>
          </el-empty>
        </el-card>
      </el-col>
    </el-row>

    <!-- 生成报表对话框 -->
    <generate-report-dialog
      v-model="generateReportVisible"
      @success="handleReportGenerated"
    />

    <!-- 报表模板对话框 -->
    <report-template-dialog
      v-model="templateDialogVisible"
      @select="handleTemplateSelect"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DataBoard, Plus, Document, Download, Refresh, Search,
  TrendCharts, ShoppingCart, Money, View, Share, Delete,
  MoreFilled, CaretTop, CaretBottom, CircleCheck
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 导入组件
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import OfflineManager from '@/components/common/OfflineManager.vue'
import GenerateReportDialog from './components/GenerateReportDialog.vue'
import ReportTemplateDialog from './components/ReportTemplateDialog.vue'

// 导入API
import { financeAPI } from '@/api/finance'

// 响应式数据
const reportLoading = ref(false)
const selectedReport = ref(null)
const reportData = ref({})
const generateReportVisible = ref(false)
const templateDialogVisible = ref(false)

// 筛选表单
const filterForm = reactive({
  reportType: 'income-expense',
  dateRange: [],
  quickRange: '30days'
})

// 报表列表
const reportList = ref([
  {
    id: 1,
    name: '月度收支明细报表',
    type: 'income-expense',
    description: '2025年1月收支情况详细分析',
    status: 'completed',
    createTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  },
  {
    id: 2,
    name: '预算执行情况报表',
    type: 'budget-execution',
    description: '2025年度预算执行进度分析',
    status: 'completed',
    createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  },
  {
    id: 3,
    name: '现金流量报表',
    type: 'cash-flow',
    description: '近三个月资金流动情况',
    status: 'generating',
    createTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
    startDate: '2024-11-01',
    endDate: '2025-01-31'
  }
])

// 图表引用
const incomeExpenseTrendRef = ref()
const incomeSourceChartRef = ref()
const expenseCategoryChartRef = ref()
const budgetExecutionChartRef = ref()
const cashFlowChartRef = ref()
const trendAnalysisChartRef = ref()

// 方法
const handleTypeChange = () => {
  // 根据报表类型改变，更新相关数据
  console.log('报表类型变更:', filterForm.reportType)
}

const handleDateChange = () => {
  console.log('日期范围变更:', filterForm.dateRange)
}

const handleQuickRangeChange = () => {
  const now = new Date()
  const ranges = {
    '7days': [new Date(now - 7 * 24 * 60 * 60 * 1000), now],
    '30days': [new Date(now - 30 * 24 * 60 * 60 * 1000), now],
    '3months': [new Date(now - 90 * 24 * 60 * 60 * 1000), now],
    '1year': [new Date(now - 365 * 24 * 60 * 60 * 1000), now]
  }

  const range = ranges[filterForm.quickRange]
  if (range) {
    filterForm.dateRange = [
      range[0].toISOString().split('T')[0],
      range[1].toISOString().split('T')[0]
    ]
  }
}

const generateReport = () => {
  reportLoading.value = true
  console.log('生成报表:', filterForm)

  // 模拟报表生成
  setTimeout(() => {
    ElMessage.success('报表生成成功')
    reportLoading.value = false
    refreshReportList()
  }, 2000)
}

const resetFilter = () => {
  Object.assign(filterForm, {
    reportType: 'income-expense',
    dateRange: [],
    quickRange: '30days'
  })
}

const refreshReportList = () => {
  console.log('刷新报表列表')
  // 实际项目中调用API
}

const selectReport = async (report) => {
  selectedReport.value = report
  await loadReportData(report)
  await nextTick()
  initCharts()
}

const loadReportData = async (report) => {
  reportLoading.value = true
  try {
    // 模拟数据加载
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 根据报表类型加载不同数据
    switch (report.type) {
      case 'income-expense':
        reportData.value = {
          totalIncome: 850000,
          totalExpense: 650000,
          netBalance: 200000,
          incomeCategories: [
            { name: '政府补贴', value: 400000 },
            { name: '土地流转', value: 300000 },
            { name: '其他收入', value: 150000 }
          ],
          expenseCategories: [
            { name: '基础设施', value: 300000 },
            { name: '日常运营', value: 200000 },
            { name: '文化活动', value: 100000 },
            { name: '其他支出', value: 50000 }
          ]
        }
        break
      case 'budget-execution':
        reportData.value = {
          budgetItems: [
            { category: '基础设施', used: 280000, total: 400000 },
            { category: '日常运营', used: 180000, total: 200000 },
            { category: '文化活动', value: 80000, total: 150000 },
            { category: '应急储备', used: 20000, total: 100000 }
          ]
        }
        break
      case 'cash-flow':
        reportData.value = {
          cashFlow: {
            inflow: 850000,
            outflow: 650000,
            netFlow: 200000,
            endingBalance: 1250000
          },
          cashFlowDetails: [
            { date: '2025-01-01', description: '期初余额', inflow: 0, outflow: 0, balance: 1050000 },
            { date: '2025-01-05', description: '政府补贴收入', inflow: 200000, outflow: 0, balance: 1250000 },
            { date: '2025-01-10', description: '基础设施支出', inflow: 0, outflow: 150000, balance: 1100000 },
            { date: '2025-01-15', description: '土地流转收入', inflow: 100000, outflow: 0, balance: 1200000 },
            { date: '2025-01-20', description: '日常运营支出', inflow: 0, outflow: 80000, balance: 1120000 }
          ]
        }
        break
      case 'trend-analysis':
        reportData.value = {
          trends: {
            incomeGrowth: 12.5,
            expenseGrowth: -5.2,
            efficiency: 85,
            stability: 92
          }
        }
        break
    }
  } catch (error) {
    ElMessage.error('加载报表数据失败')
  } finally {
    reportLoading.value = false
  }
}

const initCharts = () => {
  if (!selectedReport.value) return

  switch (selectedReport.value.type) {
    case 'income-expense':
      initIncomeExpenseCharts()
      break
    case 'budget-execution':
      initBudgetExecutionChart()
      break
    case 'cash-flow':
      initCashFlowChart()
      break
    case 'trend-analysis':
      initTrendAnalysisChart()
      break
  }
}

const initIncomeExpenseCharts = () => {
  // 收支趋势图
  if (incomeExpenseTrendRef.value) {
    const chart = echarts.init(incomeExpenseTrendRef.value)
    const option = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['收入', '支出'] },
      xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
      yAxis: { type: 'value' },
      series: [
        {
          name: '收入',
          type: 'line',
          data: [120000, 135000, 150000, 165000, 175000, 180000],
          itemStyle: { color: '#67c23a' }
        },
        {
          name: '支出',
          type: 'line',
          data: [95000, 105000, 120000, 135000, 148000, 145000],
          itemStyle: { color: '#f56c6c' }
        }
      ]
    }
    chart.setOption(option)
  }

  // 收入来源饼图
  if (incomeSourceChartRef.value) {
    const chart = echarts.init(incomeSourceChartRef.value)
    const option = {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: '60%',
        data: reportData.value.incomeCategories
      }]
    }
    chart.setOption(option)
  }

  // 支出类别饼图
  if (expenseCategoryChartRef.value) {
    const chart = echarts.init(expenseCategoryChartRef.value)
    const option = {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: '60%',
        data: reportData.value.expenseCategories
      }]
    }
    chart.setOption(option)
  }
}

const initBudgetExecutionChart = () => {
  if (budgetExecutionChartRef.value) {
    const chart = echarts.init(budgetExecutionChartRef.value)
    const budgetData = reportData.value.budgetItems
    const option = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['已使用', '总预算'] },
      xAxis: { type: 'category', data: budgetData.map(item => item.category) },
      yAxis: { type: 'value' },
      series: [
        {
          name: '已使用',
          type: 'bar',
          data: budgetData.map(item => item.used),
          itemStyle: { color: '#409eff' }
        },
        {
          name: '总预算',
          type: 'bar',
          data: budgetData.map(item => item.total),
          itemStyle: { color: '#e6e6e6' }
        }
      ]
    }
    chart.setOption(option)
  }
}

const initCashFlowChart = () => {
  if (cashFlowChartRef.value) {
    const chart = echarts.init(cashFlowChartRef.value)
    const flowData = reportData.value.cashFlowDetails
    const option = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: flowData.map(item => item.date) },
      yAxis: { type: 'value' },
      series: [{
        name: '账户余额',
        type: 'line',
        data: flowData.map(item => item.balance),
        itemStyle: { color: '#67c23a' },
        areaStyle: { opacity: 0.3 }
      }]
    }
    chart.setOption(option)
  }
}

const initTrendAnalysisChart = () => {
  if (trendAnalysisChartRef.value) {
    const chart = echarts.init(trendAnalysisChartRef.value)
    const option = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['收入增长率', '支出增长率'] },
      xAxis: { type: 'category', data: ['Q1', 'Q2', 'Q3', 'Q4'] },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: '收入增长率',
          type: 'line',
          data: [8.5, 12.3, 15.2, 12.5],
          itemStyle: { color: '#67c23a' }
        },
        {
          name: '支出增长率',
          type: 'line',
          data: [5.2, -2.1, 3.8, -5.2],
          itemStyle: { color: '#f56c6c' }
        }
      ]
    }
    chart.setOption(option)
  }
}

const handleReportAction = (command, report) => {
  switch (command) {
    case 'view':
      selectReport(report)
      break
    case 'download':
      downloadReport(report)
      break
    case 'share':
      shareReport(report)
      break
    case 'delete':
      deleteReport(report)
      break
  }
}

const downloadReport = (report) => {
  ElMessage.success(`正在下载报表: ${report.name}`)
}

const shareReport = (report) => {
  ElMessage.info('分享功能开发中...')
}

const deleteReport = async (report) => {
  try {
    await ElMessageBox.confirm(`确定要删除报表 ${report.name} 吗？`, '删除确认')
    const index = reportList.value.findIndex(item => item.id === report.id)
    if (index > -1) {
      reportList.value.splice(index, 1)
      if (selectedReport.value?.id === report.id) {
        selectedReport.value = null
      }
    }
    ElMessage.success('删除成功')
  } catch {
    // 取消删除
  }
}

const generateCustomReport = () => {
  generateReportVisible.value = true
}

const showReportTemplates = () => {
  templateDialogVisible.value = true
}

const exportAllReports = () => {
  ElMessage.success('批量导出功能开发中...')
}

const refreshCurrentReport = () => {
  if (selectedReport.value) {
    loadReportData(selectedReport.value)
  }
}

const exportCurrentReport = (format) => {
  if (!selectedReport.value) return
  ElMessage.success(`正在导出${format.toUpperCase()}格式报表...`)
}

const handleReportGenerated = (newReport) => {
  reportList.value.unshift(newReport)
  ElMessage.success('报表生成成功')
}

const handleTemplateSelect = (template) => {
  console.log('选择模板:', template)
}

// 工具方法
const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-CN').format(amount)
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date))
}

const formatDateRange = (startDate, endDate) => {
  return `${startDate} 至 ${endDate}`
}

const getReportIcon = (type) => {
  const iconMap = {
    'income-expense': 'TrendCharts',
    'budget-execution': 'PieChart',
    'cash-flow': 'Money',
    'category-stats': 'DataBoard',
    'trend-analysis': 'LineChart',
    'comparison': 'BarChart'
  }
  return iconMap[type] || 'Document'
}

const getReportStatusType = (status) => {
  const typeMap = {
    completed: 'success',
    generating: 'warning',
    failed: 'danger'
  }
  return typeMap[status] || 'info'
}

const getReportStatusText = (status) => {
  const textMap = {
    completed: '已完成',
    generating: '生成中',
    failed: '失败'
  }
  return textMap[status] || '未知'
}

const getBudgetPercentage = (budget) => {
  return Math.round((budget.used / budget.total) * 100)
}

const getBudgetProgressStatus = (budget) => {
  const percentage = budget.used / budget.total
  if (percentage > 0.9) return 'exception'
  if (percentage > 0.7) return 'warning'
  return 'success'
}

// 生命周期
onMounted(() => {
  // 初始化时选择第一个报表
  if (reportList.value.length > 0) {
    selectReport(reportList.value[0])
  }
})
</script>

<style lang="scss" scoped>
.finance-reports {
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

  .filter-card {
    margin-bottom: 20px;

    .filter-form {
      .el-form-item {
        margin-bottom: 0;
      }
    }
  }

  .report-list-card {
    height: calc(100vh - 280px);

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .report-list {
      max-height: calc(100vh - 350px);
      overflow-y: auto;

      .report-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          background-color: #f5f7fa;
        }

        &.active {
          background-color: #e6f7ff;
          border: 1px solid #409eff;
        }

        .report-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(64, 158, 255, 0.1);
          color: #409eff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }

        .report-info {
          flex: 1;

          .report-name {
            font-weight: 500;
            margin-bottom: 4px;
          }

          .report-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #909399;
          }
        }

        .report-actions {
          opacity: 0;
          transition: opacity 0.3s;
        }

        &:hover .report-actions {
          opacity: 1;
        }
      }
    }
  }

  .report-content-card {
    height: calc(100vh - 280px);
    overflow-y: auto;

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .report-title {
        h3 {
          margin: 0 0 4px 0;
          color: #303133;
        }

        .report-subtitle {
          font-size: 14px;
          color: #606266;

          .report-period {
            color: #909399;
          }
        }
      }

      .report-actions {
        display: flex;
        gap: 8px;
      }
    }

    .report-content {
      .summary-cards {
        margin-bottom: 30px;

        .summary-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

          &.income {
            border-left: 4px solid #67c23a;
          }

          &.expense {
            border-left: 4px solid #f56c6c;
          }

          &.balance {
            border-left: 4px solid #409eff;
          }

          .card-icon {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: rgba(64, 158, 255, 0.1);
            color: #409eff;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .card-content {
            .card-value {
              font-size: 24px;
              font-weight: bold;
              color: #303133;
              margin-bottom: 4px;
            }

            .card-label {
              color: #606266;
              font-size: 14px;
            }
          }
        }
      }

      .chart-section {
        margin-bottom: 30px;

        h4 {
          margin: 0 0 16px 0;
          color: #303133;
        }

        .chart-container {
          height: 350px;
        }

        .chart-container-small {
          height: 250px;
        }
      }

      .budget-overview {
        margin-bottom: 30px;

        .budget-progress-list {
          .budget-progress-item {
            margin-bottom: 16px;

            .budget-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;

              .budget-category {
                font-weight: 500;
              }

              .budget-amounts {
                font-size: 14px;
                color: #606266;
              }
            }
          }
        }
      }

      .cash-flow-summary {
        margin-bottom: 30px;

        .flow-item {
          text-align: center;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

          .flow-value {
            font-size: 24px;
            font-weight: bold;
            color: #303133;
            margin-bottom: 8px;
          }

          .flow-label {
            color: #606266;
            font-size: 14px;
          }
        }
      }

      .trend-metrics {
        margin-bottom: 30px;

        .metric-item {
          text-align: center;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

          .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #303133;
            margin-bottom: 8px;
          }

          .metric-label {
            color: #606266;
            font-size: 14px;
            margin-bottom: 8px;
          }

          .metric-trend {
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;

            &.positive {
              color: #67c23a;
            }

            &.negative {
              color: #f56c6c;
            }
          }
        }
      }

      .table-section {
        h4 {
          margin: 0 0 16px 0;
          color: #303133;
        }

        .text-success {
          color: #67c23a;
          font-weight: 500;
        }

        .text-danger {
          color: #f56c6c;
          font-weight: 500;
        }
      }
    }
  }

  .empty-state-card {
    height: calc(100vh - 280px);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .finance-reports {
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

    .filter-form {
      .el-form-item {
        width: 100%;
        margin-bottom: 16px;
      }
    }

    .report-list-card,
    .report-content-card {
      height: auto;
      margin-bottom: 20px;
    }

    .summary-cards {
      .el-col {
        margin-bottom: 12px;
      }
    }
  }
}
</style>