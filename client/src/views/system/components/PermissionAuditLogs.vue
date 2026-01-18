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
          <el-dropdown @command="handleExport" split-button type="primary">
            <el-icon><Download /></el-icon>
            导出
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="excel">
                  <el-icon><Document /></el-icon>
                  Excel 文件 (.xlsx)
                </el-dropdown-item>
                <el-dropdown-item command="csv">
                  <el-icon><Tickets /></el-icon>
                  CSV 文件 (.csv)
                </el-dropdown-item>
                <el-dropdown-item command="json">
                  <el-icon><Files /></el-icon>
                  JSON 文件 (.json)
                </el-dropdown-item>
                <el-dropdown-item divided command="config">
                  <el-icon><Setting /></el-icon>
                  导出配置
                </el-dropdown-item>
                <el-dropdown-item command="history">
                  <el-icon><Clock /></el-icon>
                  导出历史
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
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
              <el-button :type="viewMode === 'table' ? 'primary' : ''" @click="viewMode = 'table'">
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
              <el-tag :type="row.result === 'ALLOWED' ? 'success' : 'danger'" size="small">
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
              <el-tag v-if="row.riskLevel" :type="getRiskTagType(row.riskLevel)" size="small">
                {{ getRiskLabel(row.riskLevel) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="showLogDetail(row)"> 详情 </el-button>
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
                <el-tag :type="log.result === 'ALLOWED' ? 'success' : 'danger'" size="small">
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
                    风险:
                    <el-tag :type="getRiskTagType(log.riskLevel)" size="small">
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
          <el-button :disabled="pagination.currentPage <= 1" @click="pagination.currentPage--">
            上一页
          </el-button>
          <span class="page-info">
            第 {{ pagination.currentPage }} 页，共
            {{ Math.ceil(pagination.total / pagination.pageSize) }} 页
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
            <el-tag :type="currentLog.result === 'ALLOWED' ? 'success' : 'danger'">
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
          <el-table :data="currentLog.appliedPolicies || []" size="small" style="width: 100%">
            <el-table-column prop="policyName" label="策略名称" />
            <el-table-column prop="decision" label="决策" width="100">
              <template #default="{ row }">
                <el-tag :type="row.decision === 'ALLOWED' ? 'success' : 'danger'" size="small">
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
                <el-tag :type="row.result === 'ALLOWED' ? 'success' : 'danger'" size="small">
                  {{ row.result === 'ALLOWED' ? '允许' : '拒绝' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- 导出配置对话框 -->
    <el-dialog
      v-model="exportConfigDialogVisible"
      title="导出配置"
      width="700px"
      :destroy-on-close="true"
    >
      <el-form :model="exportConfig" label-width="120px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportConfig.format">
            <el-radio label="xlsx">Excel 文件 (.xlsx)</el-radio>
            <el-radio label="csv">CSV 文件 (.csv)</el-radio>
            <el-radio label="json">JSON 文件 (.json)</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="导出字段">
          <el-checkbox-group v-model="exportConfig.fields">
            <el-checkbox label="timestamp">时间戳</el-checkbox>
            <el-checkbox label="userName">操作人</el-checkbox>
            <el-checkbox label="action">操作类型</el-checkbox>
            <el-checkbox label="resource">操作对象</el-checkbox>
            <el-checkbox label="result">操作结果</el-checkbox>
            <el-checkbox label="reason">操作详情</el-checkbox>
            <el-checkbox label="ipAddress">IP地址</el-checkbox>
            <el-checkbox label="location">地理位置</el-checkbox>
            <el-checkbox label="riskLevel">风险等级</el-checkbox>
            <el-checkbox label="duration">响应时间</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="日期范围">
          <el-date-picker
            v-model="exportConfig.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
          <div class="date-range-options">
            <el-button
              v-for="option in dateRangeOptions"
              :key="option.value"
              size="small"
              @click="setDateRange(option.value)"
            >
              {{ option.label }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="导出数量限制">
          <el-radio-group v-model="exportConfig.limitType">
            <el-radio label="all">全部记录</el-radio>
            <el-radio label="custom">自定义</el-radio>
          </el-radio-group>
          <el-input-number
            v-if="exportConfig.limitType === 'custom'"
            v-model="exportConfig.customLimit"
            :min="1"
            :max="100000"
            :step="1000"
            style="margin-left: 10px"
          />
          <div class="limit-info">
            当前筛选结果共 <el-text type="primary">{{ getFilteredCount() }}</el-text> 条记录
          </div>
        </el-form-item>

        <el-form-item label="敏感信息">
          <el-checkbox v-model="exportConfig.includeSensitive">包含敏感信息（IP地址、详细上下文等）</el-checkbox>
        </el-form-item>

        <el-form-item label="分批大小">
          <el-slider v-model="exportConfig.batchSize" :min="100" :max="5000" :step="100" show-stops />
          <div class="batch-info">每次处理 {{ exportConfig.batchSize }} 条记录</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exportConfigDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="startExportWithConfig">开始导出</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 导出进度对话框 -->
    <el-dialog
      v-model="exportProgressDialogVisible"
      title="导出进度"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!exportInProgress"
    >
      <div class="export-progress-content">
        <div class="progress-info">
          <el-icon class="export-icon" :size="40" color="#409eff">
            <Download />
          </el-icon>
          <div class="progress-text">
            <h3>{{ exportInProgress ? '正在导出...' : '导出完成' }}</h3>
            <p>
              已处理 <strong>{{ exportProgress.current }}</strong> / {{ exportProgress.total }} 条记录
            </p>
          </div>
        </div>

        <el-progress
          :percentage="exportProgress.percentage"
          :status="exportProgress.status"
          :stroke-width="20"
          striped
          striped-flow
        />

        <div class="progress-details">
          <div class="detail-item">
            <span class="label">导出格式:</span>
            <span class="value">{{ exportProgress.format.toUpperCase() }}</span>
          </div>
          <div class="detail-item">
            <span class="label">预估时间:</span>
            <span class="value">{{ exportProgress.estimatedTime }}</span>
          </div>
          <div class="detail-item">
            <span class="label">文件名:</span>
            <span class="value">{{ exportProgress.fileName }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="!exportInProgress" @click="exportProgressDialogVisible = false">
            关闭
          </el-button>
          <el-button v-if="exportInProgress" type="danger" @click="cancelExport">
            取消导出
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 导出历史对话框 -->
    <el-dialog
      v-model="exportHistoryDialogVisible"
      title="导出历史"
      width="900px"
      :destroy-on-close="true"
    >
      <el-table :data="exportHistory" style="width: 100%">
        <el-table-column prop="fileName" label="文件名" min-width="200" />
        <el-table-column prop="format" label="格式" width="80" />
        <el-table-column prop="recordCount" label="记录数" width="100" align="center" />
        <el-table-column prop="exportTime" label="导出时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.exportTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="fileSize" label="文件大小" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="downloadExportedFile(row)" :disabled="row.status !== 'success'">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-button size="small" type="danger" @click="deleteExportHistory(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
 import {
   Search,
   Refresh,
   Download,
   List,
   Clock,
   ArrowUp,
   ArrowDown,
   DataAnalysis,
   Warning,
   Lock,
   Document,
   Tickets,
   Files,
   Setting,
   Delete,
 } from '@element-plus/icons-vue';
 import * as XLSX from 'xlsx';
import enhancedPermissionService from '@/services/enhancedPermissionService';

// 响应式数据
const viewMode = ref('table');
const detailDialogVisible = ref(false);
const userDialogVisible = ref(false);
const currentLog = ref(null);
const currentUser = ref(null);

const exportConfigDialogVisible = ref(false);
const exportProgressDialogVisible = ref(false);
const exportHistoryDialogVisible = ref(false);

const exportConfig = ref({
  format: 'xlsx',
  fields: ['timestamp', 'userName', 'action', 'resource', 'result', 'reason'],
  dateRange: [],
  limitType: 'all',
  customLimit: 10000,
  includeSensitive: false,
  batchSize: 1000,
});

const exportProgress = ref({
  current: 0,
  total: 0,
  percentage: 0,
  status: '',
  format: '',
  estimatedTime: '',
  fileName: '',
});

const exportInProgress = ref(false);
let exportAbortController = null;
const exportHistory = ref([]);

const dateRangeOptions = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '最近7天', value: 'week' },
  { label: '最近30天', value: 'month' },
  { label: '全部', value: 'all' },
];

// 筛选表单
const filterForm = reactive({
  dateRange: [],
  userId: '',
  action: '',
  resource: '',
  result: '',
});

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0,
});

// 用户选项
const userOptions = ref([
  { id: '1', name: '张管理员' },
  { id: '2', name: '李主管' },
  { id: '3', name: '王工作人员' },
  { id: '4', name: '赵村民' },
]);

// 审计统计数据
const auditStats = ref([
  {
    key: 'total',
    label: '总审计记录',
    value: 15680,
    icon: 'DataAnalysis',
    type: 'primary',
    trend: 12.5,
  },
  {
    key: 'allowed',
    label: '允许操作',
    value: 14250,
    icon: 'Lock',
    type: 'success',
    trend: 8.3,
  },
  {
    key: 'denied',
    label: '拒绝操作',
    value: 1430,
    icon: 'Warning',
    type: 'danger',
    trend: -5.2,
  },
  {
    key: 'highRisk',
    label: '高风险操作',
    value: 125,
    icon: 'Warning',
    type: 'warning',
    trend: 2.1,
  },
]);

// 审计日志数据
const auditLogs = ref([]);

// 计算属性
const filteredLogs = computed(() => {
  let result = auditLogs.value;

  // 应用筛选条件
  if (filterForm.dateRange?.length === 2) {
    const [start, end] = filterForm.dateRange;
    result = result.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= new Date(start) && logTime <= new Date(end);
    });
  }

  if (filterForm.userId) {
    result = result.filter(log => log.userId === filterForm.userId);
  }

  if (filterForm.action) {
    result = result.filter(log => log.action === filterForm.action);
  }

  if (filterForm.resource) {
    result = result.filter(log =>
      log.resource.toLowerCase().includes(filterForm.resource.toLowerCase())
    );
  }

  if (filterForm.result) {
    result = result.filter(log => log.result === filterForm.result);
  }

  pagination.total = result.length;

  // 分页
  const start = (pagination.currentPage - 1) * pagination.pageSize;
  const end = start + pagination.pageSize;
  return result.slice(start, end);
});

// 方法
const fetchAuditLogs = async () => {
  try {
    // 生成模拟数据
    const mockLogs = [];
    const now = new Date();

    for (let i = 0; i < 500; i++) {
      const timestamp = new Date(now - i * 60000); // 每分钟一条
      const isAllowed = Math.random() > 0.1; // 90% 允许
      const hasRisk = Math.random() < 0.05; // 5% 高风险

      mockLogs.push({
        id: `log_${i}`,
        timestamp,
        userId: userOptions.value[Math.floor(Math.random() * userOptions.value.length)].id,
        userName: userOptions.value[Math.floor(Math.random() * userOptions.value.length)].name,
        resource: ['user', 'resident', 'finance', 'system'][Math.floor(Math.random() * 4)],
        action: ['read', 'write', 'delete', 'approve'][Math.floor(Math.random() * 4)],
        result: isAllowed ? 'ALLOWED' : 'DENIED',
        reason: isAllowed
          ? '权限验证通过'
          : ['权限不足', '时间限制', '设备未信任', '位置限制'][Math.floor(Math.random() * 4)],
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        deviceId: hasRisk ? null : `device_${Math.floor(Math.random() * 100)}`,
        duration: Math.floor(Math.random() * 100) + 10,
        riskLevel: hasRisk ? ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] : null,
        appliedPolicies: isAllowed
          ? []
          : [
              {
                policyId: '1',
                policyName: '时间访问控制',
                decision: 'DENIED',
                reason: '非工作时间访问',
              },
            ],
        context: {
          location: '村委会办公室',
          device: 'Desktop PC',
          network: 'Internal',
        },
      });
    }

    auditLogs.value = mockLogs;
  } catch (error) {
    console.error('获取审计日志失败:', error);
    ElMessage.error('获取审计日志失败');
  }
};

