<template>
  <div class="review-queue">
    <el-empty v-if="!items.length" description="暂无待审核内容" />

    <div v-else class="queue-list">
      <div v-for="item in items" :key="item._id" class="queue-item">
        <div class="item-header">
          <div class="item-type">
            <el-tag :type="getTypeColor(item.type)" size="small">
              {{ getTypeLabel(item.type) }}
            </el-tag>
            <span class="item-title">{{ item.title }}</span>
          </div>
          <div class="item-time">
            {{ formatTime(item.createdAt) }}
          </div>
        </div>

        <div class="item-content">
          {{ item.content || item.text }}
        </div>

        <div class="item-author">
          <el-avatar :size="32" :src="item.author?.avatar">
            {{ item.author?.name?.charAt(0) }}
          </el-avatar>
          <span class="author-name">{{ item.author?.name }}</span>
        </div>

        <div class="item-actions">
          <el-button type="success" size="small" @click="$emit('approve', item)">
            <el-icon><Select /></el-icon>
            通过
          </el-button>
          <el-button type="danger" size="small" @click="$emit('reject', item)">
            <el-icon><Close /></el-icon>
            拒绝
          </el-button>
          <el-button size="small" @click="openDetailDrawer(item)">
            <el-icon><View /></el-icon>
            详情
          </el-button>
        </div>
      </div>
    </div>

    <el-pagination
      v-if="items.length > 10"
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      class="pagination"
    />

    <el-drawer
      v-model="detailDrawerVisible"
      title="内容审核详情"
      size="70%"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div v-loading="detailLoading" class="detail-container">
        <el-empty v-if="!currentItem" description="未找到内容" />

        <template v-else>
          <el-descriptions :column="2" border class="detail-info">
            <el-descriptions-item label="类型">
              <el-tag :type="getTypeColor(currentItem.type)">
                {{ getTypeLabel(currentItem.type) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="标题">
              {{ currentItem.title }}
            </el-descriptions-item>
            <el-descriptions-item label="作者">
              <div class="author-info">
                <el-avatar :size="24" :src="currentItem.author?.avatar">
                  {{ currentItem.author?.name?.charAt(0) }}
                </el-avatar>
                <span>{{ currentItem.author?.name }}</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="审核状态">
              <el-tag :type="getStatusColor(currentItem.status)">
                {{ getStatusLabel(currentItem.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(currentItem.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ formatDateTime(currentItem.updatedAt) }}
            </el-descriptions-item>
          </el-descriptions>

          <el-card class="content-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>内容预览</span>
                <el-button-group>
                  <el-button size="small" :type="previewMode === 'html' ? 'primary' : ''" @click="previewMode = 'html'">
                    <el-icon><Document /></el-icon>
                    HTML视图
                  </el-button>
                  <el-button size="small" :type="previewMode === 'raw' ? 'primary' : ''" @click="previewMode = 'raw'">
                    <el-icon><List /></el-icon>
                    原文视图
                  </el-button>
                </el-button-group>
              </div>
            </template>
            <div v-if="previewMode === 'html'" class="content-preview" v-html="currentItem.content || currentItem.text"></div>
            <pre v-else class="content-raw">{{ currentItem.content || currentItem.text }}</pre>
          </el-card>

          <el-card v-if="currentItem.images && currentItem.images.length" class="media-card" shadow="never">
            <template #header>
              <span>图片附件 ({{ currentItem.images.length }})</span>
            </template>
            <div class="images-grid">
              <div v-for="(img, idx) in currentItem.images" :key="idx" class="image-item">
                <el-image
                  :src="img.url || img"
                  :preview-src-list="currentItem.images.map(i => i.url || i)"
                  :initial-index="idx"
                  fit="cover"
                  class="preview-image"
                >
                  <template #placeholder>
                    <div class="image-placeholder">
                      <el-icon class="is-loading"><Loading /></el-icon>
                    </div>
                  </template>
                  <template #error>
                    <div class="image-error">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
            </div>
          </el-card>

          <el-card v-if="currentItem.videos && currentItem.videos.length" class="media-card" shadow="never">
            <template #header>
              <span>视频附件 ({{ currentItem.videos.length }})</span>
            </template>
            <div class="videos-grid">
              <div v-for="(video, idx) in currentItem.videos" :key="idx" class="video-item">
                <video :src="video.url || video" controls class="preview-video"></video>
              </div>
            </div>
          </el-card>

          <el-card v-if="currentItem.attachments && currentItem.attachments.length" class="media-card" shadow="never">
            <template #header>
              <span>文件附件 ({{ currentItem.attachments.length }})</span>
            </template>
            <div class="attachments-list">
              <div v-for="(file, idx) in currentItem.attachments" :key="idx" class="attachment-item">
                <el-icon><DocumentCopy /></el-icon>
                <span class="file-name">{{ file.name || `文件${idx + 1}` }}</span>
                <el-tag size="small" type="info">{{ formatFileSize(file.size) }}</el-tag>
                <el-button link type="primary" @click="downloadFile(file)">
                  <el-icon><Download /></el-icon>
                  下载
                </el-button>
              </div>
            </div>
          </el-card>

          <el-row :gutter="16" class="review-actions">
            <el-col :span="16">
              <el-card shadow="never">
                <template #header>
                  <div class="card-header">
                    <span>审核历史</span>
                    <el-button size="small" text @click="toggleHistory">
                      {{ showHistory ? '收起' : '展开' }}
                    </el-button>
                  </div>
                </template>
                <el-timeline v-if="showHistory" v-loading="historyLoading">
                  <el-timeline-item
                    v-for="(record, idx) in reviewHistory"
                    :key="idx"
                    :timestamp="formatDateTime(record.createdAt)"
                    :type="getRecordType(record.action)"
                  >
                    <div class="history-item">
                      <div class="history-header">
                        <el-avatar :size="24" :src="record.reviewer?.avatar">
                          {{ record.reviewer?.name?.charAt(0) }}
                        </el-avatar>
                        <span class="reviewer-name">{{ record.reviewer?.name }}</span>
                        <el-tag :type="getRecordType(record.action)" size="small">
                          {{ getActionLabel(record.action) }}
                        </el-tag>
                      </div>
                      <div v-if="record.comment" class="history-comment">{{ record.comment }}</div>
                    </div>
                  </el-timeline-item>
                  <el-timeline-item v-if="!reviewHistory.length" placement="top">
                    <el-empty description="暂无审核记录" :image-size="80" />
                  </el-timeline-item>
                </el-timeline>
              </el-card>
            </el-col>

            <el-col :span="8">
              <el-card shadow="never">
                <template #header>
                  <span>审核操作</span>
                </template>
                <el-form ref="reviewFormRef" :model="reviewForm" label-position="top">
                  <el-form-item label="审核意见">
                    <el-input
                      v-model="reviewForm.comment"
                      type="textarea"
                      :rows="4"
                      placeholder="请输入审核意见（选填）"
                      maxlength="500"
                      show-word-limit
                    />
                  </el-form-item>

                  <div class="action-buttons">
                    <el-button type="success" :loading="reviewing.approve" @click="handleReview('approve')">
                      <el-icon><Select /></el-icon>
                      通过审核
                    </el-button>
                    <el-button type="danger" :loading="reviewing.reject" @click="handleReview('reject')">
                      <el-icon><Close /></el-icon>
                      拒绝审核
                    </el-button>
                    <el-button type="warning" :loading="reviewing.return" @click="handleReview('return')">
                      <el-icon><RefreshLeft /></el-icon>
                      退回修改
                    </el-button>
                  </div>
                </el-form>
              </el-card>

              <el-card shadow="never" class="version-card">
                <template #header>
                  <div class="card-header">
                    <span>版本管理</span>
                    <el-dropdown @command="handleVersionAction">
                      <el-button size="small" text>
                        <el-icon><MoreFilled /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="history" icon="Clock">查看历史</el-dropdown-item>
                          <el-dropdown-item command="compare" icon="DataComparison">版本对比</el-dropdown-item>
                          <el-dropdown-item command="restore" icon="RefreshRight" :disabled="!currentItem.versions?.length">
                            恢复版本
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
                <div class="version-info">
                  <div class="version-number">当前版本: v{{ currentItem.version || 1 }}</div>
                  <div v-if="currentItem.versions && currentItem.versions.length" class="version-count">
                    共 {{ currentItem.versions.length }} 个历史版本
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="confirmDialogVisible" :title="confirmDialogConfig.title" width="500px">
      <el-form :model="confirmForm" label-width="100px">
        <el-form-item v-if="confirmDialogConfig.requireReason" label="原因说明" required>
          <el-input
            v-model="confirmForm.reason"
            type="textarea"
            :rows="3"
            :placeholder="confirmDialogConfig.placeholder"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-alert :type="confirmDialogConfig.type" :closable="false">
          {{ confirmDialogConfig.message }}
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button :type="confirmDialogConfig.buttonType" @click="confirmReview">
          确认{{ confirmDialogConfig.buttonText }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, defineProps, defineEmits } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Select,
  Close,
  View,
  Document,
  List,
  Loading,
  Picture,
  DocumentCopy,
  Download,
  RefreshLeft,
  MoreFilled,
  Clock,
  DataComparison,
  RefreshRight,
} from '@element-plus/icons-vue';

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['approve', 'reject', 'detail']);

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
});

