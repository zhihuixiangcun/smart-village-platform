<template>
  <div class="nearby-products">
    <el-card class="main-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon-wrapper">
              <el-icon class="header-icon"><ShoppingCart /></el-icon>
            </div>
            <div class="header-text">
              <h2 class="header-title">附近商品搜索</h2>
              <el-tag type="success" size="small" effect="light" v-if="locationInfo">
                <el-icon><Location /></el-icon>
                {{ locationInfo.city || '附近' }}
              </el-tag>
            </div>
          </div>
          <div class="header-right">
            <el-button type="success" text @click="handleRefresh" class="header-action-btn">
              <el-icon><Refresh /></el-icon>
              <span class="btn-text">刷新</span>
            </el-button>
            <el-button type="success" text @click="handleMapView" class="header-action-btn">
              <el-icon><MapLocation /></el-icon>
              <span class="btn-text">地图</span>
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-section">
        <div class="search-wrapper">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商品名称、商家"
            size="large"
            clearable
            class="search-input"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon class="search-icon"><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" class="search-btn" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </div>
      </div>

      <!-- 分类筛选 -->
      <div class="category-section">
        <div class="section-header">
          <h3 class="section-title">商品分类</h3>
          <span class="section-subtitle">选择您感兴趣的商品类型</span>
        </div>
        <div class="category-list">
          <div
            v-for="category in categories"
            :key="category.key"
            class="category-item"
            :class="{ active: activeCategory === category.key }"
            @click="selectCategory(category.key)"
          >
            <div class="category-icon-wrapper">
              <div class="category-icon" :style="{ background: category.color }">
                <component :is="category.icon" />
              </div>
              <div class="category-glow" :style="{ background: category.color }"></div>
            </div>
            <div class="category-info">
              <span class="category-label">{{ category.label }}</span>
              <span class="category-count">{{ category.count }}件</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-section">
        <el-select
          v-model="filters.distance"
          placeholder="距离范围"
          class="filter-select"
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
          class="filter-select"
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
          class="filter-select"
          @change="handleFilter"
        >
          <el-option label="距离优先" value="distance" />
          <el-option label="价格最低" value="price_asc" />
          <el-option label="价格最高" value="price_desc" />
          <el-option label="销量优先" value="sales" />
        </el-select>
        <el-radio-group v-model="filters.inStock" @change="handleFilter" class="stock-filter">
          <el-radio-button :label="true">仅看有货</el-radio-button>
          <el-radio-button label="">全部</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner">
          <el-icon class="is-loading loading-icon"><Loading /></el-icon>
        </div>
        <span class="loading-text">正在搜索附近商品...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredProducts.length === 0" class="empty-container">
        <el-empty description="暂无相关商品" :image-size="180">
          <el-button type="success" @click="expandSearch" class="empty-action-btn">
            扩大搜索范围
          </el-button>
        </el-empty>
      </div>

      <!-- 商品列表 -->
      <div v-else class="products-container">
        <div class="products-header">
          <div class="products-stats">
            <span class="stats-icon">📦</span>
            <span class="stats-text">为您找到 <strong>{{ filteredProducts.length }}</strong> 件商品</span>
          </div>
          <el-button
            :type="viewMode === 'grid' ? 'success' : 'success'"
            :plain="viewMode !== 'grid'"
            @click="toggleViewMode"
            class="view-toggle-btn"
          >
            <el-icon><component :is="viewMode === 'grid' ? List : Grid" /></el-icon>
            {{ viewMode === 'grid' ? '列表视图' : '网格视图' }}
          </el-button>
        </div>

        <!-- 网格视图 -->
        <transition name="view-fade" mode="out-in">
          <div v-if="viewMode === 'grid'" class="products-grid">
            <div
              v-for="(product, index) in filteredProducts"
              :key="product._id"
              class="product-card"
              :style="{ animationDelay: `${index * 0.05}s` }"
              @click="viewProductDetail(product)"
            >
              <!-- 商品图片 -->
              <div class="product-image-wrapper">
                <div class="product-image">
                  <img :src="product.image || defaultProductImage" :alt="product.name" loading="lazy" />
                  <div class="image-overlay"></div>
                  <div class="badges-container">
                    <div class="distance-badge">
                      <el-icon><Location /></el-icon>
                      {{ product.distance?.toFixed(1) }}km
                    </div>
                    <div class="stock-badge" :class="{ 'out-of-stock': !product.inStock }">
                      <el-icon>
                        <CircleCheck v-if="product.inStock" />
                        <CircleClose v-else />
                      </el-icon>
                      {{ product.inStock ? '有货' : '售罄' }}
                    </div>
                  </div>
                </div>
                <!-- 收藏按钮 -->
                <el-button
                  class="favorite-btn"
                  :class="{ active: product.isFavorite }"
                  circle
                  @click.stop="toggleFavorite(product)"
                >
                  <el-icon>
                    <component :is="product.isFavorite ? StarFilled : Star" />
                  </el-icon>
                </el-button>
              </div>

              <!-- 商品信息 -->
              <div class="product-info">
                <h4 class="product-name" :title="product.name">{{ product.name }}</h4>
                <div class="product-shop">
                  <el-icon><Shop /></el-icon>
                  <span>{{ product.shopName }}</span>
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
                  <span class="stats-item sales">
                    <el-icon><ShoppingCart /></el-icon>
                    已售{{ product.salesCount || 0 }}件
                  </span>
                  <span class="stats-item stock">
                    <el-icon><Box /></el-icon>
                    库存{{ product.stock || 0 }}{{ product.unit }}
                  </span>
                </div>

                <!-- 操作按钮 -->
                <div class="product-actions">
                  <el-button size="small" class="action-btn secondary" @click.stop="handleContact(product)">
                    <el-icon><ChatDotRound /></el-icon>
                    <span>咨询</span>
                  </el-button>
                  <el-button
                    size="small"
                    type="primary"
                    class="action-btn primary"
                    @click.stop="handleAddToCart(product)"
                    :disabled="!product.inStock"
                  >
                    <el-icon><ShoppingCart /></el-icon>
                    <span>加入购物车</span>
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- 列表视图 -->
        <transition name="view-fade" mode="out-in">
          <div v-else class="products-list">
            <div
              v-for="(product, index) in filteredProducts"
              :key="product._id"
              class="product-list-item"
              :style="{ animationDelay: `${index * 0.05}s` }"
              @click="viewProductDetail(product)"
            >
              <div class="list-item-image">
                <img :src="product.image || defaultProductImage" :alt="product.name" loading="lazy" />
                <div class="image-overlay"></div>
                <div class="distance-badge">
                  <el-icon><Location /></el-icon>
                  {{ product.distance?.toFixed(1) }}km
                </div>
              </div>

              <div class="list-item-info">
                <h4 class="product-name">{{ product.name }}</h4>
                <div class="product-shop">
                  <el-icon><Shop /></el-icon>
                  <span>{{ product.shopName }}</span>
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
                    <span class="stats-item">
                      <el-icon><ShoppingCart /></el-icon>
                      已售{{ product.salesCount || 0 }}
                    </span>
                    <span class="stats-item">
                      <el-icon><Box /></el-icon>
                      库存{{ product.stock || 0 }}
                    </span>
                  </div>
                </div>

                <div class="list-item-actions">
                  <el-button
                    size="small"
                    class="action-btn secondary"
                    @click.stop="toggleFavorite(product)"
                  >
                    <el-icon>
                      <component :is="product.isFavorite ? StarFilled : Star" />
                    </el-icon>
                    {{ product.isFavorite ? '已收藏' : '收藏' }}
                  </el-button>
                  <el-button size="small" class="action-btn secondary" @click.stop="handleContact(product)">
                    <el-icon><ChatDotRound /></el-icon>
                    咨询
                  </el-button>
                  <el-button
                    size="small"
                    type="primary"
                    class="action-btn primary"
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
        </transition>
      </div>

      <!-- 加载更多 -->
      <transition name="fade-up">
        <div class="load-more" v-if="hasMore && !loading">
          <el-button class="load-more-btn" @click="loadMore" :loading="loadingMore">
            <el-icon><ArrowDown /></el-icon>
            加载更多
          </el-button>
        </div>
      </transition>
    </el-card>

    <!-- 地图视图对话框 -->
    <el-dialog
      v-model="mapDialogVisible"
      title="附近商品地图"
      width="90%"
      top="5vh"
      class="map-dialog"
    >
      <div class="map-container" id="productMap">
        <div class="map-placeholder">
          <div class="map-icon">
            <el-icon><MapLocation /></el-icon>
          </div>
          <h3 class="map-title">地图功能开发中</h3>
          <p class="map-tip">将在地图上显示所有商品位置</p>
          <div class="map-features">
            <span class="feature-item">
              <el-icon><Location /></el-icon>
              实时位置
            </span>
            <span class="feature-item">
              <el-icon><Shop /></el-icon>
              商家标注
            </span>
            <span class="feature-item">
              <el-icon><Navigation /></el-icon>
              导航路线
            </span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="mapDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 商品详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentProduct?.name"
      width="700px"
      class="detail-dialog"
    >
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
        <el-descriptions :column="2" border class="detail-descriptions">
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
          <h5 class="detail-subtitle">商品描述</h5>
          <p class="detail-content">{{ currentProduct.description }}</p>
        </div>

        <!-- 规格参数 -->
        <div class="detail-specs" v-if="currentProduct.specs">
          <h5 class="detail-subtitle">规格参数</h5>
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
        <el-button
          :type="currentProduct?.isFavorite ? 'danger' : 'success'"
          @click="toggleFavorite(currentProduct)"
        >
          <el-icon>
            <component :is="currentProduct?.isFavorite ? StarFilled : Star" />
          </el-icon>
          {{ currentProduct?.isFavorite ? '取消收藏' : '收藏商品' }}
        </el-button>
        <el-button type="primary" @click="handleContact(currentProduct)">
          <el-icon><ChatDotRound /></el-icon>
          联系商家
        </el-button>
        <el-button
          type="success"
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
  CircleCheck,
  CircleClose,
  Box,
  ArrowDown,
  Navigation,
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
    color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    count: 0,
  },
  {
    key: 'vegetables',
    label: '蔬菜',
    icon: Food,
    color: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    count: 25,
  },
  {
    key: 'fruits',
    label: '水果',
    icon: Goods,
    color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    count: 18,
  },
  {
    key: 'grain',
    label: '粮食',
    icon: Burger,
    color: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    count: 12,
  },
  {
    key: 'livestock',
    label: '畜禽',
    icon: Operation,
    color: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    count: 15,
  },
  {
    key: 'aquatic',
    label: '水产',
    icon: PriceTag,
    color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    count: 8,
  },
  {
    key: 'drinks',
    label: '饮品',
    icon: Clock,
    color: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
/* ==================== CSS Variables (Eco Theme) ==================== */
:root {
  --eco-primary: #10b981;
  --eco-primary-light: #34d399;
  --eco-primary-dark: #059669;
  --eco-secondary: #6b9b7a;
  --eco-bg: #f0fdf4;
  --eco-bg-light: #f0fdf4;
  --eco-text: #022c22;
  --eco-border: #bbf7d0;

  --text-primary: #020617;
  --text-secondary: #334155;
  --text-tertiary: #64748b;

  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 40px rgba(16, 185, 129, 0.2);

  --transition-fast: 0.15s ease;
  --transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* ==================== Main Container ==================== */
.nearby-products {
  height: 100%;
  background: var(--bg-secondary);
  font-family: var(--font-family);
}

.main-card {
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  background: var(--bg-primary);
  overflow: hidden;
}

/* ==================== Card Header ==================== */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: all var(--transition-base);
}

.header-icon-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.header-icon {
  font-size: 24px;
  color: white;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.header-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all var(--transition-base);
}

.header-action-btn:hover {
  transform: translateY(-2px);
}

.btn-text {
  font-size: 14px;
}

/* ==================== Search Section ==================== */
.search-section {
  margin: 24px 0;
}

.search-wrapper {
  display: flex;
  gap: 12px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  transition: all var(--transition-base);
}

.search-wrapper:focus-within {
  border-color: var(--eco-primary);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
  background: var(--bg-primary);
}

.search-input {
  flex: 1;
}

.search-input :deep(.el-input__wrapper) {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0 12px;
}

.search-icon {
  color: var(--text-tertiary);
  font-size: 18px;
}

.search-btn {
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  border: none;
  padding: 0 24px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* ==================== Category Section ==================== */
.category-section {
  margin: 24px 0;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.section-subtitle {
  font-size: 13px;
  color: var(--text-tertiary);
}

.category-list {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 8px 4px;
  scroll-behavior: smooth;
}

.category-list::-webkit-scrollbar {
  height: 6px;
}

.category-list::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.category-list::-webkit-scrollbar-thumb {
  background: var(--eco-border);
  border-radius: 3px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: 2px solid transparent;
  min-width: 100px;
  position: relative;
  overflow: hidden;
}

.category-item:hover {
  transform: translateY(-4px);
  background: var(--eco-bg-light);
  box-shadow: var(--shadow-md);
}

.category-item.active {
  border-color: var(--eco-primary);
  background: var(--eco-bg);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
}

.category-icon-wrapper {
  position: relative;
}

.category-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  position: relative;
  z-index: 2;
}

.category-item:hover .category-icon {
  transform: scale(1.1) rotate(-5deg);
}

.category-glow {
  position: absolute;
  width: 60px;
  height: 60px;
  background: inherit;
  border-radius: 50%;
  filter: blur(20px);
  opacity: 0;
  transition: opacity var(--transition-base);
  z-index: 1;
}

.category-item:hover .category-glow {
  opacity: 0.4;
}

.category-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.category-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.category-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ==================== Filter Section ==================== */
.filter-section {
  display: flex;
  gap: 12px;
  margin: 24px 0;
  flex-wrap: wrap;
}

.filter-select {
  width: 140px;
}

.filter-select :deep(.el-input__wrapper) {
  border-radius: var(--radius-sm);
  border-color: var(--eco-border);
  transition: all var(--transition-base);
}

.filter-select :deep(.el-input__wrapper:hover) {
  border-color: var(--eco-primary);
}

.filter-select :deep(.el-input__wrapper.is-focus) {
  border-color: var(--eco-primary);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.stock-filter {
  flex-shrink: 0;
}

/* ==================== Loading State ==================== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  gap: 20px;
  color: var(--text-tertiary);
}

.loading-spinner {
  position: relative;
}

.loading-icon {
  font-size: 48px;
  color: var(--eco-primary);
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* ==================== Empty State ==================== */
.empty-container {
  padding: 60px 40px;
}

.empty-action-btn {
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  border: none;
  padding: 12px 32px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.empty-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* ==================== Products Container ==================== */
.products-container {
  margin-top: 24px;
}

.products-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--eco-bg) 0%, var(--eco-bg-light) 100%);
  border-radius: var(--radius-md);
  border: 1px solid var(--eco-border);
}

.products-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-icon {
  font-size: 20px;
}

.stats-text {
  font-size: 15px;
  color: var(--text-secondary);
}

.stats-text strong {
  color: var(--eco-primary-dark);
  font-weight: 700;
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.view-toggle-btn:hover {
  transform: translateY(-2px);
}

/* ==================== Grid View ==================== */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.product-card {
  will-change: transform;
  background: var(--bg-primary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
  position: relative;
}

.product-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%);
  opacity: 0;
  transition: opacity var(--transition-base);
  pointer-events: none;
}

.product-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: var(--shadow-xl);
  border-color: var(--eco-border);
}

