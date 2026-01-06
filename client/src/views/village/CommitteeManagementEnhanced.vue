<template>
  <div class="committee-management">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>村干部管理</h1>
        <p>管理村干部申请、成员信息和权限分配</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showApplicationDialog">
          <el-icon><Plus /></el-icon>
          提交申请
        </el-button>
        <el-button @click="loadStatistics">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.totalMembers }}</div>
            <div class="stat-label">在职干部</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.pendingApplications }}</div>
            <div class="stat-label">待审核申请</div>
          </div>
        </div>
        <div class="stat-card approved">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.approvedApplications }}</div>
            <div class="stat-label">已通过申请</div>
          </div>
        </div>
        <div class="stat-card groups">
          <div class="stat-icon">🏘️</div>
          <div class="stat-info">
            <div class="stat-number">{{ roleDistribution.length }}</div>
            <div class="stat-label">角色类型</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 标签页切换 -->
    <el-tabs v-model="activeTab" class="tabs-section">
      <!-- 申请审核标签页 -->
      <el-tab-pane label="申请审核" name="applications">
        <div class="tab-header">
          <div class="filter-options">
            <el-select v-model="applicationFilter.status" placeholder="状态筛选" clearable @change="loadApplications">
              <el-option label="全部" value="" />
              <el-option label="待审核" value="pending" />
              <el-option label="审核中" value="under_review" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </div>
        </div>

        <div class="applications-list">
          <el-card v-for="app in applications" :key="app._id" class="application-card">
            <div class="app-header">
              <div class="app-info">
                <el-tag :type="getApplicationStatusType(app.status)" size="small">
                  {{ getApplicationStatusText(app.status) }}
                </el-tag>
                <span class="app-id">{{ app.applicationId }}</span>
              </div>
              <div class="app-actions">
                <el-button
                  v-if="canReview(app)"
                  type="primary"
                  size="small"
                  @click="reviewApplication(app)"
                >
                  审核申请
                </el-button>
                <el-button
                  v-if="canCancel(app)"
                  type="danger"
                  size="small"
                  @click="cancelApplication(app)"
                >
                  取消申请
                </el-button>
                <el-button size="small" @click="viewApplicationDetail(app)">
                  查看详情
                </el-button>
              </div>
            </div>
            <div class="app-content">
              <div class="app-item">
                <span class="label">申请类型:</span>
                <span class="value">{{ getApplicationTypeText(app.applicationType) }}</span>
              </div>
              <div class="app-item">
                <span class="label">申请人:</span>
                <span class="value">{{ app.applicant?.name }}</span>
              </div>
              <div class="app-item">
                <span class="label">目标角色:</span>
                <span class="value">{{ getRoleText(app.targetRole) }}</span>
              </div>
              <div class="app-item">
                <span class="label">提交时间:</span>
                <span class="value">{{ formatDate(app.submittedAt) }}</span>
              </div>
            </div>
          </el-card>
        </div>

        <el-empty v-if="applications.length === 0" description="暂无申请记录" />
      </el-tab-pane>

      <!-- 成员管理标签页 -->
      <el-tab-pane label="成员管理" name="members">
        <div class="tab-header">
          <div class="filter-options">
            <el-select v-model="memberFilter.role" placeholder="角色筛选" clearable @change="loadMembers">
              <el-option label="全部" value="" />
              <el-option label="村支书" value="secretary" />
              <el-option label="村主任" value="village_head" />
              <el-option label="会计" value="accountant" />
              <el-option label="人口主任" value="population_admin" />
              <el-option label="治保主任" value="security_director" />
            </el-select>
          </div>
        </div>

        <div class="members-grid">
          <el-card v-for="member in members" :key="member._id" class="member-card">
            <div class="member-header">
              <el-avatar :size="60">
                {{ member.name?.charAt(0) }}
              </el-avatar>
              <div class="member-basic">
                <h3>{{ member.name }}</h3>
                <el-tag :type="getRoleType(member.roleCode)" size="small">
                  {{ member.roleName }}
                </el-tag>
                <el-tag v-if="member.roleLevel" type="info" size="small">
                  Level {{ member.roleLevel }}
                </el-tag>
              </div>
              <div class="member-actions">
                <el-dropdown @command="handleMemberAction">
                  <el-button type="text">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{action: 'permission', member}">
                        <el-icon><Lock /></el-icon> 权限管理
                      </el-dropdown-item>
                      <el-dropdown-item :command="{action: 'remove', member}" divided>
                        <el-icon><Delete /></el-icon> 移除成员
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            <div class="member-info">
              <div class="info-item">
                <span class="label">手机号:</span>
                <span class="value">{{ maskPhone(member.phone) }}</span>
              </div>
              <div class="info-item">
                <span class="label">任职时间:</span>
                <span class="value">{{ formatDate(member.assignedAt) }}</span>
              </div>
              <div class="info-item">
                <span class="label">状态:</span>
                <el-tag :type="member.status === 'active' ? 'success' : 'info'" size="small">
                  {{ member.status === 'active' ? '在职' : '离任' }}
                </el-tag>
              </div>
            </div>
          </el-card>
        </div>

        <el-empty v-if="members.length === 0" description="暂无成员" />
      </el-tab-pane>
    </el-tabs>

    <!-- 提交申请对话框 -->
    <el-dialog
      v-model="applicationDialogVisible"
      title="提交村干部申请"
      width="600px"
      @close="resetApplicationForm"
    >
      <el-form :model="applicationForm" :rules="applicationRules" ref="applicationFormRef" label-width="120px">
        <el-form-item label="申请类型" prop="applicationType">
          <el-select v-model="applicationForm.applicationType" placeholder="请选择申请类型">
            <el-option label="新账号申请" value="new_account" />
            <el-option label="角色变更" value="role_change" />
            <el-option label="权限授予" value="permission_grant" />
            <el-option label="离职申请" value="role_resign" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标角色" prop="targetRole">
          <el-select v-model="applicationForm.targetRole" placeholder="请选择目标角色">
            <el-option label="村支书" value="secretary" />
            <el-option label="村主任" value="village_head" />
            <el-option label="会计" value="accountant" />
            <el-option label="人口主任" value="population_admin" />
            <el-option label="治保主任" value="security_director" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标村庄" prop="targetVillageId">
          <el-input v-model="applicationForm.targetVillageId" placeholder="请输入村庄ID" />
        </el-form-item>
        <el-form-item label="申请理由" prop="reason">
          <el-input
            v-model="applicationForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请详细说明申请理由"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applicationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApplication">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 审核申请对话框 -->
    <el-dialog
      v-model="reviewDialogVisible"
      title="审核申请"
      width="500px"
      @close="resetReviewForm"
    >
      <div v-if="currentApplication" class="review-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="申请ID">{{ currentApplication.applicationId }}</el-descriptions-item>
          <el-descriptions-item label="申请类型">
            {{ getApplicationTypeText(currentApplication.applicationType) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentApplication.applicant?.name }}</el-descriptions-item>
          <el-descriptions-item label="目标角色">{{ getRoleText(currentApplication.targetRole) }}</el-descriptions-item>
          <el-descriptions-item label="申请理由">{{ currentApplication.reason }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-form :model="reviewForm" ref="reviewFormRef" label-width="80px" style="margin-top: 20px">
        <el-form-item label="审核意见">
          <el-input
            v-model="reviewForm.comments"
            type="textarea"
            :rows="3"
            placeholder="请输入审核意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleReview('reject')">驳回</el-button>
        <el-button type="primary" @click="handleReview('approve')">通过</el-button>
      </template>
    </el-dialog>

    <!-- 权限管理对话框 -->
    <el-dialog
      v-model="permissionDialogVisible"
      title="权限管理"
      width="700px"
    >
      <div v-if="currentMember" class="permission-content">
        <el-form :model="permissionForm" label-width="100px">
          <el-form-item label="成员姓名">
            <span>{{ currentMember.name }}</span>
          </el-form-item>
          <el-form-item label="当前角色">
            <el-tag>{{ currentMember.roleName }}</el-tag>
          </el-form-item>
          <el-form-item label="自定义权限">
            <el-checkbox-group v-model="permissionForm.customPermissions">
              <el-checkbox label="resident:delete">删除村民</el-checkbox>
              <el-checkbox label="finance:export">导出财务</el-checkbox>
              <el-checkbox label="announcement:delete">删除公告</el-checkbox>
              <el-checkbox label="population:approve">审核人口变动</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="数据范围">
            <el-radio-group v-model="permissionForm.restrictions.dataScope">
              <el-radio label="all">全村数据</el-radio>
              <el-radio label="department">部门数据</el-radio>
              <el-radio label="self">个人数据</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePermissions">保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  MoreFilled,
  Lock,
  Delete
} from '@element-plus/icons-vue'
import axios from 'axios'

