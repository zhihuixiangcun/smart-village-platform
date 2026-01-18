<template>
  <div class="statistics-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h2 class="page-title">统计分析</h2>
        <span class="page-subtitle">实时数据概览</span>
      </div>

      <!-- 时间选择器 -->
      <div class="time-selector">
        <div
          v-for="period in timePeriods"
          :key="period.value"
          class="time-tab"
          :class="{ active: activePeriod === period.value }"
          @click="activePeriod = period.value"
        >
          {{ period.label }}
        </div>
      </div>
    </header>

    <main class="statistics-content">
      <!-- 数据概览 -->
      <section class="stats-section">
        <div class="section-header">
          <h3 class="section-title">数据概览</h3>
          <el-icon class="refresh-icon"><Refresh /></el-icon>
        </div>
        <div class="stats-grid">
          <div class="stat-card" v-for="stat in stats" :key="stat.id">
            <div class="stat-icon-wrapper" :class="stat.type">
              <el-icon><component :is="stat.icon" /></el-icon>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
            <div class="stat-change" :class="stat.trend">
              <el-icon v-if="stat.trend === 'up'"><Top /></el-icon>
              <el-icon v-else-if="stat.trend === 'down'"><Bottom /></el-icon>
              <span>{{ stat.change }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 人口趋势图表 -->
      <section class="chart-section">
        <div class="section-header">
          <h3 class="section-title">人口趋势</h3>
          <el-icon class="expand-icon"><FullScreen /></el-icon>
        </div>
        <div class="chart-container">
          <div class="chart-placeholder">
            <div class="placeholder-content">
              <div class="placeholder-icon">
                <el-icon :size="48"><DataAnalysis /></el-icon>
              </div>
              <p class="placeholder-text">图表数据加载中...</p>
              <p class="placeholder-subtext">即将展示详细的人口趋势分析</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 村庄排名 -->
      <section class="rank-section">
        <div class="section-header">
          <h3 class="section-title">村庄排名</h3>
          <span class="rank-subtitle">综合评分</span>
        </div>
        <div class="rank-list">
          <div
            class="rank-item"
            v-for="(item, index) in rankData"
            :key="item.id"
            :class="{ top: index < 3 }"
          >
            <div class="rank-number" :class="getRankClass(index)">
              {{ index + 1 }}
            </div>
            <div class="rank-info">
              <h4 class="rank-name">{{ item.name }}</h4>
              <p class="rank-desc">{{ item.description }}</p>
            </div>
            <div class="rank-score-wrapper">
              <div class="rank-score">{{ item.score }}</div>
              <div class="score-label">分</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  DataAnalysis,
  Refresh,
  FullScreen,
  Top,
  Bottom,
  User,
  Village,
  TrendCharts,
  Location
} from '@element-plus/icons-vue';

const activePeriod = ref('month');

const timePeriods = [
  { label: '本月', value: 'month' },
  { label: '本季', value: 'quarter' },
  { label: '本年', value: 'year' },
];

const stats = ref([
  {
    id: 1,
    label: '总人口',
    value: '15,678',
    change: '+2.3%',
    trend: 'up',
    type: 'blue',
    icon: User,
  },
  {
    id: 2,
    label: '村庄数',
    value: '12',
    change: '持平',
    trend: 'neutral',
    type: 'green',
    icon: Village,
  },
  {
    id: 3,
    label: '本月出生',
    value: '23',
    change: '+15%',
    trend: 'up',
    type: 'purple',
    icon: TrendCharts,
  },
  {
    id: 4,
    label: '本月死亡',
    value: '8',
    change: '-5%',
    trend: 'down',
    type: 'orange',
    icon: Location,
  },
]);

const rankData = ref([
  { id: 1, name: '智慧乡村示范村', score: 98, description: '综合表现优秀' },
  { id: 2, name: '绿色生态村', score: 95, description: '生态环境突出' },
  { id: 3, name: '文化古村', score: 92, description: '文化传承良好' },
  { id: 4, name: '现代农业村', score: 88, description: '产业发展稳定' },
  { id: 5, name: '和谐新村', score: 85, description: '社会治理创新' },
]);

