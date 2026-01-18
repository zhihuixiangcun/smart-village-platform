/**
 * 评论项组件
 * 显示单条评论，支持点赞、回复、删除
 * 适老化设计：大字体、清晰的交互
 */
<template>
  <view
    :class="['comment-item', { 'elderly-mode': isElderly }]"
    :aria-label="`${comment.user?.name}的评论，${comment.content}`"
  >
    <!-- 头像 -->
    <view class="comment-avatar">
      <image
        v-if="comment.user?.avatar"
        :src="comment.user.avatar"
        class="avatar-image"
        :aria-label="`${comment.user?.name}的头像`"
      />
      <view v-else class="avatar-placeholder">
        <SvgIcon name="user" :size="avatarSize" />
      </view>
    </view>

    <!-- 评论内容 -->
    <view class="comment-content">
      <!-- 头部信息 -->
      <view class="comment-header">
        <view class="header-left">
          <text class="user-name">{{ comment.user?.name || '匿名用户' }}</text>
          <view v-if="comment.user?.role" :class="['role-badge', `role-${comment.user.role}`]">
            <text class="role-text">{{ getRoleLabel(comment.user.role) }}</text>
          </view>
        </view>
        <text class="comment-time">{{ formatTime(comment.createdAt) }}</text>
      </view>

      <!-- 回复对象 -->
      <view v-if="comment.replyToUser" class="reply-to">
        <text class="reply-to-text">回复 @{{ comment.replyToUser.name }}</text>
      </view>

      <!-- 评论内容 -->
      <view class="comment-text">
        <text>{{ comment.content }}</text>
      </view>

      <!-- 底部操作 -->
      <view class="comment-footer">
        <view
          :class="['footer-action', 'like-action', { 'is-liked': comment.liked }]"
          @click="handleLike"
          role="button"
          :aria-label="comment.liked ? '取消点赞' : '点赞'"
          :aria-pressed="comment.liked"
          tabindex="0"
          @keydown.enter="handleLike"
        >
          <SvgIcon :name="comment.liked ? 'heart-filled' : 'heart'" :size="iconSize" />
          <text v-if="comment.likeCount > 0" class="action-count">{{ formatCount(comment.likeCount) }}</text>
        </view>

        <view
          class="footer-action reply-action"
          @click="handleReply"
          role="button"
          aria-label="回复"
          tabindex="0"
          @keydown.enter="handleReply"
        >
          <SvgIcon name="message-circle" :size="iconSize" />
          <text v-if="comment.replyCount > 0" class="action-count">{{ formatCount(comment.replyCount) }}</text>
        </view>

        <view
          v-if="canDelete"
          class="footer-action delete-action"
          @click="handleDelete"
          role="button"
          aria-label="删除"
          tabindex="0"
          @keydown.enter="handleDelete"
        >
          <SvgIcon name="trash-2" :size="iconSize" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import { useUserStore } from '@/store/user'
import SvgIcon from '@/components/icons/SvgIcon.vue'

/**
 * 组件Props
 */
const props = defineProps({
  /**
   * 评论数据
   * @type {import('@/types/announcement-comment').AnnouncementComment}
   */
  comment: {
    type: Object,
    required: true
  },
  /**
   * 当前用户ID（用于判断是否可以删除）
   */
  currentUserId: {
    type: String,
    default: ''
  }
})

/**
 * 组件事件
 */
const emit = defineEmits(['like', 'reply', 'delete'])

/**
 * Store实例
 */
const elderlyStore = useElderlyStore()
const userStore = useUserStore()

/**
 * 适老化模式
 */
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 图标大小
 */
const iconSize = computed(() => isElderly.value ? 18 : 16)

/**
 * 头像大小
 */
const avatarSize = computed(() => isElderly.value ? 24 : 20)

/**
 * 是否可以删除
 */
const canDelete = computed(() => {
  return props.comment.user?.id === props.currentUserId || props.comment.user?.id === userStore.userId
})

/**
 * 获取角色标签
 */
const getRoleLabel = (role) => {
  const roleMap = {
    admin: '管理员',
    village_cadre: '村干部',
    resident: '村民',
    visitor: '访客'
  }
  return roleMap[role] || '村民'
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

/**
 * 格式化数量
 */
const formatCount = (count) => {
  if (!count || count === 0) return ''
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}

/**
 * 处理点赞
 */
const handleLike = () => {
  emit('like', props.comment)
}

/**
 * 处理回复
 */
const handleReply = () => {
  emit('reply', props.comment)
}

/**
 * 处理删除
 */
const handleDelete = () => {
  emit('delete', props.comment)
}
</script>

<style lang="scss" scoped>
.comment-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &.elderly-mode {
    gap: 20rpx;
    padding: 20rpx 0;
  }

  .comment-avatar {
    flex-shrink: 0;

    .avatar-image {
      width: 64rpx;
      height: 64rpx;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64rpx;
      height: 64rpx;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      color: #ffffff;
    }
  }

  .comment-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    min-width: 0;

    .comment-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16rpx;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8rpx;
        flex: 1;
        min-width: 0;

        .user-name {
          font-size: 26rpx;
          font-weight: 500;
          color: #333333;
        }

        .role-badge {
          padding: 2rpx 8rpx;
          border-radius: 4rpx;
          font-size: 20rpx;

          &.role-admin {
            background: #FFF1F0;
            color: #FF4D4F;
          }

          &.role-village_cadre {
            background: #FFF7E6;
            color: #FA8C16;
          }

          &.role-resident {
            background: #F0F0F0;
            color: #666666;
          }

          &.role-visitor {
            background: #E6F7FF;
            color: #1890FF;
          }

          .role-text {
            font-size: 20rpx;
          }
        }
      }

      .comment-time {
        font-size: 22rpx;
        color: #999999;
        white-space: nowrap;
      }
    }

    .reply-to {
      .reply-to-text {
        font-size: 24rpx;
        color: #1890FF;
      }
    }

    .comment-text {
      font-size: 28rpx;
      line-height: 1.6;
      color: #333333;
      word-break: break-all;
    }

    .comment-footer {
      display: flex;
      gap: 24rpx;

      .footer-action {
        display: flex;
        align-items: center;
        gap: 4rpx;
        color: #666666;
        transition: color 0.2s ease;

        &:active {
          opacity: 0.6;
        }

        &.like-action.is-liked {
          color: #FF4D4F;
        }

        .action-count {
          font-size: 22rpx;
        }
      }
    }
  }
}

.elderly-mode {
  .comment-avatar .avatar-image,
  .comment-avatar .avatar-placeholder {
    width: 80rpx;
    height: 80rpx;
  }

  .comment-content {
    gap: 12rpx;

    .comment-header .header-left {
      .user-name {
        font-size: 30rpx;
      }

      .role-badge .role-text {
        font-size: 24rpx;
      }
    }

    .comment-time {
      font-size: 26rpx;
    }

    .comment-text {
      font-size: 32rpx;
    }

    .comment-footer .footer-action .action-count {
      font-size: 26rpx;
    }
  }
}

/* 减少动画（适老化） */
@media (prefers-reduced-motion: reduce) {
  .comment-item {
    .comment-footer .footer-action {
      transition: none;
      &:active {
        opacity: 1;
      }
    }
  }
}
</style>
