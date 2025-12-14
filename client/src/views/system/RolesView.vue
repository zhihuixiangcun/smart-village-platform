<template>
  <div class="roles-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">角色管理</h1>
        <p class="page-description">管理系统角色和权限配置</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加角色
        </el-button>
      </div>
    </div>

    <!-- 角色列表 -->
    <el-row :gutter="20">
      <el-col :span="8" v-for="role in roles" :key="role.id">
        <el-card class="role-card" :class="{ 'role-card-active': selectedRole?.id === role.id }">
          <template #header>
            <div class="role-header">
              <div class="role-info">
                <h3 class="role-name">{{ role.name }}</h3>
                <el-tag :type="role.type" size="small">{{ role.label }}</el-tag>
              </div>
              <div class="role-actions">
                <el-dropdown @command="handleRoleAction">
                  <el-button circle size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{ action: 'edit', role }">编辑</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'permissions', role }">权限配置</el-dropdown-item>
                      <el-dropdown-item v-if="!role.isSystem" :command="{ action: 'delete', role }" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </template>

          <div class="role-content" @click="selectRole(role)">
            <p class="role-description">{{ role.description }}</p>

            <div class="role-stats">
              <div class="stat-item">
                <span class="stat-label">用户数量</span>
                <span class="stat-value">{{ role.userCount || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">权限数量</span>
                <span class="stat-value">{{ role.permissions?.length || 0 }}</span>
              </div>
            </div>

            <div class="role-permissions-preview">
              <el-tag
                v-for="permission in role.permissions?.slice(0, 3)"
                :key="permission"
                size="small"
                class="permission-tag"
              >
                {{ getPermissionLabel(permission) }}
              </el-tag>
              <span v-if="role.permissions?.length > 3" class="more-permissions">
                +{{ role.permissions.length - 3 }} 个权限
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 角色详情面板 -->
    <el-card v-if="selectedRole" class="role-detail-card">
      <template #header>
        <div class="detail-header">
          <h3>{{ selectedRole.name }} - 详细信息</h3>
          <el-button @click="selectedRole = null">关闭</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2">
            <el-descriptions-item label="角色名称">{{ selectedRole.name }}</el-descriptions-item>
            <el-descriptions-item label="角色标识">{{ selectedRole.code }}</el-descriptions-item>
            <el-descriptions-item label="角色类型">
              <el-tag :type="selectedRole.type">{{ selectedRole.label }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="是否系统角色">
              {{ selectedRole.isSystem ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDate(selectedRole.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ formatDate(selectedRole.updatedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">
              {{ selectedRole.description }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="权限配置" name="permissions">
          <div class="permissions-config">
            <el-tree
              :data="permissionTree"
              :props="treeProps"
              :default-checked-keys="selectedRole.permissions"
              show-checkbox
              node-key="code"
              ref="permissionTreeRef"
            />
            <div class="permissions-actions">
              <el-button type="primary" @click="savePermissions">保存权限配置</el-button>
              <el-button @click="resetPermissions">重置</el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="关联用户" name="users">
          <el-table :data="roleUsers" style="width: 100%">
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column prop="lastLogin" label="最后登录">
              <template #default="{ row }">
                {{ formatDate(row.lastLogin) }}
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="{ row }">
                <el-button size="small" type="danger" @click="removeUserFromRole(row)">
                  移除角色
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 添加/编辑角色对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingRole ? '编辑角色' : '添加角色'"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="80px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" />
        </el-form-item>
        <el-form-item label="角色标识" prop="code">
          <el-input v-model="roleForm.code" :disabled="editingRole" />
        </el-form-item>
        <el-form-item label="角色类型" prop="type">
          <el-select v-model="roleForm.type" style="width: 100%">
            <el-option label="管理员" value="danger" />
            <el-option label="操作员" value="warning" />
            <el-option label="查看者" value="info" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="roleForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ editingRole ? '更新' : '添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreFilled } from '@element-plus/icons-vue'

// 响应式数据
const submitting = ref(false)
const showAddDialog = ref(false)
const editingRole = ref(null)
const selectedRole = ref(null)
const activeTab = ref('basic')

const roles = ref([
  {
    id: 1,
    name: '超级管理员',
    code: 'super_admin',
    label: '超级管理员',
    type: 'danger',
    description: '拥有系统所有权限的超级管理员角色',
    isSystem: true,
    userCount: 1,
    permissions: ['system:read', 'system:write', 'user:read', 'user:write', 'role:read', 'role:write'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: '村委管理员',
    code: 'village_admin',
    label: '村委管理员',
    type: 'warning',
    description: '村委会管理员，可管理本村相关事务',
    isSystem: false,
    userCount: 5,
    permissions: ['village:read', 'village:write', 'resident:read', 'resident:write'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date()
  },
  {
    id: 3,
    name: '普通用户',
    code: 'user',
    label: '普通用户',
    type: 'info',
    description: '普通村民用户，只能查看和使用基本功能',
    isSystem: true,
    userCount: 100,
    permissions: ['village:read', 'resident:read'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date()
  }
])

const roleUsers = ref([
  {
    id: 1,
    username: 'admin',
    name: '系统管理员',
    email: 'admin@village.com',
    lastLogin: new Date()
  }
])

const permissionTree = ref([
  {
    code: 'system',
    label: '系统管理',
    children: [
      { code: 'system:read', label: '查看系统信息' },
      { code: 'system:write', label: '修改系统配置' }
    ]
  },
  {
    code: 'user',
    label: '用户管理',
    children: [
      { code: 'user:read', label: '查看用户' },
      { code: 'user:write', label: '管理用户' }
    ]
  },
  {
    code: 'village',
    label: '村务管理',
    children: [
      { code: 'village:read', label: '查看村务信息' },
      { code: 'village:write', label: '管理村务' }
    ]
  },
  {
    code: 'resident',
    label: '村民管理',
    children: [
      { code: 'resident:read', label: '查看村民信息' },
      { code: 'resident:write', label: '管理村民信息' }
    ]
  }
])

const treeProps = {
  children: 'children',
  label: 'label'
}

const roleForm = reactive({
  name: '',
  code: '',
  type: '',
  description: ''
})

const roleRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色标识', trigger: 'blur' }],
  type: [{ required: true, message: '请选择角色类型', trigger: 'change' }]
}

const roleFormRef = ref()
const permissionTreeRef = ref()

// 工具函数
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const getPermissionLabel = (permission) => {
  const labels = {
    'system:read': '系统查看',
    'system:write': '系统管理',
    'user:read': '用户查看',
    'user:write': '用户管理',
    'village:read': '村务查看',
    'village:write': '村务管理',
    'resident:read': '村民查看',
    'resident:write': '村民管理'
  }
  return labels[permission] || permission
}

// 事件处理
const selectRole = (role) => {
  selectedRole.value = role
  activeTab.value = 'basic'
  // 加载角色用户数据
  loadRoleUsers(role.id)
}

const handleRoleAction = ({ action, role }) => {
  switch (action) {
    case 'edit':
      handleEdit(role)
      break
    case 'permissions':
      selectRole(role)
      activeTab.value = 'permissions'
      break
    case 'delete':
      handleDelete(role)
      break
  }
}

const handleEdit = (role) => {
  editingRole.value = role
  Object.assign(roleForm, {
    name: role.name,
    code: role.code,
    type: role.type,
    description: role.description
  })
  showAddDialog.value = true
}

const handleDelete = async (role) => {
  if (role.isSystem) {
    ElMessage.warning('系统角色不能删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除角色 ${role.name} 吗？此操作不可恢复。`,
      '删除角色',
      { type: 'warning' }
    )
    console.log('删除角色:', role)
    ElMessage.success('角色删除成功')
  } catch {
    // 用户取消
  }
}

const handleSubmit = async () => {
  try {
    await roleFormRef.value.validate()
    submitting.value = true

    console.log('提交角色数据:', roleForm)

    setTimeout(() => {
      submitting.value = false
      showAddDialog.value = false
      ElMessage.success(editingRole.value ? '角色更新成功' : '角色添加成功')
      resetForm()
    }, 1000)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const resetForm = () => {
  editingRole.value = null
  Object.assign(roleForm, {
    name: '',
    code: '',
    type: '',
    description: ''
  })
  roleFormRef.value?.resetFields()
}

const savePermissions = () => {
  const checkedKeys = permissionTreeRef.value.getCheckedKeys()
  console.log('保存权限配置:', checkedKeys)
  ElMessage.success('权限配置保存成功')
}

const resetPermissions = () => {
  permissionTreeRef.value.setCheckedKeys(selectedRole.value.permissions)
}

const removeUserFromRole = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要将用户 ${user.name} 从当前角色中移除吗？`,
      '移除用户',
      { type: 'warning' }
    )
    console.log('移除用户:', user)
    ElMessage.success('用户移除成功')
  } catch {
    // 用户取消
  }
}

const loadRoleUsers = (roleId) => {
  // TODO: 从API加载角色关联的用户
  console.log('加载角色用户:', roleId)
}

onMounted(() => {
  // 初始化数据
})
</script>

<style lang="scss" scoped>
.roles-view {
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

.role-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.role-card-active {
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  }
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-info {
  flex: 1;
}

.role-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: bold;
}

.role-content {
  .role-description {
    color: #666;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .role-stats {
    display: flex;
    gap: 20px;
    margin-bottom: 16px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-label {
        font-size: 12px;
        color: #909399;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #303133;
      }
    }
  }

  .role-permissions-preview {
    .permission-tag {
      margin-right: 8px;
      margin-bottom: 4px;
    }

    .more-permissions {
      font-size: 12px;
      color: #909399;
    }
  }
}

.role-detail-card {
  margin-top: 20px;

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
    }
  }
}

.permissions-config {
  .permissions-actions {
    margin-top: 20px;
    text-align: center;
  }
}
</style>