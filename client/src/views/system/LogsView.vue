<template>
  <div class="logs-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">操作日志</h1>
        <p class="page-description">查看系统操作日志和审计记录</p>
      </div>
      <div class="header-actions">
        <el-button @click="exportLogs">
          <el-icon><Download /></el-icon>
          导出日志
        </el-button>
        <el-button @click="refreshLogs">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 日志统计 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon error">
              <el-icon><WarningFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.error }}</div>
              <div class="stat-label">错误日志</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon warning">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.warning }}</div>
              <div class="stat-label">警告日志</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon info">
              <el-icon><InfoFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.info }}</div>
              <div class="stat-label">信息日志</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon success">
              <el-icon><SuccessFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">总计</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索过滤器 -->
    <el-card class="filter-card">
      <el-row :gutter="20">
        <el-col :span="4">
          <el-select v-model="searchForm.level" placeholder="日志级别" clearable @change="handleSearch">
            <el-option label="错误" value="error" />
            <el-option label="警告" value="warning" />
            <el-option label="信息" value="info" />
            <el-option label="调试" value="debug" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.module" placeholder="模块" clearable @change="handleSearch">
            <el-option label="用户管理" value="user" />
            <el-option label="村民管理" value="resident" />
            <el-option label="村务管理" value="village" />
            <el-option label="系统管理" value="system" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.action" placeholder="操作类型" clearable @change="handleSearch">
            <el-option label="登录" value="login" />
            <el-option label="登出" value="logout" />
            <el-option label="创建" value="create" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleSearch"
          />
        </el-col>
        <el-col :span="4">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索用户或内容..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="2">
          <el-button @click="resetSearch">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 日志列表 -->
    <el-card class="table-card">
      <el-table
        :data="logs"
        v-loading="loading"
        style="width: 100%"
        @row-click="showLogDetail"
        row-class-name="log-row"
      >
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)" size="small">
              {{ getLevelLabel(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="user" label="操作用户" width="120" />
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="action" label="操作" width="100" />
        <el-table-column prop="message" label="消息" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP地址" width="120" />
        <el-table-column prop="userAgent" label="用户代理" width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click.stop="showLogDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="日志详情"
      width="800px"
    >
      <el-descriptions v-if="selectedLog" :column="2">
        <el-descriptions-item label="日志级别">
          <el-tag :type="getLevelType(selectedLog.level)">
            {{ getLevelLabel(selectedLog.level) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="时间">
          {{ formatDate(selectedLog.timestamp) }}
        </el-descriptions-item>
        <el-descriptions-item label="操作用户">{{ selectedLog.user }}</el-descriptions-item>
        <el-descriptions-item label="模块">{{ selectedLog.module }}</el-descriptions-item>
        <el-descriptions-item label="操作类型">{{ selectedLog.action }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ selectedLog.ip }}</el-descriptions-item>
        <el-descriptions-item label="会话ID">{{ selectedLog.sessionId }}</el-descriptions-item>
        <el-descriptions-item label="请求ID">{{ selectedLog.requestId }}</el-descriptions-item>
        <el-descriptions-item label="消息" :span="2">
          {{ selectedLog.message }}
        </el-descriptions-item>
        <el-descriptions-item label="用户代理" :span="2">
          {{ selectedLog.userAgent }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="selectedLog?.details" class="log-details">
        <h4>详细信息</h4>
        <el-input
          :model-value="JSON.stringify(selectedLog.details, null, 2)"
          type="textarea"
          :rows="10"
          readonly
        />
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDetailDialog = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Download, Refresh, Search, WarningFilled, Warning,
  InfoFilled, SuccessFilled
} from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const showDetailDialog = ref(false)
const selectedLog = ref(null)

const stats = ref({
  error: 12,
  warning: 45,
  info: 234,
  total: 1234
})

const logs = ref([
  {
    id: 1,
    level: 'info',
    timestamp: new Date(),
    user: 'admin',
    module: 'user',
    action: 'login',
    message: '用户登录成功',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'sess_123456',
    requestId: 'req_789012',
    details: {
      loginTime: new Date(),
      loginMethod: 'password',
      rememberMe: false
    }
  },
  {
    id: 2,
    level: 'warning',
    timestamp: new Date(Date.now() - 60000),
    user: 'village01',
    module: 'resident',
    action: 'update',
    message: '尝试修改其他村民信息被拒绝',
    ip: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'sess_123457',
    requestId: 'req_789013',
    details: {
      targetResidentId: 'resident_456',
      reason: 'No permission to modify other village residents'
    }
  },
  {
    id: 3,
    level: 'error',
    timestamp: new Date(Date.now() - 120000),
    user: 'system',
    module: 'system',
    action: 'backup',
    message: '数据库备份失败',
    ip: '127.0.0.1',
    userAgent: 'System/1.0',
    sessionId: 'sess_system',
    requestId: 'req_789014',
    details: {
      error: 'Database connection timeout',
      backupType: 'auto',
      retryCount: 3
    }
  }
])

const searchForm = reactive({
  level: '',
  module: '',
  action: '',
  dateRange: null,
  keyword: ''
})

const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 工具函数
const getLevelType = (level) => {
  const types = {
    error: 'danger',
    warning: 'warning',
    info: 'info',
    debug: 'info'
  }
  return types[level] || 'info'
}

const getLevelLabel = (level) => {
  const labels = {
    error: '错误',
    warning: '警告',
    info: '信息',
    debug: '调试'
  }
  return labels[level] || level
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 事件处理
const handleSearch = () => {
  console.log('搜索日志:', searchForm)
  loadLogs()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    level: '',
    module: '',
    action: '',
    dateRange: null,
    keyword: ''
  })
  handleSearch()
}

const showLogDetail = (log) => {
  selectedLog.value = log
  showDetailDialog.value = true
}

const exportLogs = () => {
  console.log('导出日志')
  ElMessage.info('正在导出日志，请稍候...')
  // TODO: 实现日志导出功能
}

const refreshLogs = () => {
  loadLogs()
}

const handleSizeChange = (size) => {
  pagination.size = size
  loadLogs()
}

const handlePageChange = (page) => {
  pagination.page = page
  loadLogs()
}

const loadLogs = () => {
  loading.value = true
  // TODO: 从API加载日志数据
  setTimeout(() => {
    pagination.total = 1234
    loading.value = false
  }, 500)
}

onMounted(() => {
  loadLogs()
})
</script>

<style lang="scss" scoped>
.logs-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.page-description {
  color: #666;
  margin: 0;
}

.stats-row {
  margin-bottom: 20px;

  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;

      &.error {
        background: rgba(245, 108, 108, 0.1);
        color: #f56c6c;
      }

      &.warning {
        background: rgba(230, 162, 60, 0.1);
        color: #e6a23c;
      }

      &.info {
        background: rgba(64, 158, 255, 0.1);
        color: #409eff;
      }

      &.success {
        background: rgba(103, 194, 58, 0.1);
        color: #67c23a;
      }
    }

    .stat-info {
      flex: 1;
    }

    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #303133;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
    }
  }
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }

  :deep(.log-row) {
    cursor: pointer;

    &:hover {
      background-color: #f5f7fa;
    }
  }
}

.log-details {
  margin-top: 20px;

  h4 {
    margin-bottom: 10px;
    color: #303133;
  }
}
</style>