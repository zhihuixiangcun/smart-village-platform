<!-- 智慧乡村平台主布局组件 -->
<template>
  <div class="smart-village-layout" :class="layoutClasses">
    <!-- 顶部导航栏 -->
    <app-header
      :user-info="userStore.userInfo"
      :is-large-font="themeStore.isLargeFontMode"
      @toggle-sidebar="toggleSidebar"
      @toggle-voice="toggleVoiceAssistant"
      @change-theme="changeTheme"
    />

    <!-- 侧边栏 -->
    <app-sidebar
      v-model:visible="sidebarVisible"
      :menu-items="menuItems"
      :user-role="userStore.userRole"
      :is-collapsed="sidebarCollapsed"
      @menu-click="handleMenuClick"
    />

    <!-- 主要内容区域 -->
    <main class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <!-- 面包屑导航 -->
      <el-breadcrumb separator="/" class="breadcrumb" v-if="currentRoute.meta.breadcrumb">
        <el-breadcrumb-item
          v-for="item in currentRoute.meta.breadcrumb"
          :key="item.path"
          :to="item.path"
        >
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>

      <!-- 路由视图 -->
      <div class="page-container">
        <router-view v-slot="{ Component, route }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 语音助手 -->
    <voice-assistant
      v-if="voiceAssistantVisible"
      :position="voiceAssistantPosition"
      @close="voiceAssistantVisible = false"
    />

    <!-- 大字模式控制器 -->
    <font-size-controller v-if="themeStore.isLargeFontMode" @change-font-size="changeFontSize" />

    <!-- 无障碍模式提示 -->
    <accessibility-hint v-if="showAccessibilityHint" @close="showAccessibilityHint = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useThemeStore } from '@/stores/themeStore';
import { ElMessage } from 'element-plus';

// 组件导入
import AppHeader from '@/components/common/AppHeader.vue';
import AppSidebar from '@/components/common/AppSidebar.vue';
import VoiceAssistant from '@/components/business/VoiceAssistant.vue';
import FontSizeController from '@/components/common/FontSizeController.vue';
import AccessibilityHint from '@/components/common/AccessibilityHint.vue';

// 类型定义
interface MenuItem {
  title: string;
  path: string;
  icon: string;
  permissions: string[];
  children?: MenuItem[];
}

interface LayoutClasses {
  'large-font-mode': boolean;
  'high-contrast-mode': boolean;
  'mobile-layout': boolean;
  'tablet-layout': boolean;
  'elderly-mode': boolean;
}

// Store和路由
const userStore = useUserStore();
const themeStore = useThemeStore();
const route = useRoute();
const router = useRouter();

// 响应式状态
const sidebarVisible = ref(true);
const sidebarCollapsed = ref(false);
const voiceAssistantVisible = ref(false);
const voiceAssistantPosition = ref<'bottom-right' | 'bottom-left'>('bottom-right');
const showAccessibilityHint = ref(false);
const windowWidth = ref(window.innerWidth);
let resizeTimer: ReturnType<typeof setTimeout> | null = null;

// 计算属性
const currentRoute = computed(() => route);

const layoutClasses = computed<LayoutClasses>(() => ({
  'large-font-mode': themeStore.isLargeFontMode,
  'high-contrast-mode': themeStore.highContrast,
  'mobile-layout': windowWidth.value < 768,
  'tablet-layout': windowWidth.value >= 768 && windowWidth.value < 1024,
  'elderly-mode': userStore.isElderlyUser,
}));

// 响应式断点
const isMobile = computed(() => windowWidth.value < 768);
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value < 1024);

