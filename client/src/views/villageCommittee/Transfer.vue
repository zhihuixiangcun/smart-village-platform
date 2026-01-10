<template>
  <div class="transfer-container">
    <!-- 搜索和操作栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="申请人">
          <el-input
            v-model="searchForm.applicant"
            placeholder="请输入申请人姓名"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="调任类型">
          <el-select v-model="searchForm.type" placeholder="请选择类型" clearable>
            <el-option label="升职" value="promotion" />
            <el-option label="降职" value="demotion" />
            <el-option label="平调" value="lateral" />
            <el-option label="离职" value="resign" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="待审核" value="pending" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="已批准" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已完成" value="completed" />
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

      <div class="action-bar">
        <el-button type="primary" @click="showApplyDialog = true">
          <el-icon><Plus /></el-icon>
          发起调任申请
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出记录
        </el-button>
      </div>
    </el-card>

    <!-- 流程统计 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="6" :md="4" v-for="stat in transferStats" :key="stat.key">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <el-icon class="stat-icon" :size="30" :color="stat.color">
              <component :is="stat.icon" />
            </el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 调任申请列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>调任申请列表</span>
          <el-radio-group v-model="viewMode" @change="handleViewModeChange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="pending">待处理</el-radio-button>
            <el-radio-button label="my">我的申请</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="filteredTransfers"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="applicant" label="申请人" width="100" />
        <el-table-column prop="type" label="调任类型" width="100">
          <template #default="scope">
            <el-tag :type="getTransferTypeTagType(scope.row.type)">
              {{ getTransferTypeText(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="originalPosition" label="原职务" width="120" />
        <el-table-column prop="newPosition" label="新职务" width="120">
          <template #default="scope">
            {{ scope.row.type === 'resign' ? '离职' : scope.row.newPosition }}
          </template>
        </el-table-column>
        <el-table-column prop="effectiveDate" label="生效日期" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.effectiveDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="currentStep" label="当前节点" width="120" />
        <el-table-column prop="createdAt" label="申请时间" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleViewDetail(scope.row)">
              查看
            </el-button>
            <el-button
              v-if="canReview(scope.row)"
              type="success"
              size="small"
              @click="handleReview(scope.row)"
            >
              审核流转
            </el-button>
            <el-dropdown @command="command => handleAction(command, scope.row)">
              <el-button type="info" size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="timeline">查看流程</el-dropdown-item>
                  <el-dropdown-item command="documents">相关文档</el-dropdown-item>
                  <el-dropdown-item command="withdraw" v-if="canWithdraw(scope.row)"
                    >撤回申请</el-dropdown-item
                  >
                  <el-dropdown-item command="delete" divided v-if="canDelete(scope.row)"
                    >删除</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 发起调任申请对话框 -->
    <el-dialog v-model="showApplyDialog" title="发起调任申请" width="700px" :fullscreen="isMobile">
      <el-form ref="applyFormRef" :model="applyForm" :rules="applyRules" label-width="120px">
        <el-form-item label="申请人" prop="applicantId">
          <el-select
            v-model="applyForm.applicantId"
            placeholder="请选择申请人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="member in committeeStore.activeMembers"
              :key="member.id"
              :label="`${member.name} - ${member.position}`"
              :value="member.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="调任类型" prop="type">
          <el-radio-group v-model="applyForm.type">
            <el-radio label="promotion">升职</el-radio>
            <el-radio label="demotion">降职</el-radio>
            <el-radio label="lateral">平调</el-radio>
            <el-radio label="resign">离职</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="新职务" prop="newPosition" v-if="applyForm.type !== 'resign'">
          <el-select v-model="applyForm.newPosition" placeholder="请选择新职务">
            <el-option
              v-for="pos in positionOptions"
              :key="pos.value"
              :label="pos.label"
              :value="pos.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="生效日期" prop="effectiveDate">
          <el-date-picker
            v-model="applyForm.effectiveDate"
            type="date"
            placeholder="选择生效日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="调任原因" prop="reason">
          <el-input
            v-model="applyForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请详细说明调任原因"
          />
        </el-form-item>

        <el-form-item label="工作交接" prop="handover">
          <el-input
            v-model="applyForm.handover"
            type="textarea"
            :rows="3"
            placeholder="请说明工作交接安排"
          />
        </el-form-item>

        <el-form-item label="附件上传">
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :file-list="fileList"
            multiple
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持上传任命文件、申请表等文档，单个文件不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showApplyDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitApply" :loading="submitting">
          提交申请
        </el-button>
      </template>
    </el-dialog>

    <!-- 调任详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="调任申请详情" width="900px" :fullscreen="isMobile">
      <div class="detail-content" v-if="currentTransfer">
        <!-- 申请信息 -->
        <el-descriptions title="申请信息" :column="2" border>
          <el-descriptions-item label="申请编号">{{ currentTransfer.id }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{
            currentTransfer.applicant
          }}</el-descriptions-item>
          <el-descriptions-item label="调任类型">
            <el-tag :type="getTransferTypeTagType(currentTransfer.type)">
              {{ getTransferTypeText(currentTransfer.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请状态">
            <el-tag :type="getStatusTagType(currentTransfer.status)">
              {{ getStatusText(currentTransfer.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="原职务">{{
            currentTransfer.originalPosition
          }}</el-descriptions-item>
          <el-descriptions-item label="新职务">
            {{ currentTransfer.type === 'resign' ? '离职' : currentTransfer.newPosition }}
          </el-descriptions-item>
          <el-descriptions-item label="生效日期">{{
            formatDate(currentTransfer.effectiveDate)
          }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{
            formatDate(currentTransfer.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">{{
            currentTransfer.reason
          }}</el-descriptions-item>
          <el-descriptions-item label="工作交接" :span="2">{{
            currentTransfer.handover || '无'
          }}</el-descriptions-item>
        </el-descriptions>

        <!-- 审批流程 -->
        <div class="process-section">
          <h4>审批流程</h4>
          <el-steps :active="getCurrentStep(currentTransfer)" direction="vertical">
            <el-step
              v-for="step in processSteps"
              :key="step.key"
              :title="step.title"
              :description="step.description"
              :status="getStepStatus(currentTransfer, step.key)"
              :icon="step.icon"
            />
          </el-steps>
        </div>

        <!-- 相关文档 -->
        <div class="documents-section" v-if="currentTransfer.documents?.length">
          <h4>相关文档</h4>
          <el-table :data="currentTransfer.documents" style="width: 100%">
            <el-table-column prop="name" label="文档名称" />
            <el-table-column prop="type" label="文档类型" width="120" />
            <el-table-column prop="uploadTime" label="上传时间" width="150">
              <template #default="scope">
                {{ formatDate(scope.row.uploadTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="primary" size="small" @click="downloadDocument(scope.row)">
                  下载
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 操作按钮 -->
        <div class="detail-actions">
          <el-button
            v-if="canReview(currentTransfer)"
            type="success"
            @click="handleReview(currentTransfer)"
          >
            审核流转
          </el-button>
          <el-button
            v-if="canWithdraw(currentTransfer)"
            type="warning"
            @click="handleWithdraw(currentTransfer)"
          >
            撤回申请
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog v-model="showReviewDialog" title="审核调任申请" width="600px" :fullscreen="isMobile">
      <el-form ref="reviewFormRef" :model="reviewForm" :rules="reviewRules" label-width="100px">
        <el-form-item label="审核结果" prop="result">
          <el-radio-group v-model="reviewForm.result">
            <el-radio label="approve">同意</el-radio>
            <el-radio label="reject">拒绝</el-radio>
            <el-radio label="forward">转交</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="审核意见" prop="comment">
          <el-input
            v-model="reviewForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入审核意见"
          />
        </el-form-item>

        <el-form-item label="转交给" prop="forwardTo" v-if="reviewForm.result === 'forward'">
          <el-select v-model="reviewForm.forwardTo" placeholder="请选择转交人" filterable>
            <el-option
              v-for="member in committeeStore.activeMembers"
              :key="member.id"
              :label="`${member.name} - ${member.position}`"
              :value="member.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showReviewDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitReview" :loading="reviewing">
          提交审核
        </el-button>
      </template>
    </el-dialog>

    <!-- 流程时间线对话框 -->
    <el-dialog
      v-model="showTimelineDialog"
      title="审批流程时间线"
      width="700px"
      :fullscreen="isMobile"
    >
      <el-timeline>
        <el-timeline-item
          v-for="item in timelineData"
          :key="item.id"
          :timestamp="formatDateTime(item.timestamp)"
          :type="item.type"
          :icon="item.icon"
        >
          <el-card class="timeline-card">
            <div class="timeline-header">
              <span class="timeline-title">{{ item.title }}</span>
              <el-tag :type="item.status" size="small">{{ item.statusText }}</el-tag>
            </div>
            <div class="timeline-content" v-if="item.content">
              {{ item.content }}
            </div>
            <div class="timeline-footer" v-if="item.operator">操作人：{{ item.operator }}</div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCommitteeStore } from '@/stores/villageCommittee/committeeStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  Plus,
  Download,
  ArrowDown,
  UploadFilled,
  User,
  Warning,
  SuccessFilled,
  CircleCheckFilled,
  CircleCloseFilled,
  Connection,
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const committeeStore = useCommitteeStore();

// 响应式数据
const searchForm = ref({
  applicant: '',
  type: '',
  status: '',
});

const viewMode = ref('all');
const loading = ref(false);
const isMobile = ref(false);

const showApplyDialog = ref(false);
const showDetailDialog = ref(false);
const showReviewDialog = ref(false);
const showTimelineDialog = ref(false);
const submitting = ref(false);
const reviewing = ref(false);

const applyFormRef = ref();
const reviewFormRef = ref();

const currentTransfer = ref(null);
const selectedTransfers = ref([]);
const fileList = ref([]);

const pagination = ref({
  page: 1,
  size: 20,
  total: 0,
});

const applyForm = ref({
  applicantId: '',
  type: '',
  newPosition: '',
  effectiveDate: '',
  reason: '',
  handover: '',
});

const reviewForm = ref({
  result: '',
  comment: '',
  forwardTo: '',
});

// 调任统计数据
const transferStats = ref([
  {
    key: 'total',
    label: '总申请数',
    value: '45',
    icon: 'Document',
    color: '#409eff',
  },
  {
    key: 'pending',
    label: '待处理',
    value: '8',
    icon: 'Clock',
    color: '#e6a23c',
  },
  {
    key: 'approved',
    label: '已批准',
    value: '32',
    icon: 'SuccessFilled',
    color: '#67c23a',
  },
  {
    key: 'rejected',
    label: '已拒绝',
    value: '5',
    icon: 'CircleCloseFilled',
    color: '#f56c6c',
  },
]);

// 职务选项
const positionOptions = [
  { label: '村支书', value: 'secretary' },
  { label: '村主任', value: 'director' },
  { label: '副主任', value: 'deputy_director' },
  { label: '会计', value: 'accountant' },
  { label: '妇联主任', value: 'women_director' },
  { label: '治保主任', value: 'security_director' },
  { label: '民兵连长', value: 'militia_commander' },
  { label: '文书', value: 'clerk' },
  { label: '委员', value: 'member' },
];

// 流程步骤
const processSteps = ref([
  {
    key: 'apply',
    title: '发起申请',
    description: '申请人提交调任申请',
    icon: 'Edit',
  },
  {
    key: 'department',
    title: '部门审核',
    description: '相关部门负责人审核',
    icon: 'User',
  },
  {
    key: 'committee',
    title: '村委审核',
    description: '村委会集体讨论',
    icon: 'Connection',
  },
  {
    key: 'government',
    title: '乡镇审批',
    description: '乡镇政府批准',
    icon: 'SuccessFilled',
  },
  {
    key: 'complete',
    title: '完成调任',
    description: '办理调任手续',
    icon: 'CircleCheckFilled',
  },
]);

// 模拟数据
const transfers = ref([
  {
    id: 'TR202412001',
    applicant: '张三',
    applicantId: '1',
    type: 'promotion',
    originalPosition: '委员',
    newPosition: '副主任',
    effectiveDate: '2024-12-25',
    status: 'pending',
    currentStep: 'department',
    createdAt: '2024-12-19',
    reason: '工作能力突出，符合升职条件',
    handover: '原工作将交接给李四',
    documents: [
      {
        name: '任命文件.pdf',
        type: '任命文件',
        uploadTime: '2024-12-19',
      },
    ],
  },
  {
    id: 'TR202412002',
    applicant: '李四',
    applicantId: '2',
    type: 'resign',
    originalPosition: '会计',
    newPosition: '',
    effectiveDate: '2024-12-31',
    status: 'approved',
    currentStep: 'complete',
    createdAt: '2024-12-10',
    reason: '个人健康原因申请离职',
    handover: '账目已清，将交接给王五',
  },
]);

const timelineData = ref([
  {
    id: 1,
    title: '发起申请',
    content: '张三提交了升职申请',
    timestamp: '2024-12-19 09:00',
    operator: '张三',
    type: 'primary',
    status: 'success',
    statusText: '已完成',
    icon: 'Edit',
  },
  {
    id: 2,
    title: '部门审核',
    content: '等待部门负责人审核',
    timestamp: '2024-12-19 10:00',
    operator: '',
    type: '',
    status: 'warning',
    statusText: '进行中',
    icon: 'User',
  },
]);

// 表单验证规则
const applyRules = {
  applicantId: [{ required: true, message: '请选择申请人', trigger: 'change' }],
  type: [{ required: true, message: '请选择调任类型', trigger: 'change' }],
  newPosition: [{ required: true, message: '请选择新职务', trigger: 'change' }],
  effectiveDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }],
  reason: [
    { required: true, message: '请输入调任原因', trigger: 'blur' },
    { min: 20, max: 500, message: '长度在 20 到 500 个字符', trigger: 'blur' },
  ],
};

const reviewRules = {
  result: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
  comment: [
    { required: true, message: '请输入审核意见', trigger: 'blur' },
    { min: 10, max: 200, message: '长度在 10 到 200 个字符', trigger: 'blur' },
  ],
  forwardTo: [{ required: true, message: '请选择转交人', trigger: 'change' }],
};

// 计算属性
const filteredTransfers = computed(() => {
  let result = transfers.value;

  // 搜索过滤
  if (searchForm.value.applicant) {
    result = result.filter(t => t.applicant.includes(searchForm.value.applicant));
  }

  if (searchForm.value.type) {
    result = result.filter(t => t.type === searchForm.value.type);
  }

  if (searchForm.value.status) {
    result = result.filter(t => t.status === searchForm.value.status);
  }

  // 视图模式过滤
  if (viewMode.value === 'pending') {
    result = result.filter(t => t.status === 'pending' || t.status === 'reviewing');
  } else if (viewMode.value === 'my') {
    // 这里应该根据当前用户过滤
    result = result.filter(t => t.applicantId === '1'); // 假设当前用户ID为1
  }

  pagination.value.total = result.length;
  const start = (pagination.value.page - 1) * pagination.value.size;
  const end = start + pagination.value.size;
  return result.slice(start, end);
});

// 方法
const handleSearch = () => {
  pagination.value.page = 1;
};

const handleReset = () => {
  searchForm.value = {
    applicant: '',
    type: '',
    status: '',
  };
  pagination.value.page = 1;
};

const handleViewModeChange = mode => {
  viewMode.value = mode;
  pagination.value.page = 1;
};

const handleSelectionChange = selection => {
  selectedTransfers.value = selection;
};

const handleSizeChange = size => {
  pagination.value.size = size;
  pagination.value.page = 1;
};

const handleCurrentChange = page => {
  pagination.value.page = page;
};

const handleViewDetail = row => {
  currentTransfer.value = row;
  showDetailDialog.value = true;
};

const handleReview = row => {
  currentTransfer.value = row;
  reviewForm.value = {
    result: '',
    comment: '',
    forwardTo: '',
  };
  showReviewDialog.value = true;
};

const handleAction = (command, row) => {
  currentTransfer.value = row;

  switch (command) {
    case 'timeline':
      showTimelineDialog.value = true;
      break;
    case 'documents':
      handleViewDocuments(row);
      break;
    case 'withdraw':
      handleWithdraw(row);
      break;
    case 'delete':
      handleDelete(row);
      break;
  }
};

const handleViewDocuments = row => {
  ElMessage.info('查看相关文档');
};

const handleWithdraw = row => {
  ElMessageBox.confirm(`确定要撤回 ${row.applicant} 的调任申请吗？`, '撤回确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    ElMessage.success('申请已撤回');
  });
};

const handleDelete = row => {
  ElMessageBox.confirm(`确定要删除这条调任申请记录吗？`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'error',
  }).then(() => {
    ElMessage.success('删除成功');
  });
};

const handleSubmitApply = async () => {
  if (!applyFormRef.value) return;

  await applyFormRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true;
      try {
        // 提交申请
        ElMessage.success('申请提交成功');
        showApplyDialog.value = false;
      } catch (error) {
        ElMessage.error('提交失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleSubmitReview = async () => {
  if (!reviewFormRef.value) return;

  await reviewFormRef.value.validate(async valid => {
    if (valid) {
      reviewing.value = true;
      try {
        // 提交审核
        ElMessage.success('审核提交成功');
        showReviewDialog.value = false;
      } catch (error) {
        ElMessage.error('审核失败');
      } finally {
        reviewing.value = false;
      }
    }
  });
};

const handleFileChange = file => {
  // 处理文件上传
  console.log('文件上传:', file);
};

const downloadDocument = doc => {
  ElMessage.success(`下载 ${doc.name}`);
};

const handleExport = () => {
  ElMessage.success('导出成功');
};

// 权限检查
const canReview = transfer => {
  // 根据当前用户权限和流程状态判断是否可以审核
  return transfer.status === 'pending' || transfer.status === 'reviewing';
};

const canWithdraw = transfer => {
  // 判断是否可以撤回
  return transfer.status === 'pending';
};

const canDelete = transfer => {
  // 判断是否可以删除
  return ['rejected', 'completed'].includes(transfer.status);
};

// 辅助函数
const formatDate = date => {
  return date ? dayjs(date).format('YYYY-MM-DD') : '';
};

const formatDateTime = datetime => {
  return datetime ? dayjs(datetime).format('YYYY-MM-DD HH:mm') : '';
};

const getTransferTypeTagType = type => {
  const typeMap = {
    promotion: 'success',
    demotion: 'warning',
    lateral: 'primary',
    resign: 'info',
  };
  return typeMap[type] || '';
};

const getTransferTypeText = type => {
  const textMap = {
    promotion: '升职',
    demotion: '降职',
    lateral: '平调',
    resign: '离职',
  };
  return textMap[type] || type;
};

const getStatusTagType = status => {
  const typeMap = {
    pending: 'warning',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger',
    completed: 'info',
  };
  return typeMap[status] || '';
};

const getStatusText = status => {
  const textMap = {
    pending: '待审核',
    reviewing: '审核中',
    approved: '已批准',
    rejected: '已拒绝',
    completed: '已完成',
  };
  return textMap[status] || status;
};

const getCurrentStep = transfer => {
  const stepOrder = ['apply', 'department', 'committee', 'government', 'complete'];
  return stepOrder.indexOf(transfer.currentStep);
};

const getStepStatus = (transfer, stepKey) => {
  const currentStepIndex = getCurrentStep(transfer);
  const stepOrder = ['apply', 'department', 'committee', 'government', 'complete'];
  const stepIndex = stepOrder.indexOf(stepKey);

  if (stepIndex < currentStepIndex) {
    return 'finish';
  } else if (stepIndex === currentStepIndex) {
    return 'process';
  } else {
    return 'wait';
  }
};

// 生命周期
onMounted(async () => {
  isMobile.value = window.innerWidth < 768;

  try {
    await committeeStore.fetchMembers();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
</script>

<style lang="scss" scoped>
.transfer-container {
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

.search-card {
  margin-bottom: 20px;

  .search-form {
    margin-bottom: 20px;
  }

  .action-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}

.stats-row {
  margin-bottom: 20px;

  .stat-card {
    height: 100px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-5px);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 15px;

      .stat-info {
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #303133;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 5px;
        }
      }
    }
  }
}

.table-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

.detail-content {
  .process-section {
    margin-top: 30px;

    h4 {
      margin-bottom: 20px;
      color: #303133;
    }
  }

  .documents-section {
    margin-top: 30px;

    h4 {
      margin-bottom: 15px;
      color: #303133;
    }
  }

  .detail-actions {
    margin-top: 30px;
    text-align: center;

    .el-button {
      margin: 0 10px;
    }
  }
}

.timeline-card {
  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    .timeline-title {
      font-weight: 600;
      color: #303133;
    }
  }

  .timeline-content {
    color: #606266;
    margin-bottom: 8px;
  }

  .timeline-footer {
    font-size: 12px;
    color: #909399;
  }
}

// 响应式调整
@media (max-width: 768px) {
  .search-form {
    .el-form-item {
      margin-right: 0;
      width: 100%;

      .el-input,
      .el-select {
        width: 100%;
      }
    }
  }

  .action-bar {
    .el-button {
      flex: 1;
      margin: 5px 0;
    }
  }

  .stats-row {
    .el-col {
      margin-bottom: 10px;
    }
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .detail-actions {
    .el-button {
      display: block;
      width: 100%;
      margin: 10px 0;
    }
  }
}
</style>
