<template>
  <div class="nearby-suppliers">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><LocationFilled /></el-icon>
            <span>附近推荐商家</span>
            <el-tag type="success" size="small" v-if="locationInfo">
              {{ locationInfo.city }}
            </el-tag>
          </div>
          <div class="header-right">
            <el-button type="primary" text @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="primary" text @click="handleLocationSettings">
              <el-icon><Setting /></el-icon>
              位置设置
            </el-button>
          </div>
        </div>
      </template>

      <!-- 位置获取提示 -->
      <el-alert
        v-if="!locationObtained"
        type="info"
        :closable="false"
        show-icon
      >
        <template #title>
          <span>请允许获取位置信息以获取更精准的推荐</span>
          <el-button type="primary" size="small" @click="getLocation" style="margin-left: 12px">
            获取位置
          </el-button>
        </template>
      </el-alert>

      <!-- 筛选栏 -->
      <div class="filter-section" v-if="locationObtained">
        <div class="filter-row">
          <el-select
            v-model="filters.category"
            placeholder="商品类目"
            clearable
            style="width: 160px"
            @change="handleFilter"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
          <el-select
            v-model="filters.radius"
            placeholder="距离范围"
            style="width: 140px"
            @change="handleFilter"
          >
            <el-option label="5公里内" :value="5" />
            <el-option label="10公里内" :value="10" />
            <el-option label="20公里内" :value="20" />
            <el-option label="50公里内" :value="50" />
            <el-option label="100公里内" :value="100" />
          </el-select>
          <el-select
            v-model="filters.sortBy"
            placeholder="排序方式"
            style="width: 140px"
            @change="handleFilter"
          >
            <el-option label="距离优先" value="distance" />
            <el-option label="评分优先" value="rating" />
            <el-option label="销量优先" value="sales" />
          </el-select>
          <el-button type="primary" @click="handleFilter">
            <el-icon><Search /></el-icon>
            筛选
          </el-button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在搜索附近的商家...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="suppliers.length === 0" class="empty-container">
        <el-empty :description="emptyText">
          <el-button type="primary" @click="handleExpandRadius">
            扩大搜索范围
          </el-button>
        </el-empty>
      </div>

      <!-- 商家列表 -->
      <div v-else class="suppliers-grid">
        <div
          v-for="supplier in suppliers"
          :key="supplier._id"
          class="supplier-card"
          @click="viewSupplierDetail(supplier)"
        >
          <!-- 商家头像和认证 -->
          <div class="supplier-header">
            <el-avatar :size="60" :src="supplier.avatar || defaultAvatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="supplier-meta">
              <h4 class="supplier-name">{{ supplier.name || supplier.companyName }}</h4>
              <div class="supplier-badges">
                <el-tag v-if="supplier.verified" type="success" size="small">
                  <el-icon><CircleCheck /></el-icon>
                  已认证
                </el-tag>
                <el-tag type="info" size="small">
                  {{ supplier.type === 'business' ? '企业' : '个人' }}
                </el-tag>
              </div>
            </div>
            <div class="distance-badge">
              <el-icon><Location /></el-icon>
              {{ supplier.distance?.toFixed(1) || '?' }}km
            </div>
          </div>

          <!-- 评分和销量 -->
          <div class="supplier-stats">
            <div class="stat-item">
              <el-rate
                v-model="supplier.rating"
                disabled
                show-score
                text-color="#ff9900"
                score-template="{value}"
              />
            </div>
            <div class="stat-item">
              <span class="stat-label">已售</span>
              <span class="stat-value">{{ supplier.salesCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">响应率</span>
              <span class="stat-value">{{ supplier.responseRate || 95 }}%</span>
            </div>
          </div>

          <!-- 主营类目 -->
          <div class="supplier-categories">
            <el-tag
              v-for="cat in (supplier.categories || []).slice(0, 3)"
              :key="cat"
              size="small"
              type="warning"
              effect="plain"
            >
              {{ cat }}
            </el-tag>
            <el-tag
              v-if="supplier.categories?.length > 3"
              size="small"
              type="info"
            >
              +{{ supplier.categories.length - 3 }}
            </el-tag>
          </div>

          <!-- 推荐商品预览 -->
          <div class="supplier-products" v-if="supplier.featuredProducts?.length > 0">
            <div class="products-title">热销商品</div>
            <div class="products-list">
              <div
                v-for="product in supplier.featuredProducts.slice(0, 3)"
                :key="product._id"
                class="product-item"
                @click.stop="viewProduct(product)"
              >
                <img :src="product.image || defaultProductImage" :alt="product.name" />
                <div class="product-info">
                  <div class="product-name">{{ product.name }}</div>
                  <div class="product-price">¥{{ product.price }}/{{ product.unit }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="supplier-actions">
            <el-button size="small" @click.stop="handleFollow(supplier)">
              <el-icon><Plus" /></el-icon>
              关注
            </el-button>
            <el-button size="small" type="primary" @click.stop="handleContact(supplier)">
              <el-icon><ChatDotRound /></el-icon>
              联系
            </el-button>
            <el-button size="small" @click.stop="viewSupplierDetail(supplier)">
              查看详情
            </el-button>
          </div>

          <!-- 地址信息 -->
          <div class="supplier-address" v-if="supplier.address">
            <el-icon><Location /></el-icon>
            <span>{{ supplier.address }}</span>
          </div>
        </div>
      </div>

      <!-- 地图视图切换 -->
      <div class="view-toggle">
        <el-radio-group v-model="viewMode" @change="handleViewModeChange">
          <el-radio-button label="list">
            <el-icon><List /></el-icon>
            列表视图
          </el-radio-button>
          <el-radio-button label="map">
            <el-icon><MapLocation /></el-icon>
            地图视图
          </el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <!-- 地图对话框 -->
    <el-dialog
      v-model="mapDialogVisible"
      title="附近商家地图"
      width="80%"
      top="5vh"
    >
      <div class="map-container" id="supplierMap"></div>
      <template #footer>
        <el-button @click="mapDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 位置设置对话框 -->
    <el-dialog v-model="locationDialogVisible" title="位置设置" width="500px">
      <el-form label-width="100px">
        <el-form-item label="当前城市">
          <el-cascader
            v-model="manualLocation"
            :options="cityOptions"
            placeholder="选择城市"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input
            v-model="manualAddress"
            placeholder="请输入详细地址"
          />
        </el-form-item>
        <el-form-item label="推荐范围">
          <el-slider v-model="defaultRadius" :min="5" :max="100" :step="5" show-stops />
          <span class="form-tip">{{ defaultRadius }}公里</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="locationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLocationSettings">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  LocationFilled, Refresh, Setting, Location, User, CircleCheck,
  Search, Loading, Plus, ChatDotRound, List, MapLocation
} from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()

const loading = ref(false)
const locationObtained = ref(false)
const locationInfo = ref(null)
const suppliers = ref([])
const viewMode = ref('list')
const mapDialogVisible = ref(false)
const locationDialogVisible = ref(false)

const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23e0e0e0"/%3E%3C/svg%3E'
const defaultProductImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"%3E%3Crect width="200" height="150" fill="%23f0f0f0"/%3E%3C/svg%3E'

const filters = reactive({
  category: '',
  radius: 20,
  sortBy: 'distance'
})

const defaultRadius = ref(20)
const manualLocation = ref([])
const manualAddress = ref('')

const categories = [
  { label: '蔬菜类', value: '蔬菜' },
  { label: '水果类', value: '水果' },
  { label: '粮食作物', value: '粮食' },
  { label: '畜禽产品', value: '畜禽' },
  { label: '水产品', value: '水产' },
  { label: '干货调料', value: '干货' },
  { label: '茶叶饮品', value: '茶叶' },
  { label: '中药材', value: '中药材' }
]

const cityOptions = [
  {
    value: '浙江省',
    label: '浙江省',
    children: [
      {
        value: '杭州市',
        label: '杭州市',
        children: [
          { value: '西湖区', label: '西湖区' },
          { value: '余杭区', label: '余杭区' },
          { value: '临平区', label: '临平区' },
          { value: '萧山区', label: '萧山区' }
        ]
      },
      {
        value: '宁波市',
        label: '宁波市',
        children: [
          { value: '海曙区', label: '海曙区' },
          { value: '江北区', label: '江北区' },
          { value: '北仑区', label: '北仑区' }
        ]
      }
    ]
  }
]

const emptyText = computed(() => {
  if (filters.radius < 50) {
    return '附近暂无商家，试试扩大搜索范围'
  }
  return '暂无推荐商家'
})

// 获取位置
const getLocation = () => {
  if (navigator.geolocation) {
    loading.value = true
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationInfo.value = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        locationObtained.value = true
        loading.value = false
        fetchNearbySuppliers()
        ElMessage.success('位置获取成功')
      },
      (error) => {
        loading.value = false
        console.error('位置获取失败', error)
        ElMessage.warning('位置获取失败，请手动设置位置')
        locationDialogVisible.value = true
      }
    )
  } else {
    ElMessage.warning('浏览器不支持定位功能')
    locationDialogVisible.value = true
  }
}

