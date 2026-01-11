<template>
  <div class="auth-layout">
    <div class="auth-background">
      <div class="bg-pattern"></div>
    </div>

    <div class="auth-container">
      <!-- 左侧装饰区域 -->
      <div class="auth-decoration" v-if="showDecoration">
        <div class="decoration-content">
          <h2>欢迎使用</h2>
          <h3>智慧乡村综合服务平台</h3>
          <p>连接城乡，服务三农</p>
          <div class="feature-list">
            <div class="feature-item">
              <el-icon><User /></el-icon>
              <span>便民服务</span>
            </div>
            <div class="feature-item">
              <el-icon><OfficeBuilding /></el-icon>
              <span>村务管理</span>
            </div>
            <div class="feature-item">
              <el-icon><Connection /></el-icon>
              <span>信息互通</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 登录卡片 -->
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">
            <img src="/logo.svg" alt="智慧乡村" v-if="logoExists" />
            <div v-else class="logo-placeholder">
              <el-icon size="48"><HomeFilled /></el-icon>
            </div>
          </div>
          <h1 class="auth-title">智慧乡村</h1>
          <p class="auth-subtitle">综合服务平台</p>
        </div>

        <!-- 主要内容区域 -->
        <div class="auth-content">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>

        <!-- 底部信息 -->
        <div class="auth-footer">
          <p class="copyright">© {{ currentYear }} 智慧乡村平台</p>
          <p class="version">版本 {{ version }}</p>
        </div>
      </div>
    </div>

    <!-- 语音助手悬浮按钮 -->
    <VoiceAssistant v-if="showVoiceAssistant" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { HomeFilled, User, OfficeBuilding, Connection } from '@element-plus/icons-vue';

onMounted(() => {
  try {
    const img = new Image();
    img.src = new URL('@/assets/logo.svg', import.meta.url).href;
    img.onload = () => {
      logoExists.value = true;
    };
    img.onerror = () => {
      logoExists.value = false;
    };
  } catch (e) {
    logoExists.value = false;
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

.auth-layout {
  min-height: 100vh;
  display: flex;
  position: relative;
  background: linear-gradient(135deg, #0369A1 0%, #0F172A 100%);
  font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
}

.auth-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  width: 200%;
  height: 200%;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h-2zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zm6 34v-4H4v4H0v2h4v4h2v-4h-2zM6 4V0H4v4H0v2h4v4h2V6h4V4H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  animation: bgMove 30s linear infinite;
}

@keyframes bgMove {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(-50%, -50%);
  }
}

.auth-container {
  display: flex;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  gap: 40px;
  align-items: center;
  padding: 40px;
}

.auth-decoration {
  flex: 0 0 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: white;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
}

.decoration-content h2 {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px;
}

.decoration-content h3 {
  font-size: 24px;
  font-weight: 500;
  margin: 0 0 16px;
  opacity: 0.9;
}

.decoration-content p {
  font-size: 16px;
  opacity: 0.8;
  margin: 0 0 32px;
}

.feature-list {
  display: flex;
  gap: 24px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.feature-item .el-icon {
  font-size: 20px;
}

.auth-card {
  flex: 0 0 420px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 32px;
  margin: 20px 20px 20px 0;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, #0369A1 0%, #0F172A 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(3, 105, 161, 0.3);
}

.logo-placeholder {
  color: white;
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px;
}

.auth-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.auth-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.auth-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
}

.copyright {
  font-size: 12px;
  color: #9ca3af;
  margin: 0 0 4px;
}

.version {
  font-size: 11px;
  color: #d1d5db;
  margin: 0;
}

/* 过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .auth-container {
    gap: 20px;
    padding: 20px;
  }

  .auth-decoration {
    display: none;
  }

  .auth-card {
    flex: 1;
    max-width: 480px;
    margin: 20px auto;
  }
}

@media (max-width: 768px) {
  .auth-container {
    flex-direction: column;
    padding: 20px;
  }

  .auth-decoration {
    display: none;
  }

  .auth-card {
    flex: 1;
    margin: 10px;
    min-height: auto;
  }
}

@media (max-width: 480px) {
  .auth-card {
    padding: 24px;
    margin: 10px;
    border-radius: 16px;
  }

  .auth-title {
    font-size: 24px;
  }

  .logo {
    width: 64px;
    height: 64px;
  }
}
</style>
