<template>
  <div class="purchaser-dashboard">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="title-wrapper">
            <h1>
              <span class="icon-wrapper">
                <el-icon><Monitor /></el-icon>
              </span>
              采购商工作台
            </h1>
            <p class="welcome-text">欢迎回来，{{ purchaserInfo?.name || '采购商' }}</p>
          </div>
        </div>
        <div class="header-right">
          <el-button type="primary" class="action-btn primary-action" @click="handlePostRequirement">
            <el-icon><EditPen /></el-icon>
            <span class="btn-text">发布需求</span>
          </el-button>
          <el-button class="action-btn secondary-action" @click="fetchDashboardData">
            <el-icon><Refresh /></el-icon>
            <span class="btn-text">刷新</span>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主标签页 -->
    <el-tabs v-model="activeTab" type="card" class="dashboard-tabs">
      <!-- 工作台 -->
      <el-tab-pane label="工作台" name="dashboard">
        <div class="tab-content">
          <!-- 统计卡片 -->
          <div class="stats-cards">
            <div class="stat-card recommendations" @click="switchTab('nearby-suppliers')">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <el-icon><Shop /></el-icon>
                </div>
                <div class="stat-glow"></div>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.suppliers }}</div>
                <div class="stat-label">附近商家</div>
                <div class="stat-indicator"></div>
              </div>
              <div class="stat-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
            <div class="stat-card lifestyle" @click="switchTab('lifestyle')">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <el-icon><Compass /></el-icon>
                </div>
                <div class="stat-glow"></div>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.lifestyle }}</div>
                <div class="stat-label">生活服务</div>
                <div class="stat-indicator"></div>
              </div>
              <div class="stat-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
            <div class="stat-card transportation" @click="switchTab('transportation')">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <el-icon><Van /></el-icon>
                </div>
                <div class="stat-glow"></div>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.transportation }}</div>
                <div class="stat-label">交通出行</div>
                <div class="stat-indicator"></div>
              </div>
              <div class="stat-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
            <div class="stat-card carpooling" @click="switchTab('carpooling')">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">
                  <el-icon><Promotion /></el-icon>
                </div>
                <div class="stat-glow"></div>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.carpooling }}</div>
                <div class="stat-label">拼车服务</div>
                <div class="stat-indicator"></div>
              </div>
              <div class="stat-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </div>

          <!-- 快捷操作 -->
          <div class="quick-actions">
            <el-card shadow="hover" class="action-card">
              <template #header>
                <div class="card-header">
                  <div class="header-icon">
                    <el-icon><Operation /></el-icon>
                  </div>
                  <span class="header-title">快捷操作</span>
                </div>
              </template>
              <div class="action-buttons">
                <div class="action-item" @click="switchTab('nearby-products')">
                  <div class="action-icon-box primary">
                    <el-icon><ShoppingCart /></el-icon>
                  </div>
                  <div class="action-content">
                    <span class="action-title">搜索商品</span>
                    <span class="action-desc">快速查找所需商品</span>
                  </div>
                </div>
                <div class="action-item" @click="switchTab('nearby-suppliers')">
                  <div class="action-icon-box success">
                    <el-icon><User /></el-icon>
                  </div>
                  <div class="action-content">
                    <span class="action-title">浏览商家</span>
                    <span class="action-desc">查看优质供应商</span>
                  </div>
                </div>
                <div class="action-item" @click="switchTab('lifestyle')">
                  <div class="action-icon-box warning">
                    <el-icon><Compass /></el-icon>
                  </div>
                  <div class="action-content">
                    <span class="action-title">生活服务</span>
                    <span class="action-desc">享受便捷生活</span>
                  </div>
                </div>
                <div class="action-item" @click="handlePostRequirement">
                  <div class="action-icon-box info">
                    <el-icon><EditPen /></el-icon>
                  </div>
                  <div class="action-content">
                    <span class="action-title">发布需求</span>
                    <span class="action-desc">快速发布采购需求</span>
                  </div>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 最新推荐 -->
          <div class="latest-recommendations">
            <el-card shadow="hover" class="recommendation-card">
              <template #header>
                <div class="card-header">
                  <div class="header-icon">
                    <el-icon><Star /></el-icon>
                  </div>
                  <span class="header-title">最新推荐</span>
                  <el-button type="primary" text class="view-more-btn" @click="switchTab('nearby-products')">
                    查看更多
                    <el-icon><ArrowRight /></el-icon>
                  </el-button>
                </div>
              </template>
              <div v-if="loading" class="loading-container">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="recommendations.length === 0" class="empty-container">
                <el-empty description="暂无推荐内容">
                  <el-button type="primary" @click="fetchRecommendations">刷新</el-button>
                </el-empty>
              </div>
              <div v-else class="recommendations-grid">
                <div
                  v-for="item in recommendations"
                  :key="item.id"
                  class="recommendation-item"
                  @click="viewRecommendation(item)"
                >
                  <div class="item-badge" :class="item.type">
                    <el-icon><component :is="item.type === 'product' ? ShoppingCart : Bell" /></el-icon>
                  </div>
                  <div class="item-content">
                    <h4>{{ item.name || item.title }}</h4>
                    <p class="item-description">{{ item.description || item.content }}</p>
                    <div class="item-meta">
                      <span class="price" v-if="item.price">
                        <el-icon><PriceTag /></el-icon>
                        ¥{{ item.price }}/{{ item.unit }}
                      </span>
                      <span class="distance" v-if="item.distance">
                        <el-icon><Location /></el-icon>
                        {{ item.distance.toFixed(1) }}km
                      </span>
                    </div>
                  </div>
                  <div class="item-action">
                    <el-button size="small" type="primary">查看详情</el-button>
                  </div>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 我的采购需求 -->
          <div class="my-requirements">
            <el-card shadow="hover" class="requirement-card">
              <template #header>
                <div class="card-header">
                  <div class="header-icon">
                    <el-icon><Document /></el-icon>
                  </div>
                  <span class="header-title">我的采购需求</span>
                  <el-button type="primary" text class="create-btn" @click="handlePostRequirement">
                    <el-icon><Plus /></el-icon>
                    发布新需求
                  </el-button>
                </div>
              </template>
              <el-table :data="requirements" stripe style="width: 100%" class="requirements-table">
                <el-table-column prop="productCategory" label="采购类目" width="120" />
                <el-table-column prop="quantity" label="数量" width="100" />
                <el-table-column prop="budget" label="预算" width="100" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getRequirementStatusType(row.status)" class="status-tag">
                      {{ getRequirementStatusLabel(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="发布时间" width="160">
                  <template #default="{ row }">
                    {{ formatDate(row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" @click="handleViewRequirement(row)">查看</el-button>
                    <el-button
                      size="small"
                      type="danger"
                      @click="handleDeleteRequirement(row)"
                      v-if="row.status === 'pending'"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <!-- 附近商家 -->
      <el-tab-pane label="附近商家" name="nearby-suppliers">
        <template #label>
          <span class="tab-label">
            <el-icon><Shop /></el-icon>
            <span class="label-text">附近商家</span>
          </span>
        </template>
        <NearbySuppliers />
      </el-tab-pane>

      <!-- 吃喝玩乐 -->
      <el-tab-pane label="吃喝玩乐" name="lifestyle">
        <template #label>
          <span class="tab-label">
            <el-icon><Compass /></el-icon>
            <span class="label-text">吃喝玩乐</span>
          </span>
        </template>
        <LifestyleServices />
      </el-tab-pane>

      <!-- 交通出行 -->
      <el-tab-pane label="交通出行" name="transportation">
        <template #label>
          <span class="tab-label">
            <el-icon><Van /></el-icon>
            <span class="label-text">交通出行</span>
          </span>
        </template>
        <TransportationServices />
      </el-tab-pane>

      <!-- 拼车服务 -->
      <el-tab-pane label="拼车服务" name="carpooling">
        <template #label>
          <span class="tab-label">
            <el-icon><Promotion /></el-icon>
            <span class="label-text">拼车服务</span>
          </span>
        </template>
        <CarpoolingService />
      </el-tab-pane>

      <!-- 附近商品 -->
      <el-tab-pane label="附近商品" name="nearby-products">
        <template #label>
          <span class="tab-label">
            <el-icon><ShoppingCart /></el-icon>
            <span class="label-text">附近商品</span>
          </span>
        </template>
        <NearbyProducts />
      </el-tab-pane>

      <!-- 我的订单 -->
      <el-tab-pane label="我的订单" name="orders">
        <template #label>
          <span class="tab-label">
            <el-icon><Document /></el-icon>
            <span class="label-text">我的订单</span>
          </span>
        </template>
        <div class="orders-list">
          <el-card shadow="hover">
            <el-empty description="订单功能开发中" />
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 采购需求 -->
      <el-tab-pane label="采购需求" name="requirements">
        <template #label>
          <span class="tab-label">
            <el-icon><EditPen /></el-icon>
            <span class="label-text">采购需求</span>
          </span>
        </template>
        <div class="requirements-manage">
          <el-card shadow="hover">
            <el-empty description="需求管理功能开发中" />
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Monitor,
  Shop,
  Compass,
  Van,
  Promotion,
  ShoppingCart,
  User,
  EditPen,
  Refresh,
  Operation,
  Star,
  Document,
  PriceTag,
  Location,
  Plus,
  ArrowRight,
  Bell,
} from '@element-plus/icons-vue';
import api from '@/api';
import NearbySuppliers from '@/components/purchaser/NearbySuppliers.vue';
import LifestyleServices from '@/components/purchaser/LifestyleServices.vue';
import TransportationServices from '@/components/purchaser/TransportationServices.vue';
import CarpoolingService from '@/components/purchaser/CarpoolingService.vue';
import NearbyProducts from '@/components/purchaser/NearbyProducts.vue';

const router = useRouter();
const loading = ref(false);
const purchaserInfo = ref(null);
const recommendations = ref([]);
const requirements = ref([]);
const activeTab = ref('dashboard');

const stats = reactive({
  suppliers: 0,
  lifestyle: 0,
  transportation: 0,
  carpooling: 0,
});

// 获取采购商信息
const fetchPurchaserInfo = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/me');
    if (response.success) {
      purchaserInfo.value = response.data;
    }
  } catch (error) {
    console.error('获取采购商信息失败', error);
  }
};

// 获取工作台数据
const fetchDashboardData = async () => {
  loading.value = true;
  try {
    await Promise.all([
      fetchPurchaserInfo(),
      fetchRecommendations(),
      fetchRequirements(),
      fetchStats(),
    ]);
    ElMessage.success('数据刷新成功');
  } catch (error) {
    console.error('获取数据失败', error);
    ElMessage.error('数据刷新失败');
  } finally {
    loading.value = false;
  }
};

// 获取统计数据
const fetchStats = async () => {
  try {
    // 模拟数据
    stats.suppliers = 12;
    stats.lifestyle = 25;
    stats.transportation = 8;
    stats.carpooling = 6;
  } catch (error) {
    console.error('获取统计数据失败', error);
  }
};

// 获取智能推荐
const fetchRecommendations = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/recommendations', {
      params: { limit: 6 },
    });
    if (response.success) {
      recommendations.value = response.data.recommendations || [];
    }
  } catch (error) {
    // 使用模拟数据
    recommendations.value = [
      {
        id: '1',
        type: 'product',
        name: '有机白菜',
        description: '新鲜有机种植，口感鲜嫩',
        price: 3.5,
        unit: '斤',
        distance: 0.8,
      },
      {
        id: '2',
        type: 'announcement',
        title: '春节优惠活动',
        content: '春节期间全场9折优惠',
        distance: 1.2,
      },
      {
        id: '3',
        type: 'product',
        name: '新鲜草莓',
        description: '个大饱满，香甜可口',
        price: 25,
        unit: '斤',
        distance: 2.5,
      },
      {
        id: '4',
        type: 'product',
        name: '土鸡蛋',
        description: '散养土鸡产蛋，营养丰富',
        price: 1.5,
        unit: '个',
        distance: 3.2,
      },
    ];
  }
};

