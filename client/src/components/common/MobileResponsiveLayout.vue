<template>
  <div class="mobile-responsive-layout" :class="{ 'is-mobile': isMobile, 'is-tablet': isTablet }">
    <!-- 移动端头部 -->
    <div v-if="isMobile" class="mobile-header">
      <div class="header-content">
        <el-button
          class="menu-button"
          :icon="sidebarCollapsed ? 'Expand' : 'Fold'"
          @click="toggleSidebar"
          size="large"
          text
        />
        <div class="header-title">
          <h3>{{ pageTitle }}</h3>
        </div>
        <div class="header-actions">
          <el-button
            class="search-button"
            icon="Search"
            @click="showMobileSearch = true"
            size="large"
            text
          />
          <el-dropdown @command="handleQuickAction">
            <el-button icon="More" size="large" text />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="add" icon="Plus">新增</el-dropdown-item>
                <el-dropdown-item command="import" icon="Upload">导入</el-dropdown-item>
                <el-dropdown-item command="export" icon="Download">导出</el-dropdown-item>
                <el-dropdown-item command="statistics" icon="TrendCharts">统计</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 移动端侧边栏遮罩 -->
    <div v-if="isMobile && !sidebarCollapsed" class="sidebar-overlay" @click="toggleSidebar"></div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 桌面端内容 -->
      <div v-if="!isMobile" class="desktop-content">
        <slot name="desktop" />
      </div>

      <!-- 平板端内容 -->
      <div v-else-if="isTablet" class="tablet-content">
        <slot name="tablet" />
      </div>

      <!-- 移动端内容 -->
      <div v-else class="mobile-content">
        <slot name="mobile" />
      </div>
    </div>

    <!-- 移动端底部导航 -->
    <div v-if="isMobile" class="mobile-bottom-nav">
      <div class="nav-item" :class="{ active: activeTab === 'list' }" @click="setActiveTab('list')">
        <el-icon><List /></el-icon>
        <span>列表</span>
      </div>
      <div
        class="nav-item"
        :class="{ active: activeTab === 'search' }"
        @click="setActiveTab('search')"
      >
        <el-icon><Search /></el-icon>
        <span>搜索</span>
      </div>
      <div
        class="nav-item"
        :class="{ active: activeTab === 'statistics' }"
        @click="setActiveTab('statistics')"
      >
        <el-icon><TrendCharts /></el-icon>
        <span>统计</span>
      </div>
      <div
        class="nav-item"
        :class="{ active: activeTab === 'profile' }"
        @click="setActiveTab('profile')"
      >
        <el-icon><User /></el-icon>
        <span>我的</span>
      </div>
    </div>

    <!-- 移动端搜索弹出层 -->
    <el-drawer
      v-model="showMobileSearch"
      title="搜索"
      direction="ttb"
      size="100%"
      class="mobile-search-drawer"
    >
      <div class="mobile-search-content">
        <div class="search-input-area">
          <el-input
            v-model="mobileSearchQuery"
            placeholder="搜索村民姓名、身份证号..."
            prefix-icon="Search"
            size="large"
            clearable
            @keyup.enter="performMobileSearch"
          />
          <el-button type="primary" @click="performMobileSearch" size="large"> 搜索 </el-button>
        </div>

        <div class="quick-filters">
          <h4>快速筛选</h4>
          <div class="filter-tags">
            <el-tag
              v-for="filter in quickFilters"
              :key="filter.key"
              :type="selectedFilters.includes(filter.key) ? 'primary' : 'info'"
              :effect="selectedFilters.includes(filter.key) ? 'dark' : 'plain'"
              @click="toggleFilter(filter.key)"
              class="filter-tag"
            >
              {{ filter.label }}
            </el-tag>
          </div>
        </div>

        <div class="search-history">
          <h4>搜索历史</h4>
          <div class="history-list">
            <div
              v-for="item in searchHistory"
              :key="item.id"
              class="history-item"
              @click="selectHistoryItem(item)"
            >
              <el-icon><Clock /></el-icon>
              <span>{{ item.query }}</span>
              <el-button text @click.stop="removeHistoryItem(item.id)" icon="Close" size="small" />
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 移动端快速操作浮动按钮 -->
    <div v-if="isMobile" class="mobile-fab">
      <el-button
        type="primary"
        :icon="fabExpanded ? 'Close' : 'Plus'"
        @click="toggleFab"
        size="large"
        circle
        class="main-fab"
      />

      <transition-group name="fab" tag="div" class="fab-menu">
        <el-button
          v-for="(action, index) in fabActions"
          :key="action.key"
          v-show="fabExpanded"
          :icon="action.icon"
          @click="handleFabAction(action.key)"
          size="default"
          circle
          class="fab-item"
          :style="{
            transform: `translateY(${-(index + 1) * 60}px)`,
            transitionDelay: `${index * 50}ms`,
          }"
        />
      </transition-group>
    </div>

    <!-- 移动端通知栏 -->
    <div v-if="isMobile && notifications.length > 0" class="mobile-notifications">
      <el-card
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-card"
        shadow="never"
      >
        <div class="notification-content">
          <div class="notification-icon" :class="notification.type">
            <el-icon>
              <component :is="getNotificationIcon(notification.type)" />
            </el-icon>
          </div>
          <div class="notification-text">
            <h5>{{ notification.title }}</h5>
            <p>{{ notification.message }}</p>
            <span class="notification-time">{{ formatTime(notification.time) }}</span>
          </div>
          <el-button text @click="dismissNotification(notification.id)" icon="Close" size="small" />
        </div>
      </el-card>
    </div>

    <!-- 手势操作提示 -->
    <div v-if="showGestureHint" class="gesture-hint">
      <div class="hint-content">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ gestureHintText }}</span>
        <el-button text @click="dismissGestureHint" icon="Close" size="small" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Expand,
  Fold,
  Search,
  More,
  Plus,
  List,
  TrendCharts,
  User,
  Clock,
  Close,
  Upload,
  Download,
  InfoFilled,
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  pageTitle: {
    type: String,
    default: '村民管理',
  },
  enableGestures: {
    type: Boolean,
    default: true,
  },
  showBottomNav: {
    type: Boolean,
    default: true,
  },
});

