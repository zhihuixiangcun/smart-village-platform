<template>
  <div class="village-committee-container">
    <!-- 子路由渲染出口 -->
    <router-view></router-view>
  </div>
</template>

<script setup>
// 这是一个父路由组件，用于渲染子路由
// 实际内容由子路由组件（如 Dashboard.vue）提供
</script>

<style lang="scss" scoped>
.village-committee-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}
</style>
