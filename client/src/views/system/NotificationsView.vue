<template>
  <div class="notifications-view">
    <div class="page-header">
      <h1 class="page-title">通知管理</h1>
      <p class="page-description">系统通知消息管理</p>
    </div>
    <div class="page-content">
      <el-card>
        <el-empty description="功能开发中" />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"

const title = ref("通知管理")
</script>

<style lang="scss" scoped>
.notifications-view {
  padding: 20px;
  min-height: 100vh;
  background-color: #f5f7fa;

  .page-header {
    margin-bottom: 24px;

    .page-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    .page-description {
      margin: 0;
      color: #606266;
      font-size: 14px;
    }
  }

  .page-content {
    .el-card {
      min-height: 400px;
    }
  }
}
</style>
