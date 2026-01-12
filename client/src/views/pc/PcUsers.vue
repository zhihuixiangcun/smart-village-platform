<!--
  PC端用户管理页面
  智慧乡村综合服务平台 - PC端用户管理
-->
<template>
  <div class="pc-users">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>用户管理</h1>
        <p>系统用户管理、角色分配、权限控制、账户状态管理</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showAddUserDialog" aria-label="添加用户">
          <el-icon><Plus /></el-icon>
          添加用户
        </el-button>
        <el-button @click="showRoleDialog" aria-label="角色管理">
          <el-icon><UserFilled /></el-icon>
          角色管理
        </el-button>
        <el-button @click="showPermissionDialog" aria-label="权限配置">
          <el-icon><Key /></el-icon>
          权限配置
        </el-button>
      </div>
    </header>

    <!-- 统计概览 -->
    <section class="stats-section">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="8" :md="4" v-for="stat in userStats" :key="stat.key">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" :style="{ background: stat.gradient }">
                <el-icon :size="24" color="white">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <SkeletonScreen v-if="loading" type="card" :rows="5" />
    </section>

    <!-- 搜索筛选 -->
    <section class="filter-section">
      <el-card shadow="never">
        <div class="filter-content">
          <div class="search-area">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户名、姓名、手机号..."
              prefix-icon="Search"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
              class="search-input"
              aria-label="搜索用户"
            />
          </div>
          <div class="filter-area">
            <el-select v-model="roleFilter" placeholder="角色筛选" clearable @change="handleSearch" aria-label="角色筛选">
              <el-option label="全部" value="" />
              <el-option label="系统管理员" value="admin" />
              <el-option label="村干部" value="village_admin" />
              <el-option label="普通用户" value="user" />
              <el-option label="访客" value="guest" />
            </el-select>
            <el-select
              v-model="statusFilter"
              placeholder="状态筛选"
              clearable
              @change="handleSearch"
              aria-label="状态筛选"
            >
              <el-option label="全部" value="" />
              <el-option label="正常" value="active" />
              <el-option label="禁用" value="disabled" />
              <el-option label="待审核" value="pending" />
            </el-select>
            <el-button type="primary" @click="handleSearch" aria-label="搜索">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetFilters" aria-label="重置筛选">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </div>
        </div>
      </el-card>
    </section>

    <!-- 用户表格 -->
    <section class="table-section">
      <el-card shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">用户列表</span>
            <div class="table-actions">
              <span class="total-count">共 {{ pagination.total }} 位用户</span>
              <el-dropdown @command="handleBatchCommand" trigger="click">
                <el-button :disabled="selectedUsers.length === 0" aria-label="批量操作">
                  批量操作 ({{ selectedUsers.length }})
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="enable" aria-label="启用选中用户">
                      <el-icon><CircleCheck /></el-icon>启用选中
                    </el-dropdown-item>
                    <el-dropdown-item command="disable" aria-label="禁用选中用户">
                      <el-icon><CircleClose /></el-icon>禁用选中
                    </el-dropdown-item>
                    <el-dropdown-item command="resetPwd" divided aria-label="重置选中用户密码">
                      <el-icon><RefreshRight /></el-icon>重置密码
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" :disabled="selectedUsers.length === 0" aria-label="删除选中用户">
                      <el-icon><Delete /></el-icon>删除选中
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>

        <el-table
          :data="filteredUsers"
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
          v-loading="loading"
          v-show="!loading"
          aria-label="用户列表"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="用户信息" min-width="200">
            <template #default="{ row }">
              <div class="user-info" role="button" tabindex="0" :aria-label="`${row.username}，${row.realName}`">
                <el-avatar :size="44" :src="row.avatar" :aria-label="`${row.username}的头像`">
                  {{ row.name?.charAt(0) || '用' }}
                </el-avatar>
                <div class="info-content">
                  <div class="info-name">
                    {{ row.username }}
                    <el-tag v-if="row.isAdmin" type="danger" size="small">管理员</el-tag>
                  </div>
                  <div class="info-meta">
                    <span>{{ row.realName }}</span>
                    <span class="divider">|</span>
                    <span>{{ row.phone }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="role" label="角色" width="140">
            <template #default="{ row }">
              <el-tag :type="getRoleType(row.role)" size="small">
                {{ getRoleLabel(row.role) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="department" label="部门" width="120" />
          <el-table-column prop="lastLogin" label="最后登录" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.lastLogin) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" text @click="viewUser(row)" aria-label="查看用户详情">详情</el-button>
              <el-button size="small" text @click="editUser(row)" aria-label="编辑用户">编辑</el-button>
              <el-dropdown @command="command => handleRowCommand(command, row)" trigger="click">
                <el-button size="small" aria-label="更多操作">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="resetPwd" aria-label="重置密码">
                      <el-icon><Key /></el-icon>重置密码
                    </el-dropdown-item>
                    <el-dropdown-item command="assignRole" aria-label="分配角色">
                      <el-icon><UserFilled /></el-icon>分配角色
                    </el-dropdown-item>
                    <el-dropdown-item command="loginLog" aria-label="查看登录日志">
                      <el-icon><Clock /></el-icon>登录日志
                    </el-dropdown-item>
                    <el-dropdown-item command="disable" v-if="row.status === 'active'" aria-label="禁用账户">
                      <el-icon><CircleClose /></el-icon>禁用账户
                    </el-dropdown-item>
                    <el-dropdown-item command="enable" v-if="row.status === 'disabled'" aria-label="启用账户">
                      <el-icon><CircleCheck /></el-icon>启用账户
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided aria-label="删除用户">
                      <el-icon><Delete /></el-icon>删除用户
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
            aria-label="分页器"
          />
        </div>
      </el-card>
    </section>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="showUserDialog"
      :title="isEditing ? '编辑用户' : '添加用户'"
      width="700px"
      destroy-on-close
      aria-modal="true"
      :aria-labelledby="'user-dialog-title'"
    >
      <template #header>
        <span id="user-dialog-title">{{ isEditing ? '编辑用户' : '添加用户' }}</span>
      </template>
      <el-form :model="userForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="userForm.username"
                placeholder="请输入用户名"
                :disabled="isEditing"
                aria-required="true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="真实姓名" prop="realName">
              <el-input v-model="userForm.realName" placeholder="请输入真实姓名" aria-required="true" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="userForm.phone" placeholder="请输入手机号" aria-required="true" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="userForm.email" placeholder="请输入邮箱" aria-label="邮箱地址" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色" prop="role">
              <el-select v-model="userForm.role" placeholder="请选择角色" aria-required="true">
                <el-option label="系统管理员" value="admin" />
                <el-option label="村干部" value="village_admin" />
                <el-option label="普通用户" value="user" />
                <el-option label="访客" value="guest" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="department">
              <el-input v-model="userForm.department" placeholder="请输入部门" aria-label="部门名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item v-if="!isEditing" label="初始密码" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入初始密码"
            show-password
            aria-required="true"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="userForm.status" role="radiogroup" aria-label="账户状态">
            <el-radio label="active">正常</el-radio>
            <el-radio label="disabled">禁用</el-radio>
            <el-radio label="pending">待审核</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="userForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
            aria-label="备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUserDialog = false" aria-label="取消">取消</el-button>
        <el-button type="primary" @click="saveUser" :loading="saving" aria-label="保存用户">保存</el-button>
      </template>
    </el-dialog>

    <!-- 用户详情抽屉 -->
    <el-drawer v-model="showDetailDrawer" title="用户详情" size="600px" destroy-on-close role="dialog" aria-label="用户详情">
      <div class="detail-content" v-if="selectedUser">
        <el-descriptions :column="2" border aria-label="用户基本信息">
          <el-descriptions-item label="用户名">{{ selectedUser.username }}</el-descriptions-item>
          <el-descriptions-item label="真实姓名">{{ selectedUser.realName }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ selectedUser.phone }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ selectedUser.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleType(selectedUser.role)" size="small" :aria-label="`角色：${getRoleLabel(selectedUser.role)}`">
              {{ getRoleLabel(selectedUser.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedUser.status)" size="small" :aria-label="`状态：${getStatusLabel(selectedUser.status)}`">
              {{ getStatusLabel(selectedUser.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="部门">{{
            selectedUser.department || '-'
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{
            formatDateTime(selectedUser.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{
            formatDateTime(selectedUser.lastLogin)
          }}</el-descriptions-item>
          <el-descriptions-item label="登录次数"
            >{{ selectedUser.loginCount }}次</el-descriptions-item
          >
        </el-descriptions>

        <div class="permission-section" role="region" aria-label="拥有的权限">
          <h4>拥有的权限</h4>
          <div class="permission-tags" role="list">
            <el-tag
              v-for="perm in selectedUser.permissions"
              :key="perm"
              size="small"
              class="permission-tag"
              :aria-label="`权限：${perm}`"
              role="listitem"
            >
              {{ perm }}
            </el-tag>
          </div>
        </div>

        <div class="login-history-section" role="region" aria-label="最近登录记录">
          <h4>最近登录记录</h4>
          <el-table :data="selectedUser.loginHistory" style="width: 100%" size="small" aria-label="登录历史">
            <el-table-column prop="time" label="时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.time) }}
              </template>
            </el-table-column>
            <el-table-column prop="ip" label="IP地址" width="140" />
            <el-table-column prop="device" label="设备信息" />
          </el-table>
        </div>
      </div>
    </el-drawer>

    <!-- 角色管理对话框 -->
    <el-dialog v-model="showRoleDialogVisible" title="角色管理" width="800px" destroy-on-close aria-modal="true" aria-labelledby="role-dialog-title">
      <template #header>
        <span id="role-dialog-title">角色管理</span>
      </template>
      <el-table :data="roles" style="width: 100%" aria-label="角色列表">
        <el-table-column prop="key" label="角色标识" width="150" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="userCount" label="用户数" width="100" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="editRole(row)" aria-label="编辑角色">编辑</el-button>
            <el-button size="small" type="danger" text @click="deleteRole(row)" aria-label="删除角色">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showRoleDialogVisible = false" aria-label="关闭">关闭</el-button>
        <el-button type="primary" @click="addRole" aria-label="添加角色">添加角色</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import {
  Plus,
  UserFilled,
  Key,
  Search,
  Refresh,
  ArrowDown,
  CircleCheck,
  CircleClose,
  RefreshRight,
  Delete,
  Clock,
} from '@element-plus/icons-vue';
import SkeletonScreen from '@/components/common/SkeletonScreen.vue';

interface User {
  id: string;
  username: string;
  realName: string;
  phone: string;
  email?: string;
  role: string;
  department?: string;
  status: 'active' | 'disabled' | 'pending';
  avatar?: string;
  isAdmin: boolean;
  permissions: string[];
  createdAt: Date;
  lastLogin: Date;
  loginCount: number;
  loginHistory: { time: Date; ip: string; device: string }[];
}

interface Role {
  key: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

const userStore = useUserStore();
const formRef = ref<FormInstance | null>(null);

const loading = ref(true);
const saving = ref(false);
const isEditing = ref(false);
const showUserDialog = ref(false);
const showDetailDrawer = ref(false);
const showRoleDialogVisible = ref(false);
const searchKeyword = ref('');
const roleFilter = ref('');
const statusFilter = ref('');
const selectedUser = ref<User | null>(null);
const selectedUsers = ref<User[]>([]);

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0,
});

const userStats = ref([
  {
    key: 'total',
    label: '用户总数',
    value: 45,
    icon: 'User',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
  },
  {
    key: 'admin',
    label: '管理员',
    value: 3,
    icon: 'UserFilled',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  },
  {
    key: 'active',
    label: '正常用户',
    value: 40,
    icon: 'CircleCheck',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  },
  {
    key: 'disabled',
    label: '禁用用户',
    value: 2,
    icon: 'CircleClose',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  },
  {
    key: 'pending',
    label: '待审核',
    value: 3,
    icon: 'Clock',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
  },
]);

const users = ref<User[]>([
  {
    id: '1',
    username: 'admin',
    realName: '系统管理员',
    phone: '138****0001',
    email: 'admin@village.com',
    role: 'admin',
    department: '村委会',
    status: 'active',
    isAdmin: true,
    permissions: ['*'],
    createdAt: new Date(Date.now() - 365 * 86400000),
    lastLogin: new Date(),
    loginCount: 365,
    loginHistory: [
      { time: new Date(), ip: '192.168.1.100', device: 'Chrome / Windows' },
      { time: new Date(Date.now() - 86400000), ip: '192.168.1.100', device: 'Chrome / Windows' },
    ],
  },
  {
    id: '2',
    username: 'zhangsan',
    realName: '张三',
    phone: '138****1234',
    email: 'zhangsan@village.com',
    role: 'village_admin',
    department: '村委会',
    status: 'active',
    isAdmin: false,
    permissions: ['resident:read', 'resident:write', 'village:read'],
    createdAt: new Date(Date.now() - 180 * 86400000),
    lastLogin: new Date(Date.now() - 3600000),
    loginCount: 156,
    loginHistory: [],
  },
  {
    id: '3',
    username: 'lisi',
    realName: '李四',
    phone: '138****5678',
    role: 'village_admin',
    department: '村委会',
    status: 'active',
    isAdmin: false,
    permissions: ['resident:read', 'village:read', 'finance:read'],
    createdAt: new Date(Date.now() - 90 * 86400000),
    lastLogin: new Date(Date.now() - 86400000),
    loginCount: 89,
    loginHistory: [],
  },
  {
    id: '4',
    username: 'wangwu',
    realName: '王五',
    phone: '138****9012',
    role: 'user',
    status: 'active',
    isAdmin: false,
    permissions: ['profile:read', 'profile:write'],
    createdAt: new Date(Date.now() - 30 * 86400000),
    lastLogin: new Date(Date.now() - 172800000),
    loginCount: 28,
    loginHistory: [],
  },
  {
    id: '5',
    username: 'zhaoliu',
    realName: '赵六',
    phone: '138****3456',
    role: 'user',
    status: 'disabled',
    isAdmin: false,
    permissions: ['profile:read'],
    createdAt: new Date(Date.now() - 60 * 86400000),
    lastLogin: new Date(Date.now() - 30 * 86400000),
    loginCount: 12,
    loginHistory: [],
  },
]);

const roles = ref<Role[]>([
  {
    key: 'admin',
    name: '系统管理员',
    description: '拥有所有系统权限',
    userCount: 1,
    permissions: ['*'],
  },
  {
    key: 'village_admin',
    name: '村干部',
    description: '村务管理权限',
    userCount: 5,
    permissions: [],
  },
  { key: 'user', name: '普通用户', description: '基础查看权限', userCount: 38, permissions: [] },
  { key: 'guest', name: '访客', description: '仅查看公开信息', userCount: 1, permissions: [] },
]);

const userForm = reactive({
  username: '',
  realName: '',
  phone: '',
  email: '',
  role: 'user',
  department: '',
  password: '',
  status: 'pending',
  remark: '',
});

const formRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: [{ required: true, message: '请输入初始密码', trigger: 'blur', min: 6 }],
};

const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchSearch =
      !searchKeyword.value ||
      user.username.includes(searchKeyword.value) ||
      user.realName.includes(searchKeyword.value) ||
      user.phone.includes(searchKeyword.value);
    const matchRole = !roleFilter.value || user.role === roleFilter.value;
    const matchStatus = !statusFilter.value || user.status === statusFilter.value;
    return matchSearch && matchRole && matchStatus;
  });
});

const formatDateTime = (date: Date | undefined): string => {
  if (!date) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const getRoleType = (role: string): string => {
  const typeMap: Record<string, string> = {
    admin: 'danger',
    village_admin: 'warning',
    user: 'primary',
    guest: 'info',
  };
  return typeMap[role] || 'info';
};

const getRoleLabel = (role: string): string => {
  const labelMap: Record<string, string> = {
    admin: '系统管理员',
    village_admin: '村干部',
    user: '普通用户',
    guest: '访客',
  };
  return labelMap[role] || role;
};

const getStatusType = (status: string): string => {
  const typeMap: Record<string, string> = {
    active: 'success',
    disabled: 'danger',
    pending: 'warning',
  };
  return typeMap[status] || 'info';
};

const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    active: '正常',
    disabled: '禁用',
    pending: '待审核',
  };
  return labelMap[status] || status;
};

const handleSearch = () => {
  pagination.currentPage = 1;
};

const resetFilters = () => {
  searchKeyword.value = '';
  roleFilter.value = '';
  statusFilter.value = '';
  handleSearch();
};

const handleSelectionChange = (selection: User[]) => {
  selectedUsers.value = selection;
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
};

const handlePageChange = (page: number) => {
  pagination.currentPage = page;
};

const handleBatchCommand = (command: string) => {
  switch (command) {
    case 'enable':
      ElMessage.success(`已启用 ${selectedUsers.value.length} 个用户`);
      break;
    case 'disable':
      ElMessage.success(`已禁用 ${selectedUsers.value.length} 个用户`);
      break;
    case 'resetPwd':
      ElMessage.info('密码重置邮件已发送');
      break;
    case 'delete':
      handleBatchDelete();
      break;
  }
};

const handleRowCommand = (command: string, row: User) => {
  switch (command) {
    case 'resetPwd':
      ElMessage.info(`重置 ${row.username} 的密码`);
      break;
    case 'assignRole':
      ElMessage.info(`为 ${row.username} 分配角色`);
      break;
    case 'loginLog':
      ElMessage.info(`查看 ${row.username} 的登录日志`);
      break;
    case 'disable':
      row.status = 'disabled';
      ElMessage.success('用户已禁用');
      break;
    case 'enable':
      row.status = 'active';
      ElMessage.success('用户已启用');
      break;
    case 'delete':
      deleteUser(row);
      break;
  }
};

const showAddUserDialog = () => {
  isEditing.value = false;
  resetForm();
  showUserDialog.value = true;
};

const viewUser = (user: User) => {
  selectedUser.value = user;
  showDetailDrawer.value = true;
};

const editUser = (user: User) => {
  isEditing.value = true;
  Object.assign(userForm, user);
  showUserDialog.value = true;
};

const deleteUser = async (user: User) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${user.username}" 吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    users.value = users.value.filter(u => u.id !== user.id);
    ElMessage.success('删除成功');
  } catch {}
};

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUsers.value.length} 位用户吗？`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    ElMessage.success('批量删除成功');
  } catch {}
};

const resetForm = () => {
  Object.assign(userForm, {
    username: '',
    realName: '',
    phone: '',
    email: '',
    role: 'user',
    department: '',
    password: '',
    status: 'pending',
    remark: '',
  });
};

const saveUser = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
    saving.value = true;

    if (isEditing.value) {
      ElMessage.success('用户更新成功');
    } else {
      ElMessage.success('用户添加成功');
    }
    showUserDialog.value = false;
  } catch {
    console.error('表单验证失败');
  } finally {
    saving.value = false;
  }
};

const showRoleDialog = () => {
  showRoleDialogVisible.value = true;
};

const showPermissionDialog = () => {
  ElMessage.info('权限配置功能开发中');
};

const editRole = (role: Role) => {
  ElMessage.info(`编辑角色: ${role.name}`);
};

const deleteRole = async (role: Role) => {
  try {
    await ElMessageBox.confirm(`确定要删除角色 "${role.name}" 吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    roles.value = roles.value.filter(r => r.key !== role.key);
    ElMessage.success('删除成功');
  } catch {}
};

