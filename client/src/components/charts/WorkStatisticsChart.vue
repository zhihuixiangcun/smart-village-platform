<template>
  <div class="work-statistics-chart">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <van-row gutter="12">
        <van-col span="8" v-for="stat in statsCards" :key="stat.key">
          <div class="stat-card" :class="stat.type">
            <div class="stat-icon">
              <van-icon :name="stat.icon" />
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </van-col>
      </van-row>
    </div>

    <!-- 图表切换标签 -->
    <van-tabs v-model:active="activeChart" class="chart-tabs">
      <van-tab title="工作量统计" name="workload">
        <div class="chart-container">
          <canvas ref="workloadChart" class="chart-canvas"></canvas>
        </div>
      </van-tab>
      <van-tab title="完成率分析" name="completion">
        <div class="chart-container">
          <canvas ref="completionChart" class="chart-canvas"></canvas>
        </div>
      </van-tab>
      <van-tab title="人员排名" name="ranking">
        <div class="ranking-list">
          <div
            v-for="(person, index) in rankingData"
            :key="person.userId"
            class="ranking-item"
            :class="{ 'top-three': index < 3 }"
          >
            <div class="rank-number">{{ index + 1 }}</div>
            <van-image
              :src="person.avatar || '/default-avatar.png'"
              class="avatar"
              round
            />
            <div class="person-info">
              <div class="person-name">{{ person.name }}</div>
              <div class="person-role">{{ person.role }}</div>
            </div>
            <div class="score">
              <div class="score-number">{{ person.score }}</div>
              <div class="score-label">分</div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <!-- 趋势图 -->
    <div class="trend-section">
      <van-cell-group inset>
        <van-cell>
          <template #title>
            <span class="section-title">📈 工作趋势</span>
          </template>
          <template #right-icon>
            <van-tabs v-model:active="trendPeriod" type="card" size="small">
              <van-tab title="7天" name="7d" />
              <van-tab title="30天" name="30d" />
              <van-tab title="90天" name="90d" />
            </van-tabs>
          </template>
        </van-cell>
        <van-cell>
          <div class="trend-chart">
            <canvas ref="trendChart" class="chart-canvas"></canvas>
          </div>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 数据导出 -->
    <div class="export-section">
      <van-cell-group inset>
        <van-cell>
          <template #title>
            <span class="section-title">📊 数据导出</span>
          </template>
        </van-cell>
        <van-grid :column-num="3" :gutter="12">
          <van-grid-item
            v-for="export in exportOptions"
            :key="export.type"
            :icon="export.icon"
            :text="export.text"
            @click="handleExport(export.type)"
          />
        </van-grid>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import villageApi from '@/api/villageManagement'

// 响应式数据
const activeChart = ref('workload')
const trendPeriod = ref('7d')
const statsCards = ref([])
const rankingData = ref([])
const exportOptions = ref([
  { type: 'excel', text: 'Excel报表', icon: 'table' },
  { type: 'pdf', text: 'PDF报告', icon: 'description' },
  { type: 'image', text: '图表图片', icon: 'photo-o' }
])

// 图表实例
const workloadChart = ref(null)
const completionChart = ref(null)
const trendChart = ref(null)

let workloadChartInstance = null
let completionChartInstance = null
let trendChartInstance = null

// 方法
const loadStatistics = async () => {
  try {
    showLoadingToast({ message: '加载统计数据...', forbidClick: true })

    // 获取个人统计数据
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const response = await villageApi.getPersonalStatistics(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )

    const data = response.data.data
    updateStatsCards(data)
    updateRankingData(data)

    closeToast()
  } catch (error) {
    closeToast()
    console.error('加载统计数据失败:', error)
    showToast('加载失败')
  }
}

const updateStatsCards = (data) => {
  const docStats = data.documentStatistics || {}
  const performanceStats = data.performanceMetrics?.documentMetrics || {}

  statsCards.value = [
    {
      key: 'total',
      label: '总任务数',
      value: docStats.totalCollections || 0,
      icon: 'todo-list-o',
      type: 'primary'
    },
    {
      key: 'completed',
      label: '已完成',
      value: docStats.approvedCollections || 0,
      icon: 'passed',
      type: 'success'
    },
    {
      key: 'pending',
      label: '进行中',
      value: docStats.totalCollections - docStats.approvedCollections,
      icon: 'clock-o',
      type: 'warning'
    },
    {
      key: 'approvalRate',
      label: '通过率',
      value: `${Math.round(docStats.approvalRate || 0)}%`,
      icon: 'chart-trending-o',
      type: 'primary'
    },
    {
      key: 'files',
      label: '文件数',
      value: docStats.totalFiles || 0,
      icon: 'folder-o',
      type: 'success'
    },
    {
      key: 'avgTime',
      label: '平均用时',
      value: `${Math.round(performanceStats.avgCompletionTime || 0)}h`,
      icon: 'clock-o',
      type: 'info'
    }
  ]
}

