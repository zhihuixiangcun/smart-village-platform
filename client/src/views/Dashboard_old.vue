<template>
  <div class="dashboard">
    <!-- 顶部状态卡片 -->
    <div class="stats-cards mb-6">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon size="30" color="#409EFF"><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.residents || 0 }}</div>
                <div class="stat-label">村民总数</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon size="30" color="#67C23A"><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.announcements || 0 }}</div>
                <div class="stat-label">公告通知</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon size="30" color="#E6A23C"><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.finances || 0 }}</div>
                <div class="stat-label">财务记录</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon size="30" color="#F56C6C"><Bell /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.notifications || 0 }}</div>
                <div class="stat-label">待处理事项</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 功能模块 -->
    <div class="feature-modules">
      <el-row :gutter="20">
        <el-col :xs="24" :md="12" :lg="8" v-for="module in modules" :key="module.id">
          <el-card
            class="module-card"
            @click="navigateToModule(module.path)"
            :class="{ 'module-disabled': !module.enabled }"
          >
            <div class="module-content">
              <div class="module-header">
                <el-icon :size="40" :color="module.color">
                  <component :is="module.icon" />
                </el-icon>
                <div class="module-status" v-if="!module.enabled">
                  <el-tag type="info" size="small">开发中</el-tag>
                </div>
              </div>

              <h3 class="module-title">{{ module.title }}</h3>
              <p class="module-description">{{ module.description }}</p>

              <div class="module-footer">
                <el-button
                  type="primary"
                  :disabled="!module.enabled"
                  @click.stop="navigateToModule(module.path)"
                >
                  {{ module.enabled ? '进入模块' : '敬请期待' }}
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions mt-6">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>快速操作</span>
            <el-button class="button" text @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
          </div>
        </template>

        <div class="actions-grid">
          <el-button type="primary" @click="openQuickAction('add-resident')">
            <el-icon><Plus /></el-icon>
            添加村民
          </el-button>

          <el-button type="success" @click="openQuickAction('new-announcement')">
            <el-icon><Promotion /></el-icon>
            发布公告
          </el-button>

          <el-button type="warning" @click="openQuickAction('emergency')">
            <el-icon><Warning /></el-icon>
            紧急广播
          </el-button>

          <el-button type="info" @click="openQuickAction('reports')">
            <el-icon><DataLine /></el-icon>
            查看报表
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 实时通知测试 -->
    <div class="realtime-test mt-6" v-if="showDebugInfo">
      <el-card>
        <template #header>
          <span>实时通信测试</span>
        </template>

        <div class="test-actions">
          <el-button @click="testEmergencyBroadcast">测试紧急广播</el-button>
          <el-button @click="testSystemNotification">测试系统通知</el-button>
          <el-button @click="testVillageUpdate">测试村务更新</el-button>
        </div>

        <div class="connection-status mt-4">
          <el-tag :type="socketConnected ? 'success' : 'danger'">
            Socket.IO: {{ socketConnected ? '已连接' : '未连接' }}
          </el-tag>
          <span class="ml-4">Socket ID: {{ socketId || '无' }}</span>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import socketService from '@/services/socket';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  User,
  Document,
  Money,
  Bell,
  Plus,
  Promotion,
  Warning,
  DataLine,
  Refresh,
  House,
  Setting,
  ChatDotRound,
  TrendCharts,
  Monitor,
} from '@element-plus/icons-vue';

const router = useRouter();

// 响应式数据
const stats = ref({
  residents: 0,
  announcements: 0,
  finances: 0,
  notifications: 0,
});

const showDebugInfo = ref(import.meta.env.VITE_SHOW_DEBUG === 'true');

// 功能模块配置
const modules = ref([
  {
    id: 1,
    title: '村民管理',
    description: '村民档案、户籍管理、家庭关系维护',
    icon: 'User',
    color: '#409EFF',
    path: '/residents',
    enabled: true,
  },
  {
    id: 2,
    title: '村务治理',
    description: '村委管理、财务管理、项目管理',
    icon: 'House',
    color: '#67C23A',
    path: '/affairs',
    enabled: true,
  },
  {
    id: 3,
    title: '信息公示',
    description: '公告发布、政策宣传、通知管理',
    icon: 'Document',
    color: '#E6A23C',
    path: '/announcements',
    enabled: true,
  },
  {
    id: 4,
    title: '投票建议',
    description: '村民投票、意见建议、民主决策',
    icon: 'ChatDotRound',
    color: '#F56C6C',
    path: '/voting',
    enabled: true,
  },
  {
    id: 5,
    title: '农业服务',
    description: '农技知识、病虫害防治、农产品销售',
    icon: 'TrendCharts',
    color: '#909399',
    path: '/agricultural',
    enabled: false,
  },
  {
    id: 6,
    title: '系统监控',
    description: '性能监控、系统状态、运维管理',
    icon: 'Monitor',
    color: '#606266',
    path: '/monitoring',
    enabled: true,
  },
]);

