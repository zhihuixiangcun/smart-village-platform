<template>
  <div class="government-integration">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>政务系统对接</h1>
      <p>连接省级政务平台，实现数据同步和业务协同</p>
    </div>

    <!-- 连接状态监控 -->
    <div class="connection-status">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-card title="省级政务平台">
            <template #title>
              <div class="card-title">
                <el-icon><Connection /></el-icon>
                <span>省级政务平台</span>
              </div>
            </template>
            <div
              class="status-indicator"
              :class="connectionStatus.provincial.connected ? 'connected' : 'disconnected'"
            >
              <div class="status-dot"></div>
              <span class="status-text">{{
                connectionStatus.provincial.connected ? '已连接' : '连接失败'
              }}</span>
            </div>
            <div class="status-info">
              <p>最后检查: {{ formatTime(connectionStatus.provincial.lastCheck) }}</p>
              <p v-if="connectionStatus.provincial.error" class="error-text">
                错误: {{ connectionStatus.provincial.error }}
              </p>
            </div>
            <el-button type="primary" size="small" @click="checkConnectionStatus">
              重新检查
            </el-button>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card title="市级政务平台">
            <template #title>
              <div class="card-title">
                <el-icon><Connection /></el-icon>
                <span>市级政务平台</span>
              </div>
            </template>
            <div
              class="status-indicator"
              :class="connectionStatus.municipal.connected ? 'connected' : 'disconnected'"
            >
              <div class="status-dot"></div>
              <span class="status-text">{{
                connectionStatus.municipal.connected ? '已连接' : '连接失败'
              }}</span>
            </div>
            <div class="status-info">
              <p>最后检查: {{ formatTime(connectionStatus.municipal.lastCheck) }}</p>
              <p v-if="connectionStatus.municipal.error" class="error-text">
                错误: {{ connectionStatus.municipal.error }}
              </p>
            </div>
            <el-button type="primary" size="small" @click="checkConnectionStatus">
              重新检查
            </el-button>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 功能选项卡 -->
    <el-tabs v-model="activeTab" class="function-tabs">
      <!-- 数据同步 -->
      <el-tab-pane label="数据同步" name="sync">
        <div class="sync-section">
          <!-- 同步状态概览 -->
          <div class="sync-overview">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-statistic
                  title="最后同步时间"
                  :value="formatDateTime(syncStatus.lastSyncTime)"
                />
              </el-col>
              <el-col :span="6">
                <el-statistic title="处理记录数" :value="syncStatus.processedRecords" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="失败记录数" :value="syncStatus.failedRecords" />
              </el-col>
              <el-col :span="6">
                <el-statistic
                  title="下次同步时间"
                  :value="formatDateTime(syncStatus.nextSyncTime)"
                />
              </el-col>
            </el-row>
          </div>

          <!-- 同步操作 -->
          <div class="sync-operations">
            <h3>同步操作</h3>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-card>
                  <h4>户籍数据同步</h4>
                  <p>将本地户籍数据同步到省级政务平台</p>
                  <el-button
                    type="primary"
                    :loading="syncStatus.inProgress"
                    @click="openSyncDialog('household')"
                  >
                    立即同步
                  </el-button>
                </el-card>
              </el-col>
              <el-col :span="8">
                <el-card>
                  <h4>社保数据同步</h4>
                  <p>从政务平台同步最新的社保信息</p>
                  <el-button
                    type="success"
                    :loading="syncStatus.inProgress"
                    @click="openSyncDialog('socialSecurity')"
                  >
                    立即同步
                  </el-button>
                </el-card>
              </el-col>
              <el-col :span="8">
                <el-card>
                  <h4>批量同步</h4>
                  <p>同步所有村庄的政务数据</p>
                  <el-button
                    type="warning"
                    :loading="syncStatus.inProgress"
                    @click="openBatchSyncDialog"
                  >
                    批量同步
                  </el-button>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- 自动同步设置 -->
          <div class="auto-sync-settings">
            <h3>自动同步设置</h3>
            <el-form :model="autoSyncSettings" label-width="120px">
              <el-form-item label="启用自动同步">
                <el-switch v-model="autoSyncSettings.enabled" @change="toggleAutoSync" />
              </el-form-item>
              <el-form-item label="同步间隔">
                <el-select
                  v-model="autoSyncSettings.interval"
                  :disabled="!autoSyncSettings.enabled"
                >
                  <el-option label="每小时" value="1h" />
                  <el-option label="每6小时" value="6h" />
                  <el-option label="每12小时" value="12h" />
                  <el-option label="每天" value="24h" />
                </el-select>
              </el-form-item>
              <el-form-item label="同步范围">
                <el-checkbox-group
                  v-model="autoSyncSettings.scope"
                  :disabled="!autoSyncSettings.enabled"
                >
                  <el-checkbox label="household">户籍数据</el-checkbox>
                  <el-checkbox label="socialSecurity">社保数据</el-checkbox>
                  <el-checkbox label="statistics">统计数据</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
          </div>

          <!-- 同步历史 -->
          <div class="sync-history">
            <h3>同步历史</h3>
            <el-table :data="syncHistory" style="width: 100%">
              <el-table-column prop="syncType" label="同步类型" width="120">
                <template #default="scope">
                  <el-tag :type="getSyncTypeTag(scope.row.syncType)">
                    {{ getSyncTypeName(scope.row.syncType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="villageId.name" label="村庄" width="150" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusTag(scope.row.status)">
                    {{ getStatusName(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="进度" width="200">
                <template #default="scope">
                  <el-progress
                    :percentage="getSyncProgress(scope.row)"
                    :status="scope.row.status === 'failed' ? 'exception' : ''"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="totalRecords" label="总记录数" width="100" />
              <el-table-column prop="processedRecords" label="已处理" width="100" />
              <el-table-column prop="duration" label="耗时" width="100">
                <template #default="scope">
                  {{ formatDuration(scope.row.duration) }}
                </template>
              </el-table-column>
              <el-table-column prop="syncTime" label="同步时间" width="180">
                <template #default="scope">
                  {{ formatDateTime(scope.row.syncTime) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="scope">
                  <el-button type="text" size="small" @click="viewSyncDetail(scope.row)">
                    查看详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-model:current-page="historyPage.current"
              v-model:page-size="historyPage.size"
              :total="historyPage.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadSyncHistory"
              @current-change="loadSyncHistory"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 统计报表 -->
      <el-tab-pane label="统计报表" name="reports">
        <div class="reports-section">
          <!-- 报表上传 -->
          <div class="report-upload">
            <h3>上传统计报表</h3>
            <el-form :model="reportForm" label-width="120px">
              <el-form-item label="报表类型">
                <el-select v-model="reportForm.reportType" placeholder="选择报表类型">
                  <el-option
                    v-for="type in reportTypes"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="报表日期">
                <el-date-picker
                  v-model="reportForm.reportDate"
                  type="date"
                  placeholder="选择报表日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
              <el-form-item label="村庄">
                <el-select v-model="reportForm.villageId" placeholder="选择村庄">
                  <el-option
                    v-for="village in villages"
                    :key="village._id"
                    :label="village.name"
                    :value="village._id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="generateReport" :loading="generatingReport">
                  生成报表
                </el-button>
                <el-button
                  @click="previewReport"
                  :disabled="!reportForm.reportType || !reportForm.villageId"
                >
                  预览报表
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 报表预览 -->
          <div v-if="reportPreview" class="report-preview">
            <h3>报表预览</h3>
            <el-card>
              <div class="preview-content">
                <div class="preview-header">
                  <h4>
                    {{ getReportTypeName(reportForm.reportType) }} - {{ reportForm.villageName }}
                  </h4>
                  <p>报表日期: {{ reportForm.reportDate }}</p>
                </div>
                <div class="preview-data">
                  <el-descriptions :column="2" border>
                    <el-descriptions-item
                      v-for="(value, key) in reportPreview"
                      :key="key"
                      :label="getReportFieldLabel(key)"
                    >
                      {{ formatReportValue(value) }}
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <div class="preview-actions">
                <el-button type="primary" @click="uploadReport" :loading="uploading">
                  上传报表
                </el-button>
                <el-button @click="exportReport"> 导出Excel </el-button>
              </div>
            </el-card>
          </div>

          <!-- 上传历史 -->
          <div class="upload-history">
            <h3>上传历史</h3>
            <el-table :data="uploadHistory" style="width: 100%">
              <el-table-column prop="reportType" label="报表类型" width="120">
                <template #default="scope">
                  <el-tag>{{ getReportTypeName(scope.row.reportType) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="villageId.name" label="村庄" width="150" />
              <el-table-column prop="reportDate" label="报表日期" width="120" />
              <el-table-column prop="platform" label="平台" width="100" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusTag(scope.row.status)">
                    {{ getStatusName(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="fileInfo.fileSize" label="文件大小" width="100">
                <template #default="scope">
                  {{ formatFileSize(scope.row.fileInfo?.fileSize) }}
                </template>
              </el-table-column>
              <el-table-column prop="uploadTime" label="上传时间" width="180">
                <template #default="scope">
                  {{ formatDateTime(scope.row.uploadTime) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button type="text" size="small" @click="downloadReport(scope.row)">
                    下载
                  </el-button>
                  <el-button type="text" size="small" @click="viewUploadDetail(scope.row)">
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <!-- 便民服务 -->
      <el-tab-pane label="便民服务" name="services">
        <div class="services-section">
          <!-- 服务搜索 -->
          <div class="service-search">
            <h3>服务搜索</h3>
            <el-form :model="searchForm" inline>
              <el-form-item label="服务类型">
                <el-select v-model="searchForm.serviceType" placeholder="选择服务类型" clearable>
                  <el-option
                    v-for="type in serviceTypes"
                    :key="type.code"
                    :label="type.name"
                    :value="type.code"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="关键词">
                <el-input v-model="searchForm.keyword" placeholder="输入服务关键词" clearable />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="searchServices">搜索</el-button>
                <el-button @click="resetSearch">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <!-- 服务列表 -->
          <div class="service-list">
            <el-row :gutter="16">
              <el-col
                v-for="service in services"
                :key="service.id"
                :span="8"
                class="service-card-col"
              >
                <el-card class="service-card" @click="viewServiceDetail(service)">
                  <div class="service-header">
                    <el-icon class="service-icon">
                      <component :is="getServiceIcon(service.type)" />
                    </el-icon>
                    <h4>{{ service.name }}</h4>
                  </div>
                  <div class="service-info">
                    <p class="service-category">{{ service.category }}</p>
                    <p class="service-description">{{ service.description }}</p>
                  </div>
                  <div class="service-footer">
                    <el-tag size="small">{{ service.type }}</el-tag>
                    <el-button type="primary" size="small" @click.stop="applyForService(service)">
                      在线申请
                    </el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
            <el-pagination
              v-model:current-page="servicePage.current"
              v-model:page-size="servicePage.size"
              :total="servicePage.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="searchServices"
              @current-change="searchServices"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 我的申请 -->
      <el-tab-pane label="我的申请" name="applications">
        <div class="applications-section">
          <!-- 申请统计 -->
          <div class="application-stats">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-statistic title="总申请数" :value="applicationStats.total" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="处理中" :value="applicationStats.pending" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="已完成" :value="applicationStats.completed" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="已通过" :value="applicationStats.approved" />
              </el-col>
            </el-row>
          </div>

          <!-- 申请列表 -->
          <div class="application-list">
            <el-table :data="applications" style="width: 100%">
              <el-table-column prop="serviceId.name" label="服务名称" width="200" />
              <el-table-column prop="applyTime" label="申请时间" width="180">
                <template #default="scope">
                  {{ formatDateTime(scope.row.applyTime) }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="120">
                <template #default="scope">
                  <el-tag :type="getStatusTag(scope.row.status)">
                    {{ getStatusName(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="processingInfo.expectedCompletionTime"
                label="预计完成时间"
                width="180"
              >
                <template #default="scope">
                  {{ formatDateTime(scope.row.processingInfo?.expectedCompletionTime) }}
                </template>
              </el-table-column>
              <el-table-column
                prop="reviewResult.reviewNotes"
                label="审核意见"
                show-overflow-tooltip
              />
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button type="text" size="small" @click="viewApplicationDetail(scope.row)">
                    查看详情
                  </el-button>
                  <el-button
                    v-if="canCancelApplication(scope.row)"
                    type="text"
                    size="small"
                    @click="cancelApplication(scope.row)"
                  >
                    取消申请
                  </el-button>
                  <el-button
                    v-if="canProvideFeedback(scope.row)"
                    type="text"
                    size="small"
                    @click="provideFeedback(scope.row)"
                  >
                    评价反馈
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-model:current-page="applicationPage.current"
              v-model:page-size="applicationPage.size"
              :total="applicationPage.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadApplications"
              @current-change="loadApplications"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 同步对话框 -->
    <el-dialog v-model="syncDialog.visible" :title="syncDialog.title" width="50%">
      <el-form :model="syncDialog.form" label-width="120px">
        <el-form-item label="选择村庄">
          <el-select v-model="syncDialog.form.villageId" placeholder="选择村庄" style="width: 100%">
            <el-option
              v-for="village in villages"
              :key="village._id"
              :label="village.name"
              :value="village._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="批量大小">
          <el-input-number
            v-model="syncDialog.form.batchSize"
            :min="10"
            :max="1000"
            :step="10"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="启用重试">
          <el-switch v-model="syncDialog.form.enableRetry" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="syncDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="performSync" :loading="syncDialog.loading">
          开始同步
        </el-button>
      </template>
    </el-dialog>

    <!-- 服务申请对话框 -->
    <el-dialog v-model="applicationDialog.visible" :title="applicationDialog.title" width="70%">
      <el-form :model="applicationDialog.form" label-width="120px">
        <el-form-item label="申请人姓名" required>
          <el-input v-model="applicationDialog.form.name" />
        </el-form-item>
        <el-form-item label="身份证号" required>
          <el-input v-model="applicationDialog.form.idCard" />
        </el-form-item>
        <el-form-item label="联系电话" required>
          <el-input v-model="applicationDialog.form.phone" />
        </el-form-item>
        <el-form-item label="居住地址" required>
          <el-input v-model="applicationDialog.form.address" />
        </el-form-item>
        <el-form-item label="申请材料">
          <el-upload
            class="upload-demo"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleApplicationFileChange"
            multiple
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持jpg/png/pdf文件，且不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applicationDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitApplication" :loading="applicationDialog.loading">
          提交申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Connection,
  UploadFilled,
  User,
  Document,
  House,
  Money,
  School,
  Hospital,
  Car,
} from '@element-plus/icons-vue';
import axios from 'axios';

// 响应式数据
const activeTab = ref('sync');
const connectionStatus = reactive({
  provincial: { connected: false, lastCheck: new Date(), error: null },
  municipal: { connected: false, lastCheck: new Date(), error: null },
});

const syncStatus = reactive({
  inProgress: false,
  lastSyncTime: null,
  totalRecords: 0,
  processedRecords: 0,
  failedRecords: 0,
  nextSyncTime: null,
});

const autoSyncSettings = reactive({
  enabled: false,
  interval: '24h',
  scope: ['household', 'socialSecurity'],
});

// 分页数据
const historyPage = reactive({ current: 1, size: 10, total: 0 });
const servicePage = reactive({ current: 1, size: 9, total: 0 });
const applicationPage = reactive({ current: 1, size: 10, total: 0 });

// 列表数据
const villages = ref([]);
const syncHistory = ref([]);
const services = ref([]);
const applications = ref([]);
const uploadHistory = ref([]);
const serviceTypes = ref([]);

// 表单数据
const syncDialog = reactive({
  visible: false,
  title: '',
  loading: false,
  form: {
    villageId: '',
    batchSize: 100,
    enableRetry: true,
  },
});

const applicationDialog = reactive({
  visible: false,
  title: '',
  loading: false,
  form: {
    name: '',
    idCard: '',
    phone: '',
    address: '',
    attachments: [],
  },
});

const searchForm = reactive({
  serviceType: '',
  keyword: '',
});

const reportForm = reactive({
  reportType: '',
  reportDate: '',
  villageId: '',
});

const reportPreview = ref(null);
const generatingReport = ref(false);
const uploading = ref(false);

// 统计数据
const applicationStats = computed(() => {
  const stats = {
    total: applications.value.length,
    pending: 0,
    completed: 0,
    approved: 0,
  };

  applications.value.forEach(app => {
    if (['submitted', 'processing', 'reviewing'].includes(app.status)) {
      stats.pending++;
    }
    if (app.status === 'completed') {
      stats.completed++;
    }
    if (['approved', 'completed'].includes(app.status)) {
      stats.approved++;
    }
  });

  return stats;
});

// 报表类型
const reportTypes = [
  { label: '人口统计报表', value: 'population' },
  { label: '经济统计报表', value: 'economic' },
  { label: '社会保障报表', value: 'social' },
  { label: '农业统计报表', value: 'agricultural' },
];

// 方法
const formatTime = date => {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('zh-CN');
};

const formatDateTime = date => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const formatDuration = ms => {
  if (!ms) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
  if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`;
  return `${seconds}秒`;
};

const formatFileSize = bytes => {
  if (!bytes) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const getStatusTag = status => {
  const tagMap = {
    success: 'success',
    failed: 'danger',
    processing: 'warning',
    pending: 'info',
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
    cancelled: 'info',
  };
  return tagMap[status] || '';
};

const getStatusName = status => {
  const nameMap = {
    success: '成功',
    failed: '失败',
    processing: '处理中',
    pending: '等待中',
    approved: '已通过',
    rejected: '已拒绝',
    completed: '已完成',
    cancelled: '已取消',
    submitted: '已提交',
    reviewing: '审核中',
  };
  return nameMap[status] || status;
};

const getSyncTypeTag = type => {
  const tagMap = {
    household: 'primary',
    socialSecurity: 'success',
    statistics: 'warning',
    all: 'info',
  };
  return tagMap[type] || '';
};

const getSyncTypeName = type => {
  const nameMap = {
    household: '户籍数据',
    socialSecurity: '社保数据',
    statistics: '统计数据',
    all: '全部数据',
  };
  return nameMap[type] || type;
};

const getSyncProgress = sync => {
  if (sync.totalRecords === 0) return 0;
  return Math.round((sync.processedRecords / sync.totalRecords) * 100);
};

const getReportTypeName = type => {
  const typeMap = {
    population: '人口统计',
    economic: '经济统计',
    social: '社会保障',
    agricultural: '农业统计',
  };
  return typeMap[type] || type;
};

const getReportFieldLabel = key => {
  const labelMap = {
    totalPopulation: '总人口',
    householdCount: '户数',
    malePopulation: '男性人口',
    femalePopulation: '女性人口',
    elderlyPopulation: '老年人口',
    perCapitaIncome: '人均收入',
    employmentRate: '就业率',
  };
  return labelMap[key] || key;
};

const formatReportValue = value => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return value;
};

const getServiceIcon = type => {
  const iconMap = {
    social_security: User,
    medical: Hospital,
    education: School,
    housing: House,
    employment: Document,
    elderly: User,
    agriculture: Car,
    money: Money,
  };
  return iconMap[type] || Document;
};

// API调用
const checkConnectionStatus = async () => {
  try {
    const response = await axios.get('/api/v1/government/connection-status');
    Object.assign(connectionStatus, response.data.data);
    ElMessage.success('连接状态检查完成');
  } catch (error) {
    ElMessage.error('检查连接状态失败');
  }
};

const openSyncDialog = syncType => {
  syncDialog.title = getSyncTypeName(syncType) + '同步';
  syncDialog.visible = true;
  syncDialog.form.syncType = syncType;
};

const openBatchSyncDialog = () => {
  syncDialog.title = '批量数据同步';
  syncDialog.visible = true;
  syncDialog.form.syncType = 'all';
};

const performSync = async () => {
  if (!syncDialog.form.villageId) {
    ElMessage.warning('请选择村庄');
    return;
  }

  syncDialog.loading = true;
  try {
    let response;
    if (syncDialog.form.syncType === 'all') {
      response = await axios.post('/api/v1/government/sync/batch-all', {
        syncType: 'household',
        options: syncDialog.form,
      });
    } else {
      const endpoint =
        syncDialog.form.syncType === 'household'
          ? '/api/v1/government/sync/household'
          : '/api/v1/government/sync/social-security';

      response = await axios.post(endpoint, {
        villageId: syncDialog.form.villageId,
        options: syncDialog.form,
      });
    }

    ElMessage.success('数据同步已启动');
    syncDialog.visible = false;
    await loadSyncHistory();
  } catch (error) {
    ElMessage.error('同步失败: ' + error.message);
  } finally {
    syncDialog.loading = false;
  }
};

const toggleAutoSync = async () => {
  try {
    const endpoint = autoSyncSettings.enabled
      ? '/api/v1/government/sync/auto-start'
      : '/api/v1/government/sync/auto-stop';

    await axios.post(endpoint);
    ElMessage.success(autoSyncSettings.enabled ? '自动同步已启动' : '自动同步已停止');
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const loadSyncHistory = async () => {
  try {
    const response = await axios.get('/api/v1/government/sync/history', {
      params: {
        page: historyPage.current,
        limit: historyPage.size,
      },
    });

    syncHistory.value = response.data.data.history;
    historyPage.total = response.data.data.total;
  } catch (error) {
    ElMessage.error('加载同步历史失败');
  }
};

const loadApplications = async () => {
  try {
    const response = await axios.get('/api/v1/government/services/my-applications', {
      params: {
        page: applicationPage.current,
        pageSize: applicationPage.size,
      },
    });

    applications.value = response.data.data.applications;
    applicationPage.total = response.data.data.total;
  } catch (error) {
    ElMessage.error('加载申请记录失败');
  }
};

const searchServices = async () => {
  try {
    const response = await axios.get('/api/v1/government/services/query', {
      params: {
        serviceType: searchForm.serviceType,
        keyword: searchForm.keyword,
        page: servicePage.current,
        pageSize: servicePage.size,
      },
    });

    services.value = response.data.data.services;
    servicePage.total = response.data.data.total;
  } catch (error) {
    ElMessage.error('搜索服务失败');
  }
};

const generateReport = async () => {
  if (!reportForm.reportType || !reportForm.villageId || !reportForm.reportDate) {
    ElMessage.warning('请填写完整的报表信息');
    return;
  }

  generatingReport.value = true;
  try {
    const village = villages.value.find(v => v._id === reportForm.villageId);
    const reportData = await generateReportData(
      reportForm.reportType,
      reportForm.villageId,
      reportForm.reportDate
    );

    reportPreview.value = reportData;
    reportForm.villageName = village.name;

    ElMessage.success('报表生成成功');
  } catch (error) {
    ElMessage.error('生成报表失败');
  } finally {
    generatingReport.value = false;
  }
};

const uploadReport = async () => {
  if (!reportPreview.value) {
    ElMessage.warning('请先生成报表');
    return;
  }

  uploading.value = true;
  try {
    await axios.post('/api/v1/government/report/upload', {
      reportData: {
        ...reportPreview.value,
        villageId: reportForm.villageId,
        reportDate: reportForm.reportDate,
      },
      reportType: reportForm.reportType,
    });

    ElMessage.success('报表上传成功');
    reportPreview.value = null;
    // 重置表单
    Object.assign(reportForm, {
      reportType: '',
      reportDate: '',
      villageId: '',
    });
  } catch (error) {
    ElMessage.error('上传报表失败');
  } finally {
    uploading.value = false;
  }
};

const applyForService = service => {
  applicationDialog.title = '申请服务 - ' + service.name;
  applicationDialog.visible = true;
  applicationDialog.serviceId = service.id;
};

const submitApplication = async () => {
  if (
    !applicationDialog.form.name ||
    !applicationDialog.form.idCard ||
    !applicationDialog.form.phone
  ) {
    ElMessage.warning('请填写完整的申请信息');
    return;
  }

  applicationDialog.loading = true;
  try {
    await axios.post('/api/v1/government/services/apply', {
      serviceId: applicationDialog.serviceId,
      applicantData: {
        ...applicationDialog.form,
        villageId: 'current_user_village', // 从用户信息获取
      },
    });

    ElMessage.success('服务申请提交成功');
    applicationDialog.visible = false;
    // 重置表单
    Object.assign(applicationDialog.form, {
      name: '',
      idCard: '',
      phone: '',
      address: '',
      attachments: [],
    });
  } catch (error) {
    ElMessage.error('提交申请失败');
  } finally {
    applicationDialog.loading = false;
  }
};

const canCancelApplication = application => {
  return ['submitted', 'processing'].includes(application.status);
};

const canProvideFeedback = application => {
  return ['completed', 'approved'].includes(application.status) && !application.feedback;
};

const cancelApplication = async application => {
  try {
    await ElMessageBox.confirm('确定要取消这个申请吗？', '确认取消', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await axios.delete(`/api/v1/government/services/${application._id}/cancel`);
    ElMessage.success('申请已取消');
    await loadApplications();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消申请失败');
    }
  }
};

const provideFeedback = application => {
  ElMessageBox.prompt('请评价服务并留言', '服务评价', {
    confirmButtonText: '提交',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入您的评价意见',
    inputType: 'textarea',
    inputValidator: value => {
      if (!value) {
        return '请输入评价意见';
      }
      return true;
    },
  }).then(({ value }) => {
    // 这里可以添加评分逻辑
    ElMessage.success('评价已提交');
    // 更新申请状态
    application.feedback = { rating: 5, comment: value };
  });
};

const generateReportData = async (reportType, villageId, reportDate) => {
  // 模拟报表数据生成
  const baseData = {
    reportDate,
    villageId,
    totalPopulation: Math.floor(Math.random() * 2000) + 500,
    householdCount: Math.floor(Math.random() * 500) + 100,
    malePopulation: Math.floor(Math.random() * 1000) + 250,
    femalePopulation: Math.floor(Math.random() * 1000) + 250,
  };

  switch (reportType) {
    case 'population':
      return {
        ...baseData,
        elderlyPopulation: Math.floor(Math.random() * 200) + 50,
        minorPopulation: Math.floor(Math.random() * 300) + 100,
        employmentRate: Math.random() * 0.3 + 0.6,
      };
    case 'economic':
      return {
        ...baseData,
        perCapitaIncome: Math.floor(Math.random() * 30000) + 20000,
        totalIncome: Math.floor(Math.random() * 10000000) + 5000000,
        averageHouseholdIncome: Math.floor(Math.random() * 80000) + 40000,
      };
    default:
      return baseData;
  }
};

const viewSyncDetail = syncRecord => {
  ElMessageBox.alert(
    `
    同步详情:
    - 同步类型: ${getSyncTypeName(syncRecord.syncType)}
    - 村庄: ${syncRecord.villageId?.name || '未知'}
    - 总记录数: ${syncRecord.totalRecords}
    - 已处理: ${syncRecord.processedRecords}
    - 失败记录: ${syncRecord.failedRecords}
    - 耗时: ${formatDuration(syncRecord.duration)}
    - 状态: ${getStatusName(syncRecord.status)}
  `,
    '同步详情'
  );
};

const handleApplicationFileChange = file => {
  applicationDialog.form.attachments.push({
    name: file.name,
    size: file.size,
    type: file.raw.type,
  });
};

// 初始化
onMounted(async () => {
  await Promise.all([checkConnectionStatus(), loadSyncHistory(), loadApplications()]);

  // 加载村庄列表
  try {
    const response = await axios.get('/api/v1/villages');
    villages.value = response.data.data;
  } catch (error) {
    console.error('加载村庄列表失败');
  }

  // 加载服务类型
  try {
    const response = await axios.get('/api/v1/government/services/types');
    serviceTypes.value = response.data.data;
  } catch (error) {
    console.error('加载服务类型失败');
  }
});
</script>

<style scoped>
.government-integration {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  color: #303133;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.page-header p {
  color: #606266;
  font-size: 16px;
}

.connection-status {
  margin-bottom: 24px;
}

.status-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-indicator.connected .status-dot {
  background-color: #67c23a;
}

.status-indicator.disconnected .status-dot {
  background-color: #f56c6c;
}

.status-text {
  font-weight: 500;
  color: #303133;
}

.status-info {
  margin-bottom: 16px;
}

.status-info p {
  margin: 4px 0;
  color: #606266;
  font-size: 14px;
}

.error-text {
  color: #f56c6c !important;
}

.card-title {
  display: flex;
  align-items: center;
}

.card-title .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.function-tabs {
  background: white;
  border-radius: 8px;
  padding: 24px;
}

.sync-section h3,
.reports-section h3,
.services-section h3,
.applications-section h3 {
  margin: 24px 0 16px 0;
  color: #303133;
  font-size: 18px;
  border-bottom: 2px solid #e4e7ed;
  padding-bottom: 8px;
}

.sync-overview,
.application-stats {
  margin-bottom: 24px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.sync-operations,
.auto-sync-settings {
  margin-bottom: 24px;
}

.sync-operations .el-card,
.auto-sync-settings .el-form {
  margin-bottom: 16px;
  text-align: center;
}

.sync-operations .el-card h4 {
  margin-bottom: 12px;
  color: #303133;
}

.sync-operations .el-card p {
  color: #606266;
  margin-bottom: 16px;
}

.service-card-col {
  margin-bottom: 16px;
}

.service-card {
  cursor: pointer;
  transition: all 0.3s;
  height: 200px;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.service-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.service-icon {
  font-size: 24px;
  color: #409eff;
  margin-right: 12px;
}

.service-header h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.service-info {
  flex: 1;
  margin-bottom: 12px;
}

.service-category {
  color: #909399;
  font-size: 12px;
  margin-bottom: 4px;
}

.service-description {
  color: #606266;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.service-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-preview {
  margin: 24px 0;
}

.preview-header h4 {
  color: #303133;
  margin-bottom: 8px;
}

.preview-header p {
  color: #606266;
  margin-bottom: 16px;
}

.preview-actions {
  margin-top: 16px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sync-overview .el-col,
  .application-stats .el-col {
    margin-bottom: 16px;
  }

  .sync-operations .el-col {
    margin-bottom: 16px;
  }

  .service-card-col {
    margin-bottom: 16px;
  }
}
</style>
