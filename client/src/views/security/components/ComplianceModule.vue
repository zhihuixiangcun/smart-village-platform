<template>
  <div class="compliance-module">
    <!-- 等保合规状态概览 -->
    <div class="compliance-overview">
      <el-row :gutter="16">
        <el-col :span="8">
          <div class="overview-item">
            <div class="overview-value" :class="getComplianceClass(assessmentData.overallScore)">
              {{ assessmentData.overallScore }}
            </div>
            <div class="overview-label">合规分数</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="overview-item">
            <div class="overview-value">{{ assessmentData.protectionLevel }}</div>
            <div class="overview-label">保护级别</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="overview-item">
            <div class="overview-value" :class="assessmentData.isCompliant ? 'compliant' : 'non-compliant'">
              {{ assessmentData.isCompliant ? '合规' : '不合规' }}
            </div>
            <div class="overview-label">合规状态</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 域合规情况 -->
    <div class="domain-compliance">
      <h3>安全域合规情况</h3>
      <el-table :data="domainScores" style="width: 100%">
        <el-table-column prop="domain" label="安全域" width="180" />
        <el-table-column prop="score" label="得分" width="100">
          <template #default="scope">
            <el-tag :type="getScoreType(scope.row.score)">
              {{ scope.row.score }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'compliant' ? 'success' : 'danger'">
              {{ scope.row.status === 'compliant' ? '合规' : '不合规' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="issues" label="问题数量" width="100" />
        <el-table-column label="进度条">
          <template #default="scope">
            <el-progress
              :percentage="scope.row.score"
              :color="getProgressColor(scope.row.score)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button
              type="text"
              size="small"
              @click="viewDomainDetails(scope.row)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 不合规项目 -->
    <div class="non-compliance-items" v-if="nonCompliantItems.length > 0">
      <h3>需要整改的不合规项目</h3>
      <el-table :data="nonCompliantItems" style="width: 100%">
        <el-table-column prop="controlId" label="控制项ID" width="150" />
        <el-table-column prop="title" label="控制项标题" />
        <el-table-column prop="category" label="类别" width="120" />
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="scope">
            <el-tag :type="getSeverityType(scope.row.severity)">
              {{ scope.row.severity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recommendations" label="整改建议" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="remediateItem(scope.row)"
            >
              开始整改
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 整改计划 -->
    <div class="remediation-plan" v-if="remediationPlan">
      <h3>整改计划</h3>
      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in remediationPlan.tasks"
          :key="index"
          :timestamp="item.targetDate"
          :type="getTaskType(item.priority)"
        >
          <div class="task-content">
            <h4>{{ item.title }}</h4>
            <p>{{ item.description }}</p>
            <div class="task-meta">
              <el-tag size="small">{{ item.priority }}</el-tag>
              <el-tag size="small" type="info">{{ item.assignee }}</el-tag>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>

    <!-- 操作按钮 -->
    <div class="module-actions">
      <el-button type="primary" @click="refreshAssessment" :loading="refreshing">
        重新评估
      </el-button>
      <el-button type="success" @click="generateRemediationPlan">
        生成整改计划
      </el-button>
      <el-button type="warning" @click="startMonitoring">
        启动持续监控
      </el-button>
      <el-button @click="exportComplianceReport">
        导出合规报告
      </el-button>
    </div>

    <!-- 域详情对话框 -->
    <el-dialog
      v-model="domainDetailVisible"
      :title="`${currentDomain?.domain} 域详情`"
      width="80%"
    >
      <div v-if="currentDomain">
        <h4>评估结果</h4>
        <p>得分: {{ currentDomain.score }}/100</p>
        <p>状态: {{ currentDomain.status === 'compliant' ? '合规' : '不合规' }}</p>

        <h4>控制项详情</h4>
        <el-table :data="currentDomain.controls" style="width: 100%">
          <el-table-column prop="controlId" label="控制项ID" width="150" />
          <el-table-column prop="title" label="控制项标题" />
          <el-table-column prop="implementation" label="实现情况" />
          <el-table-column prop="evidence" label="证据" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'compliant' ? 'success' : 'danger'">
                {{ scope.row.status === 'compliant' ? '合规' : '不合规' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 整改对话框 -->
    <el-dialog
      v-model="remediationVisible"
      title="整改项目"
      width="60%"
    >
      <div v-if="currentItem">
        <h4>{{ currentItem.title }}</h4>
        <p><strong>问题描述:</strong> {{ currentItem.description }}</p>
        <p><strong>整改建议:</strong></p>
        <ul>
          <li v-for="recommendation in currentItem.recommendations" :key="recommendation">
            {{ recommendation }}
          </li>
        </ul>

        <el-form :model="remediationForm" label-width="120px">
          <el-form-item label="整改方案">
            <el-input
              v-model="remediationForm.solution"
              type="textarea"
              rows="4"
              placeholder="请输入具体的整改方案"
            />
          </el-form-item>
          <el-form-item label="负责人">
            <el-input v-model="remediationForm.assignee" placeholder="请输入负责人" />
          </el-form-item>
          <el-form-item label="预计完成时间">
            <el-date-picker
              v-model="remediationForm.targetDate"
              type="date"
              placeholder="选择预计完成时间"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="remediationVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRemediation">提交整改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// Props
const props = defineProps({
  moduleData: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emit = defineEmits(['refresh'])

// 响应式数据
const refreshing = ref(false)
const domainDetailVisible = ref(false)
const remediationVisible = ref(false)
const currentDomain = ref(null)
const currentItem = ref(null)

// 评估数据
const assessmentData = reactive({
  protectionLevel: 'L2',
  overallScore: 0,
  isCompliant: false,
  domainScores: {},
  nonCompliantItems: []
})

// 整改计划
const remediationPlan = ref(null)

// 整改表单
const remediationForm = reactive({
  solution: '',
  assignee: '',
  targetDate: ''
})

// 计算属性
const domainScores = computed(() => {
  return Object.entries(assessmentData.domainScores).map(([domain, data]) => ({
    domain: getDomainName(domain),
    score: data.score,
    status: data.isCompliant ? 'compliant' : 'non-compliant',
    issues: data.issues || 0,
    controls: data.controls || []
  }))
})

const nonCompliantItems = computed(() => {
  return assessmentData.nonCompliantItems.map(item => ({
    controlId: item.controlId,
    title: item.title,
    description: item.description,
    category: item.category,
    severity: item.severity,
    recommendations: item.recommendations || [],
    currentImplementation: item.currentImplementation
  }))
})

// 方法
const getDomainName = (domain) => {
  const domainNames = {
    'physical': '物理安全',
    'network': '网络安全',
    'host': '主机安全',
    'application': '应用安全',
    'data': '数据安全',
    'management': '安全管理',
    'recovery': '备份恢复'
  }
  return domainNames[domain] || domain
}

const getComplianceClass = (score) => {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  return 'poor'
}

const getScoreType = (score) => {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

const getProgressColor = (score) => {
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  return '#F56C6C'
}

const getSeverityType = (severity) => {
  const typeMap = {
    'high': 'danger',
    'medium': 'warning',
    'low': 'info'
  }
  return typeMap[severity] || 'info'
}

const getTaskType = (priority) => {
  const typeMap = {
    'critical': 'danger',
    'high': 'warning',
    'medium': 'primary',
    'low': 'info'
  }
  return typeMap[priority] || 'primary'
}

// 获取合规评估数据
const fetchAssessmentData = async () => {
  try {
    const response = await axios.post('/api/v1/security/compliance-assessment', {
      protectionLevel: assessmentData.protectionLevel
    })

    if (response.data.success) {
      Object.assign(assessmentData, response.data.data)
    }
  } catch (error) {
    console.error('获取合规评估数据失败:', error)
    ElMessage.error('获取合规评估数据失败')
  }
}

// 刷新评估
const refreshAssessment = async () => {
  refreshing.value = true
  try {
    await fetchAssessmentData()
    ElMessage.success('合规评估已刷新')
  } catch (error) {
    ElMessage.error('刷新评估失败')
  } finally {
    refreshing.value = false
  }
}

// 查看域详情
const viewDomainDetails = (domain) => {
  currentDomain.value = domain
  domainDetailVisible.value = true
}

// 整改项目
const remediateItem = (item) => {
  currentItem.value = item
  remediationForm.solution = ''
  remediationForm.assignee = ''
  remediationForm.targetDate = ''
  remediationVisible.value = true
}

// 提交整改
const submitRemediation = async () => {
  if (!remediationForm.solution || !remediationForm.assignee || !remediationForm.targetDate) {
    ElMessage.warning('请填写完整的整改信息')
    return
  }

  try {
    // 这里应该调用整改API
    // await axios.post('/api/v1/security/remediation', {
    //   itemId: currentItem.value.controlId,
    //   ...remediationForm
    // })

    ElMessage.success('整改方案已提交')
    remediationVisible.value = false
    await fetchAssessmentData()
  } catch (error) {
    ElMessage.error('提交整改失败')
  }
}

// 生成整改计划
const generateRemediationPlan = async () => {
  try {
    const response = await axios.post('/api/v1/security/generate-remediation-plan', {
      assessmentId: assessmentData.assessmentId,
      protectionLevel: assessmentData.protectionLevel
    })

    if (response.data.success) {
      remediationPlan.value = response.data.data
      ElMessage.success('整改计划已生成')
    }
  } catch (error) {
    console.error('生成整改计划失败:', error)
    ElMessage.error('生成整改计划失败')
  }
}

// 启动持续监控
const startMonitoring = async () => {
  try {
    const response = await axios.get('/api/v1/security/continuous-compliance-monitoring')

    if (response.data.success) {
      ElMessage.success('持续监控已启动')
    }
  } catch (error) {
    console.error('启动持续监控失败:', error)
    ElMessage.error('启动持续监控失败')
  }
}

// 导出合规报告
const exportComplianceReport = () => {
  ElMessage.info('导出功能开发中')
}

// 监听模块数据变化
watch(() => props.moduleData, (newData) => {
  if (newData && Object.keys(newData).length > 0) {
    Object.assign(assessmentData, newData)
  }
}, { immediate: true })

// 初始化
onMounted(async () => {
  await fetchAssessmentData()
})
</script>

<style scoped>
.compliance-module {
  padding: 24px;
}

.compliance-overview {
  margin-bottom: 24px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.overview-item {
  text-align: center;
}

.overview-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.overview-value.excellent {
  color: #67C23A;
}

.overview-value.good {
  color: #409EFF;
}

.overview-value.poor {
  color: #F56C6C;
}

.overview-value.compliant {
  color: #67C23A;
}

.overview-value.non-compliant {
  color: #F56C6C;
}

.overview-label {
  font-size: 14px;
  color: #909399;
}

.domain-compliance,
.non-compliance-items,
.remediation-plan {
  margin-bottom: 24px;
}

.domain-compliance h3,
.non-compliance-items h3,
.remediation-plan h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 18px;
}

.task-content h4 {
  margin-bottom: 8px;
  color: #303133;
}

.task-content p {
  margin-bottom: 8px;
  color: #606266;
}

.task-meta {
  display: flex;
  gap: 8px;
}

.module-actions {
  text-align: center;
  margin-top: 32px;
}

.module-actions .el-button {
  margin: 0 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .compliance-overview .el-col {
    margin-bottom: 16px;
  }

  .module-actions {
    text-align: left;
  }

  .module-actions .el-button {
    display: block;
    width: 100%;
    margin-bottom: 8px;
  }
}
</style>