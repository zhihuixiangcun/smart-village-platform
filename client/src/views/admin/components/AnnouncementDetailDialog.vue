<template>
  <el-dialog
    v-model="visible"
    title="公告详情"
    width="80%"
    :close-on-click-modal="false"
    class="announcement-detail-dialog"
  >
    <div v-if="announcement" class="announcement-detail">
      <!-- 头部信息 -->
      <div class="detail-header">
        <div class="header-main">
          <div class="title-section">
            <h1 class="announcement-title">
              <el-icon v-if="announcement.isTop" class="top-icon"><Top /></el-icon>
              {{ announcement.title }}
            </h1>
            <div class="title-meta">
              <el-tag :type="getPriorityType(announcement.priority)" size="large">
                {{ getPriorityLabel(announcement.priority) }}
              </el-tag>
              <el-tag :type="getCategoryType(announcement.category)" size="large">
                {{ getCategoryLabel(announcement.category) }}
              </el-tag>
              <el-tag :type="getStatusType(announcement.status)" size="large">
                {{ getStatusLabel(announcement.status) }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="header-info">
          <div class="author-section">
            <el-avatar :size="48" :src="announcement.author.avatar">
              {{ announcement.author.name?.charAt(0) }}
            </el-avatar>
            <div class="author-details">
              <div class="author-name">{{ announcement.author.name }}</div>
              <div class="author-role">{{ announcement.author.role }}</div>
              <div class="author-department" v-if="announcement.author.department">
                {{ announcement.author.department }}
              </div>
            </div>
          </div>

          <div class="time-section">
            <div class="time-item">
              <span class="time-label">发布时间：</span>
              <span class="time-value">{{ formatTime(announcement.publishTime) }}</span>
            </div>
            <div class="time-item" v-if="announcement.scheduledTime">
              <span class="time-label">定时发布：</span>
              <span class="time-value">{{ formatTime(announcement.scheduledTime) }}</span>
            </div>
            <div class="time-item" v-if="announcement.expiryTime">
              <span class="time-label">过期时间：</span>
              <span class="time-value">{{ formatTime(announcement.expiryTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stat-item">
          <el-icon class="stat-icon"><View /></el-icon>
          <span class="stat-label">浏览量</span>
          <span class="stat-value">{{ announcement.stats.views }}</span>
        </div>
        <div class="stat-item">
          <el-icon class="stat-icon"><Star /></el-icon>
          <span class="stat-label">点赞数</span>
          <span class="stat-value">{{ announcement.stats.likes }}</span>
        </div>
        <div class="stat-item">
          <el-icon class="stat-icon"><ChatLineSquare /></el-icon>
          <span class="stat-label">评论数</span>
          <span class="stat-value">{{ announcement.stats.comments }}</span>
        </div>
        <div class="stat-item">
          <el-icon class="stat-icon"><Share /></el-icon>
          <span class="stat-label">分享数</span>
          <span class="stat-value">{{ announcement.stats.shares }}</span>
        </div>
        <div class="stat-item">
          <el-icon class="stat-icon"><Download /></el-icon>
          <span class="stat-label">下载数</span>
          <span class="stat-value">{{ announcement.stats.downloads }}</span>
        </div>
      </div>

      <!-- 摘要 -->
      <div v-if="announcement.summary" class="summary-section">
        <h3 class="section-title">内容摘要</h3>
        <div class="summary-content">
          {{ announcement.summary }}
        </div>
      </div>

      <!-- 标签 -->
      <div v-if="announcement.tags && announcement.tags.length > 0" class="tags-section">
        <h3 class="section-title">标签</h3>
        <div class="tags-content">
          <el-tag
            v-for="tag in announcement.tags"
            :key="tag"
            class="tag-item"
            type="info"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>

      <!-- 内容 -->
      <div class="content-section">
        <h3 class="section-title">公告内容</h3>
        <div class="content-body" v-html="announcement.content"></div>
      </div>

      <!-- 附件 -->
      <div v-if="announcement.attachments && announcement.attachments.length > 0" class="attachments-section">
        <h3 class="section-title">附件下载</h3>
        <div class="attachments-grid">
          <div
            v-for="(attachment, index) in announcement.attachments"
            :key="index"
            class="attachment-card"
            @click="downloadAttachment(attachment)"
          >
            <div class="attachment-icon">
              <el-icon :size="32">
                <component :is="getAttachmentIcon(attachment.type)" />
              </el-icon>
            </div>
            <div class="attachment-info">
              <div class="attachment-name" :title="attachment.name">
                {{ attachment.name }}
              </div>
              <div class="attachment-meta">
                {{ formatFileSize(attachment.size) }}
              </div>
            </div>
            <div class="attachment-action">
              <el-icon><Download /></el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 推送设置信息 -->
      <div v-if="announcement.pushSettings" class="push-settings-section">
        <h3 class="section-title">推送设置</h3>

        <div class="push-info">
          <div class="push-item">
            <span class="push-label">推送渠道：</span>
            <div class="push-channels">
              <el-tag
                v-for="channel in announcement.pushSettings.channels"
                :key="channel"
                size="small"
                class="channel-tag"
              >
                {{ getChannelLabel(channel) }}
              </el-tag>
            </div>
          </div>

          <div class="push-item">
            <span class="push-label">推送对象：</span>
            <div class="push-targets">
              <el-tag
                v-for="target in announcement.pushSettings.targetGroups"
                :key="target"
                size="small"
                type="success"
                class="target-tag"
              >
                {{ getTargetLabel(target) }}
              </el-tag>
            </div>
          </div>

          <div v-if="announcement.pushSettings.voiceSettings?.enabled" class="push-item">
            <span class="push-label">语音设置：</span>
            <div class="voice-settings">
              <span>方言：{{ getDialectLabel(announcement.pushSettings.voiceSettings.dialect) }}</span>
              <span>语速：{{ announcement.pushSettings.voiceSettings.speed }}x</span>
              <span>音量：{{ announcement.pushSettings.voiceSettings.volume }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 可见性设置 -->
      <div class="visibility-section">
        <h3 class="section-title">可见性设置</h3>
        <div class="visibility-info">
          <el-tag :type="getVisibilityType(announcement.visibility)">
            {{ getVisibilityLabel(announcement.visibility) }}
          </el-tag>
          <span v-if="announcement.visibility === 'custom'" class="custom-visibility">
            （{{ announcement.visibleTo?.length || 0 }}人可见）
          </span>
        </div>
      </div>

      <!-- 版本历史 -->
      <div v-if="announcement.previousVersions && announcement.previousVersions.length > 0" class="version-section">
        <h3 class="section-title">版本历史</h3>
        <el-timeline>
          <el-timeline-item
            v-for="(version, index) in announcement.previousVersions"
            :key="index"
            :timestamp="formatTime(version.modifiedAt)"
            placement="top"
          >
            <div class="version-item">
              <div class="version-header">
                <span class="version-number">v{{ version.version }}</span>
                <span class="version-author">{{ version.modifiedBy }}</span>
              </div>
              <div class="version-log">{{ version.changeLog }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">关闭</el-button>
        <el-button @click="editAnnouncement" type="primary" v-if="canEdit">
          编辑公告
        </el-button>
        <el-button @click="shareAnnouncement" type="success">
          分享公告
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Top, View, Star, ChatLineSquare, Share, Download,
  Document, Picture, VideoPlay, Headphones
} from '@element-plus/icons-vue'
import { formatTime, formatFileSize } from '@/utils/format'
import { useUserStore } from '@/stores/user'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  announcement: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'edit'])

// Store
const userStore = useUserStore()

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const canEdit = computed(() => {
  if (!props.announcement || !userStore.user) return false

  const user = userStore.user
  const announcement = props.announcement

  // 管理员或村委可编辑
  if (['admin', 'village_admin'].includes(user.role)) return true

  // 作者可编辑自己的公告
  if (announcement.author.id === user.id) return true

  return false
})

// 工具函数
const getPriorityType = (priority) => {
  const types = {
    emergency: 'danger',
    urgent: 'warning',
    high: 'warning',
    normal: 'info',
    low: 'info'
  }
  return types[priority] || 'info'
}

const getPriorityLabel = (priority) => {
  const labels = {
    emergency: '紧急',
    urgent: '重要',
    high: '高',
    normal: '普通',
    low: '低'
  }
  return labels[priority] || '普通'
}

const getCategoryType = (category) => {
  return 'primary'
}

const getCategoryLabel = (category) => {
  const labels = {
    policy: '政策通知',
    finance: '财务公示',
    project: '项目进展',
    safety: '安全提醒',
    welfare: '民生福利',
    activity: '文化活动',
    emergency: '紧急通知',
    meeting: '会议通知',
    service: '便民服务',
    other: '其他'
  }
  return labels[category] || '其他'
}

const getStatusType = (status) => {
  const types = {
    draft: 'info',
    published: 'success',
    archived: 'warning',
    expired: 'danger'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
    expired: '已过期'
  }
  return labels[status] || '未知'
}

const getAttachmentIcon = (type) => {
  const icons = {
    image: Picture,
    video: VideoPlay,
    audio: Headphones,
    document: Document
  }
  return icons[type] || Document
}

const getChannelLabel = (channel) => {
  const labels = {
    app: 'APP推送',
    sms: '短信通知',
    wechat: '微信通知',
    display: '村内大屏',
    voice: '语音播报',
    email: '邮件通知'
  }
  return labels[channel] || channel
}

const getTargetLabel = (target) => {
  const labels = {
    all: '全体村民',
    residents: '普通村民',
    committee: '村委会',
    elderly: '老年人',
    youth: '青年人',
    businesses: '商户'
  }
  return labels[target] || target
}

const getDialectLabel = (dialect) => {
  const labels = {
    mandarin: '普通话',
    cantonese: '粤语',
    minnan: '闽南语',
    hakka: '客家话',
    local: '本地方言'
  }
  return labels[dialect] || dialect
}

const getVisibilityType = (visibility) => {
  const types = {
    public: 'success',
    residents: 'primary',
    committee: 'warning',
    custom: 'info'
  }
  return types[visibility] || 'info'
}

const getVisibilityLabel = (visibility) => {
  const labels = {
    public: '公开可见',
    residents: '仅村民可见',
    committee: '仅村委可见',
    custom: '自定义可见'
  }
  return labels[visibility] || '未知'
}

// 方法
const downloadAttachment = (attachment) => {
  // 创建临时链接下载文件
  const link = document.createElement('a')
  link.href = attachment.url
  link.download = attachment.name
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success('文件下载开始')
}

const editAnnouncement = () => {
  emit('edit', props.announcement)
}

const shareAnnouncement = () => {
  // 复制分享链接到剪贴板
  const shareUrl = `${window.location.origin}/announcements/${props.announcement.id}`

  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      ElMessage.success('分享链接已复制到剪贴板')
    }).catch(() => {
      ElMessage.error('复制失败')
    })
  } else {
    // 兼容性处理
    const textArea = document.createElement('textarea')
    textArea.value = shareUrl
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      ElMessage.success('分享链接已复制到剪贴板')
    } catch (err) {
      ElMessage.error('复制失败')
    }
    document.body.removeChild(textArea)
  }
}
</script>

