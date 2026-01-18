<template>
  <div class="data-analytics">
    <!-- Loading Skeleton State -->
    <div v-if="loading" class="loading-container">
      <div class="skeleton-header"></div>
      <div class="skeleton-content">
        <div class="skeleton-card" v-for="i in 4" :key="i"></div>
        <div class="skeleton-chart"></div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <header class="header">
        <div class="header-left">
          <button class="back-btn" @click="goBack" aria-label="返回">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="header-title">数据分析</div>
        </div>
        <div class="header-actions">
          <select v-model="selectedVillage" class="village-select" @change="refreshData">
            <option value="">全部村庄</option>
            <option v-for="village in villages" :key="village.id" :value="village.id">
              {{ village.name }}
            </option>
          </select>
          <button class="refresh-btn" @click="refreshData" aria-label="刷新">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </header>

      <main class="main-content">
        <!-- Time Range Tabs -->
        <div class="time-range-tabs">
          <button
            v-for="range in timeRanges"
            :key="range.value"
            :class="['tab-btn', { active: selectedTimeRange === range.value }]"
            @click="selectTimeRange(range.value)"
          >
            {{ range.label }}
          </button>
        </div>

        <!-- Overview Cards -->
        <div class="overview-section">
          <div class="section-title">数据概览</div>
          <div class="cards-grid">
            <div class="stat-card">
              <div class="stat-header">
                <span class="stat-label">用户总数</span>
                <svg class="stat-icon user-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div class="stat-value">{{ overviewData.users?.total || 0 }}</div>
              <div class="stat-sub">
                活跃: {{ overviewData.users?.active || 0 }}
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-header">
                <span class="stat-label">村民总数</span>
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <div class="stat-value">{{ overviewData.residents?.total || 0 }}</div>
              <div class="stat-sub">
                本月新增: {{ overviewData.residents?.newThisMonth || 0 }}
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-header">
                <span class="stat-label">总收入</span>
                <svg class="stat-icon income-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div class="stat-value income">
                {{ formatCurrency(overviewData.finance?.totalIncome || 0) }}
              </div>
              <div class="stat-sub">
                支出: {{ formatCurrency(overviewData.finance?.totalExpense || 0) }}
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-header">
                <span class="stat-label">请求总数</span>
                <svg class="stat-icon request-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <div class="stat-value">{{ overviewData.system?.totalRequests || 0 }}</div>
              <div class="stat-sub">
                错误率: {{ overviewData.system?.errorRate || '0%' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Population Statistics -->
        <div class="section">
          <div class="section-title">
            <span>人口统计</span>
            <button class="expand-btn" @click="toggleSection('population')" aria-label="展开/收起">
              <svg :class="['arrow', { expanded: sections.population }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          <div v-show="sections.population" class="section-content">
            <!-- Gender Distribution -->
            <div class="chart-card">
              <div class="chart-title">性别分布</div>
              <div class="gender-chart">
                <div
                  v-for="item in populationData.genderDistribution"
                  :key="item.gender"
                  class="gender-item"
                >
                  <div class="gender-bar">
                    <div class="bar" :style="{ width: getGenderPercentage(item) + '%' }"></div>
                  </div>
                  <div class="gender-info">
                    <span class="gender-label">{{ item.gender || '未知' }}</span>
                    <span class="gender-count">{{ item.count }}人</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Age Distribution -->
            <div class="chart-card">
              <div class="chart-title">年龄分布</div>
              <div class="age-chart">
                <div
                  v-for="item in populationData.ageDistribution"
                  :key="item.ageGroup"
                  class="age-item"
                >
                  <div class="age-bar">
                    <div
                      class="bar age-bar"
                      :style="{ height: getAgePercentage(item) + '%' }"
                    ></div>
                  </div>
                  <div class="age-label">{{ item.ageGroup }}</div>
                  <div class="age-count">{{ item.count }}</div>
                </div>
              </div>
            </div>

            <!-- Special Groups -->
            <div class="special-groups">
              <div class="special-card">
                <div class="special-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </div>
                <div class="special-info">
                  <div class="special-label">低收入家庭</div>
                  <div class="special-value">{{ populationData.specialGroups?.lowIncome || 0 }}</div>
                </div>
              </div>

              <div class="special-card">
                <div class="special-icon elderly">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="special-info">
                  <div class="special-label">老年人(65+)</div>
                  <div class="special-value">{{ populationData.specialGroups?.elderly || 0 }}</div>
                </div>
              </div>

              <div class="special-card">
                <div class="special-icon disabled">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </div>
                <div class="special-info">
                  <div class="special-label">残疾人士</div>
                  <div class="special-value">{{ populationData.specialGroups?.disabled || 0 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Finance Statistics -->
        <div class="section">
          <div class="section-title">
            <span>财务统计</span>
            <button class="expand-btn" @click="toggleSection('finance')" aria-label="展开/收起">
              <svg :class="['arrow', { expanded: sections.finance }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          <div v-show="sections.finance" class="section-content">
            <!-- Balance Card -->
            <div class="balance-card">
              <div class="balance-info">
                <div class="balance-label">当前余额</div>
                <div class="balance-value" :class="{ negative: (financeData.balance || 0) < 0 }">
                  {{ formatCurrency(financeData.balance || 0) }}
                </div>
              </div>
              <div class="balance-trend">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                  <polyline points="17 6 23 6 23 12"/>
                </svg>
              </div>
            </div>

            <!-- Daily Trend -->
            <div class="chart-card">
              <div class="chart-title">收支趋势（近30天）</div>
              <div class="trend-chart">
                <div
                  v-for="(item, index) in financeData.dailyTrend?.slice(-10)"
                  :key="index"
                  class="trend-bar-group"
                >
                  <div class="trend-bar income-bar" :style="{ height: getTrendHeight(item.income) + '%' }"></div>
                  <div class="trend-bar expense-bar" :style="{ height: getTrendHeight(item.expense) + '%' }"></div>
                  <div class="trend-date">{{ formatDate(item.date) }}</div>
                </div>
              </div>
              <div class="legend">
                <div class="legend-item">
                  <div class="legend-color income-color"></div>
                  <span class="legend-label">收入</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color expense-color"></div>
                  <span class="legend-label">支出</span>
                </div>
              </div>
            </div>

            <!-- Category Breakdown -->
            <div class="category-list">
              <div
                v-for="item in financeData.categoryBreakdown?.slice(0, 5)"
                :key="item.category"
                class="category-item"
              >
                <div class="category-info">
                  <span class="category-name">{{ item.category || '其他' }}</span>
                  <span class="category-amount">{{ formatCurrency(item.total) }}</span>
                </div>
                <div class="category-bar">
                  <div
                    class="bar"
                    :style="{ width: getCategoryPercentage(item) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- User Activity -->
        <div class="section">
          <div class="section-title">
            <span>用户活动</span>
            <button class="expand-btn" @click="toggleSection('activity')" aria-label="展开/收起">
              <svg :class="['arrow', { expanded: sections.activity }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          <div v-show="sections.activity" class="section-content">
            <div class="activity-grid">
              <div class="activity-card">
                <div class="activity-label">总操作数</div>
                <div class="activity-value">{{ userActivityData.total || 0 }}</div>
              </div>

              <div class="activity-card">
                <div class="activity-label">活跃用户</div>
                <div class="activity-value">{{ userActivityData.uniqueUsers || 0 }}</div>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-title">操作类型分布</div>
              <div class="action-list">
                <div
                  v-for="item in userActivityData.byAction?.slice(0, 5)"
                  :key="item.action"
                  class="action-item"
                >
                  <span class="action-name">{{ item.action }}</span>
                  <span class="action-count">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'DataAnalytics'
})

const router = useRouter()
const loading = ref(true)

// Data
const selectedVillage = ref('')
const selectedTimeRange = ref('7d')
const timeRanges = [
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '近90天', value: '90d' },
  { label: '近1年', value: '1y' }
]

const overviewData = ref({})
const populationData = ref({})
const financeData = ref({})
const userActivityData = ref({})
const sections = ref({
  population: true,
  finance: true,
  activity: true
})

// Mock villages
const villages = ref([
  { id: 'village_001', name: '东村' },
  { id: 'village_002', name: '西村' },
  { id: 'village_003', name: '南村' }
])

// Methods
const goBack = () => {
  router.back()
}

const selectTimeRange = (range) => {
  selectedTimeRange.value = range
  refreshData()
}

const toggleSection = (section) => {
  sections.value[section] = !sections.value[section]
}

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchOverview(),
      fetchPopulation(),
      fetchFinance(),
      fetchUserActivity()
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchOverview = async () => {
  const params = new URLSearchParams({
    villageId: selectedVillage.value || '',
    timeRange: selectedTimeRange.value
  })

  const response = await fetch(`/api/v1/analytics/overview?${params}`)
  const data = await response.json()
  if (data.success) {
    overviewData.value = data.data
  }
}

const fetchPopulation = async () => {
  const params = new URLSearchParams({
    villageId: selectedVillage.value || '',
    groupBy: 'age',
    includeTrends: 'true',
    timeRange: selectedTimeRange.value
  })

  const response = await fetch(`/api/v1/analytics/population?${params}`)
  const data = await response.json()
  if (data.success) {
    populationData.value = data.data
  }
}

const fetchFinance = async () => {
  const params = new URLSearchParams({
    villageId: selectedVillage.value || '',
    timeRange: selectedTimeRange.value
  })

  const response = await fetch(`/api/v1/analytics/finance?${params}`)
  const data = await response.json()
  if (data.success) {
    financeData.value = data.data
  }
}

const fetchUserActivity = async () => {
  const params = new URLSearchParams({
    timeRange: selectedTimeRange.value
  })

  const response = await fetch(`/api/v1/analytics/user-activity?${params}`)
  const data = await response.json()
  if (data.success) {
    userActivityData.value = data.data
  }
}

// Utility functions
const formatCurrency = (value) => {
  return `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const getGenderPercentage = (item) => {
  const total = populationData.value.genderDistribution?.reduce((sum, g) => sum + g.count, 0) || 1
  return (item.count / total * 100).toFixed(1)
}

const getAgePercentage = (item) => {
  const max = Math.max(...populationData.value.ageDistribution?.map(a => a.count) || [1])
  return (item.count / max * 100).toFixed(1)
}

const getTrendHeight = (value) => {
  const max = Math.max(
    ...financeData.value.dailyTrend?.map(t => Math.max(t.income, t.expense)) || [1]
  )
  return (value / max * 100).toFixed(1)
}

const getCategoryPercentage = (item) => {
  const total = financeData.value.categoryBreakdown?.reduce((sum, c) => sum + c.total, 0) || 1
  return (item.total / total * 100).toFixed(1)
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

onMounted(() => {
  setTimeout(() => {
    refreshData()
  }, 300)
})
</script>

<style scoped>
/* Base Styles */
.data-analytics {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  padding-bottom: calc(70px + env(safe-area-inset-bottom));
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 16px calc(16px + env(safe-area-inset-left));
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(250, 140, 22, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.village-select {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  min-width: 100px;
}

.village-select option {
  background: #fff;
  color: #333;
}

.refresh-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.refresh-btn:active {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(180deg);
}

.refresh-btn svg {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

/* Main Content */
.main-content {
  padding: 16px 16px 0 calc(16px + env(safe-area-inset-left));
}

/* Time Range Tabs */
.time-range-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: #fff;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.tab-btn.active {
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  color: #fff;
}

.tab-btn:active {
  transform: scale(0.97);
}

/* Sections */
.overview-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  margin-bottom: 16px;
}

.expand-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #999;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.expand-btn:active {
  background: rgba(0, 0, 0, 0.05);
}

.arrow {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.arrow.expanded {
  transform: rotate(180deg);
}

/* Overview Cards */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  padding: 16px;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.stat-card:active {
  transform: scale(0.98);
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
}

.stat-icon {
  width: 20px;
  height: 20px;
  color: #999;
}

.stat-icon.user-icon {
  color: #fa8c16;
}

.stat-icon.income-icon {
  color: #52c41a;
}

.stat-icon.request-icon {
  color: #1890ff;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-value.income {
  color: #52c41a;
}

.stat-value.negative {
  color: #ff4d4f;
}

.stat-sub {
  font-size: 12px;
  color: #999;
  line-height: 1.3;
}

/* Chart Cards */
.chart-card {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  margin-bottom: 12px;
}

/* Gender Chart */
.gender-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gender-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gender-bar {
  height: 24px;
  background: #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
}

.gender-bar .bar {
  height: 100%;
  background: linear-gradient(90deg, #fa8c16 0%, #d46b08 100%);
  transition: width 0.3s ease;
}

.gender-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gender-label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.gender-count {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

/* Age Chart */
.age-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  padding: 20px 0;
}

.age-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.age-bar {
  width: 30px;
  background: #e8e8e8;
  border-radius: 15px 15px 0 0;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.age-bar .bar {
  width: 100%;
  background: linear-gradient(180deg, #fa8c16 0%, #d46b08 100%);
  transition: height 0.3s ease;
  border-radius: 15px 15px 0 0;
}

.age-label {
  font-size: 12px;
  color: #666;
  text-align: center;
  line-height: 1.3;
}

.age-count {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

/* Special Groups */
.special-groups {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.special-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.special-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 50%;
  color: #fff;
  margin-bottom: 8px;
}

.special-icon.elderly {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.special-icon.disabled {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.special-icon svg {
  width: 20px;
  height: 20px;
}

.special-info {
  text-align: center;
}

.special-label {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
  margin-bottom: 4px;
}

.special-value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

/* Balance Card */
.balance-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border-radius: 12px;
  margin-bottom: 16px;
}

.balance-info {
  flex: 1;
}

.balance-label {
  font-size: 14px;
  color: #666;
  line-height: 1.3;
  margin-bottom: 8px;
}

.balance-value {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.balance-value.negative {
  color: #ff4d4f;
}

.balance-trend {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  color: #52c41a;
}

.balance-trend svg {
  width: 24px;
  height: 24px;
}

/* Trend Chart */
.trend-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  padding: 20px 0;
  margin-bottom: 12px;
}

.trend-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.trend-bar {
  width: 8px;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.trend-bar.income-bar {
  background: #52c41a;
}

.trend-bar.expense-bar {
  background: #ff4d4f;
}

.trend-date {
  font-size: 10px;
  color: #999;
  line-height: 1.2;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.income-color {
  background: #52c41a;
}

.legend-color.expense-color {
  background: #ff4d4f;
}

.legend-label {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
}

/* Category List */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.category-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.category-amount {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.category-bar {
  height: 8px;
  background: #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

.category-bar .bar {
  height: 100%;
  background: linear-gradient(90deg, #fa8c16 0%, #d46b08 100%);
  transition: width 0.3s ease;
}

/* Activity Grid */
.activity-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.activity-card {
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
  text-align: center;
}

.activity-label {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
  margin-bottom: 8px;
}

.activity-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

/* Action List */
.action-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.action-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.action-count {
  font-size: 16px;
  color: #fa8c16;
  font-weight: 600;
}

/* Loading Skeleton */
.loading-container {
  padding: 16px;
}

.skeleton-header {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 0;
  margin: -16px -16px 16px -16px;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-card {
  width: 100%;
  height: 120px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

.skeleton-chart {
  width: 100%;
  height: 240px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Media Queries - Small Screens */
@media (max-width: 375px) {
  .header {
    padding: 14px 12px 14px calc(12px + env(safe-area-inset-left));
  }

  .header-title {
    font-size: 18px;
  }

  .main-content {
    padding: 14px 12px 0 calc(12px + env(safe-area-inset-left));
  }

  .section,
  .overview-section {
    padding: 16px 12px;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 16px;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 20px;
  }

  .special-groups {
    grid-template-columns: 1fr;
  }

  .activity-grid {
    grid-template-columns: 1fr;
  }
}

/* Extra Small Screens (320px) */
@media (max-width: 320px) {
  .header {
    padding: 12px 10px 12px calc(10px + env(safe-area-inset-left));
  }

  .header-title {
    font-size: 17px;
  }

  .main-content {
    padding: 12px 10px 0 calc(10px + env(safe-area-inset-left));
  }

  .section,
  .overview-section {
    padding: 14px 10px;
  }

  .section-title {
    font-size: 15px;
  }

  .stat-value {
    font-size: 18px;
  }
}
</style>
