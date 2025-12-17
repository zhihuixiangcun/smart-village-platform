<template>
  <div class="component-view">
    <div class="component-container">
      <h2>应急管理</h2>
      <el-card>
        <el-empty description="组件功能开发中" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('应急管理')
</script>

<style lang="scss" scoped>
.component-view {
  padding: 24px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.component-container {
  h2 {
    margin-bottom: 20px;
    color: #303133;
  }
}
</style>