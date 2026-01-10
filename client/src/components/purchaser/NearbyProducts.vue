<template>
  <div class="nearby-products">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><ShoppingCart /></el-icon>
            <span>附近商品搜索</span>
            <el-tag type="warning" size="small" v-if="locationInfo">
              {{ locationInfo.city || '附近' }}
            </el-tag>
          </div>
          <div class="header-right">
            <el-button type="primary" text @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="primary" text @click="handleMapView">
              <el-icon><MapLocation /></el-icon>
              地图
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索商品名称、商家"
          size="large"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="handleSearch"> 搜索 </el-button>
          </template>
        </el-input>
      </div>

      <!-- 分类筛选 -->
      <div class="category-section">
        <div class="category-title">商品分类</div>
        <div class="category-list">
          <div
            v-for="category in categories"
            :key="category.key"
            class="category-item"
            :class="{ active: activeCategory === category.key }"
            @click="selectCategory(category.key)"
          >
            <div class="category-icon" :style="{ background: category.color }">
              <component :is="category.icon" />
            </div>
            <span class="category-label">{{ category.label }}</span>
            <span class="category-count">({{ category.count }})</span>
          </div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-section">
        <el-select
          v-model="filters.distance"
          placeholder="距离范围"
          style="width: 140px"
          @change="handleFilter"
        >
          <el-option label="1公里内" :value="1" />
          <el-option label="3公里内" :value="3" />
          <el-option label="5公里内" :value="5" />
          <el-option label="10公里内" :value="10" />
        </el-select>
        <el-select
          v-model="filters.priceRange"
          placeholder="价格区间"
          style="width: 140px"
          @change="handleFilter"
          clearable
        >
          <el-option label="10元以下" :value="{ min: 0, max: 10 }" />
          <el-option label="10-50元" :value="{ min: 10, max: 50 }" />
          <el-option label="50-100元" :value="{ min: 50, max: 100 }" />
          <el-option label="100元以上" :value="{ min: 100, max: 99999 }" />
        </el-select>
        <el-select
          v-model="filters.sortBy"
          placeholder="排序方式"
          style="width: 130px"
          @change="handleFilter"
        >
          <el-option label="距离优先" value="distance" />
          <el-option label="价格最低" value="price_asc" />
          <el-option label="价格最高" value="price_desc" />
          <el-option label="销量优先" value="sales" />
        </el-select>
        <el-radio-group v-model="filters.inStock" @change="handleFilter">
          <el-radio-button :label="true">仅看有货</el-radio-button>
          <el-radio-button label="">全部</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在搜索附近商品...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredProducts.length === 0" class="empty-container">
        <el-empty description="暂无相关商品">
          <el-button type="primary" @click="expandSearch"> 扩大搜索范围 </el-button>
        </el-empty>
      </div>

      <!-- 商品列表 -->
      <div v-else class="products-container">
        <div class="products-stats">
          <span class="stats-text">为您找到 {{ filteredProducts.length }} 件商品</span>
          <el-button type="primary" text @click="toggleViewMode">
            <el-icon><component :is="viewMode === 'grid' ? List : Grid" /></el-icon>
            {{ viewMode === 'grid' ? '列表视图' : '网格视图' }}
          </el-button>
        </div>

        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="products-grid">
          <div
            v-for="product in filteredProducts"
            :key="product._id"
            class="product-card"
            @click="viewProductDetail(product)"
          >
            <!-- 商品图片 -->
            <div class="product-image">
              <img :src="product.image || defaultProductImage" :alt="product.name" />
              <div class="image-overlay">
                <div class="distance-badge">
                  <el-icon><Location /></el-icon>
                  {{ product.distance?.toFixed(1) }}km
                </div>
                <div class="stock-badge" :class="{ 'out-of-stock': !product.inStock }">
                  {{ product.inStock ? '有货' : '售罄' }}
                </div>
              </div>
              <!-- 收藏按钮 -->
              <el-button
                class="favorite-btn"
                :type="product.isFavorite ? 'danger' : ''"
                :icon="product.isFavorite ? StarFilled : Star"
                circle
                size="small"
                @click.stop="toggleFavorite(product)"
              />
            </div>

            <!-- 商品信息 -->
            <div class="product-info">
              <h4 class="product-name">{{ product.name }}</h4>
              <div class="product-shop">
                <el-icon><Shop /></el-icon>
                {{ product.shopName }}
              </div>

              <!-- 价格信息 -->
              <div class="product-price-row">
                <div class="price-info">
                  <span class="price-symbol">¥</span>
                  <span class="price-value">{{ product.price }}</span>
                  <span class="price-unit">/{{ product.unit }}</span>
                </div>
                <div class="original-price" v-if="product.originalPrice">
                  ¥{{ product.originalPrice }}
                </div>
              </div>

              <!-- 销量和库存 -->
              <div class="product-stats">
                <span class="sales">已售{{ product.salesCount || 0 }}件</span>
                <span class="stock">库存{{ product.stock || 0 }}{{ product.unit }}</span>
              </div>

              <!-- 操作按钮 -->
              <div class="product-actions">
                <el-button size="small" @click.stop="handleContact(product)">
                  <el-icon><ChatDotRound /></el-icon>
                  咨询
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  @click.stop="handleAddToCart(product)"
                  :disabled="!product.inStock"
                >
                  <el-icon><ShoppingCart /></el-icon>
                  加入购物车
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="products-list">
          <div
            v-for="product in filteredProducts"
            :key="product._id"
            class="product-list-item"
            @click="viewProductDetail(product)"
          >
            <div class="list-item-image">
              <img :src="product.image || defaultProductImage" :alt="product.name" />
              <div class="distance-badge">
                <el-icon><Location /></el-icon>
                {{ product.distance?.toFixed(1) }}km
              </div>
            </div>

            <div class="list-item-info">
              <h4 class="product-name">{{ product.name }}</h4>
              <div class="product-shop">
                <el-icon><Shop /></el-icon>
                {{ product.shopName }}
              </div>
              <div class="product-description" v-if="product.description">
                {{ product.description }}
              </div>

              <div class="product-meta">
                <div class="price-info">
                  <span class="price-symbol">¥</span>
                  <span class="price-value">{{ product.price }}</span>
                  <span class="price-unit">/{{ product.unit }}</span>
                  <span class="original-price" v-if="product.originalPrice">
                    原价¥{{ product.originalPrice }}
                  </span>
                </div>
                <div class="product-stats">
                  <span>已售{{ product.salesCount || 0 }}</span>
                  <span>库存{{ product.stock || 0 }}</span>
                </div>
              </div>

              <div class="list-item-actions">
                <el-button size="small" @click.stop="toggleFavorite(product)">
                  <el-icon><component :is="product.isFavorite ? StarFilled : Star" /></el-icon>
                  {{ product.isFavorite ? '已收藏' : '收藏' }}
                </el-button>
                <el-button size="small" @click.stop="handleContact(product)">
                  <el-icon><ChatDotRound /></el-icon>
                  咨询
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  @click.stop="handleAddToCart(product)"
                  :disabled="!product.inStock"
                >
                  <el-icon><ShoppingCart /></el-icon>
                  加入购物车
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div class="load-more" v-if="hasMore && !loading">
        <el-button @click="loadMore" :loading="loadingMore"> 加载更多 </el-button>
      </div>
    </el-card>

    <!-- 地图视图对话框 -->
    <el-dialog v-model="mapDialogVisible" title="附近商品地图" width="90%" top="5vh">
      <div class="map-container" id="productMap">
        <div class="map-placeholder">
          <el-icon><MapLocation /></el-icon>
          <p>地图功能开发中</p>
          <p class="map-tip">将在地图上显示所有商品位置</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="mapDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 商品详情对话框 -->
    <el-dialog v-model="detailDialogVisible" :title="currentProduct?.name" width="700px">
      <div class="product-detail" v-if="currentProduct">
        <!-- 图片展示 -->
        <div class="detail-gallery">
          <img :src="currentProduct.image || defaultProductImage" :alt="currentProduct.name" />
        </div>

        <!-- 价格信息 -->
        <div class="detail-price">
          <div class="current-price">
            <span class="price-symbol">¥</span>
            <span class="price-value">{{ currentProduct.price }}</span>
            <span class="price-unit">/{{ currentProduct.unit }}</span>
          </div>
          <div class="original-price" v-if="currentProduct.originalPrice">
            原价：¥{{ currentProduct.originalPrice }}
          </div>
          <div class="discount" v-if="currentProduct.originalPrice">
            省¥{{ (currentProduct.originalPrice - currentProduct.price).toFixed(2) }}
          </div>
        </div>

        <!-- 商品信息 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="商家">
            {{ currentProduct.shopName }}
          </el-descriptions-item>
          <el-descriptions-item label="距离">
            {{ currentProduct.distance?.toFixed(1) }}km
          </el-descriptions-item>
          <el-descriptions-item label="库存">
            {{
              currentProduct.inStock ? `${currentProduct.stock}${currentProduct.unit}` : '暂无库存'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="销量">
            {{ currentProduct.salesCount || 0 }}件
          </el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">
            {{ currentProduct.shopAddress }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 商品描述 -->
        <div class="detail-description" v-if="currentProduct.description">
          <h5>商品描述</h5>
          <p>{{ currentProduct.description }}</p>
        </div>

        <!-- 规格参数 -->
        <div class="detail-specs" v-if="currentProduct.specs">
          <h5>规格参数</h5>
          <div class="specs-list">
            <div v-for="(value, key) in currentProduct.specs" :key="key" class="spec-item">
              <span class="spec-label">{{ key }}：</span>
              <span class="spec-value">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="danger" @click="toggleFavorite(currentProduct)">
          <el-icon><component :is="currentProduct?.isFavorite ? StarFilled : Star" /></el-icon>
          {{ currentProduct?.isFavorite ? '取消收藏' : '收藏商品' }}
        </el-button>
        <el-button type="success" @click="handleContact(currentProduct)">
          <el-icon><ChatDotRound /></el-icon>
          联系商家
        </el-button>
        <el-button
          type="primary"
          @click="handleAddToCart(currentProduct)"
          :disabled="!currentProduct?.inStock"
        >
          <el-icon><ShoppingCart /></el-icon>
          加入购物车
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ShoppingCart,
  Refresh,
  MapLocation,
  Search,
  Loading,
  Location,
  Shop,
  ChatDotRound,
  Star,
  StarFilled,
  List,
  Grid,
  Food,
  Goods,
  PriceTag,
  Burger,
  Operation,
  Clock,
} from '@element-plus/icons-vue';
import api from '@/api';

const router = useRouter();

const props = defineProps({
  purchaserId: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['addToCart', 'contact', 'favorite', 'navigate']);

const loading = ref(false);
const loadingMore = ref(false);
const activeCategory = ref('all');
const searchKeyword = ref('');
const viewMode = ref('grid');
const mapDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const currentProduct = ref(null);
const locationInfo = ref({ city: '杭州市' });
const hasMore = ref(true);

const defaultProductImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="16"%3E商品图片%3C/text%3E%3C/svg%3E';

const filters = reactive({
  distance: 5,
  priceRange: null,
  sortBy: 'distance',
  inStock: '',
});

const categories = [
  {
    key: 'all',
    label: '全部',
    icon: Grid,
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    count: 0,
  },
  {
    key: 'vegetables',
    label: '蔬菜',
    icon: Food,
    color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    count: 25,
  },
  {
    key: 'fruits',
    label: '水果',
    icon: Goods,
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    count: 18,
  },
  {
    key: 'grain',
    label: '粮食',
    icon: Burger,
    color: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    count: 12,
  },
  {
    key: 'livestock',
    label: '畜禽',
    icon: Operation,
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    count: 15,
  },
  {
    key: 'aquatic',
    label: '水产',
    icon: PriceTag,
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    count: 8,
  },
  {
    key: 'drinks',
    label: '饮品',
    icon: Clock,
    color: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    count: 20,
  },
];

// 模拟商品数据
const productsData = ref([
  {
    _id: '1',
    name: '有机大白菜',
    shopName: '绿源农场',
    shopAddress: '西湖区转塘街道128号',
    category: 'vegetables',
    image: '',
    price: 3.5,
    originalPrice: 4.5,
    unit: '斤',
    distance: 0.8,
    stock: 150,
    inStock: true,
    salesCount: 320,
    isFavorite: false,
    description: '新鲜有机种植，口感鲜嫩，营养丰富。',
    specs: {
      产地: '杭州西湖',
      保质期: '7天',
      存储方式: '阴凉干燥处',
    },
  },
  {
    _id: '2',
    name: '新鲜草莓',
    shopName: '甜蜜草莓园',
    shopAddress: '余杭区良渚街道',
    category: 'fruits',
    image: '',
    price: 25,
    originalPrice: 30,
    unit: '斤',
    distance: 2.5,
    stock: 80,
    inStock: true,
    salesCount: 186,
    isFavorite: true,
    description: '精选优质草莓，个大饱满，香甜可口。',
    specs: {
      产地: '杭州余杭',
      保质期: '3天',
      存储方式: '冷藏',
    },
  },
  {
    _id: '3',
    name: '土鸡蛋',
    shopName: '农家散养鸡场',
    shopAddress: '萧山区瓜沥镇',
    category: 'livestock',
    image: '',
    price: 1.5,
    originalPrice: 2,
    unit: '个',
    distance: 3.2,
    stock: 200,
    inStock: true,
    salesCount: 560,
    isFavorite: false,
    description: '散养土鸡产蛋，营养丰富，味道鲜美。',
    specs: {
      产地: '杭州萧山',
      保质期: '15天',
      存储方式: '常温或冷藏',
    },
  },
  {
    _id: '4',
    name: '生态大米',
    shopName: '丰收农业合作社',
    shopAddress: '临平区乔司镇',
    category: 'grain',
    image: '',
    price: 6,
    originalPrice: 8,
    unit: '斤',
    distance: 4.5,
    stock: 0,
    inStock: false,
    salesCount: 890,
    isFavorite: false,
    description: '优质稻谷，生态种植，米香浓郁。',
    specs: {
      产地: '杭州临平',
      保质期: '12个月',
      存储方式: '阴凉干燥',
    },
  },
  {
    _id: '5',
    name: '鲜活鲫鱼',
    shopName: '淡水鱼养殖基地',
    shopAddress: '西湖区留下街道',
    category: 'aquatic',
    image: '',
    price: 12,
    originalPrice: 15,
    unit: '斤',
    distance: 1.8,
    stock: 50,
    inStock: true,
    salesCount: 128,
    isFavorite: true,
    description: '现捞现卖，新鲜活鱼，肉质鲜美。',
    specs: {
      产地: '杭州本地',
      保质期: '1天',
      存储方式: '活水养殖',
    },
  },
  {
    _id: '6',
    name: '有机胡萝卜',
    shopName: '绿源农场',
    shopAddress: '西湖区转塘街道128号',
    category: 'vegetables',
    image: '',
    price: 4,
    unit: '斤',
    distance: 0.8,
    stock: 100,
    inStock: true,
    salesCount: 245,
    isFavorite: false,
    description: '新鲜有机胡萝卜，甘甜脆嫩。',
    specs: {
      产地: '杭州西湖',
      保质期: '10天',
      存储方式: '阴凉干燥',
    },
  },
  {
    _id: '7',
    name: '农家自酿米酒',
    shopName: '传统酿酒坊',
    shopAddress: '余杭区径山镇',
    category: 'drinks',
    image: '',
    price: 18,
    originalPrice: 25,
    unit: '斤',
    distance: 6.5,
    stock: 60,
    inStock: true,
    salesCount: 98,
    isFavorite: false,
    description: '纯粮酿造，口感醇厚，回味悠长。',
    specs: {
      产地: '杭州余杭',
      酒精度: '12度',
      保质期: '18个月',
    },
  },
  {
    _id: '8',
    name: '新鲜西红柿',
    shopName: '绿源农场',
    shopAddress: '西湖区转塘街道128号',
    category: 'vegetables',
    image: '',
    price: 5,
    unit: '斤',
    distance: 0.8,
    stock: 120,
    inStock: true,
    salesCount: 412,
    isFavorite: false,
    description: '自然成熟，酸甜可口，营养丰富。',
    specs: {
      产地: '杭州西湖',
      保质期: '5天',
      存储方式: '阴凉干燥',
    },
  },
]);

const filteredProducts = ref([]);

// 选择分类
const selectCategory = key => {
  activeCategory.value = key;
  handleFilter();
};

// 搜索
const handleSearch = () => {
  handleFilter();
};

// 筛选商品
const handleFilter = () => {
  loading.value = true;

  setTimeout(() => {
    let filtered = [...productsData.value];

    // 按分类筛选
    if (activeCategory.value !== 'all') {
      filtered = filtered.filter(p => p.category === activeCategory.value);
    }

    // 按关键词搜索
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(keyword) ||
          p.shopName.toLowerCase().includes(keyword) ||
          p.description?.toLowerCase().includes(keyword)
      );
    }

    // 按距离筛选
    if (filters.distance) {
      filtered = filtered.filter(p => p.distance <= filters.distance);
    }

    // 按价格筛选
    if (filters.priceRange) {
      filtered = filtered.filter(
        p => p.price >= filters.priceRange.min && p.price <= filters.priceRange.max
      );
    }

    // 按库存筛选
    if (filters.inStock === true) {
      filtered = filtered.filter(p => p.inStock);
    }

    // 排序
    switch (filters.sortBy) {
      case 'distance':
        filtered.sort((a, b) => a.distance - b.distance);
        break;
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'sales':
        filtered.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
        break;
    }

    filteredProducts.value = filtered.slice(0, 12);
    hasMore.value = filtered.length > 12;

    loading.value = false;
  }, 300);
};

// 刷新
const handleRefresh = () => {
  handleFilter();
};

// 扩大搜索范围
const expandSearch = () => {
  filters.distance = Math.min(filters.distance + 5, 20);
  handleFilter();
};

// 地图视图
const handleMapView = () => {
  mapDialogVisible.value = true;
};

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid';
};

