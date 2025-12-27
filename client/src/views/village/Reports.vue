<template>
  <div class="reports">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="分析报告"
      left-arrow
      @click-left="$router.go(-1)"
      right-text="生成"
      @click-right="showReportGenerator = true"
    />

    <!-- 快速报告卡片 -->
    <div class="quick-reports">
      <van-grid :column-num="2" :gutter="12">
        <van-grid-item
          v-for="report in quickReports"
          :key="report.id"
          @click="generateQuickReport(report)"
        >
          <div class="report-card">
            <div class="report-icon" :style="{ backgroundColor: report.color }">
              <van-icon :name="report.icon" size="24" color="white" />
            </div>
            <div class="report-title">{{ report.title }}</div>
            <div class="report-desc">{{ report.description }}</div>
          </div>
        </van-grid-item>
      </van-grid>
    </div>

    <!-- 报告列表 -->
    <div class="reports-list">
      <van-cell-group inset title="历史报告">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell
            v-for="report in reports"
            :key="report.id"
            :title="report.title"
            :label="formatReportLabel(report)"
            is-link
            @click="viewReport(report)"
          >
            <template #left-icon>
              <van-icon :name="getReportIcon(report.type)" />
            </template>
            <template #right-icon>
              <div class="report-actions">
                <van-tag :type="getStatusType(report.status)" size="small">
                  {{ getStatusText(report.status) }}
                </van-tag>
                <div class="report-menu">
                  <van-icon name="ellipsis" @click.stop="showReportMenu(report)" />
                </div>
              </div>
            </template>
          </van-cell>
        </van-list>
      </van-cell-group>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && reports.length === 0" class="empty-state">
      <van-empty description="暂无报告">
        <van-button type="primary" @click="showReportGenerator = true">
          生成第一个报告
        </van-button>
      </van-empty>
    </div>

    <!-- 报告生成器弹窗 -->
    <van-popup v-model:show="showReportGenerator" position="bottom" :style="{ height: '90%' }">
      <div class="report-generator">
        <div class="generator-header">
          <h3>生成报告</h3>
          <van-icon name="cross" @click="showReportGenerator = false" />
        </div>

        <div class="generator-content">
          <van-form>
            <!-- 报告类型 -->
            <van-field name="type" label="报告类型">
              <template #input>
                <van-radio-group v-model="reportForm.type" direction="horizontal">
                  <van-radio name="summary">汇总报告</van-radio>
                  <van-radio name="detailed">详细报告</van-radio>
                  <van-radio name="custom">自定义</van-radio>
                </van-radio-group>
              </template>
            </van-field>

            <!-- 时间范围 -->
            <van-field
              name="dateRange"
              label="时间范围"
              readonly
              clickable
              :value="getDateRangeText(reportForm.dateRange)"
              @click="showDateRangePicker = true"
            />

            <!-- 数据范围 -->
            <van-field name="dataScope" label="数据范围">
              <template #input>
                <van-checkbox-group v-model="reportForm.dataScope" direction="horizontal">
                  <van-checkbox name="documents">资料收集</van-checkbox>
                  <van-checkbox name="duty">值班记录</van-checkbox>
                  <van-checkbox name="users">用户活跃</van-checkbox>
                </van-checkbox-group>
              </template>
            </van-field>

            <!-- 报告格式 -->
            <van-field name="format" label="报告格式">
              <template #input>
                <van-radio-group v-model="reportForm.format" direction="horizontal">
                  <van-radio name="pdf">PDF</van-radio>
                  <van-radio name="excel">Excel</van-radio>
                  <van-radio name="word">Word</van-radio>
                </van-radio-group>
              </template>
            </van-field>

            <!-- 高级选项 -->
            <van-collapse v-model="activeAdvancedOptions">
              <van-collapse-item title="高级选项" name="advanced">
                <van-field
                  v-model="reportForm.title"
                  label="报告标题"
                  placeholder="请输入报告标题"
                />
                <van-field
                  v-model="reportForm.description"
                  label="报告描述"
                  type="textarea"
                  placeholder="请输入报告描述"
                  rows="2"
                />
                <van-field name="includeCharts" label="图表">
                  <template #input>
                    <van-switch v-model="reportForm.includeCharts" />
                  </template>
                </van-field>
                <van-field name="autoRefresh" label="自动刷新">
                  <template #input>
                    <van-switch v-model="reportForm.autoRefresh" />
                  </template>
                </van-field>
              </van-collapse-item>
            </van-collapse>
          </van-form>
        </div>

        <div class="generator-actions">
          <van-button @click="showReportGenerator = false">取消</van-button>
          <van-button type="primary" @click="generateReport" :loading="generating">
            生成报告
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 报告菜单 -->
    <van-action-sheet
      v-model:show="showActionSheet"
      :actions="reportActions"
      @select="onReportActionSelect"
      cancel-text="取消"
    />

    <!-- 日期范围选择器 -->
    <van-popup v-model:show="showDateRangePicker" position="bottom">
      <van-calendar
        v-model="reportForm.dateRange"
        title="选择时间范围"
        type="range"
        @confirm="onDateRangeConfirm"
        @cancel="showDateRangePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import villageApi from '@/api/villageManagement'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const finished = ref(false)
