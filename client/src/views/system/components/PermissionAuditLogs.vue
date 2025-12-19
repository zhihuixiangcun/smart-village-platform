<template>
  <div class="permission-audit-logs">
    <!-- 筛选工具栏 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 360px"
          />
        </el-form-item>

        <el-form-item label="用户">
          <el-select
            v-model="filterForm.userId"
            placeholder="选择用户"
            clearable
            style="width: 200px"
            filterable
          >
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="操作类型">
          <el-select
            v-model="filterForm.action"
            placeholder="选择操作"
            clearable
            style="width: 150px"
          >
            <el-option label="读取" value="read" />
            <el-option label="写入" value="write" />
            <el-option label="删除" value="delete" />
            <el-option label="审批" value="approve" />
            <el-option label="创建" value="create" />
          </el-select>
        </el-form-item>

        <el-form-item label="资源">
          <el-input
            v-model="filterForm.resource"
            placeholder="输入资源名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="结果">
          <el-select
            v-model="filterForm.result"
            placeholder="选择结果"
            clearable
            style="width: 120px"
          >
            <el-option label="允许" value="ALLOWED" />
            <el-option label="拒绝" value="DENIED" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button @click="exportLogs">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计概览 -->
    <el-row :gutter="24" class="stats-row">
      <el-col :span="6" v-for="stat in auditStats" :key="stat.key">
        <el-card class="stat-card" :class="stat.type">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
          <div class="stat-trend" v-if="stat.trend">
            <el-icon :class="stat.trend > 0 ? 'trend-up' : 'trend-down'">
              <ArrowUp v-if="stat.trend > 0" />
              <ArrowDown v-else />
            </el-icon>
            <span>{{ Math.abs(stat.trend) }}%</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 审计日志表格 -->
    <el-card class="logs-card">
      <template #header>
        <div class="card-header">
          <h3>权限审计日志</h3>
          <div class="header-actions">
            <el-button-group>
              <el-button
                :type="viewMode === 'table' ? 'primary' : ''"
                @click="viewMode = 'table'"
              >
                <el-icon><List /></el-icon>
                表格视图
              </el-button>
              <el-button
                :type="viewMode === 'timeline' ? 'primary' : ''"
                @click="viewMode = 'timeline'"
              >
                <el-icon><Clock /></el-icon>
                时间线视图
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <!-- 表格视图 -->
      <div v-if="viewMode === 'table'" class="table-view">
        <el-table
          :data="filteredLogs"
          style="width: 100%"
          :default-sort="{ prop: 'timestamp', order: 'descending' }"
          @sort-change="handleSortChange"
        >
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="log-detail">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="用户ID">
                    {{ row.userId }}
                  </el-descriptions-item>
                  <el-descriptions-item label="用户名">
                    {{ row.userName }}
                  </el-descriptions-item>
                  <el-descriptions-item label="IP地址">
                    {{ row.ipAddress }}
                  </el-descriptions-item>
                  <el-descriptions-item label="用户代理">
                    {{ row.userAgent }}
                  </el-descriptions-item>
                  <el-descriptions-item label="设备ID">
                    {{ row.deviceId || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="响应时间">
                    {{ row.duration || '-' }} ms
                  </el-descriptions-item>
                  <el-descriptions-item label="应用策略" span="2">
                    <el-tag
                      v-for="policy in row.appliedPolicies"
                      :key="policy.policyId"
                      size="small"
                      style="margin-right: 8px"
                    >
                      {{ policy.policyName }}
                    </el-tag>
                    <span v-if="!row.appliedPolicies?.length">无</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="上下文" span="2">
                    <pre>{{ formatContext(row.context) }}</pre>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="timestamp" label="时间" width="180" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.timestamp) }}
            </template>
          </el-table-column>

          <el-table-column prop="userName" label="用户" width="120">
            <template #default="{ row }">
              <el-link type="primary" @click="showUserDetail(row.userId)">
                {{ row.userName }}
              </el-link>
            </template>
          </el-table-column>

          <el-table-column prop="resource" label="资源" width="150">
            <template #default="{ row }">
              <el-tag size="small">{{ row.resource }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="action" label="操作" width="100">
            <template #default="{ row }">
              <el-tag :type="getActionTagType(row.action)" size="small">
                {{ getActionLabel(row.action) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="result" label="结果" width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.result === 'ALLOWED' ? 'success' : 'danger'"
                size="small"
              >
                {{ row.result === 'ALLOWED' ? '允许' : '拒绝' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="reason" label="原因" min-width="200">
            <template #default="{ row }">
              <span :class="row.result === 'DENIED' ? 'denied-reason' : ''">
                {{ row.reason || '-' }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="风险等级" width="100">
            <template #default="{ row }">
              <el-tag
                v-if="row.riskLevel"
                :type="getRiskTagType(row.riskLevel)"
                size="small"
              >
                {{ getRiskLabel(row.riskLevel) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="showLogDetail(row)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>

      <!-- 时间线视图 -->
      <div v-else class="timeline-view">
        <el-timeline>
          <el-timeline-item
            v-for="log in filteredLogs"
            :key="log.id"
            :timestamp="formatDateTime(log.timestamp)"
            :type="getTimelineType(log)"
            :color="getTimelineColor(log)"
          >
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="user-name">{{ log.userName }}</span>
                <el-tag
                  :type="log.result === 'ALLOWED' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ log.result === 'ALLOWED' ? '允许' : '拒绝' }}
                </el-tag>
                <el-tag size="small" type="info">{{ log.resource }}</el-tag>
              </div>
              <div class="timeline-body">
                <p>{{ log.action }} - {{ log.reason || '无说明' }}</p>
                <div class="timeline-meta">
                  <span>IP: {{ log.ipAddress }}</span>
                  <span v-if="log.duration">响应: {{ log.duration }}ms</span>
                  <span v-if="log.riskLevel">
                    风险: <el-tag :type="getRiskTagType(log.riskLevel)" size="small">
                      {{ getRiskLabel(log.riskLevel) }}
                    </el-tag>
                  </span>
                </div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>

        <!-- 时间线分页 -->
        <div class="timeline-pagination">
          <el-button
            :disabled="pagination.currentPage <= 1"
            @click="pagination.currentPage--"
          >
            上一页
          </el-button>
          <span class="page-info">
            第 {{ pagination.currentPage }} 页，共 {{ Math.ceil(pagination.total / pagination.pageSize) }} 页
          </span>
          <el-button
            :disabled="pagination.currentPage >= Math.ceil(pagination.total / pagination.pageSize)"
            @click="pagination.currentPage++"
          >
            下一页
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="800px"
      :destroy-on-close="true"
    >
      <div v-if="currentLog" class="log-detail-dialog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="日志ID">
            {{ currentLog.id }}
          </el-descriptions-item>
          <el-descriptions-item label="时间">
            {{ formatDateTime(currentLog.timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="用户">
            {{ currentLog.userName }} ({{ currentLog.userId }})
          </el-descriptions-item>
          <el-descriptions-item label="用户角色">
            <el-tag
              v-for="role in currentLog.userRoles"
              :key="role"
              size="small"
              style="margin-right: 4px"
            >
              {{ role }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="资源">
            {{ currentLog.resource }}
          </el-descriptions-item>
          <el-descriptions-item label="操作">
            {{ currentLog.action }}
          </el-descriptions-item>
          <el-descriptions-item label="结果">
            <el-tag
              :type="currentLog.result === 'ALLOWED' ? 'success' : 'danger'"
            >
              {{ currentLog.result === 'ALLOWED' ? '允许' : '拒绝' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="原因">
            {{ currentLog.reason || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">
            {{ currentLog.ipAddress }}
          </el-descriptions-item>
          <el-descriptions-item label="地理位置">
            {{ currentLog.location || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="设备信息">
            {{ currentLog.deviceInfo || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">
            {{ currentLog.duration || '-' }} ms
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-section">
          <h4>应用策略</h4>
          <el-table
            :data="currentLog.appliedPolicies || []"
            size="small"
            style="width: 100%"
          >
            <el-table-column prop="policyName" label="策略名称" />
            <el-table-column prop="decision" label="决策" width="100">
              <template #default="{ row }">
                <el-tag
                  :type="row.decision === 'ALLOWED' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.decision === 'ALLOWED' ? '允许' : '拒绝' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
          </el-table>
        </div>

        <div class="detail-section">
          <h4>请求上下文</h4>
          <pre class="context-content">{{ formatContext(currentLog.context) }}</pre>
        </div>
      </div>
    </el-dialog>

    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      title="用户权限活动"
      width="900px"
      :destroy-on-close="true"
    >
      <div v-if="currentUser" class="user-activity">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="用户ID">
            {{ currentUser.id }}
          </el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ currentUser.name }}
          </el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag
              v-for="role in currentUser.roles"
              :key="role"
              size="small"
              style="margin-right: 4px"
            >
              {{ role }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="user-activity-stats">
          <h4>活动统计</h4>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-statistic title="总操作次数" :value="currentUser.stats.total" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="成功次数" :value="currentUser.stats.success" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="失败次数" :value="currentUser.stats.failed" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="成功率" :value="currentUser.stats.successRate" suffix="%" />
            </el-col>
          </el-row>
        </div>

        <div class="recent-activities">
          <h4>最近活动</h4>
          <el-table :data="currentUser.recentActivities" size="small">
            <el-table-column prop="timestamp" label="时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.timestamp) }}
              </template>
            </el-table-column>
            <el-table-column prop="resource" label="资源" width="150" />
            <el-table-column prop="action" label="操作" width="100" />
            <el-table-column prop="result" label="结果" width="100">
              <template #default="{ row }">
                <el-tag
                  :type="row.result === 'ALLOWED' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.result === 'ALLOWED' ? '允许' : '拒绝' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search, Refresh, Download,
  List, Clock, ArrowUp, ArrowDown,
  DataAnalysis, Warning, Shield
} from '@element-plus/icons-vite'
import enhancedPermissionService from '@/services/enhancedPermissionService'

// 响应式数据
const viewMode = ref('table')
const detailDialogVisible = ref(false)
const userDialogVisible = ref(false)
const currentLog = ref(null)
const currentUser = ref(null)

// 筛选表单
const filterForm = reactive({
  dateRange: [],
  userId: '',
  action: '',
  resource: '',
  result: ''
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 用户选项
const userOptions = ref([
  { id: '1', name: '张管理员' },
  { id: '2', name: '李主管' },
  { id: '3', name: '王工作人员' },
  { id: '4', name: '赵村民' }
])

// 审计统计数据
const auditStats = ref([
  {
    key: 'total',
    label: '总审计记录',
    value: 15680,
    icon: 'DataAnalysis',
    type: 'primary',
    trend: 12.5
  },
  {
    key: 'allowed',
    label: '允许操作',
    value: 14250,
    icon: 'Shield',
    type: 'success',
    trend: 8.3
  },
  {
    key: 'denied',
    label: '拒绝操作',
    value: 1430,
    icon: 'Warning',
    type: 'danger',
    trend: -5.2
  },
  {
    key: 'highRisk',
    label: '高风险操作',
    value: 125,
    icon: 'Warning',
    type: 'warning',
    trend: 2.1
  }
])

// 审计日志数据
const auditLogs = ref([])

// 计算属性
const filteredLogs = computed(() => {
  let result = auditLogs.value

  // 应用筛选条件
  if (filterForm.dateRange?.length === 2) {
    const [start, end] = filterForm.dateRange
    result = result.filter(log => {
      const logTime = new Date(log.timestamp)
      return logTime >= new Date(start) && logTime <= new Date(end)
    })
  }

  if (filterForm.userId) {
    result = result.filter(log => log.userId === filterForm.userId)
  }

  if (filterForm.action) {
    result = result.filter(log => log.action === filterForm.action)
  }

  if (filterForm.resource) {
    result = result.filter(log =>
      log.resource.toLowerCase().includes(filterForm.resource.toLowerCase())
    )
  }

  if (filterForm.result) {
    result = result.filter(log => log.result === filterForm.result)
  }

  pagination.total = result.length

  // 分页
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return result.slice(start, end)
})

// 方法
const fetchAuditLogs = async () => {
  try {
    // 生成模拟数据
    const mockLogs = []
    const now = new Date()

    for (let i = 0; i < 500; i++) {
      const timestamp = new Date(now - i * 60000) // 每分钟一条
      const isAllowed = Math.random() > 0.1 // 90% 允许
      const hasRisk = Math.random() < 0.05 // 5% 高风险

      mockLogs.push({
        id: `log_${i}`,
        timestamp,
        userId: userOptions.value[Math.floor(Math.random() * userOptions.value.length)].id,
        userName: userOptions.value[Math.floor(Math.random() * userOptions.value.length)].name,
        resource: ['user', 'resident', 'finance', 'system'][Math.floor(Math.random() * 4)],
        action: ['read', 'write', 'delete', 'approve'][Math.floor(Math.random() * 4)],
        result: isAllowed ? 'ALLOWED' : 'DENIED',
        reason: isAllowed ? '权限验证通过' : ['权限不足', '时间限制', '设备未信任', '位置限制'][Math.floor(Math.random() * 4)],
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        deviceId: hasRisk ? null : `device_${Math.floor(Math.random() * 100)}`,
        duration: Math.floor(Math.random() * 100) + 10,
        riskLevel: hasRisk ? ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] : null,
        appliedPolicies: isAllowed ? [] : [
          {
            policyId: '1',
            policyName: '时间访问控制',
            decision: 'DENIED',
            reason: '非工作时间访问'
          }
        ],
        context: {
          location: '村委会办公室',
          device: 'Desktop PC',
          network: 'Internal'
        }
      })
    }

    auditLogs.value = mockLogs
  } catch (error) {
    console.error('获取审计日志失败:', error)
    ElMessage.error('获取审计日志失败')
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
  // 搜索逻辑已通过计算属性实现
}

const resetFilter = () => {
  Object.assign(filterForm, {
    dateRange: [],
    userId: '',
    action: '',
    resource: '',
    result: ''
  })
  pagination.currentPage = 1
}

const exportLogs = () => {
  ElMessage.info('导出功能待实现')
}

const handleSortChange = ({ prop, order }) => {
  // 处理排序
  console.log('排序:', prop, order)
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
}

const getActionTagType = (action) => {
  const types = {
    read: 'info',
    write: 'primary',
    delete: 'danger',
    approve: 'warning',
    create: 'success'
  }
  return types[action] || 'info'
}

const getActionLabel = (action) => {
  const labels = {
    read: '读取',
    write: '写入',
    delete: '删除',
    approve: '审批',
    create: '创建'
  }
  return labels[action] || action
}

const getRiskTagType = (risk) => {
  const types = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return types[risk] || 'info'
}

const getRiskLabel = (risk) => {
  const labels = {
    high: '高风险',
    medium: '中风险',
    low: '低风险'
  }
  return labels[risk] || risk
}

const getTimelineType = (log) => {
  if (log.result === 'DENIED') return 'danger'
  if (log.riskLevel === 'high') return 'warning'
  return 'primary'
}

const getTimelineColor = (log) => {
  if (log.result === 'DENIED') return '#f56c6c'
  if (log.riskLevel === 'high') return '#e6a23c'
  return '#409eff'
}

const formatDateTime = (date) => {
  return new Date(date).toLocaleString()
}

const formatContext = (context) => {
  return context ? JSON.stringify(context, null, 2) : '{}'
}

const showLogDetail = (log) => {
  currentLog.value = {
    ...log,
    userRoles: ['村级管理员', '财务主管']
  }
  detailDialogVisible.value = true
}

const showUserDetail = async (userId) => {
  const user = userOptions.value.find(u => u.id === userId)
  if (user) {
    currentUser.value = {
      id: userId,
      name: user.name,
      roles: ['村级管理员', '财务主管'],
      stats: {
        total: 1250,
        success: 1180,
        failed: 70,
        successRate: 94.4
      },
      recentActivities: auditLogs.value
        .filter(log => log.userId === userId)
        .slice(0, 10)
    }
    userDialogVisible.value = true
  }
}

// 生命周期
onMounted(() => {
  fetchAuditLogs()
})
</script>

<style lang="scss" scoped>
.permission-audit-logs {
  .filter-card {
    margin-bottom: 24px;
  }

  .stats-row {
    margin-bottom: 24px;

    .stat-card {
      position: relative;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-4px);
      }

      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .stat-icon {
          color: #409eff;
        }

        .stat-info {
          .stat-value {
            font-size: 32px;
            font-weight: 600;
            color: #2c3e50;
            line-height: 1;
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 14px;
            color: #606266;
          }
        }
      }

      .stat-trend {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;

        .trend-up {
          color: #67c23a;
        }

        .trend-down {
          color: #f56c6c;
        }
      }
    }
  }

  .logs-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #2c3e50;
      }
    }

    .table-view {
      .log-detail {
        padding: 20px;
        background: #f5f7fa;
        border-radius: 4px;

        pre {
          margin: 0;
          padding: 12px;
          background: white;
          border-radius: 4px;
          font-size: 12px;
          color: #2c3e50;
          overflow-x: auto;
        }

        .denied-reason {
          color: #f56c6c;
          font-weight: 500;
        }
      }

      .pagination-container {
        margin-top: 20px;
        text-align: right;
      }
    }

    .timeline-view {
      .timeline-content {
        .timeline-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;

          .user-name {
            font-weight: 500;
            color: #2c3e50;
          }
        }

        .timeline-body {
          p {
            margin: 0 0 8px 0;
            color: #606266;
          }

          .timeline-meta {
            font-size: 12px;
            color: #909399;

            span {
              margin-right: 16px;
            }
          }
        }
      }

      .timeline-pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
        gap: 16px;

        .page-info {
          color: #606266;
        }
      }
    }
  }

  .log-detail-dialog {
    .detail-section {
      margin-top: 24px;

      h4 {
        margin-bottom: 12px;
        color: #2c3e50;
      }

      .context-content {
        padding: 12px;
        background: #f5f7fa;
        border-radius: 4px;
        font-size: 12px;
        color: #2c3e50;
        max-height: 200px;
        overflow-y: auto;
      }
    }
  }

  .user-activity {
    .user-activity-stats {
      margin: 24px 0;

      h4 {
        margin-bottom: 16px;
        color: #2c3e50;
      }
    }

    .recent-activities {
      h4 {
        margin-bottom: 16px;
        color: #2c3e50;
      }
    }
  }
}
</style>