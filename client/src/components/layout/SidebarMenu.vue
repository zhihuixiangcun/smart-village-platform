<template>
  <div class="sidebar-menu">
    <el-menu
      :default-active="activeMenu"
      :collapse="isCollapse"
      :unique-opened="true"
      :collapse-transition="false"
      mode="vertical"
      class="sidebar-menu-container"
      background-color="#304156"
      text-color="#bfcbd9"
      active-text-color="#409eff"
      @select="handleMenuSelect"
    >
      <menu-item
        v-for="route in menuRoutes"
        :key="route.path"
        :item="route"
        :base-path="route.path"
      />
    </el-menu>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { generateMenuItems } from '@/utils/routeUtils';
import MenuItem from './MenuItem.vue';

const props = defineProps({
  isCollapse: {
    type: Boolean,
    default: false,
  },
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// 当前激活的菜单项
const activeMenu = ref('');

// 计算菜单路由
const menuRoutes = computed(() => {
  const routes = router.getRoutes();

  // 过滤顶级路由，排除认证、错误页面等
  const topLevelRoutes = routes.filter(route => {
    return (
      !route.path.includes(':') && // 排除动态路由
      !route.meta?.hidden && // 排除隐藏路由
      !route.meta?.hideInMenu && // 排除菜单中隐藏的路由
      route.meta?.title && // 必须有标题
      route.path !== '/' && // 排除根路径
      !route.path.startsWith('/auth') && // 排除认证路由
      !route.path.startsWith('/error') && // 排除错误页面
      route.path !== '/403' &&
      route.path !== '/404' &&
      route.path !== '/500' &&
      route.path !== '/profile' // 个人中心单独处理
    );
  });

  return generateMenuItems(topLevelRoutes, userStore);
});

// 获取当前激活的菜单项
const getCurrentActiveMenu = () => {
  const { path } = route;

  // 如果是子路由，需要找到对应的父级菜单
  if (path.includes('/finance/')) {
    return '/finance';
  } else if (path.includes('/affairs/')) {
    return '/affairs';
  } else if (path.includes('/services/')) {
    return '/services';
  } else if (path.includes('/system/')) {
    return '/system';
  } else if (path.includes('/residents/')) {
    return '/residents';
  } else if (path.includes('/ai/')) {
    return '/ai';
  } else {
    return path;
  }
};

// 处理菜单选择
const handleMenuSelect = index => {
  if (index !== route.path) {
    router.push(index);
  }
};

// 监听路由变化，更新激活菜单
watch(
  () => route.path,
  () => {
    activeMenu.value = getCurrentActiveMenu();
  },
  { immediate: true }
);

// 监听用户权限变化，重新计算菜单
watch(
  () => userStore.permissions,
  () => {
    // 权限变化时，菜单会自动重新计算
  },
  { deep: true }
);
</script>

<style lang="scss" scoped>
.sidebar-menu {
  height: 100%;

  .sidebar-menu-container {
    height: 100%;
    border-right: none;

    &:not(.el-menu--collapse) {
      width: 210px;
    }
  }
}

// 自定义滚动条
.sidebar-menu-container {
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.2);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

// 菜单动画
:deep(.el-menu-item),
:deep(.el-submenu__title) {
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
  }
}

:deep(.el-menu-item.is-active) {
  background-color: var(--el-color-primary) !important;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #fff;
  }
}

// 折叠状态样式
:deep(.el-menu--collapse) {
  .el-menu-item,
  .el-submenu__title {
    text-align: center;
    padding: 0 !important;

    .el-icon {
      margin-right: 0;
    }
  }
}
</style>
