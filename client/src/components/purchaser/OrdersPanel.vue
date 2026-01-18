<template>
  <div class="orders-panel">
    <el-card class="orders-card">
      <template #header>
        <div class="panel-header">
          <div class="header-left">
            <div class="header-icon-wrapper">
              <el-icon class="header-icon"><ShoppingCart /></el-icon>
            </div>
            <span class="header-title">我的订单</span>
          </div>
          <div class="header-right">
            <el-select
              v-model="orderFilter"
              placeholder="筛选订单"
              class="filter-select"
            >
              <el-option label="全部订单" value="all" />
              <el-option label="待付款" value="pending" />
              <el-option label="待发货" value="confirmed" />
              <el-option label="运输中" value="shipping" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button type="primary" class="create-btn" @click="$router.push('/purchaser/orders/create')">
              <el-icon><Plus /></el-icon>
              创建订单
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <div class="loading-animation">
          <el-icon class="is-loading loading-icon"><Loading /></el-icon>
        </div>
        <p class="loading-text">加载中...</p>
      </div>

      <div v-else-if="filteredOrders.length === 0" class="empty-container">
        <el-empty description="暂无订单">
          <el-button type="primary" class="empty-action-btn" @click="$router.push('/purchaser/recommendations')">
            去逛逛
          </el-button>
        </el-empty>
      </div>

      <transition-group v-else name="order-list" tag="div" class="orders-list">
        <div
          v-for="order in filteredOrders"
          :key="order._id"
          class="order-item"
          @click="$emit('view-order', order)"
        >
          <div class="order-header">
            <div class="order-info">
              <span class="order-number">订单号: {{ order.orderNumber }}</span>
              <span class="order-date">{{ formatDate(order.createdAt) }}</span>
            </div>
            <el-tag class="status-tag" :type="getOrderStatusType(order.status)">
              {{ getOrderStatusLabel(order.status) }}
            </el-tag>
          </div>

          <div class="order-content">
            <div class="product-image-wrapper">
              <img
                class="product-image"
                :src="order.product?.images?.[0] || defaultProductImage"
                :alt="order.product?.name"
              />
            </div>
            <div class="product-info">
              <h4 class="product-name">{{ order.product?.name }}</h4>
              <p class="product-spec">{{ order.specification || '标准规格' }}</p>
              <div class="product-meta">
                <span class="quantity">数量: {{ order.quantity }}{{ order.unit }}</span>
                <span class="price">¥{{ order.totalPrice }}</span>
              </div>
            </div>
          </div>

          <div class="order-footer">
            <div class="supplier-info">
              <el-icon class="supplier-icon"><User /></el-icon>
              <span class="supplier-name">{{ order.supplier?.name || '供应商' }}</span>
            </div>
            <div class="order-actions">
              <el-button size="small" class="action-btn view-btn" @click.stop="handleViewDetail(order)">查看详情</el-button>
              <el-button
                v-if="order.status === 'pending'"
                size="small"
                type="primary"
                class="action-btn pay-btn"
                @click.stop="handlePay(order)"
              >
                去付款
              </el-button>
              <el-button
                v-if="order.status === 'shipping'"
                size="small"
                type="success"
                class="action-btn confirm-btn"
                @click.stop="handleConfirmReceive(order)"
              >
                确认收货
              </el-button>
              <el-button
                v-if="['pending', 'confirmed'].includes(order.status)"
                size="small"
                type="danger"
                class="action-btn cancel-btn"
                @click.stop="handleCancel(order)"
              >
                取消订单
              </el-button>
            </div>
          </div>
        </div>
      </transition-group>

      <!-- 分页 -->
      <transition name="fade">
        <div v-if="total > 0" class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </transition>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ShoppingCart, Plus, Loading, User } from '@element-plus/icons-vue';
import api from '@/api';

const emit = defineEmits(['view-order']);

const loading = ref(false);
const orders = ref([]);
const orderFilter = ref('all');
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const defaultProductImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3C/svg%3E';

// 筛选后的订单
const filteredOrders = computed(() => {
  if (orderFilter.value === 'all') {
    return orders.value;
  }
  return orders.value.filter(order => order.status === orderFilter.value);
});

