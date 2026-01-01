<template>
  <div class="statistics">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="数据统计"
      left-arrow
      @click-left="$router.go(-1)"
      right-text="导出"
      @click-right="exportData"
    />

    <!-- 时间选择器 -->
    <div class="time-selector">
      <van-tabs v-model:active="activeTimeTab" @change="onTimeChange">
        <van-tab title="今日" name="today" />
        <van-tab title="本周" name="week" />
        <van-tab title="本月" name="month" />
        <van-tab title="自定义" name="custom" />
      </van-tabs>
    </div>

    <!-- 自定义日期选择 -->
    <div v-if="activeTimeTab === 'custom'" class="custom-date">
      <van-cell-group inset>
        <van-field
          name="dateRange"
          label="日期范围"
          readonly
          clickable
          :value="getDateRangeText(customDateRange)"
          @click="showDateRangePicker = true"
        />
      </van-cell-group>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <van-grid :column-num="2" :gutter="12">
        <van-grid-item>
          <van-cell-group inset class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ totalDocuments }}</div>
              <div class="stat-label">资料总数</div>
              <div class="stat-trend" :class="getTrendClass(documentTrend)">
                <van-icon :name="getTrendIcon(documentTrend)" />
                {{ Math.abs(documentTrend) }}%
              </div>
            </div>
          </van-cell-group>
        </van-grid-item>

        <van-grid-item>
          <van-cell-group inset class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ completedTasks }}</div>
              <div class="stat-label">已完成任务</div>
              <div class="stat-trend" :class="getTrendClass(taskTrend)">
                <van-icon :name="getTrendIcon(taskTrend)" />
                {{ Math.abs(taskTrend) }}%
              </div>
            </div>
          </van-cell-group>
        </van-grid-item>

        <van-grid-item>
          <van-cell-group inset class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ activeUsers }}</div>
              <div class="stat-label">活跃用户</div>
              <div class="stat-trend" :class="getTrendClass(userTrend)">
                <van-icon :name="getTrendIcon(userTrend)" />
                {{ Math.abs(userTrend) }}%
              </div>
            </div>
          </van-cell-group>
        </van-grid-item>

        <van-grid-item>
          <van-cell-group inset class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ avgResponseTime }}</div>
              <div class="stat-label">平均响应时间</div>
              <div class="stat-trend positive">
                <van-icon name="arrow-up" />
                较快
              </div>
            </div>
          </van-cell-group>
        </van-grid-item>
      </van-grid>
    </div>

    <!-- 图表统计 -->
    <div class="charts-section">
      <!-- 资料类别分布 -->
      <van-cell-group inset title="资料类别分布">
        <div class="chart-container">
          <div class="category-chart">
            <div
              v-for="(item, index) in categoryData"
              :key="index"
              class="category-item"
            >
              <div class="category-info">
                <span class="category-name">{{ item.name }}</span>
                <span class="category-count">{{ item.count }}</span>
              </div>
              <div class="category-bar">
                <div
                  class="category-progress"
                  :style="{
                    width: `${(item.count / categoryTotal) * 100}%`,
                    backgroundColor: item.color
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </van-cell-group>

      <!-- 每日收集趋势 -->
      <van-cell-group inset title="每日收集趋势">
        <div class="chart-container">
          <div class="trend-chart">
            <div class="trend-grid">
              <div
                v-for="(day, index) in trendData"
                :key="index"
                class="trend-day"
              >
                <div
                  class="trend-bar"
                  :style="{
                    height: `${(day.value / maxTrendValue) * 100}%`
                  }"
                ></div>
                <div class="trend-label">{{ day.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </van-cell-group>

      <!-- 用户活跃度 -->
      <van-cell-group inset title="用户活跃度">
        <div class="chart-container">
          <div class="user-activity">
            <div class="activity-list">
              <div
                v-for="(user, index) in userActivityData"
                :key="index"
                class="activity-item"
              >
                <div class="user-avatar">
                  <van-image
                    :src="user.avatar"
                    width="40"
                    height="40"
                    round
                    fit="cover"
                  >
                    <template #error>
                      <van-icon name="user-o" size="20" />
                    </template>
                  </van-image>
                </div>
                <div class="user-info">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-role">{{ user.role }}</div>
                </div>
                <div class="activity-count">
                  <van-tag type="primary" size="small">{{ user.count }} 次</van-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </van-cell-group>
    </div>

    <!-- 日期范围选择器 -->
    <van-popup v-model:show="showDateRangePicker" position="bottom">
      <van-calendar
        v-model="customDateRange"
        title="选择日期范围"
        type="range"
        @confirm="onDateRangeConfirm"
        @cancel="showDateRangePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import villageApi from '@/api/villageManagement'

const router = useRouter()

// 响应式数据
const activeTimeTab = ref('today')
const showDateRangePicker = ref(false)
const customDateRange = ref([])

// 统计数据
const totalDocuments = ref(156)
const completedTasks = ref(89)
const activeUsers = ref(24)
const avgResponseTime = ref('2.5小时')

// 趋势数据
const documentTrend = ref(12)
const taskTrend = ref(-5)
const userTrend = ref(8)

// 类别数据
const categoryData = ref([
  { name: '村务', count: 45, color: '#409EFF' },
  { name: '村民信息', count: 38, color: '#67C23A' },
  { name: '财务', count: 32, color: '#E6A23C' },
  { name: '项目', count: 25, color: '#F56C6C' },
  { name: '会议', count: 16, color: '#909399' }
])

// 趋势数据
const trendData = ref([
  { label: '周一', value: 12 },
  { label: '周二', value: 19 },
  { label: '周三', value: 15 },
  { label: '周四', value: 25 },
  { label: '周五', value: 22 },
  { label: '周六', value: 18 },
  { label: '周日', value: 14 }
])

// 用户活跃度数据
const userActivityData = ref([
  {
    name: '张三',
    role: '村主任',
    count: 45,
    avatar: ''
  },
  {
    name: '李四',
    role: '会计',
    count: 38,
    avatar: ''
  },
  {
    name: '王五',
    role: '副主任',
    count: 32,
    avatar: ''
  },
  {
    name: '赵六',
    role: '文书',
    count: 28,
    avatar: ''
  }
])

// 计算属性
const categoryTotal = computed(() => {
  return categoryData.value.reduce((sum, item) => sum + item.count, 0)
})

const maxTrendValue = computed(() => {
  return Math.max(...trendData.value.map(item => item.value))
})

// 方法
const getTrendClass = (trend) => {
  return trend >= 0 ? 'positive' : 'negative'
}

const getTrendIcon = (trend) => {
  return trend >= 0 ? 'arrow-up' : 'arrow-down'
}

const getDateRangeText = (dateRange) => {
  if (!dateRange || dateRange.length === 0) return '选择日期范围'
  if (dateRange.length === 1) return formatDate(dateRange[0])
  return `${formatDate(dateRange[0])} - ${formatDate(dateRange[1])}`
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const onTimeChange = async (tabName) => {
  try {
    // 根据时间范围加载统计数据
    const params = { timeRange: tabName }

    if (tabName === 'custom' && customDateRange.value.length > 0) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    }

    const response = await villageApi.getStatistics(params)
    updateStatistics(response.data.data)
  } catch (error) {
    console.error('加载统计数据失败:', error)
    showToast('加载失败')
  }
}

const onDateRangeConfirm = (dateRange) => {
  customDateRange.value = dateRange
  showDateRangePicker.value = false
  onTimeChange('custom')
}

const exportData = async () => {
  try {
    const params = {
      timeRange: activeTimeTab.value,
      format: 'excel'
    }

    if (activeTimeTab.value === 'custom' && customDateRange.value.length > 0) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    }

    showToast('正在导出数据...')

    const response = await villageApi.exportStatistics(params)

    // 模拟下载
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `统计数据_${formatDate(new Date())}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    showToast('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    showToast('导出失败')
  }
}

const updateStatistics = (data) => {
  totalDocuments.value = data.totalDocuments || 0
  completedTasks.value = data.completedTasks || 0
  activeUsers.value = data.activeUsers || 0
  avgResponseTime.value = data.avgResponseTime || '0小时'

  documentTrend.value = data.documentTrend || 0
  taskTrend.value = data.taskTrend || 0
  userTrend.value = data.userTrend || 0

  categoryData.value = data.categoryDistribution || []
  trendData.value = data.dailyTrend || []
  userActivityData.value = data.userActivity || []
}

const loadStatistics = async () => {
  try {
    const response = await villageApi.getStatistics({ timeRange: 'today' })
    updateStatistics(response.data.data)
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.statistics {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.time-selector {
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.custom-date {
  padding: 12px 0;
}

.stats-cards {
  padding: 16px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.stat-trend.positive {
  color: #67C23A;
}

.stat-trend.negative {
  color: #F56C6C;
}

.charts-section {
  padding: 0 16px 80px;
}

.chart-container {
  padding: 16px;
  min-height: 200px;
}

.category-chart {
  space-y: 12px;
}

.category-item {
  margin-bottom: 16px;
}

.category-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.category-name {
  font-size: 14px;
  color: #333;
}

.category-count {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.category-bar {
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.category-progress {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.trend-chart {
  height: 200px;
}

.trend-grid {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 160px;
  gap: 4px;
}

.trend-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.trend-bar {
  width: 100%;
  background-color: #409EFF;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
}

.trend-label {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.user-activity {
  max-height: 300px;
  overflow-y: auto;
}

.activity-list {
  space-y: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.activity-item:last-child {
  border-bottom: none;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.user-role {
  font-size: 12px;
  color: #666;
}
</style>