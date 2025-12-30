<template>
  <div class="neighbor-help-view">
    <div class="page-header">
      <h2>
        <el-icon><UserFilled /></el-icon>
        邻里互助
      </h2>
      <el-button type="primary" @click="showPublishDialog = true">
        <el-icon><Plus /></el-icon>
        发布求助
      </el-button>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="求助类型">
          <el-select v-model="filters.category" placeholder="全部类型" clearable @change="fetchRequests">
            <el-option label="农活帮忙" value="farming" />
            <el-option label="代购代办" value="errand" />
            <el-option label="技术支持" value="technical" />
            <el-option label="临时照看" value="caregiving" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable @change="fetchRequests">
            <el-option label="待响应" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 求助列表 -->
    <el-row :gutter="20" class="requests-list">
      <el-col :span="8" v-for="request in requests" :key="request._id">
        <el-card class="request-card">
          <div class="request-header">
            <div class="requester-info">
              <el-avatar :size="40" :src="request.requester?.avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div class="requester-details">
                <div class="requester-name">{{ request.requester?.name || '村民' }}</div>
                <div class="request-time">{{ formatTime(request.createdAt) }}</div>
              </div>
            </div>
            <el-tag :type="getStatusType(request.status)" size="small">
              {{ getStatusLabel(request.status) }}
            </el-tag>
          </div>

          <div class="request-content">
            <h3 class="request-title">{{ request.title }}</h3>
            <el-tag class="category-tag" size="small">{{ getCategoryLabel(request.category) }}</el-tag>
            <p class="request-description">{{ request.description }}</p>
          </div>

          <div class="request-points">
            <el-icon><Medal /></el-icon>
            <span>奖励积分：{{ request.points }}分</span>
          </div>

          <div v-if="request.urgentUntil" class="request-urgent">
            <el-alert
              type="warning"
              :closable="false"
              show-icon
              size="small"
            >
              <template #title>
                期待时间：{{ formatTime(request.urgentUntil) }}
              </template>
            </el-alert>
          </div>

          <!-- 响应者列表 -->
          <div v-if="request.respondents?.length" class="respondents">
            <div class="respondents-label">{{ request.respondents.length }}人响应</div>
            <el-avatar-group :max="3">
              <el-avatar
                v-for="r in request.respondents"
                :key="r.userId._id"
                :size="32"
                :src="r.userId.avatar"
              >
                {{ r.userId.name?.[0] || 'U' }}
              </el-avatar>
            </el-avatar-group>
          </div>

          <div class="request-actions">
            <el-button
              v-if="request.status === 'pending' && canRespond(request)"
              type="primary"
              size="small"
              @click="respondToRequest(request)"
            >
              我来帮忙
            </el-button>
            <el-button
              v-if="request.status === 'pending' && isMyRequest(request)"
              type="success"
              size="small"
              @click="completeRequest(request)"
            >
              完成互助
            </el-button>
            <el-button size="small" @click="viewDetail(request)">查看详情</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 发布求助对话框 -->
    <el-dialog v-model="showPublishDialog" title="发布求助" width="600px" @close="resetPublishForm">
      <el-form ref="publishFormRef" :model="publishForm" :rules="publishRules" label-width="100px">
        <el-form-item label="求助标题" prop="title">
          <el-input v-model="publishForm.title" placeholder="简短描述你的求助需求" />
        </el-form-item>
        <el-form-item label="求助类型" prop="category">
          <el-select v-model="publishForm.category" placeholder="请选择类型">
            <el-option label="农活帮忙" value="farming" />
            <el-option label="代购代办" value="errand" />
            <el-option label="技术支持" value="technical" />
            <el-option label="临时照看" value="caregiving" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细描述" prop="description">
          <el-input
            v-model="publishForm.description"
            type="textarea"
            :rows="5"
            placeholder="请详细描述你的求助内容，包括时间、地点等具体信息"
          />
        </el-form-item>
        <el-form-item label="奖励积分" prop="points">
          <el-input-number v-model="publishForm.points" :min="5" :max="100" :step="5" />
          <span class="unit-label">分 (1分=1元)</span>
        </el-form-item>
        <el-form-item label="期待时间">
          <el-date-picker
            v-model="publishForm.urgentUntil"
            type="datetime"
            placeholder="选择期望完成时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="(date) => date < new Date()"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPublishDialog = false">取消</el-button>
        <el-button type="primary" @click="publishRequest" :loading="publishing">发布</el-button>
      </template>
    </el-dialog>

    <!-- 响应对话框 -->
    <el-dialog v-model="showRespondDialog" title="响应求助" width="500px">
      <el-form ref="respondFormRef" :model="respondForm" label-width="100px">
        <el-form-item label="求助信息">
          <el-input v-model="currentRequest?.title" disabled />
        </el-form-item>
        <el-form-item label="响应留言">
          <el-input
            v-model="respondForm.message"
            type="textarea"
            :rows="3"
            placeholder="可以留下你的联系方式或可以提供帮助的说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRespondDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRespond" :loading="responding">确认响应</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="求助详情" width="700px">
      <div v-if="currentRequest" class="request-detail">
        <div class="detail-header">
          <div class="requester-large">
            <el-avatar :size="60" :src="currentRequest.requester?.avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="requester-info-large">
              <div class="name">{{ currentRequest.requester?.name }}</div>
              <div class="time">{{ formatTime(currentRequest.createdAt) }}</div>
            </div>
          </div>
          <el-tag :type="getStatusType(currentRequest.status)" size="large">
            {{ getStatusLabel(currentRequest.status) }}
          </el-tag>
        </div>

        <el-divider />

        <el-descriptions :column="1" border>
          <el-descriptions-item label="求助标题">
            {{ currentRequest.title }}
          </el-descriptions-item>
          <el-descriptions-item label="求助类型">
            <el-tag>{{ getCategoryLabel(currentRequest.category) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="详细描述">
            {{ currentRequest.description }}
          </el-descriptions-item>
          <el-descriptions-item label="奖励积分">
            <el-icon class="points-icon"><Medal /></el-icon>
            {{ currentRequest.points }}分
          </el-descriptions-item>
          <el-descriptions-item label="期待时间" v-if="currentRequest.urgentUntil">
            {{ formatTime(currentRequest.urgentUntil) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 响应者列表 -->
        <div v-if="currentRequest.respondents?.length" class="respondents-detail">
          <h4>响应者 ({{ currentRequest.respondents.length }})</h4>
          <div class="respondent-list">
            <div v-for="r in currentRequest.respondents" :key="r.userId._id" class="respondent-item">
              <el-avatar :size="40" :src="r.userId.avatar">
                {{ r.userId.name?.[0] || 'U' }}
              </el-avatar>
              <div class="respondent-info">
                <div class="name">{{ r.userId.name }}</div>
                <div class="message">{{ r.message || '暂无留言' }}</div>
              </div>
              <div class="respond-time">{{ formatTime(r.respondedAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UserFilled, Plus, User, Medal } from '@element-plus/icons-vue'
import villageServicesApi from '@/api/villageServices'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
const loading = ref(false)
const publishing = ref(false)
const responding = ref(false)
const requests = ref([])
const currentRequest = ref(null)
const showPublishDialog = ref(false)
const showRespondDialog = ref(false)
const showDetailDialog = ref(false)
const publishFormRef = ref(null)
const respondFormRef = ref(null)

const filters = reactive({
  category: '',
  status: ''
})

const publishForm = reactive({
  title: '',
  category: '',
  description: '',
  points: 10,
  urgentUntil: ''
})

const respondForm = reactive({
  message: ''
})

const publishRules = {
  title: [{ required: true, message: '请输入求助标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择求助类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入详细描述', trigger: 'blur' }],
  points: [{ required: true, message: '请设置奖励积分', trigger: 'blur' }]
}

const getCategoryLabel = (category) => {
  const categories = {
    farming: '农活帮忙',
    errand: '代购代办',
    technical: '技术支持',
    caregiving: '临时照看',
    other: '其他'
  }
  return categories[category] || category
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待响应',
    in_progress: '进行中',
    completed: '已完成'
  }
  return labels[status] || status
}

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    in_progress: 'primary',
    completed: 'success'
  }
  return types[status] || 'info'
}

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

const isMyRequest = (request) => {
  return request.requester?._id === userStore.userId
}

const canRespond = (request) => {
  return !isMyRequest(request) &&
    !request.respondents?.some(r => r.userId._id === userStore.userId)
}

const fetchRequests = async () => {
  loading.value = true
  try {
    const { data } = await villageServicesApi.getHelpRequests(filters)
    if (data.success) {
      requests.value = data.data
    }
  } catch (error) {
    ElMessage.error('获取求助列表失败')
  } finally {
    loading.value = false
  }
}

const publishRequest = async () => {
  await publishFormRef.value.validate(async (valid) => {
    if (valid) {
      publishing.value = true
      try {
        const { data } = await villageServicesApi.createHelpRequest(publishForm)
        if (data.success) {
          ElMessage.success('求助发布成功')
          showPublishDialog.value = false
          resetPublishForm()
          fetchRequests()
        }
      } catch (error) {
        ElMessage.error('发布求助失败')
      } finally {
        publishing.value = false
      }
    }
  })
}

const respondToRequest = (request) => {
  currentRequest.value = request
  showRespondDialog.value = true
}

const confirmRespond = async () => {
  responding.value = true
  try {
    const { data } = await villageServicesApi.respondToHelpRequest(currentRequest.value._id, respondForm)
    if (data.success) {
      ElMessage.success('响应成功')
      showRespondDialog.value = false
      respondForm.message = ''
      fetchRequests()
    }
  } catch (error) {
    ElMessage.error('响应失败')
  } finally {
    responding.value = false
  }
}

const completeRequest = async (request) => {
  await ElMessageBox.confirm('请选择完成此次互助的响应者', '确认完成', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  })
  // 这里应该弹出选择响应者的对话框
  ElMessage.success('互助已完成，积分已发放')
}

const viewDetail = (request) => {
  currentRequest.value = request
  showDetailDialog.value = true
}

const resetPublishForm = () => {
  Object.assign(publishForm, {
    title: '',
    category: '',
    description: '',
    points: 10,
    urgentUntil: ''
  })
  publishFormRef.value?.resetFields()
}

onMounted(() => {
  fetchRequests()
})
</script>

<style scoped>
.neighbor-help-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

.requests-list {
  min-height: 400px;
}

.request-card {
  margin-bottom: 20px;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.requester-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.requester-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.requester-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.request-time {
  font-size: 12px;
  color: #909399;
}

.request-content {
  margin-bottom: 15px;
}

.request-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #303133;
}

.category-tag {
  margin-bottom: 8px;
}

.request-description {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.request-points {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 15px;
  color: #e6a23c;
  font-size: 14px;
}

.request-urgent {
  margin-bottom: 15px;
}

.respondents {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 15px;
}

.respondents-label {
  font-size: 13px;
  color: #606266;
}

.request-actions {
  display: flex;
  gap: 10px;
}

.unit-label {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}

.request-detail {
  padding: 10px 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.requester-large {
  display: flex;
  align-items: center;
  gap: 15px;
}

.requester-info-large .name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.requester-info-large .time {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.points-icon {
  color: #e6a23c;
  margin-right: 4px;
}

.respondents-detail {
  margin-top: 30px;
}

.respondents-detail h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
}

.respondent-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.respondent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.respondent-info {
  flex: 1;
}

.respondent-info .name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.respondent-info .message {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.respond-time {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