const generating = ref(false)
const showReportGenerator = ref(false)
const showActionSheet = ref(false)
const showDateRangePicker = ref(false)
const activeAdvancedOptions = ref([])

const reports = ref([])
const currentReport = ref(null)

// 分页参数
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 快速报告类型
const quickReports = ref([
  {
    id: '1',
    title: '月度汇总',
    description: '本月工作数据汇总',
    icon: 'chart-trending-o',
    color: '#409EFF',
    type: 'monthly_summary'
  },
  {
    id: '2',
    title: '季度分析',
    description: '季度业务分析报告',
    icon: 'bar-chart-o',
    color: '#67C23A',
    type: 'quarterly_analysis'
  },
  {
    id: '3',
    title: '年度总结',
    description: '年度工作总结报告',
    icon: 'orders-o',
    color: '#E6A23C',
    type: 'annual_summary'
  },
  {
    id: '4',
    title: '专项报告',
    description: '特定主题分析报告',
    icon: 'description',
    color: '#F56C6C',
    type: 'special_report'
  }
])

// 报告表单
const reportForm = reactive({
  type: 'summary',
  dateRange: [],
  dataScope: ['documents'],
  format: 'pdf',
  title: '',
  description: '',
  includeCharts: true,
  autoRefresh: false
})

// 报告操作
const reportActions = ref([
  { name: '查看报告', value: 'view' },
  { name: '下载报告', value: 'download' },
  { name: '分享报告', value: 'share' },
  { name: '删除报告', value: 'delete' }
])

// 方法
const getReportIcon = (type) => {
  const iconMap = {
    'summary': 'chart-trending-o',
    'detailed': 'bar-chart-o',
    'custom': 'description',
    'monthly': 'calendar-o',
    'quarterly': 'logistics',
    'annual': 'orders-o'
  }
  return iconMap[type] || 'description'
}

const getStatusType = (status) => {
  const typeMap = {
    'generating': 'primary',
    'completed': 'success',
    'failed': 'danger',
    'scheduled': 'warning'
  }
  return typeMap[status] || 'default'
}

const getStatusText = (status) => {
  const textMap = {
    'generating': '生成中',
    'completed': '已完成',
    'failed': '失败',
    'scheduled': '计划中'
  }
  return textMap[status] || status
}

