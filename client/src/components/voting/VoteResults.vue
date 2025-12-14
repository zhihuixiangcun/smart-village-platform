<template>
  <div class="vote-results" v-loading="loading">
    <div v-if="vote" class="results-container">
      <!-- 投票信息头部 -->
      <div class="vote-header">
        <div class="header-info">
          <h1>{{ vote.title }}</h1>
          <div class="vote-meta">
            <el-tag :type="getStatusType(vote)" size="medium">
              {{ getStatusText(vote) }}
            </el-tag>
            <span class="vote-type">{{ getVoteTypeText(vote.voteType) }}</span>
            <span class="end-time">结束时间: {{ formatDate(vote.endTime) }}</span>
          </div>
          <p class="vote-description">{{ vote.description }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="$router.go(-1)">
            <i class="el-icon-arrow-left"></i>
            返回
          </el-button>
          <el-button @click="refreshResults" :loading="loading">
            <i class="el-icon-refresh"></i>
            刷新
          </el-button>
        </div>
      </div>

      <!-- 投票总体统计 -->
      <div class="overall-stats">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-value">{{ vote.totalVoted }}</div>
              <div class="stat-label">总投票数</div>
              <div class="stat-icon">
                <i class="el-icon-check"></i>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-value">{{ vote.totalEligibleVoters }}</div>
              <div class="stat-label">符合条件人数</div>
              <div class="stat-icon">
                <i class="el-icon-user"></i>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-value">{{ Math.round(vote.participationRate) }}%</div>
              <div class="stat-label">参与率</div>
              <div class="stat-icon">
                <i class="el-icon-pie-chart"></i>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card">
              <div class="stat-value">{{ getWinningOption().voteCount }}</div>
              <div class="stat-label">最高得票</div>
              <div class="stat-icon">
                <i class="el-icon-trophy"></i>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 投票结果详情 -->
      <div class="results-details">
        <div class="results-header">
          <h2>投票结果</h2>
          <div class="view-controls">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="chart">图表视图</el-radio-button>
              <el-radio-button label="table">表格视图</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 图表视图 -->
        <div v-if="viewMode === 'chart'" class="chart-view">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="chart-container">
                <h3>得票分布 - 饼图</h3>
                <div ref="pieChart" class="chart"></div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="chart-container">
                <h3>得票分布 - 柱状图</h3>
                <div ref="barChart" class="chart"></div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 表格视图 -->
        <div v-if="viewMode === 'table'" class="table-view">
          <div class="results-list">
            <div
              v-for="(result, index) in sortedResults"
              :key="result.optionId"
              class="result-item"
              :class="{ 'winner': index === 0 }"
            >
              <div class="result-header">
                <div class="rank-info">
                  <span class="rank">第{{ index + 1 }}名</span>
                  <i v-if="index === 0" class="el-icon-trophy winner-icon"></i>
                </div>
                <div class="option-info">
                  <h3 class="option-title">{{ result.title }}</h3>
                  <p v-if="getOptionDescription(result.optionId)" class="option-description">
                    {{ getOptionDescription(result.optionId) }}
                  </p>
                </div>
              </div>

              <div class="result-stats">
                <div class="vote-count">
                  <span class="count">{{ result.voteCount }}</span>
                  <span class="unit">票</span>
                </div>
                <div class="percentage">
                  <span class="percent">{{ result.percentage }}%</span>
                </div>
              </div>

              <div class="result-bar">
                <div
                  class="bar-fill"
                  :style="{
                    width: result.percentage + '%',
                    backgroundColor: getBarColor(index)
                  }"
                ></div>
                <div class="bar-text">
                  {{ result.voteCount }} 票 ({{ result.percentage }}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 投票分析 -->
      <div class="vote-analysis">
        <h2>投票分析</h2>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="analysis-card">
              <h3>结果分析</h3>
              <div class="analysis-content">
                <div class="analysis-item">
                  <span class="label">获胜选项:</span>
                  <span class="value">{{ getWinningOption().title }}</span>
                </div>
                <div class="analysis-item">
                  <span class="label">得票率:</span>
                  <span class="value">{{ getWinningOption().percentage }}%</span>
                </div>
                <div class="analysis-item">
                  <span class="label">领先优势:</span>
                  <span class="value">{{ getLeadMargin() }}票</span>
                </div>
                <div class="analysis-item">
                  <span class="label">结果性质:</span>
                  <span class="value" :class="{ 'decisive': isDecisiveWin() }">
                    {{ isDecisiveWin() ? '过半数胜出' : '相对多数胜出' }}
                  </span>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="analysis-card">
              <h3>参与情况</h3>
              <div class="participation-chart">
                <el-progress
                  type="circle"
                  :percentage="Math.round(vote.participationRate)"
                  :width="120"
                  :stroke-width="8"
                  :color="getParticipationColor(vote.participationRate)"
                >
                  <template slot="default">
                    <div class="progress-content">
                      <div class="progress-number">{{ Math.round(vote.participationRate) }}%</div>
                      <div class="progress-label">参与率</div>
                    </div>
                  </template>
                </el-progress>
                <div class="participation-details">
                  <div class="detail-item">
                    <span class="label">已投票:</span>
                    <span class="value">{{ vote.totalVoted }}人</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">未投票:</span>
                    <span class="value">{{ vote.totalEligibleVoters - vote.totalVoted }}人</span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="analysis-card">
              <h3>投票质量</h3>
              <div class="quality-metrics">
                <div class="metric-item">
                  <div class="metric-value">{{ getTrustScore() }}</div>
                  <div class="metric-label">信任度评分</div>
                </div>
                <div class="metric-item">
                  <div class="metric-value">{{ getCompetitiveness() }}</div>
                  <div class="metric-label">竞争激烈度</div>
                </div>
                <div class="quality-indicators">
                  <div class="indicator">
                    <i class="el-icon-shield" :class="{ 'active': getTrustScore() >= 80 }"></i>
                    <span>投票安全</span>
                  </div>
                  <div class="indicator">
                    <i class="el-icon-pie-chart" :class="{ 'active': vote.participationRate >= 60 }"></i>
                    <span>参与充分</span>
                  </div>
                  <div class="indicator">
                    <i class="el-icon-medal" :class="{ 'active': isDecisiveWin() }"></i>
                    <span>结果明确</span>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 时间线分析 -->
      <div v-if="vote.results && vote.results.timeline" class="timeline-analysis">
        <h2>投票时间线</h2>
        <div class="timeline-chart">
          <div ref="timelineChart" class="chart"></div>
        </div>
      </div>

      <!-- 数据导出 -->
      <div class="export-section">
        <h2>数据导出</h2>
        <div class="export-actions">
          <el-button icon="el-icon-download" @click="exportResults('excel')">
            导出Excel
          </el-button>
          <el-button icon="el-icon-document" @click="exportResults('pdf')">
            导出PDF报告
          </el-button>
          <el-button icon="el-icon-picture" @click="exportChart">
            导出图表
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { votingAPI } from '@/api/voting'
import { formatDate } from '@/utils/dateUtils'
import * as echarts from 'echarts'

export default {
  name: 'VoteResults',
  data() {
    return {
      loading: false,
      vote: null,
      viewMode: 'chart',
      pieChart: null,
      barChart: null,
      timelineChart: null
    }
  },
  computed: {
    voteId() {
      return this.$route.params.id
    },
    sortedResults() {
      if (!this.vote || !this.vote.results) return []
      return [...this.vote.results.options].sort((a, b) => b.voteCount - a.voteCount)
    }
  },
  created() {
    this.loadVoteResults()
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
    async loadVoteResults() {
      this.loading = true
      try {
        const response = await votingAPI.getVoteResults(this.voteId)

        if (response.data.success) {
          this.vote = response.data.data
          this.$nextTick(() => {
            this.updateCharts()
          })
        }
      } catch (error) {
        this.$message.error('加载投票结果失败')
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    async refreshResults() {
      await this.loadVoteResults()
      this.$message.success('结果已刷新')
    },

    initCharts() {
      if (this.$refs.pieChart) {
        this.pieChart = echarts.init(this.$refs.pieChart)
      }
      if (this.$refs.barChart) {
        this.barChart = echarts.init(this.$refs.barChart)
      }
      if (this.$refs.timelineChart) {
        this.timelineChart = echarts.init(this.$refs.timelineChart)
      }
      this.updateCharts()
    },

    updateCharts() {
      if (!this.vote || !this.vote.results) return

      this.updatePieChart()
      this.updateBarChart()
      this.updateTimelineChart()
    },

    updatePieChart() {
      if (!this.pieChart) return

      const data = this.vote.results.options.map((option, index) => ({
        name: option.title,
        value: option.voteCount,
        itemStyle: {
          color: this.getChartColor(index)
        }
      }))

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
            name: '投票结果',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            label: {
              show: true,
              formatter: '{b}: {c}票\n({d}%)'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '14',
                fontWeight: 'bold'
              }
            },
            data: data
          }
        ]
      }

      this.pieChart.setOption(option)
    },

    updateBarChart() {
      if (!this.barChart) return

      const sortedOptions = [...this.vote.results.options].sort((a, b) => b.voteCount - a.voteCount)
      const xData = sortedOptions.map(option => option.title)
      const yData = sortedOptions.map(option => option.voteCount)

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
          data: xData,
          axisLabel: {
            interval: 0,
            rotate: 30
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '得票数',
            type: 'bar',
            data: yData.map((value, index) => ({
              value,
              itemStyle: {
                color: this.getChartColor(index)
              }
            })),
            label: {
              show: true,
              position: 'top'
            }
          }
        ]
      }

      this.barChart.setOption(option)
    },

    updateTimelineChart() {
      if (!this.timelineChart || !this.vote.results.timeline) return

      // 这里可以添加时间线图表的实现
      // 需要后端提供时间分布数据
    },

    destroyCharts() {
      if (this.pieChart) {
        this.pieChart.dispose()
        this.pieChart = null
      }
      if (this.barChart) {
        this.barChart.dispose()
        this.barChart = null
      }
      if (this.timelineChart) {
        this.timelineChart.dispose()
        this.timelineChart = null
      }
    },

    getWinningOption() {
      if (!this.vote || !this.vote.results) return { title: '', voteCount: 0, percentage: 0 }
      return this.sortedResults[0] || { title: '', voteCount: 0, percentage: 0 }
    },

    getLeadMargin() {
      const sorted = this.sortedResults
      if (sorted.length < 2) return 0
      return sorted[0].voteCount - sorted[1].voteCount
    },

    isDecisiveWin() {
      const winner = this.getWinningOption()
      return winner.percentage > 50
    },

    getTrustScore() {
      // 简化的信任度计算
      const baseScore = 80
      const participationBonus = Math.min(20, this.vote.participationRate * 0.3)
      return Math.round(baseScore + participationBonus)
    },

    getCompetitiveness() {
      // 计算竞争激烈度
      const sorted = this.sortedResults
      if (sorted.length < 2) return '低'

      const margin = (sorted[0].voteCount - sorted[1].voteCount) / this.vote.totalVoted * 100
      if (margin < 5) return '激烈'
      if (margin < 15) return '中等'
      return '明显'
    },

    getOptionDescription(optionId) {
      // 这里需要从投票详情中获取选项描述
      return ''
    },

    getStatusType(vote) {
      return 'info' // 结果页面都是已结束状态
    },

    getStatusText(vote) {
      return '已结束'
    },

    getVoteTypeText(voteType) {
      const types = {
        'single_choice': '单选投票',
        'multiple_choice': '多选投票',
        'ranking': '排序投票',
        'rating': '评分投票',
        'yes_no': '是否投票'
      }
      return types[voteType] || '未知类型'
    },

    getBarColor(index) {
      const colors = ['#67c23a', '#409eff', '#e6a23c', '#f56c6c', '#909399']
      return colors[index % colors.length]
    },

    getChartColor(index) {
      const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452']
      return colors[index % colors.length]
    },

    getParticipationColor(rate) {
      if (rate >= 80) return '#67c23a'
      if (rate >= 60) return '#e6a23c'
      return '#f56c6c'
    },

    async exportResults(format) {
      try {
        // 这里可以调用后端API导出数据
        this.$message.success(`正在导出${format.toUpperCase()}格式...`)
      } catch (error) {
        this.$message.error('导出失败')
      }
    },

    exportChart() {
      if (this.pieChart) {
        const url = this.pieChart.getDataURL({
          pixelRatio: 2,
          backgroundColor: '#fff'
        })
        const link = document.createElement('a')
        link.download = `投票结果_${this.vote.title}.png`
        link.href = url
        link.click()
      }
    },

    formatDate
  }
}
</script>

