<template>
  <div class="cadre-product-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2>
          <el-icon><ShoppingCart /></el-icon>
          产品发布管理
        </h2>
        <p class="subtitle">管理本村农产品、特产等产品信息，助力乡村电商发展</p>
      </div>
      <div class="header-actions">
        <el-button type="success" @click="handleBatchPublish" :disabled="selectedProducts.length === 0">
          <el-icon><CircleCheck /></el-icon>
          批量上架
        </el-button>
        <el-button type="primary" @click="showCreateDialog = true" size="large">
          <el-icon><Plus /></el-icon>
          发布新产品
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card total" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Goods /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalProducts }}</div>
              <div class="stat-label">总产品数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card online" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.onlineProducts }}</div>
              <div class="stat-label">在售产品</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card orders" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><List /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalOrders }}</div>
              <div class="stat-label">总订单数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card revenue" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatAmount(stats.totalRevenue) }}</div>
              <div class="stat-label">总销售额</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="搜索产品名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="产品分类">
          <el-select v-model="filters.category" placeholder="选择分类" clearable style="width: 140px">
            <el-option label="农产品" value="agriculture" />
            <el-option label="手工艺品" value="handicraft" />
            <el-option label="特色食品" value="food" />
            <el-option label="土特产" value="specialty" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable style="width: 120px">
            <el-option label="在售" value="active" />
            <el-option label="下架" value="inactive" />
            <el-option label="缺货" value="out_of_stock" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 产品列表 -->
    <el-card class="product-list-card" shadow="never">
      <el-table
        :data="productList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="productCode" label="产品编号" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.productCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="产品图片" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.image || '/placeholder-product.png'"
              :preview-src-list="[row.image]"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px;"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="产品名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="producer" label="生产者" width="120" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="100" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ formatAmount(row.price) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getStockTagType(row.stock)" size="small">
              {{ row.stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sales" label="销量" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="发布时间" width="110">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" type="primary" link @click="handleView(row)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button size="small" type="warning" link @click="handleEdit(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button
                size="small"
                :type="row.status === 'active' ? 'warning' : 'success'"
                link
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 'active' ? '下架' : '上架' }}
              </el-button>
              <el-button size="small" type="danger" link @click="handleDelete(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 创建/编辑产品对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingProduct ? '编辑产品' : '发布新产品'"
      width="700px"
      :before-close="handleCloseCreateDialog"
      destroy-on-close
    >
      <el-form
        ref="productFormRef"
        :model="productForm"
        :rules="productFormRules"
        label-width="100px"
      >
        <el-form-item label="产品名称" prop="name">
          <el-input
            v-model="productForm.name"
            placeholder="例如：有机大米"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产品分类" prop="category">
              <el-select v-model="productForm.category" placeholder="请选择分类" style="width: 100%">
                <el-option label="农产品" value="agriculture">
                  <div class="option-item">
                    <el-icon><Grape /></el-icon>
                    <span>农产品</span>
                  </div>
                </el-option>
                <el-option label="手工艺品" value="handicraft">
                  <div class="option-item">
                    <el-icon><Brush /></el-icon>
                    <span>手工艺品</span>
                  </div>
                </el-option>
                <el-option label="特色食品" value="food">
                  <div class="option-item">
                    <el-icon><Chicken /></el-icon>
                    <span>特色食品</span>
                  </div>
                </el-option>
                <el-option label="土特产" value="specialty">
                  <div class="option-item">
                    <el-icon><Star /></el-icon>
                    <span>土特产</span>
                  </div>
                </el-option>
                <el-option label="其他" value="other">
                  <div class="option-item">
                    <el-icon><More /></el-icon>
                    <span>其他</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产者" prop="producer">
              <el-input
                v-model="productForm.producer"
                placeholder="农户或合作社名称"
                maxlength="50"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="价格(元)" prop="price">
              <el-input-number
                v-model="productForm.price"
                :precision="2"
                :step="0.01"
                :min="0.01"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="库存" prop="stock">
              <el-input-number
                v-model="productForm.stock"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="规格">
              <el-input v-model="productForm.specification" placeholder="例如：500克/袋" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产地">
              <el-input v-model="productForm.origin" placeholder="例如：浙江省杭州市" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="产品描述" prop="description">
          <el-input
            v-model="productForm.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述产品的特点、品质、生产过程等..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="产品图片" prop="image">
          <el-upload
            class="product-image-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleImageUpload"
          >
            <img v-if="productForm.image" :src="productForm.image" class="product-image-preview" />
            <div v-else class="upload-placeholder">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <div class="upload-text">点击上传图片</div>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="productForm.status">
            <el-radio label="active">立即上架</el-radio>
            <el-radio label="inactive">暂不上架</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseCreateDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmitProduct" :loading="submitting">
            {{ editingProduct ? '更新' : '发布' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 产品详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="产品详情"
      width="700px"
      :before-close="handleCloseDetailDialog"
      destroy-on-close
    >
      <div v-if="currentProduct" class="product-detail">
        <el-row :gutter="20">
          <el-col :span="10">
            <div class="product-image">
              <el-image
                :src="currentProduct.image || '/placeholder-product.png'"
                :preview-src-list="[currentProduct.image]"
                fit="cover"
                style="width: 100%; border-radius: 8px;"
              />
            </div>
          </el-col>
          <el-col :span="14">
            <h3 class="product-title">{{ currentProduct.name }}</h3>
            <div class="product-meta">
              <el-tag :type="getStatusTagType(currentProduct.status)" size="large">
                {{ getStatusLabel(currentProduct.status) }}
              </el-tag>
              <el-tag type="info" size="large">{{ getCategoryLabel(currentProduct.category) }}</el-tag>
            </div>
            <div class="product-price">
              <span class="price-label">价格：</span>
              <span class="price-value">¥{{ formatAmount(currentProduct.price) }}</span>
            </div>
            <el-descriptions :column="1" border class="product-info">
              <el-descriptions-item label="产品编号">{{ currentProduct.productCode }}</el-descriptions-item>
              <el-descriptions-item label="生产者">{{ currentProduct.producer }}</el-descriptions-item>
              <el-descriptions-item label="规格">{{ currentProduct.specification || '-' }}</el-descriptions-item>
              <el-descriptions-item label="产地">{{ currentProduct.origin || '-' }}</el-descriptions-item>
              <el-descriptions-item label="库存">{{ currentProduct.stock }} {{ currentProduct.specification ? '/' + currentProduct.specification : '' }}</el-descriptions-item>
              <el-descriptions-item label="销量">{{ currentProduct.sales }} 件</el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
        <el-divider />
        <div class="product-description">
          <h4>产品描述</h4>
          <p>{{ currentProduct.description }}</p>
        </div>
        <el-divider />
        <div class="product-stats">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ currentProduct.views || 0 }}</div>
                <div class="stat-label">浏览次数</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ currentProduct.favorites || 0 }}</div>
                <div class="stat-label">收藏次数</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-value">{{ currentProduct.reviews || 0 }}</div>
                <div class="stat-label">评价数量</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ShoppingCart, Plus, CircleCheck, Goods, List, Money,
  Search, Refresh, View, Edit, Delete, Grape, Brush, Chicken,
  Star, More
} from '@element-plus/icons-vue'
import { productApi } from '@/api/cadre'

