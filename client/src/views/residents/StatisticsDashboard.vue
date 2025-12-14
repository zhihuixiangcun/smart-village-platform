<template>
  <div class="statistics-dashboard">
    <!-- 仪表板头部 -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="header-left">
          <h1>
            <el-icon><TrendCharts /></el-icon>
            村民数据统计分析
          </h1>
          <p>实时数据监控与智能分析报表</p>
        </div>
        <div class="header-right">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="refreshData"
            size="small"
          />
          <el-button @click="refreshData" icon="Refresh" size="small">
            刷新数据
          </el-button>
          <el-button @click="exportReport" icon="Download" size="small">
            导出报告
          </el-button>
          <el-button @click="shareReport" icon="Share" size="small">
            分享报告
          </el-button>
        </div>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="key-metrics">
      <el-row :gutter="20">
        <el-col :span="6" v-for="metric in keyMetrics" :key="metric.key">
          <div class="metric-card" :class="metric.trend">
            <div class="metric-icon" :style="{ color: metric.color }">
              <el-icon :size="32">
                <component :is="metric.icon" />
              </el-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">
                <count-up
                  :end-val="metric.value"
                  :duration="1000"
                  :options="{ useEasing: true, separator: ',' }"
                />
                <span class="metric-unit">{{ metric.unit }}</span>
              </div>
              <div class="metric-label">{{ metric.label }}</div>
              <div class="metric-change" :class="metric.trend">
                <el-icon>
                  <component :is="metric.trend === 'up' ? 'TrendUp' : 'TrendDown'" />
                </el-icon>
                <span>{{ metric.change }}%</span>
                <span class="change-period">较上月</span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 图表网格 -->
    <div class="charts-grid">
      <el-row :gutter="20">
        <!-- 人口结构分析 -->
        <el-col :span="12">
          <el-card title="人口结构分析" shadow="never" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>人口结构分析</span>
                <el-dropdown @command="changeChartType">
                  <el-button size="small" text>
                    {{ getChartTypeName(populationChartType) }}
                    <el-icon><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="pie">饼图</el-dropdown-item>
                      <el-dropdown-item command="doughnut">环形图</el-dropdown-item>
                      <el-dropdown-item command="bar">柱状图</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
            <div ref="populationChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 年龄分布 -->
        <el-col :span="12">
          <el-card title="年龄分布" shadow="never" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>年龄分布</span>
                <el-button-group size="small">
                  <el-button
                    v-for="period in agePeriods"
                    :key="period.key"
                    :type="ageChartPeriod === period.key ? 'primary' : ''"
                    @click="changeAgePeriod(period.key)"
                  >
                    {{ period.label }}
                  </el-button>
                </el-button-group>
              </div>
            </template>
            <div ref="ageChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 特殊群体统计 -->
        <el-col :span="8">
          <el-card title="特殊群体统计" shadow="never" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>特殊群体统计</span>
                <el-tooltip content="点击图表可查看详细信息">
                  <el-icon><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div ref="specialGroupChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 教育水平分布 -->
        <el-col :span="8">
          <el-card title="教育水平分布" shadow="never" class="chart-card">
            <div ref="educationChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 职业分布 -->
        <el-col :span="8">
          <el-card title="职业分布" shadow="never" class="chart-card">
            <div ref="occupationChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 人口变化趋势 -->
        <el-col :span="24">
          <el-card title="人口变化趋势" shadow="never" class="chart-card large">
            <template #header>
              <div class="card-header">
                <span>人口变化趋势</span>
                <div class="trend-controls">
                  <el-radio-group v-model="trendType" @change="updateTrendChart">
                    <el-radio-button label="total">总人口</el-radio-button>
                    <el-radio-button label="birth">出生率</el-radio-button>
                    <el-radio-button label="migration">迁移情况</el-radio-button>
                  </el-radio-group>
                  <el-select v-model="trendPeriod" @change="updateTrendChart" size="small">
                    <el-option label="近12个月" value="12months" />
                    <el-option label="近3年" value="3years" />
                    <el-option label="近5年" value="5years" />
                  </el-select>
                </div>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container large"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <div class="data-tables">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 统计汇总表 -->
        <el-tab-pane label="统计汇总" name="summary">
          <div class="summary-table">
            <el-table :data="summaryData" border stripe>
              <el-table-column prop="category" label="分类" width="120" />
              <el-table-column prop="total" label="总数" width="100" align="right" />
              <el-table-column prop="male" label="男性" width="100" align="right" />
              <el-table-column prop="female" label="女性" width="100" align="right" />
              <el-table-column prop="percentage" label="占比" width="100" align="right">
                <template #default="scope">
                  <el-progress
                    :percentage="scope.row.percentage"
                    :color="getProgressColor(scope.row.percentage)"
                    :show-text="false"
                    style="width: 60px;"
                  />
                  <span style="margin-left: 8px;">{{ scope.row.percentage }}%</span>
                </template>
              </el-table-column>
              <el-table-column prop="trend" label="趋势" width="80" align="center">
                <template #default="scope">
                  <el-icon :color="scope.row.trend > 0 ? '#67c23a' : '#f56c6c'">
                    <component :is="scope.row.trend > 0 ? 'TrendUp' : 'TrendDown'" />
                  </el-icon>
                </template>
              </el-table-column>
              <el-table-column prop="notes" label="备注" />
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 排行榜 -->
        <el-tab-pane label="数据排行" name="ranking">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="ranking-card">
                <h4>年龄最大前10名</h4>
                <div class="ranking-list">
                  <div
                    v-for="(item, index) in eldestResidents"
                    :key="item.id"
                    class="ranking-item"
                  >
                    <div class="rank-number" :class="getRankClass(index)">
                      {{ index + 1 }}
                    </div>
                    <div class="rank-info">
                      <div class="rank-name">{{ item.name }}</div>
                      <div class="rank-value">{{ item.age }}岁</div>
                    </div>
                  </div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="ranking-card">
                <h4>家庭人口最多前10名</h4>
                <div class="ranking-list">
                  <div
                    v-for="(item, index) in largestFamilies"
                    :key="item.id"
                    class="ranking-item"
                  >
                    <div class="rank-number" :class="getRankClass(index)">
                      {{ index + 1 }}
                    </div>
                    <div class="rank-info">
                      <div class="rank-name">{{ item.householder }}</div>
                      <div class="rank-value">{{ item.memberCount }}人</div>
                    </div>
                  </div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="ranking-card">
                <h4>特殊群体分布</h4>
                <div class="ranking-list">
                  <div
                    v-for="(item, index) in specialGroups"
                    :key="item.type"
                    class="ranking-item"
                  >
                    <div class="rank-number" :class="getRankClass(index)">
                      {{ index + 1 }}
                    </div>
                    <div class="rank-info">
                      <div class="rank-name">{{ item.name }}</div>
                      <div class="rank-value">{{ item.count }}人</div>
                    </div>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 详细报告 -->
        <el-tab-pane label="详细报告" name="report">
          <div class="detailed-report">
            <div class="report-toolbar">
              <el-select v-model="reportTemplate" placeholder="选择报告模板">
                <el-option
                  v-for="template in reportTemplates"
                  :key="template.id"
                  :label="template.name"
                  :value="template.id"
                />
              </el-select>
              <el-button @click="generateReport" type="primary" :loading="generatingReport">
                生成报告
              </el-button>
              <el-button @click="printReport" icon="Printer">打印</el-button>
              <el-button @click="downloadReport" icon="Download">下载PDF</el-button>
            </div>

            <div v-if="generatedReport" class="report-content" ref="reportContentRef">
              <div class="report-header">
                <h2>{{ generatedReport.title }}</h2>
                <p class="report-date">报告日期：{{ generatedReport.date }}</p>
                <p class="report-period">统计周期：{{ generatedReport.period }}</p>
              </div>

              <div class="report-summary">
                <h3>概述</h3>
                <p>{{ generatedReport.summary }}</p>
              </div>

              <div class="report-sections">
                <div
                  v-for="section in generatedReport.sections"
                  :key="section.id"
                  class="report-section"
                >
                  <h3>{{ section.title }}</h3>
                  <div v-html="section.content"></div>
                </div>
              </div>

              <div class="report-footer">
                <p>报告生成时间：{{ new Date().toLocaleString() }}</p>
                <p>数据来源：智慧村庄管理系统</p>
              </div>
            </div>

            <div v-else class="report-placeholder">
              <el-empty description="请选择报告模板并生成报告" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  TrendCharts, UserFilled, House, Star, TrendUp, TrendDown,
  ArrowDown, InfoFilled, Refresh, Download, Share, Printer
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 响应式数据
const dateRange = ref([])
const activeTab = ref('summary')
const populationChartType = ref('pie')
const ageChartPeriod = ref('current')
const trendType = ref('total')
const trendPeriod = ref('12months')
const reportTemplate = ref('')
const generatingReport = ref(false)

