<template>
  <div class="error-page">
    <el-result
      icon="warning"
      title="403"
      sub-title="抱歉，您没有权限访问此页面"
    >
      <template #extra>
        <el-button type="primary" @click="goBack">返回上页</el-button>
        <el-button @click="goHome">回到首页</el-button>
      </template>
    </el-result>

    <div class="error-info">
      <h3>可能的原因：</h3>
      <ul>
        <li>您的账户权限不足</li>
        <li>页面需要特定角色才能访问</li>
        <li>您的登录会话已过期</li>
      </ul>

      <h3>解决方案：</h3>
      <ul>
        <li>请联系管理员申请相应权限</li>
        <li>确认您的账户角色是否正确</li>
        <li>尝试重新登录您的账户</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.go(-1)
}

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background: #f5f7fa;
}

.error-info {
  max-width: 600px;
  margin-top: 40px;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.error-info h3 {
  color: #303133;
  margin: 20px 0 10px 0;
  font-size: 16px;
}

.error-info ul {
  margin: 0 0 20px 0;
  padding-left: 20px;
}

.error-info li {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 5px;
}
</style>