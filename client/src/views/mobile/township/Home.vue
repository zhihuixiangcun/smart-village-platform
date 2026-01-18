<template>
  <div class="township-home">
    <!-- 顶部信息区 -->
    <header class="home-header">
      <div class="header-top">
        <div class="township-info">
          <div class="icon-wrapper">
            <el-icon><OfficeBuilding /></el-icon>
          </div>
          <div class="text-content">
            <span class="township-name">{{ townshipName }}</span>
            <span class="official-name">{{ userName }} · {{ position }}</span>
          </div>
        </div>
        <div class="header-actions">
          <el-icon class="notification-icon"><Bell /></el-icon>
        </div>
      </div>

      <!-- 数据概览 -->
      <div class="stats-overview">
        <div class="stat-item" v-for="(stat, index) in statItems" :key="index">
          <div class="stat-icon" :class="stat.type">
            <el-icon><component :is="stat.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区 -->
    <main class="home-content">
      <!-- 管理入口 -->
      <section class="management-entry">
        <div class="section-header">
          <h3 class="section-title">管理入口</h3>
          <el-icon class="more-icon"><ArrowRight /></el-icon>
        </div>
        <div class="entry-grid">
          <div class="entry-card" @click="goToVillages">
            <div class="card-bg-gradient blue"></div>
            <div class="card-icon">
              <el-icon :size="28"><OfficeBuilding /></el-icon>
            </div>
            <h4>村庄管理</h4>
            <p>{{ stats.villages }}个村庄</p>
          </div>
          <div class="entry-card" @click="goToStatistics">
            <div class="card-bg-gradient green"></div>
            <div class="card-icon">
              <el-icon :size="28"><DataAnalysis /></el-icon>
            </div>
            <h4>统计分析</h4>
            <p>数据报表</p>
          </div>
          <div class="entry-card" @click="goToAudit">
            <div class="card-bg-gradient orange"></div>
            <div class="card-icon">
              <el-icon :size="28"><DocumentChecked /></el-icon>
            </div>
            <h4>审核管理</h4>
            <p>{{ stats.tasks }}待审核</p>
          </div>
          <div class="entry-card" @click="goToSettings">
            <div class="card-bg-gradient purple"></div>
            <div class="card-icon">
              <el-icon :size="28"><Setting /></el-icon>
            </div>
            <h4>系统设置</h4>
            <p>配置管理</p>
          </div>
        </div>
      </section>

      <!-- 待办任务 -->
      <section class="pending-tasks" v-if="pendingTasks.length > 0">
        <div class="section-header">
          <h3 class="section-title">待办任务</h3>
          <span class="task-count">{{ pendingTasks.length }}</span>
        </div>
        <div class="task-list">
          <div
            v-for="task in pendingTasks"
            :key="task.id"
            class="task-card"
            :class="task.priority"
            @click="handleTask(task)"
          >
            <div class="task-priority-indicator">
              <div class="pulse-dot"></div>
            </div>
            <div class="task-info">
              <h4>{{ task.title }}</h4>
              <div class="task-meta">
                <span class="meta-item">
                  <el-icon><Location /></el-icon>
                  {{ task.village }}
                </span>
                <span class="meta-item">
                  <el-icon><Clock /></el-icon>
                  {{ task.deadline }}
                </span>
              </div>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>
      </section>

      <!-- 重要通知 -->
      <section class="important-notices">
        <div class="section-header">
          <h3 class="section-title">重要通知</h3>
          <el-icon class="more-icon"><ArrowRight /></el-icon>
        </div>
        <div class="notice-list">
          <div
            v-for="notice in importantNotices"
            :key="notice.id"
            class="notice-card"
            @click="viewNotice(notice)"
          >
            <div class="notice-icon-wrapper">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="notice-content">
              <div class="notice-header">
                <span class="notice-badge" :class="notice.type">{{ notice.type }}</span>
                <span class="notice-time">{{ notice.time }}</span>
              </div>
              <h4>{{ notice.title }}</h4>
            </div>
          </div>
        </div>
      </section>

      <!-- 快捷操作 -->
      <section class="quick-actions">
        <h3 class="section-title">快捷操作</h3>
        <div class="action-grid">
          <div class="action-item" @click="handleAction('announcement')">
            <div class="action-icon-wrapper announcement">
              <el-icon><Notification /></el-icon>
            </div>
            <span>发布通知</span>
          </div>
          <div class="action-item" @click="handleAction('report')">
            <div class="action-icon-wrapper report">
              <el-icon><Document /></el-icon>
            </div>
            <span>生成报表</span>
          </div>
          <div class="action-item" @click="handleAction('meeting')">
            <div class="action-icon-wrapper meeting">
              <el-icon><ChatDotSquare /></el-icon>
            </div>
            <span>会议安排</span>
          </div>
          <div class="action-item" @click="handleAction('emergency')">
            <div class="action-icon-wrapper emergency">
              <el-icon><Warning /></el-icon>
            </div>
            <span>应急响应</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  OfficeBuilding,
  DataAnalysis,
  ArrowRight,
  Notification,
  Document,
  ChatDotSquare,
  Warning,
  Bell,
  DocumentChecked,
  Setting,
  Location,
  Clock,
  Village,
  DataLine,
  TrendCharts
} from '@element-plus/icons-vue';