const handleSearch = () => {
  pagination.currentPage = 1;
  // 搜索逻辑已通过计算属性实现
};

const resetFilter = () => {
  Object.assign(filterForm, {
    dateRange: [],
    userId: '',
    action: '',
    resource: '',
    result: '',
  });
  pagination.currentPage = 1;
};

const exportLogs = () => {
  exportConfigDialogVisible.value = true;
  exportConfig.value.dateRange = filterForm.dateRange || [];
};

const handleExport = command => {
  switch (command) {
    case 'excel':
      exportConfig.value.format = 'xlsx';
      exportConfigDialogVisible.value = true;
      break;
    case 'csv':
      exportConfig.value.format = 'csv';
      exportConfigDialogVisible.value = true;
      break;
    case 'json':
      exportConfig.value.format = 'json';
      exportConfigDialogVisible.value = true;
      break;
    case 'config':
      exportConfigDialogVisible.value = true;
      break;
    case 'history':
      exportHistoryDialogVisible.value = true;
      loadExportHistory();
      break;
  }
};

const setDateRange = type => {
  const now = new Date();
  let start, end;

  switch (type) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      end = now;
      break;
    case 'month':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      end = now;
      break;
    case 'all':
    default:
      exportConfig.value.dateRange = [];
      return;
  }

  exportConfig.value.dateRange = [
    start.toISOString().slice(0, 19).replace('T', ' '),
    end.toISOString().slice(0, 19).replace('T', ' '),
  ];
};