// 获取附近供应商
const fetchNearbySuppliers = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/v1/purchaser/nearby-suppliers', {
      params: {
        ...filters,
        latitude: locationInfo.value?.latitude,
        longitude: locationInfo.value?.longitude,
        radius: filters.radius
      }
    })

    if (response.success) {
      // 模拟数据用于演示
      suppliers.value = [
        {
          _id: '1',
          name: '绿源农场',
          companyName: '绿源农产品有限公司',
          type: 'business',
          verified: true,
          avatar: '',
          rating: 4.8,
          salesCount: 1520,
          responseRate: 98,
          distance: 3.2,
          categories: ['蔬菜', '水果', '粮食'],
          address: '杭州市西湖区转塘街道',
          featuredProducts: [
            { _id: 'p1', name: '有机白菜', price: '3.5', unit: '斤', image: '' },
            { _id: 'p2', name: '新鲜草莓', price: '25', unit: '斤', image: '' }
          ]
        },
        {
          _id: '2',
          name: '张三种植户',
          type: 'individual',
          verified: true,
          avatar: '',
          rating: 4.6,
          salesCount: 580,
          responseRate: 92,
          distance: 5.8,
          categories: ['蔬菜'],
          address: '杭州市余杭区良渚街道',
          featuredProducts: [
            { _id: 'p3', name: '土鸡蛋', price: '1.5', unit: '个', image: '' }
          ]
        },
        {
          _id: '3',
          name: '丰收农业合作社',
          companyName: '丰收农业专业合作社',
          type: 'business',
          verified: true,
          avatar: '',
          rating: 4.9,
          salesCount: 2300,
          responseRate: 99,
          distance: 12.5,
          categories: ['粮食', '畜禽', '水产'],
          address: '杭州市萧山区瓜沥镇',
          featuredProducts: [
            { _id: 'p4', name: '生态大米', price: '6', unit: '斤', image: '' },
            { _id: 'p5', name: '土鸡', price: '80', unit: '只', image: '' }
          ]
        }
      ]
    }
  } catch (error) {
    console.error('获取附近商家失败', error)
  } finally {
    loading.value = false
  }
}

