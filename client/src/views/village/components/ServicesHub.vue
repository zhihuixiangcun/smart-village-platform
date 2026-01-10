<template>
  <div class="services-hub">
    <!-- 服务导航 -->
    <section class="services-nav">
      <div class="nav-header">
        <h3 class="nav-title">生活服务</h3>
        <p class="nav-subtitle">便民服务，智慧生活</p>
      </div>

      <div class="nav-tabs">
        <div
          v-for="tab in serviceTabs"
          :key="tab.id"
          class="nav-tab"
          :class="{ active: activeTab === tab.id }"
          @click="setActiveTab(tab.id)"
        >
          <div class="tab-icon" :style="{ color: tab.color }">
            <el-icon :size="24"><component :is="tab.icon" /></el-icon>
          </div>
          <div class="tab-content">
            <h4 class="tab-title">{{ tab.title }}</h4>
            <p class="tab-desc">{{ tab.description }}</p>
          </div>
          <div class="tab-badge" v-if="tab.badge">
            <el-tag :type="tab.badge.type" size="small">
              {{ tab.badge.text }}
            </el-tag>
          </div>
        </div>
      </div>
    </section>

    <!-- 补贴查询服务 -->
    <section v-show="activeTab === 'subsidy'" class="service-section">
      <SubsidyCalculator />
    </section>

    <!-- 在线办事服务 -->
    <section v-show="activeTab === 'services'" class="service-section">
      <OnlineServices />
    </section>

    <!-- 便民商城 -->
    <section v-show="activeTab === 'marketplace'" class="service-section">
      <ConvenienceMarket />
    </section>

    <!-- 交通出行 -->
    <section v-show="activeTab === 'transport'" class="service-section">
      <TransportServices />
    </section>

    <!-- 医疗健康 -->
    <section v-show="activeTab === 'health'" class="service-section">
      <HealthServices />
    </section>

    <!-- 教育培训 -->
    <section v-show="activeTab === 'education'" class="service-section">
      <EducationServices />
    </section>

    <!-- 就业服务 -->
    <section v-show="activeTab === 'employment'" class="service-section">
      <EmploymentServices />
    </section>

    <!-- 便民电话 -->
    <section v-show="activeTab === 'contacts'" class="service-section">
      <EmergencyContacts />
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import {
  Service,
  ShoppingBag,
  Van,
  FirstAidKit,
  Reading,
  Briefcase,
  Phone,
} from '@element-plus/icons-vue';

// 异步加载组件
const SubsidyCalculator = defineAsyncComponent(() => import('./services/SubsidyCalculator.vue'));
const OnlineServices = defineAsyncComponent(() => import('./services/OnlineServices.vue'));
const ConvenienceMarket = defineAsyncComponent(() => import('./services/ConvenienceMarket.vue'));
const TransportServices = defineAsyncComponent(() => import('./services/TransportServices.vue'));
const HealthServices = defineAsyncComponent(() => import('./services/HealthServices.vue'));
const EducationServices = defineAsyncComponent(() => import('./services/EducationServices.vue'));
const EmploymentServices = defineAsyncComponent(() => import('./services/EmploymentServices.vue'));
const EmergencyContacts = defineAsyncComponent(() => import('./services/EmergencyContacts.vue'));

const accessibilityStore = useAccessibilityStore();

// 响应式数据
const activeTab = ref('subsidy');

// 服务标签页
const serviceTabs = reactive([
  {
    id: 'subsidy',
    title: '补贴查询',
    description: '农业补贴、政策补贴计算',
    icon: 'Service',
    color: '#409eff',
    badge: { type: 'success', text: '热门' },
  },
  {
    id: 'services',
    title: '在线办事',
    description: '证件办理、便民服务',
    icon: 'ShoppingBag',
    color: '#67c23a',
  },
  {
    id: 'marketplace',
    title: '便民商城',
    description: '农资产品、日用品购买',
    icon: 'Van',
    color: '#e6a23c',
    badge: { type: 'warning', text: '新品' },
  },
  {
    id: 'transport',
    title: '交通出行',
    description: '班车查询、出行服务',
    icon: 'Van',
    color: '#f56c6c',
  },
  {
    id: 'health',
    title: '医疗健康',
    description: '医保查询、预约挂号',
    icon: 'FirstAidKit',
    color: '#909399',
  },
  {
    id: 'education',
    title: '教育培训',
    description: '技能培训、农业知识',
    icon: 'Reading',
    color: '#606266',
  },
  {
    id: 'employment',
    title: '就业服务',
    description: '招聘信息、就业指导',
    icon: 'Briefcase',
    color: '#c0c4cc',
  },
  {
    id: 'contacts',
    title: '便民电话',
    description: '应急电话、服务热线',
    icon: 'Phone',
    color: '#dcdfe6',
  },
]);

