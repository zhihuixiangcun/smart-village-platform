<template>
  <section class="nearby-services-section" aria-label="附近吃喝玩乐">
    <!-- 区块标题 -->
    <div class="section-header">
      <div class="title-left">
        <el-icon class="section-icon"><Shop /></el-icon>
        <h2 class="section-title">附近吃喝玩乐</h2>
      </div>
      <div class="header-actions">
        <el-button text @click="showFilter">
          <el-icon><Filter /></el-icon>
          筛选
        </el-button>
        <el-dropdown trigger="click" @command="handleSort">
          <el-button text>
            <el-icon><Sort /></el-icon>
            排序
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="distance">距离最近</el-dropdown-item>
              <el-dropdown-item command="rating">评分最高</el-dropdown-item>
              <el-dropdown-item command="price_asc">人均最低</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 快捷分类 -->
    <div class="quick-categories">
      <button
        v-for="category in serviceCategories"
        :key="category.key"
        :class="['category-btn', { active: activeCategory === category.key }]"
        @click="selectCategory(category.key)"
      >
        <div class="icon-wrapper" :style="{ background: category.color }">
          <el-icon :size="24">
            <component :is="category.icon" />
          </el-icon>
        </div>
        <span class="label">{{ category.label }}</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="2" animated />
    </div>

    <!-- 场所列表 -->
    <div v-else-if="venues.length > 0" class="venues-list">
      <div
        v-for="venue in paginatedVenues"
        :key="venue.id"
        class="venue-card"
        @click="viewVenueDetail(venue)"
      >
        <!-- 图片轮播 -->
        <div class="venue-images">
          <el-carousel
            v-if="venue.images.length > 1"
            :autoplay="false"
            indicator-position="inside"
            height="180px"
          >
            <el-carousel-item v-for="(image, index) in venue.images" :key="index">
              <img :src="image" :alt="`${venue.name} 图片${index + 1}`" />
            </el-carousel-item>
          </el-carousel>
          <div v-else class="single-image">
            <img :src="venue.images[0]" :alt="venue.name" />
          </div>
          <div class="distance-tag">{{ formatDistance(venue.distance) }}</div>
          <div class="type-badge" :class="`type-${venue.type}`">
            {{ getTypeLabel(venue.type) }}
          </div>
        </div>

        <!-- 场所信息 -->
        <div class="venue-info">
          <div class="venue-header">
            <h3 class="venue-name">{{ venue.name }}</h3>
            <el-tag v-if="venue.isOpen" type="success" size="small">营业中</el-tag>
            <el-tag v-else type="info" size="small">休息中</el-tag>
          </div>

          <div class="rating-row">
            <el-rate
              v-model="venue.rating"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
            <span class="review-count">({{ venue.reviewCount }}条评价)</span>
          </div>

          <div class="address-row">
            <el-icon><Location /></el-icon>
            <span>{{ venue.address }}</span>
          </div>

          <div class="info-row">
            <span v-if="venue.averagePrice" class="average-price">
              人均 ¥{{ venue.averagePrice }}
            </span>
            <span v-if="venue.businessHours" class="business-hours">
              营业时间: {{ venue.businessHours }}
            </span>
          </div>

          <!-- 设施标签 -->
          <div v-if="venue.facilities && venue.facilities.length" class="facilities">
            <el-tag
              v-for="facility in venue.facilities.slice(0, 4)"
              :key="facility"
              size="small"
              effect="plain"
            >
              {{ facility }}
            </el-tag>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <el-button type="primary" size="small" @click.stop="navigate(venue)">
              <el-icon><Navigation /></el-icon>
              导航
            </el-button>
            <el-button v-if="venue.phone" size="small" @click.stop="call(venue.phone)">
              <el-icon><Phone /></el-icon>
              电话
            </el-button>
            <el-button size="small" @click.stop="share(venue)">
              <el-icon><Share /></el-icon>
              分享
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-empty description="附近暂无相关场所">
        <el-button type="primary" @click="refresh">刷新</el-button>
      </el-empty>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more">
      <el-button :loading="loadingMore" @click="loadMore" text>
        加载更多
      </el-button>
    </div>

    <!-- 筛选弹窗 -->
    <el-drawer v-model="filterVisible" title="筛选条件" direction="btt" size="60%">
      <div class="filter-content">
        <div class="filter-group">
          <h4>营业状态</h4>
          <el-radio-group v-model="filters.openStatus">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="open">营业中</el-radio-button>
            <el-radio-button label="closed">休息中</el-radio-button>
          </el-radio-group>
        </div>

        <div class="filter-group">
          <h4>人均消费</h4>
          <el-radio-group v-model="filters.priceRange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="0-50">50元以下</el-radio-button>
            <el-radio-button label="50-100">50-100元</el-radio-button>
            <el-radio-button label="100+">100元以上</el-radio-button>
          </el-radio-group>
        </div>

        <div class="filter-group">
          <h4>设施服务</h4>
          <el-checkbox-group v-model="filters.facilities">
            <el-checkbox-button label="wifi">WiFi</el-checkbox-button>
            <el-checkbox-button label="parking">停车位</el-checkbox-button>
            <el-checkbox-button label="card">刷卡</el-checkbox-button>
            <el-checkbox-button label="delivery">外卖</el-checkbox-button>
          </el-checkbox-group>
        </div>

        <div class="filter-actions">
          <el-button @click="resetFilter">重置</el-button>
          <el-button type="primary" @click="applyFilter">确定</el-button>
        </div>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Shop,  // 替代 Gourmet（餐饮）
  Filter,
  Sort,
  Location,
  Compass,  // 替代 Navigation（导航）
  Phone,
  Share
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Venue, VenueType, SortType } from '@/types/marketplace'

