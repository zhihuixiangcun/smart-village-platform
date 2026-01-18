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
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 50%, #e0e7ff 100%);
  position: relative;
  overflow-x: hidden;

  // 装饰性渐变背景元素
  &::before {
    content: '';
    position: fixed;
    top: -50%;
    right: -10%;
    width: 50%;
    height: 100%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  &::after {
    content: '';
    position: fixed;
    bottom: -30%;
    left: -10%;
    width: 60%;
    height: 80%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  // 确保子路由内容在装饰元素之上
  :deep(> *) {
    position: relative;
    z-index: 1;
  }
}
</style>