// 获取订单列表
const fetchOrders = async () => {
  loading.value = true;
  try {
    const response = await api.get('/api/v1/purchaser/orders', {
      params: {
        page: currentPage.value,
        limit: pageSize.value,
      },
    });
    if (response.success) {
      orders.value = response.data.orders || [];
      total.value = response.data.total || 0;
    }
  } catch (error) {
    console.error('获取订单列表失败', error);
    ElMessage.error('获取订单列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取订单状态类型
const getOrderStatusType = status => {
  const types = {
    pending: 'warning',
    confirmed: 'primary',
    shipping: 'primary',
    completed: 'success',
    cancelled: 'info',
  };
  return types[status] || 'info';
};

// 获取订单状态标签
const getOrderStatusLabel = status => {
  const labels = {
    pending: '待付款',
    confirmed: '待发货',
    shipping: '运输中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return labels[status] || status;
};

// 格式化日期
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 查看详情
const handleViewDetail = order => {
  emit('view-order', order);
};

// 付款
const handlePay = async order => {
  try {
    await ElMessageBox.confirm(`确认支付订单 ¥${order.totalPrice}？`, '确认支付', {
      type: 'warning',
    });
    // 调用支付接口
    ElMessage.success('支付成功');
    await fetchOrders();
  } catch (error) {
    // 用户取消
  }
};

// 确认收货
const handleConfirmReceive = async order => {
  try {
    await ElMessageBox.confirm('确认已收到货物？', '确认收货', {
      type: 'warning',
    });
    const response = await api.put(`/api/v1/purchaser/orders/${order._id}/confirm`);
    if (response.success) {
      ElMessage.success('确认收货成功');
      await fetchOrders();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
};

// 取消订单
const handleCancel = async order => {
  try {
    await ElMessageBox.confirm('确定要取消此订单吗？', '取消订单', {
      type: 'warning',
    });
    const response = await api.put(`/api/v1/purchaser/orders/${order._id}/cancel`);
    if (response.success) {
      ElMessage.success('订单已取消');
      await fetchOrders();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
};

// 分页
const handleSizeChange = size => {
  pageSize.value = size;
  fetchOrders();
};

const handlePageChange = page => {
  currentPage.value = page;
  fetchOrders();
};

// 监听筛选变化
watch(orderFilter, () => {
  // 筛选只是前端过滤，不需要重新请求
});

onMounted(() => {
  fetchOrders();
});
</script>

<style scoped>
/* ====================================
   基础变量定义
   ==================================== */
.orders-panel {
  height: 100%;
  --primary-green: #67C23A;
  --primary-green-light: #85CE61;
  --primary-green-dark: #529B2E;
  --primary-green-pale: #E1F3D8;
  --success-color: #67C23A;
  --warning-color: #E6A23C;
  --danger-color: #F56C6C;
  --info-color: #909399;
  --text-primary: #303133;
  --text-regular: #606266;
  --text-secondary: #909399;
  --border-color: #DCDFE6;
  --border-light: #E4E7ED;
  --bg-card: #ffffff;
  --bg-hover: #f0f9ff;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(103, 194, 58, 0.15);
  --shadow-hover: 0 8px 32px rgba(103, 194, 58, 0.2);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ====================================
   卡片容器样式
   ==================================== */
.orders-panel :deep(.el-card) {
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, #ffffff 0%, #f8fffa 100%);
  overflow: hidden;
}

.orders-panel :deep(.el-card__header) {
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--primary-green-pale) 0%, #ffffff 100%);
  border-bottom: 1px solid var(--primary-green-pale);
}

.orders-panel :deep(.el-card__body) {
  padding: 24px;
}

/* ====================================
   面板头部样式
   ==================================== */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.header-icon {
  font-size: 20px;
  color: #ffffff;
  transition: transform var(--transition-fast);
}

.header-icon-wrapper:hover .header-icon {
  transform: scale(1.1) rotate(5deg);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  background: linear-gradient(135deg, var(--primary-green-dark) 0%, var(--primary-green) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ====================================
   筛选选择器样式
   ==================================== */
.filter-select {
  width: 140px;
  transition: all var(--transition-fast);
}

.filter-select :deep(.el-input__wrapper) {
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.filter-select :deep(.el-input__wrapper:hover),
.filter-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--primary-green-pale), var(--shadow-md);
}

/* ====================================
   创建订单按钮样式
   ==================================== */
.create-btn {
  background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 20px;
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, var(--primary-green-dark) 0%, var(--primary-green) 100%);
}

.create-btn:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

/* ====================================
   加载状态样式
   ==================================== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  gap: 16px;
}

.loading-animation {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-icon {
  font-size: 40px;
  color: var(--primary-green);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

.loading-text {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* ====================================
   空状态样式
   ==================================== */
.empty-container {
  padding: 60px 40px;
}

.empty-action-btn {
  background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px 24px;
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.empty-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* ====================================
   订单列表容器样式
   ==================================== */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ====================================
   订单卡片样式
   ==================================== */
.order-item {
  position: relative;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 20px;
  background: var(--bg-card);
  cursor: pointer;
  transition: all var(--transition-normal);
  overflow: hidden;
}

.order-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.order-item:hover {
  border-color: var(--primary-green-light);
  box-shadow: var(--shadow-hover);
  transform: translateY(-4px);
  background: linear-gradient(135deg, #ffffff 0%, var(--bg-hover) 100%);
}

.order-item:hover::before {
  opacity: 1;
}

.order-item:active {
  transform: translateY(-2px);
}

/* ====================================
   订单头部样式
   ==================================== */
.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px dashed var(--border-light);
  margin-bottom: 14px;
  transition: border-color var(--transition-fast);
}

.order-item:hover .order-header {
  border-bottom-color: var(--primary-green-pale);
}

.order-info {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

.order-number {
  color: var(--text-regular);
  font-weight: 500;
  transition: color var(--transition-fast);
}

.order-item:hover .order-number {
  color: var(--primary-green-dark);
}

.order-date {
  position: relative;
}

.order-date::before {
  content: '•';
  position: absolute;
  left: -12px;
  color: var(--border-color);
}

/* ====================================
   状态标签样式
   ==================================== */
.status-tag {
  border-radius: 20px;
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.status-tag.el-tag--warning {
  background: linear-gradient(135deg, #FEF0F0 0%, #FDF2ED 100%);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.status-tag.el-tag--primary {
  background: linear-gradient(135deg, #ECF5FF 0%, #E8F4FE 100%);
  border-color: #409EFF;
  color: #409EFF;
}

.status-tag.el-tag--success {
  background: linear-gradient(135deg, #F0F9FF 0%, #E8F8F0 100%);
  border-color: var(--success-color);
  color: var(--success-color);
}

.status-tag.el-tag--info {
  background: linear-gradient(135deg, #F4F4F5 0%, #F0F0F1 100%);
  border-color: var(--info-color);
  color: var(--info-color);
}

/* ====================================
   订单内容区域样式
   ==================================== */
.order-content {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 14px;
}

/* ====================================
   商品图片样式
   ==================================== */
.product-image-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.product-image-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s;
}

.order-item:hover .product-image-wrapper {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

.order-item:hover .product-image-wrapper::before {
  left: 100%;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.order-item:hover .product-image {
  transform: scale(1.1);
}

/* ====================================
   商品信息样式
   ==================================== */
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px 0;
  line-height: 1.4;
  transition: color var(--transition-fast);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.order-item:hover .product-name {
  color: var(--primary-green-dark);
}

.product-spec {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quantity {
  font-size: 13px;
  color: var(--text-regular);
  background: var(--primary-green-pale);
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.order-item:hover .quantity {
  background: var(--primary-green-light);
  color: #ffffff;
}

.price {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--danger-color) 0%, #FF8585 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: all var(--transition-fast);
}

.order-item:hover .price {
  transform: scale(1.05);
}

/* ====================================
   订单底部样式
   ==================================== */
.order-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
  transition: border-color var(--transition-fast);
}

.order-item:hover .order-footer {
  border-top-color: var(--primary-green-pale);
}

/* ====================================
   供应商信息样式
   ==================================== */
.supplier-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-regular);
  transition: all var(--transition-fast);
}

.supplier-icon {
  font-size: 16px;
  color: var(--primary-green);
  transition: transform var(--transition-fast);
}

.order-item:hover .supplier-icon {
  transform: scale(1.2);
}

.supplier-name {
  font-weight: 500;
  transition: color var(--transition-fast);
}

.order-item:hover .supplier-name {
  color: var(--primary-green-dark);
}

/* ====================================
   操作按钮样式
   ==================================== */
.order-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.action-btn {
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-btn:active {
  transform: translateY(0);
}

.view-btn {
  border-color: var(--border-color);
  color: var(--text-regular);
}

.view-btn:hover {
  border-color: var(--primary-green);
  color: var(--primary-green);
}

.pay-btn {
  background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
  border: none;
}

.pay-btn:hover {
  background: linear-gradient(135deg, var(--primary-green-dark) 0%, var(--primary-green) 100%);
}

.confirm-btn {
  background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
  border: none;
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #529B2E 0%, #67C23A 100%);
}

.cancel-btn {
  background: linear-gradient(135deg, #F56C6C 0%, #FF8585 100%);
  border: none;
}

.cancel-btn:hover {
  background: linear-gradient(135deg, #E64646 0%, #F56C6C 100%);
}

/* ====================================
   分页容器样式
   ==================================== */
.pagination-container {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: center;
}

.pagination-container :deep(.el-pagination) {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-container :deep(.el-pagination button) {
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.pagination-container :deep(.el-pagination button:hover) {
  color: var(--primary-green);
  border-color: var(--primary-green-light);
}

.pagination-container :deep(.el-pager li) {
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.pagination-container :deep(.el-pager li.is-active) {
  background: linear-gradient(135deg, var(--primary-green) 0%, var(--primary-green-light) 100%);
  color: #ffffff;
}

/* ====================================
   过渡动画
   ==================================== */
/* 列表项动画 */
.order-list-enter-active {
  transition: all var(--transition-slow);
}

.order-list-leave-active {
  transition: all var(--transition-slow);
}

.order-list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.order-list-leave-to {
  opacity: 0;
  transform: translateX(-20px) scale(0.95);
}

.order-list-move {
  transition: transform var(--transition-slow);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ====================================
   响应式设计
   ==================================== */
@media (max-width: 768px) {
  .orders-panel :deep(.el-card__header) {
    padding: 16px;
  }

  .orders-panel :deep(.el-card__body) {
    padding: 16px;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .filter-select {
    width: 100%;
  }

  .create-btn {
    width: 100%;
  }

  .order-content {
    flex-direction: column;
    gap: 16px;
  }

  .product-image-wrapper {
    width: 100%;
    height: 160px;
  }

  .order-footer {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .order-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1;
    min-width: 80px;
  }

  .orders-list {
    gap: 16px;
  }

  .order-item {
    padding: 16px;
  }

  .pagination-container {
    margin-top: 24px;
    padding-top: 16px;
  }

  .pagination-container :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .header-title {
    font-size: 16px;
  }

  .product-name {
    font-size: 14px;
  }

  .price {
    font-size: 18px;
  }

  .order-actions {
    flex-direction: column;
    width: 100%;
  }

  .action-btn {
    width: 100%;
  }

  .loading-container {
    padding: 60px 20px;
  }

  .empty-container {
    padding: 40px 20px;
  }
}

/* ====================================
   深色模式支持（可选）
   ==================================== */
@media (prefers-color-scheme: dark) {
  .orders-panel :deep(.el-card) {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  }

  .orders-panel :deep(.el-card__header) {
    background: linear-gradient(135deg, #0f3d1e 0%, #1a1a1a 100%);
  }

  .order-item {
    background: #2d2d2d;
    border-color: #3d3d3d;
  }

  .order-item:hover {
    background: linear-gradient(135deg, #2d2d2d 0%, #1e3d2e 100%);
  }
}

/* ====================================
   打印样式
   ==================================== */
@media print {
  .orders-panel :deep(.el-card) {
    box-shadow: none;
  }

  .order-item {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .action-btn {
    display: none;
  }

  .order-item:hover {
    transform: none;
    box-shadow: none;
  }
}
</style>
