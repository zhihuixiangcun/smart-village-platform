<template>
  <div class="user-permission-assignment">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchUser"
          placeholder="搜索用户..."
          style="width: 300px"
          clearable
          @input="handleUserSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterRole"
          placeholder="筛选角色"
          style="width: 150px; margin-left: 12px"
          clearable
          @change="handleRoleFilter"
        >
          <el-option
            v-for="role in roles"
            :key="role.id"
            :label="role.name"
            :value="role.id"
          />
        </el-select>

        <el-select
          v-model="filterStatus"
          placeholder="状态筛选"
          style="width: 120px; margin-left: 12px"
          clearable
          @change="handleStatusFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="激活" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button type="primary" @click="showBatchAssignDialog">
          <el-icon><UserFilled /></el-icon>
          批量分配
        </el-button>
        <el-button @click="exportUserPermissions">
          <el-icon><Download /></el-icon>
          导出权限
        </el-button>
        <el-button @click="refreshUserList">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 用户列表和权限详情 -->
    <el-row :gutter="24">
      <!-- 左侧用户列表 -->
      <el-col :span="8">
        <el-card class="user-list-card">
          <template #header>
            <div class="card-header">
              <h3>用户列表</h3>
              <span class="user-count">共 {{ filteredUsers.length }} 个用户</span>
            </div>
          </template>

          <div class="user-list">
            <div
              v-for="user in filteredUsers"
              :key="user.id"
              class="user-item"
              :class="{ active: selectedUser?.id === user.id }"
              @click="selectUser(user)"
            >
              <div class="user-avatar">
                <el-avatar :size="40" :src="user.avatar">
                  {{ user.name.charAt(0) }}
                </el-avatar>
                <div class="user-status" :class="user.status"></div>
              </div>
              <div class="user-info">
                <div class="user-name">{{ user.name }}</div>
                <div class="user-email">{{ user.email }}</div>
                <div class="user-roles">
                  <el-tag
                    v-for="role in user.roles"
                    :key="role.id"
                    size="small"
                    :style="{ backgroundColor: role.color, borderColor: role.color }"
                  >
                    {{ role.name }}
                  </el-tag>
                </div>
              </div>
              <div class="user-actions">
                <el-dropdown @command="handleUserAction">
                  <el-button type="text" size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="`edit-${user.id}`">编辑用户</el-dropdown-item>
                      <el-dropdown-item :command="`permissions-${user.id}`">
                        权限详情
                      </el-dropdown-item>
                      <el-dropdown-item :command="`copy-${user.id}`">复制权限</el-dropdown-item>
                      <el-dropdown-item
                        :command="`toggle-${user.id}`"
                        :divided="true"
                      >
                        {{ user.status === 'active' ? '禁用' : '激活' }}
                      </el-dropdown-item>
                      <el-dropdown-item
                        :command="`reset-${user.id}`"
                        class="warning-item"
                      >
                        重置权限
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧权限详情 -->
      <el-col :span="16">
        <el-card class="permission-detail-card">
          <template #header>
            <div class="card-header">
              <h3 v-if="selectedUser">
                {{ selectedUser.name }} - 权限详情
              </h3>
              <h3 v-else>权限详情</h3>
              <div class="permission-actions">
                <el-button
                  v-if="selectedUser"
                  type="primary"
                  size="small"
                  @click="showAssignRoleDialog"
                >
                  分配角色
                </el-button>
                <el-button
                  v-if="selectedUser"
                  type="success"
                  size="small"
                  @click="showGrantPermissionDialog"
                >
                  授予权限
                </el-button>
                <el-button
                  v-if="selectedUser"
                  size="small"
                  @click="showInheritanceDialog"
                >
                  权限继承
                </el-button>
              </div>
            </div>
          </template>

          <div v-if="selectedUser" class="permission-content">
            <!-- 用户基本信息 -->
            <div class="user-basic-info">
              <el-descriptions :column="3" border>
                <el-descriptions-item label="用户ID">
                  {{ selectedUser.id }}
                </el-descriptions-item>
                <el-descriptions-item label="用户名">
                  {{ selectedUser.username }}
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="selectedUser.status === 'active' ? 'success' : 'danger'">
                    {{ selectedUser.status === 'active' ? '激活' : '禁用' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="部门">
                  {{ selectedUser.department || '未分配' }}
                </el-descriptions-item>
                <el-descriptions-item label="最后登录">
                  {{ formatDate(selectedUser.lastLogin) }}
                </el-descriptions-item>
                <el-descriptions-item label="权限总数">
                  {{ userPermissionCount }} 个
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <!-- 权限标签页 -->
            <el-tabs
              v-model="activePermissionTab"
              class="permission-tabs"
              @tab-change="handlePermissionTabChange"
            >
              <!-- 角色权限 -->
              <el-tab-pane label="角色权限" name="roles">
                <div class="role-permissions">
                  <div
                    v-for="role in selectedUser.roles"
                    :key="role.id"
                    class="role-permission-item"
                  >
                    <div class="role-header">
                      <el-tag
                        :style="{ backgroundColor: role.color, borderColor: role.color }"
                      >
                        {{ role.name }}
                      </el-tag>
                      <el-button
                        type="text"
                        size="small"
                        @click="removeUserRole(role)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <div class="role-permissions-list">
                      <el-tag
                        v-for="permission in role.permissions"
                        :key="permission"
                        size="small"
                        type="info"
                        class="permission-tag"
                      >
                        {{ permission }}
                      </el-tag>
                    </div>
                  </div>
                  <div v-if="selectedUser.roles.length === 0" class="no-roles">
                    <el-empty description="暂未分配角色" />
                  </div>
                </div>
              </el-tab-pane>

              <!-- 直接权限 -->
              <el-tab-pane label="直接权限" name="direct">
                <div class="direct-permissions">
                  <div class="permission-group">
                    <div
                      v-for="category in permissionCategories"
                      :key="category.key"
                      class="permission-category"
                    >
                      <h4>{{ category.name }}</h4>
                      <div class="permission-grid">
                        <el-checkbox
                          v-for="permission in category.permissions"
                          :key="permission.key"
                          v-model="permission.granted"
                          @change="handleDirectPermissionChange(permission)"
                        >
                          {{ permission.name }}
                        </el-checkbox>
                      </div>
                    </div>
                  </div>
                </div>
              </el-tab-pane>

              <!-- 继承权限 -->
              <el-tab-pane label="继承权限" name="inherited">
                <div class="inherited-permissions">
                  <div class="inheritance-tree">
                    <el-tree
                      :data="inheritanceTreeData"
                      :props="treeProps"
                      show-checkbox
                      node-key="id"
                      :default-checked-keys="checkedInheritanceNodes"
                      @check="handleInheritanceChange"
                    >
                      <template #default="{ node, data }">
                        <div class="tree-node-content">
                          <span class="node-label">{{ data.label }}</span>
                          <el-tag size="small" type="info" v-if="data.count">
                            {{ data.count }} 项权限
                          </el-tag>
                        </div>
                      </template>
                    </el-tree>
                  </div>
                </div>
              </el-tab-pane>

              <!-- 权限历史 -->
              <el-tab-pane label="权限历史" name="history">
                <div class="permission-history">
                  <el-timeline>
                    <el-timeline-item
                      v-for="history in permissionHistory"
                      :key="history.id"
                      :timestamp="formatDateTime(history.timestamp)"
                      :type="history.type"
                    >
                      <div class="history-content">
                        <div class="history-action">{{ history.action }}</div>
                        <div class="history-detail">{{ history.detail }}</div>
                        <div class="history-operator">操作人: {{ history.operator }}</div>
                      </div>
                    </el-timeline-item>
                  </el-timeline>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>

          <div v-else class="no-user-selected">
            <el-empty description="请选择一个用户查看权限详情" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分配角色对话框 -->
    <el-dialog
      v-model="assignRoleDialogVisible"
      title="分配角色"
      width="500px"
      :destroy-on-close="true"
    >
      <el-form label-width="80px">
        <el-form-item label="选择角色">
          <el-select
            v-model="selectedRoles"
            multiple
            placeholder="选择要分配的角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in availableRoles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
              :disabled="isRoleAssigned(role.id)"
            >
              <span style="float: left">{{ role.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ role.userCount }} 用户
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="生效时间">
          <el-date-picker
            v-model="roleEffectiveTime"
            type="datetime"
            placeholder="选择生效时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="过期时间">
          <el-date-picker
            v-model="roleExpireTime"
            type="datetime"
            placeholder="选择过期时间（可选）"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="assignRoleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUserRoleAssignment">确定</el-button>
      </template>
    </el-dialog>

    <!-- 授予权限对话框 -->
    <el-dialog
      v-model="grantPermissionDialogVisible"
      title="授予权限"
      width="600px"
      :destroy-on-close="true"
    >
      <div class="grant-permission-form">
        <el-form label-width="100px">
          <el-form-item label="权限类型">
            <el-radio-group v-model="permissionGrantType">
              <el-radio label="single">单个权限</el-radio>
              <el-radio label="batch">批量权限</el-radio>
              <el-radio label="template">权限模板</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 单个权限 -->
          <el-form-item v-if="permissionGrantType === 'single'" label="选择权限">
            <el-cascader
              v-model="selectedSinglePermission"
              :options="permissionCascadeOptions"
              :props="cascaderProps"
              placeholder="选择权限"
              style="width: 100%"
            />
          </el-form-item>

          <!-- 批量权限 -->
          <el-form-item v-if="permissionGrantType === 'batch'" label="权限模块">
            <el-checkbox-group v-model="selectedBatchPermissions">
              <el-checkbox
                v-for="module in permissionModules"
                :key="module.key"
                :label="module.key"
              >
                {{ module.name }} ({{ module.count }} 项)
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <!-- 权限模板 -->
          <el-form-item v-if="permissionGrantType === 'template'" label="选择模板">
            <el-select
              v-model="selectedPermissionTemplate"
              placeholder="选择权限模板"
              style="width: 100%"
            >
              <el-option
                v-for="template in permissionTemplates"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              >
                <span style="float: left">{{ template.name }}</span>
                <span style="float: right; color: #8492a6; font-size: 13px">
                  {{ template.permissionCount }} 权限
                </span>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="权限约束">
            <el-checkbox v-model="applyConstraints">应用权限约束</el-checkbox>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="grantPermissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePermissionGrant">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量分配对话框 -->
    <el-dialog
      v-model="batchAssignDialogVisible"
      title="批量分配权限"
      width="700px"
      :destroy-on-close="true"
    >
      <div class="batch-assign-form">
        <el-steps :active="batchAssignStep" align-center>
          <el-step title="选择用户" />
          <el-step title="选择权限" />
          <el-step title="确认分配" />
        </el-steps>

        <div class="batch-assign-content">
          <!-- 步骤1: 选择用户 -->
          <div v-if="batchAssignStep === 0" class="step-content">
            <h4>选择要分配权限的用户</h4>
            <el-transfer
              v-model="selectedBatchUsers"
              :data="allUsers"
              :titles="['可选用户', '已选用户']"
              :props="transferProps"
              filterable
              :filter-method="filterTransferUsers"
            />
          </div>

          <!-- 步骤2: 选择权限 -->
          <div v-if="batchAssignStep === 1" class="step-content">
            <h4>选择要分配的权限</h4>
            <el-checkbox-group v-model="selectedBatchPermissions">
              <div
                v-for="category in permissionCategories"
                :key="category.key"
                class="permission-category-group"
              >
                <h5>{{ category.name }}</h5>
                <el-row :gutter="16">
                  <el-col
                    v-for="permission in category.permissions"
                    :key="permission.key"
                    :span="8"
                  >
                    <el-checkbox :label="permission.key">
                      {{ permission.name }}
                    </el-checkbox>
                  </el-col>
                </el-row>
              </div>
            </el-checkbox-group>
          </div>

          <!-- 步骤3: 确认分配 -->
          <div v-if="batchAssignStep === 2" class="step-content">
            <h4>确认分配信息</h4>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="选中用户">
                {{ selectedBatchUsers.length }} 个用户
              </el-descriptions-item>
              <el-descriptions-item label="分配权限">
                {{ selectedBatchPermissions.length }} 项权限
              </el-descriptions-item>
              <el-descriptions-item label="预计生效时间">
                {{ formatDateTime(new Date()) }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <div class="batch-assign-actions">
          <el-button
            v-if="batchAssignStep > 0"
            @click="batchAssignStep--"
          >
            上一步
          </el-button>
          <el-button
            v-if="batchAssignStep < 2"
            type="primary"
            @click="batchAssignStep++"
          >
            下一步
          </el-button>
          <el-button
            v-if="batchAssignStep === 2"
            type="primary"
            @click="executeBatchAssign"
          >
            确认分配
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="batchAssignDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, UserFilled, Download, Refresh,
  MoreFilled, Delete
} from '@element-plus/icons-vue'
import enhancedPermissionService from '@/services/enhancedPermissionService'

// 响应式数据
const searchUser = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const selectedUser = ref(null)
const activePermissionTab = ref('roles')

// 对话框状态
const assignRoleDialogVisible = ref(false)
const grantPermissionDialogVisible = ref(false)
const batchAssignDialogVisible = ref(false)
const batchAssignStep = ref(0)

// 表单数据
const selectedRoles = ref([])
const roleEffectiveTime = ref(new Date())
const roleExpireTime = ref(null)
const permissionGrantType = ref('single')
const selectedSinglePermission = ref([])
const selectedBatchPermissions = ref([])
const selectedPermissionTemplate = ref('')
const applyConstraints = ref(false)
const selectedBatchUsers = ref([])
const checkedInheritanceNodes = ref([])

// 角色数据
const roles = ref([
  {
    id: '1',
    name: '村级管理员',
    color: '#409eff',
    userCount: 5,
    permissions: ['user:read', 'user:write', 'system:config']
  },
  {
    id: '2',
    name: '部门主管',
    color: '#67c23a',
    userCount: 12,
    permissions: ['resident:read', 'resident:write', 'finance:read']
  },
  {
    id: '3',
    name: '工作人员',
    color: '#e6a23c',
    userCount: 28,
    permissions: ['service:read', 'service:write']
  },
  {
    id: '4',
    name: '村民',
    color: '#909399',
    userCount: 1250,
    permissions: ['announcement:read', 'service:apply']
  }
])

// 用户数据
const users = ref([
  {
    id: '1',
    name: '张三',
    username: 'zhangsan',
    email: 'zhangsan@example.com',
    status: 'active',
    department: '村委会',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60),
    roles: [
      { id: '1', name: '村级管理员', color: '#409eff' }
    ],
    avatar: ''
  },
  {
    id: '2',
    name: '李四',
    username: 'lisi',
    email: 'lisi@example.com',
    status: 'active',
    department: '财务部',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
    roles: [
      { id: '2', name: '部门主管', color: '#67c23a' }
    ],
    avatar: ''
  },
  {
    id: '3',
    name: '王五',
    username: 'wangwu',
    email: 'wangwu@example.com',
    status: 'inactive',
    department: '服务部',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24),
    roles: [
      { id: '3', name: '工作人员', color: '#e6a23c' }
    ],
    avatar: ''
  }
])

