<template>
  <div class="resident-profile-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>村民档案</h1>
      <p>管理村民个人档案信息，实现数字化档案管理</p>
    </div>

    <!-- 操作工具栏 -->
    <div class="toolbar">
      <el-button type="primary" icon="Plus" @click="showCreateDialog = true"> 新建档案 </el-button>
      <el-button icon="Search" @click="showSearchDialog = true"> 高级搜索 </el-button>
      <el-button icon="Download" @click="exportData"> 导出数据 </el-button>
      <div class="right-tools">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索姓名或身份证号"
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
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalCount || 0 }}</div>
              <div class="stat-label">档案总数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><Male /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.genderStats?.男 || 0 }}</div>
              <div class="stat-label">男性村民</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><Female /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.genderStats?.女 || 0 }}</div>
              <div class="stat-label">女性村民</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon">
              <el-icon><CreditCard /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ ((stats.insuranceRate || 0) * 100).toFixed(1) }}%</div>
              <div class="stat-label">医保覆盖率</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-tags">
      <el-tag
        v-for="tag in filterTags"
        :key="tag.key"
        closable
        @close="removeFilterTag(tag)"
        class="filter-tag"
      >
        {{ tag.label }}: {{ tag.value }}
      </el-tag>
      <el-button v-if="filterTags.length > 0" link type="primary" @click="clearAllFilters">
        清除筛选
      </el-button>
    </div>

    <!-- 档案列表 -->
    <el-card class="profile-list">
      <template #header>
        <div class="card-header">
          <span>档案列表</span>
          <div class="header-actions">
            <el-select v-model="displayMode" placeholder="显示模式" size="small">
              <el-option label="详细视图" value="detail" />
              <el-option label="紧凑视图" value="compact" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="profileList"
        style="width: 100%"
        :row-class-name="getRowClassName"
      >
        <el-table-column type="expand" width="50">
          <template #default="{ row }">
            <div class="expand-content">
              <el-row :gutter="20">
                <el-col :span="8">
                  <h4>基本信息</h4>
                  <p><strong>身份证号：</strong>{{ maskIdCard(row.personalInfo.idCard) }}</p>
                  <p><strong>民族：</strong>{{ row.personalInfo.ethnicity }}</p>
                  <p><strong>政治面貌：</strong>{{ row.personalInfo.politicalStatus }}</p>
                  <p><strong>婚姻状况：</strong>{{ row.personalInfo.maritalStatus }}</p>
                  <p><strong>健康状况：</strong>{{ row.personalInfo.healthStatus }}</p>
                  <p><strong>血型：</strong>{{ row.personalInfo.bloodType || '未知' }}</p>
                </el-col>
                <el-col :span="8">
                  <h4>联系方式</h4>
                  <p><strong>手机号：</strong>{{ row.contact.phone }}</p>
                  <p><strong>邮箱：</strong>{{ row.contact.email || '未填写' }}</p>
                  <p><strong>微信：</strong>{{ row.contact.wechat || '未填写' }}</p>
                  <p><strong>QQ：</strong>{{ row.contact.qq || '未填写' }}</p>
                </el-col>
                <el-col :span="8">
                  <h4>家庭信息</h4>
                  <p><strong>家庭编码：</strong>{{ row.familyId?.familyCode || '未关联' }}</p>
                  <p><strong>户主姓名：</strong>{{ row.familyId?.familyName || '未关联' }}</p>
                  <p>
                    <strong>家庭成员：</strong>
                    <el-tag v-if="row.familyRelations" size="small">
                      {{ row.familyRelations.length }}人
                    </el-tag>
                    <span v-else>未关联</span>
                  </p>
                </el-col>
              </el-row>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="照片" width="80" align="center">
          <template #default="{ row }">
            <el-avatar :size="50" :src="row.personalInfo.photo" :alt="row.personalInfo.name">
              {{ row.personalInfo.name.charAt(0) }}
            </el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="personalInfo.name" label="姓名" width="100" />

        <el-table-column prop="personalInfo.gender" label="性别" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.personalInfo.gender === '男' ? 'primary' : 'danger'" size="small">
              {{ row.personalInfo.gender }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="personalInfo.age" label="年龄" width="80" align="center" />

        <el-table-column prop="education.degree" label="学历" width="100">
          <template #default="{ row }">
            {{ row.education?.degree || '未填写' }}
          </template>
        </el-table-column>

        <el-table-column prop="employment.status" label="就业状态" width="120">
          <template #default="{ row }">
            {{ row.employment?.status || '未填写' }}
          </template>
        </el-table-column>

        <el-table-column prop="tags" label="标签" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag"
              size="small"
              :type="getTagType(tag)"
              style="margin-right: 5px; margin-bottom: 5px"
            >
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="特殊群体" width="150">
          <template #default="{ row }">
            <span v-if="!isSpecialGroup(row)">普通村民</span>
            <el-tag
              v-for="tag in getSpecialTags(row)"
              :key="tag"
              type="warning"
              size="small"
              style="margin-right: 5px"
            >
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewProfile(row)"> 查看 </el-button>
            <el-button link type="primary" @click="editProfile(row)"> 编辑 </el-button>
            <el-dropdown @command="handleMoreAction">
              <el-button link>
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'documents', profile: row }">
                    查看文档
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'family', profile: row }">
                    家庭信息
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'print', profile: row }">
                    打印档案
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'delete', profile: row }" divided>
                    删除档案
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

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

    <!-- 创建档案对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="新建村民档案"
      width="1000px"
      :close-on-click-modal="false"
    >
      <ResidentProfileForm
        :profile="currentProfile"
        :mode="formMode"
        @submit="handleProfileSubmit"
        @cancel="showCreateDialog = false"
      />
    </el-dialog>

    <!-- 搜索对话框 -->
    <el-dialog v-model="showSearchDialog" title="高级搜索" width="600px">
      <ProfileSearchForm
        :filters="searchFilters"
        @search="handleSearchSubmit"
        @reset="handleSearchReset"
      />
    </el-dialog>

    <!-- 档案详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`${currentProfile?.personalInfo?.name} - 档案详情`"
      width="1200px"
    >
      <ResidentProfileDetail
        v-if="currentProfile"
        :profile="currentProfile"
        @edit="editProfile"
        @refresh="loadProfileList"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  User,
  Male,
  Female,
  CreditCard,
  Plus,
  Search,
  Download,
  ArrowDown,
} from '@element-plus/icons-vue';
import ResidentProfileForm from '@/components/resident/ResidentProfileForm.vue';
import ProfileSearchForm from '@/components/resident/ProfileSearchForm.vue';
import ResidentProfileDetail from '@/components/resident/ResidentProfileDetail.vue';
import { profileApi } from '@/api/residentProfile';
import { exportToExcel } from '@/utils/export';