// 图表引用
const populationChartRef = ref()
const ageChartRef = ref()
const specialGroupChartRef = ref()
const educationChartRef = ref()
const occupationChartRef = ref()
const trendChartRef = ref()
const reportContentRef = ref()

// 图表实例
let populationChart = null
let ageChart = null
let specialGroupChart = null
let educationChart = null
let occupationChart = null
let trendChart = null

// 核心指标数据
const keyMetrics = ref([
  {
    key: 'total',
    label: '总人口',
    value: 1245,
    unit: '人',
    change: 3.2,
    trend: 'up',
    color: '#409eff',
    icon: 'UserFilled'
  },
  {
    key: 'households',
    label: '总户数',
    value: 456,
    unit: '户',
    change: 1.8,
    trend: 'up',
    color: '#67c23a',
    icon: 'House'
  },
  {
    key: 'elderly',
    label: '老年人口',
    value: 189,
    unit: '人',
    change: 5.2,
    trend: 'up',
    color: '#e6a23c',
    icon: 'Star'
  },
  {
    key: 'children',
    label: '儿童人口',
    value: 234,
    unit: '人',
    change: -2.1,
    trend: 'down',
    color: '#f56c6c',
    icon: 'Star'
  }
])

// 年龄周期选项
const agePeriods = ref([
  { key: 'current', label: '当前' },
  { key: 'lastYear', label: '去年同期' },
  { key: 'comparison', label: '对比分析' }
])

