<template>
  <section class="nearby-products-section" aria-label="附近商品和商家">
    <!-- 区块标题 -->
    <div class="section-header">
      <div class="title-left">
        <el-icon class="section-icon"><Shop /></el-icon>
        <h2 class="section-title">附近好货</h2>
        <span class="subtitle">{{ productCount }}件商品</span>
      </div>
      <div class="view-toggle">
        <el-button
          :class="['view-btn', { active: viewMode === 'list' }]"
          :aria-pressed="viewMode === 'list'"
          @click="switchViewMode('list')"
          circle
          size="small"
        >
          <el-icon><List /></el-icon>
        </el-button>
        <el-button
          :class="['view-btn', { active: viewMode === 'map' }]"
          :aria-pressed="viewMode === 'map'"
          @click="switchViewMode('map')"
          circle
          size="small"
        >
          <el-icon><MapLocation /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索商品或商家"
        :prefix-icon="Search"
        clearable
        @input="handleSearch"
        @clear="handleSearch"
        aria-label="搜索商品或商家"
      />
      <el-button
        type="primary"
        :icon="Microphone"
        circle
        @click="startVoiceSearch"
        :disabled="!supportsSpeechRecognition"
        aria-label="语音搜索"
        class="voice-btn"
      >
      </el-button>
    </div>

    <!-- 分类筛选 -->
    <div class="category-tabs" role="tablist">
      <button
        v-for="category in categories"
        :key="category.key"
        :class="['category-tab', { active: activeCategory === category.key }]"
        :aria-selected="activeCategory === category.key"
        :aria-controls="`panel-${category.key}`"
        role="tab"
        @click="selectCategory(category.key)"
      >
        <el-icon>
          <component :is="category.icon" />
        </el-icon>
        <span>{{ category.label }}</span>
        <span v-if="category.count > 0" class="count">{{ category.count }}</span>
      </button>
    </div>

    <!-- 排序选项 -->
    <div class="sort-bar" v-if="viewMode === 'list'">
      <el-dropdown trigger="click" @command="handleSort">
        <el-button class="sort-btn" text>
          {{ currentSortLabel }}
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="distance">距离最近</el-dropdown-item>
            <el-dropdown-item command="rating">评分最高</el-dropdown-item>
            <el-dropdown-item command="price_asc">价格从低到高</el-dropdown-item>
            <el-dropdown-item command="price_desc">价格从高到低</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- 列表视图 -->
    <div
      v-else-if="viewMode === 'list' && filteredProducts.length > 0"
      class="products-list"
      role="tabpanel"
    >
      <div
        v-for="product in paginatedProducts"
        :key="product.id"
        class="product-card"
        @click="viewProductDetail(product)"
        :role="'button'"
        :tabindex="0"
        @keydown.enter="viewProductDetail(product)"
      >
        <div class="product-image">
          <img :src="product.images[0] || defaultImage" :alt="product.name" loading="lazy" />
          <span v-if="product.distance" class="distance-badge">
            {{ formatDistance(product.distance) }}
          </span>
        </div>
        <div class="product-info">
          <h3 class="product-name">{{ product.name }}</h3>
          <div class="merchant-info">
            <el-icon><Shop /></el-icon>
            <span>{{ product.merchant.name }}</span>
            <el-tag v-if="product.merchant.verified" size="small" type="success"> 已认证 </el-tag>
          </div>
          <div class="rating-row">
            <el-rate
              v-model="product.rating"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
            <span class="review-count">({{ product.reviewCount }}条评价)</span>
          </div>
          <div class="price-row">
            <span class="price">¥{{ product.price }}</span>
            <span class="unit">/{{ product.unit }}</span>
            <el-tag :type="getStatusType(product.status)" size="small" class="status-tag">
              {{ getStatusText(product.status) }}
            </el-tag>
          </div>
          <div class="tags-row" v-if="product.tags && product.tags.length">
            <el-tag v-for="tag in product.tags.slice(0, 3)" :key="tag" size="small" effect="plain">
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 地图视图 -->
    <div v-else-if="viewMode === 'map'" class="map-container" role="tabpanel">
      <div id="nearby-products-map" class="map"></div>
      <div class="map-legend">
        <div class="legend-item">
          <span class="legend-dot agricultural"></span>
          <span>农产品</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot supplies"></span>
          <span>农资</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot daily"></span>
          <span>日用品</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot food"></span>
          <span>食品</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && filteredProducts.length === 0" class="empty-state">
      <el-empty description="暂无附近商品">
        <el-button type="primary" @click="refreshLocation">刷新位置</el-button>
      </el-empty>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more">
      <el-button :loading="loadingMore" @click="loadMore" text> 加载更多 </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import {
  Shop,
  Search,
  Microphone,
  List,
  MapLocation,
  ArrowDown,
  Apple,
  Grape,
  ShoppingCart,
  Food,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useFontSize } from '@/composables/useFontSize';
