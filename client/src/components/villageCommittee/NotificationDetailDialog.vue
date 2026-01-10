<template>
  <el-dialog
    v-model="visible"
    :title="notice?.title || '通知详情'"
    width="600px"
    :fullscreen="isMobile"
    destroy-on-close
    @closed="handleClose"
  >
    <div class="notification-detail" v-if="notice">
      <!-- 通知头部 -->
      <div class="notice-header">
        <el-tag :type="getNoticeTypeTag(notice.level)" size="large">
          {{ getNoticeLevelText(notice.level) }}
        </el-tag>
        <span class="notice-time">{{ formatDateTime(notice.createdAt) }}</span>
      </div>

      <!-- 通知内容 -->
      <div class="notice-content">
        <div class="content-text" v-html="formatContent(notice.content)"></div>
      </div>

      <!-- 通知附件 -->
      <div class="notice-attachments" v-if="notice.attachments && notice.attachments.length > 0">
        <h4>附件</h4>
        <div class="attachment-list">
          <div
            v-for="(attachment, index) in notice.attachments"
            :key="index"
            class="attachment-item"
          >
            <el-icon><Document /></el-icon>
            <span>{{ attachment.name }}</span>
            <el-button type="primary" link @click="downloadAttachment(attachment)">
              下载
            </el-button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="notice-actions">
        <el-button @click="handleMarkAsRead" v-if="!notice.read" type="primary">
          标记为已读
        </el-button>
        <el-button @click="handleDelete" type="danger" plain> 删除通知 </el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Document } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  notice: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'marked-read', 'deleted']);

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const isMobile = computed(() => window.innerWidth < 768);

const getNoticeTypeTag = level => {
  const typeMap = {
    紧急: 'danger',
    重要: 'warning',
    一般: 'info',
    通知: 'primary',
    emergency: 'danger',
    important: 'warning',
    normal: 'info',
  };
  return typeMap[level] || 'info';
};

const getNoticeLevelText = level => {
  const textMap = {
    紧急: '🚨 紧急',
    重要: '⚠️ 重要',
    一般: '📄 一般',
    通知: '📢 通知',
    emergency: '🚨 紧急',
    important: '⚠️ 重要',
    normal: '📄 一般',
  };
  return textMap[level] || level;
};

const formatDateTime = date => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const formatContent = content => {
  if (!content) return '';
  // 将换行符转换为 HTML 换行
  return content.replace(/\n/g, '<br>');
};

const handleMarkAsRead = async () => {
  try {
    emit('marked-read', props.notice);
    ElMessage.success('已标记为已读');
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这条通知吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    emit('deleted', props.notice);
    visible.value = false;
    ElMessage.success('通知已删除');
  } catch {
    // 用户取消
  }
};

const downloadAttachment = attachment => {
  // TODO: 实现附件下载
  ElMessage.info(`下载附件: ${attachment.name}`);
};

const handleClose = () => {
  // 对话框关闭时的处理
};
</script>

<style lang="scss" scoped>
.notification-detail {
  .notice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;

    .notice-time {
      font-size: 14px;
      color: #909399;
    }
  }

  .notice-content {
    margin-bottom: 20px;

    .content-text {
      font-size: 15px;
      line-height: 1.8;
      color: #303133;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  .notice-attachments {
    margin-bottom: 20px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 8px;

    h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #606266;
    }

    .attachment-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .attachment-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: white;
      border-radius: 6px;
      transition: all 0.3s;

      &:hover {
        background: #ecf5ff;
      }

      .el-icon {
        font-size: 20px;
        color: #409eff;
      }

      span {
        flex: 1;
        font-size: 14px;
        color: #303133;
      }
    }
  }

  .notice-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 15px;
    border-top: 1px solid #ebeef5;
  }
}

@media (max-width: 768px) {
  .notification-detail {
    .notice-content {
      .content-text {
        font-size: 14px;
      }
    }

    .notice-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