// ==================== 响应式状态 ====================
const loading = ref(false)
const submitting = ref(false)

// 筛选条件
const filters = reactive({
  search: '',
  category: '',
  status: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 统计数据
const stats = reactive({
  totalProducts: 0,
  onlineProducts: 0,
  totalOrders: 0,
  totalRevenue: 0
})

// 产品列表
const productList = ref([])
const selectedProducts = ref([])

// 对话框状态
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingProduct = ref(null)
const currentProduct = ref(null)

// ==================== 表单数据 ====================
const productForm = reactive({
  name: '',
  category: '',
  producer: '',
  price: 0,
  stock: 0,
  specification: '',
  origin: '',
  description: '',
  image: '',
  status: 'active'
})

const productFormRules = {
  name: [
    { required: true, message: '请输入产品名称', trigger: 'blur' },
    { min: 2, max: 100, message: '产品名称长度在2到100个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择产品分类', trigger: 'change' }
  ],
  producer: [
    { required: true, message: '请输入生产者', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '价格必须大于0', trigger: 'blur' }
  ],
  stock: [
    { required: true, message: '请输入库存', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存不能为负数', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入产品描述', trigger: 'blur' }
  ]
}

// 表单引用
const productFormRef = ref(null)

// ==================== 方法 ====================

/**
 * 加载产品列表
 */
const loadProductList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    }

    // 清理空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await productApi.getCadreProducts(params)

    if (response.success) {
      productList.value = response.data.products || []
      pagination.total = response.pagination?.total || 0
    } else {
      ElMessage.error(response.message || '获取产品列表失败')
    }
  } catch (error) {
    console.error('加载产品列表失败:', error)
    // 使用模拟数据
    loadMockProducts()
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    const response = await productApi.getCadreProductStats()
    if (response.success) {
      Object.assign(stats, response.data)
    }
  } catch (error) {
    // 使用模拟数据
    stats.totalProducts = 45
    stats.onlineProducts = 38
    stats.totalOrders = 256
    stats.totalRevenue = 128680.50
  }
}