const getFilteredLogs = () => {
  let result = auditLogs.value;

  if (exportConfig.value.dateRange?.length === 2) {
    const [start, end] = exportConfig.value.dateRange;
    result = result.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= new Date(start) && logTime <= new Date(end);
    });
  }

  if (filterForm.userId) {
    result = result.filter(log => log.userId === filterForm.userId);
  }

  if (filterForm.action) {
    result = result.filter(log => log.action === filterForm.action);
  }

  if (filterForm.resource) {
    result = result.filter(log =>
      log.resource.toLowerCase().includes(filterForm.resource.toLowerCase())
    );
  }

  if (filterForm.result) {
    result = result.filter(log => log.result === filterForm.result);
  }

  return result;
};

const getFilteredCount = () => {
  return getFilteredLogs().length;
};

const transformLogForExport = log => {
  const fields = exportConfig.value.fields;
  const result = {};

  if (fields.includes('timestamp')) {
    result['时间戳'] = formatDateTime(log.timestamp);
  }
  if (fields.includes('userName')) {
    result['操作人'] = log.userName;
  }
  if (fields.includes('action')) {
    result['操作类型'] = getActionLabel(log.action);
  }
  if (fields.includes('resource')) {
    result['操作对象'] = log.resource;
  }
  if (fields.includes('result')) {
    result['操作结果'] = log.result === 'ALLOWED' ? '成功' : '失败';
  }
  if (fields.includes('reason')) {
    result['操作详情'] = log.reason || '-';
  }
  if (fields.includes('ipAddress') && exportConfig.value.includeSensitive) {
    result['IP地址'] = log.ipAddress || '-';
  }
  if (fields.includes('location') && exportConfig.value.includeSensitive) {
    result['地理位置'] = log.context?.location || '-';
  }
  if (fields.includes('riskLevel')) {
    result['风险等级'] = getRiskLabel(log.riskLevel) || '-';
  }
  if (fields.includes('duration')) {
    result['响应时间'] = log.duration ? `${log.duration}ms` : '-';
  }

  return result;
};

