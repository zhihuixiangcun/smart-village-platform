<template>
  <div class="error-page">
    <el-result
      icon="warning"
      title="404"
      sub-title="抱歉，您访问的页面不存在"
    >
      <template #extra>
        <el-button type="primary" @click="goBack">返回上页</el-button>
        <el-button @click="goHome">回到首页</el-button>
      </template>
    </el-result>

    <div class="error-info">
      <h3>可能的原因：</h3>
      <ul>
        <li>您输入的网址有误</li>
        <li>您访问的页面已被删除</li>
        <li>您访问的页面已被移动到其他位置</li>
        <li>服务器暂时无法找到您请求的页面</li>
      </ul>

      <h3>解决方案：</h3>
      <ul>
        <li>检查网址是否正确</li>
        <li>尝试从首页重新进入</li>
        <li>联系管理员获取帮助</li>
        <li>稍后再试</li>
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