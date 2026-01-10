<template>
  <div class="permission-assign-container">
    <el-page-header title="权限分配管理" class="page-header" />

    <div class="content-wrapper">
      <!-- 用户搜索 -->
      <el-card class="search-card">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="村庄">
            <el-select
              v-model="searchForm.villageId"
              placeholder="全部村庄"
              clearable
              style="width: 200px"
              @change="handleVillageChange"
            >
              <el-option
                v-for="village in villages"
                :key="village.id"
                :label="village.name"
                :value="village.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="角色">
            <el-select
              v-model="searchForm.role"
              placeholder="全部角色"
              clearable
              style="width: 150px"
            >
              <el-option label="村干部" value="village_official" />
              <el-option label="乡镇干部" value="township_official" />
            </el-select>
          </el-form-item>

          <el-form-item label="姓名/手机">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索用户"
              clearable
              style="width: 200px"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 用户列表 -->
      <el-card class="table-card">
        <template #header>
          <span>用户列表</span>
        </template>

        <el-table
          :data="userList"
          v-loading="loading"
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />

          <el-table-column prop="name" label="姓名" width="100" />

          <el-table-column prop="phone" label="手机号" width="120" />

          <el-table-column prop="role" label="角色" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.role === 'village_official'" type="warning">村干部</el-tag>
              <el-tag v-else-if="row.role === 'township_official'" type="success">乡镇干部</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="position" label="职务" width="120" />

          <el-table-column prop="department" label="部门" width="120" />

          <el-table-column prop="permissions" label="当前权限" width="250">
            <template #default="{ row }">
              <el-tag
                v-for="perm in row.permissions"
                :key="perm"
                size="small"
                type="info"
                style="margin: 0 5px 5px 0"
              >
                {{ getPermissionName(perm) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="isActive" label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="row.isActive"
                active-text="启用"
                inactive-text="禁用"
                @change="handleStatusChange(row)"
              />
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="注册时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleAssignPermissions(row)">
                分配权限
              </el-button>
              <el-button link type="info" size="small" @click="handleViewUser(row)">
                查看详情
              </el-button>
              <el-button
                v-if="!row.isActive"
                link
                type="success"
                size="small"
                @click="handleActivate(row)"
              >
                启用账号
              </el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
          class="pagination"
        />
      </el-card>

      <!-- 批量操作 -->
      <el-card v-if="selectedUsers.length > 0" class="batch-card">
        <div class="batch-actions">
          <span class="batch-text">已选择 {{ selectedUsers.length }} 个用户</span>
          <el-button type="primary" @click="handleBatchAssign"> 批量分配权限 </el-button>
          <el-button type="success" @click="handleBatchActivate"> 批量启用 </el-button>
          <el-button type="danger" @click="handleBatchDelete"> 批量删除 </el-button>
        </div>
      </el-card>
    </div>

    <!-- 权限分配对话框 -->
    <el-dialog
      v-model="showPermissionDialog"
      title="分配权限"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentUser">
        <el-descriptions :column="2" border style="margin-bottom: 20px">
          <el-descriptions-item label="姓名">{{ currentUser.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag v-if="currentUser.role === 'village_official'" type="warning">村干部</el-tag>
            <el-tag v-else-if="currentUser.role === 'township_official'" type="success"
              >乡镇干部</el-tag
            >
          </el-descriptions-item>
          <el-descriptions-item label="职务">{{ currentUser.position }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>权限配置</el-divider>

        <el-form :model="permissionForm" label-width="150px">
          <el-form-item label="资料收集">
            <el-checkbox-group v-model="permissionForm.document_management">
              <el-checkbox label="create">创建</el-checkbox>
              <el-checkbox label="read">查看</el-checkbox>
              <el-checkbox label="update">修改</el-checkbox>
              <el-checkbox label="delete">删除</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="值班管理">
            <el-checkbox-group v-model="permissionForm.duty_management">
              <el-checkbox label="create">创建</el-checkbox>
              <el-checkbox label="read">查看</el-checkbox>
              <el-checkbox label="update">修改</el-checkbox>
              <el-checkbox label="delete">删除</el-checkbox>
              <el-checkbox label="approve">审批</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="用户管理">
            <el-checkbox-group v-model="permissionForm.user_management">
              <el-checkbox label="create">创建</el-checkbox>
              <el-checkbox label="read">查看</el-checkbox>
              <el-checkbox label="update">修改</el-checkbox>
              <el-checkbox label="delete">删除</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="村务公开">
            <el-checkbox-group v-model="permissionForm.village_overview">
              <el-checkbox label="create">发布</el-checkbox>
              <el-checkbox label="read">查看</el-checkbox>
              <el-checkbox label="update">修改</el-checkbox>
              <el-checkbox label="delete">删除</el-checkbox>
              <el-checkbox label="approve">审核</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="数据分析">
            <el-checkbox-group v-model="permissionForm.statistics_analysis">
              <el-checkbox label="read">查看</el-checkbox>
              <el-checkbox label="export">导出</el-checkbox>
              <el-checkbox label="approve">审核</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="财务管理" v-if="currentUser.role === 'township_official'">
            <el-checkbox-group v-model="permissionForm.finance_management">
              <el-checkbox label="create">创建</el-checkbox>
              <el-checkbox label="read">查看</el-checkbox>
              <el-checkbox label="update">修改</el-checkbox>
              <el-checkbox label="delete">删除</el-checkbox>
              <el-checkbox label="approve">审批</el-checkbox>
              <el-checkbox label="export">导出</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="项目管理" v-if="currentUser.role === 'township_official'">
            <el-checkbox-group v-model="permissionForm.project_management">
              <el-checkbox label="create">创建</el-checkbox>
              <el-checkbox label="read">查看</el-checkbox>
              <el-checkbox label="update">修改</el-checkbox>
              <el-checkbox label="delete">删除</el-checkbox>
              <el-checkbox label="approve">审批</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="系统设置" v-if="currentUser.role === 'township_official'">
            <el-checkbox-group v-model="permissionForm.system_settings">
              <el-checkbox label="read">查看</el-checkbox>
              <el-checkbox label="update">修改</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showPermissionDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="confirmAssignPermissions">
          确认分配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Search, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import villageUserApi from '@/api/villageUser';

// 响应式数据
const loading = ref(false);
const saving = ref(false);
const showPermissionDialog = ref(false);
const villages = ref([]);
const userList = ref([]);
const selectedUsers = ref([]);
const currentUser = ref(null);

// 搜索表单
const searchForm = reactive({
  villageId: '',
  role: '',
  keyword: '',
});

// 权限表单
const permissionForm = reactive({
  document_management: [],
  duty_management: [],
  user_management: [],
  village_overview: [],
  statistics_analysis: [],
  finance_management: [],
  project_management: [],
  system_settings: [],
});

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

// 权限名称映射
const permissionNames = {
  document_management: '资料收集',
  duty_management: '值班管理',
  user_management: '用户管理',
  village_overview: '村务公开',
  statistics_analysis: '数据分析',
  finance_management: '财务管理',
  project_management: '项目管理',
  system_settings: '系统设置',
};

// 方法
const loadVillages = async () => {
  try {
    const response = await villageUserApi.getVillages();
    villages.value = response.data || [];
  } catch (error) {
    console.error('获取村庄列表失败:', error);
  }
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchForm,
    };

    const response = await villageUserApi.getVillageOfficials(params);
    userList.value = response.data.list || [];
    pagination.total = response.data.total || 0;
  } catch (error) {
    console.error('加载用户列表失败:', error);
    ElMessage.error('加载用户列表失败');
  } finally {
    loading.value = false;
  }
};

const getPermissionName = permission => {
  return permissionNames[permission] || permission;
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

const handleSearch = () => {
  pagination.page = 1;
  loadUsers();
};

const handleReset = () => {
  Object.assign(searchForm, {
    villageId: '',
    role: '',
    keyword: '',
  });
  pagination.page = 1;
  loadUsers();
};

const handleVillageChange = () => {
  pagination.page = 1;
  loadUsers();
};

const handleSizeChange = val => {
  pagination.pageSize = val;
  pagination.page = 1;
  loadUsers();
};

const handlePageChange = val => {
  pagination.page = val;
  loadUsers();
};

const handleSelectionChange = selection => {
  selectedUsers.value = selection;
};

const handleAssignPermissions = row => {
  currentUser.value = row;

  // 初始化权限表单
  Object.keys(permissionForm).forEach(key => {
    permissionForm[key] = row.permissions
      .filter(p => p.module === key)
      .reduce((acc, p) => {
        acc.push(...p.actions);
        return acc;
      }, []);
  });

  showPermissionDialog.value = true;
};

const confirmAssignPermissions = async () => {
  saving.value = true;
  try {
    // 构建权限数组
    const permissions = Object.keys(permissionForm)
      .filter(key => permissionForm[key].length > 0)
      .map(module => ({
        module,
        actions: permissionForm[module],
      }));

    await villageUserApi.assignPermissions(currentUser.value._id, permissions);

    ElMessage.success('权限分配成功');
    showPermissionDialog.value = false;

    // 刷新用户列表
    loadUsers();
  } catch (error) {
    console.error('分配权限失败:', error);
    ElMessage.error(error.response?.data?.message || '分配权限失败');
  } finally {
    saving.value = false;
  }
};

const handleViewUser = row => {
  ElMessageBox.alert(
    `
    姓名：${row.name}
    手机号：${row.phone}
    角色：${row.role}
    职务：${row.position}
    部门：${row.department}
    注册时间：${formatDate(row.createdAt)}
  `,
    '用户详情'
  );
};

const handleStatusChange = async row => {
  try {
    await villageUserApi.updateUserStatus(row._id, row.isActive);
    ElMessage.success(row.isActive ? '账号已启用' : '账号已禁用');
  } catch (error) {
    console.error('更新状态失败:', error);
    ElMessage.error('更新状态失败');
    // 恢复状态
    row.isActive = !row.isActive;
  }
};

const handleActivate = async row => {
  try {
    await ElMessageBox.confirm(`确认启用用户 ${row.name} 的账号吗？`, '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await villageUserApi.updateUserStatus(row._id, true);
    ElMessage.success('账号已启用');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('启用账号失败:', error);
      ElMessage.error('启用账号失败');
    }
  }
};

const handleDelete = async row => {
  try {
    await ElMessageBox.confirm(`确认删除用户 ${row.name} 吗？此操作不可恢复！`, '确认删除', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'error',
    });

    await villageUserApi.deleteUser(row._id);
    ElMessage.success('删除成功');
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error);
      ElMessage.error('删除用户失败');
    }
  }
};

const handleBatchAssign = () => {
  ElMessage.info('批量分配权限功能开发中');
};

const handleBatchActivate = async () => {
  try {
    await ElMessageBox.confirm(
      `确认批量启用选中的 ${selectedUsers.value.length} 个用户吗？`,
      '确认操作',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const userIds = selectedUsers.value.map(u => u._id);
    await villageUserApi.batchUpdateUserStatus(userIds, true);

    ElMessage.success('批量启用成功');
    selectedUsers.value = [];
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量启用失败:', error);
      ElMessage.error('批量启用失败');
    }
  }
};

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确认批量删除选中的 ${selectedUsers.value.length} 个用户吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );

    const userIds = selectedUsers.value.map(u => u._id);
    await villageUserApi.batchDeleteUsers(userIds);

    ElMessage.success('批量删除成功');
    selectedUsers.value = [];
    loadUsers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error);
      ElMessage.error('批量删除失败');
    }
  }
};

// 生命周期
onMounted(() => {
  loadVillages();
  loadUsers();
});
</script>

<style scoped>
.permission-assign-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px 20px;
}

.search-card,
.table-card,
.batch-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.search-form {
  margin-top: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.batch-text {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}
</style>