const startExportWithConfig = async () => {
  const filteredLogs = getFilteredLogs();
  const totalLogs =
    exportConfig.value.limitType === 'custom'
      ? Math.min(filteredLogs.length, exportConfig.value.customLimit)
      : filteredLogs.length;

  if (totalLogs === 0) {
    ElMessage.warning('没有可导出的数据');
    return;
  }

  exportConfigDialogVisible.value = false;
  exportProgressDialogVisible.value = true;
  exportInProgress.value = true;
  exportAbortController = new AbortController();

  exportProgress.value = {
    current: 0,
    total: totalLogs,
    percentage: 0,
    status: '',
    format: exportConfig.value.format,
    estimatedTime: estimateExportTime(totalLogs),
    fileName: generateFileName(),
  };

  try {
    const batchSize = exportConfig.value.batchSize;
    const allData = [];

    for (let i = 0; i < totalLogs; i += batchSize) {
      if (exportAbortController.signal.aborted) {
        throw new Error('Export cancelled');
      }

      const batch = filteredLogs.slice(i, i + batchSize);
      const transformedBatch = batch.map(transformLogForExport);
      allData.push(...transformedBatch);

      exportProgress.value.current = Math.min(i + batchSize, totalLogs);
      exportProgress.value.percentage = Math.floor((exportProgress.value.current / totalLogs) * 100);

      await new Promise(resolve => setTimeout(resolve, 0));
    }

    await exportData(allData, exportConfig.value.format, exportProgress.value.fileName);

    exportProgress.value.status = 'success';
    exportInProgress.value = false;

    addToExportHistory({
      fileName: exportProgress.value.fileName,
      format: exportConfig.value.format,
      recordCount: totalLogs,
      exportTime: new Date(),
      fileSize: estimateFileSize(totalLogs, exportConfig.value.format),
      status: 'success',
      data: allData,
    });

    ElMessage.success(`成功导出 ${totalLogs} 条记录`);
  } catch (error) {
    if (error.message !== 'Export cancelled') {
      console.error('导出失败:', error);
      exportProgress.value.status = 'exception';
      ElMessage.error('导出失败: ' + error.message);
    } else {
      exportProgress.value.status = 'warning';
      ElMessage.warning('导出已取消');
    }
    exportInProgress.value = false;
  }
};