// 获取我的采购需求
const fetchRequirements = async () => {
  try {
    // 模拟数据
    requirements.value = [
      {
        productCategory: '蔬菜',
        quantity: '500kg',
        budget: '2000元',
        status: 'pending',
        createdAt: new Date(),
      },
      {
        productCategory: '水果',
        quantity: '300kg',
        budget: '3000元',
        status: 'active',
        createdAt: new Date(),
      },
    ];
  } catch (error) {
    console.error('获取采购需求失败', error);
  }
};

// 切换标签页
const switchTab = tabName => {
  activeTab.value = tabName;
};

// 查看推荐详情
const viewRecommendation = item => {
  ElMessageBox.alert(
    `<div style="text-align: left;">
      <h3>${item.name || item.title}</h3>
      <p><strong>类型：</strong>${item.type === 'product' ? '农产品' : '公告'}</p>
      <p><strong>描述：</strong>${item.description || item.content}</p>
      ${item.price ? `<p><strong>价格：</strong>¥${item.price}/${item.unit}</p>` : ''}
      ${item.distance ? `<p><strong>距离：</strong>${item.distance.toFixed(1)}km</p>` : ''}
    </div>`,
    '详细信息',
    { dangerouslyUseHTMLString: true }
  );
};

// 快捷操作
const handlePostRequirement = () => {
  ElMessage.info('发布采购需求功能开发中，敬请期待！');
};

