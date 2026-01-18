<template>
  <div class="payment-detail">
    <van-nav-bar title="账单详情" fixed left-arrow @click-left="onClickLeft" />

    <div v-if="bill" class="detail-card">
      <div class="card-header">
        <van-icon :name="getTypeIcon(bill.type)" size="36" :color="getTypeColor(bill.type)" />
        <div class="header-info">
          <span class="bill-type">{{ getTypeLabel(bill.type) }}</span>
          <span class="bill-month">{{ bill.billMonth }}</span>
        </div>
        <van-tag :type="getStatusType(bill.status)" size="large">{{ getStatusLabel(bill.status) }}</van-tag>
      </div>

      <div class="bill-amount-section">
        <div class="amount-item">
          <span class="amount-label">应缴金额</span>
          <span class="amount-value unpaid">¥{{ bill.amount.toFixed(2) }}</span>
        </div>
        <div v-if="bill.paidAmount > 0" class="amount-item">
          <span class="amount-label">已缴金额</span>
          <span class="amount-value paid">¥{{ bill.paidAmount.toFixed(2) }}</span>
        </div>
        <div v-if="bill.amount - bill.paidAmount > 0" class="amount-item">
          <span class="amount-label">待缴金额</span>
          <span class="amount-value remaining">¥{{ (bill.amount - bill.paidAmount).toFixed(2) }}</span>
        </div>
      </div>

      <div class="bill-info-section">
        <div class="info-row">
          <span class="info-label">账单日期</span>
          <span class="info-value">{{ formatDate(bill.billDate) }}</span>
        </div>
        <div v-if="bill.dueDate" class="info-row">
          <span class="info-label">到期日期</span>
          <span class="info-value" :class="{ overdue: isOverdue }">{{ formatDate(bill.dueDate) }}</span>
        </div>
        <div v-if="bill.paidAt" class="info-row">
          <span class="info-label">缴费时间</span>
          <span class="info-value paid">{{ formatDateTime(bill.paidAt) }}</span>
        </div>
        <div v-if="bill.paymentMethod" class="info-row">
          <span class="info-label">支付方式</span>
          <span class="info-value">{{ getPaymentMethodLabel(bill.paymentMethod) }}</span>
        </div>
        <div v-if="bill.transactionId" class="info-row">
          <span class="info-label">交易单号</span>
          <span class="info-value">{{ bill.transactionId }}</span>
        </div>
        <div v-if="bill.remark" class="info-row full-width">
          <span class="info-label">备注</span>
          <span class="info-value">{{ bill.remark }}</span>
        </div>
      </div>

      <div class="action-buttons">
        <van-button 
          v-if="bill.status === 'unpaid' || bill.status === 'overdue' || bill.status === 'partial'"
          type="primary" 
          size="large" 
          round 
          block
          :loading="paying"
          @click="handlePay"
        >
          立即缴费
        </van-button>
        <van-button 
          v-if="bill.status !== 'paid'"
          plain 
          size="large" 
          round 
          block
          @click="goToHistory"
        >
          查看缴费记录
        </van-button>
      </div>
    </div>

    <van-loading v-else size="24px" vertical>加载中...</van-loading>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Toast, showDialog } from 'vant';
import paymentApi from '@/api/paymentApi';

const router = useRouter();
const route = useRoute();

const bill = ref(null);
const paying = ref(false);

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

const getTypeColor = (type) => {
  const colors = {
    water: '#2196F3',
    electricity: '#F59E0B',
    gas: '#FF6B6B',
    phone: '#00B4D8',
    roadband: '#00C853',
  };
  return colors[type] || '#1976D2';
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

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getPaymentMethodLabel = (method) => {
  const methods = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank: '银行卡',
    cash: '现金',
  };
  return methods[method] || method;
};

const isOverdue = ref(false);

const isOverdue.value = bill.value?.dueDate && new Date(bill.value.dueDate) < new Date();

const handlePay = async () => {
  paying.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    Toast.success('模拟支付成功');
    router.push('/mobile/convenience/payment/history');
  } catch (error) {
    Toast.fail('支付失败');
  } finally {
    paying.value = false;
  }
};

const goToHistory = () => {
  router.push('/mobile/convenience/payment/history');
};

const loadBill = async () => {
  try {
    const res = await paymentApi.getBillById(route.params.id);
    if (res.success) {
      bill.value = res.data;
    }
  } catch (error) {
    console.error('加载账单失败:', error);
    Toast.fail('加载失败');
  }
};

onMounted(() => {
  loadBill();
});
</script>

<style scoped>
.payment-detail {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
}

.detail-card {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(25, 118, 210, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E0E7FF;
}

.header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 16px;
}

.bill-type {
  font-size: 18px;
  font-weight: 600;
  color: #1A237E;
}

.bill-month {
  font-size: 14px;
  color: #718096;
  margin-top: 4px;
}

.bill-amount-section {
  background: #F8F9FA;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.amount-item:last-child {
  margin-bottom: 0;
}

.amount-label {
  font-size: 14px;
  color: #718096;
}

.amount-value {
  font-size: 24px;
  font-weight: 600;
}

.amount-value.unpaid {
  color: #F56565;
}

.amount-value.paid {
  color: #48BB78;
}

.amount-value.remaining {
  color: #1976D2;
}

.bill-info-section {
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #E0E7FF;
}

.info-row.full-width {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 14px;
  color: #718096;
}

.info-value {
  font-size: 14px;
  color: #1A237E;
}

.info-value.overdue {
  color: #F56565;
  font-weight: 500;
}

.info-value.paid {
  color: #48BB78;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
