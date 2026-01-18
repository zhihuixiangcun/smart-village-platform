<template>
  <div class="minimal-test">
    <h1>✅ 前端测试页面</h1>
    <p>当前时间: {{ currentTime }}</p>
    <p>如果你能看到这个，说明Vue运行正常！</p>
    
    <div class="test-links">
      <router-link to="/">🏠 首页</router-link>
      <router-link to="/test-register">📝 测试页面</router-link>
      <router-link to="/simple-register">📝 简化注册</router-link>
    </div>

    <div class="test-buttons">
      <button @click="testVue">测试 Vue</button>
      <button @click="testRouter">测试路由</button>
      <button @click="testElementPlus">测试 Element Plus</button>
    </div>

    <div class="test-result" v-if="testResults">
      <h3>测试结果</h3>
      <pre>{{ testResults }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();
const currentTime = ref('');
const testResults = ref('');

const updateTime = () => {
  currentTime.value = new Date().toLocaleString('zh-CN');
};

const testVue = () => {
  testResults.value = '✅ Vue 运行正常\n';
  console.log('Vue test passed');
};

const testRouter = () => {
  testResults.value += `✅ Vue Router: ${router.currentRoute.value.path}\n`;
  console.log('Router test passed:', router.currentRoute.value.path);
};

const testElementPlus = () => {
  try {
    ElMessage.success('✅ Element Plus 运行正常');
    testResults.value += '✅ Element Plus: 运行正常\n';
  } catch (error) {
    testResults.value += `❌ Element Plus: ${error.message}\n`;
    console.error('Element Plus test failed:', error);
  }
};

onMounted(() => {
  console.log('MinimalTest mounted');
  updateTime();
  setInterval(updateTime, 1000);
});
</script>

<style scoped>
.minimal-test {
  max-width: 800px;
  margin: 60px auto;
  padding: 60px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.minimal-test h1 {
  text-align: center;
  color: #10b981;
  margin: 0 0 30px 0;
  font-size: 36px;
}

.minimal-test p {
  font-size: 18px;
  color: #374151;
  line-height: 1.6;
  margin: 10px 0;
}

.test-links {
  display: flex;
  gap: 15px;
  margin: 40px 0;
  justify-content: center;
  flex-wrap: wrap;
}

.test-links a {
  display: inline-block;
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s;
}

.test-links a:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.test-buttons {
  display: flex;
  gap: 15px;
  margin: 40px 0;
  justify-content: center;
  flex-wrap: wrap;
}

.test-buttons button {
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.test-buttons button:hover {
  background: #059669;
  transform: translateY(-2px);
}

.test-result {
  margin-top: 30px;
  padding: 20px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.test-result h3 {
  color: #166534;
  margin: 0 0 15px 0;
}

.test-result pre {
  background: white;
  padding: 15px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  overflow-x: auto;
}
</style>
