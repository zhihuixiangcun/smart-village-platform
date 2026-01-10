<template>
  <div class="brand-role-layout">
    <div class="left-brand-section">
      <div class="brand-content">
        <div class="logo-wrapper">
          <img src="/village-icon.svg" alt="智慧乡村" class="logo" />
        </div>
        <h1 class="brand-title">智慧乡村综合服务平台</h1>
        <p class="brand-subtitle">数字化村务管理 · 便民服务 · 乡村振兴</p>

        <div class="slogan-box">
          <h2 class="slogan-text">数字赋能乡村 · 科技点亮生活</h2>
        </div>

        <div class="features-list">
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon :size="28"><DataAnalysis /></el-icon>
            </div>
            <div class="feature-text">
              <h4>数据驱动</h4>
              <p>大数据分析，智能决策</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon :size="28"><TrendCharts /></el-icon>
            </div>
            <div class="feature-text">
              <h4>智慧管理</h4>
              <p>村务高效透明，监督有力</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon :size="28"><Connection /></el-icon>
            </div>
            <div class="feature-text">
              <h4>便民服务</h4>
              <p>一站式办事，省时省力</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">
              <el-icon :size="28"><Medal /></el-icon>
            </div>
            <div class="feature-text">
              <h4>乡村振兴</h4>
              <p>促进产业发展，带动致富</p>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <div class="stat-item">
            <span class="stat-num">100+</span>
            <span class="stat-label">覆盖村庄</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-num">50K+</span>
            <span class="stat-label">服务村民</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-num">98%</span>
            <span class="stat-label">满意度</span>
          </div>
        </div>
      </div>

      <div class="bg-decoration">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>
    </div>

    <div class="right-role-section">
      <div class="role-content">
        <div class="role-header">
          <h2 class="role-title">请选择您的身份</h2>
          <p class="role-desc">选择身份，体验专属服务功能</p>
        </div>

        <div class="role-grid">
          <div
            v-for="role in roles"
            :key="role.id"
            class="role-card"
            :class="{ active: selectedRole === role.id }"
            @click="selectRole(role.id)"
          >
            <div class="role-icon" :class="role.id">
              <el-icon :size="36">
                <component :is="role.icon" />
              </el-icon>
            </div>
            <h3 class="role-name">{{ role.name }}</h3>
            <p class="role-subtitle">{{ role.description }}</p>
            <div class="role-features">
              <span v-for="feature in role.features" :key="feature">{{ feature }}</span>
            </div>
          </div>
        </div>

        <div class="role-footer">
          <p>© 2024 智慧乡村平台 技术支持</p>
          <span class="version-tag">v2.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  User,
  OfficeBuilding,
  Location,
  ShoppingCart,
  Setting,
  DataAnalysis,
  TrendCharts,
  Connection,
  Medal
} from '@element-plus/icons-vue';

const emit = defineEmits(['select']);

const selectedRole = ref(null);

const roles = [
  {
    id: 'resident',
    name: '村民',
    description: '村务办理、信息查询、邻里互助',
    features: ['办事大厅', '信息查询', '邻里互助'],
    icon: User
  },
  {
    id: 'village_official',
    name: '村干部',
    description: '村务管理、资料收集、值班安排',
    features: ['村务管理', '资料收集', '值班管理'],
    icon: OfficeBuilding
  },
  {
    id: 'township_official',
    name: '乡镇干部',
    description: '多村管理、政策传达、监督指导',
    features: ['多村管理', '政策传达', '监督指导'],
    icon: Location
  },
  {
    id: 'purchaser',
    name: '采购商',
    description: '农产品采购、订单管理、供应商对接',
    features: ['产品浏览', '订单管理', '供应商对接'],
    icon: ShoppingCart
  },
  {
    id: 'admin',
    name: '管理员',
    description: '系统配置、用户管理、权限控制',
    features: ['系统配置', '用户管理', '权限控制'],
    icon: Setting
  }
];

const selectRole = (roleId) => {
  selectedRole.value = roleId;
  emit('select', roleId);
};
</script>

<style scoped>
.brand-role-layout {
  display: flex;
  min-height: 100vh;
  background: white;
}

.left-brand-section {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
  overflow: hidden;
}

.left-brand-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.brand-content {
  width: 100%;
  max-width: 480px;
  color: white;
  z-index: 1;
}

.logo-wrapper {
  margin-bottom: 24px;
}

.logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.brand-subtitle {
  font-size: 16px;
  margin: 0 0 32px 0;
  opacity: 0.9;
}

.slogan-box {
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 32px;
}

.slogan-text {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(5px);
}

.feature-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.feature-text h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 2px 0;
}

.feature-text p {
  font-size: 12px;
  margin: 0;
  opacity: 0.85;
}

.stats-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-num {
  display: block;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 2px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.stat-label {
  font-size: 11px;
  opacity: 0.85;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.3);
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  animation: float 20s infinite ease-in-out;
}

.circle-1 {
  width: 180px;
  height: 180px;
  top: 10%;
  left: 5%;
  animation-delay: 0s;
}

.circle-2 {
  width: 140px;
  height: 140px;
  top: 60%;
  left: 80%;
  animation-delay: 7s;
}

.circle-3 {
  width: 90px;
  height: 90px;
  top: 75%;
  left: 15%;
  animation-delay: 14s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.08;
  }
  50% {
    transform: translateY(-15px) rotate(180deg);
    opacity: 0.15;
  }
}

.right-role-section {
  width: 520px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
}

.role-content {
  width: 100%;
  max-width: 440px;
}

.role-header {
  margin-bottom: 36px;
  text-align: center;
}

.role-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #303133;
}

.role-desc {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.role-grid .role-card:last-child {
  grid-column: span 2;
}

.role-card {
  background: white;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.role-card:hover {
  border-color: #409eff;
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.15);
}

.role-card.active {
  border-color: #409eff;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.2);
}

.role-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform 0.3s ease;
}

.role-card:hover .role-icon {
  transform: scale(1.1);
}

.role-icon.resident {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
}

.role-icon.village_official {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
}

.role-icon.township_official {
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
}

.role-icon.purchaser {
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
}

.role-icon.admin {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
}

.role-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: #303133;
}

.role-subtitle {
  font-size: 12px;
  margin: 0 0 10px 0;
  color: #606266;
  line-height: 1.4;
}

.role-features {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: center;
}

.role-features span {
  font-size: 10px;
  background: #f5f7fa;
  color: #909399;
  padding: 3px 8px;
  border-radius: 8px;
}

.role-card.active .role-features span {
  background: #e6f7ff;
  color: #409eff;
}

.role-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
  color: #909399;
  font-size: 12px;
}

.version-tag {
  margin-left: 8px;
  padding: 2px 8px;
  background: #e4e7ed;
  border-radius: 4px;
  font-size: 11px;
}

@media (max-width: 1024px) {
  .brand-role-layout {
    flex-direction: column;
  }

  .left-brand-section {
    padding: 40px 20px;
    min-height: 40vh;
  }

  .right-role-section {
    width: 100%;
    padding: 30px 20px;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.08);
  }

  .brand-title {
    font-size: 26px;
  }

  .role-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .role-grid {
    grid-template-columns: 1fr;
  }

  .role-grid .role-card:last-child {
    grid-column: span 1;
  }
}
</style>
