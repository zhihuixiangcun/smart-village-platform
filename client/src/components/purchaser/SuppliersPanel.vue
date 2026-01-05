<template>
  <div class="suppliers-panel">
    <el-card>
      <template #header>
        <div class="panel-header">
          <div class="header-left">
            <el-icon><UserFilled /></el-icon>
            <span>关注的供应商 ({{ suppliers.length }})</span>
          </div>
          <el-button type="primary" @click="$router.push('/purchaser/suppliers/discover')">
            <el-icon><Search /></el-icon>
            发现供应商
          </el-button>
        </div>
      </template>

      <div v-if="suppliers.length === 0" class="empty-container">
        <el-empty description="还没有关注任何供应商">
          <el-button type="primary" @click="$router.push('/purchaser/suppliers/discover')">
            发现供应商
          </el-button>
        </el-empty>
      </div>

      <div v-else class="suppliers-grid">
        <div v-for="supplier in suppliers" :key="supplier._id" class="supplier-card">
          <div class="supplier-header">
            <el-avatar :size="60" :src="supplier.avatar || defaultAvatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="supplier-info">
              <h4 class="supplier-name">{{ supplier.name }}</h4>
              <el-tag v-if="supplier.verified" type="success" size="small">
                <el-icon><CircleCheck /></el-icon>
                已认证
              </el-tag>
            </div>
          </div>

          <div class="supplier-content">
            <p class="supplier-description" v-if="supplier.description">
              {{ supplier.description }}
            </p>
            <div class="supplier-meta">
              <div class="meta-item">
                <el-icon><Location /></el-icon>
                <span>{{ supplier.location?.city || '未知' }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Goods /></el-icon>
                <span>{{ supplier.productCategories?.join('、') || '农产品' }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Star /></el-icon>
                <span>{{ supplier.rating?.toFixed(1) || '0.0' }}</span>
                <span class="rating-count">({{ supplier.reviewCount || 0 }}评价)</span>
              </div>
            </div>
          </div>

          <div class="supplier-footer">
            <el-button size="small" @click="viewProducts(supplier)">
              查看产品
            </el-button>
            <el-button size="small" type="primary" @click="contactSupplier(supplier)">
              联系
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="$emit('unfollow', supplier)"
            >
              取消关注
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { UserFilled, Search, User, CircleCheck, Location, Goods, Star } from '@element-plus/icons-vue'

const props = defineProps({
  suppliers: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['unfollow'])

const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e0e0e0"/%3E%3C/svg%3E'

const viewProducts = (supplier) => {
  ElMessage.success(`正在查看 ${supplier.name} 的产品...`)
}

const contactSupplier = (supplier) => {
  ElMessage.success(`正在联系 ${supplier.name}...`)
}
</script>

<style scoped>
.suppliers-panel {
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.empty-container {
  padding: 40px;
}

.suppliers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.supplier-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.supplier-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
}

.supplier-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.supplier-info {
  flex: 1;
}

.supplier-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 8px;
}

.supplier-content {
  margin-bottom: 12px;
}

.supplier-description {
  font-size: 13px;
  color: #606266;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.supplier-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
}

.rating-count {
  color: #c0c4cc;
  font-size: 12px;
}

.supplier-footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.supplier-footer .el-button {
  flex: 1;
}

@media (max-width: 768px) {
  .suppliers-grid {
    grid-template-columns: 1fr;
  }
}
</style>
