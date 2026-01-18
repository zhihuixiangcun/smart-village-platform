<template>
  <div class="admin-home">
    <!-- 顶部信息区 -->
    <header class="home-header">
      <div class="header-top">
        <div class="system-info">
          <el-icon><Setting /></el-icon>
          <span>系统管理</span>
        </div>
        <div class="admin-info">
          <el-avatar :size="32">{{ userName.charAt(0) }}</el-avatar>
          <span>{{ userName }}</span>
        </div>
      </div>
      <!-- 系统状态 -->
      <div class="system-status">
        <div class="status-item" :class="{ active: systemStatus.database }">
          <el-icon><Connection /></el-icon>
          <span>数据库</span>
        </div>
        <div class="status-item" :class="{ active: systemStatus.server }">
          <el-icon><Server /></el-icon>
          <span>服务器</span>
        </div>
        <div class="status-item" :class="{ active: systemStatus.backup }">
          <el-icon><FolderChecked /></el-icon>
          <span>备份</span>
        </div>
      </div>
    </header>

    <!-- 主要内容区 -->
    <main class="home-content">
      <!-- 系统概览 -->
      <section class="system-overview">
        <h3 class="section-title">系统概览</h3>
        <div class="overview-grid">
          <div class="overview-card">
            <span class="overview-value">{{ overview.users }}</span>
            <span class="overview-label">总用户数</span>
          </div>
          <div class="overview-card">
            <span class="overview-value">{{ overview.villages }}</span>
            <span class="overview-label">村庄数</span>
          </div>
          <div class="overview-card">
            <span class="overview-value">{{ overview.todayVisits }}</span>
            <span class="overview-label">今日访问</span>
          </div>
          <div class="overview-card">
            <span class="overview-value">{{ overview.storage }}</span>
            <span class="overview-label">存储空间</span>
          </div>
        </div>
      </section>

      <!-- 管理功能 -->
      <section class="admin-functions">
        <h3 class="section-title">管理功能</h3>
        <div class="function-grid">
          <div class="function-card" @click="goToFunction('users')">
            <el-icon :size="32" color="#409EFF"><User /></el-icon>
            <h4>用户管理</h4>
            <p>账号、角色、权限</p>
          </div>
          <div class="function-card" @click="goToFunction('villages')">
            <el-icon :size="32" color="#67C23A"><OfficeBuilding /></el-icon>
            <h4>村庄管理</h4>
            <p>村庄信息、配置</p>
          </div>
          <div class="function-card" @click="goToFunction('announcements')">
            <el-icon :size="32" color="#E6A23C"><Notification /></el-icon>
            <h4>公告管理</h4>
            <p>发布、编辑公告</p>
          </div>
          <div class="function-card" @click="goToFunction('audit')">
            <el-icon :size="32" color="#F56C6C"><Document /></el-icon>
            <h4>审核管理</h4>
            <p>内容审核、申诉</p>
          </div>
        </div>
      </section>

      <!-- 系统消息 -->
      <section class="system-messages">
        <div class="section-header">
          <h3 class="section-title">系统消息</h3>
          <a @click="viewAllMessages">查看全部 →</a>
        </div>
        <div class="message-list">
          <div
            v-for="message in systemMessages"
            :key="message.id"
            class="message-card"
            @click="viewMessage(message)"
          >
            <div class="message-icon" :class="message.type">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="message-content">
              <h4>{{ message.title }}</h4>
              <p>{{ message.time }}</p>
            </div>
            <div class="message-status" :class="{ unread: !message.read }"></div>
          </div>
        </div>
      </section>

      <!-- 快捷操作 -->
      <section class="quick-actions">
        <h3 class="section-title">快捷操作</h3>
        <div class="action-list">
          <div class="action-item" @click="handleAction('backup')">
            <el-icon><FolderOpened /></el-icon>
            <span>数据备份</span>
          </div>
          <div class="action-item" @click="handleAction('logs')">
            <el-icon><Tickets /></el-icon>
            <span>操作日志</span>
          </div>
          <div class="action-item" @click="handleAction('settings')">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </div>
          <div class="action-item" @click="handleAction('monitor')">
            <el-icon><DataAnalysis /></el-icon>
            <span>性能监控</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Setting,
  Connection,
  Server,
  FolderChecked,
  User,
  OfficeBuilding,
  Notification,
  Document,
  Warning,
  FolderOpened,
  Tickets,
  DataAnalysis,
} from '@element-plus/icons-vue';

const router = useRouter();

const userName = ref('管理员');

const systemStatus = ref({
  database: true,
  server: true,
  backup: true,
});

const overview = ref({
  users: 1256,
  villages: 12,
  todayVisits: 345,
  storage: '45%',
});

const systemMessages = ref([
  {
    id: 1,
    title: '系统备份完成',
    time: '2小时前',
    type: 'success',
    read: true,
  },
  {
    id: 2,
    title: '有3个用户待审核',
    time: '5小时前',
    type: 'warning',
    read: false,
  },
  {
    id: 3,
    title: '服务器负载警告',
    time: '昨天',
    type: 'error',
    read: true,
  },
]);

let statusCheckInterval = null;

const checkSystemStatus = () => {
  // 模拟系统状态检查
  // 实际项目中应该调用API获取真实状态
};

const goToFunction = (func) => {
  router.push(`/mobile/admin/${func}`);
};

const viewAllMessages = () => {
  router.push('/mobile/admin/messages');
};

const viewMessage = (message) => {
  router.push(`/mobile/admin/messages/${message.id}`);
};

const handleAction = (action) => {
  router.push(`/mobile/admin/${action}`);
};

onMounted(() => {
  checkSystemStatus();
  statusCheckInterval = setInterval(checkSystemStatus, 60000); // 每分钟检查一次
});

onUnmounted(() => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }
});
</script>

<style scoped lang="scss">
.admin-home {
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
    margin-bottom: 16px;

    .system-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
    }

    .admin-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
  }

  .system-status {
    display: flex;
    justify-content: space-around;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px;

    .status-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      opacity: 0.6;

      &.active {
        opacity: 1;
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .section-title {
    margin: 0;
  }

  a {
    font-size: 14px;
    color: #409eff;
    cursor: pointer;
  }
}

.system-overview {
  margin-bottom: 24px;

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .overview-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;

    .overview-value {
      font-size: 24px;
      font-weight: 600;
      color: #409eff;
      margin-bottom: 4px;
    }

    .overview-label {
      font-size: 12px;
      color: #909399;
    }
  }
}

.admin-functions {
  margin-bottom: 24px;

  .function-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .function-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.98);
    }

    h4 {
      margin: 12px 0 4px;
      font-size: 16px;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: #909399;
    }
  }
}

.system-messages {
  margin-bottom: 24px;

  .message-list {
    background: white;
    border-radius: 12px;
    overflow: hidden;
  }

  .message-card {
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

    .message-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;

      &.success {
        background: #f0f9ff;
        color: #67c23a;
      }

      &.warning {
        background: #fdf6ec;
        color: #e6a23c;
      }

      &.error {
        background: #fef0f0;
        color: #f56c6c;
      }
    }

    .message-content {
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

    .message-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #c0c4cc;

      &.unread {
        background: #f56c6c;
      }
    }
  }
}

.quick-actions {
  .action-list {
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
    border-radius: 12px;
    cursor: pointer;
    gap: 8px;

    span {
      font-size: 12px;
      color: #606266;
    }
  }
}
</style>