/**
 * 加载模拟数据
 */
const loadMockProducts = () => {
  productList.value = [
    {
      _id: '1',
      productCode: 'PRD202401001',
      name: '有机大米',
      category: 'agriculture',
      producer: '张三家庭农场',
      price: 68.00,
      stock: 500,
      specification: '5公斤/袋',
      origin: '浙江省杭州市余杭区',
      description: '纯天然有机种植，无农药无化肥，营养丰富口感好',
      image: '',
      status: 'active',
      sales: 156,
      views: 1234,
      favorites: 89,
      reviews: 42,
      createdAt: new Date().toISOString()
    },
    {
      _id: '2',
      productCode: 'PRD202401002',
      name: '手工竹编篮子',
      category: 'handicraft',
      producer: '李四竹编工艺',
      price: 45.00,
      stock: 50,
      specification: '直径30cm',
      origin: '浙江省杭州市',
      description: '传统手工竹编工艺，绿色环保，实用美观',
      image: '',
      status: 'active',
      sales: 78,
      views: 856,
      favorites: 56,
      reviews: 28,
      createdAt: new Date().toISOString()
    }
  ]
  pagination.total = productList.value.length
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  loadProductList()
}

/**
 * 重置筛选
 */
const handleReset = () => {
  filters.search = ''
  filters.category = ''
  filters.status = ''
  pagination.page = 1
  loadProductList()
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size) => {
  pagination.limit = size
  loadProductList()
}

/**
 * 页码变化
 */
const handleCurrentChange = (page) => {
  pagination.page = page
  loadProductList()
}

/**
 * 选择变化
 */
const handleSelectionChange = (selection) => {
  selectedProducts.value = selection
}

/**
 * 查看详情
 */
const handleView = (row) => {
  currentProduct.value = row
  showDetailDialog.value = true
}

/**
 * 编辑产品
 */
const handleEdit = (row) => {
  editingProduct.value = row
  Object.assign(productForm, {
    name: row.name,
    category: row.category,
    producer: row.producer,
    price: row.price,
    stock: row.stock,
    specification: row.specification || '',
    origin: row.origin || '',
    description: row.description,
    image: row.image || '',
    status: row.status
  })
  showCreateDialog.value = true
}

/**
 * 切换状态
 */
const handleToggleStatus = async (row) => {
  try {
    const newStatus = row.status === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'active' ? '上架' : '下架'

    await ElMessageBox.confirm(
      `确定要${action}产品 "${row.name}" 吗？`,
      `确认${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await productApi.toggleProductStatus(row._id, newStatus)
    if (response.success) {
      row.status = newStatus
      ElMessage.success(`${action}成功`)
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

/**
 * 删除产品
 */
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除产品 "${row.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await productApi.deleteProduct(row._id)
    if (response.success) {
      ElMessage.success('删除成功')
      loadProductList()
      loadStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 提交产品
 */
const handleSubmitProduct = async () => {
  if (!productFormRef.value) return

  try {
    await productFormRef.value.validate()

    submitting.value = true

    let response
    if (editingProduct.value) {
      response = await productApi.updateProduct(editingProduct.value._id, productForm)
    } else {
      response = await productApi.createProduct(productForm)
    }

    if (response.success) {
      ElMessage.success(editingProduct.value ? '产品更新成功' : '产品发布成功')
      handleCloseCreateDialog()
      loadProductList()
      loadStats()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('操作失败')
      console.error('提交产品失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

/**
 * 批量上架
 */
const handleBatchPublish = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要批量上架选中的 ${selectedProducts.value.length} 个产品吗？`,
      '批量上架',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    const ids = selectedProducts.value.map(p => p._id)
    const response = await productApi.batchPublish(ids)

    if (response.success) {
      ElMessage.success('批量上架成功')
      loadProductList()
      loadStats()
      selectedProducts.value = []
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量上架失败')
    }
  }
}

/**
 * 关闭创建对话框
 */
const handleCloseCreateDialog = () => {
  showCreateDialog.value = false
  editingProduct.value = null
  resetProductForm()
}

/**
 * 重置产品表单
 */
const resetProductForm = () => {
  Object.keys(productForm).forEach(key => {
    if (key === 'price' || key === 'stock') {
      productForm[key] = 0
    } else if (key === 'status') {
      productForm[key] = 'active'
    } else {
      productForm[key] = ''
    }
  })

  if (productFormRef.value) {
    productFormRef.value.resetFields()
  }
}

/**
 * 关闭详情对话框
 */
const handleCloseDetailDialog = () => {
  showDetailDialog.value = false
  currentProduct.value = null
}

/**
 * 上传图片
 */
const handleImageUpload = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    productForm.image = e.target.result
  }
  reader.readAsDataURL(file)
  return false
}