// 菜单项配置
const menuItems = computed<MenuItem[]>(() => {
  const baseMenus: MenuItem[] = [
    {
      title: '首页',
      path: '/dashboard',
      icon: 'House',
      permissions: [],
    },
    {
      title: '村务公开',
      path: '/village-affairs',
      icon: 'View',
      permissions: ['village:read'],
    },
    {
      title: '生活服务',
      path: '/services',
      icon: 'Service',
      permissions: ['service:read'],
      children: [
        {
          title: '办事大厅',
          path: '/services/hall',
          permissions: ['service:application'],
        },
        {
          title: '语音助手',
          path: '/services/voice',
          permissions: ['speech:recognize'],
        },
      ],
    },
    {
      title: '财务管理',
      path: '/finance',
      icon: 'Money',
      permissions: ['finance:read'],
    },
    {
      title: '个人中心',
      path: '/profile',
      icon: 'User',
      permissions: [],
    },
  ];

  const userRole = userStore.userRole;
  if (userRole === 'village_admin' || userRole === 'admin') {
    baseMenus.splice(2, 0, {
      title: '村民管理',
      path: '/residents',
      icon: 'Users',
      permissions: ['resident:read'],
    });

    baseMenus.splice(4, 0, {
      title: '村委管理',
      path: '/village/committee-management',
      icon: 'UserFilled',
      permissions: ['village:manage'],
    });
  }

  return baseMenus.filter(
    menu => !menu.permissions.length || userStore.hasAnyPermission(menu.permissions)
  );
});

// 方法
const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value;
};

const toggleVoiceAssistant = () => {
  voiceAssistantVisible.value = !voiceAssistantVisible.value;
};

const changeTheme = (theme: string) => {
  themeStore.setTheme(theme);
  ElMessage.success(`已切换到${theme}主题`);
};

const changeFontSize = (size: 'normal' | 'large' | 'xlarge') => {
  themeStore.setFontSize(size);
  if (size === 'large' || size === 'xlarge') {
    themeStore.isLargeFontMode = true;
    showAccessibilityHint.value = true;
  }
};

const handleMenuClick = (menuItem: MenuItem) => {
  if (menuItem.path) {
    router.push(menuItem.path);
  }

  if (isMobile.value) {
    sidebarVisible.value = false;
  }
};

// 监听窗口大小变化（带节流）
const handleResize = () => {
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = setTimeout(() => {
    windowWidth.value = window.innerWidth;
    if (isMobile.value) {
      sidebarCollapsed.value = true;
      sidebarVisible.value = false;
    }
  }, 150);
};

// 监听路由变化
watch(route, () => {
  if (isMobile.value) {
    sidebarVisible.value = false;
  }
});

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize);
  handleResize();

  if (userStore.isElderlyUser && !themeStore.isLargeFontMode) {
    themeStore.toggleLargeFontMode();
    showAccessibilityHint.value = true;
  }
});

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
});
</script>

<style lang="scss" scoped>
.smart-village-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--el-bg-color-page);

  // 大字模式样式
  &.large-font-mode {
    --el-font-size-base: 20px;
    --el-component-size-large: 48px;

    .main-content {
      padding: 24px;
    }

    .breadcrumb {
      margin-bottom: 20px;

      :deep(.el-breadcrumb__item) {
        font-size: 18px;
      }
    }
  }

  // 高对比度模式
  &.high-contrast-mode {
    --el-color-primary: #000000;
    --el-bg-color: #ffffff;
    --el-text-color-primary: #000000;
    --el-border-color: #000000;
  }

  // 移动端布局
  &.mobile-layout {
    .main-content {
      padding: 16px;
      margin-left: 0;
    }
  }

  // 老年用户模式
  &.elderly-mode {
    .main-content {
      .page-container {
        max-width: 100%;
        padding: 20px;
      }
    }
  }
}

.main-content {
  flex: 1;
  margin-left: 240px;
  padding: 20px;
  transition: all 0.3s ease;
  overflow-x: hidden;

  &.sidebar-collapsed {
    margin-left: 64px;
  }

  .breadcrumb {
    margin-bottom: 16px;
    padding: 12px 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    background: var(--el-bg-color);
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 24px;
    min-height: calc(100vh - 120px);
  }
}

// 页面切换动画
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

// 响应式设计
@media (max-width: 768px) {
  .smart-village-layout {
    .main-content {
      margin-left: 0;
      padding: 16px;

      .page-container {
        padding: 16px;
        border-radius: 0;
        box-shadow: none;
      }
    }
  }
}

@media (min-width: 769px) and (max-width: 1023px) {
  .smart-village-layout {
    .main-content {
      margin-left: 200px;
      padding: 18px;

      .page-container {
        padding: 20px;
      }
    }
  }
}

// 打印样式
@media print {
  .smart-village-layout {
    .main-content {
      margin-left: 0;
      padding: 0;

      .page-container {
        box-shadow: none;
        border: none;
      }
    }
  }
}
</style>
