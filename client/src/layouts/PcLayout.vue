<!--
  PC端专用布局组件
  智慧乡村综合服务平台 - PC端布局
-->
<template>
  <div class="pc-layout" :class="layoutClasses">
    <!-- 左侧固定侧边栏 -->
    <aside class="pc-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo-container" @click="toggleSidebar" role="button" tabindex="0">
          <span v-if="!sidebarCollapsed" class="logo-text">智慧乡村</span>
          <span v-else class="logo-text-small">村</span>
        </div>
      </div>

      <nav class="sidebar-nav" role="navigation" aria-label="主导航">
        <el-menu
          :default-active="activeMenu"
          :collapse="sidebarCollapsed"
          :collapse-transition="false"
          class="sidebar-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item
            v-for="menu in filteredMenus"
            :key="menu.path"
            :index="menu.path"
            :disabled="!hasPermission(menu.permission)"
          >
            <el-icon>
              <component :is="menu.icon" />
            </el-icon>
            <template #title>{{ menu.title }}</template>
          </el-menu-item>
        </el-menu>
      </nav>

      <div class="sidebar-footer">
        <el-tooltip :content="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" placement="right">
          <button class="collapse-btn" @click="toggleSidebar" aria-label="切换侧边栏">
            <el-icon :size="20">
              <component :is="sidebarCollapsed ? 'Expand' : 'Fold'" />
            </el-icon>
          </button>
        </el-tooltip>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <div class="pc-main-wrapper">
      <!-- 顶部导航栏 -->
      <header class="pc-header" :class="{ 'header-shadow': showHeaderShadow }">
        <div class="header-left">
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              <router-link v-if="item.path" :to="item.path">{{ item.title }}</router-link>
              <span v-else>{{ item.title }}</span>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <div class="header-search">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索功能、村民、信息..."
              prefix-icon="Search"
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearchClear"
              class="search-input"
            />
          </div>

          <el-tooltip content="消息通知" placement="bottom">
            <el-badge :value="unreadCount" :max="99" class="header-badge">
              <el-button circle class="header-btn" @click="showMessageCenter = true">
                <el-icon :size="20"><Bell /></el-icon>
              </el-button>
            </el-badge>
          </el-tooltip>

          <el-tooltip content="全屏" placement="bottom">
            <el-button circle class="header-btn" @click="toggleFullscreen">
              <el-icon :size="20"><FullScreen /></el-icon>
            </el-button>
          </el-tooltip>

          <el-dropdown trigger="click" @command="handleUserCommand">
            <div class="user-dropdown-trigger">
              <el-avatar :size="36" :src="userInfo.avatar">
                {{ userInfo.name?.charAt(0) || '村' }}
              </el-avatar>
              <div class="user-info">
                <span class="user-name">{{ userInfo.name || '村干部' }}</span>
                <span class="user-role">{{ getRoleLabel(userInfo.role) }}</span>
              </div>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon>系统设置
                </el-dropdown-item>
                <el-dropdown-item command="help">
                  <el-icon><QuestionFilled /></el-icon>帮助中心
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 页面内容区域 -->
      <main class="pc-content" :class="{ 'content-fullscreen': isFullscreen }">
        <div class="content-wrapper">
          <router-view v-slot="{ Component, route }">
            <transition name="page-fade" mode="out-in">
              <keep-alive :include="cachedViews">
                <component :is="Component" :key="route.path" />
              </keep-alive>
            </transition>
          </router-view>
        </div>
      </main>
    </div>

    <!-- 消息中心抽屉 -->
    <el-drawer
      v-model="showMessageCenter"
      title="消息中心"
      direction="rtl"
      size="400px"
      destroy-on-close
    >
      <div class="message-center">
        <el-tabs v-model="activeMessageTab" class="message-tabs">
          <el-tab-pane label="通知" name="notice">
            <div class="message-list">
              <div
                v-for="msg in notifications"
                :key="msg.id"
                class="message-item"
                :class="{ unread: !msg.read }"
                @click="handleMessageClick(msg)"
              >
                <div class="message-icon">
                  <el-icon :size="20" :color="getMessageColor(msg.type)">
                    <component :is="getMessageIcon(msg.type)" />
                  </el-icon>
                </div>
                <div class="message-content">
                  <h4>{{ msg.title }}</h4>
                  <p>{{ msg.content }}</p>
                  <span class="message-time">{{ formatTime(msg.time) }}</span>
                </div>
              </div>
              <el-empty v-if="notifications.length === 0" description="暂无通知" />
            </div>
          </el-tab-pane>
          <el-tab-pane label="待办" name="todo">
            <div class="todo-list">
              <div
                v-for="todo in todos"
                :key="todo.id"
                class="todo-item"
                @click="handleTodoClick(todo)"
              >
                <el-checkbox v-model="todo.completed" @change="handleTodoComplete(todo)">
                  <div class="todo-content">
                    <span :class="{ completed: todo.completed }">{{ todo.title }}</span>
                    <el-tag :type="getTodoType(todo.priority)" size="small">{{
                      todo.priority
                    }}</el-tag>
                  </div>
                </el-checkbox>
              </div>
              <el-empty v-if="todos.length === 0" description="暂无待办事项" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  House,
  UserFilled,
  Users,
  OfficeBuilding,
  Money,
  Service,
  Setting,
  Bell,
  FullScreen,
  Expand,
  Fold,
  ArrowDown,
  User,
  QuestionFilled,
  SwitchButton,
  Warning,
  InfoFilled,
  SuccessFilled,
  Document,
} from '@element-plus/icons-vue';

