<template>
  <div class="products-list">
    <el-container>
      <!-- 页面头部 -->
      <el-header class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <el-icon><Apple /></el-icon>
              农产品管理
            </h1>
            <p class="page-description">管理农产品信息、库存和销售数据</p>
          </div>
          <div class="action-section">
            <el-button type="primary" @click="addProduct" v-if="hasPermission('product:write')">
              <el-icon><Plus /></el-icon>
              添加产品
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 页面主体 -->
      <el-main class="page-main">
        <!-- 统计卡片 -->
        <div class="stats-cards">
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card total">
                <div class="stat-icon">
                  <el-icon><Box /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ productStats.totalProducts }}</div>
                  <div class="stat-label">产品种类</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card stock">
                <div class="stat-icon">
                  <el-icon><OfficeBuilding /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ productStats.totalStock.toLocaleString() }}</div>
                  <div class="stat-label">总库存</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card sold">
                <div class="stat-icon">
                  <el-icon><ShoppingCart /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ productStats.totalSold.toLocaleString() }}</div>
                  <div class="stat-label">已销售</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card revenue">
                <div class="stat-icon">
                  <el-icon><Coin /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">¥{{ productStats.totalValue.toLocaleString() }}</div>
                  <div class="stat-label">销售收入</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 筛选和搜索 -->
        <div class="filter-section">
          <el-card shadow="never">
            <el-row :gutter="16" class="filter-row">
              <el-col :xs="24" :sm="8" :md="6">
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索产品名称"
                  clearable
                  @clear="handleSearch"
                  @keyup.enter="handleSearch"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterCategory"
                  placeholder="产品类别"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部类别" value="" />
                  <el-option label="蔬菜" value="vegetables" />
                  <el-option label="水果" value="fruits" />
                  <el-option label="粮食" value="grains" />
                  <el-option label="畜禽" value="livestock" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterQuality"
                  placeholder="品质等级"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部等级" value="" />
                  <el-option label="优质" value="premium" />
                  <el-option label="新鲜" value="fresh" />
                  <el-option label="标准" value="standard" />
                </el-select>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <!-- 产品列表 -->
        <div class="products-table">
          <el-card shadow="never">
            <el-table
              :data="filteredProducts"
              v-loading="loading"
              stripe
              style="width: 100%"
              @sort-change="handleSortChange"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column type="index" label="#" width="60" />

              <el-table-column prop="image" label="图片" width="80">
                <template #default="{ row }">
                  <el-avatar
                    :size="50"
                    :src="row.image"
                    shape="square"
                    :alt="row.name"
                  >
                    <el-icon><Picture /></el-icon>
                  </el-avatar>
                </template>
              </el-table-column>

              <el-table-column prop="name" label="产品名称" min-width="150" sortable>
                <template #default="{ row }">
                  <div class="product-name">
                    <el-link type="primary" @click="viewProduct(row.id)" :underline="false">
                      {{ row.name }}
                    </el-link>
                    <div class="product-category">
                      <el-tag size="small">{{ getCategoryLabel(row.category) }}</el-tag>
                    </div>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="farmerName" label="农户" width="120" sortable />

              <el-table-column prop="quality" label="品质" width="100" sortable>
                <template #default="{ row }">
                  <el-tag :type="getQualityTagType(row.quality)" size="small">
                    {{ getQualityLabel(row.quality) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="price" label="价格" width="120" sortable>
                <template #default="{ row }">
                  <span class="price">¥{{ row.price }}</span>
                  <span class="unit">/{{ row.unit }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="stock" label="库存" width="100" sortable>
                <template #default="{ row }">
                  <span class="stock">{{ row.stock }}{{ row.unit }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="sold" label="已售" width="100" sortable>
                <template #default="{ row }">
                  <span class="sold">{{ row.sold }}{{ row.unit }}</span>
                </template>
              </el-table-column>

              <el-table-column label="销售率" width="120" sortable>
                <template #default="{ row }">
                  <el-progress
                    :percentage="getSalesRate(row)"
                    :color="getSalesColor(getSalesRate(row))"
                    :stroke-width="6"
                    :show-text="false"
                  />
                  <span class="sales-rate-text">{{ getSalesRate(row) }}%</span>
                </template>
              </el-table-column>

              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'available' ? 'success' : 'danger'" size="small">
                    {{ row.status === 'available' ? '在售' : '下架' }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button type="text" size="small" @click="viewProduct(row.id)">
                    <el-icon><View /></el-icon>
                    查看
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click="editProduct(row.id)"
                    v-if="hasPermission('product:write')"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-dropdown @command="(command) => handleAction(command, row)">
                    <el-button type="text" size="small">
                      更多<el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="stock">库存管理</el-dropdown-item>
                        <el-dropdown-item command="orders">查看订单</el-dropdown-item>
                        <el-dropdown-item command="certification">认证信息</el-dropdown-item>
                        <el-dropdown-item command="status" divided>
                          {{ row.status === 'available' ? '下架' : '上架' }}
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" divided v-if="hasPermission('product:delete')">
                          删除产品
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="productStats.totalProducts"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </el-card>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Apple,
  Plus,
  Box,
  OfficeBuilding,
  ShoppingCart,
  Coin,
  Search,
  View,
  Edit,
  ArrowDown,
  Picture
} from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const products = ref([])
const searchQuery = ref('')
const filterCategory = ref('')
const filterQuality = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const sortField = ref('')
const sortOrder = ref('')

// 模拟数据
const mockProducts = [
  {
    id: 1,
    name: '有机茶叶',
    category: 'tea',
    variety: '龙井茶',
    image: 'https://picsum.photos/200/200?random=1',
    farmerId: 'farmer1',
    farmerName: '王茶农',
    contact: '13812345678',
    quality: 'premium',
    certification: '有机认证',
    price: 280,
    unit: '斤',
    stock: 500,
    sold: 320,
    harvestDate: '2024-04-15',
    status: 'available',
    description: '产地有机龙井茶，口感清香甘醇'
  },
  {
    id: 2,
    name: '山核桃',
    category: 'nuts',
    variety: '野生山核桃',
    image: 'https://picsum.photos/200/200?random=2',
    farmerId: 'farmer2',
    farmerName: '李果农',
    contact: '13823456789',
    quality: 'fresh',
    certification: '绿色食品',
    price: 120,
    unit: '斤',
    stock: 800,
    sold: 450,
    harvestDate: '2024-09-20',
    status: 'available',
    description: '天然野生山核桃，营养丰富'
  },
  {
    id: 3,
    name: '土鸡蛋',
    category: 'eggs',
    variety: '散养土鸡蛋',
    image: 'https://picsum.photos/200/200?random=3',
    farmerId: 'farmer3',
    farmerName: '张养殖户',
    contact: '13834567890',
    quality: 'standard',
    certification: '无公害农产品',
    price: 2.5,
    unit: '个',
    stock: 2000,
    sold: 1500,
    harvestDate: '2024-11-01',
    status: 'available',
    description: '散养土鸡蛋，营养丰富'
  },
  {
    id: 4,
    name: '有机大米',
    category: 'grains',
    variety: '东北大米',
    image: 'https://picsum.photos/200/200?random=4',
    farmerId: 'farmer4',
    farmerName: '赵农户',
    contact: '13845678901',
    quality: 'premium',
    certification: '有机认证',
    price: 8,
    unit: '斤',
    stock: 3000,
    sold: 1800,
    harvestDate: '2024-10-15',
    status: 'available',
    description: '有机种植东北大米，口感香甜'
  },
  {
    id: 5,
    name: '土蜂蜜',
    category: 'honey',
    variety: '百花蜜',
    image: 'https://picsum.photos/200/200?random=5',
    farmerId: 'farmer5',
    farmerName: '孙蜂农',
    contact: '13856789012',
    quality: 'fresh',
    certification: '地理标志产品',
    price: 80,
    unit: '斤',
    stock: 300,
    sold: 120,
    harvestDate: '2024-06-01',
    status: 'available',
    description: '天然百花蜜，纯正香甜'
  },
  {
    id: 6,
    name: '竹笋',
    category: 'vegetables',
    variety: '春笋',
    image: 'https://picsum.photos/200/200?random=6',
    farmerId: 'farmer6',
    farmerName: '周农户',
    contact: '13867890123',
    quality: 'fresh',
    certification: '无公害农产品',
    price: 15,
    unit: '斤',
    stock: 600,
    sold: 380,
    harvestDate: '2024-03-20',
    status: 'available',
    description: '春季竹笋，鲜嫩可口'
  }
]

// 计算属性
const productStats = computed(() => {
  const stats = {
    totalProducts: products.value.length,
    totalStock: products.value.reduce((sum, product) => sum + product.stock, 0),
    totalSold: products.value.reduce((sum, product) => sum + product.sold, 0),
    totalValue: products.value.reduce((sum, product) => sum + (product.sold * product.price), 0),
    byCategory: {},
    byQuality: {}
  }

  // 按类别统计
  products.value.forEach(product => {
    stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1
    stats.byQuality[product.quality] = (stats.byQuality[product.quality] || 0) + 1
  })

  return stats
})

const filteredProducts = computed(() => {
  let filtered = [...products.value]

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(product =>
      product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      product.farmerName.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // 类别过滤
  if (filterCategory.value) {
    filtered = filtered.filter(product => product.category === filterCategory.value)
  }

  // 品质过滤
  if (filterQuality.value) {
    filtered = filtered.filter(product => product.quality === filterQuality.value)
  }

  return filtered
})

// 生命周期
onMounted(() => {
  loadProducts()
})

// 方法
const loadProducts = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    products.value = mockProducts
  } catch (error) {
    ElMessage.error('加载产品列表失败')
    console.error('Load products error:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleFilter = () => {
  currentPage.value = 1
}

const handleSortChange = ({ prop, order }) => {
  sortField.value = prop
  sortOrder.value = order
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

const viewProduct = (id) => {
  ElMessage.info(`查看产品详情: ${id}`)
}

const editProduct = (id) => {
  ElMessage.info(`编辑产品: ${id}`)
}

const addProduct = () => {
  ElMessage.info('添加新产品')
}

const handleAction = async (command, product) => {
  switch (command) {
    case 'stock':
      ElMessage.info(`管理库存: ${product.name}`)
      break
    case 'orders':
      ElMessage.info(`查看订单: ${product.name}`)
      break
    case 'certification':
      ElMessage.info(`认证信息: ${product.name}`)
      break
    case 'status':
      try {
        const newStatus = product.status === 'available' ? '下架' : '上架'
        await ElMessageBox.confirm(
          `确定要${newStatus}产品"${product.name}"吗？`,
          '确认操作',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        product.status = product.status === 'available' ? 'unavailable' : 'available'
        ElMessage.success(`${newStatus}成功`)
      } catch (error) {
        // 用户取消操作
      }
      break
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `确定要删除产品"${product.name}"吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const index = products.value.findIndex(p => p.id === product.id)
        if (index > -1) {
          products.value.splice(index, 1)
        }

        ElMessage.success('产品删除成功')
      } catch (error) {
        // 用户取消删除
      }
      break
  }
}

// 辅助方法
const getCategoryLabel = (category) => {
  const categoryMap = {
    tea: '茶叶',
    nuts: '坚果',
    eggs: '蛋类',
    grains: '粮食',
    honey: '蜂产品',
    vegetables: '蔬菜'
  }
  return categoryMap[category] || category
}

const getQualityTagType = (quality) => {
  const qualityMap = {
    premium: 'success',
    fresh: 'warning',
    standard: 'info'
  }
  return qualityMap[quality] || 'info'
}

const getQualityLabel = (quality) => {
  const qualityMap = {
    premium: '优质',
    fresh: '新鲜',
    standard: '标准'
  }
  return qualityMap[quality] || quality
}

const getSalesRate = (product) => {
  const total = product.stock + product.sold
  return total > 0 ? Math.round((product.sold / total) * 100) : 0
}

const getSalesColor = (rate) => {
  if (rate < 30) return '#f56c6c'
  if (rate < 70) return '#e6a23c'
  return '#67c23a'
}

// 权限检查
const hasPermission = (permission) => {
  // 模拟权限检查
  return true
}
</script>

<style lang="scss" scoped>
.products-list {
  height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
  height: 80px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.title-section {
  .page-title {
    display: flex;
    align-items: center;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px 0;

    .el-icon {
      margin-right: 8px;
      color: #67c23a;
    }
  }

  .page-description {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.action-section {
  display: flex;
  gap: 12px;
}

.page-main {
  padding: 24px;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;

    .el-icon {
      font-size: 24px;
      color: #fff;
    }
  }

  .stat-content {
    flex: 1;

    .stat-number {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
    }
  }

  &.total .stat-icon {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  &.stock .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  &.sold .stat-icon {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  &.revenue .stat-icon {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  }
}

.filter-section {
  margin-bottom: 24px;
}

.filter-row {
  .el-col {
    margin-bottom: 16px;
  }
}

.products-table {
  .product-name {
    .product-category {
      margin-top: 4px;
    }
  }

  .price {
    font-weight: 600;
    color: #f56c6c;
    margin-right: 4px;
  }

  .unit {
    font-size: 12px;
    color: #909399;
  }

  .stock {
    color: #409eff;
  }

  .sold {
    color: #67c23a;
  }

  .sales-rate-text {
    font-size: 12px;
    color: #606266;
    margin-left: 8px;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
    gap: 12px;
  }

  .title-section {
    .page-title {
      font-size: 20px;
    }
  }

  .action-section {
    width: 100%;

    .el-button {
      width: 100%;
    }
  }
}
</style>