// 查看商品详情
const viewProductDetail = product => {
  currentProduct.value = product;
  detailDialogVisible.value = true;
};

// 收藏/取消收藏
const toggleFavorite = product => {
  product.isFavorite = !product.isFavorite;
  emit('favorite', product);
  ElMessage.success(product.isFavorite ? '已添加收藏' : '已取消收藏');
};

// 联系商家
const handleContact = product => {
  emit('contact', product);
  ElMessage.success(`正在联系${product.shopName}...`);
};

// 加入购物车
const handleAddToCart = product => {
  emit('addToCart', product);
  ElMessage.success(`已将${product.name}加入购物车`);
};

// 加载更多
const loadMore = () => {
  loadingMore.value = true;
  setTimeout(() => {
    loadingMore.value = false;
    hasMore.value = false;
    ElMessage.success('没有更多了');
  }, 1000);
};

onMounted(() => {
  handleFilter();
});
</script>

<style scoped>
.nearby-products {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  gap: 8px;
}

/* 搜索栏 */
.search-section {
  margin: 20px 0;
}

/* 分类筛选 */
.category-section {
  margin: 20px 0;
}

.category-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
}

.category-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  min-width: 80px;
}

.category-item:hover {
  background: #f5f7fa;
  transform: translateY(-2px);
}

