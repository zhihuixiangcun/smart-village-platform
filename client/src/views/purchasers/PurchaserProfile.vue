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
  background: linear-gradient(180deg, #f1f8e9 0%, #dcedc8 30%, #c5e1a5 70%, #aed581 100%);
  position: relative;
  overflow-x: hidden;
}

/* 美化滚动条 */
.purchaser-profile::-webkit-scrollbar {
  width: 10px;
}

.purchaser-profile::-webkit-scrollbar-track {
  background: rgba(76, 175, 80, 0.05);
  border-radius: 10px;
}

.purchaser-profile::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8bc34a 0%, #66bb6a 100%);
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.purchaser-profile::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #7cb342 0%, #4caf50 100%);
  background-clip: content-box;
}

/* 添加页面加载动画 */
.purchaser-profile {
  animation: pageLoad 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes pageLoad {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.purchaser-profile::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(76, 175, 80, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(139, 195, 74, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(205, 220, 57, 0.05) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

.profile-header {
  position: relative;
  margin-bottom: 32px;
  z-index: 1;
}

.header-bg {
  height: 200px;
  background: linear-gradient(135deg, #43a047 0%, #66bb6a 25%, #8bc34a 50%, #9ccc65 75%, #aed581 100%);
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3);
}

.header-bg::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background:
    radial-gradient(circle at 30% 70%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 40%);
  animation: floatLight 25s ease-in-out infinite;
}

.header-bg::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  animation: shimmer 15s ease-in-out infinite;
}

@keyframes floatLight {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(2%, 2%) rotate(90deg);
  }
  50% {
    transform: translate(-1%, 3%) rotate(180deg);
  }
  75% {
    transform: translate(-2%, -1%) rotate(270deg);
  }
}

@keyframes shimmer {
  0%, 100% {
    opacity: 0;
    transform: translateX(-100%);
  }
  50% {
    opacity: 1;
    transform: translateX(100%);
  }
}

.header-content {
  max-width: 1280px;
  margin: -100px auto 0;
  padding: 0 32px 32px;
  display: flex;
  gap: 32px;
  align-items: flex-end;
  position: relative;
  z-index: 1;
  animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar-section {
  position: relative;
  flex-shrink: 0;
  animation: pulseIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes pulseIn {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.avatar-section :deep(.el-avatar) {
  border: 6px solid white;
  box-shadow:
    0 12px 40px rgba(76, 175, 80, 0.4),
    0 8px 24px rgba(0, 0, 0, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.5);
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 50%, #c5e1a5 100%);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.avatar-section :deep(.el-avatar):hover {
  transform: scale(1.05) translateY(-4px);
  box-shadow:
    0 16px 48px rgba(76, 175, 80, 0.5),
    0 12px 32px rgba(0, 0, 0, 0.15),
    inset 0 2px 4px rgba(255, 255, 255, 0.5);
}

.verification-badge {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: linear-gradient(135deg, #43a047 0%, #66bb6a 100%);
  color: white;
  padding: 7px 16px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow:
    0 6px 16px rgba(76, 175, 80, 0.5),
    0 2px 8px rgba(0, 0, 0, 0.1);
  font-weight: 600;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  animation: badgePop 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes badgePop {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.verification-badge:hover {
  transform: scale(1.05);
  box-shadow:
    0 8px 20px rgba(76, 175, 80, 0.6),
    0 4px 12px rgba(0, 0, 0, 0.15);
}

.info-section {
  flex: 1;
  padding-bottom: 12px;
  animation: fadeInRight 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.user-name {
  font-size: 32px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0 0 14px;
  text-shadow:
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 0 20px rgba(76, 175, 80, 0.2);
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #388e3c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.user-type {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0 0 12px;
  flex-wrap: wrap;
}

.user-type :deep(.el-tag) {
  padding: 10px 18px;
  font-weight: 600;
  border-radius: 12px;
  box-shadow:
    0 4px 12px rgba(76, 175, 80, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-type :deep(.el-tag:hover) {
  transform: translateY(-2px);
  box-shadow:
    0 6px 16px rgba(76, 175, 80, 0.2),
    0 4px 8px rgba(0, 0, 0, 0.1);
}

.user-id {
  color: #558b2f;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  padding: 6px 14px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow:
    0 2px 8px rgba(76, 175, 80, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(76, 175, 80, 0.1);
  transition: all 0.3s ease;
}

.user-id:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.8) 100%);
  box-shadow:
    0 4px 12px rgba(76, 175, 80, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.user-bio {
  color: #33691e;
  margin: 14px 0;
  line-height: 1.8;
  font-size: 15px;
  font-style: italic;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(241, 248, 233, 0.6) 100%);
  padding: 14px 20px;
  border-radius: 14px;
  border-left: 5px solid #8bc34a;
  backdrop-filter: blur(10px);
  box-shadow:
    0 4px 16px rgba(76, 175, 80, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

.user-bio:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(241, 248, 233, 0.7) 100%);
  box-shadow:
    0 6px 20px rgba(76, 175, 80, 0.12),
    0 3px 10px rgba(0, 0, 0, 0.06),
    inset 0 1px 2px rgba(255, 255, 255, 0.5);
  transform: translateX(4px);
}

.user-stats {
  display: flex;
  gap: 48px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid rgba(76, 175, 80, 0.15);
  animation: statsFadeIn 1s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
}

@keyframes statsFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 12px 20px;
  border-radius: 16px;
  position: relative;
}

.stat-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(139, 195, 74, 0.05) 100%);
  border-radius: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.stat-item:hover::before {
  opacity: 1;
}

.stat-item:hover {
  transform: translateY(-4px) scale(1.05);
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #2e7d32 0%, #4caf50 50%, #66bb6a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 4px rgba(76, 175, 80, 0.2));
  transition: all 0.3s ease;
}

.stat-item:hover .stat-value {
  filter: drop-shadow(0 4px 8px rgba(76, 175, 80, 0.3));
  transform: scale(1.1);
}

.stat-label {
  font-size: 13px;
  color: #558b2f;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  transition: all 0.3s ease;
}

.stat-item:hover .stat-label {
  color: #33691e;
  transform: translateY(2px);
}

.action-section {
  display: flex;
  gap: 16px;
  padding-bottom: 12px;
  animation: fadeInRight 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
}

.action-section :deep(.el-button) {
  padding: 14px 28px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.3px;
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.1),
    0 3px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.action-section :deep(.el-button)::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
}

.action-section :deep(.el-button:hover)::before {
  left: 100%;
}

.action-section :deep(.el-button:hover) {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.15),
    0 4px 14px rgba(0, 0, 0, 0.08);
}

.action-section :deep(.el-button:active) {
  transform: translateY(-1px) scale(0.98);
}

.action-section :deep(.el-button--primary) {
  background: linear-gradient(135deg, #43a047 0%, #66bb6a 50%, #8bc34a 100%);
  border: none;
  color: white;
  box-shadow:
    0 6px 20px rgba(76, 175, 80, 0.3),
    0 3px 10px rgba(76, 175, 80, 0.2);
}

.action-section :deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #388e3c 0%, #4caf50 50%, #7cb342 100%);
  box-shadow:
    0 8px 28px rgba(76, 175, 80, 0.4),
    0 4px 14px rgba(76, 175, 80, 0.3);
}

.action-section :deep(.el-button--primary):active {
  background: linear-gradient(135deg, #2e7d32 0%, #43a047 50%, #66bb6a 100%);
}

.action-section :deep(.el-button--default) {
  background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
  border: 2px solid rgba(76, 175, 80, 0.2);
  color: #2e7d32;
}

.action-section :deep(.el-button--default:hover) {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
  border-color: #66bb6a;
  box-shadow:
    0 8px 28px rgba(76, 175, 80, 0.2),
    0 4px 14px rgba(76, 175, 80, 0.1);
}

.profile-main {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 32px;
  padding: 0 32px 32px;
  position: relative;
  z-index: 1;
}

.profile-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: slideInLeft 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.sidebar-card {
  border-radius: 24px;
  box-shadow:
    0 12px 40px rgba(76, 175, 80, 0.15),
    0 6px 20px rgba(0, 0, 0, 0.06),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.9);
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 248, 233, 0.9) 100%);
  backdrop-filter: blur(20px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.sidebar-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.8s ease;
  pointer-events: none;
}

.sidebar-card:hover::before {
  left: 100%;
}

.sidebar-card:hover {
  box-shadow:
    0 16px 48px rgba(76, 175, 80, 0.2),
    0 8px 24px rgba(0, 0, 0, 0.08),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  border-color: rgba(76, 175, 80, 0.2);
}

.sidebar-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 50%, #c5e1a5 100%);
  border-bottom: 2px solid rgba(76, 175, 80, 0.15);
  padding: 20px 24px;
  font-weight: 700;
  color: #1b5e20;
  font-size: 16px;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.sidebar-card :deep(.el-card__body) {
  padding: 16px 8px;
}

.sidebar-card :deep(.el-menu) {
  border: none;
  background: transparent;
  padding: 8px 0;
}

.sidebar-card :deep(.el-menu-item) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin: 6px 12px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 500;
  color: #558b2f;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.sidebar-card :deep(.el-menu-item)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 0;
  background: linear-gradient(180deg, #4caf50 0%, #8bc34a 100%);
  border-radius: 0 4px 4px 0;
  transition: height 0.3s ease;
}

.sidebar-card :deep(.el-menu-item:hover)::before {
  height: 60%;
}

.sidebar-card :deep(.el-menu-item:hover) {
  background: linear-gradient(90deg, rgba(76, 175, 80, 0.12) 0%, rgba(139, 195, 74, 0.08) 100%);
  color: #2e7d32;
  transform: translateX(4px);
}

.sidebar-card :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 50%, #8bc34a 100%);
  color: white;
  box-shadow:
    0 6px 20px rgba(76, 175, 80, 0.35),
    0 3px 10px rgba(0, 0, 0, 0.1);
  transform: translateX(8px) scale(1.02);
}

.sidebar-card :deep(.el-menu-item.is-active)::before {
  height: 70%;
  background: rgba(255, 255, 255, 0.8);
}

.sidebar-card :deep(.el-menu-item .el-icon) {
  font-size: 20px;
  transition: transform 0.3s ease;
}

.sidebar-card :deep(.el-menu-item:hover .el-icon) {
  transform: scale(1.1) rotate(5deg);
}

.sidebar-card :deep(.el-menu-item.is-active .el-icon) {
  transform: scale(1.15);
}

.badge {
  margin-left: auto;
  background: linear-gradient(135deg, #ef5350 0%, #e57373 100%);
  box-shadow:
    0 4px 12px rgba(239, 83, 80, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.5);
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.contact-card {
  animation: slideInLeft 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both;
}

.contact-card .card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 15px;
  color: #2e7d32;
}

.contact-card .card-header .el-icon {
  font-size: 20px;
  color: #4caf50;
}

.contact-info p {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  color: #558b2f;
  font-size: 14px;
  font-weight: 500;
  padding: 14px 16px;
  background: linear-gradient(90deg, rgba(76, 175, 80, 0.06) 0%, rgba(139, 195, 74, 0.04) 100%);
  border-radius: 14px;
  border-left: 4px solid #8bc34a;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.contact-info p::before {
  content: '';
  position: absolute;
  left: -100%;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.1), transparent);
  transition: left 0.5s ease;
}

.contact-info p:hover::before {
  left: 100%;
}

.contact-info p:hover {
  background: linear-gradient(90deg, rgba(76, 175, 80, 0.12) 0%, rgba(139, 195, 74, 0.08) 100%);
  transform: translateX(6px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
  border-left-color: #66bb6a;
}

.contact-info p .el-icon {
  font-size: 20px;
  color: #4caf50;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.contact-info p:hover .el-icon {
  transform: scale(1.15) rotate(5deg);
  color: #388e3c;
}

.profile-content {
  min-height: 600px;
  animation: slideInRight 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.content-panel {
  animation: panelFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes panelFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.content-panel :deep(.el-card) {
  border-radius: 20px;
  border: 2px solid rgba(76, 175, 80, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 248, 233, 0.92) 100%);
  backdrop-filter: blur(20px);
  box-shadow:
    0 8px 32px rgba(76, 175, 80, 0.1),
    0 4px 16px rgba(0, 0, 0, 0.04),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.content-panel :deep(.el-card)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent 0%, #4caf50 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.content-panel :deep(.el-card):hover::before {
  opacity: 1;
}

.content-panel :deep(.el-card):hover {
  box-shadow:
    0 12px 40px rgba(76, 175, 80, 0.15),
    0 6px 20px rgba(0, 0, 0, 0.06),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  border-color: rgba(76, 175, 80, 0.15);
}

.content-panel :deep(.el-card__header) {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 50%, #c5e1a5 100%);
  border-bottom: 2px solid rgba(76, 175, 80, 0.15);
  font-weight: 700;
  color: #1b5e20;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.content-panel :deep(.el-table) {
  border-radius: 16px;
  overflow: hidden;
}

.content-panel :deep(.el-table__header th) {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
  color: #2e7d32;
  font-weight: 600;
  border-bottom: 2px solid rgba(76, 175, 80, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
}

.content-panel :deep(.el-table__body tr) {
  transition: all 0.3s ease;
}

.content-panel :deep(.el-table__row:hover) {
  background: linear-gradient(90deg, rgba(76, 175, 80, 0.08) 0%, rgba(139, 195, 74, 0.05) 100%);
  transform: scale(1.005);
}

/* 优化分页器样式 */
.content-panel :deep(.el-pagination) {
  margin-top: 24px;
  padding: 16px 0;
}

.content-panel :deep(.el-pagination.is-background .el-pager li) {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
  border: 1px solid rgba(76, 175, 80, 0.2);
  color: #2e7d32;
  font-weight: 500;
  transition: all 0.3s ease;
}

.content-panel :deep(.el-pagination.is-background .el-pager li:hover) {
  background: linear-gradient(135deg, #8bc34a 0%, #9ccc65 100%);
  color: white;
  transform: scale(1.1);
}

.content-panel :deep(.el-pagination.is-background .el-pager li.is-active) {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

/* 优化按钮组样式 */
.content-panel :deep(.el-button-group .el-button) {
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.content-panel :deep(.el-button--success) {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  border: none;
}

.content-panel :deep(.el-button--warning) {
  background: linear-gradient(135deg, #ff9800 0%, #ffa726 100%);
  border: none;
}

.content-panel :deep(.el-button--danger) {
  background: linear-gradient(135deg, #f44336 0%, #ef5350 100%);
  border: none;
}

.content-panel :deep(.el-button--info) {
  background: linear-gradient(135deg, #2196f3 0%, #42a5f5 100%);
  border: none;
}

/* 优化标签样式 */
.content-panel :deep(.el-tag--success) {
  background: linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%);
  border-color: #8bc34a;
  color: #2e7d32;
}

.content-panel :deep(.el-tag--warning) {
  background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%);
  border-color: #ffb74d;
  color: #ef6c00;
}

.content-panel :deep(.el-tag--danger) {
  background: linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%);
  border-color: #ef5350;
  color: #c62828;
}

.content-panel :deep(.el-tag--info) {
  background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%);
  border-color: #64b5f6;
  color: #1565c0;
}

@media (max-width: 1200px) {
  .profile-main {
    grid-template-columns: 280px 1fr;
    gap: 24px;
    padding: 0 24px 24px;
  }

  .header-content {
    gap: 24px;
    padding: 0 24px 24px;
  }
}

@media (max-width: 1024px) {
  .profile-main {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 0 20px 20px;
  }

  .profile-sidebar {
    order: 2;
  }

  .profile-content {
    order: 1;
  }

  .sidebar-card {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .purchaser-profile {
    background: linear-gradient(180deg, #f1f8e9 0%, #dcedc8 100%);
  }

  .header-bg {
    height: 160px;
  }

  .header-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 16px 20px;
    margin-top: -80px;
    gap: 20px;
  }

  .avatar-section :deep(.el-avatar) {
    width: 100px !important;
    height: 100px !important;
    border-width: 4px;
  }

  .verification-badge {
    bottom: -6px;
    right: -6px;
    padding: 5px 12px;
    font-size: 12px;
  }

  .user-name {
    font-size: 24px;
  }

  .user-stats {
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
    padding-top: 16px;
  }

  .stat-item {
    padding: 10px 16px;
    min-width: 80px;
  }

  .stat-value {
    font-size: 28px;
  }

  .stat-label {
    font-size: 11px;
  }

  .user-type {
    justify-content: center;
    gap: 12px;
  }

  .user-type :deep(.el-tag) {
    padding: 8px 14px;
    font-size: 13px;
  }

  .info-section {
    width: 100%;
  }

  .user-bio {
    font-size: 14px;
    padding: 12px 16px;
  }

  .action-section {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .action-section :deep(.el-button) {
    width: 100%;
    padding: 12px 20px;
    font-size: 14px;
  }

  .sidebar-card :deep(.el-menu-item) {
    padding: 14px 16px;
    margin: 4px 8px;
    font-size: 14px;
  }

  .sidebar-card :deep(.el-menu-item .el-icon) {
    font-size: 18px;
  }

  .contact-info p {
    font-size: 13px;
    padding: 12px 14px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 12px 16px;
  }

  .user-name {
    font-size: 20px;
  }

  .user-stats {
    gap: 16px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-label {
    font-size: 10px;
  }

  .action-section :deep(.el-button) {
    padding: 10px 16px;
    font-size: 13px;
  }

  .sidebar-card :deep(.el-menu-item) {
    padding: 12px 14px;
    margin: 3px 6px;
  }

  .contact-info p {
    padding: 10px 12px;
    font-size: 12px;
  }
}

/* 优化对话框样式 */
:deep(.el-dialog) {
  border-radius: 20px;
  box-shadow:
    0 20px 60px rgba(76, 175, 80, 0.2),
    0 10px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(20px);
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
  border-bottom: 2px solid rgba(76, 175, 80, 0.15);
  border-radius: 20px 20px 0 0;
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: #1b5e20;
  font-weight: 700;
  font-size: 18px;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px 24px;
  border-top: 2px solid rgba(76, 175, 80, 0.1);
}

/* 优化表单样式 */
:deep(.el-form-item__label) {
  color: #558b2f;
  font-weight: 600;
}

:deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow:
    0 2px 8px rgba(76, 175, 80, 0.08),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow:
    0 4px 12px rgba(76, 175, 80, 0.12),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 2px rgba(76, 175, 80, 0.2),
    0 4px 12px rgba(76, 175, 80, 0.15);
}

/* 优化下拉菜单样式 */
:deep(.el-select .el-input__wrapper) {
  border-radius: 12px;
}

:deep(.el-select-dropdown__item) {
  border-radius: 8px;
  margin: 4px 8px;
  transition: all 0.3s ease;
}

:deep(.el-select-dropdown__item:hover) {
  background: linear-gradient(90deg, rgba(76, 175, 80, 0.1) 0%, rgba(139, 195, 74, 0.05) 100%);
}

:deep(.el-select-dropdown__item.is-selected) {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  color: white;
  font-weight: 600;
}

/* 优化消息提示样式 */
:deep(.el-message) {
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(20px);
  animation: messageSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

:deep(.el-message--success) {
  background: linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%);
  border: 2px solid #8bc34a;
}

:deep(.el-message--error) {
  background: linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%);
  border: 2px solid #ef5350;
}

:deep(.el-message--warning) {
  background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%);
  border: 2px solid #ffb74d;
}

:deep(.el-message--info) {
  background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%);
  border: 2px solid #64b5f6;
}

/* 优化加载动画 */
:deep(.el-loading-spinner) {
  color: #4caf50;
}

:deep(.el-loading-spinner .path) {
  stroke: #4caf50;
}

:deep(.el-loading-mask) {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
}

/* 优化空状态 */
:deep(.el-empty) {
  padding: 60px 20px;
}

:deep(.el-empty__description) {
  color: #558b2f;
  font-size: 15px;
  margin-top: 20px;
}

:deep(.el-empty__image svg) {
  fill: #8bc34a;
}

/* 优化抽屉样式 */
:deep(.el-drawer) {
  border-radius: 20px 0 0 20px;
}

:deep(.el-drawer__header) {
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
  border-bottom: 2px solid rgba(76, 175, 80, 0.15);
  padding: 20px 24px;
}

:deep(.el-drawer__title) {
  color: #1b5e20;
  font-weight: 700;
  font-size: 18px;
}

/* 优化时间轴样式 */
:deep(.el-timeline-item__tail) {
  border-left: 2px solid rgba(76, 175, 80, 0.2);
}

:deep(.el-timeline-item__node) {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

:deep(.el-timeline-item__wrapper) {
  padding-left: 28px;
}

/* 优化进度条样式 */
:deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
  border-radius: 10px;
}

:deep(.el-progress__text) {
  color: #2e7d32;
  font-weight: 600;
}

/* 优化标签页样式 */
:deep(.el-tabs__item) {
  color: #558b2f;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-tabs__item:hover) {
  color: #2e7d32;
}

:deep(.el-tabs__item.is-active) {
  color: #4caf50;
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
  height: 3px;
  border-radius: 3px;
}

/* 优化折叠面板样式 */
:deep(.el-collapse-item__header) {
  background: linear-gradient(135deg, rgba(241, 248, 233, 0.6) 0%, rgba(220, 237, 200, 0.4) 100%);
  border-radius: 12px;
  margin: 8px 0;
  color: #2e7d32;
  font-weight: 600;
  transition: all 0.3s ease;
}

:deep(.el-collapse-item__header:hover) {
  background: linear-gradient(135deg, rgba(241, 248, 233, 0.8) 0%, rgba(220, 237, 200, 0.6) 100%);
  transform: translateX(4px);
}

:deep(.el-collapse-item__wrap) {
  background: rgba(241, 248, 233, 0.3);
  border-radius: 0 0 12px 12px;
}

:deep(.el-collapse-item__content) {
  color: #558b2f;
  padding: 20px;
}

/* 打印样式优化 */
@media print {
  .purchaser-profile {
    background: white !important;
  }

  .header-bg {
    background: #4caf50 !important;
  }

  .action-section {
    display: none;
  }

  .profile-sidebar {
    display: none;
  }

  .profile-main {
    display: block;
  }

  .content-panel {
    box-shadow: none !important;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .purchaser-profile {
    background: #f1f8e9 !important;
  }

  .user-name {
    color: #1b5e20 !important;
    -webkit-text-fill-color: #1b5e20 !important;
  }

  .stat-value {
    -webkit-text-fill-color: #2e7d32 !important;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 暗黑模式支持（可选） */
@media (prefers-color-scheme: dark) {
  .purchaser-profile {
    background: linear-gradient(180deg, #1b5e20 0%, #2e7d32 30%, #388e3c 70%, #43a047 100%);
  }

  .header-bg {
    background: linear-gradient(135deg, #2e7d32 0%, #43a047 50%, #66bb6a 100%);
  }

  .user-name {
    color: #a5d6a7;
    -webkit-text-fill-color: #a5d6a7;
  }

  .user-bio {
    background: rgba(0, 0, 0, 0.2);
    color: #a5d6a7;
    border-left-color: #66bb6a;
  }

  .sidebar-card {
    background: linear-gradient(180deg, rgba(27, 94, 32, 0.95) 0%, rgba(46, 125, 50, 0.9) 100%);
    border-color: rgba(76, 175, 80, 0.3);
  }

  .sidebar-card :deep(.el-card__header) {
    background: linear-gradient(135deg, #2e7d32 0%, #388e3c 50%, #43a047 100%);
    color: #a5d6a7;
  }

  .sidebar-card :deep(.el-menu-item) {
    color: #a5d6a7;
  }

  .sidebar-card :deep(.el-menu-item:hover) {
    background: rgba(76, 175, 80, 0.2);
    color: #c5e1a5;
  }
}

/* 添加平滑滚动 */
html {
  scroll-behavior: smooth;
}

/* 优化选择文本的样式 */
::selection {
  background: rgba(76, 175, 80, 0.2);
  color: #1b5e20;
}

/* 优化链接样式 */
a {
  color: #4caf50;
  text-decoration: none;
  transition: all 0.3s ease;
}

a:hover {
  color: #388e3c;
  text-decoration: underline;
}

/* 优化图片样式 */
img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

/* 优化输入框占位符样式 */
:deep(.el-input__inner::placeholder) {
  color: #9e9e9e;
  font-style: italic;
}

/* 优化禁用状态 */
:deep(.is-disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 优化焦点状态 */
:deep(.el-button:focus),
:deep(.el-input:focus),
:deep(.el-select:focus) {
  outline: none;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
}
</style>
