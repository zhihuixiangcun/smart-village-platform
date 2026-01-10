<template>
  <div class="mobile-layout">
    <!-- 顶部导航栏 -->
    <header class="mobile-header">
      <div class="header-left">
        <el-button v-if="showBack" text @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <el-button v-else text @click="toggleMenu">
          <el-icon><Menu /></el-icon>
        </el-button>
      </div>

      <div class="header-title">
        {{ pageTitle }}
      </div>

      <div class="header-right">
        <el-badge :value="unreadCount" :hidden="unreadCount === 0">
          <el-button text @click="showNotifications = true">
            <el-icon><Bell /></el-icon>
          </el-button>
        </el-badge>
        <el-button text @click="toggleAccessibility">
          <el-icon><View /></el-icon>
        </el-button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="mobile-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 底部导航栏 -->
    <nav class="mobile-nav" v-if="showBottomNav">
      <div
        v-for="item in bottomNavItems"
        :key="item.route"
        class="nav-item"
        :class="{ active: currentRoute === item.route }"
        @click="navigateTo(item.route)"
      >
        <el-icon :size="24">
          <component :is="item.icon" />
        </el-icon>
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </nav>

    <!-- 侧边菜单抽屉 -->
    <el-drawer v-model="menuOpen" direction="ltr" size="70%" :show-close="false">
      <template #title>
        <div class="menu-header">
          <el-avatar :size="48" :src="userInfo.avatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="user-details">
            <h3>{{ userInfo.name }}</h3>
            <p>{{ userInfo.role }}</p>
          </div>
        </div>
      </template>

      <div class="menu-content">
        <div class="menu-section">
          <h4>常用功能</h4>
          <div class="menu-grid">
            <div
              v-for="item in quickActions"
              :key="item.route"
              class="menu-item"
              @click="navigateTo(item.route)"
            >
              <el-icon :size="28" :style="{ color: item.color }">
                <component :is="item.icon" />
              </el-icon>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>

        <el-divider />

        <div class="menu-section">
          <h4>全部功能</h4>
          <el-menu :default-active="currentRoute" @select="handleMenuSelect">
            <el-menu-item v-for="item in menuItems" :key="item.route" :index="item.route">
              <el-icon>
                <component :is="item.icon" />
              </el-icon>
              <span>{{ item.label }}</span>
            </el-menu-item>
          </el-menu>
        </div>

        <el-divider />

        <div class="menu-section">
          <el-button type="danger" plain @click="handleLogout" style="width: 100%">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 通知面板 -->
    <el-drawer v-model="showNotifications" title="消息通知" direction="rtl" size="85%">
      <div class="notification-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="{ unread: !notification.read }"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon">
            <el-icon :size="20">
              <component :is="getNotificationIcon(notification.type)" />
            </el-icon>
          </div>
          <div class="notification-content">
            <h4>{{ notification.title }}</h4>
            <p>{{ notification.content }}</p>
            <span class="notification-time">{{ notification.time }}</span>
          </div>
        </div>
        <el-empty v-if="notifications.length === 0" description="暂无通知" />
      </div>
    </el-drawer>

    <!-- 语音助手 -->
    <VoiceAssistant v-if="showVoiceAssistant" />

    <!-- 大字模式切换 -->
    <div class="accessibility-float" v-if="showAccessibilityToggle" @click="toggleLargeTextMode">
      <el-icon :size="28"><FontSize /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  ArrowLeft,
  Menu,
  Bell,
  View,
  User,
  HomeFilled,
  OfficeBuilding,
  UserFilled,
  SwitchButton,
  Document,
  ChatDotRound,
  Connection,
  Setting,
  FontSizes,
  Plus,
  Location,
  Warning,
} from '@element-plus/icons-vue';
import VoiceAssistant from '@/components/VoiceAssistant.vue';
import { useAccessibilityStore } from '@/stores/accessibility';

// 类型定义
interface UserInfo {
  name: string;
  role: string;
  avatar: string;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
}

interface NavItem {
  route: string;
  label: string;
  icon: object;
}

interface QuickAction {
  route: string;
  label: string;
  icon: object;
  color: string;
}

interface MenuItem {
  route: string;
  label: string;
  icon: object;
}

const router = useRouter();
const route = useRoute();
const accessibilityStore = useAccessibilityStore();

const menuOpen = ref(false);
const showNotifications = ref(false);
const showBack = computed(() => route.meta.showBack || false);
const showBottomNav = ref(true);
const currentRoute = computed(() => route.path);
const pageTitle = computed(() => route.meta.title || '智慧乡村');

const userInfo = ref<UserInfo>({
  name: '智慧村民',
  role: '普通村民',
  avatar: '',
});

const unreadCount = ref(3);

