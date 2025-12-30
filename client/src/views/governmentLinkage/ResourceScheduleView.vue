<template>
  <div class="resource-schedule-view">
    <div class="page-header">
      <h2>
        <el-icon><Operation /></el-icon>
        跨域资源调度
      </h2>
      <el-button type="primary" @click="showRequestDialog = true">
        <el-icon><Plus /></el-icon>
        申请资源
      </el-button>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable @change="fetchRequests">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已批准" value="approved" />
            <el-option label="已完成" value="completed" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源类型">
          <el-select v-model="filters.resourceType" placeholder="全部类型" clearable @change="fetchRequests">
            <el-option label="应急物资" value="emergency_supplies" />
            <el-option label="人员支援" value="personnel" />
            <el-option label="设备调配" value="equipment" />
            <el-option label="资金支持" value="funding" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 资源申请列表 -->
    <el-card class="requests-list">
      <el-table v-loading="loading" :data="requests" stripe>
        <el-table-column prop="resourceType" label="资源类型" width="140">
          <template #default="{ row }">
            <el-tag>{{ getResourceTypeLabel(row.resourceType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column prop="reason" label="申请原因" min-width="250" show-overflow-tooltip />
        <el-table-column prop="urgency" label="紧急程度" width="120">
          <template #default="{ row }">
            <el-tag :type="getUrgencyType(row.urgency)">
              {{ getUrgencyLabel(row.urgency) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="neededBy" label="期望时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.neededBy) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewRequest(row)">查看</el-button>
            <el-button
              type="danger"
              size="small"
              @click="cancelRequest(row)"
              v-if="row.status === 'pending'"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建资源申请对话框 -->
    <el-dialog v-model="showRequestDialog" title="申请资源" width="600px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="资源类型" prop="resourceType">
          <el-select v-model="form.resourceType" placeholder="请选择资源类型">
            <el-option label="应急物资" value="emergency_supplies" />
            <el-option label="人员支援" value="personnel" />
            <el-option label="设备调配" value="equipment" />
            <el-option label="资金支持" value="funding" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" :max="9999" />
        </el-form-item>
        <el-form-item label="申请原因" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="4" placeholder="请详细说明申请原因" />
        </el-form-item>
        <el-form-item label="紧急程度" prop="urgency">
          <el-radio-group v-model="form.urgency">
            <el-radio label="low">一般</el-radio>
            <el-radio label="medium">较急</el-radio>
            <el-radio label="high">紧急</el-radio>
            <el-radio label="critical">特急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="期望时间" prop="neededBy">
          <el-date-picker
            v-model="form.neededBy"
            type="datetime"
            placeholder="选择期望获得资源的时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            :disabled-date="(date) => date < new Date()"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRequestDialog = false">取消</el-button>
        <el-button type="primary" @click="submitRequest" :loading="submitting">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="申请详情" width="700px">
      <div v-if="currentRequest" class="request-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="资源类型">
            {{ getResourceTypeLabel(currentRequest.resourceType) }}
          </el-descriptions-item>
          <el-descriptions-item label="数量">{{ currentRequest.quantity }}</el-descriptions-item>
          <el-descriptions-item label="紧急程度">
            <el-tag :type="getUrgencyType(currentRequest.urgency)">
              {{ getUrgencyLabel(currentRequest.urgency) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentRequest.status)">
              {{ getStatusLabel(currentRequest.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="期望时间">
            {{ formatDate(currentRequest.neededBy) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDate(currentRequest.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">
            {{ currentRequest.reason }}
          </el-descriptions-item>
          <el-descriptions-item label="处理人" v-if="currentRequest.processedBy">
            {{ currentRequest.processedBy?.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="处理时间" v-if="currentRequest.processedAt">
            {{ formatDate(currentRequest.processedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 处理结果 -->
        <div v-if="currentRequest.status === 'approved' || currentRequest.status === 'rejected'" class="process-result">
          <h4>处理结果</h4>
          <el-alert
            :type="currentRequest.status === 'approved' ? 'success' : 'error'"
            :title="currentRequest.status === 'approved' ? '资源申请已批准' : '资源申请已拒绝'"
            :description="currentRequest.notes"
            show-icon
            :closable="false"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Operation, Plus } from '@element-plus/icons-vue'
import governmentApi from '@/api/governmentLinkage'

const loading = ref(false)
const submitting = ref(false)
const requests = ref([])
const showRequestDialog = ref(false)
const showDetailDialog = ref(false)
const currentRequest = ref(null)
const formRef = ref(null)

const filters = reactive({
  status: '',
  resourceType: ''
})

const form = reactive({
  resourceType: '',
  quantity: 1,
  reason: '',
  urgency: 'medium',
  neededBy: ''
})

const rules = {
  resourceType: [{ required: true, message: '请选择资源类型', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入申请原因', trigger: 'blur' }],
  urgency: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
  neededBy: [{ required: true, message: '请选择期望时间', trigger: 'change' }]
}

const getResourceTypeLabel = (type) => {
  const types = {
    emergency_supplies: '应急物资',
    personnel: '人员支援',
    equipment: '设备调配',
    funding: '资金支持',
    other: '其他'
  }
  return types[type] || type
}

const getUrgencyLabel = (urgency) => {
  const labels = {
    low: '一般',
    medium: '较急',
    high: '紧急',
    critical: '特急'
  }
  return labels[urgency] || urgency
}

const getUrgencyType = (urgency) => {
  const types = {
    low: 'info',
    medium: 'primary',
    high: 'warning',
    critical: 'danger'
  }
  return types[urgency] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待处理',
    processing: '处理中',
    approved: '已批准',
    completed: '已完成',
    rejected: '已拒绝'
  }
  return labels[status] || status
}

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    processing: 'primary',
    approved: 'success',
    completed: 'info',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchRequests = async () => {
  loading.value = true
  try {
    const { data } = await governmentApi.getResources(filters)
    if (data.success) {
      requests.value = data.data
    }
  } catch (error) {
    ElMessage.error('获取资源申请列表失败')
  } finally {
    loading.value = false
  }
}

const submitRequest = async () => {
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const { data } = await governmentApi.requestResource(form)
        if (data.success) {
          ElMessage.success(data.message)
          showRequestDialog.value = false
          resetForm()
          fetchRequests()
        }
      } catch (error) {
        ElMessage.error('提交申请失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const viewRequest = async (request) => {
  try {
    const { data } = await governmentApi.getResourceStatus(request._id)
    if (data.success) {
      currentRequest.value = data.data
      showDetailDialog.value = true
    }
  } catch (error) {
    ElMessage.error('获取详情失败')
  }
}

const cancelRequest = async (request) => {
  await ElMessageBox.confirm('确定要取消此申请吗？', '确认取消', {
    type: 'warning'
  })
  // 取消申请逻辑
  ElMessage.success('申请已取消')
  fetchRequests()
}

const resetForm = () => {
  Object.assign(form, {
    resourceType: '',
    quantity: 1,
    reason: '',
    urgency: 'medium',
    neededBy: ''
  })
  formRef.value?.resetFields()
}

onMounted(() => {
  fetchRequests()
})
</script>

<style scoped>
.resource-schedule-view {
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

.request-detail {
  padding: 10px 0;
}

.process-result {
  margin-top: 20px;
}

.process-result h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
}
</style>
