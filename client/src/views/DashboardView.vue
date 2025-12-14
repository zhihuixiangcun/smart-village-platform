<template>
  <div class="dashboard">
    <div class="welcome-header">
      <h1>🏘️ 欢迎使用智慧村庄管理系统</h1>
      <p>为村民和村委提供数字化服务的综合平台</p>
    </div>

    <div class="feature-grid">
      <div class="feature-card">
        <div class="card-icon">👥</div>
        <h3>村民管理</h3>
        <p>数字档案、隐私保护、人脸识别</p>
        <button class="card-btn">进入系统</button>
      </div>

      <div class="feature-card">
        <div class="card-icon">🏛️</div>
        <h3>村委管理</h3>
        <p>人员管理、权限控制、值班调度</p>
        <button class="card-btn">进入系统</button>
      </div>

      <div class="feature-card">
        <div class="card-icon">📢</div>
        <h3>村务协同</h3>
        <p>公告发布、投票系统、会议管理</p>
        <button class="card-btn">进入系统</button>
      </div>

      <div class="feature-card">
        <div class="card-icon">💰</div>
        <h3>财务管理</h3>
        <p>预算控制、审批流程、财务透明</p>
        <button class="card-btn">进入系统</button>
      </div>

      <div class="feature-card">
        <div class="card-icon">📊</div>
        <h3>实时监控</h3>
        <p>系统性能、运营指标、健康状态</p>
        <button class="card-btn">查看监控</button>
      </div>

      <div class="feature-card">
        <div class="card-icon">🔔</div>
        <h3>通知系统</h3>
        <p>多渠道通知、模板管理、批量发送</p>
        <button class="card-btn">管理通知</button>
      </div>
    </div>

    <div class="stats-section">
      <div class="stat-item">
        <h3>系统状态</h3>
        <div class="status-indicator online">🟢 正常运行</div>
      </div>
      <div class="stat-item">
        <h3>在线用户</h3>
        <div class="user-count">{{ onlineUsers }}</div>
      </div>
      <div class="stat-item">
        <h3>今日访问</h3>
        <div class="visit-count">{{ dailyVisits }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const onlineUsers = ref(12)
const dailyVisits = ref(156)

onMounted(() => {
  console.log('智慧村庄仪表板加载完成')
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.welcome-header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5em;
}

.welcome-header p {
  margin: 0;
  font-size: 1.2em;
  opacity: 0.9;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
}

.card-icon {
  font-size: 3em;
  margin-bottom: 15px;
}

.feature-card h3 {
  color: #333;
  margin: 0 0 10px 0;
}

.feature-card p {
  color: #666;
  margin: 0 0 20px 0;
}

.card-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s ease;
}

.card-btn:hover {
  background: #45a049;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.stat-item {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.stat-item h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.status-indicator {
  font-weight: bold;
  font-size: 1.1em;
}

.status-indicator.online {
  color: #28a745;
}

.user-count, .visit-count {
  font-size: 2em;
  font-weight: bold;
  color: #007bff;
}
</style>