// Emits
const emit = defineEmits(['tab-change', 'search', 'quick-action', 'fab-action']);

// 响应式数据
const windowWidth = ref(window.innerWidth);
const windowHeight = ref(window.innerHeight);
const sidebarCollapsed = ref(true);
const showMobileSearch = ref(false);
const mobileSearchQuery = ref('');
const selectedFilters = ref([]);
const activeTab = ref('list');
const fabExpanded = ref(false);
const showGestureHint = ref(false);
const gestureHintText = ref('');

// 通知数据
const notifications = ref([
  {
    id: 1,
    type: 'info',
    title: '数据同步完成',
    message: '村民档案数据已更新至最新版本',
    time: new Date(),
  },
  {
    id: 2,
    type: 'warning',
    title: '待办提醒',
    message: '有3条村民信息需要审核',
    time: new Date(Date.now() - 30 * 60 * 1000),
  },
]);

// 搜索历史
const searchHistory = ref([
  { id: 1, query: '张三', time: new Date() },
  { id: 2, query: '低保户', time: new Date(Date.now() - 60 * 60 * 1000) },
  { id: 3, query: '65岁以上', time: new Date(Date.now() - 2 * 60 * 60 * 1000) },
]);

// 快速筛选标签
const quickFilters = ref([
  { key: 'elderly', label: '老年人' },
  { key: 'lowIncome', label: '低保户' },
  { key: 'disabled', label: '残疾人' },
  { key: 'children', label: '儿童' },
  { key: 'veteran', label: '退伍军人' },
  { key: 'singleParent', label: '单亲家庭' },
]);