const detailDrawerVisible = ref(false);
const detailLoading = ref(false);
const historyLoading = ref(false);
const currentItem = ref(null);
const previewMode = ref('html');
const showHistory = ref(true);
const reviewHistory = ref([]);

const reviewFormRef = ref(null);
const reviewForm = reactive({
  comment: '',
});

const reviewing = reactive({
  approve: false,
  reject: false,
  return: false,
});

const confirmDialogVisible = ref(false);
const confirmDialogConfig = reactive({
  title: '',
  message: '',
  type: 'info',
  buttonText: '',
  buttonType: 'primary',
  requireReason: false,
  placeholder: '',
  action: '',
});

const confirmForm = reactive({
  reason: '',
});

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

const getTypeColor = type => {
  const colors = {
    agriculture: 'success',
    social: 'primary',
    announcement: 'warning',
    governance: 'info',
    finance: 'danger',
  };
  return colors[type] || 'info';
};

const getStatusLabel = status => {
  const labels = {
    draft: '草稿',
    pending: '待审核',
    published: '已发布',
    rejected: '已拒绝',
    archived: '已下架',
  };
  return labels[status] || status;
};

const getStatusColor = status => {
  const colors = {
    draft: 'info',
    pending: 'warning',
    published: 'success',
    rejected: 'danger',
    archived: 'info',
  };
  return colors[status] || 'info';
};

