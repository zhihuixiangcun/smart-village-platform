<template>
  <div class="lifestyle-services">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><Compass /></el-icon>
            <span>吃喝玩乐推荐</span>
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

      <!-- 分类标签 -->
      <div class="category-tabs">
        <div
          v-for="category in categories"
          :key="category.key"
          class="category-tab"
          :class="{ active: activeCategory === category.key }"
          @click="switchCategory(category.key)"
        >
          <div class="tab-icon" :style="{ background: category.color }">
            <component :is="category.icon" />
          </div>
          <span class="tab-label">{{ category.label }}</span>
          <span class="tab-count" v-if="category.count > 0">({{ category.count }})</span>
        </div>
      </div>

      <!-- 子分类筛选 -->
      <div class="sub-filter-section" v-if="activeSubCategories.length > 0">
        <el-radio-group v-model="activeSubCategory" @change="handleFilter">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button v-for="sub in activeSubCategories" :key="sub.value" :label="sub.value">
            {{ sub.label }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-select
          v-model="filters.distance"
          placeholder="距离"
          style="width: 120px"
          @change="handleFilter"
        >
          <el-option label="1公里内" :value="1" />
          <el-option label="3公里内" :value="3" />
          <el-option label="5公里内" :value="5" />
          <el-option label="10公里内" :value="10" />
        </el-select>
        <el-select
          v-model="filters.sortBy"
          placeholder="排序"
          style="width: 130px"
          @change="handleFilter"
        >
          <el-option label="距离优先" value="distance" />
          <el-option label="评分优先" value="rating" />
          <el-option label="人气优先" value="popularity" />
          <el-option label="价格最低" value="price_asc" />
        </el-select>
        <el-select
          v-model="filters.priceLevel"
          placeholder="价格区间"
          style="width: 130px"
          clearable
          @change="handleFilter"
        >
          <el-option label="人均50以下" value="1" />
          <el-option label="人均50-100" value="2" />
          <el-option label="人均100-200" value="3" />
          <el-option label="人均200+" value="4" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          placeholder="搜索商家"
          style="width: 200px"
          clearable
          @keyup.enter="handleFilter"
          @clear="handleFilter"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleFilter"> 筛选 </el-button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在搜索附近的{{ currentCategoryLabel }}...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredServices.length === 0" class="empty-container">
        <el-empty :description="`附近暂无${currentCategoryLabel}推荐`">
          <el-button type="primary" @click="expandSearch"> 扩大搜索范围 </el-button>
        </el-empty>
      </div>

      <!-- 服务列表 -->
      <div v-else class="services-container">
        <div class="services-grid">
          <div
            v-for="service in filteredServices"
            :key="service._id"
            class="service-card"
            @click="viewServiceDetail(service)"
          >
            <!-- 封面图 -->
            <div class="service-cover">
              <img :src="service.coverImage || defaultCoverImage" :alt="service.name" />
              <div class="cover-overlay">
                <div class="distance-badge">
                  <el-icon><Location /></el-icon>
                  {{ service.distance?.toFixed(1) }}km
                </div>
                <div
                  class="category-badge"
                  :style="{ background: getCategoryColor(service.category) }"
                >
                  {{ service.categoryLabel }}
                </div>
              </div>
              <div class="rating-badge" v-if="service.rating">
                <el-icon><Star /></el-icon>
                {{ service.rating?.toFixed(1) }}
              </div>
            </div>

            <!-- 商家信息 -->
            <div class="service-info">
              <h4 class="service-name">{{ service.name }}</h4>
              <div class="service-tags">
                <el-tag
                  v-for="tag in (service.tags || []).slice(0, 3)"
                  :key="tag"
                  size="small"
                  type="info"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
              </div>

              <!-- 价格信息 -->
              <div class="service-price" v-if="service.priceLevel || service.avgPrice">
                <span class="price-label">人均</span>
                <span class="price-value"
                  >¥{{ service.avgPrice || getAvgPrice(service.priceLevel) }}</span
                >
                <span class="price-unit">/人</span>
              </div>

              <!-- 地址 -->
              <div class="service-address">
                <el-icon><Location /></el-icon>
                <span>{{ service.address }}</span>
              </div>

              <!-- 营业时间 -->
              <div class="business-hours" v-if="service.businessHours">
                <el-icon><Clock /></el-icon>
                <span :class="{ closed: !service.isOpen }">
                  {{ service.isOpen ? '营业中' : '已打烊' }} {{ service.businessHours }}
                </span>
              </div>

              <!-- 特色亮点 -->
              <div class="service-features" v-if="service.features?.length > 0">
                <div
                  v-for="feature in service.features.slice(0, 4)"
                  :key="feature"
                  class="feature-item"
                >
                  {{ feature }}
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="service-actions">
                <el-button size="small" @click.stop="handleNavigate(service)">
                  <el-icon><Location /></el-icon>
                  导航
                </el-button>
                <el-button size="small" type="primary" @click.stop="handleCall(service)">
                  <el-icon><Phone /></el-icon>
                  电话
                </el-button>
                <el-button size="small" @click.stop="handleCollect(service)">
                  <el-icon><Star /></el-icon>
                  收藏
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 推荐理由 -->
        <div class="recommendation-reason" v-if="recommendReason">
          <el-alert type="success" :closable="false" show-icon>
            <template #title>
              <span>{{ recommendReason }}</span>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- 加载更多 -->
      <div class="load-more" v-if="hasMore && !loading">
        <el-button @click="loadMore" :loading="loadingMore"> 加载更多 </el-button>
      </div>
    </el-card>

    <!-- 地图视图对话框 -->
    <el-dialog v-model="mapDialogVisible" title="附近吃喝玩乐地图" width="90%" top="5vh">
      <div class="map-container" id="lifestyleMap">
        <div class="map-placeholder">
          <el-icon><MapLocation /></el-icon>
          <p>地图功能开发中</p>
          <p class="map-tip">将在地图上显示所有推荐的吃喝玩乐场所</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="mapDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" :title="currentService?.name" width="700px">
      <div class="service-detail" v-if="currentService">
        <!-- 图片轮播 -->
        <div class="detail-gallery">
          <img :src="currentService.coverImage || defaultCoverImage" :alt="currentService.name" />
        </div>

        <!-- 基本信息 -->
        <div class="detail-info">
          <div class="detail-meta">
            <el-rate v-model="currentService.rating" disabled show-score text-color="#ff9900" />
            <span class="detail-price">
              人均 ¥{{ currentService.avgPrice || getAvgPrice(currentService.priceLevel) }}
            </span>
          </div>

          <div class="detail-address">
            <el-icon><Location /></el-icon>
            {{ currentService.address }}
          </div>

          <div class="detail-hours">
            <el-icon><Clock /></el-icon>
            {{ currentService.businessHours }}
          </div>

          <div class="detail-phone" v-if="currentService.phone">
            <el-icon><Phone /></el-icon>
            {{ currentService.phone }}
          </div>

          <div class="detail-features" v-if="currentService.features?.length > 0">
            <h5>特色服务</h5>
            <div class="features-list">
              <el-tag
                v-for="feature in currentService.features"
                :key="feature"
                type="success"
                effect="plain"
              >
                {{ feature }}
              </el-tag>
            </div>
          </div>

          <div class="detail-description" v-if="currentService.description">
            <h5>商家介绍</h5>
            <p>{{ currentService.description }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleNavigate(currentService)">
          <el-icon><Location /></el-icon>
          一键导航
        </el-button>
        <el-button type="success" @click="handleCall(currentService)">
          <el-icon><Phone /></el-icon>
          电话预订
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
  Compass,
  Refresh,
  MapLocation,
  Location,
  Search,
  Loading,
  Star,
  Phone,
  Clock,
  ShoppingCart,
  House,
  Football,
  Ticket,
  Grid,
  Food,
  Burger,
  IceCream,
} from '@element-plus/icons-vue';
import api from '@/api';

const router = useRouter();

const loading = ref(false);
const loadingMore = ref(false);
const activeCategory = ref('all');
const activeSubCategory = ref('');
const mapDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const currentService = ref(null);
const locationInfo = ref({ city: '杭州市' });
const hasMore = ref(true);

const defaultCoverImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="16"%3E暂无图片%3C/text%3E%3C/svg%3E';

const filters = reactive({
  distance: 5,
  sortBy: 'distance',
  priceLevel: '',
  keyword: '',
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
    key: 'dining',
    label: '美食',
    icon: Food,
    color: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    count: 15,
    subCategories: [
      { label: '全部', value: '' },
      { label: '中餐', value: 'chinese' },
      { label: '火锅', value: 'hotpot' },
      { label: '烧烤', value: 'bbq' },
      { label: '快餐', value: 'fastfood' },
      { label: '小吃', value: 'snack' },
      { label: '饮品', value: 'drink' },
    ],
  },
  {
    key: 'entertainment',
    label: '娱乐',
    icon: Football,
    color: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    count: 8,
    subCategories: [
      { label: '全部', value: '' },
      { label: 'KTV', value: 'ktv' },
      { label: '网吧', value: 'internet_bar' },
      { label: '健身房', value: 'gym' },
      { label: '电影院', value: 'cinema' },
      { label: '棋牌室', value: 'chess' },
    ],
  },
  {
    key: 'hotel',
    label: '住宿',
    icon: House,
    color: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    count: 5,
    subCategories: [
      { label: '全部', value: '' },
      { label: '酒店', value: 'hotel' },
      { label: '民宿', value: 'homestay' },
      { label: '宾馆', value: 'guesthouse' },
    ],
  },
  {
    key: 'shopping',
    label: '购物',
    icon: ShoppingCart,
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    count: 12,
    subCategories: [
      { label: '全部', value: '' },
      { label: '商场', value: 'mall' },
      { label: '超市', value: 'supermarket' },
      { label: '便利店', value: 'convenience' },
    ],
  },
  {
    key: 'tourism',
    label: '旅游',
    icon: Ticket,
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    count: 6,
    subCategories: [
      { label: '全部', value: '' },
      { label: '景点', value: 'scenic' },
      { label: '农家乐', value: 'farm' },
      { label: '采摘园', value: 'picking' },
    ],
  },
];

// 模拟数据
const servicesData = ref([
  {
    _id: '1',
    name: '本地农家菜馆',
    category: 'dining',
    categoryLabel: '美食',
    subCategory: 'chinese',
    coverImage: '',
    rating: 4.7,
    avgPrice: 68,
    priceLevel: 2,
    distance: 0.8,
    address: '西湖区留下街道128号',
    phone: '0571-88881234',
    businessHours: '10:00-22:00',
    isOpen: true,
    tags: ['农家菜', '环境优美', '停车位充足'],
    features: ['免费WiFi', '包厢', '停车位', '支持外卖'],
    description: '正宗本地农家菜，食材新鲜，口味地道，环境优雅。',
  },
  {
    _id: '2',
    name: '乡村大舞台KTV',
    category: 'entertainment',
    categoryLabel: '娱乐',
    subCategory: 'ktv',
    coverImage: '',
    rating: 4.3,
    avgPrice: 128,
    priceLevel: 3,
    distance: 1.2,
    address: '余杭区良渚街道文化中心',
    phone: '0571-88885678',
    businessHours: '14:00-02:00',
    isOpen: true,
    tags: ['音响效果好', '环境整洁', '价格实惠'],
    features: ['包厢', '小吃饮料', '免费停车', '生日特惠'],
    description: '专业的KTV设备，舒适的包厢环境，性价比高。',
  },
  {
    _id: '3',
    name: '山水民宿',
    category: 'hotel',
    categoryLabel: '住宿',
    subCategory: 'homestay',
    coverImage: '',
    rating: 4.9,
    avgPrice: 268,
    priceLevel: 3,
    distance: 2.5,
    address: '西湖区梅家坞村',
    phone: '0571-88889012',
    businessHours: '24小时',
    isOpen: true,
    tags: ['风景优美', '服务周到', '体验独特'],
    features: ['山景房', '农家早餐', '免费接送', '采摘体验'],
    description: '位于茶园中的精品民宿，环境清幽，体验乡村生活。',
  },
  {
    _id: '4',
    name: '时代购物中心',
    category: 'shopping',
    categoryLabel: '购物',
    subCategory: 'mall',
    coverImage: '',
    rating: 4.5,
    avgPrice: 200,
    priceLevel: 3,
    distance: 3.2,
    address: '西湖区文三路488号',
    phone: '0571-88883456',
    businessHours: '10:00-22:00',
    isOpen: true,
    tags: ['品牌齐全', '餐饮丰富', '交通便利'],
    features: ['免费WiFi', '母婴室', '停车场', '会员服务'],
    description: '大型综合购物中心，集购物、餐饮、娱乐于一体。',
  },
  {
    _id: '5',
    name: '龙井茶园采摘',
    category: 'tourism',
    categoryLabel: '旅游',
    subCategory: 'picking',
    coverImage: '',
    rating: 4.8,
    avgPrice: 88,
    priceLevel: 2,
    distance: 4.5,
    address: '西湖区龙井村',
    phone: '0571-88887890',
    businessHours: '08:00-18:00',
    isOpen: true,
    tags: ['亲子游', '体验好', '空气清新'],
    features: ['茶文化体验', '农家饭', '免费品茶', '茶叶购买'],
    description: '体验采茶乐趣，了解茶文化，品味农家美食。',
  },
  {
    _id: '6',
    name: '星巴克咖啡',
    category: 'dining',
    categoryLabel: '美食',
    subCategory: 'drink',
    coverImage: '',
    rating: 4.6,
    avgPrice: 38,
    priceLevel: 2,
    distance: 0.3,
    address: '西湖区文一西路店',
    phone: '0571-88881234',
    businessHours: '07:30-22:30',
    isOpen: true,
    tags: ['环境舒适', '免费WiFi', '适合办公'],
    features: ['免费WiFi', '充电插座', '外卖服务', '会员积分'],
    description: '全球知名咖啡品牌，提供优质咖啡和舒适环境。',
  },
  {
    _id: '7',
    name: '乡村美食街',
    category: 'dining',
    categoryLabel: '美食',
    subCategory: 'snack',
    coverImage: '',
    rating: 4.4,
    avgPrice: 25,
    priceLevel: 1,
    distance: 1.8,
    address: '萧山区瓜沥镇老街',
    phone: '',
    businessHours: '09:00-21:00',
    isOpen: true,
    tags: ['种类丰富', '价格实惠', '风味独特'],
    features: ['传统小吃', '手工制作', '本地特产'],
    description: '汇集各种传统小吃和地方特色美食。',
  },
  {
    _id: '8',
    name: '健身游泳中心',
    category: 'entertainment',
    categoryLabel: '娱乐',
    subCategory: 'gym',
    coverImage: '',
    rating: 4.5,
    avgPrice: 168,
    priceLevel: 3,
    distance: 2.1,
    address: '余杭区临平大道',
    phone: '0571-88884567',
    businessHours: '06:00-23:00',
    isOpen: true,
    tags: ['设施齐全', '教练专业', '环境干净'],
    features: ['健身器材', '游泳池', '私教课程', '淋浴间'],
    description: '专业健身中心，提供健身、游泳、瑜伽等服务。',
  },
]);

const filteredServices = ref([]);
const recommendReason = ref('');

// 当前分类标签
const currentCategoryLabel = computed(() => {
  const category = categories.find(c => c.key === activeCategory.value);
  return category?.label || '服务';
});

// 激活的子分类
const activeSubCategories = computed(() => {
  const category = categories.find(c => c.key === activeCategory.value);
  return category?.subCategories || [];
});

// 切换分类
const switchCategory = key => {
  activeCategory.value = key;
  activeSubCategory.value = '';
  handleFilter();
};

// 获取分类颜色
const getCategoryColor = category => {
  const cat = categories.find(c => c.key === category);
  return cat?.color || '#667eea';
};

// 获取平均价格
const getAvgPrice = level => {
  const prices = { 1: '30-50', 2: '50-100', 3: '100-200', 4: '200+' };
  return prices[level] || '待定';
};

// 筛选服务
const handleFilter = () => {
  loading.value = true;

  setTimeout(() => {
    let filtered = [...servicesData.value];

    // 按分类筛选
    if (activeCategory.value !== 'all') {
      filtered = filtered.filter(s => s.category === activeCategory.value);
    }

    // 按子分类筛选
    if (activeSubCategory.value) {
      filtered = filtered.filter(s => s.subCategory === activeSubCategory.value);
    }

    // 按距离筛选
    if (filters.distance) {
      filtered = filtered.filter(s => s.distance <= filters.distance);
    }

    // 按价格筛选
    if (filters.priceLevel) {
      filtered = filtered.filter(s => s.priceLevel === filters.priceLevel);
    }

    // 按关键词筛选
    if (filters.keyword) {
      filtered = filtered.filter(
        s => s.name.includes(filters.keyword) || s.tags?.some(tag => tag.includes(filters.keyword))
      );
    }

    // 排序
    switch (filters.sortBy) {
      case 'distance':
        filtered.sort((a, b) => a.distance - b.distance);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_asc':
        filtered.sort((a, b) => a.avgPrice - b.avgPrice);
        break;
      default:
        break;
    }

    filteredServices.value = filtered.slice(0, 12);
    hasMore.value = filtered.length > 12;

    // 生成推荐理由
    if (filteredServices.value.length > 0) {
      const nearest = filteredServices.value[0];
      recommendReason.value = `为您推荐附近${filteredServices.value.length}家${currentCategoryLabel.value}，最近的是${nearest.name}，仅${nearest.distance.toFixed(1)}公里`;
    } else {
      recommendReason.value = '';
    }

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

// 加载更多
const loadMore = () => {
  loadingMore.value = true;
  setTimeout(() => {
    // 模拟加载更多
    loadingMore.value = false;
    hasMore.value = false;
    ElMessage.success('没有更多了');
  }, 1000);
};

// 查看详情
const viewServiceDetail = service => {
  currentService.value = service;
  detailDialogVisible.value = true;
};

// 导航
const handleNavigate = service => {
  ElMessage.success(`正在为您导航到${service.name}...`);
};

// 电话
const handleCall = service => {
  if (service.phone) {
    ElMessage.success(`正在拨打${service.phone}...`);
  } else {
    ElMessage.warning('该商家未提供联系电话');
  }
};

// 收藏
const handleCollect = service => {
  ElMessage.success(`已收藏${service.name}`);
};

onMounted(() => {
  handleFilter();
});
</script>

<style scoped>
.lifestyle-services {
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

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 12px;
  margin: 20px 0;
  overflow-x: auto;
  padding-bottom: 8px;
}

.category-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  min-width: 80px;
}

.category-tab:hover {
  background: #f5f7fa;
  transform: translateY(-2px);
}

.category-tab.active {
  border-color: #67c23a;
  background: #f0f9ff;
}

.tab-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.tab-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.tab-count {
  font-size: 12px;
  color: #909399;
}

/* 子分类筛选 */
.sub-filter-section {
  margin: 16px 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

/* 筛选栏 */
.filter-bar {
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

/* 服务卡片网格 */
.services-container {
  margin-top: 20px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.service-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.service-card:hover {
  border-color: #67c23a;
  box-shadow: 0 4px 16px rgba(103, 194, 58, 0.2);
  transform: translateY(-4px);
}

/* 封面图 */
.service-cover {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.service-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 100%);
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
  font-size: 13px;
  font-weight: 500;
  color: #67c23a;
}

.category-badge {
  align-self: flex-end;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
  font-weight: 500;
}

.rating-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #ff9900;
}

/* 服务信息 */
.service-info {
  padding: 16px;
}

.service-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.service-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
  color: #f56c6c;
}

.price-label {
  font-size: 13px;
  color: #909399;
}

.price-value {
  font-size: 18px;
  font-weight: 600;
}

.price-unit {
  font-size: 12px;
  color: #909399;
}

.service-address {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.business-hours {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.business-hours .closed {
  color: #f56c6c;
}

.service-features {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.feature-item {
  padding: 4px 10px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  font-size: 12px;
  color: #409eff;
}

.service-actions {
  display: flex;
  gap: 6px;
}

.service-actions .el-button {
  flex: 1;
}

/* 推荐理由 */
.recommendation-reason {
  margin-top: 20px;
}

/* 加载更多 */
.load-more {
  margin-top: 20px;
  text-align: center;
}

/* 详情对话框 */
.service-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-gallery {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.detail-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-info {
  padding: 0 8px;
}

.detail-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.detail-price {
  font-size: 18px;
  font-weight: 600;
  color: #f56c6c;
}

.detail-address,
.detail-hours,
.detail-phone {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}

.detail-features,
.detail-description {
  margin-top: 16px;
}

.detail-features h5,
.detail-description h5 {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 12px;
}

.features-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-description p {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
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
  .category-tabs {
    overflow-x: auto;
  }

  .services-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-bar .el-select,
  .filter-bar .el-input,
  .filter-bar .el-button {
    width: 100% !important;
  }
}
</style>
