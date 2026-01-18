<template>
  <div class="village-cadre-home">
    <!-- 顶部信息区 -->
    <header class="home-header">
      <div class="header-top">
        <div class="village-info">
          <el-icon><OfficeBuilding /></el-icon>
          <span>{{ villageName }}</span>
        </div>
        <div class="cadre-info">
          <span>{{ userName }} | {{ position }}</span>
        </div>
      </div>
      <!-- 数据概览 -->
      <div class="stats-overview">
        <div class="stat-item">
          <span class="stat-value">{{ stats.population }}</span>
          <span class="stat-label">全村人口</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.households }}</span>
          <span class="stat-label">户数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.pendingTasks }}</span>
          <span class="stat-label">待办事项</span>
        </div>
      </div>
    </header>

    <!-- 主要内容区 -->
    <main class="home-content">
      <!-- 待办事项 -->
      <section class="pending-tasks" v-if="pendingTasks.length > 0">
        <h3 class="section-title">待办事项</h3>
        <div class="task-list">
          <div
            v-for="task in pendingTasks"
            :key="task.id"
            class="task-card"
            @click="handleTask(task)"
          >
            <div class="task-icon" :class="task.priority">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="task-info">
              <h4>{{ task.title }}</h4>
              <p>{{ task.deadline }}</p>
            </div>
            <el-icon class="task-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </section>

      <!-- 快捷操作 -->
      <section class="quick-actions">
        <h3 class="section-title">快捷操作</h3>
        <div class="action-grid">
          <div
            v-for="action in quickActions"
            :key="action.id"
            class="action-card"
            @click="handleAction(action)"
          >
            <el-icon :size="28" :color="action.color">
              <component :is="action.icon" />
            </el-icon>
            <span>{{ action.label }}</span>
          </div>
        </div>
      </section>

      <!-- 最新通知 -->
      <section class="notifications">
        <h3 class="section-title">最新通知</h3>
        <div class="notification-list">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            @click="handleNotification(notification)"
          >
            <div class="notification-tag" :class="notification.type">
              {{ notification.typeText }}
            </div>
            <div class="notification-content">
              <h4>{{ notification.title }}</h4>
              <p>{{ notification.time }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  OfficeBuilding,
  Warning,
  ArrowRight,
  User,
  Document,
  Money,
  ChatDotSquare,
  Notification,
} from '@element-plus/icons-vue';

const router = useRouter();

const villageName = ref('智慧乡村示范村');
const userName = ref('张书记');
const position = ref('村支书');

const stats = ref({
  population: 1234,
  households: 356,
  pendingTasks: 5,
});

const pendingTasks = ref([
  { id: 1, title: '审批村民建房申请', deadline: '今天 18:00', priority: 'high' },
  { id: 2, title: '审核本季度财务报表', deadline: '明天 12:00', priority: 'medium' },
  { id: 3, title: '回复村民意见反馈', deadline: '本周内', priority: 'low' },
]);

const quickActions = ref([
  { id: 'announcements', label: '发布公告', icon: Notification, color: '#409EFF' },
  { id: 'residents', label: '村民管理', icon: User, color: '#67C23A' },
  { id: 'finance', label: '财务管理', icon: Money, color: '#E6A23C' },
  { id: 'documents', label: '公文处理', icon: Document, color: '#F56C6C' },
]);

const notifications = ref([
  {
    id: 1,
    title: '关于开展全村环境整治的通知',
    time: '2小时前',
    type: 'urgent',
    typeText: '紧急',
  },
  {
    id: 2,
    title: '本周五村委会会议安排',
    time: '昨天',
    type: 'normal',
    typeText: '普通',
  },
]);

const handleTask = (task) => {
  router.push(`/mobile/village-cadre/affairs?task=${task.id}`);
};

const handleAction = (action) => {
  router.push(`/mobile/village-cadre/${action.id}`);
};

const handleNotification = (notification) => {
  router.push(`/mobile/village-cadre/messages?id=${notification.id}`);
};
</script>

<style scoped lang="scss">
.village-cadre-home {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

.home-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  padding-top: max(20px, env(safe-area-inset-top));

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .village-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
    }

    .cadre-info {
      font-size: 14px;
      opacity: 0.9;
    }
  }

  .stats-overview {
    display: flex;
    justify-content: space-around;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-value {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 12px;
        opacity: 0.8;
      }
    }
  }
}

.home-content {
  padding: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px;
}

.pending-tasks {
  margin-bottom: 24px;

  .task-list {
    background: white;
    border-radius: 12px;
    overflow: hidden;
  }

  .task-card {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #f5f7fa;
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &:active {
      background: #f5f7fa;
    }

    .task-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;

      &.high {
        background: #fef0f0;
        color: #f56c6c;
      }

      &.medium {
        background: #fdf6ec;
        color: #e6a23c;
      }

      &.low {
        background: #f0f9ff;
        color: #409eff;
      }
    }

    .task-info {
      flex: 1;

      h4 {
        margin: 0 0 4px;
        font-size: 15px;
        color: #303133;
      }

      p {
        margin: 0;
        font-size: 12px;
        color: #909399;
      }
    }

    .task-arrow {
      color: #c0c4cc;
    }
  }
}

.quick-actions {
  margin-bottom: 24px;

  .action-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .action-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    background: white;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.95);
    }

    span {
      margin-top: 8px;
      font-size: 12px;
      color: #606266;
    }
  }
}

.notifications {
  .notification-list {
    background: white;
    border-radius: 12px;
    overflow: hidden;
  }

  .notification-item {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #f5f7fa;
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &:active {
      background: #f5f7fa;
    }

    .notification-tag {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 12px;

      &.urgent {
        background: #fef0f0;
        color: #f56c6c;
      }

      &.normal {
        background: #f0f9ff;
        color: #409eff;
      }
    }

    .notification-content {
      flex: 1;

      h4 {
        margin: 0 0 4px;
        font-size: 15px;
        color: #303133;
      }

      p {
        margin: 0;
        font-size: 12px;
        color: #909399;
      }
    }
  }
}
</style>
