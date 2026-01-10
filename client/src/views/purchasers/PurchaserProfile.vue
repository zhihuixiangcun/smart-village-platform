<template>
  <div class="purchaser-profile">
    <!-- 页面头部 -->
    <div class="profile-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="avatar-section">
          <el-avatar :size="100" :src="purchaserInfo?.avatar || defaultAvatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="verification-badge" v-if="purchaserInfo?.verification?.isVerified">
            <el-icon><CircleCheck /></el-icon>
            已认证
          </div>
        </div>
        <div class="info-section">
          <h2 class="user-name">{{ purchaserInfo?.basicInfo?.name || '采购商' }}</h2>
          <p class="user-type">
            <el-tag :type="purchaserInfo?.purchaserType === 'individual' ? 'success' : 'warning'">
              {{ purchaserInfo?.purchaserType === 'individual' ? '个人采购商' : '商家采购商' }}
            </el-tag>
            <span class="user-id">ID: {{ purchaserInfo?._id?.slice(-6) }}</span>
          </p>
          <p class="user-bio" v-if="purchaserInfo?.individualInfo?.bio">
            {{ purchaserInfo.individualInfo.bio }}
          </p>
          <div class="user-stats">
            <div class="stat-item">
              <span class="stat-value">{{ stats.totalOrders }}</span>
              <span class="stat-label">订单数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.suppliers }}</span>
              <span class="stat-label">关注供应商</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">¥{{ stats.totalAmount }}</span>
              <span class="stat-label">采购总额</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.rating }}</span>
              <span class="stat-label">评分</span>
            </div>
          </div>
        </div>
        <div class="action-section">
          <el-button type="primary" @click="handleEditProfile">
            <el-icon><Edit /></el-icon>
            编辑资料
          </el-button>
          <el-button @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="profile-main">
      <!-- 左侧边栏 -->
      <div class="profile-sidebar">
        <el-card class="sidebar-card">
          <el-menu :default-active="activeTab" @select="handleTabSelect">
            <el-menu-item index="overview">
              <el-icon><DataBoard /></el-icon>
              <span>概览</span>
            </el-menu-item>
            <el-menu-item index="nearby">
              <el-icon><Location /></el-icon>
              <span>附近商家</span>
            </el-menu-item>
            <el-menu-item index="lifestyle">
              <el-icon><Compass /></el-icon>
              <span>吃喝玩乐</span>
            </el-menu-item>
            <el-menu-item index="transportation">
              <el-icon><Van /></el-icon>
              <span>交通出行</span>
            </el-menu-item>
            <el-menu-item index="carpooling">
              <el-icon><Share /></el-icon>
              <span>拼车服务</span>
            </el-menu-item>
            <el-menu-item index="products">
              <el-icon><ShoppingBag /></el-icon>
              <span>附近商品</span>
            </el-menu-item>
            <el-menu-item index="orders">
              <el-icon><ShoppingCart /></el-icon>
              <span>我的订单</span>
              <el-badge v-if="stats.pendingOrders > 0" :value="stats.pendingOrders" class="badge" />
            </el-menu-item>
            <el-menu-item index="requirements">
              <el-icon><Document /></el-icon>
              <span>采购需求</span>
            </el-menu-item>
            <el-menu-item index="suppliers">
              <el-icon><UserFilled /></el-icon>
              <span>关注的供应商</span>
            </el-menu-item>
            <el-menu-item index="favorites">
              <el-icon><Star /></el-icon>
              <span>收藏夹</span>
            </el-menu-item>
            <el-menu-item index="messages">
              <el-icon><ChatDotRound /></el-icon>
              <span>消息中心</span>
              <el-badge
                v-if="stats.unreadMessages > 0"
                :value="stats.unreadMessages"
                class="badge"
              />
            </el-menu-item>
            <el-menu-item index="settings">
              <el-icon><Setting /></el-icon>
              <span>设置</span>
            </el-menu-item>
          </el-menu>
        </el-card>

        <!-- 快捷联系 -->
        <el-card class="contact-card">
          <template #header>
            <div class="card-header">
              <el-icon><Phone /></el-icon>
              <span>快捷联系</span>
            </div>
          </template>
          <div class="contact-info">
            <p>
              <el-icon><Message /></el-icon> 客服热线: 400-888-8888
            </p>
            <p>
              <el-icon><Clock /></el-icon> 工作时间: 9:00-18:00
            </p>
          </div>
        </el-card>
      </div>

      <!-- 右侧内容区 -->
      <div class="profile-content">
        <!-- 概览 -->
        <div v-show="activeTab === 'overview'" class="content-panel">
          <OverviewPanel :purchaser-info="purchaserInfo" :stats="stats" />
        </div>

        <!-- 附近商家 -->
        <div v-show="activeTab === 'nearby'" class="content-panel">
          <NearbySuppliers />
        </div>

        <!-- 吃喝玩乐 -->
        <div v-show="activeTab === 'lifestyle'" class="content-panel">
          <LifestyleServices />
        </div>

        <!-- 交通出行 -->
        <div v-show="activeTab === 'transportation'" class="content-panel">
          <TransportationServices />
        </div>

        <!-- 拼车服务 -->
        <div v-show="activeTab === 'carpooling'" class="content-panel">
          <CarpoolingService />
        </div>

        <!-- 附近商品 -->
        <div v-show="activeTab === 'products'" class="content-panel">
          <NearbyProducts />
        </div>

        <!-- 我的订单 -->
        <div v-show="activeTab === 'orders'" class="content-panel">
          <OrdersPanel @view-order="handleViewOrder" />
        </div>

        <!-- 采购需求 -->
        <div v-show="activeTab === 'requirements'" class="content-panel">
          <RequirementsPanel
            :requirements="requirements"
            @add="handleAddRequirement"
            @edit="handleEditRequirement"
            @delete="handleDeleteRequirement"
          />
        </div>

        <!-- 关注的供应商 -->
        <div v-show="activeTab === 'suppliers'" class="content-panel">
          <SuppliersPanel :suppliers="suppliers" @unfollow="handleUnfollow" />
        </div>

        <!-- 收藏夹 -->
        <div v-show="activeTab === 'favorites'" class="content-panel">
          <FavoritesPanel :favorites="favorites" @remove="handleRemoveFavorite" />
        </div>

        <!-- 消息中心 -->
        <div v-show="activeTab === 'messages'" class="content-panel">
          <MessagesPanel :messages="messages" @mark-read="handleMarkRead" />
        </div>

        <!-- 设置 -->
        <div v-show="activeTab === 'settings'" class="content-panel">
          <SettingsPanel :preferences="purchaserInfo?.preferences" @save="handleSaveSettings" />
        </div>
      </div>
    </div>

    <!-- 编辑资料对话框 - 生活服务集成 -->
    <EditProfileDialog
      v-model="editDialogVisible"
      :purchaser-info="purchaserInfo"
      @save="handleSaveProfile"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  User,
  CircleCheck,
  Edit,
  Refresh,
  DataBoard,
  ShoppingCart,
  Document,
  UserFilled,
  Star,
  ChatDotRound,
  Setting,
  Phone,
  Message,
  Clock,
  Location,
  Compass,
  Van,
  Share,
  ShoppingBag,
} from '@element-plus/icons-vue';
import api from '@/api';
import OverviewPanel from '@/components/purchaser/OverviewPanel.vue';
import OrdersPanel from '@/components/purchaser/OrdersPanel.vue';
import RequirementsPanel from '@/components/purchaser/RequirementsPanel.vue';
import SuppliersPanel from '@/components/purchaser/SuppliersPanel.vue';
import FavoritesPanel from '@/components/purchaser/FavoritesPanel.vue';
import MessagesPanel from '@/components/purchaser/MessagesPanel.vue';
import SettingsPanel from '@/components/purchaser/SettingsPanel.vue';
import EditProfileDialog from '@/components/purchaser/EditProfileDialog.vue';
import NearbySuppliers from '@/components/purchaser/NearbySuppliers.vue';
import LifestyleServices from '@/components/purchaser/LifestyleServices.vue';
import TransportationServices from '@/components/purchaser/TransportationServices.vue';
import CarpoolingService from '@/components/purchaser/CarpoolingService.vue';
import NearbyProducts from '@/components/purchaser/NearbyProducts.vue';

