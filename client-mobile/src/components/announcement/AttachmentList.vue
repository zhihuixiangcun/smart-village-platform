/**
 * 附件列表组件
 * 显示公告的所有附件
 * 支持网格和列表两种布局模式
 */
<template>
  <view
    :class="[
      'attachment-list',
      `layout-${layout}`,
      { 'elderly-mode': isElderly }
    ]"
    role="list"
    :aria-label="`附件列表，共${attachments.length}个`"
  >
    <!-- 列表头部 -->
    <view v-if="showHeader" class="list-header">
      <view class="header-title">
        <SvgIcon name="paperclip" :size="16" />
        <text>附件列表</text>
      </view>
      <text class="header-count">{{ attachments.length }}个文件</text>
    </view>

    <!-- 附件列表 -->
    <view class="list-content">
      <AttachmentItem
        v-for="(attachment, index) in attachments"
        :key="attachment.id || index"
        :attachment="attachment"
        :action="action"
        :aria-label="`附件${index + 1}，${attachment.name}`"
        :role="'listitem'"
        @click="handleAttachmentClick"
      />
    </view>

    <!-- 空状态 -->
    <view v-if="attachments.length === 0" class="empty-state">
      <SvgIcon name="file" :size="48" color="#d9d9d9" />
      <text class="empty-text">暂无附件</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import AttachmentItem from './AttachmentItem.vue'
import SvgIcon from '@/components/icons/SvgIcon.vue'

/**
 * 组件Props
 */
const props = defineProps({
  /**
   * 附件列表
   * @type {import('@/types').AnnouncementAttachment[]}
   */
  attachments: {
    type: Array,
    default: () => []
  },
  /**
   * 布局模式
   */
  layout: {
    type: String,
    default: 'list',
    validator: (value) => ['list', 'grid'].includes(value)
  },
  /**
   * 是否显示头部
   */
  showHeader: {
    type: Boolean,
    default: true
  },
  /**
   * 操作类型
   */
  action: {
    type: String,
    default: 'download',
    validator: (value) => ['download', 'preview', 'open'].includes(value)
  }
})

/**
 * 组件事件
 */
const emit = defineEmits(['attachment-click'])

/**
 * 适老化Store
 */
const elderlyStore = useElderlyStore()
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 处理附件点击
 */
const handleAttachmentClick = (attachment) => {
  emit('attachment-click', attachment)
}
</script>

<style lang="scss" scoped>
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  &.elderly-mode {
    gap: 24rpx;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12rpx;
    border-bottom: 1rpx solid #f0f0f0;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8rpx;
      font-size: 28rpx;
      font-weight: 600;
      color: #333333;
    }

    .header-count {
      font-size: 24rpx;
      color: #999999;
    }
  }

  .list-content {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  /* 网格布局 */
  &.layout-grid {
    .list-content {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16rpx;
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
      color: #999999;
    }
  }
}

.elderly-mode {
  .list-header {
    padding-bottom: 16rpx;

    .header-title {
      font-size: 32rpx;
    }

    .header-count {
      font-size: 28rpx;
    }
  }

  .list-content {
    gap: 16rpx;
  }

  &.layout-grid {
    .list-content {
      grid-template-columns: repeat(2, 1fr);
      gap: 20rpx;
    }
  }

  .empty-state {
    padding: 100rpx 40rpx;

    .empty-text {
      font-size: 32rpx;
    }
  }
}
</style>