// 浮动按钮操作
const fabActions = ref([
  { key: 'add', icon: 'Plus', label: '新增' },
  { key: 'scan', icon: 'Camera', label: '扫码' },
  { key: 'voice', icon: 'Microphone', label: '语音' },
  { key: 'import', icon: 'Upload', label: '导入' },
]);

// 计算属性
const isMobile = computed(() => windowWidth.value <= 768);
const isTablet = computed(() => windowWidth.value > 768 && windowWidth.value <= 1024);
const isDesktop = computed(() => windowWidth.value > 1024);

// 设备类型检测
const deviceType = computed(() => {
  if (isMobile.value) return 'mobile';
  if (isTablet.value) return 'tablet';
  return 'desktop';
});

// 屏幕方向
const isLandscape = computed(() => windowWidth.value > windowHeight.value);
const isPortrait = computed(() => windowHeight.value > windowWidth.value);

// 方法
const handleResize = () => {
  windowWidth.value = window.innerWidth;
  windowHeight.value = window.innerHeight;

  // 自动调整布局
  if (isMobile.value) {
    sidebarCollapsed.value = true;
  }
};

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const setActiveTab = tab => {
  activeTab.value = tab;
  emit('tab-change', tab);
};

const handleQuickAction = command => {
  emit('quick-action', command);
};

const performMobileSearch = () => {
  if (!mobileSearchQuery.value.trim()) return;

  // 添加到搜索历史
  const historyItem = {
    id: Date.now(),
    query: mobileSearchQuery.value,
    time: new Date(),
  };
  searchHistory.value.unshift(historyItem);

  // 限制历史记录数量
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10);
  }

  emit('search', {
    query: mobileSearchQuery.value,
    filters: selectedFilters.value,
  });

  showMobileSearch.value = false;
  ElMessage.success('搜索完成');
};

const toggleFilter = filterKey => {
  const index = selectedFilters.value.indexOf(filterKey);
  if (index > -1) {
    selectedFilters.value.splice(index, 1);
  } else {
    selectedFilters.value.push(filterKey);
  }
};

const selectHistoryItem = item => {
  mobileSearchQuery.value = item.query;
  performMobileSearch();
};

const removeHistoryItem = id => {
  const index = searchHistory.value.findIndex(item => item.id === id);
  if (index > -1) {
    searchHistory.value.splice(index, 1);
  }
};

const toggleFab = () => {
  fabExpanded.value = !fabExpanded.value;
};

const handleFabAction = action => {
  fabExpanded.value = false;
  emit('fab-action', action);
};

const dismissNotification = id => {
  const index = notifications.value.findIndex(n => n.id === id);
  if (index > -1) {
    notifications.value.splice(index, 1);
  }
};

const getNotificationIcon = type => {
  const iconMap = {
    info: 'InfoFilled',
    success: 'SuccessFilled',
    warning: 'WarningFilled',
    error: 'CircleCloseFilled',
  };
  return iconMap[type] || 'InfoFilled';
};

const formatTime = time => {
  const now = new Date();
  const diff = now - time;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
};

// 手势操作
const setupGestures = () => {
  if (!props.enableGestures || !isMobile.value) return;

  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  const handleTouchStart = e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };

  const handleTouchEnd = e => {
    endX = e.changedTouches[0].clientX;
    endY = e.changedTouches[0].clientY;
    handleGesture();
  };

  const handleGesture = () => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const minSwipeDistance = 50;

    // 水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // 右滑
        if (sidebarCollapsed.value) {
          toggleSidebar();
          showGestureHint('向右滑动打开菜单');
        }
      } else {
        // 左滑
        if (!sidebarCollapsed.value) {
          toggleSidebar();
          showGestureHint('向左滑动关闭菜单');
        }
      }
    }

    // 垂直滑动
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
      if (deltaY < 0) {
        // 上滑
        showGestureHint('向上滑动刷新数据');
        emit('refresh');
      } else {
        // 下滑
        showGestureHint('向下滑动返回顶部');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const showGestureHint = text => {
    gestureHintText.value = text;
    showGestureHint.value = true;
    setTimeout(() => {
      showGestureHint.value = false;
    }, 2000);
  };

  const dismissGestureHint = () => {
    showGestureHint.value = false;
  };

  // 绑定事件
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });

  // 返回清理函数
  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchend', handleTouchEnd);
  };
};