.product-card:hover::before {
  opacity: 1;
}

/* Product Image Wrapper */
.product-image-wrapper {
  position: relative;
  width: 100%;
}

.product-image {
  position: relative;
  width: 100%;
  height: 220px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.product-card:hover .product-image img {
  transform: scale(1.1);
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(2, 44, 34, 0.3) 100%);
  pointer-events: none;
}

.badges-container {
  position: absolute;
  inset: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  pointer-events: none;
}

.distance-badge,
.stock-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.distance-badge {
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
}

.stock-badge {
  background: linear-gradient(135deg, var(--eco-primary-light) 0%, var(--eco-primary) 100%);
}

.stock-badge.out-of-stock {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
}

.favorite-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid var(--eco-border);
  color: var(--text-tertiary);
  transition: all var(--transition-base);
}

.favorite-btn:hover {
  transform: scale(1.15) rotate(10deg);
  background: var(--eco-primary);
  color: white;
  border-color: var(--eco-primary);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.favorite-btn.active {
  background: linear-gradient(135deg, #f56c6c 0%, #ef4444 100%);
  color: white;
  border-color: #f56c6c;
}

/* Product Info */
.product-info {
  padding: 16px;
}

.product-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--transition-base);
}

.product-card:hover .product-name {
  color: var(--eco-primary-dark);
}