// ==================== 工具函数 ====================

/**
 * 格式化金额
 */
const formatAmount = (amount) => {
  if (!amount) return '0.00'
  return parseFloat(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * 格式化日期
 */
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

/**
 * 获取分类标签
 */
const getCategoryLabel = (category) => {
  const labelMap = {
    agriculture: '农产品',
    handicraft: '手工艺品',
    food: '特色食品',
    specialty: '土特产',
    other: '其他'
  }
  return labelMap[category] || category
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const typeMap = {
    active: 'success',
    inactive: 'info',
    out_of_stock: 'danger'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取状态标签文本
 */
const getStatusLabel = (status) => {
  const labelMap = {
    active: '在售',
    inactive: '下架',
    out_of_stock: '缺货'
  }
  return labelMap[status] || status
}

/**
 * 获取库存标签类型
 */
const getStockTagType = (stock) => {
  if (stock <= 10) return 'danger'
  if (stock <= 50) return 'warning'
  return 'success'
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadProductList()
  loadStats()
})
</script>

<style lang="scss" scoped>
.cadre-product-management {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

// ==================== 页面头部 ====================
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;

  .header-content {
    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 12px;

      @media (max-width: 768px) {
        font-size: 20px;
      }
    }

    .subtitle {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

// ==================== 统计卡片 ====================
.stats-cards {
  margin-bottom: 20px;

  .stat-card {
    height: 100px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    :deep(.el-card__body) {
      padding: 20px;
      height: 100%;
    }

    .stat-content {
      display: flex;
      align-items: center;
      height: 100%;
      gap: 16px;

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;

        .stat-card.total & {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .stat-card.online & {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }

        .stat-card.orders & {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: white;
        }

        .stat-card.revenue & {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          color: white;
        }
      }

      .stat-info {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #303133;
          line-height: 1.2;

          @media (max-width: 768px) {
            font-size: 24px;
          }
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 4px;
        }
      }
    }
  }
}

// ==================== 筛选卡片 ====================
.filter-card {
  margin-bottom: 20px;
}

// ==================== 产品列表 ====================
.product-list-card {
  :deep(.el-card__body) {
    padding: 0;
  }

  .price {
    color: #f56c6c;
    font-weight: 600;
    font-size: 16px;
  }

  .pagination-container {
    padding: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

// ==================== 对话框样式 ====================
.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-image-uploader {
  .product-image-preview {
    width: 200px;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
    display: block;
  }

  .upload-placeholder {
    width: 200px;
    height: 200px;
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.3s;

    &:hover {
      border-color: #409eff;
    }

    .upload-icon {
      font-size: 48px;
      color: #8c939d;
      margin-bottom: 12px;
    }

    .upload-text {
      font-size: 14px;
      color: #8c939d;
    }
  }
}

// ==================== 产品详情 ====================
.product-detail {
  .product-title {
    margin: 0 0 16px 0;
    font-size: 24px;
    color: #303133;
  }

  .product-meta {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .product-price {
    margin-bottom: 20px;
    font-size: 20px;

    .price-label {
      color: #909399;
    }

    .price-value {
      color: #f56c6c;
      font-weight: 700;
      font-size: 28px;
    }
  }

  .product-info {
    margin-bottom: 20px;
  }

  .product-description {
    h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #303133;
    }

    p {
      margin: 0;
      line-height: 1.8;
      color: #606266;
    }
  }

  .product-stats {
    .stat-item {
      text-align: center;

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #409eff;
      }

      .stat-label {
        font-size: 14px;
        color: #909399;
        margin-top: 4px;
      }
    }
  }
}

// ==================== 响应式优化 ====================
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;

    .header-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }

  .stats-cards {
    .el-col {
      margin-bottom: 10px;
    }
  }

  :deep(.el-form--inline .el-form-item) {
    display: block;
    margin-right: 0;
    margin-bottom: 12px;

    .el-form-item__content {
      width: 100% !important;
    }
  }
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #fafafa;
}
</style>