import type { Product, ProductCategory, SortType, ViewMode } from '@/types/marketplace';
import * as mapService from '@/utils/mapService';

// Props
interface Props {
  userLocation?: GeolocationPosition;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  productClick: [product: Product];
  locationRequired: [];
}>();

// Composables
const { currentScale } = useFontSize();

// 状态
const viewMode = ref<ViewMode>('list');
const loading = ref(true);
const loadingMore = ref(false);
const searchKeyword = ref('');
const activeCategory = ref<ProductCategory | 'all'>('all');
const currentSort = ref<SortType>('distance');
const products = ref<Product[]>([]);
const userLocation = ref<any>(null); // 当前位置信息
const page = ref(1);
const pageSize = ref(10);
const hasMore = ref(false);
const supportsSpeechRecognition = ref(false);
const mapInstance = ref<any>(null); // 地图实例
const markers = ref<any[]>([]); // 地图标记数组

// 默认图片
const defaultImage = 'https://via.placeholder.com/200?text=暂无图片';

// 分类配置
const categories = ref([
  { key: 'all' as const, label: '全部', icon: Shop, count: 0 },
  { key: 'agricultural' as const, label: '农产品', icon: Apple, count: 0 },
  { key: 'supplies' as const, label: '农资', icon: Grape, count: 0 },
  { key: 'daily' as const, label: '日用品', icon: ShoppingCart, count: 0 },
  { key: 'food' as const, label: '食品', icon: Food, count: 0 },
]);

// 计算属性
const filteredProducts = computed(() => {
  let result = products.value;

  // 分类筛选
  if (activeCategory.value !== 'all') {
    result = result.filter(p => p.category === activeCategory.value);
  }

  // 搜索筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      p =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword) ||
        p.merchant.name.toLowerCase().includes(keyword)
    );
  }

  // 排序
  result = [...result].sort((a, b) => {
    switch (currentSort.value) {
      case 'distance':
        return (a.distance || Infinity) - (b.distance || Infinity);
      case 'rating':
        return b.rating - a.rating;
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      default:
        return 0;
    }
  });

  return result;
});

const paginatedProducts = computed(() => {
  return filteredProducts.value.slice(0, page.value * pageSize.value);
});

const productCount = computed(() => filteredProducts.value.length);

const currentSortLabel = computed(() => {
  const labels: Record<SortType, string> = {
    distance: '距离优先',
    rating: '评分优先',
    price_asc: '价格从低到高',
    price_desc: '价格从高到低',
  };
  return labels[currentSort.value];
});

// 方法
const switchViewMode = (mode: ViewMode) => {
  viewMode.value = mode;
  if (mode === 'map') {
    initMap();
  }
};

const selectCategory = (category: ProductCategory | 'all') => {
  activeCategory.value = category;
  page.value = 1;
};

const handleSearch = () => {
  page.value = 1;
};

const handleSort = (sort: SortType) => {
  currentSort.value = sort;
};

const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

const getStatusType = (status: string) => {
  const types: Record<string, any> = {
    available: 'success',
    sold_out: 'info',
    reserved: 'warning',
  };
  return types[status] || 'info';
};

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    available: '可售',
    sold_out: '已售罄',
    reserved: '已预订',
  };
  return texts[status] || status;
};

const viewProductDetail = (product: Product) => {
  emit('productClick', product);
};

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return;

  loadingMore.value = true;
  try {
    // 模拟加载更多
    await new Promise(resolve => setTimeout(resolve, 1000));
    page.value++;
  } finally {
    loadingMore.value = false;
  }
};

const refreshLocation = async () => {
  try {
    ElMessage.info('正在获取您的位置...');

    // 使用高德地图API获取位置
    const location = await mapService.getCurrentLocation();

    userLocation.value = location;
    console.log('定位成功:', location);

    // 重新加载附近商品
    await loadNearbyProducts();

    ElMessage.success(`定位成功：${location.address || location.city || ''}`);
  } catch (error) {
    console.error('获取位置失败:', error);

    // 降级方案：使用浏览器原生定位
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });

        userLocation.value = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: '当前位置',
        };

        await loadNearbyProducts();
        ElMessage.success('定位成功');
      } catch (geoError) {
        ElMessage.error('获取位置失败，请检查定位权限');
        emit('locationRequired');
      }
    } else {
      ElMessage.error('您的浏览器不支持定位功能');
      emit('locationRequired');
    }
  }
};

const startVoiceSearch = () => {
  if (!supportsSpeechRecognition.value) {
    ElMessage.warning('您的浏览器不支持语音识别');
    return;
  }

  ElMessage.info('语音搜索功能开发中...');
  // TODO: 集成语音识别
};

