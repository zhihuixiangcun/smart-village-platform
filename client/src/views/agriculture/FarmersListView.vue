<template>
  <div class="farmers-list">
    <el-container>
      <!-- 页面头部 -->
      <el-header class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <el-icon><User /></el-icon>
              农户管理
            </h1>
            <p class="page-description">管理和查看农户信息及认证状态</p>
          </div>
          <div class="action-section">
            <el-button type="primary" @click="exportFarmers">
              <el-icon><Download /></el-icon>
              导出农户
            </el-button>
            <el-button type="success" @click="addFarmer" v-if="hasPermission('farmer:add')">
              <el-icon><Plus /></el-icon>
              添加农户
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
                  <el-icon><User /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ farmerStats.total }}</div>
                  <div class="stat-label">总农户</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card certified">
                <div class="stat-icon">
                  <el-icon><CircleCheckFilled /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ farmerStats.certified }}</div>
                  <div class="stat-label">已认证</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card pending">
                <div class="stat-icon">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ farmerStats.pending }}</div>
                  <div class="stat-label">待认证</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card active">
                <div class="stat-icon">
                  <el-icon><TrendCharts /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ farmerStats.active }}</div>
                  <div class="stat-label">活跃农户</div>
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
                  placeholder="搜索农户姓名或手机号"
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
                  placeholder="认证状态"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部状态" value="" />
                  <el-option label="已认证" value="certified" />
                  <el-option label="待认证" value="pending" />
                  <el-option label="未认证" value="uncertified" />
                </el-select>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterVillage"
                  placeholder="所属村庄"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部村庄" value="" />
                  <el-option label="凤凰村" value="凤凰村" />
                  <el-option label="绿水村" value="绿水村" />
                </el-select>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterProductType"
                  placeholder="主营产品"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部类型" value="" />
                  <el-option label="粮食作物" value="grain" />
                  <el-option label="经济作物" value="cash" />
                  <el-option label="蔬菜水果" value="vegetable" />
                  <el-option label="畜禽养殖" value="livestock" />
                </el-select>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <!-- 农户列表 -->
        <div class="farmers-table">
          <el-card shadow="never">
            <el-table
              :data="filteredFarmers"
              v-loading="loading"
              stripe
              style="width: 100%"
              @sort-change="handleSortChange"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="name" label="农户姓名" width="120" sortable>
                <template #default="{ row }">
                  <el-link type="primary" @click="viewFarmer(row.id)" :underline="false">
                    {{ row.name }}
                  </el-link>
                </template>
              </el-table-column>

              <el-table-column prop="phone" label="联系电话" width="130" />

              <el-table-column prop="village" label="所属村庄" width="100" sortable />

              <el-table-column prop="productType" label="主营产品" width="120">
                <template #default="{ row }">
                  <el-tag :type="getProductTypeTagType(row.productType)" size="small">
                    {{ getProductTypeLabel(row.productType) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="landArea" label="耕地面积" width="100" sortable>
                <template #default="{ row }"> {{ row.landArea }}亩 </template>
              </el-table-column>

              <el-table-column prop="certificationStatus" label="认证状态" width="100" sortable>
                <template #default="{ row }">
                  <el-tag :type="getCertificationTagType(row.certificationStatus)">
                    {{ getCertificationLabel(row.certificationStatus) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="annualIncome" label="年收入" width="120" sortable>
                <template #default="{ row }">
                  <span class="income">¥{{ row.annualIncome.toLocaleString() }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="joinDate" label="入驻时间" width="120" sortable>
                <template #default="{ row }">
                  {{ formatDate(row.joinDate) }}
                </template>
              </el-table-column>

              <el-table-column prop="lastActive" label="最后活跃" width="120">
                <template #default="{ row }">
                  {{ formatDate(row.lastActive) }}
                </template>
              </el-table-column>

              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button type="text" size="small" @click="viewFarmer(row.id)">
                    <el-icon><View /></el-icon>
                    查看
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click="editFarmer(row.id)"
                    v-if="hasPermission('farmer:edit')"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click="certifyFarmer(row.id)"
                    v-if="hasPermission('farmer:certify') && row.certificationStatus === 'pending'"
                  >
                    <el-icon><CircleCheckFilled /></el-icon>
                    认证
                  </el-button>
                  <el-dropdown @command="command => handleAction(command, row)">
                    <el-button type="text" size="small">
                      更多<el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="products">查看产品</el-dropdown-item>
                        <el-dropdown-item command="orders">订单记录</el-dropdown-item>
                        <el-dropdown-item command="statistics">统计分析</el-dropdown-item>
                        <el-dropdown-item command="export">导出数据</el-dropdown-item>
                        <el-dropdown-item
                          command="delete"
                          divided
                          v-if="hasPermission('farmer:delete')"
                        >
                          删除农户
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
                :total="farmerStats.total"
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
  User,
  Download,
  Plus,
  CircleCheckFilled,
  Clock,
  TrendCharts,
  Search,
  View,
  Edit,
  ArrowDown,
} from '@element-plus/icons-vue';

// 响应式数据
const loading = ref(false);
const farmers = ref([]);
const searchQuery = ref('');
const filterStatus = ref('');
const filterVillage = ref('');
const filterProductType = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const sortField = ref('');
const sortOrder = ref('');

// 模拟农户数据
const mockFarmers = [
  {
    id: 1,
    name: '张大爷',
    phone: '13800138001',
    village: '凤凰村',
    address: '凤凰村东街12号',
    productType: 'grain',
    landArea: 15,
    certificationStatus: 'certified',
    certificationDate: '2024-05-15',
    annualIncome: 120000,
    products: ['有机大米', '玉米', '小麦'],
    joinDate: '2024-01-15',
    lastActive: '2025-12-13',
  },
  {
    id: 2,
    name: '李大妈',
    phone: '13800138002',
    village: '绿水村',
    address: '绿水村西街28号',
    productType: 'vegetable',
    landArea: 8,
    certificationStatus: 'certified',
    certificationDate: '2024-06-20',
    annualIncome: 85000,
    products: ['有机蔬菜', '番茄', '黄瓜'],
    joinDate: '2024-02-10',
    lastActive: '2025-12-12',
  },
  {
    id: 3,
    name: '王师傅',
    phone: '13800138003',
    village: '凤凰村',
    address: '凤凰村南街5号',
    productType: 'livestock',
    landArea: 12,
    certificationStatus: 'pending',
    certificationDate: null,
    annualIncome: 95000,
    products: ['土鸡', '土鸡蛋', '蜂蜜'],
    joinDate: '2024-03-08',
    lastActive: '2025-12-11',
  },
  {
    id: 4,
    name: '赵大姐',
    phone: '13800138004',
    village: '绿水村',
    address: '绿水村北街16号',
    productType: 'cash',
    landArea: 20,
    certificationStatus: 'certified',
    certificationDate: '2024-04-10',
    annualIncome: 150000,
    products: ['山核桃', '茶叶', '竹笋'],
    joinDate: '2024-01-20',
    lastActive: '2025-12-13',
  },
  {
    id: 5,
    name: '孙大哥',
    phone: '13800138005',
    village: '凤凰村',
    address: '凤凰村西街8号',
    productType: 'vegetable',
    landArea: 10,
    certificationStatus: 'uncertified',
    certificationDate: null,
    annualIncome: 65000,
    products: ['大棚蔬菜', '草莓', '西瓜'],
    joinDate: '2024-04-15',
    lastActive: '2025-12-10',
  },
  {
    id: 6,
    name: '陈阿姨',
    phone: '13800138006',
    village: '绿水村',
    address: '绿水村东街22号',
    productType: 'grain',
    landArea: 18,
    certificationStatus: 'pending',
    certificationDate: null,
    annualIncome: 110000,
    products: ['优质大米', '大豆', '花生'],
    joinDate: '2024-05-01',
    lastActive: '2025-12-09',
  },
  {
    id: 7,
    name: '刘大叔',
    phone: '13800138007',
    village: '凤凰村',
    address: '凤凰村北街11号',
    productType: 'livestock',
    landArea: 25,
    certificationStatus: 'certified',
    certificationDate: '2024-03-25',
    annualIncome: 180000,
    products: ['生态猪', '土鸡', '山羊'],
    joinDate: '2024-02-28',
    lastActive: '2025-12-13',
  },
  {
    id: 8,
    name: '周妹子',
    phone: '13800138008',
    village: '绿水村',
    address: '绿水村南街19号',
    productType: 'vegetable',
    landArea: 6,
    certificationStatus: 'certified',
    certificationDate: '2024-07-15',
    annualIncome: 72000,
    products: ['有机蔬菜', '食用菌', '香椿'],
    joinDate: '2024-06-10',
    lastActive: '2025-12-12',
  },
];

// 计算属性
const farmerStats = computed(() => {
  const stats = {
    total: farmers.value.length,
    certified: farmers.value.filter(farmer => farmer.certificationStatus === 'certified').length,
    pending: farmers.value.filter(farmer => farmer.certificationStatus === 'pending').length,
    uncertified: farmers.value.filter(farmer => farmer.certificationStatus === 'uncertified')
      .length,
    active: farmers.value.filter(farmer => {
      const lastActiveDate = new Date(farmer.lastActive);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return lastActiveDate > weekAgo;
    }).length,
  };
  return stats;
});

const filteredFarmers = computed(() => {
  let filtered = [...farmers.value];

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(
      farmer => farmer.name.includes(searchQuery.value) || farmer.phone.includes(searchQuery.value)
    );
  }

  // 状态过滤
  if (filterStatus.value) {
    filtered = filtered.filter(farmer => farmer.certificationStatus === filterStatus.value);
  }

  // 村庄过滤
  if (filterVillage.value) {
    filtered = filtered.filter(farmer => farmer.village === filterVillage.value);
  }

  // 产品类型过滤
  if (filterProductType.value) {
    filtered = filtered.filter(farmer => farmer.productType === filterProductType.value);
  }

  return filtered;
});

// 生命周期
onMounted(() => {
  loadFarmers();
});

// 方法
const loadFarmers = async () => {
  loading.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));
    farmers.value = mockFarmers;
  } catch (error) {
    ElMessage.error('加载农户列表失败');
    console.error('Load farmers error:', error);
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

const viewFarmer = id => {
  ElMessage.info(`查看农户详情: #${id}`);
};

const editFarmer = id => {
  ElMessage.info(`编辑农户信息: #${id}`);
};

const addFarmer = () => {
  ElMessage.info('添加农户功能开发中');
};

const certifyFarmer = async id => {
  try {
    const farmer = farmers.value.find(f => f.id === id);
    if (!farmer) return;

    await ElMessageBox.confirm(`确定要认证农户"${farmer.name}"吗？`, '确认认证', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    farmer.certificationStatus = 'certified';
    farmer.certificationDate = new Date().toISOString().split('T')[0];
    ElMessage.success('农户认证成功');
  } catch (error) {
    // 用户取消
  }
};

const exportFarmers = () => {
  ElMessage.info('导出农户功能开发中');
};

const handleAction = async (command, farmer) => {
  switch (command) {
    case 'products':
      ElMessage.info(`查看农户${farmer.name}的产品列表`);
      break;
    case 'orders':
      ElMessage.info(`查看农户${farmer.name}的订单记录`);
      break;
    case 'statistics':
      ElMessage.info(`查看农户${farmer.name}的统计分析`);
      break;
    case 'export':
      ElMessage.info(`导出农户${farmer.name}的数据`);
      break;
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `确定要删除农户"${farmer.name}"吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );

        const index = farmers.value.findIndex(f => f.id === farmer.id);
        if (index > -1) {
          farmers.value.splice(index, 1);
        }

        ElMessage.success('农户删除成功');
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

const getProductTypeTagType = type => {
  const typeMap = {
    grain: 'success',
    cash: 'warning',
    vegetable: 'primary',
    livestock: 'danger',
  };
  return typeMap[type] || 'info';
};

const getProductTypeLabel = type => {
  const typeMap = {
    grain: '粮食作物',
    cash: '经济作物',
    vegetable: '蔬菜水果',
    livestock: '畜禽养殖',
  };
  return typeMap[type] || type;
};

const getCertificationTagType = status => {
  const statusMap = {
    certified: 'success',
    pending: 'warning',
    uncertified: 'info',
  };
  return statusMap[status] || 'info';
};

const getCertificationLabel = status => {
  const statusMap = {
    certified: '已认证',
    pending: '待认证',
    uncertified: '未认证',
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
.farmers-list {
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

  &.certified .stat-icon {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  &.pending .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  &.active .stat-icon {
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

.farmers-table {
  .income {
    font-weight: 600;
    color: #67c23a;
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
