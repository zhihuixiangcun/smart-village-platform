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
import TabBar from './components/common/TabBar.vue'

const route = useRoute()
const elderlyStore = useElderlyStore()

// 控制底部导航栏显示
const showTabBar = computed(() => {
  const hiddenRoutes = ['/login', '/register']
  return !hiddenRoutes.includes(route.path)
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