<style scoped>
.vote-results {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.vote-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding: 25px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.vote-header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 24px;
}

.vote-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #666;
  margin-bottom: 10px;
}

.vote-description {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.overall-stats {
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-icon {
  position: absolute;
  top: 15px;
  right: 15px;
  font-size: 24px;
  color: #409eff;
  opacity: 0.3;
}

.results-details {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.results-header h2 {
  margin: 0;
  color: #333;
}

.chart-container {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.chart-container h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  text-align: center;
}

.chart {
  width: 100%;
  height: 300px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.result-item {
  border: 2px solid #eee;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
}

.result-item.winner {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9ff, #fff);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.rank-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank {
  background: #409eff;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.winner-icon {
  color: #f39c12;
  font-size: 18px;
}

.option-title {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 18px;
}

.option-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.result-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 15px;
}

.vote-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.count {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.unit {
  color: #666;
  font-size: 14px;
}

.percentage {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.result-bar {
  position: relative;
  background: #f0f0f0;
  border-radius: 10px;
  height: 30px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.8s ease;
  border-radius: 10px;
}

.bar-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.vote-analysis {
  margin-bottom: 30px;
}

.vote-analysis h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.analysis-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.analysis-card h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  border-bottom: 2px solid #409eff;
  padding-bottom: 8px;
}

.analysis-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.analysis-item:last-child {
  border-bottom: none;
}

.analysis-item .label {
  color: #666;
  font-size: 14px;
}

.analysis-item .value {
  color: #333;
  font-weight: 500;
}

.analysis-item .value.decisive {
  color: #67c23a;
  font-weight: bold;
}

.participation-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.progress-content {
  text-align: center;
}

.progress-number {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.progress-label {
  font-size: 12px;
  color: #666;
}

.participation-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.quality-metrics {
  text-align: center;
}

.metric-item {
  margin-bottom: 20px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.metric-label {
  color: #666;
  font-size: 14px;
}

.quality-indicators {
  display: flex;
  justify-content: space-around;
  margin-top: 15px;
}

.indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #999;
}

.indicator i {
  font-size: 20px;
  transition: color 0.3s ease;
}

.indicator i.active {
  color: #67c23a;
}

.timeline-analysis {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.timeline-analysis h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.timeline-chart .chart {
  height: 250px;
}

.export-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.export-section h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.export-actions {
  display: flex;
  gap: 15px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .vote-results {
    padding: 10px;
  }

  .vote-header {
    flex-direction: column;
    gap: 15px;
  }

  .vote-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .results-header {
    flex-direction: column;
    gap: 15px;
  }

  .chart {
    height: 250px;
  }

  .result-header {
    flex-direction: column;
    gap: 10px;
  }

  .result-stats {
    justify-content: center;
  }

  .export-actions {
    flex-direction: column;
  }
}
</style>