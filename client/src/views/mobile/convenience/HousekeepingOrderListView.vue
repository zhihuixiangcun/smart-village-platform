<template>
  <div class="order-list">
    <van-nav-bar title="我的预约" fixed left-arrow @click-left="onClickLeft" />

    <van-tabs v-model="activeTab" :fixed="true" :placeholder="true" class="tabs-container">
      <van-tabbar-item title="全部订单" />
      <van-tabbar-item title="待处理" />
      <van-tabbar-item title="进行中" />
      <van-tabbar-item title="已完成" />
      <van-tabbar-item title="已取消" />
    </van-tabs>

    <div class="tab-content">
      <van-pull-refresh v-model="loading" @refresh="onRefresh">
        <van-list v-model="loading="listLoading" :finished="finished" finished-text="没有更多了" @load="onLoad">
          <div v-for="order in filteredList" :key="order._id" class="order-card" @click="goToDetail(order._id)">
            <div class="card-header">
              <span class="order-status" :class="getStatusClass(order.status)">{{ getStatusLabel(order.status) }}</span>
              <span class="order-date">{{ formatDateTime(order.createdAt) }}</span>
            </div>
            <div class="card-body">
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
              </div>
              <div class="order-price">
                <span class="price-label">订单金额</span>
                <span class="price-value">¥{{ order.price }}</span>
              </div>
            </div>
            <div class="card-footer">
              <div v-if="order.status === 'pending'">
                <van-button 
                  type="primary" 
                  size="small" 
                  plain 
                  @click="showCancelConfirm(order)"
                >
                  取消预约
                </van-button>
                <van-button 
                  v-if="order.status === 'confirmed'"
                  type="primary" 
                  size="small" 
                  @click="showStatusPicker(order, 'confirmed')"
                >
                  更改时间
                </van-button>
              </div>
              <div v-else-if="order.status === 'completed'" class="evaluation">
                <span class="rate-label">服务评价</span>
                <span class="rating">{{ order.rating || 0 }}</span>
              </div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>

    <van-empty v-if="orderList.length === 0 && !loading" :description="暂无订单" />

    <van-popup v-model="showStatusPicker" position="bottom" :style="{ height: '40%' }">
      <van-picker
        v-model="selectedStatus"
        :columns="1"
        :show-toolbar="false"
        :default-index="getStatusIndex(order)"
        @confirm="onStatusConfirm"
        @cancel="onStatusCancel"
      >
        <van-picker-option
          v-for="status in statusOptions" 
          :key="status.value"
          :value="status.value"
        :disabled="!canUpdateStatus(order.status)"
        >
          {{ status.label }}
        </van-picker-option>
      </van-picker>
    </van-popup>

    <van-dialog v-model="showCancelConfirm" title="确认取消" :show-cancel-button="false">
      <div class="cancel-content">
        <p>确定要取消订单吗？</p>
      </div>
    </van-dialog>

    <van-popup v-model="showRateDialog" v-model="ratingDialog" class="rate-dialog">
      <van-field 
        v-model="ratingValue"
        type="digit"
        placeholder="请输入评分(1-5)"
        :min="1"
        :max="5"
      :rules="[{ required: true, message: '请输入评分' }]"
      />
      <van-field
        v-model="comment"
        type="textarea"
        placeholder="请输入您的评价"
        rows="4"
        maxlength="200"
        autosize
      />
      <div class="dialog-buttons">
        <van-button plain @click="showRateDialog = false">取消</van-button>
        <van-button type="primary" native-type="submit" :loading="rateSubmitting" @click="submitRating">
          提交评价
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast, showDialog, showSuccessToast, showLoadingToast } from 'vant';
import housekeepingApi from '@/api/housekeepingApi';

const router = useRouter();

const activeTab = ref(0);
const orderList = ref([]);
const loading = ref(false);
const listLoading = ref(false);
const finished = ref(false);
const page = ref(1);

const showStatusPicker = ref(false);
const selectedStatus = ref('');
const showCancelConfirm = ref(false);
const showRateDialog = ref(false);
const ratingValue = ref(0);
const comment = ref('');
const rateSubmitting = ref(false);

const statusOptions = [
  { text: '全部订单', value: '' },
  { text: '待处理', value: 'pending' },
  { text: '进行中', value: 'in_progress' },
  { text: '已完成', value: 'completed' },
  { text: '已取消', value: 'cancelled' },
];

