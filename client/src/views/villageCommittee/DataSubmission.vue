<template>
  <div class="data-submission">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2>
          <el-icon><Upload /></el-icon>
          资料上交管理
        </h2>
        <p class="subtitle">向上级部门提交各类汇报材料和统计数据</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true" size="large">
        <el-icon><Plus /></el-icon>
        新建上交任务
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card total" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalSubmissions }}</div>
              <div class="stat-label">上交任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card pending" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingSubmissions }}</div>
              <div class="stat-label">待提交</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card approved" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.approvedSubmissions }}</div>
              <div class="stat-label">已通过</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stat-card rejected" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.rejectedSubmissions }}</div>
              <div class="stat-label">被驳回</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="搜索任务标题或编号"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="接收部门">
          <el-select
            v-model="filters.department"
            placeholder="选择部门"
            clearable
            style="width: 160px"
          >
            <el-option label="乡镇政府" value="township" />
            <el-option label="县政府" value="county" />
            <el-option label="市政府" value="city" />
            <el-option label="农业局" value="agriculture" />
            <el-option label="民政局" value="civil" />
            <el-option label="财政局" value="finance" />
            <el-option label="其他部门" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="资料类型">
          <el-select v-model="filters.type" placeholder="选择类型" clearable style="width: 140px">
            <el-option label="统计报表" value="statistics" />
            <el-option label="工作报告" value="report" />
            <el-option label="申请材料" value="application" />
            <el-option label="项目文档" value="project" />
            <el-option label="财务数据" value="finance" />
            <el-option label="其他资料" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="选择状态" clearable style="width: 140px">
            <el-option label="草稿" value="draft" />
            <el-option label="待提交" value="pending" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="已通过" value="approved" />
            <el-option label="被驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 上交任务列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="submissionList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="submissionCode" label="任务编号" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.submissionCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="任务标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="department" label="接收部门" width="120">
          <template #default="{ row }">
            <el-tag :type="getDepartmentTagColor(row.department)">
              {{ getDepartmentLabel(row.department) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="资料类型" width="110">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" width="120">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isOverdue(row.deadline) && row.status !== 'approved' }">
              {{ formatDate(row.deadline) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="180">
          <template #default="{ row }">
            {{ row.submittedAt ? formatDateTime(row.submittedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="reviewComment"
          label="审核意见"
          min-width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="row.reviewComment" :class="{ 'text-danger': row.status === 'rejected' }">
              {{ row.reviewComment }}
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" type="primary" link @click="handleView(row)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button
                v-if="['draft', 'rejected'].includes(row.status)"
                size="small"
                type="warning"
                link
                @click="handleEdit(row)"
              >
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button
                v-if="['draft', 'rejected'].includes(row.status)"
                size="small"
                type="success"
                link
                @click="handleSubmit(row)"
              >
                <el-icon><Upload /></el-icon>
                提交
              </el-button>
              <el-button
                v-if="row.status === 'approved'"
                size="small"
                type="success"
                link
                @click="handleDownloadProof(row)"
              >
                <el-icon><Download /></el-icon>
                回执
              </el-button>
              <el-button
                size="small"
                type="danger"
                link
                @click="handleDelete(row)"
                :disabled="!['draft', 'rejected', 'approved'].includes(row.status)"
              >
                <el-icon><Delete /></el-icon>
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

    <!-- 批量操作栏 -->
    <div v-if="selectedSubmissions.length > 0" class="batch-actions">
      <el-card>
        <div class="batch-content">
          <div class="batch-info">
            已选择 <strong>{{ selectedSubmissions.length }}</strong> 个任务
          </div>
          <div class="batch-buttons">
            <el-button type="success" @click="handleBatchSubmit">
              <el-icon><Upload /></el-icon>
              批量提交
            </el-button>
            <el-button type="warning" @click="handleBatchExport">
              <el-icon><Download /></el-icon>
              导出列表
            </el-button>
            <el-button type="danger" @click="handleBatchDelete">
              <el-icon><Delete /></el-icon>
              批量删除
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 创建/编辑上交任务对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingSubmission ? '编辑上交任务' : '创建上交任务'"
      width="800px"
      :before-close="handleCloseCreateDialog"
      destroy-on-close
    >
      <el-form
        ref="submissionFormRef"
        :model="submissionForm"
        :rules="submissionFormRules"
        label-width="100px"
      >
        <el-form-item label="任务标题" prop="title">
          <el-input
            v-model="submissionForm.title"
            placeholder="例如：2024年第三季度村务工作汇报"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="接收部门" prop="department">
              <el-select
                v-model="submissionForm.department"
                placeholder="请选择接收部门"
                style="width: 100%"
              >
                <el-option label="乡镇政府" value="township">
                  <div class="option-item">
                    <el-icon><OfficeBuilding /></el-icon>
                    <span>乡镇政府</span>
                  </div>
                </el-option>
                <el-option label="县政府" value="county">
                  <div class="option-item">
                    <el-icon><OfficeBuilding /></el-icon>
                    <span>县政府</span>
                  </div>
                </el-option>
                <el-option label="市政府" value="city">
                  <div class="option-item">
                    <el-icon><OfficeBuilding /></el-icon>
                    <span>市政府</span>
                  </div>
                </el-option>
                <el-option label="农业局" value="agriculture">
                  <div class="option-item">
                    <el-icon><Grape /></el-icon>
                    <span>农业局</span>
                  </div>
                </el-option>
                <el-option label="民政局" value="civil">
                  <div class="option-item">
                    <el-icon><User /></el-icon>
                    <span>民政局</span>
                  </div>
                </el-option>
                <el-option label="财政局" value="finance">
                  <div class="option-item">
                    <el-icon><Money /></el-icon>
                    <span>财政局</span>
                  </div>
                </el-option>
                <el-option label="其他部门" value="other">
                  <div class="option-item">
                    <el-icon><More /></el-icon>
                    <span>其他部门</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资料类型" prop="type">
              <el-select
                v-model="submissionForm.type"
                placeholder="请选择资料类型"
                style="width: 100%"
              >
                <el-option label="统计报表" value="statistics" />
                <el-option label="工作报告" value="report" />
                <el-option label="申请材料" value="application" />
                <el-option label="项目文档" value="project" />
                <el-option label="财务数据" value="finance" />
                <el-option label="其他资料" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="submissionForm.description"
            type="textarea"
            :rows="3"
            placeholder="请详细描述上交资料的内容和要求..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="截止日期" prop="deadline">
              <el-date-picker
                v-model="submissionForm.deadline"
                type="datetime"
                placeholder="选择截止日期时间"
                style="width: 100%"
                :disabled-date="disabledDate"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="submissionForm.priority" style="width: 100%">
                <el-option label="普通" value="normal" />
                <el-option label="重要" value="important" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="上传资料" prop="files">
          <el-upload
            ref="uploadRef"
            :action="uploadAction"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :on-remove="handleRemoveFile"
            :before-upload="beforeUpload"
            :file-list="fileList"
            multiple
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                支持上传Word、Excel、PDF等格式文件，单个文件不超过50MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="submissionForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注说明（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseCreateDialog"> 取消 </el-button>
          <el-button @click="handleSaveDraft" :loading="submitting"> 保存草稿 </el-button>
          <el-button type="primary" @click="handleSubmitDirectly" :loading="submitting">
            直接提交
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 任务详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="上交任务详情"
      width="900px"
      :before-close="handleCloseDetailDialog"
      destroy-on-close
    >
      <div v-if="currentSubmission" class="submission-detail">
        <!-- 任务基本信息 -->
        <el-card shadow="never" class="detail-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">基本信息</span>
              <div class="card-actions">
                <el-tag :type="getStatusTagType(currentSubmission.status)" size="large">
                  {{ getStatusLabel(currentSubmission.status) }}
                </el-tag>
                <el-tag
                  v-if="currentSubmission.priority !== 'normal'"
                  :type="getPriorityTagType(currentSubmission.priority)"
                  size="large"
                >
                  {{ getPriorityLabel(currentSubmission.priority) }}
                </el-tag>
              </div>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="任务编号">
              <el-tag type="info">{{ currentSubmission.submissionCode }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="接收部门">
              <el-tag :type="getDepartmentTagColor(currentSubmission.department)">
                {{ getDepartmentLabel(currentSubmission.department) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="任务标题" :span="2">
              {{ currentSubmission.title }}
            </el-descriptions-item>
            <el-descriptions-item label="资料类型">
              {{ getTypeLabel(currentSubmission.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="优先级">
              {{ getPriorityLabel(currentSubmission.priority) }}
            </el-descriptions-item>
            <el-descriptions-item label="任务描述" :span="2">
              {{ currentSubmission.description }}
            </el-descriptions-item>
            <el-descriptions-item label="截止日期">
              <span
                :class="{
                  'text-danger':
                    isOverdue(currentSubmission.deadline) &&
                    currentSubmission.status !== 'approved',
                }"
              >
                {{ formatDateTime(currentSubmission.deadline) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(currentSubmission.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="提交时间" v-if="currentSubmission.submittedAt">
              {{ formatDateTime(currentSubmission.submittedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="审核时间" v-if="currentSubmission.reviewedAt">
              {{ formatDateTime(currentSubmission.reviewedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="审核意见" :span="2" v-if="currentSubmission.reviewComment">
              <span :class="{ 'text-danger': currentSubmission.status === 'rejected' }">
                {{ currentSubmission.reviewComment }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 已上传文件列表 -->
        <el-card shadow="never" class="detail-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">已上传文件 ({{ uploadedFiles.length }})</span>
            </div>
          </template>
          <el-table :data="uploadedFiles" stripe border style="width: 100%">
            <el-table-column
              prop="fileName"
              label="文件名称"
              min-width="200"
              show-overflow-tooltip
            />
            <el-table-column prop="fileType" label="文件类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.fileType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="fileSize" label="文件大小" width="100" />
            <el-table-column prop="uploadedAt" label="上传时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.uploadedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button-group>
                  <el-button type="primary" size="small" link @click="handleDownloadFile(row)">
                    <el-icon><Download /></el-icon>
                    下载
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    link
                    @click="handleDeleteFile(row)"
                    v-if="['draft', 'rejected'].includes(currentSubmission.status)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-dialog>

    <!-- 提交确认对话框 -->
    <el-dialog v-model="showSubmitConfirmDialog" title="确认提交" width="500px">
      <el-result
        icon="warning"
        title="确认要提交资料吗？"
        sub-title="提交后将进入审核流程，暂无法修改"
      >
        <template #extra>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="任务标题">
              {{ submitConfirmData.title }}
            </el-descriptions-item>
            <el-descriptions-item label="接收部门">
              {{ getDepartmentLabel(submitConfirmData.department) }}
            </el-descriptions-item>
            <el-descriptions-item label="文件数量">
              {{ submitConfirmData.fileCount }} 个
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </el-result>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSubmitConfirmDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmSubmit" :loading="submitting">
            确认提交
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Upload,
  Plus,
  Document,
  Clock,
  CircleCheck,
  Warning,
  Search,
  Refresh,
  View,
  Edit,
  Delete,
  Download,
  UploadFilled,
  OfficeBuilding,
  Grape,
  User,
  Money,
  More,
} from '@element-plus/icons-vue';
import { submissionApi } from '@/api/cadre';

// ==================== 响应式状态 ====================
const loading = ref(false);
const submitting = ref(false);

// 筛选条件
const filters = reactive({
  search: '',
  department: '',
  type: '',
  status: '',
});

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 统计数据
const stats = reactive({
  totalSubmissions: 0,
  pendingSubmissions: 0,
  approvedSubmissions: 0,
  rejectedSubmissions: 0,
});

// 上交任务列表
const submissionList = ref([]);
const selectedSubmissions = ref([]);

// 对话框状态
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const showSubmitConfirmDialog = ref(false);
const editingSubmission = ref(null);
const currentSubmission = ref(null);

// 已上传文件列表
const uploadedFiles = ref([]);
const fileList = ref([]);
const uploadRef = ref(null);

// 提交确认数据
const submitConfirmData = reactive({
  title: '',
  department: '',
  fileCount: 0,
  submissionId: '',
});

// ==================== 表单数据 ====================
const submissionForm = reactive({
  title: '',
  department: '',
  type: '',
  description: '',
  deadline: null,
  priority: 'normal',
  files: [],
  remark: '',
});

const submissionFormRules = {
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在5到100个字符', trigger: 'blur' },
  ],
  department: [{ required: true, message: '请选择接收部门', trigger: 'change' }],
  type: [{ required: true, message: '请选择资料类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入任务描述', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止日期', trigger: 'change' }],
};

// 表单引用
const submissionFormRef = ref(null);

// 上传配置
const uploadAction = computed(() => {
  return '/api/v1/cadre/submission/upload';
});

const uploadHeaders = computed(() => {
  return {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };
});

// ==================== 方法 ====================

/**
 * 加载上交任务列表
 */
const loadSubmissionList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters,
    };

    // 清理空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });

    const response = await submissionApi.getSubmissionTasks(params);

    if (response.success) {
      submissionList.value = response.data.tasks || [];
      pagination.total = response.pagination?.total || 0;
    } else {
      ElMessage.error(response.message || '获取任务列表失败');
    }
  } catch (error) {
    console.error('加载任务列表失败:', error);
    // 使用模拟数据
    loadMockSubmissions();
  } finally {
    loading.value = false;
  }
};

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    const response = await submissionApi.getSubmissionStats();
    if (response.success) {
      Object.assign(stats, response.data);
    }
  } catch (error) {
    // 使用模拟数据
    stats.totalSubmissions = 28;
    stats.pendingSubmissions = 12;
    stats.approvedSubmissions = 14;
    stats.rejectedSubmissions = 2;
  }
};

/**
 * 加载模拟数据
 */
const loadMockSubmissions = () => {
  submissionList.value = [
    {
      _id: '1',
      submissionCode: 'SUB202401001',
      title: '2024年第一季度村务工作报告',
      department: 'township',
      type: 'report',
      description: '汇报本季度村内各项工作开展情况',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      priority: 'important',
      submittedAt: null,
      reviewedAt: null,
      reviewComment: null,
      createdAt: new Date().toISOString(),
    },
    {
      _id: '2',
      submissionCode: 'SUB202401002',
      title: '农村危房改造申请材料',
      department: 'civil',
      type: 'application',
      description: '提交本村危房改造户申请材料',
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      priority: 'urgent',
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      reviewComment: '材料齐全，审核通过',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      _id: '3',
      submissionCode: 'SUB202401003',
      title: '2023年度村级财务报表',
      department: 'finance',
      type: 'finance',
      description: '提交2023年度村级财务收支情况报表',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'rejected',
      priority: 'important',
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      reviewComment: '报表格式不正确，请按照标准格式重新提交',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  pagination.total = submissionList.value.length;
};

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1;
  loadSubmissionList();
};

/**
 * 重置筛选
 */
const handleReset = () => {
  filters.search = '';
  filters.department = '';
  filters.type = '';
  filters.status = '';
  pagination.page = 1;
  loadSubmissionList();
};

/**
 * 分页大小变化
 */
const handleSizeChange = size => {
  pagination.limit = size;
  loadSubmissionList();
};

/**
 * 页码变化
 */
const handleCurrentChange = page => {
  pagination.page = page;
  loadSubmissionList();
};

/**
 * 选择变化
 */
const handleSelectionChange = selection => {
  selectedSubmissions.value = selection;
};

/**
 * 查看详情
 */
const handleView = async row => {
  currentSubmission.value = row;
  showDetailDialog.value = true;

  try {
    const response = await submissionApi.getUploadedFiles(row._id);
    if (response.success) {
      uploadedFiles.value = response.data.files || [];
    }
  } catch (error) {
    // 使用模拟数据
    uploadedFiles.value = [
      {
        _id: '1',
        fileName: '工作报告.docx',
        fileType: 'docx',
        fileSize: '2.5 MB',
        uploadedAt: new Date().toISOString(),
      },
      {
        _id: '2',
        fileName: '统计报表.xlsx',
        fileType: 'xlsx',
        fileSize: '1.8 MB',
        uploadedAt: new Date().toISOString(),
      },
    ];
  }
};

/**
 * 编辑任务
 */
const handleEdit = row => {
  editingSubmission.value = row;

  // 加载已上传文件
  uploadedFiles.value = row.files || [];
  fileList.value = (row.files || []).map(file => ({
    name: file.fileName,
    url: file.url,
    uid: file._id,
  }));

  Object.assign(submissionForm, {
    title: row.title,
    department: row.department,
    type: row.type,
    description: row.description,
    deadline: new Date(row.deadline),
    priority: row.priority,
    files: row.files || [],
    remark: row.remark || '',
  });

  showCreateDialog.value = true;
};

/**
 * 提交任务
 */
const handleSubmit = row => {
  submitConfirmData.title = row.title;
  submitConfirmData.department = row.department;
  submitConfirmData.fileCount = row.files?.length || 0;
  submitConfirmData.submissionId = row._id;
  showSubmitConfirmDialog.value = true;
};

/**
 * 下载回执
 */
const handleDownloadProof = async row => {
  try {
    ElMessage.info('正在生成回执...');
    const response = await submissionApi.downloadSubmissionProof(row._id);
    if (response.success) {
      // 下载文件
      ElMessage.success('回执下载成功');
    }
  } catch (error) {
    ElMessage.error('回执下载失败');
  }
};

/**
 * 删除任务
 */
const handleDelete = async row => {
  try {
    await ElMessageBox.confirm(`确定要删除任务 "${row.title}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await submissionApi.deleteSubmissionTask(row._id);
    if (response.success) {
      ElMessage.success('删除成功');
      loadSubmissionList();
      loadStats();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

/**
 * 保存草稿
 */
const handleSaveDraft = async () => {
  if (!submissionFormRef.value) return;

  try {
    await submissionFormRef.value.validate();

    submitting.value = true;

    const data = { ...submissionForm };
    if (data.deadline) {
      data.deadline = data.deadline.toISOString();
    }
    data.status = 'draft';

    let response;
    if (editingSubmission.value) {
      response = await submissionApi.updateSubmissionTask(editingSubmission.value._id, data);
    } else {
      response = await submissionApi.createSubmissionTask(data);
    }

    if (response.success) {
      ElMessage.success('草稿保存成功');
      handleCloseCreateDialog();
      loadSubmissionList();
      loadStats();
    } else {
      ElMessage.error(response.message || '保存失败');
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('保存失败');
      console.error('保存草稿失败:', error);
    }
  } finally {
    submitting.value = false;
  }
};

/**
 * 直接提交
 */
const handleSubmitDirectly = async () => {
  if (!submissionFormRef.value) return;

  try {
    await submissionFormRef.value.validate();

    if (submissionForm.files.length === 0) {
      ElMessage.warning('请至少上传一个文件');
      return;
    }

    submitting.value = true;

    const data = { ...submissionForm };
    if (data.deadline) {
      data.deadline = data.deadline.toISOString();
    }
    data.status = 'pending';

    let response;
    if (editingSubmission.value) {
      response = await submissionApi.updateSubmissionTask(editingSubmission.value._id, data);
    } else {
      response = await submissionApi.createSubmissionTask(data);
    }

    if (response.success) {
      ElMessage.success('提交成功，等待审核');
      handleCloseCreateDialog();
      loadSubmissionList();
      loadStats();
    } else {
      ElMessage.error(response.message || '提交失败');
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('提交失败');
      console.error('提交失败:', error);
    }
  } finally {
    submitting.value = false;
  }
};

/**
 * 确认提交
 */
const confirmSubmit = async () => {
  submitting.value = true;
  try {
    const response = await submissionApi.submitTask(submitConfirmData.submissionId);

    if (response.success) {
      ElMessage.success('提交成功，等待审核');
      showSubmitConfirmDialog.value = false;
      loadSubmissionList();
      loadStats();
    } else {
      ElMessage.error(response.message || '提交失败');
    }
  } catch (error) {
    ElMessage.error('提交失败');
    console.error('提交失败:', error);
  } finally {
    submitting.value = false;
  }
};

/**
 * 关闭创建对话框
 */
const handleCloseCreateDialog = () => {
  showCreateDialog.value = false;
  editingSubmission.value = null;
  resetSubmissionForm();
};

/**
 * 重置表单
 */
const resetSubmissionForm = () => {
  Object.keys(submissionForm).forEach(key => {
    if (key === 'priority') {
      submissionForm[key] = 'normal';
    } else if (Array.isArray(submissionForm[key])) {
      submissionForm[key] = [];
    } else {
      submissionForm[key] = '';
    }
  });

  fileList.value = [];
  uploadedFiles.value = [];

  if (submissionFormRef.value) {
    submissionFormRef.value.resetFields();
  }
};

/**
 * 关闭详情对话框
 */
const handleCloseDetailDialog = () => {
  showDetailDialog.value = false;
  currentSubmission.value = null;
  uploadedFiles.value = [];
};

/**
 * 上传前校验
 */
const beforeUpload = file => {
  const isValidType = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ].includes(file.type);

  if (!isValidType) {
    ElMessage.error('只支持上传Word、Excel、PDF格式的文件');
    return false;
  }

  const isValidSize = file.size / 1024 / 1024 < 50;
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过50MB');
    return false;
  }

  return true;
};

/**
 * 上传成功
 */
const handleUploadSuccess = (response, file, fileList) => {
  if (response.success) {
    ElMessage.success('文件上传成功');
    submissionForm.files.push(response.data.file);
  } else {
    ElMessage.error(response.message || '文件上传失败');
  }
};

/**
 * 上传失败
 */
const handleUploadError = error => {
  ElMessage.error('文件上传失败');
  console.error('上传错误:', error);
};

/**
 * 删除文件
 */
const handleRemoveFile = file => {
  const index = submissionForm.files.findIndex(f => f._id === file.uid);
  if (index > -1) {
    submissionForm.files.splice(index, 1);
  }
};

/**
 * 下载文件
 */
const handleDownloadFile = file => {
  ElMessage.info('正在下载文件...');
  // 实现文件下载逻辑
};

/**
 * 删除文件
 */
const handleDeleteFile = async file => {
  try {
    await ElMessageBox.confirm('确定要删除这个文件吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await submissionApi.deleteUploadedFile(file._id);
    if (response.success) {
      ElMessage.success('删除成功');
      if (currentSubmission.value) {
        handleView(currentSubmission.value);
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

/**
 * 批量提交
 */
const handleBatchSubmit = async () => {
  try {
    const canSubmit = selectedSubmissions.value.filter(
      s => ['draft', 'rejected'].includes(s.status) && s.files.length > 0
    );

    if (canSubmit.length === 0) {
      ElMessage.warning('没有可以提交的任务');
      return;
    }

    await ElMessageBox.confirm(`确定要提交选中的 ${canSubmit.length} 个任务吗？`, '批量提交', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    });

    const ids = canSubmit.map(t => t._id);
    const response = await submissionApi.batchSubmit(ids);

    if (response.success) {
      ElMessage.success('批量提交成功');
      loadSubmissionList();
      loadStats();
      selectedSubmissions.value = [];
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量提交失败');
    }
  }
};

/**
 * 批量导出
 */
const handleBatchExport = async () => {
  try {
    ElMessage.info('正在导出...');
    const ids = selectedSubmissions.value.map(t => t._id);
    const response = await submissionApi.batchExport(ids);

    if (response.success) {
      ElMessage.success('导出成功');
    }
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedSubmissions.value.length} 个任务吗？`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const ids = selectedSubmissions.value.map(t => t._id);
    const response = await submissionApi.batchDeleteTasks(ids);

    if (response.success) {
      ElMessage.success('删除成功');
      loadSubmissionList();
      loadStats();
      selectedSubmissions.value = [];
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

/**
 * 禁用过去的日期
 */
const disabledDate = time => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000;
};

// ==================== 工具函数 ====================

/**
 * 格式化日期
 */
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

/**
 * 格式化日期时间
 */
const formatDateTime = dateTime => {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('zh-CN');
};

/**
 * 判断是否逾期
 */
const isOverdue = deadline => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

/**
 * 获取部门标签颜色
 */
const getDepartmentTagColor = department => {
  const colorMap = {
    township: 'primary',
    county: 'success',
    city: 'warning',
    agriculture: 'success',
    civil: 'info',
    finance: 'danger',
    other: '',
  };
  return colorMap[department] || '';
};

/**
 * 获取部门标签文本
 */
const getDepartmentLabel = department => {
  const labelMap = {
    township: '乡镇政府',
    county: '县政府',
    city: '市政府',
    agriculture: '农业局',
    civil: '民政局',
    finance: '财政局',
    other: '其他部门',
  };
  return labelMap[department] || department;
};

/**
 * 获取类型标签文本
 */
const getTypeLabel = type => {
  const labelMap = {
    statistics: '统计报表',
    report: '工作报告',
    application: '申请材料',
    project: '项目文档',
    finance: '财务数据',
    other: '其他资料',
  };
  return labelMap[type] || type;
};

/**
 * 获取状态标签类型
 */
const getStatusTagType = status => {
  const typeMap = {
    draft: 'info',
    pending: 'warning',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger',
  };
  return typeMap[status] || 'info';
};

/**
 * 获取状态标签文本
 */
const getStatusLabel = status => {
  const labelMap = {
    draft: '草稿',
    pending: '待提交',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '被驳回',
  };
  return labelMap[status] || status;
};

/**
 * 获取优先级标签类型
 */
const getPriorityTagType = priority => {
  const typeMap = {
    normal: '',
    important: 'warning',
    urgent: 'danger',
  };
  return typeMap[priority] || '';
};

/**
 * 获取优先级标签文本
 */
const getPriorityLabel = priority => {
  const labelMap = {
    normal: '普通',
    important: '重要',
    urgent: '紧急',
  };
  return labelMap[priority] || priority;
};

// ==================== 生命周期 ====================
onMounted(() => {
  loadSubmissionList();
  loadStats();
});
</script>

<style lang="scss" scoped>
.data-submission {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

// ==================== 页面头部 ====================
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;

  .header-content {
    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 12px;

      @media (max-width: 768px) {
        font-size: 20px;
      }
    }

    .subtitle {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }
}

// ==================== 统计卡片 ====================
.stats-cards {
  margin-bottom: 20px;

  .stat-card {
    height: 100px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    :deep(.el-card__body) {
      padding: 20px;
      height: 100%;
    }

    .stat-content {
      display: flex;
      align-items: center;
      height: 100%;
      gap: 16px;

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;

        .stat-card.total & {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .stat-card.pending & {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .stat-card.approved & {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }

        .stat-card.rejected & {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
          color: white;
        }
      }

      .stat-info {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #303133;
          line-height: 1.2;

          @media (max-width: 768px) {
            font-size: 24px;
          }
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 4px;
        }
      }
    }
  }
}

// ==================== 筛选卡片 ====================
.filter-card {
  margin-bottom: 20px;
}

// ==================== 表格卡片 ====================
.table-card {
  :deep(.el-card__body) {
    padding: 0;
  }

  .text-danger {
    color: #f56c6c;
    font-weight: 600;
  }

  .text-muted {
    color: #909399;
  }

  .pagination-container {
    padding: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

// ==================== 批量操作 ====================
.batch-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 90%;
  max-width: 800px;

  .batch-content {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 12px 20px;

    .batch-info {
      flex: 1;
      font-size: 14px;

      strong {
        color: #409eff;
        font-size: 18px;
        margin: 0 4px;
      }
    }

    .batch-buttons {
      display: flex;
      gap: 8px;
    }
  }
}

// ==================== 对话框样式 ====================
.dialog-footer {
  text-align: right;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

// ==================== 任务详情 ====================
.submission-detail {
  .detail-card {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .card-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }

      .card-actions {
        display: flex;
        gap: 8px;
      }
    }
  }
}

// ==================== 响应式优化 ====================
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;

    .el-button {
      width: 100%;
    }
  }

  .stats-cards {
    .el-col {
      margin-bottom: 10px;
    }
  }

  :deep(.el-form--inline .el-form-item) {
    display: block;
    margin-right: 0;
    margin-bottom: 12px;

    .el-form-item__content {
      width: 100% !important;
    }
  }

  .batch-actions {
    width: 95%;
    bottom: 10px;

    .batch-content {
      flex-direction: column;
      gap: 12px;

      .batch-buttons {
        width: 100%;
        flex-wrap: wrap;

        .el-button {
          flex: 1;
          min-width: 100px;
        }
      }
    }
  }
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
