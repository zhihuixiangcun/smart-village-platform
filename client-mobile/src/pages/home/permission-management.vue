<template>
  <div class="permission-management">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="skeleton-header"></div>
      <div class="skeleton-content">
        <div class="skeleton-stats"></div>
        <div class="skeleton-list"></div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Header -->
      <header class="header">
        <div class="header-title">权限管理</div>
        <button class="search-btn" @click="showSearch = !showSearch" aria-label="搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
      </header>

      <!-- Search Bar -->
      <div v-if="showSearch" class="search-bar">
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索用户名、姓名、手机号..."
          @input="handleSearch"
        />
        <button v-if="searchKeyword" class="clear-btn" @click="clearSearch">✕</button>
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
          <div class="stat-value">{{ stats.totalRoles }}</div>
          <div class="stat-label">角色数量</div>
        </div>
      </div>

      <!-- Role Filter -->
      <div class="filter-section">
        <div class="filter-label">筛选角色:</div>
        <div class="role-tags">
          <button
            v-for="role in allRoles"
            :key="role.key"
            class="role-tag"
            :class="{ 'role-tag--active': selectedRole === role.key }"
            @click="filterByRole(role.key)"
          >
            <span class="role-tag-name">{{ role.name }}</span>
            <span class="role-tag-count">({{ role.userCount }})</span>
          </button>
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
          class="user-item"
          @click="showUserDetail(user)"
        >
          <div class="user-avatar">
            <svg v-if="!user.avatar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span v-else>{{ user.avatar }}</span>
          </div>
          <div class="user-info">
            <div class="user-name">{{ user.name || user.username }}</div>
            <div class="user-meta">
              <span class="user-role-badge" :class="`role-badge--${user.role}`">
                {{ user.roleName }}
              </span>
              <span v-if="user.phone" class="user-phone">{{ user.phone }}</span>
            </div>
          </div>
          <div class="user-status">
            <span class="status-dot" :class="`status-dot--${user.status}`"></span>
            <span class="status-text">{{ getStatusText(user.status) }}</span>
          </div>
        </div>

        <!-- Load More -->
        <div v-if="hasMore" class="load-more" @click="loadMore">
          加载更多
        </div>
      </div>

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
              <div class="detail-row">
                <span class="detail-label">用户名</span>
                <span class="detail-value">{{ selectedUser?.username }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">姓名</span>
                <span class="detail-value">{{ selectedUser?.name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">手机号</span>
                <span class="detail-value">{{ selectedUser?.phone }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">邮箱</span>
                <span class="detail-value">{{ selectedUser?.email }}</span>
              </div>
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
            <div class="role-change-section">
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
            <div class="status-change-section">
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
          </div>

          <div class="modal-footer">
            <button class="btn btn--cancel" @click="closeModal">取消</button>
            <button class="btn btn--primary" @click="saveChanges" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

defineOptions({
  name: 'PermissionManagement'
})

const router = useRouter()

// 状态
const loading = ref(true)
const showSearch = ref(false)
const searchKeyword = ref('')
const userList = ref([])
const allRoles = ref([])
const selectedRole = ref('')
const stats = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalRoles: 0
})
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

// 模态框状态
const showModal = ref(false)
const selectedUser = ref(null)
const newRole = ref('')
const newStatus = ref('')
const saving = ref(false)

// 可修改的角色
const changeableRoles = computed(() => {
  return allRoles.value.filter(role => role.key !== 'resident')
})

// 是否有更多数据
const hasMore = computed(() => {
  return pagination.value.page * pagination.value.limit < pagination.value.total
})

// API基地址
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

// 获取角色名称
const getRoleName = (role) => {
  const roleNames = {
    'secretary': '村支书',
    'village_head': '村主任',
    'accountant': '会计',
    'population_admin': '人口主任',
    'security_director': '治保主任',
    'resident': '普通村民'
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
    const response = await axios.get(`${API_BASE}/admin-permission/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      stats.value = {
        totalUsers: response.data.data.totalUsers || 0,
        activeUsers: response.data.data.roleStats?.reduce((sum, r) => sum + r.userCount, 0) || 0,
        totalRoles: response.data.data.totalRoles || 0
      }

      // 更新角色列表
      allRoles.value = (response.data.data.roleStats || []).map(r => ({
        key: r._id,
        name: getRoleName(r._id),
        userCount: r.userCount || 0,
        permissionCount: r.permissionCount || 0
      }))
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

    if (selectedRole.value) {
      params.role = selectedRole.value
    }

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    const response = await axios.get(`${API_BASE}/admin-permission/users`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    })

    if (response.data.success) {
      if (reset) {
        userList.value = response.data.data
      } else {
        userList.value = [...userList.value, ...response.data.data]
      }

      pagination.value.total = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

// 按角色筛选
const filterByRole = (role) => {
  selectedRole.value = role === selectedRole.value ? '' : role
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
        `${API_BASE}/admin-permission/users/${selectedUser.value.id}/role`,
        { newRole: newRole.value },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    }

    // 修改状态
    if (newStatus.value !== selectedUser.value.status) {
      await axios.put(
        `${API_BASE}/admin-permission/users/${selectedUser.value.id}/status`,
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

// 初始化
onMounted(async () => {
  await fetchStats()
  await fetchUsers(true)
  loading.value = false
})
</script>

<style scoped>
/* Base Styles */
.permission-management {
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

.skeleton-stats {
  width: 100%;
  height: 96px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

.skeleton-list {
  width: 100%;
  height: 300px;
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

.search-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.search-btn:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.95);
}

.search-btn svg {
  width: 24px;
  height: 24px;
}

/* Search Bar */
.search-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  padding: 8px;
  background: transparent;
}

.clear-btn {
  padding: 8px 12px;
  border: none;
  background: #f5f5f5;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:active {
  transform: scale(0.95);
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

/* Filter Section */
.filter-section {
  background: #fff;
  padding: 16px;
  margin: 0 16px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  font-weight: 500;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 20px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.role-tag:active {
  transform: scale(0.95);
}

.role-tag--active {
  background: #fa8c16;
  color: #fff;
  border-color: #d46b08;
}

.role-tag-name {
  font-size: 13px;
  margin-right: 4px;
}

.role-tag-count {
  font-size: 11px;
  opacity: 0.8;
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

.user-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.user-item:active {
  transform: scale(0.98);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.user-avatar {
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: #fff;
  flex-shrink: 0;
}

.user-avatar svg {
  width: 24px;
  height: 24px;
}

.user-avatar span {
  font-size: 20px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  margin-bottom: 6px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.user-role-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.role-badge--secretary {
  background: #e74c3c;
  color: #fff;
}

.role-badge--village_head {
  background: #3498db;
  color: #fff;
}

.role-badge--accountant {
  background: #2ecc71;
  color: #fff;
}

.role-badge--population_admin {
  background: #9b59b6;
  color: #fff;
}

.role-badge--security_director {
  background: #e67e22;
  color: #fff;
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

.status-text--active {
  color: #2ecc71;
}

.status-text--inactive {
  color: #95a5a6;
}

.status-text--suspended {
  color: #e74c3c;
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
  transform: scale(0.95);
  background: #e0e0e0;
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

.detail-info {
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.role-selector,
.status-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 24px;
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
  transform: scale(0.98);
}

.role-option--selected,
.status-option--selected {
  border-color: #fa8c16;
  background: rgba(250, 140, 22, 0.1);
  color: #fa8c16;
  font-weight: 600;
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

/* Media Queries */
@media (max-width: 375px) {
  .stats-section {
    gap: 10px;
    padding: 12px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-label {
    font-size: 11px;
  }

  .role-selector,
  .status-selector {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 768px) {
  .modal-content {
    width: 600px;
    max-width: 90vw;
    border-radius: 16px;
    margin: auto;
  }

  .modal-overlay {
    align-items: center;
  }

  .modal-body {
    max-height: 60vh;
  }
}
</style>