// 方法定义
const setActiveTab = tabId => {
  activeTab.value = tabId;

  // 语音播报
  if (accessibilityStore.voiceEnabled && accessibilityStore.autoRead) {
    const tab = serviceTabs.find(t => t.id === tabId);
    if (tab) {
      accessibilityStore.speakText(`已切换到${tab.title}服务`);
    }
  }
};

// 生命周期
onMounted(() => {
  // 初始化语音播报
  if (accessibilityStore.voiceEnabled && accessibilityStore.autoRead) {
    const currentTab = serviceTabs.find(t => t.id === activeTab.value);
    if (currentTab) {
      setTimeout(() => {
        accessibilityStore.speakText(
          `当前页面是${currentTab.title}服务，${currentTab.description}`
        );
      }, 500);
    }
  }
});
</script>

<style scoped>
.services-hub {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 30px 20px;
}

/* ========== 服务导航样式 ========== */
.services-nav {
  max-width: 1200px;
  margin: 0 auto 40px;
}

.nav-header {
  text-align: center;
  margin-bottom: 30px;
}

.nav-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-subtitle {
  margin: 0;
  font-size: 16px;
  color: #606266;
}

.nav-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.nav-tab {
  background: white;
  border-radius: 16px;
  padding: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-tab::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(103, 194, 58, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s;
}

.nav-tab:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.nav-tab:hover::before {
  opacity: 1;
}

.nav-tab.active {
  border-color: #409eff;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(103, 194, 58, 0.08) 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.2);
}

.tab-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tab-content {
  flex: 1;
}

.tab-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.tab-desc {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
}

.tab-badge {
  position: absolute;
  top: 15px;
  right: 15px;
}

/* ========== 服务区域样式 ========== */
.service-section {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 响应式设计 ========== */
@media (max-width: 1024px) {
  .nav-tabs {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
  }

  .nav-tab {
    padding: 20px;
  }

  .tab-icon {
    width: 50px;
    height: 50px;
  }
}

@media (max-width: 768px) {
  .services-hub {
    padding: 20px 15px;
  }

  .nav-title {
    font-size: 24px;
  }

  .nav-subtitle {
    font-size: 14px;
  }

  .nav-tabs {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .nav-tab {
    padding: 16px;
    gap: 15px;
  }

  .tab-icon {
    width: 45px;
    height: 45px;
  }

  .tab-title {
    font-size: 16px;
  }

  .tab-desc {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .services-hub {
    padding: 15px 10px;
  }

  .nav-title {
    font-size: 20px;
  }

  .nav-tab {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .tab-icon {
    width: 50px;
    height: 50px;
  }

  .tab-badge {
    top: 10px;
    right: 10px;
  }
}

/* ========== 大字模式样式 ========== */
:deep(.large-text-mode) .nav-title {
  font-size: 32px;
}

:deep(.large-text-mode) .nav-subtitle {
  font-size: 18px;
}

:deep(.large-text-mode) .tab-title {
  font-size: 20px;
}

:deep(.large-text-mode) .tab-desc {
  font-size: 16px;
}

:deep(.large-text-mode) .tab-icon {
  width: 70px;
  height: 70px;
}

/* ========== 无障碍设计 ========== */
.nav-tab:focus-visible {
  outline: 3px solid #409eff;
  outline-offset: 2px;
}

.nav-tab:focus-visible::before {
  opacity: 1;
}

/* 减少动画支持 */
:deep(.reduce-motion) .nav-tab,
:deep(.reduce-motion) .service-section {
  animation: none;
  transition: none;
}

:deep(.reduce-motion) .nav-tab:hover {
  transform: none;
}

/* ========== 深色模式支持 ========== */
@media (prefers-color-scheme: dark) {
  .services-hub {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  }

  .nav-title {
    color: #ffffff;
  }

  .nav-subtitle {
    color: #b0b0b0;
  }

  .nav-tab {
    background: #2a2a2a;
    border-color: #3a3a3a;
  }

  .nav-tab:hover {
    border-color: #409eff;
  }

  .nav-tab.active {
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.15) 0%, rgba(103, 194, 58, 0.15) 100%);
  }

  .tab-icon {
    background: #3a3a3a;
  }

  .tab-title {
    color: #ffffff;
  }

  .tab-desc {
    color: #b0b0b0;
  }

  .service-section {
    background: #2a2a2a;
  }
}
</style>
