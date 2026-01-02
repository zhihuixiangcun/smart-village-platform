<template>
  <div class="mobile-home" :class="{ 'elderly-mode': isElderlyMode }">
    <!-- 适老化模式包裹 -->
    <ElderlyMode ref="elderlyModeRef">
      <!-- 头部 -->
      <header class="home-header">
        <div class="header-content">
          <div class="location-info">
            <el-icon :size="20"><Location /></el-icon>
            <span class="village-name">{{ villageName }}</span>
          </div>
          <div class="header-actions">
            <el-button
              circle
              :size="isElderlyMode ? 'large' : 'default'"
              @click="showSettings = true"
            >
              <el-icon><Setting /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 天气信息 -->
        <div class="weather-info" v-if="weather">
          <el-icon :size="18"><Sunny /></el-icon>
          <span>{{ weather.temperature }}°C {{ weather.condition }}</span>
        </div>
      </header>

      <!-- 主要内容区域 -->
      <main class="home-main">
        <!-- 快捷功能网格 -->
        <section class="quick-actions">
          <h2 class="section-title">快捷服务</h2>
          <div class="action-grid" :class="{ 'simplified': isSimplifiedMode }">
            <LargeButton
              v-for="action in quickActions"
              :key="action.id"
              :label="action.label"
              :icon="action.icon"
              :type="action.type || 'default'"
              :elderly-mode="isElderlyMode"
              :badge="action.badge"
              @click="handleAction(action)"
            />
          </div>
        </section>

        <!-- 紧急求助 -->
        <section class="emergency-section" v-if="!isSimplifiedMode || showEmergency">
          <LargeButton
            label="紧急求助"
            :icon="'Phone'"
            type="emergency"
            :elderly-mode="isElderlyMode"
            size="large"
            @click="handleEmergency"
          />
        </section>

        <!-- 语音助手 -->
        <section class="voice-assistant" v-if="showVoiceAssistant">
          <div class="assistant-container">
            <VoiceInput
              ref="voiceInputRef"
              :parse-command="true"
              @result="handleVoiceResult"
              @command="handleVoiceCommand"
              @error="handleVoiceError"
            />
            <p class="assistant-tip">点击麦克风说出您的需求</p>
          </div>
        </section>

        <!-- 重要公告 -->
        <section class="announcements" v-if="!isSimplifiedMode">
          <h2 class="section-title">重要公告</h2>
          <div class="announcement-list">
            <div
              v-for="announcement in announcements"
              :key="announcement.id"
              class="announcement-item"
              @click="viewAnnouncement(announcement)"
            >
              <div class="announcement-tag" :class="announcement.priority">
                {{ announcement.priorityText }}
              </div>
              <div class="announcement-content">
                <h3 class="announcement-title">{{ announcement.title }}</h3>
                <p class="announcement-time">{{ announcement.time }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 待办事项 -->
        <section class="todo-list" v-if="!isSimplifiedMode">
          <h2 class="section-title">待办事项</h2>
          <div class="todo-items">
            <div
              v-for="todo in todos"
              :key="todo.id"
              class="todo-item"
              :class="{ completed: todo.completed }"
              @click="toggleTodo(todo)"
            >
              <el-checkbox :model-value="todo.completed" />
              <span class="todo-text">{{ todo.text }}</span>
            </div>
          </div>
        </section>
      </main>
    </ElderlyMode>

    <!-- 设置面板 -->
    <el-drawer
      v-model="showSettings"
      title="设置"
      direction="rtl"
      :size="isElderlyMode ? '80%' : '60%'"
    >
      <SettingsPanel @close="showSettings = false" />
    </el-drawer>

    <!-- 离线状态指示器 -->
    <OfflineIndicator ref="offlineIndicatorRef" />

    <!-- 底部导航 -->
    <nav class="bottom-nav">
      <div
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: currentNav === item.id }"
        @click="handleNav(item)"
      >
        <el-icon :size="24">
          <component :is="item.icon" />
        </el-icon>
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </nav>
  </div>
</template>

<script setup>
/**
 * 移动端首页 - Mobile Home View
 *
 * 功能：
 * - 适老化设计
 * - 核心功能入口
 * - 语音助手
 * - 离线状态显示
 */

