/**
 * 评论列表组件
 * 显示公告的所有评论，支持加载、刷新、发表评论
 * 适老化设计：大字体、清晰的布局
 */
<template>
  <view
    :class="['comment-list', { 'elderly-mode': isElderly }]"
    role="region"
    :aria-label="`评论列表，共${comments.length}条`"
  >
    <!-- 标题栏 -->
    <view class="list-header">
      <text class="header-title">全部评论</text>
      <view class="header-count" :aria-label="`共${comments.length}条评论`">
        <text>{{ comments.length }}</text>
      </view>
    </view>

    <!-- 输入框 -->
    <CommentInput
      ref="inputRef"
      v-model="inputContent"
      :placeholder="inputPlaceholder"
      :loading="submitting"
      :reply-to="replyTo"
      @submit="handleSubmit"
      @cancel-reply="handleCancelReply"
    />

    <!-- 加载状态 -->
    <view v-if="loading && comments.length === 0" class="loading-state">
      <view class="spinner" />
      <text class="loading-text">加载评论中...</text>
    </view>

    <!-- 评论列表 -->
    <scroll-view
      v-else
      class="list-scroll"
      scroll-y
      @scrolltolower="handleLoadMore"
    >
      <!-- 评论项 -->
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :current-user-id="currentUserId"
        @like="handleLikeComment"
        @reply="handleReplyComment"
        @delete="handleDeleteComment"
      />

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="loading-more">
        <view class="spinner-small" />
        <text class="loading-more-text">加载更多...</text>
      </view>

      <!-- 没有更多 -->
      <view v-if="!hasMore && comments.length > 0" class="no-more">
        <text class="no-more-text">没有更多评论了</text>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && comments.length === 0" class="empty-state">
        <SvgIcon name="message-circle" :size="80" color="#d9d9d9" />
        <text class="empty-text">还没有评论，快来抢沙发吧~</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, defineProps, defineEmits, nextTick } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import { useUserStore } from '@/store/user'
import { useAnnouncementCommentStore } from '@/store/announcement-comment'
import SvgIcon from '@/components/icons/SvgIcon.vue'
import CommentItem from './CommentItem.vue'
import CommentInput from './CommentInput.vue'

/**
 * 组件Props
 */
const props = defineProps({
  /**
   * 公告ID
   */
  announcementId: {
    type: String,
    required: true
  },
  /**
   * 是否自动加载
   */
  autoLoad: {
    type: Boolean,
    default: true
  }
})

/**
 * 组件事件
 */
const emit = defineEmits(['update:count'])

/**
 * Store实例
 */
const elderlyStore = useElderlyStore()
const userStore = useUserStore()
const commentStore = useAnnouncementCommentStore()

/**
 * 适老化模式
 */
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 输入框引用
 */
const inputRef = ref(null)

/**
 * 输入内容
 */
const inputContent = ref('')

/**
 * 回复对象
 */
const replyTo = ref(null)

/**
 * 加载状态
 */
const loading = computed(() => commentStore.loading)
const submitting = computed(() => commentStore.submitting)
const loadingMore = ref(false)
const hasMore = ref(true)

/**
 * 当前页码
 */
const currentPage = ref(1)
const pageSize = 20

/**
 * 评论列表
 */
const comments = computed(() => {
  return commentStore.getComments(props.announcementId) || []
})

/**
 * 当前用户ID
 */
const currentUserId = computed(() => userStore.userId)

/**
 * 输入框占位符
 */
const inputPlaceholder = computed(() => {
  return replyTo.value ? `回复 @${replyTo.value.user?.name}` : '说点什么...'
})

/**
 * 加载评论列表
 */
