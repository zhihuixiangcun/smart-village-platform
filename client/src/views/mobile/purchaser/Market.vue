<template>
  <div class="market-page">
    <header class="page-header">
      <h2>农产品市场</h2>
      <div class="search-bar">
        <el-input placeholder="搜索农产品..." :prefix-icon="Search" />
      </div>
    </header>

    <main class="market-content">
      <section class="category-section">
        <h3>分类</h3>
        <div class="category-scroll">
          <div class="category-item" v-for="cat in categories" :key="cat.id">
            <span>{{ cat.name }}</span>
          </div>
        </div>
      </section>

      <section class="products-section">
        <h3>热门产品</h3>
        <div class="product-grid">
          <div class="product-card" v-for="product in products" :key="product.id">
            <img :src="product.image" :alt="product.name" />
            <h4>{{ product.name }}</h4>
            <div class="price-row">
              <span class="price">{{ product.price }}</span>
              <el-button type="primary" size="small">购买</el-button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Search } from '@element-plus/icons-vue';

const categories = ref([
  { id: 1, name: '蔬菜' },
  { id: 2, name: '水果' },
  { id: 3, name: '粮食' },
  { id: 4, name: '禽蛋' },
  { id: 5, name: '畜禽' },
]);

const products = ref([
  { id: 1, name: '有机西红柿', price: '¥8.00/斤', image: '/images/tomato.jpg' },
  { id: 2, name: '新鲜黄瓜', price: '¥5.00/斤', image: '/images/cucumber.jpg' },
  { id: 3, name: '土鸡蛋', price: '¥1.50/个', image: '/images/egg.jpg' },
  { id: 4, name: '有机大米', price: '¥15.00/斤', image: '/images/rice.jpg' },
]);
</script>

<style scoped lang="scss">
.market-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  padding-bottom: 80px;
}

.page-header {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  padding: 20px 16px;
  padding-top: max(20px, env(safe-area-inset-top));
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
    margin: 0 0 14px;
    font-size: 24px;
    color: white;
    font-weight: 700;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1;
  }

  .search-bar {
    position: relative;
    z-index: 1;

    :deep(.el-input__wrapper) {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &.is-focus {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        background: white;
      }
    }
  }
}

.market-content {
  padding: 20px 16px;
}

.category-section {
  margin-bottom: 28px;

  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #2e7d32;
    margin: 0 0 14px;
    position: relative;
    padding-left: 14px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 24px;
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      border-radius: 2px;
    }
  }
}

.category-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    height: 0;
  }

  .category-item {
    padding: 10px 20px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    font-size: 14px;
    color: #689f38;
    white-space: nowrap;
    cursor: pointer;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.1), 0 2px 6px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid rgba(255, 255, 255, 0.8);

    &:active {
      transform: scale(0.95);
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }
  }
}

.products-section {
  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #2e7d32;
    margin: 0 0 14px;
    position: relative;
    padding-left: 14px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 24px;
      background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
      border-radius: 2px;
    }
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.product-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
  backdrop-filter: blur(10px);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid rgba(255, 255, 255, 0.8);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #4caf50, #8bc34a);
    transform: scaleX(0);
    transition: transform 0.3s;
  }

  &:active {
    transform: scale(0.95);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);

    &::before {
      transform: scaleX(1);
    }
  }

  img {
    width: 100%;
    height: 130px;
    object-fit: cover;
    transition: transform 0.3s;
  }

  h4 {
    margin: 12px;
    font-size: 15px;
    color: #2e7d32;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .price-row {
    padding: 0 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .price {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, #e53935 0%, #f44336 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    :deep(.el-button) {
      padding: 8px 16px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px;
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
}
</style>