// 响应式数据
const loading = ref(false);
const profileList = ref([]);
const stats = ref({});
const displayMode = ref('detail');
const searchKeyword = ref('');
const showCreateDialog = ref(false);
const showSearchDialog = ref(false);
const showDetailDialog = ref(false);
const currentProfile = ref(null);
const formMode = ref('create');
const searchFilters = ref({});
const filterTags = ref([]);

// 分页数据
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 加载档案列表
const loadProfileList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchKeyword.value,
      ...searchFilters.value,
    };
    const response = await profileApi.searchProfiles(params);
    profileList.value = response.data.profiles;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    ElMessage.error('加载档案列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await profileApi.getProfileStats();
    stats.value = response.data;
  } catch (error) {
    console.error('加载统计数据失败', error);
  }
};

// 搜索处理
const handleSearch = () => {
  pagination.page = 1;
  loadProfileList();
};

// 搜索提交
const handleSearchSubmit = filters => {
  searchFilters.value = filters;

  // 更新筛选标签
  filterTags.value = [];
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      const label = getFilterLabel(key);
      filterTags.value.push({ key, label, value });
    }
  });

  showSearchDialog.value = false;
  pagination.page = 1;
  loadProfileList();
};

// 搜索重置
const handleSearchReset = () => {
  searchFilters.value = {};
  filterTags.value = [];
  showSearchDialog.value = false;
  pagination.page = 1;
  loadProfileList();
};

// 移除筛选标签
const removeFilterTag = tag => {
  delete searchFilters.value[tag.key];
  filterTags.value = filterTags.value.filter(t => t.key !== tag.key);
  pagination.page = 1;
  loadProfileList();
};

// 清除所有筛选
const clearAllFilters = () => {
  searchFilters.value = {};
  filterTags.value = [];
  pagination.page = 1;
  loadProfileList();
};

// 获取筛选标签名称
const getFilterLabel = key => {
  const labelMap = {
    gender: '性别',
    ageRange: '年龄',
    education: '学历',
    employment: '就业状态',
    tags: '标签',
  };
  return labelMap[key] || key;
};

