<template>
  <div class="error-page">
    <el-result
      icon="error"
      title="500"
      sub-title="服务器内部错误，请稍后重试"
    >
      <template #extra>
        <el-button type="primary" @click="refresh">刷新页面</el-button>
        <el-button @click="goHome">回到首页</el-button>
      </template>
    </el-result>

    <div class="error-info">
      <h3>可能的原因：</h3>
      <ul>
        <li>服务器遇到了意外错误</li>
        <li>数据库连接异常</li>
        <li>服务器配置问题</li>
        <li>服务器临时维护</li>
      </ul>

      <h3>解决方案：</h3>
      <ul>
        <li>刷新页面重试</li>
        <li>稍后再访问</li>
        <li>清除浏览器缓存</li>
        <li>联系技术支持</li>
      </ul>

      <div class="contact-info">
        <h3>技术支持：</h3>
        <p>如果问题持续存在，请联系我们：</p>
        <p>邮箱：support@smart-village.com</p>
        <p>电话：400-123-4567</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const refresh = () => {
  window.location.reload()
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

.contact-info {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.contact-info p {
  margin: 5px 0;
  color: #606266;
}
</style>