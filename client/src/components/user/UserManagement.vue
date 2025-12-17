<template>
  <div class="user-management">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        添加用户
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="输入姓名、手机号或邮箱搜索"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filters.role" placeholder="选择角色" clearable>
            <el-option label="村民" value="resident" />
            <el-option label="村委" value="village_admin" />
            <el-option label="会计" value="accountant" />
            <el-option label="超管" value="super_admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable>
            <el-option label="活跃" value="active" />
            <el-option label="停用" value="inactive" />
            <el-option label="暂停" value="suspended" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card">
      <el-table
        :data="userList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="用户ID" width="120" show-overflow-tooltip />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="120">
          <template #default="{ row }">
            <span>{{ formatPhone(row.phone) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" width="180" show-overflow-tooltip />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="villageId" label="村庄ID" width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
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
    <div v-if="selectedUsers.length > 0" class="batch-operations">
      <el-card>
        <div class="batch-info">
          已选择 <span class="count">{{ selectedUsers.length }}</span> 个用户
        </div>
        <div class="batch-actions">
          <el-button type="warning" @click="handleBatchExport">
            导出用户
          </el-button>
          <el-button type="danger" @click="handleBatchDelete">
            批量删除
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="detailDialog.visible"
      title="用户详情"
      width="800px"
      :before-close="handleCloseDetailDialog"
    >
      <div v-if="detailDialog.data" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ detailDialog.data.id }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ detailDialog.data.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ formatPhone(detailDialog.data.phone) }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detailDialog.data.email }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleTagType(detailDialog.data.role)">
              {{ getRoleLabel(detailDialog.data.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="村庄ID">{{ detailDialog.data.villageId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(detailDialog.data.status)">
              {{ getStatusLabel(detailDialog.data.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(detailDialog.data.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(detailDialog.data.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="formDialog.visible"
      :title="formDialog.isEdit ? '编辑用户' : '创建用户'"
      width="600px"
      :before-close="handleCloseFormDialog"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="100px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="村民" value="resident" />
            <el-option label="村委" value="village_admin" />
            <el-option label="会计" value="accountant" />
            <el-option label="超管" value="super_admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="村庄ID" prop="villageId">
          <el-input v-model="userForm.villageId" placeholder="请输入村庄ID" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="userForm.status">
            <el-radio label="active">活跃</el-radio>
            <el-radio label="inactive">停用</el-radio>
            <el-radio label="suspended">暂停</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseFormDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmitUser" :loading="submitting">
            {{ formDialog.isEdit ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import apiService from '@/services/apiService';

// 响应式数据
const loading = ref(false);
const userList = ref([]);
const selectedUsers = ref([]);
const submitting = ref(false);

// 筛选条件
const filters = reactive({
  search: '',
  role: '',
  status: ''
});

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
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

// 用户表单
const userForm = reactive({
  id: '',
  name: '',
  phone: '',
  email: '',
  role: '',
  villageId: '',
  status: 'active'
});

// 表单验证规则
const userFormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2到20个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  villageId: [
    { required: true, message: '请输入村庄ID', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
};

// 表单引用
const userFormRef = ref(null);

// 计算属性
const hasSelectedUsers = computed(() => selectedUsers.value.length > 0);

// 方法
const loadUserList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    };

    // 清理空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '') {
        delete params[key];
      }
    });

    const response = await apiService.getUserList(params);

    if (response.success) {
      userList.value = response.data.users || [];
      pagination.total = response.pagination?.total || 0;
    } else {
      ElMessage.error(response.error || '获取用户列表失败');
    }
  } catch (error) {
    ElMessage.error('获取用户列表失败');
    console.error('加载用户列表错误:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadUserList();
};

const handleReset = () => {
  filters.search = '';
  filters.role = '';
  filters.status = '';
  pagination.page = 1;
  loadUserList();
};

const handleSizeChange = (size) => {
  pagination.limit = size;
  loadUserList();
};

const handleCurrentChange = (page) => {
  pagination.page = page;
  loadUserList();
};

const handleSelectionChange = (selection) => {
  selectedUsers.value = selection;
};

const handleView = (row) => {
  detailDialog.data = row;
  detailDialog.visible = true;
};

const handleEdit = (row) => {
  formDialog.isEdit = true;
  formDialog.visible = true;

  // 填充表单数据
  Object.keys(userForm).forEach(key => {
    userForm[key] = row[key] || '';
  });
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${row.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    const response = await apiService.deleteUser(row.id);

    if (response.success) {
      ElMessage.success('用户删除成功');
      loadUserList();
    } else {
      ElMessage.error(response.error || '删除用户失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除用户失败');
      console.error('删除用户错误:', error);
    }
  }
};

const showCreateDialog = () => {
  formDialog.isEdit = false;
  formDialog.visible = true;
  resetUserForm();
};

const resetUserForm = () => {
  Object.keys(userForm).forEach(key => {
    userForm[key] = key === 'status' ? 'active' : '';
  });

  if (userFormRef.value) {
    userFormRef.value.resetFields();
  }
};

const handleSubmitUser = async () => {
  if (!userFormRef.value) return;

  try {
    await userFormRef.value.validate();

    submitting.value = true;

    let response;
    if (formDialog.isEdit) {
      response = await apiService.updateUser(userForm.id, userForm);
    } else {
      response = await apiService.createUser(userForm);
    }

    if (response.success) {
      ElMessage.success(formDialog.isEdit ? '用户更新成功' : '用户创建成功');
      handleCloseFormDialog();
      loadUserList();
    } else {
      ElMessage.error(response.error || '操作失败');
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('操作失败');
      console.error('提交用户表单错误:', error);
    }
  } finally {
    submitting.value = false;
  }
};

const handleCloseFormDialog = () => {
  formDialog.visible = false;
  resetUserForm();
};

const handleCloseDetailDialog = () => {
  detailDialog.visible = false;
  detailDialog.data = null;
};

const handleBatchExport = () => {
  // 实现批量导出逻辑
  ElMessage.info('批量导出功能开发中...');
};

const handleBatchDelete = async () => {
  if (selectedUsers.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUsers.value.length} 个用户吗？`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 实现批量删除逻辑
    ElMessage.info('批量删除功能开发中...');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败');
    }
  }
};

// 工具方法
const formatPhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$3');
};

const formatDateTime = (dateTime) => {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('zh-CN');
};

const getRoleLabel = (role) => {
  const roleMap = {
    resident: '村民',
    village_admin: '村委',
    accountant: '会计',
    super_admin: '超管'
  };
  return roleMap[role] || role;
};

const getRoleTagType = (role) => {
  const typeMap = {
    resident: 'info',
    village_admin: 'warning',
    accountant: 'success',
    super_admin: 'danger'
  };
  return typeMap[role] || 'info';
};

const getStatusLabel = (status) => {
  const statusMap = {
    active: '活跃',
    inactive: '停用',
    suspended: '暂停'
  };
  return statusMap[status] || status;
};

const getStatusTagType = (status) => {
  const typeMap = {
    active: 'success',
    inactive: 'danger',
    suspended: 'warning'
  };
  return typeMap[status] || 'info';
};

// 生命周期
onMounted(() => {
  loadUserList();
});
</script>

<style scoped>
.user-management {
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

.user-detail {
  padding: 20px 0;
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