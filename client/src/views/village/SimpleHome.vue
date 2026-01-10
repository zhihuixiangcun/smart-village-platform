<template>
  <div class="simple-home">
    <!-- 顶部导航 -->
    <header class="app-header">
      <div class="header-left">
        <h2>智慧村务系统</h2>
        <span class="user-role">{{ currentUser?.role || '村民' }}</span>
      </div>
      <div class="header-right">
        <span>{{ currentUser?.username || '未登录' }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <!-- 功能卡片区域 -->
    <main class="main-content">
      <div class="welcome-section">
        <h1>欢迎使用智慧村务管理系统</h1>
        <p class="welcome-text">您的数字化村务管理平台</p>
      </div>

      <div class="features-grid">
        <div class="feature-card" @click="showFeatureInfo('资料收集')">
          <div class="feature-icon">📄</div>
          <h3>资料收集</h3>
          <p>收集和管理村务资料</p>
        </div>

        <div class="feature-card" @click="showFeatureInfo('值班管理')">
          <div class="feature-icon">👥</div>
          <h3>值班管理</h3>
          <p>排班和值班记录</p>
        </div>

        <div class="feature-card" @click="showFeatureInfo('数据统计')">
          <div class="feature-icon">📊</div>
          <h3>数据统计</h3>
          <p>村务数据统计分析</p>
        </div>

        <div class="feature-card" @click="showFeatureInfo('智能搜索')">
          <div class="feature-icon">🔍</div>
          <h3>智能搜索</h3>
          <p>快速查找资料信息</p>
        </div>

        <div class="feature-card" @click="showFeatureInfo('应急管理')">
          <div class="feature-icon">🚨</div>
          <h3>应急管理</h3>
          <p>紧急事件处理</p>
        </div>

        <div class="feature-card" @click="showFeatureInfo('报告中心')">
          <div class="feature-icon">📈</div>
          <h3>报告中心</h3>
          <p>生成各类报告</p>
        </div>
      </div>

      <!-- 状态信息 -->
      <div class="status-section">
        <h3>系统状态</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">前端服务:</span>
            <span class="status-value success">运行中</span>
          </div>
          <div class="status-item">
            <span class="status-label">Socket服务:</span>
            <span class="status-value success">运行中</span>
          </div>
          <div class="status-item">
            <span class="status-label">API服务:</span>
            <span class="status-value warning">需要启动</span>
          </div>
          <div class="status-item">
            <span class="status-label">数据库:</span>
            <span class="status-value warning">需要连接</span>
          </div>
        </div>
      </div>
    </main>

    <!-- 功能提示弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h3>{{ selectedFeature }}</h3>
        <p>{{ featureDescription }}</p>
        <p class="note">该功能正在开发中，敬请期待！</p>
        <button @click="closeModal">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const currentUser = ref(null);
const showModal = ref(false);
const selectedFeature = ref('');
const featureDescription = ref('');

const featureDescriptions = {
  资料收集: '数字化村务资料收集和管理，支持文档上传、分类整理、权限控制等功能。',
  值班管理: '智能化值班排班系统，自动生成值班表，支持调班、请假、紧急呼叫等功能。',
  数据统计: '实时村务数据分析统计，可视化图表展示，支持自定义报表生成。',
  智能搜索: '全文搜索和智能分类，支持关键词搜索、标签过滤、相似度匹配。',
  应急管理: '紧急事件快速响应，支持一键呼叫、资源调度、预案管理等功能。',
  报告中心: '自动化报告生成系统，支持多种格式导出，定时任务和模板管理。',
};

onMounted(() => {
  // 从localStorage获取用户信息
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      currentUser.value = JSON.parse(userStr);
    } catch (e) {
      console.error('解析用户信息失败:', e);
    }
  }
});

const handleLogout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  currentUser.value = null;
  router.push('/login');
};

const showFeatureInfo = feature => {
  selectedFeature.value = feature;
  featureDescription.value = featureDescriptions[feature] || '功能开发中...';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedFeature.value = '';
  featureDescription.value = '';
};
</script>

<style scoped>
.simple-home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-left h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.user-role {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logout-btn {
  background: rgba(255, 59, 48, 0.8);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 59, 48, 1);
}

.main-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  text-align: center;
  margin-bottom: 3rem;
}

.welcome-section h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.welcome-text {
  font-size: 1.125rem;
  opacity: 0.9;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.feature-card p {
  margin: 0;
  opacity: 0.8;
  font-size: 0.875rem;
}

.status-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  padding: 2rem;
}

.status-section h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
}

.status-value.success {
  color: #4ade80;
  font-weight: bold;
}

.status-value.warning {
  color: #fbbf24;
  font-weight: bold;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  color: #333;
  padding: 2rem;
  border-radius: 1rem;
  max-width: 500px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  margin-top: 0;
  color: #667eea;
}

.modal-content p {
  margin: 1rem 0;
  line-height: 1.5;
}

.modal-content .note {
  color: #f59e0b;
  font-weight: 500;
}

.modal-content button {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s ease;
}

.modal-content button:hover {
  background: #764ba2;
}

@media (max-width: 768px) {
  .app-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .header-left,
  .header-right {
    flex-direction: column;
    gap: 0.5rem;
  }

  .main-content {
    padding: 1rem;
  }

  .welcome-section h1 {
    font-size: 2rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
