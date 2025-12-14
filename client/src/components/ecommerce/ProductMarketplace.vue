<template>
  <div class="product-marketplace">
    <!-- 搜索和筛选栏 -->
    <div class="search-filters">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索农产品、农资商品..."
            clearable
            @keyup.enter="searchProducts"
          >
            <template #append>
              <el-button icon="el-icon-search" @click="searchProducts" />
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filters.category"
            placeholder="商品分类"
            clearable
            @change="searchProducts"
          >
            <el-option
              v-for="category in categories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            ></el-option>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="filters.sortBy"
            placeholder="排序方式"
            @change="searchProducts"
          >
            <el-option label="最新发布" value="createdAt"></el-option>
            <el-option label="价格最低" value="price_asc"></el-option>
            <el-option label="价格最高" value="price_desc"></el-option>
            <el-option label="销量最多" value="sales"></el-option>
            <el-option label="评分最高" value="rating"></el-option>
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button-group>
            <el-button
              :type="viewMode === 'grid' ? 'primary' : 'default'"
              icon="el-icon-s-grid"
              @click="viewMode = 'grid'"
            />
            <el-button
              :type="viewMode === 'list' ? 'primary' : 'default'"
              icon="el-icon-list"
              @click="viewMode = 'list'"
            />
          </el-button-group>
        </el-col>
      </el-row>

      <el-row :gutter="10" style="margin-top: 10px;">
        <el-col :span="24">
          <el-button-group size="small">
            <el-checkbox-group v-model="filters.certification">
              <el-checkbox label="organic">有机</el-checkbox>
              <el-checkbox label="green">绿色</el-checkbox>
              <el-checkbox label="gap">无公害</el-checkbox>
            </el-checkbox-group>
          </el-button-group>
          <el-button-group size="small" style="margin-left: 20px;">
            <el-button
              :type="filters.inStock ? 'primary' : 'default'"
              @click="filters.inStock = !filters.inStock; searchProducts()"
            >
              仅显示有货
            </el-button>
            <el-button
              :type="filters.isRecommended ? 'primary' : 'default'"
              @click="filters.isRecommended = !filters.isRecommended; searchProducts()"
            >
              推荐商品
            </el-button>
          </el-button-group>
        </el-col>
      </el-row>
    </div>

    <!-- 商品展示区域 -->
    <div class="product-container">
      <!-- 网格视图 -->
      <div v-show="viewMode === 'grid'" class="product-grid">
        <el-row :gutter="20">
          <el-col
            v-for="product in paginatedProducts"
            :key="product._id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            :xl="4"
          >
            <el-card :body-style="{ padding: '0px' }" class="product-card" @click="viewProductDetail(product)">
              <div class="product-image">
                <img
                  :src="getProductImage(product)"
                  :alt="product.name"
                  @error="handleImageError"
                />
                <div v-if="product.discount && product.discount.percentage" class="discount-badge">
                  {{ product.discount.percentage }}% OFF
                </div>
                <div v-if="!product.isInStock" class="out-of-stock-overlay">
                  <span class="out-of-stock-text">暂时缺货</span>
                </div>
              </div>
              <div class="product-info">
                <h3 class="product-title" :title="product.name">{{ product.name }}</h3>
                <p class="product-description">{{ product.description }}</p>
                <div class="product-price">
                  <span class="current-price">¥{{ formatPrice(product.discountedPrice) }}</span>
                  <span
                    v-if="product.discountedPrice < product.retailPrice"
                    class="original-price"
                  >¥{{ formatPrice(product.retailPrice) }}</span>
                </div>
                <div class="product-meta">
                  <el-tag v-if="product.brand" size="small">{{ product.brand }}</el-tag>
                  <el-tag type="success" size="small">{{ getCategoryName(product.category) }}</el-tag>
                  <el-tag v-if="product.isLowStock" type="warning" size="small">库存不足</el-tag>
                </div>
                <div class="product-actions">
                  <el-button
                    size="small"
                    type="primary"
                    :disabled="!product.isInStock"
                    @click.stop="addToCart(product)"
                  >
                    <i class="el-icon-shopping-cart-2"></i> 加入购物车
                  </el-button>
                  <el-button
                    size="small"
                    icon="el-icon-star-off"
                    circle
                    @click.stop="addToWishlist(product)"
                  />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 列表视图 -->
      <div v-show="viewMode === 'list'" class="product-list">
        <el-table :data="paginatedProducts" v-loading="loading" style="width: 100%">
          <el-table-column label="商品" min-width="300">
            <template #default="{ row }">
              <div class="product-list-item">
                <img
                  :src="getProductImage(row)"
                  :alt="row.name"
                  class="product-list-image"
                  @error="handleImageError"
                />
                <div class="product-list-info">
                  <h4>{{ row.name }}</h4>
                  <p>{{ row.description }}</p>
                  <div class="product-list-meta">
                    <el-tag v-if="row.brand" size="small">{{ row.brand }}</el-tag>
                    <el-tag type="success" size="small">{{ getCategoryName(row.category) }}</el-tag>
                    <el-tag v-if="!row.isInStock" type="danger" size="small">缺货</el-tag>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="价格" width="120" align="right">
            <template #default="{ row }">
              <div class="price-display">
                <span class="current-price">¥{{ formatPrice(row.discountedPrice) }}</span>
                <span
                  v-if="row.discountedPrice < row.retailPrice"
                  class="original-price"
                >¥{{ formatPrice(row.retailPrice) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="inventory.quantity" label="库存" width="80" align="center">
            <template #default="{ row }">
              <span :class="{'text-danger': row.isLowStock}">
                {{ row.inventory.quantity }}{{ getUnit(row.unit) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="sales.totalSold" label="销量" width="80" align="center">
            <template #default="{ row }">
              {{ row.sales.totalSold || 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="sales.averageRating" label="评分" width="100" align="center">
            <template #default="{ row }">
              <el-rate
                v-model="row.sales.averageRating"
                disabled
                show-score
                text-color="#ff9900"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center">
            <template #default="{ row }">
              <el-button
                size="mini"
                type="primary"
                :disabled="!row.isInStock"
                @click="addToCart(row)"
              >
                加入购物车
              </el-button>
              <el-button
                size="mini"
                icon="el-icon-view"
                circle
                @click="viewProductDetail(row)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[12, 24, 48, 96]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 购物车侧边栏 -->
    <el-drawer
      v-model="cartDrawerVisible"
      direction="rtl"
      size="400px"
      title="购物车"
    >
      <div class="cart-content">
        <div v-if="cartItems.length === 0" class="empty-cart">
          <el-empty description="购物车是空的">
            <el-button type="primary" @click="cartDrawerVisible = false">
              去购物
            </el-button>
          </el-empty>
        </div>
        <div v-else>
          <div class="cart-items">
            <div
              v-for="(item, index) in cartItems"
              :key="item.id"
              class="cart-item"
            >
              <img
                :src="getProductImage(item)"
                :alt="item.name"
                class="cart-item-image"
              />
              <div class="cart-item-info">
                <h4>{{ item.name }}</h4>
                <div class="cart-item-price">
                  ¥{{ formatPrice(item.price) }}
                  <span class="cart-item-quantity">x {{ item.quantity }}</span>
                </div>
              </div>
              <div class="cart-item-actions">
                <el-input-number
                  v-model="item.quantity"
                  :min="1"
                  :max="item.maxQuantity"
                  size="small"
                  @change="updateCartItemQuantity(item)"
                />
                <el-button
                  size="mini"
                  type="danger"
                  icon="el-icon-delete"
                  circle
                  @click="removeFromCart(index)"
                />
              </div>
            </div>
          </div>

          <div class="cart-summary">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="商品数量">
                {{ cartTotals.items }}件
              </el-descriptions-item>
              <el-descriptions-item label="商品总价">
                ¥{{ formatPrice(cartTotals.amount) }}
              </el-descriptions-item>
              <el-descriptions-item label="运费">
                ¥{{ formatPrice(shippingFee) }}
              </el-descriptions-item>
              <el-descriptions-item label="优惠">
                -¥{{ formatPrice(discount) }}
              </el-descriptions-item>
              <el-descriptions-item label="总计">
                <span class="total-amount">¥{{ formatPrice(finalAmount) }}</span>
              </el-descriptions-item>
            </el-descriptions>

            <div class="checkout-actions">
              <el-button
                type="primary"
                size="large"
                :disabled="cartItems.length === 0"
                @click="proceedToCheckout"
                block
              >
                立即结算 ({{ cartItems.length }} 件商品)
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 商品详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="selectedProduct?.name"
      width="80%"
      class="product-detail-dialog"
    >
      <div v-if="selectedProduct" class="product-detail">
        <el-row :gutter="20">
          <el-col :span="12">
            <!-- 商品图片轮播 -->
            <el-carousel :interval="4000" type="card" height="400">
              <el-carousel-item v-for="(image, index) in selectedProduct.images" :key="index">
                <img
                  :src="image.url"
                  :alt="image.alt || `${selectedProduct.name}-${index}`"
                  class="detail-image"
                />
              </el-carousel-item>
            </el-carousel>
          </el-col>
          <el-col :span="12">
            <!-- 商品基本信息 -->
            <div class="detail-info">
              <h2 class="product-name">{{ selectedProduct.name }}</h2>
              <div class="product-price-large">
                <span class="current-price">¥{{ formatPrice(selectedProduct.discountedPrice) }}</span>
                <span
                  v-if="selectedProduct.discountedPrice < selectedProduct.retailPrice"
                  class="original-price"
                >¥{{ formatPrice(selectedProduct.retailPrice) }}</span>
              </div>

              <div class="product-specs">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="品牌">{{ selectedProduct.brand }}</el-descriptions-item>
                  <el-descriptions-item label="分类">{{ getCategoryName(selectedProduct.category) }}</el-descriptions-item>
                  <el-descriptions-item label="库存">
                    <span :class="{'text-warning': selectedProduct.isLowStock}">
                      {{ selectedProduct.inventory.quantity }}{{ getUnit(selectedProduct.unit) }}
                    </span>
                  </el-descriptions-item>
                  <el-descriptions-item label="销量">{{ selectedProduct.sales.totalSold || 0 }}</el-descriptions-item>
                  <el-descriptions-item label="评分">
                    <el-rate
                      v-model="selectedProduct.sales.averageRating"
                      disabled
                      show-score
                      text-color="#ff9900"
                    />
                  </el-descriptions-item>
                </el-descriptions>
              </div>

              <!-- 商品描述 -->
              <div class="product-description">
                <h4>商品描述</h4>
                <p>{{ selectedProduct.description }}</p>
              </div>

              <!-- 购买选项 -->
              <div class="purchase-options">
                <el-form :model="purchaseForm" :rules="purchaseRules" ref="purchaseForm">
                  <el-form-item label="购买数量" prop="quantity">
                    <el-input-number
                      v-model="purchaseForm.quantity"
                      :min="1"
                      :max="selectedProduct.inventory.quantity"
                      size="large"
                      style="width: 200px"
                    ></el-input-number>
                    <span class="unit-text">{{ getUnit(selectedProduct.unit) }}</span>
                  </el-form-item>
                </el-form>

                <div class="action-buttons">
                  <el-button
                    type="primary"
                    size="large"
                    :disabled="!selectedProduct.isInStock || purchaseForm.quantity > selectedProduct.inventory.quantity"
                    @click="addToCart(selectedProduct, purchaseForm.quantity)"
                  >
                    <i class="el-icon-shopping-cart-2"></i>
                    加入购物车
                  </el-button>
                  <el-button
                    size="large"
                    icon="el-icon-star-off"
                    @click="addToWishlist(selectedProduct)"
                  >
                    收藏
                  </el-button>
                </div>
              </div>
            </el-col>
        </el-row>

        <!-- 商品详情标签页 -->
        <el-tabs v-model="detailTabs" class="detail-tabs">
          <el-tab-pane label="商品详情" name="details">
            <div v-html="formatProductDetails(selectedProduct)"></div>
          </el-tab-pane>
          <el-tab-pane label="规格参数" name="specs">
            <div v-html="formatProductSpecs(selectedProduct)"></div>
          </el-tab-pane>
          <el-tab-pane label="使用说明" name="usage">
            <div v-html="formatProductUsage(selectedProduct)"></div>
          </el-tab-pane>
          <el-tab-pane label="用户评价" name="reviews">
            <div class="product-reviews">
              <div v-if="selectedProduct.reviews && selectedProduct.reviews.length > 0">
                <div
                  v-for="review in selectedProduct.reviews"
                  :key="review.id"
                  class="review-item"
                >
                  <div class="review-header">
                    <span class="reviewer-name">{{ review.reviewerName }}</span>
                    <el-rate
                      v-model="review.rating"
                      disabled
                      show-score
                      text-color="#ff9900"
                    />
                    <span class="review-date">{{ formatDate(review.createdAt) }}</span>
                  </div>
                  <div class="review-content">
                    <p>{{ review.comment }}</p>
                    <div v-if="review.images && review.images.length > 0" class="review-images">
                      <img
                        v-for="(image, index) in review.images"
                        :key="index"
                        :src="image"
                        :alt="`评价图片${index + 1}`"
                        class="review-image"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="no-reviews">
                <el-empty description="暂无评价"></el-empty>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ecommerceService from '@/services/ecommerceService'

export default {
  name: 'ProductMarketplace',
  props: {
    productType: {
      type: String,
      default: 'agricultural' // agricultural 或 farm_supply
    }
  },
  setup(props) {
    // 响应式数据
    const loading = ref(false)
    const products = ref([])
    const searchKeyword = ref('')
    const viewMode = ref('grid')
    const cartDrawerVisible = ref(false)
    const detailDialogVisible = ref(false)
    const selectedProduct = ref(null)
    const detailTabs = ref('details')

    // 筛选条件
    const filters = reactive({
      category: '',
      sortBy: 'createdAt',
      inStock: false,
      isRecommended: false,
      certification: [],
      minPrice: null,
      maxPrice: null
    })

    // 分页
    const pagination = reactive({
      page: 1,
      limit: 24,
      total: 0
    })

    // 购物车数据
    const cartItems = ref([])
    const cartTotals = reactive({
      items: 0,
      amount: 0,
      discount: 0,
      shipping: 0,
      finalAmount: 0
    })

    const purchaseForm = reactive({
      quantity: 1
    })

    // 表单验证规则
    const purchaseRules = {
      quantity: [
        { required: true, message: '请选择购买数量', trigger: 'blur' },
        { type: 'number', min: 1, message: '数量不能少于1', trigger: 'blur' }
      ]
    }

    // 商品分类
    const categories = computed(() => {
      if (props.productType === 'agricultural') {
        return [
          { label: '种子类', value: 'seed' },
          { label: '肥料类', value: 'fertilizer' },
          { label: '农药类', value: 'pesticide' },
          { label: '农机具', value: 'machinery' },
          { label: '工具类', value: 'tool' },
          { label: '饲料类', value: 'feed' },
          { label: '其他', value: 'other' }
        ]
      } else {
        return [
          { label: '蔬菜类', value: 'vegetable' },
          { label: '水果类', value: 'fruit' },
          { label: '粮食类', value: 'grain' },
          { label: '畜牧类', value: 'livestock' },
          { label: '家禽类', value: 'poultry' },
          { label: '水产类', value: 'aquatic' },
          { label: '加工类', value: 'processed' },
          { label: '特色产品', value: 'specialty' },
          { label: '其他', value: 'other' }
        ]
      }
    })

    // 分页商品
    const paginatedProducts = computed(() => {
      const start = (pagination.page - 1) * pagination.limit
      const end = start + pagination.limit
      return products.value.slice(start, end)
    })

    // 运费计算
    const shippingFee = computed(() => {
      // 根据商品重量、距离等计算运费
      const baseFee = 10
      const weight = cartItems.value.reduce((sum, item) => sum + (item.weight || 1) * item.quantity, 0)
      return Math.max(baseFee, baseFee + Math.ceil(weight / 10) * 5)
    })

    const discount = computed(() => {
      // 优惠券折扣计算
      return 0 // 暂时无折扣
    })

    const finalAmount = computed(() => {
      return cartTotals.amount + shippingFee.value - discount.value
    })

    // 方法
    const searchProducts = async () => {
      try {
        loading.value = true

        const params = {
          page: pagination.page,
          limit: pagination.limit,
          category: filters.category,
          sortBy: filters.sortBy,
          inStock: filters.inStock,
          isRecommended: filters.isRecommended,
          certification: filters.certification
        }

        if (searchKeyword.value) {
          params.keyword = searchKeyword.value
        }

        if (filters.minPrice) {
          params.minPrice = filters.minPrice
        }

        if (filters.maxPrice) {
          params.maxPrice = filters.maxPrice
        }

        let result
        if (props.productType === 'agricultural') {
          result = await ecommerceService.getAgriculturalProducts(params)
        } else {
          result = await ecommerceService.getFarmProductSupplies(params)
        }

        if (result.success) {
          products.value = result.data.products.map(product => ({
            ...product,
            discountedPrice: calculateDiscountedPrice(product),
            isInStock: product.inventory && product.inventory.quantity > 0,
            isLowStock: product.inventory && product.inventory.quantity <= product.inventory.lowStockThreshold
          }))
          pagination.total = result.data.pagination.total
        }
      } catch (error) {
        ElMessage.error(`搜索商品失败: ${error.message}`)
      } finally {
        loading.value = false
      }
    }

    const viewProductDetail = (product) => {
      selectedProduct.value = product
      detailDialogVisible.value = true
      purchaseForm.quantity = 1
    }

    const addToCart = (product, quantity = 1) => {
      const existingItemIndex = cartItems.value.findIndex(
        item => item.id === product.id
      )

      if (existingItemIndex !== -1) {
        // 更新数量
        const newQuantity = cartItems.value[existingItemIndex].quantity + quantity
        cartItems.value[existingItemIndex].quantity = Math.min(
          newQuantity,
          product.inventory.quantity
        )
        cartItems.value[existingItem].totalPrice = cartItems.value[existingItemIndex].price * cartItems.value[existingItem].quantity
      } else {
        // 添加新商品
        cartItems.value.push({
          id: product.id,
          name: product.name,
          price: product.discountedPrice,
          quantity: Math.min(quantity, product.inventory.quantity),
          totalPrice: product.discountedPrice * quantity,
          maxQuantity: product.inventory.quantity,
          unit: getUnit(product.unit),
          image: getProductImage(product),
          weight: product.weight || 1
        })
      }

      updateCartTotals()
      cartDrawerVisible.value = true

      ElMessage.success('已添加到购物车')
    }

    const removeFromCart = (index) => {
      cartItems.value.splice(index, 1)
      updateCartTotals()
    }

    const updateCartItemQuantity = (item) => {
      updateCartTotals()
    }

    const updateCartTotals = () => {
      cartTotals.items = cartItems.value.length
      cartTotals.amount = cartItems.value.reduce((sum, item) => sum + item.totalPrice, 0)
      cartTotals.discount = discount.value
    }

    const addToWishlist = (product) => {
      // 实现收藏功能
      ElMessage.success('已添加到收藏')
    }

    const proceedToCheckout = () => {
      // 跳转到结算页面
      ElMessage.success('正在跳转到结算页面...')
    }

    const handleSizeChange = (val) => {
      pagination.limit = val
      searchProducts()
    }

    const handleCurrentChange = (val) => {
      pagination.page = val
      searchProducts()
    }

    const getProductImage = (product) => {
      if (product.images && product.images.length > 0) {
        const mainImage = product.images.find(img => img.isMain)
        return mainImage ? mainImage.url : product.images[0].url
      }
      return '/images/placeholder-product.png'
    }

    const handleImageError = (e) => {
      e.target.src = '/images/placeholder-product.png'
    }

    const formatPrice = (price) => {
      return price ? price.toFixed(2) : '0.00'
    }

    const getUnit = (unit) => {
      const unitMap = {
        'piece': '个',
        'kg': '公斤',
        'ton': '吨',
        'bag': '袋',
        'bottle': '瓶',
        'box': '箱',
        'liter': '升',
        'meter': '米',
        'acre': '亩'
      }
      return unitMap[unit] || unit
    }

    const getCategoryName = (category) => {
      const categoryMap = {
        'seed': '种子类',
        'fertilizer': '肥料类',
        'pesticide': '农药类',
        'machinery': '农机具',
        'tool': '工具类',
        'feed': '饲料类',
        'other': '其他',
        'vegetable': '蔬菜类',
        'fruit': '水果类',
        'grain': '粮食类',
        'livestock': '畜牧类',
        'poultry': '家禽类',
        'aquatic': '水产类',
        'processed': '加工类',
        'specialty': '特色产品'
      }
      return categoryMap[category] || category
    }

    const calculateDiscountedPrice = (product) => {
      if (product.pricing && product.pricing.discount) {
        if (product.pricing.discount.percentage) {
          return product.pricing.retailPrice * (1 - product.pricing.discount.percentage / 100)
        }
        if (product.pricing.discount.amount) {
          return Math.max(0, product.pricing.retailPrice - product.pricing.discount.amount)
        }
      }
      return product.pricing.retailPrice || product.price || 0
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleString()
    }

    const formatProductDetails = (product) => {
      // 格式化商品详情HTML
      return product.description || '<p>暂无详情</p>'
    }

    const formatProductSpecs = (product) => {
      // 格式化规格参数HTML
      const specs = product.specifications || {}
      let html = '<div class="specs-list">'
      for (const [key, value] of Object.entries(specs)) {
        html += `<div class="spec-item"><span class="spec-label">${key}:</span><span class="spec-value">${value}</span></div>`
      }
      html += '</div>'
      return html
    }

    const formatProductUsage = (product) => {
      // 格式化使用说明HTML
      return product.usage ? `<div class="usage-content">${product.usage}</div>` : '<p>暂无使用说明</p>'
    }

    // 监听器
    watch(() => props.productType, () => {
      searchProducts()
    })

    // 生命周期
    onMounted(() => {
      searchProducts()
    })

    return {
      // 响应式数据
      loading,
      products,
      searchKeyword,
      viewMode,
      cartDrawerVisible,
      detailDialogVisible,
      selectedProduct,
      detailTabs,
      filters,
      pagination,
      cartItems,
      cartTotals,
      purchaseForm,
      purchaseRules,
      categories,
      paginatedProducts,
      shippingFee,
      discount,
      finalAmount,

      // 计算属性
      cartItemsLength: computed(() => cartItems.value.length),

      // 方法
      searchProducts,
      viewProductDetail,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      updateCartTotals,
      addToWishlist,
      proceedToCheckout,
      handleSizeChange,
      handleCurrentChange,
      getProductImage,
      handleImageError,
      formatPrice,
      getUnit,
      getCategoryName,
      calculateDiscountedPrice,
      formatDate,
      formatProductDetails,
      formatProductSpecs,
      formatProductUsage
    }
  }
}
</script>

<style scoped>
.product-marketplace {
  padding: 20px;
}

.search-filters {
  margin-bottom: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 4px;
}

.product-container {
  min-height: 600px;
}

.product-grid {
  margin-bottom: 20px;
}

.product-card {
  height: 100%;
  cursor: pointer;
  transition: transform 0.3s ease;
  overflow: hidden;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
  transition: transform 0.3s ease;
}

.product-image:hover img {
  transform: scale(1.05);
}

.discount-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #f56c6c;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  z-index: 10;
}

.out-of-stock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.out-of-stock-text {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.product-info {
  padding: 15px;
}

.product-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-description {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 40px;
}

.product-price {
  margin: 0 0 10px 0;
}

.current-price {
  color: #f56c6c;
  font-size: 18px;
  font-weight: 600;
}

.original-price {
  color: #909399;
  text-decoration: line-through;
  margin-left: 8px;
  font-size: 14px;
}

.product-meta {
  margin-bottom: 10px;
}

.product-meta .el-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.product-actions {
  display: flex;
  gap: 8px;
}

.product-actions .el-button {
  flex: 1;
}

.product-list {
  margin-bottom: 20px;
}

.product-list-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.product-list-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
}

.product-list-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-list-info {
  flex: 1;
}

.product-list-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.product-list-info p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
}

.product-list-meta {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.price-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.cart-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty-cart {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 60%;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
}

.cart-item:last-child {
  border-bottom: none;
}

.cart-item-image {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
}

.cart-item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-info {
  flex: 1;
}

.cart-item-info h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
  font-weight: 600;
}

.cart-item-price {
  font-size: 14px;
  color: #303133;
}

.cart-item-quantity {
  color: #909399;
  margin-left: 10px;
}

.cart-item-actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cart-summary {
  padding: 20px 0;
 0;
  border-top: 1px solid #ebeef5;
}

.total-amount {
  font-size: 18px;
  font-weight: bold;
  color: #f56c6c;
}

.checkout-actions {
  margin-top: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: center;
}

.product-detail-dialog .product-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-image {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 4px;
}

.detail-info .product-name {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.product-price-large {
  margin: 20px 0;
}

.product-price-large .current-price {
  font-size: 28px;
  color: #f56c6c;
  font-weight: 600;
}

.product-price-large .original-price {
  font-size: 16px;
  color: #909399;
  text-decoration: line-through;
  margin-left: 10px;
}

.product-specs {
  margin: 20px 0;
}

.purchase-options {
  margin: 30px 0;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 4px;
}

.unit-text {
  margin-left: 10px;
  color: #606266;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.action-buttons .el-button {
  flex: 1;
}

.detail-tabs {
  margin-top: 30px;
}

.product-reviews {
  margin-top: 20px;
}

.review-item {
  padding: 15px;
  border-bottom: 1px solid #ebeef5;
}

.review-item:last-child {
  border-bottom: none;
}

.review-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 15px;
}

.reviewer-name {
  font-weight: 600;
  color: #303133;
}

.review-date {
  font-size: 12px;
  color: #909399;
}

.review-content {
  margin-bottom: 10px;
}

.review-images {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.review-image {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
}

.review-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-reviews {
  padding: 40px 0;
  text-align: center;
}

.specs-list {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
}

.spec-item {
  display: flex;
  align-items: center;
}

.spec-label {
  font-weight: 600;
  color: #606266;
  margin-right: 10px;
}

.spec-value {
  color: #303133;
}

.usage-content {
  line-height: 1.6;
  color: #303133;
}
</style>