// 身份证号脱敏
const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

// 获取标签类型
const getTagType = tag => {
  const tagTypeMap = {
    党员: 'danger',
    村干部: 'warning',
    退役军人: 'success',
    残疾人: 'info',
    低保户: 'danger',
    五保户: 'warning',
    留守儿童: 'primary',
    空巢老人: 'warning',
    独居老人: 'warning',
    大病家庭: 'danger',
    单亲家庭: 'info',
    失独家庭: 'danger',
    烈属: 'danger',
    优抚对象: 'success',
    困难党员: 'danger',
    返乡创业: 'success',
    农民工: '',
    大学生: 'primary',
    专业技术人才: 'success',
    其他: '',
  };
  return tagTypeMap[tag] || '';
};

// 判断是否为特殊群体
const isSpecialGroup = profile => {
  const specialTags = [
    '党员',
    '村干部',
    '退役军人',
    '残疾人',
    '低保户',
    '五保户',
    '留守儿童',
    '空巢老人',
    '独居老人',
    '大病家庭',
    '单亲家庭',
    '失独家庭',
    '烈属',
    '优抚对象',
    '困难党员',
  ];
  return profile.tags && profile.tags.some(tag => specialTags.includes(tag));
};

// 获取特殊标签
const getSpecialTags = profile => {
  if (!profile.tags) return [];
  const specialTags = [
    '党员',
    '村干部',
    '退役军人',
    '残疾人',
    '低保户',
    '五保户',
    '留守儿童',
    '空巢老人',
    '独居老人',
    '大病家庭',
    '单亲家庭',
    '失独家庭',
    '烈属',
    '优抚对象',
    '困难党员',
  ];
  return profile.tags.filter(tag => specialTags.includes(tag));
};

// 查看档案详情
const viewProfile = profile => {
  currentProfile.value = profile;
  showDetailDialog.value = true;
};

// 编辑档案
const editProfile = profile => {
  currentProfile.value = profile;
  formMode.value = 'edit';
  showCreateDialog.value = true;
};

// 删除档案
const deleteProfile = async profile => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${profile.personalInfo.name}"的档案吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await profileApi.deleteProfile(profile._id);
    ElMessage.success('删除成功');
    loadProfileList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
      console.error(error);
    }
  }
};

// 更多操作处理
const handleMoreAction = ({ action, profile }) => {
  switch (action) {
    case 'documents':
      // 跳转到文档管理
      break;
    case 'family':
      // 显示家庭信息
      break;
    case 'print':
      // 打印档案
      printProfile(profile);
      break;
    case 'delete':
      deleteProfile(profile);
      break;
  }
};

// 打印档案
const printProfile = profile => {
  ElMessage.info('打印功能开发中...');
};

// 档案表单提交
const handleProfileSubmit = async formData => {
  try {
    if (formMode.value === 'create') {
      await profileApi.createProfile(formData);
      ElMessage.success('创建成功');
    } else {
      await profileApi.updateProfile(currentProfile.value._id, formData);
      ElMessage.success('更新成功');
    }
    showCreateDialog.value = false;
    loadProfileList();
  } catch (error) {
    ElMessage.error(formMode.value === 'create' ? '创建失败' : '更新失败');
    console.error(error);
  }
};

// 导出数据
const exportData = () => {
  exportToExcel(profileList.value, '村民档案信息');
  ElMessage.success('导出成功');
};

// 获取行类名
const getRowClassName = ({ row }) => {
  const classes = [];
  if (isSpecialGroup(row)) {
    classes.push('special-group');
  }
  return classes.join(' ');
};

// 分页处理
const handleSizeChange = val => {
  pagination.limit = val;
  pagination.page = 1;
  loadProfileList();
};

const handleCurrentChange = val => {
  pagination.page = val;
  loadProfileList();
};

// 生命周期
onMounted(() => {
  loadProfileList();
  loadStats();
});
</script>

<style lang="scss" scoped>
.resident-profile-management {
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

  .filter-tags {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    .filter-tag {
      margin: 0;
    }
  }

  .profile-list {
    .expand-content {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 4px;

      h4 {
        margin: 0 0 10px 0;
        color: #409eff;
        font-size: 14px;
      }

      p {
        margin: 5px 0;
        font-size: 13px;
        color: #606266;

        strong {
          color: #303133;
          margin-right: 5px;
        }
      }
    }

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }

  :deep(.special-group) {
    background-color: #fef0f0;
  }
}
</style>