.product-shop {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.product-shop span {
  font-weight: 500;
}

.product-price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.price-symbol {
  font-size: 14px;
  font-weight: 600;
  color: var(--eco-primary-dark);
}

.price-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--eco-primary-dark);
}

.price-unit {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 2px;
}

.original-price {
  font-size: 13px;
  color: var(--text-tertiary);
  text-decoration: line-through;
  font-weight: 500;
}

.product-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 14px;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stats-item .el-icon {
  font-size: 14px;
  color: var(--eco-primary);
}

.product-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn span {
  font-size: 13px;
}

.action-btn.secondary {
  border: 2px solid var(--eco-border);
  background: var(--eco-bg-light);
  color: var(--text-secondary);
}

.action-btn.secondary:hover {
  border-color: var(--eco-primary);
  background: var(--eco-bg);
  color: var(--eco-primary-dark);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  border: none;
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.action-btn.primary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.action-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== List View ==================== */
.products-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.product-list-item {
  display: flex;
  gap: 20px;
  border: 2px solid var(--eco-border);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all var(--transition-base);
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.product-list-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
  opacity: 0;
  transition: opacity var(--transition-base);
  pointer-events: none;
}

.product-list-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--eco-primary);
}

.product-list-item:hover::before {
  opacity: 1;
}