const notifications = ref<Notification[]>([
  {
    id: 1,
    type: 'announcement',
    title: '新公告发布',
    content: '关于2024年医保缴费的通知',
    time: '10分钟前',
    read: false,
  },
  {
    id: 2,
    type: 'help',
    title: '互助请求',
    content: '李大爷发布了生活求助',
    time: '30分钟前',
    read: false,
  },
  {
    id: 3,
    type: 'system',
    title: '系统消息',
    content: '您的积分已到账',
    time: '1小时前',
    read: true,
  },
]);

const bottomNavItems: NavItem[] = [
  { route: '/mobile/home', label: '首页', icon: Home },
  { route: '/mobile/services', label: '服务', icon: Plus },
  { route: '/mobile/help', label: '互助', icon: Connection },
  { route: '/mobile/profile', label: '我的', icon: User },
];

const quickActions: QuickAction[] = [
  { route: '/mobile/qrcode', label: '一户一码', icon: Document, color: '#409EFF' },
  { route: '/mobile/report', label: '信息上报', icon: Location, color: '#67C23A' },
  { route: '/mobile/announcement', label: '村务公告', icon: ChatDotRound, color: '#E6A23C' },
  { route: '/mobile/emergency', label: '紧急求助', icon: Warning, color: '#F56C6C' },
];

const menuItems: MenuItem[] = [
  { route: '/mobile/home', label: '首页', icon: Home },
  { route: '/mobile/village', label: '村务管理', icon: OfficeBuilding },
  { route: '/mobile/residents', label: '村民信息', icon: UserFilled },
  { route: '/mobile/qrcode', label: '一户一码', icon: Document },
  { route: '/mobile/mutual-aid', label: '邻里互助', icon: Connection },
  { route: '/mobile/settings', label: '系统设置', icon: Setting },
];

const showVoiceAssistant = ref(true);
const showAccessibilityToggle = ref(true);
const largeTextMode = ref(false);
const LOCAL_STORAGE_KEY = 'mobile_large_text_mode';

const toggleMenu = () => {
  menuOpen.value = true;
};

const toggleAccessibility = () => {
  // 显示 accessibility 设置面板
};

const toggleLargeTextMode = () => {
  largeTextMode.value = !largeTextMode.value;
  document.body.classList.toggle('large-text-mode', largeTextMode.value);
  localStorage.setItem(LOCAL_STORAGE_KEY, largeTextMode.value.toString());
};

const handleBack = () => {
  router.back();
};

const navigateTo = (routePath: string) => {
  menuOpen.value = false;
  router.push(routePath);
};

const handleMenuSelect = (index: string) => {
  navigateTo(index);
};

const handleNotificationClick = (notification: Notification) => {
  notification.read = true;
  unreadCount.value = Math.max(0, unreadCount.value - 1);
};

const getNotificationIcon = (type: string) => {
  const icons: Record<string, object> = {
    announcement: ChatDotRound,
    help: Connection,
    system: Setting,
    warning: Warning,
  };
  return icons[type] || Bell;
};

const handleLogout = () => {
  router.push('/auth/login');
};

const loadPersistedState = () => {
  const savedMode = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedMode === 'true') {
    largeTextMode.value = true;
    document.body.classList.add('large-text-mode');
  }
};

onMounted(() => {
  loadPersistedState();

  if (window.history.length <= 1) {
  }
});
</script>

<style scoped>
.mobile-layout {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.header-left,
.header-right {
  width: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mobile-content {
  flex: 1;
  margin-top: 56px;
  margin-bottom: 60px;
  padding: 16px;
}

.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  display: flex;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.3s;
}

.nav-item.active {
  color: #409eff;
}

.nav-label {
  font-size: 11px;
  margin-top: 4px;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.user-details h3 {
  margin: 0 0 4px;
  font-size: 16px;
}

.user-details p {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

.menu-section {
  padding: 8px 0;
}

.menu-section h4 {
  font-size: 12px;
  color: #9ca3af;
  margin: 0 0 12px;
  padding: 0 12px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 12px;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-item span {
  font-size: 11px;
  margin-top: 4px;
  color: #6b7280;
}

.notification-list {
  padding: 0;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.3s;
}

.notification-item:hover {
  background: #f5f7fa;
}

.notification-item.unread {
  background: #e6f7ff;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
}

.notification-content {
  flex: 1;
}

.notification-content h4 {
  margin: 0 0 4px;
  font-size: 14px;
}

.notification-content p {
  margin: 0 0 4px;
  font-size: 12px;
  color: #6b7280;
}

.notification-time {
  font-size: 11px;
  color: #9ca3af;
}

.accessibility-float {
  position: fixed;
  bottom: 80px;
  right: 16px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #409eff;
  z-index: 100;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 大字模式 */
:global(.large-text-mode) .mobile-header {
  height: 64px;
}

:global(.large-text-mode) .header-title {
  font-size: 22px;
}

:global(.large-text-mode) .mobile-content {
  font-size: 16px;
}

:global(.large-text-mode) .mobile-nav {
  height: 70px;
}

:global(.large-text-mode) .nav-label {
  font-size: 14px;
}
</style>