const router = useRouter();
const activeTab = ref('overview');
const purchaserInfo = ref(null);
const editDialogVisible = ref(false);

const defaultAvatar =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e0e0e0"/%3E%3C/svg%3E';

const stats = reactive({
  totalOrders: 0,
  pendingOrders: 0,
  suppliers: 0,
  totalAmount: 0,
  rating: 0,
  unreadMessages: 0,
});

const requirements = ref([]);
const suppliers = ref([]);
const favorites = ref([]);
const messages = ref([]);

// 获取采购商信息
const fetchPurchaserInfo = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/me');
    if (response.success) {
      purchaserInfo.value = response.data;
      // 更新统计数据
      stats.totalOrders = response.data.statistics?.totalOrders || 0;
      stats.totalAmount = (response.data.statistics?.totalPurchaseAmount || 0).toLocaleString();
      stats.rating = response.data.statistics?.averageRating?.toFixed(1) || '0.0';
    }
  } catch (error) {
    console.error('获取采购商信息失败', error);
    ElMessage.error('获取采购商信息失败');
  }
};

// 获取统计数据
const fetchStats = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/stats');
    if (response.success) {
      Object.assign(stats, response.data);
    }
  } catch (error) {
    console.error('获取统计数据失败', error);
  }
};

// 获取采购需求
const fetchRequirements = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/requirements');
    if (response.success) {
      requirements.value = response.data || [];
    }
  } catch (error) {
    console.error('获取采购需求失败', error);
  }
};

// 获取关注的供应商
const fetchSuppliers = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/suppliers');
    if (response.success) {
      suppliers.value = response.data || [];
      stats.suppliers = suppliers.value.length;
    }
  } catch (error) {
    console.error('获取供应商列表失败', error);
  }
};

// 获取收藏列表
const fetchFavorites = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/favorites');
    if (response.success) {
      favorites.value = response.data || [];
    }
  } catch (error) {
    console.error('获取收藏列表失败', error);
  }
};