// 统计汇总数据
const summaryData = ref([
  {
    category: '总人口',
    total: 1245,
    male: 642,
    female: 603,
    percentage: 100,
    trend: 1,
    notes: '较上月增长3.2%'
  },
  {
    category: '儿童(0-14岁)',
    total: 234,
    male: 125,
    female: 109,
    percentage: 18.8,
    trend: -1,
    notes: '较上月减少2.1%'
  },
  {
    category: '青年(15-44岁)',
    total: 567,
    male: 289,
    female: 278,
    percentage: 45.5,
    trend: 1,
    notes: '较上月增长1.5%'
  },
  {
    category: '中年(45-64岁)',
    total: 255,
    male: 132,
    female: 123,
    percentage: 20.5,
    trend: 1,
    notes: '较上月增长0.8%'
  },
  {
    category: '老年(65岁以上)',
    total: 189,
    male: 96,
    female: 93,
    percentage: 15.2,
    trend: 1,
    notes: '较上月增长5.2%'
  }
])

// 排行榜数据
const eldestResidents = ref([
  { id: 1, name: '王老太', age: 94 },
  { id: 2, name: '李大爷', age: 91 },
  { id: 3, name: '张奶奶', age: 88 },
  { id: 4, name: '刘爷爷', age: 86 },
  { id: 5, name: '陈大妈', age: 84 }
])