const router = useRouter();

const townshipName = ref('某某乡镇');
const userName = ref('李主任');
const position = ref('乡镇干部');

const stats = ref({
  villages: 12,
  population: 15678,
  tasks: 8,
});

const statItems = ref([
  { label: '管辖村庄', value: 12, type: 'blue', icon: Village },
  { label: '总人口', value: '15,678', type: 'green', icon: DataLine },
  { label: '待办任务', value: 8, type: 'orange', icon: TrendCharts }
]);

const pendingTasks = ref([
  {
    id: 1,
    title: '审核XX村财务报表',
    village: 'XX村',
    deadline: '今天 18:00',
    priority: 'high',
  },
  {
    id: 2,
    title: '检查各村环境整治进度',
    village: '全镇',
    deadline: '本周五',
    priority: 'medium',
  },
  {
    id: 3,
    title: '汇总各村人口数据',
    village: '统计科',
    deadline: '月底',
    priority: 'low',
  },
]);

const importantNotices = ref([
  {
    id: 1,
    title: '关于开展全镇安全生产检查的通知',
    time: '今天 09:00',
    type: '紧急',
  },
  {
    id: 2,
    title: '第三季度工作总结会议安排',
    time: '昨天',
    type: '重要',
  },
]);

const goToVillages = () => {
  router.push('/mobile/township/villages');
};

const goToStatistics = () => {
  router.push('/mobile/township/statistics');
};

const goToAudit = () => {
  router.push('/mobile/township/audit');
};

const goToSettings = () => {
  router.push('/mobile/township/settings');
};

const handleTask = (task) => {
  router.push(`/mobile/township/tasks/${task.id}`);
};

const viewNotice = (notice) => {
  router.push(`/mobile/township/notices/${notice.id}`);
};

const handleAction = (action) => {
  router.push(`/mobile/township/${action}`);
};
</script>

<style scoped lang="scss">
.township-home {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding-bottom: 100px;
}

