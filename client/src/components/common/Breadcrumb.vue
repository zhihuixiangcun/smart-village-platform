<template>
  <div class="breadcrumb-container">
    <el-breadcrumb class="app-breadcrumb" separator="/" :separator-icon="ArrowRight">
      <transition-group name="breadcrumb">
        <el-breadcrumb-item
          v-for="(item, index) in breadcrumbList"
          :key="item.path"
          :class="{ 'no-redirect': index === breadcrumbList.length - 1 }"
        >
          <span v-if="item.path === '' || index === breadcrumbList.length - 1" class="no-redirect">
            {{ item.title }}
          </span>
          <router-link v-else :to="item.path" class="breadcrumb-link">
            {{ item.title }}
          </router-link>
        </el-breadcrumb-item>
      </transition-group>
    </el-breadcrumb>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

// 面包屑列表
const breadcrumbList = ref([]);

// 计算当前路由的面包屑
const getCurrentBreadcrumb = () => {
  // 从路由元信息中获取面包屑
  if (route.meta && route.meta.breadcrumb) {
    return [...route.meta.breadcrumb];
  }

  // 如果没有预定义面包屑，则根据路由路径自动生成
  return generateBreadcrumbFromPath();
};

// 根据路径自动生成面包屑
const generateBreadcrumbFromPath = () => {
  const pathArray = route.path.split('/').filter(path => path);
  const breadcrumb = [];

  // 添加首页
  breadcrumb.push({
    title: '首页',
    path: '/dashboard',
  });

  let currentPath = '';

  pathArray.forEach((path, index) => {
    currentPath += `/${path}`;

    // 查找对应的路由配置
    const matchedRoute = router.getRoutes().find(r => r.path === currentPath);

    if (matchedRoute && matchedRoute.meta && matchedRoute.meta.title) {
      breadcrumb.push({
        title: matchedRoute.meta.title,
        path: index === pathArray.length - 1 ? '' : currentPath,
      });
    }
  });

  return breadcrumb;
};

// 更新面包屑
const updateBreadcrumb = () => {
  breadcrumbList.value = getCurrentBreadcrumb();
};

// 监听路由变化
watch(
  () => route.path,
  () => {
    updateBreadcrumb();
  },
  { immediate: true }
);

// 处理动态路由参数的面包屑标题
const getDynamicTitle = computed(() => {
  return breadcrumb => {
    if (breadcrumb.dynamic && route.params[breadcrumb.paramKey]) {
      return breadcrumb.title.replace(
        `{${breadcrumb.paramKey}}`,
        route.params[breadcrumb.paramKey]
      );
    }
    return breadcrumb.title;
  };
});
</script>

<style lang="scss" scoped>
.breadcrumb-container {
  display: inline-block;
}

.app-breadcrumb {
  display: inline-block;
  font-size: 14px;
  line-height: 50px;
  margin-left: 8px;

  .no-redirect {
    color: #97a8be;
    cursor: text;
  }

  .breadcrumb-link {
    color: #606266;
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

// 面包屑动画
.breadcrumb-enter-active,
.breadcrumb-leave-active {
  transition: all 0.5s;
}

.breadcrumb-enter-from,
.breadcrumb-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.breadcrumb-leave-active {
  position: absolute;
}
</style>