// 权限分类
const permissionCategories = ref([
  {
    key: 'basic',
    name: '基础权限',
    permissions: [
      { key: 'user:read', name: '查看用户', granted: false },
      { key: 'user:write', name: '编辑用户', granted: false },
      { key: 'role:read', name: '查看角色', granted: false },
      { key: 'role:write', name: '编辑角色', granted: false }
    ]
  },
  {
    key: 'business',
    name: '业务权限',
    permissions: [
      { key: 'resident:read', name: '查看村民', granted: false },
      { key: 'resident:write', name: '编辑村民', granted: false },
      { key: 'finance:read', name: '查看财务', granted: false },
      { key: 'finance:write', name: '编辑财务', granted: false }
    ]
  }
])

// 权限历史
const permissionHistory = ref([
  {
    id: '1',
    action: '分配角色',
    detail: '分配角色"村级管理员"',
    operator: '系统管理员',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    type: 'primary'
  },
  {
    id: '2',
    action: '授予权限',
    detail: '授予"system:config"权限',
    operator: '张三',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    type: 'success'
  }
])

// 计算属性
const filteredUsers = computed(() => {
  let result = users.value

  if (searchUser.value) {
    const keyword = searchUser.value.toLowerCase()
    result = result.filter(user =>
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.username.toLowerCase().includes(keyword)
    )
  }

  if (filterRole.value) {
    result = result.filter(user =>
      user.roles.some(role => role.id === filterRole.value)
    )
  }

  if (filterStatus.value) {
    result = result.filter(user => user.status === filterStatus.value)
  }

  return result
})

