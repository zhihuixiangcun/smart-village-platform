/**
 * 附件项组件
 * 显示单个附件信息（文件名、大小、类型）
 * 支持点击下载、预览等操作
 */
<template>
  <view
    :class="['attachment-item', { 'elderly-mode': isElderly }]"
    :aria-label="`${attachment.name}, ${attachment.size}, 点击${actionLabel}`"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <!-- 文件图标 -->
    <view class="file-icon" :class="`type-${fileType}`">
      <SvgIcon :name="iconName" :size="iconSize" />
    </view>

    <!-- 文件信息 -->
    <view class="file-info">
      <text class="file-name">{{ attachment.name }}</text>
      <text class="file-size">{{ attachment.size }}</text>
    </view>

    <!-- 操作按钮 -->
    <view class="file-action">
      <SvgIcon name="download" :size="iconSize" />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useElderlyStore } from '@/store/elderly'
import SvgIcon from '@/components/icons/SvgIcon.vue'

/**
 * 组件Props
 */
const props = defineProps({
  /**
   * 附件数据
   * @type {import('@/types').AnnouncementAttachment}
   */
  attachment: {
    type: Object,
    required: true
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
const emit = defineEmits(['click'])

/**
 * 适老化Store
 */
const elderlyStore = useElderlyStore()
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 图标大小（适老化模式增大）
 */
const iconSize = computed(() => isElderly.value ? 24 : 20)

/**
 * 操作标签
 */
const actionLabel = computed(() => {
  const labels = {
    download: '下载',
    preview: '预览',
    open: '打开'
  }
  return labels[props.action] || '下载'
})

/**
 * 文件类型（从扩展名或MIME类型推断）
 */
const fileType = computed(() => {
  const name = props.attachment.name || ''
  const type = props.attachment.type || ''

  // 从MIME类型判断
  if (type.includes('pdf')) return 'pdf'
  if (type.includes('image')) return 'image'
  if (type.includes('video')) return 'video'
  if (type.includes('audio')) return 'audio'
  if (type.includes('word') || type.includes('document')) return 'word'
  if (type.includes('excel') || type.includes('spreadsheet')) return 'excel'
  if (type.includes('powerpoint') || type.includes('presentation')) return 'ppt'
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return 'archive'

  // 从文件扩展名判断
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase()
  if (ext === '.pdf') return 'pdf'
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image'
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'video'
  if (['.mp3', '.wav', '.ogg'].includes(ext)) return 'audio'
  if (['.doc', '.docx'].includes(ext)) return 'word'
  if (['.xls', '.xlsx'].includes(ext)) return 'excel'
  if (['.ppt', '.pptx'].includes(ext)) return 'ppt'
  if (['.zip', '.rar', '.7z'].includes(ext)) return 'archive'

  return 'unknown'
})

/**
 * 图标名称
 */
const iconName = computed(() => {
  const icons = {
    pdf: 'file',
    image: 'image',
    video: 'video',
    audio: 'music',
    word: 'file-text',
    excel: 'file-spreadsheet',
    ppt: 'presentation',
    archive: 'archive',
    unknown: 'file'
  }
  return icons[fileType.value] || 'file'
})

/**
 * 处理点击
 */
const handleClick = () => {
  emit('click', props.attachment)
}
</script>

<style lang="scss" scoped>
.attachment-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
  border: 1rpx solid #e8e8e8;
  transition: all 0.2s ease;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
    background: #f0f0f0;
  }

  &.elderly-mode {
    padding: 24rpx;
    gap: 20rpx;
    border-radius: 12rpx;
  }

  .file-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72rpx;
    height: 72rpx;
    border-radius: 8rpx;
    flex-shrink: 0;

    &.type-pdf {
      background: #FFF1F0;
      color: #FF4D4F;
    }

    &.type-image {
      background: #E6F7FF;
      color: #1890FF;
    }

    &.type-video {
      background: #F6FFED;
      color: #52C41A;
    }

    &.type-audio {
      background: #FFFBE6;
      color: #FAAD14;
    }

    &.type-word {
      background: #E6F7FF;
      color: #1890FF;
    }

    &.type-excel {
      background: #F6FFED;
      color: #52C41A;
    }

    &.type-ppt {
      background: #FFFBE6;
      color: #FAAD14;
    }

    &.type-archive {
      background: #F5F5F5;
      color: #8C8C8C;
    }

    &.type-unknown {
      background: #F5F5F5;
      color: #8C8C8C;
    }
  }

  .file-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    min-width: 0;

    .file-name {
      font-size: 28rpx;
      color: #333333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      font-size: 24rpx;
      color: #999999;
    }
  }

  .file-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: #ffffff;
    color: #1890FF;
    flex-shrink: 0;
  }
}

.elderly-mode {
  .file-info {
    .file-name {
      font-size: 32rpx;
    }

    .file-size {
      font-size: 28rpx;
    }
  }
}

/* 减少动画（适老化） */
@media (prefers-reduced-motion: reduce) {
  .attachment-item {
    transition: none;
    &:active {
      transform: none;
    }
  }
}
</style>