// 获取消息列表
const fetchMessages = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/messages');
    if (response.success) {
      messages.value = response.data || [];
      stats.unreadMessages = messages.value.filter(m => !m.read).length;
    }
  } catch (error) {
    console.error('获取消息列表失败', error);
  }
};

// 标签页切换
const handleTabSelect = index => {
  activeTab.value = index;
  // 根据标签页加载对应数据
  switch (index) {
    case 'orders':
      // 订单数据在面板组件中加载
      break;
    case 'requirements':
      fetchRequirements();
      break;
    case 'suppliers':
      fetchSuppliers();
      break;
    case 'favorites':
      fetchFavorites();
      break;
    case 'messages':
      fetchMessages();
      break;
  }
};

// 编辑资料
const handleEditProfile = () => {
  editDialogVisible.value = true;
};

// 保存资料
const handleSaveProfile = async profileData => {
  try {
    const response = await api.put('/api/v1/purchaser/me', profileData);
    if (response.success) {
      ElMessage.success('保存成功');
      await fetchPurchaserInfo();
      editDialogVisible.value = false;
    }
  } catch (error) {
    console.error('保存资料失败', error);
    ElMessage.error('保存失败');
  }
};

// 刷新
const handleRefresh = async () => {
  await Promise.all([fetchPurchaserInfo(), fetchStats()]);
  ElMessage.success('刷新成功');
};

// 查看订单详情
const handleViewOrder = order => {
  router.push(`/purchaser/orders/${order._id}`);
};

// 添加采购需求
const handleAddRequirement = () => {
  router.push('/purchaser/requirements/create');
};

// 编辑采购需求
const handleEditRequirement = requirement => {
  router.push(`/purchaser/requirements/${requirement._id}/edit`);
};

// 删除采购需求
const handleDeleteRequirement = async requirement => {
  try {
    await api.delete(`/api/v1/purchaser/requirements/${requirement._id}`);
    ElMessage.success('删除成功');
    await fetchRequirements();
  } catch (error) {
    console.error('删除失败', error);
    ElMessage.error('删除失败');
  }
};

// 取消关注供应商
const handleUnfollow = async supplier => {
  try {
    await api.delete(`/api/v1/purchaser/suppliers/${supplier._id}`);
    ElMessage.success('已取消关注');
    await fetchSuppliers();
  } catch (error) {
    console.error('取消关注失败', error);
    ElMessage.error('操作失败');
  }
};

// 移除收藏
const handleRemoveFavorite = async favorite => {
  try {
    await api.delete(`/api/v1/purchaser/favorites/${favorite._id}`);
    ElMessage.success('已移除收藏');
    await fetchFavorites();
  } catch (error) {
    console.error('移除收藏失败', error);
    ElMessage.error('操作失败');
  }
};

// 标记消息已读
const handleMarkRead = async message => {
  try {
    await api.put(`/api/v1/purchaser/messages/${message._id}/read`);
    await fetchMessages();
  } catch (error) {
    console.error('标记失败', error);
  }
};

// 保存设置
const handleSaveSettings = async settings => {
  try {
    const response = await api.put('/api/v1/purchaser/preferences', settings);
    if (response.success) {
      ElMessage.success('设置保存成功');
      await fetchPurchaserInfo();
    }
  } catch (error) {
    console.error('保存设置失败', error);
    ElMessage.error('保存失败');
  }
};

onMounted(async () => {
  await Promise.all([fetchPurchaserInfo(), fetchStats()]);
});
</script>

<style scoped>
.purchaser-profile {
  min-height: 100vh;
  background: #f5f7fa;
}

.profile-header {
  position: relative;
  margin-bottom: 24px;
}

.header-bg {
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header-content {
  max-width: 1200px;
  margin: -60px auto 0;
  padding: 0 24px 24px;
  display: flex;
  gap: 24px;
  align-items: flex-end;
}

.avatar-section {
  position: relative;
  flex-shrink: 0;
}

.avatar-section :deep(.el-avatar) {
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.verification-badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  background: #67c23a;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.4);
}

.info-section {
  flex: 1;
  padding-bottom: 8px;
}

.user-name {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
}

.user-type {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px;
}

.user-id {
  color: #909399;
  font-size: 14px;
}

.user-bio {
  color: #606266;
  margin: 8px 0;
  line-height: 1.5;
}

.user-stats {
  display: flex;
  gap: 32px;
  margin-top: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.action-section {
  display: flex;
  gap: 12px;
  padding-bottom: 8px;
}

.profile-main {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  padding: 0 24px 24px;
}

.profile-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card :deep(.el-menu) {
  border: none;
}

.sidebar-card :deep(.el-menu-item) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  margin-left: auto;
}

.contact-card .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.contact-info p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  color: #606266;
  font-size: 14px;
}

.profile-content {
  min-height: 600px;
}

.content-panel {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .profile-main {
    grid-template-columns: 1fr;
  }

  .header-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .user-stats {
    justify-content: center;
  }

  .user-type {
    justify-content: center;
  }

  .info-section {
    width: 100%;
  }
}
</style>
