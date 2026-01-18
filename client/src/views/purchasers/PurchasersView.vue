<template>
  <div class="purchasers-view">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1 class="page-title">采购商管理</h1>
          <el-button type="primary" @click="handleAddPurchaser">
            <el-icon><Plus /></el-icon>
            添加采购商
          </el-button>
        </div>
      </el-header>
      <el-main class="page-main">
        <el-card>
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <el-input
              v-model="searchText"
              placeholder="搜索采购商姓名/手机号"
              style="width: 240px"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="filterType" placeholder="采购商类型" style="width: 150px" clearable>
              <el-option label="个人采购商" value="individual" />
              <el-option label="商家采购商" value="business" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="账户状态" style="width: 140px" clearable>
              <el-option label="待审核" value="pending" />
              <el-option label="已激活" value="active" />
              <el-option label="已暂停" value="suspended" />
            </el-select>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>

          <!-- 采购商列表 -->
          <el-table :data="purchaserList" stripe v-loading="loading">
            <el-table-column prop="basicInfo.name" label="姓名" width="140" />
            <el-table-column prop="basicInfo.phone" label="手机号" width="140" />
            <el-table-column prop="purchaserType" label="类型" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="row.purchaserType === 'individual' ? 'success' : 'warning'"
                  size="small"
                >
                  {{ row.purchaserType === 'individual' ? '个人' : '商家' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="认证状态" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.verification?.isVerified" type="success" size="small">
                  <el-icon><CircleCheck /></el-icon>
                  已认证
                </el-tag>
                <el-tag v-else type="info" size="small">未认证</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="statistics.totalOrders" label="订单数" width="100" />
            <el-table-column prop="createdAt" label="注册时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="viewProfile(row)">查看详情</el-button>
                <el-button size="small" type="primary" @click="editPurchaser(row)">编辑</el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  size="small"
                  type="success"
                  @click="approvePurchaser(row)"
                >
                  审核
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, CircleCheck } from '@element-plus/icons-vue';
import api from '@/api';

const router = useRouter();

const loading = ref(false);
const searchText = ref('');
const filterType = ref('');
const filterStatus = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const purchaserList = ref([]);

// 获取采购商列表
const fetchPurchaserList = async () => {
  loading.value = true;
  try {
    // 这里暂时使用模拟数据，实际应该调用API
    purchaserList.value = [
      {
        _id: '1',
        basicInfo: { name: '张三', phone: '138****1234' },
        purchaserType: 'individual',
        status: 'active',
        verification: { isVerified: true },
        statistics: { totalOrders: 15 },
        createdAt: new Date('2024-01-15'),
      },
      {
        _id: '2',
        basicInfo: { name: '李四农产品公司', phone: '139****5678' },
        purchaserType: 'business',
        status: 'pending',
        verification: { isVerified: false },
        statistics: { totalOrders: 0 },
        createdAt: new Date('2024-03-20'),
      },
    ];
    total.value = 2;
  } catch (error) {
    console.error('获取采购商列表失败', error);
    ElMessage.error('获取采购商列表失败');
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  fetchPurchaserList();
};

// 重置
const handleReset = () => {
  searchText.value = '';
  filterType.value = '';
  filterStatus.value = '';
  currentPage.value = 1;
  fetchPurchaserList();
};

// 分页
const handleSizeChange = size => {
  pageSize.value = size;
  fetchPurchaserList();
};

const handlePageChange = page => {
  currentPage.value = page;
  fetchPurchaserList();
};

// 获取状态类型
const getStatusType = status => {
  const types = { pending: 'info', active: 'success', suspended: 'warning', deleted: 'danger' };
  return types[status] || 'info';
};

// 获取状态标签
const getStatusLabel = status => {
  const labels = { pending: '待审核', active: '已激活', suspended: '已暂停', deleted: '已删除' };
  return labels[status] || status;
};

// 格式化日期
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

// 查看个人中心
const viewProfile = row => {
  router.push(`/purchaser/profile`);
};

// 添加采购商
const handleAddPurchaser = () => {
  router.push('/auth/registration-wizard');
};

// 编辑采购商
const editPurchaser = row => {
  ElMessage.info('编辑功能开发中');
};

// 审核采购商
const approvePurchaser = async row => {
  try {
    await ElMessageBox.confirm(`确认审核通过 ${row.basicInfo.name}？`, '审核确认', {
      type: 'warning',
    });
    ElMessage.success('审核通过');
    await fetchPurchaserList();
  } catch (error) {
    // 用户取消
  }
};

onMounted(() => {
  fetchPurchaserList();
});
</script>

<style lang="scss" scoped>
.purchasers-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%);
}

