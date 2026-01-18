<template>
  <div class="test-page">
    <h1>🧪 注册页面测试</h1>
    <div class="status-section">
      <h2>✅ 页面加载成功</h2>
      <p>如果你能看到这个，说明前端服务正常运行。</p>
    </div>

    <div class="test-links">
      <h2>🔗 测试链接</h2>
      <div class="link-group">
        <router-link to="/" class="test-link">🏠 返回首页</router-link>
        <router-link to="/auth/login" class="test-link">🔐 去登录页</router-link>
        <router-link to="/auth/register" class="test-link">📝 去注册页</router-link>
        <router-link to="/village/affairs" class="test-link">🏘️ 去村务公开</router-link>
      </div>
    </div>

    <div class="info-section">
      <h2>📊 路由信息</h2>
      <p>当前路由: <strong>{{ $route.path }}</strong></p>
      <p>路由名称: <strong>{{ $route.name }}</strong></p>
      <p>当前时间: <strong>{{ new Date().toLocaleString() }}</strong></p>
    </div>

    <div class="test-buttons">
      <h2>🔧 测试操作</h2>
      <button @click="testRegisterComponent" class="test-btn">测试注册组件</button>
      <button @click="testAPI" class="test-btn">测试API连接</button>
    </div>

    <div class="result-section" v-if="testResult">
      <h2>📋 测试结果</h2>
      <pre>{{ testResult }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const testResult = ref('');

const testRegisterComponent = () => {
  testResult.value = '正在测试注册组件...\n';
  try {
    const component = () => import('@/views/auth/ResidentRegister.vue');
    testResult.value += '✅ 注册组件可以加载\n';
    testResult.value += `组件路径: ${component}\n`;
  } catch (error) {
    testResult.value += `❌ 注册组件加载失败: ${error.message}\n`;
  }
};

const testAPI = async () => {
  testResult.value = '正在测试API连接...\n';
  try {
    const response = await fetch('http://localhost:5000/health', {
      method: 'GET',
      mode: 'cors'
    });
    testResult.value += `✅ 村务API状态: ${response.status} ${response.statusText}\n`;
  } catch (error) {
    testResult.value += `❌ 村务API连接失败: ${error.message}\n`;
  }

  try {
    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
      mode: 'cors'
    });
    testResult.value += `✅ 主API状态: ${response.status} ${response.statusText}\n`;
  } catch (error) {
    testResult.value += `❌ 主API连接失败: ${error.message}\n`;
  }
};
</script>

<style scoped>
.test-page {
  max-width: 800px;
  margin: 40px auto;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.test-page h1 {
  text-align: center;
  color: #10b981;
  font-size: 32px;
  margin-bottom: 40px;
}

.test-page h2 {
  color: #374151;
  font-size: 20px;
  margin: 30px 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #f3f4f6;
}

.status-section {
  background: #f0fdf4;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  margin-bottom: 30px;
}

.status-section h2 {
  color: #166534;
  margin: 0 0 10px 0;
  border: none;
}

.test-links {
  margin-bottom: 30px;
}

.link-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-link {
  display: inline-block;
  padding: 12px 20px;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 16px;
  transition: all 0.3s;
}

.test-link:hover {
  background: #2563eb;
  transform: translateX(5px);
}

.info-section {
  background: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.info-section p {
  margin: 8px 0;
  font-size: 14px;
}

.test-buttons {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.test-btn {
  flex: 1;
  padding: 12px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.test-btn:hover {
  background: #059669;
  transform: translateY(-2px);
}

.result-section {
  background: #fffbeb;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #fde68a;
}

.result-section pre {
  background: #fef3c7;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}
</style>