const filteredList = computed(() => {
  let list = orderList.value;
  if (activeTab.value === 1) {
    list = list.filter(o => o.status === 'pending');
  } else if (activeTab.value === 2) {
    list = list.filter(o => o.status === 'in_progress');
  } else if (activeTab.value === 3) {
    list = list.filter(o => o.status === 'completed');
  } else {
    list = list.filter(o => o.status === 'cancelled');
  }
  return list;
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

const getStatusIndex = (status) => {
  const index = statusOptions.findIndex(t => t.value === status);
  return index;
};

const canUpdateStatus = (status) => {
  return status !== 'completed' && status !== 'cancelled';
};

const onClickLeft = () => router.back();

const onRefresh = async () => {
  page.value = 1;
  finished.value = false;
  await loadOrders();
  loading.value = false;
};

const onLoad = async () => {
  if (!finished.value) {
    page.value += 1;
    await loadOrders();
  }
};

const loadOrders = async () => {
  listLoading.value = true;
  try {
    const params = { 
      page: page.value, 
      limit: 10,
      ...(activeTab.value !== 0 && { status: activeTab.value }),
    };
    const res = await housekeepingApi.getOrders(params);
    if (res.success) {
      orderList.value = [...orderList.value, ...res.data];
      if (res.data.length < 10) finished.value = true;
    }
  } catch (error) {
    console.error('加载订单列表失败:', error);
    Toast.fail('加载失败');
  } finally {
    listLoading.value = false;
  }
};

const showCancelConfirm = (order) => {
  showDialog({
    title: '确认取消订单',
    message: '确定要取消这个预约吗？',
    showCancelButton: true,
  }).then((action) => {
    if (action === 'confirm') {
      cancelOrder(order);
    }
  });
};

const cancelOrder = async (order) => {
  try {
    await housekeepingApi.updateOrder(order._id, { status: 'cancelled' });
    Toast.success('订单已取消');
    const index = orderList.value.findIndex(o => o._id === order._id);
    if (index !== -1) {
      orderList.value.splice(index, 1);
    }
  } catch (error) {
    console.error('取消订单失败:', error);
    Toast.fail('取消失败');
  }
};

const showStatusPicker = (order) => {
  showStatusPicker.value = true;
  selectedStatus.value = getStatusIndex(order.status);
};

const onStatusConfirm = (value) => {
  if (selectedStatus.value) {
    showStatusPicker.value = false;
    try {
    await housekeepingApi.updateOrder(order._id, { status: selectedStatus.value });
    Toast.success('状态更新成功');
    const index = orderList.value.findIndex(o => o._id === order._id);
    if (index !== -1) {
      orderList.value[index].status = selectedStatus.value;
    }
  } catch (error) {
    Toast.fail('状态更新失败');
  }
};

const onStatusCancel = () => {
  showStatusPicker.value = false;
};

const showRateDialog = ref(false);

const showCancelConfirm = ref(false);

const submitRating = async () => {
  if (!ratingValue.value) {
    Toast('请选择评分');
    return;
  }

  rateSubmitting.value = true;
  try {
    await housekeepingApi.evaluateOrder(router.params.id, {
      rating: ratingValue.value,
      comment: comment.value,
    });
    Toast.success('评价成功');
    const index = orderList.value.findIndex(o => o._id === router.params.id);
    if (index !== -1) {
      orderList.value[index].rating = ratingValue.value;
    }
  } catch (error) {
    console.error('评价失败:', error);
    Toast.fail('评价失败');
  } finally {
    rateSubmitting.value = false;
    showRateDialog.value = false;
  }
};

const loadOrders = async () => {
  await loadOrders();
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

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getOrderDate = (date) => {
  if (!date) return '';
  return formatDate(date);
};

const loadOrders = async () => {
  await loadOrders();
};

onMounted(() => {
  loadOrders();
});
</script>

<style scoped>
.order-list {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
}

.tabs-container {
  background: #fff;
  position: fixed;
  top: 46px;
  left: 0;
  right: 0;
}

.tab-content {
  padding-top: 100px;
}

.order-card {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  cursor: pointer;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-status {
  font-size: 14px;
  font-weight: 500;
}

.order-date {
  font-size: 12px;
  color: #718096;
  margin-left: 8px;
}

.card-body {
  margin-bottom: 12px;
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
  font-size: 16px;
  font-weight: 500;
}

.order-price {
  text-align: right;
  padding-top: 8px;
 0;
}

.price-label {
  font-size: 14px;
  color: #718096;
}

.price-value {
  font-size: 20px;
  font-weight: 600;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #E0E7FF;
  padding-top: 12px;
  gap: 12px;
}

.rate-label {
  color: #94A3B8;
  margin-right: 4px;
}

.rating {
  margin-left: 8px;
}

.cancel-button {
  flex: 1;
}

.evaluation {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.rate-input {
  width: 48px;
  margin-right: 8px;
}
</style>
