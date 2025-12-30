<template>
  <div class="data-report-view">
    <div class="page-header">
      <h2>
        <el-icon><Document /></el-icon>
        数据自动上报
      </h2>
    </div>

    <!-- 报表类型选择 -->
    <el-row :gutter="20" class="report-types">
      <el-col :span="8" v-for="type in reportTypes" :key="type.value">
        <el-card class="report-type-card" @click="selectReportType(type.value)">
          <div class="card-content">
            <div class="card-icon" :style="{ background: type.color }">
              <component :is="type.icon" />
            </div>
            <div class="card-info">
              <h3>{{ type.label }}</h3>
              <p>{{ type.description }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- AI生成报表区域 -->
    <el-card class="generate-section" v-if="selectedType">
      <template #header>
        <div class="section-header">
          <span>AI自动生成报表</span>
          <el-button type="primary" size="small" @click="generateReport" :loading="generating">
            <el-icon><MagicStick /></el-icon>
            AI生成报表
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="reportParams">
        <el-form-item label="报表年份">
          <el-date-picker
            v-model="reportParams.year"
            type="year"
            placeholder="选择年份"
            value-format="YYYY"
            :disabled-date="(date) => date > new Date()"
          />
        </el-form-item>
        <el-form-item label="月份" v-if="selectedType !== 'infrastructure'">
          <el-select v-model="reportParams.month" placeholder="选择月份" clearable>
            <el-option v-for="m in 12" :key="m" :label="`${m}月`" :value="m" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 报表列表 -->
    <el-card class="reports-list">
      <template #header>
        <div class="section-header">
          <span>已生成报表</span>
          <el-select v-model="listFilter.reportType" placeholder="全部类型" clearable @change="fetchReports" style="width: 150px">
            <el-option v-for="type in reportTypes" :key="type.value" :label="type.label" :value="type.value" />
          </el-select>
        </div>
      </template>

      <el-table v-loading="loading" :data="reports" stripe>
        <el-table-column prop="reportType" label="报表类型" width="150">
          <template #default="{ row }">
            {{ getReportTypeLabel(row.reportType) }}
          </template>
        </el-table-column>
        <el-table-column prop="year" label="年份" width="100" />
        <el-table-column prop="month" label="月份" width="80">
          <template #default="{ row }">
            {{ row.month ? `${row.month}月` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
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
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewReport(row)">查看</el-button>
            <el-button
              type="success"
              size="small"
              @click="submitReport(row)"
              v-if="row.status === 'pending_review'"
              :loading="submitting"
            >
              上报
            </el-button>
            <el-button type="info" size="small" @click="downloadReport(row)">下载</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 报表详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="报表详情" width="800px">
      <div v-if="currentReport" class="report-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="报表类型">
            {{ getReportTypeLabel(currentReport.reportType) }}
          </el-descriptions-item>
          <el-descriptions-item label="报表期间">
            {{ currentReport.year }}年{{ currentReport.month ? `${currentReport.month}月` : '' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentReport.status)">
              {{ getStatusLabel(currentReport.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">
            {{ currentReport.createdBy?.name || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 人口报表数据 -->
        <div v-if="currentReport.reportType === 'population'" class="report-data">
          <h4>人口统计数据</h4>
          <el-row :gutter="20" class="data-summary">
            <el-col :span="8">
              <div class="data-card">
                <div class="data-value">{{ currentReport.data.summary?.totalPopulation || 0 }}</div>
                <div class="data-label">总人口</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="data-card">
                <div class="data-value">{{ currentReport.data.byGender?.find(g => g._id === 'male')?.count || 0 }}</div>
                <div class="data-label">男性人口</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="data-card">
                <div class="data-value">{{ currentReport.data.byGender?.find(g => g._id === 'female')?.count || 0 }}</div>
                <div class="data-label">女性人口</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 财务报表数据 -->
        <div v-if="currentReport.reportType === 'finance'" class="report-data">
          <h4>财务统计数据</h4>
          <el-row :gutter="20" class="data-summary">
            <el-col :span="8">
              <div class="data-card income">
                <div class="data-value">{{ formatMoney(currentReport.data.summary?.totalIncome || 0) }}</div>
                <div class="data-label">总收入</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="data-card expense">
                <div class="data-value">{{ formatMoney(currentReport.data.summary?.totalExpense || 0) }}</div>
                <div class="data-label">总支出</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="data-card" :class="currentReport.data.summary?.balance >= 0 ? 'income' : 'expense'">
                <div class="data-value">{{ formatMoney(currentReport.data.summary?.balance || 0) }}</div>
                <div class="data-label">结余</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 基础设施数据 -->
        <div v-if="currentReport.reportType === 'infrastructure'" class="report-data">
          <h4>基础设施统计</h4>
          <el-row :gutter="20" class="data-summary">
            <el-col :span="12">
              <div class="data-card">
                <div class="data-value">{{ currentReport.data.totalProjects || 0 }}</div>
                <div class="data-label">项目总数</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="data-card">
                <div class="data-value">{{ Object.keys(currentReport.data.byStatus || {}).length }}</div>
                <div class="data-label">状态类型数</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, User, Money, OfficeBuilding, MagicStick } from '@element-plus/icons-vue'
import governmentApi from '@/api/governmentLinkage'

const loading = ref(false)
const generating = ref(false)
const submitting = ref(false)
const selectedType = ref('')
const reports = ref([])
const showDetailDialog = ref(false)
const currentReport = ref(null)

const reportTypes = [
  {
    value: 'population',
    label: '人口报表',
    description: '人口数量、性别分布、年龄结构等统计',
    icon: User,
    color: '#409eff'
  },
  {
    value: 'finance',
    label: '财务报表',
    description: '收入、支出、结余等财务数据',
    icon: Money,
    color: '#67c23a'
  },
  {
    value: 'infrastructure',
    label: '基础设施报表',
    description: '村内建设项目、基础设施情况',
    icon: OfficeBuilding,
    color: '#e6a23c'
  }
]

const reportParams = reactive({
  year: new Date().getFullYear().toString(),
  month: new Date().getMonth() + 1
})

const listFilter = reactive({
  reportType: ''
})

const getReportTypeLabel = (type) => {
  const item = reportTypes.find(t => t.value === type)
  return item ? item.label : type
}

const getStatusLabel = (status) => {
  const labels = {
    pending_review: '待审核',
    submitted: '已上报',
    approved: '已通过',
    rejected: '已驳回'
  }
  return labels[status] || status
}

const getStatusType = (status) => {
  const types = {
    pending_review: 'warning',
    submitted: 'primary',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const formatMoney = (amount) => {
  return `¥${amount.toFixed(2)}`
}

const selectReportType = (type) => {
  selectedType.value = type
}

const generateReport = async () => {
  if (!reportParams.year) {
    ElMessage.warning('请选择年份')
    return
  }

  generating.value = true
  try {
    const { data } = await governmentApi.autoGenerateReport({
      reportType: selectedType.value,
      year: parseInt(reportParams.year),
      month: reportParams.month
    })
    if (data.success) {
      ElMessage.success('报表生成成功')
      fetchReports()
    }
  } catch (error) {
    ElMessage.error('生成报表失败')
  } finally {
    generating.value = false
  }
}

const fetchReports = async () => {
  loading.value = true
  try {
    const params = {
      ...listFilter,
      year: reportParams.year
    }
    const { data } = await governmentApi.getReports(params)
    if (data.success) {
      reports.value = data.data
    }
  } catch (error) {
    ElMessage.error('获取报表列表失败')
  } finally {
    loading.value = false
  }
}

const viewReport = async (report) => {
  try {
    const { data } = await governmentApi.getReportDetail(report._id)
    if (data.success) {
      currentReport.value = data.data
      showDetailDialog.value = true
    }
  } catch (error) {
    ElMessage.error('获取报表详情失败')
  }
}

const submitReport = async (report) => {
  await ElMessageBox.confirm('确定要上报此报表吗？上报后将无法修改', '确认上报', {
    type: 'warning'
  })
  submitting.value = true
  try {
    // 这里应该调用上报接口
    ElMessage.success('报表上报成功')
    fetchReports()
  } catch (error) {
    ElMessage.error('上报失败')
  } finally {
    submitting.value = false
  }
}

const downloadReport = (report) => {
  ElMessage.info('下载功能开发中')
}

onMounted(() => {
  fetchReports()
})
</script>

<style scoped>
.data-report-view {
  padding: 20px;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #303133;
}

.report-types {
  margin-bottom: 20px;
}

.report-type-card {
  cursor: pointer;
  transition: all 0.3s;
  height: 120px;
}

.report-type-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
}

.card-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.card-info p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.generate-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reports-list {
  min-height: 400px;
}

.report-detail {
  padding: 10px 0;
}

.report-data {
  margin-top: 20px;
}

.report-data h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
}

.data-summary {
  margin-bottom: 20px;
}

.data-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.data-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.data-card.income .data-value {
  color: #67c23a;
}

.data-card.expense .data-value {
  color: #f56c6c;
}

.data-label {
  font-size: 14px;
  color: #909399;
}
</style>
