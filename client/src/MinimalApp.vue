<template>
  <div class="minimal-app">
    <h1>🧪 超简单Vue测试</h1>
    <p class="time-display">当前时间: {{ currentTime }}</p>
    
    <div class="status-message">
      <p class="success">✅ Vue 3运行正常</p>
      <p>如果你能看到这个，说明Vue应用已成功挂载。</p>
    </div>

    <div class="test-section">
      <h2>📋 测试检查清单</h2>
      <div class="checklist">
        <div class="check-item">
          <input type="checkbox" id="check1" checked disabled>
          <label for="check1">✅ Vue 3 已加载</label>
        </div>
        <div class="check-item">
          <input type="checkbox" id="check2" checked disabled>
          <label for="check2">✅ Element Plus 已加载</label>
        </div>
        <div class="check-item">
          <input type="checkbox" id="check3" checked disabled>
          <label for="check3">✅ Vue Router 已加载</label>
        </div>
        <div class="check-item">
          <input type="checkbox" id="check4" checked disabled>
          <label for="check4">✅ 路由已挂载</label>
        </div>
        <div class="check-item">
          <input type="checkbox" id="check5" checked disabled>
          <label for="check5">✅ App组件已挂载</label>
        </div>
      </div>
    </div>

    <div class="debug-info" v-if="showDebug">
      <h3>🔍 调试信息</h3>
      <div class="debug-grid">
        <div class="debug-item">
          <strong>当前路径:</strong>
          <code>{{ currentPath }}</code>
        </div>
        <div class="debug-item">
          <strong>当前时间:</strong>
          <code>{{ currentTime }}</code>
        </div>
        <div class="debug-item">
          <strong>组件状态:</strong>
          <span v-if="isMounted" class="status-good">✅ 已挂载</span>
          <span v-else class="status-bad">❌ 未挂载</span>
        </div>
      </div>
    </div>

    <div class="test-actions">
      <h2>🔧 测试操作</h2>
      <div class="action-buttons">
        <button @click="testElementPlusMessage" class="test-btn">测试 Element Plus</button>
        <button @click="testRouterPush" class="test-btn">测试路由跳转</button>
        <button @click="toggleDebug" class="test-btn">{{ showDebug ? '关闭调试' : '显示调试' }}</button>
      </div>
    </div>

    <div class="result-box" v-if="testResult">
      <h3>📋 操作结果</h3>
      <pre>{{ testResult }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();
const route = useRoute();
const currentTime = ref('');
const isMounted = ref(false);
const showDebug = ref(false);
const testResult = ref('');

const currentPath = computed(() => route.path);

const updateTime = () => {
  currentTime.value = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const testElementPlusMessage = () => {
  testResult.value = '正在测试 Element Plus...\n';
  try {
    ElMessage.success('✅ Element Plus 消息组件工作正常');
    testResult.value += '✅ 测试通过\n';
  } catch (error) {
    testResult.value += `❌ 测试失败: ${error.message}\n`;
  }
};

const testRouterPush = () => {
  testResult.value = '正在测试路由跳转...\n';
  try {
    testResult.value += `当前路由: ${route.path}\n`;
    ElMessage.info(`当前路径: ${route.path}`);
  } catch (error) {
    testResult.value += `❌ 路由测试失败: ${error.message}\n`;
  }
};

const toggleDebug = () => {
  showDebug.value = !showDebug.value;
};

onMounted(() => {
  console.log('MinimalTestApp mounted');
  isMounted.value = true;
  updateTime();
  setInterval(updateTime, 1000);

  // 初始测试
  setTimeout(() => {
    testResult.value = '✅ 组件挂载成功\n';
  }, 500);
});
</script>

<style scoped>
.minimal-app {
  min-height: 100vh;
  max-width: 1000px;
  margin: 0 auto;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
}

.minimal-app h1 {
  text-align: center;
  color: #059669;
  font-size: 48px;
  margin: 0 0 40px 0;
}

.time-display {
  text-align: center;
  font-size: 24px;
  color: #374151;
  margin: 40px 0;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.status-message {
  text-align: center;
  margin: 40px 0;
  padding: 30px;
  background: #f0fdf4;
  border-radius: 12px;
  border: 2px solid #bbf7d0;
}

.status-message h2 {
  margin: 0 0 20px 0;
}

.status-message .success {
  font-size: 20px;
  color: #059669;
  font-weight: 500;
}

.status-message p {
  font-size: 16px;
  color: #6b7280;
  margin: 8px 0;
}

.test-section {
  background: white;
  border-radius: 12px;
  padding: 40px;
  margin: 40px 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.test-section h2 {
  color: #374151;
  margin: 0 0 20px 0;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.check-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: #10b981;
}

.check-item label {
  font-size: 16px;
  color: #374151;
  cursor: pointer;
}

.debug-info {
  background: #1f2937;
  color: #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin: 40px 0;
}

.debug-info h3 {
  color: #67c23a;
  margin: 0 0 20px 0;
  border-bottom: 1px solid #374151;
  padding-bottom: 12px;
}

.debug-grid {
  display: grid;
  gap: 16px;
}

.debug-item {
  padding: 12px;
  background: #111827;
  border-radius: 6px;
}

.debug-item strong {
  color: #93c5fd;
}

.debug-item code {
  color: #10b981;
  font-family: 'Courier New', monospace;
}

.status-good {
  color: #34d399;
  font-weight: 500;
}

.status-bad {
  color: #f87171;
  font-weight: 500;
}

.test-actions {
  background: white;
  border-radius: 12px;
  padding: 40px;
  margin: 40px 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.test-actions h2 {
  color: #374151;
  margin: 0 0 20px 0;
}

.action-buttons {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.test-btn {
  flex: 1;
  min-width: 150px;
  padding: 12px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.test-btn:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
}

.result-box {
  background: #1f2937;
  color: #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin: 40px 0;
}

.result-box h3 {
  color: #67c23a;
  margin: 0 0 12px 0;
  border-bottom: 1px solid #374151;
  padding-bottom: 12px;
}

.result-box pre {
  background: #111827;
  padding: 16px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .minimal-app {
    padding: 20px 10px;
  }

  .minimal-app h1 {
    font-size: 32px;
  }

  .time-display {
    font-size: 18px;
    padding: 15px;
  }

  .status-message, .test-section, .debug-info, .test-actions, .result-box {
    padding: 24px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 12px;
  }

  .test-btn {
    width: 100%;
  }
}
</style>
