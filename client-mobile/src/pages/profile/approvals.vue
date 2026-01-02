<template>
  <div class="approvals-page">
    <!-- 顶部导航 -->
    <div class="navbar">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="title">村干部审核</span>
      <div class="placeholder"></div>
    </div>

    <!-- 筛选Tab -->
    <div class="tabs">
      <div
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { 'tab-item--active': activeTab === tab.value }]"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <span v-if="getCountByStatus(tab.value) > 0" class="tab-badge">
          {{ getCountByStatus(tab.value) }}
        </span>
      </div>
    </div>

    <!-- 申请列表 -->
    <div class="approvals-list">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>

      <div v-else-if="filteredRegistrations.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无{{ getTabLabel(activeTab) }}申请</div>
      </div>

      <div
        v-for="registration in filteredRegistrations"
        :key="registration.registrationId"
        class="approval-card"
        @click="viewDetail(registration)"
      >
        <div class="card-header">
          <div class="applicant-info">
            <div class="applicant-avatar">
              {{ registration.avatar ? '👤' : '📷' }}
            </div>
            <div class="applicant-details">
              <div class="applicant-name">{{ registration.name }}</div>
              <div class="applicant-position">{{ registration.position }}</div>
            </div>
          </div>
          <div :class="['status-badge', `status-badge--${registration.status}`]">
            {{ getStatusLabel(registration.status) }}
          </div>
        </div>

        <div class="card-body">
          <div class="info-row">
            <span class="info-label">手机号</span>
            <span class="info-value">{{ maskPhone(registration.phone) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">所属村庄</span>
            <span class="info-value">{{ registration.villageName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">申请时间</span>
            <span class="info-value">{{ formatDate(registration.submittedAt) }}</span>
          </div>
        </div>

        <!-- 待审核的操作按钮 -->
        <div v-if="registration.status === 'pending'" class="card-actions">
          <button class="action-btn reject" @click.stop="rejectRegistration(registration)">
            驳回
          </button>
          <button class="action-btn approve" @click.stop="approveRegistration(registration)">
            通过
          </button>
        </div>
      </div>
    </div>

    <!-- 审核详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click="showDetailModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span class="modal-title">申请详情</span>
          <button class="modal-close" @click="showDetailModal = false">×</button>
        </div>

        <div v-if="selectedRegistration" class="modal-body">
          <!-- 基本信息 -->
          <div class="detail-section">
            <div class="section-title">基本信息</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">姓名</span>
                <span class="detail-value">{{ selectedRegistration.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">性别</span>
                <span class="detail-value">{{ selectedRegistration.gender === 'male' ? '男' : '女' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">手机号</span>
                <span class="detail-value">{{ selectedRegistration.phone }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">申请职务</span>
                <span class="detail-value">{{ selectedRegistration.position }}</span>
              </div>
            </div>
          </div>

          <!-- 村庄信息 -->
          <div class="detail-section">
            <div class="section-title">村庄信息</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">所属村庄</span>
                <span class="detail-value">{{ selectedRegistration.villageName }}</span>
              </div>
              <div v-if="selectedRegistration.group" class="detail-item">
                <span class="detail-label">村组</span>
                <span class="detail-value">{{ selectedRegistration.group }}</span>
              </div>
            </div>
          </div>

          <!-- 证件信息 -->
          <div class="detail-section">
            <div class="section-title">证件信息</div>
            <div class="document-preview">
              <div v-if="selectedRegistration.idCardFront" class="doc-item">
                <img :src="selectedRegistration.idCardFront" alt="身份证正面" />
                <div class="doc-label">身份证正面</div>
              </div>
              <div v-if="selectedRegistration.idCardBack" class="doc-item">
                <img :src="selectedRegistration.idCardBack" alt="身份证反面" />
                <div class="doc-label">身份证反面</div>
              </div>
              <div v-if="selectedRegistration.appointmentLetter" class="doc-item">
                <img :src="selectedRegistration.appointmentLetter" alt="任命书" />
                <div class="doc-label">任命书</div>
              </div>
            </div>
          </div>

          <!-- 权限预览 -->
          <div v-if="selectedRegistration.permissions && selectedRegistration.permissions.length > 0" class="detail-section">
            <div class="section-title">职务权限</div>
            <div class="permissions-list">
              <div
                v-for="permission in selectedRegistration.permissions"
                :key="permission"
                class="permission-tag"
              >
                {{ getPermissionLabel(permission) }}
              </div>
            </div>
          </div>

          <!-- 申请时间 -->
          <div class="detail-section">
            <div class="section-title">申请信息</div>
            <div class="detail-grid">
              <div class="detail-item full-width">
                <span class="detail-label">申请时间</span>
                <span class="detail-value">{{ formatFullDate(selectedRegistration.submittedAt) }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">申请编号</span>
                <span class="detail-value">{{ selectedRegistration.registrationId }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 审核操作 -->
        <div v-if="selectedRegistration?.status === 'pending'" class="modal-footer">
          <button class="modal-btn reject" @click="rejectRegistration(selectedRegistration)">
            驳回申请
          </button>
          <button class="modal-btn approve" @click="approveRegistration(selectedRegistration)">
            通过审核
          </button>
        </div>
        <div v-else class="modal-footer single">
          <button class="modal-btn close" @click="showDetailModal = false">
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Tab选项
const tabs = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' }
]

// 当前激活的Tab
const activeTab = ref('pending')

// UI状态
const loading = ref(false)
const showDetailModal = ref(false)
const selectedRegistration = ref(null)

// 注册申请列表
const registrations = ref([])

// 权限标签映射
const permissionLabels = {
  'all': '全部权限',
  'approve_users': '用户审核',
  'manage_finance': '财务管理',
  'publish_announcements': '发布公告',
  'manage_meetings': '会议管理',
  'view_all_data': '查看全部数据',
  'audit_logs': '审计日志',
  'view_village_data': '查看村庄数据',
  'approve_services': '服务审批',
  'view_financial_reports': '查看财务报表',
  'approve_expenses': '审批支出',
  'manage_women_services': '妇女事务管理',
  'view_family_data': '查看家庭数据',
  'manage_security': '安全管理',
  'view_security_reports': '查看安全报告',
  'handle_emergencies': '应急处理',
  'manage_militia': '民兵管理',
  'organize_training': '组织训练'
}

// 过滤后的申请列表
const filteredRegistrations = computed(() => {
  return registrations.value.filter(r => r.status === activeTab.value)
})

// 页面加载
onMounted(async () => {
  await loadRegistrations()
})

// 加载注册申请列表
const loadRegistrations = async () => {
  loading.value = true
  try {
    // 从本地存储读取待审核的注册申请
    const pendingData = localStorage.getItem('pending_registrations')
    if (pendingData) {
      registrations.value = JSON.parse(pendingData)
    } else {
      registrations.value = []
    }

    // 同时加载已处理的申请（如果有）
    const processedData = localStorage.getItem('processed_registrations')
    if (processedData) {
      const processed = JSON.parse(processedData)
      registrations.value = [...registrations.value, ...processed]
    }

    console.log('加载注册申请列表:', registrations.value.length)
  } catch (error) {
    console.error('加载注册申请失败:', error)
    registrations.value = []
  } finally {
    loading.value = false
  }
}

// 根据状态获取数量
const getCountByStatus = (status) => {
  return registrations.value.filter(r => r.status === status).length
}

// 获取Tab标签
const getTabLabel = (value) => {
  return tabs.find(t => t.value === value)?.label || ''
}

// 获取状态标签
const getStatusLabel = (status) => {
  const labels = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已驳回'
  }
  return labels[status] || status
}

// 获取权限标签
const getPermissionLabel = (permission) => {
  return permissionLabels[permission] || permission
}

// 手机号脱敏
const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 格式化完整日期
const formatFullDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 查看详情
const viewDetail = (registration) => {
  selectedRegistration.value = registration
  showDetailModal.value = true
}

// 通过审核
const approveRegistration = async (registration) => {
  const confirmMsg = `确认通过 ${registration.name} 的${registration.position}任职申请？\n\n通过后，该用户将获得相应职务权限。`
  if (!confirm(confirmMsg)) return

  try {
    // 更新申请状态
    const index = registrations.value.findIndex(r => r.registrationId === registration.registrationId)
    if (index > -1) {
      registrations.value[index].status = 'approved'
      registrations.value[index].approvedAt = new Date().toISOString()
      registrations.value[index].approvedBy = 'current_admin' // 当前管理员ID
    }

    // 保存到本地存储
    saveRegistrations()

    alert(`已通过 ${registration.name} 的申请`)
    showDetailModal.value = false
  } catch (error) {
    console.error('审核失败:', error)
    alert('审核失败，请重试')
  }
}

// 驳回申请
const rejectRegistration = async (registration) => {
  const reason = prompt(`请输入驳回 ${registration.name} 申请的原因：`)
  if (reason === null) return // 用户取消

  try {
    // 更新申请状态
    const index = registrations.value.findIndex(r => r.registrationId === registration.registrationId)
    if (index > -1) {
      registrations.value[index].status = 'rejected'
      registrations.value[index].rejectedAt = new Date().toISOString()
      registrations.value[index].rejectedBy = 'current_admin'
      registrations.value[index].rejectReason = reason
    }

    // 保存到本地存储
    saveRegistrations()

    alert(`已驳回 ${registration.name} 的申请\n原因: ${reason}`)
    showDetailModal.value = false
  } catch (error) {
    console.error('驳回失败:', error)
    alert('驳回失败，请重试')
  }
}

// 保存注册申请
const saveRegistrations = () => {
  // 分类保存
  const pending = registrations.value.filter(r => r.status === 'pending')
  const processed = registrations.value.filter(r => r.status !== 'pending')

  localStorage.setItem('pending_registrations', JSON.stringify(pending))
  localStorage.setItem('processed_registrations', JSON.stringify(processed))

  console.log('注册申请已更新')
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style lang="scss" scoped>
.approvals-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.navbar {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn {
    background: none;
    border: none;
    font-size: 20px;
    padding: 8px;
    cursor: pointer;
  }

  .title {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    text-align: center;
  }

  .placeholder {
    width: 40px;
  }
}

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #eee;

  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 14px 0;
    font-size: 14px;
    color: #666;
    cursor: pointer;
    position: relative;

    &--active {
      color: #1890ff;
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 2px;
        background: #1890ff;
        border-radius: 2px;
      }
    }

    .tab-badge {
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: #ff4d4f;
      color: #fff;
      font-size: 12px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.approvals-list {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.approval-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.applicant-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.applicant-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.applicant-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.applicant-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.applicant-position {
  font-size: 13px;
  color: #666;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  &--pending {
    background: #fff7e6;
    color: #fa8c16;
  }

  &--approved {
    background: #f6ffed;
    color: #52c41a;
  }

  &--rejected {
    background: #fff1f0;
    color: #ff4d4f;
  }
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-label {
  color: #999;
}

.info-value {
  color: #333;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &.reject {
    background: #fff1f0;
    color: #ff4d4f;
  }

  &.approve {
    background: #1890ff;
    color: #fff;
  }
}

// 详情弹窗
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #eee;

  .modal-title {
    font-size: 18px;
    font-weight: 600;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 28px;
    padding: 4px;
    line-height: 1;
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.detail-section {
  margin-bottom: 24px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #1890ff;
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  .detail-item {
    &.full-width {
      grid-column: 1 / -1;
    }

    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-label {
    font-size: 12px;
    color: #999;
  }

  .detail-value {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }
}

.document-preview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  .doc-item {
    position: relative;

    img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: 8px;
    }

    .doc-label {
      position: absolute;
      bottom: 4px;
      left: 4px;
      right: 4px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      text-align: center;
    }
  }
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .permission-tag {
    padding: 6px 12px;
    background: #e6f7ff;
    color: #1890ff;
    border-radius: 16px;
    font-size: 12px;
  }
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #eee;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));

  &.single {
    justify-content: center;
  }

  .modal-btn {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;

    &.approve {
      background: #1890ff;
      color: #fff;
    }

    &.reject {
      background: #fff1f0;
      color: #ff4d4f;
    }

    &.close {
      background: #f5f5f5;
      color: #666;
    }
  }
}
</style>
