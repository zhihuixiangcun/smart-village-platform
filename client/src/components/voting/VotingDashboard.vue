<template>
  <div class="voting-dashboard">
    <div class="dashboard-header">
      <h1>投票系统统计</h1>
      <div class="time-selector">
        <el-select v-model="timeRange" @change="loadStatistics">
          <el-option label="最近7天" value="7"></el-option>
          <el-option label="最近30天" value="30"></el-option>
          <el-option label="最近90天" value="90"></el-option>
          <el-option label="最近一年" value="365"></el-option>
        </el-select>
      </div>
    </div>

    <div v-loading="loading" class="dashboard-content">
      <!-- 总体统计 -->
      <div class="overview-stats">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="el-icon-s-data"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalVotes || 0 }}</div>
                <div class="stat-label">总投票数</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-icon active">
                <i class="el-icon-loading"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.activeVotes || 0 }}</div>
                <div class="stat-label">进行中</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-icon completed">
                <i class="el-icon-check"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.completedVotes || 0 }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-icon participants">
                <i class="el-icon-user-solid"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalParticipants || 0 }}</div>
                <div class="stat-label">总参与人次</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 参与率分析 -->
      <div class="participation-analysis">
        <div class="section-header">
          <h2>参与率分析</h2>
          <div class="section-actions">
            <el-button size="small" @click="refreshData">
              <i class="el-icon-refresh"></i>
              刷新
            </el-button>
          </div>
        </div>
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="chart-container">
              <h3>平均参与率</h3>
              <div class="participation-gauge">
                <el-progress
                  type="circle"
                  :percentage="Math.round(statistics.avgParticipationRate || 0)"
                  :width="150"
                  :stroke-width="10"
                  :color="getParticipationColor(statistics.avgParticipationRate)"
                >
                  <template slot="default">
                    <div class="progress-content">
                      <div class="progress-number">{{ Math.round(statistics.avgParticipationRate || 0) }}%</div>
                      <div class="progress-label">平均参与率</div>
                    </div>
                  </template>
                </el-progress>
              </div>
              <div class="participation-metrics">
                <div class="metric">
                  <span class="label">最高:</span>
                  <span class="value">{{ highestParticipation }}%</span>
                </div>
                <div class="metric">
                  <span class="label">最低:</span>
                  <span class="value">{{ lowestParticipation }}%</span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="chart-container">
              <h3>参与率分布</h3>
              <div ref="participationChart" class="chart"></div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 投票类型统计 -->
      <div class="vote-type-stats">
        <div class="section-header">
          <h2>投票类型统计</h2>
        </div>
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="chart-container">
              <h3>投票类型分布</h3>
              <div ref="voteTypeChart" class="chart"></div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="chart-container">
              <h3>投票分类统计</h3>
              <div ref="categoryChart" class="chart"></div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 趋势分析 -->
      <div class="trend-analysis">
        <div class="section-header">
          <h2>趋势分析</h2>
        </div>
        <div class="chart-container">
          <h3>投票活动趋势</h3>
          <div ref="trendChart" class="chart trend-chart"></div>
        </div>
      </div>

      <!-- 质量指标 -->
      <div class="quality-metrics">
        <div class="section-header">
          <h2>质量指标</h2>
        </div>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="metric-card">
              <div class="metric-header">
                <h3>投票质量</h3>
                <i class="el-icon-medal"></i>
              </div>
              <div class="metric-content">
                <div class="quality-score">
                  <div class="score-value">{{ getQualityScore() }}</div>
                  <div class="score-label">综合评分</div>
                </div>
                <div class="quality-factors">
                  <div class="factor">
                    <span class="factor-name">参与度</span>
                    <el-progress :percentage="Math.round(statistics.avgParticipationRate || 0)" :show-text="false"></el-progress>
                  </div>
                  <div class="factor">
                    <span class="factor-name">完成率</span>
                    <el-progress :percentage="getCompletionRate()" :show-text="false"></el-progress>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="metric-card">
              <div class="metric-header">
                <h3>活跃度</h3>
                <i class="el-icon-pie-chart"></i>
              </div>
              <div class="metric-content">
                <div class="activity-indicators">
                  <div class="indicator">
                    <div class="indicator-value">{{ getDailyAverage() }}</div>
                    <div class="indicator-label">日均投票</div>
                  </div>
                  <div class="indicator">
                    <div class="indicator-value">{{ getActiveUsers() }}</div>
                    <div class="indicator-label">活跃用户</div>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="metric-card">
              <div class="metric-header">
                <h3>效率指标</h3>
                <i class="el-icon-time"></i>
              </div>
              <div class="metric-content">
                <div class="efficiency-metrics">
                  <div class="metric-item">
                    <span class="label">平均投票时长:</span>
                    <span class="value">{{ getAverageVoteDuration() }}天</span>
                  </div>
                  <div class="metric-item">
                    <span class="label">平均响应时间:</span>
                    <span class="value">{{ getAverageResponseTime() }}小时</span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script>