const addRole = () => {
  ElMessage.info('添加角色功能开发中');
};

onMounted(() => {
  setTimeout(() => {
    loading.value = false;
    pagination.total = users.value.length;
  }, 500);
});
</script>

<style lang="scss" scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes rotateIn {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bounceIn {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

.pc-users {
  padding: 0;
  animation: fadeIn 0.6s ease-out;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  .header-content {
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  margin-bottom: 20px;
  opacity: 0;
  animation: scaleIn 0.5s ease-out forwards;

  &:nth-child(1) {
    animation-delay: 0.1s;
  }
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.3s;
  }
  &:nth-child(4) {
    animation-delay: 0.4s;
  }
  &:nth-child(5) {
    animation-delay: 0.5s;
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }

    .stat-label {
      font-size: 13px;
      color: #909399;
    }
  }
}

.filter-section {
  margin-bottom: 24px;

  .filter-content {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: center;
  }

  .search-area {
    flex: 1;
    min-width: 280px;

    .search-input {
      width: 100%;
    }
  }

  .filter-area {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.table-section {
  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .table-title {
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .table-actions {
      display: flex;
      align-items: center;
      gap: 16px;

      .total-count {
        font-size: 14px;
        color: #909399;
      }
    }
  }

  :deep(.el-table__row) {
    opacity: 0;
    animation: fadeIn 0.4s ease-out forwards;
  }

  :deep(.el-table__row:nth-child(1)) {
    animation-delay: 0.1s;
  }

  :deep(.el-table__row:nth-child(2)) {
    animation-delay: 0.15s;
  }

  :deep(.el-table__row:nth-child(3)) {
    animation-delay: 0.2s;
  }

  :deep(.el-table__row:nth-child(4)) {
    animation-delay: 0.25s;
  }

  :deep(.el-table__row:nth-child(5)) {
    animation-delay: 0.3s;
  }

  :deep(.el-table__row:nth-child(6)) {
    animation-delay: 0.35s;
  }

  :deep(.el-table__row:nth-child(7)) {
    animation-delay: 0.4s;
  }

  :deep(.el-table__row:nth-child(8)) {
    animation-delay: 0.45s;
  }

  :deep(.el-table__row:nth-child(9)) {
    animation-delay: 0.5s;
  }

  :deep(.el-table__row:nth-child(10)) {
    animation-delay: 0.55s;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
    background-color: #f5f7fa;
  }

  .el-avatar {
    transition: transform 0.3s ease;

    &:hover {
      animation: rotateIn 0.6s ease-in-out;
    }
  }

  .info-content {
    .info-name {
      font-weight: 500;
      color: #303133;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #606266;

      .divider {
        color: #dcdfe6;
      }
    }
  }
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

:deep(.el-button) {
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.95);
  }
}

:deep(.el-dropdown-menu__item) {
  opacity: 0;
  animation: fadeIn 0.3s ease-out forwards;
}

:deep(.el-dropdown-menu__item:nth-child(1)) {
  animation-delay: 0.1s;
}

:deep(.el-dropdown-menu__item:nth-child(2)) {
  animation-delay: 0.15s;
}

:deep(.el-dropdown-menu__item:nth-child(3)) {
  animation-delay: 0.2s;
}

:deep(.el-dropdown-menu__item:nth-child(4)) {
  animation-delay: 0.25s;
}

:deep(.el-dropdown-menu__item:nth-child(5)) {
  animation-delay: 0.3s;
}

:deep(.el-dropdown-menu__item:nth-child(6)) {
  animation-delay: 0.35s;
}

:deep(.el-dropdown-menu__item:nth-child(7)) {
  animation-delay: 0.4s;
}

:deep(.el-dialog__body) {
  animation: fadeIn 0.3s ease-out;
}

:deep(.el-drawer__body) {
  animation: slideIn 0.3s ease-out;
}

.detail-content {
  .permission-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #ebeef5;

    h4 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }

    .permission-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .permission-tag {
        margin: 0;
      }
    }
  }

  .login-history-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #ebeef5;

    h4 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;

    .header-content {
      width: 100%;

      h1 {
        font-size: 20px;
      }

      p {
        font-size: 13px;
      }
    }

    .header-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;

      .el-button {
        width: 100%;
        justify-content: center;
      }
    }
  }

  .stat-card {
    .stat-content {
      gap: 12px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
    }

    .stat-info {
      .stat-value {
        font-size: 22px;
      }

      .stat-label {
        font-size: 12px;
      }
    }
  }

  .filter-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .search-area {
    width: 100%;
    min-width: auto;
  }

  .filter-area {
    width: 100%;
    flex-direction: column;

    .el-select {
      width: 100%;
    }

    .el-button {
      width: 100%;
    }
  }

  .table-section {
    .el-card {
      overflow: hidden;
    }

    .table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;

      .el-table {
        min-width: 800px;
      }
    }

    .table-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .table-actions {
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;

        .el-dropdown {
          width: 100%;

          .el-button {
            width: 100%;
          }
        }
      }
    }
  }

  .user-info {
    gap: 10px;

    .el-avatar {
      width: 36px;
      height: 36px;
      font-size: 14px;
    }

    .info-content {
      .info-name {
        font-size: 14px;
      }

      .info-meta {
        font-size: 12px;
      }
    }
  }

  .pagination-container {
    .el-pagination {
      flex-wrap: wrap;
      justify-content: center;
    }

    .el-pagination .el-pager li,
    .el-pagination button {
      min-width: 32px;
      height: 32px;
      font-size: 12px;
    }
  }

  .el-dialog {
    width: 95% !important;
    margin: 5% auto;
  }

  .el-drawer {
    width: 100% !important;
  }
}
</style>