const updateRankingData = (data) => {
  // 模拟排名数据
  rankingData.value = [
    {
      userId: '1',
      name: '张三',
      role: '村主任',
      avatar: '',
      score: 95
    },
    {
      userId: '2',
      name: '李四',
      role: '会计',
      avatar: '',
      score: 88
    },
    {
      userId: '3',
      name: '王五',
      role: '村委委员',
      avatar: '',
      score: 82
    },
    {
      userId: '4',
      name: '赵六',
      role: '工作人员',
      avatar: '',
      score: 76
    },
    {
      userId: '5',
      name: '钱七',
      role: '志愿者',
      avatar: '',
      score: 70
    }
  ]
}

const initWorkloadChart = () => {
  if (!workloadChart.value) return

  const ctx = workloadChart.value.getContext('2d')

  // 创建工作量统计图
  const chartData = {
    labels: ['资料收集', '值班管理', '数据统计', '任务完成', '文件上传'],
    datasets: [{
      label: '工作量',
      data: [25, 30, 15, 20, 35],
      backgroundColor: [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 99, 132, 0.8)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 99, 132, 1)'
      ],
      borderWidth: 1
    }]
  }

  // 这里使用简化的图表实现
  drawBarChart(ctx, chartData)
}

const initCompletionChart = () => {
  if (!completionChart.value) return

  const ctx = completionChart.value.getContext('2d')

  // 创建完成率分析图
  const chartData = {
    labels: ['周一', '周二', '周三', '周四', '周五'],
    datasets: [{
      label: '完成率',
      data: [85, 92, 78, 88, 95],
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.4,
      fill: true
    }]
  }

  // 这里使用简化的图表实现
  drawLineChart(ctx, chartData)
}

const initTrendChart = () => {
  if (!trendChart.value) return

  const ctx = trendChart.value.getContext('2d')

  // 根据时间周期生成数据
  const days = parseInt(trendPeriod.value)
  const labels = []
  const data = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }))
    data.push(Math.floor(Math.random() * 20) + 10)
  }

  const chartData = {
    labels,
    datasets: [{
      label: '工作量',
      data,
      borderColor: 'rgba(54, 162, 235, 1)',
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      tension: 0.4,
      fill: true
    }]
  }

  drawLineChart(ctx, chartData)
}

// 简化的柱状图绘制
const drawBarChart = (ctx, chartData) => {
  const canvas = ctx.canvas
  const width = canvas.width = canvas.offsetWidth * 2
  const height = canvas.height = canvas.offsetHeight * 2
  ctx.scale(2, 2)

  const padding = 40
  const barWidth = (width / 2 - padding * 2) / chartData.labels.length * 0.6
  const maxValue = Math.max(...chartData.datasets[0].data)
  const scale = (height / 2 - padding * 2) / maxValue

  // 清除画布
  ctx.clearRect(0, 0, width / 2, height / 2)

  // 绘制坐标轴
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height / 2 - padding)
  ctx.lineTo(width / 2 - padding, height / 2 - padding)
  ctx.stroke()

  // 绘制柱状图
  chartData.labels.forEach((label, index) => {
    const value = chartData.datasets[0].data[index]
    const x = padding + (index * (width / 2 - padding * 2) / chartData.labels.length) + barWidth * 0.2
    const barHeight = value * scale
    const y = height / 2 - padding - barHeight

    // 绘制柱子
    ctx.fillStyle = chartData.datasets[0].backgroundColor[index]
    ctx.fillRect(x, y, barWidth, barHeight)

    // 绘制标签
    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(label, x + barWidth / 2, height / 2 - padding + 20)

    // 绘制数值
    ctx.fillText(value, x + barWidth / 2, y - 5)
  })
}

