<template>
  <div class="village-announcement">
    <div class="page-header">
      <h2>村务公告</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          发布公告
        </el-button>
        <el-button type="info" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出公告
        </el-button>
      </div>
    </div>

    <!-- 快速筛选标签 -->
    <el-card class="filter-tags">
      <div class="tag-group">
        <span class="label">分类:</span>
        <el-tag
          v-for="category in categories"
          :key="category.value"
          :type="selectedCategory === category.value ? '' : 'info'"
          :effect="selectedCategory === category.value ? 'dark' : 'plain'"
          @click="handleCategoryChange(category.value)"
        >
          {{ category.label }}
        </el-tag>
      </div>
      <div class="tag-group">
        <span class="label">状态:</span>
        <el-tag
          v-for="status in statuses"
          :key="status.value"
          :type="selectedStatus === status.value ? '' : 'info'"
          :effect="selectedStatus === status.value ? 'dark' : 'plain'"
          @click="handleStatusChange(status.value)"
        >
          {{ status.label }}
        </el-tag>
      </div>
      <div class="tag-group">
        <span class="label">优先级:</span>
        <el-tag
          v-for="priority in priorities"
          :key="priority.value"
          :type="selectedPriority === priority.value ? '' : 'info'"
          :effect="selectedPriority === priority.value ? 'dark' : 'plain'"
          @click="handlePriorityChange(priority.value)"
        >
          {{ priority.label }}
        </el-tag>
      </div>
    </el-card>

    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="filters" @submit.prevent="handleSearch">
        <el-form-item>
          <el-input
            v-model="filters.keyword"
            placeholder="搜索公告标题或内容"
            clearable
            style="width: 300px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
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

    <!-- 公告列表 -->
    <el-card class="announcement-list">
      <template v-if="!loading">
        <div
          v-for="announcement in announcementList"
          :key="announcement.id"
          class="announcement-item"
          :class="{ 'is-important': announcement.priority === 'urgent' }"
        >
          <div class="announcement-header">
            <div class="title-row">
              <h3 class="title">
                <el-tag
                  v-if="announcement.priority === 'urgent'"
                  type="danger"
                  size="small"
                  effect="dark"
                >
                  紧急
                </el-tag>
                <el-tag
                  v-else-if="announcement.priority === 'high'"
                  type="warning"
                  size="small"
                  effect="dark"
                >
                  重要
                </el-tag>
                <el-tag
                  v-else-if="announcement.priority === 'medium'"
                  type="primary"
                  size="small"
                  effect="dark"
                >
                  一般
                </el-tag>
                {{ announcement.title }}
              </h3>
            </div>
            <div class="meta-row">
              <span class="category-tag">
                <el-tag :type="getCategoryTagType(announcement.category)" size="small">
                  {{ getCategoryLabel(announcement.category) }}
                </el-tag>
              </span>
              <span class="status-tag">
                <el-tag :type="getStatusTagType(announcement.status)" size="small">
                  {{ getStatusLabel(announcement.status) }}
                </el-tag>
              </span>
              <span class="author">发布人: {{ announcement.authorName }}</span>
              <span class="publish-time">
                {{ formatDateTime(announcement.publishedAt) }}
              </span>
            </div>
          </div>

          <div class="announcement-content">
            <div
              class="content-text"
              :class="{ expanded: announcement.expanded }"
              v-html="announcement.content"
            ></div>
            <el-button
              v-if="announcement.content.length > 200"
              type="text"
              size="small"
              @click="toggleExpand(announcement)"
            >
              {{ announcement.expanded ? '收起' : '展开全文' }}
            </el-button>
          </div>

          <div
            class="announcement-footer"
            v-if="announcement.attachments && announcement.attachments.length > 0"
          >
            <div class="attachments">
              <el-icon><Paperclip /></el-icon>
              <span>附件:</span>
              <div class="attachment-list">
                <el-link
                  v-for="attachment in announcement.attachments"
                  :key="attachment.id"
                  type="primary"
                  :href="attachment.url"
                  target="_blank"
                  class="attachment-item"
                >
                  <el-icon><Document /></el-icon>
                  {{ attachment.name }}
                </el-link>
              </div>
            </div>
          </div>

          <div class="announcement-actions">
            <el-button-group>
              <el-button size="small" type="primary" link @click="handleView(announcement)">
                查看
              </el-button>
              <el-button
                v-if="canEdit(announcement)"
                size="small"
                type="warning"
                link
                @click="handleEdit(announcement)"
              >
                编辑
              </el-button>
              <el-button
                v-if="canDelete(announcement)"
                size="small"
                type="danger"
                link
                @click="handleDelete(announcement)"
              >
                删除
              </el-button>
              <el-button size="small" type="info" link @click="handleShare(announcement)">
                分享
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <!-- 加载状态 -->
      <div v-else class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && announcementList.length === 0" class="empty-state">
        <el-empty description="暂无公告数据" />
      </div>
    </el-card>

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

    <!-- 公告详情对话框 -->
    <el-dialog
      v-model="detailDialog.visible"
      title="公告详情"
      width="80%"
      :before-close="handleCloseDetailDialog"
    >
      <div v-if="detailDialog.data" class="announcement-detail">
        <div class="detail-header">
          <h2>{{ detailDialog.data.title }}</h2>
          <div class="detail-meta">
            <el-tag :type="getCategoryTagType(detailDialog.data.category)">
              {{ getCategoryLabel(detailDialog.data.category) }}
            </el-tag>
            <el-tag :type="getPriorityTagType(detailDialog.data.priority)">
              {{ getPriorityLabel(detailDialog.data.priority) }}
            </el-tag>
            <el-tag :type="getStatusTagType(detailDialog.data.status)">
              {{ getStatusLabel(detailDialog.data.status) }}
            </el-tag>
          </div>
        </div>

        <div class="detail-content">
          <div class="content" v-html="detailDialog.data.content"></div>

          <div
            v-if="detailDialog.data.attachments && detailDialog.data.attachments.length > 0"
            class="attachments"
          >
            <h4>附件列表</h4>
            <div class="attachment-list">
              <div
                v-for="attachment in detailDialog.data.attachments"
                :key="attachment.id"
                class="attachment-item"
              >
                <el-icon><Document /></el-icon>
                <el-link :href="attachment.url" target="_blank">
                  {{ attachment.name }}
                </el-link>
                <span class="attachment-size">({{ formatFileSize(attachment.size) }})</span>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-footer">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="发布人">
              {{ detailDialog.data.authorName }}
            </el-descriptions-item>
            <el-descriptions-item label="发布时间">
              {{ formatDateTime(detailDialog.data.publishedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="过期时间">
              {{
                detailDialog.data.expiresAt
                  ? formatDateTime(detailDialog.data.expiresAt)
                  : '永久有效'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="阅读量">
              {{ detailDialog.data.readCount || 0 }} 次
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(detailDialog.data.createdAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-dialog>

    <!-- 创建/编辑公告对话框 -->
    <el-dialog
      v-model="formDialog.visible"
      :title="formDialog.isEdit ? '编辑公告' : '发布公告'"
      width="70%"
      :before-close="handleCloseFormDialog"
    >
      <el-form
        ref="announcementFormRef"
        :model="announcementForm"
        :rules="announcementFormRules"
        label-width="100px"
      >
        <el-form-item label="公告标题" prop="title">
          <el-input
            v-model="announcementForm.title"
            placeholder="请输入公告标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="公告分类" prop="category">
          <el-select
            v-model="announcementForm.category"
            placeholder="请选择分类"
            style="width: 100%"
          >
            <el-option label="一般公告" value="general" />
            <el-option label="紧急通知" value="emergency" />
            <el-option label="政策宣传" value="policy" />
            <el-option label="活动通知" value="activity" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="announcementForm.priority">
            <el-radio label="low">普通</el-radio>
            <el-radio label="medium">一般</el-radio>
            <el-radio label="high">重要</el-radio>
            <el-radio label="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="公告内容" prop="content">
          <el-input
            v-model="announcementForm.content"
            type="textarea"
            :rows="8"
            placeholder="请输入公告内容"
            maxlength="5000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="附件上传">
          <el-upload
            class="upload-demo"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :on-remove="handleRemoveFile"
            :file-list="fileList"
            multiple
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              选择文件
            </el-button>
            <template #tip>
              <div class="el-upload__tip">支持上传jpg/png/pdf文件，单个文件不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="发布设置">
          <el-col :span="12">
            <el-form-item label="发布时间">
              <el-date-picker
                v-model="announcementForm.publishTime"
                type="datetime"
                placeholder="选择发布时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="过期时间">
              <el-date-picker
                v-model="announcementForm.expireTime"
                type="datetime"
                placeholder="选择过期时间（可选）"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-form-item>

        <el-form-item label="目标用户" prop="targetUsers">
          <el-select
            v-model="announcementForm.targetUsers"
            multiple
            placeholder="选择目标用户（可选）"
            style="width: 100%"
          >
            <el-option
              v-for="user in targetUserOptions"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseFormDialog">取消</el-button>
          <el-button type="info" @click="handleSaveDraft">保存草稿</el-button>
          <el-button type="primary" @click="handleSubmitAnnouncement" :loading="submitting">
            {{ formDialog.isEdit ? '更新' : '发布' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Download,
  Search,
  Refresh,
  Link, // 替代 PaperClip
  Document,
  Upload,
} from '@element-plus/icons-vue';
import apiService from '@/services/apiService';

// 响应式数据
const loading = ref(false);
const submitting = ref(false);
const announcementList = ref([]);
const fileList = ref([]);

// 筛选条件
const filters = reactive({
  keyword: '',
  category: '',
  status: '',
  priority: '',
  dateRange: [],
});

// 选中的分类
const selectedCategory = ref('');
const selectedStatus = ref('');
const selectedPriority = ref('');

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

// 详情对话框
const detailDialog = reactive({
  visible: false,
  data: null,
});

// 表单对话框
const formDialog = reactive({
  visible: false,
  isEdit: false,
});

// 公告表单
const announcementForm = reactive({
  id: '',
  title: '',
  category: '',
  priority: 'medium',
  content: '',
  publishTime: '',
  expireTime: '',
  targetUsers: [],
  attachments: [],
});

// 表单验证规则
const announcementFormRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在5到100个字符', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择公告分类', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' },
    { min: 10, max: 5000, message: '内容长度在10到5000个字符', trigger: 'blur' },
  ],
};

// 表单引用
const announcementFormRef = ref(null);

// 分类选项
const categories = [
  { label: '全部', value: '' },
  { label: '一般公告', value: 'general' },
  { label: '紧急通知', value: 'emergency' },
  { label: '政策宣传', value: 'policy' },
  { label: '活动通知', value: 'activity' },
];

// 状态选项
const statuses = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { el: '已归档', value: 'archived' },
];

// 优先级选项
const priorities = [
  { label: '全部', value: '' },
  { label: '普通', value: 'low' },
  { label: '一般', value: 'medium' },
  { label: '重要', value: 'high' },
  { label: '紧急', value: 'urgent' },
];

// 目标用户选项
const targetUserOptions = ref([]);

// 上传配置
const uploadUrl = computed(
  () => `${import.meta.env.VITE_API_BASE_URL}/api/v1/announcements/upload`
);
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
}));

// 当前用户信息
const currentUser = computed(() => {
  const userInfo = localStorage.getItem('user_info');
  return userInfo ? JSON.parse(userInfo) : null;
});

// 方法
const loadAnnouncementList = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters,
      category: selectedCategory.value,
      status: selectedStatus.value,
      priority: selectedPriority.value,
    };

    // 清理空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || (Array.isArray(params[key]) && params[key].length === 0)) {
        delete params[key];
      }
    });

    // 处理日期范围
    if (params.dateRange && params.dateRange.length === 2) {
      params.startDate = params.dateRange[0];
      params.endDate = dateRange[1];
      delete params.dateRange;
    }

    const response = await apiService.getAnnouncementList(params);

    if (response.success) {
      announcementList.value = response.data.map(item => ({
        ...item,
        expanded: false,
        content: formatContent(item.content),
      }));
      pagination.total = response.pagination?.total || 0;
    } else {
      ElMessage.error(response.error || '获取公告列表失败');
    }
  } catch (error) {
    ElMessage.error('获取公告列表失败');
    console.error('加载公告列表错误:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadAnnouncementList();
};

const handleReset = () => {
  filters.keyword = '';
  filters.category = '';
  filters.status = '';
  filters.priority = '';
  filters.dateRange = [];
  selectedCategory.value = '';
  selectedStatus.value = '';
  selectedPriority.value = '';
  pagination.page = 1;
  loadAnnouncementList();
};

const handleCategoryChange = category => {
  selectedCategory.value = category;
  handleSearch();
};

const handleStatusChange = status => {
  selectedStatus.value = status;
  handleSearch();
};

const handlePriorityChange = priority => {
  selectedPriority.value = priority;
  handleSearch();
};

const handleSizeChange = size => {
  pagination.limit = size;
  loadAnnouncementList();
};

const handleCurrentChange = page => {
  pagination.page = page;
  loadAnnouncementList();
};

const handleView = announcement => {
  detailDialog.data = announcement;
  detailDialog.visible = true;
};

const handleEdit = announcement => {
  formDialog.isEdit = true;
  formDialog.visible = true;

  // 填充表单数据
  Object.keys(announcementForm).forEach(key => {
    if (key !== 'attachments') {
      announcementForm[key] = announcement[key] || '';
    }
  });

  // 处理附件
  if (announcement.attachments) {
    fileList.value = announcement.attachments.map(attachment => ({
      name: attachment.name,
      url: attachment.url,
      uid: attachment.id,
      status: 'success',
    }));
  }
};

const handleDelete = async announcement => {
  try {
    await ElMessageBox.confirm(`确定要删除公告"${announcement.title}"吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await apiService.deleteAnnouncement(announcement.id);

    if (response.success) {
      ElMessage.success('公告删除成功');
      loadAnnouncementList();
    } else {
      ElMessage.error(response.error || '删除公告失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除公告失败');
      console.error('删除公告错误:', error);
    }
  }
};

const handleShare = announcement => {
  // 实现分享功能
  if (navigator.share) {
    navigator.share({
      title: announcement.title,
      text: announcement.content,
      url: window.location.href,
    });
  } else {
    // 复制到剪贴板
    const text = `${announcement.title}\n${announcement.content}\n${window.location.href}`;
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success('链接已复制到剪贴板');
    });
  }
};

const showCreateDialog = () => {
  formDialog.isEdit = false;
  formDialog.visible = true;
  resetAnnouncementForm();
};

const resetAnnouncementForm = () => {
  Object.keys(announcementForm).forEach(key => {
    announcementForm[key] = key === 'priority' ? 'medium' : '';
  });

  // 设置默认发布时间
  announcementForm.publishTime = new Date().toISOString().slice(0, 16);
  fileList.value = [];

  if (announcementFormRef.value) {
    announcementFormRef.value.resetFields();
  }
};

const handleSubmitAnnouncement = async () => {
  if (!announcementFormRef.value) return;

  try {
    await announcementFormRef.value.validate();

    submitting.value = true;

    const formData = {
      ...announcementForm,
      attachments: fileList.value.map(file => ({
        name: file.name,
        url: file.url,
        size: file.size || 0,
        type: file.raw?.type || 'application/octet-stream',
      })),
    };

    let response;
    if (formDialog.isEdit) {
      response = await apiService.updateAnnouncement(announcementForm.id, formData);
    } else {
      response = await apiService.createAnnouncement(formData);
    }

    if (response.success) {
      ElMessage.success(formDialog.isEdit ? '公告更新成功' : '公告发布成功');
      handleCloseFormDialog();
      loadAnnouncementList();
    } else {
      ElMessage.error(response.error || '操作失败');
    }
  } catch (error) {
    if (error !== 'validation failed') {
      ElMessage.error('操作失败');
      console.error('提交公告表单错误:', error);
    }
  } finally {
    submitting.value = false;
  }
};

const handleSaveDraft = () => {
  // 实现保存草稿功能
  ElMessage.info('草稿保存功能开发中...');
};

const handleCloseFormDialog = () => {
  formDialog.visible = false;
  resetAnnouncementForm();
};

const handleCloseDetailDialog = () => {
  detailDialog.visible = false;
  detailDialog.data = null;
};

const toggleExpand = announcement => {
  announcement.expanded = !announcement.expanded;
};

const handleUploadSuccess = (response, file, fileList) => {
  ElMessage.success(`${file.name} 上传成功`);
};

const handleRemoveFile = (file, fileList) => {
  ElMessage.info(`${file.name} 已移除`);
};

const handleExport = () => {
  // 实现导出功能
  ElMessage.info('导出功能开发中...');
};

// 工具方法
const formatContent = content => {
  if (!content) return '';
  // 简单的内容格式化，可以扩展更复杂的富文本处理
  return content.replace(/\n/g, '<br>');
};

const formatDateTime = dateTime => {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleString('zh-CN');
};

const formatFileSize = size => {
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, index)).toFixed(2) + ' ' + units[index];
};

const getCategoryLabel = category => {
  const categoryMap = {
    general: '一般公告',
    emergency: '紧急通知',
    policy: '政策宣传',
    activity: '活动通知',
  };
  return categoryMap[category] || category;
};

const getCategoryTagType = category => {
  const typeMap = {
    general: '',
    emergency: 'danger',
    policy: 'warning',
    activity: 'success',
  };
  return typeMap[category] || 'info';
};

const getStatusLabel = status => {
  const statusMap = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };
  return statusMap[status] || status;
};

const getStatusTagType = status => {
  const typeMap = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
  };
  return typeMap[status] || 'info';
};

const getPriorityLabel = priority => {
  const priorityMap = {
    low: '普通',
    medium: '一般',
    high: '重要',
    urgent: '紧急',
  };
  return priorityMap[priority] || priority;
};

const getPriorityTagType = priority => {
  const typeMap = {
    low: 'info',
    medium: '',
    high: 'warning',
    urgent: 'danger',
  };
  return typeMap[priority] || 'info';
};

// 权限检查
const canEdit = announcement => {
  return (
    currentUser.value &&
    (currentUser.value.role === 'village_admin' ||
      currentUser.value.role === 'super_admin' ||
      announcement.authorId === currentUser.value.id)
  );
};

const canDelete = announcement => {
  return (
    currentUser.value &&
    (currentUser.value.role === 'village_admin' || currentUser.value.role === 'super_admin')
  );
};

// 加载目标用户选项
const loadTargetUsers = async () => {
  try {
    const response = await apiService.getUserList({ limit: 1000 });
    if (response.success && response.data.users) {
      targetUserOptions.value = response.data.users;
    }
  } catch (error) {
    console.error('加载目标用户失败:', error);
  }
};

// 生命周期
onMounted(() => {
  loadAnnouncementList();
  loadTargetUsers();
});
</script>

<style scoped>
.village-announcement {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-tags {
  margin-bottom: 20px;
}

.tag-group {
  display: flex;
  align-items: center;
  margin-right: 30px;
}

.tag-group .label {
  margin-right: 10px;
  font-weight: 500;
  color: #606266;
  min-width: 60px;
}

.search-card {
  margin-bottom: 20px;
}

.announcement-list {
  min-height: 400px;
}

.announcement-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.announcement-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.announcement-item.is-important {
  border-left: 4px solid #f56c6c;
}

.announcement-header {
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  margin: 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-row {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font-size: 14px;
  color: #909399;
}

.meta-row span {
  margin-right: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.category-tag,
.status-tag {
  margin-right: 8px;
}

.author {
  color: #606266;
}

.publish-time {
  color: #909399;
}

.announcement-content {
  padding: 16px;
}

.content-text {
  line-height: 1.6;
  color: #303133;
  word-break: break-word;
}

.content-text.expanded {
  max-height: none;
}

.announcement-footer {
  padding: 16px;
  border-top: 1px solid #ebeef5;
  background-color: #fafafa;
}

.attachments {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: #409eff;
}

.attachment-size {
  font-size: 12px;
  color: #909399;
}

.announcement-actions {
  padding: 16px;
  text-align: right;
}

.loading-container {
  padding: 20px;
}

.empty-state {
  padding: 40px;
  text-align: center;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

.announcement-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.detail-header h2 {
  margin: 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-meta {
  display: flex;
  gap: 8px;
}

.detail-content {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.content {
  line-height: 1.8;
  color: #303133;
  word-break: break-word;
}

.attachments {
  margin-bottom: 20px;
}

.attachments h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
}

.detail-footer {
  margin-top: 20px;
}

:deep(.el-tag) {
  margin-right: 4px;
}

:deep(.el-skeleton__item) {
  margin-bottom: 16px;
  border-radius: 4px;
}

.upload-demo {
  width: 100%;
}

:deep(.el-upload__tip) {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
</style>
