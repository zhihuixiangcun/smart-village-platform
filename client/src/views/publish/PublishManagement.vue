<template>
  <div class="publish-management">
    <!-- 头部 -->
    <div class="header">
      <el-page-header title="返回" @back="goBack">
        <template #content>
          <span class="page-title">发布管理</span>
        </template>
        <template #extra>
          <el-button type="primary" @click="showPublishDialog">
            <el-icon><Plus /></el-icon>
            快速发布
          </el-button>
        </template>
      </el-page-header>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6" v-for="stat in stats" :key="stat.key">
        <el-card class="stat-card" shadow="hover" :class="`stat-${stat.type}`">
          <div class="stat-content">
            <div class="stat-icon" :style="{ background: stat.color }">
              <component :is="stat.icon" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
          <div class="stat-footer">
            <span :class="stat.trend > 0 ? 'trend-up' : 'trend-down'">
              <el-icon><CaretTop v-if="stat.trend > 0" /><CaretBottom v-else /></el-icon>
              {{ Math.abs(stat.trend) }}%
            </span>
            <span class="stat-hint">较上月</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 主内容区域 -->
    <el-card class="main-card" shadow="never">
      <!-- 标签页 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 待审核 -->
        <el-tab-pane name="pending">
          <template #label>
            <el-badge :value="pendingCount" :hidden="pendingCount === 0" type="danger">
              <span>待审核</span>
            </el-badge>
          </template>
          <ReviewQueue :items="pendingItems" @approve="handleApprove" @reject="handleReject" />
        </el-tab-pane>

        <!-- 农业知识 -->
        <el-tab-pane name="agriculture">
          <template #label>
            <el-icon><Grid /></el-icon>
            <span>农业知识</span>
          </template>
          <ContentList
            type="agriculture"
            :items="agricultureItems"
            :loading="loading.agriculture"
            @refresh="fetchAgricultureItems"
            @edit="handleEdit"
            @delete="handleDelete"
            @publish="handleDirectPublish"
          />
        </el-tab-pane>

        <!-- 朋友圈动态 -->
        <el-tab-pane name="social">
          <template #label>
            <el-icon><ChatDotSquare /></el-icon>
            <span>朋友圈动态</span>
          </template>
          <ContentList
            type="social"
            :items="socialItems"
            :loading="loading.social"
            @refresh="fetchSocialItems"
            @edit="handleEdit"
            @delete="handleDelete"
            @publish="handleDirectPublish"
          />
        </el-tab-pane>

        <!-- 公告发布 -->
        <el-tab-pane name="announcement">
          <template #label>
            <el-icon><Bell /></el-icon>
            <span>公告发布</span>
          </template>
          <ContentList
            type="announcement"
            :items="announcementItems"
            :loading="loading.announcement"
            @refresh="fetchAnnouncementItems"
            @edit="handleEdit"
            @delete="handleDelete"
            @publish="handleDirectPublish"
          />
        </el-tab-pane>

        <!-- 村务公开 -->
        <el-tab-pane name="governance">
          <template #label>
            <el-icon><Document /></el-icon>
            <span>村务公开</span>
          </template>
          <ContentList
            type="governance"
            :items="governanceItems"
            :loading="loading.governance"
            @refresh="fetchGovernanceItems"
            @edit="handleEdit"
            @delete="handleDelete"
            @publish="handleDirectPublish"
          />
        </el-tab-pane>

        <!-- 财务公开 -->
        <el-tab-pane name="finance">
          <template #label>
            <el-icon><Coin /></el-icon>
            <span>财务公开</span>
          </template>
          <ContentList
            type="finance"
            :items="financeItems"
            :loading="loading.finance"
            @refresh="fetchFinanceItems"
            @edit="handleEdit"
            @delete="handleDelete"
            @publish="handleDirectPublish"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 快速发布对话框 -->
    <el-dialog
      v-model="publishDialogVisible"
      title="快速发布"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="publishForm" :rules="publishRules" ref="publishFormRef" label-width="100px">
        <el-form-item label="发布类型" prop="type">
          <el-radio-group v-model="publishForm.type">
            <el-radio-button label="agriculture">农业知识</el-radio-button>
            <el-radio-button label="social">朋友圈</el-radio-button>
            <el-radio-button label="announcement">公告</el-radio-button>
            <el-radio-button label="governance">村务</el-radio-button>
            <el-radio-button label="finance">财务</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="标题" prop="title">
          <el-input
            v-model="publishForm.title"
            placeholder="请输入标题"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <el-input
            v-model="publishForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入内容"
            maxlength="5000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="图片">
          <el-upload
            v-model:file-list="publishImageList"
            action="#"
            list-type="picture-card"
            :auto-upload="false"
            :limit="9"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-form-item label="发布设置">
          <el-checkbox v-model="publishForm.immediatePublish">立即发布</el-checkbox>
          <el-checkbox v-model="publishForm.notify" style="margin-left: 20px">
            通知相关人员
          </el-checkbox>
        </el-form-item>

        <el-form-item label="定时发布" v-if="!publishForm.immediatePublish">
          <el-date-picker
            v-model="publishForm.scheduledAt"
            type="datetime"
            placeholder="选择发布时间"
            :disabled-date="disabledDate"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePublish" :loading="publishing">发布</el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑内容"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="类型">
          <el-tag>{{ getTypeLabel(editForm.type) }}</el-tag>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="editForm.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="editForm.content" type="textarea" :rows="8" placeholder="请输入内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  CaretTop,
  CaretBottom,
  Grid,
  ChatDotSquare,
  Bell,
  Document,
  Coin,
  Promotion,
  TrendCharts,
  Warning,
  ChatLineSquare,
  Reading,
} from '@element-plus/icons-vue';
import {
  agricultureApi,
  socialApi,
  announcementApi,
  governanceApi,
  financePublicApi,
  contentReviewApi,
} from '@/api';

