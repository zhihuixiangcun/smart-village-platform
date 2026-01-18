/**
 * 公告卡片组件
 * 可复用的公告展示卡片，支持展开/收起、语音播报、图片预览等功能
 * 适老化设计：大字体、高对比度、语音播报支持
 */
<template>
  <view
    :class="[
      'announcement-card',
      {
        'is-top': announcement.top,
        'is-unread': !announcement.read,
        'is-expanded': isExpanded,
        'is-playing': isPlaying,
        'elderly-mode': isElderly
      }
    ]"
    :style="cardStyle"
    :aria-label="`${announcement.title}，${typeLabel}，${announcement.read ? '已读' : '未读'}`"
    role="article"
    tabindex="0"
    @click="handleCardClick"
    @keydown.enter="handleCardClick"
  >
    <!-- 卡片头部 -->
    <view class="card-header">
      <!-- 置顶标签 -->
      <view v-if="announcement.top" class="top-badge" aria-label="置顶公告">
        <SvgIcon name="pin" :size="14" />
        <text>置顶</text>
      </view>

      <!-- 类型标签 -->
      <AnnouncementTypeTag :type="announcement.type" />

      <!-- 未读指示器 -->
      <view v-if="!announcement.read" class="unread-indicator" aria-label="未读" />

      <!-- 操作按钮组 -->
      <view class="action-buttons" @click.stop>
        <!-- 语音播报按钮 -->
        <view
          class="action-btn voice-btn"
          :class="{ 'is-playing': isPlaying }"
          :aria-label="isPlaying ? '停止播报' : '语音播报'"
          role="button"
          tabindex="0"
          @click="toggleVoice"
          @keydown.enter="toggleVoice"
        >
          <SvgIcon :name="isPlaying ? 'volume-x' : 'volume-2'" :size="iconSize" />
        </view>

        <!-- 收藏按钮 -->
        <view
          class="action-btn collect-btn"
          :class="{ 'is-collected': announcement.collected }"
          :aria-label="announcement.collected ? '取消收藏' : '收藏'"
          role="button"
          tabindex="0"
          @click="toggleCollect"
          @keydown.enter="toggleCollect"
        >
          <SvgIcon :name="announcement.collected ? 'star-filled' : 'star'" :size="iconSize" />
        </view>

        <!-- 更多按钮 -->
        <view
          v-if="showMore"
          class="action-btn more-btn"
          aria-label="更多操作"
          role="button"
          tabindex="0"
          @click="handleMore"
        >
          <SvgIcon name="more-vertical" :size="iconSize" />
        </view>
      </view>
    </view>

    <!-- 卡片内容 -->
    <view class="card-content">
      <!-- 标题 -->
      <view class="announcement-title">
        <text class="title-text">{{ announcement.title }}</text>
      </view>

      <!-- 摘要 -->
      <view v-if="announcement.summary" class="announcement-summary">
        <text class="summary-text">{{ displaySummary }}</text>
        <text
          v-if="shouldShowExpandButton"
          class="expand-btn"
          @click.stop="toggleExpand"
          role="button"
          tabindex="0"
        >
          {{ isExpanded ? '收起' : '展开' }}
        </text>
      </view>

      <!-- 扩展内容（展开时显示） -->
      <view v-if="isExpanded && announcement.content" class="announcement-content">
        <rich-text :nodes="announcement.content" class="content-rich-text" />
      </view>

      <!-- 图片预览 -->
      <ImagePreview
        v-if="hasImages"
        :images="announcement.images || []"
        :preview="true"
        class="announcement-images"
      />

      <!-- 附件列表 -->
      <AttachmentList
        v-if="hasAttachments"
        :attachments="announcement.attachments || []"
        class="announcement-attachments"
      />
    </view>

    <!-- 卡片底部 -->
    <view class="card-footer">
      <!-- 发布信息 -->
      <view class="publish-info">
        <view class="info-item publisher">
          <SvgIcon name="building" :size="12" />
          <text>{{ announcement.publisher }}</text>
        </view>
        <view class="info-item date">
          <SvgIcon name="calendar" :size="12" />
          <text>{{ formattedDate }}</text>
        </view>
        <view class="info-item category">
          <SvgIcon name="tag" :size="12" />
          <text>{{ announcement.category }}</text>
        </view>
      </view>

      <!-- 统计信息 -->
      <view class="stats-info">
        <view class="stat-item view-count">
          <SvgIcon name="eye" :size="12" />
          <text>{{ formatCount(announcement.viewCount) }}</text>
        </view>
        <view class="stat-item like-count" :class="{ 'is-liked': announcement.liked }" @click.stop="handleLike">
          <SvgIcon :name="announcement.liked ? 'heart-filled' : 'heart'" :size="12" />
          <text>{{ formatCount(announcement.likeCount) }}</text>
        </view>
        <view class="stat-item comment-count" @click.stop="handleComment">
          <SvgIcon name="message-circle" :size="12" />
          <text>{{ formatCount(announcement.commentCount) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import AnnouncementTypeTag from './AnnouncementTypeTag.vue'
import AttachmentList from './AttachmentList.vue'
import ImagePreview from '@/components/common/ImagePreview.vue'
import SvgIcon from '@/components/icons/SvgIcon.vue'

/**
 * 组件Props
 */
const props = defineProps({
  /**
   * 公告数据
   * @type {import('@/types').AnnouncementType}
   */
  announcement: {
    type: Object,
    required: true
  },
  /**
   * 是否显示更多操作按钮
   */
  showMore: {
    type: Boolean,
    default: true
  },
  /**
   * 摘要最大行数
   */
  summaryMaxLines: {
    type: Number,
    default: 2
  },
  /**
   * 自定义样式
   */
  customStyle: {
    type: Object,
    default: () => ({})
  }
})

/**
 * 组件事件
 */
const emit = defineEmits([
  'click',
  'expand',
  'like',
  'collect',
  'comment',
  'more',
  'voice-toggle'
])

/**
 * 适老化Store
 */
const elderlyStore = useElderlyStore()
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 展开状态
 */
const isExpanded = ref(false)

/**
 * 语音播放状态
 */
const isPlaying = ref(false)

/**
 * 类型标签（从typeLabel获取或使用type）
 */
const typeLabel = computed(() => {
  return props.announcement.typeLabel || props.announcement.type
})

/**
 * 图标大小（适老化模式增大）
 */
const iconSize = computed(() => isElderly.value ? 20 : 16)

/**
 * 显示的摘要文本
 */
const displaySummary = computed(() => {
  const summary = props.announcement.summary || ''
  if (!isExpanded.value && summary.length > 100) {
    return summary.substring(0, 100) + '...'
  }
  return summary
})

/**
 * 是否显示展开按钮
 */
const shouldShowExpandButton = computed(() => {
  return (props.announcement.summary || '').length > 100
})

/**
 * 是否有图片
 */
const hasImages = computed(() => {
  return props.announcement.images && props.announcement.images.length > 0
})

/**
 * 是否有附件
 */
const hasAttachments = computed(() => {
  return props.announcement.attachments && props.announcement.attachments.length > 0
})

/**
 * 格式化日期
 */
const formattedDate = computed(() => {
  const date = new Date(props.announcement.publishDate)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
})

/**
 * 卡片样式
 */
const cardStyle = computed(() => {
  return {
    ...props.customStyle
  }
})

/**
 * 格式化数字（大数显示K/M）
 */
const formatCount = (count) => {
  if (!count || count === 0) return '0'
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + '万'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}

/**
 * 切换展开状态
 */
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
  emit('expand', isExpanded.value, props.announcement)
}

/**
 * 切换语音播报
 */
const toggleVoice = () => {
  isPlaying.value = !isPlaying.value
  emit('voice-toggle', isPlaying.value, props.announcement)
}

/**
 * 切换收藏状态
 */
const toggleCollect = () => {
  emit('collect', props.announcement)
}

/**
 * 处理点赞
 */
const handleLike = () => {
  emit('like', props.announcement)
}

/**
 * 处理评论
 */
const handleComment = () => {
  emit('comment', props.announcement)
}

/**
 * 处理更多操作
 */
const handleMore = () => {
  emit('more', props.announcement)
}

/**
 * 处理卡片点击
 */
const handleCardClick = () => {
  emit('click', props.announcement)
}
</script>

<style lang="scss" scoped>
.announcement-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
  }

  &.is-top {
    border: 2rpx solid #FFD700;
    background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
  }

  &.is-unread {
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6rpx;
      height: 60%;
      background: #FF4D4F;
      border-radius: 0 4rpx 4rpx 0;
    }
  }

  &.is-playing {
    border-color: #52C41A;
    box-shadow: 0 0 0 4rpx rgba(82, 196, 26, 0.1);
  }

  &.elderly-mode {
    padding: 32rpx;
    gap: 32rpx;
    border-radius: 20rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
  }
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;

  .top-badge {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 12rpx;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    color: #ffffff;
    font-size: 22rpx;
    font-weight: 600;
    border-radius: 4rpx;
  }

  .unread-indicator {
    width: 16rpx;
    height: 16rpx;
    background: #FF4D4F;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-left: auto;

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56rpx;
      height: 56rpx;
      border-radius: 50%;
      background: #f5f5f5;
      color: #666666;
      transition: all 0.2s ease;

      &:active {
        transform: scale(0.9);
        background: #e8e8e8;
      }

      &.voice-btn.is-playing {
        background: #52C41A;
        color: #ffffff;
        animation: voice-pulse 1.5s ease-in-out infinite;
      }

      &.collect-btn.is-collected {
        background: #FAAD14;
        color: #ffffff;
      }
    }
  }
}

