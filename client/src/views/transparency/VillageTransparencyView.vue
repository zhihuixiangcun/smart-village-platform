<template>
  <div class="village-transparency">
    <el-row :gutter="20">
      <!-- 财务透明化 -->
      <el-col :span="24">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <span>财务透明化</span>
              <div>
                <el-upload
                  action="/api/transparency/invoices"
                  :headers="{ 'Authorization': `Bearer ${getToken()}` }"
                  :on-success="handleInvoiceUpload"
                  accept="image/*"
                  :show-file-list="false"
                >
                  <el-button type="primary" icon="Upload">上传发票</el-button>
                </el-upload>
              </div>
            </div>
          </template>

          <el-row :gutter="20">
            <!-- 统计卡片 -->
            <el-col :span="8">
              <div class="stat-card income">
                <div class="stat-title">总收入</div>
                <div class="stat-value">¥{{ statistics.totalIncome.toLocaleString() }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-card expense">
                <div class="stat-title">总支出</div>
                <div class="stat-value">¥{{ statistics.totalExpense.toLocaleString() }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-card balance">
                <div class="stat-title">结余</div>
                <div class="stat-value">¥{{ statistics.balance.toLocaleString() }}</div>
              </div>
            </el-col>
          </el-row>

          <!-- 发票列表 -->
          <el-table :data="invoices" stripe>
            <el-table-column prop="invoiceNumber" label="发票号" width="150" />
            <el-table-column prop="vendor" label="供应商" width="150" />
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">
                ¥{{ row.amount?.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="category" label="类别" width="120">
              <template #default="{ row }">
                {{ getCategoryName(row.category) }}
              </template>
            </el-table-column>
            <el-table-column prop="date" label="日期" width="120">
              <template #default="{ row }">
                {{ formatDate(row.date) }}
              </template>
            </el-table-column>
            <el-table-column prop="image" label="发票照片" width="100">
              <template #default="{ row }">
                <el-image
                  v-if="row.image"
                  :src="row.image"
                  :preview-src-list="[row.image]"
                  fit="cover"
                  style="width: 50px; height: 50px; border-radius: 4px;"
                />
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getInvoiceStatusType(row.status)">
                  {{ getInvoiceStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
          </el-table>
        </el-card>
      </el-col>

      <!-- 工程项目监督 -->
      <el-col :span="24">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <span>工程项目监督</span>
              <el-button type="primary" @click="showProjectDialog = true">新建项目</el-button>
            </div>
          </template>

          <el-table :data="projects" stripe>
            <el-table-column prop="name" label="项目名称" width="200" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                {{ getProjectTypeName(row.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="budget" label="预算" width="120">
              <template #default="{ row }">
                ¥{{ row.budget?.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column prop="actualCost" label="实际支出" width="120">
              <template #default="{ row }">
                ¥{{ row.actualCost?.toLocaleString() || 0 }}
              </template>
            </el-table-column>
            <el-table-column prop="progress" label="进度" width="150">
              <template #default="{ row }">
                <el-progress :percentage="row.progress || 0" />
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getProjectStatusType(row.status)">
                  {{ getProjectStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button size="small" @click="viewProjectDetail(row)">查看</el-button>
                <el-upload
                  action="/api/transparency/projects/progress"
                  :headers="{ 'Authorization': `Bearer ${getToken()}` }"
                  :data="{ projectId: row._id }"
                  :on-success="() => { ElMessage.success('进度上报成功'); fetchProjects() }"
                  accept="image/*"
                  :show-file-list="false"
                >
                  <el-button size="small" type="primary">上报进度</el-button>
                </el-upload>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 村务决策 -->
      <el-col :span="24">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <span>村务决策公开</span>
              <el-button type="primary" @click="showDecisionDialog = true">发起决策</el-button>
            </div>
          </template>

          <el-table :data="decisions" stripe>
            <el-table-column prop="title" label="决策标题" width="250" />
            <el-table-column prop="category" label="类别" width="100">
              <template #default="{ row }">
                {{ getDecisionCategoryName(row.category) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getDecisionStatusType(row.status)">
                  {{ getDecisionStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="votingDeadline" label="投票截止" width="120">
              <template #default="{ row }">
                {{ formatDate(row.votingDeadline) }}
              </template>
            </el-table-column>
            <el-table-column label="投票情况" width="200">
              <template #default="{ row }">
                <div v-if="row.result">
                  总票数: {{ row.result.totalVotes }}
                </div>
                <div v-else>
                  投票中: {{ row.votes?.length || 0 }} 票
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="viewVoteDetail(row)">查看详情</el-button>
                <el-button
                  v-if="row.status === 'voting'"
                  size="small"
                  type="primary"
                  @click="showVoteDialog(row)"
                >
                  投票
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 创建项目对话框 -->
    <el-dialog v-model="showProjectDialog" title="创建工程项目" width="50%">
      <el-form :model="projectForm" label-width="100px">
        <el-form-item label="项目名称">
          <el-input v-model="projectForm.name" />
        </el-form-item>
        <el-form-item label="项目类型">
          <el-select v-model="projectForm.type">
            <el-option label="道路建设" value="road" />
            <el-option label="水利设施" value="water" />
            <el-option label="建筑工程" value="building" />
            <el-option label="环境治理" value="environment" />
          </el-select>
        </el-form-item>
        <el-form-item label="预算">
          <el-input-number v-model="projectForm.budget" :min="0" :step="1000" />
        </el-form-item>
        <el-form-item label="施工时间">
          <el-date-picker
            v-model="projectForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item label="承包商">
          <el-input v-model="projectForm.contractorName" placeholder="承包商名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProjectDialog = false">取消</el-button>
        <el-button type="primary" @click="createProject">创建</el-button>
      </template>
    </el-dialog>

    <!-- 投票对话框 -->
    <el-dialog v-model="showVoteDialogVisible" title="参与投票" width="40%">
      <p>{{ currentDecision?.title }}</p>
      <el-radio-group v-model="selectedOption">
        <el-radio
          v-for="option in currentDecision?.options"
          :key="option._id"
          :label="option._id"
        >
          {{ option.text }}
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="showVoteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitVote">提交投票</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const invoices = ref([])
const projects = ref([])
const decisions = ref([])
const statistics = ref({ totalIncome: 0, totalExpense: 0, balance: 0 })

const showProjectDialog = ref(false)
const showDecisionDialog = ref(false)
const showVoteDialogVisible = ref(false)
const currentDecision = ref(null)
const selectedOption = ref('')

const projectForm = reactive({
  name: '',
  type: '',
  budget: 0,
  dateRange: null,
  contractorName: ''
})

const getToken = () => localStorage.getItem('token')

const fetchInvoices = async () => {
  try {
    const response = await fetch('/api/transparency/invoices', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) invoices.value = data.data
  } catch (error) {
    console.error('获取发票失败:', error)
  }
}

const fetchProjects = async () => {
  try {
    const response = await fetch('/api/transparency/projects', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) projects.value = data.data
  } catch (error) {
    console.error('获取项目失败:', error)
  }
}

const fetchDecisions = async () => {
  try {
    const response = await fetch('/api/transparency/decisions', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) decisions.value = data.data
  } catch (error) {
    console.error('获取决策失败:', error)
  }
}

const fetchStatistics = async () => {
  try {
    const response = await fetch('/api/transparency/transactions/statistics', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) statistics.value = data.data.summary
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

const handleInvoiceUpload = (response) => {
  if (response.success) {
    ElMessage.success('发票上传成功')
    fetchInvoices()
    fetchStatistics()
  }
}

const createProject = async () => {
  try {
    const response = await fetch('/api/transparency/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        ...projectForm,
        startDate: projectForm.dateRange[0],
        endDate: projectForm.dateRange[1]
      })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('项目创建成功')
      showProjectDialog.value = false
      fetchProjects()
    }
  } catch (error) {
    ElMessage.error('创建失败')
  }
}

const showVoteDialog = (decision) => {
  currentDecision.value = decision
  showVoteDialogVisible.value = true
}

const submitVote = async () => {
  try {
    const response = await fetch(`/api/transparency/decisions/${currentDecision.value._id}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ selectedOption: selectedOption.value })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('投票成功')
      showVoteDialogVisible.value = false
      fetchDecisions()
    }
  } catch (error) {
    ElMessage.error('投票失败')
  }
}

const viewVoteDetail = async (decision) => {
  try {
    const response = await fetch(`/api/transparency/votes/${decision._id}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) {
      // 显示投票详情
    }
  } catch (error) {
    console.error('获取投票详情失败:', error)
  }
}

const viewProjectDetail = (project) => {
  // 显示项目详情
}

const getCategoryName = (type) => {
  const map = {
    infrastructure: '基础设施',
    public_service: '公共服务',
    welfare: '福利',
    administrative: '行政',
    other: '其他'
  }
  return map[type] || type
}

const getProjectTypeName = (type) => {
  const map = { road: '道路', water: '水利', building: '建筑', environment: '环境' }
  return map[type] || type
}

const getProjectStatusType = (status) => {
  const map = {
    planning: 'info',
    in_progress: 'warning',
    completed: 'success',
    suspended: 'danger'
  }
  return map[status] || ''
}

const getProjectStatusText = (status) => {
  const map = {
    planning: '规划中',
    in_progress: '进行中',
    completed: '已完成',
    suspended: '已暂停'
  }
  return map[status] || status
}

const getDecisionCategoryName = (category) => {
  const map = {
    finance: '财务',
    infrastructure: '基础设施',
    welfare: '福利',
    policy: '政策',
    other: '其他'
  }
  return map[category] || category
}

const getDecisionStatusType = (status) => {
  const map = {
    voting: 'warning',
    passed: 'success',
    rejected: 'danger'
  }
  return map[status] || ''
}

const getDecisionStatusText = (status) => {
  const map = {
    voting: '投票中',
    passed: '已通过',
    rejected: '已否决'
  }
  return map[status] || status
}

const getInvoiceStatusType = (status) => {
  const map = { pending: 'warning', verified: 'success', rejected: 'danger' }
  return map[status] || ''
}

const getInvoiceStatusText = (status) => {
  const map = { pending: '待审核', verified: '已验证', rejected: '已拒绝' }
  return map[status] || status
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchInvoices()
  fetchProjects()
  fetchDecisions()
  fetchStatistics()
})
</script>

<style scoped>
.village-transparency {
  padding: 20px;
}

.section-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-card {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  color: white;
  margin-bottom: 20px;
}

.stat-card.income { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-card.expense { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-card.balance { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.stat-title {
  font-size: 14px;
  opacity: 0.9;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  margin-top: 10px;
}
</style>