const router = useRouter();

// 统计数据
const stats = ref([
  {
    key: 'total',
    label: '累计发布',
    value: 1258,
    trend: 12.5,
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: TrendCharts,
    type: 'primary',
  },
  {
    key: 'pending',
    label: '待审核',
    value: 23,
    trend: -8.3,
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    icon: Warning,
    type: 'warning',
  },
  {
    key: 'published',
    label: '已发布',
    value: 1135,
    trend: 15.2,
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: Promotion,
    type: 'success',
  },
  {
    key: 'views',
    label: '总浏览量',
    value: '2.3W',
    trend: 23.1,
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    icon: ChatLineSquare,
    type: 'info',
  },
]);

// 待审核数量
const pendingCount = ref(23);

// 当前激活的标签
const activeTab = ref('pending');

// 加载状态
const loading = reactive({
  agriculture: false,
  social: false,
  announcement: false,
  governance: false,
  finance: false,
});

// 各类型内容列表
const pendingItems = ref([]);
const agricultureItems = ref([]);
const socialItems = ref([]);
const announcementItems = ref([]);
const governanceItems = ref([]);
const financeItems = ref([]);

// 发布对话框
const publishDialogVisible = ref(false);
const publishing = ref(false);
const publishFormRef = ref(null);
const publishImageList = ref([]);

const publishForm = reactive({
  type: 'agriculture',
  title: '',
  content: '',
  immediatePublish: true,
  notify: false,
  scheduledAt: null,
});

