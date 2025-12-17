<template>
  <div class="events-list">
    <el-container>
      <!-- 页面头部 -->
      <el-header class="page-header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="page-title">
              <el-icon><WarningFilled /></el-icon>
              应急事件管理
            </h1>
            <p class="page-description">管理和查看应急事件上报及处理状态</p>
          </div>
          <div class="action-section">
            <el-button type="danger" @click="emergencyBroadcast" v-if="hasPermission('emergency:broadcast')">
              <el-icon><Bell /></el-icon>
              应急广播
            </el-button>
            <el-button type="primary" @click="exportEvents">
              <el-icon><Download /></el-icon>
              导出事件
            </el-button>
            <el-button type="success" @click="reportEvent">
              <el-icon><Plus /></el-icon>
              上报事件
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 页面主体 -->
      <el-main class="page-main">
        <!-- 统计卡片 -->
        <div class="stats-cards">
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card critical">
                <div class="stat-icon">
                  <el-icon><WarningFilled /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ eventStats.critical }}</div>
                  <div class="stat-label">紧急事件</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card processing">
                <div class="stat-icon">
                  <el-icon><Loading /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ eventStats.processing }}</div>
                  <div class="stat-label">处理中</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card resolved">
                <div class="stat-icon">
                  <el-icon><CircleCheckFilled /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ eventStats.resolved }}</div>
                  <div class="stat-label">已解决</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="stat-card today">
                <div class="stat-icon">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ eventStats.today }}</div>
                  <div class="stat-label">今日事件</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 实时警报 -->
        <div class="alert-section" v-if="hasActiveAlerts">
          <el-alert
            v-for="alert in activeAlerts"
            :key="alert.id"
            :title="alert.title"
            :type="alert.type"
            :description="alert.description"
            show-icon
            :closable="true"
            class="emergency-alert"
            @close="dismissAlert(alert.id)"
          />
        </div>

        <!-- 筛选和搜索 -->
        <div class="filter-section">
          <el-card shadow="never">
            <el-row :gutter="16" class="filter-row">
              <el-col :xs="24" :sm="8" :md="6">
                <el-input
                  v-model="searchQuery"
                  placeholder="搜索事件标题或上报人"
                  clearable
                  @clear="handleSearch"
                  @keyup.enter="handleSearch"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterStatus"
                  placeholder="事件状态"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部状态" value="" />
                  <el-option label="待处理" value="pending" />
                  <el-option label="处理中" value="processing" />
                  <el-option label="已解决" value="resolved" />
                  <el-option label="已关闭" value="closed" />
                </el-select>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterPriority"
                  placeholder="优先级"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部级别" value="" />
                  <el-option label="低" value="low" />
                  <el-option label="中" value="medium" />
                  <el-option label="高" value="high" />
                  <el-option label="紧急" value="critical" />
                </el-select>
              </el-col>
              <el-col :xs="24" :sm="8" :md="6">
                <el-select
                  v-model="filterType"
                  placeholder="事件类型"
                  clearable
                  @change="handleFilter"
                >
                  <el-option label="全部类型" value="" />
                  <el-option label="自然灾害" value="natural" />
                  <el-option label="安全事故" value="safety" />
                  <el-option label="公共卫生" value="health" />
                  <el-option label="社会治安" value="security" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <!-- 事件列表 -->
        <div class="events-table">
          <el-card shadow="never">
            <el-table
              :data="filteredEvents"
              v-loading="loading"
              stripe
              style="width: 100%"
              @sort-change="handleSortChange"
              :row-class-name="getRowClassName"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="title" label="事件标题" width="200" sortable>
                <template #default="{ row }">
                  <el-link type="primary" @click="viewEvent(row.id)" :underline="false">
                    {{ row.title }}
                  </el-link>
                </template>
              </el-table-column>

              <el-table-column prop="type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="getTypeTagType(row.type)" size="small">
                    {{ getTypeLabel(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="priority" label="优先级" width="80" sortable>
                <template #default="{ row }">
                  <el-tag :type="getPriorityTagType(row.priority)" size="small">
                    {{ getPriorityLabel(row.priority) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="status" label="状态" width="100" sortable>
                <template #default="{ row }">
                  <el-tag :type="getStatusTagType(row.status)">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="reporter" label="上报人" width="100" />

              <el-table-column prop="location" label="事发地点" width="150" />

              <el-table-column prop="reportTime" label="上报时间" width="120" sortable>
                <template #default="{ row }">
                  {{ formatDateTime(row.reportTime) }}
                </template>
              </el-table-column>

              <el-table-column prop="assignee" label="处理人" width="100">
                <template #default="{ row }">
                  {{ row.assignee || '-' }}
                </template>
              </el-table-column>

              <el-table-column prop="responseTime" label="响应时间" width="120" sortable>
                <template #default="{ row }">
                  {{ row.responseTime ? formatDateTime(row.responseTime) : '-' }}
                </template>
              </el-table-column>

              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button type="text" size="small" @click="viewEvent(row.id)">
                    <el-icon><View /></el-icon>
                    查看
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click="handleEvent(row.id)"
                    v-if="hasPermission('emergency:handle') && row.status !== 'resolved'"
                  >
                    <el-icon><Tools /></el-icon>
                    处理
                  </el-button>
                  <el-dropdown @command="(command) => handleAction(command, row)">
                    <el-button type="text" size="small">
                      更多<el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="assign">指派处理人</el-dropdown-item>
                        <el-dropdown-item command="escalate">事件升级</el-dropdown-item>
                        <el-dropdown-item command="track">跟踪进度</el-dropdown-item>
                        <el-dropdown-item command="report">生成报告</el-dropdown-item>
                        <el-dropdown-item command="close" divided v-if="row.status === 'resolved'">
                          关闭事件
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="eventStats.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </el-card>
        </div>
      </el-main>
    </el-container>

    <!-- 事件详情对话框 -->
    <el-dialog v-model="eventDetailVisible" title="事件详情" width="70%">
      <div v-if="selectedEvent" class="event-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="事件标题" span="2">{{ selectedEvent.title }}</el-descriptions-item>
          <el-descriptions-item label="事件类型">{{ getTypeLabel(selectedEvent.type) }}</el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityTagType(selectedEvent.priority)">{{ getPriorityLabel(selectedEvent.priority) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(selectedEvent.status)">{{ getStatusLabel(selectedEvent.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="上报人">{{ selectedEvent.reporter }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ selectedEvent.phone }}</el-descriptions-item>
          <el-descriptions-item label="事发地点" span="2">{{ selectedEvent.location }}</el-descriptions-item>
          <el-descriptions-item label="上报时间">{{ formatDateTime(selectedEvent.reportTime) }}</el-descriptions-item>
          <el-descriptions-item label="处理人">{{ selectedEvent.assignee || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="事件描述" span="2">{{ selectedEvent.description }}</el-descriptions-item>
        </el-descriptions>

        <!-- 处理记录 -->
        <div class="handling-records" v-if="selectedEvent.records && selectedEvent.records.length > 0">
          <h4>处理记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="record in selectedEvent.records"
              :key="record.id"
              :timestamp="formatDateTime(record.time)"
              placement="top"
            >
              <el-card>
                <h5>{{ record.action }}</h5>
                <p>{{ record.description }}</p>
                <p class="record-handler">处理人: {{ record.handler }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>

    <!-- 事件处理对话框 -->
    <el-dialog v-model="handleEventVisible" title="处理事件" width="50%">
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="处理状态">
          <el-select v-model="handleForm.status" style="width: 100%">
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="需要升级" value="escalated" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理描述">
          <el-input
            v-model="handleForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入处理描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleEventVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandleEvent" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  WarningFilled,
  Bell,
  Download,
  Plus,
  Loading,
  CircleCheckFilled,
  Clock,
  Search,
  View,
  Edit,
  ArrowDown,
  Tools
} from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const events = ref([])
const searchQuery = ref('')
const filterStatus = ref('')
const filterPriority = ref('')
const filterType = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const sortField = ref('')
const sortOrder = ref('')

// 对话框状态
const eventDetailVisible = ref(false)
const handleEventVisible = ref(false)
const selectedEvent = ref(null)
const submitting = ref(false)

// 处理表单
const handleForm = ref({
  status: '',
  description: ''
})

// 实时警报
const activeAlerts = ref([
  {
    id: 1,
    type: 'error',
    title: '紧急事件',
    description: '凤凰村发生山体滑坡，需要立即处理'
  }
])

// WebSocket连接
let socket = null

// 模拟事件数据
const mockEvents = [
  {
    id: 1,
    title: '凤凰村山体滑坡',
    type: 'natural',
    priority: 'critical',
    status: 'processing',
    reporter: '张大爷',
    phone: '13800138001',
    location: '凤凰村北山坡',
    description: '连续暴雨导致山体滑坡，威胁村民安全，需要紧急疏散',
    reportTime: '2025-12-14 08:30:00',
    responseTime: '2025-12-14 08:35:00',
    assignee: '李应急员',
    records: [
      {
        id: 1,
        action: '事件上报',
        description: '村民发现山体滑坡迹象，立即上报',
        handler: '张大爷',
        time: '2025-12-14 08:30:00'
      },
      {
        id: 2,
        action: '应急响应',
        description: '启动应急预案，组织人员疏散',
        handler: '李应急员',
        time: '2025-12-14 08:35:00'
      }
    ]
  },
  {
    id: 2,
    title: '绿水村火灾',
    type: 'safety',
    priority: 'high',
    status: 'resolved',
    reporter: '王大妈',
    phone: '13800138002',
    location: '绿水村东街15号',
    description: '村民厨房发生火灾，火势已控制',
    reportTime: '2025-12-14 06:15:00',
    responseTime: '2025-12-14 06:20:00',
    assignee: '赵消防员',
    records: [
      {
        id: 1,
        action: '火灾报警',
        description: '厨房油锅起火引发火灾',
        handler: '王大妈',
        time: '2025-12-14 06:15:00'
      },
      {
        id: 2,
        action: '火势扑灭',
        description: '使用灭火器成功扑灭火势',
        handler: '赵消防员',
        time: '2025-12-14 06:45:00'
      }
    ]
  },
  {
    id: 3,
    title: '村道路灯故障',
    type: 'safety',
    priority: 'medium',
    status: 'pending',
    reporter: '李师傅',
    phone: '13800138003',
    location: '凤凰村主干道',
    description: '多盏路灯不亮，影响夜间出行安全',
    reportTime: '2025-12-14 14:20:00',
    responseTime: null,
    assignee: null,
    records: [
      {
        id: 1,
        action: '故障上报',
        description: '发现5盏路灯不工作',
        handler: '李师傅',
        time: '2025-12-14 14:20:00'
      }
    ]
  },
  {
    id: 4,
    title: '疑似食物中毒',
    type: 'health',
    priority: 'high',
    status: 'processing',
    reporter: '陈医生',
    phone: '13800138004',
    location: '绿水村卫生室',
    description: '3名村民出现食物中毒症状，已送医治疗',
    reportTime: '2025-12-14 12:30:00',
    responseTime: '2025-12-14 12:35:00',
    assignee: '周医生',
    records: [
      {
        id: 1,
        action: '医疗报告',
        description: '村民集体出现腹痛、呕吐症状',
        handler: '陈医生',
        time: '2025-12-14 12:30:00'
      }
    ]
  },
  {
    id: 5,
    title: '村民纠纷调解',
    type: 'security',
    priority: 'low',
    status: 'resolved',
    reporter: '刘调解员',
    phone: '13800138005',
    location: '凤凰村村委会',
    description: '邻里土地边界纠纷，已成功调解',
    reportTime: '2025-12-14 09:00:00',
    responseTime: '2025-12-14 09:15:00',
    assignee: '刘调解员',
    records: [
      {
        id: 1,
        action: '纠纷调解',
        description: '双方达成和解协议',
        handler: '刘调解员',
        time: '2025-12-14 10:30:00'
      }
    ]
  }
]

// 计算属性
const eventStats = computed(() => {
  const stats = {
    total: events.value.length,
    critical: events.value.filter(event => event.priority === 'critical').length,
    processing: events.value.filter(event => event.status === 'processing').length,
    resolved: events.value.filter(event => event.status === 'resolved').length,
    pending: events.value.filter(event => event.status === 'pending').length,
    today: events.value.filter(event => {
      const eventDate = new Date(event.reportTime)
      const today = new Date()
      return eventDate.toDateString() === today.toDateString()
    }).length
  }
  return stats
})

const filteredEvents = computed(() => {
  let filtered = [...events.value]

  // 搜索过滤
  if (searchQuery.value) {
    filtered = filtered.filter(event =>
      event.title.includes(searchQuery.value) ||
      event.reporter.includes(searchQuery.value)
    )
  }

  // 状态过滤
  if (filterStatus.value) {
    filtered = filtered.filter(event => event.status === filterStatus.value)
  }

  // 优先级过滤
  if (filterPriority.value) {
    filtered = filtered.filter(event => event.priority === filterPriority.value)
  }

  // 类型过滤
  if (filterType.value) {
    filtered = filtered.filter(event => event.type === filterType.value)
  }

  return filtered
})

const hasActiveAlerts = computed(() => {
  return activeAlerts.value.length > 0
})

// 生命周期
onMounted(() => {
  loadEvents()
  initWebSocket()
})

onUnmounted(() => {
  if (socket) {
    socket.disconnect()
  }
})

// 方法
const loadEvents = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    events.value = mockEvents
  } catch (error) {
    ElMessage.error('加载事件列表失败')
    console.error('Load events error:', error)
  } finally {
    loading.value = false
  }
}

const initWebSocket = () => {
  // 模拟WebSocket连接，用于实时接收应急事件
  // 实际项目中应该连接到真实的WebSocket服务器
  console.log('WebSocket连接已建立，可实时接收应急事件')
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleFilter = () => {
  currentPage.value = 1
}

const handleSortChange = ({ prop, order }) => {
  sortField.value = prop
  sortOrder.value = order
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

const viewEvent = (id) => {
  const event = events.value.find(e => e.id === id)
  if (event) {
    selectedEvent.value = event
    eventDetailVisible.value = true
  }
}

const handleEvent = (id) => {
  const event = events.value.find(e => e.id === id)
  if (event) {
    selectedEvent.value = event
    handleForm.value = {
      status: event.status === 'pending' ? 'processing' : 'resolved',
      description: ''
    }
    handleEventVisible.value = true
  }
}

const submitHandleEvent = async () => {
  if (!handleForm.value.description) {
    ElMessage.warning('请输入处理描述')
    return
  }

  submitting.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新事件状态
    const event = events.value.find(e => e.id === selectedEvent.value.id)
    if (event) {
      event.status = handleForm.value.status
      if (!event.records) {
        event.records = []
      }
      event.records.push({
        id: event.records.length + 1,
        action: '事件处理',
        description: handleForm.value.description,
        handler: '当前用户',
        time: new Date().toISOString()
      })
    }

    ElMessage.success('事件处理记录已提交')
    handleEventVisible.value = false
  } catch (error) {
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

const reportEvent = () => {
  ElMessage.info('事件上报功能开发中')
}

const emergencyBroadcast = () => {
  ElMessage.info('应急广播功能开发中')
}

const exportEvents = () => {
  ElMessage.info('导出事件功能开发中')
}

const dismissAlert = (alertId) => {
  const index = activeAlerts.value.findIndex(alert => alert.id === alertId)
  if (index > -1) {
    activeAlerts.value.splice(index, 1)
  }
}

const handleAction = async (command, event) => {
  switch (command) {
    case 'assign':
      ElMessage.info(`指派处理人: ${event.title}`)
      break
    case 'escalate':
      ElMessage.info(`事件升级: ${event.title}`)
      break
    case 'track':
      ElMessage.info(`跟踪进度: ${event.title}`)
      break
    case 'report':
      ElMessage.info(`生成报告: ${event.title}`)
      break
    case 'close':
      try {
        await ElMessageBox.confirm(
          `确定要关闭事件"${event.title}"吗？`,
          '确认关闭',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        const index = events.value.findIndex(e => e.id === event.id)
        if (index > -1) {
          events.value[index].status = 'closed'
        }

        ElMessage.success('事件已关闭')
      } catch (error) {
        // 用户取消
      }
      break
  }
}

// 辅助方法
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '-'
  return new Date(dateTimeString).toLocaleString('zh-CN')
}

const getRowClassName = ({ row }) => {
  if (row.priority === 'critical') {
    return 'critical-row'
  }
  if (row.status === 'pending') {
    return 'pending-row'
  }
  return ''
}

const getTypeTagType = (type) => {
  const typeMap = {
    natural: 'danger',
    safety: 'warning',
    health: 'primary',
    security: 'info',
    other: ''
  }
  return typeMap[type] || ''
}

const getTypeLabel = (type) => {
  const typeMap = {
    natural: '自然灾害',
    safety: '安全事故',
    health: '公共卫生',
    security: '社会治安',
    other: '其他'
  }
  return typeMap[type] || type
}

const getPriorityTagType = (priority) => {
  const priorityMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger'
  }
  return priorityMap[priority] || ''
}

const getPriorityLabel = (priority) => {
  const priorityMap = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '紧急'
  }
  return priorityMap[priority] || priority
}

const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'info',
    processing: 'warning',
    resolved: 'success',
    closed: '',
    escalated: 'danger'
  }
  return statusMap[status] || ''
}

const getStatusLabel = (status) => {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭',
    escalated: '已升级'
  }
  return statusMap[status] || status
}

// 权限检查
const hasPermission = (permission) => {
  // 模拟权限检查
  return true
}
</script>

<style lang="scss" scoped>
.events-list {
  height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
  height: 80px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.title-section {
  .page-title {
    display: flex;
    align-items: center;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px 0;

    .el-icon {
      margin-right: 8px;
      color: #f56c6c;
    }
  }

  .page-description {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.action-section {
  display: flex;
  gap: 12px;
}

.page-main {
  padding: 24px;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;

    .el-icon {
      font-size: 24px;
      color: #fff;
    }
  }

  .stat-content {
    flex: 1;

    .stat-number {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
    }
  }

  &.critical .stat-icon {
    background: linear-gradient(135deg, #f56c6c 0%, #e74c3c 100%);
  }

  &.processing .stat-icon {
    background: linear-gradient(135deg, #e6a23c 0%, #f39c12 100%);
  }

  &.resolved .stat-icon {
    background: linear-gradient(135deg, #67c23a 0%, #27ae60 100%);
  }

  &.today .stat-icon {
    background: linear-gradient(135deg, #409eff 0%, #3498db 100%);
  }
}

.alert-section {
  margin-bottom: 24px;

  .emergency-alert {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.filter-section {
  margin-bottom: 24px;
}

.filter-row {
  .el-col {
    margin-bottom: 16px;
  }
}

.events-table {
  :deep(.critical-row) {
    background-color: #fef0f0;
  }

  :deep(.pending-row) {
    background-color: #f9f9f9;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.event-detail {
  .handling-records {
    margin-top: 24px;

    h4 {
      margin-bottom: 16px;
      color: #303133;
    }

    .record-handler {
      font-size: 12px;
      color: #909399;
      margin-top: 8px;
    }
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
    gap: 12px;
  }

  .title-section {
    .page-title {
      font-size: 20px;
    }
  }

  .action-section {
    width: 100%;

    .el-button {
      width: 100%;
    }
  }
}
</style>