// 双击缩放
const setupDoubleClick = () => {
  if (!isMobile.value) return;

  let lastClickTime = 0;
  const handleDoubleClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 300) {
      // 双击事件
      const currentZoom = document.body.style.zoom || '1';
      const newZoom = currentZoom === '1' ? '1.2' : '1';
      document.body.style.zoom = newZoom;

      showGestureHint(newZoom === '1.2' ? '双击放大' : '双击恢复');
    }
    lastClickTime = now;
  };

  document.addEventListener('click', handleDoubleClick);

  return () => {
    document.removeEventListener('click', handleDoubleClick);
  };
};

// 长按操作
const setupLongPress = () => {
  if (!isMobile.value) return;

  let pressTimer = null;
  const handleTouchStart = e => {
    pressTimer = setTimeout(() => {
      // 长按事件
      const target = e.target.closest('.data-item');
      if (target) {
        showContextMenu(target);
      }
    }, 800);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
    }
  };

  const showContextMenu = element => {
    showGestureHint('长按显示更多操作');
    emit('long-press', element);
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchEnd);
  };
};

// 视口高度修正（解决移动端地址栏影响）
const fixViewportHeight = () => {
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', () => {
    setTimeout(setVH, 100);
  });
};

// 禁用双击缩放（防止误操作）
const disableDoubleTapZoom = () => {
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    e => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    false
  );
};

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize);

  if (isMobile.value && props.enableGestures) {
    // 设置手势操作
    const cleanupGestures = setupGestures();
    const cleanupDoubleClick = setupDoubleClick();
    const cleanupLongPress = setupLongPress();

    // 修正视口高度
    fixViewportHeight();

    // 禁用双击缩放
    disableDoubleTapZoom();

    // 清理函数
    onUnmounted(() => {
      cleanupGestures?.();
      cleanupDoubleClick?.();
      cleanupLongPress?.();
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// 监听设备变化
watch(deviceType, (newType, oldType) => {
  if (newType !== oldType) {
    ElMessage.info(
      `切换到${newType === 'mobile' ? '移动' : newType === 'tablet' ? '平板' : '桌面'}模式`
    );
  }
});

// 暴露方法和数据
defineExpose({
  isMobile,
  isTablet,
  isDesktop,
  deviceType,
  windowWidth,
  windowHeight,
  toggleSidebar,
  performMobileSearch,
});
</script>

<style lang="scss" scoped>
.mobile-responsive-layout {
  position: relative;
  min-height: 100vh;

  // 移动端头部
  .mobile-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: white;
    border-bottom: 1px solid #ebeef5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      height: 56px;

      .menu-button,
      .search-button {
        color: #606266;
      }

      .header-title {
        flex: 1;
        text-align: center;

        h3 {
          margin: 0;
          font-size: 18px;
          color: #303133;
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }
  }

  // 侧边栏遮罩
  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }

  // 主要内容区域
  .main-content {
    padding-top: 56px;
    padding-bottom: 60px;
    min-height: calc(100vh - 116px);

    .mobile-content {
      padding: 16px;
    }

    .tablet-content {
      padding: 20px;
    }

    .desktop-content {
      padding: 24px;
    }
  }

  // 底部导航
  .mobile-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: white;
    border-top: 1px solid #ebeef5;
    display: flex;
    padding: 8px 0;

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px;
      cursor: pointer;
      transition: color 0.3s;
      color: #909399;

      &.active {
        color: #409eff;
      }

      .el-icon {
        font-size: 20px;
      }

      span {
        font-size: 12px;
      }
    }
  }

  // 浮动操作按钮
  .mobile-fab {
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 1001;

    .main-fab {
      width: 56px;
      height: 56px;
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
    }

    .fab-menu {
      position: absolute;
      bottom: 0;
      right: 0;

      .fab-item {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 40px;
        height: 40px;
        background: white;
        color: #606266;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    }
  }

  // 动画
  .fab-enter-active,
  .fab-leave-active {
    transition: all 0.3s ease;
  }

  .fab-enter-from,
  .fab-leave-to {
    transform: translateY(0) scale(0);
    opacity: 0;
  }

  // 通知栏
  .mobile-notifications {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    z-index: 998;
    padding: 0 16px;

    .notification-card {
      margin-bottom: 8px;
      border-left: 4px solid #409eff;

      .notification-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;

        .notification-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;

          &.info {
            background: #f0f9ff;
            color: #409eff;
          }

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

        .notification-text {
          flex: 1;

          h5 {
            margin: 0 0 4px 0;
            color: #303133;
            font-size: 14px;
          }

          p {
            margin: 0 0 4px 0;
            color: #606266;
            font-size: 12px;
          }

          .notification-time {
            color: #909399;
            font-size: 11px;
          }
        }
      }
    }
  }

  // 手势提示
  .gesture-hint {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2000;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 20px;
    font-size: 14px;

    .hint-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  // 平板端适配
  &.is-tablet {
    .main-content {
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  // 移动端适配
  &.is-mobile {
    // 搜索抽屉
    :deep(.mobile-search-drawer) {
      .el-drawer__header {
        padding: 16px;
        border-bottom: 1px solid #ebeef5;
      }

      .el-drawer__body {
        padding: 0;
      }
    }
  }
}

// 移动端搜索内容
.mobile-search-content {
  padding: 16px;

  .search-input-area {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;

    .el-input {
      flex: 1;
    }
  }

  .quick-filters {
    margin-bottom: 24px;

    h4 {
      margin: 0 0 12px 0;
      color: #303133;
      font-size: 16px;
    }

    .filter-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .filter-tag {
        cursor: pointer;
        user-select: none;
      }
    }
  }

  .search-history {
    h4 {
      margin: 0 0 12px 0;
      color: #303133;
      font-size: 16px;
    }

    .history-list {
      .history-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #f5f7fa;
        cursor: pointer;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background: #f5f7fa;
        }

        .el-icon {
          color: #909399;
        }

        span {
          flex: 1;
          color: #606266;
        }
      }
    }
  }
}

// 响应式字体大小
@media (max-width: 768px) {
  html {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  html {
    font-size: 12px;
  }
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .mobile-responsive-layout {
    .mobile-header {
      .header-content {
        height: 48px;
        padding: 8px 16px;
      }
    }

    .main-content {
      padding-top: 48px;
    }

    .mobile-bottom-nav {
      padding: 4px 0;

      .nav-item {
        padding: 4px;
        gap: 2px;

        .el-icon {
          font-size: 18px;
        }

        span {
          font-size: 10px;
        }
      }
    }
  }
}

// 高DPI屏幕适配
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .mobile-responsive-layout {
    // 高清图标和边框
    .mobile-header,
    .mobile-bottom-nav {
      border-width: 0.5px;
    }
  }
}

// 安全区域适配（iPhone X等）
@supports (padding: max(0px)) {
  .mobile-responsive-layout {
    .mobile-header {
      padding-top: env(safe-area-inset-top);
    }

    .mobile-bottom-nav {
      padding-bottom: env(safe-area-inset-bottom);
    }

    .mobile-fab {
      bottom: calc(80px + env(safe-area-inset-bottom));
    }
  }
}

// 暗色主题适配
@media (prefers-color-scheme: dark) {
  .mobile-responsive-layout {
    .mobile-header,
    .mobile-bottom-nav {
      background: #1d1e1f;
      border-color: #363637;
      color: #e5eaf3;
    }

    .mobile-notifications {
      .notification-card {
        background: #1d1e1f;
        border-color: #409eff;
      }
    }
  }
}
</style>