const publishRules = {
  type: [{ required: true, message: '请选择发布类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
};

// 编辑对话框
const editDialogVisible = ref(false);
const saving = ref(false);
const editFormRef = ref(null);

const editForm = reactive({
  id: '',
  type: '',
  title: '',
  content: '',
});

const editRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
};

// 标签切换
const handleTabChange = tab => {
  switch (tab) {
    case 'agriculture':
      fetchAgricultureItems();
      break;
    case 'social':
      fetchSocialItems();
      break;
    case 'announcement':
      fetchAnnouncementItems();
      break;
    case 'governance':
      fetchGovernanceItems();
      break;
    case 'finance':
      fetchFinanceItems();
      break;
    case 'pending':
      fetchPendingItems();
      break;
  }
};

// 获取农业知识列表
const fetchAgricultureItems = async () => {
  loading.agriculture = true;
  try {
    const res = await agricultureApi.getPosts({ status: 'published', limit: 20 });
    agricultureItems.value = res.data || [];
  } catch (error) {
    console.error('获取农业知识列表失败', error);
  } finally {
    loading.agriculture = false;
  }
};

// 获取朋友圈动态列表
const fetchSocialItems = async () => {
  loading.social = true;
  try {
    const res = await socialApi.getPosts({ limit: 20 });
    socialItems.value = res.data || [];
  } catch (error) {
    console.error('获取朋友圈动态列表失败', error);
  } finally {
    loading.social = false;
  }
};

// 获取公告列表
const fetchAnnouncementItems = async () => {
  loading.announcement = true;
  try {
    const res = await announcementApi.getAnnouncements({ status: 'published', limit: 20 });
    announcementItems.value = res.data || [];
  } catch (error) {
    console.error('获取公告列表失败', error);
  } finally {
    loading.announcement = false;
  }
};

// 获取村务公开列表
const fetchGovernanceItems = async () => {
  loading.governance = true;
  try {
    const res = await governanceApi.getGovernanceItems({ status: 'published', limit: 20 });
    governanceItems.value = res.data || [];
  } catch (error) {
    console.error('获取村务列表失败', error);
  } finally {
    loading.governance = false;
  }
};

// 获取财务公开列表
const fetchFinanceItems = async () => {
  loading.finance = true;
  try {
    const res = await financePublicApi.getFinanceItems({ status: 'published', limit: 20 });
    financeItems.value = res.data || [];
  } catch (error) {
    console.error('获取财务列表失败', error);
  } finally {
    loading.finance = false;
  }
};

// 获取待审核列表
const fetchPendingItems = async () => {
  try {
    const res = await contentReviewApi.getPendingItems({ limit: 50 });
    pendingItems.value = res.data || [];
    pendingCount.value = pendingItems.value.length;
  } catch (error) {
    console.error('获取待审核列表失败', error);
  }
};

// 审核通过
const handleApprove = async item => {
  try {
    await ElMessageBox.confirm('确认审核通过并发布该内容吗？', '审核确认', {
      type: 'success',
    });
    await contentReviewApi.approveContent(item.type, item._id, {});
    ElMessage.success('审核通过，内容已发布');
    fetchPendingItems();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('审核通过失败');
    }
  }
};

// 审核拒绝
const handleReject = async item => {
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝原因', '审核拒绝', {
      inputPattern: /.+/,
      inputErrorMessage: '请输入拒绝原因',
    });
    await contentReviewApi.rejectContent(item.type, item._id, { reason: value });
    ElMessage.success('已拒绝该内容');
    fetchPendingItems();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('审核拒绝失败');
    }
  }
};

// 直接发布
const handleDirectPublish = async item => {
  try {
    await ElMessageBox.confirm('确认发布该内容吗？', '发布确认', {
      type: 'info',
    });
    // 根据类型调用相应的发布API
    switch (item.type || activeTab.value) {
      case 'agriculture':
        await agricultureApi.publishPost(item._id);
        break;
      case 'social':
        await socialApi.updatePost(item._id, { status: 'published' });
        break;
      case 'announcement':
        await announcementApi.publishAnnouncement(item._id);
        break;
      case 'governance':
        await governanceApi.publishGovernance(item._id);
        break;
      case 'finance':
        await financePublicApi.publishFinance(item._id);
        break;
    }
    ElMessage.success('发布成功');
    handleTabChange(activeTab.value);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('发布失败');
    }
  }
};

// 编辑
const handleEdit = item => {
  editForm.id = item._id;
  editForm.type = item.type || activeTab.value;
  editForm.title = item.title;
  editForm.content = item.content || item.text;
  editDialogVisible.value = true;
};