import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMobileStore } from '@/stores/mobileStore';
import { useSpeech } from '@/composables/useSpeech';
import ElderlyMode from '@/components/mobile/ElderlyMode.vue';
import VoiceInput from '@/components/mobile/VoiceInput.vue';
import LargeButton from '@/components/mobile/LargeButton.vue';
import OfflineIndicator from '@/components/mobile/OfflineIndicator.vue';
import SettingsPanel from '@/components/mobile/SettingsPanel.vue';
import {
  Location,
  Setting,
  Sunny,
  Phone,
  Home,
  ChatDotSquare,
  Document,
  User
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const mobileStore = useMobileStore();

// Refs
const elderlyModeRef = ref(null);
const voiceInputRef = ref(null);
const offlineIndicatorRef = ref(null);

// 状态
const showSettings = ref(false);
const showEmergency = ref(true);
const currentNav = ref('home');
const villageName = ref('智慧乡村示范村');
const weather = ref({
  temperature: 25,
  condition: '晴'
});

// 语音助手
const { startListening, speak } = useSpeech();

// 计算属性
const isElderlyMode = computed(() => mobileStore.isElderlyMode);
const isSimplifiedMode = computed(() => mobileStore.isSimplifiedMode);
const showVoiceAssistant = computed(() => mobileStore.uiState.voiceAssistantOpen);

// 快捷操作
const quickActions = ref([
  {
    id: 'announcements',
    label: '村务公告',
    icon: 'Notification',
    type: 'primary',
    route: '/announcements'
  },
  {
    id: 'services',
    label: '便民服务',
    icon: 'Service',
    type: 'success',
    route: '/services'
  },
  {
    id: 'feedback',
    label: '意见反馈',
    icon: 'EditPen',
    type: 'warning',
    route: '/feedback'
  },
  {
    id: 'phone',
    label: '通讯录',
    icon: 'Phone',
    type: 'info',
    route: '/contacts'
  }
]);

// 公告列表
const announcements = ref([
  {
    id: 1,
    title: '关于开展全村环境整治的通知',
    time: '今天 09:00',
    priority: 'high',
    priorityText: '重要'
  },
  {
    id: 2,
    title: '本周五村委会会议安排',
    time: '昨天 15:00',
    priority: 'normal',
    priorityText: '普通'
  }
]);

// 待办事项
const todos = ref([
  { id: 1, text: '完成医保缴费', completed: false },
  { id: 2, text: '参加村民代表大会', completed: false },
  { id: 3, text: '领取疫苗接种证明', completed: true }
]);

// 底部导航
const navItems = ref([
  { id: 'home', label: '首页', icon: Home },
  { id: 'services', label: '服务', icon: Service },
  { id: 'messages', label: '消息', icon: ChatDotSquare },
  { id: 'profile', label: '我的', icon: User }
]);

/**
 * 处理快捷操作
 */
const handleAction = (action) => {
  if (action.route) {
    router.push(action.route);
  } else if (action.handler) {
    action.handler();
  }
};

/**
 * 处理紧急求助
 */
const handleEmergency = async () => {
  try {
    await ElMessageBox.confirm(
      '是否要发起紧急求助？系统将立即通知村干部。',
      '紧急求助',
      {
        confirmButtonText: '确认求助',
        cancelButtonText: '取消',
        type: 'error',
        distinguishCancelAndClose: true
      }
    );

    // 发起求助
    ElMessage.success('求助信号已发送，请保持电话畅通');

    // 语音提示
    if (mobileStore.speechSettings.autoRead) {
      await speak('求助信号已发送，请保持电话畅通');
    }
  } catch {
    // 用户取消
  }
};

/**
 * 处理语音识别结果
 */
const handleVoiceResult = (data) => {
  console.log('语音识别结果:', data);
};

/**
 * 处理语音命令
 */
const handleVoiceCommand = async (command) => {
  const { type, target } = command;

  switch (type) {
    case 'call':
      ElMessage.info(`正在呼叫：${target}`);
      break;

    case 'query':
      ElMessage.info(`正在查询：${target}`);
      break;

    case 'navigation':
      ElMessage.info(`正在前往：${target}`);
      break;

    case 'emergency':
      await handleEmergency();
      break;

    case 'search':
      ElMessage.info(`正在搜索：${target}`);
      break;

    default:
      ElMessage.warning('未识别的命令类型');
  }
};

/**
 * 处理语音错误
 */
const handleVoiceError = (error) => {
  console.error('语音识别错误:', error);
};

/**
 * 查看公告
 */
const viewAnnouncement = (announcement) => {
  router.push(`/announcements/${announcement.id}`);
};

/**
 * 切换待办状态
 */
const toggleTodo = (todo) => {
  todo.completed = !todo.completed;
};

/**
 * 处理导航
 */
const handleNav = (item) => {
  currentNav.value = item.id;
  if (item.route) {
    router.push(item.route);
  }
};

/**
 * 初始化
 */
onMounted(() => {
  mobileStore.init();

  // 检查更新
  checkForUpdates();
});

/**
 * 检查更新
 */
const checkForUpdates = async () => {
  // 检查应用更新、数据同步等
  console.log('检查更新...');
};
</script>

<style scoped lang="scss">
.mobile-home {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 60px; // 底部导航高度

  &.elderly-mode {
    background: #ffffff;
  }
}

.home-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px;
  padding-top: max(16px, env(safe-area-inset-top));

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .location-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;
  }

  .weather-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    opacity: 0.9;
  }

  .elderly-mode & {
    padding: 20px;
    padding-top: max(20px, env(safe-area-inset-top));

    .location-info {
      font-size: 22px;
    }

    .weather-info {
      font-size: 18px;
    }
  }
}