const availableRoles = computed(() => {
  if (!selectedUser.value) return roles.value

  return roles.value.filter(role =>
    !selectedUser.value.roles.some(userRole => userRole.id === role.id)
  )
})

const userPermissionCount = computed(() => {
  if (!selectedUser.value) return 0

  let count = 0

  // 角色权限
  selectedUser.value.roles.forEach(role => {
    const roleData = roles.value.find(r => r.id === role.id)
    if (roleData) {
      count += roleData.permissions.length
    }
  })

  // 直接权限
  permissionCategories.value.forEach(category => {
    count += category.permissions.filter(p => p.granted).length
  })

  return count
})

const permissionCascadeOptions = computed(() => {
  return permissionCategories.value.map(category => ({
    label: category.name,
    value: category.key,
    children: category.permissions.map(permission => ({
      label: permission.name,
      value: permission.key
    }))
  }))
})

const cascaderProps = {
  expandTrigger: 'hover',
  multiple: true
}

const permissionModules = computed(() => {
  return permissionCategories.value.map(category => ({
    key: category.key,
    name: category.name,
    count: category.permissions.length
  }))
})

const permissionTemplates = ref([
  { id: '1', name: '基础权限模板', permissionCount: 10 },
  { id: '2', name: '管理权限模板', permissionCount: 25 },
  { id: '3', name: '只读权限模板', permissionCount: 15 }
])