const largestFamilies = ref([
  { id: 1, householder: '张大户', memberCount: 12 },
  { id: 2, householder: '李家庄', memberCount: 10 },
  { id: 3, householder: '王富贵', memberCount: 9 },
  { id: 4, householder: '赵四海', memberCount: 8 },
  { id: 5, householder: '钱多多', memberCount: 7 }
])

const specialGroups = ref([
  { type: 'lowIncome', name: '低保户', count: 45 },
  { type: 'disabled', name: '残疾人', count: 32 },
  { type: 'elderlyAlone', name: '独居老人', count: 28 },
  { type: 'veteran', name: '退伍军人', count: 23 },
  { type: 'poverty', name: '建档立卡', count: 18 }
])

// 报告模板
const reportTemplates = ref([
  { id: 'monthly', name: '月度统计报告' },
  { id: 'quarterly', name: '季度分析报告' },
  { id: 'annual', name: '年度总结报告' },
  { id: 'special', name: '专项调研报告' }
])

const generatedReport = ref(null)

// 方法
const refreshData = () => {
  ElMessage.success('数据已刷新')
  // 重新加载所有图表
  setTimeout(() => {
    initCharts()
  }, 100)
}

const exportReport = () => {
  ElMessage.info('导出功能开发中...')
}

const shareReport = () => {
  ElMessage.info('分享功能开发中...')
}

const getChartTypeName = (type) => {
  const names = {
    pie: '饼图',
    doughnut: '环形图',
    bar: '柱状图'
  }
  return names[type] || '饼图'
}

const changeChartType = (type) => {
  populationChartType.value = type
  initPopulationChart()
}

const changeAgePeriod = (period) => {
  ageChartPeriod.value = period
  initAgeChart()
}

const updateTrendChart = () => {
  initTrendChart()
}

const getRankClass = (index) => {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#e6a23c'
  if (percentage >= 40) return '#409eff'
  return '#f56c6c'
}

// 图表初始化
const initCharts = () => {
  nextTick(() => {
    initPopulationChart()
    initAgeChart()
    initSpecialGroupChart()
    initEducationChart()
    initOccupationChart()
    initTrendChart()
  })
}

const initPopulationChart = () => {
  if (!populationChartRef.value) return

  if (populationChart) {
    populationChart.dispose()
  }

  populationChart = echarts.init(populationChartRef.value)

  const data = [
    { value: 642, name: '男性' },
    { value: 603, name: '女性' }
  ]

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    color: ['#409eff', '#f56c6c'],
    series: [
      {
        name: '人口分布',
        type: populationChartType.value,
        radius: populationChartType.value === 'doughnut' ? ['40%', '70%'] : '70%',
        center: ['60%', '50%'],
        data: data,
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

  populationChart.setOption(option)
}

const initAgeChart = () => {
  if (!ageChartRef.value) return

  if (ageChart) {
    ageChart.dispose()
  }

  ageChart = echarts.init(ageChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['0-14岁', '15-24岁', '25-34岁', '35-44岁', '45-54岁', '55-64岁', '65岁以上']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '人数',
        type: 'bar',
        data: [234, 145, 189, 233, 156, 99, 189],
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

  ageChart.setOption(option)
}

const initSpecialGroupChart = () => {
  if (!specialGroupChartRef.value) return

  if (specialGroupChart) {
    specialGroupChart.dispose()
  }

  specialGroupChart = echarts.init(specialGroupChartRef.value)

  const data = specialGroups.value.map(group => ({
    value: group.count,
    name: group.name
  }))

  const option = {
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '特殊群体',
        type: 'pie',
        radius: '70%',
        data: data,
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

  specialGroupChart.setOption(option)
}

const initEducationChart = () => {
  if (!educationChartRef.value) return

  if (educationChart) {
    educationChart.dispose()
  }

  educationChart = echarts.init(educationChartRef.value)

  const option = {
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '教育水平',
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 156, name: '小学及以下' },
          { value: 234, name: '初中' },
          { value: 289, name: '高中/中专' },
          { value: 345, name: '大专' },
          { value: 221, name: '本科及以上' }
        ]
      }
    ]
  }

  educationChart.setOption(option)
}