.list-item-image {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.list-item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.product-list-item:hover .list-item-image img {
  transform: scale(1.1);
}

.list-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-description {
  font-size: 14px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.6;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.list-item-actions {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

/* ==================== Transitions ==================== */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.3s ease;
}

.view-fade-enter-from,
.view-fade-leave-to {
  opacity: 0;
}

.fade-up-enter-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-up-leave-active {
  transition: all 0.3s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Staggered Animation for Grid Items */
.product-card,
.product-list-item {
  animation: fadeInUp 0.6s ease-out backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ==================== Load More ==================== */
.load-more {
  margin-top: 24px;
  text-align: center;
}

.load-more-btn {
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  border: none;
  padding: 12px 32px;
  font-weight: 600;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.load-more-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

/* ==================== Dialogs ==================== */
.map-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  color: white;
}

.detail-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  color: white;
}

.map-container {
  width: 100%;
  height: 500px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, var(--eco-bg) 0%, var(--bg-secondary) 100%);
}

.map-icon {
  font-size: 72px;
  color: var(--eco-primary);
  margin-bottom: 20px;
  animation: mapFloat 3s ease-in-out infinite;
}

@keyframes mapFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.map-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.map-tip {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0 0 24px;
}

.map-features {
  display: flex;
  gap: 24px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-primary);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
}

/* ==================== Product Detail ==================== */
.product-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-gallery {
  width: 100%;
  height: 320px;
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
}

.detail-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-price {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, var(--eco-bg) 0%, var(--eco-bg-light) 100%);
  border-radius: var(--radius-md);
  border: 2px solid var(--eco-border);
}