const inheritanceTreeData = ref([
  {
    id: '1',
    label: '村级管理员',
    count: 15,
    children: [
      {
        id: '1-1',
        label: '用户管理',
        count: 4,
        children: [
          { id: '1-1-1', label: '查看用户', count: 1 },
          { id: '1-1-2', label: '编辑用户', count: 1 },
          { id: '1-1-3', label: '创建用户', count: 1 },
          { id: '1-1-4', label: '删除用户', count: 1 }
        ]
      }
    ]
  }
])

const treeProps = {
  children: 'children',
  label: 'label'
}

const allUsers = ref([])
const transferProps = {
  key: 'id',
  label: 'name'
}

// 方法
const handleUserSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

const handleRoleFilter = () => {
  // 过滤逻辑已通过计算属性实现
}

const handleStatusFilter = () => {
  // 过滤逻辑已通过计算属性实现
}

const selectUser = (user) => {
  selectedUser.value = user
  loadUserPermissions(user)
}

const loadUserPermissions = (user) => {
  // 加载用户权限数据
  console.log('加载用户权限:', user.id)
}

const handlePermissionTabChange = (tabName) => {
  activePermissionTab.value = tabName
}

const handleDirectPermissionChange = (permission) => {
  console.log('直接权限变更:', permission.key, permission.granted)
}

