<template>
  <div class="suppliers-page">
    <header class="page-header">
      <h2>供应商管理</h2>
      <el-button type="primary" size="small" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加供应商
      </el-button>
    </header>

    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索供应商名称"
        :prefix-icon="Search"
        clearable
      />
    </div>

    <main class="suppliers-content">
      <div class="suppliers-list">
        <div
          v-for="supplier in filteredSuppliers"
          :key="supplier.id"
          class="supplier-card"
          @click="viewDetail(supplier)"
        >
          <div class="supplier-header">
            <div class="supplier-avatar">
              <img :src="supplier.avatar" :alt="supplier.name" />
            </div>
            <div class="supplier-info">
              <h4>{{ supplier.name }}</h4>
              <el-rate v-model="supplier.rating" disabled size="small" />
            </div>
            <el-tag :type="getCooperationType(supplier.cooperation)" size="small">
              {{ supplier.cooperation }}
            </el-tag>
          </div>

          <div class="supplier-details">
            <div class="detail-item">
              <el-icon><Location /></el-icon>
              <span>{{ supplier.location }}</span>
            </div>
            <div class="detail-item">
              <el-icon><Box /></el-icon>
              <span>{{ supplier.productCount }}种产品</span>
            </div>
            <div class="detail-item">
              <el-icon><ShoppingCart /></el-icon>
              <span>累计交易{{ supplier.totalOrders }}单</span>
            </div>
          </div>

          <div class="supplier-products">
            <div class="product-preview" v-for="product in supplier.products" :key="product.id">
              <img :src="product.image" :alt="product.name" />
            </div>
          </div>

          <div class="supplier-actions">
            <el-button type="primary" size="small" @click.stop="handleContact(supplier)">
              <el-icon><Phone /></el-icon>
              联系供应商
            </el-button>
            <el-button size="small" @click.stop="viewProducts(supplier)">
              查看产品
            </el-button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  Plus,
  Search,
  Location,
  Box,
  ShoppingCart,
  Phone
} from '@element-plus/icons-vue';

const searchKeyword = ref('');

const suppliers = ref([
  {
    id: 1,
    name: '绿色农产品合作社',
    avatar: '/images/supplier1.jpg',
    rating: 4.5,
    cooperation: '长期合作',
    location: '贵州省贞丰县',
    productCount: 28,
    totalOrders: 156,
    products: [
      { id: 1, image: '/images/product1.jpg', name: '有机大米' },
      { id: 2, image: '/images/product2.jpg', name: '土鸡蛋' },
      { id: 3, image: '/images/product3.jpg', name: '蔬菜' }
    ]
  },
  {
    id: 2,
    name: '生态养殖基地',
    avatar: '/images/supplier2.jpg',
    rating: 4.8,
    cooperation: '新合作',
    location: '贵州省兴义市',
    productCount: 15,
    totalOrders: 23,
    products: [
      { id: 1, image: '/images/product4.jpg', name: '土鸡' },
      { id: 2, image: '/images/product5.jpg', name: '土鸡蛋' }
    ]
  }
]);

const filteredSuppliers = computed(() => {
  if (!searchKeyword.value) return suppliers.value;
  const keyword = searchKeyword.value.toLowerCase();
  return suppliers.value.filter(s =>
    s.name.toLowerCase().includes(keyword)
  );
});

const handleAdd = () => {
  console.log('Add supplier');
};

const viewDetail = (supplier) => {
  console.log('View detail:', supplier);
};

const handleContact = (supplier) => {
  console.log('Contact supplier:', supplier);
};

const viewProducts = (supplier) => {
  console.log('View products:', supplier);
};

const getCooperationType = (cooperation) => {
  return cooperation === '长期合作' ? 'success' : 'primary';
};
</script>

<style scoped lang="scss">
.suppliers-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  padding-bottom: 80px;
}

.page-header {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  padding: 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

  :deep(.el-button) {
    position: relative;
    z-index: 1;
    padding: 10px 18px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: white;
    border: none;
    color: #4caf50;
    transition: all 0.3s;

    &:active {
      transform: scale(0.9);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
  }
}

.search-bar {
  padding: 16px;

  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 14px;
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid rgba(255, 255, 255, 0.8);

    &.is-focus {
      box-shadow: 0 6px 20px rgba(76, 175, 80, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);
      background: white;
    }
  }
}

.suppliers-content {
  padding: 0 16px;
}

.suppliers-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.supplier-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #4caf50, #8bc34a);
    transform: scaleX(0);
    transition: transform 0.4s;
  }

  &:active {
    transform: scale(0.98);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);

    &::before {
      transform: scaleX(1);
    }
  }
}

.supplier-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.supplier-avatar {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }
}

.supplier-info {
  flex: 1;

  h4 {
    margin: 0 0 6px;
    font-size: 17px;
    color: #2e7d32;
    font-weight: 700;
  }

  :deep(.el-rate) {
    margin-top: 4px;
  }
}

.supplier-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #558b2f;
  font-weight: 500;
  padding: 10px 14px;
  background: rgba(76, 175, 80, 0.05);
  border-radius: 10px;
  border-left: 4px solid #8bc34a;
  transition: all 0.3s;

  &:active {
    background: rgba(76, 175, 80, 0.1);
    transform: translateX(4px);
  }

  .el-icon {
    font-size: 16px;
    color: #4caf50;
  }
}

.supplier-products {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  overflow-x: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    height: 0;
  }

  .product-preview {
    width: 56px;
    height: 56px;
    border-radius: 10px;
    overflow: hidden;
    background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
    transition: transform 0.3s;

    &:active {
      transform: scale(0.9);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.supplier-actions {
  display: flex;
  gap: 10px;

  :deep(.el-button) {
    flex: 1;
    padding: 12px 16px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s;

    &:active {
      transform: scale(0.9);
    }

    &--primary {
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      border: none;
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);

      &:active {
        box-shadow: 0 1px 4px rgba(76, 175, 80, 0.3);
      }
    }

    &:not(.el-button--primary) {
      background: white;
      border: 2px solid rgba(76, 175, 80, 0.2);
      color: #4caf50;
    }
  }
}
</style>
