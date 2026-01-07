<template>
  <div class="home-container">
    <div class="hero-section">
      <h1>智慧乡村综合服务平台</h1>
      <p>打造现代化、智能化的乡村管理与服务体系</p>
      <div class="actions">
        <button class="btn-primary" @click="goToDashboard">
          进入系统
        </button>
        <button class="btn-secondary">
          了解更多
        </button>
      </div>
    </div>

    <div class="features-section">
      <div class="feature-card">
        <div class="feature-icon">👥</div>
        <h3>村民管理</h3>
        <p>全面管理村民信息，实现数字化档案管理</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🏛️</div>
        <h3>村务治理</h3>
        <p>透明公开的村务管理，推进民主决策</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📢</div>
        <h3>信息公示</h3>
        <p>及时发布通知公告，保证信息传达</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🛒</div>
        <h3>生活服务</h3>
        <p>丰富的便民服务，提高生活品质</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

const goToDashboard = () => {
  window.location.href = '/dashboard'
}

onMounted(() => {
  console.log('Home页面已加载')
})
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 80px 20px;
}

.hero-section h1 {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 16px;
}

.hero-section p {
  font-size: 20px;
  opacity: 0.9;
  margin-bottom: 40px;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  padding: 12px 32px;
  font-size: 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: white;
  color: #667eea;
}

.features-section {
  padding: 60px 20px;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.feature-card {
  background: white;
  padding: 32px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .hero-section h1 {
    font-size: 32px;
  }

  .hero-section p {
    font-size: 16px;
  }

  .features-section {
    grid-template-columns: 1fr;
  }
}
</style>