const formatTime = time => {
  if (!time) return '';
  const date = new Date(time);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

const formatDateTime = time => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFileSize = bytes => {
  if (!bytes) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getRecordType = action => {
  const types = {
    approve: 'success',
    reject: 'danger',
    return: 'warning',
    submit: 'primary',
  };
  return types[action] || 'info';
};

const getActionLabel = action => {
  const labels = {
    approve: '审核通过',
    reject: '审核拒绝',
    return: '退回修改',
    submit: '提交审核',
  };
  return labels[action] || action;
};

const toggleHistory = () => {
  showHistory.value = !showHistory.value;
};

const downloadFile = file => {
  const link = document.createElement('a');
  link.href = file.url;
  link.download = file.name;
  link.click();
};

const openDetailDrawer = async item => {
  detailDrawerVisible.value = true;
  detailLoading.value = true;
  try {
    currentItem.value = item;
    reviewForm.comment = '';
    await fetchReviewHistory(item);
  } catch (error) {
    ElMessage.error('获取详情失败');
  } finally {
    detailLoading.value = false;
  }
};

const fetchReviewHistory = async item => {
  historyLoading.value = true;
  try {
    reviewHistory.value = [];
  } catch (error) {
    console.error('获取审核历史失败', error);
  } finally {
    historyLoading.value = false;
  }
};

const handleReview = action => {
  if (action === 'approve') {
    confirmDialogConfig.title = '确认通过审核';
    confirmDialogConfig.message = '确认通过审核并发布该内容吗？';
    confirmDialogConfig.type = 'success';
    confirmDialogConfig.buttonText = '通过';
    confirmDialogConfig.buttonType = 'success';
    confirmDialogConfig.requireReason = false;
  } else if (action === 'reject') {
    confirmDialogConfig.title = '确认拒绝审核';
    confirmDialogConfig.message = '拒绝后内容将不会发布，需重新编辑后再次提交。';
    confirmDialogConfig.type = 'error';
    confirmDialogConfig.buttonText = '拒绝';
    confirmDialogConfig.buttonType = 'danger';
    confirmDialogConfig.requireReason = true;
    confirmDialogConfig.placeholder = '请输入拒绝原因（必填）';
  } else if (action === 'return') {
    confirmDialogConfig.title = '确认退回修改';
    confirmDialogConfig.message = '退回后作者将收到通知，可编辑后再次提交审核。';
    confirmDialogConfig.type = 'warning';
    confirmDialogConfig.buttonText = '退回';
    confirmDialogConfig.buttonType = 'warning';
    confirmDialogConfig.requireReason = true;
    confirmDialogConfig.placeholder = '请输入修改建议（必填）';
  }
  confirmDialogConfig.action = action;
  confirmForm.reason = '';
  confirmDialogVisible.value = true;
};

const confirmReview = async () => {
  if (confirmDialogConfig.requireReason && !confirmForm.reason.trim()) {
    ElMessage.warning(confirmDialogConfig.placeholder);
    return;
  }

  const action = confirmDialogConfig.action;
  reviewing[action] = true;

  try {
    const data = {
      comment: reviewForm.comment || confirmForm.reason,
    };

    if (action === 'approve') {
      emit('approve', currentItem.value);
    } else if (action === 'reject') {
      emit('reject', currentItem.value);
    }

    ElMessage.success(confirmDialogConfig.buttonText + '成功');
    confirmDialogVisible.value = false;
    detailDrawerVisible.value = false;
  } catch (error) {
    ElMessage.error('操作失败');
  } finally {
    reviewing[action] = false;
  }
};

const handleVersionAction = async action => {
  if (action === 'history') {
    ElMessageBox.alert('历史版本功能开发中', '提示');
  } else if (action === 'compare') {
    ElMessageBox.alert('版本对比功能开发中', '提示');
  } else if (action === 'restore') {
    try {
      await ElMessageBox.confirm('确认恢复到之前的版本吗？', '恢复确认', {
        type: 'warning',
      });
      ElMessage.success('版本恢复成功');
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('版本恢复失败');
      }
    }
  }
};
</script>

<style scoped lang="scss">
.review-queue {
  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .queue-item {
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
    border: 1px solid #e4e7ed;
    transition: all 0.3s;

    &:hover {
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .item-type {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .item-title {
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }

      .item-time {
        font-size: 12px;
        color: #909399;
      }
    }

    .item-content {
      color: #606266;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 12px;
      padding: 12px;
      background: white;
      border-radius: 4px;
      max-height: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }

    .item-author {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: white;
      border-radius: 4px;
      width: fit-content;

      .author-name {
        font-size: 14px;
        color: #606266;
      }
    }

    .item-actions {
      display: flex;
      gap: 8px;
    }
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }

  .detail-container {
    padding: 0;
  }

  .detail-info {
    margin-bottom: 16px;

    .author-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .content-card {
    margin-bottom: 16px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .content-preview {
      line-height: 1.8;
      color: #303133;
      min-height: 200px;

      :deep(img) {
        max-width: 100%;
        border-radius: 4px;
      }

      :deep(p) {
        margin: 8px 0;
      }
    }

    .content-raw {
      background: #f5f7fa;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      line-height: 1.6;
      font-size: 13px;
      color: #606266;
    }
  }

  .media-card {
    margin-bottom: 16px;
  }

  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;

    .image-item {
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid #e4e7ed;

      .preview-image {
        width: 100%;
        height: 100%;

        .image-placeholder,
        .image-error {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f7fa;
          color: #909399;
          font-size: 32px;
        }
      }
    }
  }

  .videos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;

    .video-item {
      border-radius: 8px;
      overflow: hidden;

      .preview-video {
        width: 100%;
        max-height: 300px;
      }
    }
  }

  .attachments-list {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .attachment-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f5f7fa;
      border-radius: 4px;
      transition: all 0.3s;

      &:hover {
        background: #ecf5ff;
      }

      .file-name {
        flex: 1;
        color: #303133;
        font-size: 14px;
      }
    }
  }

  .review-actions {
    margin-top: 16px;

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;

      button {
        width: 100%;
      }
    }
  }

  .version-card {
    margin-top: 16px;

    .version-info {
      .version-number {
        font-weight: 500;
        color: #303133;
        margin-bottom: 8px;
      }

      .version-count {
        font-size: 13px;
        color: #909399;
      }
    }
  }

  .history-item {
    .history-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .reviewer-name {
      font-size: 14px;
      color: #303133;
    }

    .history-comment {
      padding: 8px 12px;
      background: #f5f7fa;
      border-radius: 4px;
      color: #606266;
      font-size: 13px;
      line-height: 1.6;
    }
  }
}

:deep(.el-drawer__body) {
  padding: 20px;
  overflow-y: auto;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #909399;
}
</style>