import { votingAPI } from '@/api/voting'
import * as echarts from 'echarts'

export default {
  name: 'VotingDashboard',
  data() {
    return {
      loading: false,
      timeRange: '30',
      statistics: {},
      participationChart: null,
      voteTypeChart: null,
      categoryChart: null,
      trendChart: null
    }
  },
  computed: {
    highestParticipation() {
      // 模拟数据，实际应从API获取
      return 85
    },
    lowestParticipation() {
      // 模拟数据，实际应从API获取
      return 45
    }
  },
  created() {
    this.loadStatistics()
  },
  mounted() {
    this.$nextTick(() => {
      this.initCharts()
    })
  },
  beforeDestroy() {
    this.destroyCharts()
  },
  methods: {
    async loadStatistics() {
      this.loading = true
      try {
        const response = await votingAPI.getVotingStatistics()

        if (response.data.success) {
          this.statistics = response.data.data
          this.$nextTick(() => {
            this.updateCharts()
          })
        }
      } catch (error) {
        this.$message.error('加载统计数据失败')
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    async refreshData() {
      await this.loadStatistics()
      this.$message.success('数据已刷新')
    },

    initCharts() {
      if (this.$refs.participationChart) {
        this.participationChart = echarts.init(this.$refs.participationChart)
      }
      if (this.$refs.voteTypeChart) {
        this.voteTypeChart = echarts.init(this.$refs.voteTypeChart)
      }
      if (this.$refs.categoryChart) {
        this.categoryChart = echarts.init(this.$refs.categoryChart)
      }
      if (this.$refs.trendChart) {
        this.trendChart = echarts.init(this.$refs.trendChart)
      }
      this.updateCharts()
    },

    updateCharts() {
      this.updateParticipationChart()
      this.updateVoteTypeChart()
      this.updateCategoryChart()
      this.updateTrendChart()
    },

    updateParticipationChart() {
      if (!this.participationChart) return

      // 模拟参与率分布数据
      const data = [
        { name: '0-20%', value: 2 },
        { name: '21-40%', value: 5 },
        { name: '41-60%', value: 8 },
        { name: '61-80%', value: 12 },
        { name: '81-100%', value: 6 }
      ]

      const option = {
        tooltip: {
          trigger: 'item'
        },
        series: [
          {
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

      this.participationChart.setOption(option)
    },

    updateVoteTypeChart() {
      if (!this.voteTypeChart) return

      // 模拟投票类型数据
      const data = [
        { name: '单选投票', value: 15 },
        { name: '多选投票', value: 8 },
        { name: '是否投票', value: 12 },
        { name: '评分投票', value: 5 },
        { name: '排序投票', value: 3 }
      ]

      const option = {
        tooltip: {
          trigger: 'item'
        },
        legend: {
          top: '5%',
          left: 'center'
        },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '16',
                fontWeight: 'bold'
              }
            },
            data: data
          }
        ]
      }

      this.voteTypeChart.setOption(option)
    },

    updateCategoryChart() {
      if (!this.categoryChart) return

      // 模拟分类统计数据
      const categories = ['村务事项', '基础设施', '财务决策', '政策表决', '其他']
      const values = [18, 12, 8, 6, 3]

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
          data: categories,
          axisLabel: {
            interval: 0,
            rotate: 45
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            type: 'bar',
            data: values,
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

      this.categoryChart.setOption(option)
    },

    updateTrendChart() {
      if (!this.trendChart) return

      // 模拟趋势数据
      const dates = []
      const voteData = []
      const participationData = []

      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dates.push(date.toLocaleDateString())
        voteData.push(Math.floor(Math.random() * 5) + 1)
        participationData.push(Math.floor(Math.random() * 30) + 50)
      }

      const option = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['投票数量', '平均参与率']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: dates,
          axisLabel: {
            interval: 5
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '投票数量',
            position: 'left'
          },
          {
            type: 'value',
            name: '参与率(%)',
            position: 'right'
          }
        ],
        series: [
          {
            name: '投票数量',
            type: 'line',
            yAxisIndex: 0,
            data: voteData,
            smooth: true,
            itemStyle: {
              color: '#5470c6'
            }
          },
          {
            name: '平均参与率',
            type: 'line',
            yAxisIndex: 1,
            data: participationData,
            smooth: true,
            itemStyle: {
              color: '#91cc75'
            }
          }
        ]
      }

      this.trendChart.setOption(option)
    },

    destroyCharts() {
      if (this.participationChart) {
        this.participationChart.dispose()
        this.participationChart = null
      }
      if (this.voteTypeChart) {
        this.voteTypeChart.dispose()
        this.voteTypeChart = null
      }
      if (this.categoryChart) {
        this.categoryChart.dispose()
        this.categoryChart = null
      }
      if (this.trendChart) {
        this.trendChart.dispose()
        this.trendChart = null
      }
    },

    getParticipationColor(rate) {
      if (rate >= 80) return '#67c23a'
      if (rate >= 60) return '#e6a23c'
      return '#f56c6c'
    },

    getQualityScore() {
      // 简化的质量评分计算
      const participation = this.statistics.avgParticipationRate || 0
      const completion = this.getCompletionRate()
      return Math.round((participation * 0.6 + completion * 0.4))
    },

    getCompletionRate() {
      const total = this.statistics.totalVotes || 1
      const completed = this.statistics.completedVotes || 0
      return Math.round((completed / total) * 100)
    },

    getDailyAverage() {
      const days = parseInt(this.timeRange)
      const total = this.statistics.totalVotes || 0
      return Math.round((total / days) * 10) / 10
    },

    getActiveUsers() {
      // 模拟活跃用户数
      return Math.floor((this.statistics.totalParticipants || 0) * 0.8)
    },

    getAverageVoteDuration() {
      // 模拟平均投票时长
      return 5.2
    },

    getAverageResponseTime() {
      // 模拟平均响应时间
      return 2.5
    }
  }
}
</script>