const estimateExportTime = recordCount => {
  const msPerRecord = exportConfig.value.format === 'json' ? 0.1 : 0.5;
  const totalMs = recordCount * msPerRecord;
  const seconds = Math.ceil(totalMs / 1000);
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} 分钟`;
};

const generateFileName = () => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  return `审计日志导出_${timestamp}.${exportConfig.value.format}`;
};

const estimateFileSize = (recordCount, format) => {
  const bytesPerRecord = format === 'json' ? 500 : 300;
  const totalBytes = recordCount * bytesPerRecord;
  if (totalBytes < 1024) return `${totalBytes} B`;
  if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(2)} KB`;
  return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
};

const exportData = async (data, format, fileName) => {
  switch (format) {
    case 'xlsx':
      await exportToExcel(data, fileName);
      break;
    case 'csv':
      await exportToCSV(data, fileName);
      break;
    case 'json':
      await exportToJSON(data, fileName);
      break;
  }
};

const exportToExcel = async (data, fileName) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '审计日志');

  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxLength = Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, fileName);
};

const exportToCSV = async (data, fileName) => {
  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map(row =>
    Object.values(row)
      .map(val => {
        const strVal = String(val || '');
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      })
      .join(',')
  );

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, fileName);
};

const exportToJSON = async (data, fileName) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, fileName);
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const cancelExport = () => {
  if (exportAbortController) {
    exportAbortController.abort();
  }
};

