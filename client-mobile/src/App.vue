<template>
  <div id="app" :data-elderly-mode="elderlyStore.mode">
    <router-view />
    <TabBar v-if="showTabBar" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useElderlyStore } from './store/elderly'
import { useUserStore } from './store/user'
import TabBar from './components/common/TabBar.vue'

const route = useRoute()
const elderlyStore = useElderlyStore()
const userStore = useUserStore()

// 控制底部导航栏显示
const showTabBar = computed(() => {
  // 登录相关页面不显示
  const hiddenRoutes = [
    '/login',
    '/register',
    '/auth/login-optimized',
    '/auth/login-enhanced',
    '/auth/register',
    '/auth/multi-login',  // 隐藏登录页面的底部导航栏
    '/auth/agreement',   // 隐藏协议页面
    '/chat'              // 隐藏聊天相关页面的底部导航栏
  ]

  // 如果在隐藏列表中，不显示
  if (hiddenRoutes.some(path => route.path.startsWith(path))) {
    return false
  }

  // 角色首页有自己的导航栏，不显示全局 TabBar
  const roleHomeRoutes = [
    '/home/villager',
    '/home/cadre',
    '/home/official',
    '/home/admin',
    '/purchaser'
  ]

  // 如果在角色首页，不显示全局 TabBar
  if (roleHomeRoutes.some(path => route.path.startsWith(path))) {
    return false
  }

  // 其他页面显示全局 TabBar
  return true
})
</script>

<style lang="scss">
#app {
  width: 100%;
  min-height: 100vh;
  background: #f5f5f5;
}

.uni-toast {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
