<template>
  <div class="payment-history">
    <van-nav-bar title="缴费记录" fixed left-arrow @click-left="onClickLeft" />

    <div class="filter-bar">
      <van-dropdown-menu v-model="activeFilter">
        <van-dropdown-item v-model="activeType" :options="typeOptions" @change="onFilterChange" />
      </van-dropdown-menu>
    </div>

    <van-pull-refresh v-model="loading" @refresh="onRefresh">
      <van-list v-model:loading="listLoading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div v-for="bill in billList" :key="bill._id" class="history-card">
          <div class="card-header">
            <van-icon :name="getTypeIcon(bill.type)" size="20" />
            <div class="header-info">
              <span class="bill-type">{{ getTypeLabel(bill.type) }}</span>
              <van-tag :type="getStatusType(bill.status)" size="small">{{ getStatusLabel(bill.status) }}</van-tag>
            </div>
            <span class="bill-amount">¥{{ bill.paidAmount.toFixed(2) }}</span>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="info-label">账单月份</span>
              <span class="info-value">{{ bill.billMonth }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">缴费时间</span>
              <span class="info-value">{{ formatDateTime(bill.paidAt) }}</span>
            </div>
            <div v-if="bill.paymentMethod" class="info-row">
              <span class="info-label">支付方式</span>
              <span class="info-value">{{ getPaymentMethodLabel(bill.paymentMethod) }}</span>
            </div>
            <div v-if="bill.transactionId" class="info-row">
              <span class="info-label">交易单号</span>
              <span class="info-value">{{ bill.transactionId }}</span>
            </div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <van-empty v-if="billList.length === 0 && !loading" description="暂无缴费记录" />

    <div class="total-section">
      <div class="total-card">
        <span class="total-label">总缴费金额</span>
        <span class="total-value">¥{{ totalAmount.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast } from 'vant';
import paymentApi from '@/api/paymentApi';

const router = useRouter();

const activeType = ref('all');
const activeFilter = ref('');
const billList = ref([]);
const loading = ref(false);
const listLoading = ref(false);
const finished = ref(false);
const page = ref(1);

const typeOptions = [
  { text: '全部类型', value: 'all' },
  { text: '水费', value: 'water' },
  { text: '电费', value: 'electricity' },
  { text: '燃气费', value: 'gas' },
  { text: '话费', value: 'phone' },
  { text: '宽带费', value: 'roadband' },
];

const totalAmount = computed(() => {
  return billList.value.reduce((sum, bill) => sum + bill.paidAmount, 0);
});

const onClickLeft = () => router.back();

const getTypeIcon = (type) => {
  const icons = {
    water: 'water-o',
    electricity: 'lightbulb-o',
    gas: 'fire-o',
    phone: 'phone-o',
    roadband: 'wifi-o',
  };
  return icons[type] || 'balance-o';
};

const getTypeLabel = (type) => {
  const labels = {
    water: '水费',
    electricity: '电费',
    gas: '燃气费',
    phone: '话费',
    roadband: '宽带费',
  };
  return labels[type] || type;
};

const getStatusType = (status) => {
  const statusMap = {
    unpaid: 'danger',
    partial: 'warning',
    paid: 'success',
  };
  return statusMap[status] || 'default';
};

const getStatusLabel = (status) => {
  const statusMap = {
    unpaid: '未缴费',
    partial: '部分缴费',
    paid: '已缴费',
  };
  return statusMap[status] || status;
};

const getPaymentMethodLabel = (method) => {
  const methods = {
    wechat: '微信',
    alipay: '支付宝',
    bank: '银行卡',
    cash: '现金',
  };
  return methods[method] || method;
};

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const onFilterChange = () => {
  page.value = 1;
  billList.value = [];
  finished.value = false;
  loadHistory();
};

const onRefresh = async () => {
  page.value = 1;
  finished.value = false;
  await loadHistory();
  loading.value = false;
};

const onLoad = async () => {
  if (!finished.value) {
    page.value += 1;
    await loadHistory();
  }
};

const loadHistory = async () => {
  listLoading.value = true;
  try {
    const params = { 
      page: page.value, 
      limit: 10,
      status: 'paid',
    };
    if (activeType.value !== 'all') {
      params.type = activeType.value;
    }
    const res = await paymentApi.getPaymentHistory(params);
    if (res.success) {
      billList.value = [...billList.value, ...res.data];
      if (res.data.length < 10) finished.value = true;
    }
  } catch (error) {
    console.error('加载缴费记录失败:', error);
    Toast.fail('加载失败');
  } finally {
    listLoading.value = false;
  }
};

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.payment-history {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
  padding-bottom: 80px;
}

.filter-bar {
  padding: 12px;
  background: #fff;
  margin-bottom: 8px;
}

.history-card {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 12px;
}

.bill-type {
  font-size: 14px;
  font-weight: 500;
  color: #1A237E;
}

.bill-amount {
  font-size: 18px;
  font-weight: 600;
  color: #1976D2;
}

.card-body {
  margin-top: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #E0E7FF;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #718096;
}

.info-value {
  font-size: 13px;
  color: #1A237E;
}

.total-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: #fff;
  border-top: 1px solid #E0E7FF;
}

.total-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 600px;
  margin: 0 auto;
}

.total-label {
  font-size: 16px;
  color: #718096;
}

.total-value {
  font-size: 24px;
  font-weight: 600;
  color: #1976D2;
}
</style>
