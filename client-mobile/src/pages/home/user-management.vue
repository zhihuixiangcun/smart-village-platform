<template>
  <div class="user-management">
    <!-- Loading Skeleton State -->
    <div v-if="loading" class="loading-container">
      <div class="skeleton-header"></div>
      <div class="skeleton-content">
        <div class="skeleton-search"></div>
        <div class="skeleton-tabs"></div>
        <div class="skeleton-list"></div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Header -->
      <header class="header">
        <div class="header-title">用户管理</div>
        <button class="add-btn" @click="showCreateDialog" aria-label="添加用户">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <path d="M12 12h.01"/>
          </svg>
        </button>
      </header>

      <!-- Search Bar -->
      <div class="search-section">
        <div class="search-input-wrapper">
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索用户名、手机号..."
            @input="handleSearch"
          />
          <span v-if="searchKeyword" class="clear-btn" @click="clearSearch">✕</span>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-section">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ 'filter-tab--active': activeTab === tab.value }"
          @click="filterByTab(tab.value)"
        >
          <span class="tab-name">{{ tab.label }}</span>
          <span v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</span>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalUsers }}</div>
          <div class="stat-label">总用户数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.activeUsers }}</div>
          <div class="stat-label">活跃用户</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.suspendedUsers }}</div>
          <div class="stat-label">已禁用</div>
        </div>
      </div>

      <!-- User List -->
      <div class="user-list">
        <div class="list-header">
          <div class="list-title">用户列表</div>
          <div class="list-count">共 {{ pagination.total }} 条</div>
        </div>

        <div
          v-for="user in userList"
          :key="user.id"
          class="user-card"
          @click="showUserDetail(user)"
        >
          <div class="user-header">
            <div class="user-avatar">
              <svg v-if="!user.avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span v-else>{{ user.avatar }}</span>
            </div>
            <div class="user-basic">
              <div class="user-name">{{ user.name || user.username }}</div>
              <div class="user-meta">
                <span class="user-role-badge" :class="`role-badge--${user.role}`">
                  {{ user.roleName }}
                </span>
                <span v-if="user.phone" class="user-phone">{{ formatPhone(user.phone) }}</span>
              </div>
            </div>
            <div class="user-status">
              <span class="status-dot" :class="`status-dot--${user.status}`"></span>
              <span class="status-text">{{ getStatusText(user.status) }}</span>
            </div>
          </div>

          <div class="user-details">
            <div class="detail-item" v-if="user.email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 8l7.89 7.89"/>
                <path d="M21 3L3 21"/>
                <circle cx="8" cy="8" r="7"/>
                <path d="M21 12c0 3.31-2.69 6-6z"/>
              </svg>
              <span>{{ user.email }}</span>
            </div>
            <div class="detail-item" v-if="user.village">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <path d="M12 14v-2"/>
                <path d="M17 10l-4 4 4"/>
              </svg>
              <span>{{ user.villageName }}</span>
            </div>
            <div class="detail-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8v4l-6 6"/>
                <path d="M12 12v.01"/>
              </svg>
              <span>{{ formatDate(user.lastLoginAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Load More -->
        <div v-if="hasMore" class="load-more" @click="loadMore">
          加载更多
        </div>
      </div>
    </template>

    <!-- User Detail Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">用户详情</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="detail-avatar">
            <svg v-if="!selectedUser?.avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span v-else>{{ selectedUser?.avatar }}</span>
          </div>

          <div class="detail-info">
            <div class="detail-section">
              <div class="section-title">基本信息</div>
              <div class="detail-row">
                <span class="detail-label">用户名</span>
                <span class="detail-value">{{ selectedUser?.username }}</span>
              </div>
              <div class="detail-row" v-if="selectedUser?.name">
                <span class="detail-label">姓名</span>
                <span class="detail-value">{{ selectedUser?.name }}</span>
              </div>
              <div class="detail-row" v-if="selectedUser?.phone">
                <span class="detail-label">手机号</span>
                <span class="detail-value">{{ selectedUser?.phone }}</span>
              </div>
              <div class="detail-row" v-if="selectedUser?.email">
                <span class="detail-label">邮箱</span>
                <span class="detail-value">{{ selectedUser?.email }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">所属村庄</span>
                <span class="detail-value">{{ selectedUser?.villageName }}</span>
              </div>
            </div>

            <div class="detail-section">
              <div class="section-title">账号状态</div>
              <div class="detail-row">
                <span class="detail-label">当前角色</span>
                <span class="detail-value">{{ selectedUser?.roleName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">账号状态</span>
                <span class="detail-value" :class="`status-text--${selectedUser?.status}`">
                  {{ getStatusText(selectedUser?.status) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">登录次数</span>
                <span class="detail-value">{{ selectedUser?.loginCount || 0 }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">最后登录</span>
                <span class="detail-value">{{ formatDate(selectedUser?.lastLoginAt) }}</span>
              </div>
            </div>

            <!-- Role Change -->
            <div class="action-section">
              <div class="section-title">修改角色</div>
              <div class="role-selector">
                <button
                  v-for="role in changeableRoles"
                  :key="role.key"
                  class="role-option"
                  :class="{ 'role-option--selected': newRole === role.key }"
                  @click="newRole = role.key"
                >
                  {{ role.name }}
                </button>
              </div>
            </div>

            <!-- Status Change -->
            <div class="action-section">
              <div class="section-title">修改状态</div>
              <div class="status-selector">
                <button
                  v-for="status in ['active', 'inactive', 'suspended']"
                  :key="status"
                  class="status-option"
                  :class="{ 'status-option--selected': newStatus === status }"
                  @click="newStatus = status"
                >
                  {{ getStatusText(status) }}
                </button>
              </div>
            </div>

            <!-- Password Reset -->
            <div class="action-section">
              <div class="section-title">重置密码</div>
              <button class="reset-password-btn" @click="handleResetPassword">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  <path d="M7 21v-2a5 5 0 0 1 10 0v2a5 5 0 0 0 7 5 0 1-5 5-7 5z"/>
                  <path d="M12 8v4"/>
                </svg>
                重置密码
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn--cancel" @click="closeModal">取消</button>
          <button class="btn btn--primary" @click="saveChanges" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create User Dialog -->
    <div v-if="showCreateDialog" class="modal-overlay" @click="showCreateDialog = false">
      <div class="modal-content modal-content--create" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">添加用户</h3>
          <button class="modal-close" @click="showCreateDialog = false">✕</button>
        </div>

        <div class="modal-body modal-body--create">
          <div class="form-group">
            <label class="form-label">用户名 *</label>
            <input v-model="newUserForm.username" class="form-input" placeholder="请输入用户名" />
          </div>
          <div class="form-group">
            <label class="form-label">姓名 *</label>
            <input v-model="newUserForm.name" class="form-input" placeholder="请输入姓名" />
          </div>
          <div class="form-group">
            <label class="form-label">手机号 *</label>
            <input v-model="newUserForm.phone" class="form-input" placeholder="请输入手机号" maxlength="11" />
          </div>
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input v-model="newUserForm.email" class="form-input" placeholder="请输入邮箱" />
          </div>
          <div class="form-group">
            <label class="form-label">密码 *</label>
            <input v-model="newUserForm.password" type="password" class="form-input" placeholder="请输入密码（至少6位）" />
          </div>
          <div class="form-group">
            <label class="form-label">角色 *</label>
            <select v-model="newUserForm.role" class="form-select">
              <option value="">请选择角色</option>
              <option v-for="role in changeableRoles" :key="role.key" :value="role.key">
                {{ role.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">所属村庄</label>
            <select v-model="newUserForm.villageId" class="form-select">
              <option value="">请选择村庄</option>
              <option v-for="village in villages" :key="village.id" :value="village.id">
                {{ village.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn--cancel" @click="showCreateDialog = false">取消</button>
          <button class="btn btn--primary" @click="createUser" :disabled="saving">
            {{ saving ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

defineOptions({
  name: 'UserManagement'
})

const router = useRouter()

// 状态
const loading = ref(true)
const searchKeyword = ref('')
const activeTab = ref('all')
const userList = ref([])
const selectedUser = ref(null)
const newRole = ref('')
const newStatus = ref('')
const saving = ref(false)
const showCreateDialog = ref(false)
const showModal = ref(false)

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

// 表单数据
const newUserForm = ref({
  username: '',
  name: '',
  phone: '',
  email: '',
  password: '',
  role: '',
  villageId: ''
})

// 角色定义
const tabs = [
  { label: '全部', value: 'all', count: 0 },
  { label: '村民', value: 'resident', count: 0 },
  { label: '村干部', value: 'village_cadre', count: 0 },
  { label: '乡镇', value: 'township_official', count: 0 },
  { label: '采购商', value: 'purchaser', count: 0 }
]

const changeableRoles = [
  { key: 'village_cadre', name: '村干部' },
  { key: 'township_official', name: '乡镇干部' },
  { key: 'purchaser', name: '采购商' }
]

// 统计数据
const stats = ref({
  totalUsers: 0,
  activeUsers: 0,
  suspendedUsers: 0
})

// 村庄列表（模拟）
const villages = ref([
  { id: 'v001', name: '智慧乡村示范村' },
  { id: 'v002', name: '绿色生态村' }
])

// API基地址
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

// 获取角色名称
const getRoleName = (role) => {
  const roleNames = {
    'village_cadre': '村干部',
    'township_official': '乡镇干部',
    'purchaser': '采购商',
    'resident': '村民'
  }
  return roleNames[role] || role
}

// 获取状态文本
const getStatusText = (status) => {
  const statusTexts = {
    'active': '活跃',
    'inactive': '未激活',
    'suspended': '已禁用'
  }
  return statusTexts[status] || status
}

// 格式化手机号
const formatPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone
  return `${phone.substring(0, 3)}****${phone.substring(7)}`
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '从未登录'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_BASE}/village-users/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      const data = response.data.data || {}
      stats.value = {
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        suspendedUsers: data.suspendedUsers || 0
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 获取用户列表
const fetchUsers = async (reset = false) => {
  try {
    if (reset) {
      pagination.value.page = 1
      userList.value = []
    }

    const token = localStorage.getItem('token')
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }

    // 根据tab添加筛选条件
    if (activeTab.value !== 'all') {
      params.role = activeTab.value
    }

    // 搜索关键词
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    const response = await axios.get(`${API_BASE}/village-users/users`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    })

    if (response.data.success) {
      if (reset) {
        userList.value = response.data.data || []
      } else {
        userList.value = [...userList.value, ...(response.data.data || [])]
      }

      pagination.value.total = response.data.pagination?.total || 0

      // 更新tab的count
      tabs.value = tabs.value.map(tab => ({
        ...tab,
        count: tab.value === 'all' ? pagination.value.total : 0
      }))
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

// 按tab筛选
const filterByTab = (tabValue) => {
  activeTab.value = tabValue === activeTab.value ? 'all' : tabValue
  fetchUsers(true)
}

// 搜索
const handleSearch = () => {
  fetchUsers(true)
}

// 清除搜索
const clearSearch = () => {
  searchKeyword.value = ''
  fetchUsers(true)
}

// 加载更多
const loadMore = () => {
  pagination.value.page += 1
  fetchUsers(false)
}

// 显示用户详情
const showUserDetail = (user) => {
  selectedUser.value = user
  newRole.value = user.role
  newStatus.value = user.status
  showModal.value = true
}

// 关闭模态框
const closeModal = () => {
  showModal.value = false
  selectedUser.value = null
  newRole.value = ''
  newStatus.value = ''
}

// 保存修改
const saveChanges = async () => {
  try {
    saving.value = true
    const token = localStorage.getItem('token')

    // 修改角色
    if (newRole.value !== selectedUser.value.role) {
      await axios.put(
        `${API_BASE}/village-users/users/${selectedUser.value.id}/role`,
        { newRole: newRole.value },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    }

    // 修改状态
    if (newStatus.value !== selectedUser.value.status) {
      await axios.put(
        `${API_BASE}/village-users/users/${selectedUser.value.id}/status`,
        { status: newStatus.value },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    }

    // 重新获取数据
    await fetchUsers(true)
    await fetchStats()

    closeModal()
  } catch (error) {
    console.error('保存修改失败:', error)
    alert('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 重置密码
const handleResetPassword = async () => {
  try {
    const token = localStorage.getItem('token')

    await axios.post(
      `${API_BASE}/village-users/users/${selectedUser.value.id}/reset-password`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )

    alert('密码重置成功，新密码已发送到用户手机')
  } catch (error) {
    console.error('重置密码失败:', error)
    alert('重置密码失败，请重试')
  }
}

// 创建用户
const createUser = async () => {
  try {
    saving.value = true
    const token = localStorage.getItem('token')

    await axios.post(
      `${API_BASE}/village-users/users`,
      newUserForm.value,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    await fetchUsers(true)
    await fetchStats()

    showCreateDialog.value = false
    newUserForm.value = {
      username: '',
      name: '',
      phone: '',
      email: '',
      password: '',
      role: '',
      villageId: ''
    }

    alert('用户创建成功')
  } catch (error) {
    console.error('创建用户失败:', error)
    alert('创建失败：' + (error.response?.data?.error || error.message))
  } finally {
    saving.value = false
  }
}

// 是否有更多数据
const hasMore = computed(() => {
  return pagination.value.page * pagination.value.limit < pagination.value.total
})

// 初始化
onMounted(async () => {
  await fetchStats()
  await fetchUsers(true)
  loading.value = false
})
</script>

<style scoped>
/* Base Styles */
.user-management {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  padding-bottom: 70px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Loading */
.loading-container {
  padding: 16px;
}

.skeleton-header {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 0;
  margin: -16px -16px 16px -16px;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-search {
  width: 100%;
  height: 48px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

.skeleton-tabs {
  width: 100%;
  height: 40px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

.skeleton-list {
  width: 100%;
  height: 400px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 16px calc(16px + env(safe-area-inset-left));
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(250, 140, 22, 0.2);
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px 10px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.add-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.add-btn svg {
  width: 20px;
  height: 20px;
}

/* Search Section */
.search-section {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.search-input:focus {
  outline: 2px solid #fa8c16;
}

.clear-btn {
  padding: 8px 12px;
  border: none;
  background: #f5f5f5;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Filter Section */
.filter-section {
  display: flex;
  gap: 8px;
  padding: 16px;
  overflow-x: auto;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.filter-tab {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.filter-tab:active {
  background: #fa8c16;
  color: #fff;
}

.tab-name {
  font-weight: 500;
}

.tab-badge {
  background: #fa8c16;
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

/* Stats Section */
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
}

.stat-card {
  background: #fff;
  padding: 20px 12px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fa8c16;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

/* User List */
.user-list {
  padding: 0 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 12px;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.list-count {
  font-size: 12px;
  color: #999;
}

.user-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.user-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.user-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 56px;
  height: 56px;
  min-width: 56px;
  min-height: 56px;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.user-avatar svg {
  width: 28px;
  height: 28px;
}

.user-avatar span {
  font-size: 24px;
}

.user-basic {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  margin-bottom: 4px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-role-badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.role-badge--village_cadre {
  background: #3498db;
  color: #fff;
}

.role-badge--township_official {
  background: #3498db;
  color: #fff;
}

.role-badge--purchaser {
  background: #2ecc71;
  color: # #fff;
}

.role-badge--resident {
  background: #95a5a6;
  color: #fff;
}

.user-phone {
  font-size: 12px;
  color: #999;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot--active {
  background: #2ecc71;
}

.status-dot--inactive {
  background: #95a5a6;
}

.status-dot--suspended {
  background: #e74c3c;
}

.status-text {
  font-size: 12px;
  color: #666;
}

.user-details {
  display: flex;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 13px;
}

.detail-item svg {
  width: 14px;
  height: 14px;
  color: #999;
}

/* Load More */
.load-more {
  padding: 16px;
  text-align: center;
  color: #fa8c16;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.load-more:active {
  opacity: 0.7;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  -webkit-tap-highlight-color: transparent;
}

.modal-content {
  width: 100%;
  max-height: 90vh;
  background: #fff;
  border-radius: 16px 16px 0 0;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-content--create {
  max-height: 80vh;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.modal-close:active {
  background: #e0e0e0;
  transform: scale(0.95);
}

.modal-body {
  padding: 20px;
}

.detail-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin: 0 auto 20px;
}

.detail-avatar svg {
  width: 40px;
  height: 40px;
}

.detail-avatar span {
  font-size: 32px;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.detail-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.status-text--active {
  color: #2ecc71;
}

.status-text--inactive {
  color: #95a5a6;
}

.status-text--suspended {
  color: #e74c3c;
}

.action-section {
  margin-bottom: 24px;
}

.role-selector,
.status-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.role-option,
.status-option {
  padding: 12px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.role-option:active,
.status-option:active {
  border-color: #fa8c16;
  background: rgba(250, 140, 22, 0.1);
  color: #fa8c16;
  font-weight: 600;
}

.role-option:active,
.status-option:active {
  background: rgba(250, 140, 22, 0.1);
  transform: scale(0.98);
}

.reset-password-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.reset-password-btn svg {
  width: 20px;
  height: 20px;
}

.reset-password-btn:active {
  background: #e0e0e0;
  transform: scale(0.98);
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  position: sticky;
  bottom: 0;
  background: #fff;
}

.btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--cancel {
  background: #f5f5f5;
  color: #666;
}

.btn--primary {
  background: #fa8c16;
  color: #fff;
}

/* Form Styles */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}

.form-input:focus,
.form-select:focus {
  outline: 2px solid #fa8c16;
  border-color: #fa8c16;
}

/* Media Queries */
@media (max-width: 375px) {
  .stats-section {
    gap: 8px;
    padding: 12px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 11px;
  }

  .filter-section {
    gap: 6px;
    padding: 12px;
  }

  .filter-tab {
    padding: 6px 10px;
    font-size: 12px;
  }

  .user-card {
    padding: 12px;
  }

  .user-avatar {
    width: 48px;
    height: 48px;
  }

  .user-avatar svg {
    width: 24px;
    height: 24px;
  }

  .user-avatar span {
    font-size: 20px;
  }

  .user-name {
    font-size: 15px;
  }

  .detail-item {
    font-size: 12px;
  }

  .role-selector,
  .status-selector {
    grid-template-columns: 1fr;
  }
}
</style>
