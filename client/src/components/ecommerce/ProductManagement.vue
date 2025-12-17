<template>
  <div class="product-management">
    <div class="page-header">
      <h2>商品管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        添加商品
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="输入商品名称或编号搜索"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.category" placeholder="选择分类" clearable>
            <el-option label="农产品" value="agriculture" />
            <el-option label="手工艺品" value="handicraft" />
            <el-option label="特色食品" value="food" />
            <el-option label="日用百货" value="daily_necessities" />
            <el-option label="农资用品" value="agricultural_supplies" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable>
            <el-option label="在售" value="active" />
            <el-option label="下架" value="inactive" />
            <el-option label="缺货" value="out_of_stock" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格范围">
          <el-input-number
            v-model="filters.minPrice"
            placeholder="最低价"
            :min="0"
            :precision="2"
            style="width: 120px"
          />
          <span style="margin: 0 10px;">-</span>
          <el-input-number
            v-model="filters.maxPrice"
            placeholder="最高价"
            :min="0"
            :precision="2"
            style="width: 120px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card total">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Goods /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalProducts }}</div>
              <div class="stat-label">总商品数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card active">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.activeProducts }}</div>
              <div class="stat-label">在售商品</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card orders">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><ShoppingCart /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayOrders }}</div>
              <div class="stat-label">今日订单</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card revenue">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatAmount(stats.todayRevenue) }}</div>
              <div class="stat-label">今日收入</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 商品列表 -->
    <el-card class="table-card">
      <el-table
        :data="productList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="商品编号" width="120" show-overflow-tooltip />
        <el-table-column label="商品图片" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.image || '/placeholder-image.png'"
              :preview-src-list="[row.image]"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px;"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag type="info">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            <span class="price">¥{{ formatAmount(row.price) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80">
          <template #default="{ row }">
            <span :class="getStockClass(row.stock)">{{ row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sales" label="销量" width="80" />
        <el-table-column prop="rating" label="评分" width="100">
          <template #default="{ row }">
            <el-rate
              v-model="row.rating"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                type="primary"
                link
                @click="handleView(row)"
              >
                查看
              </el-button>
              <el-button
                size="small"
                type="warning"
                link
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="success"
                link
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 'active' ? '下架' : '上架' }}
              </el-button>
              <el-button
                size="small"
                type="danger"
                link
                @click="handleDelete(row)"
              >
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

    <!-- 批量操作 -->
    <div v-if="selectedProducts.length > 0" class="batch-operations">
      <el-card>
        <div class="batch-info">
          已选择 <span class="count">{{ selectedProducts.length }}</span> 个商品
        </div>
        <div class="batch-actions">
          <el-button type="success" @click="handleBatchSetActive">批量上架</el-button>
          <el-button type="warning" @click="handleBatchSetInactive">批量下架</el-button>
          <el-button type="primary" @click="handleBatchUpdateCategory">批量分类</el-button>
          <el-button type="danger" @click="handleBatchDelete">批量删除</el-button>
        </div>
      </el-card>
    </div>

    <!-- 商品详情对话框 -->
    <el-dialog
      v-model="detailDialog.visible"
      title="商品详情"
      width="800px"
      :before-close="handleCloseDetailDialog"
    >
      <div v-if="detailDialog.data" class="product-detail">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="product-image">
              <el-image
                :src="detailDialog.data.image || '/placeholder-image.png'"
                :preview-src-list="[detailDialog.data.image]"
                fit="cover"
                style="width: 100%; max-height: 300px;"
              />
            </div>
          </el-col>
          <el-col :span="16">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="商品编号">{{ detailDialog.data.id }}</el-descriptions-item>
              <el-descriptions-item label="商品名称">{{ detailDialog.data.name }}</el-descriptions-item>
              <el-descriptions-item label="分类">
                <el-tag type="info">{{ getCategoryLabel(detailDialog.data.category) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusTagType(detailDialog.data.status)">
                  {{ getStatusLabel(detailDialog.data.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="价格">¥{{ formatAmount(detailDialog.data.price) }}</el-descriptions-item>
              <el-descriptions-item label="库存">{{ detailDialog.data.stock }}</el-descriptions-item>
              <el-descriptions-item label="销量">{{ detailDialog.data.sales }}</el-descriptions-item>
              <el-descriptions-item label="评分">
                <el-rate
                  v-model="detailDialog.data.rating"
                  disabled
                  show-score
                  text-color="#ff9900"
                />
              </el-descriptions-item>
              <el-descriptions-item label="重量">{{ detailDialog.data.weight || 'N/A' }}</el-descriptions-item>
              <el-descriptions-item label="规格">{{ detailDialog.data.specification || 'N/A' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatDateTime(detailDialog.data.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ formatDateTime(detailDialog.data.updatedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="商品描述" :span="2">{{ detailDialog.data.description }}</el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
      </div>
    </el-dialog>

    <!-- 创建/编辑商品对话框 -->
    <el-dialog
      v-model="formDialog.visible"
      :title="formDialog.isEdit ? '编辑商品' : '添加商品'"
      width="700px"
      :before-close="handleCloseFormDialog"
    >
      <el-form
        ref="productFormRef"
        :model="productForm"
        :rules="productFormRules"
        label-width="100px"
      >
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="productForm.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品分类" prop="category">
          <el-select v-model="productForm.category" placeholder="请选择商品分类" style="width: 100%">
            <el-option label="农产品" value="agriculture" />
            <el-option label="手工艺品" value="handicraft" />
            <el-option label="特色食品" value="food" />
            <el-option label="日用百货" value="daily_necessities" />
            <el-option label="农资用品" value="agricultural_supplies" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number
            v-model="productForm.price"
            :precision="2"
            :step="0.01"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number
            v-model="productForm.stock"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="重量">
          <el-input v-model="productForm.weight" placeholder="请输入商品重量（可选）" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="productForm.specification" placeholder="请输入商品规格（可选）" />
        </el-form-item>
        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="productForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入商品描述"
          />
        </el-form-item>
        <el-form-item label="商品图片">
          <el-upload
            class="product-image-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleImageUpload"
          >
            <img v-if="productForm.image" :src="productForm.image" class="product-image-preview" />
            <el-icon v-else class="product-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="productForm.status">
            <el-radio label="active">在售</el-radio>
            <el-radio label="inactive">下架</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseFormDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmitProduct" :loading="submitting">
            {{ formDialog.isEdit ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量分类对话框 -->
    <el-dialog
      v-model="batchCategoryDialog.visible"
      title="批量设置分类"
      width="400px"
    >
      <el-form :model="batchCategoryForm" label-width="100px">
        <el-form-item label="新分类" required>
          <el-select v-model="batchCategoryForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="农产品" value="agriculture" />
            <el-option label="手工艺品" value="handicraft" />
            <el-option label="特色食品" value="food" />
            <el-option label="日用百货" value="daily_necessities" />
            <el-option label="农资用品" value="agricultural_supplies" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="batchCategoryDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleConfirmBatchCategory">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Goods, Check, ShoppingCart, Money } from '@element-plus/icons-vue';
import apiService from '@/services/apiService';

// 响应式数据
const loading = ref(false);
const productList = ref([]);
const selectedProducts = ref([]);
const submitting = ref(false);

// 筛选条件
const filters = reactive({
  search: '',
  category: '',
  status: '',
  minPrice: null,
  maxPrice: null
});

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
});

// 统计数据
const stats = reactive({
  totalProducts: 0,
  activeProducts: 0,
  todayOrders: 0,
  todayRevenue: 0
});

// 详情对话框
const detailDialog = reactive({
  visible: false,
  data: null
});

// 表单对话框
const formDialog = reactive({
  visible: false,
  isEdit: false
});

// 批量分类对话框
const batchCategoryDialog = reactive({
  visible: false
});

// 商品表单
const productForm = reactive({
  id: '',
  name: '',
  category: '',
  price: 0,
  stock: 0,
  weight: '',
  specification: '',
  description: '',
  image: '',
  status: 'active'
});

// 批量分类表单
const batchCategoryForm = reactive({
  category: ''
});

// 表单验证规则
const productFormRules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 100, message: '商品名称长度在2到100个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择商品分类', trigger: 'change' }
  ],
  price: [
    { required: true, message: '请输入商品价格', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '价格必须大于0', trigger: 'blur' }
  ],
  stock: [
    { required: true, message: '请输入商品库存', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存不能为负数', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入商品描述', trigger: 'blur' }
  ]
};

// 表单引用
const productFormRef = ref(null);

// 方法
const loadProductList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    };

    // 清理空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });

    const response = await apiService.getProductList(params);

    if (response.success) {
      productList.value = response.data.products || [];
      pagination.total = response.pagination?.total || 0;
    } else {
      ElMessage.error(response.error || '获取商品列表失败');
    }
  } catch (error) {
    ElMessage.error('获取商品列表失败');
    console.error('加载商品列表错误:', error);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    // 模拟统计数据
    stats.totalProducts = 156;
    stats.activeProducts = 134;
    stats.todayOrders = 28;
    stats.todayRevenue = 3456.78;
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadProductList();
};

const handleReset = () => {
  filters.search = '';
  filters.category = '';
  filters.status = '';
  filters.minPrice = null;
  filters.maxPrice = null;
  pagination.page = 1;
  loadProductList();
};

const handleSizeChange = (size) => {
  pagination.limit = size;
  loadProductList();
};

const handleCurrentChange = (page) => {
  pagination.page = page;
  loadProductList();
};

const handleSelectionChange = (selection) => {
  selectedProducts.value = selection;
};

const handleView = (row) => {
  detailDialog.data = row;
  detailDialog.visible = true;
};

const handleEdit = (row) => {
  formDialog.isEdit = true;
  formDialog.visible = true;

  // 填充表单数据
  Object.keys(productForm).forEach(key => {
    productForm[key] = row[key] || '';
  });
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品 "${row.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    ElMessage.success('商品删除成功');
    loadProductList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除商品失败');
      console.error('删除商品错误:', error);
    }
  }
};

const handleToggleStatus = async (row) => {
  try {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? '上架' : '下架';

    await ElMessageBox.confirm(
      `确定要${action}商品 "${row.name}" 吗？`,
      `确认${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 实现状态切换逻辑
    row.status = newStatus;
    ElMessage.success(`商品${action}成功`);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
      console.error('切换商品状态错误:', error);
    }
  }
};

const showCreateDialog = () => {
  formDialog.isEdit = false;
  formDialog.visible = true;
  resetProductForm();
};

const resetProductForm = () => {
  Object.keys(productForm).forEach(key => {
    productForm[key] = key === 'price' || key === 'stock' ? 0 :
                    key === 'status' ? 'active' : '';
  });

  if (productFormRef.value) {
    productFormRef.value.resetFields();
  }
};

const handleImageUpload = (file) => {
  // 这里应该实现图片上传逻辑
  const reader = new FileReader();
  reader.onload = (e) => {
    productForm.image = e.target.result;
  };
  reader.readAsDataURL(file);
  return false; // 阻止默认上传
};

const handleSubmitProduct = async () => {
  if (!productFormRef.value) return;

  try {
    await productFormRef.value.validate();

    submitting.value = true;

    let response;
    if (formDialog.isEdit) {
      response = await apiService.updateProduct(productForm.id, productForm);
    } else {
      response = await apiService.createProduct(productForm);
    }

    if (response.success) {
      ElMessage.success(formDialog.isEdit ? '商品更新成功' : '商品创建成功');
      handleCloseFormDialog();
      loadProductList();
      loadStats();
    } else {
      ElMessage.error(response.error || '操作失败');
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('操作失败');
      console.error('提交商品表单错误:', error);
    }
  } finally {
    submitting.value = false;
  }
};

const handleCloseFormDialog = () => {
  formDialog.visible = false;
  resetProductForm();
};

const handleCloseDetailDialog = () => {
  detailDialog.visible = false;
  detailDialog.data = null;
};

const handleBatchSetActive = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要批量上架选中的 ${selectedProducts.value.length} 个商品吗？`,
      '批量上架',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    ElMessage.success('批量上架成功');
    loadProductList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量上架失败');
    }
  }
};

const handleBatchSetInactive = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要批量下架选中的 ${selectedProducts.value.length} 个商品吗？`,
      '批量下架',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    ElMessage.success('批量下架成功');
    loadProductList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量下架失败');
    }
  }
};

const handleBatchUpdateCategory = () => {
  if (selectedProducts.value.length === 0) {
    ElMessage.warning('请选择要操作的商品');
    return;
  }
  batchCategoryDialog.visible = true;
  batchCategoryForm.category = '';
};

const handleConfirmBatchCategory = async () => {
  if (!batchCategoryForm.category) {
    ElMessage.warning('请选择分类');
    return;
  }

  try {
    ElMessage.success('批量设置分类成功');
    batchCategoryDialog.visible = false;
    loadProductList();
  } catch (error) {
    ElMessage.error('批量设置分类失败');
  }
};

const handleBatchDelete = async () => {
  if (selectedProducts.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedProducts.value.length} 个商品吗？`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    ElMessage.success('批量删除成功');
    loadProductList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败');
    }
  }
};