// 顶部信息区
.home-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  padding-top: max(20px, env(safe-area-inset-top));
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -10%;
    width: 150px;
    height: 150px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;

    .township-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .icon-wrapper {
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);

        .el-icon {
          font-size: 24px;
        }
      }

      .text-content {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .township-name {
          font-size: 18px;
          font-weight: 700;
        }

        .official-name {
          font-size: 13px;
          opacity: 0.9;
        }
      }
    }

    .header-actions {
      .notification-icon {
        font-size: 22px;
        opacity: 0.9;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          transform: scale(1.1);
          opacity: 1;
        }
      }
    }
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    position: relative;
    z-index: 1;

    .stat-item {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;

      &:active {
        transform: scale(0.95);
      }

      .stat-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;

        .el-icon {
          font-size: 20px;
        }

        &.blue {
          background: rgba(59, 130, 246, 0.3);
        }

        &.green {
          background: rgba(16, 185, 129, 0.3);
        }

        &.orange {
          background: rgba(245, 158, 11, 0.3);
        }
      }

      .stat-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;

        .stat-value {
          font-size: 20px;
          font-weight: 700;
        }

        .stat-label {
          font-size: 11px;
          opacity: 0.9;
        }
      }
    }
  }
}

.home-content {
  padding: 20px 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .section-title {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .more-icon {
    font-size: 18px;
    color: #94a3b8;
    cursor: pointer;
  }

  .task-count {
    background: #3b82f6;
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 10px;
  }
}

// 管理入口
.management-entry {
  margin-bottom: 28px;

  .entry-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .entry-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;

    &:active {
      transform: translateY(2px) scale(0.98);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .card-bg-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      opacity: 0.08;

      &.blue {
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      }

      &.green {
        background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
      }

      &.orange {
        background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
      }

      &.purple {
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      }
    }

    .card-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      position: relative;
      z-index: 1;

      .el-icon {
        color: #4f46e5;
      }
    }

    h4 {
      margin: 0 0 4px;
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      position: relative;
      z-index: 1;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: #64748b;
      position: relative;
      z-index: 1;
    }
  }
}

// 待办任务
.pending-tasks {
  margin-bottom: 28px;

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .task-card {
    display: flex;
    align-items: center;
    padding: 16px;
    background: white;
    border-radius: 16px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:active {
      transform: translateY(1px);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }

    &.high::before {
      background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
    }

    &.medium::before {
      background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
    }

    &.low::before {
      background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
    }

    .task-priority-indicator {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
      background: #f1f5f9;

      .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
    }

    &.high .pulse-dot {
      background: #ef4444;
    }

    &.medium .pulse-dot {
      background: #f59e0b;
    }

    &.low .pulse-dot {
      background: #3b82f6;
    }

    .task-info {
      flex: 1;
      min-width: 0;

      h4 {
        margin: 0 0 8px;
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .task-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #64748b;

          .el-icon {
            font-size: 14px;
          }
        }
      }
    }

    .arrow-icon {
      font-size: 18px;
      color: #cbd5e1;
      margin-left: 8px;
      flex-shrink: 0;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

// 重要通知
.important-notices {
  margin-bottom: 28px;

  .notice-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .notice-card {
    display: flex;
    align-items: flex-start;
    padding: 16px;
    background: white;
    border-radius: 16px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;

    &:active {
      transform: translateY(1px);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .notice-icon-wrapper {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;

      .el-icon {
        font-size: 20px;
        color: #f59e0b;
      }
    }

    .notice-content {
      flex: 1;
      min-width: 0;

      .notice-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .notice-badge {
          padding: 3px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;

          &.紧急 {
            background: #fef2f2;
            color: #ef4444;
          }

          &.重要 {
            background: #fff7ed;
            color: #f59e0b;
          }
        }

        .notice-time {
          font-size: 12px;
          color: #94a3b8;
        }
      }

      h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }
  }
}

// 快捷操作
.quick-actions {
  .action-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    background: white;
    border-radius: 16px;
    cursor: pointer;
    gap: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;

    &:active {
      transform: translateY(2px) scale(0.95);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .action-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;

      .el-icon {
        font-size: 22px;
        color: white;
      }

      &.announcement {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      }

      &.report {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      &.meeting {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      }

      &.emergency {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
    }

    span {
      font-size: 12px;
      font-weight: 500;
      color: #475569;
    }
  }
}
</style>