// Socket连接状态
const socketConnected = computed(() => {
  const status = socketService.getConnectionStatus();
  return status.connected;
});

const socketId = computed(() => {
  const status = socketService.getConnectionStatus();
  return status.socketId;
});

// 导航到模块
const navigateToModule = path => {
  if (path) {
    router.push(path);
  }
};

// 快速操作
const openQuickAction = action => {
  switch (action) {
    case 'add-resident':
      ElMessage.info('即将跳转到添加村民页面');
      router.push('/residents/add');
      break;
    case 'new-announcement':
      ElMessage.info('即将跳转到发布公告页面');
      router.push('/announcements/new');
      break;
    case 'emergency':
      handleEmergencyBroadcast();
      break;
    case 'reports':
      ElMessage.info('即将跳转到报表页面');
      router.push('/reports');
      break;
  }
};

// 紧急广播处理
const handleEmergencyBroadcast = async () => {
  try {
    const { value: message } = await ElMessageBox.prompt('请输入紧急广播内容：', '紧急广播', {
      confirmButtonText: '发送广播',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '广播内容不能为空',
    });

    const success = socketService.sendEmergencyBroadcast(message);
    if (success) {
      ElMessage.success('紧急广播发送成功');
    } else {
      ElMessage.error('发送失败，请检查网络连接');
    }
  } catch {
    // 用户取消操作
  }
};

// 刷新数据
const refreshData = async () => {
  try {
    // 模拟API调用获取统计数据
    await new Promise(resolve => setTimeout(resolve, 500));

    stats.value = {
      residents: Math.floor(Math.random() * 500) + 100,
      announcements: Math.floor(Math.random() * 20) + 5,
      finances: Math.floor(Math.random() * 100) + 20,
      notifications: Math.floor(Math.random() * 10) + 1,
    };

    ElMessage.success('数据已刷新');
  } catch (error) {
    ElMessage.error('刷新数据失败');
  }
};

// 测试实时通信功能
const testEmergencyBroadcast = () => {
  socketService.sendEmergencyBroadcast('这是一条测试紧急广播消息');
};

const testSystemNotification = () => {
  // 模拟从服务器接收到系统通知
  ElMessage({
    title: '系统通知',
    message: '这是一条测试系统通知',
    type: 'info',
    duration: 3000,
  });
};

const testVillageUpdate = () => {
  // 模拟村务更新通知
  ElMessage({
    title: '村务更新',
    message: '村委会发布了新的公告，请及时查看',
    type: 'success',
    duration: 3000,
  });
};

onMounted(() => {
  // 初始化数据
  refreshData();
});
</script>

<style lang="scss" scoped>
.dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-cards {
  .stat-card {
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    padding: 12px;
    border-radius: 8px;
    background: rgba(64, 158, 255, 0.1);
  }

  .stat-info {
    flex: 1;
  }

  .stat-number {
    font-size: 24px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: #909399;
  }
}

.feature-modules {
  .module-card {
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 20px;

    &:hover:not(.module-disabled) {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    &.module-disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .module-content {
    text-align: center;
    padding: 20px;
  }

  .module-header {
    position: relative;
    margin-bottom: 16px;

    .module-status {
      position: absolute;
      top: 0;
      right: 0;
    }
  }

  .module-title {
    font-size: 18px;
    font-weight: bold;
    color: #303133;
    margin-bottom: 8px;
  }

  .module-description {
    font-size: 14px;
    color: #606266;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .module-footer {
    margin-top: 16px;
  }
}

.quick-actions {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
}

.realtime-test {
  .test-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .connection-status {
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
    display: flex;
    align-items: center;
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 12px;
  }

  .actions-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .test-actions {
    flex-direction: column;
  }
}
</style>