const handleViewRequirement = row => {
  ElMessageBox.alert(
    `<div style="text-align: left;">
      <h3>${row.productCategory}</h3>
      <p><strong>数量：</strong>${row.quantity}</p>
      <p><strong>预算：</strong>${row.budget}</p>
      <p><strong>状态：</strong>${getRequirementStatusLabel(row.status)}</p>
      <p><strong>发布时间：</strong>${formatDate(row.createdAt)}</p>
    </div>`,
    '采购需求详情',
    { dangerouslyUseHTMLString: true }
  );
};

const handleDeleteRequirement = async row => {
  try {
    await ElMessageBox.confirm('确定要删除此采购需求吗？', '确认删除', {
      type: 'warning',
    });
    ElMessage.success('删除成功');
    // 这里可以调用实际的删除API
  } catch (error) {
    // 用户取消删除
  }
};

// 工具函数
const getRequirementStatusType = status => {
  const types = { pending: 'info', active: 'success', completed: 'info', cancelled: 'danger' };
  return types[status] || 'info';
};

const getRequirementStatusLabel = status => {
  const labels = { pending: '待响应', active: '进行中', completed: '已完成', cancelled: '已取消' };
  return labels[status] || status;
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 初始化
onMounted(async () => {
  await fetchDashboardData();
});
</script>

<style scoped>
.purchaser-dashboard {
  padding: 24px;
  background: 
    radial-gradient(ellipse at 0% 0%, rgba(76, 175, 80, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 100%, rgba(139, 195, 74, 0.1) 0%, transparent 50%),
    linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%);
  min-height: 100vh;
}

/* 页面头部 */
.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
  backdrop-filter: blur(20px);
  padding: 32px 40px;
  border-radius: 24px;
  box-shadow: 
    0 10px 40px rgba(76, 175, 80, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
}

.header-content::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(139, 195, 74, 0.05) 0%, transparent 60%);
  animation: rotate 30s linear infinite;
  pointer-events: none;
}