// Emits
const emit = defineEmits<{
  venueClick: [venue: Venue]
}>()

// 状态
const loading = ref(true)
const loadingMore = ref(false)
const activeCategory = ref<VenueType | 'all'>('all')
const currentSort = ref<SortType>('distance')
const venues = ref<Venue[]>([])
const page = ref(1)
const pageSize = ref(5)
const hasMore = ref(false)
const filterVisible = ref(false)

// 筛选条件
const filters = ref({
  openStatus: 'all',
  priceRange: 'all',
  facilities: [] as string[]
})

// 服务分类
const serviceCategories = ref([
  {
    key: 'all',
    label: '全部',
    icon: Shop,  // 替代 Gourmet
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    key: 'restaurant',
    label: '餐厅',
    icon: '🍜',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    key: 'farm_stay',
    label: '农家乐',
    icon: '🌾',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    key: 'scenic',
    label: '景点',
    icon: '🏞️',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
  },
  {
    key: 'entertainment',
    label: '娱乐',
    icon: '🎮',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  }
])

// 计算属性
const filteredVenues = computed(() => {
  let result = venues.value

  // 分类筛选
  if (activeCategory.value !== 'all') {
    result = result.filter(v => v.type === activeCategory.value)
  }

  // 营业状态筛选
  if (filters.value.openStatus === 'open') {
    result = result.filter(v => v.isOpen)
  } else if (filters.value.openStatus === 'closed') {
    result = result.filter(v => !v.isOpen)
  }

  // 价格筛选
  if (filters.value.priceRange !== 'all') {
    const [min, max] = filters.value.priceRange.split('-').map(Number)
    result = result.filter(v => {
      if (!v.averagePrice) return false
      if (max) {
        return v.averagePrice >= min && v.averagePrice <= max
      }
      return v.averagePrice >= min
    })
  }

  // 设施筛选
  if (filters.value.facilities.length > 0) {
    result = result.filter(v =>
      filters.value.facilities.some(f => v.facilities?.includes(f))
    )
  }

  // 排序
  result = [...result].sort((a, b) => {
    switch (currentSort.value) {
      case 'distance':
        return a.distance - b.distance
      case 'rating':
        return b.rating - a.rating
      case 'price_asc':
        return (a.averagePrice || Infinity) - (b.averagePrice || Infinity)
      default:
        return 0
    }
  })

  return result
})

const paginatedVenues = computed(() => {
  return filteredVenues.value.slice(0, page.value * pageSize.value)
})

// 方法
const selectCategory = (category: VenueType | 'all') => {
  activeCategory.value = category
  page.value = 1
}

const handleSort = (sort: SortType) => {
  currentSort.value = sort
}

const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`
  }
  return `${(distance / 1000).toFixed(1)}km`
}

const getTypeLabel = (type: VenueType): string => {
  const labels: Record<VenueType, string> = {
    restaurant: '餐厅',
    farm_stay: '农家乐',
    scenic: '景点',
    entertainment: '娱乐'
  }
  return labels[type]
}

const viewVenueDetail = (venue: Venue) => {
  emit('venueClick', venue)
}

const navigate = (venue: Venue) => {
  // 使用高德地图或百度地图导航
  const url = `https://uri.amap.com/navigation?to=${venue.location.longitude},${venue.location.latitude},${venue.name}&mode=car&coordinate=gaode&callnative=1`
  window.open(url, '_blank')
  ElMessage.success('正在打开导航...')
}

const call = (phone: string) => {
  window.location.href = `tel:${phone}`
}

const share = (venue: Venue) => {
  // 复制链接或调用分享
  if (navigator.share) {
    navigator.share({
      title: venue.name,
      text: venue.description,
      url: window.location.href
    })
  } else {
    // 复制到剪贴板
    navigator.clipboard.writeText(`${venue.name} - ${venue.address}`)
    ElMessage.success('地址已复制到剪贴板')
  }
}

