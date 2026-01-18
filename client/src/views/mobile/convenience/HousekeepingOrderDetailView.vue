<template>
  <div class="detail-view">
    <van-nav-bar title="订单详情" fixed left-arrow @click-left="onClickLeft" />

    <div v-if="order" class="detail-container">
      <div class="order-header">
        <van-tag :type="getStatusClass(order.status)">{{ getStatusLabel(order.status) }}</van-tag>
        <span class="order-id">#{{ order._id.slice(-6) }}</span>
      </div>

      <div class="order-info">
        <div class="info-row">
          <span class="info-label">服务类型</span>
          <span class="info-value">{{ getServiceTypeName(order.serviceType) }}</span>
        </div>
        <div v-if="order.technicianId" class="info-row">
          <span class="info-label">维修师傅</span>
          <span class="info-value">{{ order.technicianName || '待分配' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">预约时间</span>
          <span class="info-value">{{ formatDateTime(order.appointmentDate) }} {{ order.appointmentTime }}</span>
        </div>
        <div v-if="order.address">
          <span class="info-label">服务地址</span>
          <span class="info-value">{{ formatAddress(order.address) }}</span>
        </div>
      </div>

      <div class="order-status-section">
        <div v-if="order.status !== 'completed'">
          <div class="status-bar">
            <span class="status-step" :class="{ active: activeStatus === 'pending' }">
              <van-icon name="clock-o" />
            </span>
            <span class="status-label">{{ getStatusLabel(order.status) }}</span>
            <van-tag :type="getStatusClass(order.status)">{{ getStatusLabel(order.status) }}</van-tag>
            </div>
            <div class="status-arrow" />
          </div>
        </div>

        <div v-if="order.status === 'completed'" class="evaluation-section">
          <div class="evaluation-header">
            <h3>服务评价</h3>
            <div class="rating-display">
              <van-rate :model="order.rating" :size="20" readonly />
              <div class="rating-score">{{ order.rating || 0 }}</div>
              <span class="rating-text">({{ order.rating || 0 }}分</span>
            <span class="rating-label">综合评分</span>
              <span class="divider">|</span>
            <van-field
              v-model="comment"
              type="textarea"
              placeholder="请输入您的评价..."
              rows="3"
              maxlength="200"
              />
            </div>
          </div>
        </div>

      <div class="service-details-section">
        <div class="detail-title">服务详情</h3>
        <h4>订单号</h4>
          <p class="order-number">#{{ order._id.slice(-6) }}</p>
        </div>

        <div class="price-section">
          <div class="price-display">
            <span class="price-label">订单金额</span>
            <div class="price-value">¥{{ order.price }}</div>
          </div>

        <div class="order-info">
          <div class="info-row">
            <span class="info-label">服务类型</span>
              <span class="info-value">{{ getServiceTypeName(order.serviceType) }}</span>
            </div>
          <div class="info-row">
              <span class="info-label">服务商</span>
              <span class="info-value">{{ order.serviceProvider?.name || '待分配' }}</span>
            </div>
            <div v-if="order.technicianId" class="info-row">
              <span class="info-label">维修师傅</span>
              <span class="info-value">{{ order.technicianName || '待分配' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">预约时间</span>
              <span class="info-value">{{ formatDateTime(order.appointmentDate) }} {{ order.appointmentTime }}</span>
            </div>
            <div v-if="order.address">
              <span class="info-label">服务地址</span>
              <span class="info-value">{{ formatAddress(order.address) }}</span>
            </div>
          </div>
        </div>

        <div class="order-actions">
          <van-button 
            v-if="order.status === 'pending' || order.status === 'confirmed'"
            type="primary" 
            size="small" 
            plain
            @click="showCancelConfirm(order)"
          >
            取消预约
          </van-button>
        </div>
      </div>

      <div v-if="order.status === 'completed'" class="card-footer">
        <van-button size="large" block @click="goToList">查看我的订单</van-button>
      </div>
    </div>

    <van-popup v-model="showCancelConfirm" position="center">
      <div class="cancel-content">
        <p>确定要取消这个预约吗？</p>
      </div>
    </van-popup>

    <van-loading v-else size="24px" vertical>加载中...</van-loading>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Toast } from 'vant';
import housekeepingApi from '@/api/housekeepingApi';

const router = useRouter();
const route = useRoute();

const order = ref(null);
const loading = ref(false);
const showCancelConfirm = ref(false);

const onClickLeft = () => router.back();

const showCancelConfirm = (order) => {
  showCancelConfirm.value = true;
};

const cancelOrder = async (order) => {
  showCancelConfirm.value = false;
  try {
    await housekeepingApi.updateOrder(order._id, { status: 'cancelled' });
    Toast.success('订单已取消');
  const index = this.filteredList.findIndex(o => o._id === order._id);
    if (index !== -1) {
      this.filteredList.splice(index, 1);
    }
  } catch (error) {
    Toast.fail('取消失败');
  }
};

const filteredList = computed(() => {
  return this.filteredList;
});

const getStatusLabel = (status) => {
  const labels = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return labels[status] || status;
};

const getStatusClass = (status) => {
  const classMap = {
    pending: 'status-default',
    in_progress: 'status-warning',
    completed: 'status-success',
    cancelled: 'status-default',
  };
  return classMap[status] || '';
};

const showCancelConfirm = (order) => {
  showDialog({
    title: '确认取消订单',
    message: '确定要取消这个预约吗？',
    showCancelButton: true,
  });
};

const formatAddress = (address) => {
  if (!address) return '';
  if (!address.street) return '';
  return [
    address.street || '',
    address.community || '',
    address.building || '',
    address.roomNumber || '',
    address.roomNumber || '',
  ].filter(Boolean).join(' ');
};

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const loadOrder = async () => {
  loading.value = true;
  try {
    const res = await housekeepingApi.getOrderById(route.params.id);
    if (res.success) {
      order.value = res.data;
    }
  } catch (error) {
    console.error('加载订单详情失败:', error);
    Toast.fail('加载失败');
  } finally {
    loading.value = false;
  }
};

const getServiceTypeName = (type) => {
  const labels = {
    cleaning: '保洁服务',
    nanny: '月嫂服务',
    elderly: '老人服务',
    babysitter: '保姆服务',
  };
  return labels[type] || type;
};

const onClickLeft = () => router.back();

onMounted(() => {
  loadOrder();
});
</script>

<style scoped>
.detail-container {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24px;
  border-bottom: 1px solid #E0E7FF;
}

.order-id {
  font-size: 12px;
  color: #718096;
}

.info-label {
  font-size: 14px;
  color: #718096;
  margin-right: 8px;
}

.status-step {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: auto;
}

.status-arrow {
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}

.status-label {
  font-size: 14px;
  font-weight: 500;
}

.status-text {
  margin-left: 4px;
}

.order-info {
  flex: 1;
  display: flex;
}

.divider {
  width: 1px;
  background: #E0E7FF;
  transition: transform 0.2s;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  color: #1A3320;
  margin: 0 0 0 16px;
}

.order-number {
  color: #1A3320;
  margin-right: 8px;
}

.price-section {
  padding: 16px;
  margin-bottom: 16px;
}

.price-display {
  text-align: right;
}

.price-label {
  font-size: 14px;
  color: #718096;
  margin-right: 8px;
}

.price-value {
  font-size: 28px;
  font-weight: 600;
  color: #1976D2;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #E0E7FF;
}

.info-label {
  font-size: 14px;
  color: #718096;
}

.info-value {
  font-size: 14px;
  color: #1A332E;
  font-weight: 500;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #E0E7FF;
}

.info-value {
  font-size: 14px;
  color: #1A332E;
  font-weight: 500;
}

.status-section {
  margin: 24px 0;
  border-top: 1px solid #E0E7FF;
  padding: 16px;
}

.evaluation-section {
  border-top: 1px solid #E0E7FF;
}

.evaluation-header {
  font-size: 16px;
  font-weight: 600;
  color: #1A3320;
  margin-bottom: 12px;
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-score {
  font-size: 32px;
  font-weight: 600;
  color: #F59E0B;
}

.rating-text {
  margin-left: 8px;
  color: #94A3B8;
}

.divider {
  width: 1px;
  background: #E0E7FF;
  transition: transform 0.2s;
}

.rating-input {
  width: 48px;
  margin-right: 8px;
}

.rating-text {
  margin-left: 8px;
  color: #F59E0B;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.info-label {
  font-size: 14px;
  color: #718096;
}

.info-value {
  font-size: 14px;
  color: #1A332E;
  font-weight: 500;
}

.order-info {
  display: flex;
  flex-direction: column;
}

.order-actions {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  gap:12px;
  padding-bottom: 24px;
}

.order-actions {
  display: flex;
  gap: 8px;
}

.order-actions:last-child {
  margin-left: auto;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex: 1;
}

.action-buttons .van-button {
  flex: 1;
}

.action-buttons:last-child {
  margin-right: auto;
}
</style>
