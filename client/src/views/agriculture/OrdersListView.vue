<template>
  <div class="orders-list">
    <el-container>
      <!-- 页面头部 -->
      <el-header class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <el-icon><Document /></el-icon>
              订单管理
            </h1>
            <p class="page-description">管理和查看农产品销售订单</p>
          </div>
          <div class="action-section">
            <el-button type="primary" @click="exportOrders">
              <el-icon><Download /></el-icon>
              导出订单
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
                  <el-icon><ShoppingCartFull /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ orderStats.total }}</div>
                  <div class="stat-label">总订单</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card processing">
                <div class="stat-icon">
                  <el-icon><Loading /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ orderStats.processing }}</div>
                  <div class="stat-label">处理中</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card completed">
                <div class="stat-icon">
                  <el-icon><CircleCheckFilled /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ orderStats.completed }}</div>
                  <div class="stat-label">已完成</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card revenue">
                <div class="stat-icon">
                  <el-icon><Money /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">¥{{ orderStats.totalRevenue.toLocaleString() }}</div>
                  <div class="stat-label">总营收</div>
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
                  placeholder="搜索订单号或客户姓名"
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
                  v-model="filterStatus"
                  placeholder="订单状态"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部状态" value="" />
                  <el-option label="待处理" value="pending" />
                  <el-option label="处理中" value="processing" />
                  <el-option label="已完成" value="completed" />
                  <el-option label="已取消" value="cancelled" />
                </el-select>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-date-picker
                  v-model="filterDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  @change="handleFilter"
                />
              </el-col>
            </el-row>
          </el-card>
        </div>

        <!-- 订单列表 -->
        <div class="orders-table">
          <el-card shadow="never">
            <el-table
              :data="filteredOrders"
              v-loading="loading"
              stripe
              style="width: 100%"
              @sort-change="handleSortChange"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="id" label="订单号" width="120" sortable>
                <template #default="{ row }">
                  <el-link type="primary" @click="viewOrder(row.id)" :underline="false">
                    #{{ row.id }}
                  </el-link>
                </template>
              </el-table-column>

              <el-table-column prop="customerName" label="客户姓名" width="120" sortable />

              <el-table-column prop="customerPhone" label="联系电话" width="130" />

              <el-table-column prop="totalAmount" label="订单金额" width="120" sortable>
                <template #default="{ row }">
                  <span class="amount">¥{{ row.totalAmount.toLocaleString() }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="itemsCount" label="商品数量" width="100" sortable />

              <el-table-column prop="status" label="状态" width="100" sortable>
                <template #default="{ row }">
                  <el-tag :type="getStatusTagType(row.status)">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="orderDate" label="下单时间" width="120" sortable>
                <template #default="{ row }">
                  {{ formatDate(row.orderDate) }}
                </template>
              </el-table-column>

              <el-table-column prop="deliveryDate" label="交付时间" width="120">
                <template #default="{ row }">
                  {{ row.deliveryDate || '-' }}
                </template>
              </el-table-column>

              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button type="text" size="small" @click="viewOrder(row.id)">
                    <el-icon><View /></el-icon>
                    查看
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click="updateOrderStatus(row.id)"
                    v-if="hasPermission('order:update') && row.status !== 'completed'"
                  >
                    <el-icon><Edit /></el-icon>
                    更新
                  </el-button>
                  <el-dropdown @command="command => handleAction(command, row)">
                    <el-button type="text" size="small">
                      更多<el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="details">订单详情</el-dropdown-item>
                        <el-dropdown-item command="track">物流跟踪</el-dropdown-item>
                        <el-dropdown-item command="invoice">开具发票</el-dropdown-item>
                        <el-dropdown-item command="cancel" divided v-if="row.status === 'pending'">
                          取消订单
                        </el-dropdown-item>
                        <el-dropdown-item
                          command="delete"
                          divided
                          v-if="hasPermission('order:delete')"
                        >
                          删除订单
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
                :total="orderStats.total"
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
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Document,
  Download,
  ShoppingCartFull,
  Loading,
  CircleCheckFilled,
  Money,
  Search,
  View,
  Edit,
  ArrowDown,
} from '@element-plus/icons-vue';

