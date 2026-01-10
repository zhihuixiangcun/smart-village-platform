<template>
  <div class="family-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>家庭管理</h1>
      <p>管理家庭成员信息，实现"一户一码"数字化管理</p>
    </div>

    <!-- 操作工具栏 -->
    <div class="toolbar">
      <el-button type="primary" icon="Plus" @click="showCreateDialog = true"> 新建家庭 </el-button>
      <el-button icon="Search" @click="showSearchDialog = true"> 高级搜索 </el-button>
      <el-button icon="Download" @click="exportData"> 导出数据 </el-button>
      <div class="right-tools">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索家庭名称或编码"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><House /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalFamilies || 0 }}</div>
              <div class="stat-label">总户数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalMembers || 0 }}</div>
              <div class="stat-label">总人数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.avgFamilySize || 0 }}</div>
              <div class="stat-label">户均人数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><Star /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.specialFamilies || 0 }}</div>
              <div class="stat-label">特殊家庭</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 家庭列表 -->
    <el-card class="family-list">
      <template #header>
        <div class="card-header">
          <span>家庭列表</span>
          <div class="header-actions">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="card">卡片视图</el-radio-button>
              <el-radio-button label="table">表格视图</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <!-- 表格视图 -->
      <el-table
        v-if="viewMode === 'table'"
        v-loading="loading"
        :data="familyList"
        style="width: 100%"
      >
        <el-table-column prop="familyCode" label="家庭编码" width="150" />
        <el-table-column prop="familyName" label="户主姓名" width="120" />
        <el-table-column prop="address" label="地址" min-width="200">
          <template #default="{ row }">
            {{ row.address.province }}{{ row.address.city }}{{ row.address.county }}
            {{ row.address.town }}{{ row.address.village }}{{ row.address.detail }}
          </template>
        </el-table-column>
        <el-table-column prop="memberCount" label="家庭成员" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info">{{ row.memberCount }}人</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="familyType" label="家庭类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getFamilyTypeTagType(row.familyType)">
              {{ row.familyType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contact.primaryPhone" label="联系电话" width="150" />
        <el-table-column prop="tags" label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags" :key="tag" size="small" style="margin-right: 5px">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewFamily(row)"> 查看 </el-button>
            <el-button link type="primary" @click="editFamily(row)"> 编辑 </el-button>
            <el-button link type="danger" @click="deleteFamily(row)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 卡片视图 -->
      <div v-else class="card-view">
        <el-row :gutter="20">
          <el-col
            v-for="family in familyList"
            :key="family._id"
            :span="8"
            style="margin-bottom: 20px"
          >
            <el-card class="family-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span class="family-name">{{ family.familyName }}</span>
                  <el-tag :type="getFamilyTypeTagType(family.familyType)" size="small">
                    {{ family.familyType }}
                  </el-tag>
                </div>
              </template>

              <div class="family-info">
                <div class="info-item">
                  <span class="label">家庭编码：</span>
                  <span class="value">{{ family.familyCode }}</span>
                </div>
                <div class="info-item">
                  <span class="label">家庭成员：</span>
                  <span class="value">{{ family.memberCount }}人</span>
                </div>
                <div class="info-item">
                  <span class="label">联系电话：</span>
                  <span class="value">{{ family.contact.primaryPhone }}</span>
                </div>
                <div class="info-item">
                  <span class="label">地址：</span>
                  <span class="value address">
                    {{ family.address.village }}{{ family.address.detail }}
                  </span>
                </div>
              </div>

              <div class="family-tags" v-if="family.tags.length > 0">
                <el-tag
                  v-for="tag in family.tags"
                  :key="tag"
                  size="small"
                  style="margin-right: 5px; margin-bottom: 5px"
                >
                  {{ tag }}
                </el-tag>
              </div>

              <div class="card-actions">
                <el-button size="small" @click="viewFamily(row)">查看详情</el-button>
                <el-button size="small" type="primary" @click="editFamily(row)">编辑</el-button>
                <el-dropdown @command="handleMoreAction">
                  <el-button size="small">
                    更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{ action: 'members', family }">
                        成员管理
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'agents', family }">
                        代理设置
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'qrcode', family }">
                        生成二维码
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'delete', family }" divided>
                        删除家庭
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 创建家庭对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="新建家庭"
      width="800px"
      :close-on-click-modal="false"
    >
      <FamilyForm
        :family="currentFamily"
        :mode="formMode"
        @submit="handleFamilySubmit"
        @cancel="showCreateDialog = false"
      />
    </el-dialog>

    <!-- 搜索对话框 -->
    <el-dialog v-model="showSearchDialog" title="高级搜索" width="600px">
      <FamilySearchForm
        :filters="searchFilters"
        @search="handleSearchSubmit"
        @reset="handleSearchReset"
      />
    </el-dialog>

    <!-- 家庭详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`${currentFamily?.familyName} - 家庭详情`"
      width="1000px"
    >
      <FamilyDetail
        v-if="currentFamily"
        :family="currentFamily"
        @edit="editFamily"
        @refresh="loadFamilyList"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  House,
  User,
  UserFilled,
  Star,
  Plus,
  Search,
  Download,
  ArrowDown,
} from '@element-plus/icons-vue';
import FamilyForm from '@/components/resident/FamilyForm.vue';
import FamilySearchForm from '@/components/resident/FamilySearchForm.vue';
import FamilyDetail from '@/components/resident/FamilyDetail.vue';
import { familyApi } from '@/api/family';
import { exportToExcel } from '@/utils/export';