const handleInheritanceChange = (data, checked) => {
  console.log('继承权限变更:', data, checked)
}

const handleUserAction = async (command) => {
  const [action, userId] = command.split('-')
  const user = users.value.find(u => u.id === userId)

  switch (action) {
    case 'edit':
      ElMessage.info('编辑用户功能待实现')
      break

    case 'permissions':
      selectUser(user)
      break

    case 'copy':
      ElMessage.info('复制权限功能待实现')
      break

    case 'toggle':
      try {
        user.status = user.status === 'active' ? 'inactive' : 'active'
        ElMessage.success(`用户"${user.name}"已${user.status === 'active' ? '激活' : '禁用'}`)
      } catch (error) {
        user.status = user.status === 'active' ? 'inactive' : 'active'
        ElMessage.error('更新用户状态失败')
      }
      break

    case 'reset':
      try {
        await ElMessageBox.confirm(
          `确定要重置用户"${user.name}"的所有权限吗？`,
          '确认重置',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        ElMessage.success('权限重置成功')
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('重置权限失败')
        }
      }
      break
  }
}

const isRoleAssigned = (roleId) => {
  return selectedUser.value?.roles.some(role => role.id === roleId)
}

const showAssignRoleDialog = () => {
  selectedRoles.value = []
  roleEffectiveTime.value = new Date()
  roleExpireTime.value = null
  assignRoleDialogVisible.value = true
}