.category-item.active {
  border-color: #e6a23c;
  background: #fef9e7;
}

.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.category-label {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.category-count {
  font-size: 11px;
  color: #909399;
}

/* 筛选栏 */
.filter-section {
  display: flex;
  gap: 12px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
  color: #909399;
}

.loading-container .el-icon {
  font-size: 32px;
}

.empty-container {
  padding: 40px;
}

/* 商品容器 */
.products-container {
  margin-top: 20px;
}

.products-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stats-text {
  font-size: 14px;
  color: #606266;
}

/* 网格视图 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.product-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.product-card:hover {
  border-color: #e6a23c;
  box-shadow: 0 4px 16px rgba(230, 162, 60, 0.2);
  transform: translateY(-4px);
}

.product-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.3) 100%);
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.distance-badge {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #67c23a;
}

.stock-badge {
  align-self: flex-end;
  padding: 4px 10px;
  background: #67c23a;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.stock-badge.out-of-stock {
  background: #909399;
}

.favorite-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
}

.product-info {
  padding: 16px;
}

.product-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-shop {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.product-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.price-symbol {
  font-size: 14px;
  color: #f56c6c;
}

.price-value {
  font-size: 20px;
  font-weight: 700;
  color: #f56c6c;
}

.price-unit {
  font-size: 12px;
  color: #909399;
}

.original-price {
  font-size: 12px;
  color: #c0c4cc;
  text-decoration: line-through;
}

.product-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
}

.product-actions {
  display: flex;
  gap: 6px;
}

.product-actions .el-button {
  flex: 1;
}

/* 列表视图 */
.products-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.product-list-item {
  display: flex;
  gap: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.product-list-item:hover {
  border-color: #e6a23c;
  box-shadow: 0 4px 16px rgba(230, 162, 60, 0.2);
}

.list-item-image {
  position: relative;
  width: 150px;
  height: 150px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.list-item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-description {
  font-size: 13px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-item-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

/* 加载更多 */
.load-more {
  margin-top: 20px;
  text-align: center;
}

/* 详情对话框 */
.product-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-gallery {
  width: 100%;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.detail-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-price {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #fef9e7;
  border-radius: 8px;
}

.current-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.discount {
  padding: 4px 12px;
  background: #f56c6c;
  color: white;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.detail-description,
.detail-specs {
  margin-top: 20px;
}

.detail-description h5,
.detail-specs h5 {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 12px;
}

.detail-description p {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.specs-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.spec-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.spec-label {
  color: #909399;
}

.spec-value {
  color: #303133;
}

/* 地图占位 */
.map-container {
  width: 100%;
  height: 500px;
}

.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
}

.map-placeholder .el-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.map-placeholder p {
  margin: 8px 0;
  font-size: 16px;
}

.map-tip {
  font-size: 14px;
  color: #c0c4cc;
}

@media (max-width: 768px) {
  .category-list {
    overflow-x: auto;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-section {
    flex-direction: column;
  }

  .filter-section .el-select,
  .filter-section .el-radio-group {
    width: 100% !important;
  }

  .product-list-item {
    flex-direction: column;
  }

  .list-item-image {
    width: 100%;
    height: 200px;
  }

  .list-item-actions {
    flex-direction: column;
  }

  .specs-list {
    grid-template-columns: 1fr;
  }
}
</style>
