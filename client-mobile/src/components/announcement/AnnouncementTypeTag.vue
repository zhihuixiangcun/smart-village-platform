/**
 * 公告类型标签组件
 * 显示公告类型（重要、通知、会议、公示）
 * 支持适老化大字体模式
 */
<template>
  <view
    :class="['announcement-type-tag', `type-${props.type}`, { 'elderly-mode': isElderly }]"
    :style="tagStyle"
    :aria-label="typeLabel"
    role="presentation"
  >
    <SvgIcon v-if="iconName" :name="iconName" :size="iconSize" />
    <text class="type-label">{{ typeLabel }}</text>
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
   * 公告类型
   * @type {'important' | 'notice' | 'meeting' | 'public'}
   */
  type: {
    type: String,
    required: true,
    validator: (value) => ['important', 'notice', 'meeting', 'public'].includes(value)
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
 * 适老化Store
 */
const elderlyStore = useElderlyStore()
const isElderly = computed(() => elderlyStore.enabled)

/**
 * 类型配置映射
 */
const TYPE_CONFIG = {
  important: {
    label: '重要',
    color: '#FF4D4F',
    bgColor: '#FFF1F0',
    icon: 'alert-circle'
  },
  notice: {
    label: '通知',
    color: '#1890FF',
    bgColor: '#E6F7FF',
    icon: 'notification'
  },
  meeting: {
    label: '会议',
    color: '#52C41A',
    bgColor: '#F6FFED',
    icon: 'users'
  },
  public: {
    label: '公示',
    color: '#FAAD14',
    bgColor: '#FFFBE6',
    icon: 'file-text'
  }
}

/**
 * 类型显示名称
 */
const typeLabel = computed(() => TYPE_CONFIG[props.type]?.label || '公告')

/**
 * 图标名称
 */
const iconName = computed(() => TYPE_CONFIG[props.type]?.icon || '')

/**
 * 图标大小（适老化模式增大）
 */
const iconSize = computed(() => isElderly.value ? 20 : 16)

/**
 * 标签样式
 */
const tagStyle = computed(() => {
  const config = TYPE_CONFIG[props.type] || TYPE_CONFIG.notice
  return {
    '--type-color': config.color,
    '--type-bg-color': config.bgColor,
    ...props.customStyle
  }
})
</script>

<style lang="scss" scoped>
.announcement-type-tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  background-color: var(--type-bg-color);
  color: var(--type-color);
  font-size: 24rpx;
  line-height: 1.5;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;

  &.elderly-mode {
    padding: 8rpx 20rpx;
    font-size: 32rpx;
    gap: 8rpx;
  }

  .type-label {
    flex-shrink: 0;
  }
}

/* 类型特定样式 */
.type-important {
  border: 1rpx solid rgba(255, 77, 79, 0.2);
}

.type-notice {
  border: 1rpx solid rgba(24, 144, 255, 0.2);
}

.type-meeting {
  border: 1rpx solid rgba(82, 196, 26, 0.2);
}

.type-public {
  border: 1rpx solid rgba(250, 173, 20, 0.2);
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .announcement-type-tag {
    opacity: 0.9;
  }
}

/* 减少动画（适老化） */
@media (prefers-reduced-motion: reduce) {
  .announcement-type-tag {
    transition: none;
  }
}
</style>