// 响应式数据
const loading = ref(false);
const familyList = ref([]);
const stats = ref({});
const viewMode = ref('card');
const searchKeyword = ref('');
const showCreateDialog = ref(false);
const showSearchDialog = ref(false);
const showDetailDialog = ref(false);
const currentFamily = ref(null);
const formMode = ref('create');
const searchFilters = ref({});

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 家庭类型标签颜色映射
const getFamilyTypeTagType = type => {
  const typeMap = {
    普通户: '',
    低保户: 'danger',
    特困户: 'warning',
    独生户: 'success',
    双女户: 'info',
    其他: '',
  };
  return typeMap[type] || '';
};

// 加载家庭列表
const loadFamilyList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchKeyword.value,
      ...searchFilters.value,
    };
    const response = await familyApi.getFamilyList(params);
    familyList.value = response.data.families;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    ElMessage.error('加载家庭列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await familyApi.getFamilyStats();
    stats.value = response.data;
  } catch (error) {
    console.error('加载统计数据失败', error);
  }
};

// 搜索处理
const handleSearch = () => {
  pagination.page = 1;
  loadFamilyList();
};

// 搜索提交
const handleSearchSubmit = filters => {
  searchFilters.value = filters;
  showSearchDialog.value = false;
  pagination.page = 1;
  loadFamilyList();
};

// 搜索重置
const handleSearchReset = () => {
  searchFilters.value = {};
  showSearchDialog.value = false;
  pagination.page = 1;
  loadFamilyList();
};

// 查看家庭详情
const viewFamily = family => {
  currentFamily.value = family;
  showDetailDialog.value = true;
};

// 编辑家庭
const editFamily = family => {
  currentFamily.value = family;
  formMode.value = 'edit';
  showCreateDialog.value = true;
};

// 删除家庭
const deleteFamily = async family => {
  try {
    await ElMessageBox.confirm(
      `确定要删除家庭"${family.familyName}"吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await familyApi.deleteFamily(family._id);
    ElMessage.success('删除成功');
    loadFamilyList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
      console.error(error);
    }
  }
};

// 更多操作处理
const handleMoreAction = ({ action, family }) => {
  switch (action) {
    case 'members':
      // 跳转到成员管理
      break;
    case 'agents':
      // 显示代理设置对话框
      break;
    case 'qrcode':
      // 生成家庭二维码
      generateQRCode(family);
      break;
    case 'delete':
      deleteFamily(family);
      break;
  }
};

// 生成二维码
const generateQRCode = family => {
  ElMessage.info('功能开发中...');
};

// 家庭表单提交
const handleFamilySubmit = async formData => {
  try {
    if (formMode.value === 'create') {
      await familyApi.createFamily(formData);
      ElMessage.success('创建成功');
    } else {
      await familyApi.updateFamily(currentFamily.value._id, formData);
      ElMessage.success('更新成功');
    }
    showCreateDialog.value = false;
    loadFamilyList();
  } catch (error) {
    ElMessage.error(formMode.value === 'create' ? '创建失败' : '更新失败');
    console.error(error);
  }
};

// 导出数据
const exportData = () => {
  exportToExcel(familyList.value, '家庭信息');
  ElMessage.success('导出成功');
};

// 分页处理
const handleSizeChange = val => {
  pagination.limit = val;
  pagination.page = 1;
  loadFamilyList();
};

const handleCurrentChange = val => {
  pagination.page = val;
  loadFamilyList();
};

// 生命周期
onMounted(() => {
  loadFamilyList();
  loadStats();
});
</script>

<style lang="scss" scoped>
.family-management {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    h1 {
      margin: 0;
      font-size: 24px;
      color: #303133;
    }

    p {
      margin: 5px 0 0 0;
      color: #909399;
    }
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .right-tools {
      display: flex;
      align-items: center;

      .el-input {
        width: 300px;
      }
    }
  }

  .stats-cards {
    margin-bottom: 20px;

    .stat-card {
      display: flex;
      align-items: center;

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;

        .el-icon {
          font-size: 24px;
          color: white;
        }
      }

      .stat-content {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 5px;
        }
      }
    }
  }

  .family-list {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-view {
      .family-card {
        height: 100%;

        .family-name {
          font-weight: bold;
          font-size: 16px;
        }

        .family-info {
          .info-item {
            display: flex;
            margin-bottom: 8px;

            .label {
              color: #909399;
              width: 80px;
            }

            .value {
              color: #303133;
              flex: 1;

              &.address {
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              }
            }
          }
        }

        .family-tags {
          margin: 15px 0;
        }

        .card-actions {
          border-top: 1px solid #f0f0f0;
          padding-top: 15px;
          margin-top: 15px;
          display: flex;
          justify-content: space-between;
        }
      }
    }

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }
}
</style>
