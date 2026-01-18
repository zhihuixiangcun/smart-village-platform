<template>
  <div class="orders-page">
    <header class="page-header">
      <h2>订单管理</h2>
    </header>

    <main class="orders-content">
      <div class="order-tabs">
        <div class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</div>
        <div class="tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">待付款</div>
        <div class="tab" :class="{ active: activeTab === 'shipping' }" @click="activeTab = 'shipping'">待发货</div>
        <div class="tab" :class="{ active: activeTab === 'delivering' }" @click="activeTab = 'delivering'">待收货</div>
      </div>

      <div class="order-list">
        <div class="order-card" v-for="order in filteredOrders" :key="order.id">
          <div class="order-header">
            <span class="order-id">订单号: {{ order.id }}</span>
            <span class="order-status" :class="order.status">{{ order.statusText }}</span>
          </div>
          <div class="order-items">
            <div class="order-item" v-for="item in order.items" :key="item.id">
              <img :src="item.image" :alt="item.name" />
              <div class="item-info">
                <h4>{{ item.name }}</h4>
                <p>{{ item.spec }}</p>
                <span class="item-price">¥{{ item.price }} × {{ item.quantity }}</span>
              </div>
            </div>
          </div>
          <div class="order-footer">
            <span class="order-total">合计: ¥{{ order.total }}</span>
            <el-button type="primary" size="small" v-if="order.status === 'pending'">去付款</el-button>
            <el-button type="primary" size="small" v-else-if="order.status === 'delivering'">确认收货</el-button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const activeTab = ref('all');

const orders = ref([
  {
    id: '202401150001',
    status: 'pending',
    statusText: '待付款',
    total: '88.00',
    items: [
      { id: 1, name: '有机西红柿', spec: '5斤装', price: '40.00', quantity: 1, image: '/images/tomato.jpg' },
      { id: 2, name: '新鲜黄瓜', spec: '3斤装', price: '24.00', quantity: 2, image: '/images/cucumber.jpg' },
    ],
  },
  {
    id: '202401140002',
    status: 'shipping',
    statusText: '待发货',
    total: '60.00',
    items: [
      { id: 3, name: '土鸡蛋', spec: '30个', price: '60.00', quantity: 1, image: '/images/egg.jpg' },
    ],
  },
  {
    id: '202401130003',
    status: 'delivering',
    statusText: '待收货',
    total: '75.00',
    items: [
      { id: 4, name: '有机大米', spec: '10斤', price: '75.00', quantity: 1, image: '/images/rice.jpg' },
    ],
  },
]);

const filteredOrders = computed(() => {
  if (activeTab.value === 'all') return orders.value;
  return orders.value.filter(o => o.status === activeTab.value);
});
</script>

<style scoped lang="scss">
.orders-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  padding-bottom: 80px;
}

.page-header {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  padding: 20px 16px;
  padding-top: max(20px, env(safe-area-inset-top));
  text-align: center;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    animation: rotate 20s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  h2 {
    margin: 0;
    font-size: 24px;
    color: white;
    font-weight: 700;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1;
  }
}

.orders-content {
  padding: 20px 16px;
}

.order-tabs {
  display: flex;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 6px;
  margin-bottom: 20px;
  overflow-x: auto;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.8);

  &::-webkit-scrollbar {
    height: 0;
  }

  .tab {
    flex: 1;
    text-align: center;
    padding: 10px 16px;
    font-size: 14px;
    color: #689f38;
    border-radius: 12px;
    cursor: pointer;
    white-space: nowrap;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.active {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
      font-weight: 700;
    }

    &:active:not(.active) {
      transform: scale(0.95);
    }
  }
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.order-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
  backdrop-filter: blur(10px);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.98);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
  }
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 2px solid rgba(76, 175, 80, 0.05);
  background: linear-gradient(90deg, #f1f8e9 0%, #dcedc8 100%);

  .order-id {
    font-size: 14px;
    color: #558b2f;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.7);
    padding: 4px 12px;
    border-radius: 8px;
    backdrop-filter: blur(5px);
  }

  .order-status {
    font-size: 13px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 10px;

    &.pending {
      color: white;
      background: linear-gradient(135deg, #e53935 0%, #f44336 100%);
      box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
    }

    &.shipping {
      color: white;
      background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%);
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
    }

    &.delivering {
      color: white;
      background: linear-gradient(135deg, #42a5f5 0%, #2196f3 100%);
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
    }
  }
}

.order-items {
  padding: 18px;
}

.order-item {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }

  img {
    width: 70px;
    height: 70px;
    border-radius: 12px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .item-info {
    flex: 1;

    h4 {
      margin: 0 0 6px;
      font-size: 15px;
      color: #2e7d32;
      font-weight: 600;
    }

    p {
      margin: 0 0 6px;
      font-size: 13px;
      color: #689f38;
      font-weight: 500;
    }

    .item-price {
      font-size: 15px;
      font-weight: 700;
      background: linear-gradient(135deg, #e53935 0%, #f44336 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-top: 2px solid rgba(76, 175, 80, 0.05);
  background: rgba(76, 175, 80, 0.02);

  .order-total {
    font-size: 18px;
    font-weight: 700;
    color: #2e7d32;
    background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  :deep(.el-button) {
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
    background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
    border: none;
    transition: all 0.3s;

    &:active {
      transform: scale(0.9);
      box-shadow: 0 1px 4px rgba(76, 175, 80, 0.3);
    }
  }
}
</style>