// API基础URL
const API_BASE = 'http://localhost:3001/api'

// 响应式数据
const activeTab = ref('applications')
const applicationDialogVisible = ref(false)
const reviewDialogVisible = ref(false)
const permissionDialogVisible = ref(false)

const applications = ref([])
const members = ref([])
const currentApplication = ref(null)
const currentMember = ref(null)

// 统计数据
const statistics = reactive({
  totalMembers: 0,
  pendingApplications: 0,
  approvedApplications: 0,
  rejectedApplications: 0
})

// 角色分布
const roleDistribution = ref([])

// 筛选条件
const applicationFilter = reactive({
  status: ''
})

const memberFilter = reactive({
  role: ''
})

// 申请表单
const applicationForm = reactive({
  applicationType: 'new_account',
  targetRole: '',
  targetVillageId: '',
  reason: ''
})

const applicationRules = {
  applicationType: [{ required: true, message: '请选择申请类型', trigger: 'change' }],
  targetRole: [{ required: true, message: '请选择目标角色', trigger: 'change' }],
  targetVillageId: [{ required: true, message: '请输入村庄ID', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入申请理由', trigger: 'blur' }]
}

const applicationFormRef = ref(null)

// 审核表单
const reviewForm = reactive({
  decision: '',
  comments: ''
})

const reviewFormRef = ref(null)

// 权限表单
const permissionForm = reactive({
  customPermissions: [],
  restrictions: {
    dataScope: 'all'
  }
})

// 获取Token
const getToken = () => {
  return localStorage.getItem('token') || ''
}

// Axios配置
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期,请重新登录')
      // 跳转到登录页
    } else if (error.response?.status === 403) {
      ElMessage.error('权限不足')
    } else {
      ElMessage.error(error.response?.data?.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

// 加载统计数据
const loadStatistics = async () => {
  try {
    const response = await apiClient.get('/committee/statistics')
    if (response.data.success) {
      const data = response.data.data
      statistics.totalMembers = data.totalMembers || 0
      statistics.pendingApplications = data.applications?.pending || 0
      statistics.approvedApplications = data.applications?.approved || 0
      statistics.rejectedApplications = data.applications?.rejected || 0
      roleDistribution.value = data.members || []
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载申请列表
const loadApplications = async () => {
  try {
    const params = {}
    if (applicationFilter.status) {
      params.status = applicationFilter.status
    }
    const response = await apiClient.get('/committee/applications', { params })
    if (response.data.success) {
      applications.value = response.data.data.applications || []
    }
  } catch (error) {
    console.error('加载申请列表失败:', error)
  }
}

// 加载成员列表
const loadMembers = async () => {
  try {
    const params = {}
    if (memberFilter.role) {
      params.role = memberFilter.role
    }
    const response = await apiClient.get('/committee/members', { params })
    if (response.data.success) {
      members.value = response.data.data || []
    }
  } catch (error) {
    console.error('加载成员列表失败:', error)
  }
}

// 提交申请
const submitApplication = async () => {
  if (!applicationFormRef.value) return

  try {
    await applicationFormRef.value.validate()
    const response = await apiClient.post('/committee/applications', applicationForm)
    if (response.data.success) {
      ElMessage.success('申请提交成功')
      applicationDialogVisible.value = false
      resetApplicationForm()
      loadApplications()
      loadStatistics()
    }
  } catch (error) {
    console.error('提交申请失败:', error)
  }
}

// 审核申请
const reviewApplication = (application) => {
  currentApplication.value = application
  reviewDialogVisible.value = true
}

// 处理审核
const handleReview = async (decision) => {
  if (!currentApplication.value) return

  try {
    const response = await apiClient.put(
      `/committee/applications/${currentApplication.value.applicationId}/review`,
      {
        decision,
        comments: reviewForm.comments
      }
    )
    if (response.data.success) {
      ElMessage.success(decision === 'approve' ? '审核通过' : '已驳回')
      reviewDialogVisible.value = false
      resetReviewForm()
      loadApplications()
      loadStatistics()
    }
  } catch (error) {
    console.error('审核失败:', error)
  }
}

// 取消申请
const cancelApplication = async (application) => {
  try {
    await ElMessageBox.confirm('确定要取消此申请吗?', '确认操作', {
      type: 'warning'
    })
    const response = await apiClient.put(`/committee/applications/${application.applicationId}/cancel`)
    if (response.data.success) {
      ElMessage.success('申请已取消')
      loadApplications()
      loadStatistics()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消申请失败:', error)
    }
  }
}

// 查看详情
const viewApplicationDetail = (application) => {
  ElMessageBox.alert(
    `
    <p><strong>申请ID:</strong> ${application.applicationId}</p>
    <p><strong>申请类型:</strong> ${getApplicationTypeText(application.applicationType)}</p>
    <p><strong>申请人:</strong> ${application.applicant?.name}</p>
    <p><strong>目标角色:</strong> ${getRoleText(application.targetRole)}</p>
    <p><strong>申请理由:</strong> ${application.reason || '无'}</p>
    <p><strong>提交时间:</strong> ${formatDate(application.submittedAt)}</p>
    <p><strong>状态:</strong> ${getApplicationStatusText(application.status)}</p>
    `,
    '申请详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

// 处理成员操作
const handleMemberAction = ({ action, member }) => {
  switch (action) {
    case 'permission':
      managePermission(member)
      break
    case 'remove':
      removeMember(member)
      break
  }
}

// 权限管理
const managePermission = (member) => {
  currentMember.value = member
  permissionForm.customPermissions = member.customPermissions || []
  permissionForm.restrictions = member.restrictions || { dataScope: 'all' }
  permissionDialogVisible.value = true
}

// 保存权限
const savePermissions = async () => {
  if (!currentMember.value) return

  try {
    const response = await apiClient.put(`/committee/members/${currentMember.value._id}`, {
      customPermissions: permissionForm.customPermissions,
      restrictions: permissionForm.restrictions
    })
    if (response.data.success) {
      ElMessage.success('权限更新成功')
      permissionDialogVisible.value = false
      loadMembers()
    }
  } catch (error) {
    console.error('更新权限失败:', error)
  }
}

// 移除成员
const removeMember = async (member) => {
  try {
    await ElMessageBox.confirm(`确定要移除 ${member.name} 吗?`, '确认操作', {
      type: 'warning',
      confirmButtonText: '确定移除',
      cancelButtonText: '取消'
    })
    const response = await apiClient.delete(`/committee/members/${member._id}`)
    if (response.data.success) {
      ElMessage.success('成员已移除')
      loadMembers()
      loadStatistics()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除成员失败:', error)
    }
  }
}

// 工具函数
const getApplicationStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'under_review': 'primary',
    'approved': 'success',
    'rejected': 'danger',
    'cancelled': 'info'
  }
  return typeMap[status] || 'info'
}

const getApplicationStatusText = (status) => {
  const textMap = {
    'pending': '待审核',
    'under_review': '审核中',
    'approved': '已通过',
    'rejected': '已驳回',
    'cancelled': '已取消'
  }
  return textMap[status] || '未知'
}

const getApplicationTypeText = (type) => {
  const textMap = {
    'new_account': '新账号申请',
    'role_change': '角色变更',
    'permission_grant': '权限授予',
    'role_resign': '离职申请'
  }
  return textMap[type] || '未知'
}

const getRoleText = (roleCode) => {
  const textMap = {
    'secretary': '村支书',
    'village_head': '村主任',
    'accountant': '会计',
    'population_admin': '人口主任',
    'security_director': '治保主任'
  }
  return textMap[roleCode] || roleCode
}

const getRoleType = (roleCode) => {
  const typeMap = {
    'secretary': 'danger',
    'village_head': 'warning',
    'accountant': 'primary',
    'population_admin': 'success',
    'security_director': 'info'
  }
  return typeMap[roleCode] || 'info'
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const maskPhone = (phone) => {
  if (!phone) return '-'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const canReview = (application) => {
  // 简化版: 实际应根据当前用户角色判断
  return ['pending', 'under_review'].includes(application.status)
}

const canCancel = (application) => {
  return ['pending', 'under_review'].includes(application.status) &&
         application.applicant?.userId === getCurrentUserId()
}

const getCurrentUserId = () => {
  // 简化版: 从localStorage或其他地方获取当前用户ID
  return localStorage.getItem('userId') || ''
}

// 重置表单
const resetApplicationForm = () => {
  Object.assign(applicationForm, {
    applicationType: 'new_account',
    targetRole: '',
    targetVillageId: '',
    reason: ''
  })
  if (applicationFormRef.value) {
    applicationFormRef.value.resetFields()
  }
}

const resetReviewForm = () => {
  Object.assign(reviewForm, {
    decision: '',
    comments: ''
  })
  currentApplication.value = null
}

const showApplicationDialog = () => {
  applicationDialogVisible.value = true
}

// 生命周期
onMounted(() => {
  loadStatistics()
  loadApplications()
  loadMembers()
})
</script>

<style scoped>
.committee-management {
  padding: 2rem;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.header-content p {
  margin: 0;
  color: #7f8c8d;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.stats-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  font-size: 2rem;
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.tabs-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.filter-options {
  display: flex;
  gap: 1rem;
}

.applications-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.application-card {
  transition: transform 0.2s;
}

.application-card:hover {
  transform: translateX(5px);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.app-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-id {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.app-actions {
  display: flex;
  gap: 0.5rem;
}

.app-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.app-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.app-item .label {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.app-item .value {
  color: #2c3e50;
  font-weight: 500;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.member-card {
  transition: transform 0.2s;
}

.member-card:hover {
  transform: translateY(-5px);
}

.member-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.member-basic {
  flex: 1;
}

.member-basic h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item .label {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.info-item .value {
  color: #2c3e50;
  font-weight: 500;
}

.review-content {
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .committee-management {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .members-grid {
    grid-template-columns: 1fr;
  }

  .app-content {
    grid-template-columns: 1fr;
  }
}
</style>
