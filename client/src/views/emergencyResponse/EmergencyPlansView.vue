<template>
  <div class="emergency-plans-view">
    <div class="page-header">
      <h2>
        <el-icon><WarningFilled /></el-icon>
        应急预案管理
      </h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建预案
      </el-button>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="预案类型">
          <el-select v-model="filters.type" placeholder="全部类型" clearable @change="fetchPlans">
            <el-option label="防汛" value="flood" />
            <el-option label="火灾" value="fire" />
            <el-option label="地震" value="earthquake" />
            <el-option label="疫情防控" value="epidemic" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable @change="fetchPlans">
            <el-option label="启用" value="active" />
            <el-option label="草稿" value="draft" />
            <el-option label="已停用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 预案列表 -->
    <el-card class="plans-list">
      <el-table v-loading="loading" :data="plans" stripe>
        <el-table-column prop="name" label="预案名称" min-width="200" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : row.status === 'draft' ? 'info' : 'danger'">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="创建人" width="120">
          <template #default="{ row }">
            {{ row.createdBy?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewPlan(row)">查看</el-button>
            <el-button type="danger" size="small" @click="activatePlan(row)">启动</el-button>
            <el-dropdown @command="(cmd) => handleCommand(cmd, row)">
              <el-button type="info" size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑预案对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingPlan ? '编辑预案' : '创建预案'"
      width="700px"
      @close="resetForm"
    >
      <el-form ref="planFormRef" :model="planForm" :rules="planRules" label-width="100px">
        <el-form-item label="预案名称" prop="name">
          <el-input v-model="planForm.name" placeholder="请输入预案名称" />
        </el-form-item>
        <el-form-item label="预案类型" prop="type">
          <el-select v-model="planForm.type" placeholder="请选择预案类型">
            <el-option label="防汛" value="flood" />
            <el-option label="火灾" value="fire" />
            <el-option label="地震" value="earthquake" />
            <el-option label="疫情防控" value="epidemic" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="planForm.description" type="textarea" :rows="3" placeholder="请输入预案描述" />
        </el-form-item>
        <el-form-item label="应急流程" prop="procedures">
          <el-input v-model="planForm.procedures" type="textarea" :rows="5" placeholder="请输入应急处理流程" />
        </el-form-item>
        <el-form-item label="应急联系人">
          <el-input v-model="planForm.contacts" type="textarea" :rows="3" placeholder="请输入应急联系人信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="savePlan" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看预案详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="预案详情" width="700px">
      <div v-if="currentPlan" class="plan-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="预案名称">{{ currentPlan.name }}</el-descriptions-item>
          <el-descriptions-item label="预案类型">
            <el-tag :type="getTypeTagType(currentPlan.type)">
              {{ getTypeLabel(currentPlan.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentPlan.status === 'active' ? 'success' : 'info'">
              {{ getStatusLabel(currentPlan.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">{{ currentPlan.createdBy?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentPlan.description }}</el-descriptions-item>
          <el-descriptions-item label="应急流程" :span="2">
            <pre class="procedures-text">{{ currentPlan.procedures }}</pre>
          </el-descriptions-item>
          <el-descriptions-item label="应急联系人" :span="2">
            <pre class="contacts-text">{{ currentPlan.contacts }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 启动预案对话框 -->
    <el-dialog v-model="showActivateDialog" title="启动应急预案" width="600px">
      <el-alert
        title="警告：启动预案将向全村发送紧急广播"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />
      <el-form ref="activateFormRef" :model="activateForm" :rules="activateRules" label-width="100px">
        <el-form-item label="预案名称">
          <el-input v-model="activatingPlanName" disabled />
        </el-form-item>
        <el-form-item label="严重程度" prop="severity">
          <el-radio-group v-model="activateForm.severity">
            <el-radio label="low">低</el-radio>
            <el-radio label="medium">中</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="critical">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="事发地点" prop="location">
          <el-input v-model="activateForm.location" placeholder="请输入事发地点" />
        </el-form-item>
        <el-form-item label="详细描述" prop="description">
          <el-input v-model="activateForm.description" type="textarea" :rows="4" placeholder="请输入事件详细描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showActivateDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmActivate" :loading="activating">确认启动</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled, Plus, ArrowDown } from '@element-plus/icons-vue'
import emergencyApi from '@/api/emergencyResponse'

const loading = ref(false)
const saving = ref(false)
const activating = ref(false)
const plans = ref([])
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showActivateDialog = ref(false)
const editingPlan = ref(null)
const currentPlan = ref(null)
const activatingPlanId = ref(null)
const planFormRef = ref(null)
const activateFormRef = ref(null)

const filters = reactive({
  type: '',
  status: ''
})

const planForm = reactive({
  name: '',
  type: '',
  description: '',
  procedures: '',
  contacts: ''
})

const activateForm = reactive({
  severity: 'medium',
  location: '',
  description: ''
})

const activatingPlanName = computed(() => {
  return currentPlan.value?.name || ''
})

const planRules = {
  name: [{ required: true, message: '请输入预案名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择预案类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入预案描述', trigger: 'blur' }],
  procedures: [{ required: true, message: '请输入应急流程', trigger: 'blur' }]
}

const activateRules = {
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }],
  location: [{ required: true, message: '请输入事发地点', trigger: 'blur' }],
  description: [{ required: true, message: '请输入事件详细描述', trigger: 'blur' }]
}

const getTypeLabel = (type) => {
  const types = {
    flood: '防汛',
    fire: '火灾',
    earthquake: '地震',
    epidemic: '疫情防控',
    other: '其他'
  }
  return types[type] || type
}

const getTypeTagType = (type) => {
  const typeMap = {
    flood: 'primary',
    fire: 'danger',
    earthquake: 'warning',
    epidemic: 'success',
    other: 'info'
  }
  return typeMap[type] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    active: '启用',
    draft: '草稿',
    inactive: '已停用'
  }
  return labels[status] || status
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const fetchPlans = async () => {
  loading.value = true
  try {
    const { data } = await emergencyApi.getPlans(filters)
    if (data.success) {
      plans.value = data.data
    }
  } catch (error) {
    ElMessage.error('获取预案列表失败')
  } finally {
    loading.value = false
  }
}

const viewPlan = (plan) => {
  currentPlan.value = plan
  showDetailDialog.value = true
}

const activatePlan = (plan) => {
  currentPlan.value = plan
  activatingPlanId.value = plan._id
  showActivateDialog.value = true
}

const confirmActivate = async () => {
  await activateFormRef.value.validate(async (valid) => {
    if (valid) {
      activating.value = true
      try {
        const { data } = await emergencyApi.activatePlan(activatingPlanId.value, activateForm)
        if (data.success) {
          ElMessage.success(data.message)
          showActivateDialog.value = false
          resetActivateForm()
        }
      } catch (error) {
        ElMessage.error('启动预案失败')
      } finally {
        activating.value = false
      }
    }
  })
}

const savePlan = async () => {
  await planFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        if (editingPlan.value) {
          const { data } = await emergencyApi.updatePlan(editingPlan.value._id, planForm)
          if (data.success) {
            ElMessage.success('预案更新成功')
          }
        } else {
          const { data } = await emergencyApi.createPlan(planForm)
          if (data.success) {
            ElMessage.success('预案创建成功')
          }
        }
        showCreateDialog.value = false
        resetForm()
        fetchPlans()
      } catch (error) {
        ElMessage.error(editingPlan.value ? '更新预案失败' : '创建预案失败')
      } finally {
        saving.value = false
      }
    }
  })
}

const handleCommand = async (command, plan) => {
  if (command === 'edit') {
    editingPlan.value = plan
    Object.assign(planForm, {
      name: plan.name,
      type: plan.type,
      description: plan.description,
      procedures: plan.procedures,
      contacts: plan.contacts
    })
    showCreateDialog.value = true
  } else if (command === 'delete') {
    await ElMessageBox.confirm('确定要删除此预案吗？', '确认删除', {
      type: 'warning'
    })
    try {
      const { data } = await emergencyApi.deletePlan(plan._id)
      if (data.success) {
        ElMessage.success('删除成功')
        fetchPlans()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }
}

const resetForm = () => {
  editingPlan.value = null
  Object.assign(planForm, {
    name: '',
    type: '',
    description: '',
    procedures: '',
    contacts: ''
  })
  planFormRef.value?.resetFields()
}

const resetActivateForm = () => {
  currentPlan.value = null
  activatingPlanId.value = null
  Object.assign(activateForm, {
    severity: 'medium',
    location: '',
    description: ''
  })
  activateFormRef.value?.resetFields()
}

onMounted(() => {
  fetchPlans()
})
</script>

<style scoped>
.emergency-plans-view {
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

.plans-list {
  min-height: 400px;
}

.procedures-text,
.contacts-text {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
}

.plan-detail {
  padding: 10px 0;
}
</style>