// 响应式数据
const loading = ref(false);
const orders = ref([]);
const searchQuery = ref('');
const filterStatus = ref('');
const filterDateRange = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const sortField = ref('');
const sortOrder = ref('');

// 模拟订单数据
const mockOrders = [
  {
    id: 1001,
    customerName: '张先生',
    customerPhone: '13800138001',
    customerAddress: '杭州市西湖区',
    items: [
      {
        productId: 1,
        productName: '有机茶叶',
        quantity: 2,
        unit: '斤',
        price: 280,
        subtotal: 560,
      },
    ],
    itemsCount: 2,
    totalAmount: 560,
    status: 'completed',
    orderDate: '2025-12-10',
    deliveryDate: '2025-12-12',
    deliveryAddress: '杭州市西湖区某某小区',
    paymentStatus: 'paid',
    remark: '请小心包装',
  },
  {
    id: 1002,
    customerName: '李女士',
    customerPhone: '13800138002',
    customerAddress: '杭州市拱墅区',
    items: [
      {
        productId: 2,
        productName: '山核桃',
        quantity: 5,
        unit: '斤',
        price: 120,
        subtotal: 600,
      },
    ],
    itemsCount: 5,
    totalAmount: 600,
    status: 'processing',
    orderDate: '2025-12-12',
    deliveryDate: null,
    deliveryAddress: '杭州市拱墅区某某街道',
    paymentStatus: 'unpaid',
    remark: '',
  },
  {
    id: 1003,
    customerName: '王先生',
    customerPhone: '13800138003',
    customerAddress: '杭州市滨江区',
    items: [
      {
        productId: 3,
        productName: '土鸡蛋',
        quantity: 30,
        unit: '个',
        price: 2.5,
        subtotal: 75,
      },
      {
        productId: 4,
        productName: '有机大米',
        quantity: 10,
        unit: '斤',
        price: 8,
        subtotal: 80,
      },
    ],
    itemsCount: 40,
    totalAmount: 155,
    status: 'pending',
    orderDate: '2025-12-13',
    deliveryDate: null,
    deliveryAddress: '杭州市滨江区某某小区',
    paymentStatus: 'unpaid',
    remark: '希望尽快配送',
  },
  {
    id: 1004,
    customerName: '赵女士',
    customerPhone: '13800138004',
    customerAddress: '杭州市上城区',
    items: [
      {
        productId: 5,
        productName: '土蜂蜜',
        quantity: 3,
        unit: '斤',
        price: 80,
        subtotal: 240,
      },
    ],
    itemsCount: 3,
    totalAmount: 240,
    status: 'pending',
    orderDate: '2025-12-13',
    deliveryDate: null,
    deliveryAddress: '杭州市上城区某某路',
    paymentStatus: 'unpaid',
    remark: '',
  },
  {
    id: 1005,
    customerName: '孙先生',
    customerPhone: '13800138005',
    customerAddress: '杭州市下城区',
    items: [
      {
        productId: 6,
        productName: '竹笋',
        quantity: 8,
        unit: '斤',
        price: 15,
        subtotal: 120,
      },
    ],
    itemsCount: 8,
    totalAmount: 120,
    status: 'cancelled',
    orderDate: '2025-12-11',
    deliveryDate: null,
    deliveryAddress: '杭州市下城区某某小区',
    paymentStatus: 'refunded',
    remark: '客户取消订单',
  },
];

