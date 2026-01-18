<template>
  <div class="permission-assign-container">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="page-title">权限分配管理</h2>
          <p class="page-subtitle">管理用户权限和访问控制</p>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 用户搜索 -->
      <el-card class="search-card" shadow="never">
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
            <el-button type="primary" :icon="Search" @click="handleSearch">
              搜索
            </el-button>
            <el-button :icon="Refresh" @click="handleReset"> 重置 </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 批量操作栏 -->
      <transition name="slide-fade">
        <el-card
          v-if="selectedUsers.length > 0"
          class="batch-card"
          shadow="never"
        >
          <div class="batch-actions">
            <div class="batch-info">
              <el-icon class="batch-icon" size="20"><Selection /></el-icon>
              <span class="selected-count">
                已选择 {{ selectedUsers.length }} 个用户
              </span>
            </div>
            <div class="batch-buttons">
              <el-button type="primary" :icon="Lock" @click="handleBatchAssign">
                批量分配权限
              </el-button>
              <el-button
                type="success"
                :icon="CircleCheck"
                @click="handleBatchActivate"
              >
                批量启用
              </el-button>
              <el-button type="danger" :icon="Delete" @click="handleBatchDelete">
                批量删除
              </el-button>
            </div>
          </div>
        </el-card>
      </transition>

      <!-- 用户列表 -->
      <el-card class="table-card" shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">用户列表</span>
            <span class="table-count">共 {{ pagination.total }} 条记录</span>
          </div>
        </template>

        <el-table
          :data="userList"
          v-loading="loading"
          stripe
          class="data-table"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="56" />

          <el-table-column prop="name" label="姓名" width="120">
            <template #default="{ row }">
              <div class="user-name">{{ row.name }}</div>
            </template>
          </el-table-column>

          <el-table-column prop="phone" label="手机号" width="130" />

          <el-table-column prop="role" label="角色" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.role === 'village_official'" type="warning">
                村干部
              </el-tag>
              <el-tag v-else-if="row.role === 'township_official'" type="success">
                乡镇干部
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="position" label="职务" width="140" />

          <el-table-column prop="department" label="部门" width="140" />

          <el-table-column prop="permissions" label="当前权限" min-width="240">
            <template #default="{ row }">
              <div class="permissions-cell">
                <el-tag
                  v-for="perm in row.permissions"
                  :key="perm"
                  size="small"
                  type="info"
                  class="permission-tag"
                >
                  {{ getPermissionName(perm) }}
                </el-tag>
                <span v-if="!row.permissions || row.permissions.length === 0" class="no-permissions">
                  暂无权限
                </span>
              </div>
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
              <div class="time-cell">{{ formatDate(row.createdAt) }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button
                  link
                  type="primary"
                  size="small"
                  :icon="Lock"
                  @click="handleAssignPermissions(row)"
                >
                  分配权限
                </el-button>
                <el-button
                  link
                  type="info"
                  size="small"
                  :icon="View"
                  @click="handleViewUser(row)"
                >
                  查看详情
                </el-button>
                <el-button
                  v-if="!row.isActive"
                  link
                  type="success"
                  size="small"
                  :icon="CircleCheck"
                  @click="handleActivate(row)"
                >
                  启用
                </el-button>
                <el-button
                  link
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </div>
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
    </div>

    <!-- 权限分配对话框 -->
    <el-dialog
      v-model="showPermissionDialog"
      title="分配权限"
      width="800px"
      :close-on-click-modal="false"
      class="permission-dialog"
    >
      <div v-if="currentUser">
        <el-descriptions :column="2" border class="user-descriptions">
          <el-descriptions-item label="姓名">{{ currentUser.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag v-if="currentUser.role === 'village_official'" type="warning">
              村干部
            </el-tag>
            <el-tag v-else-if="currentUser.role === 'township_official'" type="success">
              乡镇干部
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="职务">{{ currentUser.position }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">
          <span class="divider-title">权限配置</span>
        </el-divider>

        <el-form :model="permissionForm" label-width="150px" class="permission-form">
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
import {
  Search,
  Refresh,
  Lock,
  Delete,
  View,
  CircleCheck,
  Selection,
} from '@element-plus/icons-vue';
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
    await ElMessageBox.confirm(
      `确认删除用户 ${row.name} 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    );

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
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
  padding: 32px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(79, 172, 254, 0.25);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(255,255,255, 0.1) 0%, transparent 70%);
    border-radius: 50%;
  }

  .header-content {
    .header-left {
      position: relative;
      z-index: 1;

      .page-title {
        margin: 0 0 8px 0;
        color: #ffffff;
        font-size: 28px;
        font-weight: 700;
        line-height: 1.3;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        letter-spacing: 0.5px;
      }

      .page-subtitle {
        margin: 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 15px;
        line-height: 1.5;
        font-weight: 400;
      }
    }
  }
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
}

.search-card,
.table-card,
.batch-card {
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  background: #ffffff;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  }
}

.search-form {
  margin-top: 10px;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 1px #4facfe inset;
    }
  }
}

.batch-card {
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%);
  border-left: 4px solid #4facfe;
  border: 1px solid rgba(79, 172, 254, 0.2);

  .batch-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .batch-info {
    display: flex;
    align-items: center;
    gap: 8px;

    .batch-icon {
      color: #4facfe;
      font-size: 24px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }

    .selected-count {
      color: var(--el-text-color-primary);
      font-size: 15px;
      font-weight: 600;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  .batch-buttons {
    display: flex;
    gap: 8px;

    :deep(.el-button) {
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
      }
    }
  }
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .table-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .table-count {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

:deep(.data-table) {
  border-radius: 12px;
  overflow: hidden;

  .el-table__inner-wrapper {
    border-radius: 12px;
  }

  .el-table__row {
    transition: all 0.3s ease;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 0;
      background: linear-gradient(180deg, #4facfe 0%, #00f2fe 100%);
      transition: width 0.3s ease;
    }

    &:hover {
      background-color: rgba(79, 172, 254, 0.05);
      transform: scale(1.005);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

      &::before {
        width: 3px;
      }
    }

    &:nth-child(odd) {
      background-color: rgba(248, 250, 252, 0.5);
    }
  }

  .el-table__header th {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    color: var(--el-text-color-primary);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, #4facfe 50%, transparent 100%);
    }
  }

  .el-table__cell {
    padding: 16px 12px;
  }
}

.user-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.permissions-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .permission-tag {
    font-size: 12px;
    height: 22px;
    line-height: 20px;
    padding: 0 8px;
  }

  .no-permissions {
    color: var(--el-text-color-placeholder);
    font-size: 13px;
  }
}

.time-cell {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.permission-dialog {
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    padding: 24px 32px;
    margin: 0;

    .el-dialog__title {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
    }

    .el-dialog__headerbtn {
      top: 24px;
      right: 24px;

      .el-dialog__close {
        color: rgba(255, 255, 255, 0.9);
        font-size: 20px;
        transition: all 0.2s ease;

        &:hover {
          color: #ffffff;
          transform: rotate(90deg);
        }
      }
    }
  }

  :deep(.el-dialog__body) {
    padding: 32px;
    max-height: 600px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      border-radius: 4px;
    }
  }

  .user-descriptions {
    margin-bottom: 24px;
    border-radius: 12px;
    overflow: hidden;

    :deep(.el-descriptions__header) {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    :deep(.el-descriptions__label) {
      font-weight: 600;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: var(--el-text-color-primary);
    }

    :deep(.el-descriptions__content) {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  .divider-title {
    font-weight: 700;
    color: var(--el-text-color-primary);
    font-size: 16px;
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    position: relative;
    padding-left: 16px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 16px;
      background: linear-gradient(180deg, #4facfe 0%, #00f2fe 100%);
      border-radius: 2px;
    }
  }

  .permission-form {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 24px;
    border-radius: 12px;
    border: 1px dashed var(--el-border-color);

    :deep(.el-form-item__label) {
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    :deep(.el-checkbox-group) {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    :deep(.el-checkbox) {
      margin-right: 0;
      padding: 12px 20px;
      border: 2px solid var(--el-border-color);
      border-radius: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: #ffffff;
      font-weight: 500;

      &:hover {
        border-color: #4facfe;
        color: #4facfe;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(79, 172, 254, 0.2);
      }

      &.is-checked {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        border-color: #4facfe;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(79, 172, 254, 0.5);
        }
      }
    }
  }
}

// 过渡动画
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// 响应式设计
@media (max-width: 1200px) {
  .permission-assign-container {
    padding: 16px;

    .content-wrapper {
      max-width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .permission-assign-container {
    padding: 12px;

    .page-header {
      padding: 16px;
    }

    .search-card {
      .search-form {
        .el-form-item {
          display: block;
          width: 100%;

          :deep(.el-input),
          :deep(.el-select) {
            width: 100%;
          }
        }

        .el-form-item:last-child {
          margin-top: 16px;
        }
      }
    }

    .batch-card {
      .batch-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;

        .batch-buttons {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
      }
    }

    .action-buttons {
      flex-direction: column;
      align-items: flex-start;
    }

    .pagination {
      justify-content: center;
    }
  }
}
</style>