const initOccupationChart = () => {
  if (!occupationChartRef.value) return

  if (occupationChart) {
    occupationChart.dispose()
  }

  occupationChart = echarts.init(occupationChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    yAxis: {
      type: 'category',
      data: ['务农', '务工', '个体经营', '企业职工', '公务员', '学生', '退休', '其他']
    },
    xAxis: {
      type: 'value'
    },
    series: [
      {
        name: '人数',
        type: 'bar',
        data: [456, 234, 123, 89, 45, 167, 89, 42]
      }
    ]
  }

  occupationChart.setOption(option)
}

const initTrendChart = () => {
  if (!trendChartRef.value) return

  if (trendChart) {
    trendChart.dispose()
  }

  trendChart = echarts.init(trendChartRef.value)

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const data = [1200, 1210, 1205, 1220, 1215, 1230, 1225, 1235, 1240, 1245, 1250, 1245]

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: months
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '人口数量',
        type: 'line',
        smooth: true,
        data: data,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
          ])
        }
      }
    ]
  }

  trendChart.setOption(option)
}

const generateReport = async () => {
  if (!reportTemplate.value) {
    ElMessage.warning('请选择报告模板')
    return
  }

  generatingReport.value = true

  try {
    // 模拟报告生成
    await new Promise(resolve => setTimeout(resolve, 2000))

    generatedReport.value = {
      title: `村民统计${getTemplateName(reportTemplate.value)}`,
      date: new Date().toLocaleDateString(),
      period: formatDateRange(),
      summary: '本报告基于智慧村庄管理系统的最新数据，全面分析了村民人口结构、分布特征和变化趋势。',
      sections: [
        {
          id: 'population',
          title: '人口概况',
          content: `
            <p>截至${new Date().toLocaleDateString()}，全村共有常住人口1245人，较上月增长3.2%。</p>
            <p>男性642人（51.6%），女性603人（48.4%），性别比例基本均衡。</p>
            <p>户籍人口456户，平均每户2.7人。</p>
          `
        },
        {
          id: 'age',
          title: '年龄结构',
          content: `
            <p>儿童（0-14岁）234人，占18.8%</p>
            <p>青年（15-44岁）567人，占45.5%</p>
            <p>中年（45-64岁）255人，占20.5%</p>
            <p>老年（65岁以上）189人，占15.2%</p>
          `
        },
        {
          id: 'special',
          title: '特殊群体',
          content: `
            <p>低保户45户，残疾人32人，独居老人28人。</p>
            <p>退伍军人23人，建档立卡贫困户18户。</p>
            <p>各类特殊群体均已建立专门档案，实施精准帮扶。</p>
          `
        }
      ]
    }

    ElMessage.success('报告生成成功')
  } catch (error) {
    ElMessage.error('报告生成失败')
  } finally {
    generatingReport.value = false
  }
}

const getTemplateName = (id) => {
  const template = reportTemplates.value.find(t => t.id === id)
  return template?.name || '报告'
}

const formatDateRange = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    return `${dateRange.value[0]} 至 ${dateRange.value[1]}`
  }
  return '全部数据'
}