const saveUserRoleAssignment = async () => {
  try {
    if (!selectedUser.value || selectedRoles.value.length === 0) {
      ElMessage.warning('请选择要分配的角色')
      return
    }

    // 更新用户角色
    selectedRoles.value.forEach(roleId => {
      const role = roles.value.find(r => r.id === roleId)
      if (role && !isRoleAssigned(roleId)) {
        selectedUser.value.roles.push({
          id: role.id,
          name: role.name,
          color: role.color
        })
      }
    })

    ElMessage.success('角色分配成功')
    assignRoleDialogVisible.value = false
  } catch (error) {
    ElMessage.error('角色分配失败')
  }
}

const removeUserRole = async (role) => {
  try {
    await ElMessageBox.confirm(
      `确定要移除角色"${role.name}"吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const index = selectedUser.value.roles.findIndex(r => r.id === role.id)
    selectedUser.value.roles.splice(index, 1)

    ElMessage.success('角色移除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除角色失败')
    }
  }
}

const showGrantPermissionDialog = () => {
  permissionGrantType.value = 'single'
  selectedSinglePermission.value = []
  selectedBatchPermissions.value = []
  selectedPermissionTemplate.value = ''
  applyConstraints.value = false
  grantPermissionDialogVisible.value = true
}

const savePermissionGrant = async () => {
  try {
    ElMessage.success('权限授予成功')
    grantPermissionDialogVisible.value = false
  } catch (error) {
    ElMessage.error('权限授予失败')
  }
}

const showInheritanceDialog = () => {
  ElMessage.info('权限继承配置功能待实现')
}

const showBatchAssignDialog = () => {
  batchAssignStep.value = 0
  selectedBatchUsers.value = []
  selectedBatchPermissions.value = []
  allUsers.value = users.value.map(user => ({
    id: user.id,
    name: `${user.name} (${user.username})`
  }))
  batchAssignDialogVisible.value = true
}

const filterTransferUsers = (query, item) => {
  return item.name.toLowerCase().includes(query.toLowerCase())
}

const executeBatchAssign = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要为 ${selectedBatchUsers.value.length} 个用户分配 ${selectedBatchPermissions.value.length} 项权限吗？`,
      '确认批量分配',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    ElMessage.success('批量权限分配成功')
    batchAssignDialogVisible.value = false
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量权限分配失败')
    }
  }
}

