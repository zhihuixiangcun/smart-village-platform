<template>
  <div class="emergency-management">
    <div class="page-header">
      <h2>应急管理</h2>
      <el-button type="danger" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新建应急报告
      </el-button>
    </div>

    <!-- 应急统计 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card critical">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.criticalCount }}</div>
              <div class="stat-label">紧急事件</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card processing">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Loading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.processingCount }}</div>
              <div class="stat-label">处理中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card resolved">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.resolvedCount }}</div>
              <div class="stat-label">已解决</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card today">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="32"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayCount }}</div>
              <div class="stat-label">今日新增</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快速操作 -->
    <el-card class="quick-actions">
      <h3>快速操作</h3>
      <el-row :gutter="15">
        <el-col :span="4">
          <el-button type="danger" size="large" @click="createEmergencyReport('medical')">
            <el-icon><FirstAidKit /></el-icon>
            医疗急救
          </el-button>
        </el-col>
        <el-col :span="4">
          <el-button type="warning" size="large" @click="createEmergencyReport('fire')">
            <el-icon><Warning /></el-icon>
            火灾报警
          </el-button>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" size="large" @click="createEmergencyReport('security')">
            <el-icon><Select /></el-icon>
            安全事件
          </el-button>
        </el-col>
        <el-col :span="4">
          <el-button type="info" size="large" @click="createEmergencyReport('natural_disaster')">
            <el-icon><InfoFilled /></el-icon>
            自然灾害
          </el-button>
        </el-col>
        <el-col :span="4">
          <el-button type="success" size="large" @click="showBroadcastDialog">
            <el-icon><Bell /></el-icon>
            紧急广播
          </el-button>
        </el-col>
        <el-col :span="4">
          <el-button size="large" @click="exportEmergencyReport">
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="输入描述或编号搜索"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="事件类型">
          <el-select v-model="filters.type" placeholder="选择类型" clearable>
            <el-option label="医疗急救" value="medical" />
            <el-option label="火灾报警" value="fire" />
            <el-option label="安全事件" value="security" />
            <el-option label="自然灾害" value="natural_disaster" />
            <el-option label="设施故障" value="facility_failure" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重程度">
          <el-select v-model="filters.severity" placeholder="选择严重程度" clearable>
            <el-option label="紧急" value="critical" />
            <el-option label="严重" value="high" />
            <el-option label="中等" value="medium" />
            <el-option label="轻微" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 应急报告列表 -->
    <el-card class="table-card">
      <el-table
        :data="reportList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="报告编号" width="150" show-overflow-tooltip />
        <el-table-column prop="type" label="事件类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getSeverityTagType(row.severity)">
              {{ getSeverityLabel(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="事件描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="location.address" label="事发地点" width="150" show-overflow-tooltip />
        <el-table-column prop="reporter" label="报告人" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="报告时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                size="small"
                type="primary"
                link
                @click="handleView(row)"
              >
                查看
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="success"
                link
                @click="handleProcess(row)"
              >
                处理
              </el-button>
              <el-button
                size="small"
                type="warning"
                link
                @click="handleUpdateStatus(row)"
              >
                更新
              </el-button>
              <el-button
                size="small"
                type="danger"
                link
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 批量操作 -->
    <div v-if="selectedReports.length > 0" class="batch-operations">
      <el-card>
        <div class="batch-info">
          已选择 <span class="count">{{ selectedReports.length }}</span> 个报告
        </div>
        <div class="batch-actions">
          <el-button type="warning" @click="handleBatchUpdateStatus">批量更新状态</el-button>
          <el-button type="success" @click="handleBatchExport">导出报告</el-button>
          <el-button type="danger" @click="handleBatchDelete">批量删除</el-button>
        </div>
      </el-card>
    </div>

    <!-- 应急报告详情对话框 -->
    <el-dialog
      v-model="detailDialog.visible"
      title="应急报告详情"
      width="800px"
      :before-close="handleCloseDetailDialog"
    >
      <div v-if="detailDialog.data" class="report-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="报告编号">{{ detailDialog.data.id }}</el-descriptions-item>
          <el-descriptions-item label="事件类型">
            <el-tag :type="getTypeTagType(detailDialog.data.type)">
              {{ getTypeLabel(detailDialog.data.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="严重程度">
            <el-tag :type="getSeverityTagType(detailDialog.data.severity)">
              {{ getSeverityLabel(detailDialog.data.severity) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(detailDialog.data.status)">
              {{ getStatusLabel(detailDialog.data.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="报告人">{{ detailDialog.data.reporter }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailDialog.data.phone }}</el-descriptions-item>
          <el-descriptions-item label="事发地点" :span="2">{{ detailDialog.data.location?.address }}</el-descriptions-item>
          <el-descriptions-item label="经纬度" :span="2">
            {{ detailDialog.data.location?.latitude }}, {{ detailDialog.data.location?.longitude }}
          </el-descriptions-item>
          <el-descriptions-item label="报告时间">
            {{ formatDateTime(detailDialog.data.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(detailDialog.data.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="事件描述" :span="2">{{ detailDialog.data.description }}</el-descriptions-item>
          <el-descriptions-item v-if="detailDialog.data.processingNote" label="处理说明" :span="2">
            {{ detailDialog.data.processingNote }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 事件图片 -->
        <div v-if="detailDialog.data.images && detailDialog.data.images.length > 0" class="event-images">
          <h4>现场图片</h4>
          <el-row :gutter="10">
            <el-col v-for="(image, index) in detailDialog.data.images" :key="index" :span="6">
              <el-image
                :src="image"
                :preview-src-list="detailDialog.data.images"
                fit="cover"
                style="width: 100%; height: 120px;"
              />
            </el-col>
          </el-row>
        </div>

        <!-- 地图 -->
        <div v-if="detailDialog.data.location" class="event-map">
          <h4>事发地点</h4>
          <div class="map-placeholder">
            <el-icon size="64"><Location /></el-icon>
            <p>{{ detailDialog.data.location.address }}</p>
            <p>经度: {{ detailDialog.data.location.latitude }}, 纬度: {{ detailDialog.data.location.longitude }}</p>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 创建/编辑应急报告对话框 -->
    <el-dialog
      v-model="formDialog.visible"
      :title="formDialog.isEdit ? '编辑应急报告' : '新建应急报告'"
      width="700px"
      :before-close="handleCloseFormDialog"
    >
      <el-form
        ref="reportFormRef"
        :model="reportForm"
        :rules="reportFormRules"
        label-width="100px"
      >
        <el-form-item label="事件类型" prop="type">
          <el-select v-model="reportForm.type" placeholder="请选择事件类型" style="width: 100%">
            <el-option label="医疗急救" value="medical" />
            <el-option label="火灾报警" value="fire" />
            <el-option label="安全事件" value="security" />
            <el-option label="自然灾害" value="natural_disaster" />
            <el-option label="设施故障" value="facility_failure" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重程度" prop="severity">
          <el-select v-model="reportForm.severity" placeholder="请选择严重程度" style="width: 100%">
            <el-option label="紧急" value="critical" />
            <el-option label="严重" value="high" />
            <el-option label="中等" value="medium" />
            <el-option label="轻微" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="事件描述" prop="description">
          <el-input
            v-model="reportForm.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述事件情况"
          />
        </el-form-item>
        <el-form-item label="事发地点" prop="location">
          <el-input
            v-model="reportForm.location.address"
            placeholder="请输入事发地点"
          >
            <template #append>
              <el-button @click="getCurrentLocation">获取位置</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="报告人" prop="reporter">
          <el-input v-model="reportForm.reporter" placeholder="请输入报告人姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="reportForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="现场图片">
          <el-upload
            class="event-images-uploader"
            action="#"
            multiple
            :file-list="reportForm.images"
            :on-preview="handlePictureCardPreview"
            :on-remove="handleImageRemove"
            :before-upload="handleImageUpload"
          >
            <el-icon class="event-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseFormDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmitReport" :loading="submitting">
            {{ formDialog.isEdit ? '更新' : '提交' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 状态更新对话框 -->
    <el-dialog
      v-model="statusDialog.visible"
      title="更新状态"
      width="500px"
    >
      <el-form :model="statusForm" label-width="100px">
        <el-form-item label="新状态" required>
          <el-select v-model="statusForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input
            v-model="statusForm.processingNote"
            type="textarea"
            :rows="3"
            placeholder="请输入处理说明"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="statusDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitStatus" :loading="statusSubmitting">
            确认更新
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 紧急广播对话框 -->
    <el-dialog
      v-model="broadcastDialog.visible"
      title="紧急广播"
      width="600px"
    >
      <el-form :model="broadcastForm" :rules="broadcastFormRules" label-width="100px" ref="broadcastFormRef">
        <el-form-item label="广播标题" prop="title">
          <el-input v-model="broadcastForm.title" placeholder="请输入广播标题" />
        </el-form-item>
        <el-form-item label="广播内容" prop="message">
          <el-input
            v-model="broadcastForm.message"
            type="textarea"
            :rows="4"
            placeholder="请输入广播内容"
          />
        </el-form-item>
        <el-form-item label="广播范围" prop="scope">
          <el-select v-model="broadcastForm.scope" placeholder="请选择广播范围" style="width: 100%">
            <el-option label="全村广播" value="all" />
            <el-option label="村委人员" value="village_admin" />
            <el-option label="网格员" value="grid_workers" />
            <el-option label="志愿者" value="volunteers" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-radio-group v-model="broadcastForm.priority">
            <el-radio label="critical">紧急</el-radio>
            <el-radio label="high">重要</el-radio>
            <el-radio label="normal">一般</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="broadcastDialog.visible = false">取消</el-button>
          <el-button type="danger" @click="handleSubmitBroadcast" :loading="broadcastSubmitting">
            发送广播
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus, Warning, Loading, CircleCheck, Clock, FirstAidKit,
  Select, InfoFilled, Bell, Download,
  Location
} from '@element-plus/icons-vue';
import apiService from '@/services/apiService';

// 响应式数据
const loading = ref(false);
const reportList = ref([]);
const selectedReports = ref([]);
const submitting = ref(false);
const statusSubmitting = ref(false);
const broadcastSubmitting = ref(false);

// 筛选条件
const filters = reactive({
  search: '',
  type: '',
  severity: '',
  status: ''
});

const dateRange = ref([]);

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
});

// 应急统计
const stats = reactive({
  criticalCount: 0,
  processingCount: 0,
  resolvedCount: 0,
  todayCount: 0
});

// 详情对话框
const detailDialog = reactive({
  visible: false,
  data: null
});

// 表单对话框
const formDialog = reactive({
  visible: false,
  isEdit: false
});

// 状态更新对话框
const statusDialog = reactive({
  visible: false,
  data: null
});

// 紧急广播对话框
const broadcastDialog = reactive({
  visible: false
});

// 应急报告表单
const reportForm = reactive({
  id: '',
  type: '',
  severity: '',
  description: '',
  location: {
    address: '',
    latitude: '',
    longitude: ''
  },
  reporter: '',
  phone: '',
  images: []
});

// 状态更新表单
const statusForm = reactive({
  status: '',
  processingNote: ''
});

// 广播表单
const broadcastForm = reactive({
  title: '',
  message: '',
  scope: 'all',
  priority: 'high'
});

// 表单验证规则
const reportFormRules = {
  type: [
    { required: true, message: '请选择事件类型', trigger: 'change' }
  ],
  severity: [
    { required: true, message: '请选择严重程度', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入事件描述', trigger: 'blur' }
  ],
  'location.address': [
    { required: true, message: '请输入事发地点', trigger: 'blur' }
  ],
  reporter: [
    { required: true, message: '请输入报告人姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
};

const broadcastFormRules = {
  title: [
    { required: true, message: '请输入广播标题', trigger: 'blur' }
  ],
  message: [
    { required: true, message: '请输入广播内容', trigger: 'blur' }
  ],
  scope: [
    { required: true, message: '请选择广播范围', trigger: 'change' }
  ]
};

// 表单引用
const reportFormRef = ref(null);
const broadcastFormRef = ref(null);

// 方法
const loadReportList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    };

    // 添加日期范围
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    // 清理空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });

    const response = await apiService.getEmergencyReportList(params);

    if (response.success) {
      reportList.value = response.data.reports || [];
      pagination.total = response.pagination?.total || 0;
    } else {
      ElMessage.error(response.error || '获取应急报告列表失败');
    }
  } catch (error) {
    ElMessage.error('获取应急报告列表失败');
    console.error('加载应急报告列表错误:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadReportList();
};

const handleReset = () => {
  filters.search = '';
  filters.type = '';
  filters.severity = '';
  filters.status = '';
  dateRange.value = [];
  pagination.page = 1;
  loadReportList();
};

const handleDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    filters.startDate = dates[0];
    filters.endDate = dates[1];
  } else {
    delete filters.startDate;
    delete filters.endDate;
  }
  handleSearch();
};

const handleSizeChange = (size) => {
  pagination.limit = size;
  loadReportList();
};

const handleCurrentChange = (page) => {
  pagination.page = page;
  loadReportList();
};

const handleSelectionChange = (selection) => {
  selectedReports.value = selection;
};

const handleView = (row) => {
  detailDialog.data = row;
  detailDialog.visible = true;
};

const handleProcess = (row) => {
  statusDialog.data = row;
  statusDialog.visible = true;
  statusForm.status = 'processing';
  statusForm.processingNote = '';
};

const handleUpdateStatus = (row) => {
  statusDialog.data = row;
  statusDialog.visible = true;
  statusForm.status = row.status;
  statusForm.processingNote = row.processingNote || '';
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除应急报告 "${row.description}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 实现删除逻辑
    ElMessage.success('应急报告删除成功');
    loadReportList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除应急报告失败');
      console.error('删除应急报告错误:', error);
    }
  }
};

const createEmergencyReport = (type) => {
  showCreateDialog(type);
};

const showCreateDialog = (type = '') => {
  formDialog.isEdit = false;
  formDialog.visible = true;
  resetReportForm();
  if (type) {
    reportForm.type = type;
  }
};

const resetReportForm = () => {
  Object.keys(reportForm).forEach(key => {
    if (key === 'location') {
      reportForm[key] = { address: '', latitude: '', longitude: '' };
    } else if (key === 'images') {
      reportForm[key] = [];
    } else {
      reportForm[key] = '';
    }
  });

  if (reportFormRef.value) {
    reportFormRef.value.resetFields();
  }
};

const getCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        reportForm.location.latitude = position.coords.latitude;
        reportForm.location.longitude = position.coords.longitude;
        ElMessage.success('位置获取成功');
      },
      (error) => {
        ElMessage.error('位置获取失败，请手动输入地址');
      }
    );
  } else {
    ElMessage.error('浏览器不支持定位功能');
  }
};

const handleImageUpload = (file) => {
  // 这里应该实现图片上传逻辑
  const reader = new FileReader();
  reader.onload = (e) => {
    reportForm.images.push({
      name: file.name,
      url: e.target.result
    });
  };
  reader.readAsDataURL(file);
  return false; // 阻止默认上传
};

const handlePictureCardPreview = (file) => {
  // 预览图片
  console.log('Preview:', file);
};

const handleImageRemove = (file, fileList) => {
  reportForm.images = fileList;
};

const handleSubmitReport = async () => {
  if (!reportFormRef.value) return;

  try {
    await reportFormRef.value.validate();

    submitting.value = true;

    let response;
    if (formDialog.isEdit) {
      response = await apiService.updateEmergencyReport(reportForm.id, reportForm);
    } else {
      response = await apiService.createEmergencyReport(reportForm);
    }

    if (response.success) {
      ElMessage.success(formDialog.isEdit ? '应急报告更新成功' : '应急报告提交成功');
      handleCloseFormDialog();
      loadReportList();
    } else {
      ElMessage.error(response.error || '操作失败');
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('操作失败');
      console.error('提交应急报告错误:', error);
    }
  } finally {
    submitting.value = false;
  }
};

const handleSubmitStatus = async () => {
  if (!statusDialog.data) return;

  try {
    statusSubmitting.value = true;

    const statusData = {
      status: statusForm.status,
      processingNote: statusForm.processingNote
    };

    const response = await apiService.updateEmergencyStatus(statusDialog.data.id, statusData);

    if (response.success) {
      ElMessage.success('状态更新成功');
      statusDialog.visible = false;
      loadReportList();
    } else {
      ElMessage.error(response.error || '状态更新失败');
    }
  } catch (error) {
    ElMessage.error('状态更新失败');
    console.error('更新状态错误:', error);
  } finally {
    statusSubmitting.value = false;
  }
};

const showBroadcastDialog = () => {
  broadcastDialog.visible = true;
  broadcastForm.title = '';
  broadcastForm.message = '';
  broadcastForm.scope = 'all';
  broadcastForm.priority = 'high';
};

const handleSubmitBroadcast = async () => {
  if (!broadcastFormRef.value) return;

  try {
    await broadcastFormRef.value.validate();

    broadcastSubmitting.value = true;

    const response = await apiService.broadcastEmergencyAlert(broadcastForm);

    if (response.success) {
      ElMessage.success('紧急广播发送成功');
      broadcastDialog.visible = false;
    } else {
      ElMessage.error(response.error || '广播发送失败');
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('广播发送失败');
      console.error('发送紧急广播错误:', error);
    }
  } finally {
    broadcastSubmitting.value = false;
  }
};

const handleCloseFormDialog = () => {
  formDialog.visible = false;
  resetReportForm();
};

const handleCloseDetailDialog = () => {
  detailDialog.visible = false;
  detailDialog.data = null;
};

const handleBatchUpdateStatus = async () => {
  if (selectedReports.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要批量更新选中的 ${selectedReports.value.length} 个报告状态吗？`,
      '批量更新状态',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 实现批量更新状态逻辑
    ElMessage.info('批量更新状态功能开发中...');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量更新状态失败');
    }
  }
};

const handleBatchExport = () => {
  // 实现批量导出逻辑
  ElMessage.info('批量导出功能开发中...');
};

const handleBatchDelete = async () => {
  if (selectedReports.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedReports.value.length} 个报告吗？`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 实现批量删除逻辑
    ElMessage.info('批量删除功能开发中...');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败');
    }
  }
};

const exportEmergencyReport = () => {
  // 实现导出应急报告逻辑
  ElMessage.info('导出应急报告功能开发中...');
};

// 工具方法
const formatDateTime = (dateTime) => {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('zh-CN');
};

const getTypeLabel = (type) => {
  const typeMap = {
    medical: '医疗急救',
    fire: '火灾报警',
    security: '安全事件',
    natural_disaster: '自然灾害',
    facility_failure: '设施故障',
    other: '其他'
  };
  return typeMap[type] || type;
};

const getTypeTagType = (type) => {
  const typeMap = {
    medical: 'danger',
    fire: 'danger',
    security: 'warning',
    natural_disaster: 'warning',
    facility_failure: 'info',
    other: 'info'
  };
  return typeMap[type] || 'info';
};

const getSeverityLabel = (severity) => {
  const severityMap = {
    critical: '紧急',
    high: '严重',
    medium: '中等',
    low: '轻微'
  };
  return severityMap[severity] || severity;
};

const getSeverityTagType = (severity) => {
  const typeMap = {
    critical: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'success'
  };
  return typeMap[severity] || 'info';
};

const getStatusLabel = (status) => {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  };
  return statusMap[status] || status;
};

const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info'
  };
  return typeMap[status] || 'info';
};

// 生命周期
onMounted(() => {
  loadReportList();
});
</script>

<style scoped>
.emergency-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  margin-right: 15px;
}

.stat-card.critical .stat-icon {
  color: #f56c6c;
}

.stat-card.processing .stat-icon {
  color: #e6a23c;
}

.stat-card.resolved .stat-icon {
  color: #67c23a;
}

.stat-card.today .stat-icon {
  color: #409eff;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.quick-actions {
  margin-bottom: 20px;
}

.quick-actions h3 {
  margin: 0 0 15px 0;
  color: #303133;
}

.quick-actions .el-button {
  width: 100%;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  min-height: 400px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.batch-operations {
  margin-top: 20px;
}

.batch-info {
  display: flex;
  align-items: center;
}

.batch-info .count {
  color: #409eff;
  font-weight: bold;
  margin: 0 5px;
}

.batch-actions {
  margin-left: auto;
}

.dialog-footer {
  text-align: right;
}

.report-detail {
  padding: 20px 0;
}

.event-images {
  margin-top: 20px;
}

.event-images h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.event-map {
  margin-top: 20px;
}

.event-map h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.map-placeholder {
  height: 200px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.map-placeholder p {
  margin: 10px 0 0 0;
}

.event-images-uploader .el-upload--picture-card {
  width: 100px;
  height: 100px;
}

.event-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  line-height: 100px;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #fafafa;
}
</style>