<style scoped>
.voting-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.dashboard-header h1 {
  margin: 0;
  color: #333;
}

.overview-stats {
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: #f0f2f5;
  color: #666;
}

.stat-icon.active {
  background: #e6f7ff;
  color: #1890ff;
}

.stat-icon.completed {
  background: #f6ffed;
  color: #52c41a;
}

.stat-icon.participants {
  background: #fff2e8;
  color: #fa8c16;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.participation-analysis,
.vote-type-stats,
.trend-analysis,
.quality-metrics {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.section-header h2 {
  margin: 0;
  color: #333;
}

.chart-container {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  text-align: center;
}

.chart-container h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.chart {
  width: 100%;
  height: 300px;
}

.trend-chart {
  height: 400px;
}

.participation-gauge {
  margin-bottom: 20px;
}

.progress-content {
  text-align: center;
}

.progress-number {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.progress-label {
  font-size: 12px;
  color: #666;
}

.participation-metrics {
  display: flex;
  justify-content: space-around;
}

.participation-metrics .metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.participation-metrics .label {
  color: #666;
  font-size: 14px;
}

.participation-metrics .value {
  color: #333;
  font-weight: bold;
}

.metric-card {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
}

.metric-header {
  background: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.metric-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.metric-header i {
  font-size: 20px;
  color: #409eff;
}

.metric-content {
  padding: 20px;
}

.quality-score {
  text-align: center;
  margin-bottom: 20px;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
  color: #52c41a;
  margin-bottom: 5px;
}

.score-label {
  color: #666;
  font-size: 14px;
}

.quality-factors {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.factor {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.factor-name {
  color: #666;
  font-size: 14px;
  width: 80px;
}

.activity-indicators {
  display: flex;
  justify-content: space-around;
}

.indicator {
  text-align: center;
}

.indicator-value {
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
  margin-bottom: 5px;
}

.indicator-label {
  color: #666;
  font-size: 14px;
}

.efficiency-metrics {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.metric-item:last-child {
  border-bottom: none;
}

.metric-item .label {
  color: #666;
  font-size: 14px;
}

.metric-item .value {
  color: #333;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .voting-dashboard {
    padding: 10px;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 15px;
  }

  .stat-card {
    padding: 15px;
    gap: 15px;
  }

  .stat-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }

  .chart {
    height: 250px;
  }

  .trend-chart {
    height: 300px;
  }

  .participation-metrics {
    flex-direction: column;
    gap: 10px;
  }

  .activity-indicators {
    flex-direction: column;
    gap: 15px;
  }
}
</style>