/* 卡片内容 */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .announcement-title {
    .title-text {
      font-size: 32rpx;
      font-weight: 600;
      line-height: 1.5;
      color: #333333;
    }
  }

  .announcement-summary {
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .summary-text {
      font-size: 28rpx;
      line-height: 1.6;
      color: #666666;
    }

    .expand-btn {
      align-self: flex-start;
      font-size: 26rpx;
      color: #1890FF;
      cursor: pointer;
      user-select: none;

      &:active {
        opacity: 0.7;
      }
    }
  }

  .announcement-content {
    padding: 16rpx;
    background: #f9f9f9;
    border-radius: 8rpx;

    .content-rich-text {
      font-size: 28rpx;
      line-height: 1.6;
      color: #666666;
    }
  }

  .announcement-images,
  .announcement-attachments {
    margin-top: 8rpx;
  }
}

/* 卡片底部 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;

  .publish-info {
    display: flex;
    align-items: center;
    gap: 24rpx;
    flex: 1;

    .info-item {
      display: flex;
      align-items: center;
      gap: 6rpx;
      font-size: 24rpx;
      color: #999999;

      text {
        white-space: nowrap;
      }
    }
  }

  .stats-info {
    display: flex;
    align-items: center;
    gap: 24rpx;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6rpx;
      font-size: 24rpx;
      color: #999999;
      transition: color 0.2s ease;

      &.like-count {
        cursor: pointer;

        &:active {
          opacity: 0.7;
        }

        &.is-liked {
          color: #FF4D4F;
        }
      }

      &.comment-count {
        cursor: pointer;

        &:active {
          opacity: 0.7;
        }
      }
    }
  }
}

/* 适老化模式调整 */
.elderly-mode {
  .card-content {
    .announcement-title .title-text {
      font-size: 40rpx;
      font-weight: 700;
    }

    .announcement-summary .summary-text {
      font-size: 36rpx;
    }

    .announcement-content .content-rich-text {
      font-size: 36rpx;
    }
  }

  .card-footer {
    .publish-info .info-item,
    .stats-info .stat-item {
      font-size: 28rpx;
    }
  }
}

/* 动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes voice-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10rpx rgba(82, 196, 26, 0);
  }
}

/* 减少动画（适老化） */
@media (prefers-reduced-motion: reduce) {
  .announcement-card {
    transition: none;
    &:active {
      transform: none;
    }
  }

  .unread-indicator,
  .action-btn.voice-btn.is-playing {
    animation: none;
  }
}
</style>
