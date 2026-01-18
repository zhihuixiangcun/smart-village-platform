<template>
  <div class="purchaser-recommendations">
    <div class="page-header">
      <h1>智能推荐</h1>
      <p>基于您的采购偏好和位置为您推荐</p>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-bar">
      <el-card>
        <el-form :inline="true" :model="filters" label-width="80px">
          <el-form-item label="位置">
            <el-button @click="getCurrentLocation" :loading="locationLoading">
              <el-icon><Location /></el-icon>
              {{ currentLocation ? '已定位' : '获取当前位置' }}
            </el-button>
            <span v-if="currentLocation" class="location-text">
              {{ currentLocation.address || '当前位置' }}
            </span>
          </el-form-item>
          <el-form-item label="搜索半径">
            <el-select v-model="filters.radius" @change="fetchRecommendations">
              <el-option label="10公里" :value="10000" />
              <el-option label="30公里" :value="30000" />
              <el-option label="50公里" :value="50000" />
              <el-option label="100公里" :value="100000" />
            </el-select>
          </el-form-item>
          <el-form-item label="采购类目">
            <el-select
              v-model="filters.categories"
              multiple
              placeholder="选择类目"
              @change="fetchRecommendations"
            >
              <el-option label="谷物" value="谷物" />
              <el-option label="蔬菜" value="蔬菜" />
              <el-option label="水果" value="水果" />
              <el-option label="畜禽" value="畜禽" />
              <el-option label="水产" value="水产" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchRecommendations" :loading="loading">
              <el-icon><Search /></el-icon>
              搜索推荐
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 推荐结果统计 -->
    <div v-if="summary" class="summary-bar">
      <el-card>
        <div class="summary-content">
          <span class="summary-item">
            <el-icon><Document /></el-icon>
            共找到 <strong>{{ summary.total }}</strong> 条推荐
          </span>
          <span class="summary-item">
            <el-icon><ShoppingCart /></el-icon>
            农产品 <strong>{{ summary.products }}</strong> 条
          </span>
          <span class="summary-item">
            <el-icon><Bell /></el-icon>
            公告 <strong>{{ summary.announcements }}</strong> 条
          </span>
          <span class="summary-item">
            <el-icon><OfficeBuilding /></el-icon>
            村庄 <strong>{{ summary.villages }}</strong> 个
          </span>
        </div>
      </el-card>
    </div>

    <!-- 推荐列表 -->
    <div class="recommendations-list">
      <el-card v-if="loading" class="loading-card">
        <div class="loading-container">
          <el-icon class="is-loading" :size="48"><Loading /></el-icon>
          <p>正在为您搜索推荐...</p>
        </div>
      </el-card>

      <el-card v-else-if="recommendations.length === 0" class="empty-card">
        <el-empty description="暂无推荐内容">
          <el-button type="primary" @click="fetchRecommendations">刷新</el-button>
        </el-empty>
      </el-card>

      <div v-else class="recommendations-grid">
        <el-card
          v-for="item in recommendations"
          :key="item.id"
          class="recommendation-card"
          shadow="hover"
        >
          <div class="card-header">
            <el-tag :type="item.type === 'product' ? 'success' : 'info'" size="small">
              {{ item.type === 'product' ? '农产品' : '公告' }}
            </el-tag>
            <el-tag v-if="item.matchScore" type="warning" size="small">
              匹配度 {{ (item.matchScore * 100).toFixed(0) }}%
            </el-tag>
          </div>

          <h3 class="card-title">{{ item.productName || item.title }}</h3>

          <div class="card-content">
            <p v-if="item.type === 'product'" class="description">
              <el-icon><ShoppingCart /></el-icon>
              {{ item.category }} | {{ item.quantity }} {{ item.unit }}
            </p>
            <p v-else class="description">
              <el-icon><Document /></el-icon>
              {{ item.content?.substring(0, 100) }}...
            </p>

            <div class="meta-info">
              <div v-if="item.distance" class="meta-item">
                <el-icon><Location /></el-icon>
                <span>{{ item.distance.toFixed(1) }}km</span>
              </div>
              <div v-if="item.price" class="meta-item price">
                <el-icon><PriceTag /></el-icon>
                <span>¥{{ item.price }}/{{ item.unit }}</span>
              </div>
              <div v-if="item.supplier" class="meta-item">
                <el-icon><User /></el-icon>
                <span>{{ item.supplier.name }}</span>
              </div>
              <div v-if="item.createdAt" class="meta-item">
                <el-icon><Clock /></el-icon>
                <span>{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <el-button size="small" @click="handleViewDetail(item)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button
              v-if="item.type === 'product'"
              size="small"
              type="primary"
              @click="handleContact(item)"
            >
              <el-icon><ChatDotRound /></el-icon>
              联系供应商
            </el-button>
            <el-button v-if="item.type === 'product'" size="small" @click="handleAddToCart(item)">
              <el-icon><Plus /></el-icon>
              加入清单
            </el-button>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 附近村庄 -->
    <div v-if="nearbyVillages && nearbyVillages.length > 0" class="nearby-villages">
      <el-card>
        <template #header>
          <div class="card-header">
            <el-icon><OfficeBuilding /></el-icon>
            <span>附近村庄</span>
          </div>
        </template>
        <div class="villages-grid">
          <div v-for="village in nearbyVillages" :key="village.id" class="village-item">
            <h4>{{ village.name }}</h4>
            <p>
              <el-icon><User /></el-icon>
              人口: {{ village.population }}
            </p>
            <p>
              <el-icon><Location /></el-icon>
              距离: {{ village.distance.toFixed(1) }}km
            </p>
            <p v-if="village.contactPhone">
              <el-icon><Phone /></el-icon>
              {{ village.contactPhone }}
            </p>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      :title="currentItem?.productName || currentItem?.title"
      width="600px"
      destroy-on-close
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="类型">
            <el-tag :type="currentItem.type === 'product' ? 'success' : 'info'">
              {{ currentItem.type === 'product' ? '农产品' : '公告' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.matchScore" label="匹配度">
            {{ (currentItem.matchScore * 100).toFixed(0) }}%
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.category" label="类目">
            {{ currentItem.category }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.price" label="价格">
            ¥{{ currentItem.price }}/{{ currentItem.unit }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.distance" label="距离">
            {{ currentItem.distance.toFixed(1) }}km
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.createdAt" label="发布时间">
            {{ formatDate(currentItem.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.supplier" label="供应商" :span="2">
            {{ currentItem.supplier.name }} ({{ currentItem.supplier.phone }})
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="currentItem.content" class="detail-description">
          <h4>详细描述</h4>
          <p>{{ currentItem.content }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="currentItem?.type === 'product'"
          type="primary"
          @click="handleContact(currentItem)"
        >
          联系供应商
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Location,
  Search,
  Refresh,
  Document,
  ShoppingCart,
  Bell,
  OfficeBuilding,
  Loading,
  PriceTag,
  User,
  Clock,
  View,
  ChatDotRound,
  Plus,
  Phone,
} from '@element-plus/icons-vue';
import api from '@/api';

const router = useRouter();
const loading = ref(false);
const locationLoading = ref(false);
const detailVisible = ref(false);
const currentItem = ref(null);
const currentLocation = ref(null);
const recommendations = ref([]);
const nearbyVillages = ref([]);
const summary = ref(null);

const filters = reactive({
  radius: 50000,
  categories: [],
});

// 获取当前位置
const getCurrentLocation = () => {
  locationLoading.value = true;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        currentLocation.value = {
          coordinates: [position.coords.longitude, position.coords.latitude],
          address: '当前位置',
        };
        locationLoading.value = false;
        ElMessage.success('位置获取成功');
        fetchRecommendations();
      },
      () => {
        locationLoading.value = false;
        ElMessage.warning('位置获取失败，使用默认位置');
        currentLocation.value = {
          coordinates: [120.155, 30.274],
          address: '杭州市',
        };
        fetchRecommendations();
      }
    );
  } else {
    locationLoading.value = false;
    ElMessage.warning('浏览器不支持定位');
  }
};

// 获取推荐
const fetchRecommendations = async () => {
  loading.value = true;
  try {
    const params = {
      location: currentLocation.value?.coordinates,
      radius: filters.radius,
      categories: filters.categories,
    };
    const response = await api.get('/api/v1/purchaser/recommendations', { params });
    if (response.success) {
      recommendations.value = response.data.recommendations || [];
      nearbyVillages.value = response.data.nearbyVillages || [];
      summary.value = response.data.summary;
    }
  } catch (error) {
    console.error('获取推荐失败', error);
    ElMessage.error('获取推荐失败');
  } finally {
    loading.value = false;
  }
};

// 重置筛选
const resetFilters = () => {
  filters.radius = 50000;
  filters.categories = [];
  currentLocation.value = null;
  fetchRecommendations();
};

// 查看详情
const handleViewDetail = item => {
  currentItem.value = item;
  detailVisible.value = true;
};

// 联系供应商
const handleContact = item => {
  ElMessage.success('正在跳转到聊天界面...');
  // router.push(`/chat?supplier=${item.supplier?.id}`)
};

// 加入清单
const handleAddToCart = item => {
  ElMessage.success('已加入采购清单');
};

// 格式化日期
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 初始化
onMounted(() => {
  getCurrentLocation();
});
</script>

<style scoped>
.purchaser-recommendations {
  padding: 28px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%);
  min-height: 100vh;
}

.page-header {
  margin-bottom: 28px;
  text-align: center;
  padding: 28px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(139, 195, 74, 0.03) 0%, transparent 70%);
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.page-header h1 {
  font-size: 32px;
  color: #2e7d32;
  margin-bottom: 8px;
  font-weight: 800;
  background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 1;
}

.page-header p {
  color: #689f38;
  font-size: 16px;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.filter-bar {
  margin-bottom: 24px;
}

.filter-bar :deep(.el-card) {
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.filter-bar :deep(.el-card__body) {
  padding: 24px;
}

.location-text {
  margin-left: 16px;
  color: #43a047;
  font-size: 14px;
  font-weight: 600;
  background: rgba(76, 175, 80, 0.1);
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.summary-bar {
  margin-bottom: 24px;
}

.summary-bar :deep(.el-card) {
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.summary-bar :deep(.el-card__body) {
  padding: 20px 24px;
}

.summary-content {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #558b2f;
  font-size: 15px;
  font-weight: 500;
  background: rgba(76, 175, 80, 0.05);
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid rgba(76, 175, 80, 0.1);
  transition: all 0.3s;
}

.summary-item:hover {
  background: rgba(76, 175, 80, 0.1);
  transform: translateY(-2px);
}

.summary-item strong {
  color: #2e7d32;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #689f38;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.loading-container p {
  margin-top: 20px;
  font-size: 16px;
  font-weight: 500;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.recommendation-card {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}

.recommendation-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transform: scaleX(0);
  transition: transform 0.4s;
}

.recommendation-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(76, 175, 80, 0.25), 0 6px 20px rgba(0, 0, 0, 0.1);
}

.recommendation-card:hover::before {
  transform: scaleX(1);
}

.recommendation-card :deep(.el-card__body) {
  padding: 24px;
}

.recommendation-card .card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 8px;
  flex-wrap: wrap;
}

.card-title {
  font-size: 20px;
  color: #2e7d32;
  margin: 0 0 16px 0;
  min-height: 60px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 700;
  line-height: 1.4;
}

.card-content .description {
  color: #558b2f;
  font-size: 15px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.6;
  padding: 12px;
  background: rgba(76, 175, 80, 0.05);
  border-radius: 10px;
  border-left: 4px solid #8bc34a;
}

.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #689f38;
  font-size: 14px;
  background: rgba(76, 175, 80, 0.05);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.1);
  transition: all 0.3s;
}

.meta-item:hover {
  background: rgba(76, 175, 80, 0.1);
  transform: translateY(-2px);
}

.meta-item.price {
  color: #e53935;
  font-weight: 700;
  background: rgba(229, 57, 53, 0.05);
  border-color: rgba(229, 57, 53, 0.1);
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.card-actions :deep(.el-button) {
  flex: 1;
  min-width: 100px;
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-actions :deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-actions :deep(.el-button--primary) {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  border: none;
}

.card-actions :deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #43a047 0%, #7cb342 100%);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.nearby-villages {
  margin-top: 28px;
}

.nearby-villages :deep(.el-card) {
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.nearby-villages :deep(.el-card__header) {
  background: linear-gradient(90deg, #f1f8e9 0%, #dcedc8 100%);
  border-bottom: none;
  padding: 18px 24px;
}

.nearby-villages :deep(.card-header) {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 17px;
  color: #2e7d32;
}

.villages-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  padding: 8px;
}

.village-item {
  padding: 20px;
  border: 2px solid rgba(76, 175, 80, 0.1);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.village-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transform: scaleX(0);
  transition: transform 0.4s;
}

.village-item:hover {
  border-color: #4caf50;
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-4px);
}

.village-item:hover::before {
  transform: scaleX(1);
}

.village-item h4 {
  margin: 0 0 16px 0;
  color: #2e7d32;
  font-size: 17px;
  font-weight: 700;
}

.village-item p {
  margin: 10px 0;
  color: #558b2f;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.detail-content .detail-description {
  margin-top: 24px;
  padding: 20px;
  background: rgba(76, 175, 80, 0.05);
  border-radius: 12px;
  border-left: 4px solid #8bc34a;
}

.detail-description h4 {
  font-size: 18px;
  color: #2e7d32;
  margin-bottom: 16px;
  font-weight: 700;
}

.detail-description p {
  color: #558b2f;
  line-height: 1.8;
  font-size: 15px;
}

@media (max-width: 1200px) {
  .recommendations-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .villages-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .purchaser-recommendations {
    padding: 16px;
  }

  .page-header {
    padding: 20px;
  }

  .page-header h1 {
    font-size: 26px;
  }

  .recommendations-grid {
    grid-template-columns: 1fr;
  }

  .villages-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .summary-content {
    gap: 12px;
  }

  .summary-item {
    flex: 1;
    justify-content: center;
    font-size: 13px;
  }

  .card-actions {
    flex-direction: column;
  }

  .card-actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