.header-content::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(45deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.header-left {
  position: relative;
  z-index: 2;
}

.title-wrapper {
  display: flex;
  flex-direction: column;
}

.header-left h1 {
  font-size: 34px;
  color: #1b5e20;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 14px;
  font-weight: 800;
  position: relative;
  letter-spacing: -0.5px;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: 
    linear-gradient(135deg, #4caf50 0%, #66bb6a 50%, #81c784 100%);
  border-radius: 16px;
  box-shadow: 
    0 8px 24px rgba(76, 175, 80, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.icon-wrapper:hover {
  transform: scale(1.05) rotate(5deg);
  box-shadow: 
    0 12px 32px rgba(76, 175, 80, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.icon-wrapper .el-icon {
  font-size: 32px;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.welcome-text {
  color: #558b2f;
  font-size: 16px;
  margin: 0;
  font-weight: 500;
  position: relative;
  padding-left: 70px;
  letter-spacing: 0.3px;
}

.header-right {
  display: flex;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.action-btn {
  padding: 14px 28px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 15px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.3px;
}

.action-btn:hover {
  transform: translateY(-3px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.action-btn:active {
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.primary-action {
  background: 
    linear-gradient(135deg, #43a047 0%, #66bb6a 100%);
  border: none;
  color: white;
}

.primary-action:hover {
  background: 
    linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
}

.secondary-action {
  background: white;
  border: 2px solid #c8e6c9;
  color: #2e7d32;
}

.secondary-action:hover {
  border-color: #81c784;
  background: #f1f8e9;
}

.btn-text {
  font-weight: 600;
}

/* 标签页 */
.dashboard-tabs {
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 
    0 10px 40px rgba(76, 175, 80, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.9);
}

.dashboard-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: 
    linear-gradient(90deg, #f1f8e9 0%, #dcedc8 50%, #c5e1a5 100%);
  border-bottom: 2px solid rgba(139, 195, 74, 0.1);
  padding: 10px 12px 0;
}

.dashboard-tabs :deep(.el-tabs__nav) {
  border: none;
}

.dashboard-tabs :deep(.el-tabs__item) {
  border: none;
  padding: 16px 32px;
  height: 60px;
  line-height: 28px;
  font-size: 15px;
  color: #558b2f;
  border-radius: 16px 16px 0 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  position: relative;
  margin-right: 6px;
}

.dashboard-tabs :deep(.el-tabs__item::after) {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 3px;
  background: 
    linear-gradient(90deg, #4caf50, #81c784);
  transition: width 0.3s;
  border-radius: 2px 2px 0 0;
}

.dashboard-tabs :deep(.el-tabs__item.is-active) {
  color: #1b5e20;
  background: white;
  font-weight: 800;
  box-shadow: 
    0 4px 20px rgba(76, 175, 80, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.dashboard-tabs :deep(.el-tabs__item.is-active::after) {
  width: 80%;
}

.dashboard-tabs :deep(.el-tabs__item:hover) {
  color: #2e7d32;
  background: rgba(255, 255, 255, 0.7);
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-label .el-icon {
  font-size: 19px;
}

.label-text {
  font-weight: 600;
}

.tab-content {
  padding: 32px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: 
    linear-gradient(145deg, rgba(255, 255, 255, 0.99) 0%, rgba(255, 255, 255, 0.97) 100%);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 28px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 6px 20px rgba(76, 175, 80, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
  border: 2px solid rgba(76, 175, 80, 0.08);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  transition: opacity 0.4s;
  border-radius: 24px;
}

.stat-card.recommendations::before {
  background: 
    linear-gradient(135deg, rgba(76, 175, 80, 0.06) 0%, rgba(139, 195, 74, 0.06) 100%);
}

.stat-card.lifestyle::before {
  background: 
    linear-gradient(135deg, rgba(255, 193, 7, 0.06) 0%, rgba(255, 152, 0, 0.06) 100%);
}

.stat-card.transportation::before {
  background: 
    linear-gradient(135deg, rgba(33, 150, 243, 0.06) 0%, rgba(3, 169, 244, 0.06) 100%);
}

.stat-card.carpooling::before {
  background: 
    linear-gradient(135deg, rgba(156, 39, 176, 0.06) 0%, rgba(233, 30, 99, 0.06) 100%);
}

.stat-card:hover {
  transform: translateY(-12px);
  box-shadow: 
    0 16px 48px rgba(76, 175, 80, 0.2),
    0 6px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-color: rgba(76, 175, 80, 0.25);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  color: white;
  flex-shrink: 0;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 2;
}

.stat-glow {
  position: absolute;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  opacity: 0.3;
  filter: blur(20px);
  z-index: 1;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card.recommendations .stat-icon {
  background: 
    linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  box-shadow: 
    0 8px 24px rgba(76, 175, 80, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.stat-card.recommendations .stat-glow {
  background: #4caf50;
}

.stat-card.lifestyle .stat-icon {
  background: 
    linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
  box-shadow: 
    0 8px 24px rgba(255, 193, 7, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.stat-card.lifestyle .stat-glow {
  background: #ffc107;
}

.stat-card.transportation .stat-icon {
  background: 
    linear-gradient(135deg, #2196f3 0%, #42a5f5 100%);
  box-shadow: 
    0 8px 24px rgba(33, 150, 243, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.stat-card.transportation .stat-glow {
  background: #2196f3;
}

.stat-card.carpooling .stat-icon {
  background: 
    linear-gradient(135deg, #9c27b0 0%, #ab47bc 100%);
  box-shadow: 
    0 8px 24px rgba(156, 39, 176, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.stat-card.carpooling .stat-glow {
  background: #9c27b0;
}

.stat-card:hover .stat-icon {
  transform: scale(1.15) rotate(8deg);
  box-shadow: 
    0 12px 32px rgba(76, 175, 80, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.stat-card:hover .stat-glow {
  opacity: 0.5;
  transform: scale(1.2);
}

.stat-content {
  flex: 1;
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 44px;
  font-weight: 900;
  color: #1b5e20;
  line-height: 1;
  margin-bottom: 6px;
  background: 
    linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
  position: relative;
}

.stat-indicator {
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 40px;
  height: 3px;
  background: 
    linear-gradient(90deg, #4caf50, #81c784);
  border-radius: 2px;
  opacity: 0;
  transform: scaleX(0);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover .stat-indicator {
  opacity: 1;
  transform: scaleX(1);
}

.stat-label {
  color: #558b2f;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.stat-arrow {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #aed581;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 2;
  border-radius: 12px;
  background: rgba(76, 175, 80, 0.05);
}

.stat-card:hover .stat-arrow {
  color: #4caf50;
  transform: translateX(8px) scale(1.1);
  background: rgba(76, 175, 80, 0.15);
}

/* 快捷操作 */
.quick-actions {
  margin-bottom: 32px;
}

.quick-actions :deep(.el-card) {
  border-radius: 24px;
  box-shadow: 
    0 6px 20px rgba(76, 175, 80, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(76, 175, 80, 0.08);
  overflow: hidden;
}

.quick-actions :deep(.el-card__header) {
  background: 
    linear-gradient(90deg, #f1f8e9 0%, #dcedc8 50%, #c5e1a5 100%);
  border-bottom: 2px solid rgba(139, 195, 74, 0.1);
  padding: 20px 28px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  padding: 16px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: 
    linear-gradient(145deg, rgba(255, 255, 255, 0.99) 0%, rgba(255, 255, 255, 0.97) 100%);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(76, 175, 80, 0.08);
  text-align: center;
}

.action-item:hover {
  transform: translateY(-6px);
  box-shadow: 
    0 12px 32px rgba(76, 175, 80, 0.15),
    0 4px 16px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-color: rgba(76, 175, 80, 0.2);
}

.action-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 6px 20px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.action-item:hover .action-icon-box {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 
    0 10px 28px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.action-icon-box.primary {
  background: 
    linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
}

.action-icon-box.success {
  background: 
    linear-gradient(135deg, #43a047 0%, #66bb6a 100%);
}

.action-icon-box.warning {
  background: 
    linear-gradient(135deg, #ffa726 0%, #ffb74d 100%);
}

.action-icon-box.info {
  background: 
    linear-gradient(135deg, #42a5f5 0%, #64b5f6 100%);
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-title {
  font-size: 15px;
  font-weight: 700;
  color: #1b5e20;
  letter-spacing: 0.3px;
}

.action-desc {
  font-size: 12px;
  font-weight: 500;
  color: #558b2f;
  letter-spacing: 0.2px;
}

/* 最新推荐和需求 */
.latest-recommendations,
.my-requirements {
  margin-bottom: 32px;
}

.latest-recommendations :deep(.el-card),
.my-requirements :deep(.el-card) {
  border-radius: 24px;
  box-shadow: 
    0 6px 20px rgba(76, 175, 80, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(76, 175, 80, 0.08);
  overflow: hidden;
}

.latest-recommendations :deep(.el-card__header),
.my-requirements :deep(.el-card__header) {
  background: 
    linear-gradient(90deg, #f1f8e9 0%, #dcedc8 50%, #c5e1a5 100%);
  border-bottom: 2px solid rgba(139, 195, 74, 0.1);
  padding: 20px 28px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  font-size: 18px;
  color: #1b5e20;
}

.header-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: 
    linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  border-radius: 12px;
  font-size: 22px;
  color: white;
  box-shadow: 
    0 4px 12px rgba(76, 175, 80, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.header-title {
  letter-spacing: 0.5px;
}

.view-more-btn,
.create-btn {
  margin-left: auto !important;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
}

.loading-container {
  padding: 32px;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  padding: 16px;
}

.recommendation-item {
  border: 2px solid rgba(76, 175, 80, 0.12);
  border-radius: 20px;
  padding: 22px;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  background: 
    linear-gradient(145deg, rgba(255, 255, 255, 0.99) 0%, rgba(255, 255, 255, 0.97) 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.recommendation-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: 
    linear-gradient(90deg, #4caf50, #66bb6a, #81c784);
  transform: scaleX(0);
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.recommendation-item:hover {
  border-color: #66bb6a;
  box-shadow: 
    0 12px 40px rgba(76, 175, 80, 0.2),
    0 6px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-8px);
}

.recommendation-item:hover::before {
  transform: scaleX(1);
}

.item-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  font-size: 22px;
  box-shadow: 
    0 6px 16px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.recommendation-item:hover .item-badge {
  transform: scale(1.1) rotate(-8deg);
  box-shadow: 
    0 10px 24px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.item-badge.product {
  background: 
    linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
}

.item-badge.announcement {
  background: 
    linear-gradient(135deg, #ffa726 0%, #ffb74d 100%);
  color: white;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.recommendation-item h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1b5e20;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.2px;
}

.item-description {
  color: #558b2f;
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 44px;
}

.item-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  flex-wrap: wrap;
}

.item-meta .price {
  color: #e53935;
  font-weight: 800;
  background: 
    linear-gradient(135deg, #e53935 0%, #ff7043 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.item-meta .distance {
  color: #43a047;
  font-weight: 700;
}

.item-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.item-action {
  margin-top: auto;
}

.item-action .el-button {
  width: 100%;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.recommendation-item:hover .item-action .el-button {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

/* 需求表格 */
.requirements-table :deep(.el-table) {
  font-size: 14px;
}

.status-tag {
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
}

/* 订单和需求列表 */
.orders-list,
.requirements-manage {
  padding: 24px;
}

/* 响应式设计 */
@media (max-width: 1600px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .recommendations-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1200px) {
  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .purchaser-dashboard {
    padding: 16px;
    background: 
      radial-gradient(ellipse at 50% 0%, rgba(76, 175, 80, 0.1) 0%, transparent 50%),
      linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  }

  .header-content {
    flex-direction: column;
    gap: 24px;
    padding: 28px 24px;
    text-align: center;
  }

  .header-left h1 {
    justify-content: center;
    font-size: 28px;
    gap: 10px;
  }

  .icon-wrapper {
    width: 48px;
    height: 48px;
  }

  .icon-wrapper .el-icon {
    font-size: 28px;
  }

  .welcome-text {
    padding-left: 0;
  }

  .header-right {
    width: 100%;
    flex-direction: column;
  }

  .header-right .el-button {
    width: 100%;
  }

  .stats-cards {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .stat-card {
    padding: 24px;
  }

  .stat-icon {
    width: 64px;
    height: 64px;
    font-size: 30px;
  }

  .stat-value {
    font-size: 38px;
  }

  .recommendations-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .dashboard-tabs :deep(.el-tabs__item) {
    padding: 14px 24px;
    font-size: 14px;
  }

  .tab-content {
    padding: 24px 16px;
  }
}
</style>