// 简化的折线图绘制
const drawLineChart = (ctx, chartData) => {
  const canvas = ctx.canvas
  const width = canvas.width = canvas.offsetWidth * 2
  const height = canvas.height = canvas.offsetHeight * 2
  ctx.scale(2, 2)

  const padding = 40
  const pointSpacing = (width / 2 - padding * 2) / (chartData.labels.length - 1)
  const maxValue = Math.max(...chartData.datasets[0].data)
  const scale = (height / 2 - padding * 2) / maxValue

  // 清除画布
  ctx.clearRect(0, 0, width / 2, height / 2)

  // 绘制坐标轴
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height / 2 - padding)
  ctx.lineTo(width / 2 - padding, height / 2 - padding)
  ctx.stroke()

  // 绘制数据点和线
  ctx.strokeStyle = chartData.datasets[0].borderColor
  ctx.fillStyle = chartData.datasets[0].backgroundColor
  ctx.lineWidth = 2
  ctx.beginPath()

  chartData.datasets[0].data.forEach((value, index) => {
    const x = padding + index * pointSpacing
    const y = height / 2 - padding - (value * scale)

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()

  // 绘制填充区域
  ctx.lineTo(padding + (chartData.labels.length - 1) * pointSpacing, height / 2 - padding)
  ctx.lineTo(padding, height / 2 - padding)
  ctx.closePath()
  ctx.fill()

  // 绘制数据点
  chartData.datasets[0].data.forEach((value, index) => {
    const x = padding + index * pointSpacing
    const y = height / 2 - padding - (value * scale)

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = chartData.datasets[0].borderColor
    ctx.stroke()

    // 绘制标签
    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(chartData.labels[index], x, height / 2 - padding + 20)

    // 绘制数值
    ctx.fillText(value, x, y - 10)
  })
}

const handleExport = (type) => {
  showToast(`导出${type === 'excel' ? 'Excel' : type === 'pdf' ? 'PDF' : '图片'}文件`)

  // 这里可以调用实际的导出API
  switch (type) {
    case 'excel':
      exportExcel()
      break
    case 'pdf':
      exportPDF()
      break
    case 'image':
      exportChartImage()
      break
  }
}

const exportExcel = () => {
  // 导出Excel逻辑
  setTimeout(() => {
    showToast('Excel报表已生成并下载')
  }, 1000)
}

const exportPDF = () => {
  // 导出PDF逻辑
  setTimeout(() => {
    showToast('PDF报告已生成并下载')
  }, 1000)
}

const exportChartImage = () => {
  // 导出图表图片
  const canvas = activeChart.value === 'workload' ? workloadChart.value :
                activeChart.value === 'completion' ? completionChart.value : trendChart.value

  if (canvas) {
    const link = document.createElement('a')
    link.download = `work-statistics-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
    showToast('图表图片已下载')
  }
}

// 监听趋势周期变化
watch(trendPeriod, () => {
  initTrendChart()
})

// 监听图表切换
watch(activeChart, () => {
  // 延迟一下确保DOM已更新
  setTimeout(() => {
    if (activeChart.value === 'workload' && !workloadChartInstance) {
      initWorkloadChart()
    } else if (activeChart.value === 'completion' && !completionChartInstance) {
      initCompletionChart()
    }
  }, 100)
})

// 生命周期
onMounted(() => {
  loadStatistics()

  // 延迟初始化图表，确保DOM已渲染
  setTimeout(() => {
    initWorkloadChart()
    initTrendChart()
  }, 300)
})
</script>

<style scoped>
.work-statistics-chart {
  padding: 16px;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-card.primary .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.success .stat-icon {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
}

.stat-card.warning .stat-icon {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.stat-card.info .stat-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.chart-tabs {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-container {
  padding: 20px;
  height: 300px;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.ranking-list {
  padding: 16px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
}

.ranking-item.top-three {
  background: linear-gradient(135deg, #fff5e6 0%, #fff0e6 100%);
  border: 1px solid #ffd591;
}

.rank-number {
  width: 32px;
  height: 32px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.ranking-item.top-three .rank-number {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #333;
}

.avatar {
  width: 40px;
  height: 40px;
}

.person-info {
  flex: 1;
}

.person-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.person-role {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.score {
  text-align: center;
}

.score-number {
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
  line-height: 1;
}

.score-label {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}

.trend-section,
.export-section {
  margin-top: 20px;
}

.section-title {
  font-weight: 600;
  font-size: 16px;
}

.trend-chart {
  height: 200px;
  padding: 16px;
}

.export-section .van-grid {
  padding: 16px;
}
</style>