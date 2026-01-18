<!--
  PC端专用布局组件
  智慧乡村综合服务平台 - PC端布局
-->
<template>
  <div class="pc-layout" :class="layoutClasses" :class="{ 'dark-mode': useThemeStore().isDark }">
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
                    <el-dropdown-item command="theme">
                      <el-icon><Sunny /></el-icon>主题切换
                    </el-dropdown-item>
                    <el-dropdown-item divided command="help">
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
import { useThemeStore } from '@/stores/themeStore';
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
  Sunny,
  Moon,
  MoreFilled,
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
  {
    title: '数据统计',
    path: '/pc/statistics',
    icon: 'DataAnalysis',
    permission: 'statistics:read',
  },
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
    case 'theme':
      useThemeStore().toggleDark();
      ElMessage.success(useThemeStore().isDark ? '已切换到深色模式' : '已切换到浅色模式');
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
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 240px;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(circle at 10% 20%, rgba(102, 126, 234, 0.03) 0%, transparent 50%),
                      radial-gradient(circle at 90% 80%, rgba(118, 75, 162, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
    transition: left 0.3s;

    .pc-layout.sidebar-collapsed & {
      left: 64px;
    }
  }

  > .pc-main-wrapper {
    position: relative;
    z-index: 1;
  }
}

.pc-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 50%, #5a3d7a 100%);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  box-shadow: 4px 0 24px rgba(102, 126, 234, 0.25);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
    animation: sidebarShine 20s infinite linear;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }

  @keyframes sidebarShine {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

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

/* 深色模式 */
.dark-mode .pc-sidebar {
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
}

.dark-mode .pc-sidebar .logo-text,
.dark-mode .pc-sidebar .logo-text-small {
  color: #f8fafc;
}

.dark-mode .pc-sidebar .sidebar-menu {
  background: transparent;
}

.dark-mode .pc-sidebar .sidebar-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.8);
}

.dark-mode .pc-sidebar .sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.1);
}

.dark-mode .pc-sidebar .sidebar-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, #3b82f6 0%, #0ea5e9 100%);
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    transition: left 0.5s;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  &:hover::before {
    left: 100%;
  }

  .logo-text {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    letter-spacing: -0.5px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .logo-text-small {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
  position: relative;
  z-index: 1;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.sidebar-menu {
  border-right: none;
  background: transparent;
  padding: 0 12px;

  :deep(.el-menu-item) {
    color: rgba(255, 255, 255, 0.85);
    height: 50px;
    line-height: 50px;
    margin: 4px 0;
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    font-weight: 500;
    position: relative;
    overflow: hidden;
    letter-spacing: 0.2px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: rgba(255, 255, 255, 0.5);
      transform: scaleY(0);
      transition: transform 0.3s;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:hover::before {
      transform: scaleY(1);
    }

    &.is-active {
      background: rgba(255, 255, 255, 0.25);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transform: translateX(4px);
    }

    &.is-active::before {
      transform: scaleY(1);
      background: #fff;
    }

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.5);
      outline-offset: 2px;
    }

    .el-icon {
      font-size: 20px;
      transition: transform 0.3s;
    }

    &:hover .el-icon {
      transform: scale(1.1);
    }
  }
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1;
}

.collapse-btn {
  width: 100%;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  &:hover::before {
    left: 100%;
  }

  &:active {
    transform: scale(0.98);
  }
}

.pc-main-wrapper {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  .pc-layout.sidebar-collapsed & {
    margin-left: 64px;
  }
}

.pc-header {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  padding: 0 28px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04),
              0 1px 3px rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid #e9ecef;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.header-shadow {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08),
                0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

.header-left {
  display: flex;
  align-items: center;
}