const formatReportLabel = (report) => {
  const labels = []
  if (report.generateTime) {
    labels.push(`生成时间: ${formatDate(report.generateTime)}`)
  }
  if (report.format) {
    labels.push(`格式: ${report.format.toUpperCase()}`)
  }
  if (report.size) {
    labels.push(`大小: ${formatFileSize(report.size)}`)
  }
  return labels.join(' • ')
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getDateRangeText = (dateRange) => {
  if (!dateRange || dateRange.length === 0) return '选择时间范围'
  if (dateRange.length === 1) return formatDate(dateRange[0])
  return `${formatDate(dateRange[0])} - ${formatDate(dateRange[1])}`
}

const generateQuickReport = async (report) => {
  try {
    showToast(`正在生成${report.title}...`)

    const response = await villageApi.generateQuickReport({
      type: report.type,
      format: 'pdf'
    })

    if (response.data.success) {
      showToast('报告生成成功')
      loadReports(true)
    }
  } catch (error) {
    console.error('生成快速报告失败:', error)
    showToast('生成失败')
  }
}

const generateReport = async () => {
  try {
    generating.value = true

    // 验证表单
    if (reportForm.dataScope.length === 0) {
      showToast('请选择数据范围')
      return
    }

    if (!reportForm.dateRange || reportForm.dateRange.length === 0) {
      showToast('请选择时间范围')
      return
    }

    const response = await villageApi.generateReport(reportForm)

    if (response.data.success) {
      showToast('报告生成成功')
      showReportGenerator.value = false
      loadReports(true)

      // 重置表单
      Object.assign(reportForm, {
        type: 'summary',
        dateRange: [],
        dataScope: ['documents'],
        format: 'pdf',
        title: '',
        description: '',
        includeCharts: true,
        autoRefresh: false
      })
    }
  } catch (error) {
    console.error('生成报告失败:', error)
    showToast('生成失败')
  } finally {
    generating.value = false
  }
}

const viewReport = (report) => {
  if (report.status === 'completed') {
    // 在新窗口打开报告
    if (report.url) {
      window.open(report.url, '_blank')
    } else {
      showToast('报告文件不可用')
    }
  } else {
    showToast('报告尚未生成完成')
  }
}

const showReportMenu = (report) => {
  currentReport.value = report
  showActionSheet.value = true
}

const onReportActionSelect = async (action) => {
  showActionSheet.value = false

  if (!currentReport.value) return

  try {
    switch (action.value) {
      case 'view':
        viewReport(currentReport.value)
        break
      case 'download':
        await downloadReport(currentReport.value)
        break
      case 'share':
        await shareReport(currentReport.value)
        break
      case 'delete':
        await deleteReport(currentReport.value)
        break
    }
  } catch (error) {
    console.error('操作失败:', error)
    showToast('操作失败')
  }
}

const downloadReport = async (report) => {
  try {
    showToast('正在下载...')

    const response = await villageApi.downloadReport(report.id)

    // 创建下载链接
    const blob = new Blob([response.data], {
      type: getContentType(report.format)
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title}.${report.format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    showToast('下载成功')
  } catch (error) {
    showToast('下载失败')
  }
}

const shareReport = async (report) => {
  try {
    const response = await villageApi.shareReport(report.id)

    if (response.data.success) {
      const shareUrl = response.data.shareUrl

      // 复制到剪贴板
      await navigator.clipboard.writeText(shareUrl)
      showToast('分享链接已复制到剪贴板')
    }
  } catch (error) {
    showToast('分享失败')
  }
}

const deleteReport = async (report) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除报告"${report.title}"吗？`,
    })

    const response = await villageApi.deleteReport(report.id)

    if (response.data.success) {
      showToast('删除成功')
      loadReports(true)
    }
  } catch (error) {
    if (error.name !== 'cancel') {
      showToast('删除失败')
    }
  }
}

const getContentType = (format) => {
  const typeMap = {
    'pdf': 'application/pdf',
    'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'word': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return typeMap[format] || 'application/octet-stream'
}

const onLoad = () => {
  loadReports()
}

const loadReports = async (reset = false) => {
  if (reset) {
    pagination.page = 1
    reports.value = []
    finished.value = false
  }

  loading.value = true
  try {
    const response = await villageApi.getReports({
      page: pagination.page,
      limit: pagination.limit
    })

    const newReports = response.data.data.docs || []

    if (reset) {
      reports.value = newReports
    } else {
      reports.value.push(...newReports)
    }

    pagination.total = response.data.data.total || 0
    pagination.page += 1

    finished.value = reports.value.length >= pagination.total
  } catch (error) {
    console.error('加载报告列表失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const onDateRangeConfirm = (dateRange) => {
  reportForm.dateRange = dateRange
  showDateRangePicker.value = false
}

// 生命周期
onMounted(() => {
  loadReports(true)
})
</script>

<style scoped>
.reports {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.quick-reports {
  padding: 16px;
}

.report-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  height: 120px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.report-card:active {
  transform: scale(0.95);
}

.report-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.report-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.report-desc {
  font-size: 12px;
  color: #666;
  text-align: center;
}

.reports-list {
  margin-bottom: 80px;
}

.report-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-menu {
  padding: 4px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  background: white;
  margin: 16px;
  border-radius: 8px;
}

.report-generator {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.generator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.generator-header h3 {
  margin: 0;
  font-size: 16px;
}

.generator-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.generator-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.generator-actions .van-button {
  flex: 1;
}
</style>