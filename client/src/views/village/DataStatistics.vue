<template>
  <div class="data-statistics">
    <!-- 顶部导航 -->
    <div class="statistics-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/village/home' }">智慧乡村</el-breadcrumb-item>
        <el-breadcrumb-item>数据统计与分析</el-breadcrumb-item>
      </el-breadcrumb>
      <div class="header-actions">
        <el-button type="primary" @click="exportReport">
          <el-icon><Download /></el-icon> 导出报告
        </el-button>
        <el-button type="success" @click="refreshData">
          <el-icon><Refresh /></el-icon> 刷新数据
        </el-button>
      </div>
    </div>

    <!-- 数据概览卡片 -->
    <div class="overview-cards">
      <el-row :gutter="24">
        <el-col :span="6">
          <el-card class="overview-card population">
            <div class="card-content">
              <div class="card-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-number">{{ overviewData.totalPopulation }}</div>
                <div class="card-label">总人口</div>
                <div class="card-trend">
                  <el-icon class="trend-icon up"><CaretTop /></el-icon>
                  <span class="trend-text">+2.3%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card households">
            <div class="card-content">
              <div class="card-icon">
                <el-icon><House /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-number">{{ overviewData.totalHouseholds }}</div>
                <div class="card-label">总户数</div>
                <div class="card-trend">
                  <el-icon class="trend-icon up"><CaretTop /></el-icon>
                  <span class="trend-text">+1.8%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card projects">
            <div class="card-content">
              <div class="card-icon">
                <el-icon><FolderOpened /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-number">{{ overviewData.activeProjects }}</div>
                <div class="card-label">活跃项目</div>
                <div class="card-trend">
                  <el-icon class="trend-icon stable"><Minus /></el-icon>
                  <span class="trend-text">0.0%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card finance">
            <div class="card-content">
              <div class="card-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-number">¥{{ overviewData.totalBudget.toLocaleString() }}</div>
                <div class="card-label">年度预算</div>
                <div class="card-trend">
                  <el-icon class="trend-icon up"><CaretTop /></el-icon>
                  <span class="trend-text">+8.5%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 统计图表区域 -->
    <div class="charts-section">
      <el-row :gutter="24">
        <!-- 人口结构分析 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>人口结构分析</span>
                <el-select v-model="populationChartType" size="small" style="width: 100px;">
                  <el-option label="年龄" value="age" />
                  <el-option label="性别" value="gender" />
                  <el-option label="教育" value="education" />
                </el-select>
              </div>
            </template>
            <div class="chart-container">
              <div ref="populationChart" class="chart"></div>
            </div>
          </el-card>
        </el-col>

        <!-- 财务收支趋势 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>财务收支趋势</span>
                <el-date-picker
                  v-model="financeDateRange"
                  type="monthrange"
                  range-separator="至"
                  start-placeholder="开始月份"
                  end-placeholder="结束月份"
                  format="YYYY-MM"
                  value-format="YYYY-MM"
                  size="small"
                />
              </div>
            </template>
            <div class="chart-container">
              <div ref="financeChart" class="chart"></div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="24" style="margin-top: 24px;">
        <!-- 项目进度统计 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>项目进度统计</span>
                <el-button-group size="small">
                  <el-button :type="projectPeriod === 'month' ? 'primary' : ''" @click="projectPeriod = 'month'">月度</el-button>
                  <el-button :type="projectPeriod === 'quarter' ? 'primary' : ''" @click="projectPeriod = 'quarter'">季度</el-button>
                  <el-button :type="projectPeriod === 'year' ? 'primary' : ''" @click="projectPeriod = 'year'">年度</el-button>
                </el-button-group>
              </div>
            </template>
            <div class="chart-container">
              <div ref="projectChart" class="chart"></div>
            </div>
          </el-card>
        </el-col>

        <!-- 服务办理统计 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>服务办理统计</span>
                <el-select v-model="serviceType" size="small" style="width: 120px;">
                  <el-option label="全部服务" value="" />
                  <el-option label="证件办理" value="certificate" />
                  <el-option label="福利申请" value="welfare" />
                  <el-option label="便民服务" value="convenience" />
                </el-select>
              </div>
            </template>
            <div class="chart-container">
              <div ref="serviceChart" class="chart"></div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细数据表格 -->
    <div class="data-tables">
      <el-tabs v-model="activeDataTable" type="border-card">
        <!-- 人口统计表 -->
        <el-tab-pane label="人口统计" name="population">
          <el-card>
            <div class="table-header">
              <span>人口详细信息</span>
              <div class="table-controls">
                <el-select v-model="populationFilter.group" placeholder="分组方式" style="width: 120px; margin-right: 12px;">
                  <el-option label="按年龄组" value="age" />
                  <el-option label="按性别" value="gender" />
                  <el-option label="按教育程度" value="education" />
                </el-select>
                <el-button type="primary" @click="loadPopulationData">查询</el-button>
              </div>
            </div>

            <el-table :data="populationData" stripe style="width: 100%">
              <el-table-column prop="group" label="分组" width="150" />
              <el-table-column prop="count" label="人数" width="100" align="center" />
              <el-table-column prop="percentage" label="占比" width="100" align="center">
                <template #default="{ row }">
                  <el-progress
                    :percentage="row.percentage"
                    :stroke-width="8"
                    :show-text="false"
                    style="width: 60px; margin-right: 8px;"
                  />
                  <span>{{ row.percentage }}%</span>
                </template>
              </el-table-column>
              <el-table-column prop="maleCount" label="男性" width="80" align="center" />
              <el-table-column prop="femaleCount" label="女性" width="80" align="center" />
              <el-table-column prop="description" label="说明" />
            </el-table>
          </el-card>
        </el-tab-pane>

        <!-- 财务统计表 -->
        <el-tab-pane label="财务统计" name="finance">
          <el-card>
            <div class="table-header">
              <span>财务收支明细</span>
              <div class="table-controls">
                <el-date-picker
                  v-model="financeTableDate"
                  type="month"
                  placeholder="选择月份"
                  format="YYYY-MM"
                  value-format="YYYY-MM"
                  style="width: 150px; margin-right: 12px;"
                />
                <el-select v-model="financeTableType" placeholder="类型" style="width: 100px; margin-right: 12px;">
                  <el-option label="全部" value="" />
                  <el-option label="收入" value="income" />
                  <el-option label="支出" value="expense" />
                </el-select>
                <el-button type="primary" @click="loadFinanceTableData">查询</el-button>
              </div>
            </div>

            <el-table :data="financeTableData" stripe style="width: 100%">
              <el-table-column prop="category" label="分类" width="150" />
              <el-table-column prop="budget" label="预算金额" width="120" align="right">
                <template #default="{ row }">
                  ¥{{ row.budget.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="actual" label="实际金额" width="120" align="right">
                <template #default="{ row }">
                  <span :class="row.actual > row.budget ? 'over-budget' : 'normal-budget'">
                    ¥{{ row.actual.toLocaleString() }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="variance" label="差异" width="100" align="right">
                <template #default="{ row }">
                  <span :class="row.variance > 0 ? 'positive-variance' : 'negative-variance'">
                    {{ row.variance > 0 ? '+' : '' }}{{ row.variance }}%
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="progress" label="执行进度" width="150">
                <template #default="{ row }">
                  <el-progress
                    :percentage="row.progress"
                    :status="row.progress > 100 ? 'exception' : ''"
                    :stroke-width="8"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="note" label="备注" />
            </el-table>
          </el-card>
        </el-tab-pane>

        <!-- 项目统计表 -->
        <el-tab-pane label="项目统计" name="projects">
          <el-card>
            <div class="table-header">
              <span>项目执行情况</span>
              <div class="table-controls">
                <el-select v-model="projectStatus" placeholder="状态" style="width: 120px; margin-right: 12px;">
                  <el-option label="全部状态" value="" />
                  <el-option label="进行中" value="in_progress" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="已暂停" value="paused" />
                </el-select>
                <el-button type="primary" @click="loadProjectTableData">查询</el-button>
              </div>
            </div>

            <el-table :data="projectTableData" stripe style="width: 100%">
              <el-table-column prop="name" label="项目名称" width="200" />
              <el-table-column prop="category" label="类别" width="120" />
              <el-table-column prop="manager" label="负责人" width="100" />
              <el-table-column prop="startDate" label="开始日期" width="110" />
              <el-table-column prop="endDate" label="计划完成" width="110" />
              <el-table-column prop="progress" label="进度" width="120">
                <template #default="{ row }">
                  <el-progress
                    :percentage="row.progress"
                    :status="row.progress === 100 ? 'success' : ''"
                    :stroke-width="8"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="budget" label="预算" width="100" align="right">
                <template #default="{ row }">
                  ¥{{ (row.budget / 10000).toFixed(1) }}万
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getProjectStatusType(row.status)" size="small">
                    {{ getProjectStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>

        <!-- 服务统计表 -->
        <el-tab-pane label="服务统计" name="services">
          <el-card>
            <div class="table-header">
              <span>便民服务统计</span>
              <div class="table-controls">
                <el-date-picker
                  v-model="serviceDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="margin-right: 12px;"
                />
                <el-button type="primary" @click="loadServiceTableData">查询</el-button>
              </div>
            </div>

            <el-table :data="serviceTableData" stripe style="width: 100%">
              <el-table-column prop="serviceType" label="服务类型" width="150" />
              <el-table-column prop="totalCount" label="总办理量" width="100" align="center" />
              <el-table-column prop="completedCount" label="已完成" width="100" align="center" />
              <el-table-column prop="pendingCount" label="处理中" width="100" align="center" />
              <el-table-column prop="completionRate" label="完成率" width="120">
                <template #default="{ row }">
                  <el-progress
                    :percentage="row.completionRate"
                    :stroke-width="8"
                    :show-text="false"
                    style="width: 60px; margin-right: 8px;"
                  />
                  <span>{{ row.completionRate }}%</span>
                </template>
              </el-table-column>
              <el-table-column prop="avgProcessTime" label="平均处理时长" width="130" align="center" />
              <el-table-column prop="satisfaction" label="满意度" width="120">
                <template #default="{ row }">
                  <el-rate
                    v-model="row.satisfaction"
                    disabled
                    show-score
                    text-color="#ff9900"
                    score-template="{value}"
                  />
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 数据导出对话框 -->
    <el-dialog v-model="exportDialog.visible" title="导出数据报告" width="500px">
      <el-form :model="exportForm" label-width="100px">
        <el-form-item label="报告类型">
          <el-checkbox-group v-model="exportForm.types">
            <el-checkbox label="overview">数据概览</el-checkbox>
            <el-checkbox label="population">人口统计</el-checkbox>
            <el-checkbox label="finance">财务统计</el-checkbox>
            <el-checkbox label="projects">项目统计</el-checkbox>
            <el-checkbox label="services">服务统计</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format">
            <el-radio label="pdf">PDF报告</el-radio>
            <el-radio label="excel">Excel表格</el-radio>
            <el-radio label="word">Word文档</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="exportForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmExport">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Download, Refresh, User, House, FolderOpened, Money,
  CaretTop, Minus
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 数据状态
const overviewData = reactive({
  totalPopulation: 3685,
  totalHouseholds: 1247,
  activeProjects: 18,
  totalBudget: 5280000
})

const populationChartType = ref('age')
const financeDateRange = ref([])
const projectPeriod = ref('month')
const serviceType = ref('')

const activeDataTable = ref('population')

// 过滤器
const populationFilter = reactive({
  group: 'age'
})

const financeTableDate = ref('')
const financeTableType = ref('')

const projectStatus = ref('')
const serviceDateRange = ref([])

// 图表引用
const populationChart = ref(null)
const financeChart = ref(null)
const projectChart = ref(null)
const serviceChart = ref(null)

// 图表实例
let populationChartInstance = null
let financeChartInstance = null
let projectChartInstance = null
let serviceChartInstance = null

// 表格数据
const populationData = ref([
  { group: '0-18岁', count: 586, percentage: 15.9, maleCount: 312, femaleCount: 274, description: '未成年人口' },
  { group: '19-35岁', count: 892, percentage: 24.2, maleCount: 456, femaleCount: 436, description: '青年人口' },
  { group: '36-50岁', count: 1024, percentage: 27.8, maleCount: 528, femaleCount: 496, description: '中年人口' },
  { group: '51-65岁', count: 785, percentage: 21.3, maleCount: 402, femaleCount: 383, description: '中老年人口' },
  { group: '65岁以上', count: 398, percentage: 10.8, maleCount: 189, femaleCount: 209, description: '老年人口' }
])

const financeTableData = ref([
  { category: '基础设施建设', budget: 1200000, actual: 1180000, variance: -1.7, progress: 98, note: '道路维修已完成' },
  { category: '环境整治', budget: 800000, actual: 920000, variance: 15.0, progress: 115, note: '超出预算，需审批' },
  { category: '公共服务', budget: 600000, actual: 450000, variance: -25.0, progress: 75, note: '部分项目延期' },
  { category: '行政支出', budget: 400000, actual: 380000, variance: -5.0, progress: 95, note: '正常执行' }
])

const projectTableData = ref([
  {
    name: '村内道路硬化工程',
    category: '基础设施',
    manager: '张主任',
    startDate: '2024-01-15',
    endDate: '2024-03-15',
    progress: 65,
    budget: 280000,
    status: 'in_progress'
  },
  {
    name: '垃圾分类处理站建设',
    category: '环境整治',
    manager: '李委员',
    startDate: '2024-02-01',
    endDate: '2024-04-20',
    progress: 30,
    budget: 150000,
    status: 'in_progress'
  },
  {
    name: '文化活动中心改造',
    category: '公共服务',
    manager: '王主任',
    startDate: '2024-01-01',
    endDate: '2024-02-28',
    progress: 100,
    budget: 120000,
    status: 'completed'
  }
])

const serviceTableData = ref([
  {
    serviceType: '身份证办理',
    totalCount: 156,
    completedCount: 142,
    pendingCount: 14,
    completionRate: 91,
    avgProcessTime: '3.2天',
    satisfaction: 4.5
  },
  {
    serviceType: '社保申请',
    totalCount: 89,
    completedCount: 78,
    pendingCount: 11,
    completionRate: 88,
    avgProcessTime: '5.1天',
    satisfaction: 4.2
  },
  {
    serviceType: '医疗救助',
    totalCount: 34,
    completedCount: 32,
    pendingCount: 2,
    completionRate: 94,
    avgProcessTime: '1.8天',
    satisfaction: 4.8
  }
])

// 导出对话框
const exportDialog = reactive({
  visible: false
})

const exportForm = reactive({
  types: ['overview'],
  format: 'pdf',
  dateRange: []
})

// 方法
const refreshData = () => {
  ElMessage.success('数据刷新成功')
  loadAllCharts()
}

const exportReport = () => {
  exportDialog.visible = true
}

const confirmExport = () => {
  ElMessage.success('报告导出成功')
  exportDialog.visible = false
}

const loadPopulationData = () => {
  ElMessage.success('人口数据加载成功')
}

const loadFinanceTableData = () => {
  ElMessage.success('财务数据加载成功')
}

const loadProjectTableData = () => {
  ElMessage.success('项目数据加载成功')
}

const loadServiceTableData = () => {
  ElMessage.success('服务数据加载成功')
}

const getProjectStatusType = (status) => {
  const types = {
    planning: 'info',
    in_progress: 'primary',
    completed: 'success',
    paused: 'warning',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const getProjectStatusText = (status) => {
  const texts = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    paused: '已暂停',
    cancelled: '已取消'
  }
  return texts[status] || '未知'
}

// 初始化图表
const initPopulationChart = () => {
  if (!populationChart.value) return

  populationChartInstance = echarts.init(populationChart.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '人口分布',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 586, name: '0-18岁' },
          { value: 892, name: '19-35岁' },
          { value: 1024, name: '36-50岁' },
          { value: 785, name: '51-65岁' },
          { value: 398, name: '65岁以上' }
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

  populationChartInstance.setOption(option)
}

const initFinanceChart = () => {
  if (!financeChart.value) return

  financeChartInstance = echarts.init(financeChart.value)

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['收入', '支出']
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '收入',
        type: 'line',
        data: [120000, 132000, 101000, 134000, 90000, 230000],
        smooth: true
      },
      {
        name: '支出',
        type: 'line',
        data: [80000, 92000, 91000, 94000, 87000, 180000],
        smooth: true
      }
    ]
  }

  financeChartInstance.setOption(option)
}

const initProjectChart = () => {
  if (!projectChart.value) return

  projectChartInstance = echarts.init(projectChart.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['已完成', '进行中', '计划中']
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '已完成',
        type: 'bar',
        stack: 'total',
        data: [2, 3, 4, 5, 3, 6]
      },
      {
        name: '进行中',
        type: 'bar',
        stack: 'total',
        data: [3, 4, 2, 3, 5, 2]
      },
      {
        name: '计划中',
        type: 'bar',
        stack: 'total',
        data: [1, 2, 3, 2, 3, 4]
      }
    ]
  }

  projectChartInstance.setOption(option)
}

const initServiceChart = () => {
  if (!serviceChart.value) return

  serviceChartInstance = echarts.init(serviceChart.value)

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['证件办理', '福利申请', '便民服务', '投诉建议', '其他服务']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '办理量',
        type: 'bar',
        data: [156, 89, 234, 45, 67],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        }
      }
    ]
  }

  serviceChartInstance.setOption(option)
}