.breadcrumb {
  :deep(.el-breadcrumb__item) {
    .el-breadcrumb__inner {
      color: #6c757d;
      font-weight: 500;
      font-size: 14px;
      transition: all 0.3s;

      &.is-link:hover {
        color: #667eea;
        transform: translateY(-1px);
      }
    }

    &:last-child .el-breadcrumb__inner {
      color: #2d3436;
      font-weight: 600;
    }
  }

  :deep(.el-breadcrumb__separator) {
    color: #adb5bd;
    margin: 0 8px;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.header-search {
  width: 300px;
  transition: width 0.3s;

  .search-input {
    :deep(.el-input__wrapper) {
      border-radius: 24px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid transparent;
      padding: 0 16px;

      &:hover {
        background: linear-gradient(135deg, #e9ecef 0%, #dde2e6 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      &:focus-within {
        background: white;
        border-color: rgba(102, 126, 234, 0.3);
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
      }
    }

    :deep(.el-input__inner) {
      font-size: 14px;
      font-weight: 500;
      color: #495057;
    }
  }
}

.header-badge {
  :deep(.el-badge__content) {
    top: 6px;
    right: 6px;
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
    border: 2px solid white;
    font-weight: 600;
    font-size: 11px;
  }
}

.header-btn {
  border: none;
  background: transparent;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;

  &:hover {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &:active {
    transform: translateY(0);
  }
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;

  &:hover {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-color: rgba(102, 126, 234, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  :deep(.el-avatar) {
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
    border: 2px solid white;
    transition: transform 0.3s;

    &:hover {
      transform: scale(1.05);
    }
  }
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #2d3436;
  letter-spacing: -0.2px;
}

.user-role {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

/* 深色模式 */
.dark-mode {
  .pc-layout {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);

    &::before {
      background-image: radial-gradient(circle at 10% 20%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
                        radial-gradient(circle at 90% 80%, rgba(118, 75, 162, 0.08) 0%, transparent 50%);
    }
  }

  .pc-header {
    background: rgba(15, 23, 42, 0.98);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .header-left {
    .breadcrumb {
      :deep(.el-breadcrumb__inner) {
        color: rgba(255, 255, 255, 0.7);

        &.is-link:hover {
          color: #a78bfa;
        }
      }

      :deep(.el-breadcrumb__separator) {
        color: rgba(255, 255, 255, 0.3);
      }

      :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
        color: rgba(255, 255, 255, 0.9);
      }
    }
  }

  .header-right {
    .search-input {
      :deep(.el-input__wrapper) {
        background: rgba(0, 0, 0, 0.3);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);

        &:hover,
        &:focus-within {
          background: rgba(0, 0, 0, 0.4);
          border-color: rgba(167, 139, 250, 0.5);
        }
      }

      :deep(.el-input__inner) {
        color: rgba(255, 255, 255, 0.9);
      }
    }
  }

  .header-btn {
    color: rgba(255, 255, 255, 0.8);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #a78bfa;
    }
  }

  .user-dropdown-trigger {
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
  }

  .user-name {
    color: rgba(255, 255, 255, 0.9);
  }

  .user-role {
    color: rgba(255, 255, 255, 0.6);
  }
}

.pc-content {
  flex: 1;
  padding: 28px;
  overflow-x: hidden;
  background-color: transparent;

  &.content-fullscreen {
    padding: 0;
  }
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04),
              0 1px 3px rgba(0, 0, 0, 0.02);
  min-height: calc(100vh - 96px);
  padding: 28px;
  transition: all 0.3s ease;
}

.dark-mode .content-wrapper {
  background: #1e293b;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* 深色模式 - 表格样式 */
.dark-mode :deep(.el-table) {
  background: transparent;
}

.dark-mode :deep(.el-table th) {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.3);
}

.dark-mode :deep(.el-table tr) {
  color: rgba(255, 255, 255, 0.8);
}

.dark-mode :deep(.el-table tbody tr:hover > td) {
  background: rgba(255, 255, 255, 0.05);
}

.dark-mode :deep(.el-table td),
.dark-mode :deep(.el-table th) {
  border-color: rgba(255, 235, 238, 0.1);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition:
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

.message-center {
  height: 100%;
}

.message-tabs {
  height: 100%;

  :deep(.el-tabs__header) {
    margin: 0 0 16px 0;
    border-bottom: 2px solid #e9ecef;

    .el-tabs__item {
      font-size: 14px;
      font-weight: 600;
      color: #6c757d;
      padding: 0 20px;
      height: 44px;
      line-height: 44px;
      transition: all 0.3s;

      &:hover {
        color: #667eea;
      }

      &.is-active {
        color: #667eea;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
        border-radius: 12px 12px 0 0;
      }
    }
  }

  :deep(.el-tabs__content) {
    height: calc(100% - 64px);
    overflow-y: auto;
    padding: 0 4px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;

      &:hover {
        background: #adb5bd;
      }
    }
  }
}

.message-list {
  padding: 0 4px;
}

.message-item {
  display: flex;
  gap: 14px;
  padding: 18px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 12px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover {
    background: linear-gradient(135deg, #e3e6ea 0%, #d1d5db 100%);
    transform: translateX(6px);
    border-color: rgba(102, 126, 234, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  &:hover::before {
    opacity: 1;
  }

  &.unread {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border-color: rgba(33, 150, 243, 0.3);

    &::before {
      background: linear-gradient(180deg, #2196f3 0%, #1976d2 100%);
      opacity: 1;
    }

    &:hover {
      background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%);
    }

    h4 {
      font-weight: 700;
      color: #0d47a1;
    }
  }

  position: relative;
  overflow: hidden;
}

.message-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s;

  .message-item:hover & {
    transform: scale(1.1);
  }
}

.message-content {
  flex: 1;
  min-width: 0;

  h4 {
    margin: 0 0 6px 0;
    font-size: 15px;
    font-weight: 600;
    color: #2d3436;
    letter-spacing: -0.2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #6c757d;
    line-height: 1.6;
    font-weight: 400;
  }

  .message-time {
    font-size: 12px;
    color: #adb5bd;
    font-weight: 500;
  }
}

.todo-list {
  padding: 0 4px;
}

.todo-item {
  padding: 16px 0;
  border-bottom: 1px solid #e9ecef;
  transition: all 0.3s;

  &:hover {
    border-bottom-color: #d1d5db;
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.03) 0%, transparent 100%);
    padding-left: 8px;
  }

  &:last-child {
    border-bottom: none;
  }
}

.todo-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  :deep(.el-checkbox) {
    .el-checkbox__label {
      span {
        font-size: 14px;
        font-weight: 500;
        color: #2d3436;
        transition: all 0.3s;

        &.completed {
          color: #adb5bd;
          text-decoration: line-through;
        }
      }
    }

    &.is-checked .el-checkbox__inner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
    }
  }

  :deep(.el-tag) {
    border-radius: 20px;
    font-weight: 500;
    padding: 4px 12px;
    border: none;
  }
}

@media (max-width: 1200px) {
  .pc-sidebar {
    width: 200px;

    &.collapsed {
      width: 64px;
    }
  }

  .pc-main-wrapper {
    margin-left: 200px;

    .pc-layout.sidebar-collapsed & {
      margin-left: 64px;
    }
  }

  .header-search {
    width: 240px;
  }

  .content-wrapper {
    padding: 24px;
  }
}

@media (max-width: 992px) {
  .pc-sidebar {
    width: 180px;

    &.collapsed {
      width: 64px;
    }
  }

  .pc-main-wrapper {
    margin-left: 180px;

    .pc-layout.sidebar-collapsed & {
      margin-left: 64px;
    }
  }

  .header-search {
    width: 200px;
  }

  .user-info {
    display: none;
  }

  .pc-layout::before {
    left: 180px;

    .pc-layout.sidebar-collapsed & {
      left: 64px;
    }
  }
}

@media (max-width: 768px) {
  .pc-sidebar {
    transform: translateX(-100%);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.show {
      transform: translateX(0);
    }

    &.collapsed {
      width: 240px;
    }
  }

  .pc-main-wrapper {
    margin-left: 0;
  }

  .pc-header {
    padding: 0 20px;
    height: 64px;
  }

  .header-search {
    display: none;
  }

  .user-info {
    display: none;
  }

  .header-right {
    gap: 12px;
  }

  .header-btn {
    width: 40px;
    height: 40px;
  }

  .content-wrapper {
    padding: 20px;
    border-radius: 12px;
    min-height: calc(100vh - 64px);
  }

  .pc-content {
    padding: 20px;
  }

  .pc-layout::before {
    left: 0;
  }
}

@media (max-width: 576px) {
  .pc-header {
    padding: 0 16px;
  }

  .breadcrumb {
    :deep(.el-breadcrumb__inner) {
      font-size: 13px;
    }
  }

  .header-right {
    gap: 8px;
  }

  .header-btn {
    width: 38px;
    height: 38px;

    .el-icon {
      font-size: 18px;
    }
  }

  .user-dropdown-trigger {
    padding: 6px 12px;

    :deep(.el-avatar) {
      width: 32px;
      height: 32px;
    }
  }

  .content-wrapper {
    padding: 16px;
    border-radius: 8px;
  }

  .pc-content {
    padding: 16px;
  }

  .message-item {
    padding: 14px;
    gap: 12px;

    .message-icon {
      width: 38px;
      height: 38px;
    }

    .message-content {
      h4 {
        font-size: 14px;
      }

      p {
        font-size: 13px;
      }
    }
  }

  .todo-item {
    padding: 14px 0;
  }
}

/* 平板设备优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .pc-sidebar {
    width: 180px;
  }

  .pc-main-wrapper {
    margin-left: 180px;
  }

  .header-search {
    width: 220px;
  }

  .content-wrapper {
    max-width: 1400px;
    padding: 24px;
  }

  .pc-layout::before {
    left: 180px;
  }
}

/* 大屏幕优化 */
@media (min-width: 1921px) {
  .pc-sidebar {
    width: 280px;
  }

  .pc-main-wrapper {
    margin-left: 280px;
  }

  .header-search {
    width: 360px;
  }

  .content-wrapper {
    max-width: 1800px;
    padding: 32px;
  }

  .pc-header {
    height: 72px;
    padding: 0 36px;
  }

  .pc-layout::before {
    left: 280px;
  }
}

/* 打印样式 */
@media print {
  .pc-sidebar,
  .pc-header {
    display: none;
  }

  .pc-main-wrapper {
    margin-left: 0;
  }

  .pc-content {
    padding: 0;
  }

  .content-wrapper {
    box-shadow: none;
    padding: 0;
  }
}
</style>
