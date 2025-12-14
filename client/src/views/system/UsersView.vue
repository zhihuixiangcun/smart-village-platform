<template>
  <div class="users-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">用户管理</h1>
        <p class="page-description">管理系统用户账户和权限</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加用户
        </el-button>
      </div>
    </div>

    <!-- 搜索过滤器 -->
    <el-card class="filter-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索用户名、姓名..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.role" placeholder="角色" clearable @change="handleSearch">
            <el-option label="管理员" value="admin" />
            <el-option label="村委" value="village_committee" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.status" placeholder="状态" clearable @change="handleSearch">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card">
      <el-table
        :data="users"
        v-loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="name" label="姓名" min-width="100" />
        <el-table-column prop="role" label="角色" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="phone" label="手机号" min-width="120" />
        <el-table-column prop="village" label="所属村庄" min-width="120" />
        <el-table-column prop="status" label="状态" min-width="80">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              active-value="active"
              inactive-value="disabled"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="lastLogin" label="最后登录" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.lastLogin) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" @click="handleResetPassword(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingUser ? '编辑用户' : '添加用户'"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="userForm" :rules="userRules" ref="userFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="editingUser" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="村委" value="village_committee" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属村庄" prop="village">
          <el-input v-model="userForm.village" />
        </el-form-item>
        <el-form-item v-if="!editingUser" label="密码" prop="password">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ editingUser ? '更新' : '添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const showAddDialog = ref(false)
const editingUser = ref(null)

const users = ref([
  {
    id: 1,
    username: 'admin',
    name: '系统管理员',
    email: 'admin@village.com',
    phone: '13800138000',
    role: 'admin',
    village: '全局',
    status: 'active',
    lastLogin: new Date()
  },
  {
    id: 2,
    username: 'village01',
    name: '张村长',
    email: 'zhang@village.com',
    phone: '13800138001',
    role: 'village_committee',
    village: '示例村',
    status: 'active',
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
])

const searchForm = reactive({
  keyword: '',
  role: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

const userForm = reactive({
  username: '',
  name: '',
  email: '',
  phone: '',
  role: '',
  village: '',
  password: ''
})

const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const userFormRef = ref()

// 工具函数
const getRoleType = (role) => {
  const types = {
    admin: 'danger',
    village_committee: 'warning',
    user: 'info'
  }
  return types[role] || 'info'
}

const getRoleLabel = (role) => {
  const labels = {
    admin: '管理员',
    village_committee: '村委',
    user: '普通用户'
  }
  return labels[role] || role
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 事件处理
const handleSearch = () => {
  console.log('搜索用户:', searchForm)
  // TODO: 实现搜索逻辑
}

const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    role: '',
    status: ''
  })
  handleSearch()
}

const handleSelectionChange = (selection) => {
  console.log('选择变更:', selection)
}

const handleStatusChange = async (user) => {
  try {
    console.log('状态变更:', user)
    ElMessage.success(`用户 ${user.name} 状态已更新`)
  } catch (error) {
    ElMessage.error('状态更新失败')
  }
}

const handleEdit = (user) => {
  editingUser.value = user
  Object.assign(userForm, {
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    village: user.village
  })
  showAddDialog.value = true
}

const handleResetPassword = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户 ${user.name} 的密码吗？`,
      '重置密码',
      { type: 'warning' }
    )
    console.log('重置密码:', user)
    ElMessage.success('密码重置成功')
  } catch {
    // 用户取消
  }
}

const handleDelete = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 ${user.name} 吗？此操作不可恢复。`,
      '删除用户',
      { type: 'warning' }
    )
    console.log('删除用户:', user)
    ElMessage.success('用户删除成功')
  } catch {
    // 用户取消
  }
}

const handleSubmit = async () => {
  try {
    await userFormRef.value.validate()
    submitting.value = true

    console.log('提交用户数据:', userForm)

    setTimeout(() => {
      submitting.value = false
      showAddDialog.value = false
      ElMessage.success(editingUser.value ? '用户更新成功' : '用户添加成功')
      resetForm()
    }, 1000)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const resetForm = () => {
  editingUser.value = null
  Object.assign(userForm, {
    username: '',
    name: '',
    email: '',
    phone: '',
    role: '',
    village: '',
    password: ''
  })
  userFormRef.value?.resetFields()
}

const handleSizeChange = (size) => {
  pagination.size = size
  loadUsers()
}

const handlePageChange = (page) => {
  pagination.page = page
  loadUsers()
}

const loadUsers = () => {
  loading.value = true
  // TODO: 从API加载用户数据
  setTimeout(() => {
    pagination.total = users.value.length
    loading.value = false
  }, 500)
}

onMounted(() => {
  loadUsers()
})
</script>

<style lang="scss" scoped>
.users-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.page-description {
  color: #666;
  margin: 0;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }
}
</style>