const getRankClass = (index) => {
  if (index === 0) return 'first';
  if (index === 1) return 'second';
  if (index === 2) return 'third';
  return 'normal';
};
</script>

<style scoped lang="scss">
.statistics-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding-bottom: 100px;
}

// 页面头部
.page-header {
  background: white;
  padding: 16px 20px 20px;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 10;

  .header-content {
    margin-bottom: 16px;

    .page-title {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
    }

    .page-subtitle {
      font-size: 13px;
      color: #64748b;
    }
  }

  .time-selector {
    display: flex;
    gap: 8px;
    background: #f8fafc;
    padding: 4px;
    border-radius: 12px;

    .time-tab {
      flex: 1;
      text-align: center;
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      transition: all 0.3s ease;

      &.active {
        background: white;
        color: #3b82f6;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
      }
    }
  }
}

.statistics-content {
  padding: 20px 16px;
}

.stats-section,
.chart-section,
.rank-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .section-title {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .refresh-icon,
  .expand-icon {
    font-size: 18px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.3s ease;

    &:active {
      transform: rotate(180deg);
    }
  }

  .rank-subtitle {
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }
}

// 数据概览卡片
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;

  &:active {
    transform: translateY(2px);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    opacity: 0.06;
    border-radius: 16px 16px 0 0;
  }

  &:nth-child(1)::before {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }

  &:nth-child(2)::before {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }

  &:nth-child(3)::before {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  }

  &:nth-child(4)::before {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }

  .stat-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    position: relative;
    z-index: 1;

    .el-icon {
      font-size: 22px;
    }

    &.blue {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #2563eb;
    }

    &.green {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      color: #059669;
    }

    &.purple {
      background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
      color: #7c3aed;
    }

    &.orange {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #d97706;
    }
  }

  .stat-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    z-index: 1;

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
  }

  .stat-change {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 600;
    margin-top: 8px;
    position: relative;
    z-index: 1;

    .el-icon {
      font-size: 14px;
    }

    &.up {
      color: #10b981;
    }

    &.down {
      color: #ef4444;
    }

    &:not(.up):not(.down) {
      color: #94a3b8;
    }
  }
}

// 图表区域
.chart-section {
  .chart-container {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  }

  .chart-placeholder {
    min-height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);

    .placeholder-content {
      text-align: center;

      .placeholder-icon {
        margin-bottom: 16px;
        color: #cbd5e1;
      }

      .placeholder-text {
        margin: 0 0 8px;
        font-size: 15px;
        color: #94a3b8;
        font-weight: 500;
      }

      .placeholder-subtext {
        margin: 0;
        font-size: 13px;
        color: #cbd5e1;
      }
    }
  }
}

// 村庄排名
.rank-section {
  .rank-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .rank-item {
    display: flex;
    align-items: center;
    padding: 16px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:active {
      transform: translateY(1px);
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
    }

    &.top::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }

    &.top:nth-child(1)::before {
      background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
    }

    &.top:nth-child(2)::before {
      background: linear-gradient(180deg, #9ca3af 0%, #6b7280 100%);
    }

    &.top:nth-child(3)::before {
      background: linear-gradient(180deg, #d97706 0%, #b45309 100%);
    }

    .rank-number {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      margin-right: 12px;
      flex-shrink: 0;
      background: #f8fafc;
      color: #64748b;

      &.first {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        color: #d97706;
      }

      &.second {
        background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
        color: #4b5563;
      }

      &.third {
        background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
        color: #c2410c;
      }
    }

    .rank-info {
      flex: 1;
      min-width: 0;

      .rank-name {
        margin: 0 0 4px;
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .rank-desc {
        margin: 0;
        font-size: 12px;
        color: #64748b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .rank-score-wrapper {
      display: flex;
      align-items: baseline;
      gap: 2px;
      flex-shrink: 0;
      margin-left: 12px;

      .rank-score {
        font-size: 24px;
        font-weight: 700;
        color: #3b82f6;
        line-height: 1;
      }

      .score-label {
        font-size: 12px;
        color: #94a3b8;
        font-weight: 500;
      }
    }
  }
}
</style>