.page-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-bottom: 2px solid rgba(76, 175, 80, 0.1);
  padding: 0 32px;
  height: 72px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(139, 195, 74, 0.03) 0%, transparent 70%);
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  position: relative;
  z-index: 1;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #2e7d32;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title::before {
  content: '';
  width: 4px;
  height: 28px;
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
}

.page-main {
  padding: 28px;
}

.page-main :deep(.el-card) {
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.filter-bar {
  display: flex;
  gap: 14px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  padding: 8px;
}

.filter-bar :deep(.el-input) {
  flex: 1;
  min-width: 200px;
}

.filter-bar :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-bar :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15), 0 2px 6px rgba(0, 0, 0, 0.08);
}

.filter-bar :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2), 0 2px 6px rgba(0, 0, 0, 0.08);
  border-color: #4caf50;
}

.filter-bar :deep(.el-select) {
  min-width: 160px;
}

.filter-bar :deep(.el-select .el-input__wrapper) {
  border-radius: 12px;
}

.filter-bar :deep(.el-button) {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-bar :deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.filter-bar :deep(.el-button--primary) {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  border: none;
}

.filter-bar :deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #43a047 0%, #7cb342 100%);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.3);
}

.page-main :deep(.el-table) {
  border-radius: 16px;
  overflow: hidden;
}

.page-main :deep(.el-table__header-wrapper) {
  background: linear-gradient(90deg, #f1f8e9 0%, #dcedc8 100%);
}

.page-main :deep(.el-table th) {
  background: transparent;
  color: #2e7d32;
  font-weight: 700;
  font-size: 14px;
}

.page-main :deep(.el-table td) {
  padding: 16px 12px;
  font-size: 14px;
}

.page-main :deep(.el-table__row:hover) {
  background: rgba(76, 175, 80, 0.05);
}

.page-main :deep(.el-table__row.el-table__row--striped) {
  background: rgba(76, 175, 80, 0.03);
}

.page-main :deep(.el-table__row.el-table__row--striped:hover) {
  background: rgba(76, 175, 80, 0.08);
}

.page-main :deep(.el-tag) {
  border-radius: 8px;
  font-weight: 600;
  padding: 6px 14px;
}

.page-main :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: transparent;
}

.pagination-container {
  margin-top: 28px;
  display: flex;
  justify-content: center;
  padding: 16px;
}

.pagination-container :deep(.el-pagination) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.pagination-container :deep(.el-pagination.is-background .btn-next),
.pagination-container :deep(.el-pagination.is-background .btn-prev),
.pagination-container :deep(.el-pagination.is-background .el-pager li) {
  background: white;
  border-radius: 10px;
  margin: 0 4px;
  font-weight: 600;
  color: #689f38;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: all 0.3s;
}

.pagination-container :deep(.el-pagination.is-background .btn-next:hover),
.pagination-container :deep(.el-pagination.is-background .btn-prev:hover),
.pagination-container :deep(.el-pagination.is-background .el-pager li:hover) {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.pagination-container :deep(.el-pagination.is-background .el-pager li.is-active) {
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

@media (max-width: 768px) {
  .page-header {
    padding: 0 20px;
    height: 64px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-main {
    padding: 16px;
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-bar :deep(.el-input),
  .filter-bar :deep(.el-select) {
    width: 100%;
  }

  .filter-bar :deep(.el-button) {
    width: 100%;
  }
}
</style>