<style lang="scss" scoped>
.announcement-detail-dialog {
  .announcement-detail {
    .detail-header {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color-light);

      .header-main {
        margin-bottom: 16px;

        .title-section {
          .announcement-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 24px;
            font-weight: 600;
            color: var(--text-color-primary);
            margin: 0 0 12px 0;
            line-height: 1.4;

            .top-icon {
              color: var(--warning-color);
              font-size: 20px;
            }
          }

          .title-meta {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
        }
      }

      .header-info {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;

        .author-section {
          display: flex;
          align-items: center;
          gap: 12px;

          .author-details {
            .author-name {
              font-size: 16px;
              font-weight: 500;
              color: var(--text-color-primary);
            }

            .author-role {
              font-size: 14px;
              color: var(--text-color-regular);
              margin-top: 2px;
            }

            .author-department {
              font-size: 12px;
              color: var(--text-color-secondary);
              margin-top: 2px;
            }
          }
        }

        .time-section {
          text-align: right;

          .time-item {
            margin-bottom: 4px;
            font-size: 14px;

            .time-label {
              color: var(--text-color-secondary);
            }

            .time-value {
              color: var(--text-color-primary);
              font-weight: 500;
            }
          }
        }
      }
    }

    .stats-section {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
      padding: 16px;
      background: var(--fill-color-light);
      border-radius: 8px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        text-align: center;

        .stat-icon {
          color: var(--primary-color);
        }

        .stat-label {
          font-size: 14px;
          color: var(--text-color-regular);
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-color-primary);
        }
      }
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color-primary);
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color-lighter);
    }

    .summary-section {
      margin-bottom: 24px;

      .summary-content {
        padding: 16px;
        background: var(--fill-color-light);
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-color-regular);
      }
    }

    .tags-section {
      margin-bottom: 24px;

      .tags-content {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        .tag-item {
          margin-bottom: 4px;
        }
      }
    }

    .content-section {
      margin-bottom: 24px;

      .content-body {
        padding: 20px;
        background: white;
        border: 1px solid var(--border-color-light);
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.8;
        color: var(--text-color-primary);

        :deep(img) {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
        }

        :deep(table) {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;

          th, td {
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            text-align: left;
          }

          th {
            background: var(--fill-color);
            font-weight: 600;
          }
        }

        :deep(blockquote) {
          margin: 16px 0;
          padding: 12px 16px;
          border-left: 4px solid var(--primary-color);
          background: var(--fill-color-light);
          font-style: italic;
        }

        :deep(pre) {
          background: var(--fill-color-darker);
          padding: 16px;
          border-radius: 4px;
          overflow-x: auto;
        }

        :deep(code) {
          background: var(--fill-color-light);
          padding: 2px 4px;
          border-radius: 2px;
          font-family: monospace;
        }
      }
    }

    .attachments-section {
      margin-bottom: 24px;

      .attachments-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;

        .attachment-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--border-color-light);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            border-color: var(--primary-color);
            box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
          }

          .attachment-icon {
            color: var(--primary-color);
          }

          .attachment-info {
            flex: 1;
            min-width: 0;

            .attachment-name {
              font-weight: 500;
              color: var(--text-color-primary);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .attachment-meta {
              font-size: 12px;
              color: var(--text-color-secondary);
              margin-top: 4px;
            }
          }

          .attachment-action {
            color: var(--text-color-secondary);
          }
        }
      }
    }

    .push-settings-section {
      margin-bottom: 24px;

      .push-info {
        .push-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;

          .push-label {
            font-weight: 500;
            color: var(--text-color-regular);
            min-width: 80px;
          }

          .push-channels,
          .push-targets {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }

          .voice-settings {
            display: flex;
            gap: 16px;
            font-size: 14px;
            color: var(--text-color-regular);
          }
        }
      }
    }

    .visibility-section {
      margin-bottom: 24px;

      .visibility-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .custom-visibility {
          font-size: 14px;
          color: var(--text-color-secondary);
        }
      }
    }

    .version-section {
      margin-bottom: 24px;

      .version-item {
        .version-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;

          .version-number {
            font-weight: 600;
            color: var(--primary-color);
          }

          .version-author {
            font-size: 14px;
            color: var(--text-color-secondary);
          }
        }

        .version-log {
          font-size: 14px;
          color: var(--text-color-regular);
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .announcement-detail-dialog {
    .announcement-detail {
      .detail-header {
        .header-info {
          flex-direction: column;
          gap: 12px;

          .time-section {
            text-align: left;
          }
        }
      }

      .stats-section {
        flex-wrap: wrap;
        gap: 12px;

        .stat-item {
          min-width: calc(50% - 6px);
        }
      }

      .attachments-section {
        .attachments-grid {
          grid-template-columns: 1fr;
        }
      }

      .push-settings-section {
        .push-info {
          .push-item {
            flex-direction: column;
            gap: 8px;
          }
        }
      }
    }

    .dialog-footer {
      flex-wrap: wrap;

      .el-button {
        flex: 1;
        min-width: 80px;
      }
    }
  }
}
</style>