// 删除
const handleDelete = async item => {
  try {
    await ElMessageBox.confirm('确认删除该内容吗？此操作不可恢复！', '删除确认', {
      type: 'warning',
    });
    // 根据类型调用相应的删除API
    switch (item.type || activeTab.value) {
      case 'agriculture':
        await agricultureApi.deletePost(item._id);
        break;
      case 'social':
        await socialApi.deletePost(item._id);
        break;
      case 'announcement':
        await announcementApi.deleteAnnouncement(item._id);
        break;
      case 'governance':
        await governanceApi.deleteGovernance(item._id);
        break;
      case 'finance':
        await financePublicApi.deleteFinance(item._id);
        break;
    }
    ElMessage.success('删除成功');
    handleTabChange(activeTab.value);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

// 保存编辑
const handleSaveEdit = async () => {
  await editFormRef.value.validate();
  saving.value = true;
  try {
    const { id, type, title, content } = editForm;
    // 根据类型调用相应的更新API
    switch (type) {
      case 'agriculture':
        await agricultureApi.updatePost(id, { title, content });
        break;
      case 'social':
        await socialApi.updatePost(id, { text: content });
        break;
      case 'announcement':
        await announcementApi.updateAnnouncement(id, { title, content });
        break;
      case 'governance':
        await governanceApi.updateGovernance(id, { title, content });
        break;
      case 'finance':
        await financePublicApi.updateFinance(id, { title, description: content });
        break;
    }
    ElMessage.success('保存成功');
    editDialogVisible.value = false;
    handleTabChange(activeTab.value);
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 显示发布对话框
const showPublishDialog = () => {
  publishForm.type = 'agriculture';
  publishForm.title = '';
  publishForm.content = '';
  publishForm.immediatePublish = true;
  publishForm.notify = false;
  publishForm.scheduledAt = null;
  publishImageList.value = [];
  publishDialogVisible.value = true;
};

// 发布
const handlePublish = async () => {
  await publishFormRef.value.validate();
  publishing.value = true;
  try {
    const { type, title, content, immediatePublish, notify, scheduledAt } = publishForm;
    const publishData = {
      title,
      content,
      status: immediatePublish ? 'published' : 'pending',
      notify,
      scheduledAt,
    };

    // 根据类型调用相应的创建API
    switch (type) {
      case 'agriculture':
        await agricultureApi.createPost(publishData);
        break;
      case 'social':
        await socialApi.createPost({ text: content, ...publishData });
        break;
      case 'announcement':
        await announcementApi.createAnnouncement(publishData);
        break;
      case 'governance':
        await governanceApi.createGovernance(publishData);
        break;
      case 'finance':
        await financePublicApi.createFinance({ title, description: content, ...publishData });
        break;
    }
    ElMessage.success('发布成功');
    publishDialogVisible.value = false;
    handleTabChange(activeTab.value);
  } catch (error) {
    ElMessage.error('发布失败');
  } finally {
    publishing.value = false;
  }
};

// 禁用日期
const disabledDate = date => {
  return date.getTime() < Date.now() - 86400000;
};

// 获取类型标签
const getTypeLabel = type => {
  const labels = {
    agriculture: '农业知识',
    social: '朋友圈动态',
    announcement: '公告',
    governance: '村务公开',
    finance: '财务公开',
  };
  return labels[type] || type;
};

// 返回
const goBack = () => {
  router.back();
};

onMounted(() => {
  fetchPendingItems();
});
</script>

<style scoped lang="scss">
.publish-management {
  padding: 20px;

  .header {
    margin-bottom: 20px;
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
  }

  .stats-row {
    margin-bottom: 20px;

    .stat-card {
      border: none;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-4px);
      }

      .stat-content {
        display: flex;
        align-items: center;
        margin-bottom: 16px;

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
          color: white;
          font-size: 24px;
        }

        .stat-info {
          flex: 1;

          .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #303133;
            line-height: 1;
            margin-bottom: 8px;
          }

          .stat-label {
            font-size: 14px;
            color: #909399;
          }
        }
      }

      .stat-footer {
        display: flex;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #f0f0f0;

        .trend-up {
          color: #67c23a;
          font-weight: 500;
        }

        .trend-down {
          color: #f56c6c;
          font-weight: 500;
        }

        .stat-hint {
          margin-left: 8px;
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .main-card {
    min-height: 500px;
  }
}

:deep(.el-tabs__item) {
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.el-badge__content) {
  right: calc(-10px + var(--el-badge-size) / 2);
}
</style>