// 计算属性
const orderStats = computed(() => {
  const stats = {
    total: orders.value.length,
    pending: orders.value.filter(order => order.status === 'pending').length,
    processing: orders.value.filter(order => order.status === 'processing').length,
    completed: orders.value.filter(order => order.status === 'completed').length,
    cancelled: orders.value.filter(order => order.status === 'cancelled').length,
    totalRevenue: orders.value
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.totalAmount, 0),
  };
  return stats;
});

const filteredOrders = computed(() => {
  let filtered = [...orders.value];

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(
      order =>
        order.id.toString().includes(searchQuery.value) ||
        order.customerName.includes(searchQuery.value) ||
        order.customerPhone.includes(searchQuery.value)
    );
  }

  // 状态过滤
  if (filterStatus.value) {
    filtered = filtered.filter(order => order.status === filterStatus.value);
  }

  // 日期过滤
  if (filterDateRange.value && filterDate.value.length === 2) {
    const [startDate, endDate] = filterDateRange.value;
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
    });
  }

  return filtered;
});

// 生命周期
onMounted(() => {
  loadOrders();
});

// 方法
const loadOrders = async () => {
  loading.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    orders.value = mockOrders;
  } catch (error) {
    ElMessage.error('加载订单列表失败');
    console.error('Load orders error:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleFilter = () => {
  currentPage.value = 1;
};

const handleSortChange = ({ prop, order }) => {
  sortField.value = prop;
  sortOrder.value = order;
};

const handleSizeChange = size => {
  pageSize.value = size;
  currentPage.value = 1;
};

const handleCurrentChange = page => {
  currentPage.value = page;
};

const viewOrder = id => {
  ElMessage.info(`查看订单详情: #${id}`);
};

const updateOrderStatus = async id => {
  try {
    const order = orders.value.find(o => o.id === id);
    if (!order) return;

    const statusOptions = [
      { label: '待处理', value: 'pending' },
      { label: '处理中', value: 'processing' },
      { label: '已完成', value: 'completed' },
    ];

    const { value } = await ElMessageBox.prompt('更新订单状态', '请选择新的订单状态', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'select',
      inputOptions: statusOptions,
      inputValue: order.status,
    });

    if (value) {
      order.status = value;
      ElMessage.success('订单状态更新成功');
    }
  } catch (error) {
    // 用户取消
  }
};

const exportOrders = () => {
  ElMessage.info('导出订单功能开发中');
};

const handleAction = async (command, order) => {
  switch (command) {
    case 'details':
      ElMessage.info(`查看订单详情: #${order.id}`);
      break;
    case 'track':
      ElMessage.info(`物流跟踪: #${order.id}`);
      break;
    case 'invoice':
      ElMessage.info(`开具发票: #${order.id}`);
      break;
    case 'cancel':
      try {
        await ElMessageBox.confirm(`确定要取消订单#${order.id}吗？`, '确认取消', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        order.status = 'cancelled';
        order.paymentStatus = 'refunded';
        ElMessage.success('订单已取消');
      } catch (error) {
        // 用户取消
      }
      break;
    case 'delete':
      try {
        await ElMessageBox.confirm(`确定要删除订单#${order.id}吗？此操作不可恢复。`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        const index = orders.value.findIndex(o => o.id === order.id);
        if (index > -1) {
          orders.value.splice(index, 1);
        }

        ElMessage.success('订单删除成功');
      } catch (error) {
        // 用户取消删除
      }
      break;
  }
};

// 辅助方法
const formatDate = dateString => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('zh-CN');
};

const getStatusTagType = status => {
  const statusMap = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    cancelled: 'danger',
  };
  return statusMap[status] || 'info';
};

const getStatusLabel = status => {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

// 权限检查
const hasPermission = permission => {
  // 模拟权限检查
  return true;
};
</script>

<style lang="scss" scoped>
.orders-list {
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
      color: #f56c6c;
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

  &.processing .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  &.completed .stat-icon {
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

.orders-table {
  .amount {
    font-weight: 600;
    color: #f56c6c;
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