const exportUserPermissions = () => {
  ElMessage.info('导出用户权限功能待实现')
}

const refreshUserList = () => {
  ElMessage.success('用户列表已刷新')
}

// 工具方法
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

const formatDateTime = (date) => {
  return new Date(date).toLocaleString()
}

// 生命周期
onMounted(() => {
  // 初始化数据
})
</script>

<style lang="scss" scoped>
.user-permission-assignment {
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .toolbar-left {
      display: flex;
      align-items: center;
    }

    .toolbar-right {
      display: flex;
      gap: 12px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .user-count {
      font-size: 14px;
      color: #909399;
    }
  }

  .user-list-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .user-list {
      height: calc(100% - 60px);
      overflow-y: auto;
    }

    .user-item {
      display: flex;
      align-items: center;
      padding: 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: #f5f7fa;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background: #e6e8eb;
      }

      &.active {
        background: #ecf5ff;
        border: 1px solid #409eff;
      }

      .user-avatar {
        position: relative;
        margin-right: 12px;

        .user-status {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;

          &.active {
            background: #67c23a;
          }

          &.inactive {
            background: #f56c6c;
          }
        }
      }

      .user-info {
        flex: 1;

        .user-name {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .user-email {
          font-size: 14px;
          color: #606266;
          margin-bottom: 8px;
        }

        .user-roles {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
      }

      .user-actions {
        opacity: 0;
        transition: opacity 0.3s ease;

        .user-item:hover & {
          opacity: 1;
        }
      }
    }
  }

  .permission-detail-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .card-header {
      .permission-actions {
        display: flex;
        gap: 8px;
      }
    }

    .permission-content {
      height: calc(100% - 60px);
      overflow: hidden;

      .user-basic-info {
        margin-bottom: 24px;
      }

      .permission-tabs {
        height: calc(100% - 120px);

        :deep(.el-tabs__content) {
          height: calc(100% - 40px);
          overflow-y: auto;
        }
      }

      .role-permissions {
        .role-permission-item {
          padding: 16px;
          margin-bottom: 12px;
          background: #f5f7fa;
          border-radius: 6px;

          .role-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .role-permissions-list {
            .permission-tag {
              margin-right: 8px;
              margin-bottom: 4px;
            }
          }
        }

        .no-roles {
          padding: 40px;
          text-align: center;
        }
      }

      .direct-permissions {
        .permission-group {
          .permission-category {
            margin-bottom: 24px;

            h4 {
              margin-bottom: 12px;
              color: #2c3e50;
            }

            .permission-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 12px;
            }
          }
        }
      }

      .inherited-permissions {
        .inheritance-tree {
          padding: 16px;
          background: #f5f7fa;
          border-radius: 6px;

          .tree-node-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
        }
      }

      .permission-history {
        padding: 0 16px;

        .history-content {
          .history-action {
            font-weight: 500;
            color: #2c3e50;
            margin-bottom: 4px;
          }

          .history-detail {
            color: #606266;
            margin-bottom: 4px;
          }

          .history-operator {
            font-size: 12px;
            color: #909399;
          }
        }
      }
    }

    .no-user-selected {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .grant-permission-form {
    .permission-category-group {
      margin-bottom: 24px;

      h5 {
        margin-bottom: 12px;
        color: #2c3e50;
      }
    }
  }

  .batch-assign-form {
    .batch-assign-content {
      margin-top: 24px;
      min-height: 300px;

      .step-content {
        h4 {
          margin-bottom: 16px;
          color: #2c3e50;
        }

        .permission-category-group {
          margin-bottom: 24px;
          padding: 16px;
          background: #f5f7fa;
          border-radius: 6px;
        }
      }
    }

    .batch-assign-actions {
      margin-top: 24px;
      text-align: center;
    }
  }

  :deep(.warning-item) {
    color: #e6a23c;
  }
}
</style>