// 刷新
const handleRefresh = () => {
  fetchNearbySuppliers()
}

// 位置设置
const handleLocationSettings = () => {
  locationDialogVisible.value = true
}

// 保存位置设置
const saveLocationSettings = () => {
  if (manualLocation.value.length < 2) {
    ElMessage.warning('请选择城市')
    return
  }

  locationInfo.value = {
    city: manualLocation.value[1],
    district: manualLocation.value[2],
    address: manualAddress.value
  }

  locationObtained.value = true
  locationDialogVisible.value = false
  fetchNearbySuppliers()
  ElMessage.success('位置设置成功')
}

// 筛选
const handleFilter = () => {
  fetchNearbySuppliers()
}

// 扩大搜索范围
const handleExpandRadius = () => {
  if (filters.radius < 100) {
    filters.radius = Math.min(filters.radius + 20, 100)
    fetchNearbySuppliers()
  }
}

// 视图模式切换
const handleViewModeChange = (mode) => {
  if (mode === 'map') {
    mapDialogVisible.value = true
  }
}

// 查看商家详情
const viewSupplierDetail = (supplier) => {
  router.push(`/suppliers/${supplier._id}`)
}

// 查看商品
const viewProduct = (product) => {
  router.push(`/products/${product._id}`)
}

// 关注商家
const handleFollow = async (supplier) => {
  try {
    await api.post(`/api/v1/purchaser/suppliers/${supplier._id}/follow`)
    ElMessage.success(`已关注 ${supplier.name || supplier.companyName}`)
  } catch (error) {
    console.error('关注失败', error)
  }
}

// 联系商家
const handleContact = (supplier) => {
  ElMessage.success(`正在联系 ${supplier.name || supplier.companyName}...`)
}

onMounted(() => {
  // 自动获取位置
  setTimeout(() => {
    getLocation()
  }, 1000)
})
</script>

<style scoped>
.nearby-suppliers {
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

.filter-section {
  margin: 20px 0;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.filter-row {
  display: flex;
  gap: 12px;
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
  font-size: 16px;
}

.loading-container .el-icon {
  font-size: 32px;
}

.empty-container {
  padding: 40px;
}

.suppliers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.supplier-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.supplier-card:hover {
  border-color: #67c23a;
  box-shadow: 0 4px 16px rgba(103, 194, 58, 0.2);
  transform: translateY(-4px);
}

.supplier-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  position: relative;
}

.supplier-meta {
  flex: 1;
}

.supplier-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
}

.supplier-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.distance-badge {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.supplier-stats {
  display: flex;
  gap: 20px;
  padding: 12px 0;
  border-top: 1px solid #f5f7fa;
  border-bottom: 1px solid #f5f7fa;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.stat-label {
  color: #909399;
}

.stat-value {
  color: #67c23a;
  font-weight: 600;
}

.supplier-categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.supplier-products {
  margin-bottom: 12px;
}

.products-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.product-item:hover {
  background: #e8f4d8;
}

.product-item img {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  object-fit: cover;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.product-name {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.product-price {
  font-size: 14px;
  color: #f56c6c;
  font-weight: 600;
}

.supplier-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.supplier-actions .el-button {
  flex: 1;
}

.supplier-address {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 6px;
}

.view-toggle {
  margin-top: 20px;
  text-align: center;
}

.map-container {
  width: 100%;
  height: 60vh;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.form-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}

@media (max-width: 768px) {
  .suppliers-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
  }

  .filter-row .el-select,
  .filter-row .el-button {
    width: 100% !important;
  }
}
</style>