.home-main {
  padding: 16px;

  .elderly-mode & {
    padding: 20px;
  }
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;

  .elderly-mode & {
    font-size: 22px;
  }
}

.quick-actions {
  margin-bottom: 24px;

  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    &.simplified {
      grid-template-columns: 1fr;
    }

    .elderly-mode & {
      gap: 16px;
    }
  }
}

.emergency-section {
  margin-bottom: 24px;
}

.voice-assistant {
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  text-align: center;

  .assistant-tip {
    margin-top: 12px;
    font-size: 14px;
    color: #909399;

    .elderly-mode & {
      font-size: 18px;
    }
  }
}

.announcements {
  margin-bottom: 24px;

  .announcement-list {
    background: white;
    border-radius: 12px;
    overflow: hidden;
  }

  .announcement-item {
    display: flex;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid #f5f7fa;
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &:active {
      background: #f5f7fa;
    }

    .announcement-tag {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;

      &.high {
        background: #fef0f0;
        color: #f56c6c;
      }

      &.normal {
        background: #f0f9ff;
        color: #409eff;
      }
    }

    .announcement-content {
      flex: 1;
      min-width: 0;
    }

    .announcement-title {
      font-size: 15px;
      font-weight: 500;
      color: #303133;
      margin: 0 0 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .announcement-time {
      font-size: 12px;
      color: #909399;
      margin: 0;
    }

    .elderly-mode & {
      padding: 20px;
      gap: 16px;

      .announcement-title {
        font-size: 18px;
      }

      .announcement-time {
        font-size: 16px;
      }
    }
  }
}

.todo-list {
  margin-bottom: 24px;

  .todo-items {
    background: white;
    border-radius: 12px;
    padding: 8px 0;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;

    &:active {
      background: #f5f7fa;
    }

    &.completed {
      .todo-text {
        text-decoration: line-through;
        color: #c0c4cc;
      }
    }

    .todo-text {
      flex: 1;
      font-size: 15px;
      color: #303133;
    }

    .elderly-mode & {
      padding: 16px 20px;
      gap: 16px;

      .todo-text {
        font-size: 18px;
      }
    }
  }
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: white;
  border-top: 1px solid #e4e7ed;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    gap: 4px;
    color: #909399;
    cursor: pointer;

    &.active {
      color: #409eff;
    }

    &:active {
      background: #f5f7fa;
    }

    .nav-label {
      font-size: 12px;
    }

    .elderly-mode & {
      padding: 12px 0;

      .nav-label {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }
}
</style>
