<template>
  <div class="finance-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">支出管理</h1>
          <div class="header-actions">
            <el-button type="primary">新建</el-button>
            <el-button>导出</el-button>
          </div>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-row :gutter="24">
          <el-col :span="24">
            <el-card>
              <el-empty description="功能开发中" />
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const title = ref('支出管理');
</script>

<style lang="scss" scoped>
.finance-view {
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

.header-actions {
  display: flex;
  gap: 12px;
}

.page-main {
  padding: 24px;
}
</style>
