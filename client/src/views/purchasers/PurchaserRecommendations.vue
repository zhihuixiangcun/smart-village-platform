<template>
  <div class="purchaser-recommendations">
    <div class="page-header">
      <h1>智能推荐</h1>
      <p>基于您的采购偏好和位置为您推荐</p>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-bar">
      <el-card>
        <el-form :inline="true" :model="filters" label-width="80px">
          <el-form-item label="位置">
            <el-button @click="getCurrentLocation" :loading="locationLoading">
              <el-icon><Location /></el-icon>
              {{ currentLocation ? '已定位' : '获取当前位置' }}
            </el-button>
            <span v-if="currentLocation" class="location-text">
              {{ currentLocation.address || '当前位置' }}
            </span>
          </el-form-item>
          <el-form-item label="搜索半径">
            <el-select v-model="filters.radius" @change="fetchRecommendations">
              <el-option label="10公里" :value="10000" />
              <el-option label="30公里" :value="30000" />
              <el-option label="50公里" :value="50000" />
              <el-option label="100公里" :value="100000" />
            </el-select>
          </el-form-item>
          <el-form-item label="采购类目">
            <el-select v-model="filters.categories" multiple placeholder="选择类目" @change="fetchRecommendations">
              <el-option label="谷物" value="谷物" />
              <el-option label="蔬菜" value="蔬菜" />
              <el-option label="水果" value="水果" />
              <el-option label="畜禽" value="畜禽" />
              <el-option label="水产" value="水产" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchRecommendations" :loading="loading">
              <el-icon><Search /></el-icon>
              搜索推荐
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 推荐结果统计 -->
    <div v-if="summary" class="summary-bar">
      <el-card>
        <div class="summary-content">
          <span class="summary-item">
            <el-icon><Document /></el-icon>
            共找到 <strong>{{ summary.total }}</strong> 条推荐
          </span>
          <span class="summary-item">
            <el-icon><ShoppingCart /></el-icon>
            农产品 <strong>{{ summary.products }}</strong> 条
          </span>
          <span class="summary-item">
            <el-icon><Bell /></el-icon>
            公告 <strong>{{ summary.announcements }}</strong> 条
          </span>
          <span class="summary-item">
            <el-icon><OfficeBuilding /></el-icon>
            村庄 <strong>{{ summary.villages }}</strong> 个
          </span>
        </div>
      </el-card>
    </div>

    <!-- 推荐列表 -->
    <div class="recommendations-list">
      <el-card v-if="loading" class="loading-card">
        <div class="loading-container">
          <el-icon class="is-loading" :size="48"><Loading /></el-icon>
          <p>正在为您搜索推荐...</p>
        </div>
      </el-card>

      <el-card v-else-if="recommendations.length === 0" class="empty-card">
        <el-empty description="暂无推荐内容">
          <el-button type="primary" @click="fetchRecommendations">刷新</el-button>
        </el-empty>
      </el-card>

      <div v-else class="recommendations-grid">
        <el-card v-for="item in recommendations" :key="item.id" class="recommendation-card" shadow="hover">
          <div class="card-header">
            <el-tag :type="item.type === 'product' ? 'success' : 'info'" size="small">
              {{ item.type === 'product' ? '农产品' : '公告' }}
            </el-tag>
            <el-tag v-if="item.matchScore" type="warning" size="small">
              匹配度 {{ (item.matchScore * 100).toFixed(0) }}%
            </el-tag>
          </div>

          <h3 class="card-title">{{ item.productName || item.title }}</h3>

          <div class="card-content">
            <p v-if="item.type === 'product'" class="description">
              <el-icon><ShoppingCart /></el-icon>
              {{ item.category }} | {{ item.quantity }} {{ item.unit }}
            </p>
            <p v-else class="description">
              <el-icon><Document /></el-icon>
              {{ item.content?.substring(0, 100) }}...
            </p>

            <div class="meta-info">
              <div v-if="item.distance" class="meta-item">
                <el-icon><Location /></el-icon>
                <span>{{ item.distance.toFixed(1) }}km</span>
              </div>
              <div v-if="item.price" class="meta-item price">
                <el-icon><PriceTag /></el-icon>
                <span>¥{{ item.price }}/{{ item.unit }}</span>
              </div>
              <div v-if="item.supplier" class="meta-item">
                <el-icon><User /></el-icon>
                <span>{{ item.supplier.name }}</span>
              </div>
              <div v-if="item.createdAt" class="meta-item">
                <el-icon><Clock /></el-icon>
                <span>{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <el-button size="small" @click="handleViewDetail(item)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button v-if="item.type === 'product'" size="small" type="primary" @click="handleContact(item)">
              <el-icon><ChatDotRound /></el-icon>
              联系供应商
            </el-button>
            <el-button v-if="item.type === 'product'" size="small" @click="handleAddToCart(item)">
              <el-icon><Plus /></el-icon>
              加入清单
            </el-button>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 附近村庄 -->
    <div v-if="nearbyVillages && nearbyVillages.length > 0" class="nearby-villages">
      <el-card>
        <template #header>
          <div class="card-header">
            <el-icon><OfficeBuilding /></el-icon>
            <span>附近村庄</span>
          </div>
        </template>
        <div class="villages-grid">
          <div v-for="village in nearbyVillages" :key="village.id" class="village-item">
            <h4>{{ village.name }}</h4>
            <p>
              <el-icon><User /></el-icon>
              人口: {{ village.population }}
            </p>
            <p>
              <el-icon><Location /></el-icon>
              距离: {{ village.distance.toFixed(1) }}km
            </p>
            <p v-if="village.contactPhone">
              <el-icon><Phone /></el-icon>
              {{ village.contactPhone }}
            </p>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      :title="currentItem?.productName || currentItem?.title"
      width="600px"
      destroy-on-close
    >
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="类型">
            <el-tag :type="currentItem.type === 'product' ? 'success' : 'info'">
              {{ currentItem.type === 'product' ? '农产品' : '公告' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.matchScore" label="匹配度">
            {{ (currentItem.matchScore * 100).toFixed(0) }}%
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.category" label="类目">
            {{ currentItem.category }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.price" label="价格">
            ¥{{ currentItem.price }}/{{ currentItem.unit }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.distance" label="距离">
            {{ currentItem.distance.toFixed(1) }}km
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.createdAt" label="发布时间">
            {{ formatDate(currentItem.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.supplier" label="供应商" :span="2">
            {{ currentItem.supplier.name }} ({{ currentItem.supplier.phone }})
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="currentItem.content" class="detail-description">
          <h4>详细描述</h4>
          <p>{{ currentItem.content }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="currentItem?.type === 'product'" type="primary" @click="handleContact(currentItem)">
          联系供应商
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Location, Search, Refresh, Document, ShoppingCart, Bell, OfficeBuilding,
  Loading, PriceTag, User, Clock, View, ChatDotRound, Plus, Phone
} from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()
const loading = ref(false)
const locationLoading = ref(false)
const detailVisible = ref(false)
const currentItem = ref(null)
const currentLocation = ref(null)
const recommendations = ref([])
const nearbyVillages = ref([])
const summary = ref(null)

const filters = reactive({
  radius: 50000,
  categories: []
})

// 获取当前位置
const getCurrentLocation = () => {
  locationLoading.value = true
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation.value = {
          coordinates: [position.coords.longitude, position.coords.latitude],
          address: '当前位置'
        }
        locationLoading.value = false
        ElMessage.success('位置获取成功')
        fetchRecommendations()
      },
      () => {
        locationLoading.value = false
        ElMessage.warning('位置获取失败，使用默认位置')
        currentLocation.value = {
          coordinates: [120.155, 30.274],
          address: '杭州市'
        }
        fetchRecommendations()
      }
    )
  } else {
    locationLoading.value = false
    ElMessage.warning('浏览器不支持定位')
  }
}

// 获取推荐
const fetchRecommendations = async () => {
  loading.value = true
  try {
    const params = {
      location: currentLocation.value?.coordinates,
      radius: filters.radius,
      categories: filters.categories
    }
    const response = await api.get('/api/v1/purchaser/recommendations', { params })
    if (response.success) {
      recommendations.value = response.data.recommendations || []
      nearbyVillages.value = response.data.nearbyVillages || []
      summary.value = response.data.summary
    }
  } catch (error) {
    console.error('获取推荐失败', error)
    ElMessage.error('获取推荐失败')
  } finally {
    loading.value = false
  }
}

// 重置筛选
const resetFilters = () => {
  filters.radius = 50000
  filters.categories = []
  currentLocation.value = null
  fetchRecommendations()
}

// 查看详情
const handleViewDetail = (item) => {
  currentItem.value = item
  detailVisible.value = true
}

// 联系供应商
const handleContact = (item) => {
  ElMessage.success('正在跳转到聊天界面...')
  // router.push(`/chat?supplier=${item.supplier?.id}`)
}

// 加入清单
const handleAddToCart = (item) => {
  ElMessage.success('已加入采购清单')
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  getCurrentLocation()
})
</script>

<style scoped>
.purchaser-recommendations { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 28px; color: #333; margin-bottom: 8px; }
.page-header p { color: #666; font-size: 14px; }

.filter-bar { margin-bottom: 20px; }
.location-text { margin-left: 12px; color: #67C23A; font-size: 14px; }

.summary-bar { margin-bottom: 20px; }
.summary-content { display: flex; gap: 24px; }
.summary-item { display: flex; align-items: center; gap: 6px; color: #666; }
.summary-item strong { color: #333; font-size: 16px; }

.loading-container, .empty-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #909399; }
.loading-container p { margin-top: 16px; }

.recommendations-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.recommendation-card { transition: all 0.3s; }
.recommendation-card:hover { transform: translateY(-4px); }

.recommendation-card .card-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.card-title { font-size: 18px; color: #333; margin: 0 0 12px 0; min-height: 54px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-content .description { color: #666; font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.meta-info { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
.meta-item { display: flex; align-items: center; gap: 4px; color: #909399; font-size: 13px; }
.meta-item.price { color: #f56c6c; font-weight: 500; }
.card-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.nearby-villages { margin-top: 24px; }
.villages-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.village-item { padding: 16px; border: 1px solid #ebeef5; border-radius: 8px; }
.village-item h4 { margin: 0 0 12px 0; color: #333; font-size: 16px; }
.village-item p { margin: 8px 0; color: #666; font-size: 14px; display: flex; align-items: center; gap: 6px; }

.detail-content .detail-description { margin-top: 20px; }
.detail-description h4 { font-size: 16px; color: #333; margin-bottom: 12px; }
.detail-description p { color: #666; line-height: 1.6; }
</style>
