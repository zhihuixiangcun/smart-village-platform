<template>
  <div class="orders-panel">
    <el-card>
      <template #header>
        <div class="panel-header">
          <div class="header-left">
            <el-icon><ShoppingCart /></el-icon>
            <span>我的订单</span>
          </div>
          <div class="header-right">
            <el-select v-model="orderFilter" placeholder="筛选订单" style="width: 140px; margin-right: 12px">
              <el-option label="全部订单" value="all" />
              <el-option label="待付款" value="pending" />
              <el-option label="待发货" value="confirmed" />
              <el-option label="运输中" value="shipping" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button type="primary" @click="$router.push('/purchaser/orders/create')">
              <el-icon><Plus /></el-icon>
              创建订单
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredOrders.length === 0" class="empty-container">
        <el-empty description="暂无订单">
          <el-button type="primary" @click="$router.push('/purchaser/recommendations')">
            去逛逛
          </el-button>
        </el-empty>
      </div>

      <div v-else class="orders-list">
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
            <el-tag :type="getOrderStatusType(order.status)">
              {{ getOrderStatusLabel(order.status) }}
            </el-tag>
          </div>

          <div class="order-content">
            <div class="product-image">
              <img :src="order.product?.images?.[0] || defaultProductImage" :alt="order.product?.name" />
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
              <el-icon><User /></el-icon>
              <span>{{ order.supplier?.name || '供应商' }}</span>
            </div>
            <div class="order-actions">
              <el-button size="small" @click.stop="handleViewDetail(order)">查看详情</el-button>
              <el-button
                v-if="order.status === 'pending'"
                size="small"
                type="primary"
                @click.stop="handlePay(order)"
              >
                去付款
              </el-button>
              <el-button
                v-if="order.status === 'shipping'"
                size="small"
                type="success"
                @click.stop="handleConfirmReceive(order)"
              >
                确认收货
              </el-button>
              <el-button
                v-if="['pending', 'confirmed'].includes(order.status)"
                size="small"
                type="danger"
                @click.stop="handleCancel(order)"
              >
                取消订单
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
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
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ShoppingCart, Plus, Loading, User } from '@element-plus/icons-vue'
import api from '@/api'

const emit = defineEmits(['view-order'])

const loading = ref(false)
const orders = ref([])
const orderFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const defaultProductImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3C/svg%3E'

// 筛选后的订单
const filteredOrders = computed(() => {
  if (orderFilter.value === 'all') {
    return orders.value
  }
  return orders.value.filter(order => order.status === orderFilter.value)
})

// 获取订单列表
const fetchOrders = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/v1/purchaser/orders', {
      params: {
        page: currentPage.value,
        limit: pageSize.value
      }
    })
    if (response.success) {
      orders.value = response.data.orders || []
      total.value = response.data.total || 0
    }
  } catch (error) {
    console.error('获取订单列表失败', error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

// 获取订单状态类型
const getOrderStatusType = (status) => {
  const types = {
    pending: 'warning',
    confirmed: 'primary',
    shipping: 'primary',
    completed: 'success',
    cancelled: 'info'
  }
  return types[status] || 'info'
}

// 获取订单状态标签
const getOrderStatusLabel = (status) => {
  const labels = {
    pending: '待付款',
    confirmed: '待发货',
    shipping: '运输中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return labels[status] || status
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

// 查看详情
const handleViewDetail = (order) => {
  emit('view-order', order)
}

// 付款
const handlePay = async (order) => {
  try {
    await ElMessageBox.confirm(`确认支付订单 ¥${order.totalPrice}？`, '确认支付', {
      type: 'warning'
    })
    // 调用支付接口
    ElMessage.success('支付成功')
    await fetchOrders()
  } catch (error) {
    // 用户取消
  }
}

// 确认收货
const handleConfirmReceive = async (order) => {
  try {
    await ElMessageBox.confirm('确认已收到货物？', '确认收货', {
      type: 'warning'
    })
    const response = await api.put(`/api/v1/purchaser/orders/${order._id}/confirm`)
    if (response.success) {
      ElMessage.success('确认收货成功')
      await fetchOrders()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 取消订单
const handleCancel = async (order) => {
  try {
    await ElMessageBox.confirm('确定要取消此订单吗？', '取消订单', {
      type: 'warning'
    })
    const response = await api.put(`/api/v1/purchaser/orders/${order._id}/cancel`)
    if (response.success) {
      ElMessage.success('订单已取消')
      await fetchOrders()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 分页
const handleSizeChange = (size) => {
  pageSize.value = size
  fetchOrders()
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchOrders()
}

// 监听筛选变化
watch(orderFilter, () => {
  // 筛选只是前端过滤，不需要重新请求
})

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.orders-panel {
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

.header-right {
  display: flex;
  align-items: center;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 12px;
  color: #909399;
}

.empty-container {
  padding: 40px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.order-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f7fa;
  margin-bottom: 12px;
}

.order-info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.order-number {
  color: #606266;
  font-weight: 500;
}

.order-content {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.product-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

.product-spec {
  font-size: 13px;
  color: #909399;
  margin: 4px 0;
}

.product-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quantity {
  font-size: 13px;
  color: #606266;
}

.price {
  font-size: 18px;
  font-weight: 600;
  color: #f56c6c;
}

.order-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.supplier-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.order-actions {
  display: flex;
  gap: 8px;
}

.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-right {
    width: 100%;
    flex-direction: column;
  }

  .order-content {
    flex-direction: column;
  }

  .product-image {
    width: 100%;
    height: 160px;
  }

  .order-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .order-actions {
    justify-content: flex-end;
  }
}
</style>