const printReport = () => {
  if (!generatedReport.value) {
    ElMessage.warning('请先生成报告')
    return
  }

  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>${generatedReport.value.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2 { color: #333; border-bottom: 2px solid #409eff; padding-bottom: 10px; }
          h3 { color: #666; margin-top: 30px; }
          p { line-height: 1.6; margin-bottom: 10px; }
          .report-header { text-align: center; margin-bottom: 30px; }
          .report-date { color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        ${reportContentRef.value?.innerHTML || ''}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

const downloadReport = () => {
  ElMessage.info('PDF下载功能开发中...')
}

// 响应式处理
const handleResize = () => {
  const charts = [populationChart, ageChart, specialGroupChart, educationChart, occupationChart, trendChart]
  charts.forEach(chart => {
    if (chart) {
      chart.resize()
    }
  })
}

// 生命周期
onMounted(() => {
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  // 销毁图表实例
  const charts = [populationChart, ageChart, specialGroupChart, educationChart, occupationChart, trendChart]
  charts.forEach(chart => {
    if (chart) {
      chart.dispose()
    }
  })
})
</script>

<style lang="scss" scoped>
.statistics-dashboard {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;

  .dashboard-header {
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
        h1 {
          font-size: 28px;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        p {
          margin: 0;
          opacity: 0.9;
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
        align-items: center;
      }
    }
  }

  .key-metrics {
    margin-bottom: 20px;

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      .metric-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(64, 158, 255, 0.1);
      }

      .metric-content {
        flex: 1;

        .metric-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 4px;

          .metric-unit {
            font-size: 16px;
            color: #909399;
            margin-left: 4px;
          }
        }

        .metric-label {
          font-size: 14px;
          color: #606266;
          margin-bottom: 6px;
        }

        .metric-change {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;

          &.up {
            color: #67c23a;
          }

          &.down {
            color: #f56c6c;
          }

          .change-period {
            color: #909399;
          }
        }
      }
    }
  }

  .charts-grid {
    margin-bottom: 20px;

    .chart-card {
      height: 400px;

      &.large {
        height: 500px;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .trend-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
      }

      .chart-container {
        height: 320px;

        &.large {
          height: 420px;
        }
      }
    }
  }

  .data-tables {
    .summary-table {
      .el-progress {
        display: inline-block;
      }
    }

    .ranking-card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      h4 {
        margin: 0 0 16px 0;
        color: #303133;
        font-size: 16px;
        border-bottom: 1px solid #ebeef5;
        padding-bottom: 8px;
      }

      .ranking-list {
        .ranking-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #f5f7fa;

          &:last-child {
            border-bottom: none;
          }

          .rank-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            background: #f5f7fa;
            color: #909399;

            &.gold {
              background: #ffd700;
              color: white;
            }

            &.silver {
              background: #c0c0c0;
              color: white;
            }

            &.bronze {
              background: #cd7f32;
              color: white;
            }
          }

          .rank-info {
            flex: 1;

            .rank-name {
              font-size: 14px;
              color: #303133;
              margin-bottom: 2px;
            }

            .rank-value {
              font-size: 12px;
              color: #909399;
            }
          }
        }
      }
    }

    .detailed-report {
      .report-toolbar {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        align-items: center;
      }

      .report-content {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        .report-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #409eff;
          padding-bottom: 20px;

          h2 {
            margin: 0 0 10px 0;
            color: #303133;
          }

          .report-date,
          .report-period {
            margin: 4px 0;
            color: #909399;
            font-size: 14px;
          }
        }

        .report-summary {
          margin-bottom: 30px;

          h3 {
            color: #606266;
            margin-bottom: 12px;
          }

          p {
            line-height: 1.6;
            color: #303133;
          }
        }

        .report-sections {
          .report-section {
            margin-bottom: 30px;

            h3 {
              color: #606266;
              margin-bottom: 12px;
              border-left: 4px solid #409eff;
              padding-left: 12px;
            }

            :deep(p) {
              line-height: 1.6;
              color: #303133;
              margin-bottom: 8px;
            }
          }
        }

        .report-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ebeef5;
          text-align: center;

          p {
            margin: 4px 0;
            color: #909399;
            font-size: 12px;
          }
        }
      }

      .report-placeholder {
        text-align: center;
        padding: 60px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .statistics-dashboard {
    padding: 10px;

    .dashboard-header {
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

    .key-metrics {
      :deep(.el-col) {
        margin-bottom: 20px;
      }
    }

    .charts-grid {
      :deep(.el-col) {
        margin-bottom: 20px;
      }
    }
  }
}
</style>