const loadNearbyProducts = async () => {
  loading.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟数据
    const mockProducts: Product[] = [
      {
        id: '1',
        name: '新鲜红富士苹果',
        description: '自家果园种植，不打农药，口感脆甜',
        price: 8,
        unit: '斤',
        category: 'agricultural',
        images: ['https://via.placeholder.com/200?text=苹果'],
        merchant: {
          id: 'm1',
          name: '李家村果园',
          address: '李家村88号',
          location: { latitude: 30.123, longitude: 120.456 },
          rating: 4.8,
          reviewCount: 156,
          isOpen: true,
          verified: true,
        },
        distance: 1200,
        rating: 4.8,
        reviewCount: 89,
        stock: 100,
        status: 'available',
        tags: ['新鲜', '不打蜡', '包邮'],
        publishTime: new Date().toISOString(),
        viewCount: 234,
        likeCount: 56,
      },
      {
        id: '2',
        name: '有机玉米',
        description: '农家肥种植，绿色健康',
        price: 3,
        unit: '斤',
        category: 'agricultural',
        images: ['https://via.placeholder.com/200?text=玉米'],
        merchant: {
          id: 'm2',
          name: '王家庄农场',
          address: '王家庄路12号',
          location: { latitude: 30.124, longitude: 120.457 },
          rating: 4.5,
          reviewCount: 203,
          isOpen: true,
          verified: true,
        },
        distance: 800,
        rating: 4.5,
        reviewCount: 67,
        stock: 200,
        status: 'available',
        tags: ['有机', '新鲜'],
        publishTime: new Date().toISOString(),
        viewCount: 156,
        likeCount: 34,
      },
    ];

    products.value = mockProducts;
    hasMore.value = mockProducts.length >= pageSize.value;

    // 更新分类计数
    updateCategoryCounts();
  } catch (error) {
    console.error('加载商品失败:', error);
    ElMessage.error('加载商品失败，请重试');
  } finally {
    loading.value = false;
  }
};

const updateCategoryCounts = () => {
  const counts: Record<string, number> = {
    all: products.value.length,
    agricultural: 0,
    supplies: 0,
    daily: 0,
    food: 0,
  };

  products.value.forEach(p => {
    counts[p.category]++;
  });

  categories.value.forEach(cat => {
    cat.count = counts[cat.key] || 0;
  });
};

const initMap = async () => {
  try {
    // 清理旧地图
    if (mapInstance.value) {
      mapInstance.value.destroy();
      mapInstance.value = null;
    }

    // 清理旧标记
    markers.value.forEach(marker => marker.setMap(null));
    markers.value = [];

    // 初始化地图
    const center = userLocation.value
      ? [userLocation.value.longitude, userLocation.value.latitude]
      : [116.397428, 39.90923]; // 默认北京天安门

    mapInstance.value = await mapService.initAMap('nearby-products-map', {
      zoom: 15,
      center: center,
      viewMode: '2D',
    });

    // 添加商品标记
    if (products.value.length > 0) {
      addProductMarkers();
    }

    console.log('地图初始化成功');
  } catch (error) {
    console.error('地图初始化失败:', error);
    ElMessage.error('地图加载失败');
  }
};

const addProductMarkers = () => {
  if (!mapInstance.value || !products.value.length) return;

  // 创建标记数据
  const markerConfigs = products.value.map((product: Product) => {
    return {
      position: {
        longitude: product.merchant.location.longitude,
        latitude: product.merchant.location.latitude,
      },
      title: product.name,
      onClick: (marker: any) => {
        showProductInfoWindow(product, marker);
      },
    };
  });

  // 添加标记到地图
  markers.value = mapService.addMarkers(mapInstance.value, markerConfigs);

  // 调整地图视野以包含所有标记
  if (markers.value.length > 0) {
    // @ts-ignore - AMap types will be available after script loads
    const bounds = new window.AMap.Bounds();
    markers.value.forEach((marker: any) => {
      bounds.extend(marker.getPosition());
    });
    mapInstance.value.setFitView([markers.value[0]]);
  }
};

const getCategoryColor = (category: ProductCategory): string => {
  const colors: Record<ProductCategory, string> = {
    agricultural: '#67c23a', // 绿色
    supplies: '#e6a23c', // 橙色
    daily: '#409eff', // 蓝色
    food: '#f56c6c', // 红色
  };
  return colors[category] || '#409eff';
};

