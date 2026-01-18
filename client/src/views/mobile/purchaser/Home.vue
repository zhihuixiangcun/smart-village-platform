<template>
  <div class="purchaser-home">
    <!-- 顶部搜索区 -->
    <header class="home-header">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索农产品..."
          :prefix-icon="Search"
          @input="handleSearch"
        />
      </div>
      <div class="category-tabs">
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-tab"
          :class="{ active: activeCategory === category.id }"
          @click="handleCategory(category)"
        >
          {{ category.label }}
        </div>
      </div>
    </header>

    <!-- 主要内容区 -->
    <main class="home-content">
      <!-- 热门推荐 -->
      <section class="hot-products">
        <div class="section-header">
          <h3 class="section-title">热门推荐</h3>
          <a @click="viewMore">查看更多 →</a>
        </div>
        <div class="product-scroll">
          <div
            v-for="product in hotProducts"
            :key="product.id"
            class="product-card"
            @click="viewProduct(product)"
          >
            <img :src="product.image" :alt="product.name" />
            <h4>{{ product.name }}</h4>
            <div class="price-row">
              <span class="price">¥{{ product.price }}</span>
              <span class="sales">{{ product.sales }}人付款</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 附近产地 -->
      <section class="nearby-farms">
        <div class="section-header">
          <h3 class="section-title">附近产地</h3>
          <a @click="viewMoreFarms">查看更多 →</a>
        </div>
        <div class="farm-list">
          <div
            v-for="farm in nearbyFarms"
            :key="farm.id"
            class="farm-card"
            @click="visitFarm(farm)"
          >
            <img :src="farm.image" :alt="farm.name" />
            <div class="farm-info">
              <h4>{{ farm.name }}</h4>
              <p>{{ farm.distance }}km | {{ farm.products }}种产品</p>
              <span class="farm-tag">产地直供</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 采购单快捷入口 -->
      <section class="quick-orders">
        <h3 class="section-title">我的采购</h3>
        <div class="order-grid">
          <div class="order-card" @click="viewOrders('pending')">
            <span class="order-count">{{ orderStats.pending }}</span>
            <span class="order-label">待付款</span>
          </div>
          <div class="order-card" @click="viewOrders('shipping')">
            <span class="order-count">{{ orderStats.shipping }}</span>
            <span class="order-label">待发货</span>
          </div>
          <div class="order-card" @click="viewOrders('delivering')">
            <span class="order-count">{{ orderStats.delivering }}</span>
            <span class="order-label">待收货</span>
          </div>
          <div class="order-card" @click="viewOrders('completed')">
            <span class="order-count">{{ orderStats.completed }}</span>
            <span class="order-label">已完成</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Search } from '@element-plus/icons-vue';

const router = useRouter();

const searchKeyword = ref('');
const activeCategory = ref('all');

const categories = ref([
  { id: 'all', label: '全部' },
  { id: 'vegetables', label: '蔬菜' },
  { id: 'fruits', label: '水果' },
  { id: 'grains', label: '粮食' },
  { id: 'livestock', label: '畜禽' },
]);

const hotProducts = ref([
  {
    id: 1,
    name: '有机西红柿',
    price: '8.00/斤',
    sales: 256,
    image: '/images/tomato.jpg',
  },
  {
    id: 2,
    name: '新鲜黄瓜',
    price: '5.00/斤',
    sales: 189,
    image: '/images/cucumber.jpg',
  },
  {
    id: 3,
    name: '土鸡蛋',
    price: '1.50/个',
    sales: 342,
    image: '/images/egg.jpg',
  },
  {
    id: 4,
    name: '有机大米',
    price: '15.00/斤',
    sales: 478,
    image: '/images/rice.jpg',
  },
]);

const nearbyFarms = ref([
  {
    id: 1,
    name: '绿源生态农场',
    distance: 3.5,
    products: 25,
    image: '/images/farm1.jpg',
  },
  {
    id: 2,
    name: '阳光种植合作社',
    distance: 5.2,
    products: 18,
    image: '/images/farm2.jpg',
  },
]);

const orderStats = ref({
  pending: 2,
  shipping: 1,
  delivering: 3,
  completed: 15,
});

const handleSearch = () => {
  // 实现搜索逻辑
};

const handleCategory = (category) => {
  activeCategory.value = category.id;
};

const viewProduct = (product) => {
  router.push(`/mobile/purchaser/product/${product.id}`);
};

const viewMore = () => {
  router.push('/mobile/purchaser/market');
};

const visitFarm = (farm) => {
  router.push(`/mobile/purchaser/farm/${farm.id}`);
};

const viewMoreFarms = () => {
  router.push('/mobile/purchaser/market?type=farms');
};

const viewOrders = (status) => {
  router.push(`/mobile/purchaser/orders?status=${status}`);
};
</script>

<style scoped lang="scss">
.purchaser-home {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  padding-bottom: 80px;
}

.home-header {
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

  .search-bar {
    margin-bottom: 16px;
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

  .category-tabs {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
    position: relative;
    z-index: 1;

    &::-webkit-scrollbar {
      height: 0;
    }

    .category-tab {
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 14px;
      white-space: nowrap;
      background: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.9);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      &.active {
        background: white;
        color: #4caf50;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: scale(1.05);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }
}

.home-content {
  padding: 20px 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .section-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #2e7d32;
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

  a {
    font-size: 14px;
    color: #4caf50;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;

    &:active {
      transform: scale(0.95);
    }
  }
}

.hot-products {
  margin-bottom: 28px;

  .product-scroll {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    padding: 4px;

    &::-webkit-scrollbar {
      height: 0;
    }
  }

  .product-card {
    min-width: 150px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-radius: 18px;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid rgba(255, 255, 255, 0.8);

    &:active {
      transform: scale(0.95);
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
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
        color: #e53935;
        background: linear-gradient(135deg, #e53935 0%, #f44336 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .sales {
        font-size: 12px;
        color: #689f38;
        font-weight: 500;
      }
    }
  }
}

.nearby-farms {
  margin-bottom: 28px;

  .farm-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .farm-card {
    display: flex;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-radius: 18px;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid rgba(255, 255, 255, 0.8);

    &:active {
      transform: scale(0.98);
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
    }

    img {
      width: 110px;
      height: 110px;
      object-fit: cover;
      transition: transform 0.3s;
    }

    .farm-info {
      flex: 1;
      padding: 14px;
      position: relative;

      h4 {
        margin: 0 0 6px;
        font-size: 16px;
        color: #2e7d32;
        font-weight: 700;
      }

      p {
        margin: 0 0 10px;
        font-size: 13px;
        color: #689f38;
        font-weight: 500;
      }

      .farm-tag {
        display: inline-block;
        padding: 4px 12px;
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        color: #1976d2;
        font-size: 12px;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: 0 2px 6px rgba(33, 150, 243, 0.2);
      }
    }
  }
}

.quick-orders {
  .order-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .order-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 18px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
      transition: transform 0.3s;
    }

    &:active {
      transform: scale(0.95);

      &::before {
        transform: scaleX(1);
      }
    }

    .order-count {
      font-size: 24px;
      font-weight: 800;
      color: #e53935;
      margin-bottom: 6px;
      background: linear-gradient(135deg, #e53935 0%, #f44336 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .order-label {
      font-size: 12px;
      color: #689f38;
      font-weight: 600;
    }
  }
}
</style>