interface MenuItem {
  title: string;
  path: string;
  icon: string;
  permission?: string;
}

interface Breadcrumb {
  title: string;
  path?: string;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  time: Date;
  read: boolean;
  type: 'notice' | 'warning' | 'success' | 'info';
}

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  path?: string;
}

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const sidebarCollapsed = ref(false);
const showHeaderShadow = ref(false);
const isFullscreen = ref(false);
const searchKeyword = ref('');
const showMessageCenter = ref(false);
const activeMessageTab = ref('notice');
const unreadCount = ref(5);
const activeMenu = ref('/pc/dashboard');

const cachedViews = ref<string[]>([]);

const userInfo = computed(() => userStore.userInfo || {});

const menus: MenuItem[] = [
  { title: '仪表板', path: '/pc/dashboard', icon: 'House', permission: 'dashboard:view' },
  { title: '村民管理', path: '/pc/residents', icon: 'Users', permission: 'resident:read' },
  { title: '村务管理', path: '/pc/affairs', icon: 'OfficeBuilding', permission: 'village:read' },
  { title: '财务管理', path: '/pc/finance', icon: 'Money', permission: 'finance:read' },
  { title: '生活服务', path: '/pc/services', icon: 'Service', permission: 'service:read' },
  { title: '数据统计', path: '/pc/statistics', icon: 'DataAnalysis', permission: 'statistics:read' },
  { title: '用户管理', path: '/pc/users', icon: 'UserFilled', permission: 'user:read' },
  { title: '系统设置', path: '/pc/settings', icon: 'Setting', permission: 'settings:manage' },
];

const filteredMenus = computed(() => {
  return menus.filter(menu => !menu.permission || hasPermission(menu.permission));
});

const breadcrumbs = computed<Breadcrumb[]>(() => {
  const items: Breadcrumb[] = [{ title: '首页', path: '/pc/dashboard' }];
  const currentRoute = route.matched.find(r => r.path !== '/pc');
  if (currentRoute?.meta?.title) {
    items.push({ title: currentRoute.meta.title as string });
  }
  return items;
});

const notifications = ref<Notification[]>([
  {
    id: '1',
    title: '新通知到达',
    content: '您有一条新的村务通知待处理',
    time: new Date(),
    read: false,
    type: 'notice',
  },
  {
    id: '2',
    title: '待办事项提醒',
    content: '您有3项待办事项即将到期',
    time: new Date(Date.now() - 3600000),
    read: false,
    type: 'warning',
  },
]);

const todos = ref<TodoItem[]>([
  {
    id: '1',
    title: '审批张三的调任申请',
    completed: false,
    priority: 'high',
    path: '/pc/residents',
  },
  { id: '2', title: '完善党员档案信息', completed: false, priority: 'medium', path: '/pc/affairs' },
  { id: '3', title: '提交本月工作总结', completed: false, priority: 'low', path: '/pc/affairs' },
]);

const layoutClasses = computed(() => ({
  'sidebar-collapsed': sidebarCollapsed.value,
  'fullscreen-mode': isFullscreen.value,
}));

const hasPermission = (permission: string): boolean => {
  const userPermissions = userStore.permissions || [];
  return userPermissions.includes(permission) || userStore.userRole === 'admin';
};

const getRoleLabel = (role: string): string => {
  const roleMap: Record<string, string> = {
    resident: '村民',
    village_admin: '村干部',
    admin: '系统管理员',
  };
  return roleMap[role] || '用户';
};

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem('pcSidebarCollapsed', String(sidebarCollapsed.value));
};

const handleMenuSelect = (index: string) => {
  router.push(index);
  activeMenu.value = index;
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
};

const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    ElMessage.info(`搜索: ${searchKeyword.value}`);
  }
};

const handleSearchClear = () => {
  searchKeyword.value = '';
};

const handleUserCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile');
      break;
    case 'settings':
      router.push('/profile/settings');
      break;
    case 'help':
      ElMessage.info('帮助中心开发中');
      break;
    case 'logout':
      handleLogout();
      break;
  }
};

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    userStore.logout();
    router.push('/auth/login');
    ElMessage.success('已退出登录');
  } catch {}
};

const getMessageIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    notice: 'Document',
    warning: 'Warning',
    success: 'SuccessFilled',
    info: 'InfoFilled',
  };
  return iconMap[type] || 'Bell';
};

const getMessageColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    notice: '#409eff',
    warning: '#e6a23c',
    success: '#67c23a',
    info: '#909399',
  };
  return colorMap[type] || '#909399';
};

const getTodoType = (priority: string): string => {
  const typeMap: Record<string, string> = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  };
  return typeMap[priority] || 'info';
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
};

const handleMessageClick = (msg: Notification) => {
  msg.read = true;
  unreadCount.value = Math.max(0, unreadCount.value - 1);
};

const handleTodoClick = (todo: TodoItem) => {
  if (todo.path) {
    router.push(todo.path);
    showMessageCenter.value = false;
  }
};

const handleTodoComplete = (todo: TodoItem) => {
  ElMessage.success(todo.completed ? '已完成任务' : '已取消完成');
};

const handleScroll = () => {
  showHeaderShadow.value = window.scrollY > 10;
};

const loadSidebarState = () => {
  const savedState = localStorage.getItem('pcSidebarCollapsed');
  if (savedState !== null) {
    sidebarCollapsed.value = savedState === 'true';
  }
};

onMounted(() => {
  loadSidebarState();
  activeMenu.value = route.path;
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

watch(
  () => route.path,
  newPath => {
    activeMenu.value = newPath;
  }
);
</script>

<style lang="scss" scoped>
.pc-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.pc-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 1000;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);

  &.collapsed {
    width: 64px;

    .logo-container {
      justify-content: center;
      padding: 16px 8px;
    }

    .sidebar-menu {
      :deep(.el-menu-item) {
        padding: 0 !important;
        justify-content: center;
      }
    }
  }
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.3s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .logo-text {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }

  .logo-text-small {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.sidebar-menu {
  border-right: none;
  background: transparent;

  :deep(.el-menu-item) {
    color: rgba(255, 255, 255, 0.7);
    height: 48px;
    line-height: 48px;
    margin: 4px 8px;
    border-radius: 8px;
    transition: all 0.3s;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    &.is-active {
      background: linear-gradient(90deg, #409eff 0%, #66b1ff 100%);
      color: #fff;
    }
  }
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.collapse-btn {
  width: 100%;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }
}

.pc-main-wrapper {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;

  .pc-layout.sidebar-collapsed & {
    margin-left: 64px;
  }
}

.pc-header {
  position: sticky;
  top: 0;
  background: #fff;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 999;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

  &.header-shadow {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
}

.header-left {
  display: flex;
  align-items: center;
}

.breadcrumb {
  :deep(.el-breadcrumb__inner) {
    color: #909399;

    &.is-link:hover {
      color: #409eff;
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-search {
  width: 280px;

  .search-input {
    :deep(.el-input__wrapper) {
      border-radius: 20px;
      background: #f5f7fa;
      box-shadow: none;

      &:hover,
      &:focus-within {
        background: #e4e7ed;
      }
    }
  }
}

.header-badge {
  :deep(.el-badge__content) {
    top: 8px;
    right: 8px;
  }
}

.header-btn {
  border: none;
  background: transparent;

  &:hover {
    background: #f5f7fa;
  }
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #f5f7fa;
  }
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.user-role {
  font-size: 12px;
  color: #909399;
}

.pc-content {
  flex: 1;
  padding: 24px;
  overflow-x: hidden;

  &.content-fullscreen {
    padding: 0;
  }
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  min-height: calc(100vh - 112px);
  padding: 24px;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.message-center {
  height: 100%;
}

.message-tabs {
  height: 100%;

  :deep(.el-tabs__content) {
    height: calc(100% - 55px);
    overflow-y: auto;
  }
}

.message-list {
  padding: 0 8px;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 8px;

  &:hover {
    background-color: #f5f7fa;
  }

  &.unread {
    background-color: #ecf5ff;

    &:hover {
      background-color: #d9ecff;
    }
  }
}

.message-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-content {
  flex: 1;

  h4 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }

  p {
    margin: 0 0 8px;
    font-size: 13px;
    color: #606266;
    line-height: 1.5;
  }

  .message-time {
    font-size: 12px;
    color: #909399;
  }
}

.todo-list {
  padding: 0 8px;
}

.todo-item {
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;

  &:last-child {
    border-bottom: none;
  }
}

.todo-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  span {
    font-size: 14px;
    color: #303133;

    &.completed {
      text-decoration: line-through;
      color: #909399;
    }
  }
}

@media (max-width: 1200px) {
  .pc-sidebar {
    width: 64px;

    .logo-text {
      display: none;
    }
  }

  .pc-main-wrapper {
    margin-left: 64px;
  }

  .header-search {
    width: 200px;
  }
}

@media (max-width: 768px) {
  .pc-sidebar {
    transform: translateX(-100%);
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2);

    &.show {
      transform: translateX(0);
    }
  }

  .pc-main-wrapper {
    margin-left: 0;
  }

  .header-search {
    display: none;
  }

  .user-info {
    display: none;
  }

  .content-wrapper {
    padding: 16px;
    border-radius: 0;
  }
}
</style>