// 工具方法
const formatAmount = (amount) => {
  if (!amount) return '0.00';
  return parseFloat(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDateTime = (dateTime) => {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('zh-CN');
};

const getCategoryLabel = (category) => {
  const categoryMap = {
    agriculture: '农产品',
    handicraft: '手工艺品',
    food: '特色食品',
    daily_necessities: '日用百货',
    agricultural_supplies: '农资用品'
  };
  return categoryMap[category] || category;
};

const getStatusLabel = (status) => {
  const statusMap = {
    active: '在售',
    inactive: '下架',
    out_of_stock: '缺货'
  };
  return statusMap[status] || status;
};

const getStatusTagType = (status) => {
  const typeMap = {
    active: 'success',
    inactive: 'warning',
    out_of_stock: 'danger'
  };
  return typeMap[status] || 'info';
};

const getStockClass = (stock) => {
  return {
    'stock-low': stock <= 10,
    'stock-normal': stock > 10 && stock <= 50,
    'stock-high': stock > 50
  };
};

// 生命周期
onMounted(() => {
  loadProductList();
  loadStats();
});
</script>

<style scoped>
.product-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  margin-right: 15px;
}

.stat-card.total .stat-icon {
  color: #409eff;
}

.stat-card.active .stat-icon {
  color: #67c23a;
}

.stat-card.orders .stat-icon {
  color: #e6a23c;
}

.stat-card.revenue .stat-icon {
  color: #f56c6c;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.table-card {
  min-height: 400px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.batch-operations {
  margin-top: 20px;
}

.batch-info {
  display: flex;
  align-items: center;
}

.batch-info .count {
  color: #409eff;
  font-weight: bold;
  margin: 0 5px;
}

.batch-actions {
  margin-left: auto;
}

.dialog-footer {
  text-align: right;
}

.product-detail {
  padding: 20px 0;
}

.product-image {
  text-align: center;
}

.price {
  color: #f56c6c;
  font-weight: bold;
}

.stock-low {
  color: #f56c6c;
  font-weight: bold;
}

.stock-normal {
  color: #e6a23c;
}

.stock-high {
  color: #67c23a;
}

.product-image-uploader .product-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.product-image-uploader .product-upload:hover {
  border-color: #409eff;
}

.product-image-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
}

.product-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.3s;
}

.product-uploader-icon:hover {
  border-color: #409eff;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #fafafa;
}

:deep(.el-rate__text) {
  font-size: 12px;
}
</style>