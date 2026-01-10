<!-- 智慧乡村平台顶部导航栏 -->
<template>
  <header class="app-header" :class="headerClasses">
    <div class="header-left">
      <!-- Logo和标题 -->
      <div class="logo-section" @click="goHome">
        <img src="/logo.svg" alt="智慧乡村" class="logo" />
        <h1 class="site-title" v-if="!isMobile">智慧乡村综合服务平台</h1>
      </div>

      <!-- 移动端菜单按钮 -->
      <el-button
        v-if="isMobile"
        class="mobile-menu-btn"
        @click="$emit('toggle-sidebar')"
        circle
        size="large"
      >
        <el-icon><Menu /></el-icon>
      </el-button>
    </div>

    <div class="header-center">
      <!-- 搜索框 -->
      <div class="search-section" v-if="!isMobile">
        <el-input
          v-model="searchQuery"
          placeholder="搜索村务、服务、政策..."
          class="search-input"
          size="large"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <div class="header-right">
      <!-- 语音助手按钮 -->
      <el-tooltip content="语音助手" placement="bottom">
        <el-button
          class="voice-assistant-btn"
          @click="$emit('toggle-voice')"
          :class="{ 'is-active': voiceAssistantActive }"
          circle
          size="large"
        >
          <el-icon><Microphone /></el-icon>
        </el-button>
      </el-tooltip>

      <!-- 主题切换 -->
      <el-dropdown @command="handleThemeChange" trigger="click">
        <el-button class="theme-btn" circle size="large">
          <el-icon><Sunny /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="default">
              <el-icon><Sunny /></el-icon> 默认主题
            </el-dropdown-item>
            <el-dropdown-item command="dark">
              <el-icon><Moon /></el-icon> 深色主题
            </el-dropdown-item>
            <el-dropdown-item command="high-contrast">
              <el-icon><View /></el-icon> 高对比度
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 字体大小控制 -->
      <el-dropdown @command="handleFontSizeChange" trigger="click" v-if="isLargeFont">
        <el-button class="font-size-btn" circle size="large">
          <el-icon><FontSize /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="small">小字体</el-dropdown-item>
            <el-dropdown-item command="normal">正常字体</el-dropdown-item>
            <el-dropdown-item command="large">大字体</el-dropdown-item>
            <el-dropdown-item command="xlarge">特大字体</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 通知中心 -->
      <el-badge :value="unreadNotifications" :hidden="unreadNotifications === 0">
        <el-button class="notification-btn" circle size="large" @click="showNotifications">
          <el-icon><Bell /></el-icon>
        </el-button>
      </el-badge>

      <!-- 用户信息 -->
      <el-dropdown @command="handleUserAction" trigger="click">
        <div class="user-info">
          <el-avatar :src="userInfo?.avatar" :size="40">
            <el-icon><User /></el-icon>
          </el-avatar>
          <span class="username" v-if="!isMobile">{{ userInfo?.name }}</span>
          <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon> 个人中心
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon> 设置
            </el-dropdown-item>
            <el-dropdown-item command="help">
              <el-icon><QuestionFilled /></el-icon> 帮助
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon> 退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 移动端搜索覆盖层 -->
    <div class="mobile-search-overlay" v-if="showMobileSearch" @click="showMobileSearch = false">
      <div class="mobile-search-container" @click.stop>
        <el-input
          v-model="searchQuery"
          placeholder="搜索村务、服务、政策..."
          size="large"
          ref="mobileSearchInput"
          @keyup.enter="handleMobileSearch"
          @blur="showMobileSearch = false"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { ElMessage, ElMessageBox } from 'element-plus';

// Props
const props = defineProps({
  userInfo: {
    type: Object,
    default: () => ({}),
  },
  isLargeFont: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(['toggle-sidebar', 'toggle-voice', 'change-theme']);

// Store和路由
const userStore = useUserStore();
const notificationStore = useNotificationStore();
const router = useRouter();

// 响应式数据
const searchQuery = ref('');
const voiceAssistantActive = ref(false);
const showMobileSearch = ref(false);
const mobileSearchInput = ref(null);

// 计算属性
const isMobile = computed(() => window.innerWidth < 768);
const headerClasses = computed(() => ({
  'large-font-header': props.isLargeFont,
  'mobile-header': isMobile.value,
}));
const unreadNotifications = computed(() => notificationStore.unreadCount);

// 方法
const goHome = () => {
  const userRole = userStore.userRole;
  const homeRoutes = {
    resident: '/village-affairs',
    village_admin: '/dashboard',
    admin: '/dashboard',
  };
  router.push(homeRoutes[userRole] || '/village-affairs');
};

const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索内容');
    return;
  }

  // 跳转到搜索结果页面
  router.push({
    path: '/search',
    query: { q: searchQuery.value },
  });
};

