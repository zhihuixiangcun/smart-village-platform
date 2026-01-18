<template>
  <div class="payment-list">
    <van-nav-bar title="生活缴费" fixed left-arrow @click-left="onClickLeft" />

    <div class="payment-types">
      <van-grid :column-num="3" :border="false">
        <van-grid-item v-for="type in paymentTypes" :key="type.value" @click="selectType(type.value)">
          <div class="type-card" :class="{ active: activeType === type.value }">
            <van-icon :name="type.icon" size="32" :color="type.color" />
            <span class="type-label">{{ type.label }}</span>
          </div>
        </van-grid-item>
      </van-grid>
    </div>

    <van-pull-refresh v-model="loading" @refresh="onRefresh">
      <van-list v-model:loading="listLoading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div v-for="bill in billList" :key="bill._id" class="bill-card" @click="goToDetail(bill._id)">
          <div class="bill-header">
            <van-icon :name="getTypeIcon(bill.type)" size="24" />
            <div class="bill-info">
              <span class="bill-title">{{ getTypeLabel(bill.type) }}</span>
              <span class="bill-month">{{ bill.billMonth }}</span>
            </div>
            <van-tag :type="getStatusType(bill.status)" size="small">{{ getStatusLabel(bill.status) }}</van-tag>
          </div>
          <div class="bill-amount">
            <span class="amount-label">应缴</span>
            <span class="amount-value">¥{{ bill.amount.toFixed(2) }}</span>
          </div>
          <div class="bill-footer">
            <div class="bill-date">账单日期：{{ formatDate(bill.billDate) }}</div>
            <div v-if="bill.dueDate" class="bill-due">到期日期：{{ formatDate(bill.dueDate) }}</div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <van-empty v-if="billList.length === 0 && !loading" description="暂无缴费账单" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast } from 'vant';
import paymentApi from '@/api/paymentApi';

const router = useRouter();
const defaultAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/icon.png';

const activeType = ref('all');
const billList = ref([]);
const loading = ref(false);
const listLoading = ref(false);
const finished = ref(false);
const page = ref(1);

const paymentTypes = [
  { value: 'all', label: '全部', icon: 'apps-o', color: '#1976D2' },
  { value: 'water', label: '水费', icon: 'water-o', color: '#2196F3' },
  { value: 'electricity', label: '电费', icon: 'lightbulb-o', color: '#F59E0B' },
  { value: 'gas', label: '燃气费', icon: 'fire-o', color: '#FF6B6B' },
  { value: 'phone', label: '话费', icon: 'phone-o', color: '#00B4D8' },
  { value: 'roadband', label: '宽带费', icon: 'wifi-o', color: '#00C853' },
];

const onClickLeft = () => router.back();

const selectType = (type) => {
  activeType.value = type;
  page.value = 1;
  billList.value = [];
  finished.value = false;
  loadBills();
};

const getTypeIcon = (type) => {
  const typeInfo = paymentTypes.find(t => t.value === type);
  return typeInfo ? typeInfo.icon : 'balance-o';
};

const getTypeLabel = (type) => {
  const typeInfo = paymentTypes.find(t => t.value === type);
  return typeInfo ? typeInfo.label : type;
};

const getStatusType = (status) => {
  const statusMap = {
    unpaid: 'danger',
    partial: 'warning',
    paid: 'success',
    overdue: 'danger',
  };
  return statusMap[status] || 'default';
};

const getStatusLabel = (status) => {
  const statusMap = {
    unpaid: '未缴费',
    partial: '部分缴费',
    paid: '已缴费',
    overdue: '已逾期',
  };
  return statusMap[status] || status;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const onRefresh = async () => {
  page.value = 1;
  finished.value = false;
  await loadBills();
  loading.value = false;
};

const onLoad = async () => {
  if (!finished.value) {
    page.value += 1;
    await loadBills();
  }
};

const loadBills = async () => {
  listLoading.value = true;
  try {
    const params = { page: page.value, limit: 10 };
    if (activeType.value !== 'all') {
      params.type = activeType.value;
    }
    const res = await paymentApi.getBills(params);
    if (res.success) {
      billList.value = [...billList.value, ...res.data];
      if (res.data.length < 10) finished.value = true;
    }
  } catch (error) {
    console.error('加载账单失败:', error);
    Toast.fail('加载失败');
  } finally {
    listLoading.value = false;
  }
};

const goToDetail = (id) => {
  router.push(`/mobile/convenience/payment/${id}`);
};

onMounted(() => {
  loadBills();
});
</script>

<style scoped>
.payment-list {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
}

.payment-types {
  padding: 16px;
  background: #fff;
  margin-bottom: 8px;
}

.type-card {
  padding: 16px;
  border-radius: 12px;
  background: #f8f9fa;
  transition: all 0.3s;
}

.type-card.active {
  background: #E3F2FD;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
}

.type-label {
  margin-top: 8px;
  font-size: 14px;
  color: #1A237E;
}

.bill-card {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  cursor: pointer;
}

.bill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.bill-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 12px;
}

.bill-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A237E;
}

.bill-month {
  font-size: 14px;
  color: #718096;
  margin-top: 4px;
}

.bill-amount {
  text-align: right;
}

.amount-label {
  font-size: 14px;
  color: #718096;
  margin-right: 8px;
}

.amount-value {
  font-size: 20px;
  font-weight: 600;
  color: #1976D2;
}

.bill-footer {
  border-top: 1px solid #E0E7FF;
  padding-top: 12px;
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
}

.bill-date {
  font-size: 12px;
  color: #94A3B8;
}

.bill-due {
  font-size: 12px;
  color: #F56565;
  font-weight: 500;
}
</style>