const loadExportHistory = () => {
  const saved = localStorage.getItem('auditExportHistory');
  if (saved) {
    exportHistory.value = JSON.parse(saved);
  }
};

const addToExportHistory = item => {
  exportHistory.value.unshift(item);
  if (exportHistory.value.length > 20) {
    exportHistory.value = exportHistory.value.slice(0, 20);
  }
  localStorage.setItem('auditExportHistory', JSON.stringify(exportHistory.value.map(h => ({ ...h, data: undefined }))));
};

const downloadExportedFile = item => {
  if (item.data) {
    exportData(item.data, item.format, item.fileName);
  } else {
    ElMessage.warning('该文件已过期，无法重新下载');
  }
};

const deleteExportHistory = item => {
  const index = exportHistory.value.indexOf(item);
  if (index > -1) {
    exportHistory.value.splice(index, 1);
    localStorage.setItem('auditExportHistory', JSON.stringify(exportHistory.value));
    ElMessage.success('已删除导出记录');
  }
};

const handleSortChange = ({ prop, order }) => {
  // 处理排序
  console.log('排序:', prop, order);
};

const handleSizeChange = size => {
  pagination.pageSize = size;
  pagination.currentPage = 1;
};

const handleCurrentChange = page => {
  pagination.currentPage = page;
};

const getActionTagType = action => {
  const types = {
    read: 'info',
    write: 'primary',
    delete: 'danger',
    approve: 'warning',
    create: 'success',
  };
  return types[action] || 'info';
};

const getActionLabel = action => {
  const labels = {
    read: '读取',
    write: '写入',
    delete: '删除',
    approve: '审批',
    create: '创建',
  };
  return labels[action] || action;
};

const getRiskTagType = risk => {
  const types = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  };
  return types[risk] || 'info';
};

const getRiskLabel = risk => {
  const labels = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  };
  return labels[risk] || risk;
};

const getTimelineType = log => {
  if (log.result === 'DENIED') return 'danger';
  if (log.riskLevel === 'high') return 'warning';
  return 'primary';
};

const getTimelineColor = log => {
  if (log.result === 'DENIED') return '#f56c6c';
  if (log.riskLevel === 'high') return '#e6a23c';
  return '#409eff';
};

const formatDateTime = date => {
  return new Date(date).toLocaleString();
};

const formatContext = context => {
  return context ? JSON.stringify(context, null, 2) : '{}';
};

const showLogDetail = log => {
  currentLog.value = {
    ...log,
    userRoles: ['村级管理员', '财务主管'],
  };
  detailDialogVisible.value = true;
};

const showUserDetail = async userId => {
  const user = userOptions.value.find(u => u.id === userId);
  if (user) {
    currentUser.value = {
      id: userId,
      name: user.name,
      roles: ['村级管理员', '财务主管'],
      stats: {
        total: 1250,
        success: 1180,
        failed: 70,
        successRate: 94.4,
      },
      recentActivities: auditLogs.value.filter(log => log.userId === userId).slice(0, 10),
    };
    userDialogVisible.value = true;
  }
};

// 生命周期
onMounted(() => {
  fetchAuditLogs();
});
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

  .export-progress-content {
    .progress-info {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;

      .export-icon {
        flex-shrink: 0;
      }

      .progress-text {
        flex: 1;

        h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #2c3e50;
        }

        p {
          margin: 0;
          font-size: 14px;
          color: #606266;

          strong {
            color: #409eff;
            font-size: 16px;
          }
        }
      }
    }

    .progress-details {
      margin-top: 24px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 4px;

      .detail-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e4e7ed;

        &:last-child {
          border-bottom: none;
        }

        .label {
          color: #909399;
          font-size: 14px;
        }

        .value {
          color: #2c3e50;
          font-weight: 500;
          font-size: 14px;
        }
      }
    }
  }

  .date-range-options {
    margin-top: 12px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .limit-info,
  .batch-info {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
  }
}
</style>
