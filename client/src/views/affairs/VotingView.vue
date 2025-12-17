<template>
  <div class="affairs-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">投票管理</h1>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <el-empty description="功能开发中" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('投票管理')
</script>

<style lang="scss" scoped>
.affairs-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}
</style>