const loadComments = async (refresh = false) => {
  if (refresh) {
    commentStore.clearComments(props.announcementId)
    currentPage.value = 1
    hasMore.value = true
  }

  try {
    await commentStore.fetchComments(props.announcementId)

    // 简单的判断是否还有更多数据
    hasMore.value = comments.value.length >= pageSize
  } catch (error) {
    console.error('加载评论失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

/**
 * 加载更多
 */
const handleLoadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  try {
    currentPage.value++
    // TODO: 调用API加载更多
    // await loadMoreComments()
    hasMore.value = false
  } catch (error) {
    console.error('加载更多失败:', error)
    currentPage.value--
  } finally {
    loadingMore.value = false
  }
}

/**
 * 发表评论
 */
const handleSubmit = async (content) => {
  if (!content || !content.trim()) return

  try {
    elderlyStore.vibrate('short')

    const data = {
      content: content.trim(),
      replyToId: replyTo.value?.id || null
    }

    await commentStore.submitComment(props.announcementId, data)

    // 清空输入
    inputContent.value = ''
    replyTo.value = null

    // 更新评论数
    emit('update:count', comments.value.length)

    uni.showToast({
      title: replyTo.value ? '回复成功' : '评论成功',
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('发表评论失败:', error)
    uni.showToast({
      title: '发表失败',
      icon: 'none'
    })
  }
}

/**
 * 点赞评论
 */
const handleLikeComment = async (comment) => {
  elderlyStore.vibrate('short')
  try {
    await commentStore.toggleLikeComment(comment.id, props.announcementId)
  } catch (error) {
    console.error('点赞失败:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

/**
 * 回复评论
 */
const handleReplyComment = (comment) => {
  elderlyStore.vibrate('short')
  replyTo.value = comment
  nextTick(() => {
    inputRef.value?.focus()
  })
}

/**
 * 取消回复
 */
const handleCancelReply = () => {
  replyTo.value = null
}

/**
 * 删除评论
 */
const handleDeleteComment = async (comment) => {
  elderlyStore.vibrate('short')
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条评论吗？',
    confirmText: '删除',
    cancelText: '取消',
    confirmColor: '#FF4D4F',
    success: async (res) => {
      if (res.confirm) {
        try {
          await commentStore.deleteComment(props.announcementId, comment.id)

          // 更新评论数
          emit('update:count', comments.value.length)

          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
        } catch (error) {
          console.error('删除失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

/**
 * 刷新评论
 */
const refresh = () => {
  loadComments(true)
}

/**
 * 页面加载
 */
onMounted(() => {
  if (props.autoLoad) {
    loadComments()
  }
})

// 暴露方法给父组件
defineExpose({
  refresh,
  focus: () => inputRef.value?.focus()
})
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;

  &.elderly-mode {
    gap: 24rpx;
    padding: 32rpx;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16rpx;
    border-bottom: 1rpx solid $border-color;

    .header-title {
      font-size: 32rpx;
      font-weight: 600;
      color: $text-primary;
    }

    .header-count {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40rpx;
      height: 40rpx;
      padding: 0 12rpx;
      background: $bg-color-light;
      border-radius: 20rpx;
      font-size: 24rpx;
      color: $text-secondary;
    }
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 40rpx;
    gap: 16rpx;

    .spinner {
      width: 48rpx;
      height: 48rpx;
      border: 4rpx solid $border-color;
      border-top-color: $primary-color;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-text {
      font-size: 26rpx;
      color: $text-secondary;
    }
  }

  .list-scroll {
    max-height: 800rpx;
  }

  .loading-more,
  .no-more {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32rpx;
    gap: 12rpx;

    .spinner-small {
      width: 32rpx;
      height: 32rpx;
      border: 3rpx solid $border-color;
      border-top-color: $primary-color;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-more-text,
    .no-more-text {
      font-size: 26rpx;
      color: $text-tertiary;
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80rpx 40rpx;
    gap: 16rpx;

    .empty-text {
      font-size: 28rpx;
      color: $text-secondary;
    }
  }
}

.elderly-mode {
  .list-header {
    padding-bottom: 24rpx;

    .header-title {
      font-size: 36rpx;
    }

    .header-count {
      min-width: 48rpx;
      height: 48rpx;
      padding: 0 16rpx;
      font-size: 28rpx;
    }
  }

  .loading-state .loading-text,
  .empty-state .empty-text {
    font-size: 32rpx;
  }

  .loading-more .loading-more-text,
  .no-more .no-more-text {
    font-size: 30rpx;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 减少动画（适老化） */
@media (prefers-reduced-motion: reduce) {
  .spinner,
  .spinner-small {
    animation: none;
  }
}
</style>