const loadAllCharts = () => {
  nextTick(() => {
    initPopulationChart()
    initFinanceChart()
    initProjectChart()
    initServiceChart()
  })
}

// 窗口大小改变时重新渲染图表
const resizeCharts = () => {
  if (populationChartInstance) populationChartInstance.resize()
  if (financeChartInstance) financeChartInstance.resize()
  if (projectChartInstance) projectChartInstance.resize()
  if (serviceChartInstance) serviceChartInstance.resize()
}

onMounted(() => {
  loadAllCharts()
  window.addEventListener('resize', resizeCharts)
})
</script>

<style scoped>
.data-statistics {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 64px);
}

.statistics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.overview-cards {
  margin-bottom: 24px;
}

.overview-card {
  border: none;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.overview-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-content {
  display: flex;
  align-items: center;
  padding: 20px;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.overview-card.population .card-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.overview-card.households .card-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.overview-card.projects .card-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.overview-card.finance .card-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-info {
  flex: 1;
}

.card-number {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 4px;
}

.card-label {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 8px;
}

.card-trend {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.trend-icon {
  margin-right: 4px;
  font-size: 14px;
}

.trend-icon.up {
  color: #67c23a;
}

.trend-icon.down {
  color: #f56c6c;
}

.trend-icon.stable {
  color: #909399;
}

.trend-text {
  font-weight: 500;
}

.charts-section {
  margin-bottom: 24px;
}

.chart-card {
  height: 400px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
}

.chart {
  width: 100%;
  height: 100%;
}

.data-tables {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-controls {
  display: flex;
  align-items: center;
}

.over-budget {
  color: #f56c6c;
  font-weight: bold;
}

.normal-budget {
  color: #67c23a;
}

.positive-variance {
  color: #f56c6c;
}

.negative-variance {
  color: #67c23a;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .data-statistics {
    padding: 16px;
  }

  .statistics-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .overview-cards .el-row .el-col {
    margin-bottom: 16px;
  }

  .charts-section .el-row .el-col {
    margin-bottom: 24px;
  }

  .chart-card {
    height: 350px;
  }

  .chart-container {
    height: 270px;
  }

  .table-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .table-controls {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style>