const showFilter = () => {
  filterVisible.value = true
}

const applyFilter = () => {
  page.value = 1
  filterVisible.value = false
}

const resetFilter = () => {
  filters.value = {
    openStatus: 'all',
    priceRange: 'all',
    facilities: []
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    page.value++
  } finally {
    loadingMore.value = false
  }
}

const refresh = async () => {
  loading.value = true
  await loadNearbyVenues()
}

const loadNearbyVenues = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 模拟数据
    const mockVenues: Venue[] = [
      {
        id: 'v1',
        name: '王记农家菜',
        type: 'restaurant',
        description: '正宗农家菜，土鸡土鸭，绿色健康',
        images: [
          'https://via.placeholder.com/400x300?text=农家菜1',
          'https://via.placeholder.com/400x300?text=农家菜2',
          'https://via.placeholder.com/400x300?text=农家菜3'
        ],
        location: { latitude: 30.123, longitude: 120.456, address: '李家村88号' },
        distance: 500,
        rating: 4.6,
        reviewCount: 328,
        averagePrice: 45,
        address: '李家村88号',
        phone: '138****1234',
        businessHours: '09:00-21:00',
        isOpen: true,
        facilities: ['WiFi', '停车位', '包间'],
        tags: ['农家菜', '土鸡', '有机蔬菜']
      },
      {
        id: 'v2',
        name: '青龙湖风景区',
        type: 'scenic',
        description: '美丽的湖光山色，适合全家游玩',
        images: [
          'https://via.placeholder.com/400x300?text=青龙湖1',
          'https://via.placeholder.com/400x300?text=青龙湖2'
        ],
        location: { latitude: 30.125, longitude: 120.458, address: '青龙路1号' },
        distance: 3200,
        rating: 4.9,
        reviewCount: 1200,
        averagePrice: 30,
        address: '青龙路1号',
        businessHours: '08:00-18:00',
        isOpen: true,
        facilities: ['停车场', '游客中心', '卫生间'],
        tags: ['自然风光', '亲子游', '摄影']
      }
    ]

    venues.value = mockVenues
    hasMore.value = mockVenues.length >= pageSize.value
  } catch (error) {
    console.error('加载场所失败:', error)
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

// 生命周期
onMounted(async () => {
  await loadNearbyVenues()
})
</script>

<style lang="scss" scoped>
.nearby-services-section {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
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
      color: #ff6b6b;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.quick-categories {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 8px 0;
  margin-bottom: 16px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .category-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px;
    border: none;
    background: transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
    min-width: 70px;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &.active {
      background: var(--el-fill-color);

      .icon-wrapper {
        transform: scale(1.1);
      }
    }

    .icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      transition: transform 0.3s;
    }

    .label {
      font-size: 13px;
      color: var(--el-text-color-primary);
    }
  }
}

.venues-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.venue-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .venue-images {
    position: relative;

    :deep(.el-carousel),
    .single-image {
      img {
        width: 100%;
        height: 180px;
        object-fit: cover;
      }
    }

    .distance-tag {
      position: absolute;
      bottom: 8px;
      right: 8px;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-size: 12px;
      border-radius: 4px;
    }

    .type-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 4px 10px;
      color: #fff;
      font-size: 12px;
      border-radius: 4px;

      &.type-restaurant {
        background: #f093fb;
      }

      &.type-farm_stay {
        background: #4facfe;
      }

      &.type-scenic {
        background: #43e97b;
      }

      &.type-entertainment {
        background: #fa709a;
      }
    }
  }

  .venue-info {
    padding: 12px;

    .venue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .venue-name {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      }
    }

    .rating-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      .review-count {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .address-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
      margin-bottom: 6px;
    }

    .info-row {
      display: flex;
      gap: 12px;
      font-size: 13px;
      margin-bottom: 8px;

      .average-price {
        color: var(--el-color-danger);
        font-weight: 600;
      }
    }

    .facilities {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .action-buttons {
      display: flex;
      gap: 8px;

      .el-button {
        flex: 1;
      }
    }
  }
}

.loading-container,
.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.load-more {
  padding: 16px;
  text-align: center;
}

.filter-content {
  .filter-group {
    margin-bottom: 24px;

    h4 {
      margin-bottom: 12px;
      font-size: 14px;
      color: var(--el-text-color-primary);
    }

    :deep(.el-radio-group),
    :deep(.el-checkbox-group) {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  .filter-actions {
    display: flex;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-light);

    .el-button {
      flex: 1;
    }
  }
}

// 大字模式适配
.large-text-mode {
  .quick-categories .category-btn {
    min-width: 80px;

    .icon-wrapper {
      width: 56px;
      height: 56px;
    }

    .label {
      font-size: 15px;
    }
  }

  .venue-card .venue-info .venue-name {
    font-size: 18px;
  }
}
</style>
