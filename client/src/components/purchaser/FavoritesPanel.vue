<template>
  <div class="favorites-panel">
    <el-card>
      <template #header>
        <div class="panel-header">
          <div class="header-left">
            <el-icon><Star /></el-icon>
            <span>我的收藏 ({{ favorites.length }})</span>
          </div>
        </div>
      </template>

      <div v-if="favorites.length === 0" class="empty-container">
        <el-empty description="还没有收藏任何内容">
          <el-button type="primary" @click="$router.push('/purchaser/recommendations')">
            去发现
          </el-button>
        </el-empty>
      </div>

      <div v-else class="favorites-list">
        <div v-for="item in favorites" :key="item._id" class="favorite-item">
          <div class="item-image" @click="viewDetail(item)">
            <img :src="item.product?.images?.[0] || defaultImage" :alt="item.product?.name" />
          </div>
          <div class="item-content">
            <h4 class="item-name" @click="viewDetail(item)">{{ item.product?.name }}</h4>
            <p class="item-description">{{ item.product?.description }}</p>
            <div class="item-meta">
              <span class="item-price" v-if="item.product?.price">
                ¥{{ item.product.price }}/{{ item.product.unit }}
              </span>
              <span class="item-supplier">
                <el-icon><User /></el-icon>
                {{ item.product?.supplier?.name || '供应商' }}
              </span>
            </div>
            <div class="item-footer">
              <span class="favorite-time">
                <el-icon><Clock /></el-icon>
                收藏于 {{ formatDate(item.createdAt) }}
              </span>
              <el-button size="small" type="danger" @click="$emit('remove', item)">
                取消收藏
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import { Star, User, Clock } from '@element-plus/icons-vue';

const props = defineProps({
  favorites: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['remove']);

const defaultImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect width="200" height="150" fill="%23f0f0f0"/%3E%3C/svg%3E';

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

const viewDetail = item => {
  ElMessage.success(`正在查看 ${item.product?.name}`);
};
</script>

<style scoped>
.favorites-panel {
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.empty-container {
  padding: 40px;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.favorite-item {
  display: flex;
  gap: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.favorite-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.item-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 8px;
  cursor: pointer;
}

.item-name:hover {
  color: #409eff;
}

.item-description {
  font-size: 13px;
  color: #909399;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.item-price {
  font-size: 18px;
  font-weight: 600;
  color: #f56c6c;
}

.item-supplier {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.favorite-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

@media (max-width: 768px) {
  .favorite-item {
    flex-direction: column;
  }

  .item-image {
    width: 100%;
    height: 200px;
  }

  .item-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style>
