<template>
  <div class="anti-fraud-module">
    <!-- 防诈骗统计概览 -->
    <div class="fraud-overview">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value">{{ fraudStats.totalReports }}</div>
            <div class="overview-label">总举报数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item blocked">
            <div class="overview-value">{{ fraudStats.blockedAttempts }}</div>
            <div class="overview-label">阻止尝试</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item detected">
            <div class="overview-value">{{ fraudStats.detectedFrauds }}</div>
            <div class="overview-label">检测到诈骗</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value" :class="getTrendClass(fraudStats.trend)">
              {{ fraudStats.trend > 0 ? '+' : '' }}{{ fraudStats.trend }}%
            </div>
            <div class="overview-label">趋势变化</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 诈骗类型统计 -->
    <div class="fraud-types">
      <h3>诈骗类型统计</h3>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-card title="电话诈骗">
            <div class="fraud-type-stat">
              <div class="stat-number">{{ fraudStats.phoneFraud }}</div>
              <div class="stat-label">检测次数</div>
              <el-progress
                :percentage="getPercentage(fraudStats.phoneFraud, fraudStats.detectedFrauds)"
                color="#F56C6C"
              />
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card title="短信诈骗">
            <div class="fraud-type-stat">
              <div class="stat-number">{{ fraudStats.smsFraud }}</div>
              <div class="stat-label">检测次数</div>
              <el-progress
                :percentage="getPercentage(fraudStats.smsFraud, fraudStats.detectedFrauds)"
                color="#E6A23C"
              />
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card title="钓鱼网站">
            <div class="fraud-type-stat">
              <div class="stat-number">{{ fraudStats.websiteFraud }}</div>
              <div class="stat-label">检测次数</div>
              <el-progress
                :percentage="getPercentage(fraudStats.websiteFraud, fraudStats.detectedFrauds)"
                color="#909399"
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 实时检测 -->
    <div class="real-time-detection">
      <h3>实时诈骗检测</h3>
      <el-form :model="detectionForm" label-width="120px">
        <el-form-item label="检测类型">
          <el-select v-model="detectionForm.eventType" placeholder="选择检测类型">
            <el-option label="电话诈骗检测" value="phone" />
            <el-option label="短信诈骗检测" value="sms" />
            <el-option label="钓鱼网站检测" value="website" />
          </el-select>
        </el-form-item>

        <!-- 电话诈骗检测表单 -->
        <div v-if="detectionForm.eventType === 'phone'" class="detection-form-phone">
          <el-form-item label="电话号码">
            <el-input
              v-model="detectionForm.phoneNumber"
              placeholder="请输入要检测的电话号码"
            />
          </el-form-item>
          <el-form-item label="通话内容">
            <el-input
              v-model="detectionForm.content"
              type="textarea"
              rows="3"
              placeholder="请输入通话内容摘要"
            />
          </el-form-item>
        </div>

        <!-- 短信诈骗检测表单 -->
        <div v-if="detectionForm.eventType === 'sms'" class="detection-form-sms">
          <el-form-item label="短信内容">
            <el-input
              v-model="detectionForm.content"
              type="textarea"
              rows="3"
              placeholder="请输入短信内容"
            />
          </el-form-item>
          <el-form-item label="发送号码">
            <el-input
              v-model="detectionForm.senderNumber"
              placeholder="请输入发送方号码"
            />
          </el-form-item>
          <el-form-item label="包含链接">
            <el-input
              v-model="detectionForm.links"
              placeholder="请输入包含的链接地址"
            />
          </el-form-item>
        </div>

        <!-- 钓鱼网站检测表单 -->
        <div v-if="detectionForm.eventType === 'website'" class="detection-form-website">
          <el-form-item label="网站地址">
            <el-input
              v-model="detectionForm.url"
              placeholder="请输入要检测的网站地址"
            />
          </el-form-item>
          <el-form-item label="网站内容">
            <el-input
              v-model="detectionForm.content"
              type="textarea"
              rows="3"
              placeholder="请输入网站内容摘要"
            />
          </el-form-item>
        </div>

        <el-form-item>
          <el-button type="primary" @click="performDetection" :loading="detecting">
            开始检测
          </el-button>
          <el-button @click="clearDetectionForm">
            清空表单
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 检测结果 -->
      <div v-if="detectionResult" class="detection-result">
        <h4>检测结果</h4>
        <el-alert
          :title="getRiskLevelTitle(detectionResult.riskLevel)"
          :type="getRiskLevelType(detectionResult.riskLevel)"
          :description="detectionResult.summary"
          show-icon
          :closable="false"
        />

        <el-descriptions :column="2" border style="margin-top: 16px">
          <el-descriptions-item label="风险评分">
            <el-tag :type="getRiskScoreType(detectionResult.riskScore)">
              {{ detectionResult.riskScore }}/100
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="getRiskLevelType(detectionResult.riskLevel)">
              {{ detectionResult.riskLevel }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检测时间">
            {{ formatDate(detectionResult.timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="检测模式">
            {{ detectionResult.analysisMode }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 检测详情 -->
        <div v-if="detectionResult.patterns && detectionResult.patterns.length > 0" class="patterns">
          <h5>检测到的风险模式:</h5>
          <el-table :data="detectionResult.patterns" style="width: 100%">
            <el-table-column prop="pattern" label="风险模式" />
            <el-table-column prop="confidence" label="置信度" width="100">
              <template #default="scope">
                <el-progress
                  :percentage="scope.row.confidence"
                  color="#F56C6C"
                  :stroke-width="6"
                />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
          </el-table>
        </div>

        <!-- 建议措施 -->
        <div v-if="detectionResult.recommendations" class="recommendations">
          <h5>建议措施:</h5>
          <ul>
            <li v-for="recommendation in detectionResult.recommendations" :key="recommendation">
              {{ recommendation }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 诈骗举报 -->
    <div class="fraud-reporting">
      <h3>诈骗举报</h3>
      <el-form :model="reportForm" label-width="120px">
        <el-form-item label="举报人">
          <el-input v-model="reportForm.reporter" placeholder="请输入举报人信息" />
        </el-form-item>
        <el-form-item label="诈骗类型">
          <el-select v-model="reportForm.type" placeholder="选择诈骗类型">
            <el-option label="电话诈骗" value="phone" />
            <el-option label="短信诈骗" value="sms" />
            <el-option label="网络诈骗" value="website" />
            <el-option label="其他诈骗" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="reportForm.contact" placeholder="请输入联系方式" />
        </el-form-item>
        <el-form-item label="诈骗描述">
          <el-input
            v-model="reportForm.description"
            type="textarea"
            rows="4"
            placeholder="请详细描述诈骗情况"
          />
        </el-form-item>
        <el-form-item label="相关证据">
          <el-upload
            class="evidence-upload"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleEvidenceUpload"
            multiple
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png/pdf文件，且不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitReport" :loading="reporting">
            提交举报
          </el-button>
          <el-button @click="clearReportForm">
            清空表单
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 风险趋势图表 -->
    <div class="fraud-trends">
      <h3>诈骗风险趋势</h3>
      <div ref="fraudTrendChart" class="chart-container"></div>
    </div>

    <!-- 举报记录 -->
    <div class="report-history">
      <h3>举报记录</h3>
      <el-table :data="reportHistory" style="width: 100%">
        <el-table-column prop="reportId" label="举报ID" width="150" />
        <el-table-column prop="type" label="诈骗类型" width="120" />
        <el-table-column prop="contact" label="联系方式" width="150" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="举报时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button
              type="text"
              size="small"
              @click="viewReportDetail(scope.row)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
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
const detecting = ref(false)
const reporting = ref(false)

// 防诈骗统计数据
const fraudStats = reactive({
  totalReports: 0,
  blockedAttempts: 0,
  detectedFrauds: 0,
  trend: 0,
  phoneFraud: 0,
  smsFraud: 0,
  websiteFraud: 0
})

// 检测表单
const detectionForm = reactive({
  eventType: 'phone',
  phoneNumber: '',
  content: '',
  senderNumber: '',
  links: '',
  url: ''
})

// 检测结果
const detectionResult = ref(null)

// 举报表单
const reportForm = reactive({
  reporter: '',
  type: '',
  contact: '',
  description: '',
  evidence: []
})

// 举报历史
const reportHistory = ref([])

// 图表引用
const fraudTrendChart = ref(null)

// 方法
const getTrendClass = (trend) => {
  if (trend > 0) return 'danger'
  if (trend < 0) return 'success'
  return 'neutral'
}

const getPercentage = (value, total) => {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

const getRiskLevelTitle = (level) => {
  const titles = {
    'LOW': '低风险 - 检测结果为安全',
    'MEDIUM': '中等风险 - 需要谨慎对待',
    'HIGH': '高风险 - 可能存在诈骗',
    'CRITICAL': '极高风险 - 高度疑似诈骗'
  }
  return titles[level] || '检测结果'
}

const getRiskLevelType = (level) => {
  const types = {
    'LOW': 'success',
    'MEDIUM': 'warning',
    'HIGH': 'danger',
    'CRITICAL': 'error'
  }
  return types[level] || 'info'
}

const getRiskScoreType = (score) => {
  if (score < 30) return 'success'
  if (score < 60) return 'warning'
  if (score < 80) return 'danger'
  return 'error'
}

const getStatusType = (status) => {
  const types = {
    '待处理': 'warning',
    '处理中': 'primary',
    '已完成': 'success',
    '已驳回': 'danger'
  }
  return types[status] || 'info'
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

// 获取防诈骗统计数据
const fetchFraudStats = async () => {
  try {
    const response = await axios.get('/api/v1/security/fraud-stats')

    if (response.data.success) {
      Object.assign(fraudStats, response.data.data.statistics)
    }
  } catch (error) {
    console.error('获取防诈骗统计失败:', error)
    // 使用模拟数据
    Object.assign(fraudStats, {
      totalReports: 156,
      blockedAttempts: 89,
      detectedFrauds: 67,
      trend: -12.5,
      phoneFraud: 23,
      smsFraud: 28,
      websiteFraud: 16
    })
  }
}

// 获取举报历史
const fetchReportHistory = async () => {
  try {
    const response = await axios.get('/api/v1/security/fraud-reports')

    if (response.data.success) {
      reportHistory.value = response.data.data || []
    }
  } catch (error) {
    console.error('获取举报历史失败:', error)
    // 使用模拟数据
    reportHistory.value = [
      {
        reportId: 'FR202401001',
        type: 'phone',
        contact: '138****1234',
        description: '冒充公检法人员要求转账',
        status: '处理中',
        createdAt: new Date('2024-01-15 14:30:00')
      },
      {
        reportId: 'FR202401002',
        type: 'sms',
        contact: '159****5678',
        description: '收到中奖短信，要求支付手续费',
        status: '已完成',
        createdAt: new Date('2024-01-14 09:15:00')
      }
    ]
  }
}

// 执行检测
const performDetection = async () => {
  if (!detectionForm.eventType) {
    ElMessage.warning('请选择检测类型')
    return
  }

  if (detectionForm.eventType === 'phone' && !detectionForm.phoneNumber) {
    ElMessage.warning('请输入电话号码')
    return
  }

  if (detectionForm.eventType === 'website' && !detectionForm.url) {
    ElMessage.warning('请输入网站地址')
    return
  }

  detecting.value = true
  try {
    const data = {
      eventType: detectionForm.eventType
    }

    if (detectionForm.eventType === 'phone') {
      data.data = {
        phoneNumber: detectionForm.phoneNumber,
        content: detectionForm.content
      }
    } else if (detectionForm.eventType === 'sms') {
      data.data = {
        content: detectionForm.content,
        senderNumber: detectionForm.senderNumber,
        links: detectionForm.links
      }
    } else if (detectionForm.eventType === 'website') {
      data.data = {
        url: detectionForm.url,
        content: detectionForm.content
      }
    }

    const response = await axios.post('/api/v1/security/detect-fraud', data)

    if (response.data.success) {
      detectionResult.value = response.data.data
      ElMessage.success('检测完成')
    }
  } catch (error) {
    console.error('检测失败:', error)
    ElMessage.error('检测失败')
  } finally {
    detecting.value = false
  }
}

// 清空检测表单
const clearDetectionForm = () => {
  detectionResult.value = null
  Object.assign(detectionForm, {
    eventType: 'phone',
    phoneNumber: '',
    content: '',
    senderNumber: '',
    links: '',
    url: ''
  })
}

// 处理证据上传
const handleEvidenceUpload = (file) => {
  reportForm.evidence.push(file)
  return false // 阻止自动上传
}

// 提交举报
const submitReport = async () => {
  if (!reportForm.type || !reportForm.description) {
    ElMessage.warning('请填写必要的举报信息')
    return
  }

  reporting.value = true
  try {
    const response = await axios.post('/api/v1/security/report-fraud', reportForm)

    if (response.data.success) {
      ElMessage.success('举报提交成功')
      clearReportForm()
      await fetchReportHistory()
    }
  } catch (error) {
    console.error('提交举报失败:', error)
    ElMessage.error('提交举报失败')
  } finally {
    reporting.value = false
  }
}

// 清空举报表单
const clearReportForm = () => {
  Object.assign(reportForm, {
    reporter: '',
    type: '',
    contact: '',
    description: '',
    evidence: []
  })
}

// 查看举报详情
const viewReportDetail = (report) => {
  ElMessageBox.alert(
    `举报ID: ${report.reportId}\n诈骗类型: ${report.type}\n联系方式: ${report.contact}\n描述: ${report.description}\n状态: ${report.status}`,
    '举报详情',
    {
      confirmButtonText: '确定'
    }
  )
}

// 更新趋势图表
const updateFraudTrendChart = () => {
  if (!fraudTrendChart.value) return

  const chart = echarts.init(fraudTrendChart.value)

  const option = {
    title: {
      text: '诈骗检测趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['电话诈骗', '短信诈骗', '钓鱼网站', '总计'],
      top: 30
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '电话诈骗',
        type: 'line',
        data: [12, 15, 18, 14, 20, 23],
        itemStyle: { color: '#F56C6C' }
      },
      {
        name: '短信诈骗',
        type: 'line',
        data: [18, 22, 25, 20, 24, 28],
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '钓鱼网站',
        type: 'line',
        data: [8, 12, 10, 15, 14, 16],
        itemStyle: { color: '#909399' }
      },
      {
        name: '总计',
        type: 'line',
        data: [38, 49, 53, 49, 58, 67],
        itemStyle: { color: '#409EFF' }
      }
    ]
  }

  chart.setOption(option)
}

// 初始化
onMounted(async () => {
  await Promise.all([
    fetchFraudStats(),
    fetchReportHistory()
  ])

  nextTick(() => {
    updateFraudTrendChart()
  })
})
</script>

<style scoped>
.anti-fraud-module {
  padding: 24px;
}

.fraud-overview {
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

.overview-value.blocked {
  color: #E6A23C;
}

.overview-value.detected {
  color: #F56C6C;
}

.overview-value.danger {
  color: #F56C6C;
}

.overview-value.success {
  color: #67C23A;
}

.overview-value.neutral {
  color: #909399;
}

.overview-label {
  font-size: 14px;
  color: #909399;
}

.fraud-types,
.real-time-detection,
.fraud-reporting,
.fraud-trends,
.report-history {
  margin-bottom: 24px;
}

.fraud-types h3,
.real-time-detection h3,
.fraud-reporting h3,
.fraud-trends h3,
.report-history h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 18px;
}

.fraud-type-stat {
  text-align: center;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.detection-form-phone,
.detection-form-sms,
.detection-form-website {
  margin-bottom: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.detection-result {
  margin-top: 24px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.detection-result h4 {
  margin-bottom: 16px;
  color: #303133;
}

.patterns,
.recommendations {
  margin-top: 16px;
}

.patterns h5,
.recommendations h5 {
  margin-bottom: 8px;
  color: #606266;
}

.recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.recommendations li {
  margin-bottom: 4px;
  color: #606266;
}

.evidence-upload {
  width: 100%;
}

.chart-container {
  width: 100%;
  height: 400px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fraud-overview .el-col {
    margin-bottom: 16px;
  }

  .chart-container {
    height: 300px;
  }
}
</style>