const handleMobileSearch = () => {
  handleSearch();
  showMobileSearch.value = false;
};

const handleThemeChange = theme => {
  emit('change-theme', theme);
};

const handleFontSizeChange = size => {
  emit('change-font-size', size);
};

const showNotifications = () => {
  router.push('/notifications');
};

const handleUserAction = async command => {
  switch (command) {
    case 'profile':
      router.push('/profile');
      break;
    case 'settings':
      router.push('/profile/settings');
      break;
    case 'help':
      router.push('/help');
      break;
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });
        await userStore.logout();
        ElMessage.success('已安全退出');
        router.push('/auth/login');
      } catch (error) {
        // 用户取消退出
      }
      break;
  }
};

// 监听语音助手状态
const handleVoiceAssistantStatus = isActive => {
  voiceAssistantActive.value = isActive;
};

// 生命周期
onMounted(() => {
  // 监听语音助手状态变化
  window.addEventListener('voice-assistant-status', handleVoiceAssistantStatus);

  // 监听移动端搜索快捷键
  window.addEventListener('keydown', e => {
    if (e.key === '/' && isMobile.value) {
      e.preventDefault();
      showMobileSearch.value = true;
      nextTick(() => {
        mobileSearchInput.value?.focus();
      });
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('voice-assistant-status', handleVoiceAssistantStatus);
});
</script>

<style lang="scss" scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;

  // 大字模式样式
  &.large-font-header {
    height: 80px;
    padding: 0 24px;

    .site-title {
      font-size: 24px;
    }

    .search-input {
      :deep(.el-input__inner) {
        font-size: 18px;
        height: 48px;
      }
    }

    .user-info .username {
      font-size: 18px;
    }
  }

  // 移动端样式
  &.mobile-header {
    height: 56px;
    padding: 0 16px;

    .header-center {
      display: none;
    }

    .header-right {
      gap: 8px;
    }
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;

    .logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
    }

    .site-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin: 0;
      white-space: nowrap;
    }
  }

  .mobile-menu-btn {
    background: var(--el-color-primary);
    color: white;
    border: none;

    &:hover {
      background: var(--el-color-primary-light-3);
    }
  }
}

.header-center {
  flex: 1;
  max-width: 400px;
  margin: 0 20px;

  .search-section {
    .search-input {
      width: 100%;

      :deep(.el-input__inner) {
        border-radius: 20px;
        background: var(--el-fill-color-light);
        border: none;

        &:focus {
          background: var(--el-bg-color);
          box-shadow: 0 0 0 2px var(--el-color-primary);
        }
      }
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;

  .voice-assistant-btn {
    background: var(--el-color-success);
    color: white;
    border: none;

    &.is-active {
      background: var(--el-color-danger);
      animation: pulse 1.5s infinite;
    }

    &:hover {
      background: var(--el-color-success-light-3);
    }
  }

  .theme-btn,
  .font-size-btn,
  .notification-btn {
    background: var(--el-fill-color-light);
    border: none;
    color: var(--el-text-color-regular);

    &:hover {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 20px;
    background: var(--el-fill-color-light);
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: var(--el-color-primary-light-9);
    }

    .username {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .dropdown-icon {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}

// 移动端搜索覆盖层
.mobile-search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  padding-top: 80px;

  .mobile-search-container {
    width: 90%;
    max-width: 400px;
    margin: 0 auto;

    :deep(.el-input__inner) {
      font-size: 16px;
      height: 48px;
      border-radius: 24px;
    }
  }
}

// 动画效果
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(64, 158, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .app-header {
    .header-left {
      gap: 12px;

      .logo-section .site-title {
        display: none;
      }
    }

    .header-right {
      gap: 8px;

      .user-info .username {
        display: none;
      }

      .theme-btn,
      .font-size-btn {
        padding: 8px;
      }
    }
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 0 12px;

    .header-left .logo-section .logo {
      width: 32px;
      height: 32px;
    }

    .header-right {
      gap: 6px;

      .el-button {
        padding: 6px;
      }
    }
  }
}

// 高对比度模式
.app-header[data-theme='high-contrast'] {
  border-bottom: 2px solid #000;

  .voice-assistant-btn {
    background: #000;
    color: #fff;
    border: 2px solid #000;
  }

  .user-info {
    background: #fff;
    border: 2px solid #000;
  }
}
</style>
