<template>
  <el-menu
    :default-active="activeIndex"
    :collapse="isCollapsed"
    :collapse-transition="false"
    class="app-sidebar"
    :class="{ 'sidebar-dark': isDark }"
    :router="false"
    @select="handleSelect"
  >
    <template v-for="item in menuItems" :key="item.path">
      <el-menu-item v-if="!item.children || !item.children.length" :index="item.path">
        <el-icon v-if="item.icon">
          <component :is="item.icon" />
        </el-icon>
        <span>{{ item.title }}</span>
      </el-menu-item>

      <el-sub-menu v-else :index="item.path">
        <template #title>
          <el-icon v-if="item.icon">
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.title }}</span>
        </template>
        <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
          <span>{{ child.title }}</span>
        </el-menu-item>
      </el-sub-menu>
    </template>
  </el-menu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface MenuItem {
  title: string;
  path: string;
  icon?: string;
  permissions?: string[];
  children?: MenuItem[];
}

const props = defineProps<{
  visible?: boolean;
  menuItems?: MenuItem[];
  userRole?: string;
  isCollapsed?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'menu-click', path: string): void;
}>();

const route = useRoute();
const router = useRouter();

const activeIndex = computed(() => route.path);

const isDark = computed(() => {
  return document.documentElement.getAttribute('data-theme') === 'dark';
});

const handleSelect = (index: string) => {
  emit('menu-click', index);
  router.push(index);
};
</script>

<style scoped lang="scss">
.app-sidebar {
  height: 100%;
  border-right: none;
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);

  &.sidebar-dark {
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);

    :deep(.el-menu-item),
    :deep(.el-sub-menu__title) {
      color: #e0e0e0;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 48px;
    line-height: 48px;
    color: #333;

    &:hover {
      background: rgba(64, 158, 255, 0.1);
    }

    &.is-active {
      color: #409eff;
      background: rgba(64, 158, 255, 0.1);
    }
  }

  :deep(.el-sub-menu .el-menu-item) {
    height: 42px;
    line-height: 42px;
  }
}
</style>
