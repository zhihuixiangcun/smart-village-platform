<template>
  <div class="auth-view">
    <div class="auth-container">
      <el-card class="auth-card" shadow="always">
        <div class="auth-header">
          <h1>找回密码</h1>
          <p>智慧村庄综合服务平台</p>
        </div>
        <div class="auth-content">
          <!-- 找回密码 功能开发中 -->
          <el-empty description="功能开发中" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const title = ref('找回密码');
</script>

<style lang="scss" scoped>
.auth-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  padding: 0 20px;
}

.auth-card {
  border-radius: 16px;
  overflow: hidden;
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;

  h1 {
    color: #303133;
    margin-bottom: 10px;
  }

  p {
    color: #909399;
    margin: 0;
  }
}

.auth-content {
  padding: 20px 0;
}
</style>
