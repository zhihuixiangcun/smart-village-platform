<template>
  <div class="overview-panel">
    <!-- 快捷统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card pending">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pendingOrders }}</div>
            <div class="stat-label">待处理订单</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card active">
          <div class="stat-icon">
            <el-icon><ShoppingCart /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activeOrders }}</div>
            <div class="stat-label">进行中订单</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card suppliers">
          <div class="stat-icon">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.newSuppliers }}</div>
            <div class="stat-label">新关注供应商</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card messages">
          <div class="stat-icon">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.unreadMessages }}</div>
            <div class="stat-label">未读消息</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近动态 -->
    <el-card class="recent-activity">
      <template #header>
        <div class="card-header">
          <el-icon><Bell /></el-icon>
          <span>最近动态</span>
        </div>
      </template>
      <el-timeline v-if="recentActivities.length > 0">
        <el-timeline-item
          v-for="activity in recentActivities"
          :key="activity._id"
          :timestamp="formatDate(activity.createdAt)"
          :type="activity.type"
        >
          <div class="activity-content">
            <span class="activity-text">{{ activity.content }}</span>
            <el-button
              v-if="activity.action"
              type="primary"
              text
              size="small"
              @click="handleActivityAction(activity)"
            >
              {{ activity.actionText }}
            </el-button>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无动态" />
    </el-card>

    <!-- 智能推荐 -->
    <el-card class="smart-recommendations">
      <template #header>
        <div class="card-header">
          <el-icon><TrendCharts /></el-icon>
          <span>为您推荐</span>
        </div>
      </template>
      <div v-if="recommendations.length > 0" class="recommendations-grid">
        <div
          v-for="item in recommendations.slice(0, 4)"
          :key="item._id"
          class="recommendation-item"
          @click="$router.push(`/products/${item._id}`)"
        >
          <div class="item-image">
            <img :src="item.images?.[0] || defaultImage" :alt="item.name" />
            <div class="item-badge" :class="item.type">
              {{ item.type === 'product' ? '农产品' : '公告' }}
            </div>
          </div>
          <div class="item-info">
            <h4 class="item-name">{{ item.name || item.title }}</h4>
            <p class="item-description">{{ item.description || item.content }}</p>
            <div class="item-meta">
              <span v-if="item.price" class="item-price"> ¥{{ item.price }}/{{ item.unit }} </span>
              <span v-if="item.distance" class="item-distance">
                <el-icon><Location /></el-icon>
                {{ item.distance.toFixed(1) }}km
              </span>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无推荐内容">
        <el-button type="primary" @click="$router.push('/purchaser/recommendations')">
          查看更多推荐
        </el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Clock,
  ShoppingCart,
  UserFilled,
  ChatDotRound,
  Bell,
  TrendCharts,
  Location,
} from '@element-plus/icons-vue';
import api from '@/api';

const props = defineProps({
  purchaserInfo: {
    type: Object,
    default: () => ({}),
  },
  stats: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['refresh']);

const recentActivities = ref([]);
const recommendations = ref([]);
const defaultImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect width="200" height="150" fill="%23f0f0f0"/%3E%3C/svg%3E';

// 获取最近动态
const fetchRecentActivities = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/activities', {
      params: { limit: 5 },
    });
    if (response.success) {
      recentActivities.value = response.data || [];
    }
  } catch (error) {
    console.error('获取动态失败', error);
  }
};

// 获取推荐
const fetchRecommendations = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/recommendations', {
      params: { limit: 4 },
    });
    if (response.success) {
      recommendations.value = response.data.recommendations || [];
    }
  } catch (error) {
    console.error('获取推荐失败', error);
  }
};

// 处理动态操作
const handleActivityAction = activity => {
  if (activity.route) {
    window.location.href = activity.route;
  }
};

// 格式化日期
const formatDate = date => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return d.toLocaleDateString('zh-CN');
};

onMounted(async () => {
  await Promise.all([fetchRecentActivities(), fetchRecommendations()]);
});
</script>

<style scoped>
.overview-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-row {
  margin-bottom: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-card.pending .stat-icon {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}

.stat-card.active .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card.suppliers .stat-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card.messages .stat-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.recent-activity :deep(.el-timeline-item__timestamp) {
  color: #909399;
  font-size: 12px;
}

.activity-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.activity-text {
  color: #606266;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.recommendation-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.recommendation-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
}

.item-image {
  position: relative;
  width: 100%;
  height: 140px;
  background: #f5f7fa;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
}

.item-badge.product {
  background: rgba(64, 158, 255, 0.9);
}

.item-badge.announcement {
  background: rgba(103, 194, 58, 0.9);
}

.item-info {
  padding: 12px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-description {
  font-size: 12px;
  color: #909399;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 36px;
}

.item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.item-price {
  color: #f56c6c;
  font-weight: 500;
}

.item-distance {
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .recommendations-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>