.current-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.discount {
  padding: 6px 16px;
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.detail-descriptions {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.detail-description,
.detail-specs {
  margin-top: 24px;
}

.detail-subtitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-subtitle::before {
  content: '';
  width: 4px;
  height: 18px;
  background: linear-gradient(135deg, var(--eco-primary) 0%, var(--eco-primary-dark) 100%);
  border-radius: 2px;
}

.detail-content {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
}

.specs-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.spec-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--eco-border);
}

.spec-label {
  color: var(--text-tertiary);
  font-weight: 500;
}

.spec-value {
  color: var(--text-primary);
  font-weight: 600;
}

/* ==================== Responsive Design ==================== */
@media (max-width: 1024px) {
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
    gap: 16px;
  }

  .category-list {
    gap: 12px;
  }

  .category-item {
    min-width: 90px;
    padding: 12px 16px;
  }
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-left {
    width: 100%;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }

  .search-wrapper {
    flex-direction: column;
  }

  .search-input,
  .search-btn {
    width: 100%;
  }

  .category-list {
    padding-bottom: 12px;
  }

  .category-item {
    min-width: 80px;
    padding: 10px 14px;
  }

  .category-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .filter-section {
    flex-direction: column;
    gap: 12px;
  }

  .filter-select {
    width: 100%;
  }

  .stock-filter {
    width: 100%;
  }

  .stock-filter :deep(.el-radio-group) {
    display: flex;
  }

  .stock-filter :deep(.el-radio-button) {
    flex: 1;
  }

  .products-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .product-image {
    height: 180px;
  }

  .product-info {
    padding: 12px;
  }

  .product-name {
    font-size: 14px;
  }

  .price-value {
    font-size: 18px;
  }

  .product-actions {
    flex-direction: column;
  }

  .product-list-item {
    flex-direction: column;
    padding: 12px;
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

  .map-features {
    flex-direction: column;
    gap: 12px;
  }

  .product-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .products-grid {
    grid-template-columns: 1fr;
  }

  .product-image {
    height: 200px;
  }

  .product-actions {
    gap: 6px;
  }

  .action-btn {
    padding: 8px 10px;
  }

  .action-btn span {
    font-size: 12px;
  }

  .header-title {
    font-size: 16px;
  }

  .section-title {
    font-size: 14px;
  }
}

/* ==================== Accessibility ==================== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus visible for keyboard navigation */
*:focus-visible {
  outline: 2px solid var(--eco-primary);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .product-card,
  .product-list-item {
    border-width: 3px;
  }
}
</style>