const showProductInfoWindow = (product: Product, marker: any) => {
  const content = `
    <div style="padding: 12px; min-width: 200px;">
      <h4 style="margin: 0 0 8px 0; font-size: 16px;">${product.name}</h4>
      <p style="margin: 4px 0; font-size: 13px; color: #666;">
        ${product.merchant.name}
      </p>
      <p style="margin: 4px 0; font-size: 14px; color: #f56c6c; font-weight: bold;">
        ¥${product.price} / ${product.unit}
      </p>
      <p style="margin: 4px 0; font-size: 12px; color: #999;">
        ${mapService.formatDistance(product.distance)}
      </p>
      <button data-product-id="${product.id}" class="view-product-btn" style="margin-top: 8px; padding: 6px 12px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
        查看详情
      </button>
    </div>
  `;

  // @ts-ignore - AMap types will be available after script loads
  const infoWindow = mapService.createInfoWindow(mapInstance.value, {
    content: content,
    offset: new (window as any).AMap.Pixel(0, -30),
  });

  infoWindow.open(mapInstance.value, marker.getPosition());

  // 延迟绑定事件到DOM
  setTimeout(() => {
    const btn = document.querySelector(`button[data-product-id="${product.id}"]`);
    if (btn) {
      btn.addEventListener('click', () => {
        viewProductDetail(product);
      });
    }
  }, 100);
};

// 生命周期
onMounted(async () => {
  // 检查语音识别支持
  supportsSpeechRecognition.value =
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // 获取位置
  if (props.userLocation) {
    userLocation.value = props.userLocation;
  }

  // 加载商品
  await loadNearbyProducts();
});

onBeforeUnmount(() => {
  // 清理地图资源
  if (viewMode.value === 'map') {
    // TODO: 销毁地图实例
  }
});

// 监听位置变化
watch(
  () => props.userLocation,
  newLocation => {
    if (newLocation) {
      userLocation.value = newLocation;
      loadNearbyProducts();
    }
  }
);
</script>

<style lang="scss" scoped>
.nearby-products-section {
  padding: var(--spacing-base, 16px);
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;

  // 适配大字模式
  .large-text-mode & {
    padding: calc(var(--spacing-base, 16px) * var(--font-scale, 1));
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .title-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .section-icon {
      font-size: 24px;
      color: var(--el-color-primary);
    }

    .section-title {
      font-size: var(--font-size-h2, 20px);
      font-weight: 600;
      margin: 0;
    }

    .subtitle {
      font-size: var(--font-size-small, 14px);
      color: var(--el-text-color-secondary);
    }
  }

  .view-toggle {
    display: flex;
    gap: 8px;

    .view-btn {
      width: 36px;
      height: 36px;
      min-height: 36px;

      &.active {
        background: var(--el-color-primary);
        color: #fff;
      }
    }
  }
}

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  :deep(.el-input) {
    flex: 1;

    .el-input__wrapper {
      border-radius: 20px;
    }
  }

  .voice-btn {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    min-height: 40px;
  }
}

.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 16px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .category-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    border: none;
    background: var(--el-fill-color-light);
    border-radius: 20px;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.3s;
    min-height: 40px;

    &:hover {
      background: var(--el-fill-color);
    }

    &.active {
      background: var(--el-color-primary);
      color: #fff;
    }

    .count {
      font-size: 12px;
      opacity: 0.8;
    }
  }
}

.sort-bar {
  margin-bottom: 12px;

  .sort-btn {
    font-size: 14px;
  }
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  .product-image {
    position: relative;
    width: 100px;
    height: 100px;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .distance-badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-size: 11px;
      border-radius: 4px;
    }
  }

  .product-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;

    .product-name {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .merchant-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }

    .rating-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .review-count {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .price-row {
      display: flex;
      align-items: baseline;
      gap: 4px;

      .price {
        font-size: 20px;
        font-weight: 600;
        color: var(--el-color-danger);
      }

      .unit {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }

    .tags-row {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
  }
}

.map-container {
  position: relative;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;

  .map {
    width: 100%;
    height: 100%;
    background: var(--el-fill-color-light);
  }

  .map-legend {
    position: absolute;
    bottom: 16px;
    right: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;

      &:last-child {
        margin-bottom: 0;
      }

      .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;

        &.agricultural {
          background: #67c23a;
        }

        &.supplies {
          background: #e6a23c;
        }

        &.daily {
          background: #409eff;
        }

        &.food {
          background: #f56c6c;
        }
      }

      span {
        font-size: 13px;
      }
    }
  }
}

.loading-container {
  padding: 20px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.load-more {
  padding: 16px;
  text-align: center;
}

// 大字模式适配
.large-text-mode {
  .section-header .section-title {
    font-size: var(--font-size-h1, 28px);
  }

  .product-card .product-info {
    .product-name {
      font-size: 18px;
    }

    .price-row .price {
      font-size: 24px;
    }
  }

  .category-tab {
    min-height: 48px;
    padding: 10px 20px;
  }
}
</style>
